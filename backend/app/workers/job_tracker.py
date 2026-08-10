import json
import time
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("job_tracker")

# In-memory storage fallback if Redis is unavailable
_in_memory_jobs: Dict[str, Dict[str, Any]] = {}

class JobTracker:
    @staticmethod
    def _get_redis_client():
        try:
            import redis
            if settings.REDIS_URL:
                return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.debug(f"Redis client connection fallback to in-memory: {e}")
        return None

    @classmethod
    def set_job_status(
        cls,
        job_id: str,
        status: str,  # queued, processing, completed, failed
        progress: float = 0.0,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        data = {
            "job_id": job_id,
            "status": status,
            "progress": progress,
            "result": result or {},
            "error": error,
            "updated_at": time.time()
        }
        client = cls._get_redis_client()
        if client:
            try:
                client.set(f"job:{job_id}", json.dumps(data), ex=86400) # expire in 24 hours
                return data
            except Exception as e:
                logger.warning(f"Redis set_job_status failed: {e}")

        # Fallback to in-memory dictionary
        _in_memory_jobs[job_id] = data
        return data

    @classmethod
    def get_job_status(cls, job_id: str) -> Dict[str, Any]:
        client = cls._get_redis_client()
        if client:
            try:
                raw = client.get(f"job:{job_id}")
                if raw:
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"Redis get_job_status failed: {e}")

        return _in_memory_jobs.get(job_id, {
            "job_id": job_id,
            "status": "unknown",
            "progress": 0.0,
            "result": {},
            "error": "Job not found",
            "updated_at": time.time()
        })
