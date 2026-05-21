/**
 * @file importance.js
 * @description Per-event importance scoring (0-100). Used by the Home news
 * carousel to sort articles by significance (highest first) before the
 * +25 user-team boost is applied in the sort comparator.
 *
 * If a renderer attaches `importance` to its article directly, that value
 * wins. Otherwise this lookup runs against the raw event.
 *
 * @module core/news/importance
 */

function clamp(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Compute an importance score for a news event.
 * @param {Object} event - { type, payload }
 * @returns {number} 0-100
 */
export function computeImportance(event) {
  const p = event?.payload || {};
  switch (event?.type) {
    case 'playoff.champion_crowned':
      return 100;

    case 'playoff.qualified':
      return p.qualification?.seed === 1 ? 85 : 75;

    case 'match.result': {
      let score = 25;
      if (p.isPlayoff) score += 35;
      if (p.isCloseFinish) score += 15;
      if (p.isHighScoring) score += 10;
      if (p.isOneSided) score -= 5;
      return clamp(score);
    }

    case 'transfer.completed':
      return p.isMarquee ? 75 : 40;

    case 'retention.player_retained':
      return p.contract?.retentionTier === 'marquee' ? 65 : 35;

    case 'injury.onset': {
      const sev = p.injury?.severity;
      if (sev === 'severe') return 60;
      if (sev === 'major') return 50;
      return 30;
    }

    case 'injury.recovery':
      return 25;

    case 'season.opener':
      return 70;

    case 'weekly.roundup':
      return 55;

    default:
      return 20;
  }
}

export default computeImportance;
