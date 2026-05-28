/**
 * @file skinSchema.js
 * @description Validator for .cm25skin pack JSON. No external deps (no Zod).
 * Checks required fields, schema version, size budgets, asset shape.
 */

export const SKIN_SCHEMA_VERSION = '1.0.0';
export const SKIN_MOD_TYPE = 'cosmetic';

export const SIZE_BUDGETS = {
  TOTAL: 5 * 1024 * 1024,        // 5 MB per skin (uncompressed JSON)
  TEAM_ASSET: 500 * 1024,        // 500 KB per badge/banner
  TEAM_ICON: 250 * 1024,         // 250 KB per icon
  WALLPAPER: 1 * 1024 * 1024,    // 1 MB
  LOGO: 500 * 1024,              // 500 KB per logo variant
  PREVIEW: 100 * 1024            // 100 KB preview image
};

export const MAX_TEAMS = 10;
export const MAX_NAME_LEN = 40;
export const MAX_SHORT_LEN = 3;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DATA_URL_RE = /^data:image\/(png|jpe?g|svg\+xml|webp);base64,/;

function bytesOf(dataUrl) {
  if (typeof dataUrl !== 'string') return 0;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  return Math.floor(b64.length * 3 / 4);
}

function isDataUrl(s) {
  return typeof s === 'string' && DATA_URL_RE.test(s);
}

function fail(reason) {
  return { valid: false, reason };
}

function ok(warnings = []) {
  return { valid: true, warnings };
}

/**
 * Validate a skin pack object.
 * @param {Object} pack
 * @returns {{valid: boolean, reason?: string, warnings?: string[]}}
 */
export function validateSkinPack(pack) {
  if (!pack || typeof pack !== 'object') return fail('Skin pack must be an object');

  if (pack.schemaVersion !== SKIN_SCHEMA_VERSION) {
    return fail(`Unsupported schemaVersion '${pack.schemaVersion}'. Expected '${SKIN_SCHEMA_VERSION}'.`);
  }
  if (pack.modType !== SKIN_MOD_TYPE) {
    return fail(`Unsupported modType '${pack.modType}'. Expected '${SKIN_MOD_TYPE}'.`);
  }

  const skin = pack.skin;
  if (!skin || typeof skin !== 'object') return fail('Missing skin metadata block');
  if (!skin.id || typeof skin.id !== 'string') return fail('skin.id required');
  if (!skin.name || typeof skin.name !== 'string') return fail('skin.name required');
  if (!skin.version || typeof skin.version !== 'string') return fail('skin.version required');

  const warnings = [];

  if (skin.previewDataUrl) {
    if (!isDataUrl(skin.previewDataUrl)) return fail('skin.previewDataUrl is not a valid image data URL');
    if (bytesOf(skin.previewDataUrl) > SIZE_BUDGETS.PREVIEW) {
      warnings.push(`Preview exceeds ${SIZE_BUDGETS.PREVIEW / 1024} KB budget`);
    }
  }

  const global = pack.global || {};
  if (global.wallpaperDataUrl) {
    if (!isDataUrl(global.wallpaperDataUrl)) return fail('global.wallpaperDataUrl invalid');
    if (bytesOf(global.wallpaperDataUrl) > SIZE_BUDGETS.WALLPAPER) {
      return fail(`Wallpaper exceeds ${SIZE_BUDGETS.WALLPAPER / 1024 / 1024} MB budget`);
    }
  }
  for (const key of ['gameLogoLightDataUrl', 'gameLogoDarkDataUrl']) {
    if (global[key]) {
      if (!isDataUrl(global[key])) return fail(`global.${key} invalid`);
      if (bytesOf(global[key]) > SIZE_BUDGETS.LOGO) {
        return fail(`${key} exceeds ${SIZE_BUDGETS.LOGO / 1024} KB budget`);
      }
    }
  }

  const teams = pack.teams || {};
  const teamIds = Object.keys(teams);
  if (teamIds.length > MAX_TEAMS) {
    return fail(`Too many teams (${teamIds.length}). Max ${MAX_TEAMS}.`);
  }

  for (const teamId of teamIds) {
    const t = teams[teamId];
    if (!t || typeof t !== 'object') return fail(`teams['${teamId}'] is not an object`);

    if (t.teamName !== undefined && t.teamName !== null) {
      if (typeof t.teamName !== 'string') return fail(`teams['${teamId}'].teamName must be string`);
      if (t.teamName.length > MAX_NAME_LEN) return fail(`teams['${teamId}'].teamName too long`);
    }
    if (t.shortName !== undefined && t.shortName !== null) {
      if (typeof t.shortName !== 'string' || t.shortName.length > MAX_SHORT_LEN) {
        return fail(`teams['${teamId}'].shortName must be string of <= ${MAX_SHORT_LEN} chars`);
      }
    }
    for (const colorKey of ['primaryColor', 'secondaryColor']) {
      if (t[colorKey] !== undefined && t[colorKey] !== null) {
        if (!HEX_RE.test(t[colorKey])) {
          return fail(`teams['${teamId}'].${colorKey} must be 6-digit hex (e.g. #1A2B3C)`);
        }
      }
    }
    for (const [key, budget] of [
      ['badgeDataUrl', SIZE_BUDGETS.TEAM_ASSET],
      ['iconDataUrl', SIZE_BUDGETS.TEAM_ICON],
      ['bannerDataUrl', SIZE_BUDGETS.TEAM_ASSET]
    ]) {
      if (t[key]) {
        if (!isDataUrl(t[key])) return fail(`teams['${teamId}'].${key} invalid`);
        if (bytesOf(t[key]) > budget) {
          return fail(`teams['${teamId}'].${key} exceeds ${(budget / 1024).toFixed(0)} KB budget`);
        }
      }
    }
  }

  const totalBytes = roughTotalBytes(pack);
  if (totalBytes > SIZE_BUDGETS.TOTAL) {
    return fail(`Skin exceeds ${SIZE_BUDGETS.TOTAL / 1024 / 1024} MB total budget (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);
  }

  return ok(warnings);
}

function roughTotalBytes(pack) {
  let total = 0;
  total += bytesOf(pack.skin?.previewDataUrl);
  const g = pack.global || {};
  total += bytesOf(g.wallpaperDataUrl);
  total += bytesOf(g.gameLogoLightDataUrl);
  total += bytesOf(g.gameLogoDarkDataUrl);
  for (const t of Object.values(pack.teams || {})) {
    total += bytesOf(t.badgeDataUrl);
    total += bytesOf(t.iconDataUrl);
    total += bytesOf(t.bannerDataUrl);
  }
  return total;
}

export function getPackSizeBytes(pack) {
  return roughTotalBytes(pack);
}
