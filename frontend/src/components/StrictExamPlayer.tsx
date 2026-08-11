import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, AlertTriangle, Lock, CheckCircle, ArrowRight } from 'lucide-react';

interface StrictExamPlayerProps {
  quiz: any;
  onComplete: (answers: Record<string, string[]>) => void;
}

export const StrictExamPlayer: React.FC<StrictExamPlayerProps> = ({ quiz, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState((quiz.time_limit_minutes || 15) * 60);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Anti-Cheat: Track window visibility / tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const nextCount = prev + 1;
          setShowWarning(true);
          if (nextCount >= 3) {
            alert("⚠️ Exam auto-submitted due to multiple tab-switch violations!");
            onComplete(answers);
          }
          return nextCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [answers, onComplete]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      alert("⏰ Time is up! Exam auto-submitted.");
      onComplete(answers);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, answers, onComplete]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSelectOption = (questionId: string, optionKey: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: [optionKey]
    }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = quiz.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col justify-between select-none">
      {/* Top Proctoring Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded-full uppercase">
                Strict Exam Proctoring Active
              </span>
              {!isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> Enable Fullscreen
                </button>
              )}
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">{quiz.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Tab Switch Counter */}
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Tab Violations</span>
            <div className={`text-sm font-bold ${tabSwitchCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {tabSwitchCount} / 3 Max
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="bg-slate-950 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 font-mono text-lg text-amber-400">
            <Clock className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Tab Switch Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-600/80 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-white">Proctoring Warning: Tab Switch Detected</h3>
            <p className="text-slate-300 text-sm">
              Navigating away from the exam window violates strict proctoring rules. You have used <b className="text-rose-400">{tabSwitchCount} of 3</b> allowed warnings before automated exam termination.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition"
            >
              I Understand & Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* Question Card */}
      {currentQ && (
        <div className="max-w-3xl mx-auto w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-4">
              <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
              <span>Points: {currentQ.points}</span>
            </div>
            <h3 className="text-xl font-semibold text-white leading-relaxed mb-6">
              {currentQ.stem}
            </h3>

            {/* Options list */}
            <div className="space-y-3">
              {currentQ.options?.map((opt: any) => {
                const isSelected = (answers[currentQ.id] || []).includes(opt.option_key);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.id, opt.option_key)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {opt.option_key}
                      </span>
                      <span>{opt.option_text}</span>
                    </span>
                    {isSelected && <CheckCircle className="w-5 h-5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-6 mt-8">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 px-5 py-2.5 rounded-xl font-medium text-sm transition"
            >
              Previous
            </button>

            {currentQuestionIndex + 1 < quiz.questions.length ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition shadow-lg shadow-indigo-600/30"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onComplete(answers)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/30"
              >
                Submit Exam Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
