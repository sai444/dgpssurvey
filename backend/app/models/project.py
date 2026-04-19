import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Date, Numeric, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    quoted = "quoted"
    approved = "approved"
    in_progress = "in_progress"
    completed = "completed"
    on_hold = "on_hold"
    cancelled = "cancelled"


class ProjectPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"))
    surveyor_id = Column(UUID(as_uuid=True), ForeignKey("surveyors.id"), nullable=True)
    status = Column(SAEnum(ProjectStatus), default=ProjectStatus.draft)
    priority = Column(SAEnum(ProjectPriority), default=ProjectPriority.medium)
    location = Column(Text)
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    area_sqm = Column(Numeric(12, 2))
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
