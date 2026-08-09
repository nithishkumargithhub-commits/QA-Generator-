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
    text_content = ""
    topic_summary = None
    doc_title = "AI Assessment"

    if req.document_id:
        stmt = select(UploadedFile).where(UploadedFile.id == req.document_id)
        res = await db.execute(stmt)
        doc = res.scalars().first()
        if doc:
            text_content = doc.extracted_text or ""
            topic_summary = doc.topic_summary
            doc_title = doc.filename.rsplit(".", 1)[0]

    if not text_content and req.custom_text:
        text_content = req.custom_text

    if not text_content or not text_content.strip():
        text_content = f"Comprehensive assessment on {req.title or 'General Knowledge and Applied Systems'}. Key concepts of architectural design, database systems, software engineering, security, and performance."

    # --- EXTRACT mode: convert existing MCQ questions from the PDF directly ---
    if req.mode == "extract":
        raw_questions = MCQExtractor.extract(text_content)
        if not raw_questions:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No MCQ questions could be detected in this PDF. "
                    "Make sure the PDF contains numbered questions with A/B/C/D options. "
                    "Switch to 'Generate' mode to create new questions from the content."
                )
            )
        # Use Gemini AI to solve and verify exact correct answers for extracted questions
        raw_questions = await AIGeneratorService.solve_and_verify_extracted_questions(raw_questions, text_content)
    else:
        # Generate questions using AI engine
        raw_questions = await AIGeneratorService.generate_questions(
            text_content=text_content,
            topic_summary=topic_summary,
            difficulty=req.difficulty,
            question_count=req.question_count,
            question_types=req.question_types,
            bloom_levels=req.bloom_levels
        )

    # Save Quiz and Questions to DB
    is_extract = req.mode == "extract"
    quiz = Quiz(
        creator_id=current_user.id,
        document_id=req.document_id,
        title=req.title or (f"{doc_title} — Converted Quiz" if is_extract else f"{doc_title} - {req.difficulty} Quiz"),
        description=(
            f"Directly extracted {len(raw_questions)} MCQ questions from the uploaded PDF."
            if is_extract
            else f"AI generated quiz with {len(raw_questions)} questions at {req.difficulty} level."
        ),
        time_limit_minutes=req.time_limit_minutes,
        passing_score=req.passing_score,
        is_published=True,
        difficulty_level="Medium" if is_extract else req.difficulty,
        question_count=len(raw_questions),
        total_marks=float(len(raw_questions)),
        mode="Standard"
    )
    db.add(quiz)
    await db.flush()

    # Create Questions & Options
    created_questions = []
    for q_data in raw_questions:
        raw_opts = q_data.get("options", [])
        q_type = q_data.get("question_type", "mcq")

        # Skip questions with no options at all (malformed AI/extract output)
        if not raw_opts:
            continue

        # For MCQ-type questions, ensure there are always at least 4 options.
        # If the source only provided 2–3, pad with placeholder distractors.
        placeholder_pool = [
            "None of the above",
            "All of the above",
            "Cannot be determined",
            "The information provided is insufficient",
        ]
        if q_type in ("mcq", "scenario", "assertion_reason", "fill_blank") and len(raw_opts) < 4:
            existing_keys = {o.get("option_key", "").upper() for o in raw_opts}
            placeholders_added = 0
            for key_letter in ["A", "B", "C", "D"]:
                if key_letter not in existing_keys and placeholders_added < (4 - len(raw_opts)):
                    raw_opts.append({
                        "option_key": key_letter,
                        "option_text": placeholder_pool[placeholders_added % len(placeholder_pool)],
                        "is_correct": False,
                    })
                    placeholders_added += 1

        # Sort options alphabetically (A → B → C → D)
        raw_opts_sorted = sorted(raw_opts, key=lambda o: o.get("option_key", "Z").upper())

        opts_list = [
            QuestionOption(
                option_key=opt.get("option_key", "A"),
                option_text=opt.get("option_text", ""),
                is_correct=opt.get("is_correct", False),
                match_pair=opt.get("match_pair", None)
            ) for opt in raw_opts_sorted
        ]
        q = Question(
            quiz_id=quiz.id,
            topic_name=q_data.get("topic_name", "General"),
            question_type=q_type,
            stem=q_data.get("stem", "Question stem..."),
            explanation=q_data.get("explanation", ""),
            difficulty=q_data.get("difficulty", req.difficulty),
            bloom_taxonomy=q_data.get("bloom_taxonomy", "Understanding"),
            confidence_score=q_data.get("confidence_score", 0.95),
            points=q_data.get("points", 10.0),
            options=opts_list
        )
        db.add(q)

        created_questions.append(q)

    # Log Activity
    log = ActivityLog(
        user_id=current_user.id,
        action="GENERATE_QUIZ",
        details=f"Generated quiz '{quiz.title}' with {len(created_questions)} questions."
    )
    db.add(log)

    await db.commit()

    return QuizOut(
        id=quiz.id,
        creator_id=quiz.creator_id,
        document_id=quiz.document_id,
        title=quiz.title,
        description=quiz.description,
        time_limit_minutes=quiz.time_limit_minutes,
        passing_score=quiz.passing_score,
        is_published=quiz.is_published,
        difficulty_level=quiz.difficulty_level,
        question_count=quiz.question_count,
        total_marks=quiz.total_marks,
        mode=quiz.mode,
        created_at=quiz.created_at,
        questions=[
            QuestionSchema(
                id=q.id,
                topic_name=q.topic_name,
                question_type=q.question_type,
                stem=q.stem,
                explanation=q.explanation,
                difficulty=q.difficulty,
                bloom_taxonomy=q.bloom_taxonomy,
                confidence_score=q.confidence_score,
                points=q.points,
                options=[
                    QuestionOptionSchema(
                        id=opt.id,
                        option_key=opt.option_key,
                        option_text=opt.option_text,
                        is_correct=opt.is_correct,
                        match_pair=opt.match_pair
                    ) for opt in q.options
                ]
            ) for q in created_questions
        ]
    )

@router.get("", response_model=List[QuizOut])
async def list_quizzes(
    difficulty: Optional[str] = None,
    mode: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Quiz).where(Quiz.is_published == True).options(
        selectinload(Quiz.questions).selectinload(Question.options)
    )
    if difficulty:
        stmt = stmt.where(Quiz.difficulty_level == difficulty)
    if mode:
        stmt = stmt.where(Quiz.mode == mode)

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
