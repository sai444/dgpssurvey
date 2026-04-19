from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ClientCreate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class ClientResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
