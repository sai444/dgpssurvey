from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class SiteSettingsBase(BaseModel):
    company_name: Optional[str] = "DGPS Survey"
    tagline: Optional[str] = "Professional Survey & Mapping Services"
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    copyright_text: Optional[str] = "© 2026 DGPS Survey. All rights reserved."
    footer_text: Optional[str] = "Thank you for your business"
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    upi_id: Optional[str] = None
    invoice_prefix: Optional[str] = "INV"
    quotation_prefix: Optional[str] = "QTN"
    invoice_terms: Optional[str] = None
    quotation_terms: Optional[str] = None


class SiteSettingsUpdate(SiteSettingsBase):
    pass


class SiteSettingsResponse(SiteSettingsBase):
    id: str
    logo_path: Optional[str] = None
    favicon_path: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @field_validator("id", mode="before")
    @classmethod
    def stringify_id(cls, v):
        return str(v) if v is not None else v

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def stringify_datetime(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    class Config:
        from_attributes = True
