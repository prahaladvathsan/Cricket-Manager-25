/**
 * @file AuthSection.jsx
 * @description Auth status section for LoadGame page
 * Shows login status and provides sign in/out buttons
 */

import React from 'react';
import { User, LogOut, Cloud, CloudOff, Loader2 } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { isSupabaseConfigured } from '../../utils/supabaseClient';

/**
 * Google icon SVG component (smaller version)
 */
const GoogleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const AuthSection = ({ onSignInClick }) => {
  const { user, isAnonymous, isLoading, signOut, signInWithGoogle } = useAuthStore();
  const supabaseConfigured = isSupabaseConfigured();

  // If Supabase is not configured, show offline mode indicator
  if (!supabaseConfigured) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border border-gray-600/50 rounded-lg mb-4">
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-sm text-cricket-text-secondary">Offline Mode</p>
            <p className="text-xs text-cricket-text-secondary/70">Saves stored locally only</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-4 py-3 bg-black/40 border border-gray-600/50 rounded-lg mb-4">
        <Loader2 className="w-5 h-5 text-cricket-accent animate-spin mr-2" />
        <span className="text-sm text-cricket-text-secondary">Checking auth status...</span>
      </div>
    );
  }

  // Logged in state
  if (!isAnonymous && user) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border border-green-600/30 rounded-lg mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cricket-accent/20 flex items-center justify-center">
            <User className="w-4 h-4 text-cricket-accent" />
          </div>
          <div>
            <p className="text-sm text-cricket-text-primary font-medium">{user.email}</p>
            <div className="flex items-center gap-1 text-xs text-green-400">
              <Cloud className="w-3 h-3" />
              <span>Cloud saves enabled</span>
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-cricket-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    );
  }

  // Anonymous state
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-black/40 border border-gray-600/50 rounded-lg mb-4">
      <div className="flex items-center gap-3">
        <CloudOff className="w-5 h-5 text-cricket-text-secondary" />
        <div>
          <p className="text-sm text-cricket-text-secondary">Not signed in</p>
          <p className="text-xs text-cricket-text-secondary/70">Sign in to enable cloud saves</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-sm font-medium rounded transition-colors"
        >
          <GoogleIcon />
          <span>Google</span>
        </button>
        <button
          onClick={onSignInClick}
          className="px-3 py-1.5 text-sm text-cricket-accent hover:bg-cricket-accent/10 rounded transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default AuthSection;
