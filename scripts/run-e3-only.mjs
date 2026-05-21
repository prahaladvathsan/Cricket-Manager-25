// Re-run only E3 (acceleration tier sweep) × 3 phases.
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

const PHASE_CONTEXTS = {
  powerplay:   { phase: 'powerplay',   over: 3,  ball: 1, wicketsInHand: 10, currentRunRate: 8.0, requiredRunRate: 8.5, ballsLeft: 102, target: 180, oversBowled: 1.0 },
  earlyMiddle: { phase: 'earlyMiddle', over: 10, ball: 1, wicketsInHand: 7,  currentRunRate: 8.0, requiredRunRate: 9.5, ballsLeft: 65,  target: 180, oversBowled: 2.0 },
  death:       { phase: 'death',       over: 18, ball: 1, wicketsInHand: 3,  currentRunRate: 8.5, requiredRunRate: 12.0, ballsLeft: 12, target: 200, oversBowled: 4.0 }
};

function applyArchetype(config, presetArr, presetId, kind) {
  const preset = presetArr.find(p => p.id === presetId);
  const resolved = resolvePreset(preset, players);
  if (kind === 'striker') {
    config.strikerId = resolved.playerId;
    config.strikerAttributeOverrides = resolved.attributeOverrides;
  } else {
    config.bowlerId = resolved.playerId;
    config.bowlerAttributeOverrides = resolved.attributeOverrides;
    if (resolved.lineLength) config.lineLength = resolved.lineLength;
    if (resolved.variation) config.variation = resolved.variation;
    const bowler = players[resolved.playerId];
    config.bowlingType = (bowler?.bowlingType?.toLowerCase() === 'spin') ? 'spin' : 'pace';
  }
}

const TIERS = ['Blockade','Build','Rotate','Cruise','Blitz','Hit Out/Get Out'];
const results = {};

for (const phase of ['powerplay', 'earlyMiddle', 'death']) {
  console.log(`\nPhase: ${phase}`);
  for (const tier of TIERS) {
    const cfg = { ...buildDefaultConfig(), ...PHASE_CONTEXTS[phase] };
    applyArchetype(cfg, BATTER_ARCHETYPES, 'mid-balanced', 'striker');
    applyArchetype(cfg, BOWLER_ARCHETYPES, 'mid-pace', 'bowler');
    cfg.accelerationTier = tier;
    const t0 = Date.now();
    const r = await runTestSimulation(cfg, players, BALLS);
    const elapsed = Date.now() - t0;
    results[`E3.${phase}.${tier}`] = {
      config: cfg, result: r,
      striker: players[cfg.strikerId]?.name,
      bowler: players[cfg.bowlerId]?.name
    };
    console.log(`  ${tier.padEnd(17)} SR=${r.strikeRate.toFixed(1).padStart(5)}  Wkt%=${(r.wicketProbability*100).toFixed(2).padStart(5)}  6%=${(r.outcomeDistribution['6']?.percentage||0).toFixed(2)}  Aer%=${(r.aerialRate*100).toFixed(1)}  Catch%=${(r.catchConversion*100).toFixed(1)}  (${elapsed}ms)`);
  }
}

const out = {
  ballsPerCell: BALLS,
  generatedAt: new Date().toISOString(),
  notes: 'missed-wicket base 0.07 (was 0.08); catch prob = catching/20 (no speed bonus); run-out errorBase 0.025',
  cells: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, {
    striker: v.striker,
    bowler: v.bowler,
    tier: v.config.accelerationTier,
    phase: v.config.phase,
    SR: v.result.strikeRate,
    econ: v.result.economyRate,
    wicketProb: v.result.wicketProbability,
    boundaryRate: v.result.boundaryRate,
    sixRate: v.result.outcomeDistribution['6']?.percentage / 100 || 0,
    fourRate: v.result.outcomeDistribution['4']?.percentage / 100 || 0,
    dotRate: v.result.outcomeDistribution['0']?.percentage / 100 || 0,
    aerialRate: v.result.aerialRate,
    sixAmongAerialRate: v.result.sixAmongAerialRate,
    groundedInterceptionRate: v.result.groundedInterceptionRate,
    catchConversion: v.result.catchConversion,
    catchAttempts: v.result.catchAttempts,
    cqMean: v.result.contactQualityMean,
    contact: {
      middled: v.result.contactDistribution.middled?.percentage,
      edged: v.result.contactDistribution.edged?.percentage,
      missed: v.result.contactDistribution.missed?.percentage
    },
    dismissals: v.result.dismissalDistribution
  }]))
};
const outPath = pathResolve(OUTPUT_DIR, 'E3-pass3.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nWrote ${outPath}`);
