import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    company_name = Column(String(255))
    contact_person = Column(String(255))
    email = Column(String(255), nullable=False)
    phone = Column(String(20))
    address = Column(Text)
    gst_number = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
