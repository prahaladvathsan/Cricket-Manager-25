/**
 * @file blocks/turningPoint.js
 * @description Scans the ball-by-ball log for the over with the biggest swing
 * (2+ wickets OR 20+ runs, ranked by swing index = wickets*12 + runs). Falls
 * back gracefully if ballByBall isn't available (legacy saves, future-quick-sim
 * regressions).
 *
 * @module core/news/renderers/matchReport/blocks/turningPoint
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import { pickTurningOver } from '../selectors.js';
import { playerLink } from '../../../entityHelpers.js';
import pool from '../templates/turningPoint.json';

export function turningPoint(event) {
  const ballByBall = event?.context?.ballByBall;
  const turning = pickTurningOver(ballByBall);
  // If we can't find a meaningful swing-over, skip — better silence than padding.
  if (!turning) return null;

  // The over number is 0-based in the source data; surface 1-based to readers.
  const overLabel = turning.over + 1;

  const bowlerName = turning.bowlerName || 'the bowler';
  const bowlerLinked = turning.bowlerId
    ? playerLink(turning.bowlerId, bowlerName)
    : bowlerName;

  const vars = {
    ...buildVars(event),
    turning: {
      ...turning,
      overLabel,
      inningsLabel: turning.innings === 1 ? 'first innings' : 'second innings',
      bowlerName,
      bowlerLinked
    }
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

export default turningPoint;
