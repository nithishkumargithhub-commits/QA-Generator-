import {
  AuthTokens, User, UploadedFile, Quiz, QuizSession, InstantFeedback,
  UserAnalyticsSummary, AdminDashboardSummary
} from '../types';

const PUBLIC_BACKEND_URL = 'https://four-coats-bow.loca.lt';

const API_BASE = (import.meta as any).env?.VITE_API_URL
  ? `${(import.meta as any).env.VITE_API_URL}/api/v1`
  : (import.meta as any).env?.DEV
    ? '/api/v1'
    : `${PUBLIC_BACKEND_URL}/api/v1`;

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = { ...this.getHeaders(), ...(options.headers || {}) };
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch (err: any) {
      throw new Error(
        "Unable to connect to the backend server. Please make sure the FastAPI backend is running locally on http://localhost:8000."
      );
    }

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errData = await res.json();
        errorMsg = errData.detail || errData.message || errorMsg;
      } catch (e) {
        if (res.status === 404) {
          errorMsg = "API Endpoint Not Found (404). Please ensure backend server is running on http://localhost:8000.";
        }
      }

      if (res.status === 401) {
        throw new Error(errorMsg.includes("Invalid") ? errorMsg : "Invalid username or password. Please check your credentials or register a new account.");
      }
      throw new Error(errorMsg);
    }
    return res.json() as Promise<T>;
  }

  // Auth APIs
  async login(username: string, password: string): Promise<AuthTokens> {
    const res = await this.request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    return res;
  }

  async register(data: { username: string; email: string; password: string; full_name?: string; role?: string }): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Document APIs
  async uploadDocument(file: File): Promise<UploadedFile> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed.' }));
      throw new Error(err.detail || 'Upload failed.');
    }
    return res.json();
  }

  async getDocuments(): Promise<UploadedFile[]> {
    return this.request<UploadedFile[]>('/documents');
  }

  async getDocument(id: string): Promise<UploadedFile> {
    return this.request<UploadedFile>(`/documents/${id}`);
  }

  async deleteDocument(id: string): Promise<void> {
    return this.request(`/documents/${id}`, { method: 'DELETE' });
  }

  // Quiz APIs
  async generateQuiz(params: {
    document_id?: string;
    custom_text?: string;
    title?: string;
    difficulty: string;
    question_count: number;
    question_types?: string[];
    bloom_levels?: string[];
    time_limit_minutes: number;
    passing_score: number;
    mode: string;
  }): Promise<Quiz> {
    return this.request<Quiz>('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getQuizzes(difficulty?: string, mode?: string): Promise<Quiz[]> {
    const q = new URLSearchParams();
    if (difficulty) q.append('difficulty', difficulty);
    if (mode) q.append('mode', mode);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<Quiz[]>(`/quizzes${queryStr}`);
  }

  async getQuiz(id: string): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/${id}`);
  }

  async updateQuestion(quizId: string, questionId: string, questionData: any): Promise<void> {
    return this.request(`/quizzes/${quizId}/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  }

  async deleteQuiz(id: string): Promise<void> {
    return this.request(`/quizzes/${id}`, { method: 'DELETE' });
  }

  // Quiz Session & Instant Evaluation
  async startSession(quiz_id: string): Promise<QuizSession> {
    return this.request<QuizSession>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ quiz_id }),
    });
  }

  async submitAnswer(sessionId: string, payload: {
    question_id: string;
    selected_options: string[];
    response_time_seconds: number;
    bookmark?: boolean;
    notes?: string;
  }): Promise<InstantFeedback> {
    return this.request<InstantFeedback>(`/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async completeSession(sessionId: string): Promise<QuizSession> {
    return this.request<QuizSession>(`/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  }

  async getSessionReport(sessionId: string): Promise<QuizSession> {
    return this.request<QuizSession>(`/sessions/${sessionId}/report`);
  }

  // Analytics APIs
  async getUserAnalytics(): Promise<UserAnalyticsSummary> {
    return this.request<UserAnalyticsSummary>('/analytics/user');
  }

  async getAdminDashboard(): Promise<AdminDashboardSummary> {
    return this.request<AdminDashboardSummary>('/admin/dashboard');
  }

  async getAdminUsers(search?: string): Promise<User[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<User[]>(`/admin/users${query}`);
  }

  async toggleUserStatus(userId: string, statusObj: { is_active?: boolean; is_suspended?: boolean; role?: string }): Promise<void> {
    const q = new URLSearchParams();
    if (statusObj.is_active !== undefined) q.append('is_active', String(statusObj.is_active));
    if (statusObj.is_suspended !== undefined) q.append('is_suspended', String(statusObj.is_suspended));
    if (statusObj.role) q.append('role', statusObj.role);
    return this.request(`/admin/users/${userId}/status?${q.toString()}`, {
      method: 'PUT',
    });
  }

  async getAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/audit/logs');
  }
}

export const api = new ApiClient();
