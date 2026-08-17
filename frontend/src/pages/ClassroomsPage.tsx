import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, Users, Key, Plus, BookOpen, Calendar, CheckCircle2, Award, UserCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const ClassroomsPage: React.FC = () => {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    loadClassrooms();
  }, []);

  const handleGoogleOAuthLogin = async () => {
    const clientId = localStorage.getItem('gcr_client_id') || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      navigate('/gcr');
      return;
    }

    try {
      await api.disconnectGCR();
    } catch (_) {}

    const redirectUri = window.location.origin + '/gcr';
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
      await api.saveGCRCredentials("app_user_login_connect");
      setToastMsg("Connected to Google Classroom via App Account! Redirecting...");
      setTimeout(() => navigate('/gcr'), 1000);
    } catch (e: any) {
      setToastMsg(`Error: ${e.message || 'Failed to connect'}`);
    } finally {
      setSyncing(false);
    }
  };

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      const data = await api.getClassrooms();
      setClassrooms(data);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    try {
      await api.createClassroom({ name: className, description: classDesc });
      setClassName('');
      setClassDesc('');
      setShowCreateModal(false);
      loadClassrooms();
    } catch (err: any) {
      alert(`Error creating classroom: ${err.message}`);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await api.joinClassroom(joinCode.trim());
      setJoinCode('');
      setShowJoinModal(false);
      loadClassrooms();
    } catch (err: any) {
      alert(`Error joining classroom: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <School className="w-5 h-5 text-indigo-400" />
              <span>COMMERCIAL LMS CLASSROOM SUITE</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Classrooms & Gradebook</h1>
            <p className="text-slate-400 text-sm mt-1">Manage class rosters, assign homework quizzes, and monitor student mastery.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              <Key className="w-4 h-4 text-amber-400" /> Join via Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" /> Create Classroom
            </button>
          </div>
        </div>

        {/* Google Classroom Sync Banner with Secondary Login Option */}
        <div className="glass-panel p-6 rounded-2xl border border-sky-500/30 bg-sky-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-extrabold uppercase border border-sky-500/30">
              <BookOpen className="w-3 h-3" /> Google Classroom Integration
            </div>
            <h3 className="text-lg font-bold text-white">Sync Google Classroom Homework & Courses</h3>
            <p className="text-xs text-slate-400">Choose a login option to connect your Google Classroom account:</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGoogleOAuthLogin}
              className="bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition hover:scale-105"
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
              onClick={handleFastAccountConnect}
              disabled={syncing}
              className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition hover:scale-105 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" /> Connect via App Account
            </button>

            <Link
              to="/gcr"
              className="glass-panel px-3 py-2.5 rounded-xl text-xs font-semibold text-sky-400 hover:text-sky-300 border border-slate-800 flex items-center gap-1"
            >
              <span>GCR Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {toastMsg && (
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold">
            {toastMsg}
          </div>
        )}

        {/* Grid of Classrooms */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading classrooms...</div>
        ) : classrooms.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <School className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Classrooms Yet</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Create a classroom to assign quizzes to students or join an existing batch using a 6-character code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map(cls => (
              <div key={cls.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 space-y-4 shadow-xl transition group">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">{cls.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cls.description || 'No description provided.'}</p>
                  </div>
                  <span className="bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                    {cls.code}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" /> Active Roster
                  </span>
                  <span className="text-slate-300 font-semibold">{cls.member_count || 1} Students</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Classroom Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold text-white">Create New Classroom</h3>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Classroom Name</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  placeholder="e.g. Computer Science 101"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white mt-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Description</label>
                <textarea
                  value={classDesc}
                  onChange={e => setClassDesc(e.target.value)}
                  placeholder="Optional section details..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white mt-1 focus:outline-none focus:border-indigo-500 h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Classroom Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleJoin} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold text-white">Join Classroom via Code</h3>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Enter 6-Character Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-indigo-400 uppercase mt-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Join Batch
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
