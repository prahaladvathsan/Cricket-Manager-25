/**
 * @file FieldPositioningSystem.js
 * @description Manages field positioning and formations for 2D fielding simulation
 * @module core/match-engine/FieldPositioningSystem
 */

import fieldConfig from '../../../data/config/field-positioning-config.json';

/**
 * @typedef {Object} FielderPosition
 * @property {string} name - Position name
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} angle - Angle from batsman (0-360)
 * @property {number} distance - Distance from batsman
 * @property {Object} fielder - Player object assigned to this position
 */

/**
 * @typedef {Object} Formation
 * @property {string} description - Formation description
 * @property {FielderPosition[]} positions - Array of fielder positions
 */

class FieldPositioningSystem {
  constructor() {
    this.fieldDimensions = fieldConfig.fieldDimensions;
    this.formations = fieldConfig.formations;
    this.currentFormation = 'neutral';
    this.fieldingPositions = [];

    // console.log('✅ FieldPositioningSystem initialized'); // Suppressed for cleaner output
  }

  /**
   * Set field formation and assign fielders
   * @param {string} formationType - Formation type (attacking, neutral, defensive)
   * @param {Object[]} fielders - Array of 11 fielders (including bowler and keeper)
   * @returns {FielderPosition[]} Positioned fielders
   */
  setFormation(formationType, fielders) {
    if (!this.formations[formationType]) {
      throw new Error(`Unknown formation type: ${formationType}`);
    }

    if (fielders.length !== 11) {
      throw new Error(`Expected 11 fielders, got ${fielders.length}`);
    }

    this.currentFormation = formationType;
    const formation = this.formations[formationType];

    this.fieldingPositions = formation.positions.map((position, index) => ({
      ...position,
      fielder: fielders[index] || null
    }));

    return this.fieldingPositions;
  }

  /**
   * Get current field positions
   * @returns {FielderPosition[]} Current fielding positions
   */
  getCurrentPositions() {
    return this.fieldingPositions;
  }

  /**
   * Get fielder closest to a specific coordinate
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   * @returns {FielderPosition|null} Closest fielder position
   */
  getClosestFielder(x, y) {
    if (this.fieldingPositions.length === 0) {
      return null;
    }

    let closestFielder = null;
    let minDistance = Infinity;

    for (const position of this.fieldingPositions) {
      const distance = this.calculateDistance(position.x, position.y, x, y);
      if (distance < minDistance) {
        minDistance = distance;
        closestFielder = { ...position, distance };
      }
    }

    return closestFielder;
  }

  /**
   * Get all fielders within a certain radius of coordinates
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   * @param {number} radius - Search radius
   * @returns {FielderPosition[]} Fielders within radius
   */
  getFieldersInRadius(x, y, radius) {
    return this.fieldingPositions
      .map(position => ({
        ...position,
        distance: this.calculateDistance(position.x, position.y, x, y)
      }))
      .filter(position => position.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate straight line distance between two points
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
   * Convert angle to coordinates from batsman position
   * @param {number} angle - Angle in degrees (0-360)
   * @param {number} distance - Distance from batsman
   * @returns {{x: number, y: number}} Coordinates
   */
  angleToCoordinates(angle, distance) {
    const radians = (angle - 90) * Math.PI / 180; // Convert to radians, adjust for cricket field orientation
    return {
      x: distance * Math.cos(radians),
      y: distance * Math.sin(radians)
    };
  }

  /**
   * Convert coordinates to angle from batsman position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Angle in degrees (0-360)
   */
  coordinatesToAngle(x, y) {
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90; // Adjust for cricket field orientation
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * Check if coordinates are within boundary
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if within boundary
   */
  isWithinBoundary(x, y) {
    const distance = this.calculateDistance(0, 0, x, y);
    return distance <= this.fieldDimensions.boundaryRadius;
  }

  /**
   * Get boundary distance in a specific direction
   * @param {number} angle - Direction angle (0-360)
   * @returns {number} Distance to boundary
   */
  getBoundaryDistance(angle) {
    // For circular boundary, distance is constant
    return this.fieldDimensions.boundaryRadius;
  }

  /**
   * Move fielder to new position (for tactical changes)
   * @param {number} fielderIndex - Index of fielder to move
   * @param {number} x - New X coordinate
   * @param {number} y - New Y coordinate
   * @returns {FielderPosition} Updated position
   */
  moveFielder(fielderIndex, x, y) {
    if (fielderIndex < 0 || fielderIndex >= this.fieldingPositions.length) {
      throw new Error(`Invalid fielder index: ${fielderIndex}`);
    }

    this.fieldingPositions[fielderIndex].x = x;
    this.fieldingPositions[fielderIndex].y = y;
    this.fieldingPositions[fielderIndex].angle = this.coordinatesToAngle(x, y);
    this.fieldingPositions[fielderIndex].distance = this.calculateDistance(0, 0, x, y);

    return this.fieldingPositions[fielderIndex];
  }

  /**
   * Get formation information
   * @param {string} formationType - Formation type
   * @returns {Formation} Formation details
   */
  getFormationInfo(formationType = null) {
    const type = formationType || this.currentFormation;
    return this.formations[type];
  }

  /**
   * Get field statistics
   * @returns {Object} Field statistics
   */
  getFieldStatistics() {
    return {
      formation: this.currentFormation,
      fielderCount: this.fieldingPositions.length,
      boundaryRadius: this.fieldDimensions.boundaryRadius,
      averageFieldingDistance: this.getAverageFieldingDistance(),
      fieldCoverage: this.calculateFieldCoverage()
    };
  }

  /**
   * Calculate average distance of fielders from batsman
   * @returns {number} Average distance
   */
  getAverageFieldingDistance() {
    if (this.fieldingPositions.length === 0) return 0;

    const totalDistance = this.fieldingPositions.reduce((sum, position) => {
      return sum + this.calculateDistance(0, 0, position.x, position.y);
    }, 0);

    return totalDistance / this.fieldingPositions.length;
  }

  /**
   * Calculate approximate field coverage
   * @returns {number} Coverage percentage (0-100)
   */
  calculateFieldCoverage() {
    // Simple calculation based on fielder spread
    const angles = this.fieldingPositions.map(pos => pos.angle).sort((a, b) => a - b);
    let maxGap = 0;

    for (let i = 0; i < angles.length; i++) {
      const currentAngle = angles[i];
      const nextAngle = angles[(i + 1) % angles.length];
      const gap = nextAngle > currentAngle ? nextAngle - currentAngle : (360 - currentAngle) + nextAngle;
      maxGap = Math.max(maxGap, gap);
    }

    return Math.max(0, 100 - (maxGap / 3.6)); // Convert max gap to coverage percentage
  }
}

export default FieldPositioningSystem;