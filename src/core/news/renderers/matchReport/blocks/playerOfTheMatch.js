/**
 * @file blocks/playerOfTheMatch.js
 * @description Honours the POTM. Skipped if the POTM is the same player the
 * anchorPerformance block already wrote about (no point repeating the praise)
 * or if no POTM was named.
 *
 * @module core/news/renderers/matchReport/blocks/playerOfTheMatch
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import { withLink } from '../../../entityHelpers.js';
import pool from '../templates/playerOfTheMatch.json';

export function playerOfTheMatch(event, assemblerState) {
  const potm = event?.payload?.playerOfMatch;
  if (!potm || !potm.name || potm.name === 'Unknown') return null;

  // If anchorPerformance already covered this exact player, skip.
  const anchorPlayerId = assemblerState?.anchor?.player?.id;
  if (anchorPlayerId && anchorPlayerId === potm.id) return null;

  const vars = {
    ...buildVars(event),
    potm: withLink(potm, 'PLAYER')
  };

  const matching = pool.filter(t => matchesAll(t.when, vars));
  const candidates = matching.length > 0 ? matching : pool.filter(t => !t.when);
  const finalCandidates = candidates.length > 0 ? candidates : pool;
  const pick = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  if (!pick) return null;

  return {
    paragraphs: Array.isArray(pick.body)
      ? pick.body.map(p => renderString(p, vars)).filter(Boolean)
      : []
  };
}

export default playerOfTheMatch;
