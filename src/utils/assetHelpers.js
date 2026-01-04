/**
 * @file assetHelpers.js
 * @description Centralized asset path helpers for consistent asset loading
 */

// WebP support detection (cached result)
let webpSupport = null;

/**
 * Detect WebP support in browser
 * @returns {boolean} True if browser supports WebP format
 */
export const supportsWebP = () => {
  if (webpSupport !== null) return webpSupport;

  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } else {
    webpSupport = false;
  }
  return webpSupport;
};

/**
 * Get team badge path (circular badge with team name)
 * @param {string} teamId - Team ID (e.g., 't_chennai')
 * @returns {string} Path to team badge PNG
 */
export const getTeamBadge = (teamId) => {
  return `/assets/teams/badges/${teamId}-badge.png`;
};

/**
 * Get team icon path (simplified mascot only, no text)
 * @param {string} teamId - Team ID (e.g., 't_london')
 * @returns {string} Path to team icon PNG
 */
export const getTeamIcon = (teamId) => {
  return `/assets/teams/icons/${teamId}-icon.png`;
};

/**
 * Get team banner path (wide header banner)
 * @param {string} teamId - Team ID (e.g., 't_sydney')
 * @returns {string} Path to team banner SVG
 */
export const getTeamBanner = (teamId) => {
  return `/assets/teams/banners/${teamId}-banner.svg`;
};

/**
 * Get game logo path (WebP with PNG fallback)
 * @param {('light'|'dark')} variant - Logo variant (default: 'light')
 * @returns {string} Path to game logo (WebP if supported, PNG otherwise)
 */
export const getGameLogo = (variant = 'light') => {
  if (supportsWebP()) {
    return `/assets/branding/cm25-logo-${variant}.webp`;
  }
  return `/assets/branding/cm25-logo-${variant}.png`;
};

/**
 * Get game icon path (icon only, no text) - WebP with PNG fallback
 * @param {('light'|'dark')} variant - Icon variant (default: 'light')
 * @returns {string} Path to game icon (WebP if supported, PNG otherwise)
 */
export const getGameIcon = (variant = 'light') => {
  if (supportsWebP()) {
    return `/assets/branding/cm25-icon-${variant}.webp`;
  }
  return `/assets/branding/cm25-icon-${variant}.png`;
};

/**
 * Get team asset based on variant
 * @param {string} teamId - Team ID
 * @param {('badge'|'icon'|'banner')} variant - Asset variant (default: 'badge')
 * @returns {string} Path to team asset
 */
export const getTeamAsset = (teamId, variant = 'badge') => {
  switch (variant) {
    case 'icon':
      return getTeamIcon(teamId);
    case 'banner':
      return getTeamBanner(teamId);
    case 'badge':
    default:
      return getTeamBadge(teamId);
  }
};
