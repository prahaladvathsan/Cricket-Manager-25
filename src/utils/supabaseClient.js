/**
 * @file supabaseClient.js
 * @description Supabase client configuration for cloud save functionality
 *
 * To enable cloud saves:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Create a .env file with:
 *    VITE_SUPABASE_URL=your-project-url
 *    VITE_SUPABASE_ANON_KEY=your-anon-key
 * 3. Set up the game_saves table (see docs/dev/completed/cloud-save-schema.sql)
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase config from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Check if Supabase is properly configured
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Create Supabase client (or null if not configured)
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Persist session in localStorage (Supabase default)
        persistSession: true,
        // Auto-refresh session before expiry
        autoRefreshToken: true,
        // Detect session from URL (for OAuth redirects)
        detectSessionInUrl: true,
        // Storage key for session
        storageKey: 'cm25-supabase-auth',
        // Use localStorage for auth (more reliable than default)
        storage: window.localStorage
      }
    })
  : null;

// Process OAuth callback if present in URL hash
if (supabase && window.location.hash.includes('access_token')) {
  console.log('🔐 Processing OAuth callback from URL...');
  // The Supabase client should auto-detect this, but we log it for debugging
}

/**
 * Get the current user's ID
 * @returns {Promise<string|null>}
 */
export async function getCurrentUserId() {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Get the current session
 * @returns {Promise<Object|null>}
 */
export async function getSession() {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export default supabase;
