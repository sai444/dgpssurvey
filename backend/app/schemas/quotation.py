from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime


class QuotationItemCreate(BaseModel):
    description: str
    quantity: float
    unit: str = "sq.ft"
    unit_price: float
    amount: Optional[float] = None


class QuotationCreate(BaseModel):
    project_id: UUID
    client_id: UUID
    tax_percent: float = 18.0
    discount: float = 0
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    items: List[QuotationItemCreate] = []


class QuotationUpdate(BaseModel):
    project_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    tax_percent: Optional[float] = None
    discount: Optional[float] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None


class QuotationItemResponse(BaseModel):
    id: UUID
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None

    class Config:
        from_attributes = True


class QuotationResponse(BaseModel):
    id: UUID
    quotation_number: str
    project_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    status: str
    subtotal: Optional[float] = None
    tax_percent: Optional[float] = None
    tax_amount: Optional[float] = None
    discount: Optional[float] = None
    total_amount: Optional[float] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    items: List[QuotationItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
