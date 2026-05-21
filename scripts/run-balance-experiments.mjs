/**
 * Node-side balance-experiment runner. Drives the same TestSimulator that the
 * /testing UI uses (silent + captureMetadata) across the E1–E5 sweeps the user
 * approved in the plan. E6 (full-match) is gated on Zustand-store availability
 * and skipped here — that one needs the browser path.
 *
 * Run with:
 *   node --import ./scripts/register-json-loader.mjs scripts/run-balance-experiments.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTestSimulation } from '../src/components/testing/TestSimulator.js';
import {
  BATTER_ARCHETYPES,
  BOWLER_ARCHETYPES,
  resolvePreset
} from '../src/components/testing/archetypePresets.js';
import playstyleCalculator from '../src/utils/PlaystyleCalculator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = pathResolve(__dirname, '..');
const OUTPUT_DIR = pathResolve(PROJECT_ROOT, 'docs/dev/active/balance-analysis');

const BALLS_PER_CELL = parseInt(process.env.BALLS || '100000', 10);

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------- Player DB load ----------

console.log('Loading player DB…');
const dbPath = pathResolve(PROJECT_ROOT, 'public/data/master_player_database.json');
const rawDB = JSON.parse(readFileSync(dbPath, 'utf-8'));
const playersArr = rawDB.players || [];
console.log(`Loaded ${playersArr.length} players`);

// Enrich each player with playstyle ratings + primaryPlaystyle the same way
// playerStore.initializePlayers does on game load.
console.log('Computing playstyles…');
const players = {};
for (const p of playersArr) {
  // Assign default bowlingType if null (same logic as playerStore)
  if (p.bowlingType === null || p.bowlingType === undefined) {
    p.bowlingType = Math.random() < 0.5 ? 'pace' : 'spin';
  }
  const ratings = playstyleCalculator.calculateAllPlaystyleRatings(p);
  const primary = playstyleCalculator.getPlayerPrimaryPlaystyles(p, p.role, 3);
  p.playstyleRatings = ratings;
  p.topPlaystyles = {
    batting: primary.batting,
    bowling: primary.bowling,
    fielding: primary.fielding || []
  };
  p.primaryPlaystyle = {
    batting: primary.batting[0]?.name || null,
    bowling: primary.bowling[0]?.name || null,
    fielding: primary.fielding?.[0]?.name || null
  };
  players[p.id] = p;
}
console.log('Playstyles computed.');

// ---------- Helpers ----------

function buildDefaultConfig() {
  return {
    strikerId: null,
    bowlerId: null,
    nonStrikerId: null,
    phase: 'earlyMiddle',
    over: 10,
    ball: 1,
    wicketsInHand: 7,
    currentRunRate: 8.0,
    requiredRunRate: 9.5,
    ballsLeft: 65,
    target: 180,
    oversBowled: 2.0,
    strikerConfidence: 60,
    strikerEnergy: 80,
    bowlerConfidence: 60,
    bowlerEnergy: 80,
    battingPressure: 50,
    bowlingPressure: 50,
    accelerationTier: 'Cruise',
    battingPlaystyle: null,
    battingPlaystyleRating: null,
    bowlingType: 'pace',
    lineLength: 'Wide Line',
    variation: 'Consistent Accuracy',
    bowlingPlaystyle: null,
    bowlingPlaystyleRating: null,
    fieldTemplate: 'neutral_orthodox',
    strikerAttributeOverrides: null,
    bowlerAttributeOverrides: null
  };
}

const PHASE_CONTEXTS = {
  powerplay:   { phase: 'powerplay',   over: 3,  ball: 1, wicketsInHand: 10, currentRunRate: 8.0, requiredRunRate: 8.5, ballsLeft: 102, target: 180, oversBowled: 1.0 },
  earlyMiddle: { phase: 'earlyMiddle', over: 10, ball: 1, wicketsInHand: 7,  currentRunRate: 8.0, requiredRunRate: 9.5, ballsLeft: 65,  target: 180, oversBowled: 2.0 },
  lateMiddle:  { phase: 'lateMiddle',  over: 14, ball: 1, wicketsInHand: 5,  currentRunRate: 8.0, requiredRunRate: 11.0, ballsLeft: 36, target: 180, oversBowled: 3.0 },
  death:       { phase: 'death',       over: 18, ball: 1, wicketsInHand: 3,  currentRunRate: 8.5, requiredRunRate: 12.0, ballsLeft: 12, target: 200, oversBowled: 4.0 }
};

function applyPhaseContext(config, phaseName) {
  return { ...config, ...PHASE_CONTEXTS[phaseName] };
}

function applyArchetype(config, presetArr, presetId, kind /* 'striker' | 'bowler' */) {
  const preset = presetArr.find(p => p.id === presetId);
  if (!preset) throw new Error(`Unknown preset ${presetId}`);
  const resolved = resolvePreset(preset, players);
  if (!resolved) throw new Error(`Could not resolve preset ${presetId}`);
  if (kind === 'striker') {
    config.strikerId = resolved.playerId;
    config.strikerAttributeOverrides = resolved.attributeOverrides;
    if (resolved.accelerationTier) config.accelerationTier = resolved.accelerationTier;
  } else {
    config.bowlerId = resolved.playerId;
    config.bowlerAttributeOverrides = resolved.attributeOverrides;
    if (resolved.lineLength) config.lineLength = resolved.lineLength;
    if (resolved.variation) config.variation = resolved.variation;
    const bowler = players[resolved.playerId];
    if (bowler) {
      const t = (bowler.bowlingType || '').toLowerCase();
      config.bowlingType = (t.includes('spin') || t.includes('off') || t.includes('leg') || t.includes('orthodox') || t.includes('chinaman')) ? 'spin' : 'pace';
    }
  }
  return { resolvedPlayerId: resolved.playerId, presetLabel: preset.label };
}

function formatCellHeader(prefix, label, data) {
  const player = data.resolvedPlayerId ? players[data.resolvedPlayerId] : null;
  const pName = player?.name || 'unknown';
  return `${prefix} | ${label} → ${pName}`;
}

function distributionToCSV(dist) {
  if (!dist) return '';
  return Object.entries(dist).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(3)}`).join('\n');
}

function summary(r) {
  return {
    SR: r.strikeRate.toFixed(1),
    Econ: r.economyRate.toFixed(2),
    Wkt: (r.wicketProbability * 100).toFixed(2) + '%',
    Bnd: (r.boundaryRate * 100).toFixed(2) + '%',
    Dot: r.outcomeDistribution['0']?.percentage.toFixed(1) + '%',
    Six: r.outcomeDistribution['6']?.percentage.toFixed(2) + '%',
    Four: r.outcomeDistribution['4']?.percentage.toFixed(2) + '%',
    CQμ: r.contactQualityMean?.toFixed(1),
    CQσ: r.contactQualityStdDev?.toFixed(1),
    AerR: (r.aerialRate * 100).toFixed(1) + '%',
    'Six/Aer': (r.sixAmongAerialRate * 100).toFixed(1) + '%',
    'GrIntcpt': (r.groundedInterceptionRate * 100).toFixed(1) + '%',
    'Catch%': (r.catchConversion * 100).toFixed(1) + '%',
    'CtchAtt': r.catchAttempts,
    'Mid%': r.contactDistribution.middled?.percentage.toFixed(1) + '%',
    'Edg%': r.contactDistribution.edged?.percentage.toFixed(1) + '%',
    'Mis%': r.contactDistribution.missed?.percentage.toFixed(1) + '%',
    Time: r.simulationTime + 'ms'
  };
}

function printTable(rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter(k => k !== '_row');
  const widths = {};
  for (const k of keys) {
    widths[k] = Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length));
  }
  const labelWidth = Math.max(...rows.map(r => String(r._row).length));
  const pad = (s, w) => String(s ?? '').padEnd(w);
  console.log('  ' + pad('cell', labelWidth) + ' | ' + keys.map(k => pad(k, widths[k])).join(' | '));
  console.log('  ' + '-'.repeat(labelWidth) + '-+-' + keys.map(k => '-'.repeat(widths[k])).join('-+-'));
  for (const r of rows) {
    console.log('  ' + pad(r._row, labelWidth) + ' | ' + keys.map(k => pad(r[k], widths[k])).join(' | '));
  }
}

// Reusable: pick the median rating real-DB pace bowler for "neutral foe" cells
function midPaceBowlerConfig(baseConfig) {
  const cfg = { ...baseConfig };
  const data = applyArchetype(cfg, BOWLER_ARCHETYPES, 'mid-pace', 'bowler');
  return { cfg, data };
}

function midBatterConfig(baseConfig) {
  const cfg = { ...baseConfig };
  const data = applyArchetype(cfg, BATTER_ARCHETYPES, 'mid-balanced', 'striker');
  return { cfg, data };
}

async function runCell(label, config) {
  const t0 = Date.now();
  const result = await runTestSimulation(config, players, BALLS_PER_CELL);
  const elapsed = Date.now() - t0;
  console.log(`    ✓ ${label} (${elapsed}ms)`);
  return result;
}

// ---------- EXPERIMENTS ----------

const BATTER_SWEEP_PRESETS = [
  'top-power-hitter', 'top-anchor', 'top-balanced', 'top-finisher',
  'mid-balanced', 'mid-slogger', 'tail-biffer', 'weak-batter',
  'synthetic-maxed', 'synthetic-floor'
];

const BOWLER_SWEEP_PRESETS = [
  'top-attacking-pace', 'top-death-pace', 'top-swing-bowler',
  'top-leg-spinner', 'top-finger-spinner',
  'mid-pace', 'mid-spin', 'weak-bowler', 'synthetic-maxed-bowler'
];

const ALL_TIERS = ['Blockade', 'Build', 'Rotate', 'Cruise', 'Blitz', 'Hit Out/Get Out'];

const ALL_LINE_LENGTHS = {
  pace: ['Attacking Line', 'Wide Line', 'Short-Pitched', 'Yorker Execution'],
  spin: ['Flight & Loop', 'Flat & Fast', 'Wide of Off', 'Stumps Attack']
};
const ALL_VARIATIONS = {
  pace: ['Pace Variation Mix', 'Swing/Seam Focus', 'Bouncer Barrage', 'Consistent Accuracy'],
  spin: ['Turn Candy Bag', 'Flight Variation', 'Pace Variation', 'Consistent Line']
};

const allResults = {};

// ---------- E1: Single-batter sweep ----------
console.log(`\n=== E1: Single-batter sweep (${BATTER_SWEEP_PRESETS.length} cells @ ${BALLS_PER_CELL.toLocaleString()} balls) ===`);
{
  const e1Rows = [];
  for (const presetId of BATTER_SWEEP_PRESETS) {
    const cfg = buildDefaultConfig();
    // Hold opponent = mid pace bowler with default plan
    const bowlerData = applyArchetype(cfg, BOWLER_ARCHETYPES, 'mid-pace', 'bowler');
    const batterData = applyArchetype(cfg, BATTER_ARCHETYPES, presetId, 'striker');
    const label = formatCellHeader('E1', presetId, batterData);
    const result = await runCell(label, cfg);
    e1Rows.push({
      _row: presetId,
      player: players[batterData.resolvedPlayerId]?.name?.slice(0, 14) || '?',
      ...summary(result)
    });
    allResults[`E1.${presetId}`] = { config: cfg, result, batterData, bowlerData };
  }
  printTable(e1Rows);
}

// ---------- E2: Single-bowler sweep ----------
console.log(`\n=== E2: Single-bowler sweep (${BOWLER_SWEEP_PRESETS.length} cells) ===`);
{
  const e2Rows = [];
  for (const presetId of BOWLER_SWEEP_PRESETS) {
    const cfg = buildDefaultConfig();
    const batterData = applyArchetype(cfg, BATTER_ARCHETYPES, 'mid-balanced', 'striker');
    const bowlerData = applyArchetype(cfg, BOWLER_ARCHETYPES, presetId, 'bowler');
    const label = formatCellHeader('E2', presetId, bowlerData);
    const result = await runCell(label, cfg);
    e2Rows.push({
      _row: presetId,
      bowler: players[bowlerData.resolvedPlayerId]?.name?.slice(0, 14) || '?',
      ...summary(result)
    });
    allResults[`E2.${presetId}`] = { config: cfg, result, batterData, bowlerData };
  }
  printTable(e2Rows);
}

// ---------- E3: Acceleration-tier sweep (HOGO test) × 3 phases ----------
console.log(`\n=== E3: Acceleration-tier sweep × 3 phases (${ALL_TIERS.length * 3} cells) ===`);
{
  for (const phaseName of ['powerplay', 'earlyMiddle', 'death']) {
    console.log(`\n  Phase: ${phaseName}`);
    const phaseRows = [];
    for (const tier of ALL_TIERS) {
      let cfg = buildDefaultConfig();
      cfg = applyPhaseContext(cfg, phaseName);
      const batterData = applyArchetype(cfg, BATTER_ARCHETYPES, 'mid-balanced', 'striker');
      const bowlerData = applyArchetype(cfg, BOWLER_ARCHETYPES, 'mid-pace', 'bowler');
      cfg.accelerationTier = tier; // Override
      const label = `E3.${phaseName}.${tier}`;
      const result = await runCell(label, cfg);
      phaseRows.push({
        _row: tier,
        ...summary(result)
      });
      allResults[`E3.${phaseName}.${tier}`] = { config: cfg, result, batterData, bowlerData };
    }
    printTable(phaseRows);
  }
}

// ---------- E4: Bowling plan sweep ----------
console.log(`\n=== E4: Bowling plan sweep — pace (${ALL_LINE_LENGTHS.pace.length * ALL_VARIATIONS.pace.length} cells) ===`);
{
  const e4Rows = [];
  for (const ll of ALL_LINE_LENGTHS.pace) {
    for (const va of ALL_VARIATIONS.pace) {
      const cfg = buildDefaultConfig();
      const batterData = applyArchetype(cfg, BATTER_ARCHETYPES, 'mid-balanced', 'striker');
      const bowlerData = applyArchetype(cfg, BOWLER_ARCHETYPES, 'mid-pace', 'bowler');
      cfg.lineLength = ll;
      cfg.variation = va;
      const label = `E4.${ll}|${va}`;
      const result = await runCell(label, cfg);
      e4Rows.push({
        _row: `${ll.slice(0, 8)}|${va.slice(0, 8)}`,
        ll: ll.slice(0, 10),
        va: va.slice(0, 10),
        ...summary(result)
      });
      allResults[`E4.${ll}.${va}`] = { config: cfg, result, batterData, bowlerData };
    }
  }
  printTable(e4Rows);
}

// ---------- E5: Phase sweep ----------
console.log(`\n=== E5: Phase sweep (4 cells) ===`);
{
  const e5Rows = [];
  for (const phaseName of ['powerplay', 'earlyMiddle', 'lateMiddle', 'death']) {
    let cfg = buildDefaultConfig();
    cfg = applyPhaseContext(cfg, phaseName);
    const batterData = applyArchetype(cfg, BATTER_ARCHETYPES, 'mid-balanced', 'striker');
    const bowlerData = applyArchetype(cfg, BOWLER_ARCHETYPES, 'mid-pace', 'bowler');
    const label = `E5.${phaseName}`;
    const result = await runCell(label, cfg);
    e5Rows.push({
      _row: phaseName,
      ...summary(result)
    });
    allResults[`E5.${phaseName}`] = { config: cfg, result, batterData, bowlerData };
  }
  printTable(e5Rows);
}

// ---------- Persist ----------

console.log('\n=== Writing outputs ===');
const summaryPath = pathResolve(OUTPUT_DIR, 'experiments-summary.json');
const rawPath = pathResolve(OUTPUT_DIR, 'experiments-raw.json');

// Trim raw output: drop full histogram object copies (too heavy) — keep summary fields
const summaryDoc = {
  ballsPerCell: BALLS_PER_CELL,
  generatedAt: new Date().toISOString(),
  cells: Object.fromEntries(Object.entries(allResults).map(([k, v]) => [
    k,
    {
      striker: players[v.batterData?.resolvedPlayerId]?.name,
      bowler: players[v.bowlerData?.resolvedPlayerId]?.name,
      tier: v.config.accelerationTier,
      lineLength: v.config.lineLength,
      variation: v.config.variation,
      phase: v.config.phase,
      SR: v.result.strikeRate,
      econ: v.result.economyRate,
      wicketProb: v.result.wicketProbability,
      boundaryRate: v.result.boundaryRate,
      dotRate: v.result.outcomeDistribution['0']?.percentage / 100,
      sixRate: v.result.outcomeDistribution['6']?.percentage / 100,
      fourRate: v.result.outcomeDistribution['4']?.percentage / 100,
      cqMean: v.result.contactQualityMean,
      cqStd: v.result.contactQualityStdDev,
      aerialRate: v.result.aerialRate,
      sixAmongAerialRate: v.result.sixAmongAerialRate,
      groundedInterceptionRate: v.result.groundedInterceptionRate,
      catchConversion: v.result.catchConversion,
      catchAttempts: v.result.catchAttempts,
      contact: {
        middled: v.result.contactDistribution.middled?.percentage,
        edged: v.result.contactDistribution.edged?.percentage,
        missed: v.result.contactDistribution.missed?.percentage
      },
      shotType: v.result.shotTypeDistribution,
      hitZone: v.result.hitZoneDistribution,
      decisionDelta: v.result.decisionDeltaDistribution,
      executionDelta: v.result.executionDeltaDistribution,
      cqBuckets: v.result.cqDistribution,
      shotSpeedBuckets: v.result.shotSpeedDistribution,
      fielderDistBuckets: v.result.fielderDistanceDistribution,
      dismissals: v.result.dismissalDistribution
    }
  ]))
};

writeFileSync(summaryPath, JSON.stringify(summaryDoc, null, 2));
console.log(`Wrote ${summaryPath}`);

// Raw kept for any deeper poking later
writeFileSync(rawPath, JSON.stringify(allResults, (k, v) => {
  // Don't serialize the full player objects — they're heavy
  if (k === 'config' || k === 'batterData' || k === 'bowlerData') return v;
  return v;
}, 2));
console.log(`Wrote ${rawPath}`);

console.log('\nDone.');
