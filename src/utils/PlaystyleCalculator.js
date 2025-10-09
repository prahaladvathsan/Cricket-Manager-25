/**
 * @file PlaystyleCalculator.js
 * @description Calculate playstyle ratings for players based on attribute weightings
 * @module utils/PlaystyleCalculator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load playstyle weightings configuration
const weightingsPath = path.join(__dirname, '../data/config/playstyle-weightings.json');
const playstyleWeightings = JSON.parse(fs.readFileSync(weightingsPath, 'utf8'));

/**
 * PlaystyleCalculator class for calculating playstyle ratings
 */
class PlaystyleCalculator {
  constructor() {
    this.weightings = playstyleWeightings;
  }

  /**
   * Calculate playstyle rating for a specific playstyle
   * @param {Object} player - Player object with attributes
   * @param {string} category - 'batting' or 'bowling'
   * @param {string} playstyleName - Name of the playstyle
   * @param {string} bowlingType - Optional: 'pace' or 'spin' for bowling playstyles
   * @returns {number} PlaystyleRating (0-100 scale)
   */
  calculatePlaystyleRating(player, category, playstyleName, bowlingType = null) {
    // Get playstyle weightings
    let playstyleConfig;

    if (category === 'bowling') {
      // For bowling, check if we need to look in pace or spin subcategory
      if (bowlingType) {
        playstyleConfig = this.weightings.bowling?.[bowlingType]?.[playstyleName];
      } else {
        // Try to find in either pace or spin
        playstyleConfig = this.weightings.bowling?.pace?.[playstyleName] ||
                         this.weightings.bowling?.spin?.[playstyleName];
      }
    } else {
      playstyleConfig = this.weightings[category]?.[playstyleName];
    }

    if (!playstyleConfig) {
      console.warn(`Playstyle "${playstyleName}" not found in category "${category}"${bowlingType ? ` (${bowlingType})` : ''}`);
      return 0;
    }

    const attributes = playstyleConfig.attributes;

    // Calculate weighted sum
    let weightedSum = 0;
    let maxPossible = 0;

    for (const [attributeName, weight] of Object.entries(attributes)) {
      if (weight === 0) continue; // Skip attributes with 0 weight

      // Get attribute value from player
      const attributeValue = this.getAttributeValue(player, attributeName);

      if (attributeValue !== null && attributeValue !== undefined) {
        weightedSum += attributeValue * weight;
        maxPossible += 20 * weight; // Attributes are on 1-20 scale
      }
    }

    // Calculate rating as percentage (0-100)
    if (maxPossible === 0) {
      return 0;
    }

    const rating = (weightedSum / maxPossible) * 100;
    return Math.max(0, Math.min(100, rating)); // Clamp to 0-100
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

    // Attribute not found
    return null;
  }

  /**
   * Calculate all playstyle ratings for a player
   * @param {Object} player - Player object
   * @returns {Object} Object with batting and bowling playstyle ratings
   */
  calculateAllPlaystyleRatings(player) {
    const ratings = {
      batting: {},
      bowling: {}
    };

    // Calculate batting playstyle ratings
    for (const playstyleName in this.weightings.batting) {
      ratings.batting[playstyleName] = this.calculatePlaystyleRating(
        player,
        'batting',
        playstyleName
      );
    }

    // Calculate bowling playstyle ratings based on player's bowlingType
    const bowlingType = player.bowlingType || 'pace'; // Default to pace if not specified

    if (bowlingType === 'pace' || bowlingType === 'spin') {
      // Calculate ratings for the player's specific bowling type
      for (const playstyleName in this.weightings.bowling[bowlingType]) {
        ratings.bowling[playstyleName] = this.calculatePlaystyleRating(
          player,
          'bowling',
          playstyleName,
          bowlingType
        );
      }
    } else {
      // If bowlingType is invalid, calculate for both pace and spin
      for (const playstyleName in this.weightings.bowling.pace) {
        ratings.bowling[playstyleName] = this.calculatePlaystyleRating(
          player,
          'bowling',
          playstyleName,
          'pace'
        );
      }
      for (const playstyleName in this.weightings.bowling.spin) {
        ratings.bowling[playstyleName] = this.calculatePlaystyleRating(
          player,
          'bowling',
          playstyleName,
          'spin'
        );
      }
    }

    return ratings;
  }

  /**
   * Get top playstyles for a player based on their role
   * @param {Object} player - Player object
   * @param {string} role - Player role (batsman, bowler, all-rounder, wicket-keeper)
   * @param {number} topN - Number of top playstyles to return (default: 3)
   * @returns {Object} Object with top batting and bowling playstyles
   */
  getPlayerPrimaryPlaystyles(player, role, topN = 3) {
    const allRatings = this.calculateAllPlaystyleRatings(player);

    const result = {
      batting: [],
      bowling: []
    };

    // Get applicable batting playstyles based on role
    const roleCategories = this.weightings.roleCategories[role.toLowerCase()];
    let applicableBattingPlaystyles = [];

    if (Array.isArray(roleCategories)) {
      // Old structure: array of batting playstyles
      applicableBattingPlaystyles = roleCategories;
    } else if (roleCategories && roleCategories.batting) {
      // New structure: object with batting array
      applicableBattingPlaystyles = roleCategories.batting;
    } else {
      // Default: all batting playstyles
      applicableBattingPlaystyles = Object.keys(allRatings.batting);
    }

    // Filter and sort batting playstyles
    const battingPlaystyles = Object.entries(allRatings.batting)
      .filter(([name]) => applicableBattingPlaystyles.includes(name))
      .map(([name, rating]) => ({ name, rating }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, topN);

    result.batting = battingPlaystyles;

    // Bowling playstyles - no role filtering, based on bowlingType only
    const bowlingPlaystyles = Object.entries(allRatings.bowling)
      .map(([name, rating]) => ({ name, rating }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, topN);

    result.bowling = bowlingPlaystyles;

    // Determine primary playstyle based on role
    if (role.toLowerCase() === 'batsman' || role.toLowerCase() === 'wicket-keeper') {
      result.primary = battingPlaystyles[0]?.name || null;
      result.primaryRating = battingPlaystyles[0]?.rating || 0;
      result.primaryCategory = 'batting';
    } else if (role.toLowerCase() === 'bowler') {
      result.primary = bowlingPlaystyles[0]?.name || null;
      result.primaryRating = bowlingPlaystyles[0]?.rating || 0;
      result.primaryCategory = 'bowling';
    } else if (role.toLowerCase() === 'all-rounder') {
      // For all-rounders, choose the higher rated playstyle
      const topBatting = battingPlaystyles[0] || { rating: 0 };
      const topBowling = bowlingPlaystyles[0] || { rating: 0 };

      if (topBatting.rating >= topBowling.rating) {
        result.primary = topBatting.name;
        result.primaryRating = topBatting.rating;
        result.primaryCategory = 'batting';
      } else {
        result.primary = topBowling.name;
        result.primaryRating = topBowling.rating;
        result.primaryCategory = 'bowling';
      }
    }

    return result;
  }

  /**
   * Get detailed playstyle breakdown for a player
   * @param {Object} player - Player object
   * @param {string} category - 'batting' or 'bowling'
   * @param {string} playstyleName - Name of playstyle
   * @param {string} bowlingType - Optional: 'pace' or 'spin' for bowling playstyles
   * @returns {Object} Detailed breakdown with attribute contributions
   */
  getPlaystyleBreakdown(player, category, playstyleName, bowlingType = null) {
    let playstyleConfig;

    if (category === 'bowling') {
      const type = bowlingType || player.bowlingType || 'pace';
      playstyleConfig = this.weightings.bowling?.[type]?.[playstyleName];
    } else {
      playstyleConfig = this.weightings[category]?.[playstyleName];
    }

    if (!playstyleConfig) {
      return null;
    }

    const attributes = playstyleConfig.attributes;
    const breakdown = {
      playstyle: playstyleName,
      category,
      description: playstyleConfig.description,
      totalRating: 0,
      attributeContributions: [],
      weightedSum: 0,
      maxPossible: 0
    };

    for (const [attributeName, weight] of Object.entries(attributes)) {
      if (weight === 0) continue;

      const attributeValue = this.getAttributeValue(player, attributeName);

      if (attributeValue !== null && attributeValue !== undefined) {
        const contribution = attributeValue * weight;
        const maxContribution = 20 * weight;

        breakdown.attributeContributions.push({
          attribute: attributeName,
          value: attributeValue,
          weight,
          contribution,
          maxContribution,
          percentage: (contribution / maxContribution) * 100
        });

        breakdown.weightedSum += contribution;
        breakdown.maxPossible += maxContribution;
      }
    }

    breakdown.totalRating = (breakdown.weightedSum / breakdown.maxPossible) * 100;

    // Sort by contribution (descending)
    breakdown.attributeContributions.sort((a, b) => b.contribution - a.contribution);

    return breakdown;
  }

  /**
   * Recommend playstyle for a player based on their attributes
   * @param {Object} player - Player object
   * @param {string} role - Player role
   * @returns {Object} Recommended playstyle with reasoning
   */
  recommendPlaystyle(player, role) {
    const primaryPlaystyles = this.getPlayerPrimaryPlaystyles(player, role, 5);

    return {
      recommended: primaryPlaystyles.primary,
      rating: primaryPlaystyles.primaryRating,
      category: primaryPlaystyles.primaryCategory,
      alternatives: {
        batting: primaryPlaystyles.batting.slice(1, 5),
        bowling: primaryPlaystyles.bowling.slice(1, 5)
      },
      reasoning: `Based on ${player.name}'s attributes, they are best suited for the "${primaryPlaystyles.primary}" playstyle with a rating of ${primaryPlaystyles.primaryRating.toFixed(1)}/100.`
    };
  }
}

// Export singleton instance
const playstyleCalculator = new PlaystyleCalculator();

export default playstyleCalculator;

// Also export class for testing
export { PlaystyleCalculator };
