from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models.project import Project
from app.models.project_map import ProjectMapVersion
from app.models.user import User
from app.schemas.project_map import MapVersionCreate, MapVersionUpdate, MapVersionResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/projects/{project_id}/map-versions", tags=["Project Maps"])


@router.get("", response_model=List[MapVersionResponse])
async def list_map_versions(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(ProjectMapVersion)
        .where(ProjectMapVersion.project_id == project_id)
        .order_by(ProjectMapVersion.version_number.desc())
    )
    return [MapVersionResponse.model_validate(v) for v in result.scalars().all()]


@router.post("", response_model=MapVersionResponse)
async def create_map_version(
    project_id: str,
    data: MapVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    count_result = await db.execute(
        select(func.count()).select_from(ProjectMapVersion)
        .where(ProjectMapVersion.project_id == project_id)
    )
    next_version = (count_result.scalar() or 0) + 1

    markers_data = [m.model_dump() for m in data.markers]

    version = ProjectMapVersion(
        project_id=project_id,
        version_name=data.version_name,
        version_number=next_version,
        markers=markers_data,
        center_lat=data.center_lat,
        center_lng=data.center_lng,
        zoom_level=data.zoom_level,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return MapVersionResponse.model_validate(version)


@router.get("/{version_id}", response_model=MapVersionResponse)
async def get_map_version(
    project_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectMapVersion).where(
            ProjectMapVersion.id == version_id,
            ProjectMapVersion.project_id == project_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Map version not found")
    return MapVersionResponse.model_validate(version)


@router.put("/{version_id}", response_model=MapVersionResponse)
async def update_map_version(
    project_id: str,
    version_id: str,
    data: MapVersionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectMapVersion).where(
            ProjectMapVersion.id == version_id,
            ProjectMapVersion.project_id == project_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Map version not found")

    update_data = data.model_dump(exclude_unset=True)
    if "markers" in update_data and update_data["markers"] is not None:
        update_data["markers"] = [
            m.model_dump() if hasattr(m, 'model_dump') else m
            for m in (data.markers or [])
        ]

    for key, value in update_data.items():
        setattr(version, key, value)

    await db.commit()
    await db.refresh(version)
    return MapVersionResponse.model_validate(version)


@router.delete("/{version_id}")
async def delete_map_version(
    project_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectMapVersion).where(
            ProjectMapVersion.id == version_id,
            ProjectMapVersion.project_id == project_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Map version not found")

    await db.delete(version)
    await db.commit()
    return {"detail": "Map version deleted"}
