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
const physicsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/config/physics-config.json'), 'utf8'));

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

    // console.log(`✅ FielderMovementCalculator initialized with baseSpeed=${this.baseFielderSpeed} m/s`); // Suppressed for cleaner output
  }

  /**
   * Analyze fielder interception using direct algebraic calculations
   * @param {Object} ballTrajectory - Ball trajectory with {direction, shotSpeed, boundaryDistance, bouncePoint}
   * @param {Object[]} fielderPositions - Array of fielder positions with attributes in polar coordinates
   * @param {string} shotType - 'aerial' or 'grounded'
   * @returns {InterceptionAnalysis} Complete interception analysis
   */
  analyzeInterception(ballTrajectory, fielderPositions, shotType) {
    // Get shot parameters (all pre-calculated by caller)
    const shotDirection = ballTrajectory.direction;
    const shotSpeed = ballTrajectory.shotSpeed || 12;
    const boundaryDistance = ballTrajectory.boundaryDistance;
    const bouncePoint = ballTrajectory.bouncePoint; // Already contains {r, theta, time} if aerial

    // HEURISTIC: Select closest fielder BEFORE calculating full interception
    // Grounded shots: minimum angle difference
    // Aerial shots: minimum distance from bounce point
    let closestFielderPosition = null;
    let minHeuristicValue = Infinity;

    if (shotType === 'grounded') {
      // Find fielder with minimum angle difference
      for (const fielderPosition of fielderPositions) {
        const angleDiff = Math.abs(this.normalizeAngle(fielderPosition.theta - shotDirection));
        if (angleDiff < minHeuristicValue) {
          minHeuristicValue = angleDiff;
          closestFielderPosition = fielderPosition;
        }
      }
    } else {
      // Aerial: Find fielder with minimum distance from bounce point
      if (bouncePoint) {
        const bounceDistance = bouncePoint.r; // Use pre-calculated polar distance
        const bounceAngle = shotDirection;

        // Track both in-field (can catch) and deep fielders (post-bounce only)
        let closestInFielder = null;
        let minInFieldDistance = Infinity;
        let closestDeepFielder = null;
        let minDeepFieldDistance = Infinity;

        for (const fielderPosition of fielderPositions) {
          // Law of cosines: distance from fielder to bounce point
          const r = fielderPosition.r;
          const d = bounceDistance;
          const theta = Math.abs(this.normalizeAngle(fielderPosition.theta - bounceAngle));
          const thetaRad = theta * Math.PI / 180;
          const distanceToBounce = Math.sqrt(r * r + d * d - 2 * r * d * Math.cos(thetaRad));

          // Categorize fielders: in-field (r < bounceDistance) vs deep (r >= bounceDistance)
          if (r < bounceDistance) {
            // In-field fielder - can potentially catch
            if (distanceToBounce < minInFieldDistance) {
              minInFieldDistance = distanceToBounce;
              closestInFielder = fielderPosition;
            }
          } else {
            // Deep fielder - can only intercept post-bounce
            if (distanceToBounce < minDeepFieldDistance) {
              minDeepFieldDistance = distanceToBounce;
              closestDeepFielder = fielderPosition;
            }
          }
        }

        // Prefer in-field fielder (catch opportunity), fallback to deep fielder
        if (closestInFielder) {
          closestFielderPosition = closestInFielder;
          minHeuristicValue = minInFieldDistance;
        } else if (closestDeepFielder) {
          closestFielderPosition = closestDeepFielder;
          minHeuristicValue = minDeepFieldDistance;
        }
      } else {
        // No bounce point (six) - use angle difference as fallback
        for (const fielderPosition of fielderPositions) {
          const angleDiff = Math.abs(this.normalizeAngle(fielderPosition.theta - shotDirection));
          if (angleDiff < minHeuristicValue) {
            minHeuristicValue = angleDiff;
            closestFielderPosition = fielderPosition;
          }
        }
      }
    }

    // Safety check: if no fielders or empty fielder positions, return no interception
    if (!closestFielderPosition || fielderPositions.length === 0) {
      return {
        closestFielder: null,
        expectedShotDistance: boundaryDistance,
        isBoundary: true,
        isCatch: false
      };
    }

    // Calculate full interception ONLY for the closest fielder
    let closestFielder = this.calculateFielderInterceptionAlgebraic(
      shotDirection,
      shotSpeed,
      closestFielderPosition,
      shotType,
      bouncePoint, // Use the extracted bouncePoint
      boundaryDistance
    );

    // AERIAL SHOT FALLBACK: If closest fielder cannot intercept post-bounce due to positioning,
    // try to find a deep fielder who can intercept after bounce
    if (shotType === 'aerial' && bouncePoint && !closestFielder.canIntercept) {
      const bounceDistance = bouncePoint.r;

      // Find deep fielders (fielderDistance > bounceDistance) who can intercept post-bounce
      let bestDeepFielder = null;
      let shortestInterceptionDistance = Infinity;

      for (const fielderPosition of fielderPositions) {
        // Only consider fielders positioned beyond bounce point
        if (fielderPosition.r >= bounceDistance) {
          const deepFielderResult = this.calculateFielderInterceptionAlgebraic(
            shotDirection,
            shotSpeed,
            fielderPosition,
            shotType,
            bouncePoint,
            boundaryDistance
          );

          // Check if this deep fielder can intercept and at what distance
          if (deepFielderResult.canIntercept) {
            const interceptionDist = deepFielderResult.expectedDistance;
            if (interceptionDist < shortestInterceptionDistance) {
              shortestInterceptionDistance = interceptionDist;
              bestDeepFielder = deepFielderResult;
            }
          }
        }
      }

      // If we found a valid deep fielder, use them instead
      if (bestDeepFielder) {
        closestFielder = bestDeepFielder;
      }
    }

    // Determine shot outcome
    let expectedShotDistance;
    let isBoundary = ballTrajectory.isBoundary;
    let isCatch = false;

    if (closestFielder.canIntercept) {
      // Check if it's a catch (aerial shots before bounce) FIRST
      if (shotType === 'aerial' && bouncePoint) {
        const bounceDistance = bouncePoint.r; // Use pre-calculated polar distance

        // For aerial shots with canIntercept=true, the fielder can reach bounce point during aerial time
        // In this case, expectedDistance should be the bounce distance (where the catch occurs)
        if (closestFielder.expectedDistance === -1) {
          // -1 indicates catch opportunity
          isCatch = true;
          expectedShotDistance = bounceDistance;
        } else {
          // Fielder intercepts after bounce - not a catch
          isCatch = false;
          expectedShotDistance = closestFielder.expectedDistance || bounceDistance;
        }
      } else {
        // Grounded shot - use polar distance directly (all interception points are in polar coordinates)
        const interceptionPoint = closestFielder.interceptionPoint;
        expectedShotDistance = interceptionPoint?.r || closestFielder.expectedDistance || boundaryDistance;
      }
    } else {
      // Fielder cannot intercept - ball reaches boundary
      expectedShotDistance = boundaryDistance;
      isBoundary = true;
    }

    return {
      closestFielder, // Single fielder for both gameplay and diagnostics
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
      expectedDistance: interceptionResult.expectedDistance,
      angleDiff: angleDifference, // Angle diff between shot and fielder (degrees)
      distanceFromBounce: interceptionResult.distanceFromBounce // Distance from bounce point (aerial shots only)
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
    // Debug logging (5% sample)
    const DEBUG_INTERCEPTION = false;

    // Simplified interception check: V * sin(θ₁) ≤ U
    const perpendicularComponent = shotSpeed * Math.sin(angleDiffRadians);

    if (DEBUG_INTERCEPTION) {
      console.log('\n[INTERCEPTION CALC - GROUNDED]');
      console.log(`  Shot Speed: ${shotSpeed.toFixed(1)} m/s`);
      console.log(`  Fielder Speed: ${fielderSpeed.toFixed(1)} m/s`);
      console.log(`  Fielder Distance: ${fielderDistance.toFixed(1)} m`);
      console.log(`  Angle Diff: ${(angleDiffRadians * 180 / Math.PI).toFixed(1)}°`);
      console.log(`  Perpendicular Component: ${perpendicularComponent.toFixed(1)} m/s`);
      console.log(`  Check: ${perpendicularComponent.toFixed(1)} > ${fielderSpeed.toFixed(1)}? ${perpendicularComponent > fielderSpeed}`);
    }

    if (perpendicularComponent > fielderSpeed) {
      // Fielder cannot intercept - ball too fast perpendicular to fielder position
      if (DEBUG_INTERCEPTION) {
        console.log(`  ❌ Cannot intercept - perpendicular speed too high`);
      }
      return {
        distance: boundaryDistance,
        timeToReach: Infinity,
        interceptionPoint: null,
        canIntercept: false,
        expectedDistance: boundaryDistance,
        distanceFromBounce: null // Not applicable for grounded shots
      };
    }

    // Calculate interception time: t = R / (V cos(θ₁) + √(U² - V² sin²(θ₁)))
    const cosComponent = shotSpeed * Math.cos(angleDiffRadians);
    const sqrtTerm = Math.sqrt(fielderSpeed * fielderSpeed - perpendicularComponent * perpendicularComponent);

    const denominator = cosComponent + sqrtTerm;
    if (denominator <= 0) {
      // Mathematical edge case - no valid interception
      if (DEBUG_INTERCEPTION) {
        console.log(`  ❌ Cannot intercept - invalid denominator (${denominator.toFixed(2)})`);
      }
      return {
        distance: boundaryDistance,
        timeToReach: Infinity,
        interceptionPoint: null,
        canIntercept: false,
        expectedDistance: boundaryDistance,
        distanceFromBounce: null // Not applicable for grounded shots
      };
    }

    const timeToIntercept = fielderDistance / denominator;
    const ballTravelDistance = shotSpeed * timeToIntercept;

    if (DEBUG_INTERCEPTION) {
      console.log(`  Time to Intercept: ${timeToIntercept.toFixed(2)} s`);
      console.log(`  Ball Travel Distance: ${ballTravelDistance.toFixed(1)} m`);
      console.log(`  Boundary Distance: ${boundaryDistance.toFixed(1)} m`);
    }

    // CRITICAL CHECK: Interception must happen before boundary
    if (ballTravelDistance >= boundaryDistance) {
      if (DEBUG_INTERCEPTION) {
        console.log(`  ❌ Cannot intercept - ball reaches boundary before fielder`);
      }
      return {
        distance: boundaryDistance,
        timeToReach: Infinity,
        interceptionPoint: null,
        canIntercept: false,
        expectedDistance: boundaryDistance,
        distanceFromBounce: null // Not applicable for grounded shots
      };
    }

    if (DEBUG_INTERCEPTION) {
      console.log(`  ✅ Can intercept at ${ballTravelDistance.toFixed(1)}m`);
    }

    return {
      distance: ballTravelDistance,
      timeToReach: timeToIntercept,
      interceptionPoint: { r: ballTravelDistance, theta: shotDirection }, // Polar coordinates
      canIntercept: true,
      expectedDistance: ballTravelDistance,
      distanceFromBounce: null // Not applicable for grounded shots
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
    // Debug logging (5% sample)
    const DEBUG_INTERCEPTION = false;

    // Bounce point in polar coordinates from striker (always exists, even for sixes)
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
    const divingDistance = 2.0;
    const timeToReachBounce = (distanceToBounce - divingDistance) / fielderSpeed;
    const canReachForCatch = timeToReachBounce <= aerialTime;

    if (DEBUG_INTERCEPTION) {
      console.log('\n[INTERCEPTION CALC - AERIAL]');
      console.log(`  Shot Speed: ${shotSpeed.toFixed(1)} m/s`);
      console.log(`  Fielder Speed: ${fielderSpeed.toFixed(1)} m/s`);
      console.log(`  Bounce Distance: ${bounceDistance.toFixed(1)} m`);
      console.log(`  Aerial Time: ${aerialTime.toFixed(2)} s`);
      console.log(`  Distance to Bounce: ${distanceToBounce.toFixed(1)} m`);
      console.log(`  Time to Reach: ${timeToReachBounce.toFixed(2)} s`);
      console.log(`  Can Catch: ${canReachForCatch}`);
    }

    if (canReachForCatch) {
      // Catching opportunity
      return {
        distance: bounceDistance,
        timeToReach: timeToReachBounce,
        interceptionPoint: { r: bounceDistance, theta: shotDirection },
        canIntercept: true,
        expectedDistance: -1, // Indicates potential catch
        distanceFromBounce: distanceToBounce // Distance from fielder to bounce point
      };
    } else {
      // After bounce, treat as grounded shot from bounce point
      const remainingDistance = boundaryDistance - bounceDistance;

      if (remainingDistance > 0) {
        // For post-bounce interception, fielder must be positioned beyond bounce point
        // Otherwise they're in-field and would have caught it (already handled above)
        if (fielderDistance < bounceDistance) {
          // Fielder is closer to striker than bounce point - cannot intercept post-bounce
          return {
            distance: bounceDistance,
            timeToReach: aerialTime,
            interceptionPoint: { r: bounceDistance, theta: shotDirection },
            canIntercept: false,
            expectedDistance: boundaryDistance,  // Will reach boundary
            distanceFromBounce: distanceToBounce
          };
        }

        // Calculate angle difference for post-bounce interception
        const postBounceAngleDiff = Math.abs(shotDirection - fielderAngle) * Math.PI / 180;

        // Use fielder's actual distance from striker for grounded interception calculation
        const postBounceResult = this.calculateGroundedInterceptionPolar(
          shotDirection,
          shotSpeed / Math.sqrt(2),  // Ball slows after bounce
          fielderSpeed,
          fielderDistance,  // CORRECT: Use fielder's distance from striker
          postBounceAngleDiff,
          boundaryDistance
        );

        // Verify interception happens AFTER bounce point
        if (postBounceResult.canIntercept) {
          const interceptionDistance = postBounceResult.interceptionPoint?.r || postBounceResult.expectedDistance;

          // CRITICAL CHECK: Ensure interception is after bounce AND before boundary
          if (interceptionDistance < bounceDistance) {
            // Invalid: calculated interception before bounce point
            return {
              distance: bounceDistance,
              timeToReach: aerialTime,
              interceptionPoint: { r: bounceDistance, theta: shotDirection },
              canIntercept: false,
              expectedDistance: boundaryDistance,
              distanceFromBounce: distanceToBounce
            };
          }

          if (interceptionDistance > boundaryDistance) {
            // Invalid: interception beyond boundary (should be a four)
            return {
              distance: boundaryDistance,
              timeToReach: Infinity,
              interceptionPoint: null,
              canIntercept: false,
              expectedDistance: boundaryDistance,
              distanceFromBounce: distanceToBounce
            };
          }

          // Valid post-bounce interception
          return {
            distance: interceptionDistance,
            timeToReach: aerialTime + postBounceResult.timeToReach,
            interceptionPoint: postBounceResult.interceptionPoint,
            canIntercept: true,
            expectedDistance: interceptionDistance,
            distanceFromBounce: distanceToBounce
          };
        } else {
          // Cannot intercept after bounce - ball reaches boundary
          return {
            distance: boundaryDistance,
            timeToReach: Infinity,
            interceptionPoint: null,
            canIntercept: false,
            expectedDistance: boundaryDistance,
            distanceFromBounce: distanceToBounce
          };
        }
      } else {
        // No remaining distance - ball bounces at or beyond boundary
        return {
          distance: bounceDistance,
          timeToReach: aerialTime,
          interceptionPoint: { r: bounceDistance, theta: shotDirection },
          canIntercept: false,
          expectedDistance: boundaryDistance,
          distanceFromBounce: distanceToBounce
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

    // Formula: baseSpeed + speed/10 (m/s)
    // Range: baseSpeed to baseSpeed+2.0 m/s for speed attributes 0-20
    return this.baseFielderSpeed + (speed / 10);
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
   * Normalize angle difference to -180 to +180 range
   * @param {number} angle - Angle in degrees
   * @returns {number} Normalized angle
   */
  normalizeAngle(angle) {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
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
    const reactionTime = 1.0; // 1 second reaction time
    const interceptionTime = interceptionDistance / shotSpeed;
    const throwTime = interceptionDistance / throwPower; // As per requirements
    return reactionTime + interceptionTime + throwTime;
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