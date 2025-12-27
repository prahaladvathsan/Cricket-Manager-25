/**
 * @file MatchStatsUpdater.js
 * @description Browser-compatible utility for updating player and team stats after matches
 * Extracted from PostMatchProcessor.js without Node.js fs/path dependencies
 */

/**
 * Extract player stats from ball-by-ball data
 * @param {Array} ballByBall - Ball-by-ball records
 * @param {Object} matchConfig - Match configuration with team info
 * @returns {Object} Player stats by team and player ID
 */
export function extractPlayerStatsFromBalls(ballByBall, matchConfig) {
  const stats = {};

  // Get team IDs and squads
  const homeTeamId = matchConfig.homeTeam.id;
  const awayTeamId = matchConfig.awayTeam.id;
  const homeSquad = matchConfig.homeTeam.players || [];
  const awaySquad = matchConfig.awayTeam.players || [];

  // Create player-to-team mapping
  const playerTeamMap = {};

  // Handle both array of IDs (quick-sim) and array of objects (interactive)
  homeSquad.forEach(p => {
    const playerId = typeof p === 'string' ? p : p.id;
    if (playerId) {
      playerTeamMap[playerId] = homeTeamId;
    }
  });
  awaySquad.forEach(p => {
    const playerId = typeof p === 'string' ? p : p.id;
    if (playerId) {
      playerTeamMap[playerId] = awayTeamId;
    }
  });

  // Initialize tracking for dismissals
  const dismissals = new Set();

  ballByBall.forEach(ball => {
    if (!ball.isLegal) return; // Skip extras that aren't legal deliveries

    const batsmanId = ball.batsmanId || ball.batsman || ball.striker || ball.batter || ball.strikerId;
    const bowlerId = ball.bowlerId || ball.bowler;

    // Determine teams from innings number and player-team mapping
    const battingTeam = playerTeamMap[batsmanId];
    const bowlingTeam = playerTeamMap[bowlerId];

    if (!battingTeam || !bowlingTeam) {
      // Skip if we can't determine teams
      return;
    }

    // Initialize team stats if needed
    if (!stats[battingTeam]) stats[battingTeam] = {};
    if (!stats[bowlingTeam]) stats[bowlingTeam] = {};

    // Initialize batsman stats if needed
    if (!stats[battingTeam][batsmanId]) {
      stats[battingTeam][batsmanId] = {
        runs: 0,
        ballsFaced: 0,
        dismissed: false,
        wickets: 0,
        ballsBowled: 0,
        runsConceded: 0,
        catches: 0,
        runOuts: 0,
        battingImpact: 0,
        bowlingImpact: 0,
        fieldingImpact: 0
      };
    }

    // Initialize bowler stats if needed
    if (!stats[bowlingTeam][bowlerId]) {
      stats[bowlingTeam][bowlerId] = {
        runs: 0,
        ballsFaced: 0,
        dismissed: false,
        wickets: 0,
        ballsBowled: 0,
        runsConceded: 0,
        catches: 0,
        runOuts: 0,
        battingImpact: 0,
        bowlingImpact: 0,
        fieldingImpact: 0
      };
    }

    // Update batting stats
    const batsmanStats = stats[battingTeam][batsmanId];
    batsmanStats.ballsFaced += 1;
    batsmanStats.runs += (ball.runs || 0);

    // Track dismissal (only count once per player per match)
    // The striker/batsman is always the one dismissed when isWicket is true
    if (ball.isWicket) {
      const dismissalKey = `${battingTeam}-${batsmanId}`;
      if (!dismissals.has(dismissalKey)) {
        batsmanStats.dismissed = true;
        dismissals.add(dismissalKey);
      }
    }

    // Update bowling stats
    const bowlerStats = stats[bowlingTeam][bowlerId];
    bowlerStats.ballsBowled += 1;
    bowlerStats.runsConceded += (ball.runs || 0); // Total runs including extras

    if (ball.isWicket) {
      bowlerStats.wickets += 1;
    }

    // Aggregate impact stats from ball.impact (calculated by ImpactCalculator)
    if (ball.impact) {
      // Batting impact goes to striker
      batsmanStats.battingImpact += ball.impact.batting || 0;

      // Bowling impact goes to bowler
      bowlerStats.bowlingImpact += ball.impact.bowling || 0;

      // Fielding impact goes to fielder (if any)
      if (ball.impact.fielderId && ball.impact.fielding) {
        const fielderTeam = playerTeamMap[ball.impact.fielderId];
        if (fielderTeam) {
          if (!stats[fielderTeam]) stats[fielderTeam] = {};
          if (!stats[fielderTeam][ball.impact.fielderId]) {
            stats[fielderTeam][ball.impact.fielderId] = {
              runs: 0,
              ballsFaced: 0,
              dismissed: false,
              wickets: 0,
              ballsBowled: 0,
              runsConceded: 0,
              catches: 0,
              runOuts: 0,
              battingImpact: 0,
              bowlingImpact: 0,
              fieldingImpact: 0
            };
          }
          stats[fielderTeam][ball.impact.fielderId].fieldingImpact += ball.impact.fielding;
        }
      }
    }

    // Track catches and run-outs for fielding stats
    if (ball.isWicket && ball.fielderId) {
      const fielderId = ball.fielderId;
      const fielderTeam = playerTeamMap[fielderId];

      if (fielderTeam) {
        if (!stats[fielderTeam]) stats[fielderTeam] = {};
        if (!stats[fielderTeam][fielderId]) {
          stats[fielderTeam][fielderId] = {
            runs: 0,
            ballsFaced: 0,
            dismissed: false,
            wickets: 0,
            ballsBowled: 0,
            runsConceded: 0,
            catches: 0,
            runOuts: 0,
            battingImpact: 0,
            bowlingImpact: 0,
            fieldingImpact: 0
          };
        }

        const dismissalType = (ball.dismissalType || '').toLowerCase();

        // Track catches (caught, caught_behind, caught_and_bowled)
        if (dismissalType.includes('caught')) {
          stats[fielderTeam][fielderId].catches += 1;
        }

        // Track run-outs
        if (dismissalType === 'run_out' || dismissalType === 'runout') {
          stats[fielderTeam][fielderId].runOuts += 1;
        }
      }
    }
  });

  return stats;
}

/**
 * Update player stats in teamStore and playerStore
 * @param {Object} matchConfig - Match configuration
 * @param {Object} matchState - Match state with ball-by-ball data
 * @param {Object} teamStore - Zustand teamStore instance
 * @param {Object} playerStore - Zustand playerStore instance
 */
export function updatePlayerStats(matchConfig, matchState, teamStore, playerStore) {
  const { ballByBall } = matchState;
  const homeTeamId = matchConfig.homeTeam.id;
  const awayTeamId = matchConfig.awayTeam.id;

  // Extract player stats from ball-by-ball data
  const playerStats = extractPlayerStatsFromBalls(ballByBall, matchConfig);

  // Collect all stats updates first, then batch update
  const allTeamStats = {};
  const allCareerStats = {};

  // Update stats for both teams
  [homeTeamId, awayTeamId].forEach(teamId => {
    const teamPlayerStats = playerStats[teamId];

    if (!teamPlayerStats) {
      return;
    }

    Object.entries(teamPlayerStats).forEach(([playerId, stats]) => {
      // Collect team-specific stats
      if (!allTeamStats[teamId]) allTeamStats[teamId] = {};
      allTeamStats[teamId][playerId] = stats;

      // Collect career stats
      allCareerStats[playerId] = stats;
    });
  });

  // Batch update team stats (single setState per team)
  Object.entries(allTeamStats).forEach(([teamId, teamPlayerStats]) => {
    // Use batch update if available
    if (teamStore.getState().batchUpdatePlayerStats) {
      teamStore.getState().batchUpdatePlayerStats(teamId, teamPlayerStats);
    } else {
      // Fallback to individual updates
      Object.entries(teamPlayerStats).forEach(([playerId, stats]) => {
        teamStore.getState().updatePlayerStats(teamId, playerId, stats);
      });
    }
    // Recalculate team aggregate stats
    teamStore.getState().recalculateTeamStats(teamId);
  });

  // Batch update career stats using the new batch method if available
  if (playerStore.getState().batchUpdateCareerStats) {
    playerStore.getState().batchUpdateCareerStats(allCareerStats);
  } else {
    // Fallback to individual updates
    Object.entries(allCareerStats).forEach(([playerId, stats]) => {
      playerStore.getState().updateCareerStats(playerId, stats);
    });
  }
}

/**
 * Calculate Player of the Match
 * Uses DLS-based impact metrics for selection (batting + bowling + fielding impact)
 * Display shows traditional stats (runs, wickets, catches)
 * @param {Object} playerStats - Stats by team and player ID
 * @param {Object} matchConfig - Match configuration with player info
 * @returns {Object|null} Player of the match {id, name, reason}
 */
export function calculatePlayerOfMatch(playerStats, matchConfig) {
  let maxImpact = -Infinity;
  let playerOfMatch = null;

  // Get all players from both teams
  const allPlayers = [
    ...(matchConfig.homeTeam.players || []),
    ...(matchConfig.awayTeam.players || [])
  ];

  // Create player lookup
  const playerLookup = {};
  allPlayers.forEach(p => playerLookup[p.id] = p);

  Object.entries(playerStats).forEach(([teamId, teamPlayers]) => {
    Object.entries(teamPlayers).forEach(([playerId, stats]) => {
      // Use DLS-based impact for selection
      const totalImpact = (stats.battingImpact || 0) +
                          (stats.bowlingImpact || 0) +
                          (stats.fieldingImpact || 0);

      if (totalImpact > maxImpact) {
        maxImpact = totalImpact;
        const player = playerLookup[playerId];

        // Return traditional stats for display (not impact numbers)
        playerOfMatch = {
          id: playerId,
          name: player?.name || 'Unknown',
          runs: stats.runs,
          ballsFaced: stats.ballsFaced,
          wickets: stats.wickets,
          ballsBowled: stats.ballsBowled,
          runsConceded: stats.runsConceded,
          catches: stats.catches || 0,
          reason: getReason(stats)
        };
      }
    });
  });

  return playerOfMatch;
}

/**
 * Get reason for Player of the Match award
 * @param {Object} stats - Player stats
 * @returns {string} Reason string
 */
function getReason(stats) {
  const parts = [];

  if (stats.runs > 0) {
    parts.push(`${stats.runs} runs`);
  }

  if (stats.wickets > 0) {
    parts.push(`${stats.wickets} wicket${stats.wickets > 1 ? 's' : ''}`);
  }

  return parts.join(' & ') || 'Match performance';
}

/**
 * Find top scorer from player stats
 * @param {Object} playerStats - Stats by team and player ID
 * @param {Object} matchConfig - Match configuration with player info
 * @returns {Object|null} Top scorer {name, runs, balls}
 */
export function findTopScorer(playerStats, matchConfig) {
  let topScorer = null;
  let maxRuns = 0;

  const allPlayers = [
    ...(matchConfig.homeTeam.players || []),
    ...(matchConfig.awayTeam.players || [])
  ];

  const playerLookup = {};
  allPlayers.forEach(p => playerLookup[p.id] = p);

  Object.entries(playerStats).forEach(([teamId, teamPlayers]) => {
    Object.entries(teamPlayers).forEach(([playerId, stats]) => {
      if (stats.runs > maxRuns) {
        maxRuns = stats.runs;
        const player = playerLookup[playerId];
        topScorer = {
          name: player?.name || 'Unknown',
          runs: stats.runs,
          balls: stats.ballsFaced
        };
      }
    });
  });

  return topScorer;
}

/**
 * Find top bowler from player stats
 * @param {Object} playerStats - Stats by team and player ID
 * @param {Object} matchConfig - Match configuration with player info
 * @returns {Object|null} Top bowler {name, wickets, runs}
 */
export function findTopBowler(playerStats, matchConfig) {
  let topBowler = null;
  let maxWickets = 0;
  let minRuns = Infinity;

  const allPlayers = [
    ...(matchConfig.homeTeam.players || []),
    ...(matchConfig.awayTeam.players || [])
  ];

  const playerLookup = {};
  allPlayers.forEach(p => playerLookup[p.id] = p);

  Object.entries(playerStats).forEach(([teamId, teamPlayers]) => {
    Object.entries(teamPlayers).forEach(([playerId, stats]) => {
      // Prioritize wickets, then runs conceded
      if (stats.wickets > maxWickets ||
          (stats.wickets === maxWickets && stats.runsConceded < minRuns)) {
        maxWickets = stats.wickets;
        minRuns = stats.runsConceded;
        const player = playerLookup[playerId];
        topBowler = {
          name: player?.name || 'Unknown',
          wickets: stats.wickets,
          runs: stats.runsConceded
        };
      }
    });
  });

  return topBowler;
}
