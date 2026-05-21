/**
 * @file renderers/matchReport/index.js
 * @description Block-Based Narrative Assembler for `match.result` events.
 *
 * Runs a sequence of small "blocks", each of which inspects the event and
 * either returns a chunk of the article (headline / subhead / paragraphs) or
 * null to skip. Block output is concatenated into a single article that
 * matches the standard renderer return shape, so inboxSubscriber can persist
 * it without special-casing.
 *
 * Order matters — earlier blocks set the headline + lede, later blocks
 * contribute body paragraphs, and a final closing block ties off the piece.
 *
 * @module core/news/renderers/matchReport
 */

import headlineHook from './blocks/headlineHook.js';
import anchorPerformance from './blocks/anchorPerformance.js';
import stageContext from './blocks/stageContext.js';
import colourCommentary from './blocks/colourCommentary.js';
import turningPoint from './blocks/turningPoint.js';
import clutchFinish from './blocks/clutchFinish.js';
import playerOfTheMatch from './blocks/playerOfTheMatch.js';
import postMatchQuotes from './blocks/postMatchQuotes.js';
import legacyEcho from './blocks/legacyEcho.js';
import contextClosing from './blocks/contextClosing.js';
import { computeMatchImportance } from './selectors.js';
import { pickReporter } from '../../reporters.js';

function safeRun(block, event, assemblerState) {
  try {
    return block(event, assemblerState);
  } catch (err) {
    console.error(`[matchReport] block ${block.name || 'anonymous'} threw — skipping:`, err);
    return null;
  }
}

function buildInboxSubject(payload, headline) {
  if (headline) return headline;
  if (!payload?.winner || !payload?.loser) return 'WPL Match Report';
  return `${payload.winner.name} beat ${payload.loser.name}`;
}

function buildTags(payload, isUserTeam) {
  const tags = ['match'];
  if (payload?.isPlayoff) tags.push('playoff');
  if (payload?.stageTag) tags.push(payload.stageTag);
  if (payload?.isCloseFinish) tags.push('close_finish');
  if (payload?.isOneSided) tags.push('one_sided');
  if (payload?.isHighScoring) tags.push('high_scoring');
  if (isUserTeam) tags.push('team');
  return tags;
}

export function renderMatchReport(event) {
  const p = event?.payload || {};

  // Tracks cross-block signals (e.g. anchor performance is needed by POTM
  // dedup and by legacyEcho's scenario picker).
  const assemblerState = {};

  // 1. Headline + subhead + lede — every report has this.
  const head = safeRun(headlineHook, event, assemblerState);
  const headline = head?.headline || `${p.winner?.name || 'Winner'} beat ${p.loser?.name || 'Opponent'}`;
  const subhead = head?.subhead || '';
  const ledeParagraphs = head?.paragraphs || [];

  // 2. Anchor performance (batting or bowling) — sets assemblerState.anchor
  const anchor = safeRun(anchorPerformance, event, assemblerState);
  if (anchor?.meta?.anchor) {
    assemblerState.anchor = anchor.meta.anchor;
  }
  const anchorParagraphs = anchor?.paragraphs || [];

  // 3. Playoff bracket framing (only fires if isPlayoff)
  const stage = safeRun(stageContext, event, assemblerState);
  const stageParagraphs = stage?.paragraphs || [];

  // 3.5. Deep cricket flags — milestone heartbreaks, lone-wolf 80s in losses,
  // captain's innings, unsung heroes, etc. Stores assemblerState.deepFlag so
  // the legacyEcho block can refine its scenario picking downstream.
  const colour = safeRun(colourCommentary, event, assemblerState);
  const colourParagraphs = colour?.paragraphs || [];

  // 4. Turning point — biggest swing over (needs ballByBall)
  const turn = safeRun(turningPoint, event, assemblerState);
  const turnParagraphs = turn?.paragraphs || [];

  // 5. Clutch finish — last balls (only fires if isCloseFinish)
  const clutch = safeRun(clutchFinish, event, assemblerState);
  const clutchParagraphs = clutch?.paragraphs || [];

  // 6. Player of the Match — dedup'd against anchor
  const potm = safeRun(playerOfTheMatch, event, assemblerState);
  const potmParagraphs = potm?.paragraphs || [];

  // 7. Post-match quotes — synthetic captain + POTM pull-quotes (rendered
  // as italic blockquotes in the modal via the `> ` paragraph marker)
  const quotes = safeRun(postMatchQuotes, event, assemblerState);
  const quoteParagraphs = quotes?.paragraphs || [];

  // 8. Legacy echo — sparse, dramatic-only homage
  const echo = safeRun(legacyEcho, event, assemblerState);
  const echoParagraphs = echo?.paragraphs || [];

  // 9. Closing context — standings move, next match cue
  const close = safeRun(contextClosing, event, assemblerState);
  const closingParagraphs = close?.paragraphs || [];

  // Concatenate + dedup empty/identical paragraphs (defensive)
  const all = [
    ...ledeParagraphs,
    ...anchorParagraphs,
    ...stageParagraphs,
    ...colourParagraphs,
    ...turnParagraphs,
    ...clutchParagraphs,
    ...potmParagraphs,
    ...quoteParagraphs,
    ...echoParagraphs,
    ...closingParagraphs
  ];
  const seen = new Set();
  const body = [];
  for (const para of all) {
    if (!para) continue;
    if (seen.has(para)) continue;
    seen.add(para);
    body.push(para);
  }

  const importance = computeMatchImportance(p);
  const reporter = pickReporter(event);

  return {
    headline,
    subhead,
    body,
    inboxSubject: buildInboxSubject(p, headline),
    inboxType: 'match_result',
    sender: reporter.name,
    reporterId: reporter.id,
    reporterTagline: reporter.tagline,
    tags: buildTags(p, false),
    importance,
    event
  };
}

export default renderMatchReport;
