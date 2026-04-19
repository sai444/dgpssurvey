from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.project import Project
from app.models.invoice import Invoice
from app.models.quotation import Quotation
from app.models.ticket import Ticket
from app.models.client import Client
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects_count = (await db.execute(select(func.count()).select_from(Project))).scalar()
    clients_count = (await db.execute(select(func.count()).select_from(Client))).scalar()
    invoices_count = (await db.execute(select(func.count()).select_from(Invoice))).scalar()
    tickets_count = (await db.execute(select(func.count()).select_from(Ticket))).scalar()

    total_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.amount_paid), 0)).where(Invoice.status.in_(["paid", "partial"]))
    )
    total_revenue = float(total_revenue_result.scalar() or 0)

    pending_amount_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total_amount - Invoice.amount_paid), 0)).where(
            Invoice.status.in_(["sent", "partial", "overdue"])
        )
    )
    pending_amount = float(pending_amount_result.scalar() or 0)

    active_projects = (await db.execute(
        select(func.count()).select_from(Project).where(Project.status == "in_progress")
    )).scalar()

    open_tickets = (await db.execute(
        select(func.count()).select_from(Ticket).where(Ticket.status.in_(["open", "in_progress"]))
    )).scalar()

    return {
        "total_projects": projects_count,
        "active_projects": active_projects,
        "total_clients": clients_count,
        "total_invoices": invoices_count,
        "total_revenue": total_revenue,
        "pending_amount": pending_amount,
        "open_tickets": open_tickets,
        "total_tickets": tickets_count,
    }


@router.get("/recent-projects")
async def recent_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()).limit(5))
    projects = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "project_number": p.project_number,
            "title": p.title,
            "status": p.status.value if hasattr(p.status, 'value') else p.status,
            "priority": p.priority.value if hasattr(p.priority, 'value') else p.priority,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]
