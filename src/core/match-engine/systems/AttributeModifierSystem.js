/**
 * @file AttributeModifierSystem.js
 * @description Apply playstyle-based attribute modifiers during match simulation
 * @module core/match-engine/AttributeModifierSystem
 */

import playstyleModifiers from '../../../data/config/playstyle-modifiers.json';

/**
 * AttributeModifierSystem class for applying playstyle modifiers
 */
class AttributeModifierSystem {
  constructor() {
    this.modifiers = playstyleModifiers;
    this.operators = playstyleModifiers.conditionOperators;
  }

  /**
   * Apply playstyle modifiers to a player's attributes
   * @param {Object} player - Player object with attributes and playstyleRatings
   * @param {string} category - 'batting' or 'bowling'
   * @param {string} playstyleName - Name of the active playstyle
   * @param {Object} matchContext - Current match situation
   * @param {Object} opponentPlayer - Optional: opponent player for targetPlayer effects
   * @returns {Object} Object with modified player and opponent player (if modified)
   */
  applyPlaystyleModifiers(player, category, playstyleName, matchContext, opponentPlayer = null) {
    // Deep clone player object to avoid mutating original
    // Must clone nested attribute objects to prevent mutation accumulation
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
      condition: { ...player.condition }
    };
    let modifiedOpponent = opponentPlayer ? {
      ...opponentPlayer,
      attributes: {
        ...opponentPlayer.attributes,
        batting: { ...opponentPlayer.attributes?.batting },
        bowling: { ...opponentPlayer.attributes?.bowling },
        physical: { ...opponentPlayer.attributes?.physical },
        mental: { ...opponentPlayer.attributes?.mental },
        fielding: { ...opponentPlayer.attributes?.fielding }
      },
      condition: { ...opponentPlayer.condition }
    } : null;

    // Get playstyle modifiers configuration
    let playstyleConfig;

    if (category === 'bowling') {
      // For bowling, need to check pace or spin subcategory
      const bowlingType = player.bowlingType || 'pace';
      playstyleConfig = this.modifiers.bowling?.[bowlingType]?.[playstyleName];
    } else {
      playstyleConfig = this.modifiers[category]?.[playstyleName];
    }

    if (!playstyleConfig || !playstyleConfig.modifiers) {
      return { player: modifiedPlayer, opponent: modifiedOpponent }; // No modifiers, return unchanged
    }

    // Get playstyle rating for this playstyle
    const playstyleRating = player.playstyleRatings?.[category]?.[playstyleName] || 0;

    if (playstyleRating === 0) {
      return { player: modifiedPlayer, opponent: modifiedOpponent }; // No rating, no modifiers apply
    }

    // Track applied modifiers for metadata
    const appliedModifiers = [];

    // Process each modifier
    for (const modifier of playstyleConfig.modifiers) {
      // Check if all conditions are met
      const conditionsMet = this.evaluateConditions(modifier.conditions, matchContext);

      if (conditionsMet) {
        // Calculate effect details before applying
        const effectDetails = [];

        for (const effect of modifier.effects) {
          // Get current value before modification
          const targetPlayer = (effect.targetPlayer === 'batsman' && modifiedOpponent) ? modifiedOpponent : modifiedPlayer;
          const currentValue = this.getAttributeValue(targetPlayer, effect.attribute);

          if (currentValue !== null && currentValue !== undefined) {
            // Calculate the actual effect value
            let effectValue = 0;
            if (effect.scalingFactor !== undefined) {
              effectValue = Math.round(currentValue * playstyleRating * effect.scalingFactor * 100) / 100;
            } else if (effect.flatBonus !== undefined) {
              effectValue = effect.flatBonus;
            } else if (effect.flatPenalty !== undefined) {
              effectValue = -effect.flatPenalty;
            }

            effectDetails.push({
              attribute: effect.attribute,
              value: effectValue,
              isPositive: effectValue > 0
            });
          }

          // Now apply the effect
          if (effect.targetPlayer === 'batsman' && modifiedOpponent) {
            this.applyEffect(modifiedOpponent, effect, playstyleRating, matchContext);
          } else {
            this.applyEffect(modifiedPlayer, effect, playstyleRating, matchContext);
          }
        }

        appliedModifiers.push({
          name: modifier.name,
          sideEffect: modifier.sideEffect || false,
          effectDetails: effectDetails,
          conditions: modifier.conditions || [] // Include conditions for UI display
        });
      }
    }

    // Store metadata about applied modifiers
    if (!modifiedPlayer.matchMetadata) {
      modifiedPlayer.matchMetadata = {};
    }
    modifiedPlayer.matchMetadata.appliedModifiers = appliedModifiers;
    modifiedPlayer.matchMetadata.activePlaystyle = playstyleName;
    modifiedPlayer.matchMetadata.playstyleRating = playstyleRating;

    return { player: modifiedPlayer, opponent: modifiedOpponent };
  }

  /**
   * Evaluate if all conditions are met
   * @param {Array} conditions - Array of condition objects
   * @param {Object} matchContext - Current match situation
   * @returns {boolean} True if all conditions are met
   */
  evaluateConditions(conditions, matchContext) {
    // Empty conditions array means always active
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // All conditions must be true (AND logic)
    return conditions.every(condition =>
      this.evaluateCondition(condition, matchContext)
    );
  }

  /**
   * Evaluate a single condition
   * @param {Object} condition - Condition object with field, operator, value
   * @param {Object} matchContext - Current match situation
   * @returns {boolean} True if condition is met
   */
  evaluateCondition(condition, matchContext) {
    const { field, operator, value } = condition;

    // Get field value from match context
    let fieldValue = this.getContextValue(matchContext, field);

    // Handle special cases
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    // Handle relative comparisons (e.g., requiredRunRate > currentRunRate)
    let compareValue = value;
    if (typeof value === 'string' && matchContext[value] !== undefined) {
      compareValue = matchContext[value];
    }

    // Perform comparison based on operator
    switch (operator) {
      case '==':
        return fieldValue === compareValue;
      case '!=':
        return fieldValue !== compareValue;
      case '>':
        return fieldValue > compareValue;
      case '<':
        return fieldValue < compareValue;
      case '>=':
        return fieldValue >= compareValue;
      case '<=':
        return fieldValue <= compareValue;
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Get value from match context with nested support
   * @param {Object} matchContext - Current match situation
   * @param {string} field - Field name (supports dot notation)
   * @returns {*} Field value
   */
  getContextValue(matchContext, field) {
    if (!matchContext) {
      return undefined;
    }

    // Handle nested fields (e.g., 'innings.phase')
    const parts = field.split('.');
    let value = matchContext;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Apply a single effect to player attributes
   * @param {Object} player - Player object (will be mutated)
   * @param {Object} effect - Effect object with attribute and modifier type
   * @param {number} playstyleRating - Playstyle rating (0-100)
   * @param {Object} matchContext - Current match situation
   */
  applyEffect(player, effect, playstyleRating, matchContext) {
    const { attribute, scalingFactor, flatBonus, flatPenalty, perOverMultiplier } = effect;

    // Get current attribute value
    const currentValue = this.getAttributeValue(player, attribute);

    if (currentValue === null || currentValue === undefined) {
      return; // Attribute not found, skip
    }

    let newValue;

    // Handle different effect types
    if (flatBonus !== undefined) {
      // Direct addition (flat bonus)
      newValue = currentValue + flatBonus;
    } else if (flatPenalty !== undefined) {
      // Direct subtraction (flat penalty)
      newValue = currentValue - flatPenalty;
    } else if (scalingFactor !== undefined) {
      // Multiplicative modifier (existing logic)
      let modifier = 1 + (playstyleRating * scalingFactor);

      // Handle per-over multiplier (for Workhorse "Consistency" modifier)
      if (perOverMultiplier && matchContext.oversBowled) {
        modifier = 1 + (playstyleRating * scalingFactor * matchContext.oversBowled);
      }

      newValue = currentValue * modifier;
    } else {
      // No valid effect type found
      return;
    }

    // Set modified value
    this.setAttributeValue(player, attribute, newValue);
  }

  /**
   * Get attribute value from player object
   * Handles nested attribute structure (batting, bowling, physical, mental)
   * @param {Object} player - Player object
   * @param {string} attributeName - Name of attribute
   * @returns {number|null} Attribute value or null if not found
   */
  getAttributeValue(player, attributeName) {
    if (!player || !player.attributes) {
      return null;
    }

    const attributes = player.attributes;

    // Check in batting attributes
    if (attributes.batting && attributes.batting[attributeName] !== undefined) {
      return attributes.batting[attributeName];
    }

    // Check in bowling attributes
    if (attributes.bowling && attributes.bowling[attributeName] !== undefined) {
      return attributes.bowling[attributeName];
    }

    // Check in physical attributes
    if (attributes.physical && attributes.physical[attributeName] !== undefined) {
      return attributes.physical[attributeName];
    }

    // Check in mental attributes
    if (attributes.mental && attributes.mental[attributeName] !== undefined) {
      return attributes.mental[attributeName];
    }

    // Check in fielding attributes
    if (attributes.fielding && attributes.fielding[attributeName] !== undefined) {
      return attributes.fielding[attributeName];
    }

    return null;
  }

  /**
   * Set attribute value in player object
   * Handles nested attribute structure (batting, bowling, physical, mental)
   * @param {Object} player - Player object (will be mutated)
   * @param {string} attributeName - Name of attribute
   * @param {number} value - New value
   */
  setAttributeValue(player, attributeName, value) {
    if (!player || !player.attributes) {
      return;
    }

    const attributes = player.attributes;

    // Set in batting attributes
    if (attributes.batting && attributes.batting[attributeName] !== undefined) {
      attributes.batting[attributeName] = value;
      return;
    }

    // Set in bowling attributes
    if (attributes.bowling && attributes.bowling[attributeName] !== undefined) {
      attributes.bowling[attributeName] = value;
      return;
    }

    // Set in physical attributes
    if (attributes.physical && attributes.physical[attributeName] !== undefined) {
      attributes.physical[attributeName] = value;
      return;
    }

    // Set in mental attributes
    if (attributes.mental && attributes.mental[attributeName] !== undefined) {
      attributes.mental[attributeName] = value;
      return;
    }

    // Set in fielding attributes
    if (attributes.fielding && attributes.fielding[attributeName] !== undefined) {
      attributes.fielding[attributeName] = value;
      return;
    }
  }

  /**
   * Apply modifiers for batting playstyle
   * @param {Object} striker - Batsman player object
   * @param {Object} matchContext - Current match situation
   * @param {Object} opponentPlayer - Optional: opponent player (bowler) for targetPlayer effects
   * @returns {Object} Modified player object (or { player, opponent } if opponent was modified)
   */
  applyBattingModifiers(striker, matchContext, opponentPlayer = null) {
    // Get active batting playstyle (use selectedPlaystyle if available, fallback to primaryPlaystyle)
    const activePlaystyle = striker.selectedPlaystyle?.batting || striker.primaryPlaystyle?.batting || striker.primaryPlaystyle;

    if (!activePlaystyle) {
      return opponentPlayer ? { player: striker, opponent: opponentPlayer } : striker;
    }

    const result = this.applyPlaystyleModifiers(striker, 'batting', activePlaystyle, matchContext, opponentPlayer);

    // Return format depends on whether opponent was provided
    return opponentPlayer ? result : result.player;
  }

  /**
   * Apply modifiers for bowling playstyle
   * @param {Object} bowler - Bowler player object
   * @param {Object} matchContext - Current match situation
   * @param {Object} opponentPlayer - Optional: opponent player (batsman) for targetPlayer effects
   * @returns {Object} Modified player object (or { player, opponent } if opponent was modified)
   */
  applyBowlingModifiers(bowler, matchContext, opponentPlayer = null) {
    // Get active bowling playstyle (use selectedPlaystyle if available, fallback to primaryPlaystyle)
    const activePlaystyle = bowler.selectedPlaystyle?.bowling || bowler.primaryPlaystyle?.bowling || bowler.primaryPlaystyle;

    if (!activePlaystyle) {
      return opponentPlayer ? { player: bowler, opponent: opponentPlayer } : bowler;
    }

    const result = this.applyPlaystyleModifiers(bowler, 'bowling', activePlaystyle, matchContext, opponentPlayer);

    // Return format depends on whether opponent was provided
    return opponentPlayer ? result : result.player;
  }

  /**
   * Get modifier information for display/debugging
   * @param {string} category - 'batting' or 'bowling'
   * @param {string} playstyleName - Name of playstyle
   * @param {Object} matchContext - Current match situation
   * @returns {Object} Information about active modifiers
   */
  getActiveModifiersInfo(category, playstyleName, matchContext) {
    const playstyleConfig = this.modifiers[category]?.[playstyleName];

    if (!playstyleConfig) {
      return {
        playstyle: playstyleName,
        category,
        activeModifiers: [],
        inactiveModifiers: []
      };
    }

    const activeModifiers = [];
    const inactiveModifiers = [];

    for (const modifier of playstyleConfig.modifiers) {
      const conditionsMet = this.evaluateConditions(modifier.conditions, matchContext);

      const modifierInfo = {
        name: modifier.name,
        sideEffect: modifier.sideEffect || false,
        conditions: modifier.conditions,
        effects: modifier.effects
      };

      if (conditionsMet) {
        activeModifiers.push(modifierInfo);
      } else {
        inactiveModifiers.push(modifierInfo);
      }
    }

    return {
      playstyle: playstyleName,
      category,
      description: playstyleConfig.description,
      activeModifiers,
      inactiveModifiers
    };
  }
}

// Export singleton instance
const attributeModifierSystem = new AttributeModifierSystem();

export default attributeModifierSystem;

// Also export class for testing
export { AttributeModifierSystem };
