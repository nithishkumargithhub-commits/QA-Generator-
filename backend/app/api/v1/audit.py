from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import AuditLog, ActivityLog, User
from app.api.deps import get_current_admin

router = APIRouter(prefix="/audit", tags=["Audit & Activity Logs"])

@router.get("/logs")
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "details": l.details,
            "created_at": l.created_at
        } for l in logs
    ]
