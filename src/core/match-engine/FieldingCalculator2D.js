/**
 * @file FieldingCalculator2D.js
 * @description 2D fielding simulation system replacing probability-based tables
 * @module core/match-engine/FieldingCalculator2D
 */

import BallTrajectoryPhysics from './BallTrajectoryPhysics.js';
import FieldPositioningSystem from './FieldPositioningSystem.js';
import FielderMovementCalculator from './FielderMovementCalculator.js';
import RunningDecisionCalculator from './RunningDecisionCalculator.js';

/**
 * @typedef {Object} FieldingResult2D
 * @property {string} outcome - Final outcome ('RUNS', 'FOUR', 'SIX', 'CAUGHT', 'RUN_OUT', 'DOT')
 * @property {number} runs - Runs scored
 * @property {boolean} isWicket - Whether wicket taken
 * @property {string} dismissalType - Type of dismissal if wicket
 * @property {Object} fieldingAction - Details of fielding action
 * @property {Object} trajectory - Ball trajectory information
 * @property {Object} runningDecision - Running decision details
 */

/**
 * @typedef {Object} FieldingContext2D
 * @property {Object} trajectoryResult - Result from trajectory calculator
 * @property {Object} striker - Striking batsman
 * @property {Object} nonStriker - Non-striking batsman
 * @property {Object} fieldingTeam - Fielding team with positioned fielders
 * @property {Object} wicketKeeper - Wicket keeper
 * @property {string} battingMentality - Current batting mentality
 */

class FieldingCalculator2D {
  constructor() {
    this.ballPhysics = new BallTrajectoryPhysics();
    this.fieldPositioning = new FieldPositioningSystem();
    this.fielderMovement = new FielderMovementCalculator();
    this.runningDecision = new RunningDecisionCalculator();

    console.log('✅ FieldingCalculator2D initialized with 2D simulation');
  }

  /**
   * Calculate fielding outcome using simplified algebraic approach
   * @param {FieldingContext2D} context - Fielding context
   * @returns {FieldingResult2D} Complete fielding result
   */
  calculateFielding(context) {
    const { trajectoryResult, striker, nonStriker, fieldingTeam, battingMentality } = context;

    // For non-middled balls, use existing trajectory logic
    if (trajectoryResult.shotType === 'missed' || trajectoryResult.shotType === 'caught_behind') {
      return this.handleNonFieldedShot(trajectoryResult);
    }

    // Get shot parameters directly
    const shotDirection = trajectoryResult.direction;
    const shotSpeed = trajectoryResult.shotSpeed;
    const shotType = trajectoryResult.shotType;

    // Get boundary distance from cache
    const boundaryDistance = this.ballPhysics.getBoundaryDistance(shotDirection);

    // Calculate bounce point for aerial shots
    let bouncePoint = null;
    if (shotType === 'aerial') {
      const bounceDistance = Math.min(boundaryDistance, shotSpeed * shotSpeed / 10);
      const aerialTime = shotSpeed / (10 * Math.sqrt(2));
      bouncePoint = {
        r: bounceDistance,
        theta: shotDirection,
        time: aerialTime
      };

      // Check for six
      if (bounceDistance >= boundaryDistance) {
        return this.handleSix(shotDirection, boundaryDistance);
      }
    }

    // Analyze fielder interception using polar coordinates
    const fielderPositions = this.convertFieldersToPolar(fieldingTeam.fieldingPositions || []);
    const interceptionAnalysis = this.fielderMovement.analyzeInterception(
      { direction: shotDirection, boundaryDistance, bouncePoint, shotSpeed },
      fielderPositions,
      shotType
    );

    // Handle catches for aerial shots
    if (interceptionAnalysis.isCatch && shotType === 'aerial') {
      return this.handleCatchAttempt(interceptionAnalysis, shotDirection, boundaryDistance);
    }

    // Calculate total fielding time
    let fieldingTime;
    if (interceptionAnalysis.closestFielder) {
      const interceptionDistance = interceptionAnalysis.closestFielder.distance;
      const throwPower = interceptionAnalysis.closestFielder.fielder.attributes?.fielding?.throw_speed || 25;
      fieldingTime = this.fielderMovement.calculateTotalFieldingTime(interceptionDistance, shotSpeed, throwPower);
    } else {
      fieldingTime = Infinity; // Ball reaches boundary
    }

    // Calculate running decision
    const runningResult = this.runningDecision.calculateRunningDecision(
      striker,
      nonStriker || striker,
      fieldingTime,
      battingMentality
    );

    // Determine final outcome
    return this.determineFinalOutcome(
      runningResult,
      interceptionAnalysis,
      shotDirection,
      boundaryDistance,
      trajectoryResult
    );
  }

  /**
   * Convert fielder positions to polar coordinates from striker
   * @param {Object[]} fielderPositions - Fielder positions in x,y coordinates
   * @returns {Object[]} Fielder positions in polar coordinates
   */
  convertFieldersToPolar(fielderPositions) {
    const strikerOffset = 11; // From physics config
    const polarFielders = [];

    for (const fielder of fielderPositions) {
      // Calculate polar coordinates from striker position (0, -11)
      const dx = fielder.x - 0;
      const dy = fielder.y - (-strikerOffset);
      const r = Math.sqrt(dx * dx + dy * dy);
      let theta = Math.atan2(dy, dx) * 180 / Math.PI;
      if (theta < 0) theta += 360;

      polarFielders.push({
        fielder: fielder.fielder,
        r: r,
        theta: theta,
        x: fielder.x, // Keep for backward compatibility
        y: fielder.y
      });
    }

    return polarFielders;
  }

  /**
   * Handle six outcome
   * @param {number} shotDirection - Shot direction
   * @param {number} boundaryDistance - Distance to boundary
   * @returns {FieldingResult2D} Six result
   */
  handleSix(shotDirection, boundaryDistance) {
    return {
      outcome: 'SIX',
      runs: 6,
      isWicket: false,
      dismissalType: null,
      fieldingAction: {
        type: 'boundary',
        fielder: null,
        success: false
      },
      trajectory: { direction: shotDirection, boundaryDistance, isBoundary: true },
      runningDecision: null
    };
  }

  /**
   * Handle non-fielded shots (missed, caught behind)
   * @param {Object} trajectoryResult - Trajectory result
   * @returns {FieldingResult2D} Fielding result
   */
  handleNonFieldedShot(trajectoryResult) {
    if (trajectoryResult.isWicket) {
      return {
        outcome: trajectoryResult.wicketType?.toUpperCase() || 'WICKET',
        runs: 0,
        isWicket: true,
        dismissalType: trajectoryResult.wicketType,
        fieldingAction: {
          type: 'wicket',
          fielder: null,
          success: true
        },
        trajectory: null,
        runningDecision: null
      };
    }

    // Dot ball
    return {
      outcome: 'DOT',
      runs: 0,
      isWicket: false,
      dismissalType: null,
      fieldingAction: {
        type: 'no_action',
        fielder: null,
        success: true
      },
      trajectory: null,
      runningDecision: null
    };
  }

  /**
   * Handle boundary shots (four or six)
   * @param {Object} ballTrajectory - Ball trajectory
   * @param {string} shotType - Shot type
   * @returns {FieldingResult2D} Boundary result
   */
  handleBoundaryShot(ballTrajectory, shotType) {
    // Determine if it's a six or four
    let isSix = false;
    let runs = 4;

    if (shotType === 'aerial') {
      // For aerial shots that cross boundary, check if it's a six
      const bouncePoint = ballTrajectory.bouncePoint;
      if (!bouncePoint) {
        // Ball crossed boundary in air = six
        isSix = true;
        runs = 6;
      }
    }

    const runningResult = this.runningDecision.calculateBoundaryRuns(true, isSix);

    return {
      outcome: isSix ? 'SIX' : 'FOUR',
      runs,
      isWicket: false,
      dismissalType: null,
      fieldingAction: {
        type: 'boundary',
        fielder: null,
        success: false
      },
      trajectory: ballTrajectory,
      runningDecision: runningResult
    };
  }

  /**
   * Handle catch attempt for aerial shots - simplified
   * @param {Object} interceptionAnalysis - Interception analysis
   * @param {number} shotDirection - Shot direction
   * @param {number} boundaryDistance - Distance to boundary
   * @returns {FieldingResult2D} Catch result
   */
  handleCatchAttempt(interceptionAnalysis, shotDirection, boundaryDistance) {
    const closestFielder = interceptionAnalysis.closestFielder;

    if (!closestFielder) {
      // No fielder can reach - treat as four
      return this.handleFour(shotDirection, boundaryDistance);
    }

    // Calculate catch probability using simplified formula
    const catching = closestFielder.fielder.attributes?.fielding?.catching || 10;
    const catchProbability = catching / 20; // Simple probability
    const catchSuccess = Math.random() < catchProbability;

    if (catchSuccess) {
      return {
        outcome: 'CAUGHT',
        runs: 0,
        isWicket: true,
        dismissalType: 'caught',
        fieldingAction: {
          type: 'catch',
          fielder: closestFielder.fielder,
          success: true,
          probability: catchProbability
        },
        trajectory: { direction: shotDirection, boundaryDistance, isBoundary: false },
        runningDecision: null
      };
    } else {
      // Catch dropped - usually results in single
      return {
        outcome: 'RUNS',
        runs: 1,
        isWicket: false,
        dismissalType: null,
        fieldingAction: {
          type: 'dropped_catch',
          fielder: closestFielder.fielder,
          success: false
        },
        trajectory: { direction: shotDirection, boundaryDistance, isBoundary: false },
        runningDecision: { runsAttempted: 1, maxSafeRuns: 1, isRunOut: false }
      };
    }
  }

  /**
   * Handle four outcome
   * @param {number} shotDirection - Shot direction
   * @param {number} boundaryDistance - Distance to boundary
   * @returns {FieldingResult2D} Four result
   */
  handleFour(shotDirection, boundaryDistance) {
    return {
      outcome: 'FOUR',
      runs: 4,
      isWicket: false,
      dismissalType: null,
      fieldingAction: {
        type: 'boundary',
        fielder: null,
        success: false
      },
      trajectory: { direction: shotDirection, boundaryDistance, isBoundary: true },
      runningDecision: null
    };
  }

  /**
   * Handle dropped catch - ball continues from catch position
   * @param {Object} interceptionAnalysis - Interception analysis
   * @param {Object} ballTrajectory - Original ball trajectory
   * @returns {FieldingResult2D} Dropped catch result
   */
  handleDroppedCatch(interceptionAnalysis, ballTrajectory) {
    // Simplified: treat as if ball was fielded at catch position with delay
    const catchPosition = interceptionAnalysis.closestFielder.interceptionPoint;
    const fieldingTime = {
      totalTime: interceptionAnalysis.closestFielder.timeToReach + 1.0, // +1 second for drop and recovery
      fieldingTime: interceptionAnalysis.closestFielder.timeToReach + 1.0,
      throwTime: 0.5
    };

    return {
      outcome: 'RUNS',
      runs: 1, // Usually single run on dropped catch
      isWicket: false,
      dismissalType: null,
      fieldingAction: {
        type: 'dropped_catch',
        fielder: interceptionAnalysis.closestFielder.fielder,
        success: false
      },
      trajectory: ballTrajectory,
      runningDecision: {
        runsAttempted: 1,
        maxSafeRuns: 1,
        isRunOut: false,
        breakdown: { droppedCatch: true }
      }
    };
  }

  /**
   * Handle grounded fielding
   * @param {Object} interceptionAnalysis - Interception analysis
   * @param {Object} ballTrajectory - Ball trajectory
   * @returns {FieldingResult2D} Grounded fielding result
   */
  handleGroundedFielding(interceptionAnalysis, ballTrajectory) {
    if (!interceptionAnalysis.closestFielder) {
      // No fielder can intercept - ball rolls to boundary
      return this.handleBoundaryShot(ballTrajectory, 'grounded');
    }

    const fieldingTime = this.calculateFieldingTime(interceptionAnalysis, ballTrajectory);

    return {
      outcome: 'RUNS',
      runs: Math.min(3, Math.max(1, Math.floor(fieldingTime.totalTime / 3))), // Rough estimate
      isWicket: false,
      dismissalType: null,
      fieldingAction: {
        type: 'field',
        fielder: interceptionAnalysis.closestFielder.fielder,
        success: true
      },
      trajectory: ballTrajectory,
      runningDecision: null // Will be calculated separately
    };
  }

  /**
   * Calculate total fielding time including throw
   * @param {Object} interceptionAnalysis - Interception analysis
   * @param {Object} ballTrajectory - Ball trajectory
   * @returns {{totalTime: number, fieldingTime: number, throwTime: number}} Fielding time
   */
  calculateFieldingTime(interceptionAnalysis, ballTrajectory) {
    if (!interceptionAnalysis.closestFielder) {
      return { totalTime: Infinity, fieldingTime: Infinity, throwTime: 0 };
    }

    const interception = interceptionAnalysis.closestFielder;
    const throwDistance = Math.sqrt(
      interception.interceptionPoint.x ** 2 + interception.interceptionPoint.y ** 2
    );

    return this.fielderMovement.calculateFieldingTime(interception, throwDistance);
  }

  /**
   * Determine final outcome based on running decision - simplified
   * @param {Object} runningResult - Running decision result
   * @param {Object} interceptionAnalysis - Interception analysis
   * @param {number} shotDirection - Shot direction
   * @param {number} boundaryDistance - Distance to boundary
   * @param {Object} trajectoryResult - Original trajectory result
   * @returns {FieldingResult2D} Final fielding result
   */
  determineFinalOutcome(runningResult, interceptionAnalysis, shotDirection, boundaryDistance, trajectoryResult) {
    // Check if ball reached boundary (no interception)
    if (!interceptionAnalysis.closestFielder || !interceptionAnalysis.closestFielder.canIntercept) {
      return this.handleFour(shotDirection, boundaryDistance);
    }

    if (runningResult.isRunOut) {
      return {
        outcome: 'RUN_OUT',
        runs: 0,
        isWicket: true,
        dismissalType: 'run_out',
        fieldingAction: {
          type: 'run_out',
          fielder: interceptionAnalysis.closestFielder?.fielder,
          success: true
        },
        trajectory: { direction: shotDirection, boundaryDistance, isBoundary: false },
        runningDecision: runningResult
      };
    }

    if (runningResult.runsAttempted === 0) {
      return {
        outcome: 'DOT',
        runs: 0,
        isWicket: false,
        dismissalType: null,
        fieldingAction: {
          type: 'field',
          fielder: interceptionAnalysis.closestFielder?.fielder,
          success: true
        },
        trajectory: { direction: shotDirection, boundaryDistance, isBoundary: false },
        runningDecision: runningResult
      };
    }

    return {
      outcome: 'RUNS',
      runs: runningResult.runsAttempted,
      isWicket: false,
      dismissalType: null,
      fieldingAction: {
        type: 'field',
        fielder: interceptionAnalysis.closestFielder?.fielder,
        success: true
      },
      trajectory: { direction: shotDirection, boundaryDistance, isBoundary: false },
      runningDecision: runningResult
    };
  }

  /**
   * Get fielding statistics for analysis
   * @returns {Object} Fielding system statistics
   */
  getFieldingStats() {
    return {
      system: '2D_simulation',
      components: {
        ballPhysics: this.ballPhysics.constructor.name,
        fieldPositioning: this.fieldPositioning.constructor.name,
        fielderMovement: this.fielderMovement.constructor.name,
        runningDecision: this.runningDecision.constructor.name
      }
    };
  }

  /**
   * Set field formation for fielding team
   * @param {string} formationType - Formation type
   * @param {Object[]} fielders - Array of fielders
   * @returns {Object[]} Positioned fielders
   */
  setFieldFormation(formationType, fielders) {
    return this.fieldPositioning.setFormation(formationType, fielders);
  }
}

export default FieldingCalculator2D;