/**
 * @file blocks/contextClosing.js
 * @description The closing paragraph of every match report. Pulls the winner's
 * position from the standings snapshot in event.context, names the next match
 * if one is scheduled, and hands the spotlight forward.
 *
 * @module core/news/renderers/matchReport/blocks/contextClosing
 */

import { renderString, matchesAll, buildVars } from '../../../renderNewsBody.js';
import { teamPosition, ordinal } from '../selectors.js';
import pool from '../templates/contextClosing.json';

export function contextClosing(event) {
  const p = event?.payload || {};
  const standings = event?.context?.standingsSnapshot || [];

  const winnerPos = teamPosition(standings, p.winner?.id);
  const winnerEntry = standings.find(s => s.clubId === p.winner?.id);
  const loserEntry = standings.find(s => s.clubId === p.loser?.id);

  const vars = {
    ...buildVars(event),
    winnerPosition: winnerPos ? ordinal(winnerPos) : '',
    winnerPoints: winnerEntry?.points ?? '',
    loserPoints: loserEntry?.points ?? '',
    hasStandings: !!(winnerPos && winnerEntry)
  };

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

export default contextClosing;
