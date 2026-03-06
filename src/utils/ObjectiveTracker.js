/**
 * @file ObjectiveTracker.js
 * @description Helper functions to track objective progress after each match
 */

import LeaderboardsCalculator from '../core/league/LeaderboardsCalculator.js';

/**
 * Update objective tracking after a user team match
 * @param {Object} matchResult - Match result object
 * @param {Object} fixture - Match fixture details
 * @param {string} userTeamId - User's team ID
 * @param {Object} gameStore - Game store instance
 * @param {Object} leagueStore - League store instance
 * @param {Object} teamStore - Team store instance
 * @param {Object} playerStore - Player store instance (optional, for leaderboard names)
 */
export function updateObjectivesAfterMatch(matchResult, fixture, userTeamId, gameStore, leagueStore, teamStore, playerStore = null) {
  const { objectiveTracking } = gameStore.getState();
  const { standings } = leagueStore.getState();
  const userStanding = standings.find(s => s.clubId === userTeamId);

  if (!userStanding) {
    console.warn('User standing not found, skipping objective tracking');
    return;
  }

  const updates = {};

  // Determine if user team won
  const userTeamWon = matchResult.winner === userTeamId;

  // 1. Track home wins and home matches played
  const isHomeMatch = fixture.homeTeam === userTeamId;
  if (isHomeMatch) {
    updates.homeMatchesPlayed = (objectiveTracking.homeMatchesPlayed || 0) + 1;
    if (userTeamWon) {
      updates.homeWins = (objectiveTracking.homeWins || 0) + 1;
    }
  }

  // 2. Track first 3 matches wins
  const matchesPlayed = userStanding.played;
  if (matchesPlayed <= 3) {
    if (userTeamWon) {
      updates.winsInFirst3 = (objectiveTracking.winsInFirst3 || 0) + 1;
    }
  }

  // 3. Track win streaks
  if (userTeamWon) {
    const currentStreak = (objectiveTracking.currentWinStreak || 0) + 1;
    updates.currentWinStreak = currentStreak;
    updates.longestWinStreak = Math.max(objectiveTracking.longestWinStreak || 0, currentStreak);
  } else {
    updates.currentWinStreak = 0;
  }

  // 4. Track highest score
  const userBattedFirst = matchResult.innings1.battingTeam === userTeamId;
  const userScore = userBattedFirst ? matchResult.innings1.totalScore : matchResult.innings2.totalScore;
  updates.highestScore = Math.max(objectiveTracking.highestScore || 0, userScore);

  // 5. Track rival wins (need to check if this match was against rival)
  const { seasonObjectives } = gameStore.getState();
  const beatRivalObjective = seasonObjectives?.find(obj => obj.id === 'beat_rival');

  if (beatRivalObjective && beatRivalObjective.rivalTeamName) {
    const opponentTeamId = fixture.homeTeam === userTeamId ? fixture.awayTeam : fixture.homeTeam;
    const teams = teamStore.getState().teams;
    const opponentTeam = teams[opponentTeamId];

    if (opponentTeam && opponentTeam.name === beatRivalObjective.rivalTeamName) {
      updates.rivalMatchesPlayed = (objectiveTracking.rivalMatchesPlayed || 0) + 1;
      if (userTeamWon) {
        updates.rivalWins = (objectiveTracking.rivalWins || 0) + 1;
      }
    }
  }

  // 6. Track best batsman/bowler leaderboard positions
  try {
    const leaderboards = new LeaderboardsCalculator(teamStore, playerStore, leagueStore);

    // Best batsman
    const topScorers = leaderboards.getTopScorers(20);
    if (topScorers.length > 0) {
      updates.topScorerRuns = topScorers[0].runs;

      // Find the user's best-ranked batsman
      const userBatsmen = topScorers.filter(p => {
        // Check if the player belongs to the user's current squad
        const squadList = teamStore.getState().squadLists?.[userTeamId] || [];
        return squadList.some(s => s.id === p.playerId);
      });

      if (userBatsmen.length > 0) {
        const best = userBatsmen[0]; // already ranked, so first is best
        updates.userBestBatsmanRank = best.rank;
        updates.userBestBatsmanRuns = best.runs;
        updates.userBestBatsmanName = best.playerName;
      } else {
        updates.userBestBatsmanRank = null;
        updates.userBestBatsmanRuns = 0;
        updates.userBestBatsmanName = null;
      }
    }

    // Best bowler
    const topBowlers = leaderboards.getTopWicketTakers(20);
    if (topBowlers.length > 0) {
      updates.topBowlerWickets = topBowlers[0].wickets;

      const userBowlers = topBowlers.filter(p => {
        const squadList = teamStore.getState().squadLists?.[userTeamId] || [];
        return squadList.some(s => s.id === p.playerId);
      });

      if (userBowlers.length > 0) {
        const best = userBowlers[0];
        updates.userBestBowlerRank = best.rank;
        updates.userBestBowlerWickets = best.wickets;
        updates.userBestBowlerName = best.playerName;
      } else {
        updates.userBestBowlerRank = null;
        updates.userBestBowlerWickets = 0;
        updates.userBestBowlerName = null;
      }
    }
  } catch (err) {
    console.warn('Leaderboard tracking failed:', err);
  }

  // Apply updates
  gameStore.getState().updateObjectiveTracking(updates);

  // Now update objective progress with current game data
  const gameData = {
    userPosition: standings.findIndex(s => s.clubId === userTeamId) + 1,
    userStanding,
    played: userStanding.played,
    totalMatches: 18,
    stage: leagueStore.getState().stage,
    champion: leagueStore.getState().champion,
    userTeamId,
    ...gameStore.getState().objectiveTracking
  };

  gameStore.getState().updateObjectiveProgress(gameData);

  console.log('📊 Objectives updated after match:', updates);
}

/**
 * Update transfer-related objective tracking when a player sale/signing occurs
 * @param {Object} transferData - { type: 'sale'|'signing', playerId, price, soldPrice, nationality }
 * @param {string} userTeamId - User's team ID
 * @param {Object} gameStore - Game store instance
 * @param {Object} playerStore - Player store instance
 */
export function updateTransferObjectives(transferData, userTeamId, gameStore, playerStore) {
  const { objectiveTracking } = gameStore.getState();
  const updates = {};

  if (transferData.type === 'sale') {
    // sell_for_profit: sold for more than their original auction price
    const profit = (transferData.price || 0) - (transferData.soldPrice || 0);
    if (profit > 0) {
      updates.transferSellProfit = Math.max(objectiveTracking.transferSellProfit || 0, profit);
    }
  }

  if (transferData.type === 'signing') {
    // sign_from_region: check if player nationality matches target region
    const targetRegion = objectiveTracking.signedRegionTarget;
    if (targetRegion && !objectiveTracking.signedFromRegion) {
      const player = playerStore?.getState().getPlayer(transferData.playerId);
      const nationality = player?.nationality || transferData.nationality || '';
      if (REGION_NATIONALITIES[targetRegion]?.includes(nationality)) {
        updates.signedFromRegion = true;
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    gameStore.getState().updateObjectiveTracking(updates);
    // Re-run objective progress update
    const gameState = gameStore.getState();
    const leaderboardData = {
      ...gameState.objectiveTracking,
      ...updates
    };
    gameStore.getState().updateObjectiveProgress(leaderboardData);
    console.log('💰 Transfer objectives updated:', updates);
  }
}

// Region → nationality mapping (ISO codes used in player data)
export const REGION_NATIONALITIES = {
  AU: ['AUS'],
  ENG: ['ENG'],
  IND: ['IND'],
  SA: ['ZAF', 'RSA', 'SA'],
  WI: ['WI', 'JAM', 'TTO', 'BRB', 'GUY', 'LCA', 'VCT', 'ATG', 'KNA']
};

export const REGION_LABELS = {
  AU: 'Australian',
  ENG: 'English',
  IND: 'Indian',
  SA: 'South African',
  WI: 'West Indian'
};

export default {
  updateObjectivesAfterMatch,
  updateTransferObjectives,
  REGION_NATIONALITIES,
  REGION_LABELS
};
