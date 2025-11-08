/**
 * @file gameStore.js
 * @description Main game state store for season, calendar, and current state
 * @module stores/gameStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {Object} GameState
 * @property {number} currentSeason - Current season number
 * @property {string} currentPhase - preseason | league | playoffs | offseason
 * @property {number} currentWeek - Current week in season
 * @property {string} currentDate - Current game date (ISO string)
 * @property {number} gameDay - Current day number in season (starts at 1)
 * @property {Array} calendarEvents - Scheduled events [{day, type, data}]
 * @property {boolean} isSimulating - Whether game is currently simulating
 * @property {Object} settings - Game settings and preferences
 */

const useGameStore = create(
  persist(
    (set, get) => ({
  // Game State
  currentSeason: 1,
  currentPhase: 'preseason',
  currentWeek: 1,
  currentDate: new Date('2025-01-01').toISOString(),
  gameDay: 1,
  calendarEvents: [],
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
   * Advance game by one day
   * @returns {Object} Event info for the new day {type, data, isWeekend}
   */
  advanceDay: () => {
    const state = get();
    const newGameDay = state.gameDay + 1;
    const newDate = new Date(state.currentDate);
    newDate.setDate(newDate.getDate() + 1);

    // Check if new day is weekend (Saturday=6, Sunday=0)
    const dayOfWeek = newDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Find events scheduled for the new day
    const dayEvent = state.calendarEvents.find(event => event.day === newGameDay);

    // Auto-advance week if moving from Sunday to Monday
    const oldDayOfWeek = new Date(state.currentDate).getDay();
    const shouldAdvanceWeek = oldDayOfWeek === 0 && dayOfWeek === 1;

    set({
      gameDay: newGameDay,
      currentDate: newDate.toISOString(),
      currentWeek: shouldAdvanceWeek ? state.currentWeek + 1 : state.currentWeek
    });

    return {
      type: dayEvent ? dayEvent.type : (isWeekend ? 'rest' : null),
      data: dayEvent ? dayEvent.data : null,
      isWeekend,
      gameDay: newGameDay,
      date: newDate
    };
  },

  /**
   * Advance to next week
   */
  advanceWeek: () => set((state) => ({
    currentWeek: state.currentWeek + 1
  })),

  /**
   * Change game phase
   * @param {string} newPhase - New phase (preseason | league | playoffs | offseason)
   */
  advancePhase: (newPhase) => set({ currentPhase: newPhase }),

  /**
   * Schedule an event for a specific game day
   * @param {number} day - Game day number
   * @param {string} type - Event type (match, auction, email, etc.)
   * @param {Object} data - Event-specific data
   */
  scheduleEvent: (day, type, data) => set((state) => ({
    calendarEvents: [...state.calendarEvents, { day, type, data }]
  })),

  /**
   * Bulk schedule multiple events
   * @param {Array} events - Array of {day, type, data} objects
   */
  scheduleEvents: (events) => set((state) => ({
    calendarEvents: [...state.calendarEvents, ...events]
  })),

  /**
   * Clear all calendar events
   */
  clearEvents: () => set({ calendarEvents: [] }),

  /**
   * Get event scheduled for current day
   * @returns {Object|null} Event object or null
   */
  getCurrentEvent: () => {
    const state = get();
    return state.calendarEvents.find(event => event.day === state.gameDay) || null;
  },

  /**
   * Check if current date is a weekend
   * @returns {boolean}
   */
  isWeekend: () => {
    const state = get();
    const dayOfWeek = new Date(state.currentDate).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  },

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
    gameDay: 1,
    calendarEvents: [],
    isSimulating: false
  })),

  /**
   * Reset game state for brand new game
   */
  resetForNewGame: () => set({
    currentSeason: 1,
    currentPhase: 'preseason',
    currentWeek: 1,
    gameDay: 1,
    currentDate: new Date('2025-01-01').toISOString(),
    calendarEvents: [],
    isSimulating: false
  })
    }),
    {
      name: 'cm25-game-store',
      version: 2
    }
  )
);

export default useGameStore;