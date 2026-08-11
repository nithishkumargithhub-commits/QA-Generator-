import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/layout/Navbar';
import { AskDocTutor } from './components/AskDocTutor';
import { LandingPage } from './pages/Landing';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Dashboard';
import { UploadPage } from './pages/Upload';
import { MyDocumentsPage } from './pages/MyDocuments';
import { GenerateQuizPage } from './pages/GenerateQuiz';
import { QuizListPage } from './pages/QuizList';
import { QuizPlayerPage } from './pages/QuizPlayerPage';
import { QuizResultsPage } from './pages/QuizResultsPage';
import { PerformanceAnalyticsPage } from './pages/PerformanceAnalytics';
import { AdminDashboardPage } from './pages/AdminDashboard';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { ClassroomsPage } from './pages/ClassroomsPage';
import { LiveMultiplayerPage } from './pages/LiveMultiplayerPage';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || user?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Learner & Educator Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
              <Route path="/my-documents" element={<ProtectedRoute><MyDocumentsPage /></ProtectedRoute>} />
              <Route path="/generate-quiz" element={<ProtectedRoute><GenerateQuizPage /></ProtectedRoute>} />
              <Route path="/quizzes" element={<ProtectedRoute><QuizListPage /></ProtectedRoute>} />
              <Route path="/quiz/:quizId" element={<ProtectedRoute><QuizPlayerPage /></ProtectedRoute>} />
              <Route path="/quiz-results/:sessionId" element={<ProtectedRoute><QuizResultsPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><PerformanceAnalyticsPage /></ProtectedRoute>} />
              <Route path="/flashcards" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
              <Route path="/question-bank" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
              <Route path="/classrooms" element={<ProtectedRoute><ClassroomsPage /></ProtectedRoute>} />
              <Route path="/live" element={<ProtectedRoute><LiveMultiplayerPage /></ProtectedRoute>} />

              {/* Protected Admin LMS Routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
              <Route path="/admin/audit" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />
            </Routes>
          </main>

          {/* Floating AI Study Assistant */}
          {isAuthenticated && <AskDocTutor />}
        </div>
      </Router>
    </QueryClientProvider>
  );
};
