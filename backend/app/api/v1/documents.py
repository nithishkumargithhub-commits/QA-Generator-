import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.schemas.document import DocumentOut, FileVersionOut
from app.models.models import User, UploadedFile, FileVersion, ActivityLog
from app.services.document_processor import DocumentProcessor
from app.api.deps import get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".pptx", ".txt", ".png", ".jpg", ".jpeg"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    save_path = os.path.join(settings.UPLOAD_DIR, filename)

    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size limit of {settings.MAX_FILE_SIZE_MB}MB.")

    with open(save_path, "wb") as f:
        f.write(contents)

    # Save file record with status='processing'
    doc = UploadedFile(
        id=file_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=save_path,
        file_size=len(contents),
        mime_type=file.content_type or "application/octet-stream",
        status="processing",
        extracted_text="",
        topic_summary=[],
        chapter_count=0,
        topic_count=0
    )
    db.add(doc)

    # Version history entry
    v = FileVersion(
        file_id=doc.id,
        version_number=1,
        file_path=save_path,
        changes_summary="Initial upload, queued for background processing."
    )
    db.add(v)

    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="UPLOAD_DOCUMENT",
        details=f"Uploaded file '{file.filename}' ({len(contents)} bytes)."
    )
    db.add(log)

    await db.commit()
    await db.refresh(doc)

    # Enqueue Background Celery Task
    from app.workers.job_tracker import JobTracker
    from app.workers.document_tasks import process_document_task
    JobTracker.set_job_status(file_id, "queued", progress=0.0)

    try:
        process_document_task.delay(file_id, save_path, doc.mime_type)
    except Exception as e:
        # Fallback to inline processing if Celery worker connection is not active
        processed = DocumentProcessor.process_file(save_path, doc.mime_type)
        doc.extracted_text = processed["text"]
        doc.topic_summary = processed["topics"]
        doc.chapter_count = processed["chapter_count"]
        doc.topic_count = processed["topic_count"]
        doc.status = "ready"
        await db.commit()
        await db.refresh(doc)
        JobTracker.set_job_status(file_id, "completed", progress=1.0)

    return doc

@router.get("", response_model=List[DocumentOut])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() == "admin":
        stmt = select(UploadedFile)
    else:
        stmt = select(UploadedFile).where(UploadedFile.user_id == current_user.id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{document_id}/job_status")
async def get_document_job_status(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    from app.workers.job_tracker import JobTracker
    return JobTracker.get_job_status(document_id)

@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(UploadedFile).where(UploadedFile.id == document_id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.post("/{document_id}/reprocess", response_model=DocumentOut)
async def reprocess_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(UploadedFile).where(UploadedFile.id == document_id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc.status = "processing"
    await db.commit()
    await db.refresh(doc)

    from app.workers.job_tracker import JobTracker
    from app.workers.document_tasks import process_document_task
    JobTracker.set_job_status(document_id, "queued", progress=0.0)

    try:
        process_document_task.delay(document_id, doc.file_path, doc.mime_type)
    except Exception:
        processed = DocumentProcessor.process_file(doc.file_path, doc.mime_type)
        doc.extracted_text = processed["text"]
        doc.topic_summary = processed["topics"]
        doc.chapter_count = processed["chapter_count"]
        doc.topic_count = processed["topic_count"]
        doc.status = "ready"
        await db.commit()
        await db.refresh(doc)
        JobTracker.set_job_status(document_id, "completed", progress=1.0)

    return doc


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(UploadedFile).where(UploadedFile.id == document_id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if current_user.role.lower() != "admin" and doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document.")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully."}
