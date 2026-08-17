import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Key, RefreshCw, Sparkles, Clock, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Play, Trash2, ArrowRight, Mail, LogIn } from 'lucide-react';
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
    // Check if returning from Google OAuth redirect (hash containing access_token)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname); // Clean up URL hash
        setSyncing(true);
        api.saveGCRCredentials(accessToken).then((res) => {
          setToastMessage(res.message || 'Successfully authenticated Gmail account via Google OAuth!');
          fetchGCRData();
        }).catch((err) => {
          setToastMessage(`OAuth authentication failed: ${err.message}`);
        }).finally(() => {
          setSyncing(false);
        });
        return;
      }
    }
    fetchGCRData();
  }, []);

  const handleGoogleOAuthLogin = () => {
    const clientId = googleClientId.trim();
    if (!clientId) {
      setShowConfigModal(true);
      setToastMessage('Please configure your Google Client ID below to launch Google OAuth.');
      return;
    }
    localStorage.setItem('gcr_client_id', clientId);

    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
      'email',
      'profile'
    ].join(' ');

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&include_granted_scopes=true` +
      `&prompt=select_account%20consent`;

    window.location.href = oauthUrl;
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (googleClientId.trim()) {
      localStorage.setItem('gcr_client_id', googleClientId.trim());
    }

    if (!apiKeyInput.trim()) {
      if (googleClientId.trim()) {
        setShowConfigModal(false);
        handleGoogleOAuthLogin();
        return;
      }
      return;
    }

    setSyncing(true);
    try {
      const res = await api.saveGCRCredentials(apiKeyInput);
      setToastMessage(res.message || 'Google Classroom credentials successfully saved!');
      setShowConfigModal(false);
      fetchGCRData();
    } catch (e: any) {
      setToastMessage(`Error: ${e.message || 'Failed to save GCR API Key'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Classroom integration?')) return;
    try {
      await api.disconnectGCR();
      setToastMessage('Google Classroom disconnected.');
      setConnectedEmail(null);
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
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
      setTimeout(() => setToastMessage(null), 3000);
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

  // Group assignments by urgency
  const now = new Date();
  const overdueOrDueToday = assignments.filter((a) => {
    if (!a.due_date) return false;
    const due = new Date(a.due_date);
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 3600);
    return hoursLeft < 24 && a.submission_state !== 'TURNED_IN' && a.submission_state !== 'GRADED';
  });

  const dueUpcoming = assignments.filter((a) => {
    if (!a.due_date) return true;
    const due = new Date(a.due_date);
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 3600);
    return hoursLeft >= 24 && a.submission_state !== 'TURNED_IN' && a.submission_state !== 'GRADED';
  });

  const completed = assignments.filter((a) => a.submission_state === 'TURNED_IN' || a.submission_state === 'GRADED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-sky-500/20 bg-gradient-to-r from-slate-950 via-sky-950/30 to-indigo-950/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" /> Google Classroom Integration
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100">Homework & Submission Tracker</h1>
            <p className="text-slate-400 text-sm mt-1">Authenticate your Gmail account via Google OAuth 2.0, track upcoming homework deadlines, and generate 1-click AI prep exams.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGoogleOAuthLogin}
              className="bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-white/10 transition-all hover:scale-105"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign In with Google (Gmail)
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="gradient-btn px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-sky-500/25"
            >
              <Key className="w-4 h-4" /> {isConnected ? 'Credentials / Keys' : 'Connect API Key'}
            </button>

            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="glass-panel px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-sky-400 ${syncing ? 'animate-spin' : ''}`} /> Sync
            </button>
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

      {/* Metrics Overview Row */}
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
            <span className="text-lg font-bold text-slate-100">{isConnected ? (connectedEmail ? 'Gmail Connected' : 'Active GCR Key') : 'Sandbox Mode'}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium truncate">
            {isConnected ? (connectedEmail ? `User: ${connectedEmail}` : 'Live Google API connected') : 'Click "Sign In with Google" to connect'}
          </div>
        </div>
      </div>

      {/* Overdue / Urgent Alert Banner */}
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.submission_state}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{item.description || 'No detailed instructions provided.'}</p>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Due: {item.due_date ? new Date(item.due_date).toLocaleString() : 'No Deadline'}
                  </span>
                  <button
                    onClick={() => handleGenerateQuiz(item)}
                    disabled={generatingQuizId === item.id}
                    className="gradient-btn px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    {generatingQuizId === item.id ? 'Generating AI Exam...' : '1-Click Prep Exam'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Homework List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" /> Google Classroom Coursework ({assignments.length})
          </h2>
          <div className="text-xs text-slate-400">
            Click <span className="text-sky-300 font-semibold">1-Click Prep Exam</span> on any coursework to build an AI assessment.
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">Loading Google Classroom data...</div>
        ) : assignments.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800 space-y-4">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-200">No Coursework Found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              No pending upcoming assignments found in Google Classroom. Click below to sign in with your Google account.
            </p>
            <button
              onClick={handleGoogleOAuthLogin}
              className="gradient-btn px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              Sign In with Google (Gmail)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assignments.map((item) => {
              const isDone = item.submission_state === 'TURNED_IN' || item.submission_state === 'GRADED';
              return (
                <div
                  key={item.id}
                  className={`glass-card p-5 rounded-2xl border transition-all duration-200 ${
                    isDone ? 'border-slate-800/80 bg-slate-950/40 opacity-75' : 'border-slate-800 hover:border-sky-500/40'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {item.course_name}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {item.submission_state}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">Points: {item.max_points}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-100">{item.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                        {item.description || 'No additional instructions provided for this assignment.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      {item.alternate_link && (
                        <a
                          href={item.alternate_link}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-panel px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                        >
                          GCR Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => handleGenerateQuiz(item)}
                        disabled={generatingQuizId === item.id}
                        className="gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-sky-500/20"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                        {generatingQuizId === item.id ? 'Generating Quiz...' : '1-Click Prep Exam'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-sky-500/30 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-sky-400" /> Google Classroom Credentials
              </h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Authenticate using your <strong>Gmail Account via Google OAuth</strong> or enter an <strong>OAuth Bearer Access Token / API Key</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-sky-400" /> Direct Google OAuth Sign-In
                </h4>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold">Recommended</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Uses your Google Cloud OAuth Client ID to prompt test users to sign in with their Gmail account.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Google OAuth Client ID</label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={handleGoogleOAuthLogin}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Launch Google OAuth Login
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-semibold">or manually paste token / key</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">OAuth Token / API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste OAuth token (ya29...) or API key (AIzaSy...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20"
                  >
                    Disconnect
                  </button>
                )}
                <button
                  type="submit"
                  disabled={syncing}
                  className="gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold"
                >
                  {syncing ? 'Connecting...' : 'Save & Sync Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
