/**
 * @file BallTrajectoryPhysics.js
 * @description Simplified algebraic ball trajectory calculation for cricket simulation
 * @module core/match-engine/BallTrajectoryPhysics
 */

import physicsConfig from '../../../data/config/physics-config.json';

// Pre-calculate boundary distances for each degree (0-359) accounting for striker position
const boundaryCache = {};
const initializeBoundaryCache = () => {
  const boundaryRadius = physicsConfig.fieldDimensions.boundaryRadius;
  const strikerOffset = physicsConfig.fieldDimensions.strikerOffset; // Striker at 10.06m from center on +Y axis

  for (let degree = 0; degree < 360; degree++) {
    const radians = degree * Math.PI / 180;
    // Striker position: (0, +strikerOffset) on positive Y axis
    const strikerX = 0;
    const strikerY = strikerOffset;

    // Calculate boundary distance in this direction from striker position
    const boundaryX = boundaryRadius * Math.cos(radians);
    const boundaryY = boundaryRadius * Math.sin(radians);

    boundaryCache[degree] = Math.sqrt(
      (boundaryX - strikerX) ** 2 + (boundaryY - strikerY) ** 2
    );
  }
};

// Initialize boundary cache
initializeBoundaryCache();

/**
 * @typedef {Object} TrajectoryPoint
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} time - Time elapsed
 * @property {number} speed - Current ball speed
 */

/**
 * @typedef {Object} BallTrajectory
 * @property {TrajectoryPoint} bouncePoint - Where ball lands (aerial shots)
 * @property {TrajectoryPoint} stopPoint - Where ball stops or exits field
 * @property {boolean} isBoundary - Whether ball reaches boundary
 * @property {number} totalTime - Total trajectory time
 * @property {number} direction - Shot direction in degrees
 * @property {number} boundaryDistance - Distance to boundary in shot direction
 */

class BallTrajectoryPhysics {
  constructor() {
    this.boundaryRadius = physicsConfig.fieldDimensions.boundaryRadius;
    this.strikerOffset = physicsConfig.fieldDimensions.strikerOffset; // Striker position: (0, +strikerOffset)
    this.aerialBounceDistance = physicsConfig.shotTypes.aerial.bounceDistance;
    this.aerialTime = physicsConfig.ballMovement.aerialTime;
    this.groundDeceleration = physicsConfig.ballMovement.groundDeceleration;
    this.minSpeed = physicsConfig.ballMovement.minSpeed;

    // console.log('✅ BallTrajectoryPhysics initialized with algebraic calculations and boundary cache'); // Suppressed for cleaner output
  }

  /**
   * Calculate complete ball trajectory using simplified algebraic approach
   * @param {number} direction - Shot direction in degrees (0-360)
   * @param {number} speed - Initial shot speed
   * @param {string} shotType - 'aerial' or 'grounded'
   * @returns {BallTrajectory} Complete trajectory information
   */
  calculateTrajectory(direction, speed, shotType) {
    const normalizedDirection = Math.floor(direction) % 360;
    const boundaryDistance = boundaryCache[normalizedDirection];

    if (shotType === 'aerial') {
      return this.calculateAerialTrajectoryAlgebraic(direction, speed, boundaryDistance);
    } else {
      return this.calculateGroundTrajectoryAlgebraic(direction, speed, boundaryDistance);
    }
  }

  /**
   * Calculate aerial shot trajectory - simplified as bounce point + straight line
   * @param {number} direction - Shot direction in degrees
   * @param {number} speed - Initial shot speed
   * @param {number} boundaryDistance - Distance to boundary in this direction
   * @returns {BallTrajectory} Aerial trajectory
   */
  calculateAerialTrajectoryAlgebraic(direction, speed, boundaryDistance) {
    const directionRadians = direction * Math.PI / 180;

    // Fixed 45° launch angle assumption: bounce distance = speed² / g
    const gravity = physicsConfig.ballMovement.gravity || 10; // m/s²
    const bounceDistance = Math.min(boundaryDistance, speed * speed / gravity);

    // Calculate bounce point from striker position (0, +strikerOffset)
    const bounceX = bounceDistance * Math.cos(directionRadians);
    const bounceY = this.strikerOffset + bounceDistance * Math.sin(directionRadians);

    // Aerial time to reach bounce point (simplified)
    const aerialTime = speed / (gravity * Math.sqrt(2));

    const bouncePoint = {
      x: bounceX,
      y: bounceY,
      time: aerialTime,
      speed: speed // No speed loss - simplified
    };

    // Check if bounce is beyond boundary
    const isBeyondBoundary = bounceDistance >= boundaryDistance;

    let stopPoint;
    let isBoundary = false;
    let totalTime = aerialTime;

    if (isBeyondBoundary) {
      // Six - ball crosses boundary in air
      const boundaryX = boundaryDistance * Math.cos(directionRadians);
      const boundaryY = this.strikerOffset + boundaryDistance * Math.sin(directionRadians);

      stopPoint = {
        x: boundaryX,
        y: boundaryY,
        time: aerialTime * (boundaryDistance / bounceDistance), // Proportional time
        speed: speed
      };
      isBoundary = true;
      totalTime = stopPoint.time;
    } else {
      // After bounce, treat as ground shot from bounce point with same speed
      const remainingDistance = boundaryDistance - bounceDistance;
      const groundTime = remainingDistance > 0 ? remainingDistance / speed : 0;

      if (remainingDistance > 0) {
        // Ball reaches boundary on ground after bounce
        stopPoint = {
          x: boundaryDistance * Math.cos(directionRadians),
          y: this.strikerOffset + boundaryDistance * Math.sin(directionRadians),
          time: aerialTime + groundTime,
          speed: speed // No deceleration
        };
        isBoundary = true;
        totalTime = stopPoint.time;
      } else {
        // Ball stops at bounce point
        stopPoint = bouncePoint;
        totalTime = aerialTime;
      }
    }

    return {
      bouncePoint: bouncePoint, // Always include bounce point, even for sixes (it's beyond boundary)
      stopPoint,
      isBoundary,
      totalTime,
      direction: direction,
      boundaryDistance
    };
  }

  /**
   * Calculate ground shot trajectory - simplified straight line with constant speed
   * @param {number} direction - Shot direction in degrees
   * @param {number} speed - Initial shot speed (constant)
   * @param {number} boundaryDistance - Distance to boundary in this direction
   * @param {TrajectoryPoint} startPoint - Starting point (default: batting crease)
   * @returns {BallTrajectory} Ground trajectory
   */
  calculateGroundTrajectoryAlgebraic(direction, speed, boundaryDistance, startPoint = null) {
    const directionRadians = direction * Math.PI / 180;
    const start = startPoint || { x: 0, y: this.strikerOffset, time: 0, speed };

    // Simplified: ball travels at constant speed until boundary or stopped by fielder
    const actualDistance = boundaryDistance; // Ball will travel to boundary unless fielded
    const isBoundary = true; // Always reaches boundary unless intercepted

    // Calculate stop point (boundary)
    const stopX = start.x + actualDistance * Math.cos(directionRadians);
    const stopY = start.y + actualDistance * Math.sin(directionRadians);

    // Time to reach boundary at constant speed
    const totalTime = actualDistance / speed;

    const stopPoint = {
      x: stopX,
      y: stopY,
      time: start.time + totalTime,
      speed: speed // Constant speed
    };

    return {
      bouncePoint: null,
      stopPoint,
      isBoundary,
      totalTime: stopPoint.time,
      direction: direction,
      boundaryDistance
    };
  }


  /**
   * Get boundary distance for specific direction (from cache)
   * @param {number} direction - Direction in degrees
   * @returns {number} Distance to boundary in that direction
   */
  getBoundaryDistance(direction) {
    const normalizedDirection = Math.floor(direction) % 360;
    return boundaryCache[normalizedDirection];
  }
}

export default BallTrajectoryPhysics;