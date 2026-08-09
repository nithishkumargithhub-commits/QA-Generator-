import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Award, CheckCircle2, XCircle, Clock, RotateCcw, Download, Sparkles, BarChart2, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { QuizSession } from '../types';

export const QuizResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      if (!sessionId) return;
      try {
        const data = await api.getSessionReport(sessionId);
        setSession(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [sessionId]);

  if (loading || !session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-indigo-400 mx-auto animate-spin" />
        <h2 className="text-xl font-bold text-slate-100">Generating Analytics Report...</h2>
      </div>
    );
  }

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 print:p-0">
      {/* Header Badge */}
      <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 text-center relative overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
          <Award className="w-10 h-10 text-white" />
        </div>

        <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
          session.pass_status ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' : 'bg-red-500/20 border border-red-500 text-red-400'
        }`}>
          {session.pass_status ? 'Assessment Passed' : 'Needs Revision'}
        </span>

        <h1 className="text-4xl font-black text-slate-100 mt-2">
          {session.percentage}% Score
        </h1>
        <p className="text-slate-400 text-sm mt-1">Grade: <span className="text-indigo-400 font-extrabold">{session.grade}</span> | Total Score: {session.score} / {session.max_score}</p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <button
            onClick={handlePrintPDF}
            className="glass-panel px-5 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white border border-slate-800 flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-indigo-400" /> Export PDF Report
          </button>
          <Link to="/upload" className="gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Practice Another Document
          </Link>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 text-center">
          <Clock className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Time</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">{Math.round(session.total_time_seconds / 60)} mins</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <span className="text-xs text-slate-400 uppercase font-semibold">Accuracy</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{session.percentage}%</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 text-center">
          <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <span className="text-xs text-slate-400 uppercase font-semibold">Status</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">{session.status.toUpperCase()}</div>
        </div>
      </div>

      {/* Answers Breakdown */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-400" /> Detailed Question Audit
        </h3>

        <div className="space-y-3">
          {session.answers?.map((ans: any, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex items-start gap-4">
              {ans.is_correct ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-medium">
                  <span>Question {idx + 1}</span>
                  <span>Time: {ans.response_time_seconds}s</span>
                </div>
                <p className="text-slate-200 font-medium text-sm">Selected Options: {JSON.stringify(ans.selected_options)}</p>
                {ans.feedback_explanation && (
                  <p className="text-slate-400 leading-relaxed pt-1">{ans.feedback_explanation}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
