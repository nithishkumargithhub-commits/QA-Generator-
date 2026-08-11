import React, { useEffect, useState } from 'react';
import { Users, Search, Shield, FileText, History, Award, X, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // User History Drawer Modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userHistory, setUserHistory] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await api.getAdminUsers(search);
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToggleStatus = async (user: User) => {
    await api.toggleUserStatus(user.id, {
      is_active: !user.is_active,
    });
    setToastMessage(`User '${user.username}' is now ${!user.is_active ? 'Active' : 'Disabled'}. Changes saved to database.`);
    setTimeout(() => setToastMessage(null), 4000);
    fetchUsers();
  };

  const handleToggleSuspension = async (user: User) => {
    await api.toggleUserStatus(user.id, {
      is_suspended: !user.is_suspended,
    });
    setToastMessage(`User '${user.username}' is now ${!user.is_suspended ? 'Suspended' : 'Unsuspended'}. Changes saved to database.`);
    setTimeout(() => setToastMessage(null), 4000);
    fetchUsers();
  };

  const handleRoleChange = async (user: User, newRole: string) => {
    await api.toggleUserStatus(user.id, {
      role: newRole,
    });
    setToastMessage(`User '${user.username}' role updated to '${newRole}'. Changes saved to database.`);
    setTimeout(() => setToastMessage(null), 4000);
    fetchUsers();
  };


  const handleInspectHistory = async (userId: string) => {
    setSelectedUserId(userId);
    setHistoryLoading(true);
    try {
      const history = await api.getUserHistory(userId);
      setUserHistory(history);
    } catch (e) {
      console.error('Failed to load user history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> User Management
          </h1>
          <p className="text-slate-400 text-sm">Manage user accounts, roles (Admin, Instructor, Student), and inspect individual histories.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-200">
                  {u.username}
                  <span className="block text-[11px] text-slate-500 font-normal">{u.full_name}</span>
                </td>
                <td className="p-4 text-slate-400">{u.email}</td>
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Student">Student</option>
                    <option value="Instructor">Instructor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit ${
                      u.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                    {u.is_suspended && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Suspended
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleInspectHistory(u.id)}
                    className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" /> Inspect History
                  </button>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold"
                  >
                    {u.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleToggleSuspension(u)}
                    className="px-3 py-1 rounded-lg bg-slate-950 border border-amber-900/50 hover:bg-amber-900/20 text-amber-300 font-semibold"
                  >
                    {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* User History Inspector Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" /> User Audit & History Record
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Comprehensive audit trail of uploaded documents, generated quizzes, and test session attempts.</p>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-950 border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading || !userHistory ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-400">Loading user history records...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Info Header Card */}
                <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-base">{userHistory.user.username}</h3>
                      <p className="text-xs text-slate-400">{userHistory.user.email}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {userHistory.user.role}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60 text-slate-400">
                    <div>Registered: <span className="text-slate-200 font-medium">{new Date(userHistory.user.created_at).toLocaleDateString()}</span></div>
                    <div>Last Login: <span className="text-slate-200 font-medium">{userHistory.user.last_login_at ? new Date(userHistory.user.last_login_at).toLocaleString() : 'Never'}</span></div>
                  </div>
                </div>

                {/* Uploaded Documents Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Uploaded Knowledge PDFs ({userHistory.documents.length})
                  </h3>
                  {userHistory.documents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                      No documents uploaded by this user.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userHistory.documents.map((doc: any) => (
                        <div key={doc.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-200">{doc.filename}</p>
                            <p className="text-[11px] text-slate-500">{Math.round(doc.file_size / 1024)} KB • {doc.chapter_count} chapters • {new Date(doc.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generated Quizzes Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Created Quizzes ({userHistory.quizzes.length})
                  </h3>
                  {userHistory.quizzes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                      No quizzes created by this user.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userHistory.quizzes.map((q: any) => (
                        <div key={q.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-200">{q.title}</p>
                            <p className="text-[11px] text-slate-500">{q.question_count} Questions • Difficulty: {q.difficulty_level}</p>
                          </div>
                          <span className="text-slate-400 text-[11px]">{new Date(q.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assessment Attempts Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Assessment Attempt History ({userHistory.sessions.length})
                  </h3>
                  {userHistory.sessions.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                      No assessment sessions attempted yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userHistory.sessions.map((s: any) => (
                        <div key={s.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-200">{s.quiz_title}</p>
                            <p className="text-[11px] text-slate-500">Duration: {Math.round(s.total_time_seconds / 60)}m {s.total_time_seconds % 60}s • {new Date(s.started_at).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-extrabold ${s.pass_status ? 'text-emerald-400' : 'text-red-400'}`}>
                              {s.percentage}% ({s.grade})
                            </span>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase">{s.pass_status ? 'Passed' : 'Failed'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

