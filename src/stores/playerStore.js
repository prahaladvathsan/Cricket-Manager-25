/**
 * @file playerStore.js
 * @description Store for all players and attributes management
 * @module stores/playerStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import playstyleCalculator from '../utils/PlaystyleCalculator.js';
import { compressedStorageOptions } from '../utils/compression.js';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

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
  initializePlayers: (playersData) => set((state) => {
    // Preserve game state from hydrated players (currentTeam, soldPrice, condition)
    // Worker data has fresh attributes + custom patches; hydrated data has game state
    const existingPlayers = state.players || {};
    const hasExisting = Object.keys(existingPlayers).length > 0;

    const playersMap = {};
    const available = [];
    let bowlingTypeAssigned = 0;
    let primaryPlaystylesFilled = 0;

    playersData.forEach(player => {
      // Assign random bowlingType if null
      if (player.bowlingType === null || player.bowlingType === undefined) {
        player.bowlingType = Math.random() < 0.5 ? 'pace' : 'spin';
        bowlingTypeAssigned++;
      }

      // Ensure all players have primary playstyles in all disciplines
      // Primary playstyle = highest rated playstyle in each discipline
      if (!player.primaryPlaystyle) {
        player.primaryPlaystyle = { batting: null, bowling: null, fielding: null };
      }

      // Fill missing batting primary playstyle
      if (!player.primaryPlaystyle.batting && player.playstyleRatings?.batting) {
        const battingRatings = player.playstyleRatings.batting;
        let highestRating = 0;
        let highestPlaystyle = null;

        for (const [playstyleName, rating] of Object.entries(battingRatings)) {
          if (rating > highestRating) {
            highestRating = rating;
            highestPlaystyle = playstyleName;
          }
        }

        if (highestPlaystyle) {
          player.primaryPlaystyle.batting = highestPlaystyle;
          primaryPlaystylesFilled++;
        }
      }

      // Fill missing bowling primary playstyle
      if (!player.primaryPlaystyle.bowling && player.playstyleRatings?.bowling) {
        const bowlingRatings = player.playstyleRatings.bowling;
        let highestRating = 0;
        let highestPlaystyle = null;

        for (const [playstyleName, rating] of Object.entries(bowlingRatings)) {
          if (rating > highestRating) {
            highestRating = rating;
            highestPlaystyle = playstyleName;
          }
        }

        if (highestPlaystyle) {
          player.primaryPlaystyle.bowling = highestPlaystyle;
          primaryPlaystylesFilled++;
        }
      }

      // Fill missing fielding primary playstyle (mainly for wicket-keepers)
      if (!player.primaryPlaystyle.fielding && player.playstyleRatings?.fielding) {
        const fieldingRatings = player.playstyleRatings.fielding;
        let highestRating = 0;
        let highestPlaystyle = null;

        for (const [playstyleName, rating] of Object.entries(fieldingRatings)) {
          if (rating > highestRating) {
            highestRating = rating;
            highestPlaystyle = playstyleName;
          }
        }

        if (highestPlaystyle) {
          player.primaryPlaystyle.fielding = highestPlaystyle;
          primaryPlaystylesFilled++;
        }
      }

      // Preserve game state from hydrated data for existing players
      if (hasExisting && existingPlayers[player.id]) {
        const existing = existingPlayers[player.id];
        if (existing.currentTeam) player.currentTeam = existing.currentTeam;
        if (existing.soldPrice) player.soldPrice = existing.soldPrice;
        if (existing.condition) player.condition = existing.condition;
      }

      playersMap[player.id] = player;
      if (!player.currentTeam) {
        available.push(player.id);
      }
    });

    console.log(`✅ Initialized ${playersData.length} players (preserved game state for ${hasExisting ? 'existing session' : 'new game'})`);

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
   * Set player's sold price from auction
   * @param {string} playerId - Player ID
   * @param {number} soldPrice - Sold price in dollars
   */
  setPlayerSoldPrice: (playerId, soldPrice) => set((state) => ({
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], soldPrice }
    }
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
            fourWickets: 0,
            notOuts: 0,
            highestScore: 0,
            highestScoreNotOut: false,
            bestBowling: null
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
      // Don't return early - continue to update stats below
      state = get(); // Refresh state after initialization
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
        fourWickets: 0,
        notOuts: 0,
        highestScore: 0,
        highestScoreNotOut: false,
        bestBowling: null,
        // Fielding stats
        catches: 0,
        runOuts: 0,
        // Impact metrics (DLS-based)
        battingImpact: 0,
        bowlingImpact: 0,
        fieldingImpact: 0,
        totalImpact: 0
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

    // Update highest score
    if (matchStats.runs !== undefined && matchStats.runs !== null) {
      if (matchStats.runs > (seasonStats.highestScore || 0)) {
        seasonStats.highestScore = matchStats.runs;
        seasonStats.highestScoreNotOut = !matchStats.dismissed;
      }
    }

    // Update bowling stats
    if (matchStats.wickets !== undefined && matchStats.wickets !== null) {
      cumulative.totalWickets += matchStats.wickets;
      seasonStats.wickets += matchStats.wickets;

      if (matchStats.wickets >= 5) {
        cumulative.fiveWickets += 1;
        seasonStats.fiveWickets += 1;
      } else if (matchStats.wickets >= 4) {
        seasonStats.fourWickets = (seasonStats.fourWickets || 0) + 1;
      }

      // Update best bowling figures
      if (matchStats.wickets > 0) {
        if (!seasonStats.bestBowling ||
            matchStats.wickets > seasonStats.bestBowling.wickets ||
            (matchStats.wickets === seasonStats.bestBowling.wickets &&
             matchStats.runsConceded < seasonStats.bestBowling.runs)) {
          seasonStats.bestBowling = {
            wickets: matchStats.wickets,
            runs: matchStats.runsConceded || 0
          };
        }
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

    // Update fielding stats
    if (matchStats.catches !== undefined && matchStats.catches > 0) {
      seasonStats.catches = (seasonStats.catches || 0) + matchStats.catches;
    }
    if (matchStats.runOuts !== undefined && matchStats.runOuts > 0) {
      seasonStats.runOuts = (seasonStats.runOuts || 0) + matchStats.runOuts;
    }

    // Update impact stats (DLS-based metrics)
    if (matchStats.battingImpact !== undefined) {
      seasonStats.battingImpact = (seasonStats.battingImpact || 0) + matchStats.battingImpact;
    }
    if (matchStats.bowlingImpact !== undefined) {
      seasonStats.bowlingImpact = (seasonStats.bowlingImpact || 0) + matchStats.bowlingImpact;
    }
    if (matchStats.fieldingImpact !== undefined) {
      seasonStats.fieldingImpact = (seasonStats.fieldingImpact || 0) + matchStats.fieldingImpact;
    }
    // Calculate total impact
    seasonStats.totalImpact = (seasonStats.battingImpact || 0) +
                              (seasonStats.bowlingImpact || 0) +
                              (seasonStats.fieldingImpact || 0);

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
   * Batch update career stats for multiple players in a single setState call
   * This reduces localStorage writes significantly during match simulation
   * @param {Object} allPlayerStats - Map of playerId -> matchStats
   */
  batchUpdateCareerStats: (allPlayerStats) => set((state) => {
    const seasonId = state.currentSeasonId;
    if (!seasonId) {
      console.warn('No current season ID set, cannot batch update career stats');
      return state;
    }

    const newCareerStats = { ...state.careerStats };

    Object.entries(allPlayerStats).forEach(([playerId, matchStats]) => {
      // Initialize if needed
      if (!newCareerStats[playerId]) {
        newCareerStats[playerId] = {
          cumulative: {
            totalMatches: 0,
            totalRuns: 0,
            totalBallsFaced: 0,
            notOuts: 0,
            totalWickets: 0,
            totalBallsBowled: 0,
            totalRunsConceded: 0,
            centuries: 0,
            fifties: 0,
            fiveWickets: 0,
            careerBattingAvg: 0,
            careerStrikeRate: 0,
            careerEconomy: 0,
            careerBowlingAvg: 0
          },
          seasons: {}
        };
      }

      const current = newCareerStats[playerId];
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
          fourWickets: 0,
          notOuts: 0,
          highestScore: 0,
          highestScoreNotOut: false,
          bestBowling: null,
          catches: 0,
          runOuts: 0,
          battingImpact: 0,
          bowlingImpact: 0,
          fieldingImpact: 0,
          totalImpact: 0
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

      // Update highest score
      if (matchStats.runs !== undefined && matchStats.runs !== null) {
        if (matchStats.runs > (seasonStats.highestScore || 0)) {
          seasonStats.highestScore = matchStats.runs;
          seasonStats.highestScoreNotOut = !matchStats.dismissed;
        }
      }

      // Update bowling stats
      if (matchStats.wickets !== undefined && matchStats.wickets !== null) {
        cumulative.totalWickets += matchStats.wickets;
        seasonStats.wickets += matchStats.wickets;

        if (matchStats.wickets >= 5) {
          cumulative.fiveWickets += 1;
          seasonStats.fiveWickets += 1;
        } else if (matchStats.wickets >= 4) {
          seasonStats.fourWickets = (seasonStats.fourWickets || 0) + 1;
        }

        // Update best bowling figures
        if (matchStats.wickets > 0) {
          if (!seasonStats.bestBowling ||
              matchStats.wickets > seasonStats.bestBowling.wickets ||
              (matchStats.wickets === seasonStats.bestBowling.wickets &&
               matchStats.runsConceded < seasonStats.bestBowling.runs)) {
            seasonStats.bestBowling = {
              wickets: matchStats.wickets,
              runs: matchStats.runsConceded || 0
            };
          }
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

      // Update fielding stats
      if (matchStats.catches !== undefined && matchStats.catches > 0) {
        seasonStats.catches = (seasonStats.catches || 0) + matchStats.catches;
      }
      if (matchStats.runOuts !== undefined && matchStats.runOuts > 0) {
        seasonStats.runOuts = (seasonStats.runOuts || 0) + matchStats.runOuts;
      }

      // Update impact stats
      if (matchStats.battingImpact !== undefined) {
        seasonStats.battingImpact = (seasonStats.battingImpact || 0) + matchStats.battingImpact;
      }
      if (matchStats.bowlingImpact !== undefined) {
        seasonStats.bowlingImpact = (seasonStats.bowlingImpact || 0) + matchStats.bowlingImpact;
      }
      if (matchStats.fieldingImpact !== undefined) {
        seasonStats.fieldingImpact = (seasonStats.fieldingImpact || 0) + matchStats.fieldingImpact;
      }
      seasonStats.totalImpact = (seasonStats.battingImpact || 0) +
                                (seasonStats.bowlingImpact || 0) +
                                (seasonStats.fieldingImpact || 0);

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

      newCareerStats[playerId] = {
        cumulative,
        seasons
      };
    });

    return { careerStats: newCareerStats };
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
   * Reset all career stats for all players (for new game)
   */
  resetAllCareerStats: () => set(() => ({
    careerStats: {},
    currentSeasonId: null
  })),

  /**
   * Reset all player team assignments (for new game)
   */
  resetPlayerTeams: () => set((state) => {
    const newPlayers = { ...state.players };
    const newAvailable = [];

    Object.keys(newPlayers).forEach(id => {
      newPlayers[id] = { ...newPlayers[id], currentTeam: null };
      newAvailable.push(id);
    });

    return {
      players: newPlayers,
      availablePlayers: newAvailable
    };
  }),

  /**
   * Initialize condition attributes for all players (for new game)
   * Sets fitness to max, fatigue to 0, and clears any injuries
   */
  initializeAllPlayerConditions: () => set((state) => {
    const newPlayers = { ...state.players };

    Object.keys(newPlayers).forEach(id => {
      const player = newPlayers[id];
      const maxFitness = player.attributes?.physical?.maxFitness ?? 18;

      newPlayers[id] = {
        ...player,
        condition: {
          fitness: Math.min(maxFitness * 5, 100), // Full fitness (maxFitness × 5, capped at 100)
          fatigue: 0,
          injury: null,
          injuryDuration: null
        }
      };
    });

    console.log(`✅ Initialized condition attributes for ${Object.keys(newPlayers).length} players`);

    return {
      players: newPlayers
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
  },

  // ============================================
  // Custom Database Actions
  // ============================================

  /**
   * Update player with customization and save patch
   * @param {string} playerId - Player ID
   * @param {Object} changes - Partial player object with changes
   * @returns {Promise<void>}
   */
  updatePlayerCustomization: async (playerId, changes) => {
    const { default: customDatabaseManager } = await import('../utils/CustomDatabaseManager.js');

    // Apply patch to custom database (CustomDatabaseManager does proper deep merge)
    await customDatabaseManager.applyPlayerPatch(playerId, changes);

    // Update player in store immediately using recursive deep merge
    const state = get();
    const player = state.players[playerId];

    if (player) {
      // Recursive deep merge to preserve all existing nested attributes
      const deepMerge = (target, source) => {
        const output = { ...target };
        for (const key of Object.keys(source)) {
          if (
            source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
            target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
          ) {
            output[key] = deepMerge(target[key], source[key]);
          } else {
            output[key] = source[key];
          }
        }
        return output;
      };

      let updatedPlayer = deepMerge(player, changes);

      // If attributes changed, recalculate overall ratings and playstyles
      if (changes.attributes) {
        const battingAttrs = updatedPlayer.attributes.batting || {};
        const bowlingAttrs = updatedPlayer.attributes.bowling || {};

        // Weighted overall rating (matches CustomDatabaseManager.calculateOverallRatings)
        const battingWeights = {
          technique: 1.5, timing: 1.5, footwork: 1, placement: 1,
          range360: 0.8, defensiveShots: 1, neutralShots: 1, attackingShots: 1.2,
          vsPace: 1, vsSpin: 1, creativity: 0.5
        };
        const bowlingWeights = {
          accuracy: 1.5, bowlingSpeed: 1.2, swing: 1, turn: 1,
          flight: 0.8, variations: 1, intelligence: 1,
          defensiveBowling: 0.8, neutralBowling: 0.8, attackingBowling: 1
        };

        let batSum = 0, batW = 0;
        for (const [k, w] of Object.entries(battingWeights)) {
          if (battingAttrs[k] !== undefined) { batSum += battingAttrs[k] * w; batW += w; }
        }
        let bowlSum = 0, bowlW = 0;
        for (const [k, w] of Object.entries(bowlingWeights)) {
          if (bowlingAttrs[k] !== undefined) { bowlSum += bowlingAttrs[k] * w; bowlW += w; }
        }

        updatedPlayer.attributes = {
          ...updatedPlayer.attributes,
          overall: {
            batting_overall: batW > 0 ? Math.round(batSum / batW) : 10,
            bowling_overall: bowlW > 0 ? Math.round(bowlSum / bowlW) : 10
          }
        };

        // Recalculate playstyles
        const ratings = playstyleCalculator.calculateAllPlaystyleRatings(updatedPlayer);
        const primaryPlaystyles = playstyleCalculator.getPlayerPrimaryPlaystyles(
          updatedPlayer,
          updatedPlayer.role,
          3
        );

        updatedPlayer.playstyleRatings = ratings;
        updatedPlayer.topPlaystyles = {
          batting: primaryPlaystyles.batting,
          bowling: primaryPlaystyles.bowling,
          fielding: primaryPlaystyles.fielding || []
        };
        updatedPlayer.primaryPlaystyle = {
          batting: primaryPlaystyles.batting[0]?.name || null,
          bowling: primaryPlaystyles.bowling[0]?.name || null,
          fielding: primaryPlaystyles.fielding?.[0]?.name || null
        };
      }

      // Mark as modified
      updatedPlayer.isModified = true;

      set({
        players: {
          ...state.players,
          [playerId]: updatedPlayer
        }
      });

      console.log(`✏️ Player customization saved: ${playerId}`);
    }
  },

  /**
   * Reset a player to their default (master database) values
   * @param {string} playerId - Player ID
   * @returns {Promise<boolean>} True if reset, false if player is custom
   */
  resetPlayerToDefault: async (playerId) => {
    if (playerId.startsWith('custom_')) {
      console.warn('Cannot reset custom player. Use deleteCustomPlayer instead.');
      return false;
    }

    const { default: customDatabaseManager } = await import('../utils/CustomDatabaseManager.js');

    // Reset in custom database
    await customDatabaseManager.resetPlayer(playerId);

    // Reload the player from master database
    // This requires a full reload - for now, just remove the isModified flag
    // A full implementation would fetch the original from master DB
    const state = get();
    const player = state.players[playerId];

    if (player && player.isModified) {
      const updatedPlayer = { ...player };
      delete updatedPlayer.isModified;

      set({
        players: {
          ...state.players,
          [playerId]: updatedPlayer
        }
      });

      console.log(`🔄 Player reset to default: ${playerId}`);
      return true;
    }

    return false;
  },

  /**
   * Add a new custom player to the database
   * @param {Object} playerData - Player data (partial, defaults will be applied)
   * @returns {Promise<Object>} Created player object
   */
  addCustomPlayer: async (playerData) => {
    const { default: customDatabaseManager } = await import('../utils/CustomDatabaseManager.js');

    // Create player in custom database
    const newPlayer = await customDatabaseManager.createCustomPlayer(playerData);

    // Add to store
    const state = get();
    set({
      players: {
        ...state.players,
        [newPlayer.id]: newPlayer
      },
      availablePlayers: [...state.availablePlayers, newPlayer.id]
    });

    console.log(`✨ Custom player added: ${newPlayer.name} (${newPlayer.id})`);
    return newPlayer;
  },

  /**
   * Delete a custom player from the database
   * @param {string} playerId - Custom player ID to delete
   * @returns {Promise<boolean>} True if deleted
   */
  deleteCustomPlayer: async (playerId) => {
    if (!playerId.startsWith('custom_')) {
      console.warn('Can only delete custom players');
      return false;
    }

    const state = get();
    const player = state.players[playerId];

    if (player?.currentTeam) {
      throw new Error('Cannot delete player assigned to a team. Unassign first.');
    }

    const { default: customDatabaseManager } = await import('../utils/CustomDatabaseManager.js');

    // Delete from custom database
    const deleted = await customDatabaseManager.deleteCustomPlayer(playerId);

    if (deleted) {
      // Remove from store
      const newPlayers = { ...state.players };
      delete newPlayers[playerId];

      set({
        players: newPlayers,
        availablePlayers: state.availablePlayers.filter(id => id !== playerId)
      });

      console.log(`🗑️ Custom player deleted: ${playerId}`);
      return true;
    }

    return false;
  },

  /**
   * Get customization status summary
   * @returns {Promise<Object>} Status object with counts and IDs
   */
  getCustomizationStatus: async () => {
    const { default: customDatabaseManager } = await import('../utils/CustomDatabaseManager.js');
    return customDatabaseManager.getCustomizationStatus();
  },

  /**
   * Check if a specific player has customizations
   * @param {string} playerId - Player ID
   * @returns {Object} { isModified, isCustom }
   */
  isPlayerCustomized: (playerId) => {
    const state = get();
    const player = state.players[playerId];

    return {
      isModified: !!player?.isModified,
      isCustom: playerId.startsWith('custom_') || !!player?.isCustomPlayer
    };
  },

  /**
   * Reset all customizations (patches and custom players)
   * Note: This requires a reload of the player database
   * @returns {Promise<void>}
   */
  resetAllCustomizations: async () => {
    const { default: customDatabaseManager } = await import('../utils/CustomDatabaseManager.js');

    // Reset in custom database
    await customDatabaseManager.resetAllCustomizations();

    // Remove all custom players and modifications from store
    const state = get();
    const newPlayers = {};
    const newAvailable = [];

    for (const [playerId, player] of Object.entries(state.players)) {
      // Skip custom players
      if (playerId.startsWith('custom_') || player.isCustomPlayer) {
        continue;
      }

      // Remove modification flag
      const cleanPlayer = { ...player };
      delete cleanPlayer.isModified;
      newPlayers[playerId] = cleanPlayer;

      if (!player.currentTeam) {
        newAvailable.push(playerId);
      }
    }

    set({
      players: newPlayers,
      availablePlayers: newAvailable
    });

    console.log('🧹 All customizations reset');
  }
    }),
    {
      name: 'cm25-player-store',
      version: 2, // Bumped version for compressed storage migration
      storage: createJSONStorage(() => indexedDBStorage, compressedStorageOptions),
      // Exclude filters from persistence (UI state only)
      partialize: (state) => ({
        players: state.players,
        availablePlayers: state.availablePlayers,
        careerStats: state.careerStats,
        currentSeasonId: state.currentSeasonId
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate playerStore:', error);
        }
        markHydrated('player');
      }
    }
  )
);

export default usePlayerStore;