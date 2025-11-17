/**
 * Rating Helper Utility
 * Provides consistent access to player ratings throughout the application
 * Replaces the non-existent player.rating field with primary playstyle ratings
 */

/**
 * Get the primary batting playstyle rating for a player
 * @param {Object} player - Player object
 * @returns {number} Rating value (0-100 scale), or 0 if not available
 */
export function getPrimaryBattingRating(player) {
  if (!player) return 0;

  // Try to get from topPlaystyles first (most reliable)
  if (player.topPlaystyles?.batting?.[0]?.rating) {
    return player.topPlaystyles.batting[0].rating;
  }

  // Fallback: Try to get from playstyleRatings using primaryPlaystyle
  if (player.primaryPlaystyle?.batting && player.playstyleRatings?.batting) {
    const rating = player.playstyleRatings.batting[player.primaryPlaystyle.batting];
    if (rating !== undefined) return rating;
  }

  // Last resort: Scale batting_overall from 1-20 to 0-100
  if (player.attributes?.overall?.batting_overall) {
    return player.attributes.overall.batting_overall * 5;
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

  // Try to get from topPlaystyles first (most reliable)
  if (player.topPlaystyles?.bowling?.[0]?.rating) {
    return player.topPlaystyles.bowling[0].rating;
  }

  // Fallback: Try to get from playstyleRatings using primaryPlaystyle
  if (player.primaryPlaystyle?.bowling && player.playstyleRatings?.bowling) {
    const rating = player.playstyleRatings.bowling[player.primaryPlaystyle.bowling];
    if (rating !== undefined) return rating;
  }

  // Last resort: Scale bowling_overall from 1-20 to 0-100
  if (player.attributes?.overall?.bowling_overall) {
    return player.attributes.overall.bowling_overall * 5;
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

  // Try to get from topPlaystyles first (most reliable)
  if (player.topPlaystyles?.fielding?.[0]?.rating) {
    return player.topPlaystyles.fielding[0].rating;
  }

  // Fallback: Try to get from playstyleRatings using primaryPlaystyle
  if (player.primaryPlaystyle?.fielding && player.playstyleRatings?.fielding) {
    const rating = player.playstyleRatings.fielding[player.primaryPlaystyle.fielding];
    if (rating !== undefined) return rating;
  }

  // Last resort: Calculate from keeping attributes (keeping=40%, collecting=25%, stumping=20%, reflexes=15%)
  const fielding = player.attributes?.fielding;
  if (fielding) {
    const keeping = fielding.keeping || 0;
    const collecting = fielding.collecting || 0;
    const stumping = fielding.stumping || 0;
    const reflexes = fielding.reflexes || 0;

    // Weighted average, scaled to 0-100
    return ((keeping * 0.40 + collecting * 0.25 + stumping * 0.20 + reflexes * 0.15) / 20) * 100;
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

  // For wicket-keepers, use fielding rating
  if (role === 'wicket-keeper') {
    return getPrimaryFieldingRating(player);
  }

  // For bowlers, prioritize bowling rating
  if (role === 'bowler') {
    return getPrimaryBowlingRating(player);
  }

  // For all-rounders, return the higher of the two
  if (role === 'all-rounder') {
    const battingRating = getPrimaryBattingRating(player);
    const bowlingRating = getPrimaryBowlingRating(player);
    return Math.max(battingRating, bowlingRating);
  }

  // For batsmen and others, use batting rating
  return getPrimaryBattingRating(player);
}

/**
 * Get formatted rating string for display (e.g., "78.5" or "N/A")
 * @param {number} rating - Rating value
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted rating string
 */
export function formatRating(rating, decimals = 1) {
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
