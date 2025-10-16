/**
 * @file BallTrajectoryPhysics.js
 * @description Simplified algebraic ball trajectory calculation for cricket simulation
 * @module core/match-engine/BallTrajectoryPhysics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const physicsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/config/physics-config.json'), 'utf8'));

// Pre-calculate boundary distances for each degree (0-359) accounting for pitch offset
const boundaryCache = {};
const initializeBoundaryCache = () => {
  const boundaryRadius = physicsConfig.fieldDimensions.boundaryRadius;
  const pitchOffset = physicsConfig.fieldDimensions.pitchLength / 2; // Striker is 11 yards from center

  for (let degree = 0; degree < 360; degree++) {
    const radians = degree * Math.PI / 180;
    // Account for striker position offset from center
    const strikerX = 0;
    const strikerY = -pitchOffset;

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
    this.aerialBounceDistance = physicsConfig.shotTypes.aerial.bounceDistance;
    this.aerialTime = physicsConfig.ballMovement.aerialTime;
    this.groundDeceleration = physicsConfig.ballMovement.groundDeceleration;
    this.minSpeed = physicsConfig.ballMovement.minSpeed;

    console.log('✅ BallTrajectoryPhysics initialized with algebraic calculations and boundary cache');
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
    const pitchOffset = physicsConfig.fieldDimensions.pitchLength / 2;

    // Fixed 45° launch angle assumption: bounce distance = speed² / g
    const gravity = physicsConfig.ballMovement.gravity || 10; // m/s²
    const bounceDistance = Math.min(boundaryDistance, speed * speed / gravity);

    // Calculate bounce point from striker position
    const bounceX = bounceDistance * Math.cos(directionRadians);
    const bounceY = -pitchOffset + bounceDistance * Math.sin(directionRadians);

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
      const boundaryY = -pitchOffset + boundaryDistance * Math.sin(directionRadians);

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
          y: -pitchOffset + boundaryDistance * Math.sin(directionRadians),
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
    const pitchOffset = physicsConfig.fieldDimensions.pitchLength / 2;
    const start = startPoint || { x: 0, y: -pitchOffset, time: 0, speed };

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
   * Get ball position at specific time - simplified constant speed calculation
   * @param {BallTrajectory} trajectory - Ball trajectory
   * @param {number} time - Time to check
   * @param {number} initialSpeed - Initial shot speed (constant)
   * @param {string} shotType - Shot type for calculation method
   * @returns {TrajectoryPoint|null} Ball position at time
   */
  getBallPositionAtTime(trajectory, time, initialSpeed, shotType) {
    if (time <= 0) {
      const pitchOffset = physicsConfig.fieldDimensions.pitchLength / 2;
      return { x: 0, y: -pitchOffset, time: 0, speed: initialSpeed };
    }

    if (time >= trajectory.totalTime) {
      return trajectory.stopPoint;
    }

    const directionRadians = trajectory.direction * Math.PI / 180;
    const pitchOffset = physicsConfig.fieldDimensions.pitchLength / 2;

    if (shotType === 'aerial' && trajectory.bouncePoint && time <= trajectory.bouncePoint.time) {
      // Aerial phase - projectile motion to bounce point
      const gravity = physicsConfig.ballMovement.gravity || 10;
      const horizontalDistance = initialSpeed * Math.cos(Math.PI/4) * time; // 45° angle

      return {
        x: horizontalDistance * Math.cos(directionRadians),
        y: -pitchOffset + horizontalDistance * Math.sin(directionRadians),
        time: time,
        speed: initialSpeed // Simplified - constant speed
      };
    } else {
      // Ground movement - constant speed straight line
      const distance = initialSpeed * time;

      return {
        x: distance * Math.cos(directionRadians),
        y: -pitchOffset + distance * Math.sin(directionRadians),
        time: time,
        speed: initialSpeed // Constant speed
      };
    }
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
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Check if trajectory passes through a point within radius using algebraic approach
   * @param {BallTrajectory} trajectory - Ball trajectory
   * @param {number} x - Point X coordinate
   * @param {number} y - Point Y coordinate
   * @param {number} radius - Check radius
   * @param {number} initialSpeed - Initial shot speed
   * @param {string} shotType - Shot type
   * @returns {{intersects: boolean, time: number, point: TrajectoryPoint}} Intersection info
   */
  checkTrajectoryIntersection(trajectory, x, y, radius, initialSpeed, shotType) {
    const directionRadians = trajectory.direction * Math.PI / 180;
    const pitchOffset = physicsConfig.fieldDimensions.pitchLength / 2;

    // For straight-line trajectory (grounded shots)
    if (shotType === 'grounded') {
      // Calculate perpendicular distance from line to point
      const a = Math.sin(directionRadians);
      const b = -Math.cos(directionRadians);
      const c = pitchOffset * Math.cos(directionRadians);
      const perpendicularDistance = Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);

      if (perpendicularDistance <= radius) {
        // Find intersection time
        const projectionDistance = (x - 0) * Math.cos(directionRadians) + (y - (-pitchOffset)) * Math.sin(directionRadians);
        if (projectionDistance >= 0) {
          const time = this.calculateTimeToReachDistance(initialSpeed, projectionDistance, physicsConfig.ballMovement.groundDeceleration);
          if (time <= trajectory.totalTime) {
            return {
              intersects: true,
              time: time,
              point: this.getBallPositionAtTime(trajectory, time, initialSpeed, shotType)
            };
          }
        }
      }
    }

    return {
      intersects: false,
      time: -1,
      point: null
    };
  }

  /**
   * Calculate time to reach specific distance with deceleration
   * @param {number} initialSpeed - Initial speed
   * @param {number} distance - Target distance
   * @param {number} deceleration - Deceleration factor
   * @returns {number} Time to reach distance
   */
  calculateTimeToReachDistance(initialSpeed, distance, deceleration) {
    // Solve for time in: distance = initialSpeed * (1 - decel^time) / (1 - decel)
    const decelerationRate = 1 - deceleration;
    const ratio = 1 - (distance * decelerationRate) / initialSpeed;
    if (ratio <= 0) return Infinity;
    return Math.log(ratio) / Math.log(deceleration);
  }

  /**
   * Get trajectory summary for debugging
   * @param {BallTrajectory} trajectory - Ball trajectory
   * @returns {Object} Summary information
   */
  getTrajectoryInfo(trajectory) {
    const pitchOffset = physicsConfig.fieldDimensions.pitchLength / 2;
    return {
      calculationType: 'algebraic',
      totalTime: trajectory.totalTime,
      isBoundary: trajectory.isBoundary,
      direction: trajectory.direction,
      boundaryDistance: trajectory.boundaryDistance,
      stopDistance: this.calculateDistance(0, -pitchOffset, trajectory.stopPoint.x, trajectory.stopPoint.y),
      bouncePoint: trajectory.bouncePoint ? {
        distance: this.calculateDistance(0, -pitchOffset, trajectory.bouncePoint.x, trajectory.bouncePoint.y),
        time: trajectory.bouncePoint.time
      } : null
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

  /**
   * Get boundary cache for all directions (for debugging)
   * @returns {Object} Boundary cache object
   */
  getBoundaryCache() {
    return { ...boundaryCache };
  }
}

export default BallTrajectoryPhysics;