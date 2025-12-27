/**
 * @file ContextualModifierManager.js
 * @description Manage contextual modifiers (left-right partnership, new ball boost)
 * @module core/tactics/ContextualModifierManager
 */

import contextualConfig from '../../data/config/contextual-modifiers-config.json';

/**
 * @class ContextualModifierManager
 * @description Manages auto-applied contextual modifiers based on match situations
 */
class ContextualModifierManager {
  constructor() {
    this.leftRightConfig = contextualConfig.leftRightPartnership;
    this.newBallConfig = contextualConfig.newBallBoost;
    console.log('✅ ContextualModifierManager initialized - left-right partnership & new ball boost');
  }

  /**
   * Check if left-right partnership is active
   * @param {Object} striker - Striker batsman
   * @param {Object} nonStriker - Non-striker batsman
   * @returns {boolean} True if left-right combo
   */
  checkLeftRightCombo(striker, nonStriker) {
    const strikerHand = striker.battingHand;
    const nonStrikerHand = nonStriker.battingHand;

    if (!strikerHand || !nonStrikerHand) {
      console.warn(`Missing battingHand data - striker: ${strikerHand}, nonStriker: ${nonStrikerHand}`);
      return false;
    }

    return (strikerHand === 'left' && nonStrikerHand === 'right') ||
           (strikerHand === 'right' && nonStrikerHand === 'left');
  }

  /**
   * Apply left-right partnership penalty to bowler
   * @param {Object} bowler - Bowler object
   * @returns {Object} Modified bowler (copy)
   */
  applyLeftRightPenalty(bowler) {
    // Deep clone bowler to avoid mutating original (must clone nested attribute objects)
    const modifiedBowler = {
      ...bowler,
      attributes: {
        ...bowler.attributes,
        batting: { ...bowler.attributes?.batting },
        bowling: { ...bowler.attributes?.bowling },
        physical: { ...bowler.attributes?.physical },
        mental: { ...bowler.attributes?.mental },
        fielding: { ...bowler.attributes?.fielding }
      },
      condition: { ...bowler.condition }
    };

    // Apply accuracy penalty
    const accuracyPenalty = this.leftRightConfig.effects.bowler.accuracy;

    if (modifiedBowler.attributes?.bowling?.accuracy !== undefined) {
      modifiedBowler.attributes.bowling.accuracy += accuracyPenalty;
    } else {
      console.warn(`Accuracy attribute not found for bowler ${bowler.name}`);
    }

    return modifiedBowler;
  }

  /**
   * Check if new ball boost applies
   * @param {number} over - Current over (1-20)
   * @param {string} bowlerType - Bowler type (pace/spin/etc)
   * @returns {boolean} True if new ball boost applies
   */
  checkNewBallBoost(over, bowlerType) {
    const oversRange = this.newBallConfig.trigger.oversRange;
    const requiredType = this.newBallConfig.trigger.bowlerType;

    // Normalize bowler type to 'pace' or 'spin'
    const normalizedType = this.normalizeBowlerType(bowlerType);

    return over >= oversRange[0] &&
           over <= oversRange[1] &&
           normalizedType === requiredType;
  }

  /**
   * Normalize bowler type to pace/spin
   * @param {string} bowlerType - Raw bowler type
   * @returns {string} 'pace' or 'spin'
   */
  normalizeBowlerType(bowlerType) {
    if (!bowlerType) return 'pace';

    const type = bowlerType.toLowerCase();

    // Pace types
    if (type.includes('fast') || type.includes('medium') || type.includes('pace') || type.includes('seam')) {
      return 'pace';
    }

    // Spin types
    if (type.includes('spin') || type.includes('leg') || type.includes('off')) {
      return 'spin';
    }

    // Default to pace
    return 'pace';
  }

  /**
   * Apply new ball boost to bowler
   * @param {Object} bowler - Bowler object
   * @returns {Object} Modified bowler (copy)
   */
  applyNewBallBoost(bowler) {
    // Deep clone bowler to avoid mutating original (must clone nested attribute objects)
    const modifiedBowler = {
      ...bowler,
      attributes: {
        ...bowler.attributes,
        batting: { ...bowler.attributes?.batting },
        bowling: { ...bowler.attributes?.bowling },
        physical: { ...bowler.attributes?.physical },
        mental: { ...bowler.attributes?.mental },
        fielding: { ...bowler.attributes?.fielding }
      },
      condition: { ...bowler.condition }
    };

    // Apply swing boost
    const swingBoost = this.newBallConfig.effects.bowler.swing;

    if (modifiedBowler.attributes?.bowling?.swing !== undefined) {
      modifiedBowler.attributes.bowling.swing += swingBoost;
    } else {
      console.warn(`Swing attribute not found for bowler ${bowler.name}`);
    }

    return modifiedBowler;
  }

  /**
   * Apply all contextual modifiers to bowler
   * @param {Object} bowler - Bowler object
   * @param {Object} striker - Striker batsman
   * @param {Object} nonStriker - Non-striker batsman
   * @param {number} over - Current over
   * @returns {Object} Modified bowler (copy)
   */
  applyAllContextualModifiers(bowler, striker, nonStriker, over) {
    let modifiedBowler = { ...bowler };

    // Check and apply left-right penalty
    if (this.checkLeftRightCombo(striker, nonStriker)) {
      modifiedBowler = this.applyLeftRightPenalty(modifiedBowler);
    }

    // Check and apply new ball boost
    if (this.checkNewBallBoost(over, bowler.bowlingType)) {
      modifiedBowler = this.applyNewBallBoost(modifiedBowler);
    }

    return modifiedBowler;
  }

  /**
   * Get info about manager
   * @returns {Object} Manager info
   */
  getInfo() {
    return {
      name: 'ContextualModifierManager',
      version: '1.0.0',
      modifiers: ['Left-Right Partnership', 'New Ball Boost'],
      description: 'Auto-applies contextual modifiers based on match situation',
      methods: [
        'checkLeftRightCombo(striker, nonStriker)',
        'applyLeftRightPenalty(bowler)',
        'checkNewBallBoost(over, bowlerType)',
        'applyNewBallBoost(bowler)',
        'applyAllContextualModifiers(bowler, striker, nonStriker, over)'
      ]
    };
  }
}

// Export singleton instance
export default new ContextualModifierManager();
