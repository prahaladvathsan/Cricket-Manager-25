/**
 * @file CommentaryEngine.js
 * @description Template-driven commentary generator. Infers narrative tags
 * from existing simulation data and renders one of N matching variants.
 * @module core/match-engine/commentary/CommentaryEngine
 */

import { TEMPLATES } from './templates.js';
import { inferTags } from './inferActions.js';

const PLACEHOLDER_REGEX = /\$\{(\w+)\}/g;

/**
 * Check whether all keys in `when` match the corresponding tags.
 * Predicate keys with `undefined` value require the tag to also be undefined.
 * Any other value requires strict equality.
 */
function matchesAll(when, tags) {
  if (!when) return true;
  for (const key of Object.keys(when)) {
    if (tags[key] !== when[key]) return false;
  }
  return true;
}

function renderTemplate(text, vars) {
  return text
    .replace(PLACEHOLDER_REGEX, (_, key) => {
      const v = vars[key];
      return v == null ? '' : String(v);
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve the outcome key used to look up template pools.
 * Maps wicket-types to the right bucket; falls back to WICKET then DEFAULT.
 */
function resolveOutcomeKey(ball) {
  const raw = ball.outcome;
  if (!raw) return 'DEFAULT';
  if (TEMPLATES[raw]) return raw;
  if (ball.isWicket) return 'WICKET';
  return 'DEFAULT';
}

/**
 * Generate a single commentary line for a ball.
 *
 * @param {Object} ball - BallResult (with optional metadata + chaseContext)
 * @param {Object} [context] - { strikerName, bowlerName, nonStrikerName }
 * @returns {string} commentary line
 */
export function generateCommentary(ball, context = {}) {
  const tags = inferTags(ball);
  const outcomeKey = resolveOutcomeKey(ball);
  const pool = TEMPLATES[outcomeKey] || TEMPLATES.DEFAULT;

  // Filter to templates whose `when` conditions all match.
  const matching = pool.filter(t => matchesAll(t.when, tags));

  // Fall back to baseline (no `when`) entries if no contextual template fits.
  const candidates = matching.length > 0
    ? matching
    : pool.filter(t => !t.when);

  // Final fallback: anything in the pool, then DEFAULT.
  const finalCandidates = candidates.length > 0
    ? candidates
    : (pool.length > 0 ? pool : TEMPLATES.DEFAULT);

  const pick = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

  const vars = {
    striker: context.strikerName || ball.strikerName || 'The batter',
    bowler: context.bowlerName || ball.bowlerName || 'the bowler',
    nonStriker: context.nonStrikerName || ball.nonStrikerName || '',
    runs: ball.runs,
    fielder: tags.fielder,
    position: tags.position,
    zone: tags.zone,
    rrr: tags.rrr,
    needed: tags.needed,
    ballsLeft: tags.ballsLeft
  };

  return renderTemplate(pick.text, vars);
}
