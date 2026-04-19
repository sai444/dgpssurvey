from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models.invoice import Invoice, InvoiceItem
from app.models.quotation import Quotation, QuotationItem
from app.models.payment import Payment
from app.models.user import User, UserRole
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceItemResponse,
    PaymentCreate, PaymentResponse,
)
from app.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_number

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Invoice).order_by(Invoice.created_at.desc()))
    invoices = result.scalars().all()
    responses = []
    for inv in invoices:
        items_result = await db.execute(select(InvoiceItem).where(InvoiceItem.invoice_id == inv.id))
        items = [InvoiceItemResponse.model_validate(i) for i in items_result.scalars().all()]
        resp = InvoiceResponse.model_validate(inv)
        resp.items = items
        responses.append(resp)
    return responses


@router.post("", response_model=InvoiceResponse)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    count_result = await db.execute(select(func.count()).select_from(Invoice))
    count = count_result.scalar()
    invoice_number = generate_number("INV", count)

    subtotal = sum(item.quantity * item.unit_price for item in data.items)
    tax_amount = subtotal * (data.tax_percent / 100)
    total_amount = subtotal + tax_amount - data.discount

    invoice = Invoice(
        invoice_number=invoice_number,
        project_id=data.project_id,
        client_id=data.client_id,
        quotation_id=data.quotation_id,
        tax_percent=data.tax_percent,
        discount=data.discount,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        due_date=data.due_date,
        notes=data.notes,
        terms_conditions=data.terms_conditions,
    )
    db.add(invoice)
    await db.flush()

    items = []
    for item_data in data.items:
        amount = item_data.quantity * item_data.unit_price
        item = InvoiceItem(
            invoice_id=invoice.id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            amount=amount,
        )
        db.add(item)
        items.append(item)

    await db.commit()
    await db.refresh(invoice)

    item_responses = [InvoiceItemResponse.model_validate(i) for i in items]
    resp = InvoiceResponse.model_validate(invoice)
    resp.items = item_responses
    return resp


@router.post("/from-quotation/{quotation_id}", response_model=InvoiceResponse)
async def create_invoice_from_quotation(
    quotation_id: str,
    due_date: str = None,
    notes: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    items_result = await db.execute(
        select(QuotationItem).where(QuotationItem.quotation_id == quotation.id)
    )
    quotation_items = items_result.scalars().all()

    count_result = await db.execute(select(func.count()).select_from(Invoice))
    count = count_result.scalar()
    invoice_number = generate_number("INV", count)

    invoice = Invoice(
        invoice_number=invoice_number,
        project_id=quotation.project_id,
        client_id=quotation.client_id,
        quotation_id=quotation.id,
        tax_percent=quotation.tax_percent,
        discount=quotation.discount or 0,
        subtotal=quotation.subtotal,
        tax_amount=quotation.tax_amount,
        total_amount=quotation.total_amount,
        due_date=due_date,
        notes=notes or quotation.notes,
    )
    db.add(invoice)
    await db.flush()

    items = []
    for qi in quotation_items:
        item = InvoiceItem(
            invoice_id=invoice.id,
            description=qi.description,
            quantity=qi.quantity,
            unit=qi.unit,
            unit_price=qi.unit_price,
            amount=qi.amount,
        )
        db.add(item)
        items.append(item)

    await db.commit()
    await db.refresh(invoice)

    item_responses = [InvoiceItemResponse.model_validate(i) for i in items]
    resp = InvoiceResponse.model_validate(invoice)
    resp.items = item_responses
    return resp


@router.patch("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    valid_statuses = ["draft", "sent", "paid", "partial", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    invoice.status = status
    await db.commit()
    return {"status": status}


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    items_result = await db.execute(select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id))
    items = [InvoiceItemResponse.model_validate(i) for i in items_result.scalars().all()]
    resp = InvoiceResponse.model_validate(invoice)
    resp.items = items
    return resp


@router.post("/{invoice_id}/payments", response_model=PaymentResponse)
async def record_payment(
    invoice_id: str,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment = Payment(
        invoice_id=invoice.id,
        amount=data.amount,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        payment_date=data.payment_date,
        notes=data.notes,
    )
    db.add(payment)

    invoice.amount_paid = float(invoice.amount_paid or 0) + data.amount
    if invoice.amount_paid >= float(invoice.total_amount or 0):
        invoice.status = "paid"
    else:
        invoice.status = "partial"

    await db.commit()
    await db.refresh(payment)
    return PaymentResponse.model_validate(payment)


@router.get("/{invoice_id}/payments", response_model=List[PaymentResponse])
async def list_payments(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Payment).where(Payment.invoice_id == invoice_id))
    return [PaymentResponse.model_validate(p) for p in result.scalars().all()]
