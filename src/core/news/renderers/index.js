/**
 * @file renderers/index.js
 * @description Renderer registry. Maps event types to a custom renderer function.
 * When an event type has no registered renderer, the engine falls back to the
 * default template-pool renderer (renderTemplatePool in renderNewsBody.js).
 *
 * A renderer takes the enriched event ({ type, season, gameDay, date, payload, context? })
 * and returns the same article shape used today:
 *   { headline, subhead, body[], inboxSubject, inboxType, sender, tags, event, importance? }
 *
 * The `match.result` block-based assembler is wired in here once Phase 2 lands
 * (renderers/matchReport/index.js).
 *
 * @module core/news/renderers
 */

import renderMatchReport from './matchReport/index.js';

const RENDERERS = {
  'match.result': renderMatchReport
};

export default RENDERERS;
