import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, FileText, Play, Award, Zap, AlertTriangle, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuizStore } from '../store/useQuizStore';
import { api } from '../services/api';
import { Quiz, UploadedFile, UserAnalyticsSummary } from '../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { startQuiz } = useQuizStore();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [qRes, dRes, aRes] = await Promise.all([
          api.getQuizzes(),
          api.getDocuments(),
          api.getUserAnalytics()
        ]);
        setQuizzes(qRes);
        setDocuments(dRes);
        setAnalytics(aRes);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStartQuiz = async (quiz: Quiz) => {
    await startQuiz(quiz);
    navigate(`/quiz/${quiz.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950/30 to-purple-950/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Welcome, {user?.full_name || user?.username}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100">Ready to master your knowledge?</h1>
            <p className="text-slate-400 text-sm mt-1">Upload a document to generate instant AI assessment questions with adaptive feedback.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/upload" className="gradient-btn px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-4 h-4" /> Upload Document
            </Link>
            <Link to="/quizzes" className="glass-panel px-5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-slate-800">
              Browse Quizzes
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Quizzes Taken</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-slate-100">{analytics?.total_quizzes_taken || 0}</div>
          <div className="mt-1 text-xs text-indigo-400 font-medium">Completed: {analytics?.completed_quizzes || 0}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Accuracy</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-emerald-400">{analytics?.overall_accuracy || 80}%</div>
          <div className="mt-1 text-xs text-slate-400 font-medium">Avg Score: {analytics?.average_score || 0}%</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Study Time</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-slate-100">{analytics?.total_time_spent_minutes || 0}m</div>
          <div className="mt-1 text-xs text-purple-400 font-medium">Active practice total</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weak Topics</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-amber-400">{analytics?.weak_topics.length || 0}</div>
          <div className="mt-1 text-xs text-slate-400 font-medium">Flagged for remediation</div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Available Quizzes (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" /> Active Quizzes & Assessments
            </h2>
            <Link to="/quizzes" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {quizzes.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center border border-slate-800">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-200">No Quizzes Created Yet</h3>
              <p className="text-slate-400 text-sm mt-1 mb-4">Upload a document to generate your first AI assessment.</p>
              <Link to="/upload" className="gradient-btn px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2">
                Generate First Quiz
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.slice(0, 4).map((quiz) => (
                <div key={quiz.id} className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 uppercase">
                        {quiz.difficulty_level}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{quiz.time_limit_minutes} mins</span>
                    </div>
                    <h3 className="font-bold text-slate-100 line-clamp-1">{quiz.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{quiz.description}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 font-medium">{quiz.question_count} Questions</span>
                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      className="gradient-btn px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Quiz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Recommendations & Documents sidebar (1 col) */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-purple-950/10">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" /> AI Weak-Area Remediation
            </h3>
            <div className="space-y-3">
              {analytics?.ai_recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">My Uploads</h3>
              <Link to="/my-documents" className="text-xs text-indigo-400 hover:text-indigo-300">
                View ({documents.length})
              </Link>
            </div>
            <div className="space-y-2.5">
              {documents.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-850">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-200 truncate">{doc.filename}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold uppercase">
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
