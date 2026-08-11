import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, BookOpen, Lightbulb, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface AskDocTutorProps {
  documentId?: string;
  questionStem?: string;
  selectedOption?: string;
}

export const AskDocTutor: React.FC<AskDocTutorProps> = ({
  documentId,
  questionStem,
  selectedOption
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Hi! I am your AI Study Assistant. Highlight any question or ask me for step-by-step breakdowns, real-world analogies, or why a choice is correct/incorrect!'
    }
  ]);

  const handleAsk = async (customText?: string) => {
    const qText = customText || query;
    if (!qText.trim() || loading) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: qText }]);
    if (!customText) setQuery('');
    setLoading(true);

    try {
      const res = await api.askTutor({
        document_id: documentId,
        question_stem: questionStem,
        selected_option: selectedOption,
        user_query: qText
      });

      setChatHistory(prev => [...prev, { sender: 'bot', text: res.answer }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { sender: 'bot', text: `Sorry, I ran into an issue: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-full shadow-xl transition-all duration-300 hover:scale-105 group font-medium"
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span>Ask AI Tutor</span>
          <Sparkles className="w-4 h-4 text-amber-300" />
        </button>
      )}

      {isOpen && (
        <div className="bg-slate-900 border border-slate-700 w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Document Tutor</h3>
                <p className="text-xs text-slate-400">RAG-Powered Study Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preset Chips */}
          <div className="bg-slate-800/40 px-3 py-2 border-b border-slate-750 flex gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => handleAsk("Explain this question step-by-step")}
              className="flex items-center gap-1 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-2 py-1 rounded-md shrink-0 transition"
            >
              <BookOpen className="w-3 h-3" /> Step-by-Step
            </button>
            <button
              onClick={() => handleAsk("Give me a real-world analogy for this concept")}
              className="flex items-center gap-1 bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 border border-amber-700/50 px-2 py-1 rounded-md shrink-0 transition"
            >
              <Lightbulb className="w-3 h-3" /> Analogy
            </button>
            <button
              onClick={() => handleAsk("Why is the selected option right or wrong?")}
              className="flex items-center gap-1 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-2 py-1 rounded-md shrink-0 transition"
            >
              <CheckCircle2 className="w-3 h-3" /> Choice Logic
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-sm">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl rounded-bl-none px-4 py-2 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                  AI Tutor is analyzing context...
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder="Ask anything about this document..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleAsk()}
              disabled={loading || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
