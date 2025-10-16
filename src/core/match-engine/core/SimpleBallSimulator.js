/**
 * @file SimpleBallSimulator.js
 * @description Simplified ball simulator using direct orchestrator pattern
 * @module core/match-engine/SimpleBallSimulator
 */

import DecisionCalculator from '../simulation/DecisionCalculator.js';
import ContactCalculator from '../simulation/ContactCalculator.js';
import TrajectoryCalculator from '../simulation/TrajectoryCalculator.js';
import FieldingCalculator2D from '../simulation/FieldingCalculator2D.js';
import BallTrajectoryPhysics from '../physics/BallTrajectoryPhysics.js';
import FieldPositioningSystem from '../physics/FieldPositioningSystem.js';
import FielderMovementCalculator from '../physics/FielderMovementCalculator.js';
import ProbabilityEngine from '../systems/ProbabilityEngine.js';
import tacticsModifierSystem from '../../tactics/TacticsModifierSystem.js';

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

    console.log('✅ SimpleBallSimulator initialized with 4-step calculators, 2D fielding, and tactics system');
  }

  /**
   * Simulate a single ball using direct 4-step calculation
   * @param {Object} ballContext - Ball context
   * @returns {Promise<BallResult>} Ball result
   */
  async simulateBall(ballContext) {
    try {
      // Store original players for metadata
      const originalStriker = ballContext.striker;
      const originalBowler = ballContext.bowler;

      // Apply all tactical modifiers using TacticsModifierSystem
      const tacticsState = ballContext.tacticsState || {
        currentAcceleration: { striker: 'Rotate' },
        bowlingPlans: {},
        pressureIndex: { batting: 50, bowling: 50 }
      };

      const matchSituation = ballContext.matchSituation || {};

      const tacticsResult = tacticsModifierSystem.applyAllModifiers(
        ballContext,
        tacticsState,
        matchSituation
      );

      // Extract modified players and mentalities
      const modifiedStriker = tacticsResult.striker;
      const modifiedBowler = tacticsResult.bowler;
      const battingMentality = tacticsResult.battingMentality || 'neutral';
      const bowlingMentality = tacticsResult.bowlingMentality || 'neutral';

      // Step 1: Decision Calculation (with modified attributes)
      const decisionResult = this.decisionCalculator.calculateDecision({
        striker: modifiedStriker,
        bowler: modifiedBowler
      });

      // Step 2: Contact Calculation (with modified attributes)
      const contactResult = this.contactCalculator.calculateContact({
        striker: modifiedStriker,
        bowler: modifiedBowler,
        decisionResult
      });

      // Step 3: Trajectory Calculation with 2D components (with modified attributes and tactical mentalities)
      const trajectoryResult = this.trajectoryCalculator.calculateTrajectory({
        contactResult,
        striker: modifiedStriker,
        bowler: modifiedBowler,
        battingMentality,
        bowlingMentality,
        wicketKeeper: ballContext.wicketKeeper || ballContext.bowler,
        fieldingTeam: ballContext.fieldingTeam,
        ballPhysics: this.ballPhysics,
        fielderMovement: this.fielderMovement
      });

      // Step 4: 2D Fielding Calculation
      // Calculate fielding analysis for ALL shots (even wickets/boundaries) to track closest fielder data
      let fieldingResult = null;

      // Only calculate fielding for shots that actually travel (not missed/edged_behind)
      if (trajectoryResult.shotType !== 'missed' && trajectoryResult.shotType !== 'edged_behind') {
        fieldingResult = this.fieldingCalculator.calculateFielding({
          trajectoryResult,
          striker: modifiedStriker,
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
          tacticsApplied: tacticsResult.metadata,
          mentalities: {
            batting: battingMentality,
            bowling: bowlingMentality
          },
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
   * Build match context for playstyle modifier evaluation
   * @param {Object} ballContext - Ball context
   * @returns {Object} Match context
   */
  buildMatchContext(ballContext) {
    const matchSituation = ballContext.matchSituation || {};
    const striker = ballContext.striker || {};
    const bowler = ballContext.bowler || {};

    return {
      // Match phase
      phase: matchSituation.phase || this.determinePhase(matchSituation.over),
      over: matchSituation.over || 1,
      ball: matchSituation.ball || 1,

      // Team state
      wicketsInHand: matchSituation.wicketsInHand || 10,
      currentRunRate: matchSituation.currentRunRate || 0,
      requiredRunRate: matchSituation.requiredRunRate || 0,

      // Innings state
      ballsLeft: matchSituation.ballsLeft || 120,
      target: matchSituation.target || null,

      // Partnership state
      currentPartnership: matchSituation.currentPartnership || 0,
      currentPartnershipBalls: matchSituation.currentPartnershipBalls || 0,

      // Player state
      ballsFaced: matchSituation.ballsFaced || 0,
      oversBowled: matchSituation.oversBowled || 0,

      // Batsman attributes (for bowling playstyle conditions)
      batsmanTechnique: striker.attributes?.batting?.technique || 0,
      batsmanFootwork: striker.attributes?.batting?.footwork || 0,
      batsmanConcentration: striker.attributes?.mental?.concentration || 0,
      batsmanDefensiveShots: striker.attributes?.batting?.defensiveShots || 0,

      // Bowler attributes (for batting playstyle conditions)
      bowlerAccuracy: bowler.attributes?.bowling?.accuracy || 0,
      bowlerSwing: bowler.attributes?.bowling?.swing || 0,
      bowlerTurn: bowler.attributes?.bowling?.turn || 0
    };
  }

  /**
   * Determine match phase from over number
   * @param {number} over - Current over
   * @returns {string} Phase (powerplay, middle, death)
   */
  determinePhase(over) {
    if (over <= 6) return 'powerplay';
    if (over >= 17) return 'death';
    return 'middle';
  }

  /**
   * Set field formation for fielding team
   * @param {string} formationType - Formation type (attacking, neutral, defensive)
   * @param {Object[]} fielders - Array of 11 fielders
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
      version: '3.0.0',
      architecture: '4-step-direct-2D-with-tactics',
      steps: ['Tactics Modifiers', 'Decision', 'Contact', 'Trajectory', '2D-Fielding'],
      calculators: {
        tactics: 'TacticsModifierSystem',
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
        'Integrated T20 Tactics System',
        'Dynamic confidence & energy management',
        'Pressure-based performance scaling',
        'Acceleration tiers & bowling plans',
        'Matchup advantages/disadvantages',
        'Contextual modifiers (left-right, new ball)',
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