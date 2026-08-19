import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Key, RefreshCw, Sparkles, Clock, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Play, Trash2, ArrowRight, Mail, LogIn, UserCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { GoogleClassroomAssignment } from '../types';

export const GoogleClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<GoogleClassroomAssignment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('gcr_client_id') || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingQuizId, setGeneratingQuizId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gmailInput, setGmailInput] = useState('');
  const [gmailPasswordInput, setGmailPasswordInput] = useState('');
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [showGmailLoginSection, setShowGmailLoginSection] = useState(false);

  const fetchGCRData = async () => {
    try {
      const res = await api.getGCRAssignments();
      setIsConnected(res.is_connected);
      setConnectedAt(res.connected_at || null);
      setConnectedEmail(res.connected_email || null);
      setAssignments(res.assignments || []);
    } catch (e) {
      console.error('Failed to load Google Classroom data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const search = window.location.search;
    if (search) {
      const params = new URLSearchParams(search);
      const statusParam = params.get('status');
      const msgParam = params.get('message');
      const errParam = params.get('error');

      if (statusParam === 'success' || msgParam) {
        setToastMessage(msgParam || 'Successfully connected Google Classroom via Google OAuth!');
        window.history.replaceState(null, '', window.location.pathname);
      } else if (errParam) {
        setToastMessage(`Google OAuth Error: ${errParam}`);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    fetchGCRData();
  }, []);

  const handleGoogleOAuthLogin = async () => {
    setSyncing(true);
    try {
      const res = await api.getGCROAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      } else {
        setToastMessage('Could not retrieve Google OAuth authorization URL.');
      }
    } catch (e: any) {
      setToastMessage(`OAuth Initialization Error: ${e.message || 'Failed to connect to Google OAuth.'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Classroom integration and clear account data?')) return;
    try {
      await api.disconnectGCR();
      setToastMessage('Google Classroom disconnected and credentials cleared.');
      setConnectedEmail(null);
      setIsConnected(false);
      setAssignments([]);
      fetchGCRData();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await api.syncGCR();
      setToastMessage('Google Classroom assignments refreshed!');
      fetchGCRData();
    } catch (e: any) {
      setToastMessage(`Sync failed: ${e.message || 'Could not sync Classroom data.'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleGenerateQuiz = async (assignment: GoogleClassroomAssignment) => {
    setGeneratingQuizId(assignment.id);
    try {
      const res = await api.generateQuizFromGCRAssignment(assignment.id);
      setToastMessage(`AI Practice Exam created: '${res.quiz_title}'! Redirecting...`);
      setTimeout(() => {
        navigate(`/quiz/${res.quiz_id}`);
      }, 1500);
    } catch (e: any) {
      setToastMessage(`Failed to generate quiz: ${e.message || 'Error'}`);
    } finally {
      setGeneratingQuizId(null);
    }
  };

  const now = new Date();
  const overdueOrDueToday = assignments.filter((a) => {
    if (!a.due_date) return false;
    const due = new Date(a.due_date);
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 3600);
    return hoursLeft < 24 && a.submission_state !== 'TURNED_IN' && a.submission_state !== 'GRADED';
  });

  const completed = assignments.filter((a) => a.submission_state === 'TURNED_IN' || a.submission_state === 'GRADED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="glass-panel p-8 rounded-3xl border border-sky-500/20 bg-gradient-to-r from-slate-950 via-sky-950/30 to-indigo-950/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" /> Google Classroom Integration
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100">Homework & Submission Tracker</h1>
            <p className="text-slate-400 text-sm mt-1">Sign in with your Google Account to track homework deadlines and generate AI practice exams.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGoogleOAuthLogin}
              disabled={syncing}
              className="bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-white/10 transition-all hover:scale-105 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign In with Google
            </button>

            <button
              onClick={handleSyncNow}
              disabled={syncing || !isConnected}
              className="glass-panel px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-sky-400 ${syncing ? 'animate-spin' : ''}`} /> Sync Now
            </button>

            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-semibold hover:bg-red-500/20 transition-all"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tracked Homeworks</span>
          <div className="mt-2 text-3xl font-extrabold text-slate-100">{assignments.length}</div>
          <div className="mt-1 text-xs text-sky-400 font-medium">Auto-synced from Google Classroom</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue / Urgent</span>
          <div className="mt-2 text-3xl font-extrabold text-amber-400">{overdueOrDueToday.length}</div>
          <div className="mt-1 text-xs text-amber-400/90 font-medium">Due in &lt; 24h or missing</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Turned In / Completed</span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-400">{completed.length}</div>
          <div className="mt-1 text-xs text-emerald-400 font-medium">Submitted homeworks</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connection Status</span>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-lg font-bold text-slate-100">{isConnected ? 'Google Connected' : 'Disconnected'}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium truncate">
            {isConnected ? (connectedEmail ? `User: ${connectedEmail}` : 'Authorized via Google OAuth') : 'Sign in with Google to connect'}
          </div>
        </div>
      </div>

      {overdueOrDueToday.length > 0 && (
        <div className="glass-card p-6 rounded-2xl border border-amber-500/40 bg-amber-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" /> Urgent & Due Today Homework Alerts ({overdueOrDueToday.length})
            </h2>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              High Priority
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdueOrDueToday.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {item.course_name}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">{item.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded">
                    Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{item.description || 'No detailed instructions.'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <a
                    href={item.alternate_link || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    Open in GCR <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => handleGenerateQuiz(item)}
                    disabled={generatingQuizId === item.id}
                    className="gradient-btn px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    {generatingQuizId === item.id ? 'Generating Quiz...' : '1-Click Prep Exam'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" /> Coursework & Assignment Queue
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Synced homework items from your Google Classroom courses.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">Loading Google Classroom data...</div>
        ) : assignments.length === 0 ? (
          <div className="py-10 space-y-4">
            {isConnected && connectedEmail ? (
              <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-4 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-amber-300">Connected as {connectedEmail}, but no active courses found</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
                    No active coursework was returned for this account. If you have active courses under a different Google account, click below to re-authorize.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <button
                    onClick={handleGoogleOAuthLogin}
                    className="bg-white hover:bg-slate-100 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Re-Authenticate with Google OAuth
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-300">No Google Classroom Connected</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Sign in with your Google account via official Google OAuth to load your real Google Classroom courses and assignments.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleGoogleOAuthLogin}
                    disabled={syncing}
                    className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Sign In with Google
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((item) => {
              const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.submission_state !== 'TURNED_IN';
              return (
                <div key={item.id} className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 truncate max-w-[180px]">
                        {item.course_name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.submission_state === 'TURNED_IN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        isOverdue ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.submission_state === 'TURNED_IN' ? 'Submitted' : isOverdue ? 'Missing / Overdue' : 'Assigned'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {item.description || 'No assignment instructions available.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Max Score: {item.max_points > 0 ? `${item.max_points} pts` : 'Ungraded'}</span>
                      <span>Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={item.alternate_link || 'https://classroom.google.com'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                      >
                        GCR Link <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleGenerateQuiz(item)}
                        disabled={generatingQuizId === item.id}
                        className="gradient-btn px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        {generatingQuizId === item.id ? 'Generating...' : 'Prep Quiz'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-sky-500/30 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-sky-400" /> Google Integration Info
              </h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Google Classroom API strictly requires Google OAuth 2.0 authorization. Sign in below using your Google account to grant permission to load active courses and assignments.
            </p>

            <button
              type="button"
              onClick={handleGoogleOAuthLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all hover:scale-105"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign In with Google OAuth
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
