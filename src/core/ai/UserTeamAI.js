/**
 * @file UserTeamAI.js
 * @description AI manager for controlling the user's team during simulation
 */

import TeamSelectionManager from '../match-engine/interactive/TeamSelectionManager';
import TransferAI from '../finance/TransferAI';

/**
 * AI manager for user team during simulation
 * Handles squad selection, tactics, transfers, and auctions
 */
class UserTeamAI {
  constructor({
    teamId,
    teamStore,
    playerStore,
    financeStore,
    transferStore
  }) {
    this.teamId = teamId;
    this.teamStore = teamStore;
    this.playerStore = playerStore;
    this.financeStore = financeStore;
    this.transferStore = transferStore;

    // AI decision history
    this.decisions = {
      matchesPrepared: 0,
      transfersMade: 0,
      tacticsUpdated: 0
    };
  }

  /**
   * Prepare team for an upcoming match
   * Handles squad selection and tactics
   * @param {Object} fixture - Match fixture
   * @returns {Promise<Object>} Preparation summary
   */
  async prepareForMatch(fixture) {
    try {
      const team = this.teamStore.getState().teams[this.teamId];
      const squadIds = this.teamStore.getState().squadLists[this.teamId] || [];

      // Get current tactics or initialize
      let tactics = this.teamStore.getState().teamTactics[this.teamId];

      if (!tactics || !tactics.squadSelection || tactics.squadSelection.length === 0) {
        // Initialize default tactics if none exist
        console.log(`🤖 UserTeamAI: Initializing tactics for ${team.shortName}`);

        const players = squadIds
          .map(id => this.playerStore.getState().players[id])
          .filter(Boolean);

        if (players.length >= 11) {
          this.teamStore.getState().initializeDefaultTactics(this.teamId, players);
          tactics = this.teamStore.getState().teamTactics[this.teamId];
          this.decisions.tacticsUpdated++;
        }
      }

      // Use TeamSelectionManager for squad selection if needed
      if (!tactics || tactics.squadSelection.length < 11) {
        console.log(`🤖 UserTeamAI: Auto-selecting squad for ${team.shortName}`);

        const selectedSquad = TeamSelectionManager.autoSelectSquad(
          squadIds,
          this.playerStore.getState().players
        );

        if (selectedSquad.length >= 11) {
          this.teamStore.getState().updateSquadSelection(this.teamId, selectedSquad.slice(0, 11));
          this.decisions.matchesPrepared++;
        }
      }

      this.decisions.matchesPrepared++;

      return {
        squadSelected: true,
        tacticsReady: true
      };

    } catch (error) {
      console.error('UserTeamAI: Error preparing for match:', error);
      return {
        squadSelected: false,
        tacticsReady: false,
        error: error.message
      };
    }
  }

  /**
   * Evaluate and execute transfer decisions
   * Uses existing TransferAI logic
   * @param {string} transferWindow - Transfer window phase
   * @returns {Promise<Object>} Transfer summary
   */
  async evaluateTransfers(transferWindow = 'open') {
    try {
      const finances = this.financeStore.getState().getTeamFinances(this.teamId);

      if (!finances || finances.balance < 0) {
        console.log(`🤖 UserTeamAI: Insufficient funds for transfers`);
        return {
          transfersMade: 0,
          reason: 'insufficient_funds'
        };
      }

      // Use TransferAI for automated transfer decisions
      const transferAI = new TransferAI();

      // Evaluate selling players (if needed)
      const sellDecisions = transferAI.evaluateSellDecisions(
        this.teamId,
        this.teamStore.getState().squadLists[this.teamId] || [],
        this.playerStore.getState().players,
        finances.balance
      );

      // Evaluate buying players
      const buyDecisions = transferAI.evaluateBuyDecisions(
        this.teamId,
        this.teamStore.getState().squadLists[this.teamId] || [],
        this.playerStore.getState().players,
        this.transferStore.getState().listings || [],
        finances.balance
      );

      this.decisions.transfersMade += sellDecisions.length + buyDecisions.length;

      return {
        transfersMade: sellDecisions.length + buyDecisions.length,
        sold: sellDecisions.length,
        bought: buyDecisions.length
      };

    } catch (error) {
      console.error('UserTeamAI: Error evaluating transfers:', error);
      return {
        transfersMade: 0,
        error: error.message
      };
    }
  }

  /**
   * Handle auction bidding
   * @param {Object} auction - Auction state
   * @param {Object} currentPlayer - Player being auctioned
   * @returns {number} Bid amount (0 = pass)
   */
  makeBidDecision(auction, currentPlayer) {
    try {
      const finances = this.financeStore.getState().getTeamFinances(this.teamId);
      const squad = this.teamStore.getState().squadLists[this.teamId] || [];

      // Simple AI bidding logic:
      // - Bid if squad needs players
      // - Bid up to market value
      // - Consider budget constraints

      const needsPlayers = squad.length < 15;
      const hasbudget = finances && finances.balance > auction.currentBid * 1.5;

      if (!needsPlayers || !hasbudget) {
        return 0; // Pass
      }

      // Calculate player value (simplified)
      const playerValue = this.calculatePlayerValue(currentPlayer);

      // Bid if current bid is below value
      if (auction.currentBid < playerValue) {
        const bidAmount = Math.min(
          auction.currentBid + auction.minIncrement,
          playerValue,
          finances.balance * 0.1 // Max 10% of balance per player
        );

        return bidAmount;
      }

      return 0; // Pass

    } catch (error) {
      console.error('UserTeamAI: Error making bid decision:', error);
      return 0;
    }
  }

  /**
   * Calculate player market value (simplified)
   * @param {Object} player - Player object
   * @returns {number} Market value
   */
  calculatePlayerValue(player) {
    // Simplified valuation based on overall rating
    const baseValue = 100000; // $100k base
    const ratingMultiplier = player.overall || 50;

    return baseValue + (ratingMultiplier * 10000);
  }

  /**
   * Get AI decision history
   * @returns {Object} Decision history
   */
  getDecisionHistory() {
    return { ...this.decisions };
  }

  /**
   * Reset decision history
   */
  resetHistory() {
    this.decisions = {
      matchesPrepared: 0,
      transfersMade: 0,
      tacticsUpdated: 0
    };
  }
}

export default UserTeamAI;
