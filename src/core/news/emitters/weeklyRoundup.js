/**
 * @file emitters/weeklyRoundup.js
 * @description Builds the `weekly.roundup` event payload from canonical store
 * state (leagueStore.results, leagueStore.standings, transferStore.completedTransfers)
 * and emits it via the shared NewsDispatcher.
 *
 * Called from gameStore.advanceDay() every 7 in-season days. Gated to
 * currentPhase === 'league' || 'playoffs' — no roundups during offseason,
 * auction, or retention.
 *
 * @module core/news/emitters/weeklyRoundup
 */

import { getNewsDispatcher } from '../newsDispatcherSingleton.js';

const MARQUEE_FEE_THRESHOLD = 1_500_000;

function fmtMoney(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function teamName(clubsMap, id, fallback) {
  return clubsMap?.[id]?.name || fallback || id || 'a club';
}

function recentResults(results, currentGameDay, windowDays = 7) {
  if (!Array.isArray(results)) return [];
  return results.filter(r => {
    if (typeof r.gameDay !== 'number') return false;
    return r.gameDay > currentGameDay - windowDays && r.gameDay <= currentGameDay;
  });
}

function biggestWin(results, clubsMap) {
  let best = null;
  for (const r of results) {
    const innings1 = r.innings1?.totalScore ?? 0;
    const innings2 = r.innings2?.totalScore ?? 0;
    const margin = Math.abs(innings1 - innings2);
    if (!best || margin > best.margin) {
      best = {
        margin,
        winnerName: teamName(clubsMap, r.winner),
        loserName: teamName(clubsMap, r.winner === r.homeTeam ? r.awayTeam : r.homeTeam),
        runs: innings1 > innings2 ? innings1 : innings2
      };
    }
  }
  return best;
}

function closestFinish(results, clubsMap) {
  let best = null;
  for (const r of results) {
    const marginRuns = r.winByRuns ? Number(r.margin) : null;
    const marginWkts = r.winByWickets ? Number(r.margin) : null;
    const score = marginRuns != null ? marginRuns : (marginWkts != null ? marginWkts * 5 : Infinity);
    if (!best || score < best.score) {
      best = {
        score,
        winnerName: teamName(clubsMap, r.winner),
        loserName: teamName(clubsMap, r.winner === r.homeTeam ? r.awayTeam : r.homeTeam),
        marginLabel: marginRuns != null ? `${marginRuns} run${marginRuns === 1 ? '' : 's'}` : (marginWkts != null ? `${marginWkts} wicket${marginWkts === 1 ? '' : 's'}` : '')
      };
    }
  }
  return best && best.score !== Infinity ? best : null;
}

function pickNextFixture(fixtures, currentGameDay) {
  if (!Array.isArray(fixtures)) return null;
  const upcoming = fixtures.filter(f => (f.status === 'scheduled' || !f.status) && !f.completed);
  // We don't have a gameDay on fixtures, but date sort still gives us the right order
  upcoming.sort((a, b) => {
    const da = new Date(a.dateObj || a.date || 0).getTime();
    const db = new Date(b.dateObj || b.date || 0).getTime();
    return da - db;
  });
  return upcoming[0] || null;
}

function recentTransfers(transfers, currentDateISO, windowDays = 7) {
  if (!Array.isArray(transfers) || !currentDateISO) return [];
  const cutoff = new Date(currentDateISO).getTime() - windowDays * 86_400_000;
  return transfers.filter(t => {
    const ts = new Date(t.timestamp || 0).getTime();
    return ts >= cutoff;
  });
}

function pickMarqueeTransfer(transfers, clubsMap, playersMap) {
  let best = null;
  for (const t of transfers) {
    const fee = Number(t.newPrice ?? t.price ?? t.fee ?? 0);
    if (!Number.isFinite(fee) || fee < MARQUEE_FEE_THRESHOLD) continue;
    if (!best || fee > best.fee) {
      const player = playersMap?.[t.playerId];
      best = {
        fee,
        feeLabel: fmtMoney(fee),
        player: { id: t.playerId, name: player?.name || 'A new signing' },
        fromTeam: { id: t.fromTeamId, name: teamName(clubsMap, t.fromTeamId) },
        toTeam: { id: t.toTeamId, name: teamName(clubsMap, t.toTeamId) }
      };
    }
  }
  return best;
}

function detectTableShakeup(standings, priorLeaderId) {
  if (!Array.isArray(standings) || standings.length === 0) return null;
  const current = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.netRunRate ?? 0) - (a.netRunRate ?? 0);
  });
  const leader = current[0];
  if (!leader) return null;
  if (priorLeaderId && leader.clubId !== priorLeaderId) {
    return { newLeader: leader, changed: true };
  }
  return { newLeader: leader, changed: false };
}

/**
 * @typedef {Object} WeeklyRoundupStores
 * @property {Object} gameStore
 * @property {Object} teamStore
 * @property {Object} leagueStore
 * @property {Object} transferStore
 * @property {Object} [playerStore]
 */

/**
 * Build and emit the weekly.roundup event.
 * @param {WeeklyRoundupStores} stores
 * @param {Object} ctx - { newGameDay, newDateISO, priorLeaderId? }
 */
export function emitWeeklyRoundup(stores, ctx) {
  try {
    const { gameStore, teamStore, leagueStore, transferStore, playerStore } = stores;
    const { newGameDay, newDateISO, priorLeaderId } = ctx;

    const gs = gameStore.getState();
    const ts = teamStore.getState();
    const ls = leagueStore.getState();
    const tr = transferStore?.getState?.();
    const ps = playerStore?.getState?.();

    const clubsMap = ls.clubs || {};
    const playersMap = ps?.players || {};
    const userTeamId = ts.userTeamId;
    const userTeamObj = ts.teams?.[userTeamId];

    const results = recentResults(ls.results, newGameDay, 7);
    const matchesPlayed = results.length;
    if (matchesPlayed === 0) {
      // No matches played in the last 7 days — skip the roundup rather than
      // emit an empty article.
      return;
    }

    const bigWin = biggestWin(results, clubsMap);
    const close = closestFinish(results, clubsMap);
    const next = pickNextFixture(ls.fixtures, newGameDay);
    const tx = recentTransfers(tr?.completedTransfers, newDateISO, 7);
    const marquee = pickMarqueeTransfer(tx, clubsMap, playersMap);
    const shakeup = detectTableShakeup(ls.standings, priorLeaderId);

    const userStanding = (ls.standings || []).find(s => s.clubId === userTeamId);
    const userPositionLine = userStanding
      ? `${userTeamObj?.name || 'Your side'} sit ${ordinal(userStanding.position || derivePosition(ls.standings, userTeamId))} on ${userStanding.points} points.`
      : '';
    const standingsLeaderLine = shakeup?.newLeader
      ? `${teamName(clubsMap, shakeup.newLeader.clubId)} lead the table on ${shakeup.newLeader.points} points.`
      : '';
    const biggestWinLine = bigWin
      ? `The biggest hammering went to ${bigWin.winnerName}, who put ${bigWin.runs} on the board against ${bigWin.loserName}.`
      : '';
    const closestFinishLine = close
      ? `The tightest finish: ${close.winnerName} edged ${close.loserName} by ${close.marginLabel}.`
      : '';
    const topScoringMatchLine = bigWin
      ? `${bigWin.winnerName} produced the standout score of the week with ${bigWin.runs}.`
      : '';
    const nextMatchLine = next
      ? `${teamName(clubsMap, next.homeTeam || next.homeTeamId, next.homeTeamName)} v ${teamName(clubsMap, next.awayTeam || next.awayTeamId, next.awayTeamName)} at ${next.venue || 'TBC'}`
      : 'a fresh slate of fixtures';

    const weekNumber = Math.max(1, Math.ceil(newGameDay / 7));

    getNewsDispatcher().emit({
      type: 'weekly.roundup',
      season: gs.currentSeason,
      gameDay: newGameDay,
      date: newDateISO || gs.currentDate || new Date().toISOString(),
      payload: {
        weekNumber,
        matchesPlayed,
        biggestWinLine,
        closestFinishLine,
        topScoringMatchLine,
        standingsLeaderLine,
        userPositionLine,
        nextMatchLine,
        newLeader: shakeup?.newLeader
          ? { id: shakeup.newLeader.clubId, name: teamName(clubsMap, shakeup.newLeader.clubId) }
          : null,
        tableShakeup: !!shakeup?.changed,
        hasMarqueeTransfer: !!marquee,
        marqueeTransfer: marquee ? { ...marquee, fee: marquee.feeLabel } : null,
        userTeam: userTeamObj ? { id: userTeamObj.id, name: userTeamObj.name } : null,
        isUserTeam: true
      }
    });
  } catch (err) {
    console.error('[weeklyRoundup] Failed to emit weekly.roundup news:', err);
  }
}

function ordinal(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function derivePosition(standings, teamId) {
  if (!Array.isArray(standings)) return null;
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.netRunRate ?? 0) - (a.netRunRate ?? 0);
  });
  const idx = sorted.findIndex(s => s.clubId === teamId);
  return idx >= 0 ? idx + 1 : null;
}

export default emitWeeklyRoundup;
