from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from app.config import settings
from app.database import engine, Base, async_session
from app.api.router import api_router
from app.models.user import User, UserRole
from app.utils.security import hash_password


async def seed_default_admin():
    """Create a default admin user if none exists."""
    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == UserRole.admin))
        if result.scalar_one_or_none() is None:
            admin = User(
                email="admin@dgps.com",
                password_hash=hash_password("admin123"),
                full_name="System Admin",
                phone="+91 00000 00000",
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            print("✅ Default admin created — email: admin@dgps.com / password: admin123")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_default_admin()
    yield
    await engine.dispose()


app = FastAPI(
    title="DGPS Survey Management System",
    description="Full-stack survey management with billing, quotations, and AutoCAD visualization",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "DGPS Survey API"}
