export type Role = 'Admin' | 'Instructor' | 'Student';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: Role;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: 'processing' | 'ready' | 'failed';
  extracted_text?: string;
  topic_summary?: Array<{ name: string; content_length: number; preview: string }>;
  chapter_count: number;
  topic_count: number;
  created_at: string;
}

export interface QuestionOption {
  id?: string;
  option_key: string;
  option_text: string;
  is_correct: boolean;
  match_pair?: string;
}

export interface Question {
  id?: string;
  topic_name: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'match' | 'assertion_reason' | 'multiselect' | 'scenario';
  stem: string;
  explanation?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  bloom_taxonomy: string;
  confidence_score: number;
  points: number;
  options: QuestionOption[];
}

export interface Quiz {
  id: string;
  creator_id: string;
  document_id?: string;
  title: string;
  description?: string;
  time_limit_minutes: number;
  passing_score: number;
  is_published: boolean;
  difficulty_level: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  question_count: number;
  total_marks: number;
  mode: string;
  created_at: string;
  questions?: Question[];
}

export interface InstantFeedback {
  is_correct: boolean;
  correct_options: string[];
  explanation: string;
  topic_name: string;
  topic_mastery: number;
  confidence_delta: number;
  revision_concept: string;
  next_question_id?: string;
}

export interface QuizSession {
  id: string;
  user_id: string;
  quiz_id: string;
  status: 'in_progress' | 'completed' | 'paused' | 'abandoned';
  started_at: string;
  completed_at?: string;
  total_time_seconds: number;
  score: number;
  max_score: number;
  percentage: number;
  grade: string;
  pass_status: boolean;
  answers?: any[];
}

export interface UserAnalyticsSummary {
  total_quizzes_taken: number;
  completed_quizzes: number;
  overall_accuracy: number;
  average_score: number;
  total_time_spent_minutes: number;
  strong_topics: string[];
  weak_topics: string[];
  topic_breakdown: Array<{
    topic_name: string;
    total_attempted: number;
    total_correct: number;
    accuracy_percentage: number;
    avg_response_time: number;
  }>;
  difficulty_breakdown: Array<{
    difficulty: string;
    total_attempted: number;
    total_correct: number;
    accuracy_percentage: number;
  }>;
  recent_trend: Array<{ date: string; score: number; time: number }>;
  ai_recommendations: string[];
}

export interface AdminDashboardSummary {
  total_users: number;
  active_users: number;
  total_documents: number;
  total_quizzes: number;
  total_attempts: number;
  avg_platform_score: number;
  completion_rate: number;
  ai_generation_success_rate: number;
  daily_activity: Array<{ day: string; users: number; quizzes: number; attempts: number }>;
  monthly_growth: Array<{ month: string; users: number; quizzes: number }>;
}
