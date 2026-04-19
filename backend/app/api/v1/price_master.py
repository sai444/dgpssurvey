from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.price_master import PriceTier, PaymentTerms
from app.models.user import User, UserRole
from app.schemas.price_master import (
    PriceTierCreate, PriceTierUpdate, PriceTierResponse,
    PaymentTermsCreate, PaymentTermsUpdate, PaymentTermsResponse,
)
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/price-master", tags=["Price Master"])


# ─── PRICE TIERS ────────────────────────────────────────────

@router.get("/tiers", response_model=List[PriceTierResponse])
async def list_price_tiers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PriceTier).where(PriceTier.is_active == True).order_by(PriceTier.category, PriceTier.min_acres)
    )
    return [PriceTierResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/tiers", response_model=PriceTierResponse)
async def create_price_tier(
    data: PriceTierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    tier = PriceTier(**data.model_dump())
    db.add(tier)
    await db.commit()
    await db.refresh(tier)
    return PriceTierResponse.model_validate(tier)


@router.put("/tiers/{tier_id}", response_model=PriceTierResponse)
async def update_price_tier(
    tier_id: str,
    data: PriceTierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(PriceTier).where(PriceTier.id == tier_id))
    tier = result.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=404, detail="Price tier not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tier, key, value)
    await db.commit()
    await db.refresh(tier)
    return PriceTierResponse.model_validate(tier)


@router.delete("/tiers/{tier_id}")
async def delete_price_tier(
    tier_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(PriceTier).where(PriceTier.id == tier_id))
    tier = result.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=404, detail="Price tier not found")
    tier.is_active = False
    await db.commit()
    return {"detail": "Price tier deactivated"}


# ─── SEED DEFAULT DATA ──────────────────────────────────────

@router.post("/seed-defaults")
async def seed_default_pricing(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    existing = await db.execute(select(PriceTier))
    if existing.scalars().first():
        return {"detail": "Pricing data already exists"}

    defaults = [
        PriceTier(category="survey", label="Less than 10 acres", condition="lt_10", min_acres=0, max_acres=10, price_per_acre=2000),
        PriceTier(category="survey", label="10 to 20 acres", condition="lt_20", min_acres=10, max_acres=20, price_per_acre=1500),
        PriceTier(category="survey", label="Greater than 20 acres", condition="gte_20", min_acres=20, max_acres=None, price_per_acre=1000),
        PriceTier(category="layout", label="Layouts Approved", condition="approved", min_acres=None, max_acres=None, price_per_acre=30000),
        PriceTier(category="layout", label="Layouts Unapproved", condition="unapproved", min_acres=None, max_acres=None, price_per_acre=15000),
    ]
    for t in defaults:
        db.add(t)

    # Default payment terms
    terms = [
        PaymentTerms(name="Standard", milestone_percent=30, milestone_label="Advance payment on confirmation", sort_order=1),
        PaymentTerms(name="Standard", milestone_percent=40, milestone_label="On completion of field survey", sort_order=2),
        PaymentTerms(name="Standard", milestone_percent=30, milestone_label="On delivery of final report/drawings", sort_order=3),
    ]
    for t in terms:
        db.add(t)

    await db.commit()
    return {"detail": "Default pricing and payment terms seeded"}


# ─── PAYMENT TERMS ──────────────────────────────────────────

@router.get("/terms", response_model=List[PaymentTermsResponse])
async def list_payment_terms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PaymentTerms).where(PaymentTerms.is_active == True).order_by(PaymentTerms.sort_order)
    )
    return [PaymentTermsResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/terms", response_model=PaymentTermsResponse)
async def create_payment_term(
    data: PaymentTermsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    term = PaymentTerms(**data.model_dump())
    db.add(term)
    await db.commit()
    await db.refresh(term)
    return PaymentTermsResponse.model_validate(term)


@router.put("/terms/{term_id}", response_model=PaymentTermsResponse)
async def update_payment_term(
    term_id: str,
    data: PaymentTermsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(PaymentTerms).where(PaymentTerms.id == term_id))
    term = result.scalar_one_or_none()
    if not term:
        raise HTTPException(status_code=404, detail="Payment term not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(term, key, value)
    await db.commit()
    await db.refresh(term)
    return PaymentTermsResponse.model_validate(term)


@router.delete("/terms/{term_id}")
async def delete_payment_term(
    term_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(PaymentTerms).where(PaymentTerms.id == term_id))
    term = result.scalar_one_or_none()
    if not term:
        raise HTTPException(status_code=404, detail="Payment term not found")
    term.is_active = False
    await db.commit()
    return {"detail": "Payment term deactivated"}
