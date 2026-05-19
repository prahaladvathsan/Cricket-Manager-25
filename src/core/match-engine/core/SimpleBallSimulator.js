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
import { generateCommentary } from '../commentary/index.js';

// DEBUG: Set to true to enable ball simulation debugging
const DEBUG_BALL_SIM = false;

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
  constructor(options = {}) {
    const { silent = false } = options;
    this.silent = silent;

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

    if (!silent) {
      console.log('✅ SimpleBallSimulator initialized with 4-step calculators, 2D fielding, and tactics system');
    }
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

      // Extract modified players, mentalities, and breakdown
      const modifiedStriker = tacticsResult.striker;
      const modifiedBowler = tacticsResult.bowler;
      const battingMentality = tacticsResult.battingMentality || 'neutral';
      const bowlingMentality = tacticsResult.bowlingMentality || 'neutral';
      const modifierBreakdown = tacticsResult.breakdown || null; // Store for UI

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
      if (DEBUG_BALL_SIM && (!ballContext.fieldingTeam || !this.ballPhysics || !this.fielderMovement)) {
        console.warn('[SimpleBallSimulator] Missing components before trajectory calculation:', {
          hasFieldingTeam: !!ballContext.fieldingTeam,
          fieldingTeamSquadLength: ballContext.fieldingTeam?.squad?.length,
          hasBallPhysics: !!this.ballPhysics,
          hasFielderMovement: !!this.fielderMovement
        });
      }
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

      // Analytics tags — always attached (used by matchAnalytics.js)
      const phase = matchSituation.phase || this.determinePhase(matchSituation.over || 1);
      const hitZone = trajectoryResult?.direction != null
        ? this.computeHitZone(trajectoryResult.direction)
        : 'midOn';
      const strikerPlaystyle = originalStriker?.primaryPlaystyle?.batting
        || originalStriker?.primaryPlaystyle
        || null;
      const bowlerPlaystyle = originalBowler?.primaryPlaystyle?.bowling
        || originalBowler?.primaryPlaystyle
        || null;
      const strikerTier = tacticsState?.currentAcceleration?.[originalStriker?.id]
        || tacticsState?.currentAcceleration?.striker
        || null;
      const bowlerPlan = tacticsState?.bowlingPlans?.[originalBowler?.id] || null;

      // In silent mode (quick-sim), omit heavyweight metadata and modifier breakdown
      // These are only needed for the live match viewer UI
      const result = {
        ...finalOutcome,
        commentary: '',
        conditionUpdates: finalOutcome.conditionUpdates || {},
        phase,
        hitZone,
        strikerPlaystyle,
        bowlerPlaystyle,
        strikerTier,
        bowlerPlan
      };

      if (!this.silent) {
        result.modifierBreakdown = modifierBreakdown;
        result.metadata = {
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
        };

        // Generate commentary only in live mode. matchStore regenerates it
        // for 2nd-innings balls once chaseContext is available.
        result.commentary = generateCommentary(result, {
          strikerName: ballContext.striker?.name,
          bowlerName: ballContext.bowler?.name,
          nonStrikerName: ballContext.nonStriker?.name
        });
      }

      return result;

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
        fieldingAction: fieldingResult.fieldingAction, // Include fielding action data
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
   * Build match context for playstyle modifier evaluation
   * @param {Object} ballContext - Ball context
   * @returns {Object} Match context
   */
  buildMatchContext(ballContext) {
    const matchSituation = ballContext.matchSituation;
    const striker = ballContext.striker;
    const bowler = ballContext.bowler;

    if (!matchSituation) throw new Error('matchSituation is required');
    if (!striker) throw new Error('striker is required');
    if (!bowler) throw new Error('bowler is required');

    return {
      phase: matchSituation.phase || this.determinePhase(matchSituation.over),
      over: matchSituation.over,
      ball: matchSituation.ball,
      wicketsInHand: matchSituation.wicketsInHand,
      currentRunRate: matchSituation.currentRunRate,
      requiredRunRate: matchSituation.requiredRunRate,
      ballsLeft: matchSituation.ballsLeft,
      target: matchSituation.target || null,
      currentPartnership: matchSituation.currentPartnership,
      currentPartnershipBalls: matchSituation.currentPartnershipBalls,
      ballsFaced: matchSituation.ballsFaced,
      oversBowled: matchSituation.oversBowled,
      batsmanTechnique: striker.attributes?.batting?.technique,
      batsmanFootwork: striker.attributes?.batting?.footwork,
      batsmanConcentration: striker.attributes?.mental?.concentration,
      batsmanDefensiveShots: striker.attributes?.batting?.defensiveShots,
      bowlerAccuracy: bowler.attributes?.bowling?.accuracy,
      bowlerSwing: bowler.attributes?.bowling?.swing,
      bowlerTurn: bowler.attributes?.bowling?.turn
    };
  }

  /**
   * Determine match phase from over number
   * @param {number} over - Current over (1-based)
   * @returns {string} Phase (powerplay | earlyMiddle | lateMiddle | death)
   */
  determinePhase(over) {
    if (over <= 6) return 'powerplay';
    if (over <= 12) return 'earlyMiddle';
    if (over <= 16) return 'lateMiddle';
    return 'death';
  }

  /**
   * Compute hit zone from shot direction angle.
   * 6 equal 60° sectors. Direction: 0°=leg(+x), 90°=fine leg(+y), 180°=off, 270°=bowler(up).
   * Zone centres: fineLeg=90°, point=150°, cover=210°, midOff=270°, midOn=330°, midWicket=30°
   * @param {number} direction - Shot direction in degrees
   * @returns {string} fineLeg | point | cover | midOff | midOn | midWicket
   */
  computeHitZone(direction) {
    // Direction: 0°=leg(+x), 90°=toward WK(+y), 180°=off(-x), 270°=toward bowler(-y)
    // Zones match WagonZoneMap equal 60° sectors (SVG_deg = 90 - ball_angle):
    //   fineLeg   SVG [0°,60°]   → ball [30°,90°)
    //   point     SVG [300°,360°]→ ball [90°,150°)
    //   cover     SVG [240°,300°]→ ball [150°,210°)
    //   midOff    SVG [180°,240°]→ ball [210°,270°)
    //   midOn     SVG [120°,180°]→ ball [270°,330°)
    //   midWicket SVG [60°,120°] → ball [330°,30°) wrapping
    const d = ((direction % 360) + 360) % 360;
    if (d >= 30  && d < 90)  return 'fineLeg';
    if (d >= 90  && d < 150) return 'point';
    if (d >= 150 && d < 210) return 'cover';
    if (d >= 210 && d < 270) return 'midOff';
    if (d >= 270 && d < 330) return 'midOn';
    return 'midWicket'; // 330°–360° and 0°–30°
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