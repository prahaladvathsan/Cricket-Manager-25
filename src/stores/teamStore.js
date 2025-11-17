/**
 * @file teamStore.js
 * @description Store for all teams and rosters management
 * @module stores/teamStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import usePlayerStore from './playerStore';

/**
 * @typedef {Object} BowlingPlans
 * @property {string} lineLength - Line-length plan (4 options)
 * @property {string} variation - Variation plan (4 options)
 */

/**
 * @typedef {Object} TeamTactics
 * @property {string[]} squadSelection - Array of 11 player IDs in playing XI
 * @property {Object.<string, string>} playstyleOverrides - Player ID → playstyle name (only if different from primary)
 * @property {string[]} battingOrder - Array of 11 player IDs in batting order
 * @property {Object.<string, string>} accelerationTiers - Player ID → acceleration tier name
 * @property {Object.<string, BowlingPlans>} bowlingPlans - Player ID → bowling plans
 * @property {number[]} bowlingRotation - Array of player IDs in preferred bowling order
 * @property {string} fieldFormation - Field formation ('attacking', 'neutral', or 'defensive')
 */

/**
 * @typedef {Object} TeamStore
 * @property {Object.<string, Team>} teams - All teams indexed by ID
 * @property {string} userTeamId - ID of team controlled by user
 * @property {Object.<string, string[]>} squadLists - Current squad for each team
 * @property {Object.<string, TeamTactics>} teamTactics - Tactics for each team
 */

const useTeamStore = create(
  persist(
    (set, get) => ({
  // Team Data
  teams: {},
  userTeamId: null,
  squadLists: {},

  // Team Tactics
  teamTactics: {}, // teamId -> TeamTactics

  // Performance Stats (reset on transfer)
  playerStats: {}, // teamId -> { playerId -> stats }
  teamStats: {}, // teamId -> aggregated team stats

  // Actions
  /**
   * Initialize teams from data
   * @param {Team[]} teamsData - Array of team objects
   */
  initializeTeams: (teamsData) => set(() => {
    const teamsMap = {};
    const squads = {};
    
    teamsData.forEach(team => {
      teamsMap[team.id] = team;
      squads[team.id] = team.playerIds || [];
    });

    return {
      teams: teamsMap,
      squadLists: squads
    };
  }),

  /**
   * Set the user's team
   * @param {string} teamId - ID of team to control
   */
  setUserTeam: (teamId) => set({ userTeamId: teamId }),

  /**
   * Get team by ID
   * @param {string} teamId - Team ID
   * @returns {Team|null} Team object or null
   */
  getTeam: (teamId) => {
    const state = get();
    return state.teams[teamId] || null;
  },

  /**
   * Get user's team
   * @returns {Team|null} User's team or null
   */
  getUserTeam: () => {
    const state = get();
    return state.userTeamId ? state.teams[state.userTeamId] : null;
  },

  /**
   * Update team information
   * @param {string} teamId - Team ID
   * @param {Object} updates - Fields to update
   */
  updateTeam: (teamId, updates) => set((state) => ({
    teams: {
      ...state.teams,
      [teamId]: { ...state.teams[teamId], ...updates }
    }
  })),

  /**
   * Add player to team squad
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   */
  addPlayerToSquad: (teamId, playerId) => set((state) => ({
    squadLists: {
      ...state.squadLists,
      [teamId]: [...(state.squadLists[teamId] || []), playerId]
    }
  })),

  /**
   * Remove player from team squad
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   */
  removePlayerFromSquad: (teamId, playerId) => set((state) => ({
    squadLists: {
      ...state.squadLists,
      [teamId]: (state.squadLists[teamId] || []).filter(id => id !== playerId)
    }
  })),

  /**
   * Set team captain
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   */
  setCaptain: (teamId, playerId) => set((state) => ({
    teams: {
      ...state.teams,
      [teamId]: { ...state.teams[teamId], captainId: playerId }
    }
  })),

  /**
   * Initialize player stats for a team
   * @param {string} teamId - Team ID
   */
  initializeTeamStats: (teamId) => set((state) => ({
    playerStats: {
      ...state.playerStats,
      [teamId]: {}
    },
    teamStats: {
      ...state.teamStats,
      [teamId]: {
        matches: 0,
        battingAverage: 0,
        strikeRate: 0,
        economy: 0,
        bowlingAverage: 0
      }
    }
  })),

  /**
   * Update player stats after a match
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   * @param {Object} matchStats - Stats from match
   */
  updatePlayerStats: (teamId, playerId, matchStats) => set((state) => {
    const teamPlayerStats = state.playerStats[teamId] || {};
    const currentStats = teamPlayerStats[playerId] || {
      matches: 0,
      runs: 0,
      ballsFaced: 0,
      dismissed: 0,
      battingAverage: 0,
      strikeRate: 0,
      wickets: 0,
      ballsBowled: 0,
      runsConceded: 0,
      economy: 0,
      bowlingAverage: 0
    };

    // Accumulate stats
    const newMatches = currentStats.matches + 1;
    const newRuns = currentStats.runs + (matchStats.runs || 0);
    const newBallsFaced = currentStats.ballsFaced + (matchStats.ballsFaced || 0);
    const newDismissed = currentStats.dismissed + (matchStats.dismissed ? 1 : 0);
    const newWickets = currentStats.wickets + (matchStats.wickets || 0);
    const newBallsBowled = currentStats.ballsBowled + (matchStats.ballsBowled || 0);
    const newRunsConceded = currentStats.runsConceded + (matchStats.runsConceded || 0);

    // Calculate derived stats
    const newBattingAverage = newDismissed > 0 ? newRuns / newDismissed : newRuns;
    const newStrikeRate = newBallsFaced > 0 ? (newRuns / newBallsFaced) * 100 : 0;
    const newEconomy = newBallsBowled > 0 ? (newRunsConceded / newBallsBowled) * 6 : 0;
    const newBowlingAverage = newWickets > 0 ? newRunsConceded / newWickets : 0;

    return {
      playerStats: {
        ...state.playerStats,
        [teamId]: {
          ...teamPlayerStats,
          [playerId]: {
            matches: newMatches,
            runs: newRuns,
            ballsFaced: newBallsFaced,
            dismissed: newDismissed,
            battingAverage: newBattingAverage,
            strikeRate: newStrikeRate,
            wickets: newWickets,
            ballsBowled: newBallsBowled,
            runsConceded: newRunsConceded,
            economy: newEconomy,
            bowlingAverage: newBowlingAverage
          }
        }
      }
    };
  }),

  /**
   * Recalculate team aggregate stats
   * @param {string} teamId - Team ID
   */
  recalculateTeamStats: (teamId) => set((state) => {
    const teamPlayerStats = state.playerStats[teamId] || {};
    const playerStatsArray = Object.values(teamPlayerStats);

    if (playerStatsArray.length === 0) {
      return state;
    }

    // Calculate averages across all players
    const avgBattingAverage = playerStatsArray.reduce((sum, p) => sum + (p.battingAverage || 0), 0) / playerStatsArray.length;
    const avgStrikeRate = playerStatsArray.reduce((sum, p) => sum + (p.strikeRate || 0), 0) / playerStatsArray.length;
    const avgEconomy = playerStatsArray.reduce((sum, p) => sum + (p.economy || 0), 0) / playerStatsArray.length;
    const avgBowlingAverage = playerStatsArray.reduce((sum, p) => sum + (p.bowlingAverage || 0), 0) / playerStatsArray.length;

    return {
      teamStats: {
        ...state.teamStats,
        [teamId]: {
          matches: Math.max(...playerStatsArray.map(p => p.matches)),
          battingAverage: avgBattingAverage,
          strikeRate: avgStrikeRate,
          economy: avgEconomy,
          bowlingAverage: avgBowlingAverage
        }
      }
    };
  }),

  /**
   * Reset player stats when they transfer teams
   * @param {string} playerId - Player ID
   * @param {string} oldTeamId - Old team ID
   */
  resetPlayerStats: (playerId, oldTeamId) => set((state) => {
    const teamPlayerStats = state.playerStats[oldTeamId] || {};
    const { [playerId]: removed, ...remaining } = teamPlayerStats;

    return {
      playerStats: {
        ...state.playerStats,
        [oldTeamId]: remaining
      }
    };
  }),

  /**
   * Get player stats for a team
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player stats or null
   */
  getPlayerStats: (teamId, playerId) => {
    const state = get();
    return state.playerStats[teamId]?.[playerId] || null;
  },

  /**
   * Get team aggregate stats
   * @param {string} teamId - Team ID
   * @returns {Object|null} Team stats or null
   */
  getTeamStats: (teamId) => {
    const state = get();
    return state.teamStats[teamId] || null;
  },

  // ==================== TACTICS ACTIONS ====================

  /**
   * Initialize default tactics for a team from player data
   * @param {string} teamId - Team ID
   * @param {Object[]} players - Array of player objects
   * @param {string[]} squadIds - Array of 11 player IDs for playing XI
   */
  initializeDefaultTactics: (teamId, players, squadIds = null) => {
    // If no squad specified, take first 11 players
    const playingXI = squadIds || players.slice(0, 11).map(p => p.id);

    // Initialize tactics with player defaults
    const tactics = {
      squadSelection: playingXI,
      playstyleOverrides: {}, // Empty - using primary playstyles
      battingOrder: [...playingXI], // Same order as squad initially
      accelerationTiers: {},
      bowlingPlans: {},
      bowlingRotation: [],
      fieldFormation: 'neutral'
    };

    // Set default acceleration tiers and bowling plans from player data
    players.forEach(player => {
      if (playingXI.includes(player.id)) {
        // Set default batting tier
        tactics.accelerationTiers[player.id] = player.tactics?.defaultBattingTier || 'Rotate';

        // Set default bowling plans for bowlers/all-rounders
        if (player.role === 'bowler' || player.role === 'all-rounder') {
          tactics.bowlingPlans[player.id] = {
            lineLength: player.tactics?.defaultBowlingPlans?.lineLength || 'Wide Line',
            variation: player.tactics?.defaultBowlingPlans?.variation || 'Consistent Accuracy'
          };

          // Add to bowling rotation
          tactics.bowlingRotation.push(player.id);
        }
      }
    });

    set((state) => ({
      teamTactics: {
        ...state.teamTactics,
        [teamId]: tactics
      }
    }));
  },

  /**
   * Initialize default tactics for all teams at once
   * Used after auction completion to set up all teams for the season
   */
  initializeAllTeamsTactics: () => {
    const state = get();
    const playerStore = usePlayerStore.getState();

    // Initialize tactics for each team
    Object.keys(state.teams).forEach(teamId => {
      // Skip if tactics already exist
      if (state.teamTactics[teamId]) {
        return;
      }

      // Get team's squad
      const squadIds = state.squadLists[teamId] || [];
      if (squadIds.length < 11) {
        console.warn(`Team ${teamId} has less than 11 players (${squadIds.length}), skipping tactics initialization`);
        return;
      }

      // Get player objects for the squad
      const players = squadIds
        .map(playerId => playerStore.players[playerId])
        .filter(p => p); // Filter out any undefined players

      if (players.length >= 11) {
        // Use initializeDefaultTactics for each team
        get().initializeDefaultTactics(teamId, players, squadIds.slice(0, 11));
      }
    });

    console.log(`✅ Initialized tactics for ${Object.keys(state.teams).length} teams`);
  },

  /**
   * Get tactics for a specific team
   * @param {string} teamId - Team ID
   * @returns {TeamTactics|null} Team tactics or null
   */
  getTeamTactics: (teamId) => {
    const state = get();
    return state.teamTactics[teamId] || null;
  },

  /**
   * Update squad selection (playing XI)
   * Automatically syncs batting order to maintain consistency
   * @param {string} teamId - Team ID
   * @param {string[]} playerIds - Array of 11 player IDs
   */
  updateSquadSelection: (teamId, playerIds) => {
    set((state) => {
      const currentTactics = state.teamTactics[teamId];
      const currentBattingOrder = currentTactics?.battingOrder || [];

      // Sync batting order with new squad:
      // 1. Keep players that are still in squad in their current batting positions
      // 2. Add new players at the end
      const keptPlayers = currentBattingOrder.filter(id => playerIds.includes(id));
      const newPlayers = playerIds.filter(id => !keptPlayers.includes(id));
      const newBattingOrder = [...keptPlayers, ...newPlayers];

      // Clean up tactics for removed players
      const newAccelerationTiers = { ...(currentTactics?.accelerationTiers || {}) };
      const newBowlingPlans = { ...(currentTactics?.bowlingPlans || {}) };
      const newPlaystyleOverrides = { ...(currentTactics?.playstyleOverrides || {}) };

      // Remove data for players no longer in squad
      Object.keys(newAccelerationTiers).forEach(playerId => {
        if (!playerIds.includes(playerId)) {
          delete newAccelerationTiers[playerId];
        }
      });
      Object.keys(newBowlingPlans).forEach(playerId => {
        if (!playerIds.includes(playerId)) {
          delete newBowlingPlans[playerId];
        }
      });
      Object.keys(newPlaystyleOverrides).forEach(playerId => {
        if (!playerIds.includes(playerId)) {
          delete newPlaystyleOverrides[playerId];
        }
      });

      return {
        teamTactics: {
          ...state.teamTactics,
          [teamId]: {
            ...currentTactics,
            squadSelection: playerIds,
            battingOrder: newBattingOrder,
            accelerationTiers: newAccelerationTiers,
            bowlingPlans: newBowlingPlans,
            playstyleOverrides: newPlaystyleOverrides
          }
        }
      };
    });
  },

  /**
   * Update playstyle override for a player
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   * @param {Object|null} playstyles - {batting?: string, bowling?: string} or null to remove all overrides
   */
  updatePlaystyleOverride: (teamId, playerId, playstyles) => {
    set((state) => {
      const teamTactics = state.teamTactics[teamId];
      const overrides = { ...teamTactics.playstyleOverrides };

      if (playstyles === null) {
        // Remove all overrides for this player
        delete overrides[playerId];
      } else {
        // Update overrides (merge with existing)
        overrides[playerId] = {
          ...(overrides[playerId] || {}),
          ...playstyles
        };

        // Clean up if both are null/undefined
        if (!overrides[playerId].batting && !overrides[playerId].bowling) {
          delete overrides[playerId];
        }
      }

      return {
        teamTactics: {
          ...state.teamTactics,
          [teamId]: {
            ...teamTactics,
            playstyleOverrides: overrides
          }
        }
      };
    });
  },

  /**
   * Update batting order
   * @param {string} teamId - Team ID
   * @param {string[]} orderedPlayerIds - Array of player IDs in batting order
   */
  updateBattingOrder: (teamId, orderedPlayerIds) => {
    set((state) => ({
      teamTactics: {
        ...state.teamTactics,
        [teamId]: {
          ...state.teamTactics[teamId],
          battingOrder: orderedPlayerIds
        }
      }
    }));
  },

  /**
   * Update acceleration tier for a player
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   * @param {string} tier - Acceleration tier name
   */
  updateAccelerationTier: (teamId, playerId, tier) => {
    set((state) => ({
      teamTactics: {
        ...state.teamTactics,
        [teamId]: {
          ...state.teamTactics[teamId],
          accelerationTiers: {
            ...state.teamTactics[teamId].accelerationTiers,
            [playerId]: tier
          }
        }
      }
    }));
  },

  /**
   * Update bowling plans for a player
   * @param {string} teamId - Team ID
   * @param {string} playerId - Player ID
   * @param {BowlingPlans} plans - Bowling plans object
   */
  updateBowlingPlans: (teamId, playerId, plans) => {
    set((state) => ({
      teamTactics: {
        ...state.teamTactics,
        [teamId]: {
          ...state.teamTactics[teamId],
          bowlingPlans: {
            ...state.teamTactics[teamId].bowlingPlans,
            [playerId]: plans
          }
        }
      }
    }));
  },

  /**
   * Update bowling rotation order
   * @param {string} teamId - Team ID
   * @param {string[]} rotationOrder - Array of player IDs in rotation order
   */
  updateBowlingRotation: (teamId, rotationOrder) => {
    set((state) => ({
      teamTactics: {
        ...state.teamTactics,
        [teamId]: {
          ...state.teamTactics[teamId],
          bowlingRotation: rotationOrder
        }
      }
    }));
  },

  /**
   * Update field formation
   * @param {string} teamId - Team ID
   * @param {string} formation - Formation name ('attacking', 'neutral', or 'defensive')
   */
  updateFieldFormation: (teamId, formation) => {
    set((state) => ({
      teamTactics: {
        ...state.teamTactics,
        [teamId]: {
          ...state.teamTactics[teamId],
          fieldFormation: formation
        }
      }
    }));
  },

  /**
   * Update team fielding setup (comprehensive version with powerplay/post-powerplay)
   * @param {string} teamId - Team ID
   * @param {Object} fieldingSetup - Fielding setup object with powerplay and postPowerplay configurations
   */
  updateFieldingSetup: (teamId, fieldingSetup) => {
    set((state) => ({
      teamTactics: {
        ...state.teamTactics,
        [teamId]: {
          ...state.teamTactics[teamId],
          fielding: fieldingSetup
        }
      }
    }));
  },

  /**
   * Export tactics in format suitable for match initialization
   * @param {string} teamId - Team ID
   * @returns {Object|null} Tactics formatted for match engine
   */
  getTacticsForMatch: (teamId) => {
    const state = get();
    const tactics = state.teamTactics[teamId];

    if (!tactics) {
      return null;
    }

    return {
      squadSelection: tactics.squadSelection,
      playstyleOverrides: tactics.playstyleOverrides,
      battingOrder: tactics.battingOrder,
      accelerationTiers: tactics.accelerationTiers,
      bowlingPlans: tactics.bowlingPlans,
      bowlingRotation: tactics.bowlingRotation,
      fieldFormation: tactics.fieldFormation
    };
  },

  /**
   * Reset tactics to defaults for a team
   * @param {string} teamId - Team ID
   * @param {Object[]} players - Array of player objects
   */
  resetTacticsToDefaults: (teamId, players) => {
    const state = get();
    const currentTactics = state.teamTactics[teamId];

    if (!currentTactics) {
      return;
    }

    // Re-initialize with current squad
    get().initializeDefaultTactics(teamId, players, currentTactics.squadSelection);
  },

  /**
   * Check if team has tactics initialized
   * @param {string} teamId - Team ID
   * @returns {boolean} True if tactics exist
   */
  hasTactics: (teamId) => {
    const state = get();
    return !!state.teamTactics[teamId];
  },

  /**
   * Initialize tactics for all teams in the league
   * Used after auction to set up default tactics for all teams
   */
  initializeAllTeamsTactics: () => {
    const state = get();
    const playerStoreState = usePlayerStore.getState();

    console.log('🎯 Initializing tactics for all teams...');

    Object.keys(state.teams).forEach(teamId => {
      // Skip if team already has tactics
      if (state.teamTactics[teamId]) {
        console.log(`  ✓ ${state.teams[teamId].shortName} already has tactics`);
        return;
      }

      // Get players for this team
      const teamSquad = state.squadLists[teamId] || [];
      const players = teamSquad
        .map(playerId => playerStoreState.players[playerId])
        .filter(Boolean);

      if (players.length === 0) {
        console.warn(`  ⚠ ${state.teams[teamId].shortName} has no players, skipping`);
        return;
      }

      // Initialize with default tactics
      get().initializeDefaultTactics(teamId, players);
      console.log(`  ✓ Initialized tactics for ${state.teams[teamId].shortName} (${players.length} players)`);
    });

    console.log('✅ All team tactics initialized');
  },

  /**
   * Reset all team tactics (used when starting a new game)
   * Clears all tactics data to ensure fresh start
   */
  resetAllTactics: () => set({
    teamTactics: {}
  })
    }),
    {
      name: 'cm25-team-store',
      version: 2
    }
  )
);

export default useTeamStore;