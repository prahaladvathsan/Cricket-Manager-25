/**
 * @file QuickSimMatch.js
 * @description Utility function to quickly simulate AI vs AI matches in the background
 * @module core/match-engine/utils/QuickSimMatch
 */

import MatchEngine from '../core/MatchEngine.js';
import { updatePlayerStats } from '../../../utils/MatchStatsUpdater.js';

/**
 * Auto-fix injured players in a team's lineup before match
 * Replaces injured players with uninjured players from the squad
 * @param {string} teamId - Team ID
 * @param {Object} teamStore - Team store
 * @param {Object} playerStore - Player store
 * @returns {Object} {squad: Array, hadInjuries: boolean}
 */
function autoFixInjuredPlayersInLineup(teamId, teamStore, playerStore) {
  const tactics = teamStore.getState().getTeamTactics(teamId);
  if (!tactics || !tactics.squadSelection) {
    return { squad: tactics?.squadSelection || [], hadInjuries: false };
  }

  const players = playerStore.getState().players;
  const teamPlayers = Object.values(players).filter(p => p.currentTeam === teamId);

  // Find injured players in current squad selection
  const injuredInSquad = tactics.squadSelection.filter(playerId => {
    const player = players[playerId];
    return player && player.condition?.injury;
  });

  if (injuredInSquad.length === 0) {
    console.log(`✓ No injured players in ${teamStore.getState().teams[teamId]?.name || teamId} lineup`);
    return { squad: tactics.squadSelection, hadInjuries: false };
  }

  console.log(`🏥 Auto-fixing ${injuredInSquad.length} injured player(s) in ${teamStore.getState().teams[teamId]?.name || teamId} lineup`);

  // Find available uninjured players (not in squad, not injured)
  const availablePlayers = teamPlayers.filter(p =>
    !tactics.squadSelection.includes(p.id) &&
    !p.condition?.injury
  );

  // Replace each injured player with an available player of similar role
  const newSquadSelection = [...tactics.squadSelection];
  injuredInSquad.forEach(injuredId => {
    const injuredPlayer = players[injuredId];
    if (!injuredPlayer) return;

    // Try to find replacement of same role
    let replacement = availablePlayers.find(p =>
      p.role === injuredPlayer.role &&
      !newSquadSelection.includes(p.id)
    );

    // If no same-role replacement, take any available player
    if (!replacement) {
      replacement = availablePlayers.find(p => !newSquadSelection.includes(p.id));
    }

    if (replacement) {
      // Replace injured player with replacement
      const injuredIndex = newSquadSelection.indexOf(injuredId);
      newSquadSelection[injuredIndex] = replacement.id;
      console.log(`  ↳ Replaced ${injuredPlayer.name} (${injuredPlayer.role}, injured) with ${replacement.name} (${replacement.role})`);
    } else {
      console.warn(`  ⚠️ No replacement found for ${injuredPlayer.name} - keeping injured player`);
    }
  });

  // Update team tactics with new squad selection
  teamStore.getState().updateSquadSelection(teamId, newSquadSelection);

  // Also need to update batting order to remove/replace injured players
  if (tactics.battingOrder) {
    const newBattingOrder = tactics.battingOrder
      .map(playerId => {
        if (injuredInSquad.includes(playerId)) {
          // Find replacement in new squad
          const injuredIndex = tactics.squadSelection.indexOf(playerId);
          return newSquadSelection[injuredIndex];
        }
        return playerId;
      })
      .filter(Boolean);

    teamStore.getState().updateBattingOrder(teamId, newBattingOrder);
  }

  // CRITICAL: Clear bowling rotation to force MatchEngine to auto-generate a new one
  // This is safer than trying to patch it, because there might be other players in the rotation
  // who aren't in the updated squad
  if (injuredInSquad.length > 0) {
    console.log(`  ↳ Clearing bowling rotation to force auto-generation with updated squad`);
    teamStore.getState().updateBowlingRotation(teamId, null);
  }

  console.log(`  ✓ Final squad (${newSquadSelection.length} players):`, newSquadSelection.map(id => players[id]?.name).join(', '));

  return { squad: newSquadSelection, hadInjuries: true };
}

/**
 * Quick-simulate an AI vs AI match and return the result
 * @param {Object} matchConfig - Match configuration
 * @param {Object} matchStore - Match store (Zustand store)
 * @param {Object} playerStore - Player store (Zustand store)
 * @param {Object} teamStore - Team store (Zustand store)
 * @param {Object} leagueStore - League store (Zustand store) for seasonId
 * @returns {Promise<Object>} Match result with winner, margin, etc.
 */
export async function quickSimMatch(matchConfig, matchStore, playerStore, teamStore, leagueStore = null) {
  try {
    // Set season ID for career stats tracking (CRITICAL for stats to be saved)
    if (leagueStore) {
      const currentSeasonId = leagueStore.getState().seasonId;
      if (currentSeasonId) {
        playerStore.getState().setCurrentSeasonId(currentSeasonId);
      }
    }

    // CRITICAL: Auto-fix injured players in both teams' lineups before match starts
    const homeResult = autoFixInjuredPlayersInLineup(matchConfig.homeTeam.id, teamStore, playerStore);
    const awayResult = autoFixInjuredPlayersInLineup(matchConfig.awayTeam.id, teamStore, playerStore);

    // ONLY update matchConfig if there were actual injuries fixed
    // Otherwise leave matchConfig untouched to avoid breaking matches
    if (homeResult.hadInjuries || awayResult.hadInjuries) {
      console.log('🔄 Updating matchConfig with corrected playing XIs after injury fixes');

      // CRITICAL: matchConfig expects arrays of player IDs (strings), NOT player objects!
      // This matches how SimulationEngine constructs matchConfig
      matchConfig = {
        ...matchConfig,
        homeTeam: {
          ...matchConfig.homeTeam,
          playingXI: homeResult.squad,  // Array of player IDs
          players: homeResult.squad     // Array of player IDs
        },
        awayTeam: {
          ...matchConfig.awayTeam,
          playingXI: awayResult.squad,  // Array of player IDs
          players: awayResult.squad     // Array of player IDs
        }
      };
    }

    // Create match engine with silent mode
    const engine = new MatchEngine(matchStore, playerStore, teamStore, { silent: true });

    // Configure for instant simulation
    engine.config.interactiveMode = false;
    engine.config.showBallByBall = false;
    engine.config.simulationSpeed = 'instant';

    // Initialize match
    matchStore.getState().initializeMatch(matchConfig);

    // Run the match
    await engine.startMatch(matchConfig);

    // Get match state to extract result
    const state = matchStore.getState();
    const { results, teams, ballByBall } = state;

    // Update player and team stats (CRITICAL: must be called to update career stats)
    updatePlayerStats(matchConfig, { ballByBall }, teamStore, playerStore);

    // Extract innings data from results array
    // results[0] = first innings, results[1] = second innings
    if (!results || results.length < 2) {
      throw new Error('Match simulation incomplete - missing innings data');
    }

    const innings1 = results[0];
    const innings2 = results[1];

    // Extract batting and bowling stats from ballByBall data - SEPARATELY for each innings
    const innings1TopBatsmen = extractBattingStats(ballByBall || [], 1, playerStore);
    const innings1TopBowlers = extractBowlingStats(ballByBall || [], 1, playerStore);
    const innings2TopBatsmen = extractBattingStats(ballByBall || [], 2, playerStore);
    const innings2TopBowlers = extractBowlingStats(ballByBall || [], 2, playerStore);

    let winnerId, loserId, margin, marginType;

    // Determine winner based on second innings result
    if (innings2.totalScore > innings1.totalScore) {
      // Team batting second won (chasing team)
      winnerId = innings2.battingTeam;
      loserId = innings1.battingTeam;
      margin = 10 - innings2.wickets; // Wickets remaining
      marginType = 'wickets';
    } else if (innings1.totalScore > innings2.totalScore) {
      // Team batting first won (defending team)
      winnerId = innings1.battingTeam;
      loserId = innings2.battingTeam;
      margin = innings1.totalScore - innings2.totalScore; // Runs
      marginType = 'runs';
    } else {
      // Tie - award to team batting first
      winnerId = innings1.battingTeam;
      loserId = innings2.battingTeam;
      margin = 0;
      marginType = 'tie';
    }

    // Get player of the match from BOTH innings (top scorer or top wicket-taker)
    const allBatsmen = [...innings1TopBatsmen, ...innings2TopBatsmen];
    const allBowlers = [...innings1TopBowlers, ...innings2TopBowlers];

    const topScorer = allBatsmen.length > 0
      ? allBatsmen.reduce((max, b) => b.runs > max.runs ? b : max, allBatsmen[0])
      : null;

    const topBowler = allBowlers.length > 0
      ? allBowlers.reduce((max, b) => {
          if (b.wickets > max.wickets) return b;
          if (b.wickets === max.wickets && parseFloat(b.economy) < parseFloat(max.economy)) return b;
          return max;
        }, allBowlers[0])
      : null;

    // Determine player of match (prefer batting if both are equal)
    let playerOfMatch;
    if (!topScorer && !topBowler) {
      playerOfMatch = { id: 'unknown', name: 'Unknown', performance: 'N/A' };
    } else if (!topBowler) {
      playerOfMatch = topScorer;
    } else if (!topScorer) {
      playerOfMatch = topBowler;
    } else {
      // Both exist - choose based on impact (runs vs wickets * 20)
      playerOfMatch = topScorer.runs > topBowler.wickets * 20 ? topScorer : topBowler;
    }

    // Build comprehensive performance string for player of match
    // Check if player has BOTH batting and bowling stats
    const playerBattingStats = allBatsmen.find(b => b.id === playerOfMatch.id);
    const playerBowlingStats = allBowlers.find(b => b.id === playerOfMatch.id);

    let performanceText;
    if (playerBattingStats && playerBowlingStats) {
      // All-rounder performance: "45 (32) & 2-18 (4.0)"
      performanceText = `${playerBattingStats.runs} (${playerBattingStats.balls}) & ${playerBowlingStats.wickets}-${playerBowlingStats.runs} (${playerBowlingStats.overs})`;
    } else if (playerBattingStats) {
      // Batting only: "45 (32)"
      performanceText = `${playerBattingStats.runs} (${playerBattingStats.balls})`;
    } else if (playerBowlingStats) {
      // Bowling only: "2-18 (4.0)"
      performanceText = `${playerBowlingStats.wickets}-${playerBowlingStats.runs} (${playerBowlingStats.overs})`;
    } else {
      performanceText = 'N/A';
    }

    // Format margin text
    let marginText = '';
    if (marginType === 'wickets') {
      marginText = `by ${margin} wicket${margin !== 1 ? 's' : ''}`;
    } else if (marginType === 'runs') {
      marginText = `by ${margin} run${margin !== 1 ? 's' : ''}`;
    } else {
      marginText = 'Match Tied';
    }

    return {
      matchId: matchConfig.id || matchConfig.matchId,
      homeTeam: matchConfig.homeTeam.id, // Return ID, not full object
      awayTeam: matchConfig.awayTeam.id, // Return ID, not full object
      winner: winnerId,
      loser: loserId,
      margin: marginText,
      winMargin: margin,
      winType: marginType,
      innings1: {
        battingTeam: innings1.battingTeam,
        bowlingTeam: innings1.bowlingTeam,
        totalScore: innings1.totalScore,
        wickets: innings1.wickets,
        overs: innings1.overs,
        balls: innings1.balls,
        extras: innings1.extras,
        fallOfWickets: innings1.fallOfWickets,
        topBatsmen: innings1TopBatsmen,
        topBowlers: innings1TopBowlers
      },
      innings2: {
        battingTeam: innings2.battingTeam,
        bowlingTeam: innings2.bowlingTeam,
        totalScore: innings2.totalScore,
        wickets: innings2.wickets,
        overs: innings2.overs,
        balls: innings2.balls,
        extras: innings2.extras,
        fallOfWickets: innings2.fallOfWickets,
        topBatsmen: innings2TopBatsmen,
        topBowlers: innings2TopBowlers
      },
      playerOfMatch: {
        id: playerOfMatch.id || 'unknown',
        name: playerOfMatch.name || 'Unknown',
        performance: performanceText
      }
    };
  } catch (error) {
    console.error('Error quick-simulating match:', error);
    throw error;
  }
}

/**
 * Extract batting stats from ball-by-ball data for a specific innings
 * @param {Array} ballByBall - Ball-by-ball record
 * @param {number} inningsNumber - Innings number (1 or 2)
 * @param {Object} playerStore - Player store for names
 * @returns {Array} Array of batsmen with stats
 */
function extractBattingStats(ballByBall, inningsNumber, playerStore) {
  const batsmenStats = {};

  ballByBall.forEach(ball => {
    // Only process balls from the specified innings
    if (ball.innings !== inningsNumber) return;

    const batsmanId = ball.striker;
    if (!batsmanId) return;

    if (!batsmenStats[batsmanId]) {
      batsmenStats[batsmanId] = {
        id: batsmanId,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dots: 0
      };
    }

    const stats = batsmenStats[batsmanId];

    if (ball.isLegal) {
      stats.balls++;
      // On legal deliveries, ball.runs is the batsman's runs
      const runsScored = ball.runs || 0;
      stats.runs += runsScored;

      if (runsScored === 0) stats.dots++;
      if (runsScored === 4) stats.fours++;
      if (runsScored === 6) stats.sixes++;
    }
  });

  // Convert to array and add player names
  const getPlayer = playerStore.getState().getPlayer;
  return Object.values(batsmenStats)
    .map(stats => {
      const player = getPlayer(stats.id);
      return {
        ...stats,
        name: player?.name || 'Unknown',
        strikeRate: stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0'
      };
    })
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 4); // Top 4 batsmen
}

/**
 * Extract bowling stats from ball-by-ball data for a specific innings
 * @param {Array} ballByBall - Ball-by-ball record
 * @param {number} inningsNumber - Innings number (1 or 2)
 * @param {Object} playerStore - Player store for names
 * @returns {Array} Array of bowlers with stats
 */
function extractBowlingStats(ballByBall, inningsNumber, playerStore) {
  const bowlerStats = {};

  ballByBall.forEach(ball => {
    // Only process balls from the specified innings
    if (ball.innings !== inningsNumber) return;

    const bowlerId = ball.bowlerId;
    if (!bowlerId) return;

    if (!bowlerStats[bowlerId]) {
      bowlerStats[bowlerId] = {
        id: bowlerId,
        wickets: 0,
        runs: 0,
        balls: 0,
        dots: 0,
        maidens: 0
      };
    }

    const stats = bowlerStats[bowlerId];

    // Bowlers are charged for all runs (including extras like wides/no-balls)
    stats.runs += ball.runs || 0;

    if (ball.isLegal) {
      stats.balls++;
      if (ball.runs === 0) stats.dots++;
      if (ball.isWicket) stats.wickets++;
    }
    // Note: Illegal deliveries (wides, no-balls) don't count as balls bowled
    // but the runs are still charged to the bowler
  });

  // Convert to array and add player names
  const getPlayer = playerStore.getState().getPlayer;
  return Object.values(bowlerStats)
    .map(stats => {
      const player = getPlayer(stats.id);
      const overs = Math.floor(stats.balls / 6) + (stats.balls % 6) / 10;
      const economy = overs > 0 ? (stats.runs / overs).toFixed(2) : '0.00';

      return {
        ...stats,
        name: player?.name || 'Unknown',
        overs: overs.toFixed(1),
        economy
      };
    })
    .sort((a, b) => {
      // Sort by wickets (desc), then by economy (asc)
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return parseFloat(a.economy) - parseFloat(b.economy);
    })
    .slice(0, 4); // Top 4 bowlers
}

export default quickSimMatch;
