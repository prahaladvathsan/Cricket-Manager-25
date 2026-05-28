/**
 * @file useOfficialSkinsBootstrap.js
 * @description On app load:
 *   1. Install bundled official skins (IPL, BBL) on first run
 *   2. Reinstall (overwrite) when the bundled pack's `skin.version` differs
 *      from what's in the user's library — fixes the case where we ship a
 *      corrected/upgraded pack but the user's library still has the old one
 *   3. Re-apply the active skin so theming persists across sessions
 *
 * Active skin selection is left untouched on reinstall.
 */

import { useEffect } from 'react';
import { listSkins, installSkinFromUrl, applyActiveSkinToStores } from '../utils/SkinManager';

const OFFICIAL_SKINS = [
  { id: 'ipl-2026', url: '/skins/official/ipl-2026.cm25skin' },
  { id: 'bbl-2026', url: '/skins/official/bbl-2026.cm25skin' }
];

let bootstrapped = false;

// Compare two semver-ish strings ("1.0.1" vs "1.0.0"). Returns -1, 0, 1.
function cmpVersion(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

async function fetchSkinHead(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export default function useOfficialSkinsBootstrap() {
  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;

    (async () => {
      try {
        const installed = await listSkins();
        for (const { id, url } of OFFICIAL_SKINS) {
          const existing = installed[id];

          // Fast path: not installed yet → install fresh
          if (!existing) {
            const result = await installSkinFromUrl(url, { isOfficial: true });
            if (!result.success) {
              console.warn(`[Skins] Could not install official skin ${id}: ${result.error}`);
            } else {
              console.log(`[Skins] Installed official skin: ${id}`);
            }
            continue;
          }

          // Already installed: check if bundled is newer. Quick fetch +
          // decompress just to read the version field; if it's newer, reinstall.
          const compressed = await fetchSkinHead(url);
          if (!compressed) continue;

          let bundledVersion = null;
          try {
            const { decompressData } = await import('../utils/compression.js');
            const pack = decompressData(compressed);
            bundledVersion = pack?.skin?.version || null;
          } catch (err) {
            console.warn(`[Skins] Could not read bundled version for ${id}:`, err);
            continue;
          }

          if (bundledVersion && cmpVersion(existing.skin?.version, bundledVersion) < 0) {
            console.log(`[Skins] Updating ${id}: ${existing.skin?.version} → ${bundledVersion}`);
            const result = await installSkinFromUrl(url, { isOfficial: true });
            if (!result.success) {
              console.warn(`[Skins] Could not update ${id}: ${result.error}`);
            }
          }
        }

        // Re-apply active skin (if any) to live stores. Idempotent.
        await applyActiveSkinToStores();
      } catch (err) {
        console.warn('[Skins] Bootstrap failed (non-critical):', err);
      }
    })();
  }, []);
}
