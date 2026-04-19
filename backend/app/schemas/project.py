from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    surveyor_id: Optional[UUID] = None
    status: str = "draft"
    priority: str = "medium"
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_sqm: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    surveyor_id: Optional[UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_sqm: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectResponse(BaseModel):
    id: UUID
    project_number: str
    title: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    surveyor_id: Optional[UUID] = None
    status: str
    priority: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_sqm: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
