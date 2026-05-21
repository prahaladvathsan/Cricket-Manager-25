/**
 * Mini Match Mode runner — orchestrates N full innings in Node by calling
 * SimpleBallSimulator directly. Skips the Zustand-store layer the live game
 * uses; instead manages batting order, bowler rotation, striker swap, wickets,
 * and innings end conditions locally. Good enough for balance analysis at
 * team-aggregate level.
 *
 * Run with:
 *   node --import ./scripts/register-json-loader.mjs scripts/run-match-mode.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import SimpleBallSimulator from '../src/core/match-engine/core/SimpleBallSimulator.js';
import playstyleCalculator from '../src/utils/PlaystyleCalculator.js';
import accelerationTierManager from '../src/core/tactics/AccelerationTierManager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = pathResolve(__dirname, '..');
const OUTPUT_DIR = pathResolve(PROJECT_ROOT, 'docs/dev/active/balance-analysis');

const MATCH_COUNT = parseInt(process.env.MATCHES || '1000', 10);

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------- Player DB load + playstyle enrichment ----------

const dbPath = pathResolve(PROJECT_ROOT, 'public/data/master_player_database.json');
const rawDB = JSON.parse(readFileSync(dbPath, 'utf-8'));
const playersArr = rawDB.players || [];

const players = {};
for (const p of playersArr) {
  if (p.bowlingType === null || p.bowlingType === undefined) {
    p.bowlingType = Math.random() < 0.5 ? 'pace' : 'spin';
  }
  const ratings = playstyleCalculator.calculateAllPlaystyleRatings(p);
  const primary = playstyleCalculator.getPlayerPrimaryPlaystyles(p, p.role, 3);
  p.playstyleRatings = ratings;
  p.topPlaystyles = { batting: primary.batting, bowling: primary.bowling, fielding: primary.fielding || [] };
  p.primaryPlaystyle = {
    batting: primary.batting[0]?.name || null,
    bowling: primary.bowling[0]?.name || null,
    fielding: primary.fielding?.[0]?.name || null
  };
  players[p.id] = p;
}

console.log(`Loaded ${playersArr.length} players with playstyles`);

// ---------- Squad selection ----------

function getBattingOverall(p) {
  return p?.attributes?.overall?.batting_overall ?? 0;
}
function getBowlingOverall(p) {
  return p?.attributes?.overall?.bowling_overall ?? 0;
}
function getOverallRating(p) {
  // Player's "overall" for percentile ranking = max of batting & bowling overall
  return Math.max(getBattingOverall(p), getBowlingOverall(p));
}

/**
 * Build a quality team using the user's percentile-based recipe:
 *   - 2 players in top 10% (percentile 0-10, where 0 = best)
 *   - 2 players in 10-20%
 *   - 2 players in 20-30%
 *   - 2 players in 30-40%
 *   - 3 more players in 30-40% to fill 11
 *   - No player below 40th percentile
 *   - Each team needs ≥4 bowlers (mix of pace + spin) and ≥1 wicketkeeper
 *
 * @param {string} label
 * @param {Set<string>} excludeIds - player IDs to exclude (for second team)
 */
function buildQualityTeam(label, excludeIds = new Set()) {
  const all = Object.values(players)
    .filter(p => !excludeIds.has(p.id))
    .sort((a, b) => getOverallRating(b) - getOverallRating(a));

  const totalPool = all.length;
  // Bucket boundaries by player count (top 10% = first 10% of sorted-descending array)
  const buckets = {
    '0-10':  all.slice(0,                              Math.floor(totalPool * 0.10)),
    '10-20': all.slice(Math.floor(totalPool * 0.10),  Math.floor(totalPool * 0.20)),
    '20-30': all.slice(Math.floor(totalPool * 0.20),  Math.floor(totalPool * 0.30)),
    '30-40': all.slice(Math.floor(totalPool * 0.30),  Math.floor(totalPool * 0.40))
  };

  // Targets per bucket — sum to 11
  const targets = { '0-10': 2, '10-20': 2, '20-30': 2, '30-40': 5 };

  // Role need quotas for the whole team
  const need = { keeper: 1, pace: 4, spin: 1, batter: 4, allrounder: 1 };

  // Classify a player's primary role for our quota
  function classify(p) {
    const r = (p.role || '').toLowerCase();
    if (r === 'wicketkeeper') return 'keeper';
    if (r === 'bowler') return p.bowlingType?.toLowerCase() === 'spin' ? 'spin' : 'pace';
    if (r === 'all-rounder') return 'allrounder';
    return 'batter';
  }

  const squad = [];
  const counts = { keeper: 0, pace: 0, spin: 0, batter: 0, allrounder: 0 };

  // Randomize within each bucket so different runs get different teams
  // (the user wants reproducibility — but slight variance per run is fine)
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // First pass: try to fill each bucket prioritising under-filled roles
  for (const [bucketKey, bucketPlayers] of Object.entries(buckets)) {
    const want = targets[bucketKey];
    const shuffled = shuffle(bucketPlayers);
    let picked = 0;
    // Pass 1: prefer players that fill role needs
    for (const p of shuffled) {
      if (picked >= want) break;
      if (squad.includes(p)) continue;
      const role = classify(p);
      if (counts[role] < need[role]) {
        squad.push(p);
        counts[role]++;
        picked++;
      }
    }
    // Pass 2: fill the bucket with whatever is left
    for (const p of shuffled) {
      if (picked >= want) break;
      if (squad.includes(p)) continue;
      squad.push(p);
      counts[classify(p)]++;
      picked++;
    }
  }

  // Squad may have <11 if buckets had insufficient unique players — pad from top 40% any-role
  if (squad.length < 11) {
    const top40Pool = [...buckets['0-10'], ...buckets['10-20'], ...buckets['20-30'], ...buckets['30-40']];
    for (const p of shuffle(top40Pool)) {
      if (squad.length >= 11) break;
      if (!squad.includes(p)) squad.push(p);
    }
  }

  return { id: label, name: label, squad: squad.slice(0, 11), counts };
}

// ---------- Field formation ----------

const simulatorForFormation = new SimpleBallSimulator({ silent: true, captureMetadata: true });

function buildFieldingTeam(bowlingSquad, strikerId, nonStrikerId, formation = 'neutral_orthodox') {
  // Build 11 fielders: bowling team minus striker (just in case there's overlap from all-rounders)
  const fielders = bowlingSquad
    .filter(p => p.id !== strikerId && p.id !== nonStrikerId)
    .slice(0, 11)
    .map(p => {
      const clone = JSON.parse(JSON.stringify(p));
      // Ensure fielding attrs (throw_speed default)
      if (!clone.attributes.fielding) clone.attributes.fielding = {};
      if (!clone.attributes.fielding.throw_speed) {
        clone.attributes.fielding.throw_speed = clone.attributes.fielding.throwPower || 25;
      }
      if (!clone.attributes.fielding.catching) clone.attributes.fielding.catching = 12;
      return clone;
    });
  // Pad to 11 if needed (rare)
  while (fielders.length < 11) {
    fielders.push({
      id: `gen_${fielders.length}`,
      name: `GenericFielder${fielders.length}`,
      role: 'all-rounder',
      attributes: {
        batting: { technique: 10, timing: 10 },
        bowling: { accuracy: 10 },
        fielding: { catching: 12, reflexes: 12, throwPower: 12, throw_speed: 25 },
        physical: { speed: 12 },
        mental: { concentration: 10 }
      },
      condition: { confidence: 50, energy: 100 }
    });
  }
  const fieldingPositions = simulatorForFormation.setFieldFormation(formation, fielders);
  return { id: 'fielding', name: 'Fielding', squad: fielders, fieldingPositions, formation, wicketKeeper: fielders[0] };
}

// ---------- Bowling rotation ----------

function buildBowlingRotation(squad) {
  // Allowed: 4 overs per bowler. Pick by bowling rating, weighted toward bowlers.
  const bowlers = squad
    .filter(p => p.role === 'bowler' || p.role === 'all-rounder')
    .sort((a, b) => getBowlingOverall(b) - getBowlingOverall(a))
    .slice(0, 7);  // up to 7 bowlers
  // Build the 20-over assignment: alternate top 5, then any bowler with overs left for slots 16-20
  const assignment = new Array(20);
  const overCounts = {};
  for (const b of bowlers) overCounts[b.id] = 0;

  // Front-load best bowlers in PP + death, mix others in middle
  const pacers = bowlers.filter(b => b.bowlingType?.toLowerCase() === 'pace');
  const spinners = bowlers.filter(b => b.bowlingType?.toLowerCase() === 'spin');

  const assignOver = (idx, preferredList) => {
    for (const b of preferredList) {
      if (overCounts[b.id] < 4) {
        assignment[idx] = b;
        overCounts[b.id]++;
        return;
      }
    }
    // Fallback to any
    for (const b of bowlers) {
      if (overCounts[b.id] < 4) {
        assignment[idx] = b;
        overCounts[b.id]++;
        return;
      }
    }
  };

  // Simple rotation: pacers in PP (0-5) and death (16-19), spinners in middle (6-15)
  for (let i = 0; i < 20; i++) {
    if (i <= 5 || i >= 16) assignOver(i, pacers.length ? pacers : bowlers);
    else assignOver(i, spinners.length ? spinners : bowlers);
  }
  return assignment;
}

// ---------- Phase helpers ----------

function determinePhase(over) {
  if (over <= 6) return 'powerplay';
  if (over <= 11) return 'earlyMiddle';
  if (over <= 15) return 'lateMiddle';
  return 'death';
}

// ---------- Innings simulation ----------

async function simulateInnings(simulator, battingSquad, bowlingSquad, target = null, debug = false) {
  // Batting order: best batters first
  const battingOrder = [...battingSquad].sort((a, b) => getBattingOverall(b) - getBattingOverall(a));
  const bowlingRotation = buildBowlingRotation(bowlingSquad);

  let strikerIdx = 0;
  let nonStrikerIdx = 1;
  let nextBatterIdx = 2;
  let totalScore = 0;
  let wickets = 0;
  let ballsBowled = 0;

  // Phase stats
  const phaseStats = { powerplay: stats(), earlyMiddle: stats(), lateMiddle: stats(), death: stats() };
  // Per-player stats
  const battingPerf = {};
  const bowlingPerf = {};

  for (const b of battingOrder) {
    battingPerf[b.id] = { id: b.id, name: b.name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
  }

  for (let over = 0; over < 20; over++) {
    if (wickets >= 10) break;
    if (target !== null && totalScore > target) break;
    const bowler = bowlingRotation[over];
    if (!bowlingPerf[bowler.id]) {
      bowlingPerf[bowler.id] = { id: bowler.id, name: bowler.name, balls: 0, runs: 0, wickets: 0 };
    }
    const phase = determinePhase(over + 1);
    const fielders = buildFieldingTeam(bowlingSquad, battingOrder[strikerIdx].id, battingOrder[nonStrikerIdx].id);

    for (let ball = 0; ball < 6; ball++) {
      if (wickets >= 10) break;
      if (target !== null && totalScore > target) break;

      const striker = battingOrder[strikerIdx];
      const nonStriker = battingOrder[nonStrikerIdx];

      const ballsLeft = (20 - over) * 6 - ball;
      const overs = over + ball / 6;
      const currentRunRate = overs > 0 ? totalScore / overs : 8;
      const requiredRunRate = target !== null && ballsLeft > 0 ? ((target - totalScore + 1) / ballsLeft) * 6 : 0;

      // Auto-tier per ball
      const battingPressure = 50;  // simplified static
      const tier = autoTier(battingPressure, phase);

      const ballContext = {
        striker,
        bowler,
        nonStriker,
        wicketKeeper: fielders.wicketKeeper,
        fieldingTeam: fielders,
        tacticsState: {
          currentAcceleration: { striker: tier, nonStriker: tier },
          bowlingPlans: {
            [bowler.id]: bowler.bowlingType?.toLowerCase() === 'spin'
              ? { lineLength: 'Wide of Off', variation: 'Consistent Line' }
              : { lineLength: 'Wide Line', variation: 'Consistent Accuracy' }
          },
          pressureIndex: { batting: battingPressure, bowling: 50 }
        },
        matchSituation: {
          phase,
          over: over + 1,
          ball: ball + 1,
          wicketsInHand: 10 - wickets,
          currentRunRate,
          requiredRunRate,
          ballsLeft,
          target: target || 180,
          oversBowled: 1
        }
      };

      const result = await simulator.simulateBall(ballContext);
      ballsBowled++;

      const runs = result.runs || 0;
      const isWicket = result.isWicket;
      const isLegal = result.isLegal !== false;

      // Phase tally
      const ps = phaseStats[phase];
      ps.balls++;
      ps.runs += runs;
      if (isWicket) ps.wickets++;
      if (runs === 0 && !isWicket) ps.dots++;
      if (runs === 4) ps.fours++;
      if (runs === 6) ps.sixes++;

      // Per-player
      const sbp = battingPerf[striker.id];
      if (sbp) {
        sbp.balls++;
        sbp.runs += runs;
        if (runs === 4) sbp.fours++;
        if (runs === 6) sbp.sixes++;
        if (isWicket) sbp.out = true;
      }
      const bbp = bowlingPerf[bowler.id];
      bbp.balls++;
      bbp.runs += runs;
      if (isWicket) bbp.wickets++;

      totalScore += runs;

      if (isWicket) {
        wickets++;
        if (wickets < 10 && nextBatterIdx < battingOrder.length) {
          strikerIdx = nextBatterIdx;
          nextBatterIdx++;
        }
      } else if (runs % 2 === 1) {
        // Swap strikers on odd runs
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }
    }

    // End of over: swap strikers
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
  }

  return { totalScore, wickets, ballsBowled, phaseStats, battingPerf, bowlingPerf };
}

function stats() {
  return { balls: 0, runs: 0, wickets: 0, dots: 0, fours: 0, sixes: 0 };
}

function autoTier(pressure, phase) {
  // Simple heuristic — mostly Cruise mid-innings, Rotate elsewhere, Blitz/HOGO in death
  if (phase === 'death') return 'Blitz';
  if (phase === 'powerplay') return 'Cruise';
  return 'Rotate';
}

// ---------- Run N matches ----------

console.log(`\nRunning ${MATCH_COUNT} matches…`);
const simulator = new SimpleBallSimulator({ silent: true, captureMetadata: false });  // metadata not needed for E6

const teamA = buildQualityTeam('TeamA');
const aIds = new Set(teamA.squad.map(p => p.id));
const teamB = buildQualityTeam('TeamB', aIds);
console.log(`Team A squad (overall ratings):`);
for (const p of teamA.squad) console.log(`  ${p.name.padEnd(25)} role=${(p.role||'').padEnd(13)} bat=${getBattingOverall(p)} bowl=${getBowlingOverall(p)}`);
console.log(`  role counts:`, teamA.counts);
console.log(`Team B squad (overall ratings):`);
for (const p of teamB.squad) console.log(`  ${p.name.padEnd(25)} role=${(p.role||'').padEnd(13)} bat=${getBattingOverall(p)} bowl=${getBowlingOverall(p)}`);
console.log(`  role counts:`, teamB.counts);

const innings1Totals = [];
const innings2Totals = [];
const innings1Wkts = [];
const innings2Wkts = [];
const allPhaseStats = { powerplay: stats(), earlyMiddle: stats(), lateMiddle: stats(), death: stats() };
const playerBatting = {};
const playerBowling = {};
const wins = { TeamA: 0, TeamB: 0, ties: 0 };
const topScorerRuns = [];
const topScorerSR = [];
const topBowlerWkts = [];
const topBowlerEcon = [];

const start = Date.now();

for (let i = 0; i < MATCH_COUNT; i++) {
  // Toss
  const aBatsFirst = Math.random() < 0.5;
  const battingFirst = aBatsFirst ? teamA : teamB;
  const battingSecond = aBatsFirst ? teamB : teamA;

  // Innings 1
  const inn1 = await simulateInnings(simulator, battingFirst.squad, battingSecond.squad);
  innings1Totals.push(inn1.totalScore);
  innings1Wkts.push(inn1.wickets);

  // Innings 2
  const inn2 = await simulateInnings(simulator, battingSecond.squad, battingFirst.squad, inn1.totalScore);
  innings2Totals.push(inn2.totalScore);
  innings2Wkts.push(inn2.wickets);

  // Winner
  let winner;
  if (inn2.totalScore > inn1.totalScore) {
    winner = aBatsFirst ? 'TeamB' : 'TeamA';
  } else if (inn1.totalScore > inn2.totalScore) {
    winner = aBatsFirst ? 'TeamA' : 'TeamB';
  } else {
    winner = 'ties';
  }
  wins[winner]++;

  // Aggregate phase stats
  for (const inn of [inn1, inn2]) {
    for (const phase of Object.keys(allPhaseStats)) {
      const ps = inn.phaseStats[phase];
      allPhaseStats[phase].balls += ps.balls;
      allPhaseStats[phase].runs += ps.runs;
      allPhaseStats[phase].wickets += ps.wickets;
      allPhaseStats[phase].dots += ps.dots;
      allPhaseStats[phase].fours += ps.fours;
      allPhaseStats[phase].sixes += ps.sixes;
    }
  }

  // Top performers + per-player career
  for (const inn of [inn1, inn2]) {
    const batsmen = Object.values(inn.battingPerf).filter(b => b.balls > 0);
    if (batsmen.length > 0) {
      const top = batsmen.reduce((max, b) => b.runs > max.runs ? b : max, batsmen[0]);
      topScorerRuns.push(top.runs);
      topScorerSR.push(top.balls > 0 ? (top.runs / top.balls) * 100 : 0);
    }
    const bowlers = Object.values(inn.bowlingPerf).filter(b => b.balls > 0);
    if (bowlers.length > 0) {
      const top = bowlers.reduce((max, b) => {
        if (b.wickets > max.wickets) return b;
        if (b.wickets === max.wickets && (max.balls > 0 ? max.runs / max.balls : 999) > (b.balls > 0 ? b.runs / b.balls : 999)) return b;
        return max;
      }, bowlers[0]);
      topBowlerWkts.push(top.wickets);
      const overs = top.balls / 6;
      topBowlerEcon.push(overs > 0 ? top.runs / overs : 0);
    }
    for (const b of batsmen) {
      if (!playerBatting[b.id]) {
        playerBatting[b.id] = { id: b.id, name: b.name, runs: 0, balls: 0, innings: 0, dismissals: 0, fours: 0, sixes: 0 };
      }
      const pb = playerBatting[b.id];
      pb.runs += b.runs;
      pb.balls += b.balls;
      pb.fours += b.fours;
      pb.sixes += b.sixes;
      pb.innings++;
      if (b.out) pb.dismissals++;
    }
    for (const b of bowlers) {
      if (!playerBowling[b.id]) {
        playerBowling[b.id] = { id: b.id, name: b.name, runs: 0, balls: 0, wickets: 0, innings: 0 };
      }
      const pb = playerBowling[b.id];
      pb.runs += b.runs;
      pb.balls += b.balls;
      pb.wickets += b.wickets;
      pb.innings++;
    }
  }

  if ((i + 1) % 100 === 0) {
    const elapsed = Date.now() - start;
    console.log(`  Completed ${i + 1}/${MATCH_COUNT} in ${(elapsed / 1000).toFixed(1)}s`);
  }
}

const elapsed = Date.now() - start;
console.log(`\nDone in ${(elapsed / 1000).toFixed(1)}s\n`);

// ---------- Aggregate + report ----------

function summarize(arr) {
  if (!arr.length) return { mean: 0, std: 0, p10: 0, p50: 0, p90: 0, min: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const sumSq = sorted.reduce((a, b) => a + b * b, 0);
  const variance = sumSq / sorted.length - mean * mean;
  return {
    mean,
    std: Math.sqrt(Math.max(0, variance)),
    p10: sorted[Math.floor(sorted.length * 0.1)],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
    min: sorted[0],
    max: sorted[sorted.length - 1]
  };
}

const inn1Stats = summarize(innings1Totals);
const inn2Stats = summarize(innings2Totals);
const allTotals = summarize([...innings1Totals, ...innings2Totals]);
const allWkts = summarize([...innings1Wkts, ...innings2Wkts]);

console.log('=== INNINGS TOTALS ===');
console.log(`  All innings:   μ=${allTotals.mean.toFixed(1)} σ=${allTotals.std.toFixed(1)} p10=${allTotals.p10} p50=${allTotals.p50} p90=${allTotals.p90} range=${allTotals.min}-${allTotals.max}`);
console.log(`  1st innings:   μ=${inn1Stats.mean.toFixed(1)} σ=${inn1Stats.std.toFixed(1)} p10=${inn1Stats.p10} p50=${inn1Stats.p50} p90=${inn1Stats.p90}`);
console.log(`  2nd innings:   μ=${inn2Stats.mean.toFixed(1)} σ=${inn2Stats.std.toFixed(1)} p10=${inn2Stats.p10} p50=${inn2Stats.p50} p90=${inn2Stats.p90}`);
console.log(`  Wickets/inn:   μ=${allWkts.mean.toFixed(2)} σ=${allWkts.std.toFixed(2)} p10=${allWkts.p10} p50=${allWkts.p50} p90=${allWkts.p90}`);

console.log('\n=== PHASE SPLITS ===');
console.log('  Phase       | RR    | RunsInn | WktsInn | Bndry% | Dot%');
for (const phase of ['powerplay', 'earlyMiddle', 'lateMiddle', 'death']) {
  const ps = allPhaseStats[phase];
  const totalInn = MATCH_COUNT * 2;
  const overs = ps.balls / 6;
  const rr = overs > 0 ? ps.runs / overs : 0;
  const runsPerInn = ps.runs / totalInn;
  const wktsPerInn = ps.wickets / totalInn;
  const bndry = ps.balls > 0 ? (ps.fours + ps.sixes) / ps.balls : 0;
  const dot = ps.balls > 0 ? ps.dots / ps.balls : 0;
  console.log(`  ${phase.padEnd(11)} | ${rr.toFixed(2).padStart(5)} | ${runsPerInn.toFixed(1).padStart(7)} | ${wktsPerInn.toFixed(2).padStart(7)} | ${(bndry * 100).toFixed(1)}% | ${(dot * 100).toFixed(1)}%`);
}

console.log('\n=== TOP SCORER (per innings) ===');
const tsRuns = summarize(topScorerRuns);
const tsSR = summarize(topScorerSR);
console.log(`  Runs: μ=${tsRuns.mean.toFixed(1)} p50=${tsRuns.p50} p90=${tsRuns.p90} max=${tsRuns.max}`);
console.log(`  SR:   μ=${tsSR.mean.toFixed(1)} p50=${tsSR.p50.toFixed(1)} p90=${tsSR.p90.toFixed(1)}`);

console.log('\n=== TOP BOWLER (per innings) ===');
const tbW = summarize(topBowlerWkts);
const tbE = summarize(topBowlerEcon);
console.log(`  Wkts: μ=${tbW.mean.toFixed(2)} p50=${tbW.p50} p90=${tbW.p90} max=${tbW.max}`);
console.log(`  Econ: μ=${tbE.mean.toFixed(2)} p50=${tbE.p50.toFixed(2)} p90=${tbE.p90.toFixed(2)}`);

console.log('\n=== WINS ===');
console.log(`  TeamA: ${wins.TeamA}  TeamB: ${wins.TeamB}  Ties: ${wins.ties}`);

console.log('\n=== BATTING LEADERS (≥ 10 innings, ≥ 100 balls) ===');
const batLeaders = Object.values(playerBatting)
  .filter(p => p.innings >= 10 && p.balls >= 100)
  .map(p => ({
    ...p,
    SR: p.balls > 0 ? (p.runs / p.balls) * 100 : 0,
    avg: p.dismissals > 0 ? p.runs / p.dismissals : p.runs,
    runsPerInn: p.runs / p.innings
  }))
  .sort((a, b) => b.runsPerInn - a.runsPerInn)
  .slice(0, 15);
console.log('  Name                    | Inn | Runs  | Balls | SR    | Avg   | R/Inn');
for (const p of batLeaders) {
  console.log(`  ${p.name.padEnd(23)} | ${String(p.innings).padStart(3)} | ${String(p.runs).padStart(5)} | ${String(p.balls).padStart(5)} | ${p.SR.toFixed(1).padStart(5)} | ${p.avg.toFixed(1).padStart(5)} | ${p.runsPerInn.toFixed(1).padStart(5)}`);
}

console.log('\n=== BOWLING LEADERS (≥ 10 innings, ≥ 60 balls) ===');
const bowLeaders = Object.values(playerBowling)
  .filter(p => p.innings >= 10 && p.balls >= 60)
  .map(p => ({
    ...p,
    econ: p.balls > 0 ? (p.runs / (p.balls / 6)) : 0,
    avg: p.wickets > 0 ? p.runs / p.wickets : Infinity,
    SR: p.wickets > 0 ? p.balls / p.wickets : Infinity,
    wPerInn: p.wickets / p.innings
  }))
  .sort((a, b) => b.wPerInn - a.wPerInn)
  .slice(0, 15);
console.log('  Name                    | Inn | Balls | Runs | Wkts | Econ  | W/Inn');
for (const p of bowLeaders) {
  console.log(`  ${p.name.padEnd(23)} | ${String(p.innings).padStart(3)} | ${String(p.balls).padStart(5)} | ${String(p.runs).padStart(4)} | ${String(p.wickets).padStart(4)} | ${p.econ.toFixed(2).padStart(5)} | ${p.wPerInn.toFixed(2).padStart(5)}`);
}

// IRL pass/fail
console.log('\n=== IRL T20 BENCHMARK CHECK ===');
const checks = [
  { label: 'Innings total mean', value: allTotals.mean, ok: allTotals.mean >= 155 && allTotals.mean <= 180, target: '155-180' },
  { label: 'Innings total p10', value: allTotals.p10, ok: allTotals.p10 >= 110 && allTotals.p10 <= 140, target: '110-140' },
  { label: 'Innings total p90', value: allTotals.p90, ok: allTotals.p90 >= 195 && allTotals.p90 <= 220, target: '195-220' },
  { label: 'Wickets/inn', value: allWkts.mean, ok: allWkts.mean >= 6 && allWkts.mean <= 8, target: '6-8' },
  { label: 'PP RR', value: allPhaseStats.powerplay.runs / (allPhaseStats.powerplay.balls / 6), ok: false, target: '8.0-8.5' },
  { label: 'Middle RR', value: (allPhaseStats.earlyMiddle.runs + allPhaseStats.lateMiddle.runs) / ((allPhaseStats.earlyMiddle.balls + allPhaseStats.lateMiddle.balls) / 6), ok: false, target: '7.5-8.5' },
  { label: 'Death RR', value: allPhaseStats.death.runs / (allPhaseStats.death.balls / 6), ok: false, target: '9.5-11.0' }
];
checks[4].ok = checks[4].value >= 8.0 && checks[4].value <= 8.5;
checks[5].ok = checks[5].value >= 7.5 && checks[5].value <= 8.5;
checks[6].ok = checks[6].value >= 9.5 && checks[6].value <= 11.0;
for (const c of checks) {
  console.log(`  ${c.ok ? '✓' : '✗'} ${c.label.padEnd(20)} = ${typeof c.value === 'number' ? c.value.toFixed(2) : c.value} (target ${c.target})`);
}

// Persist
const outPath = pathResolve(OUTPUT_DIR, 'match-mode-summary.json');
writeFileSync(outPath, JSON.stringify({
  matchCount: MATCH_COUNT,
  generatedAt: new Date().toISOString(),
  inn1Stats, inn2Stats, allTotals, allWkts,
  phaseStats: allPhaseStats,
  topScorerStats: { runs: tsRuns, SR: tsSR },
  topBowlerStats: { wickets: tbW, econ: tbE },
  wins,
  batLeaders: batLeaders.slice(0, 30),
  bowLeaders: bowLeaders.slice(0, 30),
  benchmarkChecks: checks
}, null, 2));
console.log(`\nWrote ${outPath}`);
