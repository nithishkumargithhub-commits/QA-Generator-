from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.analytics import UserAnalyticsSummary
from app.services.analytics_service import AnalyticsService
from app.api.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/user", response_model=UserAnalyticsSummary)
async def get_user_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await AnalyticsService.get_user_analytics(db, current_user.id)
