/**
 * @file fieldingFormationResolver.js
 * @description Utility to resolve field formation position IDs to full position data
 *
 * This module bridges the two data files:
 * - field-formations-config.json: Contains formation templates with position IDs
 * - fielding-positions-complete.json: Contains full position data (coordinates, metadata)
 *
 * Usage:
 * import { getFormationWithPositions, getPositionData } from '@/utils/fieldingFormationResolver'
 *
 * const formation = getFormationWithPositions('attacking_pace_cordon')
 * // Returns formation with full position data instead of just IDs
 */

import formationsConfig from '../data/config/field-formations-config.json';
import positionsDatabase from '../data/config/fielding-positions-complete.json';

/**
 * Create a lookup map for fast position data access
 * Maps position ID -> full position data
 */
const positionLookup = {};
positionsDatabase.positions.forEach(pos => {
  positionLookup[pos.id] = pos;
});

/**
 * Get full position data for a position ID
 * @param {string} positionId - Position ID (e.g., 'first_slip', 'wicketkeeper')
 * @returns {Object|null} Full position data with coordinates and metadata
 */
export function getPositionData(positionId) {
  const position = positionLookup[positionId];

  if (!position) {
    console.warn(`[fieldingFormationResolver] Position ID not found: ${positionId}`);
    return null;
  }

  return position;
}

/**
 * Get formation with resolved position data
 * Transforms positionIds array into positions array with full data
 *
 * @param {string} formationId - Formation ID (e.g., 'attacking_pace_cordon')
 * @returns {Object|null} Formation object with resolved positions
 *
 * Example return:
 * {
 *   id: 'attacking_pace_cordon',
 *   name: 'Attacking: Classic Pace Cordon',
 *   formationStyle: 'attacking',
 *   description: 'Aggressive new ball field...',
 *   positionIds: ['bowler', 'wicketkeeper', ...],
 *   positions: [
 *     { id: 'bowler', name: 'Bowler', x: 0, y: -12, ... },
 *     { id: 'wicketkeeper', name: 'Wicketkeeper', x: 0, y: 22, ... },
 *     ...
 *   ]
 * }
 */
export function getFormationWithPositions(formationId) {
  const formation = formationsConfig.formations[formationId];

  if (!formation) {
    console.warn(`[fieldingFormationResolver] Formation ID not found: ${formationId}`);
    return null;
  }

  // Resolve all position IDs to full position data
  const positions = formation.positionIds
    .map(posId => getPositionData(posId))
    .filter(pos => pos !== null); // Remove any unresolved positions

  // Return formation with both positionIds (for reference) and resolved positions
  return {
    ...formation,
    positions
  };
}

/**
 * Get all formations with resolved positions
 * Useful for components that need to display all available formations
 *
 * @returns {Object} Object mapping formation IDs to formations with resolved positions
 */
export function getAllFormationsWithPositions() {
  const resolvedFormations = {};

  Object.keys(formationsConfig.formations).forEach(formationId => {
    resolvedFormations[formationId] = getFormationWithPositions(formationId);
  });

  return resolvedFormations;
}

/**
 * Get field dimensions from the positions database (single source of truth)
 * @returns {Object} Field dimensions
 */
export function getFieldDimensions() {
  return positionsDatabase.fieldDimensions;
}

/**
 * Validate that all position IDs in formations exist in the positions database
 * Useful for testing/validation
 *
 * @returns {Object} Validation result with any missing positions
 */
export function validateFormations() {
  const issues = [];

  Object.entries(formationsConfig.formations).forEach(([formationId, formation]) => {
    const missingPositions = formation.positionIds.filter(
      posId => !positionLookup[posId]
    );

    if (missingPositions.length > 0) {
      issues.push({
        formationId,
        formationName: formation.name,
        missingPositions
      });
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}

// Export the raw configs for cases where components need them
export { formationsConfig, positionsDatabase };
