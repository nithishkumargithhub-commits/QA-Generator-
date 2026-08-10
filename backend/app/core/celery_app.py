import os
from celery import Celery
from app.core.config import settings

broker_url = os.getenv("CELERY_BROKER_URL", settings.REDIS_URL or "redis://localhost:6379/0")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery(
    "qa_generator_tasks",
    broker=broker_url,
    backend=result_backend,
    include=[
        "app.workers.document_tasks",
        "app.workers.ai_tasks",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max per task
    task_soft_time_limit=540,
    worker_prefetch_multiplier=1,
)
