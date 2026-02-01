/**
 * @file ParTargetCalculator.js
 * @description Calculate DLS-based par targets for each over in T20 cricket
 * @module core/tactics/ParTargetCalculator
 */

import dlsCalculator from './DLSCalculator.js';

/**
 * @class ParTargetCalculator
 * @description Calculates and manages par targets for T20 innings
 */
class ParTargetCalculator {
  constructor() {
    this.dlsCalculator = dlsCalculator;
  }

  /**
   * Calculate par targets for all 20 overs
   * @param {number} parScore - User-set par score (or target for 2nd innings)
   * @param {number} wicketsInHand - Current wickets in hand
   * @returns {Array} Array of over targets: [{over, runs, wickets, ballsRemaining}]
   */
  calculateOverTargets(parScore, wicketsInHand = 10) {
    const overTargets = [];
    const wicketsLost = 10 - wicketsInHand;

    // Calculate target for each over (1-20)
    for (let over = 1; over <= 20; over++) {
      const ballsRemaining = (20 - over) * 6;
      const runsTarget = this.dlsCalculator.getParScore(ballsRemaining, wicketsInHand, parScore);

      overTargets.push({
        over,
        runs: runsTarget,
        wickets: wicketsLost,
        ballsRemaining
      });
    }

    return overTargets;
  }

  /**
   * Recalculate over targets after wicket fall
   * @param {number} parScore - Target score
   * @param {number} currentOver - Current over number
   * @param {number} wicketsLost - Wickets lost so far
   * @returns {Array} Updated over targets
   */
  recalculateAfterWicket(parScore, currentOver, wicketsLost) {
    const wicketsInHand = 10 - wicketsLost;
    const overTargets = [];

    // Calculate targets for remaining overs
    for (let over = currentOver; over <= 20; over++) {
      const ballsRemaining = (20 - over) * 6;
      const runsTarget = this.dlsCalculator.getParScore(ballsRemaining, wicketsInHand, parScore);

      overTargets.push({
        over,
        runs: runsTarget,
        wickets: wicketsLost,
        ballsRemaining
      });
    }

    return overTargets;
  }

  /**
   * Get current par target for a specific over
   * @param {Array} overTargets - Array of over targets
   * @param {number} currentOver - Current over number (1-20)
   * @returns {Object|null} Par target object or null if not found
   */
  getCurrentParTarget(overTargets, currentOver) {
    if (!overTargets || overTargets.length === 0) {
      return null;
    }

    const target = overTargets.find(t => t.over === currentOver);
    return target || null;
  }

  /**
   * Calculate how far ahead/behind par
   * @param {number} currentScore - Current score
   * @param {number} parRuns - Par runs for this stage
   * @returns {Object} {gap, status} where gap is runs and status is 'ahead'|'behind'|'onPar'}
   */
  calculateParGap(currentScore, parRuns) {
    const gap = currentScore - parRuns;

    let status;
    if (Math.abs(gap) <= 2) {
      status = 'onPar';
    } else if (gap > 0) {
      status = 'ahead';
    } else {
      status = 'behind';
    }

    return { gap, status };
  }

  /**
   * Get recommended Target Run Rate (TRR) for innings
   * @param {number} parScore - Par score target
   * @param {number} totalOvers - Total overs (typically 20)
   * @returns {number} Target run rate
   */
  getTargetRunRate(parScore, totalOvers = 20) {
    return parScore / totalOvers;
  }

  /**
   * Calculate required run rate from current position
   * @param {number} runsNeeded - Runs needed
   * @param {number} ballsRemaining - Balls remaining
   * @returns {number} Required run rate
   */
  getRequiredRunRate(runsNeeded, ballsRemaining) {
    if (ballsRemaining <= 0) {
      return 0;
    }

    const oversRemaining = ballsRemaining / 6;
    return runsNeeded / oversRemaining;
  }

  /**
   * Get current run rate
   * @param {number} runs - Runs scored
   * @param {number} ballsFaced - Balls faced
   * @returns {number} Current run rate
   */
  getCurrentRunRate(runs, ballsFaced) {
    if (ballsFaced <= 0) {
      return 0;
    }

    const oversFaced = ballsFaced / 6;
    return runs / oversFaced;
  }

  /**
   * Check if on track to meet target
   * @param {number} currentScore - Current score
   * @param {number} ballsFaced - Balls faced
   * @param {number} targetScore - Target score
   * @param {number} totalBalls - Total balls in innings
   * @returns {Object} {onTrack: boolean, runsBehind: number, runRateDeficit: number}
   */
  checkTargetProgress(currentScore, ballsFaced, targetScore, totalBalls = 120) {
    const ballsRemaining = totalBalls - ballsFaced;
    const runsNeeded = targetScore - currentScore;

    const currentRunRate = this.getCurrentRunRate(currentScore, ballsFaced);
    const requiredRunRate = this.getRequiredRunRate(runsNeeded, ballsRemaining);

    const onTrack = currentRunRate >= requiredRunRate || runsNeeded <= 0;
    const runsBehind = Math.max(0, runsNeeded);
    const runRateDeficit = Math.max(0, requiredRunRate - currentRunRate);

    return {
      onTrack,
      runsBehind,
      runRateDeficit,
      currentRunRate,
      requiredRunRate
    };
  }

  /**
   * Get diagnostic info
   * @returns {Object} Calculator info
   */
  getInfo() {
    return {
      name: 'ParTargetCalculator',
      version: '1.0.0',
      description: 'DLS-based par target calculator for T20 cricket',
      methods: [
        'calculateOverTargets(parScore, wicketsInHand)',
        'recalculateAfterWicket(parScore, currentOver, wicketsLost)',
        'getCurrentParTarget(overTargets, currentOver)',
        'calculateParGap(currentScore, parRuns)',
        'getTargetRunRate(parScore)',
        'getRequiredRunRate(runsNeeded, ballsRemaining)',
        'getCurrentRunRate(runs, ballsFaced)',
        'checkTargetProgress(currentScore, ballsFaced, targetScore)'
      ]
    };
  }
}

// Export singleton instance
export default new ParTargetCalculator();
