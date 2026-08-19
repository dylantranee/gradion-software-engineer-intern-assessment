import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Link } from '../router.js';
import { LogOut } from 'lucide-react';
import gradionLogo from '../assets/gradion-logo.png';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  // If not authenticated, do not render top navbar
  if (!isAuthenticated || !user) {
    return null;
  }

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-grad-border-2 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand with Official Gradion Logo */}
        <Link to="/projects" className="flex items-center gap-3 no-underline group">
          <img
            src={gradionLogo}
            alt="Gradion"
            className="h-8 object-contain group-hover:opacity-90 transition-opacity"
          />
        </Link>

        {/* User Actions */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full bg-grad-paper flex items-center justify-center font-bold text-xs text-grad-ink border border-grad-line/40"
            title={user.email}
          >
            {getInitials(user.name)}
          </div>
          <span className="text-sm font-semibold text-grad-ink hidden sm:inline-block">
            {user.name}
          </span>
          <button
            onClick={logout}
            className="p-1.5 text-grad-ink-3 hover:text-grad-ink rounded-r-2 hover:bg-grad-paper-2 transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
