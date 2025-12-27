/**
 * @file ImpactCalculator.js
 * @description Calculates DLS-based impact metrics for batting, bowling, and fielding
 * @module core/tactics/ImpactCalculator
 */

import dlsCalculator from './DLSCalculator.js';

/**
 * @typedef {Object} ImpactResult
 * @property {number} batting - Impact attributed to batsman
 * @property {number} bowling - Impact attributed to bowler
 * @property {number} fielding - Impact attributed to fielder (if any)
 * @property {string|null} fielderId - Fielder ID for catch/run-out credit
 */

/**
 * @class ImpactCalculator
 * @description Calculates per-ball impact using DLS gap changes
 *
 * Impact = Change in DLS Gap (DLS Par Score - Current Score)
 * - Positive batting impact = good for batting team (gap decreased)
 * - Positive bowling impact = good for bowling team (gap increased)
 */
class ImpactCalculator {
  constructor() {
    // Expected par score for first innings (no target to chase)
    this.FIRST_INNINGS_PAR = 165;
  }

  /**
   * Calculate impact for a single ball
   * @param {Object} context - Match context before the ball
   * @param {number} context.inningsNumber - 1 or 2
   * @param {number} context.target - Chase target (only used in 2nd innings)
   * @param {number} context.ballsBefore - Balls remaining before this delivery
   * @param {number} context.wicketsBefore - Wickets lost before this delivery
   * @param {number} context.scoreBefore - Score before this delivery
   * @param {Object} result - Ball result
   * @param {number} result.runs - Runs scored (including extras)
   * @param {boolean} result.isWicket - Whether a wicket fell
   * @param {string} result.dismissalType - Type of dismissal (caught, bowled, lbw, run_out, etc.)
   * @param {string} result.fielderId - ID of fielder involved in dismissal
   * @param {boolean} result.isLegal - Whether the delivery was legal
   * @param {boolean} result.isWide - Whether it was a wide
   * @param {boolean} result.isNoBall - Whether it was a no-ball
   * @returns {ImpactResult} Impact attributed to each player type
   */
  calculateBallImpact(context, result) {
    const { inningsNumber, target, ballsBefore, wicketsBefore, scoreBefore } = context;
    const { runs = 0, isWicket = false, dismissalType, fielderId, isLegal = true, isWide, isNoBall } = result;

    // Determine effective target for DLS calculation
    const effectiveTarget = inningsNumber === 1 ? this.FIRST_INNINGS_PAR : (target || this.FIRST_INNINGS_PAR);

    // Calculate DLS gap BEFORE the ball
    const previousGap = this.calculateGap(ballsBefore, wicketsBefore, scoreBefore, effectiveTarget);

    // Calculate state AFTER the ball
    const scoreAfter = scoreBefore + runs;
    const wicketsAfter = wicketsBefore + (isWicket ? 1 : 0);
    // Only decrement balls for legal deliveries
    const ballsAfter = isLegal ? Math.max(0, ballsBefore - 1) : ballsBefore;

    // Calculate DLS gap AFTER the ball
    const currentGap = this.calculateGap(ballsAfter, wicketsAfter, scoreAfter, effectiveTarget);

    // Raw impact = change in gap (positive means gap decreased = good for batting)
    const rawImpact = previousGap - currentGap;

    // Attribute impact based on ball outcome
    return this.attributeImpact(rawImpact, result);
  }

  /**
   * Calculate DLS gap for current match situation
   * Gap = Par Score - Current Score
   * Positive gap = batting team behind, negative gap = batting team ahead
   * @param {number} ballsRemaining - Balls remaining in innings
   * @param {number} wicketsLost - Wickets lost
   * @param {number} currentScore - Current score
   * @param {number} target - Target score
   * @returns {number} DLS gap
   */
  calculateGap(ballsRemaining, wicketsLost, currentScore, target) {
    const wicketsInHand = 10 - wicketsLost;

    // If all out or innings complete, no resources left
    if (wicketsInHand <= 0 || ballsRemaining <= 0) {
      // Par score at this point equals target (need all runs)
      return target - currentScore;
    }

    const parScore = dlsCalculator.getParScore(ballsRemaining, wicketsInHand, target);
    return parScore - currentScore;
  }

  /**
   * Attribute impact to batsman, bowler, and/or fielder based on ball outcome
   * @param {number} rawImpact - Raw impact value (positive = good for batting)
   * @param {Object} result - Ball result
   * @returns {ImpactResult} Attributed impact
   */
  attributeImpact(rawImpact, result) {
    const { isWicket, dismissalType, fielderId, isWide, isNoBall, runs } = result;

    // Handle extras (wides/no-balls) - bowler penalty only
    if (isWide || isNoBall) {
      return {
        batting: 0,
        bowling: -Math.abs(rawImpact), // Negative for bowler (bad for them)
        fielding: 0,
        fielderId: null
      };
    }

    // Handle wickets
    if (isWicket) {
      const absImpact = Math.abs(rawImpact);

      // Caught dismissals
      if (dismissalType === 'caught') {
        // Outfield catch: 50/50 split
        return {
          batting: -absImpact,
          bowling: absImpact * 0.5,
          fielding: absImpact * 0.5,
          fielderId: fielderId || null
        };
      }

      if (dismissalType === 'caught_behind') {
        // Caught behind by keeper: 80/20 split
        return {
          batting: -absImpact,
          bowling: absImpact * 0.8,
          fielding: absImpact * 0.2,
          fielderId: fielderId || null
        };
      }

      // Run out - 100% to fielder(s)
      if (dismissalType === 'run_out') {
        return {
          batting: -absImpact,
          bowling: 0,
          fielding: absImpact,
          fielderId: fielderId || null
        };
      }

      // Stumped - credit to keeper (fielding) but bowler set it up
      if (dismissalType === 'stumped') {
        return {
          batting: -absImpact,
          bowling: absImpact * 0.7,
          fielding: absImpact * 0.3,
          fielderId: fielderId || null
        };
      }

      // Bowled, LBW, hit wicket - 100% to bowler
      // dismissalType: 'bowled', 'lbw', 'hit_wicket'
      return {
        batting: -absImpact,
        bowling: absImpact,
        fielding: 0,
        fielderId: null
      };
    }

    // Normal delivery (no wicket) - zero sum between batsman and bowler
    // Positive rawImpact = good for batting (gap decreased)
    // Negative rawImpact = good for bowling (gap increased, e.g., dot ball)
    return {
      batting: rawImpact,
      bowling: -rawImpact,
      fielding: 0,
      fielderId: null
    };
  }

  /**
   * Get the effective target for impact calculation
   * @param {number} inningsNumber - 1 or 2
   * @param {number|null} chaseTarget - Target for second innings
   * @returns {number} Effective target
   */
  getEffectiveTarget(inningsNumber, chaseTarget) {
    return inningsNumber === 1 ? this.FIRST_INNINGS_PAR : (chaseTarget || this.FIRST_INNINGS_PAR);
  }

  /**
   * Get diagnostic info
   * @returns {Object} Calculator info
   */
  getInfo() {
    return {
      name: 'ImpactCalculator',
      version: '1.0.0',
      firstInningsPar: this.FIRST_INNINGS_PAR,
      description: 'DLS-based impact calculation for player performance evaluation',
      attributionRules: {
        caught_outfield: '50% bowler, 50% fielder',
        caught_behind: '80% bowler, 20% keeper',
        bowled_lbw: '100% bowler',
        stumped: '70% bowler, 30% keeper',
        run_out: '100% fielder',
        extras: '100% negative bowling impact'
      }
    };
  }
}

// Export singleton instance
export default new ImpactCalculator();
