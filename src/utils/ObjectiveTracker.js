/**
 * @file ObjectiveTracker.js
 * @description Helper functions to track objective progress after each match
 */

/**
 * Update objective tracking after a user team match
 * @param {Object} matchResult - Match result object
 * @param {Object} fixture - Match fixture details
 * @param {string} userTeamId - User's team ID
 * @param {Object} gameStore - Game store instance
 * @param {Object} leagueStore - League store instance
 * @param {Object} teamStore - Team store instance
 */
export function updateObjectivesAfterMatch(matchResult, fixture, userTeamId, gameStore, leagueStore, teamStore) {
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
  // Get rival team from objectives
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

export default {
  updateObjectivesAfterMatch
};
