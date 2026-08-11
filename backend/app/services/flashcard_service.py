import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.models import Flashcard, UploadedFile
from app.services.ai_generator import ai_generator

logger = logging.getLogger("flashcard_service")

class FlashcardService:
    async def create_flashcard(
        self,
        db: AsyncSession,
        user_id: str,
        front_text: str,
        back_text: str,
        document_id: Optional[str] = None,
        category: str = "General"
    ) -> Flashcard:
        card = Flashcard(
            user_id=user_id,
            document_id=document_id,
            front_text=front_text,
            back_text=back_text,
            category=category,
            easiness_factor=2.5,
            interval_days=1,
            repetitions=0,
            next_review_at=datetime.now(timezone.utc)
        )
        db.add(card)
        await db.commit()
        await db.refresh(card)
        return card

    async def generate_from_document(
        self,
        db: AsyncSession,
        user_id: str,
        document_id: str
    ) -> List[Flashcard]:
        res = await db.execute(select(UploadedFile).where(UploadedFile.id == document_id))
        doc = res.scalar_one_or_none()
        if not doc or not doc.extracted_text:
            raise ValueError("Document text not available for flashcard generation.")

        # Ask AI or use heuristic extractor to generate flashcards
        prompt = (
            "Extract 5 key terms, definitions, or core concepts from the text below into flashcards.\n"
            "Respond in JSON format: [{\"front\": \"Term/Question\", \"back\": \"Definition/Answer\", \"category\": \"Topic\"}]\n\n"
            f"TEXT:\n{doc.extracted_text[:3000]}"
        )

        cards_created = []
        try:
            if ai_generator.is_api_available():
                parsed = await ai_generator._generate_json(prompt)
                if isinstance(parsed, list):
                    for item in parsed[:10]:
                        front = item.get("front") or item.get("term")
                        back = item.get("back") or item.get("definition")
                        cat = item.get("category", "Document Review")
                        if front and back:
                            card = await self.create_flashcard(db, user_id, front, back, document_id, cat)
                            cards_created.append(card)
        except Exception as e:
            logger.error(f"AI Flashcard generation failed: {e}")

        # Fallback heuristic if AI list is empty
        if not cards_created:
            lines = [line.strip() for line in doc.extracted_text.split("\n") if len(line.strip()) > 30]
            for i, line in enumerate(lines[:5]):
                parts = line.split(":", 1) if ":" in line else line.split(".", 1)
                front = parts[0].strip() if len(parts) > 1 else f"Concept {i+1} from {doc.filename}"
                back = parts[1].strip() if len(parts) > 1 else line
                card = await self.create_flashcard(db, user_id, front, back, document_id, "Document Key Points")
                cards_created.append(card)

        return cards_created

    async def review_card(
        self,
        db: AsyncSession,
        card_id: str,
        user_id: str,
        rating: int # 1=Again, 2=Hard, 3=Good, 4=Easy
    ) -> Flashcard:
        res = await db.execute(
            select(Flashcard).where(and_(Flashcard.id == card_id, Flashcard.user_id == user_id))
        )
        card = res.scalar_one_or_none()
        if not card:
            raise ValueError("Flashcard not found.")

        # SuperMemo SM-2 Algorithm Calculation
        ef = card.easiness_factor
        rep = card.repetitions
        interval = card.interval_days

        if rating < 3: # Again or Hard failure
            rep = 0
            interval = 1
        else: # Good or Easy success
            if rep == 0:
                interval = 1
            elif rep == 1:
                interval = 6
            else:
                interval = int(interval * ef)
            rep += 1

        # Calculate new Easiness Factor (EF)
        # Quality scale 0-5 mapping: rating 1=2, 2=3, 3=4, 4=5
        q = rating + 1
        ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        ef = max(1.3, ef) # EF minimum threshold

        card.easiness_factor = round(ef, 2)
        card.repetitions = rep
        card.interval_days = interval
        card.next_review_at = datetime.now(timezone.utc) + timedelta(days=interval)

        await db.commit()
        await db.refresh(card)
        return card

    async def get_due_cards(self, db: AsyncSession, user_id: str) -> List[Flashcard]:
        now = datetime.now(timezone.utc)
        res = await db.execute(
            select(Flashcard)
            .where(and_(Flashcard.user_id == user_id, Flashcard.next_review_at <= now))
            .order_by(Flashcard.next_review_at.asc())
        )
        return list(res.scalars().all())

flashcard_service = FlashcardService()
