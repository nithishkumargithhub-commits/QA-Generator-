from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# RAG AI Study Assistant Schemas
class RAGAskQuery(BaseModel):
    document_id: Optional[str] = None
    question_stem: Optional[str] = None
    selected_option: Optional[str] = None
    user_query: str = Field(..., description="The user's question or instruction e.g. Explain step by step")

class RAGAskResponse(BaseModel):
    answer: str
    context_used: Optional[str] = None
    source_section: Optional[str] = None

# Flashcard & SRS Schemas
class FlashcardCreate(BaseModel):
    document_id: Optional[str] = None
    front_text: str
    back_text: str
    category: Optional[str] = "General"

class FlashcardReview(BaseModel):
    rating: int = Field(..., ge=1, le=4, description="1=Again, 2=Hard, 3=Good, 4=Easy")

class FlashcardOut(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    front_text: str
    back_text: str
    category: str
    easiness_factor: float
    interval_days: int
    repetitions: int
    next_review_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Classroom & Assignment Schemas
class ClassroomCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ClassroomOut(BaseModel):
    id: str
    teacher_id: str
    name: str
    code: str
    description: Optional[str] = None
    created_at: datetime
    member_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ClassroomJoin(BaseModel):
    code: str

class AssignmentCreate(BaseModel):
    classroom_id: str
    quiz_id: str
    title: str
    due_date: Optional[datetime] = None

class AssignmentOut(BaseModel):
    id: str
    classroom_id: str
    quiz_id: str
    title: str
    due_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Certificate & Study Plan Schemas
class CertificateOut(BaseModel):
    id: str
    user_id: str
    quiz_id: str
    session_id: str
    certificate_code: str
    score_percentage: float
    issued_at: datetime

    class Config:
        from_attributes = True

class StudyPlanOut(BaseModel):
    id: str
    user_id: str
    quiz_id: str
    session_id: str
    plan_data: Any
    created_at: datetime

    class Config:
        from_attributes = True

# CAT Adaptive Schema
class CATAnswerSubmit(BaseModel):
    session_id: str
    question_id: str
    selected_options: List[str]
    response_time_seconds: float
