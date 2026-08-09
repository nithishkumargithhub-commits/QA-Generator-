from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.schemas.analytics import AdminDashboardSummary
from app.schemas.user import UserOut, UserUpdate
from app.services.analytics_service import AnalyticsService
from app.api.deps import get_current_admin
from app.models.models import User, AuditLog, ActivityLog

router = APIRouter(prefix="/admin", tags=["Admin & Enterprise LMS"])

@router.get("/dashboard", response_model=AdminDashboardSummary)
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return await AnalyticsService.get_admin_dashboard(db)

@router.get("/users", response_model=List[UserOut])
async def admin_list_users(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(User)
    if search:
        stmt = stmt.where((User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    is_active: Optional[bool] = None,
    is_suspended: Optional[bool] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if is_active is not None:
        user.is_active = is_active
    if is_suspended is not None:
        user.is_suspended = is_suspended
    if role is not None:
        user.role = role

    audit = AuditLog(
        admin_id=admin.id,
        target_resource=f"User:{user.username}",
        action="UPDATE_USER_STATUS",
        payload={"is_active": is_active, "is_suspended": is_suspended, "role": role}
    )
    db.add(audit)

    await db.commit()
    return {"message": f"User '{user.username}' status updated successfully."}

@router.get("/export/csv")
async def export_system_data(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(User)
    res = await db.execute(stmt)
    users = res.scalars().all()

    csv_lines = ["ID,Username,Email,Role,IsActive,IsSuspended,CreatedAt"]
    for u in users:
        csv_lines.append(f'"{u.id}","{u.username}","{u.email}","{u.role}",{u.is_active},{u.is_suspended},"{u.created_at}"')

    csv_data = "\n".join(csv_lines)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="users_export.csv"'}
    )
