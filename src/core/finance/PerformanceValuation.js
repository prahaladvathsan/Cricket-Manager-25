/**
 * @file PerformanceValuation.js
 * @description Transfer System V2 - Performance-based player valuation
 * Uses simplified equal-weighted multiplier system for internal value calculation
 * Auction-style logic for purchase valuation
 */

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

  /**
   * Calculate performance multiplier based on stats vs team average
   * Uses simplified equal-weighted ratios (V2 design)
   * @param {Object} player - Player object
   * @param {Object} playerStats - Player stats from teamStore
   * @param {Object} teamStats - Team aggregate stats
   * @returns {number} Multiplier (0.5 to 2.0)
   */
  calculatePerformanceMultiplier(player, playerStats, teamStats) {
    if (!playerStats || !teamStats) {
      return 1.0; // No data, use base value
    }

    const role = player.role;

    // Batsmen: (avg_ratio + SR_ratio) / 2
    if (role === 'batsman' || role === 'wicket-keeper') {
      const playerAvg = playerStats.battingAverage || 0;
      const teamAvg = teamStats.battingAverage || 20;
      const playerSR = playerStats.strikeRate || 0;
      const teamSR = teamStats.strikeRate || 120;

      // Calculate ratios
      const avgRatio = teamAvg > 0 ? playerAvg / teamAvg : 1.0;
      const srRatio = teamSR > 0 ? playerSR / teamSR : 1.0;

      // Equal weight
      const multiplier = (avgRatio + srRatio) / 2;

      // Clamp between 0.5 and 2.0
      return Math.max(0.5, Math.min(2.0, multiplier));
    }

    // Bowlers: (econ_ratio + avg_ratio) / 2
    // Lower is better for both economy and bowling average (inverse ratios)
    if (role === 'bowler') {
      const playerEcon = playerStats.economy || 999;
      const teamEcon = teamStats.economy || 8.0;
      const playerBowlAvg = playerStats.bowlingAverage || 999;
      const teamBowlAvg = teamStats.bowlingAverage || 25.0;

      // Inverse ratios (lower is better)
      const econRatio = playerEcon > 0 ? teamEcon / playerEcon : 1.0;
      const avgRatio = playerBowlAvg > 0 ? teamBowlAvg / playerBowlAvg : 1.0;

      // Equal weight
      const multiplier = (econRatio + avgRatio) / 2;

      // Clamp between 0.5 and 2.0
      return Math.max(0.5, Math.min(2.0, multiplier));
    }

    // All-rounders: return object with separate batting and bowling multipliers
    // (Caller will handle the logic for combining them)
    if (role === 'all-rounder') {
      // Batting component
      const playerBatAvg = playerStats.battingAverage || 0;
      const teamBatAvg = teamStats.battingAverage || 20;
      const playerSR = playerStats.strikeRate || 0;
      const teamSR = teamStats.strikeRate || 120;

      const batAvgRatio = teamBatAvg > 0 ? playerBatAvg / teamBatAvg : 1.0;
      const srRatio = teamSR > 0 ? playerSR / teamSR : 1.0;
      const battingMult = (batAvgRatio + srRatio) / 2;

      // Bowling component
      const playerEcon = playerStats.economy || 999;
      const teamEcon = teamStats.economy || 8.0;
      const playerBowlAvg = playerStats.bowlingAverage || 999;
      const teamBowlAvg = teamStats.bowlingAverage || 25.0;

      const econRatio = playerEcon > 0 ? teamEcon / playerEcon : 1.0;
      const bowlAvgRatio = playerBowlAvg > 0 ? teamBowlAvg / playerBowlAvg : 1.0;
      const bowlingMult = (econRatio + bowlAvgRatio) / 2;

      // Average of both (but caller can use them separately for sell decisions)
      const combinedMult = (battingMult + bowlingMult) / 2;

      // Clamp combined multiplier
      return Math.max(0.5, Math.min(2.0, combinedMult));
    }

    return 1.0; // Default
  }

  /**
   * Get separate batting and bowling multipliers for all-rounders
   * @param {Object} player - Player object
   * @param {Object} playerStats - Player stats
   * @param {Object} teamStats - Team stats
   * @returns {Object} { batting: number, bowling: number }
   */
  getAllRounderMultipliers(player, playerStats, teamStats) {
    if (player.role !== 'all-rounder' || !playerStats || !teamStats) {
      return { batting: 1.0, bowling: 1.0 };
    }

    // Batting component
    const playerBatAvg = playerStats.battingAverage || 0;
    const teamBatAvg = teamStats.battingAverage || 20;
    const playerSR = playerStats.strikeRate || 0;
    const teamSR = teamStats.strikeRate || 120;

    const batAvgRatio = teamBatAvg > 0 ? playerBatAvg / teamBatAvg : 1.0;
    const srRatio = teamSR > 0 ? playerSR / teamSR : 1.0;
    const battingMult = Math.max(0.5, Math.min(2.0, (batAvgRatio + srRatio) / 2));

    // Bowling component
    const playerEcon = playerStats.economy || 999;
    const teamEcon = teamStats.economy || 8.0;
    const playerBowlAvg = playerStats.bowlingAverage || 999;
    const teamBowlAvg = teamStats.bowlingAverage || 25.0;

    const econRatio = playerEcon > 0 ? teamEcon / playerEcon : 1.0;
    const bowlAvgRatio = playerBowlAvg > 0 ? teamBowlAvg / playerBowlAvg : 1.0;
    const bowlingMult = Math.max(0.5, Math.min(2.0, (econRatio + bowlAvgRatio) / 2));

    return {
      batting: battingMult,
      bowling: bowlingMult
    };
  }

  /**
   * Determine if player should be listed for sale
   * V2 logic: < 0.7 multiplier for role
   * All-rounders: BOTH batting AND bowling must be < 0.7
   * @param {Object} player - Player object
   * @param {Object} playerStats - Player stats
   * @param {Object} teamStats - Team stats
   * @returns {boolean} True if player should be sold
   */
  shouldSellPlayer(player, playerStats, teamStats) {
    if (!playerStats || !teamStats) {
      return false; // No data, don't sell
    }

    const role = player.role;

    // All-rounders: BOTH batting AND bowling must be < 0.7
    if (role === 'all-rounder') {
      const multipliers = this.getAllRounderMultipliers(player, playerStats, teamStats);
      return multipliers.batting < 0.7 && multipliers.bowling < 0.7;
    }

    // Batsmen and bowlers: single multiplier < 0.7
    const multiplier = this.calculatePerformanceMultiplier(player, playerStats, teamStats);
    return multiplier < 0.7;
  }

  /**
   * Calculate internal value (listing price) based on previous price and performance
   * V2 formula: previousPrice × performanceMultiplier
   * @param {number} previousPrice - What team originally paid
   * @param {Object} player - Player object
   * @param {Object} playerStats - Player stats
   * @param {Object} teamStats - Team stats
   * @returns {number} Internal value for listing
   */
  calculateInternalValue(previousPrice, player, playerStats, teamStats) {
    const multiplier = this.calculatePerformanceMultiplier(player, playerStats, teamStats);
    const value = previousPrice * multiplier;

    // Round to nearest 10K
    return Math.round(value / 10000) * 10000;
  }

  /**
   * Calculate auction-style purchase valuation
   * Uses same logic as auction: base + gap-based fitscore + bonuses + multipliers
   * @param {Object} player - Player object
   * @param {Object} team - Team object
   * @param {Object} teamFinances - Team finances
   * @param {Object} categoryGaps - Team's category gaps
   * @returns {number} Purchase value willing to pay
   */
  calculatePurchaseValue(player, team, teamFinances, categoryGaps) {
    // Base price
    const rating = Math.floor(player.rating || 5);
    let value = this.basePriceByRating[rating] || 80000;

    // Gap-based fitscore value
    const fitscore = this.calculateFitscore(player, categoryGaps);
    const gapBonus = fitscore * 20000; // $20K per fitscore point

    value += gapBonus;

    // Tier multiplier
    if (rating >= 9) {
      value *= 1.5; // Elite tier
    } else if (rating >= 7) {
      value *= 1.2; // Quality tier
    }

    // Budget multiplier
    const budget = teamFinances.currentBudget;
    const budgetRatio = budget / 5000000; // Ratio to $5M baseline
    if (budgetRatio > 1.5) {
      value *= 1.2; // 20% premium if rich
    } else if (budgetRatio < 0.5) {
      value *= 0.8; // 20% discount if poor
    }

    // Category deficit multiplier
    const primaryCategory = this.getPrimaryPlaystyleCategory(player);
    const categoryDeficit = categoryGaps[primaryCategory] || 0;
    if (categoryDeficit > 300) {
      value *= 1.3; // 30% premium if desperate for this category
    }

    // Round to nearest 10K
    return Math.round(value / 10000) * 10000;
  }

  /**
   * Calculate fitscore (how well player fills team's gaps)
   * @param {Object} player - Player object
   * @param {Object} categoryGaps - Team's category gaps {category: gap}
   * @returns {number} Fitscore (0-100+)
   */
  calculateFitscore(player, categoryGaps) {
    const playstyles = player.playstyleRatings || {};
    let totalFit = 0;

    // Map playstyles to categories and sum gaps
    Object.entries(playstyles).forEach(([style, rating]) => {
      const category = this.mapPlaystyleToCategory(style);
      const gap = categoryGaps[category] || 0;

      if (gap > 0) {
        // Contribute to fitscore proportional to rating and gap
        totalFit += (rating / 10) * (gap / 100);
      }
    });

    return Math.min(100, totalFit);
  }

  /**
   * Get player's primary playstyle category
   * @param {Object} player - Player object
   * @returns {string} Category name
   */
  getPrimaryPlaystyleCategory(player) {
    const playstyles = player.playstyleRatings || {};

    // Batting categories
    const battingCategories = {
      anchor: playstyles.anchor || 0,
      aggressor: playstyles.aggressor || 0,
      finisher: playstyles.finisher || 0,
      powerplay_specialist: playstyles.powerplay_specialist || 0,
      accumulator: playstyles.accumulator || 0
    };

    // Bowling categories
    const bowlingCategories = {
      swing_bowler: (playstyles.swing_bowler || 0) + (playstyles.swing_bowler_spin || 0),
      pace_bowler: (playstyles.express_pace || 0) + (playstyles.death_bowler || 0),
      spin_bowler: (playstyles.off_spinner || 0) + (playstyles.leg_spinner || 0),
      economical_bowler: playstyles.economical_bowler || 0
    };

    // Find highest batting category
    let maxBatting = 0;
    let battingCat = null;
    Object.entries(battingCategories).forEach(([cat, val]) => {
      if (val > maxBatting) {
        maxBatting = val;
        battingCat = cat;
      }
    });

    // Find highest bowling category
    let maxBowling = 0;
    let bowlingCat = null;
    Object.entries(bowlingCategories).forEach(([cat, val]) => {
      if (val > maxBowling) {
        maxBowling = val;
        bowlingCat = cat;
      }
    });

    // Return the dominant category
    if (maxBatting > maxBowling) {
      return battingCat;
    } else if (maxBowling > 0) {
      return bowlingCat;
    }

    return 'generic';
  }

  /**
   * Map playstyle to category
   * @param {string} style - Playstyle name
   * @returns {string} Category
   */
  mapPlaystyleToCategory(style) {
    const mapping = {
      anchor: 'anchor',
      aggressor: 'aggressor',
      finisher: 'finisher',
      powerplay_specialist: 'powerplay_specialist',
      accumulator: 'accumulator',
      swing_bowler: 'swing_bowler',
      swing_bowler_spin: 'swing_bowler',
      express_pace: 'pace_bowler',
      death_bowler: 'pace_bowler',
      off_spinner: 'spin_bowler',
      leg_spinner: 'spin_bowler',
      economical_bowler: 'economical_bowler'
    };

    return mapping[style] || 'generic';
  }
}
