from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.clients import router as clients_router
from app.api.v1.surveyors import router as surveyors_router
from app.api.v1.projects import router as projects_router
from app.api.v1.documents import router as documents_router
from app.api.v1.autocad import router as autocad_router
from app.api.v1.quotations import router as quotations_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.price_master import router as price_master_router
from app.api.v1.project_maps import router as project_maps_router
from app.api.v1.site_settings import router as site_settings_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(clients_router)
api_router.include_router(surveyors_router)
api_router.include_router(projects_router)
api_router.include_router(documents_router)
api_router.include_router(autocad_router)
api_router.include_router(quotations_router)
api_router.include_router(invoices_router)
api_router.include_router(tickets_router)
api_router.include_router(dashboard_router)
api_router.include_router(price_master_router)
api_router.include_router(project_maps_router)
api_router.include_router(site_settings_router)
