import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage.js';
import { SearchPage } from './pages/SearchPage.js';
import { UserSession } from './types.js';
import { apiFetch, clearAuthToken } from './lib/api.js';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check active session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiFetch('/api/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setSession({
              userId: data.user.userId,
              username: data.user.username,
              displayName: data.user.displayName,
              authenticated: true,
              loginAt: data.user.loginAt,
              createdAt: data.user.createdAt,
              searchCount: data.user.searchCount,
            });
          } else {
            setSession(null);
          }
        }
      } catch {
        setSession(null);
      } finally {
        setCheckingSession(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (userData: UserSession) => {
    setSession({
      ...userData,
      authenticated: true,
      loginAt: Date.now(),
    });
    setGuestMode(false);
    setShowLoginModal(false);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      setSession(null);
      setGuestMode(true);
    }
  };

  const handleProfileUpdated = (updatedSession: UserSession) => {
    setSession(updatedSession);
  };

  // Initial loading splash screen
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-slate-100">Ms</span>
            <span className="text-blue-500 ml-1">Wave</span>
          </h1>
          <p className="text-xs font-semibold text-blue-400">Created by Mrinmoy Saikia.</p>
          <div className="mt-4 w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // If not authenticated and not in guest mode, render Login Page with option to explore
  if (!session?.authenticated && !guestMode) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onExploreAsGuest={() => setGuestMode(true)}
      />
    );
  }

  // If authenticated or guest, render Search Page
  return (
    <>
      <SearchPage
        session={session}
        onLogout={handleLogout}
        onProfileUpdated={handleProfileUpdated}
        onOpenLogin={() => {
          setGuestMode(false);
          setShowLoginModal(true);
        }}
      />
      {showLoginModal && !session?.authenticated && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/80 text-sm w-7 h-7 flex items-center justify-center"
            >
              ✕
            </button>
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onExploreAsGuest={() => setShowLoginModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
