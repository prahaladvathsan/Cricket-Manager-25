/**
 * @file FieldingCalculator2D.js
 * @description 2D fielding simulation system replacing probability-based tables
 * @module core/match-engine/FieldingCalculator2D
 */

import BallTrajectoryPhysics from '../physics/BallTrajectoryPhysics.js';
import FieldPositioningSystem from '../physics/FieldPositioningSystem.js';
import FielderMovementCalculator from '../physics/FielderMovementCalculator.js';
import RunningDecisionCalculator from '../physics/RunningDecisionCalculator.js';
import physicsConfig from '../../../data/config/physics-config.json' with { type: "json" };


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

    // console.log('✅ FieldingCalculator2D initialized with 2D simulation'); // Suppressed for cleaner output
  }

  /**
   * Calculate fielding outcome using simplified algebraic approach
   * @param {FieldingContext2D} context - Fielding context
   * @returns {FieldingResult2D} Complete fielding result
   */
  calculateFielding(context) {
    const { trajectoryResult, striker, nonStriker, fieldingTeam, battingMentality } = context;

    // For non-middled balls, use existing trajectory logic
    if (trajectoryResult.shotType === 'missed' || trajectoryResult.shotType === 'edged_behind') {
      return this.handleNonFieldedShot(trajectoryResult);
    }

    // Get shot parameters directly
    const shotDirection = trajectoryResult.direction;
    const shotSpeed = trajectoryResult.shotSpeed;
    const shotType = trajectoryResult.shotType;

    // Get boundary distance from cache
    const boundaryDistance = this.ballPhysics.getBoundaryDistance(shotDirection);

    // Calculate bounce point for aerial shots (pre-calculate all needed values once)
    let bouncePoint = null;
    if (shotType === 'aerial') {
      const bounceDistance = Math.min(boundaryDistance, shotSpeed * shotSpeed / 10);
      const aerialTime = shotSpeed / (10 * Math.sqrt(2));

      bouncePoint = {
        r: bounceDistance,
        theta: shotDirection,
        time: aerialTime
      };
    }

    // Analyze fielder interception using polar coordinates (ALWAYS - even for boundaries)
    // This ensures we have closestFielder data for all shots for diagnostics
    const fielderPositions = this.convertFieldersToPolar(fieldingTeam.fieldingPositions || []);

    // DEBUG: Log fielding setup
    const DEBUG_FIELDING = false;
    if (DEBUG_FIELDING) {
      console.log('\n[FIELDING DEBUG]');
      console.log(`  Shot: ${shotType}, Direction: ${shotDirection.toFixed(1)}°, Speed: ${shotSpeed.toFixed(1)}m/s`);
      console.log(`  Boundary Distance: ${boundaryDistance.toFixed(1)}m`);
      console.log(`  Fielders positioned: ${fielderPositions.length}`);
    }

    const interceptionAnalysis = this.fielderMovement.analyzeInterception(
      { direction: shotDirection, boundaryDistance, bouncePoint, shotSpeed },
      fielderPositions,
      shotType
    );

    if (DEBUG_FIELDING) {
      console.log(`  Interception Analysis:`);
      console.log(`    - Closest fielder: ${interceptionAnalysis.closestFielder ? 'YES' : 'NO'}`);
      if (interceptionAnalysis.closestFielder) {
        console.log(`    - Can intercept: ${interceptionAnalysis.closestFielder.canIntercept}`);
        console.log(`    - Distance to ball: ${interceptionAnalysis.closestFielder.distance?.toFixed(1)}m`);
        console.log(`    - Fielder position: (r=${interceptionAnalysis.closestFielder.fielder.r?.toFixed(1)}m, θ=${interceptionAnalysis.closestFielder.fielder.theta?.toFixed(1)}°)`);
      }
      console.log(`    - Is catch opportunity: ${interceptionAnalysis.isCatch}`);
    }

    // Check for sixes (aerial shots that clear the boundary in air)
    // Six = when bounceDistance >= boundaryDistance (ball clears boundary before bouncing)
    if (shotType === 'aerial' && bouncePoint && bouncePoint.r >= boundaryDistance) {
      return this.handleSix(shotDirection, boundaryDistance, shotSpeed, interceptionAnalysis.closestFielder);
    }

    // Handle catches for aerial shots
    // Pass bouncePoint to check if ball is beyond boundary (even if catch is possible)
    if (interceptionAnalysis.isCatch && shotType === 'aerial') {
      return this.handleCatchAttempt(interceptionAnalysis, shotDirection, boundaryDistance, shotSpeed, bouncePoint);
    }

    // Calculate total fielding time
    let fieldingTime;
    const DEBUG_FIELDING_TIME = false;

    if (interceptionAnalysis.closestFielder) {
      const interceptionDistance = interceptionAnalysis.closestFielder.distance;
      const throwPower = interceptionAnalysis.closestFielder.fielder.attributes?.fielding?.throw_speed || 25;
      const totalTime = this.fielderMovement.calculateTotalFieldingTime(interceptionDistance, shotSpeed, throwPower);

      // Convert to format expected by RunningDecisionCalculator (object with .totalTime)
      fieldingTime = {
        totalTime: totalTime,
        fieldingTime: interceptionDistance / shotSpeed,
        throwTime: interceptionDistance / throwPower
      };

      if (DEBUG_FIELDING_TIME) {
        console.log('\n[FIELDING TIME DEBUG]');
        console.log(`  Interception distance: ${interceptionDistance.toFixed(1)}m`);
        console.log(`  Shot speed: ${shotSpeed.toFixed(1)} m/s`);
        console.log(`  Throw power: ${throwPower.toFixed(1)} m/s`);
        console.log(`  Interception time: ${fieldingTime.fieldingTime.toFixed(2)}s`);
        console.log(`  Throw time: ${fieldingTime.throwTime.toFixed(2)}s`);
        console.log(`  TOTAL fielding time: ${fieldingTime.totalTime.toFixed(2)}s`);
      }
    } else {
      // Ball reaches boundary - set very high time
      fieldingTime = {
        totalTime: Infinity,
        fieldingTime: Infinity,
        throwTime: 0
      };
    }

    // Calculate running decision
    const runningResult = this.runningDecision.calculateRunningDecision(
      striker,
      nonStriker || striker,
      fieldingTime,
      battingMentality
    );

    if (DEBUG_FIELDING_TIME && interceptionAnalysis.closestFielder) {
      console.log(`  Running decision: ${runningResult.runsAttempted} runs (isRunOut: ${runningResult.isRunOut})`);
    }

    // Determine final outcome
    return this.determineFinalOutcome(
      runningResult,
      interceptionAnalysis,
      shotDirection,
      boundaryDistance,
      shotSpeed,
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
    const DEBUG_CONVERSION = false;

    if (DEBUG_CONVERSION) {
      console.log('\n[POLAR CONVERSION DEBUG]');
      console.log(`  Converting ${fielderPositions.length} fielders from Cartesian to Polar`);
      console.log(`  Striker position: (0, -${strikerOffset})`);
    }

    for (const fielder of fielderPositions) {
      // Calculate polar coordinates from striker position (0, -11)
      const dx = fielder.x - 0;
      const dy = fielder.y - (-strikerOffset);
      const r = Math.sqrt(dx * dx + dy * dy);
      let theta = Math.atan2(dy, dx) * 180 / Math.PI;
      if (theta < 0) theta += 360;

      if (DEBUG_CONVERSION) {
        console.log(`  ${fielder.name || 'fielder'}: (x=${fielder.x}, y=${fielder.y}) → (r=${r.toFixed(1)}m, θ=${theta.toFixed(1)}°)`);
      }

      polarFielders.push({
        fielder: fielder.fielder,
        r: r,
        theta: theta,
        x: fielder.x, // Keep for backward compatibility
        y: fielder.y
      });
    }

    if (DEBUG_CONVERSION) {
      console.log('');
    }

    return polarFielders;
  }

  /**
   * Handle six outcome
   * @param {number} shotDirection - Shot direction
   * @param {number} boundaryDistance - Distance to boundary
   * @param {number} shotSpeed - Shot speed in m/s
   * @param {Object} closestFielder - Closest fielder for diagnostics
   * @returns {FieldingResult2D} Six result
   */
  handleSix(shotDirection, boundaryDistance, shotSpeed, closestFielder = null) {
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
      trajectory: { direction: shotDirection, boundaryDistance, shotSpeed, isBoundary: true },
      runningDecision: null,
      closestFielder: closestFielder // Include for diagnostics
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
   * @param {number} shotSpeed - Shot speed in m/s
   * @param {Object} bouncePoint - Bounce point information (with r, theta)
   * @returns {FieldingResult2D} Catch result
   */
  handleCatchAttempt(interceptionAnalysis, shotDirection, boundaryDistance, shotSpeed, bouncePoint = null) {
    const closestFielder = interceptionAnalysis.closestFielder;

    if (!closestFielder) {
      // No fielder can reach - treat as four
      return this.handleFour(shotDirection, boundaryDistance, shotSpeed, null);
    }

    // IMPORTANT: Check if bounce point is beyond boundary
    // Even if a fielder could theoretically catch it, if the ball bounces beyond the boundary it's a six
    if (bouncePoint && bouncePoint.r >= boundaryDistance) {
      // Debug: Log this safety check to ensure it's catching edge cases
      if (Math.random() < 0.05) { // Log 5% of these cases
        console.log(`\n[BOUNDARY CHECK] Aerial shot with bounce beyond boundary - declaring SIX`);
        console.log(`  Bounce distance: ${bouncePoint.r.toFixed(1)}m, Boundary: ${boundaryDistance.toFixed(1)}m`);
        console.log(`  Closest fielder could intercept: ${closestFielder?.canIntercept}`);
      }
      return this.handleSix(shotDirection, boundaryDistance, shotSpeed, closestFielder);
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
        trajectory: { direction: shotDirection, boundaryDistance, shotSpeed, isBoundary: false },
        runningDecision: null,
        closestFielder: closestFielder // Include for diagnostics
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
        trajectory: { direction: shotDirection, boundaryDistance, shotSpeed, isBoundary: false },
        runningDecision: { runsAttempted: 1, maxSafeRuns: 1, isRunOut: false },
        closestFielder: closestFielder // Include for diagnostics
      };
    }
  }

  /**
   * Handle four outcome
   * @param {number} shotDirection - Shot direction
   * @param {number} boundaryDistance - Distance to boundary
   * @param {number} shotSpeed - Shot speed in m/s
   * @param {Object} closestFielder - Closest fielder for diagnostics
   * @returns {FieldingResult2D} Four result
   */
  handleFour(shotDirection, boundaryDistance, shotSpeed, closestFielder = null) {
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
      trajectory: { direction: shotDirection, boundaryDistance, shotSpeed, isBoundary: true },
      runningDecision: null,
      closestFielder: closestFielder // Include for diagnostics
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
   * @param {number} shotSpeed - Shot speed in m/s
   * @param {Object} trajectoryResult - Original trajectory result
   * @returns {FieldingResult2D} Final fielding result
   */
  determineFinalOutcome(runningResult, interceptionAnalysis, shotDirection, boundaryDistance, shotSpeed, trajectoryResult) {
    // Check if ball reached boundary (no interception)
    if (!interceptionAnalysis.closestFielder || !interceptionAnalysis.closestFielder.canIntercept) {
      return this.handleFour(shotDirection, boundaryDistance, shotSpeed, interceptionAnalysis.closestFielder);
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
        trajectory: { direction: shotDirection, boundaryDistance, shotSpeed, isBoundary: false },
        runningDecision: runningResult,
        closestFielder: interceptionAnalysis.closestFielder // Include for diagnostics
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
        trajectory: { direction: shotDirection, boundaryDistance, shotSpeed, isBoundary: false },
        runningDecision: runningResult,
        closestFielder: interceptionAnalysis.closestFielder // Include for diagnostics
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
      trajectory: { direction: shotDirection, boundaryDistance, shotSpeed, isBoundary: false },
      runningDecision: runningResult,
      closestFielder: interceptionAnalysis.closestFielder // Include fielder interception data for diagnostics
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