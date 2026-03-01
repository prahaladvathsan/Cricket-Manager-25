/**
 * @file AuctionTransferAI.js
 * @description Consolidated and improved auction/transfer AI logic
 * Replaces: AuctionAI.js, PlayerValuation.js, TransferAI.js, PerformanceValuation.js
 */

import aiCore from './AICore.js';
import auctionConfig from '../../data/config/auctionConfig.json';

class AuctionTransferAI {
  constructor() {
    this.core = aiCore;
    this.config = auctionConfig;
  }

  // =============================================================================
  // PLAYER VALUATION (Improved)
  // =============================================================================

  /**
   * Get player's primary batting playstyle rating (highest batting playstyle)
   * @param {Object} player - Player object
   * @returns {number} Primary batting playstyle rating (0-100)
   */
  getPrimaryBattingRating(player) {
    const battingRatings = player.playstyleRatings?.batting || {};
    return Math.max(...Object.values(battingRatings), 0);
  }

  /**
   * Get player's primary bowling playstyle rating (highest bowling playstyle)
   * @param {Object} player - Player object
   * @returns {number} Primary bowling playstyle rating (0-100)
   */
  getPrimaryBowlingRating(player) {
    const bowlingRatings = player.playstyleRatings?.bowling || {};
    return Math.max(...Object.values(bowlingRatings), 0);
  }

  /**
   * Get player's wicketkeeping rating
   * @param {Object} player - Player object
   * @returns {number} Wicketkeeping rating (0-100)
   */
  getWicketkeepingRating(player) {
    return player.playstyleRatings?.fielding?.Wicketkeeper || 0;
  }

  /**
   * Calculate combined rating using cuberoot formula
   * Formula: cuberoot(rating1^3 + rating2^3)
   * @param {number} rating1 - First rating
   * @param {number} rating2 - Second rating
   * @returns {number} Combined rating
   */
  calculateCombinedRating(rating1, rating2) {
    return Math.cbrt(Math.pow(rating1, 3) + Math.pow(rating2, 3));
  }

  /**
   * Calculate base price for a player based on combined playstyle ratings
   * Formula: cuberoot(primaryBatRating^3 + primaryBowlRating^3)
   * For wicketkeepers: cuberoot(primaryBatRating^3 + wicketkeepingRating^3)
   * @param {Object} player - Player object
   * @returns {number} Base price in dollars
   */
  calculateBasePrice(player) {
    const primaryBatRating = this.getPrimaryBattingRating(player);
    const role = player.role;

    let combinedRating;
    if (role === 'wicket-keeper') {
      const wicketkeepingRating = this.getWicketkeepingRating(player);
      // Simplified rating for keepers: max of (average of both) and (just batting)
      // This nerfs pure keepers and prevents them from all becoming Marquee/Elite
      combinedRating = Math.max((primaryBatRating + wicketkeepingRating) / 2, primaryBatRating);
    } else {
      const primaryBowlRating = this.getPrimaryBowlingRating(player);
      combinedRating = this.calculateCombinedRating(primaryBatRating, primaryBowlRating);
    }

    for (const slab of this.config.priceSlabs.slabs) {
      if (combinedRating >= slab.threshold) {
        return slab.basePrice;
      }
    }

    return this.config.priceSlabs.slabs[this.config.priceSlabs.slabs.length - 1].basePrice;
  }

  /**
   * Estimate market value for a player
   * Formula: (baseValue + fitValue + performanceBonus) * squadMultiplier * budgetPenalty
   * @param {Object} player - Player object
   * @param {number} fitScore - Squad fit score
   * @param {number} annualBudget - Team's total annual budget (pre-salary, pre-spending)
   * @param {number} currentSquadSize - Current squad size
   * @param {Object} teamNeeds - Team needs analysis (unused but kept for API compatibility)
   * @param {number} performanceBonus - Performance bonus from IPM rank mapping (default 0)
   * @returns {number} Estimated market value
   */
  estimateMarketValue(player, fitScore, annualBudget, currentSquadSize, teamNeeds = null, performanceBonus = 0) {
    const basePrice = this.calculateBasePrice(player);
    const primaryRating = this.core.getPrimaryPlaystyleRatingScore(player);

    // Base value from rating
    const baseValue = (primaryRating / 100) * basePrice * this.config.aiStrategy.baseValueMultiplier;

    // Fit score contribution - scale appropriately
    const fitValue = fitScore * 500;

    // Squad gap urgency - need players to fill minimum squad
    const minSquad = this.config.squadSize.min;
    const squadGap = minSquad - currentSquadSize;
    const squadMultiplier = squadGap > 0 ? 1.3 : 1.0;

    // Budget penalty - uses annual budget (total pre-salary budget)
    const budgetPenalty = this.calculateBudgetPenalty(annualBudget, currentSquadSize);

    const marketValue = (baseValue + fitValue + performanceBonus) * squadMultiplier * budgetPenalty;

    return Math.round(Math.max(0, marketValue));
  }

  /**
   * Calculate budget penalty based on annual budget vs players needed
   * If budget per player needed is below $500K, apply stingy multiplier
   * @param {number} annualBudget - Team's total annual budget (pre-salary, pre-spending)
   * @param {number} currentSquadSize - Current squad size
   * @returns {number} Budget penalty multiplier (0.4 to 1.0)
   */
  calculateBudgetPenalty(annualBudget, currentSquadSize) {
    const minSquad = this.config.squadSize.min;
    const playersNeeded = Math.max(1, minSquad - currentSquadSize);

    // If squad is complete, no penalty
    if (playersNeeded <= 0) return 1.0;

    const budgetPerPlayer = annualBudget / playersNeeded;
    const stingyThreshold = 500000; // $500K per player threshold

    if (budgetPerPlayer >= stingyThreshold) {
      return 1.0; // No penalty
    }

    // Linear penalty from 1.0 at $500K down to 0.4 at $0
    const penalty = 0.4 + 0.6 * (budgetPerPlayer / stingyThreshold);
    return Math.max(0.4, Math.min(1.0, penalty));
  }

  /**
   * Calculate performance bonus based on how player's IPM ranks vs buyer squad prices
   * @param {Object} player - Player being evaluated
   * @param {Array} buyerSquad - Buyer's current squad
   * @param {Object} teamStore - teamStore for accessing player stats
   * @returns {number} Performance bonus (can be negative, clamped to -200K..+1M)
   */
  calculatePerformanceBonus(player, buyerSquad, teamStore) {
    if (!teamStore) return 0;

    const teamStoreState = typeof teamStore.getState === 'function' ? teamStore.getState() : teamStore;

    // Get player's IPM from their current team's stats
    const playerStats = player.currentTeam
      ? teamStoreState.getPlayerStats?.(player.currentTeam, player.id)
      : null;

    if (!playerStats || !playerStats.matches || playerStats.matches === 0) return 0;
    const playerIPM = (playerStats.totalImpact || 0) / playerStats.matches;

    // Get buyer squad IPMs
    const squadIPMs = [];
    for (const squadPlayer of buyerSquad) {
      const stats = squadPlayer.currentTeam
        ? teamStoreState.getPlayerStats?.(squadPlayer.currentTeam, squadPlayer.id)
        : null;
      if (stats && stats.matches > 0) {
        squadIPMs.push({
          ipm: (stats.totalImpact || 0) / stats.matches,
          soldPrice: squadPlayer.soldPrice || 0
        });
      }
    }

    if (squadIPMs.length === 0) return 0;

    // Insert listed player's IPM and find rank
    const allIPMs = [...squadIPMs.map(s => s.ipm), playerIPM];
    allIPMs.sort((a, b) => b - a); // Descending
    const rank = allIPMs.indexOf(playerIPM);

    // Sort buyer squad by soldPrice descending, find price at that rank
    const pricesSorted = squadIPMs.map(s => s.soldPrice).sort((a, b) => b - a);
    const justifiedPrice = rank < pricesSorted.length
      ? pricesSorted[rank]
      : pricesSorted[pricesSorted.length - 1] || 0;

    const soldPrice = player.soldPrice || 0;
    const bonus = justifiedPrice - soldPrice;
    const clamped = Math.max(-soldPrice * 0.4, Math.min(soldPrice * 1.0, Math.round(bonus)));

    console.log(`  📊 PERF ${(player.name || '?').padEnd(20)}: IPM=${playerIPM.toFixed(1)}, rank=${rank}/${allIPMs.length}, justifiedPrice=$${(justifiedPrice/1000).toFixed(0)}K, soldPrice=$${(soldPrice/1000).toFixed(0)}K, bonus=$${(clamped/1000).toFixed(0)}K`);

    return clamped;
  }

  // =============================================================================
  // SQUAD FIT SCORING (New Formula)
  // =============================================================================

  /**
   * Get a player's primary batting playstyle and its category
   * @param {Object} player - Player object
   * @returns {Object} { playstyle, rating, category }
   */
  getPrimaryBattingPlaystyle(player) {
    const battingRatings = player.playstyleRatings?.batting || {};
    const categoryMapping = this.config.playstyleCategoryMapping.batting;

    let primaryPlaystyle = null;
    let primaryRating = 0;

    for (const [playstyle, rating] of Object.entries(battingRatings)) {
      if (rating > primaryRating) {
        primaryRating = rating;
        primaryPlaystyle = playstyle;
      }
    }

    // Find which category this playstyle belongs to
    let category = null;
    if (primaryPlaystyle) {
      for (const [cat, playstyles] of Object.entries(categoryMapping)) {
        if (playstyles.includes(primaryPlaystyle)) {
          category = cat;
          break;
        }
      }
    }

    return { playstyle: primaryPlaystyle, rating: primaryRating, category };
  }

  /**
   * Get a player's primary bowling playstyle and determine best category based on squad needs
   * For bowling playstyles that belong to multiple categories, choose the less filled one
   * @param {Object} player - Player object
   * @param {Object} quotaBalances - Current quota balances for bowling categories
   * @returns {Object} { playstyle, rating, category }
   */
  getPrimaryBowlingPlaystyle(player, quotaBalances = null) {
    const bowlingRatings = player.playstyleRatings?.bowling || {};
    const categoryMapping = this.config.playstyleCategoryMapping.bowling;

    let primaryPlaystyle = null;
    let primaryRating = 0;

    for (const [playstyle, rating] of Object.entries(bowlingRatings)) {
      if (rating > primaryRating) {
        primaryRating = rating;
        primaryPlaystyle = playstyle;
      }
    }

    // Find all categories this playstyle belongs to
    let categories = [];
    if (primaryPlaystyle) {
      for (const [cat, playstyles] of Object.entries(categoryMapping)) {
        if (playstyles.includes(primaryPlaystyle)) {
          categories.push(cat);
        }
      }
    }

    // If multiple categories and we have quota balances, choose the less filled one
    let category = categories[0] || null;
    if (categories.length > 1 && quotaBalances) {
      let minBalance = Infinity;
      for (const cat of categories) {
        const balance = quotaBalances[cat]?.currentRating || 0;
        if (balance < minBalance) {
          minBalance = balance;
          category = cat;
        }
      }
    }

    return { playstyle: primaryPlaystyle, rating: primaryRating, category, allCategories: categories };
  }

  /**
   * Analyze team's playstyle coverage using rating quotas
   * Tracks PRIMARY playstyle contributions only (not all matching playstyles)
   * @param {Array} squad - Current squad players
   * @returns {Object} Coverage analysis with quota balances
   */
  analyzePlaystyleCoverage(squad) {
    const quotas = this.config.playstyleRatingQuotas;
    const idealComp = this.config.idealSquadComposition;

    const coverage = {
      batting: {},
      bowling: {},
      fielding: {},
      qualityGaps: {
        elite: { current: 0, target: idealComp.quality.elitePlayersTarget, gap: 0 },
        premium: { current: 0, target: idealComp.quality.premiumPlayersTarget, gap: 0 }
      }
    };

    // Initialize batting categories
    for (const [category, quota] of Object.entries(quotas.batting)) {
      coverage.batting[category] = {
        currentRating: 0,
        targetRating: quota,
        gap: quota,
        playerCount: 0
      };
    }

    // Initialize bowling categories
    for (const [category, quota] of Object.entries(quotas.bowling)) {
      coverage.bowling[category] = {
        currentRating: 0,
        targetRating: quota,
        gap: quota,
        playerCount: 0
      };
    }

    // Initialize fielding categories (wicketkeeping)
    for (const [category, quota] of Object.entries(quotas.fielding || {})) {
      coverage.fielding[category] = {
        currentRating: 0,
        targetRating: quota,
        gap: quota,
        playerCount: 0
      };
    }

    // Analyze squad - track PRIMARY playstyles only
    squad.forEach(player => {
      const primaryRating = this.core.getPrimaryPlaystyleRatingScore(player);
      const qualityTier = this.core.getQualityTier(primaryRating);

      if (qualityTier === 'elite') coverage.qualityGaps.elite.current++;
      if (qualityTier === 'elite' || qualityTier === 'premium') coverage.qualityGaps.premium.current++;

      // Get primary batting playstyle and its category
      const primaryBatting = this.getPrimaryBattingPlaystyle(player);
      if (primaryBatting.category && coverage.batting[primaryBatting.category]) {
        coverage.batting[primaryBatting.category].currentRating += primaryBatting.rating;
        coverage.batting[primaryBatting.category].playerCount++;
      }

      // For wicket-keepers, track wicketkeeping rating
      if (player.role === 'wicket-keeper') {
        const wkRating = this.getWicketkeepingRating(player);
        if (coverage.fielding.wicketkeeper) {
          coverage.fielding.wicketkeeper.currentRating += wkRating;
          coverage.fielding.wicketkeeper.playerCount++;
        }
      } else {
        // For non-keepers, get primary bowling playstyle and its category
        // Pass current balances to choose less filled category for multi-category playstyles
        const primaryBowling = this.getPrimaryBowlingPlaystyle(player, coverage.bowling);
        if (primaryBowling.category && coverage.bowling[primaryBowling.category]) {
          coverage.bowling[primaryBowling.category].currentRating += primaryBowling.rating;
          coverage.bowling[primaryBowling.category].playerCount++;
        }
      }
    });

    // Calculate gaps
    for (const category of Object.keys(coverage.batting)) {
      coverage.batting[category].gap = Math.max(0, coverage.batting[category].targetRating - coverage.batting[category].currentRating);
    }
    for (const category of Object.keys(coverage.bowling)) {
      coverage.bowling[category].gap = Math.max(0, coverage.bowling[category].targetRating - coverage.bowling[category].currentRating);
    }
    for (const category of Object.keys(coverage.fielding)) {
      coverage.fielding[category].gap = Math.max(0, coverage.fielding[category].targetRating - coverage.fielding[category].currentRating);
    }
    coverage.qualityGaps.elite.gap = Math.max(0, coverage.qualityGaps.elite.target - coverage.qualityGaps.elite.current);
    coverage.qualityGaps.premium.gap = Math.max(0, coverage.qualityGaps.premium.target - coverage.qualityGaps.premium.current);

    return coverage;
  }

  /**
   * Analyze team needs including role-level and playstyle-level data
   * @param {Array} squad - Current squad
   * @returns {Object} Enhanced team needs
   */
  analyzeTeamNeeds(squad) {
    const playstyleCoverage = this.analyzePlaystyleCoverage(squad);

    const currentComposition = { batsman: 0, bowler: 0, 'all-rounder': 0, 'wicket-keeper': 0 };
    squad.forEach(player => {
      const role = player.role || 'batsman';
      currentComposition[role] = (currentComposition[role] || 0) + 1;
    });

    const idealComposition = { batsman: 10, bowler: 8, 'all-rounder': 5, 'wicket-keeper': 2 };
    const roleNeeds = {};
    for (const role in idealComposition) {
      roleNeeds[role] = Math.max(0, idealComposition[role] - currentComposition[role]);
    }

    return {
      ...roleNeeds,
      batting: playstyleCoverage.batting,
      bowling: playstyleCoverage.bowling,
      fielding: playstyleCoverage.fielding,
      qualityGaps: playstyleCoverage.qualityGaps
    };
  }

  /**
   * Evaluate how well a player fits team needs using new formula
   *
   * Formula: fitScore = cuberoot(
   *   [playerBatRating * quotaCap[batcat] / (currentBalance[batcat] + playerBatRating)]^3 +
   *   [playerBowlRating * quotaCap[bowlcat] / (currentBalance[bowlcat] + playerBowlRating)]^3
   * )
   *
   * For wicketkeepers: use wicketkeeping rating and quota instead of bowling
   * For bowling with multiple categories: choose the less filled one
   *
   * @param {Object} player - Player being evaluated
   * @param {Object} teamNeeds - Team needs analysis
   * @returns {Object} Fit analysis with fitScore
   */
  evaluatePlayerFit(player, teamNeeds) {
    const quotas = this.config.playstyleRatingQuotas;
    const role = player.role;
    const fillsGaps = [];

    // Get player's primary batting playstyle and category
    const primaryBatting = this.getPrimaryBattingPlaystyle(player);
    const playerBatRating = primaryBatting.rating || 0;
    const batCategory = primaryBatting.category;

    // Calculate batting contribution to fit score
    let battingComponent = 0;
    if (batCategory && teamNeeds.batting && teamNeeds.batting[batCategory]) {
      const quotaCap = quotas.batting[batCategory] || 1;
      const currentBalance = teamNeeds.batting[batCategory].currentRating || 0;

      // Formula: playerRating * quotaCap / (currentBalance + playerRating)
      // This gives higher value when currentBalance is low relative to quota
      battingComponent = (playerBatRating * quotaCap) / (currentBalance + playerBatRating + 1);

      if (teamNeeds.batting[batCategory].gap > 0) {
        fillsGaps.push({
          category: batCategory,
          type: 'batting',
          rating: playerBatRating,
          contribution: battingComponent
        });
      }
    }

    // Calculate secondary contribution (bowling or wicketkeeping)
    let secondaryComponent = 0;
    let secondaryCategory = null;

    if (role === 'wicket-keeper') {
      // For wicketkeepers: use wicketkeeping rating and quota
      const wkRating = this.getWicketkeepingRating(player);
      if (teamNeeds.fielding && teamNeeds.fielding.wicketkeeper) {
        const quotaCap = quotas.fielding?.wicketkeeper || 350;
        const currentBalance = teamNeeds.fielding.wicketkeeper.currentRating || 0;

        secondaryComponent = (wkRating * quotaCap) / (currentBalance + wkRating + 1);
        secondaryCategory = 'wicketkeeper';

        if (teamNeeds.fielding.wicketkeeper.gap > 0) {
          fillsGaps.push({
            category: 'wicketkeeper',
            type: 'fielding',
            rating: wkRating,
            contribution: secondaryComponent
          });
        }
      }
    } else {
      // For non-keepers: use bowling rating
      // Pass current balances to choose less filled category for multi-category playstyles
      const primaryBowling = this.getPrimaryBowlingPlaystyle(player, teamNeeds.bowling);
      const playerBowlRating = primaryBowling.rating || 0;
      const bowlCategory = primaryBowling.category;

      if (bowlCategory && teamNeeds.bowling && teamNeeds.bowling[bowlCategory]) {
        const quotaCap = quotas.bowling[bowlCategory] || 1;
        const currentBalance = teamNeeds.bowling[bowlCategory].currentRating || 0;

        secondaryComponent = (playerBowlRating * quotaCap) / (currentBalance + playerBowlRating + 1);
        secondaryCategory = bowlCategory;

        if (teamNeeds.bowling[bowlCategory].gap > 0) {
          fillsGaps.push({
            category: bowlCategory,
            type: 'bowling',
            rating: playerBowlRating,
            contribution: secondaryComponent
          });
        }
      }
    }

    // Calculate fit score using cuberoot formula
    // fitScore = cuberoot(battingComponent^3 + secondaryComponent^3)
    const fitScore = this.calculateCombinedRating(battingComponent, secondaryComponent);

    return { fitScore, fillsGaps, batCategory, secondaryCategory };
  }

  // =============================================================================
  // AUCTION BIDDING
  // =============================================================================

  /**
   * Decide whether AI team should bid on a player
   * @param {Object} player - Player being auctioned
   * @param {number} currentPrice - Current bid price
   * @param {Object} team - Team object
   * @param {number} auctionProgress - Auction progress (0-1)
   * @returns {Object} { shouldBid, maxBid, reason }
   */
  shouldBid(player, currentPrice, team, auctionProgress = 0) {
    const budgetRemaining = team.budgetRemaining;
    const squadSize = team.squad.length;

    if (budgetRemaining <= currentPrice) {
      return { shouldBid: false, maxBid: 0, reason: 'Insufficient budget' };
    }

    if (squadSize >= this.config.squadSize.max) {
      return { shouldBid: false, maxBid: 0, reason: 'Squad full' };
    }

    const teamNeeds = this.analyzeTeamNeeds(team.squad);
    const playerFit = this.evaluatePlayerFit(player, teamNeeds);
    // For auction bidding, use budgetRemaining as annualBudget proxy (no salary system in auction)
    const marketValue = this.estimateMarketValue(player, playerFit.fitScore, budgetRemaining, squadSize, teamNeeds);

    const reserveAmount = this.calculateReserveAmount(squadSize, budgetRemaining);
    const effectiveBudget = budgetRemaining - reserveAmount;
    const maxBid = Math.min(marketValue, effectiveBudget);

    if (currentPrice >= maxBid) {
      return { shouldBid: false, maxBid: 0, reason: `Price ${this.core.formatPrice(currentPrice)} >= value ${this.core.formatPrice(maxBid)}` };
    }

    const gapInfo = playerFit.fillsGaps.length > 0
      ? `Fills ${playerFit.fillsGaps.map(g => g.category).join(', ')}`
      : 'Need player';

    return {
      shouldBid: true,
      maxBid,
      reason: `${gapInfo} (value: ${this.core.formatPrice(marketValue)}, fit: ${playerFit.fitScore.toFixed(0)})`
    };
  }

  /**
   * Calculate reserve amount needed for minimum squad
   * @param {number} currentSquadSize - Current squad size
   * @param {number} budgetRemaining - Remaining budget
   * @returns {number} Reserve amount
   */
  calculateReserveAmount(currentSquadSize, budgetRemaining) {
    const minSquad = this.config.squadSize.min;
    const playersNeeded = Math.max(0, minSquad - currentSquadSize);

    if (playersNeeded === 0) return 0;

    const minPrice = this.config.priceSlabs.slabs[this.config.priceSlabs.slabs.length - 1].basePrice;
    const reserve = playersNeeded * minPrice * 1.5;

    return Math.min(reserve, budgetRemaining * this.config.aiStrategy.conservativeMode.reserveForMinSquad);
  }

  /**
   * Determine winning bid in second-price auction
   * Winner pays 2nd highest bid + increment
   * @param {Array} bids - Array of { teamId, amount }
   * @returns {Object} { winner, paidPrice }
   */
  determineWinningBid(bids) {
    if (bids.length === 0) return null;

    // Sort by amount descending
    const sorted = [...bids].sort((a, b) => b.amount - a.amount);

    const winnerBid = sorted[0];

    // Second-price auction: pay second highest + increment
    // If only one bidder, pay their max bid
    const secondPrice = sorted[1]?.amount || winnerBid.amount;
    const increment = this.core.getBidIncrement(secondPrice);

    return {
      winner: winnerBid.teamId,
      team: winnerBid.team,
      paidPrice: Math.min(winnerBid.amount, secondPrice + increment)
    };
  }

  /**
   * Calculate next bid amount
   * @param {number} currentPrice - Current price
   * @returns {number} Next bid amount
   */
  calculateNextBid(currentPrice) {
    return currentPrice + this.core.getBidIncrement(currentPrice);
  }

  /**
   * Check if player is marquee
   * @param {Object} player - Player object
   * @returns {boolean}
   */
  isMarqueePlayer(player) {
    const primaryRating = this.core.getPrimaryPlaystyleRatingScore(player);
    return primaryRating >= this.config.marquee.threshold;
  }

  /**
   * Get AI bid delay for simulation
   * @returns {number} Delay in milliseconds
   */
  getRandomBidDelay() {
    const minDelay = this.config.timing.aiBidDelayMin * 1000;
    const maxDelay = this.config.timing.aiBidDelayMax * 1000;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  // =============================================================================
  // TRANSFER WINDOW
  // =============================================================================

  /**
   * Evaluate if a player should be sold based on performance
   * @param {Object} player - Player object with season stats
   * @param {Object} teamStats - Team average stats
   * @returns {Object} { shouldSell, reason, internalValue }
   */
  evaluateForSale(player, teamStats) {
    const performanceMultiplier = this.calculatePerformanceMultiplier(player, teamStats);
    const purchasePrice = player.purchasePrice || player.soldPrice || this.calculateBasePrice(player);

    // Calculate internal value
    const internalValue = Math.round((purchasePrice * performanceMultiplier) / 10000) * 10000;

    // Sell threshold: multiplier < 0.7
    const shouldSell = performanceMultiplier < 0.7;

    return {
      shouldSell,
      performanceMultiplier,
      internalValue,
      reason: shouldSell ? `Underperforming (${(performanceMultiplier * 100).toFixed(0)}% of expected)` : 'Performing adequately'
    };
  }

  /**
   * Calculate performance multiplier for a player
   * @param {Object} player - Player with season stats
   * @param {Object} teamStats - Team average stats
   * @returns {number} Performance multiplier (0.5-2.0)
   */
  calculatePerformanceMultiplier(player, teamStats) {
    const role = player.role;
    const stats = player.seasonStats || {};

    if (role === 'batsman' || role === 'wicket-keeper') {
      const playerAvg = stats.battingAverage || 0;
      const playerSR = stats.strikeRate || 0;
      const teamAvg = teamStats.battingAverage || 25;
      const teamSR = teamStats.strikeRate || 130;

      if (playerAvg === 0 && playerSR === 0) return 1.0;

      const avgRatio = playerAvg / teamAvg;
      const srRatio = playerSR / teamSR;
      return Math.max(0.5, Math.min(2.0, (avgRatio + srRatio) / 2));
    }

    if (role === 'bowler') {
      const playerEcon = stats.economy || 99;
      const playerAvg = stats.bowlingAverage || 99;
      const teamEcon = teamStats.economy || 8;
      const teamAvg = teamStats.bowlingAverage || 25;

      const econRatio = teamEcon / playerEcon;
      const avgRatio = teamAvg / playerAvg;
      return Math.max(0.5, Math.min(2.0, (econRatio + avgRatio) / 2));
    }

    if (role === 'all-rounder') {
      const battingMultiplier = this.calculatePerformanceMultiplier({ ...player, role: 'batsman' }, teamStats);
      const bowlingMultiplier = this.calculatePerformanceMultiplier({ ...player, role: 'bowler' }, teamStats);

      // For all-rounders, BOTH must be < 0.7 to trigger sale
      if (battingMultiplier < 0.7 && bowlingMultiplier < 0.7) {
        return Math.min(battingMultiplier, bowlingMultiplier);
      }
      return (battingMultiplier + bowlingMultiplier) / 2;
    }

    return 1.0;
  }
}

export default AuctionTransferAI;
