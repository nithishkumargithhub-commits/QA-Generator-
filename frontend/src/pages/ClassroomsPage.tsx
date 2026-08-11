import React, { useState, useEffect } from 'react';
import { School, Users, Key, Plus, BookOpen, Calendar, CheckCircle2, Award } from 'lucide-react';
import { api } from '../services/api';

export const ClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    loadClassrooms();
  }, []);

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
