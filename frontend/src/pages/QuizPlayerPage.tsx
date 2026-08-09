import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCircle2, XCircle, Bookmark, HelpCircle, ArrowRight, ArrowLeft,
  BookOpen, Sparkles, Send, CheckSquare, Award, AlertCircle, FileEdit
} from 'lucide-react';
import { useQuizStore } from '../store/useQuizStore';

export const QuizPlayerPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const {
    currentQuiz,
    currentSession,
    currentIndex,
    selectedAnswers,
    questionFeedback,
    bookmarks,
    notes,
    selectOption,
    submitCurrentAnswer,
    nextQuestion,
    prevQuestion,
    toggleBookmark,
    setNote,
    completeQuiz,
    isLoading,
  } = useQuizStore();

  const [questionTimer, setQuestionTimer] = useState(60);
  const [showNotes, setShowNotes] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const question = currentQuiz?.questions?.[currentIndex];
  const feedback = question?.id ? questionFeedback[question.id] : null;
  const currentSelected = question?.id ? selectedAnswers[question.id] || [] : [];
  const isBookmarked = question?.id ? !!bookmarks[question.id] : false;

  // Question Timer Countdown
  useEffect(() => {
    setQuestionTimer(60);
    const interval = setInterval(() => {
      setQuestionTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  // Keyboard Shortcuts Listener (1-4 / A-D, Enter, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!question || feedback) return;

      const keys: Record<string, string> = {
        '1': 'A', '2': 'B', '3': 'C', '4': 'D',
        'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
      };
      if (keys[e.key.toLowerCase()]) {
        selectOption(question.id!, keys[e.key.toLowerCase()], question.question_type === 'multiselect');
      } else if (e.key === 'Enter' && currentSelected.length > 0) {
        handleAnswerSubmit();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleBookmark(question.id!);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, feedback, currentSelected]);

  if (!currentQuiz || !question) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Sparkles className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-100">Loading Assessment Session...</h2>
        <button onClick={() => navigate('/dashboard')} className="gradient-btn px-6 py-2.5 rounded-xl text-sm font-bold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleAnswerSubmit = async () => {
    if (!question.id || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      await submitCurrentAnswer();
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleFinish = async () => {
    const completed = await completeQuiz();
    if (completed) {
      navigate(`/quiz-results/${completed.id}`);
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / (currentQuiz.questions?.length || 1)) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-extrabold uppercase">
            Question {currentIndex + 1} / {currentQuiz.questions?.length}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
            {question.topic_name}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase">
            {question.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-950/30 border border-amber-500/30 px-3 py-1.5 rounded-xl">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>00:{questionTimer < 10 ? `0${questionTimer}` : questionTimer}</span>
          </div>

          <button
            onClick={() => question.id && toggleBookmark(question.id)}
            className={`p-2 rounded-xl border transition-colors ${
              isBookmarked
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Flag/Bookmark Question (Key 'F')"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Question Scratchpad Notes"
          >
            <FileEdit className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Main Question Card */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6 relative overflow-hidden">
        {/* Bloom's taxonomy pill */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-purple-400">Bloom's Level: {question.bloom_taxonomy}</span>
          <span className="text-slate-500 text-[11px]">Keyboard Shortcuts: 1-4 to Select, Enter to Submit</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug">
          {question.stem}
        </h2>

        {/* Question Options Grid */}
        <div className="space-y-3 pt-2">
          {question.options.map((opt) => {
            const isSelected = currentSelected.includes(opt.option_key);
            const isCorrectAnswer = feedback && feedback.correct_options.includes(opt.option_key);
            const isWrongSelection = feedback && isSelected && !feedback.is_correct;

            let borderStyle = 'border-slate-800 bg-slate-950/80 hover:border-indigo-500/50 text-slate-200';
            if (feedback) {
              if (isCorrectAnswer) {
                borderStyle = 'border-emerald-500 bg-emerald-950/30 text-emerald-200 font-semibold';
              } else if (isWrongSelection) {
                borderStyle = 'border-red-500 bg-red-950/30 text-red-200';
              }
            } else if (isSelected) {
              borderStyle = 'border-indigo-500 bg-indigo-950/50 text-white font-semibold ring-2 ring-indigo-500/30';
            }

            return (
              <button
                key={opt.option_key}
                onClick={() => !feedback && question.id && selectOption(question.id, opt.option_key, question.question_type === 'multiselect')}
                disabled={!!feedback}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition-all duration-150 ${borderStyle}`}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
                }`}>
                  {opt.option_key}
                </span>
                <span className="text-sm pt-1 leading-relaxed flex-1">{opt.option_text}</span>
              </button>
            );
          })}
        </div>

        {/* Submit Answer Button */}
        {!feedback && (
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleAnswerSubmit}
              disabled={currentSelected.length === 0 || submittingAnswer}
              className="gradient-btn px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-40"
            >
              <Send className="w-4 h-4" /> Submit Answer (Enter)
            </button>
          </div>
        )}

        {/* Instant Feedback Overlay (Sub-100ms Response) */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-6 rounded-2xl border mt-6 ${
                feedback.is_correct
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                  : 'bg-red-950/40 border-red-500/50 text-red-100'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {feedback.is_correct ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <h4 className="text-lg font-bold">
                  {feedback.is_correct ? 'Correct Answer!' : 'Incorrect'}
                </h4>
                <span className="ml-auto text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800">
                  Topic Mastery: {feedback.topic_mastery}%
                </span>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed mb-3 opacity-90">
                {feedback.explanation}
              </p>

              {!feedback.is_correct && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-red-500/20 text-xs text-slate-300 flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Revision Focus:</strong> {feedback.revision_concept}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scratchpad Notes Drawer */}
        {showNotes && (
          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Scratchpad & Question Notes</label>
            <textarea
              value={question.id ? notes[question.id] || '' : ''}
              onChange={(e) => question.id && setNote(question.id, e.target.value)}
              rows={2}
              placeholder="Jot down notes or calculations for this question..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold hover:text-white disabled:opacity-40 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        {currentIndex < (currentQuiz.questions?.length || 1) - 1 ? (
          <button
            onClick={nextQuestion}
            className="gradient-btn px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={isLoading}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            <Award className="w-4 h-4" /> Finish Assessment
          </button>
        )}
      </div>
    </div>
  );
};
