import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Sparkles, Shield, Zap, FileText, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full filter blur-3xl pointer-events-none"></div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-8">
          <Sparkles className="w-4 h-4 text-indigo-400" /> Enterprise-Grade AI QA & Assessment Engine
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight">
          Transform Raw Documents into <br />
          <span className="gradient-text">Adaptive AI Assessments</span> in Seconds
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Engineered for universities, enterprise platforms, and coaching centers. Upload PDFs, DOCX, PPTX, or scanned text and generate Bloom's-aligned questions with instant sub-100ms feedback and topic mastery analytics.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register" className="gradient-btn px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 shadow-xl shadow-indigo-500/25">
            Launch Platform Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/login" className="glass-panel px-8 py-4 rounded-2xl text-base font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60 border border-slate-800">
            Sign In with Demo Admin
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-3xl text-left border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Multi-Format OCR Engine</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Extract structured chapters, headings, tables, and text from PDF, DOCX, PPTX, TXT, and scanned images automatically.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl text-left border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Sub-100ms Instant Feedback</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time answer verification delivers explanations, topic mastery updates, and weak-concept revision tips instantly.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl text-left border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Adaptive Learning Analytics</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Dynamically prioritizes weak topics in subsequent quizzes, tracking accuracy trends, response speed, and Bloom's taxonomy performance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
