import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, FileText, Play, Award, Zap, AlertTriangle, TrendingUp, CheckCircle2,
  ArrowRight, Layers, Users, Gamepad2, Shield, BookOpen, UploadCloud, UserPlus,
  FolderKanban, Trophy, ChevronRight
} from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Permanent Left Quick-Access Navigation Sidebar */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-6 lg:sticky lg:top-20">
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 bg-slate-950/90 space-y-6 shadow-xl shadow-indigo-950/20">

            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">Quick Access</h3>
                  <span className="text-[10px] text-indigo-400 font-semibold">1-Click Launch Menu</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                12 Tools
              </span>
            </div>

            {/* Section 1: Core Creation & Quiz Tools */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2 block">
                Core Creation & Quizzes
              </span>

              <Link
                to="/upload"
                className="w-full p-2.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-slate-100 hover:border-indigo-400 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Upload Document</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500 text-white font-extrabold">AI Parse</span>
              </Link>

              <Link
                to="/generate-quiz"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Generate AI Quiz</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/quizzes"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Quiz Library & Player</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{quizzes.length}</span>
              </Link>

              {quizzes[0] && (
                <button
                  onClick={() => handleStartQuiz(quizzes[0])}
                  className="w-full p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40 flex items-center justify-between group transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Play className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="text-xs font-bold truncate">Start: {quizzes[0].title}</span>
                  </div>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </button>
              )}

              <Link
                to="/analytics"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Quiz Results & Breakdown</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Section 2: Interactive Modules */}
            <div className="space-y-2 pt-3 border-t border-slate-800/80">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2 block">
                Interactive Suite
              </span>

              <Link
                to="/gcr"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Google Classroom</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-extrabold">GCR API</span>
              </Link>

              <Link
                to="/live"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Live Battle Arena</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold">Live</span>
              </Link>

              <Link
                to="/question-bank"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Question Bank</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-extrabold">Exports</span>
              </Link>

              <Link
                to="/flashcards"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">AI Flashcards & SRS</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/classrooms"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Classrooms LMS</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/my-documents"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FolderKanban className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">My Documents</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{documents.length}</span>
              </Link>
            </div>

            {/* Section 3: Account & Admin Controls */}
            <div className="space-y-2 pt-3 border-t border-slate-800/80">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2 block">
                Account & Admin
              </span>

              <Link
                to="/register"
                className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Register New User</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {user?.role === 'Admin' && (
                <Link
                  to="/admin/users"
                  className="w-full p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold">Admin LMS Control</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500 text-white font-extrabold">ADMIN</span>
                </Link>
              )}
            </div>

          </div>
        </aside>

        {/* Main Content Dashboard Space */}
        <main className="flex-1 space-y-8 min-w-0">

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
                <Link to="/upload" className="gradient-btn px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 shrink-0">
                  <Sparkles className="w-4 h-4" /> Upload Document
                </Link>
                <Link to="/quizzes" className="glass-panel px-5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-slate-800 shrink-0">
                  Browse All Quizzes ({quizzes.length})
                </Link>
              </div>
            </div>
          </div>

          {/* Feature Suite Navigation Hub Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" /> Platform Feature Suite & Tools
              </h2>
              <span className="text-xs text-slate-400 font-medium">Click any module below to jump in</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* 1. Flashcards */}
              <Link
                to="/flashcards"
                className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 hover:border-amber-500/60 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      SuperMemo SM-2
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-100 group-hover:text-amber-300 transition-colors">AI Flashcards & SRS</h3>
                  <p className="text-xs text-slate-400">Master key terms with 3D flipping decks & spaced repetition memory intervals.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Flashcards</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* 2. Question Bank */}
              <Link
                to="/question-bank"
                className="glass-card p-5 rounded-2xl border border-sky-500/30 bg-sky-950/10 hover:border-sky-500/60 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      4 Exporters
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-100 group-hover:text-sky-300 transition-colors">Question Bank & Export</h3>
                  <p className="text-xs text-slate-400">Export assessments to PDF Exams, Moodle XML, QTI 2.1, or Canvas/Google CSV.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Repository</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* 3. Classrooms */}
              <Link
                to="/classrooms"
                className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/60 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      LMS Suite
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-100 group-hover:text-emerald-300 transition-colors">Classrooms & Roster</h3>
                  <p className="text-xs text-slate-400">Manage student batches, assignments, unique join codes, and PDF certificates.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Manage Batches</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* 4. Live Multiplayer */}
              <Link
                to="/live"
                className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 hover:border-purple-500/60 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Live WebSocket
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-100 group-hover:text-purple-300 transition-colors">Live Battle Arena</h3>
                  <p className="text-xs text-slate-400">Host synchronous Kahoot-style quiz rooms with real-time room code battles.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>Join / Host Battle</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* 5. Google Classroom Tracker */}
              <Link
                to="/gcr"
                className="glass-card p-5 rounded-2xl border border-sky-500/30 bg-sky-950/10 hover:border-sky-500/60 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      GCR API Integration
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-100 group-hover:text-sky-300 transition-colors">Google Classroom Tracker</h3>
                  <p className="text-xs text-slate-400">Connect GCR API key, track homework deadlines, and generate 1-click AI prep exams.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
                  <span>Open GCR Tracker</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* 6. Performance Analytics */}
              <Link
                to="/analytics"
                className="glass-card p-5 rounded-2xl border border-teal-500/30 bg-teal-950/10 hover:border-teal-500/60 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Real-time Reports
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-100 group-hover:text-teal-300 transition-colors">Performance Analytics</h3>
                  <p className="text-xs text-slate-400">View progress charts, mastery heatmaps, accuracy scores, and weak-topic diagnostics.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:translate-x-1 transition-transform">
                  <span>View Full Analytics</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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

          {/* Active Quizzes & Side Columns */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-400" /> Active Created Quizzes ({quizzes.length})
                </h2>
                <Link to="/quizzes" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                  View All Library <ArrowRight className="w-3.5 h-3.5" />
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
                <div className="space-y-4">
                  {/* Featured / Most Recent Quiz Card */}
                  {quizzes[0] && (
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/40 bg-indigo-950/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white uppercase">
                            Latest Quiz
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                            {quizzes[0].difficulty_level}
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-100">{quizzes[0].title}</h3>
                        <p className="text-xs text-slate-400 max-w-xl">{quizzes[0].description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                          <span><strong>{quizzes[0].question_count || (quizzes[0].questions?.length || 0)}</strong> Questions</span>
                          <span><strong>{quizzes[0].time_limit_minutes}</strong> Minutes</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartQuiz(quizzes[0])}
                        className="gradient-btn px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 shrink-0"
                      >
                        <Play className="w-4 h-4" /> Start Assessment
                      </button>
                    </div>
                  )}

                  {/* Grid of Remaining Quizzes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.slice(1, 7).map((quiz) => (
                      <div key={quiz.id} className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3">
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

                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">{quiz.question_count || (quiz.questions?.length || 0)} Questions</span>
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            className="gradient-btn px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5" /> Start Quiz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Recommendations & Documents Sidebar */}
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-purple-950/10">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-400" /> AI Weak-Area Remediation
                </h3>
                <div className="space-y-3">
                  {analytics?.ai_recommendations?.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  )) || (
                    <p className="text-xs text-slate-400">Complete assessments to get personalized AI remediation recommendations.</p>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">My Uploaded Documents</h3>
                  <Link to="/my-documents" className="text-xs text-indigo-400 hover:text-indigo-300">
                    View ({documents.length})
                  </Link>
                </div>
                <div className="space-y-3">
                  {documents.slice(0, 4).map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-200 truncate">{doc.filename}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold uppercase shrink-0">
                          {doc.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">{doc.chapter_count} chapters</span>
                        <Link
                          to={`/generate-quiz?docId=${doc.id}`}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Create Quiz →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};
