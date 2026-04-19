import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, BigInteger, Integer, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class FileType(str, enum.Enum):
    pdf = "pdf"
    autocad_dwg = "autocad_dwg"
    autocad_dxf = "autocad_dxf"
    image = "image"
    geojson = "geojson"
    other = "other"


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    file_name = Column(String(255))
    file_path = Column(Text)
    file_type = Column(SAEnum(FileType))
    file_size_bytes = Column(BigInteger)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProjectDrawing(Base):
    __tablename__ = "project_drawings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), unique=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey("project_documents.id"), nullable=True)
    dxf_entities = Column(Text)
    annotations = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DrawingVersion(Base):
    __tablename__ = "drawing_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_name = Column(String(255), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    dxf_entities = Column(JSON, nullable=False, default=list)
    annotations = Column(JSON, nullable=True, default=list)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
