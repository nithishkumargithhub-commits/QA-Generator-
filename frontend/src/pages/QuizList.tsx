import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Sparkles, Filter, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Quiz } from '../types';
import { useQuizStore } from '../store/useQuizStore';

import { useAuthStore } from '../store/useAuthStore';

export const QuizListPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [myOnlyFilter, setMyOnlyFilter] = useState(false);
  const { user } = useAuthStore();
  const { startQuiz } = useQuizStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const data = await api.getQuizzes(
          difficultyFilter || undefined,
          modeFilter || undefined,
          user?.role === 'Admin' ? myOnlyFilter : true
        );
        setQuizzes(data);
      } catch (e) {
        console.error(e);
      }
    }
    loadQuizzes();
  }, [difficultyFilter, modeFilter, myOnlyFilter, user?.role]);

  const handleStart = async (quiz: Quiz) => {
    await startQuiz(quiz);
    navigate(`/quiz/${quiz.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Assessment Library</h1>
          <p className="text-slate-400 text-sm">Browse active AI assessments and practice modules.</p>
        </div>
        <Link to="/upload" className="gradient-btn px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Create AI Quiz
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase">
            <Filter className="w-4 h-4 text-indigo-400" /> Filters:
          </div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Expert">Expert</option>
          </select>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Modes</option>
            <option value="Standard">Standard Mode</option>
            <option value="Timed">Timed Mode</option>
            <option value="Practice">Practice Mode</option>
            <option value="Revision">Revision Mode</option>
            <option value="Adaptive">Adaptive Mode</option>
          </select>
        </div>

        {user?.role === 'Admin' && (
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMyOnlyFilter(false)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                !myOnlyFilter ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All System Quizzes
            </button>
            <button
              type="button"
              onClick={() => setMyOnlyFilter(true)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                myOnlyFilter ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Created Quizzes
            </button>
          </div>
        )}
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {quiz.difficulty_level}
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> {quiz.time_limit_minutes}m
                </span>
              </div>
              <h3 className="font-bold text-slate-100 line-clamp-1">{quiz.title}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{quiz.description}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">{quiz.question_count} Questions</span>
              <button
                onClick={() => handleStart(quiz)}
                className="gradient-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
              >
                <Play className="w-3.5 h-3.5" /> Start Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
