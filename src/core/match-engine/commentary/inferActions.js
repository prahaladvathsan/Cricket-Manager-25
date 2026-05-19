/**
 * @file inferActions.js
 * @description Pure tag derivation from a BallResult. The CommentaryEngine
 * uses these tags to filter templates.
 * @module core/match-engine/commentary/inferActions
 */

const HIT_ZONE_LABELS = {
  fineLeg: 'fine leg',
  point: 'point',
  cover: 'cover',
  midOff: 'mid-off',
  midOn: 'mid-on',
  midWicket: 'mid-wicket'
};

/**
 * Map a numeric required run rate to a discrete pressure bucket.
 * @param {number|null|undefined} rrr
 * @returns {string|undefined} 'high' | 'moderate' | 'low' | undefined
 */
function bucketChasePressure(rrr) {
  if (rrr == null || !Number.isFinite(rrr)) return undefined;
  if (rrr >= 10) return 'high';
  if (rrr >= 7) return 'moderate';
  return 'low';
}

/**
 * Derive narrative tags from a ball object.
 *
 * Reads:
 *   - ball.outcome, ball.runs, ball.phase, ball.hitZone (top-level)
 *   - ball.metadata?.trajectoryResult?.shotType (live mode only)
 *   - ball.metadata?.fieldingResult?.closestFielder (live mode only)
 *   - ball.fielderName, ball.fielderId (MatchEngine extracts these for wickets)
 *   - ball.chaseContext (added by matchStore in 2nd innings)
 *
 * @param {Object} ball
 * @returns {Object} tag bag for template filtering and rendering
 */
export function inferTags(ball) {
  const tags = {
    outcome: ball.outcome,
    runs: ball.runs,
    phase: ball.phase,
    zone: HIT_ZONE_LABELS[ball.hitZone] || ball.hitZone,
    shotType: ball.metadata?.trajectoryResult?.shotType,
    fielder: ball.fielderName
      || ball.metadata?.fieldingResult?.closestFielder?.fielder?.name,
    position: ball.metadata?.fieldingResult?.closestFielder?.positionName
  };

  // Chase context (2nd innings only)
  const chase = ball.chaseContext;
  if (chase) {
    tags.chasePressure = bucketChasePressure(chase.requiredRunRate);
    tags.closeMatch = (chase.runsRequired <= 12 && chase.ballsRemaining <= 12) || undefined;
    tags.needed = chase.runsRequired;
    tags.ballsLeft = chase.ballsRemaining;
    tags.rrr = chase.requiredRunRate != null
      ? chase.requiredRunRate.toFixed(2)
      : undefined;
  }

  tags.boundaryAerial = (ball.outcome === 'SIX')
    || (ball.outcome === 'FOUR' && tags.shotType === 'aerial')
    || undefined;

  return tags;
}
