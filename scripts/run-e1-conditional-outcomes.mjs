/**
 * Capture per-ball outcome conditional on contact type for each E1 archetype.
 * Specifically: of MIDDLED balls, what % became dots / 1s / 2s / 4s / 6s / wickets?
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import SimpleBallSimulator from '../src/core/match-engine/core/SimpleBallSimulator.js';
import { BATTER_ARCHETYPES, BOWLER_ARCHETYPES, resolvePreset } from '../src/components/testing/archetypePresets.js';
import playstyleCalculator from '../src/utils/PlaystyleCalculator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = pathResolve(__dirname, '..');
const OUTPUT_DIR = pathResolve(PROJECT_ROOT, 'docs/dev/active/balance-analysis');
const BALLS = parseInt(process.env.BALLS || '100000', 10);
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const rawDB = JSON.parse(readFileSync(pathResolve(PROJECT_ROOT, 'public/data/master_player_database.json'), 'utf-8'));
const players = {};
for (const p of rawDB.players || []) {
  if (!p.bowlingType) p.bowlingType = Math.random() < 0.5 ? 'pace' : 'spin';
  const ratings = playstyleCalculator.calculateAllPlaystyleRatings(p);
  const primary = playstyleCalculator.getPlayerPrimaryPlaystyles(p, p.role, 3);
  p.playstyleRatings = ratings;
  p.topPlaystyles = { batting: primary.batting, bowling: primary.bowling, fielding: primary.fielding || [] };
  p.primaryPlaystyle = { batting: primary.batting[0]?.name || null, bowling: primary.bowling[0]?.name || null };
  players[p.id] = p;
}

const PRESETS = ['top-power-hitter','top-anchor','top-balanced','top-finisher','mid-balanced','mid-slogger','tail-biffer','weak-batter','synthetic-maxed','synthetic-floor'];

function bucketOutcome(result) {
  if (result.isWicket) return 'W';
  const r = result.runs || 0;
  if (r === 0) return '0';
  if (r === 1) return '1';
  if (r === 2) return '2';
  if (r === 3) return '3';
  if (r === 4) return '4';
  if (r >= 6) return '6';
  return '0';
}

// Build a base context for an archetype matchup
function buildContext(simulator, batterPreset, bowlerPreset) {
  const bRes = resolvePreset(batterPreset, players);
  const owRes = resolvePreset(bowlerPreset, players);
  const striker = JSON.parse(JSON.stringify(players[bRes.playerId]));
  const bowler = JSON.parse(JSON.stringify(players[owRes.playerId]));
  // Apply attribute overrides if synthetic
  if (bRes.attributeOverrides) {
    for (const [cat, vals] of Object.entries(bRes.attributeOverrides)) {
      if (!striker.attributes[cat]) striker.attributes[cat] = {};
      for (const [k, v] of Object.entries(vals)) striker.attributes[cat][k] = v;
    }
  }
  striker.condition = { ...striker.condition, confidence: 60, energy: 80 };
  bowler.condition = { ...bowler.condition, confidence: 60, energy: 80 };

  // Fielding team — pick 11 random other players
  const fielders = Object.values(players)
    .filter(p => p.id !== striker.id && p.id !== bowler.id)
    .slice(0, 11)
    .map(p => {
      const c = JSON.parse(JSON.stringify(p));
      if (!c.attributes.fielding) c.attributes.fielding = {};
      if (!c.attributes.fielding.throw_speed) c.attributes.fielding.throw_speed = c.attributes.fielding.throwPower || 25;
      return c;
    });
  const fieldingPositions = simulator.setFieldFormation('neutral_orthodox', fielders);

  return {
    striker, bowler, nonStriker: striker,
    wicketKeeper: fielders[0],
    fieldingTeam: { id: 'fielding', name: 'Fielding', squad: fielders, fieldingPositions, formation: 'neutral_orthodox', wicketKeeper: fielders[0] },
    tacticsState: {
      currentAcceleration: { striker: bRes.accelerationTier || 'Cruise', nonStriker: bRes.accelerationTier || 'Cruise' },
      bowlingPlans: { [bowler.id]: { lineLength: owRes.lineLength || 'Wide Line', variation: owRes.variation || 'Consistent Accuracy' } },
      pressureIndex: { batting: 50, bowling: 50 }
    },
    matchSituation: {
      phase: 'earlyMiddle', over: 10, ball: 1, wicketsInHand: 7,
      currentRunRate: 8.0, requiredRunRate: 9.5, ballsLeft: 65, target: 180, oversBowled: 2.0
    },
    _strikerName: players[bRes.playerId].name,
    _bowlerName: players[owRes.playerId].name
  };
}

const bowlerPreset = BOWLER_ARCHETYPES.find(p => p.id === 'mid-pace');

const simulator = new SimpleBallSimulator({ silent: true, captureMetadata: true });

console.log(`\n=== Conditional outcome capture (E1, ${BALLS.toLocaleString()} balls per cell) ===\n`);

const results = {};

for (const presetId of PRESETS) {
  const batterPreset = BATTER_ARCHETYPES.find(p => p.id === presetId);
  const ctx = buildContext(simulator, batterPreset, bowlerPreset);
  // Per-contact-type outcome counters
  const byContact = {
    MIDDLED: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '6': 0, 'W': 0, total: 0 },
    EDGED:   { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '6': 0, 'W': 0, total: 0 },
    MISSED:  { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '6': 0, 'W': 0, total: 0 }
  };
  let totalBalls = 0;
  const t0 = Date.now();
  for (let i = 0; i < BALLS; i++) {
    const r = await simulator.simulateBall(ctx);
    totalBalls++;
    const cType = r.metadata?.contactResult?.type;
    const outcome = bucketOutcome(r);
    if (cType && byContact[cType]) {
      byContact[cType][outcome]++;
      byContact[cType].total++;
    }
  }
  const elapsed = Date.now() - t0;
  results[presetId] = { striker: ctx._strikerName, byContact, totalBalls };
  console.log(`  ✓ ${presetId.padEnd(18)} → ${ctx._strikerName.padEnd(22)} ${elapsed}ms`);
}

// Write JSON
const outPath = pathResolve(OUTPUT_DIR, 'E1-conditional-outcomes.json');
writeFileSync(outPath, JSON.stringify({ ballsPerCell: BALLS, results }, null, 2));
console.log(`\nWrote ${outPath}\n`);

// Print pretty tables
const fmt = (n, w=6, d=2) => (n ?? 0).toFixed(d).padStart(w);
const fmtPct = (count, total, w=6) => total > 0 ? fmt(count / total * 100, w, 2) : '   -  ';

console.log('=== MIDDLED outcomes (% of middled balls) ===');
console.log('Archetype          | Player                 |  Dot%  |   1%   |   2%   |   3%   |   4%   |   6%   |  Wkt%  | mid balls');
console.log('-'.repeat(140));
for (const id of PRESETS) {
  const r = results[id];
  const m = r.byContact.MIDDLED;
  console.log('  ' + id.padEnd(17) + '| ' + r.striker.padEnd(22).slice(0,22) + ' | ' + fmtPct(m['0'], m.total) + ' | ' + fmtPct(m['1'], m.total) + ' | ' + fmtPct(m['2'], m.total) + ' | ' + fmtPct(m['3'], m.total) + ' | ' + fmtPct(m['4'], m.total) + ' | ' + fmtPct(m['6'], m.total) + ' | ' + fmtPct(m['W'], m.total) + ' | ' + String(m.total).padStart(8));
}

console.log('\n=== EDGED outcomes (% of edged balls) ===');
console.log('Archetype          | Player                 |  Dot%  |   1%   |   2%   |   4%   |   6%   |  Wkt%  | edge balls');
console.log('-'.repeat(140));
for (const id of PRESETS) {
  const r = results[id];
  const m = r.byContact.EDGED;
  console.log('  ' + id.padEnd(17) + '| ' + r.striker.padEnd(22).slice(0,22) + ' | ' + fmtPct(m['0'], m.total) + ' | ' + fmtPct(m['1'], m.total) + ' | ' + fmtPct(m['2'], m.total) + ' | ' + fmtPct(m['4'], m.total) + ' | ' + fmtPct(m['6'], m.total) + ' | ' + fmtPct(m['W'], m.total) + ' | ' + String(m.total).padStart(8));
}

console.log('\n=== MISSED outcomes (% of missed balls) — should be Dot or Wicket ===');
console.log('Archetype          | Player                 |  Dot%  |  Wkt%  | missed balls');
console.log('-'.repeat(110));
for (const id of PRESETS) {
  const r = results[id];
  const m = r.byContact.MISSED;
  console.log('  ' + id.padEnd(17) + '| ' + r.striker.padEnd(22).slice(0,22) + ' | ' + fmtPct(m['0'], m.total) + ' | ' + fmtPct(m['W'], m.total) + ' | ' + String(m.total).padStart(8));
}

// Dot-source breakdown — total dot count = MISSED_dots + EDGED_dots + MIDDLED_dots
console.log('\n=== DOT BALL SOURCE — where the dot balls come from ===');
console.log('Archetype          | Total Dot% | from MISSED | from EDGED | from MIDDLED');
console.log('-'.repeat(110));
for (const id of PRESETS) {
  const r = results[id];
  const total = r.totalBalls;
  const fromMissed = r.byContact.MISSED['0'];
  const fromEdged = r.byContact.EDGED['0'];
  const fromMiddled = r.byContact.MIDDLED['0'];
  const totalDots = fromMissed + fromEdged + fromMiddled;
  console.log('  ' + id.padEnd(17) + '| ' + fmt(totalDots / total * 100, 9) + '% | ' + fmt(fromMissed / total * 100, 10) + '% | ' + fmt(fromEdged / total * 100, 9) + '% | ' + fmt(fromMiddled / total * 100, 11) + '%');
}
