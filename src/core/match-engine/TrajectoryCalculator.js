/**
 * @file TrajectoryCalculator.js
 * @description Simplified trajectory calculation based on contact and mentality
 * @module core/match-engine/TrajectoryCalculator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mentalityConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/config/mentality-config.json'), 'utf8'));

/**
 * @typedef {Object} TrajectoryResult
 * @property {string} shotType - Shot type (aerial, grounded)
 * @property {number} shotSpeed - Shot speed (0-100)
 * @property {number} direction - Shot direction in degrees (0-360) - dummy implementation
 * @property {boolean} isWicket - Whether this results in wicket
 * @property {string} wicketType - Type of wicket if applicable
 * @property {Object} breakdown - Detailed calculation breakdown
 */

/**
 * @typedef {Object} TrajectoryContext
 * @property {Object} contactResult - Result from ContactCalculator
 * @property {Object} striker - Striking batsman
 * @property {Object} bowler - Current bowler
 * @property {string} battingMentality - Batting mentality (attacking, neutral, defensive)
 * @property {string} bowlingMentality - Bowling mentality (attacking, neutral, defensive)
 */

class TrajectoryCalculator {
  constructor() {
    // Load configuration
    this.battingConfig = mentalityConfig.batting;
    this.bowlingConfig = mentalityConfig.bowling;
    this.edgeConfig = mentalityConfig.edgeBehavior;
    this.wicketConfig = mentalityConfig.wicketTypes;
  }

  /**
   * Calculate shot type and trajectory
   * @param {TrajectoryContext} context - Trajectory context
   * @returns {TrajectoryResult} Trajectory result
   */
  calculateTrajectory(context) {
    const {
      contactResult,
      striker,
      bowler,
      battingMentality,
      bowlingMentality,
      wicketKeeper,
      fieldingTeam,
      ballPhysics,
      fielderMovement
    } = context;

    // Handle different contact types
    switch (contactResult.type) {
      case 'MISSED':
        return this.handleMissedBall(contactResult, bowlingMentality);

      case 'EDGED':
        return this.handleEdgedBall(contactResult, striker, bowler, wicketKeeper);

      case 'MIDDLED':
        return this.handleMiddledBall(contactResult, striker, battingMentality, fieldingTeam, ballPhysics, fielderMovement);

      default:
        return this.getDefaultResult();
    }
  }

  /**
   * Handle missed ball - determine wicket probability based on Contact Quality
   * @param {Object} contactResult - Contact result
   * @param {string} bowlingMentality - Bowling mentality
   * @returns {TrajectoryResult} Trajectory result
   */
  handleMissedBall(contactResult, bowlingMentality) {
    const { contactQuality } = contactResult;
    const wicketConfig = this.wicketConfig.wicketProbability;

    // Base wicket probability from config
    let wicketProbability = wicketConfig.base;

    // Adjust based on Contact Quality
    if (contactQuality > 0) {
      // Better contact reduces wicket chance
      const adjustment = contactQuality / wicketConfig.contactQualityAdjustment.positive.divisor;
      wicketProbability = Math.max(0, wicketProbability - adjustment / wicketConfig.adjustmentScale);
    } else {
      // Poor contact increases wicket chance
      const adjustment = Math.abs(contactQuality) / wicketConfig.contactQualityAdjustment.negative.divisor;
      wicketProbability = Math.min(wicketConfig.maxProbability, wicketProbability + adjustment / wicketConfig.adjustmentScale);
    }

    const isWicket = Math.random() < wicketProbability;

    return {
      shotType: 'missed',
      shotSpeed: 0,
      direction: 0,
      isWicket,
      wicketType: isWicket ? this.determineWicketType() : null,
      breakdown: {
        contactType: 'MISSED',
        bowlingMentality,
        contactQuality,
        wicketProbability,
        result: isWicket ? 'wicket' : 'dot'
      }
    };
  }

  /**
   * Handle edged ball - enhanced with wicketkeeper catching logic
   * @param {Object} contactResult - Contact result
   * @param {Object} striker - Striking batsman
   * @param {Object} bowler - Current bowler
   * @param {Object} wicketKeeper - Wicket keeper for catch calculation
   * @returns {TrajectoryResult} Trajectory result
   */
  handleEdgedBall(contactResult, striker, bowler, wicketKeeper) {
    const { contactQuality } = contactResult;

    if (contactQuality < this.edgeConfig.contactQualityThreshold) {
      // Poor contact - edge behavior
      const carriesChance = this.edgeConfig.poorContact.carriesChance;

      if (Math.random() < carriesChance) {
        // Carries to keeper - calculate catch probability
        const catchProbability = this.calculateKeeperCatchProbability(wicketKeeper);
        const isCaught = Math.random() < catchProbability;

        return {
          shotType: 'caught_behind',
          shotSpeed: 0,
          direction: 180, // Behind wicket
          isWicket: isCaught,
          wicketType: isCaught ? 'caught' : null,
          breakdown: {
            contactType: 'EDGED',
            contactQuality,
            edgeType: 'carries_to_keeper',
            keeperInvolved: true,
            catchProbability,
            result: isCaught ? 'caught' : 'dropped'
          }
        };
      } else {
        // Falls short or wide - DOT ball
        return {
          shotType: 'missed',
          shotSpeed: 0,
          direction: 0,
          isWicket: false,
          wicketType: null,
          breakdown: {
            contactType: 'EDGED',
            contactQuality,
            edgeType: 'falls_short',
            result: 'dot'
          }
        };
      }
    } else {
      // Better contact - assign random direction and create aerial shot
      const directions = this.edgeConfig.betterContact.slipCordonDirections;
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const baseSpeed = this.edgeConfig.betterContact.baseSpeed;
      const speed = baseSpeed + contactQuality * this.edgeConfig.betterContact.speedBonus;
      const limits = this.edgeConfig.betterContact.speedLimits;

      return {
        shotType: 'aerial',
        shotSpeed: Math.max(limits.min, Math.min(limits.max, speed)),
        direction,
        isWicket: false,
        wicketType: null,
        breakdown: {
          contactType: 'EDGED',
          contactQuality,
          edgeType: 'aerial_to_fielding',
          calculatedSpeed: speed,
          slipCordonDirection: direction
        }
      };
    }
  }

  /**
   * Handle middled ball - determine shot type based on batting mentality
   * @param {Object} contactResult - Contact result
   * @param {Object} striker - Striking batsman
   * @param {string} battingMentality - Batting mentality
   * @param {Object} fieldingTeam - Fielding team (optional, for direction calculation)
   * @param {Object} ballPhysics - Ball physics calculator (optional)
   * @param {Object} fielderMovement - Fielder movement calculator (optional)
   * @returns {TrajectoryResult} Trajectory result
   */
  handleMiddledBall(contactResult, striker, battingMentality, fieldingTeam = null, ballPhysics = null, fielderMovement = null) {
    const { contactQuality } = contactResult;

    // Determine shot type (aerial/grounded) based on batting mentality
    const mentalityConfig = this.battingConfig[battingMentality] || this.battingConfig.neutral;
    const probabilities = mentalityConfig.shotType;
    const isAerial = Math.random() < probabilities.aerial;
    const shotType = isAerial ? 'aerial' : 'grounded';

    // Calculate shot speed using new formula
    const shotPower = striker.attributes?.batting?.shotPower || 10;
    const speed = this.calculateShotSpeedWithContactQuality(contactQuality, shotPower);

    // Calculate direction using simplified algebraic logic if components available
    let directionResult;
    if (fieldingTeam && ballPhysics && fielderMovement) {
      directionResult = this.calculateShotDirection(striker, fieldingTeam, ballPhysics, fielderMovement, speed, shotType);
    } else {
      // Fallback to simple random direction
      directionResult = {
        direction: Math.floor(Math.random() * 360),
        expectedDistance: -999, // Unknown
        breakdown: { fallback: true }
      };
    }

    return {
      shotType,
      shotSpeed: speed,
      direction: directionResult.direction,
      expectedDistance: directionResult.expectedDistance,
      isWicket: false,
      wicketType: null,
      breakdown: {
        contactType: 'MIDDLED',
        battingMentality,
        contactQuality,
        shotPower,
        mentalityProbabilities: probabilities,
        calculatedSpeed: speed,
        directionSelection: directionResult.breakdown
      }
    };
  }

  /**
   * Calculate shot speed using Contact Quality and shot power
   * @param {number} contactQuality - Contact Quality score (-97 to +97)
   * @param {number} shotPower - Batsman's shot power attribute (1-20)
   * @returns {number} Shot speed (20-120, clamped)
   */
  calculateShotSpeedWithContactQuality(contactQuality, shotPower) {
    const speedConfig = this.wicketConfig.shotSpeedCalculation;

    // Base Speed = configurable values
    const baseSpeed = speedConfig.baseSpeed +
                     (contactQuality * speedConfig.contactQualityMultiplier) +
                     (shotPower * speedConfig.shotPowerMultiplier);

    // Clamp to configurable range
    return Math.max(speedConfig.speedLimits.min,
                   Math.min(speedConfig.speedLimits.max, Math.round(baseSpeed)));
  }

  /**
   * Calculate wicketkeeper catch probability
   * @param {Object} wicketKeeper - Wicket keeper object
   * @returns {number} Catch probability (0-1)
   */
  calculateKeeperCatchProbability(wicketKeeper) {
    const catchingAttribute = wicketKeeper?.attributes?.fielding?.catching || 10;

    // Simple calculation: catching attribute / 20
    return Math.min(1, Math.max(0, catchingAttribute / 20));
  }

  /**
   * Calculate shot direction using simplified angular gap analysis
   * @param {Object} striker - Striking batsman
   * @param {Object} fieldingTeam - Fielding team with positioned fielders
   * @param {Object} ballPhysics - Ball physics calculator
   * @param {Object} fielderMovement - Fielder movement calculator
   * @param {number} shotSpeed - Calculated shot speed
   * @param {string} shotType - Shot type (aerial/grounded)
   * @returns {{direction: number, expectedDistance: number, breakdown: Object}} Direction and analysis
   */
  calculateShotDirection(striker, fieldingTeam, ballPhysics, fielderMovement, shotSpeed, shotType) {
    const range360 = striker.attributes?.batting?.range360 || 10;
    const placement = striker.attributes?.batting?.placement || 10;

    // Step 1: Roll 1-{range360} to determine number of possible directions
    const numDirections = Math.floor(Math.random() * range360) + 1;

    // Step 2: Generate random directions
    const possibleDirections = [];
    for (let i = 0; i < numDirections; i++) {
      possibleDirections.push(Math.floor(Math.random() * 360) + 1);
    }

    // Step 3: Use simplified evaluation based on shot type
    let directionEvaluations;
    if (shotType === 'grounded') {
      directionEvaluations = this.evaluateDirectionsWithAngularGaps(
        possibleDirections,
        fieldingTeam.fieldingPositions || [],
        ballPhysics
      );
    } else {
      directionEvaluations = this.evaluateDirectionsWithDistanceSeparation(
        possibleDirections,
        shotSpeed,
        fieldingTeam.fieldingPositions || [],
        ballPhysics
      );
    }

    // Step 4: Use placement attribute to choose direction
    // Roll d20 vs placement to decide best vs 2nd best
    const placementRoll = Math.floor(Math.random() * 20) + 1;
    const useBestDirection = placementRoll <= placement;

    let chosenEvaluation;
    if (useBestDirection || directionEvaluations.length < 2) {
      chosenEvaluation = directionEvaluations[0]; // Best direction
    } else {
      chosenEvaluation = directionEvaluations[1]; // 2nd best direction
    }

    return {
      direction: chosenEvaluation.direction,
      expectedDistance: chosenEvaluation.expectedGap || chosenEvaluation.expectedDistance,
      breakdown: {
        range360,
        placement,
        numDirections,
        possibleDirections,
        placementRoll,
        usedBestDirection: useBestDirection,
        shotType,
        allEvaluations: directionEvaluations.slice(0, 5) // Limit breakdown size
      }
    };
  }

  /**
   * Evaluate directions using angular gaps from fielders (for grounded shots)
   * @param {number[]} directions - Array of possible shot directions
   * @param {Object[]} fielderPositions - Fielder positions
   * @param {Object} ballPhysics - Ball physics calculator
   * @returns {Object[]} Sorted evaluations by angular gap
   */
  evaluateDirectionsWithAngularGaps(directions, fielderPositions, ballPhysics) {
    const evaluations = [];

    for (const direction of directions) {
      let minAngularGap = 360; // Maximum possible gap

      // Calculate minimum angular separation from all fielders
      for (const fielder of fielderPositions) {
        // Convert fielder position to polar coordinates relative to striker
        const fielderAngle = this.calculateAngleFromStriker(fielder.x, fielder.y);
        const angularGap = this.calculateAngularGap(direction, fielderAngle);
        minAngularGap = Math.min(minAngularGap, angularGap);
      }

      evaluations.push({
        direction: direction,
        expectedGap: minAngularGap,
        isBoundary: ballPhysics.getBoundaryDistance(direction) < 90 // Simplified boundary check
      });
    }

    // Sort by angular gap (descending - larger gaps are better)
    return evaluations.sort((a, b) => b.expectedGap - a.expectedGap);
  }

  /**
   * Evaluate directions using distance separation at bounce point (for aerial shots)
   * @param {number[]} directions - Array of possible shot directions
   * @param {number} shotSpeed - Shot speed
   * @param {Object[]} fielderPositions - Fielder positions
   * @param {Object} ballPhysics - Ball physics calculator
   * @returns {Object[]} Sorted evaluations by distance separation
   */
  evaluateDirectionsWithDistanceSeparation(directions, shotSpeed, fielderPositions, ballPhysics) {
    const evaluations = [];

    for (const direction of directions) {
      // Calculate bounce point using algebraic formula
      const boundaryDistance = ballPhysics.getBoundaryDistance(direction);
      const gravity = 10; // From config
      const bounceDistance = Math.min(boundaryDistance, shotSpeed * shotSpeed / gravity);

      const directionRadians = direction * Math.PI / 180;
      const bounceX = bounceDistance * Math.cos(directionRadians);
      const bounceY = -11 + bounceDistance * Math.sin(directionRadians); // Account for striker offset

      let minDistance = Infinity;

      // Find minimum distance from bounce point to any fielder
      for (const fielder of fielderPositions) {
        const distance = Math.sqrt(
          (bounceX - fielder.x) ** 2 + (bounceY - fielder.y) ** 2
        );
        minDistance = Math.min(minDistance, distance);
      }

      evaluations.push({
        direction: direction,
        expectedDistance: minDistance,
        isBoundary: bounceDistance >= boundaryDistance,
        bounceDistance: bounceDistance
      });
    }

    // Sort by distance separation (descending - larger distances are better)
    return evaluations.sort((a, b) => b.expectedDistance - a.expectedDistance);
  }

  /**
   * Calculate angle from striker position to fielder
   * @param {number} x - Fielder X coordinate
   * @param {number} y - Fielder Y coordinate
   * @returns {number} Angle in degrees (0-360)
   */
  calculateAngleFromStriker(x, y) {
    // Striker is at (0, -11), fielder is at (x, y)
    const dx = x - 0;
    const dy = y - (-11);
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Normalize to 0-360 range
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * Calculate angular gap between shot direction and fielder angle
   * @param {number} shotAngle - Shot direction in degrees
   * @param {number} fielderAngle - Fielder angle in degrees
   * @returns {number} Angular gap (shortest path)
   */
  calculateAngularGap(shotAngle, fielderAngle) {
    const diff = Math.abs(shotAngle - fielderAngle);
    return Math.min(diff, 360 - diff);
  }

  /**
   * Determine wicket type for missed balls
   * @returns {string} Wicket type
   */
  determineWicketType() {
    // Use configured wicket types and probabilities
    const wicketTypes = this.wicketConfig.missed;
    const randomIndex = Math.floor(Math.random() * wicketTypes.length);
    return wicketTypes[randomIndex];
  }

  /**
   * Get dummy direction (placeholder for future direction system)
   * @returns {number} Random direction
   */
  getDummyDirection() {
    return Math.round(Math.random() * 360);
  }

  /**
   * Get default result for error cases
   * @returns {TrajectoryResult} Default result
   */
  getDefaultResult() {
    return {
      shotType: 'grounded',
      shotSpeed: 30,
      direction: 0,
      isWicket: false,
      wicketType: null,
      breakdown: {
        error: 'Unknown contact type',
        defaultResult: true
      }
    };
  }
}

export default TrajectoryCalculator;