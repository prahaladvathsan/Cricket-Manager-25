/**
 * @file entityHelpers.js
 * @description Sentinel-token helpers for embedding clickable player/team
 * references inside news body paragraphs. Templates emit
 *   [[PLAYER:id|Display Name]]
 *   [[TEAM:id|Display Name]]
 * tokens via the `.linked` virtual key on payload objects (e.g.
 * `${anchor.player.linked}`). The NewsArticleModal body renderer parses these
 * back into <PlayerName>/<TeamName> components; the carousel-card preview
 * strips them down to plain text via `stripSentinels`.
 *
 * @module core/news/entityHelpers
 */

export const SENTINEL_REGEX = /\[\[(PLAYER|TEAM):([^|\]]+)\|([^\]]+)\]\]/g;

/**
 * Build a player link sentinel. Falls back to plain name when id is missing.
 */
export function playerLink(id, name) {
  if (!name) return '';
  if (!id) return name;
  return `[[PLAYER:${id}|${name}]]`;
}

/**
 * Build a team link sentinel.
 */
export function teamLink(id, name) {
  if (!name) return '';
  if (!id) return name;
  return `[[TEAM:${id}|${name}]]`;
}

/**
 * Walk an entity-bearing object and add `.linked` virtual fields where it has
 * an id + name. Used by blocks to enrich the var bag before template interpolation.
 * Mutates and returns the same object for ergonomic chaining.
 *
 * Recognised keys: id, name. Mutates only entries we recognise; leaves the rest
 * alone.
 */
export function withLink(obj, kind = 'PLAYER') {
  if (!obj || typeof obj !== 'object' || !obj.id || !obj.name) return obj;
  const link = kind === 'TEAM' ? teamLink(obj.id, obj.name) : playerLink(obj.id, obj.name);
  return { ...obj, linked: link };
}

/**
 * Strip sentinels back to their display-name fallback. Used by anything that
 * needs the plain-text form (carousel preview, inbox subject lines, search
 * indexes).
 */
export function stripSentinels(text) {
  if (typeof text !== 'string' || text.indexOf('[[') === -1) return text;
  return text.replace(SENTINEL_REGEX, (_match, _kind, _id, name) => name);
}

/**
 * Parse a body paragraph into an array of text + entity segments.
 * Returns:
 *   [{ kind: 'text', text }, { kind: 'player'|'team', id, name }, ...]
 * NewsArticleModal walks the result and renders <PlayerName>/<TeamName> for
 * entity segments.
 */
export function parseEntities(text) {
  if (typeof text !== 'string' || text.indexOf('[[') === -1) {
    return [{ kind: 'text', text: text || '' }];
  }
  const out = [];
  let lastIndex = 0;
  // Reset regex state — global regex is stateful across calls
  const re = new RegExp(SENTINEL_REGEX.source, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push({ kind: 'text', text: text.slice(lastIndex, m.index) });
    }
    out.push({
      kind: m[1] === 'TEAM' ? 'team' : 'player',
      id: m[2],
      name: m[3]
    });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    out.push({ kind: 'text', text: text.slice(lastIndex) });
  }
  return out;
}

/**
 * Strip a leading `> ` quote marker and return both the cleaned text and a flag.
 * Used by the modal body renderer to detect pull-quote paragraphs.
 */
export function extractQuoteMark(text) {
  if (typeof text !== 'string') return { isQuote: false, text: text || '' };
  if (text.startsWith('> ')) return { isQuote: true, text: text.slice(2) };
  return { isQuote: false, text };
}
