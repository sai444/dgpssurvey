from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models.surveyor import Surveyor
from app.models.user import User, UserRole
from app.dependencies import get_current_user, require_role
from app.utils.security import hash_password
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

router = APIRouter(prefix="/surveyors", tags=["Surveyors"])


class SurveyorUserInfo(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class SurveyorCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    license_number: Optional[str] = None
    specialization: Optional[str] = None


class SurveyorUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    is_available: Optional[bool] = None


class SurveyorResponse(BaseModel):
    id: UUID
    user_id: UUID
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    is_available: bool
    created_at: Optional[datetime] = None
    user: Optional[SurveyorUserInfo] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[SurveyorResponse])
async def list_surveyors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Surveyor).options(selectinload(Surveyor.user)).order_by(Surveyor.created_at.desc())
    )
    return [SurveyorResponse.model_validate(s) for s in result.scalars().all()]


@router.post("", response_model=SurveyorResponse)
async def create_surveyor(
    data: SurveyorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    # Check if email already taken
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user with surveyor role
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.surveyor,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create surveyor profile
    surveyor = Surveyor(
        user_id=user.id,
        license_number=data.license_number,
        specialization=data.specialization,
    )
    db.add(surveyor)
    await db.commit()
    await db.refresh(surveyor)
    await db.refresh(user)
    surveyor.user = user
    return SurveyorResponse.model_validate(surveyor)


@router.get("/{surveyor_id}", response_model=SurveyorResponse)
async def get_surveyor(
    surveyor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Surveyor).options(selectinload(Surveyor.user)).where(Surveyor.id == surveyor_id)
    )
    surveyor = result.scalar_one_or_none()
    if not surveyor:
        raise HTTPException(status_code=404, detail="Surveyor not found")
    return SurveyorResponse.model_validate(surveyor)


@router.put("/{surveyor_id}", response_model=SurveyorResponse)
async def update_surveyor(
    surveyor_id: str,
    data: SurveyorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(
        select(Surveyor).options(selectinload(Surveyor.user)).where(Surveyor.id == surveyor_id)
    )
    surveyor = result.scalar_one_or_none()
    if not surveyor:
        raise HTTPException(status_code=404, detail="Surveyor not found")

    update_data = data.model_dump(exclude_unset=True)
    # Update user fields
    user_fields = {k: update_data.pop(k) for k in ['full_name', 'phone'] if k in update_data}
    if user_fields:
        for key, value in user_fields.items():
            setattr(surveyor.user, key, value)
    # Update surveyor fields
    for key, value in update_data.items():
        setattr(surveyor, key, value)

    await db.commit()
    await db.refresh(surveyor)
    return SurveyorResponse.model_validate(surveyor)


@router.delete("/{surveyor_id}")
async def delete_surveyor(
    surveyor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(
        select(Surveyor).options(selectinload(Surveyor.user)).where(Surveyor.id == surveyor_id)
    )
    surveyor = result.scalar_one_or_none()
    if not surveyor:
        raise HTTPException(status_code=404, detail="Surveyor not found")
    user = surveyor.user
    await db.delete(surveyor)
    if user:
        await db.delete(user)
    await db.commit()
    return {"detail": "Surveyor deleted"}
