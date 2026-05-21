// Re-run only E1 (single-batter sweep) with current engine state.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTestSimulation } from '../src/components/testing/TestSimulator.js';
import { BATTER_ARCHETYPES, BOWLER_ARCHETYPES, resolvePreset } from '../src/components/testing/archetypePresets.js';
import playstyleCalculator from '../src/utils/PlaystyleCalculator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = pathResolve(__dirname, '..');
const OUTPUT_DIR = pathResolve(PROJECT_ROOT, 'docs/dev/active/balance-analysis');
const BALLS = parseInt(process.env.BALLS || '100000', 10);

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Loading player DB…');
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

function buildDefaultConfig() {
  return {
    strikerId: null, bowlerId: null, nonStrikerId: null,
    phase: 'earlyMiddle', over: 10, ball: 1, wicketsInHand: 7,
    currentRunRate: 8.0, requiredRunRate: 9.5, ballsLeft: 65, target: 180, oversBowled: 2.0,
    strikerConfidence: 60, strikerEnergy: 80, bowlerConfidence: 60, bowlerEnergy: 80,
    battingPressure: 50, bowlingPressure: 50,
    accelerationTier: 'Cruise',
    battingPlaystyle: null, battingPlaystyleRating: null,
    bowlingType: 'pace', lineLength: 'Wide Line', variation: 'Consistent Accuracy',
    bowlingPlaystyle: null, bowlingPlaystyleRating: null,
    fieldTemplate: 'neutral_orthodox',
    strikerAttributeOverrides: null, bowlerAttributeOverrides: null
  };
}

function applyArchetype(config, presetArr, presetId, kind) {
  const preset = presetArr.find(p => p.id === presetId);
  if (!preset) throw new Error('Unknown preset ' + presetId);
  const resolved = resolvePreset(preset, players);
  if (!resolved) throw new Error('Could not resolve preset ' + presetId);
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
    config.bowlingType = (bowler?.bowlingType?.toLowerCase() === 'spin') ? 'spin' : 'pace';
  }
  return { resolvedPlayerId: resolved.playerId };
}

const PRESETS = ['top-power-hitter','top-anchor','top-balanced','top-finisher','mid-balanced','mid-slogger','tail-biffer','weak-batter','synthetic-maxed','synthetic-floor'];

console.log(`\n=== E1 only (${BALLS.toLocaleString()} balls per cell) ===`);
const results = {};
for (const id of PRESETS) {
  const cfg = buildDefaultConfig();
  const bowlerData = applyArchetype(cfg, BOWLER_ARCHETYPES, 'mid-pace', 'bowler');
  const batterData = applyArchetype(cfg, BATTER_ARCHETYPES, id, 'striker');
  const t0 = Date.now();
  const r = await runTestSimulation(cfg, players, BALLS);
  const t = Date.now() - t0;
  results['E1.' + id] = { config: cfg, result: r, striker: players[batterData.resolvedPlayerId]?.name };
  console.log(`  ✓ ${id.padEnd(18)} → ${players[batterData.resolvedPlayerId]?.name?.padEnd(20) || '?'} ${t}ms  SR=${r.strikeRate.toFixed(1)}  Wkt%=${(r.wicketProbability*100).toFixed(2)}`);
}

// Build summary doc
const summaryDoc = {
  ballsPerCell: BALLS,
  generatedAt: new Date().toISOString(),
  tuningPass: 2,
  notes: 'shot speed base 12 (was 9); fielder baseSpeed 7.0 (was 8.0); run-out errorProbabilityBase 0.032 (was 0.064)',
  cells: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, {
    striker: v.striker,
    bowler: 'Sompal Kami',
    SR: v.result.strikeRate,
    econ: v.result.economyRate,
    wicketProb: v.result.wicketProbability,
    boundaryRate: v.result.boundaryRate,
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
    outcomeDistribution: v.result.outcomeDistribution,
    dismissals: v.result.dismissalDistribution
  }]))
};

const outPath = pathResolve(OUTPUT_DIR, 'experiments-E1-pass2.json');
writeFileSync(outPath, JSON.stringify(summaryDoc, null, 2));
console.log(`\nWrote ${outPath}`);
