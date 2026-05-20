/**
 * @file matchReport/deepFlags.js
 * @description Cricket-specific "logic flags" that the colour-commentary block
 * consumes to find a story beyond the headline numbers. Each flag is a small,
 * focused detector: it returns an object with the players + context needed by
 * the templates, or null if the scenario doesn't apply.
 *
 * Data sources:
 *   - event.context.fullScorecard (innings1Data/innings2Data with top 4 batsmen + bowlers)
 *   - event.context.ballByBall (per-ball log, present only when a quick-sim produced it)
 *   - teamStore.teamTactics[teamId].captain (captain id)
 *   - teamStore.teams[teamId].captainId (older captain slot — fall back)
 *   - playerStore.players[id] (age, attributes, role for rating)
 *
 * Flags returned (priority order — the colour-commentary block picks the first
 * non-null):
 *   1. milestoneHeartbreak — batsman dismissed 90-99 or exactly 49
 *   2. loneWolf — single batsman > 55% of losing team's total
 *   3. captainsInnings — captain top-scored in a winning chase
 *   4. unsungHero — bowler with economy < 5.0 in a high-scoring match (totalRuns > 320)
 *   5. youngsterBreakout — player < 22 years, rating < 75, with a 50+ knock or 3+ wkts
 *   6. veteranResurgence — player > 32 years posting a standout outing
 *   7. cameoHero — lower-order batsman (#7+) with 30+ at SR > 200
 *   8. deathOversSpecialist — bowler with great economy in overs 16-20
 *   9. powerplayWreck — side losing 3+ wickets in the first 6 overs
 *
 * @module core/news/renderers/matchReport/deepFlags
 */

import useTeamStore from '../../../../stores/teamStore.js';
import usePlayerStore from '../../../../stores/playerStore.js';
import { getPlayerRating } from '../../../../utils/ratingHelper.js';

function captainOf(teamId) {
  try {
    const ts = useTeamStore.getState();
    return ts.teamTactics?.[teamId]?.captain || ts.teams?.[teamId]?.captainId || null;
  } catch {
    return null;
  }
}

function lookupPlayer(playerId) {
  try {
    return usePlayerStore.getState().players?.[playerId] || null;
  } catch {
    return null;
  }
}

function teamSide(fullScorecard, idx) {
  // idx 0 = first batting side, idx 1 = second batting side
  if (!fullScorecard) return null;
  return idx === 0 ? fullScorecard.firstBattingTeam : fullScorecard.secondBattingTeam;
}

function teamRunsAndWickets(fullScorecard, idx) {
  const inn = idx === 0 ? fullScorecard?.innings1Data : fullScorecard?.innings2Data;
  if (!inn) return { runs: 0, wickets: 0 };
  return { runs: inn.totalScore || 0, wickets: inn.wickets || 0 };
}

function detectMilestoneHeartbreak(fullScorecard) {
  if (!fullScorecard) return null;
  for (const idx of [0, 1]) {
    const inn = idx === 0 ? fullScorecard.innings1Data : fullScorecard.innings2Data;
    if (!inn) continue;
    const team = teamSide(fullScorecard, idx);
    for (const b of inn.topBatsmen || []) {
      const r = Number(b.runs ?? 0);
      // Dismissed (not "not out") — quickSim's extract considers them by inclusion
      // in topBatsmen, but we don't have a not-out flag on the entry. Treat 90-99
      // and 49 as candidates — these almost always indicate a dismissal in T20.
      if ((r >= 90 && r <= 99) || r === 49) {
        return {
          kind: 'milestoneHeartbreak',
          player: { id: b.id, name: b.name },
          team: { id: team?.id, name: team?.name },
          runs: r,
          balls: b.balls,
          target: r >= 90 ? 100 : 50
        };
      }
    }
  }
  return null;
}

function detectLoneWolf(fullScorecard, payload) {
  if (!fullScorecard || !payload?.loser) return null;
  for (const idx of [0, 1]) {
    const inn = idx === 0 ? fullScorecard.innings1Data : fullScorecard.innings2Data;
    const team = teamSide(fullScorecard, idx);
    if (!inn || !team) continue;
    if (team.id !== payload.loser.id) continue;
    const total = inn.totalScore || 0;
    if (total < 100) continue; // not interesting if the side collapsed entirely
    for (const b of inn.topBatsmen || []) {
      const r = Number(b.runs ?? 0);
      if (r >= 50 && total > 0 && r / total > 0.55) {
        return {
          kind: 'loneWolf',
          player: { id: b.id, name: b.name },
          team: { id: team.id, name: team.name },
          runs: r,
          balls: b.balls,
          teamTotal: total,
          sharePct: Math.round((r / total) * 100)
        };
      }
    }
  }
  return null;
}

function detectCaptainsInnings(fullScorecard, payload) {
  if (!fullScorecard || !payload?.winner) return null;
  // Was it a chase? Winner batted second iff winner === secondBattingTeam.id
  const won2nd = fullScorecard.secondBattingTeam?.id === payload.winner.id;
  if (!won2nd) return null;
  const captainId = captainOf(payload.winner.id);
  if (!captainId) return null;
  const inn = fullScorecard.innings2Data;
  if (!inn) return null;
  const top = (inn.topBatsmen || [])[0];
  if (!top) return null;
  if (top.id !== captainId) return null;
  return {
    kind: 'captainsInnings',
    player: { id: top.id, name: top.name },
    team: { id: payload.winner.id, name: payload.winner.name },
    runs: top.runs,
    balls: top.balls
  };
}

function detectUnsungHero(fullScorecard, payload) {
  if (!fullScorecard || (payload?.totalRuns ?? 0) < 320) return null;
  let best = null;
  for (const idx of [0, 1]) {
    const inn = idx === 0 ? fullScorecard.innings1Data : fullScorecard.innings2Data;
    if (!inn) continue;
    // Bowler's team is the *other* side
    const teamId = idx === 0 ? fullScorecard.secondBattingTeam?.id : fullScorecard.firstBattingTeam?.id;
    const teamName = idx === 0 ? fullScorecard.secondBattingTeam?.name : fullScorecard.firstBattingTeam?.name;
    for (const b of inn.topBowlers || []) {
      const econ = parseFloat(b.economy ?? '99');
      if (Number.isFinite(econ) && econ < 5.0 && (b.runs != null)) {
        if (!best || econ < best.economy) {
          best = {
            kind: 'unsungHero',
            player: { id: b.id, name: b.name },
            team: { id: teamId, name: teamName },
            economy: econ,
            wickets: b.wickets || 0,
            overs: b.overs,
            runs: b.runs
          };
        }
      }
    }
  }
  return best;
}

function detectYoungsterBreakout(fullScorecard) {
  if (!fullScorecard) return null;
  for (const idx of [0, 1]) {
    const inn = idx === 0 ? fullScorecard.innings1Data : fullScorecard.innings2Data;
    if (!inn) continue;
    const team = teamSide(fullScorecard, idx);
    // Batting breakout
    for (const b of inn.topBatsmen || []) {
      if ((b.runs ?? 0) < 50) continue;
      const p = lookupPlayer(b.id);
      if (!p) continue;
      const age = Number(p.age ?? 99);
      const rating = getPlayerRating(p) || 0;
      if (age < 22 && rating < 75) {
        return {
          kind: 'youngsterBreakout',
          player: { id: b.id, name: b.name, age, rating },
          team: { id: team?.id, name: team?.name },
          performance: `${b.runs} (${b.balls})`,
          kindOf: 'batting'
        };
      }
    }
    // Bowling breakout — uses the OPPOSING side's team object
    const bowlingTeam = idx === 0 ? fullScorecard.secondBattingTeam : fullScorecard.firstBattingTeam;
    for (const b of inn.topBowlers || []) {
      if ((b.wickets ?? 0) < 3) continue;
      const p = lookupPlayer(b.id);
      if (!p) continue;
      const age = Number(p.age ?? 99);
      const rating = getPlayerRating(p) || 0;
      if (age < 22 && rating < 75) {
        return {
          kind: 'youngsterBreakout',
          player: { id: b.id, name: b.name, age, rating },
          team: { id: bowlingTeam?.id, name: bowlingTeam?.name },
          performance: `${b.wickets}-${b.runs} (${b.overs})`,
          kindOf: 'bowling'
        };
      }
    }
  }
  return null;
}

function detectVeteranResurgence(fullScorecard) {
  if (!fullScorecard) return null;
  for (const idx of [0, 1]) {
    const inn = idx === 0 ? fullScorecard.innings1Data : fullScorecard.innings2Data;
    if (!inn) continue;
    const team = teamSide(fullScorecard, idx);
    for (const b of inn.topBatsmen || []) {
      if ((b.runs ?? 0) < 60) continue;
      const p = lookupPlayer(b.id);
      if (!p) continue;
      const age = Number(p.age ?? 0);
      if (age >= 32) {
        return {
          kind: 'veteranResurgence',
          player: { id: b.id, name: b.name, age },
          team: { id: team?.id, name: team?.name },
          performance: `${b.runs} (${b.balls})`,
          kindOf: 'batting'
        };
      }
    }
    const bowlingTeam = idx === 0 ? fullScorecard.secondBattingTeam : fullScorecard.firstBattingTeam;
    for (const b of inn.topBowlers || []) {
      if ((b.wickets ?? 0) < 3) continue;
      const p = lookupPlayer(b.id);
      if (!p) continue;
      const age = Number(p.age ?? 0);
      if (age >= 32) {
        return {
          kind: 'veteranResurgence',
          player: { id: b.id, name: b.name, age },
          team: { id: bowlingTeam?.id, name: bowlingTeam?.name },
          performance: `${b.wickets}-${b.runs} (${b.overs})`,
          kindOf: 'bowling'
        };
      }
    }
  }
  return null;
}

function detectCameoHero(fullScorecard) {
  if (!fullScorecard) return null;
  for (const idx of [0, 1]) {
    const inn = idx === 0 ? fullScorecard.innings1Data : fullScorecard.innings2Data;
    if (!inn) continue;
    const team = teamSide(fullScorecard, idx);
    for (const b of inn.topBatsmen || []) {
      const runs = Number(b.runs ?? 0);
      const balls = Number(b.balls ?? 0);
      if (runs < 30 || balls < 8) continue;
      const sr = balls > 0 ? (runs / balls) * 100 : 0;
      if (sr < 200) continue;
      const p = lookupPlayer(b.id);
      const battingPos = p?.primaryBattingPosition;
      // Lower-order: position 7+ OR role is bowler / wicket-keeper
      const isLowerOrder = (battingPos && battingPos >= 7) || p?.role === 'bowler';
      if (!isLowerOrder) continue;
      return {
        kind: 'cameoHero',
        player: { id: b.id, name: b.name },
        team: { id: team?.id, name: team?.name },
        runs,
        balls,
        sixes: b.sixes,
        fours: b.fours,
        strikeRate: Math.round(sr)
      };
    }
  }
  return null;
}

function detectPowerplayWreck(ballByBall, fullScorecard, payload) {
  if (!Array.isArray(ballByBall) || ballByBall.length === 0) return null;
  for (const innings of [1, 2]) {
    const ppBalls = ballByBall.filter(b => b.innings === innings && b.over <= 5);
    const wkts = ppBalls.filter(b => b.isWicket).length;
    if (wkts >= 3) {
      const team = innings === 1 ? fullScorecard?.firstBattingTeam : fullScorecard?.secondBattingTeam;
      const runs = ppBalls.reduce((s, b) => s + Number(b.runs || 0), 0);
      return {
        kind: 'powerplayWreck',
        team: { id: team?.id, name: team?.name },
        innings,
        wickets: wkts,
        runs,
        isWinningSide: team?.id === payload?.winner?.id
      };
    }
  }
  return null;
}

function detectDeathOversSpecialist(ballByBall, fullScorecard) {
  if (!Array.isArray(ballByBall) || ballByBall.length === 0) return null;
  // Aggregate per (bowler, innings) the death-overs runs + wickets (overs 15-19, 0-indexed)
  const agg = new Map();
  for (const b of ballByBall) {
    if (b.over < 15 || b.over > 19) continue;
    const key = `${b.innings}-${b.bowler}`;
    let a = agg.get(key);
    if (!a) {
      a = { innings: b.innings, bowlerId: b.bowler, bowlerName: b.bowlerName, balls: 0, runs: 0, wickets: 0 };
      agg.set(key, a);
    }
    if (b.isLegal !== false) a.balls += 1;
    a.runs += Number(b.runs || 0);
    if (b.isWicket) a.wickets += 1;
  }
  let best = null;
  for (const a of agg.values()) {
    if (a.balls < 6) continue; // need at least one full death over
    const econ = a.balls > 0 ? (a.runs / a.balls) * 6 : 99;
    if (econ > 7.5) continue;
    const score = a.wickets * 3 - econ; // prefer wickets, then low econ
    if (!best || score > best.score) {
      // Bowler's team is the OTHER team in that innings
      const bowlingTeam = a.innings === 1 ? fullScorecard?.secondBattingTeam : fullScorecard?.firstBattingTeam;
      best = {
        kind: 'deathOversSpecialist',
        player: { id: a.bowlerId, name: a.bowlerName },
        team: { id: bowlingTeam?.id, name: bowlingTeam?.name },
        deathOversRuns: a.runs,
        deathOversWickets: a.wickets,
        deathOversEcon: econ.toFixed(2),
        score
      };
    }
  }
  return best;
}

/**
 * Detect all deep flags in priority order. Returns an object of all
 * non-null detections — callers (colourCommentary block) pick the most
 * newsworthy one to emit.
 * @param {Object} event - The full match.result event with context
 */
export function detectDeepFlags(event) {
  const payload = event?.payload || {};
  const ctx = event?.context || {};
  const fullScorecard = ctx.fullScorecard;
  const ballByBall = ctx.ballByBall;

  return {
    milestoneHeartbreak: detectMilestoneHeartbreak(fullScorecard),
    loneWolf: detectLoneWolf(fullScorecard, payload),
    captainsInnings: detectCaptainsInnings(fullScorecard, payload),
    unsungHero: detectUnsungHero(fullScorecard, payload),
    youngsterBreakout: detectYoungsterBreakout(fullScorecard),
    veteranResurgence: detectVeteranResurgence(fullScorecard),
    cameoHero: detectCameoHero(fullScorecard),
    powerplayWreck: detectPowerplayWreck(ballByBall, fullScorecard, payload),
    deathOversSpecialist: detectDeathOversSpecialist(ballByBall, fullScorecard)
  };
}

/**
 * Pick the highest-priority detected flag. Returns null if none fired.
 */
export function pickPrimaryFlag(flags) {
  if (!flags) return null;
  const order = [
    'milestoneHeartbreak',
    'loneWolf',
    'captainsInnings',
    'unsungHero',
    'youngsterBreakout',
    'veteranResurgence',
    'cameoHero',
    'powerplayWreck',
    'deathOversSpecialist'
  ];
  for (const key of order) {
    if (flags[key]) return flags[key];
  }
  return null;
}

export default detectDeepFlags;
