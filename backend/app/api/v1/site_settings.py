import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.site_settings import SiteSettings
from app.models.user import User
from app.schemas.site_settings import SiteSettingsUpdate, SiteSettingsResponse
from app.config import settings as app_settings

router = APIRouter(prefix="/site-settings", tags=["Site Settings"])

LOGO_DIR = os.path.join(app_settings.UPLOAD_DIR, "site")
os.makedirs(LOGO_DIR, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "svg", "webp", "ico"}


async def get_or_create_settings(db: AsyncSession) -> SiteSettings:
    result = await db.execute(select(SiteSettings).limit(1))
    site = result.scalar_one_or_none()
    if not site:
        site = SiteSettings()
        db.add(site)
        await db.commit()
        await db.refresh(site)
    return site


@router.get("", response_model=SiteSettingsResponse)
async def get_site_settings(db: AsyncSession = Depends(get_db)):
    """Get site settings (public — no auth required)."""
    site = await get_or_create_settings(db)
    return site


@router.put("", response_model=SiteSettingsResponse)
async def update_site_settings(
    data: SiteSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Update site settings (admin only)."""
    site = await get_or_create_settings(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(site, field, value)
    await db.commit()
    await db.refresh(site)
    return site


@router.post("/logo", response_model=SiteSettingsResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Upload company logo (admin only)."""
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    site = await get_or_create_settings(db)

    # Remove old logo
    if site.logo_path and os.path.exists(site.logo_path):
        os.remove(site.logo_path)

    filename = f"logo_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(LOGO_DIR, filename)

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large. Max 5MB.")

    with open(filepath, "wb") as f:
        f.write(content)

    site.logo_path = filepath
    await db.commit()
    await db.refresh(site)
    return site


@router.post("/favicon", response_model=SiteSettingsResponse)
async def upload_favicon(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Upload favicon (admin only)."""
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    site = await get_or_create_settings(db)

    if site.favicon_path and os.path.exists(site.favicon_path):
        os.remove(site.favicon_path)

    filename = f"favicon_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(LOGO_DIR, filename)

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large. Max 2MB.")

    with open(filepath, "wb") as f:
        f.write(content)

    site.favicon_path = filepath
    await db.commit()
    await db.refresh(site)
    return site


@router.get("/logo/file")
async def get_logo_file(db: AsyncSession = Depends(get_db)):
    """Serve the logo file."""
    site = await get_or_create_settings(db)
    if not site.logo_path or not os.path.exists(site.logo_path):
        raise HTTPException(status_code=404, detail="Logo not found")
    return FileResponse(site.logo_path)


@router.get("/favicon/file")
async def get_favicon_file(db: AsyncSession = Depends(get_db)):
    """Serve the favicon file."""
    site = await get_or_create_settings(db)
    if not site.favicon_path or not os.path.exists(site.favicon_path):
        raise HTTPException(status_code=404, detail="Favicon not found")
    return FileResponse(site.favicon_path)


@router.delete("/logo", response_model=SiteSettingsResponse)
async def delete_logo(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Delete the logo (admin only)."""
    site = await get_or_create_settings(db)
    if site.logo_path and os.path.exists(site.logo_path):
        os.remove(site.logo_path)
    site.logo_path = None
    await db.commit()
    await db.refresh(site)
    return site
