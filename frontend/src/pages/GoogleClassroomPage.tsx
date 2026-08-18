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
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname);
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

  const handleGoogleOAuthLogin = async () => {
    const clientId = googleClientId.trim();
    if (!clientId) {
      setShowConfigModal(true);
      setToastMessage('Please configure your Google Client ID below to launch Google OAuth.');
      return;
    }
    localStorage.setItem('gcr_client_id', clientId);

    try {
      await api.disconnectGCR();
    } catch (_) {}

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

  const handleFastAccountConnect = async () => {
    setSyncing(true);
    try {
      const res = await api.saveGCRCredentials("app_user_login_connect");
      setToastMessage(res.message || 'Successfully connected Google Classroom via Logged-In User Account!');
      setShowConfigModal(false);
      fetchGCRData();
    } catch (e: any) {
      setToastMessage(`Error: ${e.message || 'Failed to connect via account login'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleGmailPasswordConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailInput.trim()) {
      setToastMessage('Please enter your Gmail address.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (!gmailPasswordInput.trim()) {
      setToastMessage('Please enter your Gmail password or App Password.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setSyncing(true);
    try {
      // Send gmail:password as the credential token so backend can identify the account
      const credentialToken = `gmail_login:${gmailInput.trim()}:${btoa(gmailPasswordInput)}`;
      const res = await api.saveGCRCredentials(credentialToken);
      setToastMessage(res.message || `Successfully connected Google Classroom for ${gmailInput}!`);
      setShowConfigModal(false);
      setShowGmailLoginSection(false);
      setGmailInput('');
      setGmailPasswordInput('');
      fetchGCRData();
    } catch (e: any) {
      setToastMessage(`Gmail login failed: ${e.message || 'Could not connect with provided credentials.'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (googleClientId.trim()) {
      localStorage.setItem('gcr_client_id', googleClientId.trim());
    }

    if (!apiKeyInput.trim()) {
      if (googleClientId.trim()) {
        setShowConfigModal(false);
        await handleGoogleOAuthLogin();
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
    if (!window.confirm('Disconnect Google Classroom integration and clear old account data?')) return;
    try {
      await api.disconnectGCR();
      setToastMessage('Google Classroom disconnected and old data cleared.');
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
            <p className="text-slate-400 text-sm mt-1">Sign in with your Google Account or sync via your user login to track homework deadlines and generate AI practice exams.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGoogleOAuthLogin}
              className="bg-white hover:bg-slate-100 text-slate-900 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-white/10 transition-all hover:scale-105"
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
              onClick={() => setShowGmailLoginSection(!showGmailLoginSection)}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all hover:scale-105"
            >
              <Mail className="w-4 h-4" /> Gmail + Password
            </button>

            <button
              onClick={handleFastAccountConnect}
              disabled={syncing}
              className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-sky-600/25 transition-all hover:scale-105 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" /> Connect via App Account
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="glass-panel px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 text-slate-300 hover:text-white border border-slate-800"
            >
              <Key className="w-4 h-4 text-sky-400" /> Options / Keys
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

      {/* Inline Gmail + Password Login Panel */}
      {showGmailLoginSection && (
        <div className="glass-panel p-6 rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-950/30 to-orange-950/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Mail className="w-5 h-5 text-red-400" />
              Login with Gmail &amp; Password
            </h3>
            <button
              onClick={() => setShowGmailLoginSection(false)}
              className="text-slate-500 hover:text-white text-lg leading-none"
            >✕</button>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Enter your Gmail address and your Google account password (or an&nbsp;
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">App Password</a>
            ) to connect your Google Classroom account directly.
          </p>
          <form onSubmit={handleGmailPasswordConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gmail Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password / App Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showGmailPassword ? 'text' : 'password'}
                  value={gmailPasswordInput}
                  onChange={(e) => setGmailPasswordInput(e.target.value)}
                  placeholder="Enter Google App Password (recommended) or account password"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowGmailPassword(!showGmailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showGmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Use a Google <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-red-400 underline">App Password</a> if you have 2FA enabled. Your credentials are sent securely.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={syncing}
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {syncing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting...</>
                ) : (
                  <><LogIn className="w-4 h-4" /> Connect Gmail Account</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowGmailLoginSection(false); setGmailInput(''); setGmailPasswordInput(''); }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
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
            <span className="text-lg font-bold text-slate-100">{isConnected ? (connectedEmail ? 'Google Connected' : 'Active GCR Key') : 'Disconnected'}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium truncate">
            {isConnected ? (connectedEmail ? `User: ${connectedEmail}` : 'Live Google API connected') : 'Choose a sign-in option above'}
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
          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-400 hover:text-red-300 underline font-semibold"
            >
              Disconnect & Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">Loading Google Classroom data...</div>
        ) : assignments.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Assignments Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Sign in with your Google account or connect via your app login to load your Google Classroom coursework.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleGoogleOAuthLogin}
                className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                Sign In with Google
              </button>
              <button
                onClick={handleFastAccountConnect}
                className="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                Connect App Account
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((item) => {
              const isOverdue = item.due_date && new Date(item.due_date) < now && item.submission_state !== 'TURNED_IN' && item.submission_state !== 'GRADED';
              const isSubmitted = item.submission_state === 'TURNED_IN' || item.submission_state === 'GRADED';

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isSubmitted
                      ? 'bg-slate-950/60 border-slate-800'
                      : isOverdue
                      ? 'bg-amber-950/10 border-amber-500/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-sky-500/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-300 border border-sky-500/20 truncate max-w-[180px]">
                        {item.course_name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSubmitted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}>
                        {item.submission_state}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 leading-snug">{item.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{item.description || 'No instructions provided.'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Max Points: <strong className="text-slate-200">{item.max_points}</strong></span>
                      <span className="font-mono text-slate-300">{item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No Due Date'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={item.alternate_link || 'https://classroom.google.com'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={() => handleGenerateQuiz(item)}
                        disabled={generatingQuizId === item.id}
                        className="gradient-btn px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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

      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-sky-500/30 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-sky-400" /> Google Classroom Login Options
              </h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Choose how you want to connect your Google Classroom account:
            </p>

            <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-sky-400" /> Option 1: Direct Google OAuth (Gmail)
                </h4>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold">Recommended</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Sign in with your Google account to authorize access to your Google Classroom coursework.
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

            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/30 to-orange-950/20 border border-red-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-red-400" /> Option 2: Gmail + Password Login
                </h4>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-bold">Direct Login</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Enter your Gmail address and password (or App Password) to directly link your Google Classroom.
              </p>
              <form onSubmit={handleGmailPasswordConnect} className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={gmailInput}
                    onChange={(e) => setGmailInput(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type={showGmailPassword ? 'text' : 'password'}
                    value={gmailPasswordInput}
                    onChange={(e) => setGmailPasswordInput(e.target.value)}
                    placeholder="App Password or Gmail password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                  <button type="button" onClick={() => setShowGmailPassword(!showGmailPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showGmailPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={syncing}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {syncing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting...</> : <><LogIn className="w-3.5 h-3.5" /> Login &amp; Connect Gmail</>}
                </button>
              </form>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-sky-400" /> Option 3: Connect via Logged-In App Account
                </h4>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">Fast Connect</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Seamlessly links your registered app user account to Google Classroom coursework.
              </p>
              <button
                type="button"
                onClick={handleFastAccountConnect}
                disabled={syncing}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" /> 1-Click Connect Logged-In Account
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-semibold">or Option 4: Manual API Key / Token</span>
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
