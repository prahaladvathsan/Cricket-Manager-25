/**
 * @file blocks/headlineHook.js
 * @description The opening block of every match report. Picks a micro-template
 * variant based on match flags (isPlayoff > isCloseFinish > isOneSided >
 * isHighScoring > default) and returns the article's headline, subhead, and
 * lede paragraph.
 *
 * Cadence note: variants borrow phrasings from Bhogle, Monga, Kimber, and
 * Shastri (style only, no attribution — the legacyEcho block handles named
 * homages).
 *
 * @module core/news/renderers/matchReport/blocks/headlineHook
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import pool from '../templates/headlineHook.json';

export function headlineHook(event) {
  const vars = buildVars(event);
  const matching = pool.filter(t => matchesAll(t.when, vars));
  const candidates = matching.length > 0 ? matching : pool.filter(t => !t.when);
  const finalCandidates = candidates.length > 0 ? candidates : pool;
  const pick = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
  if (!pick) return null;

  return {
    headline: renderString(pick.headline, vars),
    subhead: renderString(pick.subhead, vars),
    paragraphs: Array.isArray(pick.lede)
      ? pick.lede.map(p => renderString(p, vars)).filter(Boolean)
      : []
  };
}

export default headlineHook;
