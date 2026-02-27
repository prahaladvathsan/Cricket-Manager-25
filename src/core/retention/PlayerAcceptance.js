/**
 * @file PlayerAcceptance.js
 * @description Pure function for evaluating player retention salary offers
 */

import retentionConfig from '../../data/config/retentionConfig.json';

/**
 * Simple seeded random for deterministic variance per player+attempt
 * @param {string} seed - Seed string
 * @returns {number} Value between 0 and 1
 */
function seededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

/**
 * Evaluate a retention salary offer from a team to a player
 * @param {Object} player - Player object
 * @param {number} offeredSalary - The salary being offered
 * @param {number} marketValue - Player's estimated market value
 * @param {number} attemptNumber - Which attempt this is (1, 2, or 3)
 * @param {Object} config - Optional config override
 * @returns {{ accepted: boolean, counterOffer: number|null, reason: string }}
 */
export function evaluateOffer(player, offeredSalary, marketValue, attemptNumber, config = null) {
  const cfg = config || retentionConfig.playerAcceptance;

  // Determine acceptance threshold
  let threshold = cfg.baseAcceptanceThreshold;

  // Elite players are harder to retain cheaply
  const primaryRating = getPrimaryRating(player);
  if (primaryRating >= cfg.eliteRatingThreshold) {
    threshold *= cfg.topPlayerHardnessMultiplier;
  }

  // Add seeded random variance per player+attempt
  const variance = seededRandom(player.id + String(attemptNumber)) * cfg.randomVarianceRange * 2 - cfg.randomVarianceRange;
  const effectiveThreshold = threshold + variance;

  // Calculate offer ratio
  const offerRatio = marketValue > 0 ? offeredSalary / marketValue : 1;

  if (offerRatio >= effectiveThreshold) {
    return { accepted: true, counterOffer: null, reason: 'accepted' };
  }

  // Rejected — determine counter-offer based on attempt
  if (attemptNumber >= 3) {
    return { accepted: false, counterOffer: null, reason: 'final_rejection' };
  }

  const counterKey = `attempt${attemptNumber}`;
  const counterFraction = cfg.counterOfferFraction[counterKey];
  const counterOffer = counterFraction ? Math.round(marketValue * counterFraction) : null;

  return { accepted: false, counterOffer, reason: 'wants_more' };
}

/**
 * Get a player's primary playstyle rating (highest rating across role-relevant categories)
 * @param {Object} player - Player object
 * @returns {number} Primary rating (0-100)
 */
function getPrimaryRating(player) {
  if (!player.topPlaystyles) return 0;

  switch (player.role) {
    case 'batsman':
      return player.topPlaystyles.batting?.[0]?.rating || 0;
    case 'bowler':
      return player.topPlaystyles.bowling?.[0]?.rating || 0;
    case 'wicket-keeper': {
      const bat = player.topPlaystyles.batting?.[0]?.rating || 0;
      const keep = player.topPlaystyles.fielding?.[0]?.rating || 0;
      return Math.max((bat + keep) / 2, bat);
    }
    case 'all-rounder': {
      const batting = player.topPlaystyles.batting?.[0]?.rating || 0;
      const bowling = player.topPlaystyles.bowling?.[0]?.rating || 0;
      return Math.max(batting, bowling);
    }
    default:
      return 0;
  }
}
