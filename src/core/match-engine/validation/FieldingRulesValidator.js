/**
 * @file FieldingRulesValidator.js
 * @description T20 cricket fielding rules validation engine
 *
 * Official ICC T20 Rules:
 * - Powerplay (overs 1-6): Max 2 fielders outside 30-yard circle
 * - Post-powerplay (overs 7-20): Max 5 fielders outside circle
 * - Leg side restriction (all overs): Max 5 fielders on leg side
 * - Behind square leg restriction: Max 2 fielders in quadrant behind square leg
 * - No off-side limit
 */

const CIRCLE_RADIUS = 27.43; // 30-yard circle in meters
const POWERPLAY_OVERS = 6;
const MAX_FIELDERS_OUTSIDE_POWERPLAY = 2;
const MAX_FIELDERS_OUTSIDE_POST_POWERPLAY = 5;
const MAX_FIELDERS_LEG_SIDE = 5;
const MAX_FIELDERS_BEHIND_SQUARE_LEG = 2;

/**
 * Calculate distance from striker position
 * Striker is at (0, +strikerOffset) - TOP of screen where keeper stands behind
 * @param {Object} position - Position with x, y coordinates
 * @param {number} strikerOffset - Striker offset from center (default 11m)
 * @returns {number} Distance in meters
 */
function calculateDistanceFromStriker(position, strikerOffset = 11) {
  // Striker is at (0, +strikerOffset) - TOP (positive Y)
  const dx = position.x - 0;
  const dy = position.y - strikerOffset;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if position is outside the 30-yard circle
 * @param {Object} position - Position with x, y coordinates
 * @returns {boolean} True if outside circle
 */
export function isOutsideCircle(position) {
  const distance = calculateDistanceFromStriker(position);
  return distance > CIRCLE_RADIUS;
}

/**
 * Check if position is on the leg side
 * For right-handed batter: x > 0 is leg side
 * @param {Object} position - Position with x, y coordinates
 * @returns {boolean} True if on leg side
 */
export function isLegSide(position) {
  return position.x > 0;
}

/**
 * Check if position is behind square leg
 * Behind square leg quadrant: leg side (x > 0) AND behind square (y > +11)
 * Striker is at (0, +11) TOP, so behind square means y > +11 (towards keeper at y=+20)
 * @param {Object} position - Position with x, y coordinates
 * @returns {boolean} True if behind square leg
 */
export function isBehindSquareLeg(position) {
  // Square leg is at 90° to the striker (y = +11, striker position at TOP)
  // Behind square means y > +11 (towards the keeper at +20)
  return position.x > 0 && position.y > 11;
}

/**
 * Validate powerplay fielding restrictions (overs 1-6)
 * Rules:
 * - Max 2 fielders outside 30-yard circle
 * - Min 2 fielders in close catching positions (within 15 yards/13.7m)
 * @param {Array} positions - Array of fielding positions with x, y coordinates
 * @returns {Object} Validation result with isValid and violations array
 */
export function validatePowerplayRestrictions(positions) {
  const violations = [];

  // Count fielders outside circle (exclude keeper and bowler)
  const fieldersOutsideCircle = positions.filter((pos, index) => {
    // Position 0 is bowler, position 1 is keeper - exclude them
    if (index === 0 || index === 1) return false;
    return isOutsideCircle(pos);
  });

  if (fieldersOutsideCircle.length > MAX_FIELDERS_OUTSIDE_POWERPLAY) {
    violations.push({
      type: 'POWERPLAY_CIRCLE_VIOLATION',
      severity: 'critical',
      description: `${fieldersOutsideCircle.length} fielders outside circle (max ${MAX_FIELDERS_OUTSIDE_POWERPLAY} allowed in powerplay)`,
      affectedPositions: fieldersOutsideCircle.map((pos, idx) => positions.indexOf(pos)),
      expected: MAX_FIELDERS_OUTSIDE_POWERPLAY,
      actual: fieldersOutsideCircle.length
    });
  }

  // Count close catchers (within 15 yards / 13.7m, excluding keeper and bowler)
  const closeCatchers = positions.filter((pos, index) => {
    if (index === 0 || index === 1) return false;
    const distance = calculateDistanceFromStriker(pos);
    return distance <= 13.7; // 15 yards in meters
  });

  if (closeCatchers.length < 2) {
    violations.push({
      type: 'POWERPLAY_CLOSE_CATCHERS_VIOLATION',
      severity: 'warning',
      description: `Only ${closeCatchers.length} close catchers (min 2 recommended in powerplay)`,
      affectedPositions: closeCatchers.map((pos, idx) => positions.indexOf(pos)),
      expected: 2,
      actual: closeCatchers.length
    });
  }

  return {
    isValid: violations.filter(v => v.severity === 'critical').length === 0,
    violations,
    fieldersOutsideCircle: fieldersOutsideCircle.length,
    closeCatchers: closeCatchers.length
  };
}

/**
 * Validate post-powerplay fielding restrictions (overs 7-20)
 * Rules:
 * - Max 5 fielders outside 30-yard circle
 * @param {Array} positions - Array of fielding positions with x, y coordinates
 * @returns {Object} Validation result with isValid and violations array
 */
export function validatePostPowerplayRestrictions(positions) {
  const violations = [];

  // Count fielders outside circle (exclude keeper and bowler)
  const fieldersOutsideCircle = positions.filter((pos, index) => {
    if (index === 0 || index === 1) return false;
    return isOutsideCircle(pos);
  });

  if (fieldersOutsideCircle.length > MAX_FIELDERS_OUTSIDE_POST_POWERPLAY) {
    violations.push({
      type: 'POST_POWERPLAY_CIRCLE_VIOLATION',
      severity: 'critical',
      description: `${fieldersOutsideCircle.length} fielders outside circle (max ${MAX_FIELDERS_OUTSIDE_POST_POWERPLAY} allowed)`,
      affectedPositions: fieldersOutsideCircle.map((pos, idx) => positions.indexOf(pos)),
      expected: MAX_FIELDERS_OUTSIDE_POST_POWERPLAY,
      actual: fieldersOutsideCircle.length
    });
  }

  return {
    isValid: violations.filter(v => v.severity === 'critical').length === 0,
    violations,
    fieldersOutsideCircle: fieldersOutsideCircle.length
  };
}

/**
 * Validate leg side fielding restrictions (all overs)
 * Rules:
 * - Max 5 fielders on leg side
 * - Max 2 fielders behind square leg
 * @param {Array} positions - Array of fielding positions with x, y coordinates
 * @returns {Object} Validation result with isValid and violations array
 */
export function validateLegSideRestrictions(positions) {
  const violations = [];

  // Count fielders on leg side (exclude bowler - position 0)
  const fieldersLegSide = positions.filter((pos, index) => {
    if (index === 0) return false; // Exclude bowler
    return isLegSide(pos);
  });

  if (fieldersLegSide.length > MAX_FIELDERS_LEG_SIDE) {
    violations.push({
      type: 'LEG_SIDE_VIOLATION',
      severity: 'critical',
      description: `${fieldersLegSide.length} fielders on leg side (max ${MAX_FIELDERS_LEG_SIDE} allowed)`,
      affectedPositions: fieldersLegSide.map((pos, idx) => positions.indexOf(pos)),
      expected: MAX_FIELDERS_LEG_SIDE,
      actual: fieldersLegSide.length
    });
  }

  // Count fielders behind square leg (exclude bowler and keeper)
  const fieldersBehindSquare = positions.filter((pos, index) => {
    if (index === 0 || index === 1) return false;
    return isBehindSquareLeg(pos);
  });

  if (fieldersBehindSquare.length > MAX_FIELDERS_BEHIND_SQUARE_LEG) {
    violations.push({
      type: 'BEHIND_SQUARE_LEG_VIOLATION',
      severity: 'critical',
      description: `${fieldersBehindSquare.length} fielders behind square leg (max ${MAX_FIELDERS_BEHIND_SQUARE_LEG} allowed)`,
      affectedPositions: fieldersBehindSquare.map((pos, idx) => positions.indexOf(pos)),
      expected: MAX_FIELDERS_BEHIND_SQUARE_LEG,
      actual: fieldersBehindSquare.length
    });
  }

  return {
    isValid: violations.filter(v => v.severity === 'critical').length === 0,
    violations,
    fieldersLegSide: fieldersLegSide.length,
    fieldersBehindSquareLeg: fieldersBehindSquare.length
  };
}

/**
 * Validate all T20 fielding restrictions for a given over
 * @param {Array} positions - Array of fielding positions with x, y coordinates
 * @param {number} over - Current over number (1-20)
 * @returns {Object} Comprehensive validation result
 */
export function validateFieldingSetup(positions, over = 1) {
  if (!positions || positions.length !== 11) {
    return {
      isValid: false,
      violations: [{
        type: 'INVALID_SETUP',
        severity: 'critical',
        description: `Invalid fielding setup: ${positions?.length || 0} positions (need exactly 11)`,
        expected: 11,
        actual: positions?.length || 0
      }],
      isPowerplay: over <= POWERPLAY_OVERS
    };
  }

  const isPowerplay = over <= POWERPLAY_OVERS;
  const allViolations = [];

  // 1. Validate circle restrictions (phase-dependent)
  const circleResult = isPowerplay
    ? validatePowerplayRestrictions(positions)
    : validatePostPowerplayRestrictions(positions);
  allViolations.push(...circleResult.violations);

  // 2. Validate leg side restrictions (all overs)
  const legSideResult = validateLegSideRestrictions(positions);
  allViolations.push(...legSideResult.violations);

  // Count critical vs warning violations
  const criticalViolations = allViolations.filter(v => v.severity === 'critical');
  const warningViolations = allViolations.filter(v => v.severity === 'warning');

  return {
    isValid: criticalViolations.length === 0,
    violations: allViolations,
    criticalCount: criticalViolations.length,
    warningCount: warningViolations.length,
    isPowerplay,
    over,
    summary: {
      fieldersOutsideCircle: circleResult.fieldersOutsideCircle,
      maxOutsideCircle: isPowerplay ? MAX_FIELDERS_OUTSIDE_POWERPLAY : MAX_FIELDERS_OUTSIDE_POST_POWERPLAY,
      fieldersLegSide: legSideResult.fieldersLegSide,
      maxLegSide: MAX_FIELDERS_LEG_SIDE,
      fieldersBehindSquareLeg: legSideResult.fieldersBehindSquareLeg,
      maxBehindSquareLeg: MAX_FIELDERS_BEHIND_SQUARE_LEG,
      closeCatchers: circleResult.closeCatchers
    }
  };
}

/**
 * Get human-readable violation messages
 * @param {Array} violations - Array of violation objects
 * @returns {Array} Array of formatted message strings
 */
export function getViolationMessages(violations) {
  return violations.map(v => {
    const prefix = v.severity === 'critical' ? '❌' : '⚠️';
    return `${prefix} ${v.description}`;
  });
}

/**
 * Check if a field setup can be auto-fixed
 * @param {Object} validationResult - Result from validateFieldingSetup
 * @returns {boolean} True if auto-fixable
 */
export function isAutoFixable(validationResult) {
  if (!validationResult.violations || validationResult.violations.length === 0) {
    return false;
  }

  // Only auto-fix circle violations (move fielders in/out)
  // Don't auto-fix leg side violations (requires strategic repositioning)
  const autoFixableTypes = [
    'POWERPLAY_CIRCLE_VIOLATION',
    'POST_POWERPLAY_CIRCLE_VIOLATION'
  ];

  return validationResult.violations.every(v => autoFixableTypes.includes(v.type));
}

/**
 * Constants export for use in UI
 */
export const FIELDING_RULES = {
  CIRCLE_RADIUS,
  POWERPLAY_OVERS,
  MAX_FIELDERS_OUTSIDE_POWERPLAY,
  MAX_FIELDERS_OUTSIDE_POST_POWERPLAY,
  MAX_FIELDERS_LEG_SIDE,
  MAX_FIELDERS_BEHIND_SQUARE_LEG
};

export default {
  validateFieldingSetup,
  validatePowerplayRestrictions,
  validatePostPowerplayRestrictions,
  validateLegSideRestrictions,
  isOutsideCircle,
  isLegSide,
  isBehindSquareLeg,
  getViolationMessages,
  isAutoFixable,
  FIELDING_RULES
};
