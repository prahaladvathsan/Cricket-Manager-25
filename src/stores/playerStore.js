/**
 * @file playerStore.js
 * @description Store for all players and attributes management
 * @module stores/playerStore
 */

import { create } from 'zustand';

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
   * Initialize players from data
   * @param {Player[]} playersData - Array of player objects
   */
  initializePlayers: (playersData) => set(() => {
    const playersMap = {};
    const available = [];
    
    playersData.forEach(player => {
      playersMap[player.id] = player;
      if (!player.currentTeam) {
        available.push(player.id);
      }
    });

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
  }
}));

export default usePlayerStore;