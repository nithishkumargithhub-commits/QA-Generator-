import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, LogOut, User as UserIcon, Shield, LayoutDashboard, FileText, Sparkles, BarChart2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800/60 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight gradient-text">QAMaster AI</span>
            <span className="block text-[10px] uppercase tracking-widest text-indigo-400 font-semibold -mt-1">Enterprise Platform</span>
          </div>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-1">
              <Link to="/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors">
                <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Dashboard
              </Link>
              <Link to="/flashcards" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors">
                <Sparkles className="w-4 h-4 text-amber-400" /> Flashcards
              </Link>
              <Link to="/question-bank" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors">
                <FileText className="w-4 h-4 text-sky-400" /> Question Bank
              </Link>
              <Link to="/classrooms" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> Classrooms
              </Link>
              <Link to="/live" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors">
                <Sparkles className="w-4 h-4 text-purple-400" /> Live Battle
              </Link>
              {user?.role === 'Admin' && (
                <Link to="/admin" className="px-3 py-2 rounded-lg text-sm font-medium text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 hover:bg-indigo-900/40 flex items-center gap-2 transition-colors">
                  <Shield className="w-4 h-4 text-indigo-400" /> Admin LMS
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-200">{user?.full_name || user?.username}</div>
                <div className="text-xs text-indigo-400 font-mono flex items-center justify-end gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {user?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="gradient-btn px-4 py-2 rounded-xl text-sm font-semibold">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
