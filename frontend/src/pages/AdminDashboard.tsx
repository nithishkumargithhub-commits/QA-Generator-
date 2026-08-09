import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, FileText, Zap, Award, Download, Activity, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '../services/api';
import { AdminDashboardSummary } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await api.getAdminDashboard();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Shield className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
        <h2 className="text-xl font-bold text-slate-100">Loading Enterprise LMS Dashboard...</h2>
      </div>
    );
  }

  const handleExportCSV = () => {
    window.open('/api/v1/admin/export/csv', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" /> Enterprise Commercial LMS
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100">Admin Control Center</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/users" className="glass-panel px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white border border-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Manage Users
          </Link>
          <Link to="/admin/audit" className="glass-panel px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white border border-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" /> Audit Logs
          </Link>
          <button
            onClick={handleExportCSV}
            className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
          <div className="text-3xl font-extrabold text-slate-100 mt-2">{data.total_users}</div>
          <div className="mt-1 text-xs text-indigo-400 font-medium">Active: {data.active_users}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Documents</span>
          <div className="text-3xl font-extrabold text-slate-100 mt-2">{data.total_documents}</div>
          <div className="mt-1 text-xs text-purple-400 font-medium">OCR parsed files</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Generated Quizzes</span>
          <div className="text-3xl font-extrabold text-slate-100 mt-2">{data.total_quizzes}</div>
          <div className="mt-1 text-xs text-emerald-400 font-medium">Total Attempts: {data.total_attempts}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Platform Score</span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{data.avg_platform_score}%</div>
          <div className="mt-1 text-xs text-slate-400 font-medium">Completion Rate: {data.completion_rate}%</div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-slate-100">Daily Platform Activity</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily_activity}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="attempts" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-slate-100">User Growth Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly_growth}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
