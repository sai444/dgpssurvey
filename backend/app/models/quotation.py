import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Date, Numeric, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_number = Column(String(50), unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"))
    status = Column(SAEnum(QuotationStatus), default=QuotationStatus.draft)
    subtotal = Column(Numeric(12, 2))
    tax_percent = Column(Numeric(5, 2))
    tax_amount = Column(Numeric(12, 2))
    discount = Column(Numeric(12, 2), default=0)
    total_amount = Column(Numeric(12, 2))
    valid_until = Column(Date)
    notes = Column(Text)
    terms_conditions = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"))
    description = Column(Text)
    quantity = Column(Numeric(10, 2))
    unit = Column(String(20))
    unit_price = Column(Numeric(12, 2))
    amount = Column(Numeric(12, 2))
