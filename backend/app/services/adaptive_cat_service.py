import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.models import QuizSession, Quiz, Question, QuizAnswer

logger = logging.getLogger("adaptive_cat_service")

class AdaptiveCATService:
    DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard", "Expert"]

    async def get_next_adaptive_question(
        self,
        db: AsyncSession,
        session_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        # Fetch Session and Quiz
        session_res = await db.execute(
            select(QuizSession).where(and_(QuizSession.id == session_id, QuizSession.user_id == user_id))
        )
        session = session_res.scalar_one_or_none()
        if not session:
            raise ValueError("Quiz session not found.")

        quiz_res = await db.execute(select(Quiz).where(Quiz.id == session.quiz_id))
        quiz = quiz_res.scalar_one_or_none()
        if not quiz:
            raise ValueError("Quiz not found.")

        # Get already answered question IDs
        answered_res = await db.execute(
            select(QuizAnswer.question_id, QuizAnswer.is_correct)
            .where(QuizAnswer.session_id == session_id)
        )
        answered_records = answered_res.all()
        answered_ids = {r[0] for r in answered_records}

        # Calculate current accuracy
        if answered_records:
            correct_count = sum(1 for r in answered_records if r[1])
            accuracy = correct_count / len(answered_records)
        else:
            accuracy = 0.60 # Default initial estimate

        # Determine target difficulty based on performance
        if accuracy >= 0.90:
            target_diff = "Expert"
        elif accuracy >= 0.70:
            target_diff = "Hard"
        elif accuracy >= 0.40:
            target_diff = "Medium"
        else:
            target_diff = "Easy"

        # Fetch remaining unanswered questions for this quiz
        all_questions_res = await db.execute(
            select(Question).where(Question.quiz_id == quiz.id)
        )
        all_questions = all_questions_res.scalars().all()
        unanswered = [q for q in all_questions if q.id not in answered_ids]

        if not unanswered:
            return None # All questions answered

        # Pick best question matching target_diff or closest fallback
        matching = [q for q in unanswered if q.difficulty.lower() == target_diff.lower()]
        if matching:
            chosen = matching[0]
        else:
            chosen = unanswered[0] # Fallback to first available

        return {
            "question": chosen,
            "target_difficulty": target_diff,
            "current_accuracy": round(accuracy * 100, 1),
            "questions_remaining": len(unanswered) - 1,
            "total_questions": len(all_questions)
        }

adaptive_cat_service = AdaptiveCATService()
