import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Brain, LogOut, Shield, LayoutDashboard, FileText, Sparkles, BarChart2, BookOpen,
  TrendingUp, UploadCloud, Users, Gamepad2, UserPlus
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-400' },
    { to: '/upload', label: 'Upload Document', icon: UploadCloud, color: 'text-purple-400' },
    { to: '/quizzes', label: 'Quiz Library', icon: BookOpen, color: 'text-sky-400' },
    { to: '/gcr', label: 'Google Classroom (GCR)', icon: BookOpen, color: 'text-sky-400', badge: 'GCR API' },
    { to: '/live', label: 'Live Battle', icon: Gamepad2, color: 'text-purple-400', badge: 'Live' },
    { to: '/question-bank', label: 'Question Bank', icon: FileText, color: 'text-sky-400', badge: 'Export' },
    { to: '/flashcards', label: 'Flashcards', icon: Sparkles, color: 'text-amber-400' },
    { to: '/classrooms', label: 'Classrooms LMS', icon: Users, color: 'text-emerald-400' },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp, color: 'text-teal-400' },
    { to: '/register', label: 'Register Account', icon: UserPlus, color: 'text-indigo-400' },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight gradient-text">QAMaster AI</span>
            <span className="block text-[10px] uppercase tracking-widest text-indigo-400 font-semibold -mt-1">Enterprise Platform</span>
          </div>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            {/* Desktop Admin Link */}
            {user?.role === 'Admin' && (
              <Link to="/admin/users" className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 hover:bg-indigo-900/60 flex items-center gap-1.5 transition-colors">
                <Shield className="w-3.5 h-3.5 text-indigo-400" /> Admin LMS
              </Link>
            )}

            {/* Profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-200">{user?.full_name || user?.username}</div>
                <div className="text-[10px] text-indigo-400 font-mono flex items-center justify-end gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {user?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="gradient-btn px-4 py-2 rounded-xl text-xs font-bold">
              Get Started
            </Link>
          </div>
        )}
      </div>

      {/* Universal Scrollable Tool Ribbon Bar (Visible on ALL Devices) */}
      {isAuthenticated && (
        <div className="border-t border-slate-800/60 bg-slate-950/60 px-4 py-2 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-2 min-w-max">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : link.color}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                      active ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {user?.role === 'Admin' && (
              <Link
                to="/admin/users"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                  isActive('/admin/users')
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin LMS</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
