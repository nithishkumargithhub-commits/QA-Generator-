import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.schemas.quiz import (
    SessionStartRequest, QuizAnswerSubmit, InstantFeedbackOut, SessionOut
)
from app.models.models import User, Quiz, Question, QuestionOption, QuizSession, QuizAnswer, ActivityLog
from app.services.quiz_engine import QuizEngine
from app.api.deps import get_current_user

router = APIRouter(prefix="/sessions", tags=["Quiz Sessions"])

@router.post("/start", response_model=SessionOut)
async def start_quiz_session(
    req: SessionStartRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Quiz).where(Quiz.id == req.quiz_id)
    res = await db.execute(stmt)
    quiz = res.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    session = QuizSession(
        user_id=current_user.id,
        quiz_id=quiz.id,
        status="in_progress",
        max_score=quiz.total_marks,
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "Browser")[:255]
    )
    db.add(session)
    await db.commit()

    stmt_reload = select(QuizSession).where(QuizSession.id == session.id).options(
        selectinload(QuizSession.answers)
    )
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalars().first()

@router.post("/{session_id}/answer", response_model=InstantFeedbackOut)
async def submit_answer(
    session_id: str,
    req: QuizAnswerSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Instant Feedback sub-100ms evaluation
    feedback = await QuizEngine.evaluate_answer(
        db=db,
        user_id=current_user.id,
        session_id=session_id,
        question_id=req.question_id,
        selected_options=req.selected_options,
        response_time_seconds=req.response_time_seconds,
        bookmark=req.bookmark,
        notes=req.notes
    )
    return feedback

@router.post("/{session_id}/complete", response_model=SessionOut)
async def complete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(QuizSession).where(QuizSession.id == session_id).options(
        selectinload(QuizSession.answers)
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")

    stmt_q = select(Question).where(Question.quiz_id == session.quiz_id)
    res_q = await db.execute(stmt_q)
    questions = res_q.scalars().all()
    total_questions = len(questions)

    total_obtained = sum(ans.marks_obtained for ans in session.answers)
    max_score = session.max_score or (total_questions * 10.0)
    percentage = round((total_obtained / max_score * 100.0), 2) if max_score > 0 else 0.0

    # Grade assignment
    if percentage >= 90:
        grade = "A+"
    elif percentage >= 80:
        grade = "A"
    elif percentage >= 70:
        grade = "B"
    elif percentage >= 60:
        grade = "C"
    elif percentage >= 50:
        grade = "D"
    else:
        grade = "F"

    stmt_quiz = select(Quiz).where(Quiz.id == session.quiz_id)
    res_quiz = await db.execute(stmt_quiz)
    quiz = res_quiz.scalars().first()
    passing = quiz.passing_score if quiz else 70.0

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    session.score = total_obtained
    session.percentage = percentage
    session.grade = grade
    session.pass_status = (percentage >= passing)

    if session.started_at:
        st = session.started_at if session.started_at.tzinfo else session.started_at.replace(tzinfo=timezone.utc)
        session.total_time_seconds = max(0, int((datetime.now(timezone.utc) - st).total_seconds()))


    # Log Activity
    log = ActivityLog(
        user_id=current_user.id,
        action="COMPLETE_QUIZ",
        details=f"Completed quiz session {session_id} with score {percentage}% ({grade})."
    )
    db.add(log)

    await db.commit()
    await db.refresh(session)
    return session

@router.get("/{session_id}/report", response_model=SessionOut)
async def get_session_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(QuizSession).where(QuizSession.id == session_id).options(
        selectinload(QuizSession.answers)
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    return session
