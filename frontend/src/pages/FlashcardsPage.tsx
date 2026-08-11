import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCw, CheckCircle, Clock, Zap, BookOpen, ChevronRight, Layers } from 'lucide-react';
import { api } from '../services/api';

export const FlashcardsPage: React.FC = () => {
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cards, docs] = await Promise.all([
        api.getDueFlashcards(),
        api.getDocuments()
      ]);
      setDueCards(cards);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setGenerating(true);
    try {
      const newCards = await api.generateFlashcards(selectedDoc);
      setDueCards(prev => [...prev, ...newCards]);
      alert(`Successfully generated ${newCards.length} flashcards from document!`);
    } catch (err: any) {
      alert(`Generation error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleRating = async (rating: number) => {
    const currentCard = dueCards[currentIndex];
    if (!currentCard) return;

    try {
      await api.reviewFlashcard(currentCard.id, rating);
      setIsFlipped(false);
      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setDueCards([]);
        setCurrentIndex(0);
      }
    } catch (err: any) {
      alert(`Review error: ${err.message}`);
    }
  };

  const currentCard = dueCards[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>SUPERMEMO SM-2 ENGINE</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">AI Flashcards & Spaced Repetition</h1>
            <p className="text-slate-400 text-sm mt-1">Master core concepts with automated review scheduling.</p>
          </div>

          {/* Quick Generator dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
            <select
              value={selectedDoc}
              onChange={e => setSelectedDoc(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">Select Document to Generate Flashcards</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedDoc}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Extracting...' : 'Generate Deck'}
            </button>
          </div>
        </div>

        {/* Card Arena */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading flashcards deck...</div>
        ) : dueCards.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">All Due Cards Reviewed!</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              Great job! You are up to date on your reviews for today. Select a document above to generate a new flashcard deck.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <span className="flex items-center gap-1">
                <Layers className="w-4 h-4 text-indigo-400" />
                Card {currentIndex + 1} of {dueCards.length}
              </span>
              <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full font-mono text-indigo-300">
                Topic: {currentCard.category}
              </span>
            </div>

            {/* 3D Flip Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative w-full h-80 cursor-pointer group perspective"
            >
              <div
                className={`w-full h-full rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-8 shadow-2xl flex flex-col justify-between transition-transform duration-500 transform-gpu ${
                  isFlipped ? 'rotate-y-180 bg-indigo-950/40 border-indigo-500/50' : 'hover:border-slate-500'
                }`}
              >
                {!isFlipped ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-400 font-mono">
                      <span>FRONT (QUESTION / TERM)</span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <RotateCw className="w-3.5 h-3.5" /> Click to reveal answer
                      </span>
                    </div>
                    <div className="text-2xl font-semibold text-white text-center my-auto px-4">
                      {currentCard.front_text}
                    </div>
                    <div className="text-xs text-slate-500 text-center">Tap card or spacebar to flip</div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-indigo-400 font-mono">
                      <span>BACK (ANSWER / EXPLANATION)</span>
                      <span className="text-slate-400">Interval: {currentCard.interval_days}d</span>
                    </div>
                    <div className="text-xl text-indigo-100 text-center my-auto px-4 leading-relaxed font-sans">
                      {currentCard.back_text}
                    </div>
                    <div className="text-xs text-slate-500 text-center">Rate difficulty below to schedule next review</div>
                  </>
                )}
              </div>
            </div>

            {/* SRS Rating Buttons */}
            {isFlipped ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-300">
                <button
                  onClick={() => handleRating(1)}
                  className="bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-0.5 transition"
                >
                  <span className="font-bold">Again</span>
                  <span className="text-[10px] text-rose-400">&lt; 1 min</span>
                </button>
                <button
                  onClick={() => handleRating(2)}
                  className="bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 text-amber-300 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-0.5 transition"
                >
                  <span className="font-bold">Hard</span>
                  <span className="text-[10px] text-amber-400">1 day</span>
                </button>
                <button
                  onClick={() => handleRating(3)}
                  className="bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-0.5 transition"
                >
                  <span className="font-bold">Good</span>
                  <span className="text-[10px] text-emerald-400">3 days</span>
                </button>
                <button
                  onClick={() => handleRating(4)}
                  className="bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-300 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-0.5 transition"
                >
                  <span className="font-bold">Easy</span>
                  <span className="text-[10px] text-indigo-400">7 days</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-semibold text-sm transition"
              >
                Show Answer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
