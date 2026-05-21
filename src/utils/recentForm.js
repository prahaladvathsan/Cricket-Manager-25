/**
 * @file recentForm.js
 * @description Compute recent W/L form for one or many teams from completed
 * match results. Shared by the Home dashboard standings card and the
 * /game/league standings page.
 *
 * @module utils/recentForm
 */

/**
 * Last N results for a team, oldest → newest, as 'W' / 'L' strings.
 * Excludes playoff matches by default so regular-season form stays
 * un-polluted by knockout fixtures.
 *
 * @param {Array} results - leagueStore.results
 * @param {string} teamId
 * @param {number} count - how many recent matches (default 5)
 * @param {Object} [opts] - { includePlayoffs?: boolean }
 * @returns {Array<'W'|'L'>}
 */
export function computeRecentForm(results, teamId, count = 5, opts = {}) {
  if (!Array.isArray(results) || !teamId) return [];
  const filtered = results.filter(r => {
    if (r.homeTeam !== teamId && r.awayTeam !== teamId) return false;
    if (!opts.includePlayoffs) {
      const isPlayoff = r.type === 'playoff' || (typeof r.matchId === 'string' && r.matchId.startsWith('playoff_'));
      if (isPlayoff) return false;
    }
    return true;
  });
  return filtered.slice(-count).map(r => (r.winner === teamId ? 'W' : 'L'));
}

/**
 * Compute recent form for every team id in `teamIds`. Returns a map.
 * @param {Array} results
 * @param {Array<string>} teamIds
 * @param {number} count
 * @param {Object} [opts]
 * @returns {Object<string, Array<'W'|'L'>>}
 */
export function computeFormByTeam(results, teamIds, count = 5, opts = {}) {
  const out = {};
  for (const id of teamIds || []) {
    out[id] = computeRecentForm(results, id, count, opts);
  }
  return out;
}

export default computeRecentForm;
