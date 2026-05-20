/**
 * @file matchReport/selectors.js
 * @description Pure helpers for the match-report block assembler. Each
 * selector pulls a salient datum out of the raw `match.result` event so
 * blocks can stay small and focused on phrasing.
 *
 * @module core/news/renderers/matchReport/selectors
 */

/**
 * POTM-style impact score: a wicket weighs roughly 20 runs.
 * Matches the rule used by QuickSimMatch.js for POTM selection so the
 * anchor performance and POTM blocks pick consistently.
 */
export function impactScore(stats) {
  if (!stats) return 0;
  const runs = Number(stats.runs ?? 0);
  const wkts = Number(stats.wickets ?? 0);
  const balls = Number(stats.balls ?? 0);
  // Small SR bonus to nudge tied scores toward more efficient knocks
  const sr = balls > 0 && stats.runs ? Number(stats.runs) / balls : 0;
  return runs + wkts * 20 + sr * 2;
}

/**
 * Scan both innings' top batsmen + top bowlers and pick the standout performer.
 * Returns the best batting line OR best bowling line, whichever has higher impact.
 * @param {Object} fullScorecard
 */
export function pickAnchorPerformance(fullScorecard) {
  if (!fullScorecard) return null;

  const innings = [fullScorecard.innings1Data, fullScorecard.innings2Data].filter(Boolean);

  let bestBat = null;
  let bestBowl = null;

  innings.forEach((inn, idx) => {
    const battingTeamId = idx === 0 ? fullScorecard.firstBattingTeam?.id : fullScorecard.secondBattingTeam?.id;
    const battingTeamName = idx === 0 ? fullScorecard.firstBattingTeam?.name : fullScorecard.secondBattingTeam?.name;
    const bowlingTeamId = idx === 0 ? fullScorecard.secondBattingTeam?.id : fullScorecard.firstBattingTeam?.id;
    const bowlingTeamName = idx === 0 ? fullScorecard.secondBattingTeam?.name : fullScorecard.firstBattingTeam?.name;

    (inn.topBatsmen || []).forEach(b => {
      if ((b.runs || 0) < 25) return;
      const score = impactScore(b);
      if (!bestBat || score > bestBat.score) {
        bestBat = {
          score,
          player: { id: b.id, name: b.name },
          team: { id: battingTeamId, name: battingTeamName },
          inningsIndex: idx + 1,
          stats: {
            runs: b.runs,
            balls: b.balls,
            fours: b.fours,
            sixes: b.sixes,
            strikeRate: b.strikeRate
          }
        };
      }
    });

    (inn.topBowlers || []).forEach(b => {
      if ((b.wickets || 0) < 2) return;
      const score = impactScore({ wickets: b.wickets });
      if (!bestBowl || score > bestBowl.score) {
        bestBowl = {
          score,
          player: { id: b.id, name: b.name },
          team: { id: bowlingTeamId, name: bowlingTeamName },
          inningsIndex: idx + 1,
          stats: {
            wickets: b.wickets,
            runs: b.runs,
            overs: b.overs,
            economy: b.economy
          }
        };
      }
    });
  });

  if (!bestBat && !bestBowl) return null;
  if (!bestBat) return { ...bestBowl, type: 'bowling' };
  if (!bestBowl) return { ...bestBat, type: 'batting' };
  return bestBat.score >= bestBowl.score
    ? { ...bestBat, type: 'batting' }
    : { ...bestBowl, type: 'bowling' };
}

/**
 * Walk the ball-by-ball log and find the over with the biggest swing —
 * either 2+ wickets, or 20+ runs, with the higher swing score winning.
 * @param {Array} ballByBall
 */
export function pickTurningOver(ballByBall) {
  if (!Array.isArray(ballByBall) || ballByBall.length === 0) return null;

  const byOver = new Map(); // key: `${innings}-${over}` -> aggregate
  for (const ball of ballByBall) {
    const innings = ball.innings;
    const over = ball.over;
    if (innings == null || over == null) continue;
    const key = `${innings}-${over}`;
    let agg = byOver.get(key);
    if (!agg) {
      agg = { innings, over, runs: 0, wickets: 0, sixes: 0, fours: 0, bowlerId: ball.bowler, bowlerName: ball.bowlerName };
      byOver.set(key, agg);
    }
    agg.runs += Number(ball.runs || 0);
    if (ball.isWicket) agg.wickets += 1;
    if (ball.isSix) agg.sixes += 1;
    if (ball.isFour) agg.fours += 1;
  }

  let best = null;
  for (const agg of byOver.values()) {
    const swing = agg.wickets * 12 + agg.runs;
    // Require a meaningful event — 2+ wickets OR 20+ runs OR 3+ boundaries
    const eligible = agg.wickets >= 2 || agg.runs >= 20 || (agg.fours + agg.sixes) >= 3;
    if (!eligible) continue;
    if (!best || swing > best.swing) {
      best = { ...agg, swing };
    }
  }
  return best;
}

/**
 * Pull the last `n` legal balls of the second innings — used by the clutchFinish
 * block to call out who hit the winning runs / bowled the final dot.
 * @param {Array} ballByBall
 * @param {number} n
 */
export function pickClutchPassage(ballByBall, n = 8) {
  if (!Array.isArray(ballByBall) || ballByBall.length === 0) return null;
  const innings2 = ballByBall.filter(b => b.innings === 2);
  if (innings2.length === 0) return null;
  const tail = innings2.slice(-n);
  const winningBall = [...tail].reverse().find(b => b.runs > 0) || tail[tail.length - 1];
  const wickets = tail.filter(b => b.isWicket).length;
  const dots = tail.filter(b => Number(b.runs || 0) === 0 && !b.isWicket).length;
  const boundaries = tail.filter(b => b.isFour || b.isSix).length;
  return {
    balls: tail,
    finisher: winningBall
      ? { id: winningBall.striker, name: winningBall.strikerName, runs: winningBall.runs, isSix: !!winningBall.isSix, isFour: !!winningBall.isFour }
      : null,
    bowler: winningBall ? { id: winningBall.bowler, name: winningBall.bowlerName } : null,
    wickets,
    dots,
    boundaries
  };
}

/**
 * Importance score for a match.result article. Used by renderMatchReport when
 * attaching `importance` to the article so the carousel sort can rank it.
 */
export function computeMatchImportance(payload) {
  if (!payload) return 30;
  let score = 25;
  if (payload.isPlayoff) score += 35;
  if (payload.isCloseFinish) score += 15;
  if (payload.isHighScoring) score += 10;
  if (payload.isOneSided) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Position of a club in a sorted-by-points standings array.
 * Returns 1-based index, or null if not found.
 */
export function teamPosition(standings, clubId) {
  if (!Array.isArray(standings) || !clubId) return null;
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.netRunRate ?? 0) - (a.netRunRate ?? 0);
  });
  const idx = sorted.findIndex(s => s.clubId === clubId);
  return idx >= 0 ? idx + 1 : null;
}

export function ordinal(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
