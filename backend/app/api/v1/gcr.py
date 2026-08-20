from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, GoogleClassroomAssignment
from app.services.gcr_service import gcr_service

from urllib.parse import quote, urlencode
from datetime import datetime, timezone, timedelta
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.security import create_access_token, decode_token

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

import json

@router.get("/oauth/url")
async def get_gcr_oauth_url(
    frontend_origin: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Generates the official Google OAuth 2.0 Authorization URL bound to the current logged-in user.
    """
    client_id = (settings.GOOGLE_CLIENT_ID or "").strip()
    if not client_id:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_CLIENT_ID is not configured in backend environment (.env). Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )

    redirect_uri = (settings.GOOGLE_REDIRECT_URI or "http://localhost:8000/api/v1/gcr/oauth/callback").strip()
    clean_frontend_origin = (frontend_origin or "http://localhost:5173").strip()
    
    # State payload serialized safely to JSON before token creation
    raw_state = json.dumps({
        "user_id": str(current_user.id),
        "redirect_uri": redirect_uri,
        "frontend_origin": clean_frontend_origin
    })
    state_token = create_access_token(subject=raw_state, expires_delta=timedelta(minutes=15))

    scopes = [
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
        "https://www.googleapis.com/auth/classroom.rosters.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid"
    ]

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent select_account",
        "state": state_token
    }

    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {
        "status": "success",
        "url": url,
        "client_id": client_id,
        "redirect_uri": redirect_uri
    }

@router.get("/oauth/callback")
async def gcr_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Handles Google OAuth redirect callback, exchanges authorization code for tokens,
    associates Google account with the logged-in application user, syncs courses,
    and redirects user back to frontend /gcr.
    """
    frontend_base = "http://localhost:5173"

    if error:
        return RedirectResponse(url=f"{frontend_base}/gcr?error={quote(error)}")

    if not code or not state:
        return RedirectResponse(url=f"{frontend_base}/gcr?error=missing_code_or_state")

    try:
        # Validate signed state token
        payload = decode_token(state)
        if not payload or not payload.get("sub"):
            return RedirectResponse(url=f"{frontend_base}/gcr?error=invalid_or_expired_oauth_state")

        try:
            state_data = json.loads(payload["sub"])
            user_id = state_data.get("user_id")
            redirect_uri = state_data.get("redirect_uri") or settings.GOOGLE_REDIRECT_URI
            frontend_base = state_data.get("frontend_origin") or "http://localhost:5173"
        except Exception:
            return RedirectResponse(url=f"{frontend_base}/gcr?error=corrupted_oauth_state")

        if not user_id:
            return RedirectResponse(url=f"{frontend_base}/gcr?error=missing_user_in_state")

        # Exchange authorization code for Google tokens
        tokens = await gcr_service.exchange_code_for_tokens(code, redirect_uri)
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")

        if not access_token:
            return RedirectResponse(url=f"{frontend_base}/gcr?error=failed_to_obtain_access_token")

        # Fetch Google user profile (email and stable sub ID)
        profile = await gcr_service.fetch_google_user_profile(access_token)
        google_email = profile.get("email")
        google_sub = profile.get("sub")

        # Associate credentials with current application user in DB
        res = await db.execute(select(User).where(User.id == user_id))
        user = res.scalar_one_or_none()
        if not user:
            return RedirectResponse(url=f"{frontend_base}/gcr?error=user_not_found")

        # Update User record
        user.gcr_api_key = access_token
        if refresh_token:
            user.gcr_refresh_token = refresh_token
        user.gcr_user_email = google_email
        user.gcr_sub_id = google_sub
        user.gcr_connected_at = datetime.now(timezone.utc)
        await db.commit()

        # Synchronize courses and assignments
        synced = await gcr_service.sync_user_gcr_data(db, user_id=user_id, api_key=access_token)

        success_msg = f"Successfully authenticated as {google_email or 'Google user'}! Synced {len(synced)} assignments."
        return RedirectResponse(url=f"{frontend_base}/gcr?status=success&message={quote(success_msg)}&email={quote(google_email or '')}")

    except Exception as e:
        return RedirectResponse(url=f"{frontend_base}/gcr?error={quote(str(e))}")

@router.post("/credentials")
async def save_gcr_credentials(
    payload: GCRCredentialsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="Google Classroom OAuth token cannot be empty.")

    try:
        await db.execute(delete(GoogleClassroomAssignment).where(GoogleClassroomAssignment.user_id == str(current_user.id)))
        await db.commit()

        current_user.gcr_api_key = None
        current_user.gcr_user_email = None
        current_user.gcr_connected_at = None
        await db.commit()

        assignments = await gcr_service.sync_user_gcr_data(
            db, user_id=str(current_user.id), api_key=key, clear_existing=False
        )

        await db.refresh(current_user)
        connected_email = getattr(current_user, "gcr_user_email", None)

        return {
            "status": "connected",
            "message": f"Successfully synced {len(assignments)} assignments from Google Classroom.",
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
    # Clear all GCR credentials & data for this user
    current_user.gcr_api_key = None
    current_user.gcr_refresh_token = None
    current_user.gcr_user_email = None
    current_user.gcr_sub_id = None
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
