/**
 * @file inboxSubscriber.js
 * @description Default NewsDispatcher subscriber that renders the event payload
 * via the news template engine and writes the result to inboxStore. This is the
 * bridge that lets all existing inbox UX (toasts, categories, persistence)
 * continue working while we migrate scattered addMessage() call sites to the
 * canonical dispatcher.emit() pathway.
 *
 * The Home page news carousel reads from inboxStore directly (filtered to
 * league-news types), so this subscriber doubles as the news feed source.
 *
 * Responsibilities at write time:
 *   - Render the article via renderNews (custom renderer or template pool).
 *   - Compute an importance score (renderer-provided value wins, else lookup).
 *   - Detect whether the article involves the user's team (isUserTeam flag).
 *   - Strip the heavy render-only `context` slot so IndexedDB stays lean.
 *
 * @module core/news/subscribers/inboxSubscriber
 */

import useInboxStore from '../../../stores/inboxStore.js';
import useTeamStore from '../../../stores/teamStore.js';
import TEMPLATES from '../templates/index.js';
import renderNews from '../renderNewsBody.js';
import computeImportance from '../importance.js';

/**
 * Format a body string array into a markdown-friendly inbox body.
 */
function formatBody(paragraphs) {
  return (paragraphs || []).filter(Boolean).join('\n\n');
}

/**
 * Walk the payload looking for canonical team id fields. Any one match against
 * the user's team id flips isUserTeam to true.
 */
function detectUserTeam(payload, userTeamId) {
  if (!userTeamId || !payload) return false;
  // Explicit flag set at emit site wins
  if (payload.isUserTeam === true) return true;

  const candidates = [
    payload.team?.id,
    payload.winner?.id,
    payload.loser?.id,
    payload.home?.id,
    payload.away?.id,
    payload.fromTeam?.id,
    payload.toTeam?.id,
    payload.champion?.id,
    payload.runnerUp?.id,
    payload.player?.teamId,
    payload.player?.currentTeam
  ];
  return candidates.some(id => id && id === userTeamId);
}

/**
 * Subscriber handler. Receives a NewsEvent, resolves a template, writes to inbox.
 * @param {Object} event - { type, season, gameDay, date, payload, context? }
 */
function inboxSubscriber(event) {
  const article = renderNews(TEMPLATES, event);
  if (!article) {
    // No template registered for this event type — skip silently.
    // The text engine (other subscribers) may still consume the raw event.
    return;
  }

  const importance = typeof article.importance === 'number'
    ? article.importance
    : computeImportance(event);

  const userTeamId = useTeamStore.getState().userTeamId;
  const isUserTeam = detectUserTeam(event.payload, userTeamId);

  // All dispatcher-driven articles land under a single `league_news` type so
  // they can be cleanly filtered by the Home news carousel without colliding
  // with the existing personal inbox categories (injury, transfer, etc.) that
  // legacy MessageGenerator call sites still populate.
  useInboxStore.getState().addMessage({
    type: 'league_news',
    subject: article.inboxSubject,
    body: formatBody(article.body),
    sender: article.sender,
    date: event.date,
    metadata: {
      newsEventType: event.type,
      newsCategory: article.inboxType,
      headline: article.headline,
      subhead: article.subhead,
      bodyParagraphs: article.body,
      tags: article.tags,
      season: event.season,
      gameDay: event.gameDay,
      importance,
      isUserTeam,
      reporterId: article.reporterId,
      reporterTagline: article.reporterTagline,
      // NOTE: `event.context` (fullScorecard, ballByBall, etc.) is intentionally
      // NOT persisted — it's a render-time-only slot. Keeping it out of the
      // saved metadata keeps IndexedDB small for long careers.
      payload: event.payload
    }
  });
}

export default inboxSubscriber;
