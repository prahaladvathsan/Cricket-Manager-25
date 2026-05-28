/**
 * @file assetHelpers.js
 * @description Centralized asset path helpers. Reads teamStore overlays so any
 * custom badge/icon/banner data URLs from the active skin or user tweaks win
 * over the bundled file paths. Global helpers (game logo, wallpaper) read the
 * active skin via a cached snapshot.
 */

import useTeamStore from '../stores/teamStore';

let webpSupport = null;

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

// Cached snapshot of active skin's global section. Refresh via setActiveSkinGlobal().
let activeSkinGlobal = null;

/**
 * Populate the cached global-asset snapshot (called by SkinManager apply flows).
 * @param {{ wallpaperDataUrl?: string|null, gameLogoLightDataUrl?: string|null, gameLogoDarkDataUrl?: string|null } | null} globalSection
 */
export function setActiveSkinGlobal(globalSection) {
  activeSkinGlobal = globalSection || null;
}

export function getActiveSkinGlobal() {
  return activeSkinGlobal;
}

function getTeamObj(teamId) {
  try {
    return useTeamStore.getState().teams?.[teamId] || null;
  } catch {
    return null;
  }
}

/**
 * Get team badge. Returns customBadgeDataUrl from teamStore if set, else file path.
 */
export const getTeamBadge = (teamId) => {
  const t = getTeamObj(teamId);
  if (t?.customBadgeDataUrl) return t.customBadgeDataUrl;
  return `/assets/teams/badges/${teamId}-badge.png`;
};

/**
 * Get team icon. Returns customIconDataUrl from teamStore if set, else file path.
 */
export const getTeamIcon = (teamId) => {
  const t = getTeamObj(teamId);
  if (t?.customIconDataUrl) return t.customIconDataUrl;
  return `/assets/teams/icons/${teamId}-icon.png`;
};

/**
 * Get team banner URL. Returns customBannerDataUrl from teamStore if set,
 * else the bundled WPL banner SVG path.
 */
export const getTeamBanner = (teamId) => {
  const t = getTeamObj(teamId);
  if (t?.customBannerDataUrl) return t.customBannerDataUrl;
  return `/assets/teams/banners/${teamId}-banner.svg`;
};

/**
 * Get a CSS style object for rendering a team banner background.
 * Three modes:
 *   1. customBannerDataUrl present → image background
 *   2. team has any customization (skin or manual) but no custom banner →
 *      primary→secondary gradient (avoids showing stale WPL banner art on a
 *      reskinned team)
 *   3. no customization at all → default WPL banner image
 *
 * Spread into a style prop: `style={{ ...getTeamBannerStyle(id) }}`.
 */
export const getTeamBannerStyle = (teamId) => {
  const t = getTeamObj(teamId);
  if (t?.customBannerDataUrl) {
    return {
      backgroundImage: `url(${t.customBannerDataUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  }
  if (t?.hasCustomization) {
    const primary = t.colors?.primary || '#1a1a2e';
    const secondary = t.colors?.secondary || '#ffffff';
    return {
      backgroundColor: primary,
      backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${primary} 65%, ${secondary}55 100%)`
    };
  }
  return {
    backgroundImage: `url(/assets/teams/banners/${teamId}-banner.svg)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
};

export const getGameLogo = (variant = 'light') => {
  if (activeSkinGlobal) {
    const key = variant === 'dark' ? 'gameLogoDarkDataUrl' : 'gameLogoLightDataUrl';
    if (activeSkinGlobal[key]) return activeSkinGlobal[key];
  }
  if (supportsWebP()) {
    return `/assets/branding/cm25-logo-${variant}.webp`;
  }
  return `/assets/branding/cm25-logo-${variant}.png`;
};

export const getGameIcon = (variant = 'light') => {
  if (supportsWebP()) {
    return `/assets/branding/cm25-icon-${variant}.webp`;
  }
  return `/assets/branding/cm25-icon-${variant}.png`;
};

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

/**
 * Apply wallpaper from the active skin (or revert to default) by setting a
 * CSS custom property on :root. wallpaper.css reads --wallpaper-url with a
 * fallback to the bundled image.
 */
export function applyWallpaper() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (activeSkinGlobal?.wallpaperDataUrl) {
    root.style.setProperty('--wallpaper-url', `url("${activeSkinGlobal.wallpaperDataUrl}")`);
  } else {
    root.style.removeProperty('--wallpaper-url');
  }
}
