/**
 * @file emitters/seasonOpener.js
 * @description Builds the `season.opener` event payload and emits it via the
 * shared NewsDispatcher. Called by Home.jsx (Season 1) and LeagueInitializer.js
 * (Season 2+) at the end of league initialization so both code paths produce
 * an identical opener article.
 *
 * @module core/news/emitters/seasonOpener
 */

import { getNewsDispatcher } from '../newsDispatcherSingleton.js';

/**
 * @typedef {Object} SeasonOpenerStores
 * @property {Object} gameStore
 * @property {Object} teamStore
 * @property {Object} leagueStore
 */

function firstLeagueFixture(fixtures) {
  if (!Array.isArray(fixtures) || fixtures.length === 0) return null;
  // Skip playoffs — opener should reference the actual first match of the league
  const league = fixtures.filter(f => !f.matchId?.startsWith?.('playoff_') && f.type !== 'playoff');
  const sorted = (league.length ? league : fixtures).slice().sort((a, b) => {
    const da = new Date(a.dateObj || a.date || 0).getTime();
    const db = new Date(b.dateObj || b.date || 0).getTime();
    return da - db;
  });
  return sorted[0] || null;
}

function describeFixture(fixture, clubsMap) {
  if (!fixture) return null;
  const homeId = fixture.homeTeam || fixture.homeTeamId;
  const awayId = fixture.awayTeam || fixture.awayTeamId;
  return {
    home: { id: homeId, name: clubsMap[homeId]?.name || fixture.homeTeamName || homeId },
    away: { id: awayId, name: clubsMap[awayId]?.name || fixture.awayTeamName || awayId },
    venue: fixture.venue || clubsMap[homeId]?.homeVenue || clubsMap[homeId]?.homeGround || 'the ground',
    date: fixture.date || (fixture.dateObj && new Date(fixture.dateObj).toISOString().split('T')[0]) || ''
  };
}

function lookupDefendingChampion(seasonHistory, clubsMap, currentSeason) {
  if (!Array.isArray(seasonHistory) || seasonHistory.length === 0) return null;
  // Find the most recent prior season's entry
  const prior = seasonHistory
    .filter(h => typeof h.season === 'number' && h.season < currentSeason)
    .sort((a, b) => b.season - a.season)[0];
  if (!prior || !prior.champion) return null;
  // champion is stored as a string (team name); resolve to id by lookup
  const championName = prior.champion;
  const entry = Object.values(clubsMap).find(c => c?.name === championName);
  return { id: entry?.id || null, name: championName };
}

function summariseBoardExpectation(seasonObjectives) {
  if (!Array.isArray(seasonObjectives) || seasonObjectives.length === 0) {
    return 'a strong, competitive season';
  }
  // Pick the headline objective — by convention the top entry. Fall back to its
  // short label or description.
  const headline = seasonObjectives[0];
  return headline?.title || headline?.label || headline?.description || 'a strong, competitive season';
}

/**
 * Emit the season.opener news event. Safe to call multiple times — the
 * dispatcher itself is idempotent at the subscriber layer, but callers should
 * still gate to once-per-season.
 *
 * @param {SeasonOpenerStores} stores
 */
export function emitSeasonOpener({ gameStore, teamStore, leagueStore }) {
  try {
    const gs = gameStore.getState();
    const ts = teamStore.getState();
    const ls = leagueStore.getState();

    const season = gs.currentSeason;
    const userTeamId = ts.userTeamId;
    const userTeamObj = ts.teams?.[userTeamId];
    const clubsMap = ls.clubs || {};

    const openingFixture = describeFixture(firstLeagueFixture(ls.fixtures), clubsMap);
    const defendingChampion = lookupDefendingChampion(gs.seasonHistory, clubsMap, season);
    const defendingChampionIsUserTeam = !!(defendingChampion?.name && userTeamObj?.name && defendingChampion.name === userTeamObj.name);
    const userBoardExpectation = summariseBoardExpectation(gs.seasonObjectives);

    getNewsDispatcher().emit({
      type: 'season.opener',
      season,
      gameDay: gs.gameDay,
      date: gs.currentDate || new Date().toISOString(),
      payload: {
        season,
        isDebutSeason: season === 1,
        defendingChampion,
        defendingChampionIsUserTeam,
        openingFixture,
        userTeam: userTeamObj ? { id: userTeamObj.id, name: userTeamObj.name } : null,
        userBoardExpectation,
        // Flag for inboxSubscriber's user-team detector — opener is always about
        // the user's own season journey, so promote it on the carousel.
        isUserTeam: true
      }
    });
  } catch (err) {
    console.error('[seasonOpener] Failed to emit season.opener news:', err);
  }
}

export default emitSeasonOpener;
