from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models.quotation import Quotation, QuotationItem
from app.models.user import User, UserRole
from app.schemas.quotation import QuotationCreate, QuotationUpdate, QuotationResponse, QuotationItemResponse
from app.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_number

router = APIRouter(prefix="/quotations", tags=["Quotations"])


@router.get("", response_model=List[QuotationResponse])
async def list_quotations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).order_by(Quotation.created_at.desc()))
    quotations = result.scalars().all()
    responses = []
    for q in quotations:
        items_result = await db.execute(select(QuotationItem).where(QuotationItem.quotation_id == q.id))
        items = [QuotationItemResponse.model_validate(i) for i in items_result.scalars().all()]
        resp = QuotationResponse.model_validate(q)
        resp.items = items
        responses.append(resp)
    return responses


@router.post("", response_model=QuotationResponse)
async def create_quotation(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    count_result = await db.execute(select(func.count()).select_from(Quotation))
    count = count_result.scalar()
    quotation_number = generate_number("QUO", count)

    subtotal = sum(item.quantity * item.unit_price for item in data.items)
    tax_amount = subtotal * (data.tax_percent / 100)
    total_amount = subtotal + tax_amount - data.discount

    quotation = Quotation(
        quotation_number=quotation_number,
        project_id=data.project_id,
        client_id=data.client_id,
        tax_percent=data.tax_percent,
        discount=data.discount,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        valid_until=data.valid_until,
        notes=data.notes,
        terms_conditions=data.terms_conditions,
    )
    db.add(quotation)
    await db.flush()

    items = []
    for item_data in data.items:
        amount = item_data.quantity * item_data.unit_price
        item = QuotationItem(
            quotation_id=quotation.id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount,
        )
        db.add(item)
        items.append(item)

    await db.commit()
    await db.refresh(quotation)

    item_responses = [QuotationItemResponse.model_validate(i) for i in items]
    resp = QuotationResponse.model_validate(quotation)
    resp.items = item_responses
    return resp


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    items_result = await db.execute(select(QuotationItem).where(QuotationItem.quotation_id == quotation.id))
    items = [QuotationItemResponse.model_validate(i) for i in items_result.scalars().all()]
    resp = QuotationResponse.model_validate(quotation)
    resp.items = items
    return resp


@router.patch("/{quotation_id}/status")
async def update_quotation_status(
    quotation_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    quotation.status = status
    await db.commit()
    return {"detail": f"Quotation status updated to {status}"}


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: str,
    data: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Update scalar fields
    for field in ["project_id", "client_id", "tax_percent", "discount", "valid_until", "notes", "terms_conditions"]:
        value = getattr(data, field, None)
        if value is not None:
            setattr(quotation, field, value)

    # Update items if provided
    if data.items is not None:
        # Delete existing items
        existing_items = await db.execute(
            select(QuotationItem).where(QuotationItem.quotation_id == quotation.id)
        )
        for item in existing_items.scalars().all():
            await db.delete(item)

        # Create new items
        items = []
        for item_data in data.items:
            amount = item_data.quantity * item_data.unit_price
            item = QuotationItem(
                quotation_id=quotation.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit=item_data.unit,
                unit_price=item_data.unit_price,
                amount=amount,
            )
            db.add(item)
            items.append(item)

        # Recalculate totals
        subtotal = sum(item_data.quantity * item_data.unit_price for item_data in data.items)
        tax_percent = data.tax_percent if data.tax_percent is not None else float(quotation.tax_percent or 18)
        discount = data.discount if data.discount is not None else float(quotation.discount or 0)
        tax_amount = subtotal * (tax_percent / 100)
        total_amount = subtotal + tax_amount - discount

        quotation.subtotal = subtotal
        quotation.tax_amount = tax_amount
        quotation.total_amount = total_amount
    elif data.tax_percent is not None or data.discount is not None:
        # Recalculate if tax/discount changed but items didn't
        subtotal = float(quotation.subtotal or 0)
        tax_percent = data.tax_percent if data.tax_percent is not None else float(quotation.tax_percent or 18)
        discount = data.discount if data.discount is not None else float(quotation.discount or 0)
        tax_amount = subtotal * (tax_percent / 100)
        total_amount = subtotal + tax_amount - discount

        quotation.tax_amount = tax_amount
        quotation.total_amount = total_amount

    await db.commit()
    await db.refresh(quotation)

    items_result = await db.execute(select(QuotationItem).where(QuotationItem.quotation_id == quotation.id))
    item_responses = [QuotationItemResponse.model_validate(i) for i in items_result.scalars().all()]
    resp = QuotationResponse.model_validate(quotation)
    resp.items = item_responses
    return resp
