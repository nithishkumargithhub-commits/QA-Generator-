from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User
from app.services.adaptive_cat_service import adaptive_cat_service

router = APIRouter(prefix="/cat", tags=["Adaptive CAT Engine"])

@router.get("/next-question/{session_id}")
async def get_next_adaptive_question(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        res = await adaptive_cat_service.get_next_adaptive_question(db, session_id=session_id, user_id=current_user.id)
        if not res:
            return {"status": "completed", "message": "All questions completed for this adaptive session."}
        
        q = res["question"]
        return {
            "status": "in_progress",
            "target_difficulty": res["target_difficulty"],
            "current_accuracy": res["current_accuracy"],
            "questions_remaining": res["questions_remaining"],
            "total_questions": res["total_questions"],
            "question": {
                "id": q.id,
                "quiz_id": q.quiz_id,
                "stem": q.stem,
                "question_type": q.question_type,
                "difficulty": q.difficulty,
                "points": q.points,
                "options": [
                    {"id": opt.id, "option_key": opt.option_key, "option_text": opt.option_text}
                    for opt in q.options
                ]
            }
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
