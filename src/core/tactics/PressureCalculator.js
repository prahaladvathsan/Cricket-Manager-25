/**
 * @file PressureCalculator.js
 * @description Calculate pressure index for batting/bowling teams based on DLS resources
 * @module core/tactics/PressureCalculator
 */

/**
 * @class PressureCalculator
 * @description Calculates batting and bowling pressure from resource ratios
 * CRITICAL: Pressure ONLY affects playstyle ratings, NOT base attributes
 */
class PressureCalculator {
  constructor() {
    console.log('✅ PressureCalculator initialized - affects playstyle ratings only');
  }

  /**
   * Calculate batting and bowling pressure indices (sum = 100)
   * @param {number} actualResources - Actual resources remaining (%)
   * @param {number} expectedResources - Expected resources at this point (%)
   * @returns {Object} {batting: number, bowling: number} pressures (0-100 each, sum = 100)
   */
  calculatePressure(actualResources, expectedResources) {
    // Avoid division by zero
    if (expectedResources === 0) {
      return { batting: 100, bowling: 0 }; 
    }

    const resourceRatio = actualResources / expectedResources;

    // Formula: battingPressure = 100 / (1 + resourceRatio)
    const battingPressure = 100 / (1 + resourceRatio);
    const bowlingPressure = 100 - battingPressure;

    // Clamp to valid range (should already be 0-100, but safety check)
    return {
      batting: Math.max(0, Math.min(100, battingPressure)),
      bowling: Math.max(0, Math.min(100, bowlingPressure))
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

    const modifiedPlayer = JSON.parse(JSON.stringify(player)); // Deep copy

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
      version: '1.0.0',
      description: 'Calculates DLS-based pressure affecting playstyle ratings ONLY',
      formula: 'battingPressure = 100 / (1 + resourceRatio)',
      criticalNote: 'Pressure ONLY affects playstyle ratings, NOT base attributes',
      methods: [
        'calculatePressure(actualResources, expectedResources)',
        'applyPressureToPlaystyleRating(player, pressure, role)'
      ]
    };
  }
}

// Export singleton instance
export default new PressureCalculator();
