/**
 * @file ProbabilityEngine.js
 * @description Configurable probability calculation engine for match simulation
 * @module core/match-engine/ProbabilityEngine
 */

import ConfigurationManager from './ConfigurationManager.js';

/**
 * @typedef {Object} ProbabilityConfig
 * @property {Object} contactQuality - Contact quality probabilities
 * @property {Object} shotTypes - Shot type probabilities
 * @property {Object} trajectories - Trajectory probabilities
 * @property {Object} fielding - Fielding outcome probabilities
 * @property {Object} dismissals - Dismissal type probabilities
 */

class ProbabilityEngine {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigurationManager();
    this.random = Math.random; // Can be replaced with seeded RNG

    // Plugin registry for custom probability calculators
    this.calculators = new Map();
    this.modifiers = new Map();

    // Initialize configuration if not loaded
    if (!this.configManager.isLoaded) {
      this.configManager.load().catch(console.error);
    }

    this.registerDefaultCalculators();
  }

  /**
   * Set a seeded random number generator
   * @param {Function} randomFn - Random function
   */
  setRandomFunction(randomFn) {
    this.random = randomFn;
  }

  /**
   * Register a custom probability calculator
   * @param {string} name - Calculator name
   * @param {Function} calculator - Calculator function
   */
  registerCalculator(name, calculator) {
    this.calculators.set(name, calculator);
  }

  /**
   * Register a probability modifier
   * @param {string} name - Modifier name
   * @param {Function} modifier - Modifier function
   */
  registerModifier(name, modifier) {
    this.modifiers.set(name, modifier);
  }

  /**
   * Calculate contact quality probability
   * @param {Object} context - Ball context
   * @returns {Object} Contact quality result
   */
  calculateContactQuality(context) {
    const calculator = this.calculators.get('contactQuality') || this.defaultContactQuality;
    let probabilities = calculator(context, this.config.contactQuality);

    // Apply modifiers
    probabilities = this.applyModifiers('contactQuality', probabilities, context);

    return this.selectOutcome(probabilities);
  }

  /**
   * Calculate shot type probability
   * @param {Object} context - Shot context
   * @returns {Object} Shot type result
   */
  calculateShotType(context) {
    const calculator = this.calculators.get('shotType') || this.defaultShotType;
    let probabilities = calculator(context, this.config.shotTypes);

    probabilities = this.applyModifiers('shotType', probabilities, context);

    return this.selectOutcome(probabilities);
  }

  /**
   * Calculate trajectory probability
   * @param {Object} context - Trajectory context
   * @returns {Object} Trajectory result
   */
  calculateTrajectory(context) {
    const calculator = this.calculators.get('trajectory') || this.defaultTrajectory;
    let probabilities = calculator(context, this.config.trajectories);

    probabilities = this.applyModifiers('trajectory', probabilities, context);

    return this.selectOutcome(probabilities);
  }

  /**
   * Calculate fielding outcome probability
   * @param {Object} context - Fielding context
   * @returns {Object} Fielding result
   */
  calculateFieldingOutcome(context) {
    const calculator = this.calculators.get('fielding') || this.defaultFielding;
    let probabilities = calculator(context, this.config.fielding);

    probabilities = this.applyModifiers('fielding', probabilities, context);

    return this.selectOutcome(probabilities);
  }

  /**
   * Calculate dismissal type probability
   * @param {Object} context - Dismissal context
   * @returns {Object} Dismissal result
   */
  calculateDismissalType(context) {
    const calculator = this.calculators.get('dismissal') || this.defaultDismissal;
    let probabilities = calculator(context, this.config.dismissals);

    probabilities = this.applyModifiers('dismissal', probabilities, context);

    return this.selectOutcome(probabilities);
  }

  /**
   * Apply probability modifiers
   * @param {string} type - Probability type
   * @param {Object} probabilities - Base probabilities
   * @param {Object} context - Context data
   * @returns {Object} Modified probabilities
   */
  applyModifiers(type, probabilities, context) {
    let modified = { ...probabilities };

    for (const [name, modifier] of this.modifiers) {
      if (name.startsWith(type)) {
        modified = modifier(modified, context);
      }
    }

    // Normalize probabilities to sum to 1
    return this.normalizeProbabilities(modified);
  }

  /**
   * Select outcome based on probabilities
   * @param {Object} probabilities - Outcome probabilities
   * @returns {Object} Selected outcome
   */
  selectOutcome(probabilities) {
    const roll = this.random();
    let cumulative = 0;

    for (const [outcome, probability] of Object.entries(probabilities)) {
      cumulative += probability;
      if (roll <= cumulative) {
        return {
          type: outcome,
          probability,
          roll,
          quality: roll / cumulative // Quality within this outcome range
        };
      }
    }

    // Fallback to last outcome
    const outcomes = Object.keys(probabilities);
    const lastOutcome = outcomes[outcomes.length - 1];
    return {
      type: lastOutcome,
      probability: probabilities[lastOutcome],
      roll,
      quality: 0.5
    };
  }

  /**
   * Normalize probabilities to sum to 1
   * @param {Object} probabilities - Input probabilities
   * @returns {Object} Normalized probabilities
   */
  normalizeProbabilities(probabilities) {
    const total = Object.values(probabilities).reduce((sum, prob) => sum + prob, 0);

    if (total === 0) {
      // Equal distribution if all probabilities are 0
      const count = Object.keys(probabilities).length;
      const equalProb = 1 / count;
      return Object.fromEntries(
        Object.keys(probabilities).map(key => [key, equalProb])
      );
    }

    return Object.fromEntries(
      Object.entries(probabilities).map(([key, prob]) => [key, prob / total])
    );
  }

  /**
   * Register default probability calculators
   */
  registerDefaultCalculators() {
    this.calculators.set('contactQuality', this.defaultContactQuality.bind(this));
    this.calculators.set('shotType', this.defaultShotType.bind(this));
    this.calculators.set('trajectory', this.defaultTrajectory.bind(this));
    this.calculators.set('fielding', this.defaultFielding.bind(this));
    this.calculators.set('dismissal', this.defaultDismissal.bind(this));
  }

  /**
   * Default contact quality calculator
   * @param {Object} context - Ball context
   * @param {Object} config - Contact quality config (deprecated, uses ConfigurationManager)
   * @returns {Object} Contact quality probabilities
   */
  defaultContactQuality(context) {
    const { striker, bowler, setup } = context;

    // Get configuration values
    const contactConfig = this.configManager.get('probabilities', 'contact');
    const pressureConfig = this.configManager.get('modifiers', 'pressure.impact.contact');

    const skillDiff = this.calculateSkillMatchup(striker, bowler);
    const conditionFactor = this.calculateConditionFactor(setup.strikerCondition, setup.bowlerCondition);
    const pressureFactor = 1 - (setup.pressure * (pressureConfig || 0.3));

    const adjustedSkill = skillDiff * conditionFactor * pressureFactor;

    const base = contactConfig.base;
    const skillFactors = contactConfig.skillFactors;

    return {
      MISSED: Math.max(
        skillFactors.missed.minimum,
        base.missed - adjustedSkill * skillFactors.missed.impact
      ),
      EDGED: Math.max(
        skillFactors.edged.minimum,
        base.edged - adjustedSkill * skillFactors.edged.impact
      ),
      MIDDLED: 0 // Will be calculated as remainder
    };
  }

  /**
   * Default shot type calculator
   * @param {Object} context - Shot context
   * @param {Object} config - Shot type config (deprecated, uses ConfigurationManager)
   * @returns {Object} Shot type probabilities
   */
  defaultShotType(context) {
    const { striker, bowler, matchSituation } = context;
    const strikerSkill = this.getBatsmanEffectiveness(striker, bowler);
    const { phase, required, ballsLeft } = matchSituation;

    // Get configuration values
    const shotConfig = this.configManager.get('probabilities', 'shotTypes');
    const situationalConfig = shotConfig.situational[phase] || shotConfig.situational.middle;

    let probabilities = { ...shotConfig.base };

    // Adjust for player skill
    const skillFactors = shotConfig.skillFactors;
    probabilities.MISHIT *= (1 - (strikerSkill / 20) * Math.abs(skillFactors.technique.mishit));
    probabilities.SMASHED *= (strikerSkill / 20) * skillFactors.power.smashed;

    // Adjust for match situation
    probabilities.MISHIT *= situationalConfig.mishit;
    probabilities.GOOD_HIT = (probabilities.GOOD_HIT || probabilities.goodHit) * situationalConfig.goodHit;
    probabilities.SMASHED *= situationalConfig.smashed;

    // Special adjustments for high-pressure situations
    if (phase === 'death' || (required && ballsLeft < 30)) {
      const deathMultipliers = this.configManager.get('probabilities', 'shotTypes.situational.death');
      if (deathMultipliers) {
        probabilities.MISHIT *= deathMultipliers.mishit;
        probabilities.SMASHED *= deathMultipliers.smashed;
      }
    }

    return probabilities;
  }

  /**
   * Default trajectory calculator
   * @param {Object} context - Trajectory context
   * @param {Object} config - Trajectory config
   * @returns {Object} Trajectory probabilities
   */
  defaultTrajectory(context, config) {
    const { shotType, striker } = context;
    const power = striker.attributes.physical.strength;

    const baseProb = config[shotType.type] || config.GOOD_HIT;
    const aerialProb = baseProb.aerial + (power / 20) * baseProb.powerFactor;

    return {
      GROUNDED: 1 - aerialProb,
      AERIAL: aerialProb
    };
  }

  /**
   * Default fielding calculator
   * @param {Object} context - Fielding context
   * @param {Object} config - Fielding config
   * @returns {Object} Fielding probabilities
   */
  defaultFielding(context, config) {
    const { fielder, shotPower, isAerial } = context;
    const fieldingSkill = fielder.attributes?.fielding?.groundFielding || 10;

    const baseConfig = config[shotPower] || config.GOOD_HIT;
    const skillFactor = fieldingSkill / 20;

    return {
      CLEAN: baseConfig.clean * (0.4 + skillFactor * 0.6),
      MISFIELD: baseConfig.misfield,
      BOUNDARY: baseConfig.boundary
    };
  }

  /**
   * Default dismissal calculator
   * @param {Object} context - Dismissal context
   * @param {Object} config - Dismissal config
   * @returns {Object} Dismissal probabilities
   */
  defaultDismissal(context, config) {
    const { contactType } = context;
    return config[contactType] || config.MISSED;
  }

  /**
   * Calculate skill matchup between batsman and bowler
   * @param {Object} striker - Striking batsman
   * @param {Object} bowler - Current bowler
   * @returns {number} Skill difference (-1 to 1, positive favors batsman)
   */
  calculateSkillMatchup(striker, bowler) {
    const batsmanSkill = this.getBatsmanEffectiveness(striker, bowler);
    const bowlerSkill = this.getBowlerEffectiveness(bowler, striker);

    return (batsmanSkill - bowlerSkill) / 20;
  }

  /**
   * Get batsman effectiveness against bowler type
   * @param {Object} striker - Striking batsman
   * @param {Object} bowler - Current bowler
   * @returns {number} Batsman effectiveness (1-20)
   */
  getBatsmanEffectiveness(striker, bowler) {
    const { attributes } = striker;
    const isPaceBowler = ['fast', 'fast-medium', 'medium'].includes(bowler.bowlingType);

    let effectiveness = (attributes.batting.technique + attributes.batting.timing + attributes.batting.footwork) / 3;

    if (isPaceBowler) {
      effectiveness = (effectiveness + attributes.batting.vsPace) / 2;
    } else {
      effectiveness = (effectiveness + attributes.batting.vsSpin) / 2;
    }

    return effectiveness;
  }

  /**
   * Get bowler effectiveness against batsman
   * @param {Object} bowler - Current bowler
   * @param {Object} striker - Striking batsman
   * @returns {number} Bowler effectiveness (1-20)
   */
  getBowlerEffectiveness(bowler, striker) {
    const { attributes } = bowler;
    return (attributes.bowling.accuracy + attributes.bowling.intelligence + attributes.bowling.variations) / 3;
  }

  /**
   * Calculate condition factor affecting performance
   * @param {Object} strikerCondition - Striker's condition
   * @param {Object} bowlerCondition - Bowler's condition
   * @returns {number} Condition factor (0.5-1.5)
   */
  calculateConditionFactor(strikerCondition, bowlerCondition) {
    const { confidence: strikerConf, energy: strikerEnergy, fatigue: strikerFatigue } = strikerCondition;
    const { confidence: bowlerConf, energy: bowlerEnergy, fatigue: bowlerFatigue } = bowlerCondition;

    const strikerFactor = (strikerConf / 100 + strikerEnergy / 100 - strikerFatigue / 100) / 3;
    const bowlerFactor = (bowlerConf / 100 + bowlerEnergy / 100 - bowlerFatigue / 100) / 3;
    const netAdvantage = strikerFactor - bowlerFactor;

    return 1.0 + (netAdvantage * 0.5);
  }

  /**
   * Get default configuration
   * @returns {ProbabilityConfig} Default configuration
   */
  getDefaultConfig() {
    return {
      contactQuality: {
        missed: { base: 0.20, min: 0.05, skillFactor: 0.15 },
        edged: { base: 0.15, min: 0.08, skillFactor: 0.10 }
      },
      shotTypes: {
        base: {
          MISHIT: 0.30,
          GOOD_HIT: 0.50,
          SMASHED: 0.20
        },
        skillFactors: {
          mishit: 0.4,
          smashed: 0.6
        },
        situationFactors: {
          aggressive: 1.5,
          risky: 1.3
        }
      },
      trajectories: {
        MISHIT: { aerial: 0.30, powerFactor: 0.20 },
        GOOD_HIT: { aerial: 0.40, powerFactor: 0.30 },
        SMASHED: { aerial: 0.60, powerFactor: 0.30 }
      },
      fielding: {
        MISHIT: { clean: 0.70, misfield: 0.25, boundary: 0.05 },
        GOOD_HIT: { clean: 0.50, misfield: 0.35, boundary: 0.15 },
        SMASHED: { clean: 0.30, misfield: 0.40, boundary: 0.30 }
      },
      dismissals: {
        MISSED: {
          BOWLED: 0.50,
          LBW: 0.35,
          HIT_WICKET: 0.15
        },
        EDGED: {
          CAUGHT: 0.60,
          RUNS: 0.40
        }
      }
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration to merge
   */
  updateConfig(newConfig) {
    this.config = this.mergeDeep(this.config, newConfig);
  }

  /**
   * Deep merge configurations
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  mergeDeep(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

export default ProbabilityEngine;