/**
 * @file ContextualModifierManager.js
 * @description Manage contextual modifiers (left-right partnership, new ball boost,
 * old-ball penalty, death-overs batter power) — Stage 7 of TacticsModifierSystem.
 *
 * Modifiers in this stage operate on the bowler and/or striker based on situational
 * triggers (over number, partnership handedness) rather than player attributes.
 *
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
    this.oldBallConfig = contextualConfig.oldBallPenalty;
    this.deathPowerConfig = contextualConfig.deathOversBatterPower;
  }

  // ============================================================
  //                     Left-Right Partnership
  // ============================================================

  /**
   * Check if left-right partnership is active
   */
  checkLeftRightCombo(striker, nonStriker) {
    const strikerHand = striker?.battingHand;
    const nonStrikerHand = nonStriker?.battingHand;
    if (!strikerHand || !nonStrikerHand) return false;
    return (strikerHand === 'left' && nonStrikerHand === 'right') ||
           (strikerHand === 'right' && nonStrikerHand === 'left');
  }

  /**
   * Apply left-right partnership penalty (−2 accuracy) to bowler.
   * Mutates the bowler attributes in place.
   */
  applyLeftRightPenalty(bowler) {
    const penalty = this.leftRightConfig.effects.bowler.accuracy;
    if (bowler.attributes?.bowling?.accuracy !== undefined) {
      bowler.attributes.bowling.accuracy += penalty;
    }
  }

  // ============================================================
  //                       New Ball Boost (overs 1-6)
  // ============================================================

  /**
   * Check if new ball boost applies for this over + bowler type.
   * The actual swing value is per-over (see swingByOver in config).
   */
  checkNewBallBoost(over, bowlerType) {
    const [start, end] = this.newBallConfig.trigger.oversRange;
    const requiredType = this.newBallConfig.trigger.bowlerType;
    const normalizedType = this.normalizeBowlerType(bowlerType);
    return over >= start && over <= end && normalizedType === requiredType;
  }

  /**
   * Apply per-over swing boost to pace bowler.
   * Boost is config.swingByOver[over], default 0 if over not listed.
   */
  applyNewBallBoost(bowler, over) {
    const boost = this.newBallConfig.swingByOver?.[String(over)] || 0;
    if (boost === 0) return;
    if (bowler.attributes?.bowling?.swing !== undefined) {
      bowler.attributes.bowling.swing += boost;
    }
  }

  // ============================================================
  //                     Old Ball Penalty (overs 17-20)
  // ============================================================

  /**
   * Check if old ball penalty applies for this over + bowler type.
   */
  checkOldBallPenalty(over, bowlerType) {
    if (!this.oldBallConfig) return false;
    const [start, end] = this.oldBallConfig.trigger.oversRange;
    const requiredType = this.oldBallConfig.trigger.bowlerType;
    const normalizedType = this.normalizeBowlerType(bowlerType);
    return over >= start && over <= end && normalizedType === requiredType;
  }

  /**
   * Apply per-over swing penalty to pace bowler in death overs.
   * Penalty value is config.swingByOver[over] (negative or zero).
   */
  applyOldBallPenalty(bowler, over) {
    const penalty = this.oldBallConfig?.swingByOver?.[String(over)] || 0;
    if (penalty === 0) return;
    if (bowler.attributes?.bowling?.swing !== undefined) {
      bowler.attributes.bowling.swing += penalty;
    }
  }

  // ============================================================
  //                Death-Overs Batter Power (overs 17-20)
  // ============================================================

  /**
   * Check if death-overs strength bonus applies.
   * No bowler-type gate — applies to striker regardless of who's bowling.
   */
  checkDeathOversBatterPower(over) {
    if (!this.deathPowerConfig) return false;
    const [start, end] = this.deathPowerConfig.trigger.oversRange;
    return over >= start && over <= end;
  }

  /**
   * Apply per-over strength bonus to striker in death overs.
   * Strength sits in player.attributes.physical.strength.
   */
  applyDeathOversBatterPower(striker, over) {
    const bonus = this.deathPowerConfig?.strengthByOver?.[String(over)] || 0;
    if (bonus === 0) return;
    if (striker.attributes?.physical?.strength !== undefined) {
      striker.attributes.physical.strength += bonus;
    }
  }

  // ============================================================
  //                              Shared
  // ============================================================

  /**
   * Normalize bowler type to 'pace' or 'spin'.
   */
  normalizeBowlerType(bowlerType) {
    if (!bowlerType) return 'pace';
    const type = bowlerType.toLowerCase();
    if (type === 'spin' || type.includes('spin') || type.includes('off') || type.includes('leg') || type.includes('orthodox')) return 'spin';
    return 'pace';
  }

  /**
   * Clone a player (deep enough that attribute mutations don't leak to original).
   */
  clonePlayer(player) {
    return {
      ...player,
      attributes: {
        ...player.attributes,
        batting: { ...player.attributes?.batting },
        bowling: { ...player.attributes?.bowling },
        physical: { ...player.attributes?.physical },
        mental: { ...player.attributes?.mental },
        fielding: { ...player.attributes?.fielding }
      },
      condition: { ...player.condition }
    };
  }

  /**
   * Apply all contextual modifiers. Returns BOTH the modified bowler and striker
   * (since deathOversBatterPower targets the striker, the API now returns both).
   *
   * @param {Object} bowler
   * @param {Object} striker
   * @param {Object} nonStriker
   * @param {number} over
   * @returns {{bowler: Object, striker: Object, flags: Object}}
   */
  applyAllContextualModifiers(bowler, striker, nonStriker, over) {
    const modifiedBowler = this.clonePlayer(bowler);
    const modifiedStriker = this.clonePlayer(striker);

    const flags = {
      leftRightActive: false,
      newBallActive: false,
      oldBallActive: false,
      deathPowerActive: false
    };

    if (this.checkLeftRightCombo(striker, nonStriker)) {
      this.applyLeftRightPenalty(modifiedBowler);
      flags.leftRightActive = true;
    }

    if (this.checkNewBallBoost(over, bowler.bowlingType)) {
      this.applyNewBallBoost(modifiedBowler, over);
      flags.newBallActive = true;
    }

    if (this.checkOldBallPenalty(over, bowler.bowlingType)) {
      this.applyOldBallPenalty(modifiedBowler, over);
      flags.oldBallActive = true;
    }

    if (this.checkDeathOversBatterPower(over)) {
      this.applyDeathOversBatterPower(modifiedStriker, over);
      flags.deathPowerActive = true;
    }

    return { bowler: modifiedBowler, striker: modifiedStriker, flags };
  }

  /**
   * Get info about manager
   */
  getInfo() {
    return {
      name: 'ContextualModifierManager',
      version: '1.1.0',
      modifiers: [
        'Left-Right Partnership',
        'New Ball Boost (overs 1-6, graduated +5→0)',
        'Old Ball Penalty (overs 17-20, graduated 0→-3)',
        'Death-Overs Batter Power (overs 17-20, striker strength 0→+3)'
      ]
    };
  }
}

// Export singleton instance
export default new ContextualModifierManager();
