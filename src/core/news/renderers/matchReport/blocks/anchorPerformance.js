/**
 * @file blocks/anchorPerformance.js
 * @description Spotlights the standout individual performance of the match —
 * either the highest-impact batting innings or the best bowling spell,
 * whichever rated more decisive (impact = runs OR wickets * 20, matching POTM
 * selection in QuickSimMatch).
 *
 * Skips if no batsman cleared 25 runs and no bowler took 2+ wickets.
 *
 * @module core/news/renderers/matchReport/blocks/anchorPerformance
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import { pickAnchorPerformance } from '../selectors.js';
import { withLink } from '../../../entityHelpers.js';
import pool from '../templates/anchorPerformance.json';

export function anchorPerformance(event) {
  const anchor = pickAnchorPerformance(event?.context?.fullScorecard);
  if (!anchor) return null;

  const enrichedAnchor = {
    ...anchor,
    player: withLink(anchor.player, 'PLAYER'),
    team: withLink(anchor.team, 'TEAM')
  };

  const vars = {
    ...buildVars(event),
    anchor: enrichedAnchor
  };

  const matching = pool.filter(t => matchesAll(t.when, vars));
  const candidates = matching.length > 0 ? matching : pool.filter(t => !t.when);
  const finalCandidates = candidates.length > 0 ? candidates : pool;
  const pick = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  if (!pick) return null;

  return {
    paragraphs: Array.isArray(pick.body)
      ? pick.body.map(p => renderString(p, vars)).filter(Boolean)
      : [],
    meta: { anchor }  // raw (un-linked) anchor for downstream blocks
  };
}

export default anchorPerformance;
