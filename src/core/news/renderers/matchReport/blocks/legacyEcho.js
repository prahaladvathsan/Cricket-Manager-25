/**
 * @file blocks/legacyEcho.js
 * @description Sparingly inserts a homage paragraph evoking a real broadcaster
 * (Bishop, Shastri, Bhogle, Kimber, Monga, Nicholas, Lawry, Benaud). Fires
 * roughly 25% of the time on dramatic matches — close finish, playoff, final,
 * or six-fest — and never on routine results.
 *
 * @module core/news/renderers/matchReport/blocks/legacyEcho
 */

import { pickScenario, pickQuote } from '../famousQuotes.js';

const FIRE_PROBABILITY = 0.25;

export function legacyEcho(event, assemblerState) {
  const p = event?.payload || {};

  // Cheap gate first — only fires on inherently dramatic matches.
  const dramatic = p.isCloseFinish || p.isPlayoff || p.isHighScoring;
  if (!dramatic) return null;

  // Probabilistic firing so the same homage doesn't appear on every dramatic
  // match. The Final always fires (one season, one Final, worth the line).
  const guaranteed = p.stageLabel === 'Final';
  if (!guaranteed && Math.random() > FIRE_PROBABILITY) return null;

  const hooks = {
    bigSixCount: assemblerState?.bigSixCount ?? 0,
    wicketStormOver: assemblerState?.wicketStorm,
    anchorIsCentury: (assemblerState?.anchor?.stats?.runs ?? 0) >= 100,
    anchorIsTightSpell: assemblerState?.anchor?.type === 'bowling' && (assemblerState?.anchor?.stats?.economy && parseFloat(assemblerState.anchor.stats.economy) < 6.0),
    isUpset: !!assemblerState?.isUpset
  };

  const scenario = pickScenario(p, hooks);
  const quote = pickQuote(scenario);
  if (!quote) return null;

  return {
    paragraphs: [quote.template]
  };
}

export default legacyEcho;
