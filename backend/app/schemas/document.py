from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


class DocumentResponse(BaseModel):
    id: UUID
    project_id: Optional[UUID] = None
    uploaded_by: Optional[UUID] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DrawingVersionCreate(BaseModel):
    version_name: str
    dxf_entities: List[Any] = []
    annotations: List[Any] = []
    notes: Optional[str] = None


class DrawingVersionUpdate(BaseModel):
    version_name: Optional[str] = None
    dxf_entities: Optional[List[Any]] = None
    annotations: Optional[List[Any]] = None
    notes: Optional[str] = None


class DrawingVersionResponse(BaseModel):
    id: UUID
    project_id: UUID
    version_name: str
    version_number: int
    dxf_entities: List[Any] = []
    annotations: List[Any] = []
    notes: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
