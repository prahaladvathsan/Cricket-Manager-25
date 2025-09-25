/**
 * @file teamStore.js
 * @description Store for all teams and rosters management
 * @module stores/teamStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} TeamStore
 * @property {Object.<string, Team>} teams - All teams indexed by ID
 * @property {string} userTeamId - ID of team controlled by user
 * @property {Object.<string, string[]>} squadLists - Current squad for each team
 */

const useTeamStore = create((set, get) => ({
  // Team Data
  teams: {},
  userTeamId: null,
  squadLists: {},

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
  }))
}));

export default useTeamStore;