/**
 * @file playerStore.js
 * @description Store for all players and attributes management
 * @module stores/playerStore
 */

import { create } from 'zustand';
import playstyleCalculator from '../utils/PlaystyleCalculator.js';

/**
 * @typedef {Object} PlayerStore
 * @property {Object.<string, Player>} players - All players indexed by ID
 * @property {string[]} availablePlayers - Players not assigned to any team
 * @property {Object} filters - Current player filtering options
 */

const usePlayerStore = create((set, get) => ({
  // Player Data
  players: {},
  availablePlayers: [],
  
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

    playersData.forEach(player => {
      // Players from master database already have playstyleRatings, topPlaystyles, and primaryPlaystyle
      playersMap[player.id] = player;
      if (!player.currentTeam) {
        available.push(player.id);
      }
    });

    console.log(`✅ Initialized ${playersData.length} players with pre-calculated playstyle data`);

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
}));

export default usePlayerStore;