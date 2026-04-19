from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


class MapMarker(BaseModel):
    id: str
    lat: float
    lng: float
    label: Optional[str] = None
    icon_type: Optional[str] = "default"
    color: Optional[str] = "#3B82F6"
    notes: Optional[str] = None


class MapVersionCreate(BaseModel):
    version_name: str
    markers: List[MapMarker] = []
    center_lat: Optional[str] = None
    center_lng: Optional[str] = None
    zoom_level: Optional[int] = 13
    notes: Optional[str] = None


class MapVersionUpdate(BaseModel):
    version_name: Optional[str] = None
    markers: Optional[List[MapMarker]] = None
    center_lat: Optional[str] = None
    center_lng: Optional[str] = None
    zoom_level: Optional[int] = None
    notes: Optional[str] = None


class MapVersionResponse(BaseModel):
    id: UUID
    project_id: UUID
    version_name: str
    version_number: int
    markers: List[Any] = []
    center_lat: Optional[str] = None
    center_lng: Optional[str] = None
    zoom_level: Optional[int] = None
    notes: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
