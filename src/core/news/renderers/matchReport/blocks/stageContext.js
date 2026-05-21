/**
 * @file blocks/stageContext.js
 * @description Playoff-only block. Frames where the result leaves the winning
 * and losing sides in the bracket — eliminator exit, qualifier survival,
 * final-clinch, etc.
 *
 * @module core/news/renderers/matchReport/blocks/stageContext
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import pool from '../templates/stageContext.json';

export function stageContext(event) {
  const p = event?.payload || {};
  if (!p.isPlayoff) return null;

  const vars = buildVars(event);
  const matching = pool.filter(t => matchesAll(t.when, vars));
  const candidates = matching.length > 0 ? matching : pool.filter(t => !t.when);
  const finalCandidates = candidates.length > 0 ? candidates : pool;
  const pick = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  if (!pick) return null;

  return {
    paragraphs: Array.isArray(pick.body)
      ? pick.body.map(para => renderString(para, vars)).filter(Boolean)
      : []
  };
}

export default stageContext;
