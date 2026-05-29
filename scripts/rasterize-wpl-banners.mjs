/**
 * @file scripts/rasterize-wpl-banners.mjs
 * @description One-shot helper that compresses WPL team assets for the
 *   wpl-classic skin pack:
 *     - banners (SVG → 1200×400 WebP) — source SVGs are raster-embedded and
 *       run 600 KB–7 MB, far over the schema's 500 KB per-team banner cap.
 *     - badges  (PNG → 512×512 WebP) — source PNGs run 320–490 KB; without
 *       this the bundled pack is ~8 MB (over the 5 MB total skin budget).
 *     - icons   (PNG → 128×128 WebP) — modest additional savings.
 *
 * Outputs land in scripts/skins-assets/wpl/teams/{CODE}/ and are committed
 * so build-official-skins.mjs can read them. Re-run if source assets change.
 *
 * Usage:
 *   node scripts/rasterize-wpl-banners.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const TEAMS = {
  t_chennai:    'CHE',
  t_london:     'LON',
  t_sydney:     'SYD',
  t_pretoria:   'PRE',
  t_multan:     'MUL',
  t_colombo:    'COL',
  t_dhaka:      'DHA',
  t_georgetown: 'GEO',
  t_auckland:   'AUC',
  t_kabul:      'KAB'
};

const SRC_BANNERS = path.join(REPO_ROOT, 'public', 'assets', 'teams', 'banners');
const SRC_BADGES = path.join(REPO_ROOT, 'public', 'assets', 'teams', 'badges');
const SRC_ICONS = path.join(REPO_ROOT, 'public', 'assets', 'teams', 'icons');
const OUT_BASE = path.join(REPO_ROOT, 'scripts', 'skins-assets', 'wpl', 'teams');

const ASSET_SPECS = {
  banner: { width: 1200, height: 400, fit: 'cover',   suffix: '-banner.svg', srcDir: SRC_BANNERS, budgetKB: 480 },
  badge:  { width: 512,  height: 512, fit: 'contain', suffix: '-badge.png',  srcDir: SRC_BADGES,  budgetKB: 480 },
  icon:   { width: 128,  height: 128, fit: 'contain', suffix: '-icon.png',   srcDir: SRC_ICONS,   budgetKB: 240 }
};

const START_QUALITY = 80;
const MIN_QUALITY = 40;

async function compressOne(srcPath, spec) {
  const { width, height, fit, budgetKB } = spec;
  const budgetBytes = budgetKB * 1024;
  let quality = START_QUALITY;

  const transform = () => sharp(srcPath, { density: 72 })
    .resize(width, height, {
      fit,
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality });

  let buf = await transform().toBuffer();
  while (buf.length > budgetBytes && quality > MIN_QUALITY) {
    quality -= 10;
    buf = await sharp(srcPath, { density: 72 })
      .resize(width, height, { fit, position: 'center', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality })
      .toBuffer();
  }

  return { buf, quality };
}

async function processKind(kind, spec) {
  console.log(`\n${kind} → ${spec.width}x${spec.height} WebP (target ≤ ${spec.budgetKB} KB):`);
  for (const [teamId, code] of Object.entries(TEAMS)) {
    const src = path.join(spec.srcDir, `${teamId}${spec.suffix}`);
    const outDir = path.join(OUT_BASE, code);
    const outPath = path.join(outDir, `${kind}.webp`);

    await fs.mkdir(outDir, { recursive: true });

    try {
      const { buf, quality } = await compressOne(src, spec);
      await fs.writeFile(outPath, buf);
      const sizeKB = (buf.length / 1024).toFixed(1);
      const overBudget = buf.length > spec.budgetKB * 1024 ? ' ⚠️ over budget' : '';
      console.log(`  ${code} (${teamId}): ${sizeKB} KB @ q${quality}${overBudget}`);
    } catch (err) {
      console.error(`  ${code} (${teamId}): FAILED — ${err.message}`);
      process.exitCode = 1;
    }
  }
}

async function cleanupSourceCopies() {
  // The earlier setup step copied raw PNG badges/icons into the asset dir.
  // Once compressed WebPs are written, the source PNGs are dead weight that
  // build-official-skins.mjs would otherwise pick up first (it prefers PNG).
  for (const code of Object.values(TEAMS)) {
    for (const stale of ['badge.png', 'icon.png']) {
      const p = path.join(OUT_BASE, code, stale);
      try { await fs.unlink(p); } catch { /* missing is fine */ }
    }
  }
}

async function main() {
  for (const [kind, spec] of Object.entries(ASSET_SPECS)) {
    await processKind(kind, spec);
  }
  await cleanupSourceCopies();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Rasterize failed:', err);
  process.exit(1);
});
