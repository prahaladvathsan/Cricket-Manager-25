/**
 * @file PressureCalculator.js
 * @description Calculate pressure index for batting/bowling teams
 * @module core/tactics/PressureCalculator
 *
 * Formula: Combines resource ratio and run rate ratio using sigmoid curve
 * - advantageRatio = resourceRatio * (CRR / RRR)
 * - battingPressure = sigmoid(-k * ln(advantageRatio)) * 100
 *
 * Higher advantageRatio = lower batting pressure (team is ahead)
 * Lower advantageRatio = higher batting pressure (team is behind)
 */

import dlsCalculator from './DLSCalculator.js';

/**
 * @class PressureCalculator
 * @description Calculates batting and bowling pressure from resource and run rate ratios
 * CRITICAL: Pressure ONLY affects playstyle ratings, NOT base attributes
 */
class PressureCalculator {
  constructor() {
    this.steepness = 1.5; // Sigmoid steepness factor (k)
  }

  /**
   * Calculate batting and bowling pressure indices (sum = 100)
   * Uses combined ratio of resources and run rates with sigmoid curve
   *
   * @param {Object} params - Pressure calculation parameters
   * @param {number} params.ballsLeft - Balls remaining in innings
   * @param {number} params.wicketsInHand - Wickets in hand (0-10)
   * @param {number} params.currentScore - Current team score
   * @param {number} params.target - Target score
   * @param {number} params.currentRunRate - Current run rate
   * @param {number} params.requiredRunRate - Required run rate
   * @returns {Object} {batting: number, bowling: number} pressures (0-100 each, sum = 100)
   */
  calculatePressure({ ballsLeft, wicketsInHand, currentScore, target, currentRunRate, requiredRunRate }) {
    // Boundary conditions - explicit checks
    if (currentScore >= target) {
      return { batting: 0, bowling: 100 }; // Won
    }
    if (wicketsInHand <= 0) {
      return { batting: 100, bowling: 0 }; // All out
    }
    if (ballsLeft <= 0) {
      return { batting: 100, bowling: 0 }; // No balls left, didn't reach target
    }

    // Component 1: Resource ratio (actualResources / expectedResources)
    const wicketsLost = 10 - wicketsInHand;
    const actualResources = dlsCalculator.getResourcePercentage(ballsLeft, wicketsLost);
    const expectedResources = dlsCalculator.calculateExpectedResources(currentScore, target);
    const resourceRatio = expectedResources > 0 ? actualResources / expectedResources : 10;

    // Log transform resource ratio (0 when ratio = 1)
    const clampedResourceRatio = Math.max(0.01, Math.min(100, resourceRatio));
    const resourceInput = Math.log(clampedResourceRatio);

    // Component 2: CRR/RRR ratio
    // When CRR = 0 (start of innings), rate comparison is meaningless → use neutral (0)
    let rateInput = 0;
    if (currentRunRate > 0 && requiredRunRate > 0) {
      const rateRatio = currentRunRate / requiredRunRate;
      const clampedRateRatio = Math.max(0.01, Math.min(100, rateRatio));
      rateInput = Math.log(clampedRateRatio);
    } else if (requiredRunRate <= 0) {
      // No runs needed = very far ahead
      rateInput = Math.log(10);
    }
    // else: CRR = 0 with RRR > 0 → rateInput stays 0 (neutral)

    // Equal weighted additive combination in log space (50-50 weighting)
    const combinedInput = 0.5 * resourceInput + 0.5 * rateInput;

    // Sigmoid: 1 / (1 + e^(k*x))
    // When x > 0 (ahead): sigmoid < 0.5 → lower batting pressure
    // When x < 0 (behind): sigmoid > 0.5 → higher batting pressure
    // When x = 0 (neutral): sigmoid = 0.5 → pressure = 50
    const sigmoid = 1 / (1 + Math.exp(this.steepness * combinedInput));

    const battingPressure = Math.round(sigmoid * 100);
    const bowlingPressure = 100 - battingPressure;

    return {
      batting: Math.max(0, Math.min(100, battingPressure)),
      bowling: Math.max(0, Math.min(100, bowlingPressure))
    };
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use calculatePressure with full params object instead
   */
  calculatePressureLegacy(actualResources, expectedResources) {
    if (expectedResources === 0) {
      return { batting: 100, bowling: 0 };
    }
    const resourceRatio = actualResources / expectedResources;
    const battingPressure = 100 / (1 + resourceRatio);
    return {
      batting: Math.max(0, Math.min(100, Math.round(battingPressure))),
      bowling: Math.max(0, Math.min(100, Math.round(100 - battingPressure)))
    };
  }

  /**
   * Apply pressure to playstyle rating ONLY (not base attributes)
   * @param {Object} player - Player object
   * @param {number} pressure - Pressure value (0-100)
   * @param {string} role - 'batting' or 'bowling'
   * @returns {Object} Modified player (copy)
   */
  applyPressureToPlaystyleRating(player, pressure, role) {
    // If pressure <= 50, no penalty
    if (pressure <= 50) {
      return player;
    }

    // Deep clone player to avoid mutating original (must clone nested attribute objects)
    const modifiedPlayer = {
      ...player,
      attributes: {
        ...player.attributes,
        batting: { ...player.attributes?.batting },
        bowling: { ...player.attributes?.bowling },
        physical: { ...player.attributes?.physical },
        mental: { ...player.attributes?.mental },
        fielding: { ...player.attributes?.fielding }
      },
      condition: { ...player.condition },
      playstyleRatings: {
        ...player.playstyleRatings,
        batting: { ...player.playstyleRatings?.batting },
        bowling: { ...player.playstyleRatings?.bowling }
      }
    };

    // Get mental attribute for pressure resistance
    const concentration = player.attributes?.mental?.concentration || 10;
    const temperament = player.attributes?.mental?.temperament || 10;

    // Select appropriate mental stat based on role
    const mentalStat = role === 'batting' ? concentration : temperament;

    // Calculate pressure penalty
    const pressureExcess = pressure - 50;
    const resistanceFactor = 1 - (mentalStat / 20); // Scale: 0 at 20 mental, 1 at 0 mental
    const penalty = pressureExcess * resistanceFactor;

    // Apply penalty to playstyle rating ONLY
    if (role === 'batting' && modifiedPlayer.playstyleRatings?.batting) {
      const primaryPlaystyle = modifiedPlayer.primaryPlaystyle?.batting;
      if (primaryPlaystyle && modifiedPlayer.playstyleRatings.batting[primaryPlaystyle] !== undefined) {
        const originalRating = modifiedPlayer.playstyleRatings.batting[primaryPlaystyle];
        modifiedPlayer.playstyleRatings.batting[primaryPlaystyle] = Math.max(0, originalRating - penalty);

        // Store metadata
        if (!modifiedPlayer.pressureMetadata) modifiedPlayer.pressureMetadata = {};
        modifiedPlayer.pressureMetadata.battingPressure = pressure;
        modifiedPlayer.pressureMetadata.originalRating = originalRating;
        modifiedPlayer.pressureMetadata.penaltyApplied = penalty;
        modifiedPlayer.pressureMetadata.newRating = modifiedPlayer.playstyleRatings.batting[primaryPlaystyle];
      }
    } else if (role === 'bowling' && modifiedPlayer.playstyleRatings?.bowling) {
      const primaryPlaystyle = modifiedPlayer.primaryPlaystyle?.bowling;
      if (primaryPlaystyle && modifiedPlayer.playstyleRatings.bowling[primaryPlaystyle] !== undefined) {
        const originalRating = modifiedPlayer.playstyleRatings.bowling[primaryPlaystyle];
        modifiedPlayer.playstyleRatings.bowling[primaryPlaystyle] = Math.max(0, originalRating - penalty);

        // Store metadata
        if (!modifiedPlayer.pressureMetadata) modifiedPlayer.pressureMetadata = {};
        modifiedPlayer.pressureMetadata.bowlingPressure = pressure;
        modifiedPlayer.pressureMetadata.originalRating = originalRating;
        modifiedPlayer.pressureMetadata.penaltyApplied = penalty;
        modifiedPlayer.pressureMetadata.newRating = modifiedPlayer.playstyleRatings.bowling[primaryPlaystyle];
      }
    }

    return modifiedPlayer;
  }

  /**
   * Get info about calculator
   * @returns {Object} Calculator info
   */
  getInfo() {
    return {
      name: 'PressureCalculator',
      version: '2.0.0',
      description: 'Calculates pressure using combined resource ratio and CRR/RRR ratio with sigmoid curve',
      formula: 'battingPressure = sigmoid(k * ln(resourceRatio * rateRatio)) * 100',
      steepness: this.steepness,
      criticalNote: 'Pressure ONLY affects playstyle ratings, NOT base attributes',
      methods: [
        'calculatePressure({ ballsLeft, wicketsInHand, currentScore, target, currentRunRate, requiredRunRate })',
        'applyPressureToPlaystyleRating(player, pressure, role)'
      ]
    };
  }
}

// Export singleton instance
export default new PressureCalculator();
