import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class PriceTier(Base):
    __tablename__ = "price_tiers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(50), nullable=False)  # "survey" or "layout"
    label = Column(String(100), nullable=False)
    condition = Column(String(50), nullable=False)  # "lt_10", "lt_20", "gte_20", "approved", "unapproved"
    min_acres = Column(Numeric(10, 2), nullable=True)
    max_acres = Column(Numeric(10, 2), nullable=True)
    price_per_acre = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PaymentTerms(Base):
    __tablename__ = "payment_terms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    milestone_percent = Column(Numeric(5, 2), nullable=False)  # e.g. 30, 40, 30
    milestone_label = Column(String(100), nullable=False)  # e.g. "Advance", "On Field Completion", "On Delivery"
    sort_order = Column(Numeric(3, 0), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
