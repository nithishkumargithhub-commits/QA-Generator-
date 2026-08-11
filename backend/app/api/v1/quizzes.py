import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.schemas.quiz import (
    GenerateQuizRequest, QuizCreate, QuizOut, QuestionSchema, QuestionOptionSchema
)
from app.models.models import User, UploadedFile, Quiz, Question, QuestionOption, QuizTopic, ActivityLog
from app.services.ai_generator import AIGeneratorService, MCQExtractor
from app.api.deps import get_current_user, get_current_instructor_or_admin

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.post("/generate", response_model=QuizOut)
async def generate_quiz(
    req: GenerateQuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc_title = "AI Assessment"
    if req.document_id:
        stmt = select(UploadedFile).where(UploadedFile.id == req.document_id)
        res = await db.execute(stmt)
        doc = res.scalars().first()
        if doc and doc.filename:
            doc_title = doc.filename.rsplit(".", 1)[0]

    is_extract = req.mode == "extract"
    quiz = Quiz(
        creator_id=current_user.id,
        document_id=req.document_id,
        title=req.title or (f"{doc_title} — Converted Quiz" if is_extract else f"{doc_title} - {req.difficulty} Quiz"),
        description=(
            f"Extracted questions from uploaded document."
            if is_extract
            else f"AI generated quiz at {req.difficulty} level."
        ),
        time_limit_minutes=req.time_limit_minutes,
        passing_score=req.passing_score,
        is_published=True,
        difficulty_level="Medium" if is_extract else req.difficulty,
        question_count=0,
        total_marks=0.0,
        mode="Standard"
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)

    job_id = str(uuid.uuid4())
    from app.workers.job_tracker import JobTracker
    JobTracker.set_job_status(job_id, "processing", progress=0.1, result={"quiz_id": quiz.id})

    req_dict = req.model_dump() if hasattr(req, "model_dump") else req.dict()

    # Generate questions inline synchronously to guarantee instant availability
    from app.workers.ai_tasks import _async_generate_quiz
    await _async_generate_quiz(job_id, quiz.id, req_dict, req.document_id, current_user.id)

    try:
        from app.workers.ai_tasks import generate_quiz_task
        generate_quiz_task.delay(job_id, quiz.id, req_dict, req.document_id, current_user.id)
    except Exception:
        pass

    # Re-fetch quiz with populated questions & options
    stmt_full = (
        select(Quiz)
        .where(Quiz.id == quiz.id)
        .execution_options(populate_existing=True)
        .options(selectinload(Quiz.questions).selectinload(Question.options))
    )
    res_full = await db.execute(stmt_full)
    quiz_loaded = res_full.scalars().first() or quiz

    return quiz_loaded

@router.get("/jobs/{job_id}")
async def get_quiz_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    from app.workers.job_tracker import JobTracker
    return JobTracker.get_job_status(job_id)

@router.get("", response_model=List[QuizOut])

async def list_quizzes(
    difficulty: Optional[str] = None,
    mode: Optional[str] = None,
    my_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Quiz).where(Quiz.is_published == True).options(
        selectinload(Quiz.questions).selectinload(Question.options)
    )

    # Security & Privacy: Non-admin users (Students/Clients) ONLY see quizzes they created.
    # Admins see all quizzes by default unless my_only=True is explicitly set.
    if current_user.role.lower() != "admin" or my_only:
        stmt = stmt.where(Quiz.creator_id == current_user.id)

    if difficulty:
        stmt = stmt.where(Quiz.difficulty_level == difficulty)
    if mode:
        stmt = stmt.where(Quiz.mode == mode)

    stmt = stmt.order_by(Quiz.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{quiz_id}", response_model=QuizOut)
async def get_quiz(
    quiz_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Quiz).where(Quiz.id == quiz_id).options(
        selectinload(Quiz.questions).selectinload(Question.options)
    )
    res = await db.execute(stmt)
    quiz = res.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return quiz

@router.put("/{quiz_id}/questions/{question_id}")
async def update_question(
    quiz_id: str,
    question_id: str,
    req: QuestionSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_instructor_or_admin)
):
    stmt = select(Question).where(Question.id == question_id, Question.quiz_id == quiz_id).options(selectinload(Question.options))
    res = await db.execute(stmt)
    q = res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    q.stem = req.stem
    q.explanation = req.explanation
    q.difficulty = req.difficulty
    q.bloom_taxonomy = req.bloom_taxonomy
    q.topic_name = req.topic_name

    # Clear old options and add updated options
    for opt in q.options:
        await db.delete(opt)

    new_opts = []
    for opt in req.options:
        o = QuestionOption(
            question_id=q.id,
            option_key=opt.option_key,
            option_text=opt.option_text,
            is_correct=opt.is_correct
        )
        db.add(o)
        new_opts.append(o)

    q.options = new_opts
    await db.commit()
    return {"message": "Question updated successfully."}

@router.delete("/{quiz_id}")
async def delete_quiz(
    quiz_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_instructor_or_admin)
):
    stmt = select(Quiz).where(Quiz.id == quiz_id)
    res = await db.execute(stmt)
    quiz = res.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    await db.delete(quiz)
    await db.commit()
    return {"message": "Quiz deleted successfully."}
