/**
 * @file RetentionEngine.js
 * @description Core orchestrator for the pre-auction retention phase
 * Teams retain up to 15 players (with tiered salary caps) before auction
 */

import retentionConfig from '../../data/config/retentionConfig.json';
import RetentionAI from './RetentionAI.js';

export default class RetentionEngine {
  constructor() {
    this.config = retentionConfig;
    this.retentionAI = new RetentionAI();
  }

  /**
   * Initialize retention phase state for all teams
   * @param {Array} teams - Array of team objects
   * @param {Object} squadLists - { teamId: [playerIds] }
   * @param {Object} players - { playerId: playerObj }
   * @returns {Object} Initial retention state keyed by teamId
   */
  initializeRetentionPhase(teams, squadLists, players) {
    const teamRetentions = {};

    for (const team of teams) {
      const playerIds = squadLists[team.id] || [];
      const squad = playerIds.map(id => players[id]).filter(Boolean);

      teamRetentions[team.id] = {
        retainedPlayers: [],
        releasedPlayers: [],
        totalSalary: 0,
        auctionPurse: this.config.auctionPurse.base,
        squadSize: squad.length,
        completed: false
      };
    }

    return teamRetentions;
  }

  /**
   * Process AI retention for a single team
   * @param {Object} team - Team object
   * @param {Array} squad - Array of player objects
   * @param {Function} getPlayerStatsFn - Function(playerId) returning player stats
   * @returns {{ retainedPlayers: Array, releasedPlayers: Array, totalSalary: number, auctionPurse: number }}
   */
  processAITeamRetention(team, squad, getPlayerStatsFn) {
    return this.retentionAI.processTeamRetention(team, squad, getPlayerStatsFn);
  }

  /**
   * Validate a proposed retention against tier caps
   * @param {string} teamId - Team ID
   * @param {Array} currentRetentions - Array of { playerId, salary }
   * @param {number} newSalary - Proposed new retention salary
   * @returns {{ valid: boolean, reason: string|null, tierInfo: Object }}
   */
  validateRetention(teamId, currentRetentions, newSalary) {
    const newCount = currentRetentions.length + 1;
    const newTotal = currentRetentions.reduce((sum, r) => sum + r.salary, 0) + newSalary;

    if (newCount > this.config.retentionCaps.maxRetentionsPerTeam) {
      return { valid: false, reason: 'Maximum retentions reached', tierInfo: null };
    }

    const applicableTier = this.config.retentionCaps.tiers.find(t => newCount <= t.retentionsUpTo);
    if (!applicableTier) {
      return { valid: false, reason: 'No tier available for this retention count', tierInfo: null };
    }

    if (newTotal > applicableTier.cumulativeSalaryCap) {
      return {
        valid: false,
        reason: `Salary cap exceeded: $${(newTotal / 1e6).toFixed(2)}M > $${(applicableTier.cumulativeSalaryCap / 1e6).toFixed(2)}M limit for ${applicableTier.retentionsUpTo} retentions`,
        tierInfo: applicableTier
      };
    }

    return { valid: true, reason: null, tierInfo: applicableTier };
  }

  /**
   * Get the auction purse for a team after retentions
   * @param {number} totalRetentionSalary - Total salary committed to retained players
   * @returns {number} Remaining auction purse
   */
  getTeamAuctionPurse(totalRetentionSalary) {
    return Math.max(
      this.config.auctionPurse.minimumRemaining,
      this.config.auctionPurse.base - totalRetentionSalary
    );
  }

  /**
   * Finalize retentions — update squads and player assignments
   * Clears all squads, re-adds only retained players, updates soldPrice to retention salary
   * Non-retained players get currentTeam = null
   * @param {Object} retentionResults - { teamId: { retainedPlayers, releasedPlayers, totalSalary, auctionPurse } }
   * @param {Object} stores - { playerStore, teamStore }
   */
  finalizeRetentions(retentionResults, stores) {
    const { playerStore, teamStore } = stores;
    const allRetainedIds = new Set();

    // Build new squad lists from retained players only
    const newSquadLists = {};
    for (const [teamId, result] of Object.entries(retentionResults)) {
      const retainedIds = result.retainedPlayers.map(r => r.playerId);
      newSquadLists[teamId] = retainedIds;

      // Update retained players: set soldPrice to retention salary, keep currentTeam
      for (const retention of result.retainedPlayers) {
        allRetainedIds.add(retention.playerId);
        playerStore.getState().setPlayerSoldPrice(retention.playerId, retention.salary);
      }
    }

    // Release non-retained players (set currentTeam to null)
    const allPlayers = playerStore.getState().players;
    for (const [playerId, player] of Object.entries(allPlayers)) {
      if (player.currentTeam && !allRetainedIds.has(playerId)) {
        playerStore.getState().updatePlayer(playerId, { currentTeam: null });
      }
    }

    // Update all squad lists at once
    teamStore.setState((state) => ({
      squadLists: {
        ...state.squadLists,
        ...newSquadLists
      }
    }));

    console.log(`✅ Retentions finalized: ${allRetainedIds.size} players retained across ${Object.keys(retentionResults).length} teams`);
  }
}
