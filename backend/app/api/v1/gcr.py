from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, GoogleClassroomAssignment
from app.services.gcr_service import gcr_service

router = APIRouter(prefix="/gcr", tags=["Google Classroom Integration"])

class GCRCredentialsRequest(BaseModel):
    api_key: str

class GCRAssignmentOut(BaseModel):
    id: str
    gcr_course_id: str
    gcr_coursework_id: str
    course_name: str
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    max_points: float
    submission_state: str
    alternate_link: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

@router.post("/credentials")
async def save_gcr_credentials(
    payload: GCRCredentialsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="Google Classroom API Key or OAuth token cannot be empty.")

    try:
        assignments = await gcr_service.sync_user_gcr_data(db, user_id=str(current_user.id), api_key=key)
        return {
            "status": "connected",
            "message": f"Successfully connected to Google Classroom! {len(assignments)} coursework assignments synced.",
            "synced_count": len(assignments)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to Google Classroom: {str(e)}")

@router.delete("/credentials")
async def disconnect_gcr(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.gcr_api_key = None
    current_user.gcr_connected_at = None
    await db.commit()
    return {"status": "disconnected", "message": "Google Classroom integration disconnected."}

@router.get("/assignments")
async def list_gcr_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user has GCR key saved, if not auto-sync fallback mock data for smooth experience
    key = current_user.gcr_api_key or "demo_gcr_key_sandbox"
    
    res = await db.execute(
        select(GoogleClassroomAssignment)
        .where(GoogleClassroomAssignment.user_id == str(current_user.id))
        .order_by(GoogleClassroomAssignment.due_date.asc())
    )
    items = res.scalars().all()

    if not items:
        items = await gcr_service.sync_user_gcr_data(db, user_id=str(current_user.id), api_key=key)

    output = []
    for item in items:
        output.append({
            "id": item.id,
            "gcr_course_id": item.gcr_course_id,
            "gcr_coursework_id": item.gcr_coursework_id,
            "course_name": item.course_name,
            "title": item.title,
            "description": item.description,
            "due_date": item.due_date.isoformat() if item.due_date else None,
            "max_points": item.max_points,
            "submission_state": item.submission_state,
            "alternate_link": item.alternate_link,
            "created_at": item.created_at.isoformat() if item.created_at else ""
        })

    return {
        "is_connected": bool(current_user.gcr_api_key),
        "connected_at": current_user.gcr_connected_at.isoformat() if current_user.gcr_connected_at else None,
        "assignments": output
    }

@router.post("/sync")
async def trigger_gcr_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    key = current_user.gcr_api_key or "demo_gcr_key_sandbox"
    assignments = await gcr_service.sync_user_gcr_data(db, user_id=str(current_user.id), api_key=key)
    return {
        "status": "success",
        "synced_count": len(assignments),
        "message": "Google Classroom homework assignments successfully synced."
    }

@router.post("/generate-quiz/{assignment_id}")
async def generate_quiz_from_gcr_assignment(
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        quiz = await gcr_service.generate_quiz_from_assignment(db, user_id=str(current_user.id), assignment_id=assignment_id)
        return {
            "status": "success",
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "question_count": quiz.question_count,
            "message": "AI practice quiz successfully generated from Google Classroom homework."
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")
