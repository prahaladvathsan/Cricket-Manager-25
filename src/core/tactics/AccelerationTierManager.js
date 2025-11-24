/**
 * @file AccelerationTierManager.js
 * @description Manage batting acceleration tiers and apply mentality/attribute modifiers
 * @module core/tactics/AccelerationTierManager
 */

import tacticsConfig from '../../data/config/tactics-config.json';
import dlsCalculator from './DLSCalculator.js';

/**
 * @class AccelerationTierManager
 * @description Manages batting acceleration tiers with auto/manual selection
 */
class AccelerationTierManager {
  constructor() {
    this.tiers = tacticsConfig.accelerationTiers;
    this.playstyleBoostAmount = tacticsConfig.playstyleBoostAmount;
    this.autoTierRules = tacticsConfig.autoTierSelection;
    console.log('✅ AccelerationTierManager initialized with 6 tiers');
  }

  /**
   * Select mentality for current ball based on tier probabilities
   * @param {string} tierName - Acceleration tier name
   * @returns {string} Selected mentality ('defensive', 'neutral', 'attacking')
   */
  selectMentalityForBall(tierName) {
    const tier = this.tiers[tierName];
    if (!tier) {
      console.warn(`Invalid tier: ${tierName}, defaulting to Rotate`);
      return this.selectMentalityForBall('Rotate');
    }

    const probabilities = tier.mentalityProbabilities;
    const roll = Math.random();

    // Cumulative probability selection
    if (roll < probabilities.defensive) {
      return 'defensive';
    } else if (roll < probabilities.defensive + probabilities.neutral) {
      return 'neutral';
    } else {
      return 'attacking';
    }
  }

  /**
   * Apply tier attribute modifiers to player
   * @param {Object} player - Player object
   * @param {string} tierName - Acceleration tier name
   * @returns {Object} Modified player object (copy)
   */
  applyTierModifiers(player, tierName) {
    const tier = this.tiers[tierName];
    if (!tier) {
      console.warn(`Invalid tier: ${tierName}, no modifiers applied`);
      return { ...player };
    }

    const modifiedPlayer = JSON.parse(JSON.stringify(player)); // Deep copy
    const appliedModifiers = { bonuses: {}, penalties: {} };

    // Apply bonuses
    if (tier.attributeModifiers.bonuses) {
      Object.entries(tier.attributeModifiers.bonuses).forEach(([attr, value]) => {
        this.applyAttributeModifier(modifiedPlayer, attr, value);
        appliedModifiers.bonuses[attr] = value;
      });
    }

    // Apply penalties
    if (tier.attributeModifiers.penalties) {
      Object.entries(tier.attributeModifiers.penalties).forEach(([attr, value]) => {
        this.applyAttributeModifier(modifiedPlayer, attr, value);
        appliedModifiers.penalties[attr] = value;
      });
    }

    modifiedPlayer.tierMetadata = {
      tierName,
      appliedModifiers
    };

    return modifiedPlayer;
  }

  /**
   * Apply attribute modifier to player (searches across attribute categories)
   * @param {Object} player - Player object (will be mutated)
   * @param {string} attributeName - Attribute name
   * @param {number} modifier - Modifier value
   */
  applyAttributeModifier(player, attributeName, modifier) {
    // Search in batting attributes
    if (player.attributes?.batting && player.attributes.batting[attributeName] !== undefined) {
      player.attributes.batting[attributeName] += modifier;
      return;
    }

    // Search in bowling attributes
    if (player.attributes?.bowling && player.attributes.bowling[attributeName] !== undefined) {
      player.attributes.bowling[attributeName] += modifier;
      return;
    }

    // Search in physical attributes
    if (player.attributes?.physical && player.attributes.physical[attributeName] !== undefined) {
      player.attributes.physical[attributeName] += modifier;
      return;
    }

    // Search in mental attributes
    if (player.attributes?.mental && player.attributes.mental[attributeName] !== undefined) {
      player.attributes.mental[attributeName] += modifier;
      return;
    }

    // Search in fielding attributes
    if (player.attributes?.fielding && player.attributes.fielding[attributeName] !== undefined) {
      player.attributes.fielding[attributeName] += modifier;
      return;
    }

    console.warn(`Attribute ${attributeName} not found for player ${player.name}`);
  }

  /**
   * Apply playstyle boost if tier matches batsman's playstyle
   * @param {Object} player - Player object
   * @param {string} tierName - Acceleration tier name
   * @returns {Object} {boosted: boolean, newRating: number}
   */
  applyPlaystyleBoost(player, tierName) {
    const tier = this.tiers[tierName];
    if (!tier || !tier.playstyleBoosted) {
      return { boosted: false, newRating: 0 };
    }

    // Check if player's primary batting playstyle matches tier's boosted playstyles
    const primaryPlaystyle = player.primaryPlaystyle?.batting;
    if (!primaryPlaystyle) {
      return { boosted: false, newRating: 0 };
    }

    const isMatch = tier.playstyleBoosted.some(boostedStyle =>
      primaryPlaystyle.includes(boostedStyle) || boostedStyle === primaryPlaystyle
    );

    if (isMatch && player.playstyleRatings?.batting) {
      // Find the rating for the primary playstyle
      const originalRating = player.playstyleRatings.batting[primaryPlaystyle] || 0;
      const newRating = originalRating + this.playstyleBoostAmount;

      return { boosted: true, newRating, originalRating };
    }

    return { boosted: false, newRating: 0 };
  }

  /**
   * Auto-select tier based on DLS resources (realistic cricket logic)
   * @param {Object} matchSituation - Current match situation
   * @param {number} targetScore - Target score (par score for innings)
   * @param {number} currentScore - Current score
   * @param {number} ballsRemaining - Balls remaining
   * @param {number} wicketsLost - Wickets lost
   * @returns {string} Recommended tier name
   */
  autoSelectTier(matchSituation, targetScore, currentScore, ballsRemaining, wicketsLost) {
    // DLS RESOURCE-BASED CALCULATION
    // Key insight: Compare actual score vs DLS par score at this point

    // Step 1: Get current DLS resource percentage
    const currentResourcesRemaining = dlsCalculator.getResourcePercentage(ballsRemaining, wicketsLost);

    // Step 2: Calculate how many resources we've consumed
    const resourcesConsumed = 100 - currentResourcesRemaining;

    // Step 3: Calculate DLS par score at this point in the innings
    // If we've used X% of resources, we should have X% of the target score
    const dlsParScore = (resourcesConsumed / 100) * targetScore;

    // Step 4: Calculate the gap (positive = ahead of par, negative = behind par)
    const scoreGap = currentScore - dlsParScore;

    // Step 5: Normalize gap as percentage of target (for consistent thresholds)
    const gapPercentage = (scoreGap / targetScore) * 100;

    const effectiveGapPercentage = (gapPercentage / currentResourcesRemaining)

    // Step 6: Map gap to acceleration tier using cricket-realistic thresholds
    // Positive gap = ahead of par → can afford to be conservative
    // Negative gap = behind par → need to accelerate

    const rules = this.autoTierRules.logic;

    // Far ahead of DLS par (>12% ahead) → Blockade (preserve wickets)
    if (gapPercentage >= 12) {
      return rules.tierMapping.massiveAhead; // Blockade
    }
    // Comfortably ahead (7-12% ahead) → Build (consolidate)
    else if (gapPercentage >= 7) {
      return rules.tierMapping.significantAhead; // Build
    }
    // Slightly ahead (3-7% ahead) → Rotate (steady accumulation)
    else if (gapPercentage >= 3) {
      return rules.tierMapping.slightAhead; // Rotate
    }
    // On par (±3%) → Rotate (maintain pace)
    else if (gapPercentage >= -3) {
      return rules.tierMapping.onPar; // Rotate
    }
    // Slightly behind (3-7% behind) → Cruise (controlled aggression)
    else if (gapPercentage >= -7) {
      return rules.tierMapping.slightBehind; // Cruise
    }
    // Significantly behind (7-12% behind) → Blitz (attack mode)
    else if (gapPercentage >= -12) {
      return rules.tierMapping.significantBehind; // Blitz
    }
    // Far behind (>12% behind) → Hit Out/Get Out (desperate measures)
    else {
      return rules.tierMapping.massiveBehind; // Hit Out/Get Out
    }
  }

  /**
   * Get tier configuration
   * @param {string} tierName - Tier name
   * @returns {Object|null} Tier config or null
   */
  getTierConfig(tierName) {
    return this.tiers[tierName] || null;
  }

  /**
   * Get all tier names
   * @returns {string[]} Array of tier names
   */
  getAllTierNames() {
    return Object.keys(this.tiers);
  }

  /**
   * Get info about manager
   * @returns {Object} Manager info
   */
  getInfo() {
    return {
      name: 'AccelerationTierManager',
      version: '1.0.0',
      tiersAvailable: Object.keys(this.tiers),
      playstyleBoost: this.playstyleBoostAmount,
      description: 'Manages batting acceleration tiers with auto/manual selection',
      methods: [
        'selectMentalityForBall(tierName)',
        'applyTierModifiers(player, tierName)',
        'applyPlaystyleBoost(player, tierName)',
        'autoSelectTier(matchSituation, targetRunRate, ...)',
        'getTierConfig(tierName)',
        'getAllTierNames()'
      ]
    };
  }
}

// Export singleton instance
export default new AccelerationTierManager();
