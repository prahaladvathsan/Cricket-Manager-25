/**
 * Rating Helper Utility
 * Provides consistent access to player ratings throughout the application.
 * All UI-facing ratings are dynamically computed from player attributes
 * using PlaystyleCalculator, cached per player object reference via WeakMap.
 * Match engine continues to use pre-computed stored values for performance.
 */

import playstyleCalculator from './PlaystyleCalculator.js';

// WeakMap cache: auto-invalidates when player object reference changes (Zustand immutable updates)
const ratingsCache = new WeakMap();

/**
 * Dynamically compute playstyle ratings from player attributes.
 * Results are cached per player object reference.
 * @param {Object} player - Player object with attributes
 * @returns {Object|null} { playstyleRatings, topPlaystyles, primaryPlaystyle } or null
 */
export function computePlayerRatings(player) {
  if (!player?.attributes) return null;

  if (ratingsCache.has(player)) {
    return ratingsCache.get(player);
  }

  try {
    const ratings = playstyleCalculator.calculateAllPlaystyleRatings(player);
    const primaryPlaystyles = playstyleCalculator.getPlayerPrimaryPlaystyles(
      player,
      player.role || 'batsman',
      3
    );

    const result = {
      playstyleRatings: ratings,
      topPlaystyles: {
        batting: primaryPlaystyles.batting || [],
        bowling: primaryPlaystyles.bowling || [],
        fielding: primaryPlaystyles.fielding || []
      },
      primaryPlaystyle: {
        batting: primaryPlaystyles.batting?.[0]?.name || null,
        bowling: primaryPlaystyles.bowling?.[0]?.name || null,
        fielding: primaryPlaystyles.fielding?.[0]?.name || null
      }
    };

    ratingsCache.set(player, result);
    return result;
  } catch (e) {
    // Fallback: return stored values if computation fails
    return null;
  }
}

/**
 * Get the primary batting playstyle rating for a player
 * @param {Object} player - Player object
 * @returns {number} Rating value (0-100 scale), or 0 if not available
 */
export function getPrimaryBattingRating(player) {
  if (!player) return 0;

  // Compute dynamically from attributes
  const computed = computePlayerRatings(player);
  if (computed?.topPlaystyles?.batting?.[0]?.rating) {
    return Math.round(computed.topPlaystyles.batting[0].rating);
  }

  // Fallback to stored values (players without full attributes)
  if (player.topPlaystyles?.batting?.[0]?.rating) {
    return Math.round(player.topPlaystyles.batting[0].rating);
  }

  if (player.primaryPlaystyle?.batting && player.playstyleRatings?.batting) {
    const rating = player.playstyleRatings.batting[player.primaryPlaystyle.batting];
    if (rating !== undefined) return Math.round(rating);
  }

  // Last resort: Scale batting_overall from 1-20 to 0-100
  if (player.attributes?.overall?.batting_overall) {
    return Math.round(player.attributes.overall.batting_overall * 5);
  }

  return 0;
}

/**
 * Get the primary bowling playstyle rating for a player
 * @param {Object} player - Player object
 * @returns {number} Rating value (0-100 scale), or 0 if not available
 */
export function getPrimaryBowlingRating(player) {
  if (!player) return 0;

  // Compute dynamically from attributes
  const computed = computePlayerRatings(player);
  if (computed?.topPlaystyles?.bowling?.[0]?.rating) {
    return Math.round(computed.topPlaystyles.bowling[0].rating);
  }

  // Fallback to stored values
  if (player.topPlaystyles?.bowling?.[0]?.rating) {
    return Math.round(player.topPlaystyles.bowling[0].rating);
  }

  if (player.primaryPlaystyle?.bowling && player.playstyleRatings?.bowling) {
    const rating = player.playstyleRatings.bowling[player.primaryPlaystyle.bowling];
    if (rating !== undefined) return Math.round(rating);
  }

  // Last resort: Scale bowling_overall from 1-20 to 0-100
  if (player.attributes?.overall?.bowling_overall) {
    return Math.round(player.attributes.overall.bowling_overall * 5);
  }

  return 0;
}

/**
 * Get the primary fielding playstyle rating for a player
 * @param {Object} player - Player object
 * @returns {number} Rating value (0-100 scale), or 0 if not available
 */
export function getPrimaryFieldingRating(player) {
  if (!player) return 0;

  // Compute dynamically from attributes
  const computed = computePlayerRatings(player);
  if (computed?.topPlaystyles?.fielding?.[0]?.rating) {
    return Math.round(computed.topPlaystyles.fielding[0].rating);
  }

  // Fallback to stored values
  if (player.topPlaystyles?.fielding?.[0]?.rating) {
    return Math.round(player.topPlaystyles.fielding[0].rating);
  }

  if (player.primaryPlaystyle?.fielding && player.playstyleRatings?.fielding) {
    const rating = player.playstyleRatings.fielding[player.primaryPlaystyle.fielding];
    if (rating !== undefined) return Math.round(rating);
  }

  // Last resort: Calculate from keeping attributes
  const fielding = player.attributes?.fielding;
  if (fielding) {
    const keeping = fielding.keeping || 0;
    const collecting = fielding.collecting || 0;
    const stumping = fielding.stumping || 0;
    const reflexes = fielding.reflexes || 0;
    return Math.round(((keeping * 0.40 + collecting * 0.25 + stumping * 0.20 + reflexes * 0.15) / 20) * 100);
  }

  return 0;
}

/**
 * @deprecated Use getPrimaryFieldingRating instead
 */
export function getPrimaryWicketkeepingRating(player) {
  return getPrimaryFieldingRating(player);
}

/**
 * Get the most appropriate rating for a player based on their role
 * @param {Object} player - Player object
 * @returns {number} Rating value (0-100 scale)
 */
export function getPlayerRating(player) {
  if (!player) return 0;

  const role = player.role?.toLowerCase() || '';

  if (role === 'wicket-keeper') {
    return getPrimaryFieldingRating(player);
  }

  if (role === 'bowler') {
    return getPrimaryBowlingRating(player);
  }

  if (role === 'all-rounder') {
    const battingRating = getPrimaryBattingRating(player);
    const bowlingRating = getPrimaryBowlingRating(player);
    return Math.max(battingRating, bowlingRating);
  }

  return getPrimaryBattingRating(player);
}

/**
 * Get formatted rating string for display (e.g., "78" or "N/A")
 * @param {number} rating - Rating value
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted rating string
 */
export function formatRating(rating, decimals = 0) {
  if (rating === 0 || rating === null || rating === undefined) {
    return 'N/A';
  }
  return rating.toFixed(decimals);
}

/**
 * Get both batting and bowling ratings for a player
 * @param {Object} player - Player object
 * @returns {Object} Object with batting and bowling ratings
 */
export function getPlayerRatings(player) {
  return {
    batting: getPrimaryBattingRating(player),
    bowling: getPrimaryBowlingRating(player)
  };
}
