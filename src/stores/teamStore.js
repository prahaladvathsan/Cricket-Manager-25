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
 * @property {string} fieldFormation - Field formation ID (e.g., 'attacking_pace_cordon', 'neutral_orthodox', 'defensive_ring_fence')
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
   * Initialize a random team for test mode
   * Randomly selects one of the available teams
   * @returns {string} The selected team ID
   */
  initializeRandomTeam: () => {
    const state = get();
    const teamIds = Object.keys(state.teams);

    if (teamIds.length === 0) {
      console.error('No teams available for selection');
      return null;
    }

    // Randomly select a team
    const randomIndex = Math.floor(Math.random() * teamIds.length);
    const selectedTeamId = teamIds[randomIndex];

    set({ userTeamId: selectedTeamId });

    console.log(`🎲 Test mode: Randomly selected ${state.teams[selectedTeamId]?.shortName || selectedTeamId}`);

    return selectedTeamId;
  },

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
   * Get default bowling plans based on player's primary bowling playstyle
   * @param {Object} player - Player object
   * @returns {Object} Default bowling plans {lineLength, variation}
   */
  getDefaultBowlingPlansForPlaystyle: (player) => {
    const primaryBowlingPlaystyle = player.primaryPlaystyle?.bowling;

    // Mapping from bowling playstyles to their optimal bowling plans
    const playstyleToPlans = {
      // Pace bowlers
      'Swing Bowler': {
        lineLength: 'Attacking Line',
        variation: 'Swing/Seam Focus'
      },
      'Hit-the-Deck Seamer': {
        lineLength: 'Wide Line',
        variation: 'Consistent Accuracy'
      },
      'Short-Ball Specialist': {
        lineLength: 'Short-Pitched',
        variation: 'Bouncer Barrage'
      },
      'Death Specialist': {
        lineLength: 'Yorker Execution',
        variation: 'Pace Variation Mix'
      },
      // Spin bowlers
      'Classical Spinner': {
        lineLength: 'Flight & Loop',
        variation: 'Flight Variation'
      },
      'Flat Spinner': {
        lineLength: 'Flat & Fast',
        variation: 'Pace Variation'
      },
      'Mystery Spinner': {
        lineLength: 'Wide of Off',
        variation: 'Turn Candy Bag'
      },
      'Containment Spinner': {
        lineLength: 'Flat & Fast', // Default for containment
        variation: 'Consistent Line'
      }
    };

    // Return plans for the playstyle, or fallback based on bowling type
    if (primaryBowlingPlaystyle && playstyleToPlans[primaryBowlingPlaystyle]) {
      return playstyleToPlans[primaryBowlingPlaystyle];
    }

    // Fallback based on bowlingType if no primary playstyle
    if (player.bowlingType === 'spin') {
      return { lineLength: 'Flight & Loop', variation: 'Flight Variation' };
    } else {
      return { lineLength: 'Wide Line', variation: 'Consistent Accuracy' };
    }
  },

  /**
   * Select balanced playing XI from squad
   * Ensures: 1 wicketkeeper, 5+ bowling options, rest batsmen
   * @param {Object[]} players - Array of player objects in squad
   * @returns {string[]} Array of 11 player IDs for balanced XI
   */
  selectBalancedPlayingXI: (players) => {
    if (players.length < 11) {
      console.error(`Cannot select XI from ${players.length} players (need at least 11)`);
      return players.map(p => p.id);
    }

    const playingXI = [];

    // Helper to get overall rating
    const getOverallRating = (player) => {
      const batting = player.attributes?.batting || {};
      const bowling = player.attributes?.bowling || {};
      const battingAvg = Object.values(batting).reduce((a, b) => a + b, 0) / Object.keys(batting).length || 0;
      const bowlingAvg = Object.values(bowling).reduce((a, b) => a + b, 0) / Object.keys(bowling).length || 0;
      return (battingAvg + bowlingAvg) / 2;
    };

    // 1. Select best wicketkeeper (MANDATORY)
    const wicketkeepers = players
      .filter(p => p.role === 'wicket-keeper')
      .sort((a, b) => getOverallRating(b) - getOverallRating(a));

    if (wicketkeepers.length === 0) {
      console.error('❌ CRITICAL: No wicketkeeper in squad! Squad composition is invalid.');
      // Fallback: take first 11 players anyway
      return players.slice(0, 11).map(p => p.id);
    }

    playingXI.push(wicketkeepers[0].id);

    // 2. Select best bowlers and all-rounders (aim for 5-6)
    const bowlers = players
      .filter(p => (p.role === 'bowler' || p.role === 'all-rounder') && !playingXI.includes(p.id))
      .sort((a, b) => getOverallRating(b) - getOverallRating(a));

    // Take top 5-6 bowlers/all-rounders
    const bowlersToSelect = Math.min(6, bowlers.length);
    for (let i = 0; i < bowlersToSelect && playingXI.length < 11; i++) {
      playingXI.push(bowlers[i].id);
    }

    // 3. Fill remaining spots with best batsmen
    const batsmen = players
      .filter(p => p.role === 'batsman' && !playingXI.includes(p.id))
      .sort((a, b) => getOverallRating(b) - getOverallRating(a));

    for (const batsman of batsmen) {
      if (playingXI.length >= 11) break;
      playingXI.push(batsman.id);
    }

    // 4. If still not 11, fill with anyone left
    if (playingXI.length < 11) {
      const remaining = players
        .filter(p => !playingXI.includes(p.id))
        .sort((a, b) => getOverallRating(b) - getOverallRating(a));

      for (const player of remaining) {
        if (playingXI.length >= 11) break;
        playingXI.push(player.id);
      }
    }

    console.log(`✅ Selected balanced XI: 1 WK, ${bowlers.filter(b => playingXI.includes(b.id)).length} bowlers/AR, ${batsmen.filter(b => playingXI.includes(b.id)).length} batsmen`);
    return playingXI;
  },

  /**
   * Initialize default tactics for a team from player data
   * @param {string} teamId - Team ID
   * @param {Object[]} players - Array of player objects
   * @param {string[]} squadIds - Array of 11 player IDs for playing XI (optional, will auto-select if null)
   */
  initializeDefaultTactics: (teamId, players, squadIds = null) => {
    // If no squad specified, select balanced XI
    const playingXI = squadIds || get().selectBalancedPlayingXI(players);

    // Initialize tactics with player defaults
    const tactics = {
      squadSelection: playingXI,
      playstyleOverrides: {}, // Empty - using primary playstyles
      battingOrder: [...playingXI], // Same order as squad initially
      accelerationTiers: {},
      bowlingPlans: {},
      bowlingRotation: [],
      fieldFormation: 'neutral_orthodox'
    };

    // Set default acceleration tiers and bowling plans from player data
    players.forEach(player => {
      if (playingXI.includes(player.id)) {
        // Set default batting tier
        tactics.accelerationTiers[player.id] = player.tactics?.defaultBattingTier || 'Rotate';

        // Set default bowling plans for bowlers/all-rounders
        if (player.role === 'bowler' || player.role === 'all-rounder') {
          // Use player's preset plans if they exist, otherwise use playstyle-based defaults
          tactics.bowlingPlans[player.id] = player.tactics?.defaultBowlingPlans
            || get().getDefaultBowlingPlansForPlaystyle(player);

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
        // Use initializeDefaultTactics with auto-balanced XI selection
        // Pass null for squadIds to trigger automatic balanced selection
        get().initializeDefaultTactics(teamId, players, null);
      }
    });

    console.log(`✅ Initialized tactics for ${Object.keys(state.teams).length} teams`);
  },

  /**
   * Validate that a playing XI has required roles
   * @param {string[]} playerIds - Array of 11 player IDs
   * @param {Object} playerStore - Player store to get player objects
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validatePlayingXI: (playerIds, playerStore) => {
    const errors = [];
    const players = playerIds.map(id => playerStore.players[id]).filter(Boolean);

    if (players.length !== 11) {
      errors.push(`Playing XI must have exactly 11 players (has ${players.length})`);
    }

    // Check for wicketkeeper
    const wicketkeepers = players.filter(p => p.role === 'wicket-keeper');
    if (wicketkeepers.length === 0) {
      errors.push('Playing XI must have at least 1 wicketkeeper');
    } else if (wicketkeepers.length > 1) {
      errors.push(`Playing XI should have only 1 wicketkeeper (has ${wicketkeepers.length})`);
    }

    // Check for bowling options
    const bowlers = players.filter(p => p.role === 'bowler' || p.role === 'all-rounder');
    if (bowlers.length < 5) {
      errors.push(`Playing XI should have at least 5 bowlers/all-rounders (has ${bowlers.length})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
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
      const currentBowlingRotation = currentTactics?.bowlingRotation || [];

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

      // Filter bowling rotation to only include players in the new squad
      const newBowlingRotation = currentBowlingRotation.filter(playerId =>
        playerIds.includes(playerId)
      );

      return {
        teamTactics: {
          ...state.teamTactics,
          [teamId]: {
            ...currentTactics,
            squadSelection: playerIds,
            battingOrder: newBattingOrder,
            accelerationTiers: newAccelerationTiers,
            bowlingPlans: newBowlingPlans,
            playstyleOverrides: newPlaystyleOverrides,
            bowlingRotation: newBowlingRotation
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
   * @param {string} formation - Formation ID (e.g., 'attacking_pace_cordon', 'neutral_orthodox', 'defensive_ring_fence')
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
   * Auto-assign bowling rotation using intelligent selection algorithm
   * Assigns all 20 overs to bowlers from playing XI based on their attributes and playstyles
   * @param {string} teamId - Team ID
   * @returns {string[]} Array of 20 player IDs (one per over)
   */
  autoAssignBowlingRotation: (teamId) => {
    const state = get();
    const playerStore = usePlayerStore.getState();
    const tactics = state.teamTactics[teamId];

    if (!tactics || !tactics.squadSelection) {
      console.warn(`Cannot auto-assign bowling rotation for team ${teamId}: no tactics or squad`);
      return [];
    }

    // Get all players from playing XI
    const playingXI = tactics.squadSelection
      .map(id => playerStore.players[id])
      .filter(Boolean);

    // Helper function to get bowling rating
    const getBowlingRating = (player) => {
      const bowlingAttrs = player.attributes?.bowling || {};
      const values = Object.values(bowlingAttrs);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    // Categorize into primary bowlers and part-timers
    // Include ALL players from playing XI as potential bowlers
    const primaryBowlers = [];
    const partTimers = [];

    playingXI.forEach(player => {
      const isPrimary = player.role === 'bowler' || player.role === 'all-rounder';
      const bowlingRating = getBowlingRating(player);

      if (isPrimary) {
        primaryBowlers.push({ player, bowlingRating });
      } else {
        // Include all non-bowlers as part-timers (batsmen, wicket-keepers)
        // They'll be penalized in scoring but available as fallback
        partTimers.push({ player, bowlingRating });
      }
    });

    // Sort by bowling rating
    primaryBowlers.sort((a, b) => b.bowlingRating - a.bowlingRating);
    partTimers.sort((a, b) => b.bowlingRating - a.bowlingRating);

    // Combine eligible bowlers (primary first, then part-timers)
    const eligibleBowlers = [...primaryBowlers.map(b => b.player), ...partTimers.map(b => b.player)];

    if (eligibleBowlers.length === 0) {
      console.warn(`No eligible bowlers found for team ${teamId}`);
      return [];
    }

    // Auto-assign algorithm
    const newAssignments = [];
    const oversBowled = {};
    const maxOversPerBowler = 4;
    let previousBowler = null;

    // Initialize overs bowled
    eligibleBowlers.forEach(bowler => {
      oversBowled[bowler.id] = 0;
    });

    // Assign each over (0-19)
    for (let overIndex = 0; overIndex < 20; overIndex++) {
      // Determine phase for this over
      let phase = 'powerplay';
      if (overIndex >= 6 && overIndex < 12) phase = 'middle';
      else if (overIndex >= 12 && overIndex < 16) phase = 'middle';
      else if (overIndex >= 16) phase = 'death';

      // Score each eligible bowler
      const scoredBowlers = eligibleBowlers
        .filter(bowler =>
          bowler.id !== previousBowler &&
          oversBowled[bowler.id] < maxOversPerBowler
        )
        .map(bowler => {
          const bowlerPlaystyle = bowler.primaryPlaystyle?.bowling || '';
          const bowlingRating = getBowlingRating(bowler);

          // Rotation bonus - MUST be dominant to ensure even distribution
          // With 5 bowlers and 20 overs, we need 4-4-4-4-4 distribution
          // Strong weight (×20) ensures rotation takes priority over quality
          let score = (maxOversPerBowler - oversBowled[bowler.id]) * 20;

          // Base score from bowling rating (secondary consideration)
          score += bowlingRating / 10;

          // Phase-based bonuses (tertiary consideration)
          const phaseBonuses = {
            powerplay: { 'Swing Bowler': 3, 'Wicket-Taker': 3 },
            middle: { 'Flat Spinner': 2, 'Containment Spinner': 2, 'Hit-the-Deck Seamer': 2 },
            death: { 'Death Specialist': 4, 'Yorker Specialist': 3 },
          };
          score += phaseBonuses[phase]?.[bowlerPlaystyle] || 0;

          // Heavy penalty for part-timers (batsmen, wicket-keepers)
          // This ensures they're only used as absolute last resort
          if (bowler.role !== 'bowler' && bowler.role !== 'all-rounder') {
            score -= 10;
          }

          return { bowler, score };
        });

      // Sort by score and select best
      scoredBowlers.sort((a, b) => b.score - a.score);

      if (scoredBowlers.length > 0) {
        const selectedBowler = scoredBowlers[0].bowler;
        newAssignments[overIndex] = selectedBowler.id;
        oversBowled[selectedBowler.id]++;
        previousBowler = selectedBowler.id;
      } else {
        // No valid bowler found - this should NEVER happen with 11 players
        // (11 players × 4 overs each = 44 available overs, we only need 20)
        console.error(
          `❌ CRITICAL: Cannot assign bowler for over ${overIndex + 1}. ` +
          `This violates cricket rules (no consecutive overs, max 4 overs per bowler). ` +
          `Team ${teamId} squad composition may be invalid.`
        );
        console.error('Current overs bowled:', oversBowled);
        console.error('Previous bowler:', previousBowler);

        // Return incomplete rotation - match will fail at initialization
        return newAssignments;
      }
    }

    return newAssignments;
  },

  /**
   * Ensure bowling rotation has all 20 overs assigned
   * Auto-completes any missing assignments before match starts
   * Also validates that all assigned bowlers are in the current playing XI
   * @param {string} teamId - Team ID
   */
  ensureCompleteBowlingRotation: (teamId) => {
    const state = get();
    const tactics = state.teamTactics[teamId];

    if (!tactics) {
      console.warn(`Cannot ensure bowling rotation for team ${teamId}: no tactics found`);
      return;
    }

    const currentRotation = tactics.bowlingRotation || [];
    const playingXI = tactics.squadSelection || [];

    // Check if we need to complete/re-assign the rotation
    let needsReassignment = false;

    // Check 1: Are there 20 overs?
    if (currentRotation.length < 20) {
      needsReassignment = true;
      console.log(`Bowling rotation for team ${teamId} has ${currentRotation.length} overs, needs 20`);
    }

    // Check 2: Are any overs unassigned (null)?
    if (!needsReassignment) {
      const hasNulls = currentRotation.some((bowlerId, index) => index < 20 && !bowlerId);
      if (hasNulls) {
        needsReassignment = true;
        console.log(`Bowling rotation for team ${teamId} has unassigned overs`);
      }
    }

    // Check 3: Are all assigned bowlers in the current playing XI?
    if (!needsReassignment) {
      const invalidBowlers = currentRotation
        .filter((bowlerId, index) => index < 20 && bowlerId) // Only check first 20 overs, skip nulls
        .filter(bowlerId => !playingXI.includes(bowlerId));

      if (invalidBowlers.length > 0) {
        needsReassignment = true;
        console.log(`Bowling rotation for team ${teamId} contains ${invalidBowlers.length} bowler(s) not in playing XI - re-assigning`);
      }
    }

    if (needsReassignment) {
      // Auto-assign complete rotation
      const completeRotation = get().autoAssignBowlingRotation(teamId);

      if (completeRotation.length === 20) {
        get().updateBowlingRotation(teamId, completeRotation);
        console.log(`✓ Auto-completed bowling rotation for team ${teamId}`);
      } else {
        console.warn(`⚠ Failed to auto-complete bowling rotation for team ${teamId}`);
      }
    } else {
      console.log(`✓ Bowling rotation for team ${teamId} is complete and valid`);
    }
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