from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User
from app.schemas.features import FlashcardCreate, FlashcardReview, FlashcardOut
from app.services.flashcard_service import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["Flashcards & SRS"])

@router.post("/", response_model=FlashcardOut)
async def create_flashcard(
    payload: FlashcardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    card = await flashcard_service.create_flashcard(
        db, user_id=str(current_user.id),
        front_text=payload.front_text, back_text=payload.back_text,
        document_id=payload.document_id, category=payload.category or "General"
    )
    return card

@router.post("/generate/{document_id}", response_model=List[FlashcardOut])
async def generate_from_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        cards = await flashcard_service.generate_from_document(db, user_id=str(current_user.id), document_id=document_id)
        return cards
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.get("/due", response_model=List[FlashcardOut])
async def get_due_flashcards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cards = await flashcard_service.get_due_cards(db, user_id=str(current_user.id))
    return cards

@router.post("/{card_id}/review", response_model=FlashcardOut)
async def review_flashcard(
    card_id: str,
    payload: FlashcardReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        updated = await flashcard_service.review_card(db, card_id=card_id, user_id=str(current_user.id), rating=payload.rating)
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
