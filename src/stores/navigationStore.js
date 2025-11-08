/**
 * @file navigationStore.js
 * @description Navigation history store for back button functionality
 * @module stores/navigationStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} NavigationState
 * @property {Array<string>} history - Array of previous route paths
 * @property {number} maxHistory - Maximum number of routes to store
 */

const useNavigationStore = create((set, get) => ({
  // State
  history: [],
  maxHistory: 20,

  /**
   * Push a new route to history
   * @param {string} path - Route path to add to history
   */
  pushRoute: (path) => set((state) => {
    // Don't add duplicate consecutive routes
    if (state.history.length > 0 && state.history[state.history.length - 1] === path) {
      return state;
    }

    const newHistory = [...state.history, path];

    // Keep only last maxHistory items
    if (newHistory.length > state.maxHistory) {
      newHistory.shift();
    }

    return { history: newHistory };
  }),

  /**
   * Go back to previous route
   * @returns {string|null} Previous route path or null if no history
   */
  goBack: () => {
    const state = get();
    if (state.history.length <= 1) {
      return null;
    }

    // Remove current route
    const newHistory = [...state.history];
    newHistory.pop();

    // Get previous route
    const previousRoute = newHistory[newHistory.length - 1];

    set({ history: newHistory });
    return previousRoute;
  },

  /**
   * Check if can go back
   * @returns {boolean} True if there's history to go back to
   */
  canGoBack: () => {
    const state = get();
    return state.history.length > 1;
  },

  /**
   * Clear all navigation history
   */
  clearHistory: () => set({ history: [] }),

  /**
   * Get current route (last item in history)
   * @returns {string|null} Current route path
   */
  getCurrentRoute: () => {
    const state = get();
    return state.history.length > 0 ? state.history[state.history.length - 1] : null;
  }
}));

export default useNavigationStore;
