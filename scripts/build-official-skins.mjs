/**
 * @file scripts/build-official-skins.mjs
 * @description Build pipeline for the bundled IPL + BBL skin packs.
 *
 * Reads images from scripts/skins-assets/{ipl,bbl}/, base64-encodes them,
 * stitches into a .cm25skin JSON, gzip-compresses, base64-encodes, and writes
 * to public/skins/official/.
 *
 * Output is deterministic: same inputs → byte-identical .cm25skin files.
 *
 * Usage:
 *   node scripts/build-official-skins.mjs
 *
 * Expected layout (per league):
 *   scripts/skins-assets/ipl/
 *     wallpaper.jpg           (1920x1080 ≤1MB, optional)
 *     logo-light.png          (transparent, ≤500KB, optional)
 *     logo-dark.png           (transparent, ≤500KB, optional)
 *     teams/
 *       MI/                   (Mumbai Indians)
 *         badge.png
 *         icon.png            (optional)
 *         banner.png          (optional)
 *       CSK/, RCB/, KKR/, DC/, RR/, PBKS/, SRH/, GT/, LSG/
 *
 * If a file is missing, that field is simply omitted from the skin.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ASSETS_ROOT = path.join(REPO_ROOT, 'scripts', 'skins-assets');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'skins', 'official');

const SCHEMA_VERSION = '1.0.0';
const MOD_TYPE = 'cosmetic';

// ─────────────────────────────────────────────────────────────────────────────
// Mappings: WPL team id → real-world league counterpart
// ─────────────────────────────────────────────────────────────────────────────

// Coach + venue verified against Wikipedia for the 2025/26 IPL season.
const IPL_MAPPING = {
  t_chennai:    { code: 'CSK',  teamName: 'Chennai Super Kings',          shortName: 'CSK', primaryColor: '#FFD700', secondaryColor: '#0080FE', coachName: 'Stephen Fleming',    homeVenue: 'M. A. Chidambaram Stadium' },
  t_london:     { code: 'RCB',  teamName: 'Royal Challengers Bengaluru',  shortName: 'RCB', primaryColor: '#EC1C24', secondaryColor: '#000000', coachName: 'Andy Flower',        homeVenue: 'M. Chinnaswamy Stadium' },
  t_sydney:     { code: 'MI',   teamName: 'Mumbai Indians',               shortName: 'MI',  primaryColor: '#004C93', secondaryColor: '#D1AB3E', coachName: 'Mahela Jayawardene', homeVenue: 'Wankhede Stadium' },
  t_pretoria:   { code: 'SRH',  teamName: 'Sunrisers Hyderabad',          shortName: 'SRH', primaryColor: '#FF822A', secondaryColor: '#000000', coachName: 'Daniel Vettori',     homeVenue: 'Rajiv Gandhi International Cricket Stadium' },
  t_multan:     { code: 'PBKS', teamName: 'Punjab Kings',                 shortName: 'PBK', primaryColor: '#DD1F2D', secondaryColor: '#A4A2A4', coachName: 'Ricky Ponting',      homeVenue: 'Maharaja Yadavindra Singh Stadium' },
  t_colombo:    { code: 'LSG',  teamName: 'Lucknow Super Giants',         shortName: 'LSG', primaryColor: '#A4DE49', secondaryColor: '#0067A6', coachName: 'Justin Langer',      homeVenue: 'Ekana Cricket Stadium' },
  t_dhaka:      { code: 'KKR',  teamName: 'Kolkata Knight Riders',        shortName: 'KKR', primaryColor: '#3A225D', secondaryColor: '#D4AF37', coachName: 'Abhishek Nayar',     homeVenue: 'Eden Gardens' },
  t_georgetown: { code: 'RR',   teamName: 'Rajasthan Royals',             shortName: 'RR',  primaryColor: '#EA1A85', secondaryColor: '#004B8D', coachName: 'Kumar Sangakkara',   homeVenue: 'Sawai Mansingh Stadium' },
  t_auckland:   { code: 'DC',   teamName: 'Delhi Capitals',               shortName: 'DC',  primaryColor: '#17449B', secondaryColor: '#EF1B23', coachName: 'Hemang Badani',      homeVenue: 'Arun Jaitley Cricket Stadium' },
  t_kabul:      { code: 'GT',   teamName: 'Gujarat Titans',               shortName: 'GT',  primaryColor: '#1B2133', secondaryColor: '#B7965B', coachName: 'Ashish Nehra',       homeVenue: 'Narendra Modi Stadium' }
};

// Canonical WPL identity — matches src/data/teams/wpl-teams.json. Shipping
// these as a skin means Classic is a true overlay alongside IPL/BBL rather
// than the absence of one, and lets Unapply revert here cleanly.
const WPL_MAPPING = {
  t_chennai:    { code: 'CHE', teamName: 'Chennai Cobras',     shortName: 'CHE', primaryColor: '#4B0082', secondaryColor: '#FFD700', coachName: 'Kapil Dev',         homeVenue: "Chennai's Pit" },
  t_london:     { code: 'LON', teamName: 'London Lions',       shortName: 'LON', primaryColor: '#C41E3A', secondaryColor: '#FFFFFF', coachName: 'Ian Botham',        homeVenue: "London's Den" },
  t_sydney:     { code: 'SYD', teamName: 'Sydney Sharks',      shortName: 'SYD', primaryColor: '#C0C0C0', secondaryColor: '#000080', coachName: 'Ricky Ponting',     homeVenue: "Sydney's Reef" },
  t_pretoria:   { code: 'PRE', teamName: 'Pretoria Pythons',   shortName: 'PRE', primaryColor: '#9ACD32', secondaryColor: '#000000', coachName: 'Jacques Kallis',    homeVenue: "Pretoria's Nest" },
  t_multan:     { code: 'MUL', teamName: 'Multan Markhors',    shortName: 'MUL', primaryColor: '#006400', secondaryColor: '#B87333', coachName: 'Wasim Akram',       homeVenue: "Multan's Mountains" },
  t_colombo:    { code: 'COL', teamName: 'Colombo Crocodiles', shortName: 'COL', primaryColor: '#3D2B1F', secondaryColor: '#7FFF00', coachName: 'Sanath Jayasuriya', homeVenue: "Colombo's Swamp" },
  t_dhaka:      { code: 'DHA', teamName: 'Dhaka Dolphins',     shortName: 'DHA', primaryColor: '#00FFFF', secondaryColor: '#CC5500', coachName: 'Shakib Al Hasan',   homeVenue: "Dhaka's Bay" },
  t_georgetown: { code: 'GEO', teamName: 'Georgetown Jaguars', shortName: 'GEO', primaryColor: '#FFBF00', secondaryColor: '#1A1A1A', coachName: 'Clive Lloyd',       homeVenue: "Georgetown's Jungle" },
  t_auckland:   { code: 'AUC', teamName: 'Auckland Orcas',     shortName: 'AUC', primaryColor: '#000000', secondaryColor: '#F0F8FF', coachName: 'Richard Hadlee',    homeVenue: "Auckland's Ocean" },
  t_kabul:      { code: 'KAB', teamName: 'Kabul Kites',        shortName: 'KAB', primaryColor: '#87CEEB', secondaryColor: '#DC143C', coachName: 'Don Bradman',       homeVenue: "Kabul's Sky" }
};

// Coach + venue verified against Wikipedia for BBL|15 / 2025-26.
const BBL_MAPPING = {
  t_sydney:     { code: 'SIX',     teamName: 'Sydney Sixers',          shortName: 'SIX', primaryColor: '#E6005B', secondaryColor: '#000000', coachName: 'James Hopes',     homeVenue: 'Sydney Cricket Ground' },
  t_auckland:   { code: 'THU',     teamName: 'Sydney Thunder',         shortName: 'THU', primaryColor: '#A4DD00', secondaryColor: '#000000', coachName: 'Trevor Bayliss',  homeVenue: 'ENGIE Stadium' },
  t_chennai:    { code: 'STR',     teamName: 'Adelaide Strikers',      shortName: 'STR', primaryColor: '#003D80', secondaryColor: '#1A8FE3', coachName: 'Tim Paine',       homeVenue: 'Adelaide Oval' },
  t_london:     { code: 'HEA',     teamName: 'Brisbane Heat',          shortName: 'HEA', primaryColor: '#7E1B7C', secondaryColor: '#F8B416', coachName: 'Johan Botha',     homeVenue: 'The Gabba' },
  t_multan:     { code: 'SCO',     teamName: 'Perth Scorchers',        shortName: 'SCO', primaryColor: '#F37520', secondaryColor: '#000000', coachName: 'Adam Voges',      homeVenue: 'Perth Stadium' },
  t_dhaka:      { code: 'STA',     teamName: 'Melbourne Stars',        shortName: 'STA', primaryColor: '#67D34A', secondaryColor: '#000000', coachName: 'Peter Moores',    homeVenue: 'Melbourne Cricket Ground' },
  t_pretoria:   { code: 'REN',     teamName: 'Melbourne Renegades',    shortName: 'REN', primaryColor: '#DA1A32', secondaryColor: '#000000', coachName: 'Cameron White',   homeVenue: 'Docklands Stadium' },
  t_kabul:      { code: 'HUR',     teamName: 'Hobart Hurricanes',      shortName: 'HUR', primaryColor: '#5D2E8A', secondaryColor: '#7DA9D7', coachName: 'Jeff Vaughan',    homeVenue: 'Bellerive Oval' }
  // t_colombo, t_georgetown intentionally left to defaults in BBL (only 8 BBL teams)
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function readImageAsDataUrl(filepath) {
  try {
    const buf = await fs.readFile(filepath);
    const ext = path.extname(filepath).toLowerCase();
    const mime = ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.svg' ? 'image/svg+xml'
      : ext === '.webp' ? 'image/webp'
      : 'application/octet-stream';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function firstExistingDataUrl(dir, basenames) {
  for (const name of basenames) {
    const url = await readImageAsDataUrl(path.join(dir, name));
    if (url) return url;
  }
  return null;
}

async function buildTeamSection(leagueDir, mapping) {
  const teams = {};
  for (const [teamId, m] of Object.entries(mapping)) {
    const teamDir = path.join(leagueDir, 'teams', m.code);
    const badge = await firstExistingDataUrl(teamDir, ['badge.png', 'badge.jpg', 'badge.svg', 'badge.webp']);
    const icon  = await firstExistingDataUrl(teamDir, ['icon.png',  'icon.jpg',  'icon.svg',  'icon.webp']);
    const banner = await firstExistingDataUrl(teamDir, ['banner.png', 'banner.jpg', 'banner.svg', 'banner.webp']);
    teams[teamId] = {
      teamName: m.teamName,
      shortName: m.shortName,
      primaryColor: m.primaryColor,
      secondaryColor: m.secondaryColor,
      coachName: m.coachName,
      homeVenue: m.homeVenue,
      badgeDataUrl: badge,
      iconDataUrl: icon,
      bannerDataUrl: banner
    };
  }
  return teams;
}

async function buildGlobalSection(leagueDir) {
  return {
    wallpaperDataUrl: await firstExistingDataUrl(leagueDir, ['wallpaper.jpg', 'wallpaper.jpeg', 'wallpaper.png', 'wallpaper.webp']),
    gameLogoLightDataUrl: await firstExistingDataUrl(leagueDir, ['logo-light.png', 'logo-light.svg', 'logo-light.webp', 'logo-light.jpg']),
    gameLogoDarkDataUrl: await firstExistingDataUrl(leagueDir, ['logo-dark.png', 'logo-dark.svg', 'logo-dark.webp', 'logo-dark.jpg'])
  };
}

async function buildPack({ id, name, author, description, version, leagueDir, mapping, previewBg }) {
  const teams = await buildTeamSection(leagueDir, mapping);
  const global = await buildGlobalSection(leagueDir);
  const previewDataUrl = buildPreview({
    leagueLogo: global.gameLogoLightDataUrl,
    bg: previewBg,
    title: name
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    modType: MOD_TYPE,
    skin: {
      id,
      name,
      author,
      description,
      version,
      createdAt: '2026-05-28T00:00:00.000Z', // pinned for deterministic output
      previewDataUrl
    },
    global,
    teams
  };
}

/**
 * Compose a 500x300 preview as an SVG: gradient background + centered league
 * logo + title bar. Kept lean to stay well under the 100 KB preview budget
 * (embedding team badges balloons the SVG to ~300 KB).
 */
function buildPreview({ leagueLogo, bg, title }) {
  if (!leagueLogo) return null;

  const w = 500, h = 300;
  const [bgFrom, bgTo] = bg || ['#1a1a2e', '#0a0a1a'];
  const safeTitle = title
    ? String(title).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
    : '';

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `<defs>`,
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${bgFrom}"/>`,
    `<stop offset="1" stop-color="${bgTo}"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="${w}" height="${h}" fill="url(#g)"/>`,
    `<image x="100" y="40" width="300" height="180" preserveAspectRatio="xMidYMid meet" xlink:href="${leagueLogo}"/>`,
    safeTitle
      ? `<text x="${w / 2}" y="270" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="system-ui,sans-serif" font-size="20" font-weight="700">${safeTitle}</text>`
      : '',
    `</svg>`
  ].join('');
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// Match the runtime decoder (pako.inflate expects zlib-format deflate output,
// which is what zlib.deflateSync produces — not gzipSync).
function encodePack(pack) {
  const json = JSON.stringify(pack);
  const compressed = deflateSync(Buffer.from(json, 'utf-8'));
  return compressed.toString('base64');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeSkin(filename, pack) {
  const encoded = encodePack(pack);
  const outPath = path.join(OUT_DIR, filename);
  await fs.writeFile(outPath, encoded, 'utf-8');
  const sizeKB = (encoded.length / 1024).toFixed(1);
  console.log(`  → wrote ${path.relative(REPO_ROOT, outPath)} (${sizeKB} KB compressed)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Building official skins…');
  await ensureDir(OUT_DIR);
  await ensureDir(path.join(ASSETS_ROOT, 'ipl', 'teams'));
  await ensureDir(path.join(ASSETS_ROOT, 'bbl', 'teams'));
  await ensureDir(path.join(ASSETS_ROOT, 'wpl', 'teams'));

  const iplDir = path.join(ASSETS_ROOT, 'ipl');
  const bblDir = path.join(ASSETS_ROOT, 'bbl');
  const wplDir = path.join(ASSETS_ROOT, 'wpl');

  console.log('WPL Classic skin:');
  const wplPack = await buildPack({
    id: 'wpl-classic',
    name: 'World Premier League (Classic)',
    author: 'Cricket Manager 25',
    description: 'The original WPL look. Equipped by default and the target of Unapply on themed skins.',
    version: '1.0.0',
    leagueDir: wplDir,
    mapping: WPL_MAPPING,
    previewBg: ['#1a3a1a', '#0a1f0a'] // cricket green
  });
  await writeSkin('wpl-classic.cm25skin', wplPack);

  console.log('IPL skin:');
  const iplPack = await buildPack({
    id: 'ipl-2026',
    name: 'Indian Premier League 2026',
    author: 'Cricket Manager 25',
    description: 'Re-themes the WPL as the Indian Premier League. Trademarks belong to BCCI and the respective franchises — see LEGAL.md.',
    version: '1.0.1',
    leagueDir: iplDir,
    mapping: IPL_MAPPING,
    previewBg: ['#0D1B4F', '#1F3A8A'] // IPL navy/blue
  });
  await writeSkin('ipl-2026.cm25skin', iplPack);

  console.log('BBL skin:');
  const bblPack = await buildPack({
    id: 'bbl-2026',
    name: 'Big Bash League 2026',
    author: 'Cricket Manager 25',
    description: 'Re-themes the WPL as the Big Bash League. Trademarks belong to Cricket Australia and the respective franchises — see LEGAL.md.',
    version: '1.0.1',
    leagueDir: bblDir,
    mapping: BBL_MAPPING,
    previewBg: ['#0A0033', '#280066'] // BBL purple
  });
  await writeSkin('bbl-2026.cm25skin', bblPack);

  console.log('\nDone.');
  console.log('Drop image assets into scripts/skins-assets/{ipl,bbl}/ and re-run to embed them.');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exitCode = 1;
});
