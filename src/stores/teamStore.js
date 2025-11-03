/**
 * @file teamStore.js
 * @description Store for all teams and rosters management
 * @module stores/teamStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {Object} TeamStore
 * @property {Object.<string, Team>} teams - All teams indexed by ID
 * @property {string} userTeamId - ID of team controlled by user
 * @property {Object.<string, string[]>} squadLists - Current squad for each team
 */

const useTeamStore = create(
  persist(
    (set, get) => ({
  // Team Data
  teams: {},
  userTeamId: null,
  squadLists: {},

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
  }
    }),
    {
      name: 'cm25-team-store',
      version: 1
    }
  )
);

export default useTeamStore;