import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    surveyor = "surveyor"
    client = "client"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.client)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
