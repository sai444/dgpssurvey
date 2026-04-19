import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Date, Numeric, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    bank_transfer = "bank_transfer"
    upi = "upi"
    cheque = "cheque"
    online = "online"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"))
    amount = Column(Numeric(12, 2))
    payment_method = Column(SAEnum(PaymentMethod))
    reference_number = Column(String(100))
    payment_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
