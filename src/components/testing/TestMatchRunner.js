/**
 * @file TestMatchRunner.js
 * @description Match Mode runner — executes N full matches between two teams via
 * QuickSimMatch and aggregates per-match results into distributions for balance
 * analysis. Uses the same simulator path as the live game (no shortcuts).
 *
 * Unlike Ball Mode (TestSimulator.js), this DOES exercise dynamic tactics:
 * acceleration tier swaps, pressure swings, fatigue/confidence decay.
 */

import { quickSimMatch } from '../../core/match-engine/utils/QuickSimMatch.js';

const PHASES = ['powerplay', 'earlyMiddle', 'lateMiddle', 'death'];

/**
 * Compute percentile values from a sorted numeric array.
 * @param {number[]} sorted - sorted ascending
 * @param {number} p - percentile in [0,100]
 */
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function summarizeArray(arr) {
  if (!arr.length) return { mean: 0, std: 0, p10: 0, p50: 0, p90: 0, min: 0, max: 0, count: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const sumSq = sorted.reduce((a, b) => a + b * b, 0);
  const variance = sumSq / sorted.length - mean * mean;
  return {
    mean,
    std: Math.sqrt(Math.max(0, variance)),
    p10: percentile(sorted, 10),
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: sorted.length
  };
}

/**
 * Build a matchConfig in the same shape as SimulationEngine.js:1050.
 */
function buildMatchConfig(matchId, homeTeam, awayTeam, homePlayingXI, awayPlayingXI) {
  const tossWinnerId = Math.random() < 0.5 ? homeTeam.id : awayTeam.id;
  const tossDecision = Math.random() < 0.5 ? 'bat' : 'bowl';
  return {
    id: matchId,
    homeTeam: { ...homeTeam, playingXI: homePlayingXI, players: homePlayingXI },
    awayTeam: { ...awayTeam, playingXI: awayPlayingXI, players: awayPlayingXI },
    venue: homeTeam.homeGround || 'Test Venue',
    tossWinner: tossWinnerId,
    tossDecision
  };
}

/**
 * Resolve a team's playing XI from teamStore. Falls back to first 11 players
 * from squadLists if tactics.squadSelection is missing or incomplete.
 */
function resolvePlayingXI(team, teamStore, playerStore) {
  const tactics = teamStore.getState().getTeamTactics?.(team.id);
  if (tactics?.squadSelection?.length === 11) {
    return tactics.squadSelection;
  }
  const squad = teamStore.getState().squadLists?.[team.id] || [];
  if (squad.length >= 11) return squad.slice(0, 11);
  // Last resort: any 11 players assigned to this team
  const teamPlayers = playerStore.getState().getPlayersByTeam?.(team.id) || [];
  return teamPlayers.slice(0, 11).map(p => p.id);
}

/**
 * Run N matches between two teams. Returns aggregated distributions.
 *
 * @param {Object} args
 * @param {string} args.homeTeamId
 * @param {string} args.awayTeamId
 * @param {number} args.matchCount
 * @param {Object} args.matchStore - Zustand match store
 * @param {Object} args.playerStore - Zustand player store
 * @param {Object} args.teamStore - Zustand team store
 * @param {Object} [args.leagueStore] - optional, for seasonId
 * @param {(progress: {completed: number, total: number}) => void} [args.onProgress]
 */
export async function runMatchSimulation({
  homeTeamId,
  awayTeamId,
  matchCount,
  matchStore,
  playerStore,
  teamStore,
  leagueStore = null,
  onProgress = null
}) {
  const startTime = performance.now();

  const homeTeam = teamStore.getState().teams?.[homeTeamId];
  const awayTeam = teamStore.getState().teams?.[awayTeamId];
  if (!homeTeam || !awayTeam) {
    throw new Error(`Team not found: ${!homeTeam ? homeTeamId : awayTeamId}`);
  }

  const homePlayingXI = resolvePlayingXI(homeTeam, teamStore, playerStore);
  const awayPlayingXI = resolvePlayingXI(awayTeam, teamStore, playerStore);
  if (homePlayingXI.length < 11 || awayPlayingXI.length < 11) {
    throw new Error(`Insufficient players for match (${homePlayingXI.length}/${awayPlayingXI.length})`);
  }

  // Per-match collectors
  const innings1Totals = [];
  const innings2Totals = [];
  const innings1Wickets = [];
  const innings2Wickets = [];
  const inningsTotals = []; // both innings combined for grand distribution
  const inningsWickets = [];

  // Phase aggregates: sum across all matches × both innings
  const phaseAgg = {};
  for (const phase of PHASES) {
    phaseAgg[phase] = { runs: 0, balls: 0, wickets: 0, fours: 0, sixes: 0, dots: 0 };
  }

  // Per-match top-performer collectors
  const topScorerRuns = [];      // best individual score per match
  const topScorerSR = [];        // their SR
  const topBowlerWkts = [];      // best bowler wickets per match
  const topBowlerEcon = [];      // their econ

  // Per-player career aggregation (across all matches in this batch)
  const playerBatting = {}; // id -> {runs, balls, dismissals, name}
  const playerBowling = {}; // id -> {runs, balls, wickets, name}

  // Win counters
  const wins = { [homeTeamId]: 0, [awayTeamId]: 0, ties: 0 };

  let errors = 0;

  for (let i = 0; i < matchCount; i++) {
    try {
      const matchConfig = buildMatchConfig(
        `test-match-${Date.now()}-${i}`,
        homeTeam,
        awayTeam,
        homePlayingXI,
        awayPlayingXI
      );

      const result = await quickSimMatch(
        matchConfig,
        matchStore,
        playerStore,
        teamStore,
        leagueStore
      );

      if (!result || !result.innings1 || !result.innings2) {
        errors++;
        continue;
      }

      // Innings totals
      innings1Totals.push(result.innings1.totalScore);
      innings2Totals.push(result.innings2.totalScore);
      innings1Wickets.push(result.innings1.wickets);
      innings2Wickets.push(result.innings2.wickets);
      inningsTotals.push(result.innings1.totalScore, result.innings2.totalScore);
      inningsWickets.push(result.innings1.wickets, result.innings2.wickets);

      // Phase aggregation (via analytics included in quickSimMatch result)
      if (result.analytics?.innings) {
        for (const innings of result.analytics.innings) {
          if (!innings?.phases) continue;
          for (const phase of PHASES) {
            const p = innings.phases[phase];
            if (!p) continue;
            phaseAgg[phase].runs += p.runs || 0;
            phaseAgg[phase].balls += p.balls || 0;
            phaseAgg[phase].wickets += p.wickets || 0;
            phaseAgg[phase].fours += p.fours || 0;
            phaseAgg[phase].sixes += p.sixes || 0;
            phaseAgg[phase].dots += p.dots || 0;
          }
        }
      }

      // Top scorer (highest individual score across both innings)
      const allBatsmen = [
        ...(result.innings1.topBatsmen || []),
        ...(result.innings2.topBatsmen || [])
      ];
      if (allBatsmen.length > 0) {
        const top = allBatsmen.reduce((max, b) => b.runs > max.runs ? b : max, allBatsmen[0]);
        topScorerRuns.push(top.runs);
        topScorerSR.push(parseFloat(top.strikeRate) || 0);
      }

      // Top bowler (most wickets, tiebreak by lowest econ)
      const allBowlers = [
        ...(result.innings1.topBowlers || []),
        ...(result.innings2.topBowlers || [])
      ];
      if (allBowlers.length > 0) {
        const top = allBowlers.reduce((max, b) => {
          if (b.wickets > max.wickets) return b;
          if (b.wickets === max.wickets && parseFloat(b.economy) < parseFloat(max.economy)) return b;
          return max;
        }, allBowlers[0]);
        topBowlerWkts.push(top.wickets);
        topBowlerEcon.push(parseFloat(top.economy) || 0);
      }

      // Per-player career aggregation
      for (const b of allBatsmen) {
        if (!playerBatting[b.id]) {
          playerBatting[b.id] = { id: b.id, name: b.name, runs: 0, balls: 0, innings: 0, dismissals: 0, fours: 0, sixes: 0 };
        }
        const pb = playerBatting[b.id];
        pb.runs += b.runs;
        pb.balls += b.balls;
        pb.fours += b.fours || 0;
        pb.sixes += b.sixes || 0;
        pb.innings += 1;
      }
      for (const b of allBowlers) {
        if (!playerBowling[b.id]) {
          playerBowling[b.id] = { id: b.id, name: b.name, runs: 0, balls: 0, wickets: 0, innings: 0 };
        }
        const pb = playerBowling[b.id];
        pb.runs += b.runs;
        pb.balls += b.balls;
        pb.wickets += b.wickets;
        pb.innings += 1;
      }

      // Wins
      if (result.winner === homeTeamId) wins[homeTeamId]++;
      else if (result.winner === awayTeamId) wins[awayTeamId]++;
      else wins.ties++;
    } catch (err) {
      console.warn(`Match ${i} failed:`, err.message);
      errors++;
    }

    // Yield to UI every 10 matches so the page stays responsive
    if (onProgress && (i + 1) % 10 === 0) {
      onProgress({ completed: i + 1, total: matchCount });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Convert phase aggregates to RR / wickets-per-match summaries
  const phaseSummary = {};
  const totalMatches = innings1Totals.length;
  for (const phase of PHASES) {
    const p = phaseAgg[phase];
    const overs = p.balls / 6;
    phaseSummary[phase] = {
      runs: p.runs,
      balls: p.balls,
      wickets: p.wickets,
      runRate: overs > 0 ? p.runs / overs : 0,
      // Per innings averages (2 innings per match)
      runsPerInnings: totalMatches > 0 ? p.runs / (totalMatches * 2) : 0,
      wicketsPerInnings: totalMatches > 0 ? p.wickets / (totalMatches * 2) : 0,
      boundaryRate: p.balls > 0 ? (p.fours + p.sixes) / p.balls : 0,
      dotRate: p.balls > 0 ? p.dots / p.balls : 0
    };
  }

  // Compute per-player aggregated stats (only include players with ≥3 innings to reduce noise)
  const minInnings = Math.max(3, Math.floor(totalMatches * 0.2));
  const battingLeaders = Object.values(playerBatting)
    .filter(p => p.innings >= minInnings && p.balls >= 30)
    .map(p => ({
      ...p,
      strikeRate: p.balls > 0 ? (p.runs / p.balls) * 100 : 0,
      average: p.dismissals > 0 ? p.runs / p.dismissals : p.runs,
      runsPerInnings: p.runs / p.innings
    }))
    .sort((a, b) => b.runsPerInnings - a.runsPerInnings)
    .slice(0, 20);

  const bowlingLeaders = Object.values(playerBowling)
    .filter(p => p.innings >= minInnings && p.balls >= 30)
    .map(p => ({
      ...p,
      economy: p.balls > 0 ? (p.runs / (p.balls / 6)) : 0,
      average: p.wickets > 0 ? p.runs / p.wickets : p.runs,
      strikeRate: p.wickets > 0 ? p.balls / p.wickets : Infinity,
      wicketsPerInnings: p.wickets / p.innings
    }))
    .sort((a, b) => b.wicketsPerInnings - a.wicketsPerInnings)
    .slice(0, 20);

  const endTime = performance.now();
  const simulationTime = Math.round(endTime - startTime);

  return {
    homeTeamId,
    awayTeamId,
    matchCount: totalMatches,
    errors,
    simulationTime,
    matchesPerSecond: simulationTime > 0 ? Math.round((totalMatches / simulationTime) * 1000) : 0,

    // Innings total distributions
    innings1: summarizeArray(innings1Totals),
    innings2: summarizeArray(innings2Totals),
    inningsAll: summarizeArray(inningsTotals),

    // Wicket distributions
    innings1WicketStats: summarizeArray(innings1Wickets),
    innings2WicketStats: summarizeArray(innings2Wickets),
    inningsAllWickets: summarizeArray(inningsWickets),

    // Phase aggregates
    phaseSummary,

    // Top performers (per-match averages)
    topScorerStats: {
      runs: summarizeArray(topScorerRuns),
      strikeRate: summarizeArray(topScorerSR)
    },
    topBowlerStats: {
      wickets: summarizeArray(topBowlerWkts),
      economy: summarizeArray(topBowlerEcon)
    },

    // Per-player leaders
    battingLeaders,
    bowlingLeaders,

    // Wins
    wins,

    // Team names for display
    homeTeamName: homeTeam.name,
    awayTeamName: awayTeam.name
  };
}
