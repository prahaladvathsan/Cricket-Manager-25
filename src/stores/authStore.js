/**
 * @file authStore.js
 * @description Authentication state management for cloud save functionality
 * Supports email/password and Google OAuth via Supabase
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

/**
 * @typedef {Object} AuthState
 * @property {Object|null} user - Current user object
 * @property {Object|null} session - Current session object
 * @property {boolean} isAnonymous - Whether user is anonymous (not logged in)
 * @property {boolean} isLoading - Whether auth state is loading
 * @property {string|null} error - Auth error message
 */

const useAuthStore = create(
  persist(
    (set, get) => ({
      // Auth State
      user: null,
      session: null,
      isAnonymous: true,
      isLoading: false,
      error: null,
      _initialized: false,

      /**
       * Initialize auth state listener
       * Called once on app load to listen for auth changes
       */
      initAuth: async () => {
        // Prevent multiple initializations
        if (get()._initialized) {
          console.log('🔐 Auth already initialized');
          return;
        }

        try {
          // Dynamically import supabaseClient to avoid circular dependencies
          // and to allow the app to work without Supabase configured
          const { supabase, isSupabaseConfigured } = await import('../utils/supabaseClient.js');

          if (!isSupabaseConfigured()) {
            console.log('⚠️ Supabase not configured - running in offline mode');
            set({ isLoading: false, isAnonymous: true, _initialized: true });
            return;
          }

          set({ isLoading: true, _initialized: true });

          // Set up auth state change listener FIRST
          // This ensures we catch the OAuth callback event
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event, session?.user?.email);
            set({
              user: session?.user ?? null,
              session: session,
              isAnonymous: !session?.user,
              isLoading: false,
              error: null
            });
          });

          // Then get current session (in case we already have one)
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Auth session error:', error);
            set({ isLoading: false, error: error.message });
            return;
          }

          // Set initial state if we have a session
          if (session) {
            console.log('🔐 Found existing session:', session.user?.email);
            set({
              user: session.user,
              session: session,
              isAnonymous: false,
              isLoading: false
            });
          } else {
            console.log('🔐 No existing session found');
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false, error: error.message });
        }
      },

      /**
       * Sign up with email and password
       * @param {string} email - User email
       * @param {string} password - User password
       * @returns {Promise<{success: boolean, error?: string}>}
       */
      signUp: async (email, password) => {
        try {
          const { supabase, isSupabaseConfigured } = await import('../utils/supabaseClient.js');

          if (!isSupabaseConfigured()) {
            return { success: false, error: 'Cloud saves not configured' };
          }

          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signUp({
            email,
            password
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true, data };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Sign in with email and password
       * @param {string} email - User email
       * @param {string} password - User password
       * @returns {Promise<{success: boolean, error?: string}>}
       */
      signIn: async (email, password) => {
        try {
          const { supabase, isSupabaseConfigured } = await import('../utils/supabaseClient.js');

          if (!isSupabaseConfigured()) {
            return { success: false, error: 'Cloud saves not configured' };
          }

          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true, data };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Sign in with Google OAuth
       * @returns {Promise<{success: boolean, error?: string}>}
       */
      signInWithGoogle: async () => {
        try {
          const { supabase, isSupabaseConfigured } = await import('../utils/supabaseClient.js');

          if (!isSupabaseConfigured()) {
            return { success: false, error: 'Cloud saves not configured' };
          }

          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/load-game`
            }
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          // OAuth redirects, so we don't set loading to false here
          return { success: true };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Sign out current user
       * @returns {Promise<{success: boolean, error?: string}>}
       */
      signOut: async () => {
        try {
          const { supabase, isSupabaseConfigured } = await import('../utils/supabaseClient.js');

          if (!isSupabaseConfigured()) {
            set({ user: null, session: null, isAnonymous: true });
            return { success: true };
          }

          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.signOut();

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          set({
            user: null,
            session: null,
            isAnonymous: true,
            isLoading: false
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Send password reset email
       * @param {string} email - User email
       * @returns {Promise<{success: boolean, error?: string}>}
       */
      resetPassword: async (email) => {
        try {
          const { supabase, isSupabaseConfigured } = await import('../utils/supabaseClient.js');

          if (!isSupabaseConfigured()) {
            return { success: false, error: 'Cloud saves not configured' };
          }

          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/load-game`
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Clear any auth errors
       */
      clearError: () => set({ error: null }),

      /**
       * Check if user is logged in (not anonymous)
       * @returns {boolean}
       */
      isLoggedIn: () => {
        const state = get();
        return !state.isAnonymous && !!state.user;
      }
    }),
    {
      name: 'cm25-auth-store',
      version: 1,
      storage: createJSONStorage(() => indexedDBStorage),
      // Only persist non-sensitive auth state
      partialize: (state) => ({
        // Don't persist session/user as they'll be refreshed from Supabase
        // Just persist some flags for UI state
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate authStore:', error);
        }
        markHydrated('auth');
      }
    }
  )
);

// Make auth store accessible globally for SaveGameManager
// This avoids circular dependency issues
if (typeof window !== 'undefined') {
  window.__authStore = useAuthStore;
}

export default useAuthStore;
