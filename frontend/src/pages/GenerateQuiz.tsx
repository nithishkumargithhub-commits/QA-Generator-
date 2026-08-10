import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, CheckSquare, FileSearch, Wand2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { UploadedFile } from '../types';
import { useQuizStore } from '../store/useQuizStore';

export const GenerateQuizPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const docIdParam = searchParams.get('docId') || '';

  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(docIdParam);
  const [customText, setCustomText] = useState('');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [passingScore, setPassingScore] = useState(70);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode: 'generate' = AI creates questions, 'extract' = convert existing MCQs from PDF
  const [quizMode, setQuizMode] = useState<'generate' | 'extract'>('generate');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'true_false', 'fill_blank', 'scenario']);

  const { startQuiz } = useQuizStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDocs() {
      try {
        const docs = await api.getDocuments();
        setDocuments(docs);
        if (!selectedDocId && docs.length > 0) {
          setSelectedDocId(docs[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchDocs();
  }, []);

  const toggleType = (t: string) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter((x) => x !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      let quiz = await api.generateQuiz({
        document_id: selectedDocId || undefined,
        custom_text: customText || undefined,
        title: title || undefined,
        difficulty,
        question_count: questionCount,
        question_types: selectedTypes,
        time_limit_minutes: timeLimit,
        passing_score: passingScore,
        mode: quizMode === 'extract' ? 'extract' : 'Standard',
      });

      // Poll quiz until background worker finishes populating questions
      let attempts = 0;
      while ((!quiz.questions || quiz.questions.length === 0) && attempts < 20) {
        await new Promise((res) => setTimeout(res, 1000));
        attempts++;
        try {
          const updated = await api.getQuiz(quiz.id);
          if (updated && updated.questions && updated.questions.length > 0) {
            quiz = updated;
            break;
          }
        } catch (e) {
          break;
        }
      }

      await startQuiz(quiz);
      navigate(`/quiz/${quiz.id}`);
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please try again.');
    } finally {
      setGenerating(false);
    }

  };

  const isExtract = quizMode === 'extract';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider">
          {isExtract ? <FileSearch className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {isExtract ? 'PDF Question Converter' : 'AI Quiz Generator'}
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">
          {isExtract ? 'Convert PDF Questions' : 'Configure AI Assessment'}
        </h1>
        <p className="text-slate-400 text-sm">
          {isExtract
            ? 'Extract existing MCQ questions directly from your PDF — no AI generation needed.'
            : "Fine-tune difficulty, Bloom's taxonomy parameters, question types, and counts."}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setQuizMode('generate')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
            !isExtract
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!isExtract ? 'bg-indigo-600' : 'bg-slate-800'}`}>
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">Generate New</div>
            <div className="text-xs opacity-70">AI creates questions from content</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setQuizMode('extract')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
            isExtract
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isExtract ? 'bg-emerald-600' : 'bg-slate-800'}`}>
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">Convert PDF</div>
            <div className="text-xs opacity-70">Extract existing MCQs from PDF</div>
          </div>
        </button>
      </div>

      {/* Info banner for extract mode */}
      {isExtract && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">How Convert Mode Works</div>
            <ul className="text-xs space-y-1 opacity-80 list-disc ml-4">
              <li>Select your uploaded PDF that already has MCQ questions</li>
              <li>Questions must be numbered (1. 2. 3. …) with A / B / C / D options</li>
              <li>An answer key at the end (e.g. <code className="bg-emerald-900/40 px-1 rounded">1-A, 2-C</code>) will be used to mark correct answers</li>
              <li>All questions are extracted as-is — nothing is AI-generated</li>
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Source Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
            {isExtract ? 'PDF to Convert' : 'Knowledge Source'}
          </label>
          {documents.length > 0 ? (
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Use Custom Text Prompt --</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename} ({doc.chapter_count} chapters, {doc.topic_count} topics)
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-amber-400 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              No uploaded documents found.{' '}
              <a href="/upload" className="underline font-semibold">Upload a PDF first →</a>
            </p>
          )}

          {!selectedDocId && !isExtract && (
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              placeholder="Paste custom study notes, chapter content, or subject material..."
              className="w-full mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
            />
          )}
        </div>

        {/* Quiz Title */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
            Assessment Title (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isExtract ? 'e.g. Chapter 5 MCQ Quiz' : 'e.g. Midterm Computer Networks Assessment'}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* AI-only settings — hidden in extract mode */}
        {!isExtract && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Target Difficulty</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Easy', 'Medium', 'Hard', 'Expert'].map((d) => (
                    <button
                      key={d} type="button" onClick={() => setDifficulty(d)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-colors ${
                        difficulty === d
                          ? 'bg-indigo-600 text-white border border-indigo-400 shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Question Count</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {[5, 10, 15, 20, 25, 50, 100].map((num) => (
                    <option key={num} value={num}>{num} Questions</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Question Format Types</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'mcq', label: 'Multiple Choice' },
                  { id: 'true_false', label: 'True / False' },
                  { id: 'fill_blank', label: 'Fill in Blank' },
                  { id: 'assertion_reason', label: 'Assertion-Reason' },
                  { id: 'multiselect', label: 'Multi-Select' },
                  { id: 'scenario', label: 'Scenario-Based' },
                ].map((item) => {
                  const active = selectedTypes.includes(item.id);
                  return (
                    <button
                      key={item.id} type="button" onClick={() => toggleType(item.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-purple-600/30 border border-purple-500 text-purple-300'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckSquare className={`w-3.5 h-3.5 ${active ? 'text-purple-400' : 'text-slate-600'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Timer & Passing Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Time Limit (Minutes)</label>
            <input
              type="number" value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              min={5} max={180}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Passing Score (%)</label>
            <input
              type="number" value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              min={40} max={100}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit" disabled={generating}
          className={`w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 mt-4 transition-all ${
            isExtract
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
              : 'gradient-btn shadow-indigo-500/25'
          }`}
        >
          {generating ? (
            <><Loader2 className="w-5 h-5 animate-spin" />{isExtract ? 'Extracting Questions...' : 'Synthesizing AI Questions...'}</>
          ) : (
            <>{isExtract ? <FileSearch className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              {isExtract ? 'Convert PDF & Start Quiz' : 'Generate Assessment & Start Quiz'}
            </>
          )}
        </button>
      </form>
    </div>
  );
};
