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
    stmt = select(User).order_by(User.created_at.desc())
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

@router.get("/users/{user_id}/history")
async def get_user_full_history(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from app.models.models import UploadedFile, Quiz, QuizSession
    from sqlalchemy.orm import selectinload

    # User profile
    stmt_usr = select(User).where(User.id == user_id)
    res_usr = await db.execute(stmt_usr)
    user = res_usr.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Uploaded Documents
    stmt_docs = select(UploadedFile).where(UploadedFile.user_id == user_id).order_by(UploadedFile.created_at.desc())
    res_docs = await db.execute(stmt_docs)
    documents = res_docs.scalars().all()

    # Created Quizzes
    stmt_qz = select(Quiz).where(Quiz.creator_id == user_id).order_by(Quiz.created_at.desc())
    res_qz = await db.execute(stmt_qz)
    quizzes = res_qz.scalars().all()

    # Attempted Sessions
    stmt_sess = (
        select(QuizSession)
        .where(QuizSession.user_id == user_id)
        .options(selectinload(QuizSession.quiz))
        .order_by(QuizSession.started_at.desc())
    )
    res_sess = await db.execute(stmt_sess)
    sessions = res_sess.scalars().all()

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "is_suspended": user.is_suspended,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at
        },
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "file_size": d.file_size,
                "mime_type": d.mime_type,
                "status": d.status,
                "chapter_count": d.chapter_count,
                "topic_count": d.topic_count,
                "created_at": d.created_at
            } for d in documents
        ],
        "quizzes": [
            {
                "id": q.id,
                "title": q.title,
                "difficulty_level": q.difficulty_level,
                "question_count": q.question_count,
                "total_marks": q.total_marks,
                "created_at": q.created_at
            } for q in quizzes
        ],
        "sessions": [
            {
                "id": s.id,
                "quiz_id": s.quiz_id,
                "quiz_title": s.quiz.title if s.quiz else "Deleted Quiz",
                "status": s.status,
                "started_at": s.started_at,
                "completed_at": s.completed_at,
                "score": s.score,
                "max_score": s.max_score,
                "percentage": s.percentage,
                "grade": s.grade,
                "pass_status": s.pass_status,
                "total_time_seconds": s.total_time_seconds
            } for s in sessions
        ]
    }

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

