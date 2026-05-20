/**
 * @file renderNewsBody.js
 * @description News rendering entry point. Routes events to a custom renderer
 * (registered in `renderers/index.js`) or falls back to the default
 * template-pool renderer that selects + interpolates a single JSON template.
 *
 * Default template format (per event type):
 *   {
 *     [eventType]: [
 *       {
 *         when: { severity: 'major' },               // optional predicate
 *         headline: 'Bumrah out 14 days',
 *         subhead: 'Mumbai bowler stretchered off',
 *         body: [
 *           '${player.name} sustained a ${injury.type} injury...',
 *           'The ${team.name} talisman is expected back on day ${impact.nextAvailableDay}.'
 *         ],
 *         inboxSubject: 'Injury: ${player.name} (${injury.durationDays}d)',
 *         inboxType: 'injury',
 *         sender: '${team.name} Medical Team',
 *         tags: ['injury', 'major'],
 *         importance: 50                              // optional 0-100 score
 *       }
 *     ]
 *   }
 *
 * Custom renderers (e.g. block-based match reports) live under `renderers/`.
 *
 * @module core/news/renderNewsBody
 */

import RENDERERS from './renderers/index.js';
import { pickReporter } from './reporters.js';

const PLACEHOLDER_REGEX = /\$\{([\w.]+)\}/g;

/**
 * Resolve a dotted path against an object. `${player.name}` → obj.player.name.
 * @param {Object} obj
 * @param {string} path
 */
export function resolvePath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Interpolate `${dotted.path}` placeholders in a string against vars.
 * Missing keys collapse to empty strings (same behaviour as the original).
 * @param {string} text
 * @param {Object} vars
 */
// All ten WPL team names end in -s (Sharks, Jaguars, Kites, Pythons, …) so
// `${winner.name}'s` always emits "Sharks's". Normalise the possessive to
// "Sharks'" (and handle the curly-apostrophe form too). Matches names where
// the noun ends in -s; lowercase trailing-s words also get the fix, which is
// the accepted modern-style possessive for nouns ending in -s.
const POSSESSIVE_REGEX = /([A-Za-z]+s)(['’])s\b/g;

export function renderString(text, vars) {
  if (typeof text !== 'string') return text;
  return text
    .replace(PLACEHOLDER_REGEX, (_, key) => {
      const v = resolvePath(vars, key);
      return v == null ? '' : String(v);
    })
    .replace(POSSESSIVE_REGEX, (_match, stem, apos) => `${stem}${apos}`)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match a template's `when:{}` predicate against the resolved vars.
 * Every key in `when` must equal the resolved value at that dotted path.
 * @param {Object|undefined} when
 * @param {Object} payload
 */
export function matchesAll(when, payload) {
  if (!when) return true;
  for (const key of Object.keys(when)) {
    const actual = resolvePath(payload, key);
    if (actual !== when[key]) return false;
  }
  return true;
}

/**
 * Build the interpolation vars object from the event envelope.
 * Renderers and the template pool both use this so dotted-path semantics
 * stay consistent (e.g. `${season}` resolves the envelope field, not a
 * payload field of the same name).
 * @param {Object} event
 */
export function buildVars(event) {
  return {
    ...event.payload,
    season: event.season,
    gameDay: event.gameDay,
    date: event.date
  };
}

/**
 * Default renderer: pick the best template variant from a pool and render it.
 * Same behaviour as the pre-refactor `renderNews` function — kept so that
 * event types without a custom renderer continue working unchanged.
 *
 * @param {Object} templates - The full template registry (all event types)
 * @param {Object} event - NewsEvent { type, payload, season, gameDay, date }
 * @returns {Object|null}
 */
export function renderTemplatePool(templates, event) {
  const pool = templates[event.type];
  if (!pool || pool.length === 0) {
    return null;
  }

  const vars = buildVars(event);

  const matching = pool.filter(t => matchesAll(t.when, vars));
  const candidates = matching.length > 0
    ? matching
    : pool.filter(t => !t.when);
  const finalCandidates = candidates.length > 0 ? candidates : pool;

  const pick = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

  // If a template provides an explicit sender (e.g. "${team.name} Medical Team"
  // for injuries) it wins; otherwise draw a reporter from the persona pool.
  const rawSender = renderString(pick.sender, vars);
  let sender = rawSender;
  let reporterId;
  let reporterTagline;
  if (!rawSender || rawSender === 'WPL Newsdesk') {
    const reporter = pickReporter(event);
    sender = reporter.name;
    reporterId = reporter.id;
    reporterTagline = reporter.tagline;
  }

  return {
    headline: renderString(pick.headline, vars),
    subhead: renderString(pick.subhead, vars),
    body: Array.isArray(pick.body) ? pick.body.map(p => renderString(p, vars)) : [],
    inboxSubject: renderString(pick.inboxSubject || pick.headline, vars),
    inboxType: pick.inboxType || 'league_news',
    sender,
    reporterId,
    reporterTagline,
    tags: Array.isArray(pick.tags) ? pick.tags.map(t => renderString(t, vars)) : [],
    importance: typeof pick.importance === 'number' ? pick.importance : undefined,
    event
  };
}

/**
 * Render a news event. Routes to a custom renderer (block assembler etc.) if
 * one is registered for the event type; otherwise picks from the JSON template
 * pool.
 *
 * @param {Object} templates - The full template registry
 * @param {Object} event - NewsEvent
 * @returns {Object|null} rendered article
 */
export function renderNews(templates, event) {
  const customRenderer = RENDERERS[event.type];
  if (customRenderer) {
    try {
      return customRenderer(event);
    } catch (err) {
      console.error(`[renderNews] Custom renderer for ${event.type} threw — falling back to template pool:`, err);
      // Fall through to template pool as graceful degradation
    }
  }
  return renderTemplatePool(templates, event);
}

export default renderNews;
