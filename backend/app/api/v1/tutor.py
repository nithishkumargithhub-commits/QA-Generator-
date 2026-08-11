from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User
from app.schemas.features import RAGAskQuery, RAGAskResponse
from app.services.rag_tutor_service import rag_tutor_service

router = APIRouter(prefix="/tutor", tags=["AI Study Assistant"])

@router.post("/ask", response_model=RAGAskResponse)
async def ask_tutor(
    query: RAGAskQuery,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        res = await rag_tutor_service.answer_question(
            db=db,
            user_query=query.user_query,
            document_id=query.document_id,
            question_stem=query.question_stem,
            selected_option=query.selected_option
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
