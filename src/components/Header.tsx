import React from 'react';
import { LogOut, User, Activity, Clock, Settings, Sparkles, LogIn } from 'lucide-react';
import { UserSession } from '../types.js';

interface HeaderProps {
  session: UserSession | null;
  onLogout: () => void;
  onResetSearch?: () => void;
  compact?: boolean;
  onOpenDiagnostics?: () => void;
  onOpenHistory?: () => void;
  onOpenAccount?: () => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  onResetSearch,
  compact = false,
  onOpenDiagnostics,
  onOpenHistory,
  onOpenAccount,
  onOpenLogin,
}) => {
  return (
    <header
      id="ms-wave-header"
      className={`w-full transition-all duration-300 ${
        compact
          ? 'py-3 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30'
          : 'pt-8 pb-6 px-4'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-4">
        {/* Top Bar with brand & actions */}
        <div className="w-full flex items-center justify-between">
          <div
            id="brand-clickable"
            onClick={onResetSearch}
            className={`cursor-pointer flex flex-col select-none transition-transform active:scale-95 ${
              compact ? 'items-start' : 'items-center mx-auto text-center'
            }`}
          >
            <h1
              id="ms-wave-title"
              className={`font-extrabold tracking-tight flex items-center ${
                compact ? 'text-2xl sm:text-3xl' : 'text-5xl sm:text-6xl md:text-7xl mb-1.5'
              }`}
            >
              <span className="text-slate-100">Ms</span>
              <span className="text-blue-500 ml-1.5 drop-shadow-[0_0_25px_rgba(59,130,246,0.35)]">Wave</span>
            </h1>
            <p
              id="ms-wave-creator"
              className={`font-semibold tracking-wide text-blue-400/90 ${
                compact ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              Created by Mrinmoy Saikia.
            </p>
          </div>

          {/* Right Action Icons (User, History, Status, Logout) */}
          <div
            id="header-user-actions"
            className={`flex items-center gap-2 sm:gap-2.5 ${
              compact ? 'ml-auto' : 'absolute right-4 top-6 sm:right-8 sm:top-8'
            }`}
          >
            {/* Search History Button */}
            {onOpenHistory && session?.authenticated && (
              <button
                id="btn-history-header"
                onClick={onOpenHistory}
                title="View Private Search History"
                className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:border-slate-700 shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">History</span>
              </button>
            )}

            {/* Engine Health / Diagnostics */}
            {onOpenDiagnostics && (
              <button
                id="btn-diagnostics-header"
                onClick={onOpenDiagnostics}
                title="Search Provider Diagnostics & Cache Health"
                className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer hover:border-slate-700 shadow-sm"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Engine Health</span>
              </button>
            )}

            {/* User Profile & Account Button */}
            {session?.authenticated ? (
              <div
                id="user-badge"
                className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm text-slate-200 shadow-sm"
              >
                <button
                  id="btn-account-header"
                  onClick={onOpenAccount}
                  title="Account and Security Settings"
                  className="flex items-center gap-2 hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium max-w-[120px] truncate hidden sm:inline">
                    {session.displayName || session.username}
                  </span>
                </button>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title="Log out of Ms Wave"
                  className="ml-1 text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md hover:bg-slate-800 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              onOpenLogin && (
                <button
                  id="btn-signin-header"
                  onClick={onOpenLogin}
                  title="Sign In to Save History and Profile"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-600/20"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
