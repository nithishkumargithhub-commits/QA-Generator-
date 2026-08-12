from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User
from app.schemas.features import StudyPlanOut
from app.services.study_plan_service import study_plan_service

router = APIRouter(prefix="/study-plans", tags=["AI Study Plans"])

@router.post("/generate/{session_id}", response_model=StudyPlanOut)
async def generate_study_plan(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        plan = await study_plan_service.generate_study_plan(db, user_id=str(current_user.id), session_id=session_id)
        return plan
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
