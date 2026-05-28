/**
 * @file SkinManager.js
 * @description Manages downloadable .cm25skin packs — installable, shareable
 * skin overlays for the WPL league. Mirrors the SaveGameManager export pipeline
 * (JSON → pako gzip → base64) but stores in dedicated IndexedDB keys.
 *
 * Storage:
 *   cm25-skin-library   — Record<skinId, SkinPack> of installed skins
 *   cm25-active-skin-id — string | null
 *
 * Overlay precedence: bundled defaults < active skin < cm25-custom-clubs.
 */

import { get, set } from 'idb-keyval';
import { compressData, decompressData } from './compression.js';
import { validateSkinPack, SKIN_SCHEMA_VERSION, SKIN_MOD_TYPE, getPackSizeBytes, SIZE_BUDGETS } from '../data/schemas/skinSchema.js';
import { sanitizeAll } from './sanitizeSvg.js';
import { setActiveSkinGlobal, applyWallpaper } from './assetHelpers.js';
import { getCustomClubs } from './CustomClubManager.js';
import useTeamStore from '../stores/teamStore.js';

const LIBRARY_KEY = 'cm25-skin-library';
const ACTIVE_KEY = 'cm25-active-skin-id';
const FILE_EXT = '.cm25skin';

async function loadLibrary() {
  try {
    return (await get(LIBRARY_KEY)) || {};
  } catch (err) {
    console.error('SkinManager: failed to read library', err);
    return {};
  }
}

async function writeLibrary(library) {
  await set(LIBRARY_KEY, library);
}

/**
 * Get all installed skins.
 * @returns {Promise<Record<string, Object>>}
 */
export async function listSkins() {
  return loadLibrary();
}

/**
 * Get a single skin by id.
 * @param {string} skinId
 */
export async function loadSkin(skinId) {
  const lib = await loadLibrary();
  return lib[skinId] || null;
}

/**
 * Save a skin pack into the library. Will overwrite if same id exists.
 * @param {Object} pack - validated SkinPack
 * @param {{ isOfficial?: boolean }} [options]
 */
export async function saveSkin(pack, options = {}) {
  const validation = validateSkinPack(pack);
  if (!validation.valid) throw new Error(`Invalid skin: ${validation.reason}`);

  const svgCheck = collectSvgEntries(pack);
  const svgResult = sanitizeAll(svgCheck);
  if (!svgResult.valid) throw new Error(`Skin contains unsafe SVG — ${svgResult.reason}`);

  const lib = await loadLibrary();
  const id = pack.skin.id;
  lib[id] = {
    ...pack,
    isOfficial: !!options.isOfficial,
    installedAt: lib[id]?.installedAt || new Date().toISOString()
  };
  await writeLibrary(lib);
  return id;
}

/**
 * Delete a skin from the library. Official skins cannot be deleted.
 * If the deleted skin was active, active is cleared.
 * @param {string} skinId
 */
export async function deleteSkin(skinId) {
  const lib = await loadLibrary();
  if (!lib[skinId]) return false;
  if (lib[skinId].isOfficial) {
    throw new Error('Official skins cannot be deleted.');
  }
  delete lib[skinId];
  await writeLibrary(lib);

  const active = await getActiveSkinId();
  if (active === skinId) await setActiveSkinId(null);

  return true;
}

export async function getActiveSkinId() {
  try {
    return (await get(ACTIVE_KEY)) || null;
  } catch {
    return null;
  }
}

export async function setActiveSkinId(skinId) {
  await set(ACTIVE_KEY, skinId);
}

/**
 * Get the currently active skin pack, or null.
 */
export async function getActiveSkin() {
  const id = await getActiveSkinId();
  if (!id) return null;
  const lib = await loadLibrary();
  return lib[id] || null;
}

/**
 * Encode a skin pack into a .cm25skin file and trigger download.
 * @param {Object} pack
 * @param {string} [filename]
 */
export async function exportSkinPack(pack, filename = null) {
  const validation = validateSkinPack(pack);
  if (!validation.valid) throw new Error(`Cannot export invalid skin: ${validation.reason}`);

  const compressed = compressData(pack);
  const blob = new Blob([compressed], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const safeName = (pack.skin.name || pack.skin.id || 'skin').replace(/[^a-z0-9]+/gi, '_');
  const name = filename || `${safeName}${FILE_EXT}`;

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return name;
}

/**
 * Read a File object and install as a skin pack.
 * @param {File} file
 * @returns {Promise<{success: boolean, skinId?: string, error?: string, warnings?: string[]}>}
 */
export async function importSkinPack(file) {
  return new Promise((resolve) => {
    if (!file?.name?.toLowerCase().endsWith(FILE_EXT)) {
      resolve({ success: false, error: `Expected a ${FILE_EXT} file.` });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let pack;
        try {
          pack = decompressData(e.target.result);
        } catch {
          resolve({ success: false, error: 'Could not decompress. File may be corrupted.' });
          return;
        }
        const validation = validateSkinPack(pack);
        if (!validation.valid) {
          resolve({ success: false, error: validation.reason });
          return;
        }
        const svgCheck = collectSvgEntries(pack);
        const svgResult = sanitizeAll(svgCheck);
        if (!svgResult.valid) {
          resolve({ success: false, error: `Unsafe SVG content — ${svgResult.reason}` });
          return;
        }
        const id = await saveSkin(pack, { isOfficial: false });
        resolve({ success: true, skinId: id, warnings: validation.warnings || [] });
      } catch (err) {
        resolve({ success: false, error: err?.message || 'Import failed' });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'Failed to read file.' });
    reader.readAsText(file);
  });
}

/**
 * Install a skin pack from a fetched URL (used for bundled official skins).
 * @param {string} url
 * @returns {Promise<{success: boolean, skinId?: string, error?: string}>}
 */
export async function installSkinFromUrl(url, { isOfficial = true } = {}) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { success: false, error: `HTTP ${res.status} fetching ${url}` };
    const compressed = await res.text();
    const pack = decompressData(compressed);
    const validation = validateSkinPack(pack);
    if (!validation.valid) return { success: false, error: validation.reason };
    const id = await saveSkin(pack, { isOfficial });
    return { success: true, skinId: id };
  } catch (err) {
    return { success: false, error: err?.message || 'Install failed' };
  }
}

function collectSvgEntries(pack) {
  const out = [];
  const skin = pack.skin || {};
  out.push(['skin.previewDataUrl', skin.previewDataUrl]);
  const g = pack.global || {};
  out.push(['global.wallpaperDataUrl', g.wallpaperDataUrl]);
  out.push(['global.gameLogoLightDataUrl', g.gameLogoLightDataUrl]);
  out.push(['global.gameLogoDarkDataUrl', g.gameLogoDarkDataUrl]);
  for (const [teamId, t] of Object.entries(pack.teams || {})) {
    out.push([`teams.${teamId}.badgeDataUrl`, t.badgeDataUrl]);
    out.push([`teams.${teamId}.iconDataUrl`, t.iconDataUrl]);
    out.push([`teams.${teamId}.bannerDataUrl`, t.bannerDataUrl]);
  }
  return out;
}

/**
 * Build a SkinPack object from current custom-clubs + global assets.
 * Used by the "Export as Skin" flow in ClubEditorScreen.
 * @param {Object} params
 * @param {Record<string, Object>} params.customClubs - From getCustomClubs()
 * @param {Object} [params.metadata] - { id, name, author, description, version }
 * @param {Object} [params.global] - { wallpaperDataUrl, gameLogoLightDataUrl, gameLogoDarkDataUrl }
 * @param {string} [params.previewDataUrl]
 * @returns {Object} Skin pack ready for validateSkinPack
 */
export function buildSkinPackFromCustomClubs({ customClubs, metadata = {}, global = {}, previewDataUrl = null }) {
  const teams = {};
  for (const [teamId, c] of Object.entries(customClubs || {})) {
    teams[teamId] = {
      teamName: c.teamName || null,
      shortName: c.shortName || null,
      primaryColor: c.primaryColor || null,
      secondaryColor: c.secondaryColor || null,
      badgeDataUrl: c.badgeDataUrl || null,
      iconDataUrl: c.iconDataUrl || null,
      bannerDataUrl: c.bannerDataUrl || null,
      coachName: c.coachName || null,
      homeVenue: c.homeVenue || null
    };
  }
  const id = (metadata.id || `skin-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return {
    schemaVersion: SKIN_SCHEMA_VERSION,
    modType: SKIN_MOD_TYPE,
    skin: {
      id,
      name: metadata.name || 'Untitled Skin',
      author: metadata.author || 'Anonymous',
      description: metadata.description || '',
      version: metadata.version || '1.0.0',
      createdAt: new Date().toISOString(),
      previewDataUrl
    },
    global: {
      wallpaperDataUrl: global.wallpaperDataUrl || null,
      gameLogoLightDataUrl: global.gameLogoLightDataUrl || null,
      gameLogoDarkDataUrl: global.gameLogoDarkDataUrl || null
    },
    teams
  };
}

/**
 * Aggregate library size for the soft warning threshold.
 * @returns {Promise<number>} Total bytes
 */
export async function getLibrarySizeBytes() {
  const lib = await loadLibrary();
  let total = 0;
  for (const pack of Object.values(lib)) {
    total += getPackSizeBytes(pack);
  }
  return total;
}

export const LIBRARY_WARN_BYTES = 50 * 1024 * 1024;
export { FILE_EXT, SIZE_BUDGETS };

/**
 * Apply the currently active skin to all UI surfaces:
 *   - Push global section (wallpaper, logos) into assetHelpers cache
 *   - Set CSS variable --wallpaper-url
 *   - Run layered overlay on teamStore (skin teams + user custom-clubs)
 *
 * Idempotent: safe to call multiple times. Call after save load, new-game
 * start, skin apply/unapply, and ClubEditor save.
 *
 * @returns {Promise<{ skinId: string|null }>}
 */
export async function applyActiveSkinToStores() {
  const active = await getActiveSkin();
  const customClubs = await getCustomClubs();

  setActiveSkinGlobal(active?.global || null);
  applyWallpaper();

  try {
    useTeamStore.getState().applyCustomOverlays(active?.teams || null, customClubs || {});
  } catch (err) {
    console.error('SkinManager.applyActiveSkinToStores: failed to apply overlays', err);
  }

  return { skinId: active?.skin?.id || null };
}

/**
 * Switch which skin is active and immediately apply it everywhere.
 * Pass null to unapply (reverts to defaults + user custom-clubs only).
 * @param {string|null} skinId
 */
export async function activateSkin(skinId) {
  if (skinId !== null) {
    const lib = await loadLibrary();
    if (!lib[skinId]) throw new Error(`Skin '${skinId}' not in library`);
  }
  await setActiveSkinId(skinId);
  await applyActiveSkinToStores();
}

export default {
  listSkins,
  loadSkin,
  saveSkin,
  deleteSkin,
  getActiveSkinId,
  setActiveSkinId,
  getActiveSkin,
  exportSkinPack,
  importSkinPack,
  installSkinFromUrl,
  buildSkinPackFromCustomClubs,
  getLibrarySizeBytes,
  applyActiveSkinToStores,
  activateSkin
};
