/**
 * @file playerStore.js
 * @description Store for all players and attributes management
 * @module stores/playerStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import playstyleCalculator from '../utils/PlaystyleCalculator.js';

/**
 * @typedef {Object} PlayerStore
 * @property {Object.<string, Player>} players - All players indexed by ID
 * @property {string[]} availablePlayers - Players not assigned to any team
 * @property {Object} filters - Current player filtering options
 */

const usePlayerStore = create(
  persist(
    (set, get) => ({
  // Player Data
  players: {},
  availablePlayers: [],

  // Career Stats (NEVER reset on transfer)
  careerStats: {}, // playerId -> { cumulative, seasons }
  currentSeasonId: null,

  // Filtering and Search
  filters: {
    role: 'all',
    nationality: 'all',
    ageMin: 18,
    ageMax: 40,
    searchTerm: ''
  },

  // Actions
  /**
   * Initialize players from master database
   * @param {Player[]} playersData - Array of player objects (from master_player_database.json)
   */
  initializePlayers: (playersData) => set(() => {
    const playersMap = {};
    const available = [];
    let bowlingTypeAssigned = 0;

    playersData.forEach(player => {
      // Assign random bowlingType if null
      if (player.bowlingType === null || player.bowlingType === undefined) {
        player.bowlingType = Math.random() < 0.5 ? 'pace' : 'spin';
        bowlingTypeAssigned++;
      }

      // Players from master database already have playstyleRatings, topPlaystyles, and primaryPlaystyle
      playersMap[player.id] = player;
      if (!player.currentTeam) {
        available.push(player.id);
      }
    });

    console.log(`✅ Initialized ${playersData.length} players with pre-calculated playstyle data`);
    if (bowlingTypeAssigned > 0) {
      console.log(`✅ Assigned random bowlingType to ${bowlingTypeAssigned} players`);
    }

    return {
      players: playersMap,
      availablePlayers: available
    };
  }),

  /**
   * Get player by ID
   * @param {string} playerId - Player ID
   * @returns {Player|null} Player object or null
   */
  getPlayer: (playerId) => {
    const state = get();
    return state.players[playerId] || null;
  },

  /**
   * Get players by team ID
   * @param {string} teamId - Team ID
   * @returns {Player[]} Array of players
   */
  getPlayersByTeam: (teamId) => {
    const state = get();
    return Object.values(state.players).filter(player => player.currentTeam === teamId);
  },

  /**
   * Update player information
   * @param {string} playerId - Player ID
   * @param {Object} updates - Fields to update
   */
  updatePlayer: (playerId, updates) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], ...updates }
    }
  })),

  /**
   * Update player attributes
   * @param {string} playerId - Player ID
   * @param {Object} attributeUpdates - Attribute changes
   */
  updatePlayerAttributes: (playerId, attributeUpdates) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        attributes: {
          ...state.players[playerId].attributes,
          ...attributeUpdates
        }
      }
    }
  })),

  /**
   * Update player condition
   * @param {string} playerId - Player ID
   * @param {Object} conditionUpdates - Condition changes
   */
  updatePlayerCondition: (playerId, conditionUpdates) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        condition: {
          ...state.players[playerId].condition,
          ...conditionUpdates
        }
      }
    }
  })),

  /**
   * Assign player to team
   * @param {string} playerId - Player ID
   * @param {string} teamId - Team ID
   */
  assignPlayerToTeam: (playerId, teamId) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], currentTeam: teamId }
    },
    availablePlayers: state.availablePlayers.filter(id => id !== playerId)
  })),

  /**
   * Release player from team
   * @param {string} playerId - Player ID
   */
  releasePlayer: (playerId) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], currentTeam: null }
    },
    availablePlayers: [...state.availablePlayers, playerId]
  })),

  /**
   * Set current season ID (for career stats tracking)
   * @param {string} seasonId - Season identifier (e.g., 'wpl_2025')
   */
  setCurrentSeasonId: (seasonId) => set(() => ({
    currentSeasonId: seasonId
  })),

  /**
   * Initialize career stats for a player
   * @param {string} playerId - Player ID
   */
  initializeCareerStats: (playerId) => set((state) => {
    if (state.careerStats[playerId]) {
      return state; // Already initialized
    }

    return {
      careerStats: {
        ...state.careerStats,
        [playerId]: {
          cumulative: {
            totalMatches: 0,
            totalRuns: 0,
            totalBallsFaced: 0,
            careerBattingAvg: 0,
            careerStrikeRate: 0,
            totalWickets: 0,
            totalBallsBowled: 0,
            totalRunsConceded: 0,
            careerEconomy: 0,
            careerBowlingAvg: 0,
            centuries: 0,
            fifties: 0,
            fiveWickets: 0,
            notOuts: 0
          },
          seasons: {}
        }
      }
    };
  }),

  /**
   * Update career stats for a player after a match
   * @param {string} playerId - Player ID
   * @param {Object} matchStats - Stats from the match
   * @param {number} matchStats.runs - Runs scored
   * @param {number} matchStats.ballsFaced - Balls faced
   * @param {boolean} matchStats.dismissed - Whether player was dismissed
   * @param {number} matchStats.wickets - Wickets taken
   * @param {number} matchStats.ballsBowled - Balls bowled
   * @param {number} matchStats.runsConceded - Runs conceded
   */
  updateCareerStats: (playerId, matchStats) => set((state) => {
    const seasonId = state.currentSeasonId;
    if (!seasonId) {
      console.warn('No current season ID set, cannot update career stats');
      return state;
    }

    // Initialize if needed
    if (!state.careerStats[playerId]) {
      get().initializeCareerStats(playerId);
      return get(); // Get updated state
    }

    const current = state.careerStats[playerId];
    const cumulative = { ...current.cumulative };
    const seasons = { ...current.seasons };

    // Initialize season if needed
    if (!seasons[seasonId]) {
      seasons[seasonId] = {
        matches: 0,
        runs: 0,
        ballsFaced: 0,
        battingAvg: 0,
        strikeRate: 0,
        wickets: 0,
        ballsBowled: 0,
        runsConceded: 0,
        economy: 0,
        bowlingAvg: 0,
        centuries: 0,
        fifties: 0,
        fiveWickets: 0,
        notOuts: 0
      };
    }

    const seasonStats = { ...seasons[seasonId] };

    // Update cumulative and season matches
    cumulative.totalMatches += 1;
    seasonStats.matches += 1;

    // Update batting stats
    if (matchStats.runs !== undefined && matchStats.runs !== null) {
      cumulative.totalRuns += matchStats.runs;
      seasonStats.runs += matchStats.runs;
    }

    if (matchStats.ballsFaced !== undefined && matchStats.ballsFaced !== null) {
      cumulative.totalBallsFaced += matchStats.ballsFaced;
      seasonStats.ballsFaced += matchStats.ballsFaced;
    }

    if (matchStats.dismissed !== undefined && matchStats.dismissed !== null) {
      if (!matchStats.dismissed) {
        cumulative.notOuts += 1;
        seasonStats.notOuts += 1;
      }
    }

    // Check for milestones
    if (matchStats.runs >= 100) {
      cumulative.centuries += 1;
      seasonStats.centuries += 1;
    } else if (matchStats.runs >= 50) {
      cumulative.fifties += 1;
      seasonStats.fifties += 1;
    }

    // Update bowling stats
    if (matchStats.wickets !== undefined && matchStats.wickets !== null) {
      cumulative.totalWickets += matchStats.wickets;
      seasonStats.wickets += matchStats.wickets;

      if (matchStats.wickets >= 5) {
        cumulative.fiveWickets += 1;
        seasonStats.fiveWickets += 1;
      }
    }

    if (matchStats.ballsBowled !== undefined && matchStats.ballsBowled !== null) {
      cumulative.totalBallsBowled += matchStats.ballsBowled;
      seasonStats.ballsBowled += matchStats.ballsBowled;
    }

    if (matchStats.runsConceded !== undefined && matchStats.runsConceded !== null) {
      cumulative.totalRunsConceded += matchStats.runsConceded;
      seasonStats.runsConceded += matchStats.runsConceded;
    }

    // Calculate averages for cumulative
    const dismissals = cumulative.totalMatches - cumulative.notOuts;
    cumulative.careerBattingAvg = dismissals > 0
      ? Number((cumulative.totalRuns / dismissals).toFixed(2))
      : cumulative.totalRuns;

    cumulative.careerStrikeRate = cumulative.totalBallsFaced > 0
      ? Number(((cumulative.totalRuns / cumulative.totalBallsFaced) * 100).toFixed(2))
      : 0;

    cumulative.careerEconomy = cumulative.totalBallsBowled > 0
      ? Number(((cumulative.totalRunsConceded / cumulative.totalBallsBowled) * 6).toFixed(2))
      : 0;

    cumulative.careerBowlingAvg = cumulative.totalWickets > 0
      ? Number((cumulative.totalRunsConceded / cumulative.totalWickets).toFixed(2))
      : 0;

    // Calculate averages for season
    const seasonDismissals = seasonStats.matches - seasonStats.notOuts;
    seasonStats.battingAvg = seasonDismissals > 0
      ? Number((seasonStats.runs / seasonDismissals).toFixed(2))
      : seasonStats.runs;

    seasonStats.strikeRate = seasonStats.ballsFaced > 0
      ? Number(((seasonStats.runs / seasonStats.ballsFaced) * 100).toFixed(2))
      : 0;

    seasonStats.economy = seasonStats.ballsBowled > 0
      ? Number(((seasonStats.runsConceded / seasonStats.ballsBowled) * 6).toFixed(2))
      : 0;

    seasonStats.bowlingAvg = seasonStats.wickets > 0
      ? Number((seasonStats.runsConceded / seasonStats.wickets).toFixed(2))
      : 0;

    seasons[seasonId] = seasonStats;

    return {
      careerStats: {
        ...state.careerStats,
        [playerId]: {
          cumulative,
          seasons
        }
      }
    };
  }),

  /**
   * Get cumulative career stats for a player
   * @param {string} playerId - Player ID
   * @returns {Object|null} Cumulative career stats or null
   */
  getCareerStats: (playerId) => {
    const state = get();
    return state.careerStats[playerId]?.cumulative || null;
  },

  /**
   * Get season-specific stats for a player
   * @param {string} playerId - Player ID
   * @param {string} seasonId - Season identifier (optional, uses current if not provided)
   * @returns {Object|null} Season stats or null
   */
  getSeasonStats: (playerId, seasonId = null) => {
    const state = get();
    const season = seasonId || state.currentSeasonId;

    if (!season) {
      console.warn('No season ID provided or current season not set');
      return null;
    }

    return state.careerStats[playerId]?.seasons[season] || null;
  },

  /**
   * Get all season stats for a player
   * @param {string} playerId - Player ID
   * @returns {Object} All season stats or empty object
   */
  getAllSeasonStats: (playerId) => {
    const state = get();
    return state.careerStats[playerId]?.seasons || {};
  },

  /**
   * Update search filters
   * @param {Object} newFilters - Filter updates
   */
  updateFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  /**
   * Get filtered players
   * @returns {Player[]} Filtered array of players
   */
  getFilteredPlayers: () => {
    const state = get();
    const { players, filters } = state;

    return Object.values(players).filter(player => {
      // Apply role filter
      if (filters.role !== 'all' && player.role !== filters.role) return false;

      // Apply nationality filter
      if (filters.nationality !== 'all' && player.nationality !== filters.nationality) return false;

      // Apply age filter
      if (player.age < filters.ageMin || player.age > filters.ageMax) return false;

      // Apply search term
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!player.name.toLowerCase().includes(searchLower) &&
            !player.fullName.toLowerCase().includes(searchLower)) return false;
      }

      return true;
    });
  },

  /**
   * Get playstyle data for a player (uses pre-calculated data from master database)
   * @param {string} playerId - Player ID
   * @returns {Object} Playstyle data object with ratings, top styles, and primary
   */
  calculatePlayerPlaystyles: (playerId) => {
    const state = get();
    const player = state.players[playerId];

    if (!player) {
      console.warn(`Player ${playerId} not found`);
      return null;
    }

    // If player already has playstyle data from master database, return it
    if (player.playstyleRatings && player.topPlaystyles && player.primaryPlaystyle) {
      return {
        ratings: player.playstyleRatings,
        topStyles: player.topPlaystyles,
        primary: player.primaryPlaystyle
      };
    }

    // Fallback: Calculate on-the-fly for players without pre-calculated data
    console.warn(`Player ${player.name} missing playstyle data, calculating on-the-fly`);
    const ratings = playstyleCalculator.calculateAllPlaystyleRatings(player);
    const primaryPlaystyles = playstyleCalculator.getPlayerPrimaryPlaystyles(
      player,
      player.role,
      3
    );

    return {
      ratings,
      topStyles: {
        batting: primaryPlaystyles.batting.slice(0, 3),
        bowling: primaryPlaystyles.bowling.slice(0, 3)
      },
      primary: {
        batting: primaryPlaystyles.batting[0]?.name || null,
        bowling: primaryPlaystyles.bowling[0]?.name || null
      }
    };
  },

  /**
   * Update player playstyle ratings
   * @param {string} playerId - Player ID
   */
  updatePlayerPlaystyles: (playerId) => set((state) => {
    const player = state.players[playerId];

    if (!player) {
      console.warn(`Player ${playerId} not found`);
      return state;
    }

    // Calculate playstyle ratings
    const ratings = playstyleCalculator.calculateAllPlaystyleRatings(player);

    // Get primary playstyles
    const primaryPlaystyles = playstyleCalculator.getPlayerPrimaryPlaystyles(
      player,
      player.role,
      3
    );

    // Update player with playstyle data
    return {
      players: {
        ...state.players,
        [playerId]: {
          ...player,
          playstyleRatings: ratings,
          primaryPlaystyle: {
            batting: primaryPlaystyles.batting[0]?.name || null,
            bowling: primaryPlaystyles.bowling[0]?.name || null
          }
        }
      }
    };
  }),

  /**
   * Calculate and update playstyles for all players
   */
  updateAllPlayerPlaystyles: () => {
    const state = get();
    const playerIds = Object.keys(state.players);

    playerIds.forEach(playerId => {
      get().updatePlayerPlaystyles(playerId);
    });

    console.log(`✅ Updated playstyles for ${playerIds.length} players`);
  },

  /**
   * Get player playstyle breakdown
   * @param {string} playerId - Player ID
   * @param {string} category - 'batting' or 'bowling'
   * @param {string} playstyleName - Playstyle name
   * @returns {Object} Detailed breakdown
   */
  getPlayerPlaystyleBreakdown: (playerId, category, playstyleName) => {
    const state = get();
    const player = state.players[playerId];

    if (!player) {
      return null;
    }

    return playstyleCalculator.getPlaystyleBreakdown(player, category, playstyleName);
  },

  /**
   * Get top playstyles for a player (from pre-calculated master database)
   * @param {string} playerId - Player ID
   * @param {string} category - 'batting' or 'bowling' (optional, returns both if not specified)
   * @returns {Array|Object} Top 3 playstyles for specified category or both
   */
  getPlayerTopPlaystyles: (playerId, category = null) => {
    const state = get();
    const player = state.players[playerId];

    if (!player || !player.topPlaystyles) {
      return category ? [] : { batting: [], bowling: [] };
    }

    if (category) {
      return player.topPlaystyles[category] || [];
    }

    return player.topPlaystyles;
  },

  /**
   * Get primary playstyle for a player (from pre-calculated master database)
   * @param {string} playerId - Player ID
   * @returns {Object} Primary playstyle { batting, bowling }
   */
  getPlayerPrimaryPlaystyle: (playerId) => {
    const state = get();
    const player = state.players[playerId];

    if (!player || !player.primaryPlaystyle) {
      return { batting: null, bowling: null };
    }

    return player.primaryPlaystyle;
  }
    }),
    {
      name: 'cm25-player-store',
      version: 1,
      // Exclude filters from persistence (UI state only)
      partialize: (state) => ({
        players: state.players,
        availablePlayers: state.availablePlayers,
        careerStats: state.careerStats,
        currentSeasonId: state.currentSeasonId
      })
    }
  )
);

export default usePlayerStore;