/**
 * @file gameStore.js
 * @description Main game state store for season, calendar, and current state
 * @module stores/gameStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import MessageGenerator from '../utils/MessageGenerator';
import { generateSeasonObjectives, calculateBoardScore, updateAllObjectives } from '../utils/ObjectiveGenerator';
import { compressedStorageOptions } from '../utils/compression.js';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

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

/**
 * Default settings configuration
 * Used for initial state and reset functionality
 */
const DEFAULT_SETTINGS = {
  simulationSpeed: 1000,    // Delay between balls in ms (0-3000)
  currency: 'USD',          // Display currency (USD, EUR, GBP, INR)
  tutorialEnabled: true,    // Show tutorial messages for new games
  difficulty: 'normal',     // Placeholder for future difficulty system
  autosave: true            // Auto-save game state
};

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
      isProcessingTurn: false,

      // Season History (persisted across seasons)
      seasonHistory: [], // Array of { season, champion, runnerUp, standings, userPosition }

      // Retention Phase State
      retentionState: 'not_started', // 'not_started' | 'in_progress' | 'completed'
      userRetentionComplete: false,

      // Board Objectives
      seasonObjectives: [], // Array of 5 objectives for current season
      objectiveTracking: {}, // Track objective-specific data (home wins, streaks, etc.)

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
      settings: { ...DEFAULT_SETTINGS },

      // Tutorial Progress
      tutorialProgress: {
        onboardingComplete: false,  // Has user finished initial walkthrough
        onboardingStep: 0,          // Current step in onboarding (0-4)
        visitedScreens: [],         // Screens already explained
        dismissedTips: []           // Tip IDs user dismissed permanently
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

        // Process daily condition updates (injury countdown, fitness/fatigue recovery)
        // Runs after state update to properly track recovery
        if (typeof window !== 'undefined') {
          // Show processing overlay only in Normal UI mode (not during Sim-to-Date)
          const isInSimToDate = state.isSimulating;
          if (!isInSimToDate) {
            set({ isProcessingTurn: true });
          }

          // Use async IIFE to collect-then-batch all player condition updates
          (async () => {
            try {
              const [playerStoreModule, inboxStoreModule, teamStoreModule, MessageGeneratorModule, indexedDBModule] = await Promise.all([
                import('./playerStore'),
                import('./inboxStore'),
                import('./teamStore'),
                import('../utils/MessageGenerator'),
                import('../utils/indexedDBStorage')
              ]);

              const playerStore = playerStoreModule.default;
              const inboxStore = inboxStoreModule.default;
              const teamStore = teamStoreModule.default;
              const MessageGenerator = MessageGeneratorModule.default;
              const { indexedDBStorage } = indexedDBModule;

              // Start IndexedDB batching if not already batching (SimulationEngine batches externally)
              const wasBatching = indexedDBStorage.isBatching;
              if (!wasBatching) {
                indexedDBStorage.startBatching();
              }

              try {
                const userTeamId = teamStore.getState().userTeamId;
                const players = playerStore.getState().players;

                // Get match info for today (if any)
                const matchEvent = dayEvent && dayEvent.type === 'match' ? dayEvent : null;
                const playingXIPlayerIds = new Set();

                if (matchEvent) {
                  const fixture = matchEvent.data;
                  const homeTeamTactics = teamStore.getState().teamTactics?.[fixture.homeTeam];
                  const awayTeamTactics = teamStore.getState().teamTactics?.[fixture.awayTeam];

                  if (homeTeamTactics?.squadSelection) {
                    homeTeamTactics.squadSelection.forEach(id => playingXIPlayerIds.add(id));
                  }
                  if (awayTeamTactics?.squadSelection) {
                    awayTeamTactics.squadSelection.forEach(id => playingXIPlayerIds.add(id));
                  }
                }

                // Collect all condition updates into a single map (NO store writes in loop)
                const conditionUpdatesMap = {};

                Object.entries(players).forEach(([playerId, player]) => {
                  const updates = {};

                  // 1. INJURY COUNTDOWN (every day)
                  if (player.condition && player.condition.injuryDuration > 0) {
                    const newDuration = player.condition.injuryDuration - 1;

                    if (newDuration <= 0) {
                      updates.injury = null;
                      updates.injuryDuration = null;

                      const isUserPlayer = player.currentTeam === userTeamId;
                      if (isUserPlayer) {
                        inboxStore.getState().addMessage(MessageGenerator.generateRecoveryMessage(player));
                        console.log(`✅ ${player.name} has recovered from injury`);
                      }
                    } else {
                      updates.injuryDuration = newDuration;
                    }
                  }

                  // 2. FITNESS RECOVERY & FATIGUE MANAGEMENT
                  const playerParticipatedInMatch = playingXIPlayerIds.has(playerId);

                  if (playerParticipatedInMatch) {
                    updates.consecutiveRestDays = 0;
                  } else {
                    const currentRestDays = player.condition?.consecutiveRestDays || 0;
                    updates.consecutiveRestDays = currentRestDays + 1;

                    // --- FITNESS RECOVERY ---
                    const currentFitness = player.condition?.fitness ?? 100;
                    const endurance = player.attributes?.physical?.endurance ?? 10;
                    const maxFitness = player.attributes?.physical?.maxFitness ?? 10;
                    const fitnessCap = Math.min(100, 50 + (maxFitness * 2.5));
                    const recoveryAmount = endurance;
                    const newFitness = Math.min(currentFitness + recoveryAmount, fitnessCap);

                    if (newFitness > currentFitness) {
                      updates.fitness = newFitness;
                    }

                    // --- FATIGUE RECOVERY ---
                    const currentFatigue = player.condition?.fatigue ?? 0;
                    if (currentFatigue > 0) {
                      const restDays = updates.consecutiveRestDays;
                      // No recovery in first 10 days, 0.2 starting from day 11
                      const baseRecovery = restDays > 10 ? 0.2 : 0;
                      // Bonus +1 recovery every 7th rest day (14, 21...) ONLY after reaching 10 day threshold
                      const bonusRecovery = (restDays > 10 && restDays % 7 === 0) ? 1 : 0;
                      const totalRecovery = baseRecovery + bonusRecovery;

                      if (totalRecovery > 0) {
                        updates.fatigue = Math.max(0, currentFatigue - totalRecovery);
                      }
                    }
                  }

                  // Collect updates (don't write to store yet)
                  if (Object.keys(updates).length > 0) {
                    conditionUpdatesMap[playerId] = updates;
                  }
                });

                // Apply ALL condition updates in a single set() call
                if (Object.keys(conditionUpdatesMap).length > 0) {
                  playerStore.getState().batchUpdatePlayerConditions(conditionUpdatesMap);
                }
              } finally {
                // Stop batching and flush only if we started it
                if (!wasBatching) {
                  await indexedDBStorage.stopBatching();
                }
                // Clear processing overlay
                if (!isInSimToDate) {
                  set({ isProcessingTurn: false });
                }
              }
            } catch (error) {
              console.error('Error processing daily condition updates:', error);
              // Ensure overlay clears even on error
              if (!state.isSimulating) {
                set({ isProcessingTurn: false });
              }
            }
          })();
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
       * Reset settings to defaults
       */
      resetSettings: () => set({
        settings: { ...DEFAULT_SETTINGS }
      }),

      // Tutorial Actions

      /**
       * Advance to next onboarding step
       */
      advanceOnboarding: () => set((state) => {
        const newStep = state.tutorialProgress.onboardingStep + 1;
        const totalSteps = 5; // 5 total onboarding steps

        // If we've completed all steps, mark onboarding as complete
        if (newStep >= totalSteps) {
          return {
            tutorialProgress: {
              ...state.tutorialProgress,
              onboardingComplete: true,
              onboardingStep: 0
            }
          };
        }

        return {
          tutorialProgress: {
            ...state.tutorialProgress,
            onboardingStep: newStep
          }
        };
      }),

      /**
       * Complete onboarding (called on last step)
       */
      completeOnboarding: () => set((state) => ({
        tutorialProgress: {
          ...state.tutorialProgress,
          onboardingComplete: true,
          onboardingStep: 0
        }
      })),

      /**
       * Skip onboarding entirely
       */
      skipOnboarding: () => set((state) => ({
        tutorialProgress: {
          ...state.tutorialProgress,
          onboardingComplete: true,
          onboardingStep: 0
        }
      })),

      /**
       * Mark a screen as visited (for contextual tips)
       * @param {string} screenId - Screen identifier
       */
      markScreenVisited: (screenId) => set((state) => ({
        tutorialProgress: {
          ...state.tutorialProgress,
          visitedScreens: [...new Set([...state.tutorialProgress.visitedScreens, screenId])]
        }
      })),

      /**
       * Permanently dismiss a tip
       * @param {string} tipId - Tip identifier
       */
      dismissTip: (tipId) => set((state) => ({
        tutorialProgress: {
          ...state.tutorialProgress,
          dismissedTips: [...state.tutorialProgress.dismissedTips, tipId]
        }
      })),

      /**
       * Reset all tutorial progress
       */
      resetTutorial: () => set({
        tutorialProgress: {
          onboardingComplete: false,
          onboardingStep: 0,
          visitedScreens: [],
          dismissedTips: []
        }
      }),

      /**
       * Start simulation mode
       */
      startSimulation: () => set({ isSimulating: true }),

      /**
       * Stop simulation mode
       */
      stopSimulation: () => set({ isSimulating: false }),

      /**
       * Record completed season to history
       * @param {Object} data - { season, champion, runnerUp, standings, userPosition }
       */
      recordSeasonHistory: (data) => set((state) => ({
        seasonHistory: [...state.seasonHistory, data]
      })),

      // Retention phase actions
      startRetentionPhase: () => set({ retentionState: 'in_progress', userRetentionComplete: false }),
      completeRetentionPhase: () => set({ retentionState: 'completed', userRetentionComplete: true }),
      resetRetention: () => set({ retentionState: 'not_started', userRetentionComplete: false }),

      /**
       * Reset game state for new season
       */
      resetForNewSeason: () => set((state) => {
        const newSeason = state.currentSeason + 1;
        const currentDateObj = new Date(state.currentDate);

        // Odd seasons land on Jan 7 (auction day, league starts Jan 13).
        // Even seasons land on Jul 1 (league starts Jul 6).
        // If we're already in the target half-year, stay; else advance to next year.
        const isNewSeasonOdd = newSeason % 2 === 1;
        const currentYear = currentDateObj.getFullYear();
        const currentMonth = currentDateObj.getMonth();
        let newSeasonStartDate;

        if (isNewSeasonOdd) {
          const targetYear = currentMonth <= 1 ? currentYear : currentYear + 1;
          newSeasonStartDate = new Date(targetYear, 0, 7);
        } else {
          const targetYear = (currentMonth >= 3 && currentMonth <= 6) ? currentYear : currentYear + 1;
          newSeasonStartDate = new Date(targetYear, 6, 1);
        }

        console.log(`🗓️ New season ${newSeason} starts: ${newSeasonStartDate.toISOString()}`);

        return {
          currentSeason: newSeason,
          currentPhase: 'preseason',
          currentWeek: 1,
          gameDay: 1,
          currentDate: newSeasonStartDate.toISOString(),
          // NOTE: Don't clear calendarEvents here - let league initialization handle that
          // This allows scheduled events (auction, preseason_start) to still fire
          isSimulating: false,
          // NOTE: Don't clear retentionState here — auction needs it. Cleared by resetRetention() after auction.
          // Reset objectives for new season
          seasonObjectives: [],
          objectiveTracking: {
            homeWins: 0,
            homeMatchesPlayed: 0,
            winsInFirst3: 0,
            rivalWins: 0,
            rivalMatchesPlayed: 0,
            longestWinStreak: 0,
            currentWinStreak: 0,
            highestScore: 0,
            // Best batsman tracking
            userBestBatsmanName: null,
            userBestBatsmanRank: null,
            userBestBatsmanRuns: 0,
            topScorerRuns: 0,
            // Best bowler tracking
            userBestBowlerName: null,
            userBestBowlerRank: null,
            userBestBowlerWickets: 0,
            topBowlerWickets: 0,
            // Transfer objective tracking
            transferSellProfit: 0,
            signedFromRegion: false,
            signedRegionTarget: null
          }
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
        isSimulating: false,
        // Reset tutorial for new games so players see onboarding
        tutorialProgress: {
          onboardingComplete: false,
          onboardingStep: 0,
          visitedScreens: [],
          dismissedTips: []
        }
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
      },

      // Board Objectives Actions

      /**
       * Generate new objectives for the current season
       * @param {string} rivalTeamName - Name of designated rival team (optional)
       */
      generateSeasonObjectives: (rivalTeamName = 'Sydney Sharks') => {
        const state = get();
        const objectives = generateSeasonObjectives(state.currentSeason, rivalTeamName);

        // Extract region target from sign_from_region objective if present
        const regionObj = objectives.find(o => o.id === 'sign_from_region');
        const signedRegionTarget = regionObj?.signedRegionTarget || null;

        console.log(`📋 Generated ${objectives.length} objectives for Season ${state.currentSeason}`);

        set({
          seasonObjectives: objectives,
          objectiveTracking: {
            homeWins: 0,
            homeMatchesPlayed: 0,
            winsInFirst3: 0,
            rivalWins: 0,
            rivalMatchesPlayed: 0,
            longestWinStreak: 0,
            currentWinStreak: 0,
            highestScore: 0,
            // Best batsman tracking
            userBestBatsmanName: null,
            userBestBatsmanRank: null,
            userBestBatsmanRuns: 0,
            topScorerRuns: 0,
            // Best bowler tracking
            userBestBowlerName: null,
            userBestBowlerRank: null,
            userBestBowlerWickets: 0,
            topBowlerWickets: 0,
            // Transfer objective tracking
            transferSellProfit: 0,
            signedFromRegion: false,
            signedRegionTarget
          }
        });

        // Send inbox message about new season objectives
        // Use dynamic imports to avoid circular dependencies
        import('./inboxStore').then(inboxStoreModule => {
          import('./teamStore').then(teamStoreModule => {
            import('../utils/MessageGenerator').then(MessageGeneratorModule => {
              const inboxStore = inboxStoreModule.default;
              const teamStore = teamStoreModule.default;
              const MessageGenerator = MessageGeneratorModule.default;

              const userTeam = teamStore.getState().userTeam;
              if (userTeam) {
                const message = MessageGenerator.generateBoardObjectivesMessage(
                  state.currentSeason,
                  objectives,
                  userTeam.name
                );
                inboxStore.getState().addMessage(message);
                console.log(`📧 Sent board objectives message for Season ${state.currentSeason}`);
              }
            });
          });
        });
      },

      /**
       * Update objective progress with current game state
       * Requires league and team stores to be passed to avoid circular dependencies
       * @param {Object} gameData - Current game state data
       */
      updateObjectiveProgress: (gameData) => {
        const state = get();

        if (!state.seasonObjectives || state.seasonObjectives.length === 0) {
          return;
        }

        // Merge tracking data with game data
        const fullGameData = {
          ...gameData,
          ...state.objectiveTracking
        };

        const updatedObjectives = updateAllObjectives(state.seasonObjectives, fullGameData);

        set({ seasonObjectives: updatedObjectives });
      },

      /**
       * Update objective tracking data (home wins, streaks, etc.)
       * @param {Object} updates - Tracking data updates
       */
      updateObjectiveTracking: (updates) => set((state) => ({
        objectiveTracking: { ...state.objectiveTracking, ...updates }
      })),

      /**
       * Get current board score (0-100)
       * @returns {number} Weighted board score
       */
      getBoardScore: () => {
        const state = get();
        return calculateBoardScore(state.seasonObjectives);
      },

      /**
       * Reset objectives for new season (called during season transition)
       */
      resetObjectivesForNewSeason: () => set({
        seasonObjectives: [],
        objectiveTracking: {
          homeWins: 0,
          homeMatchesPlayed: 0,
          winsInFirst3: 0,
          rivalWins: 0,
          rivalMatchesPlayed: 0,
          longestWinStreak: 0,
          currentWinStreak: 0,
          highestScore: 0,
          // Best batsman tracking
          userBestBatsmanName: null,
          userBestBatsmanRank: null,
          userBestBatsmanRuns: 0,
          topScorerRuns: 0,
          // Best bowler tracking
          userBestBowlerName: null,
          userBestBowlerRank: null,
          userBestBowlerWickets: 0,
          topBowlerWickets: 0
        }
      })
    }),
    {
      name: 'cm25-game-store',
      version: 4, // Bumped version for compressed storage migration
      storage: createJSONStorage(() => indexedDBStorage, compressedStorageOptions),
      // Merge function to ensure new state properties are added to existing saves
      merge: (persistedState, currentState) => {
        // Deep merge settings to preserve new default settings
        const mergedSettings = {
          ...currentState.settings,
          ...(persistedState?.settings || {})
        };

        // Deep merge tutorialProgress to ensure it exists for old saves
        const mergedTutorialProgress = {
          ...currentState.tutorialProgress,
          ...(persistedState?.tutorialProgress || {})
        };

        return {
          ...currentState,
          ...persistedState,
          settings: mergedSettings,
          tutorialProgress: mergedTutorialProgress
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate gameStore:', error);
        }
        markHydrated('game');
      }
    }
  )
);

export default useGameStore;