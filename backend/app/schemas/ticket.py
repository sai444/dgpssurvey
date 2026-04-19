from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class TicketCreate(BaseModel):
    project_id: UUID
    subject: str
    description: Optional[str] = None
    priority: str = "medium"
    category: str = "general"
    assigned_to: Optional[UUID] = None


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[UUID] = None
    status: Optional[str] = None


class TicketCommentCreate(BaseModel):
    comment: str


class TicketCommentResponse(BaseModel):
    id: UUID
    ticket_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    comment: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: UUID
    ticket_number: str
    project_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    subject: str
    description: Optional[str] = None
    status: str
    priority: str
    category: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
