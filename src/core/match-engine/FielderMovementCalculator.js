/**
 * @file FielderMovementCalculator.js
 * @description Calculate fielder movement and interception for 2D simulation
 * @module core/match-engine/FielderMovementCalculator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const physicsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/config/physics-config.json'), 'utf8'));

/**
 * @typedef {Object} FielderInterception
 * @property {Object} fielder - Fielder object with position and attributes
 * @property {number} distance - Distance fielder needs to travel
 * @property {number} timeToReach - Time for fielder to reach interception point
 * @property {{x: number, y: number}} interceptionPoint - Where fielder intercepts ball
 * @property {boolean} canIntercept - Whether fielder can reach in time
 * @property {number} expectedDistance - Total shot distance if this fielder intercepts
 */

/**
 * @typedef {Object} InterceptionAnalysis
 * @property {FielderInterception[]} allFielders - Analysis for all fielders
 * @property {FielderInterception|null} closestFielder - Fielder who reaches ball first
 * @property {number} expectedShotDistance - Distance ball travels before fielding
 * @property {boolean} isBoundary - Whether shot reaches boundary
 * @property {boolean} isCatch - Whether shot can be caught (aerial shots only)
 */

class FielderMovementCalculator {
  constructor() {
    this.baseFielderSpeed = physicsConfig.fielderMovement.baseSpeed;

    console.log('✅ FielderMovementCalculator initialized');
  }

  /**
   * Analyze fielder interception using direct algebraic calculations
   * @param {Object} ballTrajectory - Ball trajectory from BallTrajectoryPhysics
   * @param {Object[]} fielderPositions - Array of fielder positions with attributes
   * @param {string} shotType - 'aerial' or 'grounded'
   * @returns {InterceptionAnalysis} Complete interception analysis
   */
  analyzeInterception(ballTrajectory, fielderPositions, shotType) {
    const allFielders = [];
    let closestFielder = null;
    let minInterceptionTime = Infinity;

    // Get shot parameters
    const shotDirection = ballTrajectory.direction;
    const shotSpeed = ballTrajectory.shotSpeed || 50; // Constant speed, fallback to 50
    const boundaryDistance = ballTrajectory.boundaryDistance;

    // Analyze each fielder's ability to intercept
    for (const fielderPosition of fielderPositions) {
      const interception = this.calculateFielderInterceptionAlgebraic(
        shotDirection,
        shotSpeed,
        fielderPosition,
        shotType,
        ballTrajectory.bouncePoint,
        boundaryDistance
      );

      allFielders.push(interception);

      // Track fielder who can reach ball first
      if (interception.canIntercept && interception.timeToReach < minInterceptionTime) {
        minInterceptionTime = interception.timeToReach;
        closestFielder = interception;
      }
    }

    // Determine shot outcome
    let expectedShotDistance;
    let isBoundary = ballTrajectory.isBoundary;
    let isCatch = false;

    if (closestFielder) {
      const interceptionPoint = closestFielder.interceptionPoint;
      expectedShotDistance = this.calculateDistance(
        0, -physicsConfig.fieldDimensions.strikerOffset, // From striker position
        interceptionPoint.x, interceptionPoint.y
      );

      // Check if it's a catch (aerial shots before bounce)
      if (shotType === 'aerial' && ballTrajectory.bouncePoint) {
        const bounceDistance = this.calculateDistance(
          0, -physicsConfig.fieldDimensions.strikerOffset,
          ballTrajectory.bouncePoint.x, ballTrajectory.bouncePoint.y
        );
        isCatch = expectedShotDistance < bounceDistance;
      }
    } else {
      // No fielder can intercept - ball reaches boundary
      expectedShotDistance = boundaryDistance;
      isBoundary = true;
    }

    return {
      allFielders,
      closestFielder,
      expectedShotDistance: isCatch ? -1 : expectedShotDistance, // -1 for catches
      isBoundary,
      isCatch
    };
  }

  /**
   * Calculate individual fielder's interception using polar coordinates from striker
   * @param {number} shotDirection - Shot direction in degrees
   * @param {number} shotSpeed - Constant shot speed
   * @param {Object} fielderPosition - Fielder position with r, theta, and fielder object
   * @param {string} shotType - Shot type ('aerial' or 'grounded')
   * @param {Object} bouncePoint - Bounce point for aerial shots (null for grounded)
   * @param {number} boundaryDistance - Distance to boundary in shot direction
   * @returns {FielderInterception} Fielder interception analysis
   */
  calculateFielderInterceptionAlgebraic(shotDirection, shotSpeed, fielderPosition, shotType, bouncePoint, boundaryDistance) {
    const fielderSpeed = this.calculateFielderSpeed(fielderPosition.fielder);

    // Use polar coordinates directly (r, theta from striker)
    const fielderDistance = fielderPosition.r; // Distance from striker
    const fielderAngle = fielderPosition.theta; // Angle from striker in degrees

    // Calculate angle difference (shortest angular distance)
    const angleDifference = Math.min(
      Math.abs(shotDirection - fielderAngle),
      360 - Math.abs(shotDirection - fielderAngle)
    );
    const angleDiffRadians = angleDifference * Math.PI / 180;

    let interceptionResult;

    if (shotType === 'grounded') {
      interceptionResult = this.calculateGroundedInterceptionPolar(
        shotDirection, shotSpeed, fielderSpeed, fielderDistance, angleDiffRadians, boundaryDistance
      );
    } else {
      interceptionResult = this.calculateAerialInterceptionPolar(
        shotDirection, shotSpeed, fielderSpeed, fielderDistance, fielderAngle, bouncePoint, boundaryDistance
      );
    }

    return {
      fielder: fielderPosition.fielder,
      position: { r: fielderDistance, theta: fielderAngle },
      distance: interceptionResult.distance,
      timeToReach: interceptionResult.timeToReach,
      interceptionPoint: interceptionResult.interceptionPoint,
      canIntercept: interceptionResult.canIntercept,
      expectedDistance: interceptionResult.expectedDistance
    };
  }

  /**
   * Calculate grounded shot interception using polar coordinates
   * @param {number} shotDirection - Shot direction in degrees
   * @param {number} shotSpeed - Ball speed (constant)
   * @param {number} fielderSpeed - Fielder speed
   * @param {number} fielderDistance - Distance from striker to fielder (r)
   * @param {number} angleDiffRadians - Angle difference in radians
   * @param {number} boundaryDistance - Distance to boundary
   * @returns {Object} Interception analysis result
   */
  calculateGroundedInterceptionPolar(shotDirection, shotSpeed, fielderSpeed, fielderDistance, angleDiffRadians, boundaryDistance) {
    // Simplified interception check: V * sin(θ₁) ≤ U
    const perpendicularComponent = shotSpeed * Math.sin(angleDiffRadians);

    if (perpendicularComponent > fielderSpeed) {
      // Fielder cannot intercept - ball too fast perpendicular to fielder position
      return {
        distance: boundaryDistance,
        timeToReach: Infinity,
        interceptionPoint: null,
        canIntercept: false,
        expectedDistance: boundaryDistance
      };
    }

    // Calculate interception time: t = R / (V cos(θ₁) + √(U² - V² sin²(θ₁)))
    const cosComponent = shotSpeed * Math.cos(angleDiffRadians);
    const sqrtTerm = Math.sqrt(fielderSpeed * fielderSpeed - perpendicularComponent * perpendicularComponent);

    const denominator = cosComponent + sqrtTerm;
    if (denominator <= 0) {
      // Mathematical edge case - no valid interception
      return {
        distance: boundaryDistance,
        timeToReach: Infinity,
        interceptionPoint: null,
        canIntercept: false,
        expectedDistance: boundaryDistance
      };
    }

    const timeToIntercept = fielderDistance / denominator;
    const ballTravelDistance = shotSpeed * timeToIntercept;

    // Check if interception happens before boundary
    if (ballTravelDistance > boundaryDistance) {
      return {
        distance: boundaryDistance,
        timeToReach: Infinity,
        interceptionPoint: null,
        canIntercept: false,
        expectedDistance: boundaryDistance
      };
    }

    return {
      distance: ballTravelDistance,
      timeToReach: timeToIntercept,
      interceptionPoint: { r: ballTravelDistance, theta: shotDirection }, // Polar coordinates
      canIntercept: true,
      expectedDistance: ballTravelDistance
    };
  }

  /**
   * Calculate aerial shot interception using polar coordinates
   * @param {number} shotDirection - Shot direction in degrees
   * @param {number} shotSpeed - Ball speed
   * @param {number} fielderSpeed - Fielder speed
   * @param {number} fielderDistance - Distance from striker to fielder (r)
   * @param {number} fielderAngle - Fielder angle from striker (theta)
   * @param {Object} bouncePoint - Bounce point of aerial shot
   * @param {number} boundaryDistance - Distance to boundary
   * @returns {Object} Interception analysis result
   */
  calculateAerialInterceptionPolar(shotDirection, shotSpeed, fielderSpeed, fielderDistance, fielderAngle, bouncePoint, boundaryDistance) {
    if (!bouncePoint) {
      // Ball crosses boundary in air (six) - no interception
      return {
        distance: boundaryDistance,
        timeToReach: Infinity,
        interceptionPoint: null,
        canIntercept: false,
        expectedDistance: boundaryDistance
      };
    }

    // Bounce point in polar coordinates from striker
    const bounceDistance = bouncePoint.r || (shotSpeed * shotSpeed / 10); // From physics formula
    const aerialTime = bouncePoint.time || (shotSpeed / (10 * Math.sqrt(2)));

    // Check if fielder can reach bounce point during aerial time
    const angleToBounce = Math.min(
      Math.abs(shotDirection - fielderAngle),
      360 - Math.abs(shotDirection - fielderAngle)
    ) * Math.PI / 180;

    // Distance from fielder to bounce point using law of cosines
    const distanceToBounce = Math.sqrt(
      fielderDistance * fielderDistance +
      bounceDistance * bounceDistance -
      2 * fielderDistance * bounceDistance * Math.cos(angleToBounce)
    );

    const timeToReachBounce = distanceToBounce / fielderSpeed;
    const canReachForCatch = timeToReachBounce <= aerialTime;

    if (canReachForCatch) {
      // Catching opportunity
      return {
        distance: bounceDistance,
        timeToReach: timeToReachBounce,
        interceptionPoint: { r: bounceDistance, theta: shotDirection },
        canIntercept: true,
        expectedDistance: -1 // Indicates potential catch
      };
    } else {
      // After bounce, treat as grounded shot from bounce point
      const remainingDistance = boundaryDistance - bounceDistance;
      if (remainingDistance > 0) {
        // Calculate angle difference for post-bounce interception
        const postBounceAngleDiff = Math.abs(shotDirection - fielderAngle) * Math.PI / 180;

        const postBounceResult = this.calculateGroundedInterceptionPolar(
          shotDirection, shotSpeed, fielderSpeed,
          distanceToBounce, postBounceAngleDiff, remainingDistance
        );

        return {
          distance: bounceDistance + postBounceResult.distance,
          timeToReach: aerialTime + postBounceResult.timeToReach,
          interceptionPoint: postBounceResult.interceptionPoint,
          canIntercept: postBounceResult.canIntercept,
          expectedDistance: bounceDistance + postBounceResult.expectedDistance
        };
      } else {
        return {
          distance: bounceDistance,
          timeToReach: aerialTime,
          interceptionPoint: { r: bounceDistance, theta: shotDirection },
          canIntercept: false,
          expectedDistance: bounceDistance
        };
      }
    }
  }

  /**
   * Calculate fielder movement speed based on attributes
   * @param {Object} fielder - Fielder object with attributes
   * @returns {number} Fielder speed in distance units per second
   */
  calculateFielderSpeed(fielder) {
    if (!fielder || !fielder.attributes) {
      return this.baseFielderSpeed;
    }

    const speed = fielder.attributes.physical?.speed || 10;
    const agility = fielder.attributes.physical?.agility || 10;

    // Combine speed and agility for movement calculation
    const effectiveSpeed = (speed * 0.7 + agility * 0.3) / 20; // Normalize to 0-1
    return this.baseFielderSpeed + (effectiveSpeed * 4); // Range: 8-12 units/second
  }

  /**
   * Calculate distance between two points
   * @param {number} x1 - First point X
   * @param {number} y1 - First point Y
   * @param {number} x2 - Second point X
   * @param {number} y2 - Second point Y
   * @returns {number} Distance
   */
  calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * Get fielding time including throw back to wickets - simplified with new throw_speed attribute
   * @param {FielderInterception} interception - Fielder interception data
   * @param {number} throwDistance - Distance to throw (calculated as interception_distance/shot_speed from requirements)
   * @returns {{totalTime: number, fieldingTime: number, throwTime: number}} Complete fielding time
   */
  calculateFieldingTime(interception, throwDistance) {
    if (!interception.canIntercept) {
      return { totalTime: Infinity, fieldingTime: Infinity, throwTime: 0 };
    }

    const fielder = interception.fielder;
    const fieldingTime = interception.timeToReach;

    // Use new throw_speed attribute when available, otherwise use throwPower for compatibility
    let throwSpeed;
    if (fielder.attributes?.fielding?.throw_speed) {
      throwSpeed = fielder.attributes.fielding.throw_speed;
    } else {
      const throwPower = fielder.attributes?.fielding?.throwPower || 10;
      throwSpeed = physicsConfig.algebraicCalculations?.aerialInterception?.throwSpeedDefault || 25;
    }

    const throwTime = throwDistance / throwSpeed;

    return {
      totalTime: fieldingTime + throwTime,
      fieldingTime,
      throwTime
    };
  }

  /**
   * Calculate total fielding time as specified in requirements: interception_time/shot_speed + throw_time
   * @param {number} interceptionDistance - Distance ball travels to interception
   * @param {number} shotSpeed - Ball speed
   * @param {number} throwPower - Fielder's throw power
   * @returns {number} Total fielding time
   */
  calculateTotalFieldingTime(interceptionDistance, shotSpeed, throwPower) {
    const interceptionTime = interceptionDistance / shotSpeed;
    const throwTime = interceptionDistance / throwPower; // As per requirements
    return interceptionTime + throwTime;
  }

  /**
   * Calculate catch probability for aerial shots
   * @param {FielderInterception} interception - Fielder interception data
   * @param {number} ballSpeed - Ball speed at interception
   * @returns {number} Catch probability (0-1)
   */
  calculateCatchProbability(interception, ballSpeed) {
    if (!interception.canIntercept) {
      return 0;
    }

    const fielder = interception.fielder;
    const catching = fielder.attributes?.fielding?.catching || 10;
    const reflexes = fielder.attributes?.fielding?.reflexes || 10;

    // Base catch probability from attributes
    const baseProbability = (catching * 0.7 + reflexes * 0.3) / 20;

    // Adjust for ball speed (faster = harder to catch)
    const speedPenalty = Math.max(0, (ballSpeed - 40) / 80); // Penalty for speed > 40
    const finalProbability = baseProbability * (1 - speedPenalty * 0.4);

    return Math.max(0.1, Math.min(0.95, finalProbability));
  }

  /**
   * Evaluate multiple shot directions for placement logic
   * @param {number[]} directions - Array of possible shot directions
   * @param {number} speed - Shot speed
   * @param {string} shotType - Shot type
   * @param {Object[]} fielderPositions - Fielder positions
   * @param {Object} ballPhysics - Ball physics calculator
   * @returns {Object[]} Array of direction evaluations with expected distances
   */
  evaluateDirections(directions, speed, shotType, fielderPositions, ballPhysics) {
    const evaluations = [];

    for (const direction of directions) {
      const trajectory = ballPhysics.calculateTrajectory(direction, speed, shotType);
      const interceptionAnalysis = this.analyzeInterception(trajectory, fielderPositions, shotType);

      evaluations.push({
        direction,
        expectedDistance: interceptionAnalysis.expectedDistance,
        isBoundary: interceptionAnalysis.isBoundary,
        isCatch: interceptionAnalysis.isCatch,
        closestFielder: interceptionAnalysis.closestFielder,
        trajectory
      });
    }

    // Sort by expected distance (descending) - longer distances are better
    return evaluations.sort((a, b) => {
      // Boundaries are best (-1 for catches is worst)
      if (a.isBoundary && !b.isBoundary) return -1;
      if (b.isBoundary && !a.isBoundary) return 1;
      if (a.isCatch && !b.isCatch) return 1;
      if (b.isCatch && !a.isCatch) return -1;
      return b.expectedDistance - a.expectedDistance;
    });
  }
}

export default FielderMovementCalculator;