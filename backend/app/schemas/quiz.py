from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel

class QuestionOptionSchema(BaseModel):
    id: Optional[str] = None
    option_key: str
    option_text: str
    is_correct: bool = False
    match_pair: Optional[str] = None

class QuestionSchema(BaseModel):
    id: Optional[str] = None
    topic_name: str = "General"
    question_type: str = "mcq" # mcq, true_false, fill_blank, match, assertion_reason, multiselect, scenario
    stem: str
    explanation: Optional[str] = None
    difficulty: str = "Medium" # Easy, Medium, Hard, Expert
    bloom_taxonomy: str = "Understanding"
    confidence_score: float = 0.95
    points: float = 10.0
    options: List[QuestionOptionSchema] = []

class GenerateQuizRequest(BaseModel):
    document_id: Optional[str] = None
    custom_text: Optional[str] = None
    title: Optional[str] = None
    difficulty: str = "Medium" # Easy, Medium, Hard, Expert
    question_count: int = 10
    question_types: List[str] = ["mcq", "true_false", "fill_blank", "scenario"]
    bloom_levels: List[str] = ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"]
    time_limit_minutes: int = 15
    passing_score: float = 70.0
    mode: str = "Standard" # Standard, Timed, Practice, Revision, Adaptive

class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    document_id: Optional[str] = None
    time_limit_minutes: int = 15
    passing_score: float = 70.0
    difficulty_level: str = "Medium"
    mode: str = "Standard"
    questions: List[QuestionSchema] = []

class QuizOut(BaseModel):
    id: str
    creator_id: str
    document_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    time_limit_minutes: int
    passing_score: float
    is_published: bool
    difficulty_level: str
    question_count: int
    total_marks: float
    mode: str
    created_at: datetime
    questions: List[QuestionSchema] = []

    class Config:
        from_attributes = True

class QuizAnswerSubmit(BaseModel):
    question_id: str
    selected_options: List[str]
    response_time_seconds: float = 0.0
    bookmark: bool = False
    notes: Optional[str] = None

class SessionStartRequest(BaseModel):
    quiz_id: str

class InstantFeedbackOut(BaseModel):
    is_correct: bool
    correct_options: List[str]
    explanation: str
    topic_name: str
    topic_mastery: float
    confidence_delta: float
    revision_concept: str
    next_question_id: Optional[str] = None

class QuizAnswerOut(BaseModel):
    id: str
    question_id: str
    selected_options: List[str] = []
    is_correct: bool
    marks_obtained: float
    response_time_seconds: float = 0.0

    class Config:
        from_attributes = True

class SessionOut(BaseModel):
    id: str
    user_id: str
    quiz_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_time_seconds: int
    score: float
    max_score: float
    percentage: float
    grade: str
    pass_status: bool
    answers: List[QuizAnswerOut] = []

    class Config:
        from_attributes = True
