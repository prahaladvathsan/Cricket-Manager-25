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

  // Test Mode State
  testMode: false,
  testModeProgress: {
    totalWeeks: 0,
    completedWeeks: 0,
    totalMatches: 0,
    completedMatches: 0,
    transferActivity: 0,
    isRunning: false
  },
  
  // Game Settings
  settings: {
    difficulty: 'normal',
    simulationSpeed: 'normal',
    currency: 'USD',
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
  }),

  // Test Mode Actions

  /**
   * Enable test mode
   */
  enableTestMode: () => set({
    testMode: true,
    testModeProgress: {
      totalWeeks: 26,
      completedWeeks: 0,
      totalMatches: 94, // 90 league + 4 playoffs
      completedMatches: 0,
      transferActivity: 0,
      isRunning: false
    }
  }),

  /**
   * Disable test mode and return to normal
   */
  disableTestMode: () => set({
    testMode: false,
    testModeProgress: {
      totalWeeks: 0,
      completedWeeks: 0,
      totalMatches: 0,
      completedMatches: 0,
      transferActivity: 0,
      isRunning: false
    }
  }),

  /**
   * Update test mode progress
   * @param {Object} updates - Progress updates
   */
  updateTestProgress: (updates) => set((state) => ({
    testModeProgress: { ...state.testModeProgress, ...updates }
  })),

  /**
   * Simulate one week in test mode
   * Requires leagueStore to be passed in to avoid circular dependency
   * @param {Object} leagueStore - The league store instance
   * @returns {Object} Summary of simulated events
   */
  simulateWeek: (leagueStore) => {
    const state = get();
    const summary = {
      matchesPlayed: 0,
      transfersCompleted: 0,
      phase: state.currentPhase,
      week: state.currentWeek
    };

    // Get all matches scheduled for this week
    const weekStart = state.gameDay;
    const weekEnd = weekStart + 7;

    const weekMatches = state.calendarEvents.filter(
      event => event.type === 'match' &&
               event.day >= weekStart &&
               event.day < weekEnd
    );

    // Simulate each match in the week
    weekMatches.forEach(matchEvent => {
      const fixture = matchEvent.data;

      // Import and use the quick-sim logic
      // This will be implemented when we integrate with match engine
      // For now, just advance the day
      summary.matchesPlayed++;
    });

    // Advance week
    set((state) => ({
      currentWeek: state.currentWeek + 1,
      testModeProgress: {
        ...state.testModeProgress,
        completedWeeks: state.currentWeek,
        completedMatches: state.testModeProgress.completedMatches + summary.matchesPlayed
      }
    }));

    return summary;
  }
    }),
    {
      name: 'cm25-game-store',
      version: 2
    }
  )
);

export default useGameStore;