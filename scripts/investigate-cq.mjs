/**
 * Focused CQ-distribution investigation. Tests several symmetric matchups
 * to isolate whether CQ has a systemic skew or whether the previous +19 mean
 * was purely an artifact of bowler selection.
 *
 * Run:
 *   node --import ./scripts/register-json-loader.mjs scripts/investigate-cq.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import SimpleBallSimulator from '../src/core/match-engine/core/SimpleBallSimulator.js';
import playstyleCalculator from '../src/utils/PlaystyleCalculator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = pathResolve(__dirname, '..');

// ---------- Player DB ----------
const rawDB = JSON.parse(readFileSync(pathResolve(PROJECT_ROOT, 'public/data/master_player_database.json'), 'utf-8'));
const players = {};
for (const p of rawDB.players) {
  if (!p.bowlingType) p.bowlingType = Math.random() < 0.5 ? 'pace' : 'spin';
  const ratings = playstyleCalculator.calculateAllPlaystyleRatings(p);
  const primary = playstyleCalculator.getPlayerPrimaryPlaystyles(p, p.role, 3);
  p.playstyleRatings = ratings;
  p.topPlaystyles = { batting: primary.batting, bowling: primary.bowling, fielding: primary.fielding || [] };
  p.primaryPlaystyle = { batting: primary.batting[0]?.name || null, bowling: primary.bowling[0]?.name || null };
  players[p.id] = p;
}

// ---------- Synthetic players ----------

function makeSynthetic(id, name, batting, bowling, physical, mental) {
  return {
    id, name,
    role: 'all-rounder',
    battingHand: 'right',
    bowlingHand: 'right',
    bowlingType: 'pace',
    bowlingStyle: 'Right-arm fast',
    primaryPlaystyle: { batting: 'Top Order - Balanced', bowling: 'Hit-the-Deck Seamer' },
    playstyleRatings: { batting: {}, bowling: { pace: {} }, fielding: {} },
    topPlaystyles: { batting: [], bowling: [], fielding: [] },
    attributes: {
      batting: { technique: batting, timing: batting, footwork: batting, placement: batting, range360: batting, defensiveShots: batting, neutralShots: batting, attackingShots: batting, vsPace: batting, vsSpin: batting, creativity: batting },
      bowling: { accuracy: bowling, bowlingSpeed: bowling, swing: bowling, turn: bowling, flight: bowling, variations: bowling, intelligence: bowling, defensiveBowling: bowling, neutralBowling: bowling, attackingBowling: bowling },
      physical: { strength: physical, speed: physical, agility: physical, maxFitness: physical, endurance: physical, stamina: physical },
      fielding: { catching: 12, reflexes: 12, groundFielding: 12, throwPower: 12, throwAccuracy: 12, throw_speed: 25, keeping: 5, collecting: 5, stumping: 5 },
      mental: { concentration: mental, temperament: mental, aggression: mental, judgement: mental, leadership: mental },
      overall: { batting_overall: batting, bowling_overall: bowling }
    },
    condition: { confidence: 50, energy: 100, form: 50, fitness: 85, fatigue: 0, morale: 50 },
    tactics: { bowlingStylePreferences: { 'Swing Bowler': 1, 'Hit-the-Deck Seamer': 2 } }
  };
}

// ---------- Fielders (generic) ----------

const simForFormation = new SimpleBallSimulator({ silent: true, captureMetadata: true });

function buildFieldingTeam() {
  const fielders = [];
  for (let i = 0; i < 11; i++) {
    fielders.push({
      id: `gen_${i}`,
      name: `GenFielder${i}`,
      role: 'all-rounder',
      attributes: {
        batting: { technique: 10, timing: 10 },
        bowling: { accuracy: 10 },
        fielding: { catching: 12, reflexes: 12, throw_speed: 25, throwPower: 12 },
        physical: { speed: 10 },
        mental: { concentration: 10 }
      },
      condition: { confidence: 50, energy: 100 }
    });
  }
  const positions = simForFormation.setFieldFormation('neutral_orthodox', fielders);
  return { id: 'fielding', name: 'F', squad: fielders, fieldingPositions: positions, formation: 'neutral_orthodox', wicketKeeper: fielders[0] };
}

// ---------- Test runner ----------

const simulator = new SimpleBallSimulator({ silent: true, captureMetadata: true });

async function testMatchup(label, striker, bowler, balls = 30000) {
  const fielding = buildFieldingTeam();
  const baseContext = {
    striker, bowler, nonStriker: striker,
    wicketKeeper: fielding.wicketKeeper,
    fieldingTeam: fielding,
    tacticsState: {
      currentAcceleration: { striker: 'Rotate', nonStriker: 'Rotate' },
      bowlingPlans: { [bowler.id]: { lineLength: 'Wide Line', variation: 'Consistent Accuracy' } },
      pressureIndex: { batting: 50, bowling: 50 }
    },
    matchSituation: { phase: 'earlyMiddle', over: 10, ball: 1, wicketsInHand: 7, currentRunRate: 8, requiredRunRate: 9, ballsLeft: 65, target: 180, oversBowled: 2 }
  };

  let cqSum = 0;
  let cqCount = 0;
  let cqMin = Infinity, cqMax = -Infinity;
  // Raw d40 means we can sanity-check
  const samples = [];

  for (let i = 0; i < balls; i++) {
    const r = await simulator.simulateBall(baseContext);
    const cq = r.metadata?.contactResult?.contactQuality;
    if (typeof cq === 'number') {
      cqSum += cq;
      cqCount++;
      if (cq < cqMin) cqMin = cq;
      if (cq > cqMax) cqMax = cq;
      if (samples.length < 3) {
        // Inspect raw scores
        samples.push({
          cq,
          decisionDelta: r.metadata?.decisionResult?.judgmentAbility - r.metadata?.decisionResult?.deliveryThreat,
          executionDelta: r.metadata?.contactResult?.batsmanExecutionScore - r.metadata?.contactResult?.bowlerExecutionScore,
          contactType: r.metadata?.contactResult?.type
        });
      }
    }
  }

  const mean = cqSum / cqCount;
  console.log(`  ${label.padEnd(45)} CQ μ=${mean.toFixed(2).padStart(7)} range [${cqMin}, ${cqMax}], samples ${samples[0] ? JSON.stringify(samples[0]) : ''}`);
  return mean;
}

console.log('=== CQ Skew Investigation ===\n');
console.log('CQ formula: (timing+footwork+technique+d40_bat) - (accuracy+swing+speed/turn+d40_bow)');
console.log('d40 = uniform[1,40], mean 20.5\n');

console.log('Symmetric attribute matchups (everyone gets same value):');
for (const v of [3, 5, 8, 10, 12, 15, 18, 20]) {
  const bat = makeSynthetic('bat-' + v, 'Bat' + v, v, 1, 10, 10);
  const bowl = makeSynthetic('bowl-' + v, 'Bowl' + v, 1, v, 10, 10);
  // batting attrs all v, bowling attrs all v. So batting sum = 3v + d40, bowling sum = 3v + d40
  // Expected CQ: 0 (signal is zero; only d40 noise)
  await testMatchup(`Bat(all=${v}) vs Bowl(all=${v})  expected CQ μ ≈ 0`, bat, bowl);
}

console.log('\nMatched batter and bowler with attr=10 across all:');
const sym10 = makeSynthetic('sym10', 'Sym10', 10, 10, 10, 10);
await testMatchup('Sym10 (bat=10, bowl=10) vs itself (expected CQ μ ≈ 0)', sym10, sym10);

console.log('\nExtreme matchups:');
const eliteBat = makeSynthetic('eb', 'EliteBat', 20, 1, 20, 20);
const eliteBowl = makeSynthetic('ebw', 'EliteBowl', 1, 20, 10, 20);
await testMatchup('Elite Bat (20s) vs Weak Bowl (1s)  expected CQ μ ≈ +57', eliteBat, makeSynthetic('wb', 'WeakBowl', 1, 1, 10, 10));
await testMatchup('Weak Bat (1s) vs Elite Bowl (20s)  expected CQ μ ≈ -57', makeSynthetic('wbat', 'WeakBat', 1, 1, 10, 10), eliteBowl);
await testMatchup('Elite Bat (20s) vs Elite Bowl (20s) expected CQ μ ≈ 0', eliteBat, eliteBowl);

console.log('\nReal-player matchups (with their full attribute profiles):');
const Bumrah = players[Object.values(players).find(p => p.name === 'Jasprit Bumrah').id];
const SKY = Object.values(players).find(p => p.name === 'Suryakumar Yadav');
const Bennett = Object.values(players).find(p => p.name === 'Brian Bennett');
const Kami = Object.values(players).find(p => p.name === 'Sompal Kami');
const Russell = Object.values(players).find(p => p.name === 'Andre Russell');
console.log(`  Bennett bat attrs sum: ${['technique','timing','footwork'].reduce((a,k)=>a+Bennett.attributes.batting[k],0)} (vs Kami bowling sum: accuracy+swing+bowlingSpeed = ${Kami.attributes.bowling.accuracy + Kami.attributes.bowling.swing + Kami.attributes.bowling.bowlingSpeed})`);
console.log(`  SKY bat attrs sum:     ${['technique','timing','footwork'].reduce((a,k)=>a+SKY.attributes.batting[k],0)} (vs Bumrah bowling sum: ${Bumrah.attributes.bowling.accuracy + Bumrah.attributes.bowling.swing + Bumrah.attributes.bowling.bowlingSpeed})`);
console.log(`  Russell bat attrs sum: ${['technique','timing','footwork'].reduce((a,k)=>a+Russell.attributes.batting[k],0)} (vs Bumrah bowling sum: ${Bumrah.attributes.bowling.accuracy + Bumrah.attributes.bowling.swing + Bumrah.attributes.bowling.bowlingSpeed})`);
await testMatchup('Bennett vs Kami (real mid vs real mid)', Bennett, Kami);
await testMatchup('SKY vs Bumrah (real elite vs real elite)', SKY, Bumrah);
await testMatchup('Russell vs Bumrah (real elite slogger vs real elite pacer)', Russell, Bumrah);
await testMatchup('Bennett vs Bumrah', Bennett, Bumrah);
await testMatchup('SKY vs Kami', SKY, Kami);
