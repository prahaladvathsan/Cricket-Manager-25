/**
 * @file CustomClubManager.js
 * @description Manages custom club cosmetics (badge, icon, banner, colors, names)
 * stored outside game saves. Uses a dedicated IndexedDB key so customizations
 * persist across all saves. Highest-priority overlay in the layered Skins model
 * (defaults < active skin < custom-clubs).
 */

import { get, set } from 'idb-keyval';
import { sanitizeSvgDataUrl } from './sanitizeSvg';

const STORAGE_KEY = 'cm25-custom-clubs';

/**
 * @typedef {Object} CustomClub
 * @property {string} teamId
 * @property {string|null} badgeDataUrl
 * @property {string|null} iconDataUrl
 * @property {string|null} bannerDataUrl
 * @property {string} primaryColor
 * @property {string} secondaryColor
 * @property {string|null} teamName
 * @property {string|null} shortName
 * @property {string|null} coachName
 * @property {string|null} homeVenue
 * @property {string} createdAt
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

export async function saveCustomClub(customClub) {
  if (!customClub?.teamId) throw new Error('customClub.teamId is required');

  const existing = await loadAll();
  existing[customClub.teamId] = {
    ...customClub,
    createdAt: customClub.createdAt || new Date().toISOString()
  };

  await set(STORAGE_KEY, existing);
}

export async function getCustomClub(teamId) {
  const all = await loadAll();
  return all[teamId] || null;
}

export async function getCustomClubs() {
  return loadAll();
}

export async function deleteCustomClub(teamId) {
  const existing = await loadAll();
  delete existing[teamId];
  await set(STORAGE_KEY, existing);
}

/**
 * Apply custom club overlay to a team object (pure merger).
 * Used as the highest-priority layer; called after applying any active skin.
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
    customBadgeDataUrl: customClub.badgeDataUrl || team.customBadgeDataUrl || null,
    customIconDataUrl: customClub.iconDataUrl || team.customIconDataUrl || null,
    customBannerDataUrl: customClub.bannerDataUrl || team.customBannerDataUrl || null,
    name: customClub.teamName || team.name,
    shortName: customClub.shortName || team.shortName,
    coachName: customClub.coachName || team.coachName,
    homeVenue: customClub.homeVenue || team.homeVenue,
    hasCustomization: true
  };
}

const ASSET_KIND_LIMITS = {
  badge: 500 * 1024,
  icon: 250 * 1024,
  banner: 500 * 1024,
  wallpaper: 1 * 1024 * 1024,
  logo: 500 * 1024
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

/**
 * Validate an image file against a per-kind size limit.
 * @param {File} file
 * @param {'badge'|'icon'|'banner'|'wallpaper'|'logo'} kind
 * @returns {{valid: boolean, error?: string}}
 */
export function validateAssetFile(file, kind = 'badge') {
  if (!file) return { valid: false, error: 'No file selected' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only PNG, JPG, SVG, or WebP files are supported' };
  }
  const limit = ASSET_KIND_LIMITS[kind] ?? ASSET_KIND_LIMITS.badge;
  if (file.size > limit) {
    return { valid: false, error: `File size must be under ${(limit / 1024).toFixed(0)}KB for ${kind}` };
  }
  return { valid: true };
}

/** Backwards-compat wrapper used by existing call sites. */
export function validateBadgeFile(file) {
  return validateAssetFile(file, 'badge');
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Read a file as data URL and reject if SVG contains script vectors.
 * @param {File} file
 * @param {'badge'|'icon'|'banner'|'wallpaper'|'logo'} kind
 * @returns {Promise<{dataUrl?: string, error?: string}>}
 */
export async function fileToSafeDataUrl(file, kind = 'badge') {
  const validation = validateAssetFile(file, kind);
  if (!validation.valid) return { error: validation.error };
  const dataUrl = await fileToDataUrl(file);
  const sanitize = sanitizeSvgDataUrl(dataUrl);
  if (!sanitize.valid) return { error: sanitize.reason };
  return { dataUrl };
}

export default {
  saveCustomClub,
  getCustomClub,
  getCustomClubs,
  deleteCustomClub,
  applyCustomClubToTeam,
  validateBadgeFile,
  validateAssetFile,
  fileToDataUrl,
  fileToSafeDataUrl
};
