from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class TopicStatItem(BaseModel):
    topic_name: str
    total_attempted: int
    total_correct: int
    accuracy_percentage: float
    avg_response_time: float

class DifficultyStatItem(BaseModel):
    difficulty: str
    total_attempted: int
    total_correct: int
    accuracy_percentage: float

class UserAnalyticsSummary(BaseModel):
    total_quizzes_taken: int
    completed_quizzes: int
    overall_accuracy: float
    average_score: float
    total_time_spent_minutes: float
    strong_topics: List[str]
    weak_topics: List[str]
    topic_breakdown: List[TopicStatItem]
    difficulty_breakdown: List[DifficultyStatItem]
    recent_trend: List[Dict[str, Any]]
    ai_recommendations: List[str]

class AdminDashboardSummary(BaseModel):
    total_users: int
    active_users: int
    total_documents: int
    total_quizzes: int
    total_attempts: int
    avg_platform_score: float
    completion_rate: float
    ai_generation_success_rate: float
    daily_activity: List[Dict[str, Any]]
    monthly_growth: List[Dict[str, Any]]
