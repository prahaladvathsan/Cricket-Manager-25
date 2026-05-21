/**
 * @file blocks/clutchFinish.js
 * @description Fires only when isCloseFinish is true. Reads the last balls of
 * the second innings (if ball-by-ball is available) to call out who hit the
 * winning runs / bowled the closing dots. Falls back to a flag-only template
 * if ballByBall isn't present (legacy saves).
 *
 * @module core/news/renderers/matchReport/blocks/clutchFinish
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import { pickClutchPassage } from '../selectors.js';
import { playerLink } from '../../../entityHelpers.js';
import pool from '../templates/clutchFinish.json';

export function clutchFinish(event) {
  if (!event?.payload?.isCloseFinish) return null;

  const clutch = pickClutchPassage(event?.context?.ballByBall, 8);

  const enrichedClutch = clutch ? {
    ...clutch,
    finisher: clutch.finisher ? {
      ...clutch.finisher,
      linked: playerLink(clutch.finisher.id, clutch.finisher.name)
    } : null,
    bowler: clutch.bowler ? {
      ...clutch.bowler,
      linked: playerLink(clutch.bowler.id, clutch.bowler.name)
    } : null
  } : null;

  const vars = {
    ...buildVars(event),
    clutch: enrichedClutch,
    hasClutchDetail: !!(enrichedClutch && enrichedClutch.finisher)
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

export default clutchFinish;
