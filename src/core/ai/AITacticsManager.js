/**
 * @file AITacticsManager.js
 * @description Multi-stage pre-match tactics pipeline for AI teams
 *
 * 5-Stage Pipeline:
 * 1. Playing XI Selection (60% primary role rating + 40% playstyle fit - role gap penalty - fitness penalty)
 * 2. Playstyle Revision + C/VC/WK Assignment
 * 3. Batting Order + Acceleration Tiers
 * 4. Bowling Over Assignment + Plans
 * 5. Field Setup + Position Assignment
 */

import aiCore from './AICore.js';
import aiConfig from '../../data/config/ai-config.json';

class AITacticsManager {
  constructor() {
    this.config = aiConfig;
    this.tacticsCache = new Map(); // teamId -> { tactics, squadHash }
  }

  /**
   * Generate a hash from squad state (player IDs + injury status)
   * Used to detect when tactics need to be regenerated
   * Note: We don't include fitness as it changes daily and would cause excessive cache misses
   * @param {Object[]} squad - Full squad
   * @returns {string} Hash string
   * @private
   */
  _getSquadHash(squad) {
    return squad
      .map(p => `${p.id}:${p.condition?.injury ? 1 : 0}`)
      .sort()
      .join('|');
  }

  /**
   * Get cached tactics or generate new ones if cache is invalid
   * Use this for performance during simulation instead of generateTactics directly
   * @param {string} teamId - Team ID
   * @param {Object[]} squad - Full squad (25 players)
   * @param {Object} teamStore - Team store for updating tactics
   * @returns {Object} Complete tactics configuration (cached or fresh)
   */
  getCachedOrGenerateTactics(teamId, squad, teamStore) {
    const currentHash = this._getSquadHash(squad);
    const cached = this.tacticsCache.get(teamId);

    if (cached && cached.squadHash === currentHash) {
      // Return cached tactics - no regeneration needed
      return cached.tactics;
    }

    // Generate fresh tactics and cache them
    const tactics = this.generateTactics(teamId, squad, teamStore);
    if (tactics) {
      this.tacticsCache.set(teamId, { tactics, squadHash: currentHash });
    }
    return tactics;
  }

  /**
   * Invalidate tactics cache for a specific team or all teams
   * Call this when squad changes (injuries, transfers, season start)
   * @param {string|null} teamId - Team ID to invalidate, or null to clear all
   */
  invalidateCache(teamId = null) {
    if (teamId) {
      this.tacticsCache.delete(teamId);
    } else {
      this.tacticsCache.clear();
    }
  }

  /**
   * Run full pre-match tactics pipeline for an AI team
   * @param {string} teamId - Team ID
   * @param {Object[]} squad - Full squad (25 players)
   * @param {Object} teamStore - Team store for updating tactics
   * @returns {Object} Complete tactics configuration
   */
  generateTactics(teamId, squad, teamStore) {
    if (!squad || squad.length < 11) {
      console.error(`[AITacticsManager] Cannot generate tactics - squad has ${squad?.length || 0} players`);
      return null;
    }

    // Stage 1: Select Playing XI
    const playingXI = this.selectPlayingXI(squad);

    // Stage 2: Playstyle Revision + C/VC/WK Assignment
    const { playstyleOverrides, captain, viceCaptain, wicketKeeper } = this.assignRolesAndPlaystyles(playingXI);

    // Stage 3: Batting Order + Acceleration Tiers
    const { battingOrder, accelerationTiers } = this.optimizeBattingOrder(playingXI, playstyleOverrides);

    // Stage 4: Bowling Over Assignment + Plans
    const isUserTeam = teamStore ? teamId === teamStore.getState().userTeamId : false;
    const { bowlingRotation, overAssignments, bowlingPlans } = this.assignBowlingTactics(playingXI, playstyleOverrides, isUserTeam);

    // Stage 5: Field Setup
    const fieldFormation = this.selectFieldFormation(playingXI);

    // Build complete tactics object
    const tactics = {
      squadSelection: playingXI.map(p => p.id),
      playstyleOverrides,
      captain,
      viceCaptain,
      wicketKeeper,
      battingOrder: battingOrder.map(p => p.id),
      accelerationTiers,
      bowlingRotation,
      overAssignments,
      bowlingPlans,
      fieldFormation
    };

    // Update team store if provided
    if (teamStore) {
      teamStore.getState().setTeamTactics(teamId, tactics);
    }

    return tactics;
  }

  // ============================================
  // STAGE 1: Playing XI Selection
  // ============================================

  /**
   * Select optimal Playing XI from squad
   * Formula: 50% primary role rating + 50% playstyle fit - role gap penalty - fitness penalty
   * Includes refinement iterations to optimize final selection
   * @param {Object[]} squad - Full squad
   * @returns {Object[]} Selected 11 players
   */
  selectPlayingXI(squad) {
    const config = this.config.squadSelection;
    const weights = config.weights;
    const refinementIterations = config.refinementIterations || 5;

    // Filter out injured players
    const availablePlayers = squad.filter(p => !p.condition?.injury);

    if (availablePlayers.length < 11) {
      console.warn('[AITacticsManager] Not enough healthy players, including injured');
      return squad.slice(0, 11);
    }

    // Iterative selection with dynamic role gap recalculation
    const selected = [];
    const remaining = [...availablePlayers];

    while (selected.length < 11 && remaining.length > 0) {
      // Calculate current composition
      const composition = this._getComposition(selected);

      // Score all remaining players
      const scoredPlayers = remaining.map(player => {
        const score = this._calculatePlayerScore(player, selected, composition, weights, config);
        return { player, score };
      });

      // Sort by score descending
      scoredPlayers.sort((a, b) => b.score - a.score);

      // Select best player
      const best = scoredPlayers[0];
      selected.push(best.player);
      remaining.splice(remaining.indexOf(best.player), 1);
    }

    // Refinement phase: compare selected vs unselected and swap if beneficial
    this._refineSelection(selected, remaining, weights, config, refinementIterations);

    console.log(`[AITacticsManager] Selected XI composition: ${this._formatComposition(this._getComposition(selected))}`);
    return selected;
  }

  /**
   * Refine selection by comparing selected vs unselected players
   * Uses symmetric scoring: XI players scored against full XI, unselected scored against 10-player baseline
   * Tries replacing worst player first, then 2nd worst, etc. until a swap is found or all tried
   * @param {Object[]} selected - Currently selected players (mutated in place)
   * @param {Object[]} remaining - Unselected players (mutated in place)
   * @param {Object} weights - Scoring weights
   * @param {Object} config - Squad selection config
   * @param {number} maxIterations - Maximum number of swap iterations
   * @private
   */
  _refineSelection(selected, remaining, weights, config, maxIterations) {
    if (remaining.length === 0) return;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let swapMade = false;

      // STEP 1: Score all XI players
      // Each player is scored against the other 10 (excluding self to avoid double-counting in fit score)
      const xiScores = selected.map((player, idx) => {
        const othersInXI = selected.filter((_, j) => j !== idx);
        const composition = this._getComposition(othersInXI);
        const score = this._calculatePlayerScore(player, othersInXI, composition, weights, config);
        return { player, score, index: idx };
      });

      // Sort by score ascending (worst first)
      xiScores.sort((a, b) => a.score - b.score);

      // STEP 2 & 3: Try replacing each XI player starting from worst
      for (const candidate of xiScores) {
        // Create baseline: XI minus this candidate (10 players)
        const baseline = selected.filter((_, j) => j !== candidate.index);
        const baselineComposition = this._getComposition(baseline);

        // Score all unselected against this 10-player baseline
        // (unselected player is not in baseline, so no double-counting issue)
        const unselectedScores = remaining.map(player => {
          const score = this._calculatePlayerScore(player, baseline, baselineComposition, weights, config);
          return { player, score };
        });

        // Find best unselected
        unselectedScores.sort((a, b) => b.score - a.score);
        const bestUnselected = unselectedScores[0];

        // Compare: Can best unselected beat this XI player?
        // Both are scored against the same 10-player baseline for fair comparison
        if (bestUnselected.score > candidate.score) {
          // Perform swap
          selected[candidate.index] = bestUnselected.player;
          remaining.splice(remaining.indexOf(bestUnselected.player), 1);
          remaining.push(candidate.player);

          swapMade = true;
          break; // Go back to Step 1 (next iteration)
        }
        // If no swap possible for this candidate, try next worst XI player
      }

      // If no swap was made after trying all positions, refinement complete
      if (!swapMade) break;
    }
  }

  /**
   * Calculate selection score for a player
   * @private
   */
  _calculatePlayerScore(player, currentSelected, composition, weights, config) {
    // Base score: Primary role rating (0-100 scale)
    const primaryRating = aiCore.getPrimaryPlaystyleRatingScore(player);
    const baseScore = primaryRating * weights.primaryRoleRating;

    // Playstyle fit score (considers rating caps)
    const playstyleFitScore = this._calculatePlaystyleFitScore(player, currentSelected) * weights.playstyleFit;

    // Role gap penalty
    const roleGapPenalty = this._calculateRoleGapPenalty(player, composition, config.roleGapPenalty);

    // Fitness penalty
    const fitnessPenalty = aiCore.getFitnessPenalty(player);

    const totalScore = baseScore + playstyleFitScore - roleGapPenalty - fitnessPenalty;

    return totalScore;
  }

  /**
   * Get detailed score breakdown for a player against current selection
   * @param {Object} player - Player to evaluate
   * @param {Object[]} currentSelected - Currently selected players (playing XI)
   * @param {boolean} debug - If true, include detailed fit score breakdown
   * @returns {Object} Score breakdown with all components
   */
  getPlayerScoreBreakdown(player, currentSelected, debug = false) {
    const config = this.config.squadSelection;
    const weights = config.weights;

    // Exclude the player being evaluated from currentSelected to avoid double-counting
    const othersInXI = currentSelected.filter(p => p.id !== player.id);
    const composition = this._getComposition(othersInXI);

    const primaryRating = aiCore.getPrimaryPlaystyleRatingScore(player);
    const baseScore = primaryRating * weights.primaryRoleRating;
    const playstyleFitRaw = this._calculatePlaystyleFitScore(player, othersInXI);
    const playstyleFitScore = playstyleFitRaw * weights.playstyleFit;
    const roleGapPenalty = this._calculateRoleGapPenalty(player, composition, config.roleGapPenalty);
    const fitnessPenalty = aiCore.getFitnessPenalty(player);
    const totalScore = baseScore + playstyleFitScore - roleGapPenalty - fitnessPenalty;

    const result = {
      primaryRating,
      baseScore,
      playstyleFitRaw,
      playstyleFitScore,
      roleGapPenalty,
      fitnessPenalty,
      totalScore,
      weights
    };

    // Add detailed fit score breakdown if debug mode
    if (debug) {
      result.fitDebug = this._getPlaystyleFitDebug(player, othersInXI);
    }

    return result;
  }

  /**
   * Get detailed breakdown of playstyle fit score calculation
   * @private
   */
  _getPlaystyleFitDebug(player, currentSelected) {
    const ratingCaps = this.config.squadSelection.playstyleRatingCaps;
    const debug = { batting: null, bowling: null, fielding: null };

    // Batting fit debug
    const battingPlaystyle = player.primaryPlaystyle?.batting;
    if (battingPlaystyle) {
      const battingRating = player.playstyleRatings?.batting?.[battingPlaystyle] || 0;

      for (const [category, categoryConfig] of Object.entries(ratingCaps.batting)) {
        if (categoryConfig.playstyles.includes(battingPlaystyle)) {
          const otherPlayersSum = this._getCategorySum(currentSelected, categoryConfig.playstyles, 'batting');
          const currentSum = battingRating + otherPlayersSum;
          const cap = categoryConfig.cap;
          const fitScore = battingRating * cap / (currentSum * categoryConfig.requiredCount);

          // Find which players contribute to otherPlayersSum
          const contributors = currentSelected
            .filter(p => {
              const ps = p.primaryPlaystyle?.batting;
              return ps && categoryConfig.playstyles.includes(ps);
            })
            .map(p => ({
              name: p.name,
              playstyle: p.primaryPlaystyle?.batting,
              rating: p.playstyleRatings?.batting?.[p.primaryPlaystyle?.batting] || 0
            }));

          debug.batting = {
            playstyle: battingPlaystyle,
            playerRating: battingRating,
            category,
            cap,
            requiredCount: categoryConfig.requiredCount,
            otherPlayersSum,
            currentSum,
            formula: `${battingRating.toFixed(1)} * ${cap} / (${currentSum.toFixed(1)} * ${categoryConfig.requiredCount})`,
            fitScore,
            contributors
          };
          break;
        }
      }
    }

    // Bowling fit debug (only if can bowl)
    const bowlingPlaystyle = player.primaryPlaystyle?.bowling;
    if (bowlingPlaystyle && aiCore.canBowl(player)) {
      const bowlingRating = player.playstyleRatings?.bowling?.[bowlingPlaystyle] || 0;

      // Step 1: Find all categories that this playstyle belongs to
      const matchingCategories = [];
      for (const [category, categoryConfig] of Object.entries(ratingCaps.bowling)) {
        if (categoryConfig.playstyles.includes(bowlingPlaystyle)) {
          const categorySum = this._getCategorySum(currentSelected, categoryConfig.playstyles, 'bowling');
          const fillPercentage = categorySum / categoryConfig.cap;
          matchingCategories.push({ category, categoryConfig, categorySum, fillPercentage });
        }
      }

      // Step 2: Select the least filled category
      if (matchingCategories.length > 0) {
        matchingCategories.sort((a, b) => a.fillPercentage - b.fillPercentage);
        const leastFilled = matchingCategories[0];

        // Step 3: Calculate fit score
        const otherPlayersSum = leastFilled.categorySum;
        const currentSum = bowlingRating + otherPlayersSum;
        const cap = leastFilled.categoryConfig.cap;
        const fitScore = bowlingRating * cap / (currentSum * leastFilled.categoryConfig.requiredCount);

        // Get contributors for the selected category
        const contributors = currentSelected
          .filter(p => {
            if (!aiCore.canBowl(p)) return false;
            const ps = p.primaryPlaystyle?.bowling;
            return ps && leastFilled.categoryConfig.playstyles.includes(ps);
          })
          .map(p => ({
            name: p.name,
            playstyle: p.primaryPlaystyle?.bowling,
            rating: p.playstyleRatings?.bowling?.[p.primaryPlaystyle?.bowling] || 0
          }));

        debug.bowling = {
          playstyle: bowlingPlaystyle,
          playerRating: bowlingRating,
          category: leastFilled.category,
          cap,
          requiredCount: leastFilled.categoryConfig.requiredCount,
          otherPlayersSum,
          currentSum,
          fillPercentage: (leastFilled.fillPercentage * 100).toFixed(1) + '%',
          allMatchingCategories: matchingCategories.map(c => `${c.category}(${(c.fillPercentage * 100).toFixed(0)}%)`).join(', '),
          formula: `${bowlingRating.toFixed(1)} * ${cap} / (${currentSum.toFixed(1)} * ${leastFilled.categoryConfig.requiredCount})`,
          fitScore,
          contributors
        };
      }
    }

    // Fielding fit debug (only for wicket-keepers)
    if (ratingCaps.fielding && aiCore.isWicketKeeper(player)) {
      const fieldingPlaystyle = player.primaryPlaystyle?.fielding || 'Wicketkeeper';
      const fieldingRating = player.playstyleRatings?.fielding?.[fieldingPlaystyle] ||
                            player.playstyleRatings?.fielding?.Wicketkeeper || 0;

      // Check if this player has the highest keeper rating among currently selected
      let isHighestRated = true;
      const otherKeepers = currentSelected
        .filter(p => aiCore.isWicketKeeper(p))
        .map(p => {
          const ps = p.primaryPlaystyle?.fielding || 'Wicketkeeper';
          const rating = p.playstyleRatings?.fielding?.[ps] ||
                        p.playstyleRatings?.fielding?.Wicketkeeper || 0;
          if (rating > fieldingRating) {
            isHighestRated = false;
          }
          return {
            name: p.name,
            playstyle: ps,
            rating
          };
        });

      const fitScore = isHighestRated ? fieldingRating : 0;

      debug.fielding = {
        playstyle: fieldingPlaystyle,
        playerRating: fieldingRating,
        isHighestRated,
        formula: isHighestRated ? `${fieldingRating.toFixed(1)} (highest rated keeper)` : '0 (not highest rated keeper)',
        fitScore,
        otherKeepers
      };
    }

    return debug;
  }

  /**
   * Calculate playstyle fit score based on rating caps
   * Higher score when player fills a playstyle type that's not yet saturated
   * @private
   */
  _calculatePlaystyleFitScore(player, currentSelected) {
    const ratingCaps = this.config.squadSelection.playstyleRatingCaps;
    let bestFitScore = 0;

    // Check batting playstyle fit
    const battingPlaystyle = player.primaryPlaystyle?.batting;
    if (battingPlaystyle) {
      const battingRating = player.playstyleRatings?.batting?.[battingPlaystyle] || 0;

      // Find which category this playstyle belongs to
      for (const [category, categoryConfig] of Object.entries(ratingCaps.batting)) {
        if (categoryConfig.playstyles.includes(battingPlaystyle)) {
          // Calculate current sum for this category
          const currentSum = battingRating + this._getCategorySum(currentSelected, categoryConfig.playstyles, 'batting');
          const cap = categoryConfig.cap;
          const fitScore = battingRating * cap / (currentSum * categoryConfig.requiredCount);
          bestFitScore += fitScore;
          break;
        }
      }
    }
    
    // Check bowling playstyle fit for bowlers/all-rounders
    const bowlingPlaystyle = player.primaryPlaystyle?.bowling;
    if (bowlingPlaystyle && aiCore.canBowl(player)) {
      const bowlingRating = player.playstyleRatings?.bowling?.[bowlingPlaystyle] || 0;

      // Step 1: Find all categories that this playstyle belongs to
      const matchingCategories = [];
      for (const [category, categoryConfig] of Object.entries(ratingCaps.bowling)) {
        if (categoryConfig.playstyles.includes(bowlingPlaystyle)) {
          const categorySum = this._getCategorySum(currentSelected, categoryConfig.playstyles, 'bowling');
          const fillPercentage = categorySum / categoryConfig.cap;
          matchingCategories.push({ category, categoryConfig, categorySum, fillPercentage });
        }
      }

      // Step 2: Select the least filled category
      if (matchingCategories.length > 0) {
        matchingCategories.sort((a, b) => a.fillPercentage - b.fillPercentage);
        const leastFilled = matchingCategories[0];

        // Step 3: Calculate fit score for the least filled category
        const currentSum = bowlingRating + leastFilled.categorySum;
        const cap = leastFilled.categoryConfig.cap;
        const fitScore = bowlingRating * cap / (currentSum * leastFilled.categoryConfig.requiredCount);
        bestFitScore += fitScore;
      }
    }

    // Check fielding fit for wicket-keepers
    // Simply use the player's fielding rating if they are a keeper with highest rating among selected
    if (aiCore.isWicketKeeper(player)) {
      const fieldingPlaystyle = player.primaryPlaystyle?.fielding || 'Wicketkeeper';
      const playerFieldingRating = player.playstyleRatings?.fielding?.[fieldingPlaystyle] ||
                                    player.playstyleRatings?.fielding?.Wicketkeeper || 0;
      
      // Check if this player has the highest keeper rating among currently selected
      let isHighestRated = true;
      for (const selectedPlayer of currentSelected) {
        if (aiCore.isWicketKeeper(selectedPlayer)) {
          const selectedPlaystyle = selectedPlayer.primaryPlaystyle?.fielding || 'Wicketkeeper';
          const selectedRating = selectedPlayer.playstyleRatings?.fielding?.[selectedPlaystyle] ||
                                selectedPlayer.playstyleRatings?.fielding?.Wicketkeeper || 0;
          if (selectedRating > playerFieldingRating) {
            isHighestRated = false;
            break;
          }
        }
      }
      
      if (isHighestRated) {
        bestFitScore += playerFieldingRating;
      }
    }

    return bestFitScore;
  }

  /**
   * Get sum of ratings for players matching given playstyles
   * @param {Object[]} players - Players to sum
   * @param {string[]} playstyles - Playstyles to match
   * @param {string} type - 'batting', 'bowling', or 'fielding'
   * @private
   */
  _getCategorySum(players, playstyles, type) {
    let sum = 0;
    for (const player of players) {
      // For bowling, only include players who can actually bowl
      if (type === 'bowling' && !aiCore.canBowl(player)) {
        continue;
      }
      // For fielding (wicket-keeping), only include wicket-keepers
      if (type === 'fielding' && !aiCore.isWicketKeeper(player)) {
        continue;
      }
      const playerPlaystyle = player.primaryPlaystyle?.[type];
      if (playerPlaystyle && playstyles.includes(playerPlaystyle)) {
        sum += player.playstyleRatings?.[type]?.[playerPlaystyle] || 0;
      }
    }
    return sum;
  }

  /**
   * Calculate role gap penalty
   * Penalty applied to players NOT contributing to unfilled roles
   * @private
   */
  _calculateRoleGapPenalty(player, composition, gapConfig) {
    const thresholds = gapConfig.thresholds;
    const fullPenalty = gapConfig.fullPenaltyMagnitude;
    let totalPenalty = 0;

    // Bowling gap
    const bowlingGap = Math.max(0, thresholds.bowlingOptions - composition.bowlingOptions);
    if (bowlingGap > 0) {
      const bowlingGapRatio = bowlingGap / thresholds.bowlingOptions;
      // If player CAN bowl, no penalty; otherwise apply penalty
      if (!aiCore.canBowl(player)) {
        totalPenalty += fullPenalty * bowlingGapRatio;
      }
    }

    // Wicket-keeper gap
    const keeperGap = Math.max(0, thresholds.wicketKeeper - composition.wicketKeepers);
    if (keeperGap > 0) {
      // If player IS a keeper, no penalty; otherwise apply full penalty
      if (!aiCore.isWicketKeeper(player)) {
        totalPenalty += fullPenalty; // Full penalty since we need exactly 1
      }
    }

    // Batting gap (ensure enough batting depth)
    const battingGap = Math.max(0, thresholds.battingOptions - composition.battingOptions);
    if (battingGap > 0) {
      const battingGapRatio = battingGap / thresholds.battingOptions;
      // Bowlers who can't bat well get penalized
      if (player.role === 'bowler') {
        const battingRating = this._getPlayerBattingRating(player);
        if (battingRating < 40) { // Poor batting ability
          totalPenalty += fullPenalty * battingGapRatio * 0.5;
        }
      }
    }

    return totalPenalty;
  }

  /**
   * Get player's batting rating
   * @private
   */
  _getPlayerBattingRating(player) {
    const battingAttrs = player.attributes?.batting;
    if (!battingAttrs) return 0;
    const values = Object.values(battingAttrs).filter(v => typeof v === 'number');
    if (values.length === 0) return 0;
    return (values.reduce((sum, v) => sum + v, 0) / values.length) * 5;
  }

  /**
   * Get player's highest rating for a specific playstyle category from config
   * @param {Object} player - Player object
   * @param {string} category - Category name from config (batting: 'openers', 'topOrder', 'middleOrder', 'lowerOrder', 'tailenders' | bowling: 'powerplay', 'earlyMiddle', 'lateMiddle', 'death')
   * @param {string} type - Type of rating: 'batting' or 'bowling'. Defaults to 'batting'
   * @returns {Object} Object with { rating: number, playstyle: string|null }
   * @private
   */
  _getPlayerBestCategoryRating(player, category, type = 'batting') {
    const playstyleRatings = player.playstyleRatings?.[type];
    if (!playstyleRatings) return { rating: 0, playstyle: null };

    const ratingCaps = this.config.squadSelection.playstyleRatingCaps;
    const categoryConfig = ratingCaps[type][category];
    
    if (!categoryConfig) return { rating: 0, playstyle: null };

    let maxRating = 0;
    let bestPlaystyle = null;
    
    // Find the highest rated playstyle from the category's playstyle list
    for (const playstyleName of categoryConfig.playstyles) {
      const rating = playstyleRatings[playstyleName] || 0;
      if (rating > maxRating) {
        maxRating = rating;
        bestPlaystyle = playstyleName;
      }
    }

    return { rating: maxRating, playstyle: bestPlaystyle };
  }

  /**
   * Get current team composition
   * @private
   */
  _getComposition(players) {
    const composition = {
      wicketKeepers: 0,
      bowlingOptions: 0,
      battingOptions: 0,
      batsmen: 0,
      bowlers: 0,
      allRounders: 0
    };

    for (const player of players) {
      if (player.role === 'wicket-keeper') {
        composition.wicketKeepers++;
        composition.battingOptions++;
      } else if (player.role === 'batsman') {
        composition.batsmen++;
        composition.battingOptions++;
      } else if (player.role === 'bowler') {
        composition.bowlers++;
        composition.bowlingOptions++;
        // Bowlers with decent batting also count as batting options
        if (this._getPlayerBattingRating(player) >= 40) {
          composition.battingOptions++;
        }
      } else if (player.role === 'all-rounder') {
        composition.allRounders++;
        composition.bowlingOptions++;
        composition.battingOptions++;
      }
    }

    return composition;
  }

  /**
   * Format composition for logging
   * @private
   */
  _formatComposition(comp) {
    return `WK:${comp.wicketKeepers} Bat:${comp.batsmen} Bowl:${comp.bowlers} AR:${comp.allRounders} (${comp.bowlingOptions} bowling, ${comp.battingOptions} batting options)`;
  }

  // ============================================
  // STAGE 2: Playstyle Revision + C/VC/WK Assignment
  // ============================================

  /**
   * Assign captain, vice-captain, wicket-keeper and optimize playstyles
   * @param {Object[]} playingXI - Selected 11 players
   * @returns {Object} Roles and playstyle overrides
   */
  assignRolesAndPlaystyles(playingXI) {
    const playstyleOverrides = {};

    // Find wicket-keeper (should be exactly one in playing XI)
    const keeper = playingXI.find(p => p.role === 'wicket-keeper');
    const wicketKeeper = keeper?.id || null;

    // Select captain: highest leadership + experience
    const captainScores = playingXI.map(p => ({
      player: p,
      score: (p.attributes?.mental?.leadership || 10) +
             (p.attributes?.mental?.temperament || 10) +
             (p.careerStats?.matches || 0) * 0.1
    }));
    captainScores.sort((a, b) => b.score - a.score);
    const captain = captainScores[0]?.player.id || null;

    // Select vice-captain: second highest, excluding captain
    const viceCaptain = captainScores[1]?.player.id || null;

    // Playstyle optimization: ensure players use optimal playstyle for their position
    // This will be refined in Stage 3 when batting order is set
    // For now, use primary playstyles
    for (const player of playingXI) {
      playstyleOverrides[player.id] = {
        batting: player.primaryPlaystyle?.batting || null,
        bowling: player.primaryPlaystyle?.bowling || null
      };
    }

    return { playstyleOverrides, captain, viceCaptain, wicketKeeper };
  }

  // ============================================
  // STAGE 3: Batting Order + Acceleration Tiers
  // ============================================

  /**
   * Optimize batting order and assign acceleration tiers
   * @param {Object[]} playingXI - Selected 11 players
   * @param {Object} playstyleOverrides - Current playstyle overrides
   * @returns {Object} Batting order and acceleration tiers
   */
  optimizeBattingOrder(playingXI, playstyleOverrides) {
    const positionMapping = this.config.tactics.battingOrder.positionMapping;
    const accelerationDefaults = this.config.tactics.accelerationTiers.playstyleDefaults;

    const battingOrder = [];
    const accelerationTiers = {};
    const remaining = [...playingXI];

    // Helper: find best player for a playstyle category
    const selectByCategory = (players, category, count) => {
      const selected = [];
      const ratingCaps = this.config.squadSelection.playstyleRatingCaps;
      const categoryConfig = ratingCaps.batting[category];
      
      if (!categoryConfig) {
        console.warn(`[AITacticsManager] Unknown batting category: ${category}`);
        return selected;
      }

      for (let i = 0; i < count && players.length > 0; i++) {
        // Find players with primary playstyle matching this category's playstyles
        const matches = players.filter(p => {
          const primary = p.primaryPlaystyle?.batting || '';
          return categoryConfig.playstyles.includes(primary);
        });

        if (matches.length > 0) {
          // Sort by their primary playstyle rating
          matches.sort((a, b) => {
            const ratingA = a.playstyleRatings?.batting?.[a.primaryPlaystyle?.batting] || 0;
            const ratingB = b.playstyleRatings?.batting?.[b.primaryPlaystyle?.batting] || 0;
            return ratingB - ratingA;
          });
          selected.push(matches[0]);
          players.splice(players.indexOf(matches[0]), 1);
        } else if (players.length > 0) {
          // No match, use player with best rating in category
          players.sort((a, b) => {
            const resultA = this._getPlayerBestCategoryRating(a, category, 'batting');
            const resultB = this._getPlayerBestCategoryRating(b, category, 'batting');
            return resultB.rating - resultA.rating;
          });
          const bestPlayer = players[0];
          const bestResult = this._getPlayerBestCategoryRating(bestPlayer, category, 'batting');
          // Override playstyle if we found a better one in the category
          if (bestResult.playstyle) {
            playstyleOverrides[bestPlayer.id].batting = bestResult.playstyle;
          }
          selected.push(bestPlayer);
          players.splice(0, 1);
        }
      }
      return selected;
    };

    // Position 1-2: Openers
    battingOrder.push(...selectByCategory(remaining, 'openers', 2));

    // Position 3-4: Top Order
    battingOrder.push(...selectByCategory(remaining, 'topOrder', 2));

    // Position 5-6: Middle Order
    battingOrder.push(...selectByCategory(remaining, 'middleOrder', 2));

    // Position 7-8: Lower Order
    battingOrder.push(...selectByCategory(remaining, 'lowerOrder', 2));

    // Position 9-11: Remaining (usually tailenders/bowlers)
    // Sort by batting ability
    remaining.sort((a, b) => this._getPlayerBattingRating(b) - this._getPlayerBattingRating(a));
    battingOrder.push(...remaining);

    // Assign acceleration tiers based on playstyle
    for (const player of battingOrder) {
      const playstyle = playstyleOverrides[player.id]?.batting || player.primaryPlaystyle?.batting || '';

      // Find matching tier from defaults
      let tier = this.config.tactics.accelerationTiers.default;
      for (const [keyword, tierValue] of Object.entries(accelerationDefaults)) {
        if (playstyle.includes(keyword)) {
          tier = tierValue;
          break;
        }
      }
      accelerationTiers[player.id] = tier;
    }

    return { battingOrder, accelerationTiers };
  }

  // ============================================
  // STAGE 4: Bowling Over Assignment + Plans
  // ============================================

  /**
   * Assign bowling rotation, over assignments, and bowling plans
   * @param {Object[]} playingXI - Selected 11 players
   * @param {Object} playstyleOverrides - Playstyle overrides
   * @param {boolean} isUserTeam - Whether this is the user's team (for logging)
   * @returns {Object} Bowling rotation, over assignments, and plans
   */
  assignBowlingTactics(playingXI, playstyleOverrides, isUserTeam = false) {
    const rotationConfig = this.config.tactics.bowlingRotation;
    let bowlers = playingXI.filter(p => aiCore.canBowl(p));

    // Sort bowlers by primary bowling playstyle rating
    bowlers.sort((a, b) => {
      const ratingA = a.playstyleRatings?.bowling?.[a.primaryPlaystyle?.bowling] || 0;
      const ratingB = b.playstyleRatings?.bowling?.[b.primaryPlaystyle?.bowling] || 0;
      return ratingB - ratingA;
    });

    // FALLBACK: If fewer than 5 eligible bowlers, add part-timers from playing XI
    // Cricket requires at least 5 bowlers to avoid consecutive overs (4 overs × 5 bowlers = 20)
    if (bowlers.length < 5) {
      const teamName = playingXI[0]?.currentTeam || 'Unknown';
      console.warn(`[AITacticsManager] Team has only ${bowlers.length} eligible bowlers - adding part-timers`);

      // Get non-bowlers from playing XI, sorted by best bowling playstyle rating
      const partTimers = playingXI
        .filter(player => !aiCore.canBowl(player))
        .map(player => {
          const bowlingRatings = player.playstyleRatings?.bowling || {};
          const bestBowlingRating = Math.max(...Object.values(bowlingRatings), 0);
          return { player, rating: bestBowlingRating };
        })
        .sort((a, b) => b.rating - a.rating);

      // Add part-timers until we have at least 5 bowlers
      const needed = 5 - bowlers.length;
      const addedPartTimers = partTimers.slice(0, needed).map(pt => pt.player);

      if (addedPartTimers.length > 0) {
        console.log(`[AITacticsManager] Added ${addedPartTimers.length} part-timer(s): ${addedPartTimers.map(p => p.name).join(', ')}`);
        bowlers = [...bowlers, ...addedPartTimers];
      }
    }

    // Create bowling rotation from sorted bowlers
    const bowlingRotation = bowlers.map(b => b.id);
    const selectedBowlers = [...bowlers];

    // // Create bowling rotation (top 5-6 bowlers by rating) with category-based playstyle optimization
    // const bowlingRotation = [];
    // const remainingBowlers = [...bowlers];
    // const maxBowlers = Math.min(8, bowlers.length);
    // const ratingCaps = this.config.squadSelection.playstyleRatingCaps;
    // const selectedBowlers = [];

    // while (bowlingRotation.length < maxBowlers && remainingBowlers.length > 0) {
    //   // Score each remaining bowler based on their best category fit
    //   const scoredBowlers = remainingBowlers.map(bowler => {
    //     let bestScore = 0;
    //     let bestCategory = null;
    //     let bestResult = null;

    //     // Check each bowling category
    //     for (const [category, categoryConfig] of Object.entries(ratingCaps.bowling)) {
    //       const result = this._getPlayerBestCategoryRating(bowler, category, 'bowling');

    //       // Calculate playstyle fit score for this category
    //       const currentSum = result.rating + this._getCategorySum(selectedBowlers, categoryConfig.playstyles, 'bowling');
    //       const cap = categoryConfig.cap;
    //       const fitScore = result.rating * cap / (currentSum * categoryConfig.requiredCount);

    //       if (fitScore > bestScore) {
    //         bestScore = fitScore;
    //         bestCategory = category;
    //         bestResult = result;
    //       }
    //     }

    //     return { bowler, score: bestScore, category: bestCategory, result: bestResult };
    //   });

    //   // Sort by score descending
    //   scoredBowlers.sort((a, b) => b.score - a.score);

    //   // Select best bowler
    //   const best = scoredBowlers[0];
    //   bowlingRotation.push(best.bowler.id);
    //   selectedBowlers.push(best.bowler);

    //   // Update playstyle override if we found a better category-specific playstyle
    //   if (best.result?.playstyle) {
    //     playstyleOverrides[best.bowler.id].bowling = best.result.playstyle;
    //   }

    //   // Remove from remaining
    //   remainingBowlers.splice(remainingBowlers.indexOf(best.bowler), 1);
    // }

    // Log bowling rotation for user team
    if (isUserTeam) {
      console.log('\n📋 [Over Assignment] Bowling Rotation Order:');
      bowlingRotation.forEach((id, idx) => {
        const bowler = selectedBowlers.find(b => b.id === id);
        const playstyle = playstyleOverrides[id]?.bowling || bowler?.primaryPlaystyle?.bowling || 'Unknown';
        console.log(`  ${idx + 1}. ${bowler?.name || id} (${playstyle})`);
      });
    }

    // Generate over assignments using hybrid approach
    const overAssignments = this._assignOvers(bowlingRotation, selectedBowlers, playstyleOverrides, rotationConfig, isUserTeam);

    // Assign bowling plans based on playstyle
    const bowlingPlans = {};
    for (const bowler of bowlers) {
      const playstyle = playstyleOverrides[bowler.id]?.bowling || bowler.primaryPlaystyle?.bowling || '';
      bowlingPlans[bowler.id] = this._getBowlingPlanForPlaystyle(playstyle, bowler);
    }

    return { bowlingRotation, overAssignments, bowlingPlans };
  }

  /**
   * Hybrid over assignment algorithm
   * PHASE 1: Preference-based assignment
   *   - Loop through bowlers in rotation order
   *   - For each bowler, find the BIGGEST unassigned spell from their preferred phases
   *   - For middle-phase bowlers (earlyMiddle + lateMiddle), consider both phases together
   *   - Assign overs from biggest spell until max overs OR spell fully assigned
   *   - Skip bowler if no unassigned overs in preferred phases
   *   - Repeat until a full loop completes without any assignments
   * PHASE 2: Fill remaining overs by rotation order
   * @private
   */
  _assignOvers(bowlingRotation, bowlers, playstyleOverrides, config, isUserTeam = false) {
    const overAssignments = {}; // over number -> bowler id
    const bowlerOvers = {};     // bowler id -> [assigned overs]
    const maxOvers = config.maxOversPerBowler;
    const phases = config.phases;
    const phasePrefs = config.playstylePhasePreferences;

    // Initialize bowler overs tracking
    for (const bowlerId of bowlingRotation) {
      bowlerOvers[bowlerId] = [];
    }

    // Helper: Check if bowler can bowl this over
    const canAssignOver = (bowlerId, overNum) => {
      const assigned = bowlerOvers[bowlerId];
      if (assigned.length >= maxOvers) return false;
      if (config.noConsecutiveOvers) {
        if (assigned.includes(overNum - 1) || assigned.includes(overNum + 1)) return false;
      }
      return true;
    };

    // Helper: Get bowler name for logging
    const getBowlerName = (bowlerId) => {
      const bowler = bowlers.find(b => b.id === bowlerId);
      return bowler?.name || bowlerId;
    };

    // Helper: Assign over to bowler
    const assignOver = (overNum, bowlerId, phase = 'Phase 1') => {
      overAssignments[overNum] = bowlerId;
      bowlerOvers[bowlerId].push(overNum);
      if (isUserTeam) {
        console.log(`  [${phase}] Over ${overNum} → ${getBowlerName(bowlerId)}`);
      }
    };

    // Helper: Get unassigned overs in a spell that bowler can bowl
    const getAssignableOversInSpell = (spell, bowlerId) => {
      return spell.filter(overNum => !overAssignments[overNum] && canAssignOver(bowlerId, overNum));
    };

    // Helper: Find biggest unassigned spell from given phases
    // Returns { spell: [assignable overs], phaseName, spellIndex }
    const findBiggestUnassignedSpell = (phaseNames, bowlerId) => {
      let bestSpell = null;
      let bestCount = 0;
      let bestPhase = null;
      let bestSpellIndex = -1;

      for (const phaseName of phaseNames) {
        const phase = phases[phaseName];
        if (!phase) continue;

        phase.spells.forEach((spell, spellIndex) => {
          const assignableOvers = getAssignableOversInSpell(spell, bowlerId);
          if (assignableOvers.length > bestCount) {
            bestCount = assignableOvers.length;
            bestSpell = assignableOvers;
            bestPhase = phaseName;
            bestSpellIndex = spellIndex;
          }
        });
      }

      return { spell: bestSpell, count: bestCount, phaseName: bestPhase, spellIndex: bestSpellIndex };
    };

    // PHASE 1: Preference-based assignment with loop until no progress
    if (isUserTeam) {
      console.log('\n🎯 [Over Assignment] Phase 1: Preference-based assignment');
    }
    let madeAssignment = true;
    while (madeAssignment) {
      madeAssignment = false;

      for (const bowlerId of bowlingRotation) {
        // Skip if bowler already has max overs
        if (bowlerOvers[bowlerId].length >= maxOvers) continue;

        const bowler = bowlers.find(b => b.id === bowlerId);
        const playstyle = playstyleOverrides[bowlerId]?.bowling || bowler?.primaryPlaystyle?.bowling || '';
        const preferredPhases = phasePrefs[playstyle] || [];

        if (preferredPhases.length === 0) continue;

        // Check if this is a middle-phase bowler (has both earlyMiddle and lateMiddle)
        const hasEarlyMiddle = preferredPhases.includes('earlyMiddle');
        const hasLateMiddle = preferredPhases.includes('lateMiddle');
        const isMiddlePhaseBowler = hasEarlyMiddle && hasLateMiddle;

        // Build list of phases to consider together
        let phasesToConsider = [];
        let otherPhases = [];

        if (isMiddlePhaseBowler) {
          // Combine earlyMiddle and lateMiddle, consider together
          phasesToConsider = ['earlyMiddle', 'lateMiddle'];
          otherPhases = preferredPhases.filter(p => p !== 'earlyMiddle' && p !== 'lateMiddle');
        } else {
          // Consider each phase separately in order of preference
          phasesToConsider = preferredPhases;
        }

        // Find biggest unassigned spell
        let bestResult = findBiggestUnassignedSpell(phasesToConsider, bowlerId);

        // If middle-phase bowler found nothing in middle phases, check other preferred phases
        if (isMiddlePhaseBowler && (!bestResult.spell || bestResult.count === 0)) {
          bestResult = findBiggestUnassignedSpell(otherPhases, bowlerId);
        }

        // If no assignable overs found, skip this bowler
        if (!bestResult.spell || bestResult.count === 0) continue;

        // Assign overs from the biggest spell until max overs or spell exhausted
        for (const overNum of bestResult.spell) {
          if (bowlerOvers[bowlerId].length >= maxOvers) break;
          assignOver(overNum, bowlerId);
          madeAssignment = true;
        }
      }
    }

    // PHASE 2: Fill remaining overs by rotation order
    if (isUserTeam) {
      const unassignedCount = 20 - Object.keys(overAssignments).length;
      console.log(`\n🔄 [Over Assignment] Phase 2: Fill remaining ${unassignedCount} overs by rotation`);
    }
    for (let overNum = 1; overNum <= 20; overNum++) {
      if (overAssignments[overNum]) continue;

      for (const bowlerId of bowlingRotation) {
        if (canAssignOver(bowlerId, overNum)) {
          assignOver(overNum, bowlerId, 'Phase 2');
          break;
        }
      }
    }

    // Fallback: If any overs still unassigned, ignore consecutive rule
    const stillUnassigned = 20 - Object.keys(overAssignments).length;
    if (stillUnassigned > 0 && isUserTeam) {
      console.log(`\n⚠️ [Over Assignment] Fallback: ${stillUnassigned} overs need assignment (ignoring consecutive rule)`);
    }
    for (let overNum = 1; overNum <= 20; overNum++) {
      if (!overAssignments[overNum]) {
        for (const bowlerId of bowlingRotation) {
          if (bowlerOvers[bowlerId].length < maxOvers) {
            assignOver(overNum, bowlerId, 'Fallback');
            break;
          }
        }
      }
    }

    // Final summary for user team
    if (isUserTeam) {
      console.log('\n✅ [Over Assignment] Complete! Final assignment:');
      for (let i = 1; i <= 20; i++) {
        const bowlerId = overAssignments[i];
        console.log(`  Over ${i.toString().padStart(2)}: ${getBowlerName(bowlerId)}`);
      }
      console.log('');
    }

    return overAssignments;
  }

  /**
   * Get default bowling plan for a playstyle
   * @private
   */
  _getBowlingPlanForPlaystyle(playstyle, player) {
    // Use player's preset plans if available
    if (player.tactics?.defaultBowlingPlans) {
      return player.tactics.defaultBowlingPlans;
    }

    // Default plans based on playstyle
    const plans = {
      'Swing Bowler': { lineLength: 'full', variation: 'swing' },
      'Hit-the-Deck Seamer': { lineLength: 'short', variation: 'seam' },
      'Short-Ball Specialist': { lineLength: 'short', variation: 'bouncer' },
      'Death Specialist': { lineLength: 'yorker', variation: 'pace' },
      'Classical Spinner': { lineLength: 'full', variation: 'turn' },
      'Flat Spinner': { lineLength: 'good', variation: 'pace' },
      'Mystery Spinner': { lineLength: 'good', variation: 'variations' },
      'Containment Spinner': { lineLength: 'good', variation: 'accuracy' }
    };

    return plans[playstyle] || { lineLength: 'good', variation: 'standard' };
  }

  // ============================================
  // STAGE 5: Field Setup
  // ============================================

  /**
   * Select field formation based on team composition
   * @param {Object[]} playingXI - Selected 11 players
   * @returns {string} Field formation name
   */
  selectFieldFormation(playingXI) {
    // Count bowling types
    const pacers = playingXI.filter(p => p.bowlingType === 'pace' && aiCore.canBowl(p)).length;
    const spinners = playingXI.filter(p => p.bowlingType === 'spin' && aiCore.canBowl(p)).length;

    // Select formation based on bowling attack composition
    if (pacers >= 4) {
      return 'pace_attack'; // More slips, gully
    } else if (spinners >= 3) {
      return 'spin_attack'; // More close catchers
    }

    return this.config.tactics.fieldPositions.defaultFormation;
  }

  // ============================================
  // TACTICS VALIDATION & REGENERATION
  // ============================================

  /**
   * Validate and regenerate bowling tactics if needed before a match
   * Called by MatchEngine before match starts
   * @param {string} teamId - Team ID
   * @param {Object} teamStore - Team store
   * @param {Object} playerStore - Player store
   * @returns {boolean} True if tactics are valid (either already valid or successfully regenerated)
   */
  ensureValidBowlingTactics(teamId, teamStore, playerStore) {
    const tactics = teamStore.getState().getTeamTactics(teamId);

    if (!tactics || !tactics.squadSelection || tactics.squadSelection.length !== 11) {
      console.warn(`[AITacticsManager] Cannot validate bowling tactics for ${teamId}: no valid squad selection`);
      return false;
    }

    const playingXI = tactics.squadSelection;
    const players = playerStore.getState().players;
    const overAssignments = tactics.overAssignments || {};

    // Check if overAssignments is valid
    let needsRegeneration = false;

    // Check 1: Do we have 20 over assignments?
    const assignedOvers = Object.keys(overAssignments).length;
    if (assignedOvers < 20) {
      needsRegeneration = true;
      console.log(`[AITacticsManager] Team ${teamId} has ${assignedOvers}/20 over assignments - regenerating`);
    }

    // Check 2: Are all assigned bowlers in the playing XI and can bowl?
    if (!needsRegeneration) {
      for (const [over, bowlerId] of Object.entries(overAssignments)) {
        if (!bowlerId) {
          needsRegeneration = true;
          console.log(`[AITacticsManager] Team ${teamId} has unassigned over ${over} - regenerating`);
          break;
        }
        if (!playingXI.includes(bowlerId)) {
          needsRegeneration = true;
          console.log(`[AITacticsManager] Team ${teamId} over ${over} assigned to ${bowlerId} not in playing XI - regenerating`);
          break;
        }
        const player = players[bowlerId];
        if (!player || !aiCore.canBowl(player)) {
          needsRegeneration = true;
          console.log(`[AITacticsManager] Team ${teamId} over ${over} assigned to non-bowler ${player?.name || bowlerId} - regenerating`);
          break;
        }
      }
    }

    if (needsRegeneration) {
      // Get player objects for playing XI
      const playingXIPlayers = playingXI
        .map(id => players[id])
        .filter(Boolean);

      if (playingXIPlayers.length !== 11) {
        console.error(`[AITacticsManager] Cannot regenerate bowling tactics: only ${playingXIPlayers.length}/11 players found`);
        return false;
      }

      // Get existing playstyle overrides or create empty object
      const playstyleOverrides = tactics.playstyleOverrides || {};

      // Regenerate bowling tactics
      const isUserTeam = teamId === teamStore.getState().userTeamId;
      const { bowlingRotation, overAssignments: newOverAssignments, bowlingPlans } =
        this.assignBowlingTactics(playingXIPlayers, playstyleOverrides, isUserTeam);

      // Update team tactics with regenerated bowling data
      teamStore.getState().setTeamTactics(teamId, {
        ...tactics,
        bowlingRotation,
        overAssignments: newOverAssignments,
        bowlingPlans
      });

      console.log(`✓ [AITacticsManager] Regenerated bowling tactics for team ${teamId}`);
    }

    return true;
  }

  /**
   * Regenerate bowling rotation for a team (for UI auto-assign button)
   * @param {string} teamId - Team ID
   * @param {Object} teamStore - Team store
   * @param {Object} playerStore - Player store
   * @returns {Object|null} New over assignments object or null if failed
   */
  regenerateBowlingRotation(teamId, teamStore, playerStore) {
    const tactics = teamStore.getState().getTeamTactics(teamId);

    if (!tactics || !tactics.squadSelection || tactics.squadSelection.length !== 11) {
      console.warn(`[AITacticsManager] Cannot regenerate bowling rotation for ${teamId}: no valid squad`);
      return null;
    }

    const players = playerStore.getState().players;
    const playingXIPlayers = tactics.squadSelection
      .map(id => players[id])
      .filter(Boolean);

    if (playingXIPlayers.length !== 11) {
      console.warn(`[AITacticsManager] Cannot regenerate bowling rotation: only ${playingXIPlayers.length}/11 players found`);
      return null;
    }

    // Get existing playstyle overrides
    const playstyleOverrides = tactics.playstyleOverrides || {};

    // Generate new bowling tactics
    const isUserTeam = teamId === teamStore.getState().userTeamId;
    const { bowlingRotation, overAssignments, bowlingPlans } =
      this.assignBowlingTactics(playingXIPlayers, playstyleOverrides, isUserTeam);

    // Update team store
    teamStore.getState().setTeamTactics(teamId, {
      ...tactics,
      bowlingRotation,
      overAssignments,
      bowlingPlans
    });

    console.log(`✓ [AITacticsManager] Regenerated bowling rotation for team ${teamId}`);
    return overAssignments;
  }
}

// Export singleton instance
const aiTacticsManager = new AITacticsManager();
export default aiTacticsManager;
