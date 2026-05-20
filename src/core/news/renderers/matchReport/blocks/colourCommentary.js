/**
 * @file blocks/colourCommentary.js
 * @description Cricket-specific story-finder block. Detects deep flags
 * (milestone heartbreak, lone wolf, captain's innings, unsung hero, youngster
 * breakout, veteran resurgence, cameo hero, powerplay wreck, death-overs
 * specialist) and emits a paragraph for the highest-priority one detected.
 *
 * Stores the chosen flag on assemblerState so the legacyEcho block can adjust
 * its scenario hooks (e.g. anchorIsCentury picks up centuryMilestone framing).
 *
 * @module core/news/renderers/matchReport/blocks/colourCommentary
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import { detectDeepFlags, pickPrimaryFlag } from '../deepFlags.js';
import { withLink } from '../../../entityHelpers.js';
import pool from '../templates/colourCommentary.json';

export function colourCommentary(event, assemblerState) {
  const flags = detectDeepFlags(event);
  const primary = pickPrimaryFlag(flags);
  if (!primary) return null;

  // Surface for legacyEcho scenario picking
  if (assemblerState) {
    assemblerState.deepFlag = primary;
    assemblerState.flagKind = primary.kind;
  }

  const enrichedFlag = {
    ...primary,
    player: primary.player ? withLink(primary.player, 'PLAYER') : null,
    team: primary.team ? withLink(primary.team, 'TEAM') : null
  };

  const vars = {
    ...buildVars(event),
    flag: enrichedFlag
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
    meta: { flag: primary }
  };
}

export default colourCommentary;
