import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BarChart3, Award, Zap, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { UserAnalyticsSummary } from '../types';

export const PerformanceAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<UserAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const data = await api.getUserAnalytics();
        setAnalytics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-indigo-400 mx-auto animate-spin" />
        <h2 className="text-xl font-bold text-slate-100">Loading Analytics Intelligence...</h2>
      </div>
    );
  }

  const radarData = analytics.topic_breakdown.map((t) => ({
    topic: t.topic_name,
    accuracy: t.accuracy_percentage,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" /> Performance & Learning Analytics
        </h1>
        <p className="text-slate-400 text-sm">Empirical accuracy trends, response speed, topic mastery, and AI recommendations.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Attempts</span>
          <div className="text-3xl font-extrabold text-slate-100 mt-2">{analytics.total_quizzes_taken}</div>
        </div>
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Accuracy</span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{analytics.overall_accuracy}%</div>
        </div>
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Score</span>
          <div className="text-3xl font-extrabold text-indigo-400 mt-2">{analytics.average_score}%</div>
        </div>
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Practice Time</span>
          <div className="text-3xl font-extrabold text-purple-400 mt-2">{analytics.total_time_spent_minutes}m</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Topic Accuracy Bar Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-slate-100">Topic Mastery Breakdown</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topic_breakdown}>
                <XAxis dataKey="topic_name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="accuracy_percentage" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Radar Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-slate-100">Skill Competency Radar</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="topic" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" />
                <Radar name="Accuracy" dataKey="accuracy" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recommendations & Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 rounded-2xl border border-emerald-500/30">
          <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" /> Strong Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {analytics.strong_topics.map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-amber-500/30">
          <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Weak Topics Flagged
          </h3>
          <div className="flex flex-wrap gap-2">
            {analytics.weak_topics.length > 0 ? (
              analytics.weak_topics.map((t, i) => (
                <span key={i} className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No weak topics flagged! Exceptional performance.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
