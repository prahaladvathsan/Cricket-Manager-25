/**
 * @file NewsDispatcher.js
 * @description Transient pub/sub for non-match league events (injuries, retentions,
 * transfers, playoffs). Emits structured JSON payloads to subscribers; persistence
 * is the subscriber's responsibility (e.g. inboxSubscriber writes to inboxStore).
 *
 * Type taxonomy is dot-namespaced — subscribers can filter with exact match
 * ('transfer.completed') or wildcard ('transfer.*', '*').
 *
 * @module core/news/NewsDispatcher
 */

/**
 * @typedef {Object} NewsEvent
 * @property {string} type - Dot-namespaced event type (e.g. 'injury.onset')
 * @property {number} season - Current season number
 * @property {number} gameDay - Current game day
 * @property {string} date - ISO timestamp
 * @property {Object} payload - Event-specific structured data
 */

/**
 * @typedef {Object} Subscription
 * @property {(event: NewsEvent) => void} handler
 * @property {string[]} patterns - Type patterns this subscriber listens to
 */

function matchesPattern(eventType, pattern) {
  if (pattern === '*' || pattern === eventType) return true;
  if (!pattern.endsWith('.*')) return false;
  const prefix = pattern.slice(0, -2);
  return eventType === prefix || eventType.startsWith(prefix + '.');
}

class NewsDispatcher {
  constructor() {
    /** @type {Set<Subscription>} */
    this.subscriptions = new Set();
  }

  /**
   * Subscribe to news events.
   * @param {(event: NewsEvent) => void} handler
   * @param {{ types?: string[] }} [options] - Filter by type patterns. Default: ['*']
   * @returns {() => void} unsubscribe function
   */
  subscribe(handler, options = {}) {
    const patterns = Array.isArray(options.types) && options.types.length > 0
      ? options.types
      : ['*'];
    const sub = { handler, patterns };
    this.subscriptions.add(sub);
    return () => this.subscriptions.delete(sub);
  }

  /**
   * Emit an event to all matching subscribers.
   * @param {NewsEvent} event
   */
  emit(event) {
    if (!event || typeof event.type !== 'string') {
      console.warn('[NewsDispatcher] emit() requires { type, ... }');
      return;
    }
    const enriched = {
      ...event,
      date: event.date || new Date().toISOString()
    };
    for (const sub of this.subscriptions) {
      const matches = sub.patterns.some(p => matchesPattern(enriched.type, p));
      if (!matches) continue;
      try {
        sub.handler(enriched);
      } catch (err) {
        console.error(`[NewsDispatcher] Subscriber error on ${enriched.type}:`, err);
      }
    }
  }

  /**
   * Clear all subscriptions (for testing/teardown).
   */
  clear() {
    this.subscriptions.clear();
  }

  /**
   * Current subscription count (for diagnostics).
   * @returns {number}
   */
  size() {
    return this.subscriptions.size;
  }
}

export default NewsDispatcher;
