/**
 * @file SimpleBallSimulator.js
 * @description Simplified ball simulator using direct orchestrator pattern
 * @module core/match-engine/SimpleBallSimulator
 */

import DecisionCalculator from './DecisionCalculator.js';
import ContactCalculator from './ContactCalculator.js';
import TrajectoryCalculator from './TrajectoryCalculator.js';
import FieldingCalculator2D from './FieldingCalculator2D.js';
import BallTrajectoryPhysics from './BallTrajectoryPhysics.js';
import FieldPositioningSystem from './FieldPositioningSystem.js';
import FielderMovementCalculator from './FielderMovementCalculator.js';
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

class SimpleBallSimulator {
  constructor() {
    // Initialize all calculators internally
    this.probabilityEngine = new ProbabilityEngine();
    this.decisionCalculator = new DecisionCalculator();
    this.contactCalculator = new ContactCalculator(this.probabilityEngine);
    this.trajectoryCalculator = new TrajectoryCalculator();

    // Initialize 2D simulation components
    this.ballPhysics = new BallTrajectoryPhysics();
    this.fieldPositioning = new FieldPositioningSystem();
    this.fielderMovement = new FielderMovementCalculator();
    this.fieldingCalculator = new FieldingCalculator2D();

    console.log('✅ SimpleBallSimulator initialized with 4-step calculators and 2D fielding simulation');
  }

  /**
   * Simulate a single ball using direct 4-step calculation
   * @param {Object} ballContext - Ball context
   * @returns {Promise<BallResult>} Ball result
   */
  async simulateBall(ballContext) {
    try {
      // Step 1: Decision Calculation
      const decisionResult = this.decisionCalculator.calculateDecision({
        striker: ballContext.striker,
        bowler: ballContext.bowler
      });

      // Step 2: Contact Calculation
      const contactResult = this.contactCalculator.calculateContact({
        striker: ballContext.striker,
        bowler: ballContext.bowler,
        decisionResult
      });

      // Step 3: Trajectory Calculation with 2D components
      const trajectoryResult = this.trajectoryCalculator.calculateTrajectory({
        contactResult,
        striker: ballContext.striker,
        bowler: ballContext.bowler,
        battingMentality: ballContext.battingMentality || 'neutral',
        bowlingMentality: ballContext.bowlingMentality || 'neutral',
        wicketKeeper: ballContext.wicketKeeper || ballContext.bowler,
        fieldingTeam: ballContext.fieldingTeam,
        ballPhysics: this.ballPhysics,
        fielderMovement: this.fielderMovement
      });

      // Step 4: 2D Fielding Calculation
      let fieldingResult = null;
      if (!trajectoryResult.isWicket &&
          trajectoryResult.shotType !== 'missed' &&
          trajectoryResult.shotType !== 'caught_behind') {

        fieldingResult = this.fieldingCalculator.calculateFielding({
          trajectoryResult,
          striker: ballContext.striker,
          nonStriker: ballContext.nonStriker,
          fieldingTeam: ballContext.fieldingTeam,
          wicketKeeper: ballContext.wicketKeeper || ballContext.bowler,
          battingMentality: ballContext.battingMentality || 'neutral'
        });
      }

      // Determine final outcome based on trajectory and fielding
      const finalOutcome = this.determineFinalOutcome(trajectoryResult, fieldingResult);

      // Generate commentary
      const commentary = this.generateCommentary(finalOutcome, ballContext);

      return {
        ...finalOutcome,
        commentary,
        metadata: {
          decisionResult,
          contactResult,
          trajectoryResult,
          fieldingResult,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      console.error('Ball simulation failed:', error);

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
   * Determine final outcome based on trajectory and fielding results
   * @param {Object} trajectoryResult - Trajectory result
   * @param {Object} fieldingResult - Fielding result (if applicable)
   * @returns {Object} Final outcome
   */
  determineFinalOutcome(trajectoryResult, fieldingResult) {
    // Handle wickets from trajectory (missed balls, caught behind)
    if (trajectoryResult.isWicket) {
      return {
        outcome: trajectoryResult.wicketType?.toUpperCase() || 'WICKET',
        runs: 0,
        isWicket: true,
        isLegal: true,
        dismissalType: trajectoryResult.wicketType,
        dismissedPlayer: null, // Will be filled by match engine
        conditionUpdates: {}
      };
    }

    // Handle missed balls (dot ball)
    if (trajectoryResult.shotType === 'missed') {
      return {
        outcome: 'DOT',
        runs: 0,
        isWicket: false,
        isLegal: true,
        dismissalType: null,
        dismissedPlayer: null,
        conditionUpdates: {}
      };
    }

    // Handle fielding outcomes
    if (fieldingResult) {
      return {
        outcome: fieldingResult.outcome,
        runs: fieldingResult.runs,
        isWicket: fieldingResult.isWicket,
        isLegal: true,
        dismissalType: fieldingResult.dismissalType,
        dismissedPlayer: fieldingResult.isWicket ? null : null, // Will be filled by match engine
        conditionUpdates: {}
      };
    }

    // Fallback for edge cases
    return {
      outcome: 'DOT',
      runs: 0,
      isWicket: false,
      isLegal: true,
      dismissalType: null,
      dismissedPlayer: null,
      conditionUpdates: {}
    };
  }

  /**
   * Generate ball commentary
   * @param {Object} outcome - Ball outcome
   * @param {Object} context - Ball context
   * @returns {string} Commentary
   */
  generateCommentary(outcome, context) {
    const striker = context.striker?.name || 'Batsman';
    const bowler = context.bowler?.name || 'Bowler';

    switch (outcome.outcome) {
      case 'DOT':
        return `${striker} defends solidly`;
      case 'RUNS':
        return `${striker} picks up ${outcome.runs} run${outcome.runs !== 1 ? 's' : ''}`;
      case 'FOUR':
        return `${striker} finds the boundary! Four runs`;
      case 'SIX':
        return `${striker} launches it over the boundary! Six runs`;
      case 'CAUGHT':
        return `${striker} is caught! ${bowler} strikes`;
      case 'BOWLED':
        return `${striker} is bowled! ${bowler} crashes through the defenses`;
      case 'LBW':
        return `${striker} is trapped LBW! ${bowler} gets the wicket`;
      default:
        return `${striker} plays the ball`;
    }
  }

  /**
   * Set field formation for fielding team
   * @param {string} formationType - Formation type (attacking, neutral, defensive)
   * @param {Object[]} fielders - Array of 9 fielders
   * @returns {Object[]} Positioned fielders
   */
  setFieldFormation(formationType, fielders) {
    return this.fieldPositioning.setFormation(formationType, fielders);
  }

  /**
   * Get simulator statistics and configuration
   * @returns {Object} Simulator info
   */
  getInfo() {
    return {
      name: 'SimpleBallSimulator',
      version: '2.0.0',
      architecture: '4-step-direct-2D',
      steps: ['Decision', 'Contact', 'Trajectory', '2D-Fielding'],
      calculators: {
        decision: 'DecisionCalculator',
        contact: 'ContactCalculator',
        trajectory: 'TrajectoryCalculator',
        fielding: 'FieldingCalculator2D'
      },
      components2D: {
        ballPhysics: 'BallTrajectoryPhysics',
        fieldPositioning: 'FieldPositioningSystem',
        fielderMovement: 'FielderMovementCalculator'
      },
      probabilityEngine: 'ProbabilityEngine',
      features: [
        'Attribute-driven shot direction selection',
        '2D ball trajectory simulation',
        'Physics-based fielding interception',
        'Running decision calculation',
        'Realistic field positioning'
      ]
    };
  }
}

export default SimpleBallSimulator;