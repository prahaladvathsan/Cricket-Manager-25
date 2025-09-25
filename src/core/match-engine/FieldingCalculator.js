/**
 * @file FieldingCalculator.js
 * @description Simplified fielding resolution system with fixed probabilities
 * @module core/match-engine/FieldingCalculator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ProbabilityEngine from './ProbabilityEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fieldingConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/config/fielding-config.json'), 'utf8'));

/**
 * @typedef {Object} FieldingResult
 * @property {string} outcome - Fielding outcome ('BOUNDARY', 'CAUGHT', 'RUNS', 'DOT')
 * @property {number} runs - Runs scored
 * @property {boolean} isWicket - Whether wicket taken
 * @property {string} dismissalType - Type of dismissal if wicket
 * @property {Object} fieldingAction - Details of fielding action
 */

/**
 * @typedef {Object} FieldingContext
 * @property {Object} trajectoryResult - Result from trajectory calculator
 * @property {Object} striker - Striking batsman
 * @property {Object} fieldingTeam - Fielding team
 * @property {Object} wicketKeeper - Wicket keeper for catches behind
 */

class FieldingCalculator {
  constructor(probabilityEngine = null) {
    this.probabilityEngine = probabilityEngine || new ProbabilityEngine();

    // Load configuration from config files
    this.fieldingOutcomes = fieldingConfig.outcomes;
    this.runDistribution = fieldingConfig.runDistribution;
    this.boundaryConfig = fieldingConfig.boundaryTypes;
    this.keeperConfig = fieldingConfig.keeperCatchSuccess;
    this.speedRanges = fieldingConfig.outcomes.speedRanges;
  }

  /**
   * Calculate fielding outcome
   * @param {FieldingContext} context - Fielding context
   * @returns {FieldingResult} Fielding result
   */
  calculateFielding(context) {
    const { trajectoryResult, striker, fieldingTeam, wicketKeeper } = context;
    const { shotType, shotSpeed } = trajectoryResult;

    if (shotType === 'aerial') {
      return this.resolveAerialShot(shotSpeed, striker, fieldingTeam, wicketKeeper);
    } else {
      return this.resolveGroundedShot(shotSpeed, striker, fieldingTeam);
    }
  }

  /**
   * Resolve aerial shot outcome using new speed-based tables
   * @param {number} shotSpeed - Shot speed (20-120)
   * @param {Object} striker - Striking batsman
   * @param {Object} fieldingTeam - Fielding team
   * @param {Object} wicketKeeper - Wicket keeper
   * @returns {FieldingResult} Fielding result
   */
  resolveAerialShot(shotSpeed, striker, fieldingTeam, wicketKeeper) {
    // Determine outcome probabilities based on shot speed
    const probabilities = this.getAerialProbabilitiesBySpeed(shotSpeed);
    const outcome = this.selectOutcome(probabilities);

    switch (outcome) {
      case 'caught':
        return {
          outcome: 'CAUGHT',
          runs: 0,
          isWicket: true,
          dismissalType: 'caught',
          fieldingAction: {
            type: 'catch',
            fielder: this.selectFielder(fieldingTeam),
            success: true
          }
        };

      case 'six':
        return {
          outcome: 'SIX',
          runs: 6,
          isWicket: false,
          dismissalType: null,
          fieldingAction: {
            type: 'boundary',
            fielder: null,
            success: false
          }
        };

      case 'four':
        return {
          outcome: 'FOUR',
          runs: 4,
          isWicket: false,
          dismissalType: null,
          fieldingAction: {
            type: 'boundary',
            fielder: null,
            success: false
          }
        };

      case 'runs':
      default:
        const runs = this.getRandomRunsBySpeed(shotSpeed);
        return {
          outcome: 'RUNS',
          runs,
          isWicket: false,
          dismissalType: null,
          fieldingAction: {
            type: 'field',
            fielder: this.selectFielder(fieldingTeam),
            success: true
          }
        };
    }
  }

  /**
   * Resolve grounded shot outcome using new speed-based tables
   * @param {number} shotSpeed - Shot speed (20-120)
   * @param {Object} striker - Striking batsman
   * @param {Object} fieldingTeam - Fielding team
   * @returns {FieldingResult} Fielding result
   */
  resolveGroundedShot(shotSpeed, striker, fieldingTeam) {
    // Determine outcome probabilities based on shot speed
    const probabilities = this.getGroundedProbabilitiesBySpeed(shotSpeed);
    const outcome = this.selectOutcome(probabilities);

    switch (outcome) {
      case 'dot':
        return {
          outcome: 'DOT',
          runs: 0,
          isWicket: false,
          dismissalType: null,
          fieldingAction: {
            type: 'field',
            fielder: this.selectFielder(fieldingTeam),
            success: true
          }
        };

      case 'four':
        return {
          outcome: 'FOUR',
          runs: 4,
          isWicket: false,
          dismissalType: null,
          fieldingAction: {
            type: 'boundary',
            fielder: null,
            success: false
          }
        };

      case 'runs':
      default:
        const runs = this.getRandomRunsBySpeed(shotSpeed);
        return {
          outcome: 'RUNS',
          runs,
          isWicket: false,
          dismissalType: null,
          fieldingAction: {
            type: 'field',
            fielder: this.selectFielder(fieldingTeam),
            success: true
          }
        };
    }
  }

  /**
   * Select outcome based on probabilities
   * @param {Object} probabilities - Probability distribution
   * @returns {string} Selected outcome
   */
  selectOutcome(probabilities) {
    const random = Math.random();
    let cumulative = 0;

    for (const [outcome, probability] of Object.entries(probabilities)) {
      cumulative += probability;
      if (random <= cumulative) {
        return outcome;
      }
    }

    // Fallback to last outcome
    return Object.keys(probabilities).pop();
  }

  /**
   * Get random runs based on shot speed using new speed ranges
   * @param {number} shotSpeed - Shot speed (20-120)
   * @returns {number} Number of runs
   */
  getRandomRunsBySpeed(shotSpeed) {
    // Determine run distribution based on shot speed
    const speedCategory = this.getSpeedCategory(shotSpeed);
    let distributionKey;

    // Map speed categories to run distributions
    switch (speedCategory) {
      case 'low':
        distributionKey = 'mishit';
        break;
      case 'medium':
        distributionKey = 'goodHit';
        break;
      case 'high':
      case 'veryHigh':
        distributionKey = 'smashed';
        break;
      default:
        distributionKey = 'goodHit';
    }

    const distribution = this.runDistribution[distributionKey] || this.runDistribution.goodHit;
    const randomIndex = Math.floor(Math.random() * distribution.length);
    return distribution[randomIndex];
  }

  /**
   * Determine speed category based on shot speed
   * @param {number} shotSpeed - Shot speed (20-120)
   * @returns {string} Speed category (low, medium, high, veryHigh)
   */
  getSpeedCategory(shotSpeed) {
    for (const [category, range] of Object.entries(this.speedRanges)) {
      if (shotSpeed >= range.min && shotSpeed <= range.max) {
        return category;
      }
    }
    return 'medium'; // Default fallback
  }

  /**
   * Select fielder for action
   * @param {Object} fieldingTeam - Fielding team
   * @returns {Object} Selected fielder
   */
  selectFielder(fieldingTeam) {
    const fielders = fieldingTeam.squad || [];
    if (fielders.length === 0) {
      return { id: 'unknown', name: 'Fielder' };
    }

    const randomIndex = Math.floor(Math.random() * fielders.length);
    return fielders[randomIndex];
  }

  /**
   * Calculate keeper catch success for edged balls
   * @param {Object} wicketKeeper - Wicket keeper
   * @param {string} edgeType - Type of edge ('thick', 'thin', 'glove')
   * @returns {boolean} Whether catch was successful
   */
  calculateKeeperCatch(wicketKeeper, edgeType = 'thick') {
    const keeperSkill = wicketKeeper.attributes?.fielding?.catching || 10;

    // Base success rates from config
    const baseSuccess = this.keeperConfig[edgeType] || this.keeperConfig.thick;

    // Skill adjustment from config
    const { min, max } = this.keeperConfig.skillMultiplier;
    const skillMultiplier = min + (keeperSkill / 20) * (max - min);
    const successRate = baseSuccess * skillMultiplier;

    return Math.random() < successRate;
  }

  /**
   * Get fielding statistics for analysis
   * @returns {Object} Fielding statistics
   */
  getFieldingStats() {
    return {
      aerialOutcomes: this.fieldingOutcomes.aerial,
      groundedOutcomes: this.fieldingOutcomes.grounded,
      runDistributions: this.runDistribution
    };
  }

  /**
   * Get aerial shot probabilities based on shot speed using new speed categories
   * @param {number} shotSpeed - Shot speed (20-120)
   * @returns {Object} Probability distribution
   */
  getAerialProbabilitiesBySpeed(shotSpeed) {
    const speedCategory = this.getSpeedCategory(shotSpeed);
    const speedKey = `speed${speedCategory.charAt(0).toUpperCase() + speedCategory.slice(1)}`;

    return this.fieldingOutcomes.aerial[speedKey] || this.fieldingOutcomes.aerial.speedMedium;
  }

  /**
   * Get grounded shot probabilities based on shot speed using new speed categories
   * @param {number} shotSpeed - Shot speed (20-120)
   * @returns {Object} Probability distribution
   */
  getGroundedProbabilitiesBySpeed(shotSpeed) {
    const speedCategory = this.getSpeedCategory(shotSpeed);
    const speedKey = `speed${speedCategory.charAt(0).toUpperCase() + speedCategory.slice(1)}`;

    return this.fieldingOutcomes.grounded[speedKey] || this.fieldingOutcomes.grounded.speedMedium;
  }

  /**
   * Update fielding probabilities (for future configuration)
   * @param {Object} newProbabilities - New probability tables
   */
  updateFieldingProbabilities(newProbabilities) {
    if (newProbabilities.aerial) {
      this.fieldingOutcomes.aerial = { ...this.fieldingOutcomes.aerial, ...newProbabilities.aerial };
    }
    if (newProbabilities.grounded) {
      this.fieldingOutcomes.grounded = { ...this.fieldingOutcomes.grounded, ...newProbabilities.grounded };
    }
    if (newProbabilities.runDistribution) {
      this.runDistribution = { ...this.runDistribution, ...newProbabilities.runDistribution };
    }
  }
}

export default FieldingCalculator;