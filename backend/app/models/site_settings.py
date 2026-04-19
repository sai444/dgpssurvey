import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SiteSettings(Base):
    __tablename__ = "site_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False, default="DGPS Survey")
    tagline = Column(String(500), nullable=True, default="Professional Survey & Mapping Services")
    logo_path = Column(String(500), nullable=True)
    favicon_path = Column(String(500), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    gst_number = Column(String(50), nullable=True)
    pan_number = Column(String(50), nullable=True)
    copyright_text = Column(String(500), nullable=True, default="© 2026 DGPS Survey. All rights reserved.")
    footer_text = Column(Text, nullable=True, default="Thank you for your business")
    bank_name = Column(String(255), nullable=True)
    bank_account_number = Column(String(100), nullable=True)
    bank_ifsc = Column(String(50), nullable=True)
    bank_branch = Column(String(255), nullable=True)
    upi_id = Column(String(255), nullable=True)
    invoice_prefix = Column(String(20), nullable=True, default="INV")
    quotation_prefix = Column(String(20), nullable=True, default="QTN")
    invoice_terms = Column(Text, nullable=True)
    quotation_terms = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
