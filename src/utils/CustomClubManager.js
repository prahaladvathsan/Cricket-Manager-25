/**
 * @file CustomClubManager.js
 * @description Manages custom club cosmetics (badge, colors) stored outside game saves.
 * Uses a dedicated IndexedDB key so customizations persist across all saves.
 */

import { get, set, del } from 'idb-keyval';

const STORAGE_KEY = 'cm25-custom-clubs';

/**
 * @typedef {Object} CustomClub
 * @property {string} teamId - Which WPL team is customized (e.g. 't_chennai')
 * @property {string|null} badgeDataUrl - base64 PNG/JPG/SVG data URL, or null for default
 * @property {string} primaryColor - Hex color string (e.g. '#FF0000')
 * @property {string} secondaryColor - Hex color string
 * @property {string} createdAt - ISO timestamp
 */

/**
 * Load all custom club data from IndexedDB
 * @returns {Promise<Record<string, CustomClub>>} Map of teamId -> CustomClub
 */
async function loadAll() {
  try {
    const data = await get(STORAGE_KEY);
    return data || {};
  } catch (err) {
    console.error('CustomClubManager: failed to load', err);
    return {};
  }
}

/**
 * Save a custom club configuration
 * @param {CustomClub} customClub
 * @returns {Promise<void>}
 */
export async function saveCustomClub(customClub) {
  if (!customClub?.teamId) throw new Error('customClub.teamId is required');

  const existing = await loadAll();
  existing[customClub.teamId] = {
    ...customClub,
    createdAt: customClub.createdAt || new Date().toISOString()
  };

  await set(STORAGE_KEY, existing);
}

/**
 * Get custom club for a specific team
 * @param {string} teamId
 * @returns {Promise<CustomClub|null>}
 */
export async function getCustomClub(teamId) {
  const all = await loadAll();
  return all[teamId] || null;
}

/**
 * Get all custom clubs
 * @returns {Promise<Record<string, CustomClub>>}
 */
export async function getCustomClubs() {
  return loadAll();
}

/**
 * Delete custom club for a team (resets to default)
 * @param {string} teamId
 * @returns {Promise<void>}
 */
export async function deleteCustomClub(teamId) {
  const existing = await loadAll();
  delete existing[teamId];
  await set(STORAGE_KEY, existing);
}

/**
 * Apply custom club overlay to a team object.
 * Returns a new team object with custom colors/badge merged in.
 * @param {Object} team - Original team object
 * @param {CustomClub|null} customClub - Custom club data, or null
 * @returns {Object} Team with custom cosmetics applied
 */
export function applyCustomClubToTeam(team, customClub) {
  if (!customClub) return team;

  return {
    ...team,
    colors: {
      ...(team.colors || {}),
      primary: customClub.primaryColor || team.colors?.primary,
      secondary: customClub.secondaryColor || team.colors?.secondary
    },
    customBadgeDataUrl: customClub.badgeDataUrl || null,
    hasCustomization: true
  };
}

/**
 * Validate badge file before storage
 * @param {File} file - Image file from input
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBadgeFile(file) {
  const MAX_SIZE = 500 * 1024; // 500KB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

  if (!file) return { valid: false, error: 'No file selected' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only PNG, JPG, and SVG files are supported' };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size must be under 500KB' };
  }
  return { valid: true };
}

/**
 * Read a file as a base64 data URL
 * @param {File} file
 * @returns {Promise<string>} Data URL
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default {
  saveCustomClub,
  getCustomClub,
  getCustomClubs,
  deleteCustomClub,
  applyCustomClubToTeam,
  validateBadgeFile,
  fileToDataUrl
};
