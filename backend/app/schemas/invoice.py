from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float
    unit: str = "sqm"
    unit_price: float
    amount: Optional[float] = None


class InvoiceCreate(BaseModel):
    project_id: UUID
    client_id: UUID
    quotation_id: Optional[UUID] = None
    tax_percent: float = 18.0
    discount: float = 0
    due_date: Optional[date] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    tax_percent: Optional[float] = None
    discount: Optional[float] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceItemResponse(BaseModel):
    id: UUID
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    project_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    quotation_id: Optional[UUID] = None
    status: str
    subtotal: Optional[float] = None
    tax_percent: Optional[float] = None
    tax_amount: Optional[float] = None
    discount: Optional[float] = None
    total_amount: Optional[float] = None
    amount_paid: Optional[float] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    items: List[InvoiceItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    amount: float
    payment_method: str = "bank_transfer"
    reference_number: Optional[str] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: UUID
    invoice_id: Optional[UUID] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
