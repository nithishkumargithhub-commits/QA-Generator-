import asyncio
import logging
from typing import Dict, Any, Optional
try:
    from app.core.celery_app import celery_app
except Exception:
    celery_app = None

def _task_fallback(*args, **kwargs):
    def wrapper(fn):
        return fn
    return wrapper

task_dec = celery_app.task if (celery_app and hasattr(celery_app, "task")) else _task_fallback
from app.core.database import AsyncSessionLocal
from app.models.models import UploadedFile, Quiz, Question, QuestionOption, ActivityLog
from app.services.ai_generator import AIGeneratorService, MCQExtractor
from app.workers.job_tracker import JobTracker
from sqlalchemy import select

logger = logging.getLogger("ai_tasks")

async def _async_generate_quiz(
    job_id: str,
    quiz_id: str,
    req_data: Dict[str, Any],
    document_id: Optional[str],
    user_id: str
):
    JobTracker.set_job_status(job_id, "processing", progress=0.1)

    text_content = ""
    topic_summary = None

    async with AsyncSessionLocal() as session:
        if document_id:
            stmt = select(UploadedFile).where(UploadedFile.id == document_id)
            res = await session.execute(stmt)
            doc = res.scalars().first()
            if doc:
                text_content = doc.extracted_text or ""
                topic_summary = doc.topic_summary

        if not text_content and req_data.get("custom_text"):
            text_content = req_data.get("custom_text")

        if not text_content or not text_content.strip():
            text_content = f"Comprehensive assessment on {req_data.get('title') or 'General Knowledge and Applied Systems'}."

    JobTracker.set_job_status(job_id, "processing", progress=0.4)

    mode = req_data.get("mode", "generate")
    if mode == "extract":
        raw_questions = MCQExtractor.extract(text_content)
        if raw_questions:
            raw_questions = await AIGeneratorService.solve_and_verify_extracted_questions(raw_questions, text_content)
    else:
        raw_questions = await AIGeneratorService.generate_questions(
            text_content=text_content,
            topic_summary=topic_summary,
            difficulty=req_data.get("difficulty", "Medium"),
            question_count=req_data.get("question_count", 10),
            question_types=req_data.get("question_types"),
            bloom_levels=req_data.get("bloom_levels")
        )

    JobTracker.set_job_status(job_id, "processing", progress=0.8)

    async with AsyncSessionLocal() as session:
        stmt_q = select(Quiz).where(Quiz.id == quiz_id)
        res_q = await session.execute(stmt_q)
        quiz = res_q.scalars().first()

        if quiz:
            # Check if questions were already created inline
            stmt_existing = select(Question).where(Question.quiz_id == quiz.id)
            res_existing = await session.execute(stmt_existing)
            existing = res_existing.scalars().all()

            if not existing:
                created_questions = []
                for q_data in raw_questions:
                    raw_opts = q_data.get("options", [])
                    q_type = q_data.get("question_type", "mcq")
                    if not raw_opts:
                        continue

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
                        difficulty=q_data.get("difficulty", req_data.get("difficulty", "Medium")),
                        bloom_taxonomy=q_data.get("bloom_taxonomy", "Understanding"),
                        confidence_score=q_data.get("confidence_score", 0.95),
                        points=q_data.get("points", 10.0),
                        options=opts_list
                    )
                    session.add(q)
                    created_questions.append(q)

                quiz.question_count = len(created_questions)
                quiz.total_marks = sum(q.points for q in created_questions)

                log = ActivityLog(
                    user_id=user_id,
                    action="GENERATE_QUIZ",
                    details=f"Generated quiz '{quiz.title}' with {len(created_questions)} questions."
                )
                session.add(log)
                await session.commit()
                logger.info(f"Quiz {quiz_id} generated successfully with {len(created_questions)} questions.")
            else:
                quiz.question_count = len(existing)
                quiz.total_marks = sum(q.points for q in existing)
                await session.commit()


    JobTracker.set_job_status(job_id, "completed", progress=1.0, result={"quiz_id": quiz_id, "question_count": len(raw_questions)})
    return len(raw_questions)

@task_dec(bind=True, max_retries=3, default_retry_delay=5, retry_backoff=True)
def generate_quiz_task(
    self,
    job_id: str,
    quiz_id: str,
    req_data: Dict[str, Any],
    document_id: Optional[str],
    user_id: str
):
    try:
        return asyncio.run(_async_generate_quiz(job_id, quiz_id, req_data, document_id, user_id))
    except Exception as exc:
        logger.error(f"Error in quiz generation task for quiz {quiz_id}: {exc}")
        JobTracker.set_job_status(job_id, "failed", progress=0.0, error=str(exc))
        raise self.retry(exc=exc)
