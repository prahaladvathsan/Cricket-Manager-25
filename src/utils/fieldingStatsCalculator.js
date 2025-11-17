/**
 * @file fieldingStatsCalculator.js
 * @description Utility functions to extract and calculate fielding statistics from ball-by-ball data
 *
 * Fielding stats tracked:
 * - Catches taken
 * - Dropped catches
 * - Run-outs effected
 * - Stumpings (for wicketkeepers)
 */

/**
 * Extract fielding statistics for all players from ball-by-ball data
 * @param {Array} ballByBall - Array of ball results with fielding data
 * @returns {Object} Object mapping player IDs to their fielding stats
 */
export function extractFieldingStats(ballByBall) {
  const fieldingStats = {};

  ballByBall.forEach(ball => {
    // Check if there's a fielder involved in this ball
    if (!ball.fielderId) return;

    const fielderId = ball.fielderId;

    // Initialize fielder stats if not exists
    if (!fieldingStats[fielderId]) {
      fieldingStats[fielderId] = {
        playerId: fielderId,
        playerName: ball.fielderName || 'Unknown',
        catches: 0,
        droppedCatches: 0,
        runOuts: 0,
        stumpings: 0,
        totalDismissals: 0
      };
    }

    // Track dismissals by type
    if (ball.isWicket && ball.dismissalType) {
      switch (ball.dismissalType) {
        case 'caught':
        case 'caught_behind':
          fieldingStats[fielderId].catches++;
          fieldingStats[fielderId].totalDismissals++;
          break;

        case 'run_out':
          fieldingStats[fielderId].runOuts++;
          fieldingStats[fielderId].totalDismissals++;
          break;

        case 'stumped':
          fieldingStats[fielderId].stumpings++;
          fieldingStats[fielderId].totalDismissals++;
          break;
      }
    }

    // Track dropped catches from fielding action metadata
    if (ball.fieldingAction) {
      if (ball.fieldingAction.type === 'catch' && ball.fieldingAction.success === false) {
        fieldingStats[fielderId].droppedCatches++;
      }
    }
  });

  return fieldingStats;
}

/**
 * Get fielding statistics for a specific player
 * @param {Array} ballByBall - Array of ball results with fielding data
 * @param {string} playerId - ID of the player
 * @returns {Object} Fielding stats for the player
 */
export function getPlayerFieldingStats(ballByBall, playerId) {
  const allStats = extractFieldingStats(ballByBall);
  return allStats[playerId] || {
    playerId,
    catches: 0,
    droppedCatches: 0,
    runOuts: 0,
    stumpings: 0,
    totalDismissals: 0
  };
}

/**
 * Get top fielders by a specific stat
 * @param {Array} ballByBall - Array of ball results with fielding data
 * @param {string} statType - Type of stat to rank by ('catches', 'runOuts', 'totalDismissals', etc.)
 * @param {number} limit - Maximum number of fielders to return (default: 5)
 * @returns {Array} Array of fielder stats sorted by the specified stat
 */
export function getTopFielders(ballByBall, statType = 'totalDismissals', limit = 5) {
  const allStats = extractFieldingStats(ballByBall);
  const statsArray = Object.values(allStats);

  return statsArray
    .filter(stat => stat[statType] > 0)
    .sort((a, b) => b[statType] - a[statType])
    .slice(0, limit);
}

/**
 * Calculate fielding statistics for a specific innings
 * @param {Array} ballByBall - Array of ball results with fielding data
 * @param {number} inningsNum - Innings number (1 or 2)
 * @returns {Object} Fielding stats for the innings
 */
export function getInningsFieldingStats(ballByBall, inningsNum) {
  const inningsBalls = ballByBall.filter(ball => ball.innings === inningsNum);
  return extractFieldingStats(inningsBalls);
}

/**
 * Get fielding summary for a match
 * @param {Array} ballByBall - Array of ball results with fielding data
 * @returns {Object} Summary of fielding stats
 */
export function getMatchFieldingSummary(ballByBall) {
  const allStats = extractFieldingStats(ballByBall);
  const statsArray = Object.values(allStats);

  return {
    totalCatches: statsArray.reduce((sum, stat) => sum + stat.catches, 0),
    totalDroppedCatches: statsArray.reduce((sum, stat) => sum + stat.droppedCatches, 0),
    totalRunOuts: statsArray.reduce((sum, stat) => sum + stat.runOuts, 0),
    totalStumpings: statsArray.reduce((sum, stat) => sum + stat.stumpings, 0),
    totalDismissals: statsArray.reduce((sum, stat) => sum + stat.totalDismissals, 0),
    topCatcher: statsArray.sort((a, b) => b.catches - a.catches)[0] || null,
    mostDismissals: statsArray.sort((a, b) => b.totalDismissals - a.totalDismissals)[0] || null
  };
}

/**
 * Calculate catch success rate for a player
 * @param {Object} playerFieldingStats - Fielding stats for a player
 * @returns {number} Catch success rate as percentage (0-100)
 */
export function calculateCatchSuccessRate(playerFieldingStats) {
  const totalAttempts = playerFieldingStats.catches + playerFieldingStats.droppedCatches;
  if (totalAttempts === 0) return 0;

  return Math.round((playerFieldingStats.catches / totalAttempts) * 100);
}

/**
 * Format fielding stats for display
 * @param {Object} fieldingStats - Fielding stats object
 * @returns {string} Formatted string for display
 */
export function formatFieldingStats(fieldingStats) {
  const parts = [];

  if (fieldingStats.catches > 0) {
    parts.push(`${fieldingStats.catches} catch${fieldingStats.catches !== 1 ? 'es' : ''}`);
  }

  if (fieldingStats.runOuts > 0) {
    parts.push(`${fieldingStats.runOuts} run-out${fieldingStats.runOuts !== 1 ? 's' : ''}`);
  }

  if (fieldingStats.stumpings > 0) {
    parts.push(`${fieldingStats.stumpings} stumping${fieldingStats.stumpings !== 1 ? 's' : ''}`);
  }

  if (fieldingStats.droppedCatches > 0) {
    parts.push(`${fieldingStats.droppedCatches} drop${fieldingStats.droppedCatches !== 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No dismissals';
}

export default {
  extractFieldingStats,
  getPlayerFieldingStats,
  getTopFielders,
  getInningsFieldingStats,
  getMatchFieldingSummary,
  calculateCatchSuccessRate,
  formatFieldingStats
};
