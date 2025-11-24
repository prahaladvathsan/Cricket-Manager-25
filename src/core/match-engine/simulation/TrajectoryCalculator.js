/**
 * @file TrajectoryCalculator.js
 * @description Simplified trajectory calculation based on contact and mentality
 * @module core/match-engine/TrajectoryCalculator
 */

import mentalityConfig from '../../../data/config/mentality-config.json';
import trajectoryConfig from '../../../data/config/trajectory-config.json';
import shotAnglesConfig from '../../../data/config/shot_angles_config.json';
import physicsConfig from '../../../data/config/physics-config.json';

// DEBUG: Set to true to enable trajectory calculation debugging
const DEBUG_TRAJECTORY = false;

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
    this.trajectoryConfig = trajectoryConfig;
    this.shotAngles = shotAnglesConfig; // Ranked list of 362 shot angles

    // Physics configuration - striker position
    this.strikerOffset = physicsConfig.fieldDimensions.strikerOffset; // 10.06m from center on positive Y axis
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
        // Carries to keeper - calculate catch probability based on keeper's catching attribute
        const catchProbability = this.calculateKeeperCatchProbability(wicketKeeper);
        const isCaught = Math.random() < catchProbability;

        return {
          shotType: 'edged_behind',
          shotSpeed: 0,
          direction: 180, // Behind wicket
          isWicket: isCaught,
          wicketType: isCaught ? 'caught_behind' : null,
          breakdown: {
            contactType: 'EDGED',
            contactQuality,
            edgeType: 'carries_to_keeper',
            keeperInvolved: true,
            catchProbability,
            result: isCaught ? 'caught_behind' : 'dropped'
          }
        };
      } else {
        // Falls short or wide - DOT ball
        return {
          shotType: 'edged_behind',
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

    // Calculate shot speed using strength attribute
    const strength = striker.attributes?.physical?.strength || 10;
    const speed = this.calculateShotSpeedWithContactQuality(contactQuality, strength);

    // Calculate direction using simplified algebraic logic if components available
    let directionResult;
    if (fieldingTeam && ballPhysics && fielderMovement) {
      directionResult = this.calculateShotDirection(striker, fieldingTeam, ballPhysics, fielderMovement, speed, shotType);
    } else {
      // Fallback to simple random direction
      if (DEBUG_TRAJECTORY) {
        console.warn('[TrajectoryCalculator] Fallback triggered - missing components:', {
          hasFieldingTeam: !!fieldingTeam,
          fieldingTeamType: typeof fieldingTeam,
          fieldingTeamSquadLength: fieldingTeam?.squad?.length,
          fieldingTeamPositionsLength: fieldingTeam?.fieldingPositions?.length,
          hasBallPhysics: !!ballPhysics,
          ballPhysicsType: typeof ballPhysics,
          hasFielderMovement: !!fielderMovement,
          fielderMovementType: typeof fielderMovement,
          strikerName: striker?.name
        });
      }
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
        strength,
        mentalityProbabilities: probabilities,
        calculatedSpeed: speed,
        directionSelection: directionResult.breakdown
      }
    };
  }

  /**
   * Calculate shot speed using Contact Quality and strength
   * @param {number} contactQuality - Contact Quality score (0-100)
   * @param {number} strength - Batsman's physical strength attribute (0-20)
   * @returns {number} Shot speed in m/s (10-40, clamped)
   */
  calculateShotSpeedWithContactQuality(contactQuality, strength) {
    const speedConfig = this.trajectoryConfig.shotSpeedCalculation;

    // Roll d(strength) - dice with number of sides = strength attribute
    const effectiveStrength = strength >= 1 ? strength : 1;
    const strengthRoll = Math.floor(Math.random() * effectiveStrength) + 1;

    // Base Speed = configurable values
    // Formula: baseSpeed + sqrt(abs(contactQuality)) * sign(contactQuality) * multiplier + (d(strength) * multiplier)
    // Square root gives diminishing returns - can still hit hard with imperfect contact
    // Negative contact quality reduces speed: -sqrt(abs(CQ))
    const contactQualityComponent = contactQuality >= 0
      ? Math.sqrt(contactQuality) * speedConfig.contactQualityMultiplier
      : -Math.sqrt(Math.abs(contactQuality)) * speedConfig.contactQualityMultiplier;

    const baseSpeed = speedConfig.baseSpeed +
                     contactQualityComponent +
                     (Math.sqrt(strengthRoll) * Math.sqrt(20) * speedConfig.shotPowerMultiplier);

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
   * Calculate shot direction using ranked angle list and placement-based selection
   * @param {Object} striker - Striking batsman
   * @param {Object} fieldingTeam - Fielding team with positioned fielders
   * @param {Object} ballPhysics - Ball physics calculator
   * @param {Object} fielderMovement - Fielder movement calculator
   * @param {number} shotSpeed - Calculated shot speed
   * @param {string} shotType - Shot type (aerial/grounded)
   * @returns {{direction: number, expectedDistance: number, breakdown: Object}} Direction and analysis
   */
  calculateShotDirection(striker, fieldingTeam, ballPhysics, fielderMovement, shotSpeed, shotType) {
    // Get attributes and round them (tactics modifiers may create non-integers)
    const range360 = Math.round(striker.attributes?.batting?.range360 || 10);
    const placement = Math.round(striker.attributes?.batting?.placement || 10);

    // Step 1: Calculate size of available directions list
    // n = 18 * range360 attribute
    const availableDirectionsCount = Math.min(18 * range360, this.shotAngles.length);

    // Step 2: Get available directions from ranked list
    const availableDirections = this.shotAngles.slice(0, availableDirectionsCount);

    // Step 3: Randomly choose 20 possible directions from available directions
    const POSSIBLE_DIRECTIONS_COUNT = 20;
    const possibleDirections = [];

    if (availableDirections.length >= POSSIBLE_DIRECTIONS_COUNT) {
      // Randomly sample 20 directions from available directions
      const shuffled = [...availableDirections].sort(() => Math.random() - 0.5);
      possibleDirections.push(...shuffled.slice(0, POSSIBLE_DIRECTIONS_COUNT));
    } else {
      // Use all available directions
      possibleDirections.push(...availableDirections);

      // Add random angles until we have 20
      while (possibleDirections.length < POSSIBLE_DIRECTIONS_COUNT) {
        const randomAngle = Math.floor(Math.random() * 360);
        possibleDirections.push(randomAngle);
      }
    }

    // Step 4: Evaluate all possible directions based on shot type
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

    // Step 5: Use placement attribute directly to determine rank in evaluated list
    // placement=20 → rank 1 (index 0, best), placement=1 → rank 20 (index 19, worst)
    // Formula: rankIndex = 20 - placement
    const rankIndex = 20 - placement; // 0 (placement=20) to 19 (placement=1)

    let chosenEvaluation;
    if (directionEvaluations.length === 0) {
      // Fallback: if all evaluations failed, use a random direction
      console.warn('[TrajectoryCalculator] No valid direction evaluations found, using random fallback');
      chosenEvaluation = {
        direction: Math.floor(Math.random() * 360),
        expectedDistance: -999,
        expectedGap: -999,
        isBoundary: false
      };
    } else if (rankIndex >= 0 && rankIndex < directionEvaluations.length) {
      // Choose direction based on placement-derived rank
      chosenEvaluation = directionEvaluations[rankIndex];
    } else {
      // Safety: if rankIndex is out of bounds, clamp to valid range
      const clampedIndex = Math.max(0, Math.min(directionEvaluations.length - 1, rankIndex));
      chosenEvaluation = directionEvaluations[clampedIndex];
    }

    // Final safety check: ensure chosenEvaluation is valid
    if (!chosenEvaluation || typeof chosenEvaluation.direction === 'undefined') {
      console.warn('[TrajectoryCalculator] Invalid chosenEvaluation, using random fallback');
      chosenEvaluation = {
        direction: Math.floor(Math.random() * 360),
        expectedDistance: -999,
        expectedGap: -999,
        isBoundary: false
      };
    }

    return {
      direction: chosenEvaluation.direction,
      expectedDistance: chosenEvaluation.expectedGap || chosenEvaluation.expectedDistance,
      breakdown: {
        range360,
        placement,
        availableDirectionsCount,
        possibleDirectionsCount: possibleDirections.length,
        possibleDirections: possibleDirections.slice(0, 10), // Limit to first 10 for breakdown
        rankIndex,
        chosenRank: rankIndex + 1, // Human-readable rank (1-20)
        evaluationsCount: directionEvaluations.length,
        shotType,
        allEvaluations: directionEvaluations.slice(0, 5), // Top 5 for breakdown
        fallbackUsed: directionEvaluations.length === 0
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

    // Handle case where there are no fielding positions
    if (!fielderPositions || fielderPositions.length === 0) {
      console.warn('[TrajectoryCalculator] No fielding positions available for angular gap evaluation');
      // Return all directions with maximum gap (no fielders = all directions equally good)
      return directions.map(dir => ({
        direction: dir,
        expectedGap: 360,
        isBoundary: false
      }));
    }

    for (const direction of directions) {
      try {
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
      } catch (error) {
        console.error(`[TrajectoryCalculator] Error evaluating direction ${direction}:`, error.message);
        // Continue with next direction
      }
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

    // Handle case where there are no fielding positions
    if (!fielderPositions || fielderPositions.length === 0) {
      console.warn('[TrajectoryCalculator] No fielding positions available for distance separation evaluation');
      // Return all directions with maximum distance (no fielders = all directions equally good)
      return directions.map(dir => ({
        direction: dir,
        expectedDistance: Infinity,
        isBoundary: false,
        bounceDistance: 0
      }));
    }

    for (const direction of directions) {
      try {
        // Calculate bounce point using algebraic formula
        const boundaryDistance = ballPhysics.getBoundaryDistance(direction);
        const gravity = 10; // From config
        const bounceDistance = Math.min(boundaryDistance, shotSpeed * shotSpeed / gravity);

        const directionRadians = direction * Math.PI / 180;
        const bounceX = bounceDistance * Math.cos(directionRadians);
        const bounceY = this.strikerOffset + bounceDistance * Math.sin(directionRadians); // Striker at (0, +strikerOffset)

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
      } catch (error) {
        console.error(`[TrajectoryCalculator] Error evaluating direction ${direction}:`, error.message);
        // Continue with next direction
      }
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
    // Striker is at (0, strikerOffset) on positive Y axis
    const dx = x - 0;
    const dy = y - this.strikerOffset;
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