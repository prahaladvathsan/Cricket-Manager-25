/**
 * @file DLSCalculator.js
 * @description Duckworth-Lewis-Stern resource calculation for T20 cricket
 * @module core/tactics/DLSCalculator
 */

import dlsResourcesConfig from '../../data/config/dls-resources-config.json';

/**
 * @class DLSCalculator
 * @description Calculates DLS resources and performs resource-based calculations
 */
class DLSCalculator {
  constructor() {
    this.resourceTable = dlsResourcesConfig.resourceTable;
    console.log('✅ DLSCalculator initialized with resource table');
  }

  /**
   * Get resource percentage from DLS table
   * @param {number} ballsRemaining - Balls remaining in innings (0-120)
   * @param {number} wicketsLost - Wickets lost (0-10)
   * @returns {number} Resource percentage (0-100)
   */
  getResourcePercentage(ballsRemaining, wicketsLost) {
    // Clamp inputs to valid ranges
    const balls = Math.max(0, Math.min(120, Math.floor(ballsRemaining)));
    const wickets = Math.max(0, Math.min(10, Math.floor(wicketsLost)));

    // Access table: resourceTable[ballsRemaining][wicketsLost]
    const ballsKey = balls.toString();

    if (!this.resourceTable[ballsKey]) {
      console.warn(`DLS: Invalid balls remaining: ${balls}, returning 0%`);
      return 0;
    }

    const resourceValue = this.resourceTable[ballsKey][wickets];

    if (resourceValue === undefined) {
      console.warn(`DLS: Invalid wickets lost: ${wickets}, returning 0%`);
      return 0;
    }

    return resourceValue;
  }

  /**
   * Calculate expected resources based on current score and target
   * @param {number} currentScore - Current score
   * @param {number} targetScore - Target score (par or chase target)
   * @returns {number} Expected resource percentage
   */
  calculateExpectedResources(currentScore, targetScore) {
    if (targetScore <= 0) {
      return 0;
    }

    const runsNeeded = targetScore - currentScore;
    const expectedResources = (runsNeeded / targetScore) * 100;

    return Math.max(0, Math.min(100, expectedResources));
  }

  /**
   * Calculate resource ratio for pressure calculation
   * @param {number} actualResources - Actual resources remaining (from DLS table)
   * @param {number} expectedResources - Expected resources based on target
   * @returns {number} Resource ratio (actualResources / expectedResources)
   */
  calculateResourceRatio(actualResources, expectedResources) {
    if (expectedResources <= 0) {
      // If no runs needed (ahead of target), ratio is very high
      return 10; // Arbitrary high value
    }

    return actualResources / expectedResources;
  }

  /**
   * Get DLS par score for current match situation
   * @param {number} ballsRemaining - Balls remaining
   * @param {number} wicketsInHand - Wickets in hand (0-10)
   * @param {number} targetScore - Total target score
   * @returns {number} Par score at this stage
   */
  getParScore(ballsRemaining, wicketsInHand, targetScore) {
    const wicketsLost = 10 - wicketsInHand;
    const resourcesRemaining = this.getResourcePercentage(ballsRemaining, wicketsLost);

    // Par score = Target × (100 - resourcesRemaining) / 100
    const parScore = Math.round(targetScore * (100 - resourcesRemaining) / 100);

    return parScore;
  }

  /**
   * Calculate revised target after interruption (for future use)
   * @param {number} originalTarget - Original target
   * @param {number} ballsLostBefore - Balls remaining before interruption
   * @param {number} wicketsLostBefore - Wickets lost before interruption
   * @param {number} ballsLostAfter - Balls remaining after interruption
   * @param {number} wicketsLostAfter - Wickets lost after interruption
   * @returns {number} Revised target
   */
  calculateRevisedTarget(originalTarget, ballsLostBefore, wicketsLostBefore, ballsLostAfter, wicketsLostAfter) {
    const resourcesBefore = this.getResourcePercentage(ballsLostBefore, wicketsLostBefore);
    const resourcesAfter = this.getResourcePercentage(ballsLostAfter, wicketsLostAfter);

    const resourceLost = resourcesBefore - resourcesAfter;
    const revisedTarget = Math.round(originalTarget * (resourcesAfter / resourcesBefore));

    return revisedTarget;
  }

  /**
   * Get diagnostic info about DLS table
   * @returns {Object} DLS calculator info
   */
  getInfo() {
    return {
      name: 'DLSCalculator',
      version: '1.0.0',
      tableSize: {
        ballsRemaining: '0-120',
        wicketsLost: '0-10'
      },
      description: 'Duckworth-Lewis-Stern resource calculator for T20 cricket',
      methods: [
        'getResourcePercentage(balls, wickets)',
        'calculateExpectedResources(score, target)',
        'calculateResourceRatio(actual, expected)',
        'getParScore(balls, wickets, target)'
      ]
    };
  }
}

// Export singleton instance
export default new DLSCalculator();
