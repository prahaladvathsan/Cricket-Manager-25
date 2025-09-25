/**
 * @file gameStore.js
 * @description Main game state store for season, calendar, and current state
 * @module stores/gameStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} GameState
 * @property {number} currentSeason - Current season number
 * @property {string} currentPhase - preseason | league | playoffs | offseason
 * @property {number} currentWeek - Current week in season
 * @property {string} currentDate - Current game date (ISO string)
 * @property {boolean} isSimulating - Whether game is currently simulating
 * @property {Object} settings - Game settings and preferences
 */

const useGameStore = create((set, get) => ({
  // Game State
  currentSeason: 1,
  currentPhase: 'preseason',
  currentWeek: 1,
  currentDate: new Date().toISOString(),
  isSimulating: false,
  
  // Game Settings
  settings: {
    difficulty: 'normal',
    simulationSpeed: 'normal',
    currency: 'INR',
    nameProtection: false,
    autosave: true
  },

  // Actions
  /**
   * Advance game time by specified amount
   * @param {number} days - Number of days to advance
   */
  advanceTime: (days = 1) => set((state) => {
    const newDate = new Date(state.currentDate);
    newDate.setDate(newDate.getDate() + days);
    
    return {
      currentDate: newDate.toISOString(),
      // TODO: Add week/phase progression logic
    };
  }),

  /**
   * Update game settings
   * @param {Object} newSettings - Settings to update
   */
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  /**
   * Start simulation mode
   */
  startSimulation: () => set({ isSimulating: true }),

  /**
   * Stop simulation mode
   */
  stopSimulation: () => set({ isSimulating: false }),

  /**
   * Reset game state for new season
   */
  resetForNewSeason: () => set((state) => ({
    currentSeason: state.currentSeason + 1,
    currentPhase: 'preseason',
    currentWeek: 1,
    isSimulating: false
  }))
}));

export default useGameStore;