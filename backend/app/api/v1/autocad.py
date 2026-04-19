from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.document import ProjectDocument, ProjectDrawing, DrawingVersion
from app.models.user import User
from app.dependencies import get_current_user
from app.utils.file_utils import sanitize_filename
from app.config import settings
from app.schemas.document import DrawingVersionCreate, DrawingVersionUpdate, DrawingVersionResponse
from pydantic import BaseModel
from typing import Optional, List, Any
import os
import io
import uuid
import json

router = APIRouter(prefix="/projects/{project_id}/autocad", tags=["AutoCAD"])

DXF_COLOR_MAP = {
    1: "#FF0000", 2: "#FFFF00", 3: "#00FF00", 4: "#00FFFF",
    5: "#0000FF", 6: "#FF00FF", 7: "#FFFFFF",
}


def get_entity_color(entity):
    try:
        return DXF_COLOR_MAP.get(entity.dxf.color, "#00FF88")
    except Exception:
        return "#00FF88"


def parse_dxf_entities(doc):
    entities = []
    msp = doc.modelspace()
    for entity in msp:
        color = get_entity_color(entity)
        try:
            layer = entity.dxf.layer
        except Exception:
            layer = "0"
        etype = entity.dxftype()
        try:
            if etype == "LINE":
                entities.append({
                    "type": "line",
                    "start": [float(entity.dxf.start.x), float(entity.dxf.start.y)],
                    "end": [float(entity.dxf.end.x), float(entity.dxf.end.y)],
                    "layer": layer, "color": color,
                })
            elif etype == "CIRCLE":
                entities.append({
                    "type": "circle",
                    "center": [float(entity.dxf.center.x), float(entity.dxf.center.y)],
                    "radius": float(entity.dxf.radius),
                    "layer": layer, "color": color,
                })
            elif etype == "ARC":
                entities.append({
                    "type": "arc",
                    "center": [float(entity.dxf.center.x), float(entity.dxf.center.y)],
                    "radius": float(entity.dxf.radius),
                    "start_angle": float(entity.dxf.start_angle),
                    "end_angle": float(entity.dxf.end_angle),
                    "layer": layer, "color": color,
                })
            elif etype == "LWPOLYLINE":
                points = [[float(p[0]), float(p[1])] for p in entity.get_points()]
                entities.append({
                    "type": "polyline", "points": points,
                    "closed": entity.closed, "layer": layer, "color": color,
                })
            elif etype == "POLYLINE":
                points = [[float(v.dxf.location.x), float(v.dxf.location.y)] for v in entity.vertices]
                entities.append({
                    "type": "polyline", "points": points,
                    "closed": entity.is_closed, "layer": layer, "color": color,
                })
            elif etype == "TEXT":
                entities.append({
                    "type": "text",
                    "position": [float(entity.dxf.insert.x), float(entity.dxf.insert.y)],
                    "text": entity.dxf.text, "height": float(entity.dxf.height),
                    "layer": layer, "color": color,
                })
            elif etype == "MTEXT":
                entities.append({
                    "type": "text",
                    "position": [float(entity.dxf.insert.x), float(entity.dxf.insert.y)],
                    "text": entity.text, "height": float(entity.dxf.char_height),
                    "layer": layer, "color": color,
                })
            elif etype == "POINT":
                entities.append({
                    "type": "point",
                    "position": [float(entity.dxf.location.x), float(entity.dxf.location.y)],
                    "layer": layer, "color": color,
                })
            elif etype == "ELLIPSE":
                entities.append({
                    "type": "ellipse",
                    "center": [float(entity.dxf.center.x), float(entity.dxf.center.y)],
                    "major_axis": [float(entity.dxf.major_axis.x), float(entity.dxf.major_axis.y)],
                    "ratio": float(entity.dxf.ratio),
                    "layer": layer, "color": color,
                })
            elif etype == "SPLINE":
                points = [[float(p.x), float(p.y)] for p in entity.control_points]
                if points:
                    entities.append({
                        "type": "polyline", "points": points,
                        "closed": False, "layer": layer, "color": color,
                    })
        except Exception:
            continue
    return entities


@router.post("/upload")
async def upload_dxf(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".dxf"):
        raise HTTPException(400, "Only DXF files are allowed")

    safe_name = sanitize_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{safe_name}"
    file_path = os.path.join(settings.UPLOAD_DIR, "autocad", unique_name)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        import ezdxf
        dxf_doc = ezdxf.readfile(file_path)
        entities = parse_dxf_entities(dxf_doc)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(400, f"Failed to parse DXF file: {str(e)}")

    doc_record = ProjectDocument(
        project_id=project_id,
        uploaded_by=current_user.id,
        file_name=safe_name,
        file_path=file_path,
        file_type="autocad_dxf",
        file_size_bytes=len(content),
        description="AutoCAD DXF Drawing",
    )
    db.add(doc_record)
    await db.flush()

    result = await db.execute(
        select(ProjectDrawing).where(ProjectDrawing.project_id == project_id)
    )
    drawing = result.scalar_one_or_none()
    if drawing:
        drawing.dxf_entities = json.dumps(entities)
        drawing.source_file_id = doc_record.id
        drawing.annotations = None
    else:
        drawing = ProjectDrawing(
            project_id=project_id,
            dxf_entities=json.dumps(entities),
            source_file_id=doc_record.id,
        )
        db.add(drawing)

    # Auto-create a drawing version on import
    count_result = await db.execute(
        select(func.count()).select_from(DrawingVersion)
        .where(DrawingVersion.project_id == project_id)
    )
    next_version = (count_result.scalar() or 0) + 1
    version = DrawingVersion(
        project_id=project_id,
        version_name=f"Import - {safe_name}",
        version_number=next_version,
        dxf_entities=entities,
        annotations=[],
        notes=f"Auto-saved from DXF import: {safe_name}",
        created_by=current_user.id,
    )
    db.add(version)

    await db.commit()
    await db.refresh(version)
    return {
        "entities": entities,
        "document_id": str(doc_record.id),
        "count": len(entities),
        "version_id": str(version.id),
        "version_name": version.version_name,
    }


@router.get("/entities")
async def get_drawing_entities(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectDrawing).where(ProjectDrawing.project_id == project_id)
    )
    drawing = result.scalar_one_or_none()
    if not drawing:
        return {"entities": [], "annotations": []}
    entities = json.loads(drawing.dxf_entities) if drawing.dxf_entities else []
    annotations = json.loads(drawing.annotations) if drawing.annotations else []
    return {"entities": entities, "annotations": annotations}


class DrawingSaveRequest(BaseModel):
    entities: Optional[List[Any]] = None
    annotations: Optional[List[Any]] = None


@router.post("/save")
async def save_drawing(
    project_id: str,
    data: DrawingSaveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectDrawing).where(ProjectDrawing.project_id == project_id)
    )
    drawing = result.scalar_one_or_none()
    if not drawing:
        drawing = ProjectDrawing(
            project_id=project_id,
            dxf_entities=json.dumps(data.entities or []),
            annotations=json.dumps(data.annotations or []),
        )
        db.add(drawing)
    else:
        if data.entities is not None:
            drawing.dxf_entities = json.dumps(data.entities)
        if data.annotations is not None:
            drawing.annotations = json.dumps(data.annotations)
    await db.commit()
    return {"detail": "Drawing saved successfully"}


@router.get("/geojson")
async def get_geojson(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectDrawing).where(ProjectDrawing.project_id == project_id)
    )
    drawing = result.scalar_one_or_none()
    if not drawing:
        return {"type": "FeatureCollection", "features": []}
    entities = json.loads(drawing.dxf_entities) if drawing.dxf_entities else []
    features = []
    for ent in entities:
        if ent["type"] == "line":
            features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [ent["start"], ent["end"]]},
                "properties": {"layer": ent.get("layer", "")},
            })
        elif ent["type"] == "polyline":
            coords = ent["points"]
            if ent.get("closed") and len(coords) > 2:
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [coords + [coords[0]]]},
                    "properties": {"layer": ent.get("layer", "")},
                })
            else:
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "properties": {"layer": ent.get("layer", "")},
                })
    return {"type": "FeatureCollection", "features": features}


# ── Drawing Versions CRUD ──────────────────────────────────────────────

@router.get("/versions", response_model=List[DrawingVersionResponse])
async def list_drawing_versions(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DrawingVersion)
        .where(DrawingVersion.project_id == project_id)
        .order_by(DrawingVersion.version_number.desc())
    )
    return [DrawingVersionResponse.model_validate(v) for v in result.scalars().all()]


@router.post("/versions", response_model=DrawingVersionResponse)
async def create_drawing_version(
    project_id: str,
    data: DrawingVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count_result = await db.execute(
        select(func.count()).select_from(DrawingVersion)
        .where(DrawingVersion.project_id == project_id)
    )
    next_version = (count_result.scalar() or 0) + 1

    version = DrawingVersion(
        project_id=project_id,
        version_name=data.version_name,
        version_number=next_version,
        dxf_entities=data.dxf_entities,
        annotations=data.annotations or [],
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return DrawingVersionResponse.model_validate(version)


@router.get("/versions/{version_id}", response_model=DrawingVersionResponse)
async def get_drawing_version(
    project_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DrawingVersion).where(
            DrawingVersion.id == version_id,
            DrawingVersion.project_id == project_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Drawing version not found")
    return DrawingVersionResponse.model_validate(version)


@router.put("/versions/{version_id}", response_model=DrawingVersionResponse)
async def update_drawing_version(
    project_id: str,
    version_id: str,
    data: DrawingVersionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DrawingVersion).where(
            DrawingVersion.id == version_id,
            DrawingVersion.project_id == project_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Drawing version not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(version, key, value)

    await db.commit()
    await db.refresh(version)
    return DrawingVersionResponse.model_validate(version)


@router.delete("/versions/{version_id}")
async def delete_drawing_version(
    project_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DrawingVersion).where(
            DrawingVersion.id == version_id,
            DrawingVersion.project_id == project_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Drawing version not found")

    await db.delete(version)
    await db.commit()
    return {"detail": "Drawing version deleted"}
