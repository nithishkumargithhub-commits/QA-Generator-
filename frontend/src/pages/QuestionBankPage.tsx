import React, { useState, useEffect } from 'react';
import { Database, Download, FileSpreadsheet, FileCode, FileText, Filter, CheckSquare, Plus, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export const QuestionBankPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await api.getQuizzes();
      setQuizzes(data);
      if (data.length > 0) {
        setSelectedQuizId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'moodle' | 'qti' | 'csv') => {
    if (!selectedQuizId) return;
    const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
    window.open(`${backendUrl}/api/v1/export/quiz/${selectedQuizId}/${format}`, '_blank');
  };

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Database className="w-5 h-5 text-indigo-400" />
              <span>QUESTION REPOSITORY & EXPORTER</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Question Bank & Custom Builder</h1>
            <p className="text-slate-400 text-sm mt-1">Manage questions and export to Moodle, QTI 2.1, CSV, or Printable PDF.</p>
          </div>

          {/* Export Actions */}
          {selectedQuiz && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                <FileText className="w-4 h-4" /> Printable PDF
              </button>
              <button
                onClick={() => handleExport('moodle')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
              >
                <FileCode className="w-4 h-4 text-amber-400" /> Moodle XML
              </button>
              <button
                onClick={() => handleExport('qti')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
              >
                <Download className="w-4 h-4 text-emerald-400" /> QTI 2.1
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-sky-400" /> Canvas CSV
              </button>
            </div>
          )}
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quiz Selector List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-2">Select Quiz / Exam</h3>
            {loading ? (
              <div className="text-sm text-slate-500 p-4">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
              <div className="text-sm text-slate-500 p-4">No generated quizzes found.</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {quizzes.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuizId(q.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition ${
                      selectedQuizId === q.id
                        ? 'bg-indigo-950/70 border-indigo-500/80 text-white shadow-md'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-sm line-clamp-1">{q.title}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>{q.questions?.length || 0} Questions</span>
                      <span className="capitalize text-indigo-400">{q.difficulty}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Question List Preview */}
          <div className="lg:col-span-2 space-y-4">
            {selectedQuiz ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedQuiz.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Time Limit: {selectedQuiz.time_limit_minutes} mins | Passing Score: {selectedQuiz.passing_score}%
                  </p>
                </div>

                <div className="space-y-4">
                  {selectedQuiz.questions?.map((q: any, idx: number) => (
                    <div key={q.id || idx} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-white">
                          <span className="text-indigo-400">Q{idx + 1}.</span> {q.stem}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono shrink-0 uppercase">
                          {q.question_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 border-l-2 border-slate-800">
                        {q.options?.map((opt: any) => (
                          <div
                            key={opt.id}
                            className={`text-xs p-2 rounded-lg border ${
                              opt.is_correct
                                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-medium'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <b className="mr-1.5">[{opt.option_key}]</b> {opt.option_text}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="text-xs text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                          <b className="text-indigo-300">Explanation:</b> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                Select a quiz from the left panel to inspect questions and export formats.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
