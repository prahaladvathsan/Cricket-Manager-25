/**
 * @file PerformanceValuation.js
 * @description Transfer System V2 - Performance-based player valuation
 * VFM (Value-for-Money) engine using rank-mapping IPM to price ranks
 * Auction-style logic for purchase valuation
 */

import { getPlayerRating } from '../../utils/ratingHelper.js';

export default class PerformanceValuation {
  constructor() {
    // Base prices by rating (from auction system)
    this.basePriceByRating = {
      9: 500000,   // Elite
      8: 350000,   // Star
      7: 200000,   // Quality
      6: 120000,   // Decent
      5: 80000,    // Average
      4: 50000,    // Below Average
      3: 30000     // Poor
    };
  }

  // =============================================================================
  // VFM ENGINE — New methods for investment & utility model
  // =============================================================================

  /**
   * Estimate a price for a player based on their rating when no soldPrice exists
   * Uses basePriceByRating table + getPlayerRating()
   * @param {Object} player - Player object
   * @returns {number} Estimated price
   */
  estimatePriceFromRating(player) {
    const ratingValue = getPlayerRating(player);
    const rating = Math.max(3, Math.min(9, Math.floor(ratingValue / 10)));
    return this.basePriceByRating[rating] || 80000;
  }

  /**
   * Get a player's actual price — soldPrice or rating-based estimate
   * @param {Object} player - Player object
   * @returns {number} Actual price
   */
  getActualPrice(player) {
    return player.soldPrice || this.estimatePriceFromRating(player);
  }

  /**
   * Calculate Impact Per Match (IPM)
   * @param {Object} playerStats - Player stats from teamStore (has totalImpact, matches)
   * @returns {number} IPM score (0 if no matches)
   */
  calculateIPM(playerStats) {
    if (!playerStats || !playerStats.matches || playerStats.matches === 0) {
      return 0;
    }
    return (playerStats.totalImpact || 0) / playerStats.matches;
  }

  /**
   * Calculate VFM (Value-for-Money) Score using rank-mapping
   *
   * Algorithm:
   * 1. Collect all squad players with sufficient matches
   * 2. Rank A: Sort by IPM (highest first) → Performance Rank
   * 3. Rank B: Sort by Actual Price (highest first) → Financial Rank
   * 4. Find target's Performance Rank position
   * 5. "Justified Price" = price of the player at that same rank in Rank B
   * 6. VFM = Justified Price / Actual Price
   *
   * @param {Array} squad - Full squad of player objects
   * @param {Object} targetPlayer - The player to evaluate
   * @param {Object} targetPlayerStats - Target player's stats from teamStore
   * @param {Function} getPlayerStatsFn - Function(playerId) that returns player stats
   * @param {number} minimumMatches - Minimum matches to include a player in ranking
   * @returns {Object} { vfmScore, justifiedPrice, actualPrice, performanceRank, ipm }
   */
  calculateVFMScore(squad, targetPlayer, targetPlayerStats, getPlayerStatsFn, minimumMatches = 3) {
    const actualPrice = this.getActualPrice(targetPlayer);
    const targetIPM = this.calculateIPM(targetPlayerStats);

    // Collect all active players (with enough matches) and their data
    const activePlayers = [];
    for (const player of squad) {
      const stats = player.id === targetPlayer.id
        ? targetPlayerStats
        : getPlayerStatsFn(player.id);

      if (!stats || stats.matches < minimumMatches) continue;

      activePlayers.push({
        id: player.id,
        ipm: this.calculateIPM(stats),
        price: this.getActualPrice(player)
      });
    }

    // Need at least 2 players to rank
    if (activePlayers.length < 2) {
      return { vfmScore: 1.0, justifiedPrice: actualPrice, actualPrice, performanceRank: 0, ipm: targetIPM };
    }

    // Rank A: Sort by IPM descending (performance rank)
    const ipmRanked = [...activePlayers].sort((a, b) => b.ipm - a.ipm);

    // Rank B: Sort by price descending (financial rank)
    const priceRanked = [...activePlayers].sort((a, b) => b.price - a.price);

    // Find target's performance rank position
    const performanceRank = ipmRanked.findIndex(p => p.id === targetPlayer.id);

    // Justified Price = price of the player at that same rank in Rank B
    const justifiedPrice = priceRanked[performanceRank]?.price || priceRanked[priceRanked.length - 1].price;

    // VFM = Justified Price / Actual Price
    const vfmScore = actualPrice > 0 ? justifiedPrice / actualPrice : 1.0;

    return {
      vfmScore,
      justifiedPrice,
      actualPrice,
      performanceRank: performanceRank + 1, // 1-indexed for display
      ipm: targetIPM
    };
  }

  /**
   * Check if a player is "dead capital" — expensive but not getting matches
   * @param {Object} player - Player object
   * @param {Object} playerStats - Player stats from teamStore
   * @param {Object} teamStats - Team aggregate stats from teamStore
   * @param {Object} config - aiListingCriteria.deadCapital config
   * @returns {boolean} True if player is dead capital
   */
  isDeadCapital(player, playerStats, teamStats, config) {
    if (!teamStats || teamStats.matches < config.minimumTeamMatches) {
      return false; // Not enough team history to judge
    }

    const actualPrice = this.getActualPrice(player);
    const playerMatches = playerStats?.matches || 0;

    // Walk through price-match slabs from highest to lowest
    for (const slab of config.priceMatchSlabs) {
      if (actualPrice >= slab.minPrice && playerMatches < slab.minMatches) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate listing price with safety-net
   * @param {Object} player - Player object
   * @param {number} justifiedPrice - From VFM calculation (or null for non-VFM listings)
   * @param {Object} config - aiListingCriteria config
   * @param {string} reason - Listing reason ('composition_surplus', 'dead_capital', 'vfm_failure')
   * @returns {number} Listing price rounded to nearest $10K
   */
  calculateListingPrice(player, justifiedPrice, config, reason) {
    const actualPrice = this.getActualPrice(player);

    let price;
    if (reason === 'dead_capital') {
      // Heavily discounted to move quickly
      price = actualPrice * 0.60;
    } else if (reason === 'composition_surplus') {
      // Moderate discount — no performance issue, just surplus
      price = actualPrice * 0.75;
    } else {
      // VFM failure — average of justified price and actual price, floored at 50%
      const floor = actualPrice * (config.listingPrice?.safetyFloorPercent || 0.5);
      const averaged = ((justifiedPrice || 0) + actualPrice) / 2;
      price = Math.max(floor, averaged);
    }

    // Round to nearest $10K, minimum $50K
    return Math.max(50000, Math.round(price / 10000) * 10000);
  }

}
