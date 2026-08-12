import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Key, RefreshCw, Sparkles, Clock, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Play, Trash2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { GoogleClassroomAssignment } from '../types';

export const GoogleClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<GoogleClassroomAssignment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
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
      setAssignments(res.assignments || []);
    } catch (e) {
      console.error('Failed to load Google Classroom data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGCRData();
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
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
            <p className="text-slate-400 text-sm mt-1">Connect your GCR API credentials, track upcoming homework deadlines, and generate 1-click AI prep exams.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="gradient-btn px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-sky-500/25"
            >
              <Key className="w-4 h-4" /> {isConnected ? 'Update GCR API Key' : 'Connect GCR API Key'}
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
            <span className="text-xl font-bold text-slate-100">{isConnected ? 'Active GCR Key' : 'Sandbox Key'}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            {isConnected ? 'Live Google API connected' : 'Click "Connect GCR API Key" to add yours'}
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
                    <h3 className="font-bold text-slate-100 mt-1">{item.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    {item.submission_state}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Due: {item.due_date ? new Date(item.due_date).toLocaleString() : 'Today'}
                  </span>
                  <button
                    onClick={() => handleGenerateQuiz(item)}
                    disabled={generatingQuizId === item.id}
                    className="gradient-btn px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> AI Prep Quiz →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Homework List Tabs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" /> Upcoming Coursework Assignments
          </h2>
          <span className="text-xs text-slate-400 font-medium">Click "AI Prep Quiz" to generate a practice exam</span>
        </div>

        {dueUpcoming.length === 0 ? (
          <div className="glass-card p-10 rounded-2xl text-center border border-slate-800">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-200">All Homeworks Up to Date!</h3>
            <p className="text-slate-400 text-sm mt-1">No pending upcoming assignments found in Google Classroom.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueUpcoming.map((item) => (
              <div key={item.id} className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      {item.course_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-slate-400 border border-slate-800">
                      {item.submission_state}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-base">{item.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-850 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[11px]">Due Date</div>
                    <div className="font-semibold text-slate-200">
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No Deadline'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.alternate_link && (
                      <a
                        href={item.alternate_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white font-semibold flex items-center gap-1"
                      >
                        GCR <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => handleGenerateQuiz(item)}
                      disabled={generatingQuizId === item.id}
                      className="gradient-btn px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI Prep Exam
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Homeworks Section */}
      {completed.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Submitted & Graded Homeworks ({completed.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completed.map((item) => (
              <div key={item.id} className="glass-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">{item.course_name}</span>
                  <h4 className="font-bold text-slate-200 mt-0.5">{item.title}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.submission_state}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-sky-500/30 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-sky-400" /> Enter Google Classroom Credentials
              </h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your <strong>Google Classroom API Key</strong> or <strong>OAuth Bearer Access Token</strong> to manually connect your student/instructor account.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">GCR API Key / Bearer Token</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your API key or OAuth Token (e.g. AIzaSy... or ya29...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">How to get a Google Classroom API Key:</p>
                <p>1. Visit Google Cloud Console → Enable Google Classroom API.</p>
                <p>2. Create an API Key or OAuth Client ID token.</p>
                <p>3. Paste the key above and click Save & Sync.</p>
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
                  {syncing ? 'Connecting...' : 'Save & Sync API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
