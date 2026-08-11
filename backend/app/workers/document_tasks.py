import asyncio
import logging
try:
    from app.core.celery_app import celery_app
except Exception:
    celery_app = None

def _task_fallback(*args, **kwargs):
    def wrapper(fn):
        return fn
    return wrapper

task_dec = celery_app.task if (celery_app and hasattr(celery_app, "task")) else _task_fallback
from app.core.database import AsyncSessionLocal
from app.models.models import UploadedFile
from app.services.document_processor import DocumentProcessor
from app.workers.job_tracker import JobTracker
from sqlalchemy import select

logger = logging.getLogger("document_tasks")

async def _async_process_document(document_id: str, file_path: str, mime_type: str):
    JobTracker.set_job_status(document_id, "processing", progress=0.2)

    # Execute CPU/IO document parsing & text extraction
    processed = DocumentProcessor.process_file(file_path, mime_type)

    JobTracker.set_job_status(document_id, "processing", progress=0.7)

    # Update database record
    async with AsyncSessionLocal() as session:
        stmt = select(UploadedFile).where(UploadedFile.id == document_id)
        res = await session.execute(stmt)
        doc = res.scalars().first()
        if doc:
            doc.extracted_text = processed.get("text", "")
            doc.topic_summary = processed.get("topics", [])
            doc.chapter_count = processed.get("chapter_count", 0)
            doc.topic_count = processed.get("topic_count", 0)
            doc.status = "ready"
            await session.commit()
            logger.info(f"Document {document_id} processed successfully.")
        else:
            logger.error(f"Document {document_id} not found in database.")

    JobTracker.set_job_status(
        document_id,
        "completed",
        progress=1.0,
        result={
            "chapter_count": processed.get("chapter_count", 0),
            "topic_count": processed.get("topic_count", 0)
        }
    )
    return processed

@task_dec(bind=True, max_retries=3, default_retry_delay=5, retry_backoff=True)

def process_document_task(self, document_id: str, file_path: str, mime_type: str):
    try:
        return asyncio.run(_async_process_document(document_id, file_path, mime_type))
    except Exception as exc:
        logger.error(f"Error processing document {document_id}: {exc}")
        JobTracker.set_job_status(document_id, "failed", progress=0.0, error=str(exc))

        async def _mark_failed():
            async with AsyncSessionLocal() as session:
                stmt = select(UploadedFile).where(UploadedFile.id == document_id)
                res = await session.execute(stmt)
                doc = res.scalars().first()
                if doc:
                    doc.status = "failed"
                    await session.commit()
        try:
            asyncio.run(_mark_failed())
        except Exception:
            pass

        raise self.retry(exc=exc)
