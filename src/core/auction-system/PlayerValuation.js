/**
 * @file PlayerValuation.js
 * @description Calculate player base prices and market valuations for auction
 */

import auctionConfig from '../../data/config/auctionConfig.json' with { type: "json" };

class PlayerValuation {
  constructor() {
    this.config = auctionConfig;
  }

  /**
   * Calculate base price for a player based on their primary playstyle rating
   * @param {Object} player - Player object
   * @returns {number} Base price in dollars
   */
  calculateBasePrice(player) {
    const primaryRating = this.getPrimaryPlaystyleRating(player);

    // Find appropriate price slab
    for (const slab of this.config.priceSlabs.slabs) {
      if (primaryRating >= slab.threshold) {
        return slab.basePrice;
      }
    }

    // Fallback to lowest slab
    return this.config.priceSlabs.slabs[this.config.priceSlabs.slabs.length - 1].basePrice;
  }

  /**
   * Get player's primary playstyle rating
   * @param {Object} player - Player object
   * @returns {number} Primary playstyle rating (0-100)
   */
  getPrimaryPlaystyleRating(player) {
    // Check if player has pre-calculated primary playstyle rating
    if (player.primaryPlaystyleRating) {
      return player.primaryPlaystyleRating;
    }

    // Calculate based on role and playstyle ratings
    const role = player.role;
    const playstyleRatings = player.playstyleRatings || {};

    let primaryRating = 0;

    if (role === 'batsman' || role === 'wicket-keeper') {
      // Use highest batting playstyle rating
      const battingRatings = playstyleRatings.batting || {};
      primaryRating = Math.max(...Object.values(battingRatings), 0);
    } else if (role === 'bowler') {
      // Use highest bowling playstyle rating
      const bowlingRatings = playstyleRatings.bowling || {};
      primaryRating = Math.max(...Object.values(bowlingRatings), 0);
    } else if (role === 'all-rounder') {
      // Use average of top batting and bowling playstyle ratings
      const battingRatings = playstyleRatings.batting || {};
      const bowlingRatings = playstyleRatings.bowling || {};
      const topBatting = Math.max(...Object.values(battingRatings), 0);
      const topBowling = Math.max(...Object.values(bowlingRatings), 0);
      primaryRating = (topBatting + topBowling) / 2;
    }

    // Cache the result
    player.primaryPlaystyleRating = primaryRating;
    return primaryRating;
  }

  /**
   * Estimate market value for AI bidding (SIMPLIFIED - FIT SCORE BASED)
   * @param {Object} player - Player object
   * @param {number} fitScore - How well player fills team's quota gaps (from evaluatePlayerFit)
   * @param {number} budgetRemaining - Team's remaining budget
   * @param {number} currentSquadSize - Team's current squad size
   * @param {Object} teamNeeds - Team needs with gap information (for budget-to-gap calculation)
   * @returns {number} Estimated market value
   */
  estimateMarketValue(player, fitScore, budgetRemaining, currentSquadSize, teamNeeds = null) {
    const basePrice = this.calculateBasePrice(player);
    const primaryRating = this.getPrimaryPlaystyleRating(player);
    const qualityTier = this.getQualityTier(primaryRating);

    // Base value calculation
    const baseValue = (primaryRating / 100) * basePrice * this.config.aiStrategy.baseValueMultiplier;

    // Fit score contribution (primary driver of value)
    // Fit score already includes rating contribution + gap urgency
    const fitValue = fitScore * 1000; // Scale fit score to dollar value

    // Tier multipliers - elite/premium players worth more
    const tierMultipliers = {
      elite: 1.4,
      premium: 1.2,
      standard: 1.0,
      emerging: 0.85,
      base: 0.7
    };
    const tierMultiplier = tierMultipliers[qualityTier] || 1.0;

    // Reduced scarcity effect (10% max instead of 70%)
    const scarcityMultiplier = this.getPlaystyleScarcityMultiplier(player);
    const reducedScarcity = 1.0 + ((scarcityMultiplier - 1.0) * 0.15); // 15% of original effect

    // Squad gap multiplier (urgency when below minimum)
    const minSquad = this.config.squadSize.min;
    const squadGap = minSquad - currentSquadSize;
    const squadMultiplier = squadGap > 0 ? 1.3 : 1.0;

    // Budget-to-gap multiplier (NEW: adjusts based on budget surplus/deficit)
    const budgetGapMultiplier = teamNeeds
      ? this.calculateBudgetToGapMultiplier(budgetRemaining, teamNeeds)
      : 1.0;

    // All-rounder premium
    let allRounderBonus = 0;
    if (player.role === 'all-rounder') {
      const battingRatings = player.playstyleRatings?.batting || {};
      const bowlingRatings = player.playstyleRatings?.bowling || {};
      const topBatting = Math.max(...Object.values(battingRatings), 0);
      const topBowling = Math.max(...Object.values(bowlingRatings), 0);

      if (topBatting >= 60 && topBowling >= 60) {
        const dualSkillQuality = (topBatting + topBowling) / 200;
        allRounderBonus = baseValue * dualSkillQuality * 0.3; // 30% bonus
      }
    }

    // Final market value: base + fit-based value, scaled by quality/scarcity/budget
    const marketValue = (baseValue + fitValue + allRounderBonus)
                        * tierMultiplier
                        * reducedScarcity
                        * squadMultiplier
                        * budgetGapMultiplier;

    return Math.round(marketValue);
  }

  /**
   * Check if player qualifies as Marquee player
   * @param {Object} player - Player object
   * @returns {boolean} True if player is Marquee
   */
  isMarqueePlayer(player) {
    const primaryRating = this.getPrimaryPlaystyleRating(player);
    return primaryRating >= this.config.marquee.threshold;
  }

  /**
   * Get price slab label for a player
   * @param {Object} player - Player object
   * @returns {string} Price slab label (Elite, Premium, Standard, Emerging, Base)
   */
  getPriceSlabLabel(player) {
    const basePrice = this.calculateBasePrice(player);

    for (const slab of this.config.priceSlabs.slabs) {
      if (basePrice === slab.basePrice) {
        return slab.label;
      }
    }

    return 'Unknown';
  }

  /**
   * Format price for display
   * @param {number} price - Price in dollars
   * @returns {string} Formatted price (e.g., "$1.5M", "$250K")
   */
  formatPrice(price) {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    } else {
      return `$${price}`;
    }
  }

  /**
   * Calculate budget-to-gap multiplier (adjusts bids based on budget surplus/deficit)
   * @param {number} budgetRemaining - Team's remaining budget
   * @param {Object} teamNeeds - Team needs with gap information
   * @returns {number} Multiplier (>1 if budget surplus, <1 if budget deficit)
   */
  calculateBudgetToGapMultiplier(budgetRemaining, teamNeeds) {
    // Calculate total remaining gaps (rating points needed)
    let totalGaps = 0;

    if (teamNeeds.batting) {
      for (const category of Object.keys(teamNeeds.batting)) {
        totalGaps += teamNeeds.batting[category].gap || 0;
      }
    }

    if (teamNeeds.bowling) {
      for (const category of Object.keys(teamNeeds.bowling)) {
        totalGaps += teamNeeds.bowling[category].gap || 0;
      }
    }

    // If no gaps, return neutral multiplier
    if (totalGaps === 0) {
      return 1.0;
    }

    // Estimate ideal budget needed to fill gaps
    // Rough estimate: each rating point costs initial total budget divided by total gaps (10M by 3100)
    const costPerRatingPoint = 10000000 / 3100;
    const idealBudgetNeeded = totalGaps * costPerRatingPoint;

    // Calculate budget ratio
    const budgetRatio = budgetRemaining / idealBudgetNeeded;

    // Convert to multiplier with bounds
    // If budgetRatio = 2.0 (2x more budget than needed) → multiply bids by ~1.3
    // If budgetRatio = 0.5 (half budget needed) → multiply bids by ~0.7
    // Use logarithmic scaling to avoid extreme values
    let multiplier;
    if (budgetRatio >= 1.0) {
      // Budget surplus - bid more aggressively
      // Map 1.0->1.0, 1.5->1.15, 2.0->1.3, 3.0->1.4
      multiplier = 1.0 + (budgetRatio - 1.0) * 0.5;
    } else {
      // Budget deficit - bid more conservatively
      // Map 0.5->0.7, 0.75->0.85, 1.0->1.0
      multiplier = 0.6 + (budgetRatio - 0.5) * 0.5;
    }

    return multiplier;
  }

  /**
   * Calculate remaining budget needed for minimum squad
   * @param {number} currentSquadSize - Current squad size
   * @param {number} budgetRemaining - Remaining budget
   * @returns {number} Recommended reserve amount
   */
  calculateReserveAmount(currentSquadSize, budgetRemaining) {
    const minSquad = this.config.squadSize.min;
    const playersNeeded = Math.max(0, minSquad - currentSquadSize);

    if (playersNeeded === 0) {
      return 0;
    }

    // Reserve enough to buy minimum-priced players for remaining spots
    const minPrice = this.config.priceSlabs.slabs[this.config.priceSlabs.slabs.length - 1].basePrice;
    const reserve = playersNeeded * minPrice * 1.5; // Add 50% buffer

    return Math.min(reserve, budgetRemaining * this.config.aiStrategy.conservativeMode.reserveForMinSquad);
  }

  /**
   * Get playstyle scarcity multiplier for a player
   * @param {Object} player - Player object
   * @returns {number} Scarcity multiplier (e.g., 1.5 for rare playstyles, 0.9 for common)
   */
  getPlaystyleScarcityMultiplier(player) {
    const role = player.role;
    const playstyleRatings = player.playstyleRatings || {};

    let primaryPlaystyle = null;
    let highestRating = 0;

    // Determine primary playstyle based on role
    if (role === 'batsman' || role === 'wicket-keeper') {
      const battingRatings = playstyleRatings.batting || {};
      for (const [playstyle, rating] of Object.entries(battingRatings)) {
        if (rating > highestRating) {
          highestRating = rating;
          primaryPlaystyle = playstyle;
        }
      }
      // Look up batting scarcity multiplier
      if (primaryPlaystyle && this.config.playstyleScarcity?.batting[primaryPlaystyle]) {
        return this.config.playstyleScarcity.batting[primaryPlaystyle];
      }
    } else if (role === 'bowler') {
      const bowlingRatings = playstyleRatings.bowling || {};
      for (const [playstyle, rating] of Object.entries(bowlingRatings)) {
        if (rating > highestRating) {
          highestRating = rating;
          primaryPlaystyle = playstyle;
        }
      }
      // Look up bowling scarcity multiplier
      if (primaryPlaystyle && this.config.playstyleScarcity?.bowling[primaryPlaystyle]) {
        return this.config.playstyleScarcity.bowling[primaryPlaystyle];
      }
    } else if (role === 'all-rounder') {
      // For all-rounders, use bowling playstyle scarcity (bowling is more scarce)
      const bowlingRatings = playstyleRatings.bowling || {};
      for (const [playstyle, rating] of Object.entries(bowlingRatings)) {
        if (rating > highestRating) {
          highestRating = rating;
          primaryPlaystyle = playstyle;
        }
      }
      if (primaryPlaystyle && this.config.playstyleScarcity?.bowling[primaryPlaystyle]) {
        return this.config.playstyleScarcity.bowling[primaryPlaystyle];
      }
    }

    // Default to 1.0 if no scarcity multiplier found
    return 1.0;
  }

  /**
   * Get quality tier for a rating
   * @param {number} rating - Player rating (0-100)
   * @returns {string} Quality tier ('elite' | 'premium' | 'standard' | 'emerging' | 'base')
   */
  getQualityTier(rating) {
    const tiers = this.config.qualityTiers;

    if (rating >= tiers.elite) {
      return 'elite';
    } else if (rating >= tiers.premium) {
      return 'premium';
    } else if (rating >= tiers.standard) {
      return 'standard';
    } else if (rating >= tiers.emerging) {
      return 'emerging';
    } else {
      return 'base';
    }
  }

  /**
   * Calculate playstyle-specific bonus based on team needs
   * @param {Object} player - Player object
   * @param {Object} teamNeeds - Enhanced team needs with playstyle gaps
   * @returns {number} Bonus value in dollars
   */
  calculatePlaystyleBonus(player, teamNeeds) {
    // If teamNeeds doesn't have playstyle-level data, fall back to role-based bonus
    if (!teamNeeds.batting && !teamNeeds.bowling) {
      const roleNeed = teamNeeds[player.role] || 0;
      return roleNeed * this.config.aiStrategy.roleNeedBonus;
    }

    const primaryRating = this.getPrimaryPlaystyleRating(player);
    const qualityTier = this.getQualityTier(primaryRating);
    const scarcityMultiplier = this.getPlaystyleScarcityMultiplier(player);

    // Tier multipliers for bonus calculation
    const tierMultipliers = {
      elite: 1.5,
      premium: 1.2,
      standard: 1.0,
      emerging: 0.8,
      base: 0.6
    };

    const tierMultiplier = tierMultipliers[qualityTier] || 1.0;
    const baseBonus = this.config.aiStrategy.roleNeedBonus;

    let maxBonus = 0;

    // Check batting playstyles
    if (teamNeeds.batting) {
      const playstyleRatings = player.playstyleRatings?.batting || {};
      for (const [playstyle, rating] of Object.entries(playstyleRatings)) {
        if (rating >= 70 && teamNeeds.batting[playstyle]) {
          const gap = teamNeeds.batting[playstyle].gap || 0;
          if (gap > 0) {
            const bonus = gap * tierMultiplier * scarcityMultiplier * baseBonus;
            maxBonus = Math.max(maxBonus, bonus);
          }
        }
      }
    }

    // Check bowling playstyles
    if (teamNeeds.bowling) {
      const playstyleRatings = player.playstyleRatings?.bowling || {};
      for (const [playstyle, rating] of Object.entries(playstyleRatings)) {
        if (rating >= 70 && teamNeeds.bowling[playstyle]) {
          const gap = teamNeeds.bowling[playstyle].gap || 0;
          if (gap > 0) {
            const bonus = gap * tierMultiplier * scarcityMultiplier * baseBonus;
            maxBonus = Math.max(maxBonus, bonus);
          }
        }
      }
    }

    // Fall back to role-based bonus if no playstyle match
    if (maxBonus === 0) {
      const roleNeed = teamNeeds[player.role] || 0;
      maxBonus = roleNeed * baseBonus;
    }

    return Math.round(maxBonus);
  }
}

export default PlayerValuation;
