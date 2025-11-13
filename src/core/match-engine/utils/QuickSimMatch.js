/**
 * @file QuickSimMatch.js
 * @description Utility function to quickly simulate AI vs AI matches in the background
 * @module core/match-engine/utils/QuickSimMatch
 */

import MatchEngine from '../core/MatchEngine.js';

/**
 * Quick-simulate an AI vs AI match and return the result
 * @param {Object} matchConfig - Match configuration
 * @param {Object} matchStore - Match store (Zustand store)
 * @param {Object} playerStore - Player store (Zustand store)
 * @param {Object} teamStore - Team store (Zustand store)
 * @returns {Promise<Object>} Match result with winner, margin, etc.
 */
export async function quickSimMatch(matchConfig, matchStore, playerStore, teamStore) {
  try {
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
    const { innings, teams } = state;

    // Determine winner
    const innings1 = state.results?.[0] || innings;
    const innings2 = state.results?.[1] || innings;

    let winnerId, loserId, margin, marginType;

    if (innings2.totalScore > innings1.totalScore) {
      winnerId = matchConfig.awayTeam.id;
      loserId = matchConfig.homeTeam.id;
      margin = 10 - innings2.wickets; // Wickets remaining
      marginType = 'wickets';
    } else if (innings1.totalScore > innings2.totalScore) {
      winnerId = matchConfig.homeTeam.id;
      loserId = matchConfig.awayTeam.id;
      margin = innings1.totalScore - innings2.totalScore; // Runs
      marginType = 'runs';
    } else {
      // Tie - for simplicity, use super over logic or just pick one
      winnerId = matchConfig.homeTeam.id;
      loserId = matchConfig.awayTeam.id;
      margin = 0;
      marginType = 'tie';
    }

    // Get player of the match (top scorer or top wicket-taker)
    const topScorer = getTopScorer(state);
    const topBowler = getTopBowler(state);
    const playerOfMatch = topScorer.runs > topBowler.wickets * 20 ? topScorer : topBowler;

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
      matchId: matchConfig.id,
      homeTeam: matchConfig.homeTeam,
      awayTeam: matchConfig.awayTeam,
      winner: winnerId,
      loser: loserId,
      margin: marginText,
      winMargin: margin,
      winType: marginType,
      innings1: {
        ...innings1,
        topScorer: topScorer,
        topBowler: topBowler
      },
      innings2: {
        ...innings2,
        topScorer: topScorer,
        topBowler: topBowler
      },
      playerOfMatch: {
        name: playerOfMatch.name,
        performance: playerOfMatch.performance
      }
    };
  } catch (error) {
    console.error('Error quick-simulating match:', error);
    throw error;
  }
}

/**
 * Get top scorer from match
 * @param {Object} state - Match state
 * @returns {Object} Top scorer details
 */
function getTopScorer(state) {
  const battingStats = state.innings?.battingScorecard || [];

  if (battingStats.length === 0) {
    return { name: 'Unknown', runs: 0, balls: 0, performance: '0 (0)' };
  }

  const topScorer = battingStats.reduce((max, batsman) =>
    batsman.runs > max.runs ? batsman : max, battingStats[0]);

  return {
    name: topScorer.name,
    runs: topScorer.runs,
    balls: topScorer.balls,
    performance: `${topScorer.runs} (${topScorer.balls})`
  };
}

/**
 * Get top bowler from match
 * @param {Object} state - Match state
 * @returns {Object} Top bowler details
 */
function getTopBowler(state) {
  const bowlingStats = Object.values(state.innings?.bowlingFigures || {});

  if (bowlingStats.length === 0) {
    return { name: 'Unknown', wickets: 0, runs: 0, performance: '0/0' };
  }

  const topBowler = bowlingStats.reduce((max, bowler) => {
    if (bowler.wickets > max.wickets) return bowler;
    if (bowler.wickets === max.wickets && bowler.runsConceded < max.runsConceded) return bowler;
    return max;
  }, bowlingStats[0]);

  return {
    name: topBowler.name,
    wickets: topBowler.wickets,
    runs: topBowler.runsConceded,
    performance: `${topBowler.wickets}/${topBowler.runsConceded}`
  };
}

export default quickSimMatch;
