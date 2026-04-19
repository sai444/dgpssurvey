from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class PriceTierCreate(BaseModel):
    category: str  # "survey" or "layout"
    label: str
    condition: str
    min_acres: Optional[float] = None
    max_acres: Optional[float] = None
    price_per_acre: float


class PriceTierUpdate(BaseModel):
    label: Optional[str] = None
    price_per_acre: Optional[float] = None
    is_active: Optional[bool] = None


class PriceTierResponse(BaseModel):
    id: UUID
    category: str
    label: str
    condition: str
    min_acres: Optional[float] = None
    max_acres: Optional[float] = None
    price_per_acre: float
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentTermsCreate(BaseModel):
    name: str
    description: Optional[str] = None
    milestone_percent: float
    milestone_label: str
    sort_order: int = 0


class PaymentTermsUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    milestone_percent: Optional[float] = None
    milestone_label: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class PaymentTermsResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    milestone_percent: float
    milestone_label: str
    sort_order: Optional[int] = 0
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
