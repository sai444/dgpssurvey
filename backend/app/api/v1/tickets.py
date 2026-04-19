from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models.ticket import Ticket, TicketComment
from app.models.user import User, UserRole
from app.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketResponse,
    TicketCommentCreate, TicketCommentResponse,
)
from app.dependencies import get_current_user
from app.utils.number_generator import generate_number

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("", response_model=List[TicketResponse])
async def list_tickets(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Ticket)
    if status:
        query = query.where(Ticket.status == status)
    result = await db.execute(query.order_by(Ticket.created_at.desc()))
    return [TicketResponse.model_validate(t) for t in result.scalars().all()]


@router.post("", response_model=TicketResponse)
async def create_ticket(
    data: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count_result = await db.execute(select(func.count()).select_from(Ticket))
    count = count_result.scalar()
    ticket_number = generate_number("TKT", count)

    ticket = Ticket(
        ticket_number=ticket_number,
        project_id=data.project_id,
        created_by=current_user.id,
        assigned_to=data.assigned_to,
        subject=data.subject,
        description=data.description,
        priority=data.priority,
        category=data.category,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return TicketResponse.model_validate(ticket)


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return TicketResponse.model_validate(ticket)


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ticket, key, value)
    await db.commit()
    await db.refresh(ticket)
    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/comments", response_model=TicketCommentResponse)
async def add_comment(
    ticket_id: str,
    data: TicketCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        comment=data.comment,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return TicketCommentResponse.model_validate(comment)


@router.get("/{ticket_id}/comments", response_model=List[TicketCommentResponse])
async def list_comments(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TicketComment).where(TicketComment.ticket_id == ticket_id).order_by(TicketComment.created_at)
    )
    return [TicketCommentResponse.model_validate(c) for c in result.scalars().all()]
