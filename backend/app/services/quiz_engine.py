import logging
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Quiz, Question, QuestionOption, QuizSession, QuizAnswer, UserTopicStat

logger = logging.getLogger("quiz_engine")

class QuizEngine:
    @staticmethod
    async def evaluate_answer(
        db: AsyncSession,
        user_id: str,
        session_id: str,
        question_id: str,
        selected_options: List[str],
        response_time_seconds: float,
        bookmark: bool = False,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        start_t = time.time()

        # Fetch question with options
        stmt = select(Question).where(Question.id == question_id)
        res = await db.execute(stmt)
        question = res.scalars().first()

        if not question:
            return {
                "is_correct": False,
                "correct_options": [],
                "explanation": "Question not found.",
                "topic_name": "General",
                "topic_mastery": 0.0,
                "confidence_delta": 0.0,
                "revision_concept": "Review fundamental concepts."
            }

        # Fetch options
        stmt_opt = select(QuestionOption).where(QuestionOption.question_id == question_id)
        res_opt = await db.execute(stmt_opt)
        options = res_opt.scalars().all()

        correct_keys = [opt.option_key for opt in options if opt.is_correct]
        
        # Check correctness
        selected_set = set(selected_options)
        correct_set = set(correct_keys)
        is_correct = (selected_set == correct_set) and (len(selected_set) > 0)
        marks_obtained = question.points if is_correct else 0.0

        # Save or update QuizAnswer
        stmt_ans = select(QuizAnswer).where(
            QuizAnswer.session_id == session_id,
            QuizAnswer.question_id == question_id
        )
        res_ans = await db.execute(stmt_ans)
        quiz_answer = res_ans.scalars().first()

        if not quiz_answer:
            quiz_answer = QuizAnswer(
                session_id=session_id,
                question_id=question_id,
                selected_options=selected_options,
                response_time_seconds=response_time_seconds,
                is_correct=is_correct,
                marks_obtained=marks_obtained,
                bookmark=bookmark,
                notes=notes,
                feedback_explanation=question.explanation
            )
            db.add(quiz_answer)
        else:
            quiz_answer.selected_options = selected_options
            quiz_answer.response_time_seconds = response_time_seconds
            quiz_answer.is_correct = is_correct
            quiz_answer.marks_obtained = marks_obtained
            quiz_answer.bookmark = bookmark
            if notes:
                quiz_answer.notes = notes

        # Update User Topic Stats
        topic_name = question.topic_name or "General"
        stmt_stat = select(UserTopicStat).where(
            UserTopicStat.user_id == user_id,
            UserTopicStat.topic_name == topic_name
        )
        res_stat = await db.execute(stmt_stat)
        topic_stat = res_stat.scalars().first()

        if not topic_stat:
            topic_stat = UserTopicStat(
                user_id=user_id,
                topic_name=topic_name,
                total_attempted=1,
                total_correct=1 if is_correct else 0,
                accuracy_percentage=100.0 if is_correct else 0.0,
                avg_response_time_seconds=response_time_seconds
            )
            db.add(topic_stat)
        else:
            topic_stat.total_attempted += 1
            if is_correct:
                topic_stat.total_correct += 1
            topic_stat.accuracy_percentage = round(
                (topic_stat.total_correct / topic_stat.total_attempted) * 100.0, 2
            )
            topic_stat.avg_response_time_seconds = round(
                (topic_stat.avg_response_time_seconds * (topic_stat.total_attempted - 1) + response_time_seconds) / topic_stat.total_attempted, 2
            )

        await db.commit()

        calc_time_ms = (time.time() - start_t) * 1000
        logger.info(f"Instant Answer Evaluation complete in {calc_time_ms:.2f}ms")

        confidence_delta = +0.05 if is_correct else -0.08
        revision_concept = (
            f"Mastery confirmed for topic '{topic_name}'!"
            if is_correct
            else f"Topic '{topic_name}' needs review: Re-read key principles on {question.stem[:50]}..."
        )

        return {
            "is_correct": is_correct,
            "correct_options": correct_keys,
            "explanation": question.explanation or "No explanation provided.",
            "topic_name": topic_name,
            "topic_mastery": topic_stat.accuracy_percentage,
            "confidence_delta": confidence_delta,
            "revision_concept": revision_concept
        }
