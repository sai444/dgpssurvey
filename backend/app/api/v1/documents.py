from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import uuid
from app.database import get_db
from app.models.document import ProjectDocument
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.dependencies import get_current_user
from app.utils.file_utils import sanitize_filename, get_file_type
from app.config import settings

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["Documents"])


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectDocument).where(ProjectDocument.project_id == project_id)
    )
    return [DocumentResponse.model_validate(d) for d in result.scalars().all()]


@router.post("", response_model=DocumentResponse)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    description: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    safe_name = sanitize_filename(file.filename or "upload")
    file_type = get_file_type(safe_name)
    unique_name = f"{uuid.uuid4()}_{safe_name}"
    file_path = os.path.join(settings.UPLOAD_DIR, "documents", unique_name)

    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc = ProjectDocument(
        project_id=project_id,
        uploaded_by=current_user.id,
        file_name=safe_name,
        file_path=file_path,
        file_type=file_type,
        file_size_bytes=len(content),
        description=description,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/download")
async def download_document(
    project_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectDocument).where(
            ProjectDocument.id == document_id,
            ProjectDocument.project_id == project_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    real_path = os.path.realpath(doc.file_path)
    upload_dir = os.path.realpath(settings.UPLOAD_DIR)
    if not real_path.startswith(upload_dir):
        raise HTTPException(status_code=403, detail="Access denied")
    return FileResponse(doc.file_path, filename=doc.file_name)


@router.delete("/{document_id}")
async def delete_document(
    project_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectDocument).where(
            ProjectDocument.id == document_id,
            ProjectDocument.project_id == project_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    await db.delete(doc)
    await db.commit()
    return {"detail": "Document deleted"}
