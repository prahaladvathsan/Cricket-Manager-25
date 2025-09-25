/**
 * @file ExtensibleBallSimulator.js
 * @description New extensible ball simulator using plugin architecture
 * @module core/match-engine/ExtensibleBallSimulator
 */

import EventSystem from './EventSystem.js';
import PluginManager from './PluginManager.js';
import ConfigurationManager from './ConfigurationManager.js';
import ContactCalculator from './ContactCalculator.js';
import TrajectoryCalculator from './TrajectoryCalculator.js';
import DecisionCalculator from './DecisionCalculator.js';
import FieldingCalculator from './FieldingCalculator.js';
import ProbabilityEngine from './ProbabilityEngine.js';

/**
 * @typedef {Object} BallResult
 * @property {string} outcome - Ball outcome
 * @property {number} runs - Runs scored
 * @property {boolean} isWicket - Whether wicket fell
 * @property {boolean} isLegal - Whether ball was legal
 * @property {string} dismissalType - Type of dismissal
 * @property {string} dismissedPlayer - Player dismissed
 * @property {string} commentary - Ball commentary
 * @property {Object} conditionUpdates - Player condition changes
 * @property {Object} metadata - Additional simulation data
 */

class ExtensibleBallSimulator {
  constructor() {
    // Core systems
    this.eventSystem = new EventSystem();
    this.pluginManager = new PluginManager(this.eventSystem);
    this.configManager = new ConfigurationManager();

    // Calculation engines
    this.probabilityEngine = new ProbabilityEngine(this.configManager);
    this.decisionCalculator = new DecisionCalculator();
    this.contactCalculator = new ContactCalculator(this.probabilityEngine);
    this.trajectoryCalculator = new TrajectoryCalculator();
    this.fieldingCalculator = new FieldingCalculator(this.probabilityEngine);

    // State
    this.isInitialized = false;

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the simulator
   */
  async initialize() {
    try {
      // Load configuration
      await this.configManager.load();

      // Register core plugins
      await this.registerCorePlugins();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('ExtensibleBallSimulator initialized successfully');

    } catch (error) {
      console.error('Failed to initialize ExtensibleBallSimulator:', error);
    }
  }

  /**
   * Register core simulation plugins
   */
  async registerCorePlugins() {
    // Core ball simulation plugin
    const corePlugin = {
      id: 'core-ball-simulation',
      name: 'Core Ball Simulation',
      version: '1.0.0',
      description: 'Core ball-by-ball simulation logic',

      hooks: {
        'ball:simulate': {
          handler: this.simulateBallCore.bind(this),
          priority: 100
        },
        'ball:decision': {
          handler: this.calculateDecision.bind(this),
          priority: 100
        },
        'ball:contact': {
          handler: this.calculateContact.bind(this),
          priority: 100
        },
        'ball:trajectory': {
          handler: this.calculateTrajectory.bind(this),
          priority: 100
        },
        'ball:fielding': {
          handler: this.simulateFielding.bind(this),
          priority: 100
        }
      }
    };

    await this.pluginManager.register(corePlugin);

    // Condition management plugin
    const conditionPlugin = {
      id: 'player-conditions',
      name: 'Player Condition Manager',
      version: '1.0.0',
      description: 'Manages player energy, confidence, and fatigue',

      hooks: {
        'ball:after': {
          handler: this.updatePlayerConditions.bind(this),
          priority: 90
        }
      }
    };

    await this.pluginManager.register(conditionPlugin);

    // Commentary plugin
    const commentaryPlugin = {
      id: 'commentary-generator',
      name: 'Commentary Generator',
      version: '1.0.0',
      description: 'Generates ball-by-ball commentary',

      hooks: {
        'ball:commentary': {
          handler: this.generateCommentary.bind(this),
          priority: 50
        }
      }
    };

    await this.pluginManager.register(commentaryPlugin);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for configuration changes
    this.configManager.watch('probabilities', (config) => {
      this.eventSystem.emit('config:probabilities:updated', { config });
    });

    this.configManager.watch('modifiers', (config) => {
      this.eventSystem.emit('config:modifiers:updated', { config });
    });

    // Listen for plugin events
    this.eventSystem.on('plugin:activated', (event) => {
      console.log(`Plugin activated: ${event.data.pluginId}`);
    });
  }

  /**
   * Simulate a single ball
   * @param {Object} ballContext - Ball context
   * @returns {Promise<BallResult>} Ball result
   */
  async simulateBall(ballContext) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Direct 4-step calculation (bypass plugin system for reliability)
      return await this.simulateBallCore(ballContext);

    } catch (error) {
      console.error('Ball simulation failed:', error);

      // Return fallback result
      return {
        outcome: 'ERROR',
        runs: 0,
        isWicket: false,
        isLegal: true,
        dismissalType: null,
        dismissedPlayer: null,
        commentary: 'Simulation error occurred',
        conditionUpdates: {},
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Core ball simulation logic (New 4-step flow)
   * @param {Object} context - Ball context
   * @returns {Promise<BallResult>} Ball result
   */
  async simulateBallCore(context) {
    // Step 1: Calculate pre-contact decisions
    const decisionResult = await this.pluginManager.executeHooks('ball:decision', context, {
      calculator: this.decisionCalculator
    });

    // Step 2: Calculate contact quality using decision + execution
    const contactResult = await this.pluginManager.executeHooks('ball:contact', {
      ...context,
      decisionResult
    }, {
      calculator: this.contactCalculator
    });

    // Step 3: Determine trajectory based on contact and mentality
    const trajectoryResult = await this.pluginManager.executeHooks('ball:trajectory', {
      ...context,
      contactResult,
      battingMentality: context.battingMentality || 'neutral',
      bowlingMentality: context.bowlingMentality || 'neutral'
    }, {
      calculator: this.trajectoryCalculator
    });

    // Step 4: Resolve fielding (only if not already a wicket)
    let fieldingResult = null;
    if (!trajectoryResult.isWicket && trajectoryResult.shotType !== 'missed' && trajectoryResult.shotType !== 'caught_behind') {
      fieldingResult = await this.pluginManager.executeHooks('ball:fielding', {
        ...context,
        trajectoryResult,
        fieldingTeam: context.fieldingTeam || context.bowlingTeam
      }, {
        calculator: this.fieldingCalculator
      });
    }

    // Determine final outcome based on trajectory and fielding
    const finalOutcome = this.determineFinalOutcome(trajectoryResult, fieldingResult);

    // Generate commentary
    const commentary = await this.pluginManager.executeHooks('ball:commentary', {
      ...context,
      result: finalOutcome
    }, {
      simulator: this
    });

    return {
      ...finalOutcome,
      commentary: commentary || this.getDefaultCommentary(finalOutcome),
      metadata: {
        decisionResult,
        contactResult,
        trajectoryResult,
        fieldingResult,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Calculate pre-contact decisions
   * @param {Object} context - Ball context
   * @returns {Promise<Object>} Decision result
   */
  async calculateDecision(context) {
    const { striker, bowler } = context;

    // Use decision calculator
    const decisionResult = this.decisionCalculator.calculateDecision({
      striker,
      bowler
    });

    console.log('DecisionCalculator result:', decisionResult);
    return decisionResult;
  }

  /**
   * Calculate contact quality using decision and execution
   * @param {Object} context - Ball context
   * @returns {Promise<Object>} Contact result
   */
  async calculateContact(context) {
    const { striker, bowler, decisionResult } = context;

    // Use contact calculator with decision result
    const contactResult = this.contactCalculator.calculateContact({
      striker,
      bowler,
      decisionResult
    });

    return contactResult;
  }

  /**
   * Calculate trajectory using new mentality-based system
   * @param {Object} context - Trajectory context
   * @returns {Promise<Object>} Trajectory result
   */
  async calculateTrajectory(context) {
    const { contactResult, striker, bowler, battingMentality, bowlingMentality } = context;

    // Use trajectory calculator with mentality
    const trajectoryResult = this.trajectoryCalculator.calculateTrajectory({
      contactResult,
      striker,
      bowler,
      battingMentality,
      bowlingMentality
    });

    return trajectoryResult;
  }

  /**
   * Simulate fielding action using new fielding calculator
   * @param {Object} context - Fielding context
   * @returns {Promise<Object>} Fielding result
   */
  async simulateFielding(context) {
    const { trajectoryResult, fieldingTeam, striker } = context;

    // Use fielding calculator
    const fieldingResult = this.fieldingCalculator.calculateFielding({
      trajectoryResult,
      striker,
      fieldingTeam,
      wicketKeeper: this.getWicketKeeper(fieldingTeam)
    });

    return fieldingResult;
  }

  /**
   * Determine final ball outcome from trajectory and fielding
   * @param {Object} trajectoryResult - Trajectory result
   * @param {Object} fieldingResult - Fielding result
   * @returns {Object} Final outcome
   */
  determineFinalOutcome(trajectoryResult, fieldingResult) {
    // If trajectory already determined wicket, use that
    if (trajectoryResult.isWicket) {
      return {
        outcome: trajectoryResult.wicketType?.toUpperCase() || 'WICKET',
        runs: 0,
        isWicket: true,
        isLegal: true,
        dismissalType: trajectoryResult.wicketType,
        dismissedPlayer: null // Will be set by calling code
      };
    }

    // If no fielding (missed ball), return dot
    if (!fieldingResult) {
      return {
        outcome: 'DOT',
        runs: 0,
        isWicket: false,
        isLegal: true,
        dismissalType: null,
        dismissedPlayer: null
      };
    }

    // Use fielding result
    return {
      outcome: fieldingResult.outcome,
      runs: fieldingResult.runs,
      isWicket: fieldingResult.isWicket,
      isLegal: true,
      dismissalType: fieldingResult.dismissalType,
      dismissedPlayer: fieldingResult.isWicket ? null : null // Will be set by calling code
    };
  }

  /**
   * Get wicket keeper from fielding team
   * @param {Object} fieldingTeam - Fielding team
   * @returns {Object} Wicket keeper
   */
  getWicketKeeper(fieldingTeam) {
    // Simple implementation - find player with keeper role or best catching
    const squad = fieldingTeam.squad || [];
    let keeper = squad.find(player => player.role === 'wicket-keeper');

    if (!keeper) {
      // Fallback to player with best catching attribute
      keeper = squad.reduce((best, current) => {
        const currentCatching = current.attributes?.fielding?.catching || 0;
        const bestCatching = best.attributes?.fielding?.catching || 0;
        return currentCatching > bestCatching ? current : best;
      }, squad[0] || { attributes: { fielding: { catching: 10 } } });
    }

    return keeper;
  }





  /**
   * Update player conditions after ball
   * @param {Object} result - Ball result
   * @param {Object} context - Ball context
   * @returns {Promise<Object>} Condition updates
   */
  async updatePlayerConditions(result, context) {
    const energyCosts = this.configManager.get('gameplay', 'energy.costs');
    const confidenceChanges = this.configManager.get('gameplay', 'confidence.changes');

    const updates = {};

    // Striker updates
    const strikerId = context.striker.id;
    updates[strikerId] = {
      energy: -(energyCosts?.batting?.ballFaced || 0.8),
      confidence: this.getConfidenceChange(result, 'batting', confidenceChanges),
      fatigue: (energyCosts?.batting?.ballFaced || 0.8) / 10
    };

    // Bowler updates
    const bowlerId = context.bowler.id;
    updates[bowlerId] = {
      energy: -(energyCosts?.bowling?.ballBowled || 1.2),
      confidence: this.getConfidenceChange(result, 'bowling', confidenceChanges),
      fatigue: (energyCosts?.bowling?.ballBowled || 1.2) / 10
    };

    result.conditionUpdates = updates;
    return result;
  }

  /**
   * Get confidence change for outcome
   * @param {Object} result - Ball result
   * @param {string} type - Player type (batting/bowling)
   * @param {Object} config - Confidence config
   * @returns {number} Confidence change
   */
  getConfidenceChange(result, type, config) {
    if (!config || !config[type]) return 0;

    const changes = config[type];

    switch (result.outcome) {
      case 'FOUR':
        return changes.boundary || 0;
      case 'SIX':
        return changes.six || 0;
      case 'DOT':
        return type === 'bowling' ? (changes.dot || 0) : -(changes.dot || 0);
      case 'CAUGHT':
      case 'BOWLED':
      case 'LBW':
        return type === 'bowling' ? (changes.wicket || 0) : -(changes.wicket || 0);
      default:
        return 0;
    }
  }

  /**
   * Generate commentary for ball
   * @param {Object} context - Commentary context
   * @returns {Promise<string>} Commentary text
   */
  async generateCommentary(context) {
    const { result, striker, bowler } = context;

    const templates = {
      DOT: [`${striker.name} defends off ${bowler.name}`, `Dot ball from ${bowler.name}`],
      RUNS: [`${striker.name} picks up ${result.runs} off ${bowler.name}`],
      FOUR: [`FOUR! Excellent shot by ${striker.name}!`, `Boundary for ${striker.name}!`],
      SIX: [`SIX! ${striker.name} sends it into the stands!`, `Maximum! What a hit by ${striker.name}!`],
      CAUGHT: [`OUT! ${striker.name} is caught off ${bowler.name}!`],
      BOWLED: [`BOWLED! ${bowler.name} sends the stumps flying!`],
      LBW: [`LBW! ${striker.name} is trapped in front!`]
    };

    const options = templates[result.outcome] || [`${striker.name} plays off ${bowler.name}`];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Get default commentary
   * @param {Object} result - Ball result
   * @returns {string} Default commentary
   */
  getDefaultCommentary(result) {
    return `Ball completed: ${result.outcome}`;
  }

  /**
   * Register external plugin
   * @param {Object} plugin - Plugin to register
   * @returns {Promise<boolean>} Success status
   */
  async registerPlugin(plugin) {
    return this.pluginManager.register(plugin);
  }

  /**
   * Get simulation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      plugins: this.pluginManager.getStats(),
      events: this.eventSystem.getStats(),
      config: this.configManager.getMetadata()
    };
  }
}

export default ExtensibleBallSimulator;