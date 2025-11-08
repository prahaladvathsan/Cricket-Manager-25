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

    let winner, loser, margin, marginType;

    if (innings2.totalScore > innings1.totalScore) {
      winner = matchConfig.awayTeam;
      loser = matchConfig.homeTeam;
      margin = 10 - innings2.wickets; // Wickets remaining
      marginType = 'wickets';
    } else if (innings1.totalScore > innings2.totalScore) {
      winner = matchConfig.homeTeam;
      loser = matchConfig.awayTeam;
      margin = innings1.totalScore - innings2.totalScore; // Runs
      marginType = 'runs';
    } else {
      // Tie - for simplicity, use super over logic or just pick one
      winner = matchConfig.homeTeam;
      loser = matchConfig.awayTeam;
      margin = 0;
      marginType = 'tie';
    }

    // Get player of the match (top scorer or top wicket-taker)
    const topScorer = getTopScorer(state);
    const topBowler = getTopBowler(state);
    const playerOfMatch = topScorer.runs > topBowler.wickets * 20 ? topScorer : topBowler;

    return {
      matchId: matchConfig.id,
      winner,
      loser,
      winMargin: margin,
      winType: marginType,
      homeTeam: {
        ...matchConfig.homeTeam,
        score: innings1.totalScore,
        wickets: innings1.wickets,
        overs: `${innings1.overs}.${innings1.balls || 0}`
      },
      awayTeam: {
        ...matchConfig.awayTeam,
        score: innings2.totalScore,
        wickets: innings2.wickets,
        overs: `${innings2.overs}.${innings2.balls || 0}`
      },
      playerOfMatch: {
        name: playerOfMatch.name,
        performance: playerOfMatch.performance
      },
      topScorer: {
        name: topScorer.name,
        runs: topScorer.runs,
        balls: topScorer.balls
      },
      topBowler: {
        name: topBowler.name,
        wickets: topBowler.wickets,
        runs: topBowler.runs
      },
      innings1: innings1,
      innings2: innings2
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
