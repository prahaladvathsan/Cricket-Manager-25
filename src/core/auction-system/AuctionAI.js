/**
 * @file AuctionAI.js
 * @description AI bidding strategy and decision-making for auction
 */

import auctionConfig from '../../data/config/auctionConfig.json';
import PlayerValuation from './PlayerValuation.js';

class AuctionAI {
  constructor() {
    this.config = auctionConfig;
    this.valuation = new PlayerValuation();
  }

  /**
   * Decide whether AI team should bid on a player (enhanced with playstyle awareness)
   * @param {Object} player - Player being auctioned
   * @param {number} currentPrice - Current bid price
   * @param {Object} team - Team object with squad and budget info
   * @param {number} auctionProgress - Fraction of auction completed (0-1)
   * @returns {Object} { shouldBid: boolean, maxBid: number, reason: string }
   */
  /**
   * Decide whether to bid on a player (DETERMINISTIC - no probability)
   * Teams bid if currentPrice < marketValue
   * @param {Object} player - Player being auctioned
   * @param {number} currentPrice - Current bid price
   * @param {Object} team - Team object
   * @param {number} auctionProgress - Progress through auction (0-1)
   * @returns {Object} { shouldBid: boolean, maxBid: number, reason: string }
   */
  shouldBid(player, currentPrice, team, auctionProgress = 0) {
    const budgetRemaining = team.budgetRemaining;
    const squadSize = team.squad.length;
    const maxSquadSize = this.config.squadSize.max;
    const minSquadSize = this.config.squadSize.min;

    // Check if team has budget
    if (budgetRemaining <= currentPrice) {
      return { shouldBid: false, maxBid: 0, reason: 'Insufficient budget' };
    }

    // Check if squad is full
    if (squadSize >= maxSquadSize) {
      return { shouldBid: false, maxBid: 0, reason: 'Squad full' };
    }

    // Calculate enhanced team needs (includes playstyle coverage)
    const teamNeeds = this.analyzeTeamNeeds(team.squad);

    // Evaluate how well this player fits team needs (NEW FIT SCORE CALCULATION)
    const playerFit = this.evaluatePlayerFit(player, teamNeeds);

    // Estimate market value based on fit score (now includes budget-to-gap multiplier)
    const marketValue = this.valuation.estimateMarketValue(
      player,
      playerFit.fitScore,
      budgetRemaining,
      squadSize,
      teamNeeds // Pass teamNeeds for budget-to-gap calculation
    );

    // Calculate reserve amount needed for minimum squad
    const reserveAmount = this.valuation.calculateReserveAmount(squadSize, budgetRemaining);

    // Calculate effective budget (budget - reserve)
    const effectiveBudget = budgetRemaining - reserveAmount;

    // Determine max bid (don't exceed market value or effective budget)
    const maxBid = Math.min(marketValue, effectiveBudget);

    // DETERMINISTIC BIDDING: Bid if price is below our valuation
    if (currentPrice >= maxBid) {
      return {
        shouldBid: false,
        maxBid: 0,
        reason: `Price ${this.valuation.formatPrice(currentPrice)} >= value ${this.valuation.formatPrice(maxBid)}`
      };
    }

    // BID: Price is below our valuation, so bid
    const gapInfo = playerFit.fillsGaps.length > 0
      ? `Fills ${playerFit.fillsGaps.map(g => g.category).join(', ')}`
      : 'Need player';

    return {
      shouldBid: true,
      maxBid,
      reason: `${gapInfo} (value: ${this.valuation.formatPrice(marketValue)}, fit: ${playerFit.fitScore.toFixed(0)})`
    };
  }

  /**
   * Analyze team's role needs (enhanced with playstyle coverage)
   * @param {Array} squad - Current squad players
   * @returns {Object} Enhanced needs with both role-level and playstyle-level data
   */
  analyzeTeamNeeds(squad) {
    // Get playstyle-level coverage
    const playstyleCoverage = this.analyzePlaystyleCoverage(squad);

    // Basic role-level composition (for backward compatibility)
    const currentComposition = {
      batsman: 0,
      bowler: 0,
      'all-rounder': 0,
      'wicket-keeper': 0
    };

    squad.forEach(player => {
      const role = player.role || 'batsman';
      currentComposition[role] = (currentComposition[role] || 0) + 1;
    });

    // Ideal composition targets (for 25-player squad)
    const idealComposition = {
      batsman: 10,
      bowler: 8,
      'all-rounder': 5,
      'wicket-keeper': 2
    };

    // Calculate role-level needs
    const roleNeeds = {};
    for (const role in idealComposition) {
      roleNeeds[role] = Math.max(0, idealComposition[role] - currentComposition[role]);
    }

    // Merge role needs with playstyle coverage
    return {
      ...roleNeeds, // Keep role-level needs for backward compatibility
      batting: playstyleCoverage.batting,
      bowling: playstyleCoverage.bowling,
      qualityGaps: playstyleCoverage.qualityGaps
    };
  }

  /**
   * Get random bid delay for AI (simulates thinking time)
   * @returns {number} Delay in milliseconds
   */
  getRandomBidDelay() {
    const minDelay = this.config.timing.aiBidDelayMin * 1000;
    const maxDelay = this.config.timing.aiBidDelayMax * 1000;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  /**
   * Calculate next bid amount (current price + increment)
   * @param {number} currentPrice - Current bid price
   * @returns {number} Next bid amount
   */
  calculateNextBid(currentPrice) {
    // Find appropriate increment
    for (const incrementConfig of this.config.bidIncrements.increments) {
      if (currentPrice < incrementConfig.maxPrice) {
        return currentPrice + incrementConfig.increment;
      }
    }

    // Fallback to largest increment
    const lastIncrement = this.config.bidIncrements.increments[this.config.bidIncrements.increments.length - 1];
    return currentPrice + lastIncrement.increment;
  }

  /**
   * Evaluate player for auction prioritization
   * @param {Object} player - Player object
   * @param {Object} team - Team object
   * @returns {number} Priority score (higher = more important)
   */
  evaluatePlayerPriority(player, team) {
    const teamNeeds = this.analyzeTeamNeeds(team.squad);
    const roleNeed = teamNeeds[player.role] || 0;
    const primaryRating = this.valuation.getPrimaryPlaystyleRating(player);

    // Priority = rating + role need bonus
    const priorityScore = primaryRating + (roleNeed * 10);

    return priorityScore;
  }

  /**
   * Analyze playstyle-level coverage in squad using RATING QUOTAS (not player counts)
   * @param {Array} squad - Current squad players
   * @returns {Object} Comprehensive playstyle coverage analysis with rating gaps
   */
  analyzePlaystyleCoverage(squad) {
    const quotas = this.config.playstyleRatingQuotas;
    const categoryMapping = this.config.playstyleCategoryMapping;
    const idealComp = this.config.idealSquadComposition;

    // Initialize coverage tracking by CATEGORY (not individual playstyles)
    const coverage = {
      batting: {},
      bowling: {},
      qualityGaps: {
        elite: { current: 0, target: idealComp.quality.elitePlayersTarget, gap: 0 },
        premium: { current: 0, target: idealComp.quality.premiumPlayersTarget, gap: 0 }
      }
    };

    // Initialize batting categories with rating quotas
    for (const [category, quota] of Object.entries(quotas.batting)) {
      coverage.batting[category] = {
        currentRating: 0,  // Total rating accumulated
        targetRating: quota,  // Target rating to reach
        gap: quota,  // How much rating still needed
        playerCount: 0  // How many players contribute
      };
    }

    // Initialize bowling categories with rating quotas
    for (const [category, quota] of Object.entries(quotas.bowling)) {
      coverage.bowling[category] = {
        currentRating: 0,
        targetRating: quota,
        gap: quota,
        playerCount: 0
      };
    }

    // Analyze current squad - sum up ratings per category
    // ALL players can contribute to BOTH batting and bowling quotas
    squad.forEach(player => {
      const primaryRating = this.valuation.getPrimaryPlaystyleRating(player);
      const qualityTier = this.valuation.getQualityTier(primaryRating);

      // Track quality tiers
      if (qualityTier === 'elite') {
        coverage.qualityGaps.elite.current++;
      }
      if (qualityTier === 'elite' || qualityTier === 'premium') {
        coverage.qualityGaps.premium.current++;
      }

      // Process batting ratings (ALL players checked, even bowlers)
      const battingRatings = player.playstyleRatings?.batting || {};
      for (const [category, playstyles] of Object.entries(categoryMapping.batting)) {
        // Find this player's best rating in this category
        let bestRatingInCategory = 0;
        for (const playstyle of playstyles) {
          const rating = battingRatings[playstyle] || 0;
          if (rating > bestRatingInCategory) {
            bestRatingInCategory = rating;
          }
        }

        // Add this player's contribution to the category (even if minor)
        if (bestRatingInCategory > 0) {
          coverage.batting[category].currentRating += bestRatingInCategory;
          coverage.batting[category].playerCount++;
        }
      }

      // Process bowling ratings (ALL players checked, even batsmen)
      const bowlingRatings = player.playstyleRatings?.bowling || {};
      for (const [category, playstyles] of Object.entries(categoryMapping.bowling)) {
        let bestRatingInCategory = 0;
        for (const playstyle of playstyles) {
          const rating = bowlingRatings[playstyle] || 0;
          if (rating > bestRatingInCategory) {
            bestRatingInCategory = rating;
          }
        }

        // Add this player's contribution to the category (even if minor)
        if (bestRatingInCategory > 0) {
          coverage.bowling[category].currentRating += bestRatingInCategory;
          coverage.bowling[category].playerCount++;
        }
      }
    });

    // Calculate gaps (how much more rating needed)
    for (const category of Object.keys(coverage.batting)) {
      coverage.batting[category].gap = Math.max(0,
        coverage.batting[category].targetRating - coverage.batting[category].currentRating
      );
    }

    for (const category of Object.keys(coverage.bowling)) {
      coverage.bowling[category].gap = Math.max(0,
        coverage.bowling[category].targetRating - coverage.bowling[category].currentRating
      );
    }

    // Calculate quality gaps
    coverage.qualityGaps.elite.gap = Math.max(0, coverage.qualityGaps.elite.target - coverage.qualityGaps.elite.current);
    coverage.qualityGaps.premium.gap = Math.max(0, coverage.qualityGaps.premium.target - coverage.qualityGaps.premium.current);

    return coverage;
  }

  /**
   * Evaluate how well a player fits team needs (QUOTA GAP-BASED)
   * Value = rating contribution + gap urgency bonus
   * @param {Object} player - Player being evaluated
   * @param {Object} teamNeeds - Enhanced team needs from analyzePlaystyleCoverage
   * @returns {Object} Fit analysis { fitScore: number, fillsGaps: Array, qualityUpgrade: boolean }
   */
  evaluatePlayerFit(player, teamNeeds) {
    const categoryMapping = this.config.playstyleCategoryMapping;
    const quotas = this.config.playstyleRatingQuotas;
    const primaryRating = this.valuation.getPrimaryPlaystyleRating(player);
    const qualityTier = this.valuation.getQualityTier(primaryRating);
    const role = player.role;

    let maxBattingValue = 0; // Best batting category contribution
    let maxBowlingValue = 0; // Best bowling category contribution
    const fillsGaps = [];
    let qualityUpgrade = false;

    // Check batting categories player can contribute to
    // ALL players checked (even bowlers can have minor batting contributions)
    if (teamNeeds.batting) {
      const battingRatings = player.playstyleRatings?.batting || {};

      for (const [category, playstyles] of Object.entries(categoryMapping.batting)) {
        // Find this player's best rating in this category
        let bestRatingInCategory = 0;
        for (const playstyle of playstyles) {
          const rating = battingRatings[playstyle] || 0;
          if (rating > bestRatingInCategory) {
            bestRatingInCategory = rating;
          }
        }

        // If player has meaningful contribution (50+) in this category
        if (bestRatingInCategory >= 50 && teamNeeds.batting[category]) {
          const gap = teamNeeds.batting[category].gap || 0;
          const totalQuota = quotas.batting[category];

          if (gap > 0) {
            const ratingContribution = Math.min(bestRatingInCategory, gap);
            // Value = contribution + (gap_urgency × urgency_multiplier)
            // gap_urgency = gap / totalQuota (0 to 1)
            const gapUrgency = gap / totalQuota;
            const categoryValue = ratingContribution + (gapUrgency * 100);

            // Track this as a potential contribution
            fillsGaps.push({
              category,
              gap: ratingContribution,
              type: 'batting',
              urgency: gapUrgency,
              value: categoryValue
            });

            // Update max batting value if this is the best batting contribution
            if (categoryValue > maxBattingValue) {
              maxBattingValue = categoryValue;
            }
          }
        }
      }
    }

    // Check bowling categories player can contribute to
    // ALL players checked (even batsmen can have minor bowling contributions)
    if (teamNeeds.bowling) {
      const bowlingRatings = player.playstyleRatings?.bowling || {};

      for (const [category, playstyles] of Object.entries(categoryMapping.bowling)) {
        let bestRatingInCategory = 0;
        for (const playstyle of playstyles) {
          const rating = bowlingRatings[playstyle] || 0;
          if (rating > bestRatingInCategory) {
            bestRatingInCategory = rating;
          }
        }

        if (bestRatingInCategory >= 50 && teamNeeds.bowling[category]) {
          const gap = teamNeeds.bowling[category].gap || 0;
          const totalQuota = quotas.bowling[category];

          if (gap > 0) {
            const ratingContribution = Math.min(bestRatingInCategory, gap);
            const gapUrgency = gap / totalQuota;
            const categoryValue = ratingContribution + (gapUrgency * 100);

            fillsGaps.push({
              category,
              gap: ratingContribution,
              type: 'bowling',
              urgency: gapUrgency,
              value: categoryValue
            });

            // Update max bowling value if this is the best bowling contribution
            if (categoryValue > maxBowlingValue) {
              maxBowlingValue = categoryValue;
            }
          }
        }
      }
    }

    // Calculate fit score based on role
    let fitScore = 0;
    if (role === 'all-rounder') {
      // All-rounders get credit for BOTH batting and bowling contributions
      fitScore = maxBattingValue + maxBowlingValue;
    } else {
      // Batsmen/bowlers get credit for their primary role only
      fitScore = Math.max(maxBattingValue, maxBowlingValue);
    }

    // Check if player fills quality gap
    if (teamNeeds.qualityGaps) {
      if (qualityTier === 'elite' && teamNeeds.qualityGaps.elite.gap > 0) {
        fitScore += 50; // Elite players highly valued
        qualityUpgrade = true;
      } else if ((qualityTier === 'elite' || qualityTier === 'premium') && teamNeeds.qualityGaps.premium.gap > 0) {
        fitScore += 30;
        qualityUpgrade = true;
      }
    }

    return {
      fitScore,
      fillsGaps,
      qualityUpgrade
    };
  }

  /**
   * Evaluate if team has overspent or underspent on a role category
   * @param {Object} player - Player being evaluated
   * @param {Object} team - Team object
   * @returns {Object} { overspent: boolean, underspent: boolean, spentRatio: number }
   */
  evaluateRoleBudget(player, team) {
    const totalBudget = this.config.budget.total;
    const budgetAllocation = this.config.budgetAllocation;

    // Determine role category
    let roleCategory = null;
    const primaryRating = this.valuation.getPrimaryPlaystyleRating(player);

    // Categorize player by playstyle
    if (player.role === 'batsman' || player.role === 'wicket-keeper') {
      const playstyleRatings = player.playstyleRatings?.batting || {};
      const primaryPlaystyle = Object.keys(playstyleRatings).reduce((a, b) =>
        playstyleRatings[a] > playstyleRatings[b] ? a : b, Object.keys(playstyleRatings)[0]);

      if (primaryPlaystyle?.includes('Opener')) {
        roleCategory = 'topOrderBatting';
      } else if (primaryPlaystyle === 'Finisher') {
        roleCategory = 'deathBatting';
      } else {
        roleCategory = 'middleOrderBatting';
      }
    } else if (player.role === 'bowler') {
      const playstyleRatings = player.playstyleRatings?.bowling || {};
      const primaryPlaystyle = Object.keys(playstyleRatings).reduce((a, b) =>
        playstyleRatings[a] > playstyleRatings[b] ? a : b, Object.keys(playstyleRatings)[0]);

      if (primaryPlaystyle === 'Death Specialist') {
        roleCategory = 'deathBowling';
      } else if (primaryPlaystyle === 'Swing Bowler' || primaryPlaystyle === 'Hit-the-Deck Seamer' || primaryPlaystyle === 'Short-Ball Specialist') {
        roleCategory = 'newBallBowling';
      } else {
        roleCategory = 'spinBowling';
      }
    } else if (player.role === 'all-rounder') {
      roleCategory = 'allRounders';
    }

    if (!roleCategory || !budgetAllocation[roleCategory]) {
      return { overspent: false, underspent: false, spentRatio: 0 };
    }

    // Calculate how much team has spent on this role category
    let spentOnRole = 0;
    team.squad.forEach(squadPlayer => {
      // Rough categorization - could be improved but good enough
      if (roleCategory === 'topOrderBatting' && (squadPlayer.role === 'batsman' || squadPlayer.role === 'wicket-keeper')) {
        const ratings = squadPlayer.playstyleRatings?.batting || {};
        const primary = Object.keys(ratings).reduce((a, b) => ratings[a] > ratings[b] ? a : b, '');
        if (primary.includes('Opener')) spentOnRole += squadPlayer.soldPrice || 0;
      } else if (roleCategory === 'deathBatting' && squadPlayer.role === 'batsman') {
        const ratings = squadPlayer.playstyleRatings?.batting || {};
        const primary = Object.keys(ratings).reduce((a, b) => ratings[a] > ratings[b] ? a : b, '');
        if (primary === 'Finisher') spentOnRole += squadPlayer.soldPrice || 0;
      } else if (roleCategory === 'deathBowling' && squadPlayer.role === 'bowler') {
        const ratings = squadPlayer.playstyleRatings?.bowling || {};
        const primary = Object.keys(ratings).reduce((a, b) => ratings[a] > ratings[b] ? a : b, '');
        if (primary === 'Death Specialist') spentOnRole += squadPlayer.soldPrice || 0;
      } else if (roleCategory === 'allRounders' && squadPlayer.role === 'all-rounder') {
        spentOnRole += squadPlayer.soldPrice || 0;
      }
    });

    const idealSpend = totalBudget * budgetAllocation[roleCategory];
    const spentRatio = spentOnRole / idealSpend;

    // Overspent if spent >130% of allocation
    // Underspent if spent <50% and auction is >40% complete (should have started by now)
    return {
      overspent: spentRatio > 1.3,
      underspent: spentRatio < 0.5 && team.squad.length > 5,
      spentRatio
    };
  }

  /**
   * Generate AI bidding commentary
   * @param {string} teamName - Team name
   * @param {string} action - Action taken (bid, pass, won, lost)
   * @param {number} amount - Bid amount (if applicable)
   * @returns {string} Commentary text
   */
  generateCommentary(teamName, action, amount = null) {
    const commentary = {
      bid: [
        `${teamName} raises the bid to ${this.valuation.formatPrice(amount)}!`,
        `${teamName} enters the bidding at ${this.valuation.formatPrice(amount)}`,
        `${teamName} shows interest - ${this.valuation.formatPrice(amount)}`
      ],
      pass: [
        `${teamName} passes`,
        `${teamName} opts out`,
        `${teamName} is not interested`
      ],
      won: [
        `${teamName} wins the bid!`,
        `Sold to ${teamName}!`,
        `${teamName} secures the player!`
      ],
      lost: [
        `${teamName} loses out`,
        `${teamName} couldn't match the bid`,
        `${teamName} withdraws`
      ]
    };

    const options = commentary[action] || [`${teamName} - ${action}`];
    return options[Math.floor(Math.random() * options.length)];
  }
}

export default AuctionAI;
