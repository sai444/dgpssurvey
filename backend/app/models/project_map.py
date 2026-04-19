import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ProjectMapVersion(Base):
    __tablename__ = "project_map_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_name = Column(String(255), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    markers = Column(JSON, nullable=False, default=list)
    center_lat = Column(String(50), nullable=True)
    center_lng = Column(String(50), nullable=True)
    zoom_level = Column(Integer, nullable=True, default=13)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
