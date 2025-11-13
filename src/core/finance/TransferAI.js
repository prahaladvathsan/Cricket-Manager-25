/**
 * @file TransferAI.js
 * @description Transfer System V2 - AI transfer decisions
 * Weekly listing cycle: Sell players with performance < 0.7
 * Hourly bidding cycle: Evaluate and bid on listings
 */

import transferConfig from '../../data/config/transferConfig.json';
import PerformanceValuation from './PerformanceValuation.js';

export default class TransferAI {
  constructor(transferMarket, financeStore, teamStore = null) {
    this.config = transferConfig;
    this.transferMarket = transferMarket;
    this.financeStore = financeStore;
    this.teamStore = teamStore;
    this.valuation = new PerformanceValuation();

    // Track purchase prices for sell decisions
    this.purchasePrices = new Map(); // playerId -> price
  }

  /**
   * Record a player's purchase price
   * @param {string} playerId - Player ID
   * @param {number} price - Purchase price
   */
  recordPurchasePrice(playerId, price) {
    this.purchasePrices.set(playerId, price);
  }

  /**
   * Get player's purchase price
   * @param {string} playerId - Player ID
   * @returns {number} Purchase price or 0
   */
  getPurchasePrice(playerId) {
    return this.purchasePrices.get(playerId) || 0;
  }

  /**
   * Weekly listing cycle - Evaluate and list underperforming players
   * V2 logic: List players with performance multiplier < 0.7
   * All-rounders: BOTH batting AND bowling must be < 0.7
   * @param {Object} team - Team object with squad
   * @param {number} weekNumber - Current week number
   * @returns {Array} Listing results
   */
  async evaluateWeeklyListings(team, weekNumber) {
    if (!this.teamStore || !this.financeStore) {
      return [];
    }

    const squad = team.squad || [];
    const listings = [];

    // Get team aggregate stats
    const teamStats = this.teamStore.getState().getTeamStats(team.id);

    if (!teamStats) {
      console.warn(`No team stats available for ${team.id}`);
      return [];
    }

    // Evaluate each player
    for (const player of squad) {
      // Get player's team-specific stats
      const playerStats = this.teamStore.getState().getPlayerStats(team.id, player.id);

      if (!playerStats) {
        continue; // No stats yet, keep player
      }

      // Check if player should be sold (performance < 0.7)
      const shouldSell = this.valuation.shouldSellPlayer(player, playerStats, teamStats);

      if (shouldSell) {
        // Get purchase price
        const purchasePrice = this.getPurchasePrice(player.id);

        if (purchasePrice === 0) {
          console.warn(`No purchase price for ${player.name}, skipping sell decision`);
          continue;
        }

        // Calculate internal value (listing price)
        const listingPrice = this.valuation.calculateInternalValue(
          purchasePrice,
          player,
          playerStats,
          teamStats
        );

        // Get performance multiplier for logging
        const performanceMultiplier = this.valuation.calculatePerformanceMultiplier(
          player,
          playerStats,
          teamStats
        );

        // List player
        const result = this.transferMarket.listPlayer({
          teamId: team.id,
          playerId: player.id,
          player,
          listingPrice,
          previousPrice: purchasePrice,
          performanceMultiplier
        });

        if (result.success) {
          listings.push({
            player: player.name,
            listingPrice,
            purchasePrice,
            performanceMultiplier,
            reason: `Performance multiplier: ${(performanceMultiplier * 100).toFixed(0)}% (below 70% threshold)`
          });
        }
      }
    }

    if (listings.length > 0) {
      console.log(`\n📤 ${team.id} listed ${listings.length} underperforming players`);
    }

    return listings;
  }

  /**
   * Hourly bidding decision - Should team bid on a listing?
   * @param {Object} team - Team object
   * @param {Object} listing - Listing object
   * @returns {Object} {shouldBid: boolean, bidAmount?: number, reason?: string}
   */
  evaluateHourlyBid(team, listing) {
    if (!this.financeStore) {
      return { shouldBid: false, reason: 'No finance store available' };
    }

    const teamFinances = this.financeStore.getState().getTeamFinances(team.id);

    if (!teamFinances) {
      return { shouldBid: false, reason: 'No team finances available' };
    }

    // Get current bid or listing price
    const currentBid = listing.currentBid > 0 ? listing.currentBid : listing.listingPrice;

    // Calculate team's valuation of the player
    const categoryGaps = this.getCategoryGaps(team.squad || []);
    const valuation = this.valuation.calculatePurchaseValue(
      listing.player,
      team,
      teamFinances,
      categoryGaps
    );

    // Calculate potential bid amount
    const bidAmount = this.calculateBidAmount(currentBid, valuation);

    // Bid if valuation supports it and budget allows
    if (valuation >= bidAmount) {
      // Check budget
      if (teamFinances.currentBudget < bidAmount + 500000) {
        return { shouldBid: false, reason: 'Insufficient budget' };
      }

      return {
        shouldBid: true,
        bidAmount,
        valuation,
        reason: `Valued at $${(valuation / 1000).toFixed(0)}K, bidding $${(bidAmount / 1000).toFixed(0)}K`
      };
    }

    return {
      shouldBid: false,
      reason: `Valuation ($${(valuation / 1000).toFixed(0)}K) below next bid ($${(bidAmount / 1000).toFixed(0)}K)`
    };
  }

  /**
   * Calculate bid amount based on current bid and team valuation
   * V2 logic: Min $10K increment, max $50K jump
   * @param {number} currentBid - Current highest bid (or listing price if no bids)
   * @param {number} teamValuation - Team's valuation of the player
   * @returns {number} Bid amount
   */
  calculateBidAmount(currentBid, teamValuation) {
    const minBid = currentBid + 10000; // Minimum $10K increment
    const maxJump = 50000; // Maximum $50K jump

    // Ideal bid: up to current + $50K if valuation supports it
    const idealBid = Math.min(teamValuation, currentBid + maxJump);

    // Return at least minimum bid
    return Math.max(minBid, idealBid);
  }

  /**
   * Get category gaps for purchase valuation
   * @param {Array} squad - Team squad
   * @returns {Object} Category gaps {category: gap}
   */
  getCategoryGaps(squad) {
    const categoryTotals = {
      anchor: 0,
      aggressor: 0,
      finisher: 0,
      powerplay_specialist: 0,
      accumulator: 0,
      swing_bowler: 0,
      pace_bowler: 0,
      spin_bowler: 0,
      economical_bowler: 0
    };

    squad.forEach(player => {
      const playstyles = player.playstyleRatings || {};

      categoryTotals.anchor += playstyles.anchor || 0;
      categoryTotals.aggressor += playstyles.aggressor || 0;
      categoryTotals.finisher += playstyles.finisher || 0;
      categoryTotals.powerplay_specialist += playstyles.powerplay_specialist || 0;
      categoryTotals.accumulator += playstyles.accumulator || 0;
      categoryTotals.swing_bowler += (playstyles.swing_bowler || 0) + (playstyles.swing_bowler_spin || 0);
      categoryTotals.pace_bowler += (playstyles.express_pace || 0) + (playstyles.death_bowler || 0);
      categoryTotals.spin_bowler += (playstyles.off_spinner || 0) + (playstyles.leg_spinner || 0);
      categoryTotals.economical_bowler += playstyles.economical_bowler || 0;
    });

    // Calculate gaps (target is ~350 per category)
    const gaps = {};
    Object.entries(categoryTotals).forEach(([category, total]) => {
      gaps[category] = Math.max(0, 350 - total);
    });

    return gaps;
  }

  /**
   * Display team's transfer activity summary
   * @param {string} teamId - Team ID
   * @param {Object} actions - Actions taken {listed, bids}
   */
  displayTransferSummary(teamId, actions) {
    if (actions.listed.length === 0 && actions.bids.length === 0) {
      return; // No activity
    }

    console.log(`\n📊 ${teamId} Transfer Activity:`);

    if (actions.listed.length > 0) {
      console.log(`   Listed: ${actions.listed.length} players`);
      actions.listed.forEach(item => {
        console.log(`      - ${item.player} at $${(item.listingPrice / 1000).toFixed(0)}K (${(item.performanceMultiplier * 100).toFixed(0)}% performance)`);
      });
    }

    if (actions.bids.length > 0) {
      console.log(`   Bids Placed: ${actions.bids.length}`);
      actions.bids.forEach(item => {
        console.log(`      - ${item.player} ($${(item.bidAmount / 1000).toFixed(0)}K)`);
      });
    }
  }
}
