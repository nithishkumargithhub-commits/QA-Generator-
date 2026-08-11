import logging
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.models import StudyPlan, QuizSession, Quiz, Question, QuizAnswer, UploadedFile
from app.services.ai_generator import ai_generator

logger = logging.getLogger("study_plan_service")

class StudyPlanService:
    async def generate_study_plan(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str
    ) -> StudyPlan:
        # Check existing plan
        res = await db.execute(
            select(StudyPlan).where(and_(StudyPlan.user_id == user_id, StudyPlan.session_id == session_id))
        )
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        session_res = await db.execute(select(QuizSession).where(QuizSession.id == session_id))
        session = session_res.scalar_one_or_none()
        if not session:
            raise ValueError("Quiz session not found.")

        # Identify incorrect answers and weak topics
        answers_res = await db.execute(
            select(QuizAnswer).where(and_(QuizAnswer.session_id == session_id, QuizAnswer.is_correct == False))
        )
        incorrect_answers = answers_res.scalars().all()

        missed_questions = []
        weak_topics = set()
        for ans in incorrect_answers:
            q_res = await db.execute(select(Question).where(Question.id == ans.question_id))
            q = q_res.scalar_one_or_none()
            if q:
                missed_questions.append(q.stem)
                weak_topics.add(q.topic_name or "General")

        doc_name = "Source Document"
        quiz_res = await db.execute(select(Quiz).where(Quiz.id == session.quiz_id))
        quiz = quiz_res.scalar_one_or_none()
        if quiz and quiz.document_id:
            doc_res = await db.execute(select(UploadedFile).where(UploadedFile.id == quiz.document_id))
            doc = doc_res.scalar_one_or_none()
            if doc:
                doc_name = doc.filename

        plan_items = []
        for topic in weak_topics:
            plan_items.append({
                "topic": topic,
                "status": "Needs Revision",
                "recommended_section": f"Section on '{topic}' in {doc_name}",
                "suggested_action": f"Review foundational definitions and re-take topic practice questions for {topic}.",
                "key_focus": "Focus on distinguishing option boundaries and understanding root mechanisms."
            })

        if not plan_items:
            plan_items.append({
                "topic": "Mastered",
                "status": "Excellent",
                "recommended_section": f"All sections in {doc_name}",
                "suggested_action": "Great performance! Maintain mastery with periodic flashcard review.",
                "key_focus": "Ready for next advanced topic."
            })

        plan = StudyPlan(
            user_id=user_id,
            quiz_id=session.quiz_id,
            session_id=session.id,
            plan_data={
                "overall_summary": f"Personalized Remediation Plan for '{quiz.title if quiz else 'Quiz'}'",
                "score_achieved": f"{session.percentage:.1f}%",
                "weak_topics_count": len(weak_topics),
                "revision_items": plan_items
            }
        )

        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        return plan

study_plan_service = StudyPlanService()
