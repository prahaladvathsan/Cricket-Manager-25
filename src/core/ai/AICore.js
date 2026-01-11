/**
 * @file AICore.js
 * @description Core AI decision engine with shared utilities for Cricket Manager 25
 */

import aiConfig from '../../data/config/ai-config.json';
import auctionConfig from '../../data/config/auctionConfig.json';

class AICore {
  constructor() {
    this.config = aiConfig;
    this.auctionConfig = auctionConfig;
  }

  /**
   * Get AI configuration
   * @returns {Object} AI config
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get auction configuration
   * @returns {Object} Auction config
   */
  getAuctionConfig() {
    return this.auctionConfig;
  }

  /**
   * Calculate fitness penalty for a player (gradual, fitness-based)
   * @param {Object} player - Player object with condition.fitness
   * @returns {number} Penalty to subtract from selection score
   */
  getFitnessPenalty(player) {
    const fitness = player.condition?.fitness ?? 100;
    const penalty = this.config.squadSelection.fitnessPenalty;

    // Gradual penalty curve based on fitness (higher = better)
    // 70-100 fitness = no penalty
    // 40-70 = minor penalty
    // 20-40 = major penalty
    // 0-20 = severe penalty
    if (fitness >= penalty.noImpactThreshold) {
      return 0;
    }
    if (fitness >= penalty.minorPenaltyThreshold) {
      return (penalty.noImpactThreshold - fitness) * penalty.minorPenaltyRate;
    }
    if (fitness >= penalty.majorPenaltyThreshold) {
      const basePenalty = (penalty.noImpactThreshold - penalty.minorPenaltyThreshold) * penalty.minorPenaltyRate;
      return basePenalty + (penalty.minorPenaltyThreshold - fitness) * penalty.majorPenaltyRate;
    }
    // Severe penalty for <20 fitness
    const basePenalty = (penalty.noImpactThreshold - penalty.minorPenaltyThreshold) * penalty.minorPenaltyRate;
    const majorPenalty = (penalty.minorPenaltyThreshold - penalty.majorPenaltyThreshold) * penalty.majorPenaltyRate;
    return basePenalty + majorPenalty + (penalty.majorPenaltyThreshold - fitness) * penalty.severePenaltyRate;
  }

  /**
   * Calculate overall player rating
   * @param {Object} player - Player object
   * @returns {number} Overall rating (0-100 scale)
   */
  getPlayerRating(player) {
    // Use pre-calculated overall rating if available
    if (player.overallRating) {
      return player.overallRating;
    }

    // Calculate based on attributes
    const attrs = player.attributes || {};
    let totalRating = 0;
    let attrCount = 0;

    // Batting attributes
    if (attrs.batting) {
      const battingAttrs = Object.values(attrs.batting);
      totalRating += battingAttrs.reduce((sum, val) => sum + (val || 0), 0);
      attrCount += battingAttrs.length;
    }

    // Bowling attributes
    if (attrs.bowling) {
      const bowlingAttrs = Object.values(attrs.bowling);
      totalRating += bowlingAttrs.reduce((sum, val) => sum + (val || 0), 0);
      attrCount += bowlingAttrs.length;
    }

    // Convert 1-20 attribute scale to 0-100
    if (attrCount > 0) {
      return (totalRating / attrCount) * 5; // 20 * 5 = 100
    }

    return 50; // Default rating
  }

  /**
   * Get player's primary playstyle rating score (combines batting + bowling)
   * @param {Object} player - Player object
   * @returns {number} Primary playstyle rating score (0-100)
   */
  getPrimaryPlaystyleRatingScore(player) {
    if (player.primaryPlaystyleRating) {
      return player.primaryPlaystyleRating;
    }

    const role = player.role;
    const playstyleRatings = player.playstyleRatings || {};

    let primaryRating = 0;

    if (role === 'wicket-keeper') {
      const battingRatings = playstyleRatings.batting || {};
      primaryRating = Math.max(...Object.values(battingRatings), 0);
      const keepingRating = playstyleRatings.fielding?.isWicketKeeper || 0;
      primaryRating = Math.cbrt(primaryRating**3 + keepingRating**3);
    } else {
      const battingRatings = playstyleRatings.batting || {};
      const bowlingRatings = playstyleRatings.bowling || {};
      const topBatting = Math.max(...Object.values(battingRatings), 0);
      const topBowling = Math.max(...Object.values(bowlingRatings), 0);
      primaryRating = Math.cbrt(topBatting**3 + topBowling**3); 
    }

    return primaryRating;
  }

  /**
   * Get quality tier for a rating
   * @param {number} rating - Player rating (0-100)
   * @returns {string} Quality tier ('elite' | 'premium' | 'standard' | 'emerging' | 'base')
   */
  getQualityTier(rating) {
    const tiers = this.auctionConfig.qualityTiers;

    if (rating >= tiers.elite) return 'elite';
    if (rating >= tiers.premium) return 'premium';
    if (rating >= tiers.standard) return 'standard';
    if (rating >= tiers.emerging) return 'emerging';
    return 'base';
  }

  /**
   * Get player's bowling rating (average of bowling attributes)
   * @param {Object} player - Player object
   * @returns {number} Bowling rating (0-100)
   */
  getBowlingRating(player) {
    const attrs = player.attributes?.bowling;
    if (!attrs) return 0;

    const values = Object.values(attrs).filter(v => typeof v === 'number');
    if (values.length === 0) return 0;

    return (values.reduce((sum, v) => sum + v, 0) / values.length) * 5;
  }

  /**
   * Get player's fielding rating
   * @param {Object} player - Player object
   * @returns {number} Fielding rating (0-100)
   */
  getFieldingRating(player) {
    const attrs = player.attributes?.fielding;
    if (!attrs) return 50; // Default

    const values = Object.values(attrs).filter(v => typeof v === 'number');
    if (values.length === 0) return 50;

    return (values.reduce((sum, v) => sum + v, 0) / values.length) * 5;
  }

  /**
   * Check if player can bowl (has bowling attributes or is bowler/all-rounder)
   * @param {Object} player - Player object
   * @returns {boolean}
   */
  canBowl(player) {
    if (player.role === 'bowler' || player.role === 'all-rounder') {
      return true;
    }
    // Check if player has bowling attributes
    const bowlingAttrs = player.attributes?.bowling;
    if (!bowlingAttrs) return false;

    // Must have at least some bowling ability
    const avgBowling = this.getBowlingRating(player);
    return avgBowling >= 30; // Minimum bowling threshold
  }

  /**
   * Check if player is a wicket-keeper
   * @param {Object} player - Player object
   * @returns {boolean}
   */
  isWicketKeeper(player) {
    return player.role === 'wicket-keeper';
  }

  /**
   * Format price for display
   * @param {number} price - Price in dollars
   * @returns {string} Formatted price
   */
  formatPrice(price) {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price}`;
  }

  /**
   * Get bid increment for a given price
   * @param {number} currentPrice - Current price
   * @returns {number} Increment amount
   */
  getBidIncrement(currentPrice) {
    for (const incrementConfig of this.auctionConfig.bidIncrements.increments) {
      if (currentPrice < incrementConfig.maxPrice) {
        return incrementConfig.increment;
      }
    }
    const lastIncrement = this.auctionConfig.bidIncrements.increments[this.auctionConfig.bidIncrements.increments.length - 1];
    return lastIncrement.increment;
  }
}

// Export singleton instance
const aiCore = new AICore();
export default aiCore;
