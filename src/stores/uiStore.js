/**
 * @file uiStore.js
 * @description Store for UI state, preferences and navigation
 * @module stores/uiStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {Object} UIStore
 * @property {string} currentView - Current main view/page
 * @property {Object} modals - Modal state management
 * @property {Object} preferences - UI preferences and settings
 * @property {Object} navigation - Navigation state
 */

const useUIStore = create(
  persist(
    (set, get) => ({
  // Current View State
  currentView: 'dashboard',
  activeSubView: null,
  
  // Modal Management
  modals: {
    playerDetails: { isOpen: false, playerId: null },
    teamSelection: { isOpen: false },
    matchSettings: { isOpen: false },
    saveLoad: { isOpen: false }
  },
  
  // UI Preferences
  preferences: {
    theme: 'dark',
    sidebarCollapsed: false,
    tablePageSize: 25,
    animationsEnabled: true,
    soundEnabled: true,
    autoSaveInterval: 60000 // 1 minute
  },
  
  // Navigation State
  navigation: {
    breadcrumbs: [],
    history: ['dashboard'],
    canGoBack: false,
    canGoForward: false
  },

  // Actions
  /**
   * Navigate to a specific view
   * @param {string} view - View name
   * @param {string} subView - Optional sub-view
   */
  navigateTo: (view, subView = null) => set((state) => {
    const newHistory = [...state.navigation.history, view];
    
    return {
      currentView: view,
      activeSubView: subView,
      navigation: {
        ...state.navigation,
        history: newHistory.slice(-10), // Keep last 10 entries
        canGoBack: newHistory.length > 1
      }
    };
  }),

  /**
   * Go back to previous view
   */
  goBack: () => set((state) => {
    if (state.navigation.history.length <= 1) return state;
    
    const newHistory = state.navigation.history.slice(0, -1);
    const previousView = newHistory[newHistory.length - 1];
    
    return {
      currentView: previousView,
      activeSubView: null,
      navigation: {
        ...state.navigation,
        history: newHistory,
        canGoBack: newHistory.length > 1
      }
    };
  }),

  /**
   * Open a modal
   * @param {string} modalName - Modal identifier
   * @param {Object} data - Modal data
   */
  openModal: (modalName, data = {}) => set((state) => ({
    modals: {
      ...state.modals,
      [modalName]: { isOpen: true, ...data }
    }
  })),

  /**
   * Close a modal
   * @param {string} modalName - Modal identifier
   */
  closeModal: (modalName) => set((state) => ({
    modals: {
      ...state.modals,
      [modalName]: { isOpen: false }
    }
  })),

  /**
   * Close all modals
   */
  closeAllModals: () => set((state) => {
    const closedModals = {};
    Object.keys(state.modals).forEach(key => {
      closedModals[key] = { isOpen: false };
    });
    
    return { modals: closedModals };
  }),

  /**
   * Update UI preferences
   * @param {Object} newPreferences - Preference updates
   */
  updatePreferences: (newPreferences) => set((state) => ({
    preferences: { ...state.preferences, ...newPreferences }
  })),

  /**
   * Toggle sidebar collapse
   */
  toggleSidebar: () => set((state) => ({
    preferences: {
      ...state.preferences,
      sidebarCollapsed: !state.preferences.sidebarCollapsed
    }
  })),

  /**
   * Set breadcrumbs for navigation
   * @param {Array} breadcrumbs - Array of breadcrumb objects
   */
  setBreadcrumbs: (breadcrumbs) => set((state) => ({
    navigation: {
      ...state.navigation,
      breadcrumbs
    }
  })),

  /**
   * Add notification to queue
   * @param {Object} notification - Notification object
   */
  addNotification: (notification) => {
    // TODO: Implement notification system
    console.log('Notification:', notification);
  }
    }),
    {
      name: 'cm25-ui-store',
      version: 1,
      // Only persist preferences, not transient navigation/modal state
      partialize: (state) => ({
        preferences: state.preferences
      })
    }
  )
);

export default useUIStore;