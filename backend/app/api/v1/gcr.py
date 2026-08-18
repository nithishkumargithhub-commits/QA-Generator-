from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

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
        # Always fully wipe old GCR data first (assignments + user fields)
        # This prevents stale data from a previous account showing up
        await db.execute(delete(GoogleClassroomAssignment).where(GoogleClassroomAssignment.user_id == str(current_user.id)))
        await db.commit()

        # Reset user GCR fields before re-syncing
        current_user.gcr_api_key = None
        current_user.gcr_user_email = None
        current_user.gcr_connected_at = None
        await db.commit()

        # Sync real data from Google Classroom API
        assignments = await gcr_service.sync_user_gcr_data(
            db, user_id=str(current_user.id), api_key=key, clear_existing=False  # already cleared above
        )

        # Re-fetch the updated user to get the saved email
        await db.refresh(current_user)
        connected_email = getattr(current_user, "gcr_user_email", None)

        if assignments:
            msg = f"Successfully connected! Synced {len(assignments)} assignments from Google Classroom."
        elif connected_email:
            msg = f"Connected as {connected_email}. Use 'Sign In with Google' (OAuth) to load your real courses and assignments."
        else:
            msg = "Connected. Use the 'Sign In with Google' button to authorize and load your real Google Classroom data."

        return {
            "status": "connected",
            "message": msg,
            "synced_count": len(assignments),
            "connected_email": connected_email
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to Google Classroom: {str(e)}")

@router.delete("/credentials")
async def disconnect_gcr(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Clear all GCR data for this user
    current_user.gcr_api_key = None
    current_user.gcr_user_email = None
    current_user.gcr_connected_at = None
    await db.execute(delete(GoogleClassroomAssignment).where(GoogleClassroomAssignment.user_id == str(current_user.id)))
    await db.commit()
    return {"status": "disconnected", "message": "Google Classroom integration disconnected and all data cleared."}

@router.get("/assignments")
async def list_gcr_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    saved_key = getattr(current_user, "gcr_api_key", None)
    if not saved_key:
        return {
            "is_connected": False,
            "connected_at": None,
            "connected_email": None,
            "assignments": []
        }

    # Fetch assignments from DB only — no auto-re-sync to avoid re-fetching mock data
    res = await db.execute(
        select(GoogleClassroomAssignment)
        .where(GoogleClassroomAssignment.user_id == str(current_user.id))
        .order_by(GoogleClassroomAssignment.due_date.asc())
    )
    items = res.scalars().all()

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
        "is_connected": True,
        "connected_at": current_user.gcr_connected_at.isoformat() if getattr(current_user, "gcr_connected_at", None) else None,
        "connected_email": getattr(current_user, "gcr_user_email", None),
        "assignments": output
    }

@router.post("/sync")
async def trigger_gcr_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    saved_key = getattr(current_user, "gcr_api_key", None)
    if not saved_key:
        raise HTTPException(
            status_code=400,
            detail="No Google Classroom account connected. Please sign in with Google OAuth first."
        )

    key: str = str(saved_key)
    if not gcr_service.is_real_oauth_token(key):
        raise HTTPException(
            status_code=400,
            detail="Your current login method cannot sync real courses. Please use 'Sign In with Google' (OAuth) to load your actual Google Classroom data."
        )

    assignments = await gcr_service.sync_user_gcr_data(db, user_id=str(current_user.id), api_key=key)
    return {
        "status": "success",
        "synced_count": len(assignments),
        "message": f"Successfully synced {len(assignments)} assignments from your Google Classroom account."
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
