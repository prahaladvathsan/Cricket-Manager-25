/**
 * @file gameStore.js
 * @description Main game state store for season, calendar, and current state
 * @module stores/gameStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import MessageGenerator from '../utils/MessageGenerator';

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

    // Process daily injury countdown (must be done after state update)
    // This needs to run after the day advances to properly track recovery
    if (typeof window !== 'undefined') {
      // Only run in browser environment
      setTimeout(() => {
        try {
          // Import stores dynamically to avoid circular dependencies
          import('./playerStore').then(playerStoreModule => {
            import('./inboxStore').then(inboxStoreModule => {
              import('./teamStore').then(teamStoreModule => {
                import('../utils/MessageGenerator').then(MessageGeneratorModule => {
                  const playerStore = playerStoreModule.default;
                  const inboxStore = inboxStoreModule.default;
                  const teamStore = teamStoreModule.default;
                  const MessageGenerator = MessageGeneratorModule.default;

                  const userTeamId = teamStore.getState().userTeamId;
                  const players = playerStore.getState().players;

                  // Get match info for today (if any)
                  const matchEvent = dayEvent && dayEvent.type === 'match' ? dayEvent : null;
                  const matchTeamIds = new Set();
                  const playingXIPlayerIds = new Set();

                  if (matchEvent) {
                    const fixture = matchEvent.data;
                    // Track which teams are playing
                    matchTeamIds.add(fixture.homeTeam);
                    matchTeamIds.add(fixture.awayTeam);

                    // Get playing XI for both teams (players who actually played)
                    const homeTeamTactics = teamStore.getState().teamTactics?.[fixture.homeTeam];
                    const awayTeamTactics = teamStore.getState().teamTactics?.[fixture.awayTeam];

                    if (homeTeamTactics?.squadSelection) {
                      homeTeamTactics.squadSelection.forEach(id => playingXIPlayerIds.add(id));
                    }
                    if (awayTeamTactics?.squadSelection) {
                      awayTeamTactics.squadSelection.forEach(id => playingXIPlayerIds.add(id));
                    }
                  }

                  Object.entries(players).forEach(([playerId, player]) => {
                    const updates = {};

                    // 1. INJURY COUNTDOWN (every day)
                    if (player.condition && player.condition.injuryDuration > 0) {
                      const newDuration = player.condition.injuryDuration - 1;

                      if (newDuration <= 0) {
                        // Player recovered - reset injury fields and send recovery message
                        updates.injury = null;
                        updates.injuryDuration = null;

                        // Send recovery inbox message only for user's squad players
                        const isUserPlayer = player.currentTeam === userTeamId;
                        if (isUserPlayer) {
                          inboxStore.getState().addMessage(MessageGenerator.generateRecoveryMessage(player));
                          console.log(`✅ ${player.name} has recovered from injury`);
                        } else {
                          console.log(`✅ ${player.name} has recovered from injury (no inbox message - not user's player)`);
                        }
                      } else {
                        // Decrement injury duration
                        updates.injuryDuration = newDuration;
                      }
                    }

                    // 2. FITNESS RECOVERY
                    // Condition: Player didn't participate in a match today (wasn't in playing XI)
                    if (player.condition && !player.condition.injury) {
                      const playerParticipatedInMatch = playingXIPlayerIds.has(playerId);

                      if (!playerParticipatedInMatch) {
                        // Player didn't play - apply recovery
                        const currentFitness = player.condition.fitness ?? 100;
                        const endurance = player.attributes?.physical?.endurance ?? 10;
                        const maxFitness = player.attributes?.physical?.maxFitness ?? 18;

                        // Recovery formula: fitness += endurance/2 (capped at maxFitness × 5)
                        const recoveryAmount = endurance / 2;
                        const maxFitnessCap = maxFitness * 5;
                        const newFitness = Math.min(currentFitness + recoveryAmount, maxFitnessCap, 100);

                        if (newFitness > currentFitness) {
                          updates.fitness = newFitness;
                        }
                      }
                    }

                    // Apply all updates if any exist
                    if (Object.keys(updates).length > 0) {
                      playerStore.getState().updatePlayerCondition(playerId, updates);
                    }
                  });
                }).catch(error => {
                  console.error('Error importing MessageGenerator:', error);
                });
              }).catch(error => {
                console.error('Error importing teamStore:', error);
              });
            }).catch(error => {
              console.error('Error importing inboxStore:', error);
            });
          }).catch(error => {
            console.error('Error importing playerStore:', error);
          });
        } catch (error) {
          console.error('Error processing daily injury countdown:', error);
        }
      }, 0);
    }

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
  resetForNewSeason: () => set((state) => {
    const newSeason = state.currentSeason + 1;
    const currentDateObj = new Date(state.currentDate);

    // Determine new season start date based on season parity
    // Odd seasons (1,3,5...): Start Jan 1, end June 30
    // Even seasons (2,4,6...): Start July 1, end Dec 31
    const isNewSeasonOdd = newSeason % 2 === 1;
    let newSeasonStartDate;

    if (isNewSeasonOdd) {
      // Odd season starts January 1 (year increments)
      newSeasonStartDate = new Date(currentDateObj.getFullYear() + 1, 0, 1); // Jan 1 next year
    } else {
      // Even season starts July 1 (same year as previous season end)
      newSeasonStartDate = new Date(currentDateObj.getFullYear(), 6, 1); // July 1 same year
    }

    console.log(`🗓️ New season ${newSeason} starts: ${newSeasonStartDate.toISOString()}`);

    return {
      currentSeason: newSeason,
      currentPhase: 'preseason',
      currentWeek: 1,
      gameDay: 1,
      currentDate: newSeasonStartDate.toISOString(),
      calendarEvents: [],
      isSimulating: false
    };
  }),

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