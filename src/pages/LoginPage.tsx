import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  UserPlus,
  LogIn,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { UserSession } from '../types.js';
import { setAuthToken } from '../lib/api.js';

interface LoginPageProps {
  onLoginSuccess: (userData: UserSession) => void;
  onExploreAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onExploreAsGuest }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setUsername('');
    setDisplayName('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please fill in all required fields');
      return;
    }

    if (mode === 'register') {
      if (trimmedUser.length < 2) {
        setError('Username must be at least 2 characters long');
        return;
      }
      if (trimmedPass.length < 3) {
        setError('Password must be at least 3 characters long');
        return;
      }
      if (trimmedPass !== confirmPassword.trim()) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/register' : '/api/login';
      const payload: any = {
        username: trimmedUser,
        password: trimmedPass,
      };

      if (mode === 'register' && displayName.trim()) {
        payload.displayName = displayName.trim();
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || `${mode === 'register' ? 'Registration' : 'Authentication'} failed.`);
        setLoading(false);
        return;
      }

      if (data.token) {
        setAuthToken(data.token);
      }

      if (mode === 'register') {
        setSuccessMsg('Account created successfully! Logging you in...');
      }

      setTimeout(() => {
        onLoginSuccess(data.user);
      }, mode === 'register' ? 400 : 0);
    } catch (err: any) {
      console.error('Auth error:', err);
      setError('Unable to connect to authentication service. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div
      id="login-page-container"
      className="min-h-screen w-full flex flex-col justify-between bg-[#020617] text-slate-100 p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Background glow aesthetics */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="flex-1 flex items-center justify-center my-auto py-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
          {/* Header branding */}
          <div className="text-center mb-6">
            <h1 id="login-brand-title" className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
              <span className="text-slate-100">Ms</span>
              <span className="text-blue-500 ml-1 drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]">Wave</span>
            </h1>
            <p id="login-brand-creator" className="text-sm font-semibold text-blue-400 tracking-wide">
              Created by Mrinmoy Saikia.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Source AI & Metasearch Portal</span>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 mb-6 rounded-2xl bg-slate-950/80 border border-slate-800">
            <button
              type="button"
              id="tab-login-mode"
              onClick={() => handleModeSwitch('login')}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              id="tab-register-mode"
              onClick={() => handleModeSwitch('register')}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {mode === 'register' ? 'Choose Username / ID *' : 'User ID / Username'}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-login-id"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'register' ? 'e.g. alex_researcher' : 'Enter User ID'}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Display Name Field (for registration) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Display Name (Optional)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <input
                    id="input-register-displayname"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {mode === 'register' ? 'Create Password *' : 'Security Password'}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min 3 characters' : 'Enter Password'}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-11 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  id="btn-toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (for registration) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-register-confirmpassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'register' ? 'Register Account' : 'Sign In to Ms Wave'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {onExploreAsGuest && (
              <button
                id="btn-explore-guest"
                type="button"
                onClick={onExploreAsGuest}
                className="w-full mt-2.5 py-2.5 px-4 bg-slate-950/60 hover:bg-slate-800/80 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Search directly as Guest</span>
              </button>
            )}
          </form>

          {/* Account mode footer link */}
          {mode === 'login' ? (
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className="text-blue-400 hover:underline font-semibold"
              >
                Create an account
              </button>
            </div>
          ) : (
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
              <span>Already registered? </span>
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className="text-blue-400 hover:underline font-semibold"
              >
                Sign In here
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="text-center text-xs text-slate-400 py-2">
        <p>Ms Wave • Multi-Source AI Metasearch Engine • Designed by Mrinmoy Saikia</p>
      </footer>
    </div>
  );
};
