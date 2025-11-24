/**
 * @file StandingsCalculator.js
 * @description Calculates and updates league standings with points and Net Run Rate (NRR)
 * Points system: 2 points for win, 1 for tie/no result, 0 for loss
 * NRR = (Total runs scored / Total overs faced) - (Total runs conceded / Total overs bowled)
 */

class StandingsCalculator {
  /**
   * Update standings after a match result
   * @param {Array} currentStandings - Current standings
   * @param {Object} matchResult - Match result object
   * @returns {Array} Updated standings
   */
  updateStandings(currentStandings, matchResult) {
    const updatedStandings = currentStandings.map(standing => ({ ...standing }));

    // Get team standings
    const homeStanding = updatedStandings.find(s => s.clubId === matchResult.homeTeam);
    const awayStanding = updatedStandings.find(s => s.clubId === matchResult.awayTeam);

    if (!homeStanding || !awayStanding) {
      console.warn('Team not found in standings:', matchResult.homeTeam, matchResult.awayTeam);
      return currentStandings;
    }

    // Update match counts
    homeStanding.played += 1;
    awayStanding.played += 1;

    // Update runs and balls
    this.updateRunsAndBalls(homeStanding, matchResult.innings1, matchResult.innings2);
    this.updateRunsAndBalls(awayStanding, matchResult.innings2, matchResult.innings1);

    // Update points and win/loss records
    if (matchResult.result === 'tie') {
      homeStanding.tied += 1;
      awayStanding.tied += 1;
      homeStanding.points += 1;
      awayStanding.points += 1;
    } else if (matchResult.result === 'no_result') {
      homeStanding.noResult += 1;
      awayStanding.noResult += 1;
      homeStanding.points += 1;
      awayStanding.points += 1;
    } else {
      // Determine winner
      const winner = matchResult.winner;

      if (winner === homeStanding.clubId) {
        homeStanding.won += 1;
        homeStanding.points += 2;
        awayStanding.lost += 1;
      } else {
        awayStanding.won += 1;
        awayStanding.points += 2;
        homeStanding.lost += 1;
      }
    }

    // Recalculate NRR for both teams
    homeStanding.netRunRate = this.calculateNRR(homeStanding);
    awayStanding.netRunRate = this.calculateNRR(awayStanding);

    // Sort standings by points, then NRR
    return this.sortStandings(updatedStandings);
  }

  /**
   * Update runs scored/conceded and balls faced/bowled for a team
   * @param {Object} standing - Team standing object
   * @param {Object} battingInnings - Innings where team batted
   * @param {Object} bowlingInnings - Innings where team bowled
   */
  updateRunsAndBalls(standing, battingInnings, bowlingInnings) {
    // Runs scored and balls faced (when batting)
    standing.runsScored += battingInnings.totalScore;

    // CRITICAL NRR RULE: If team was all out (10 wickets), use full quota (120 balls for T20)
    // This prevents teams that get bowled out from having artificially inflated run rates
    const battingBalls = battingInnings.wickets === 10 ? 120 : battingInnings.ballsBowled;
    standing.ballsFaced += battingBalls;

    // Runs conceded and balls bowled (when bowling)
    standing.runsConceded += bowlingInnings.totalScore;

    // CRITICAL NRR RULE: If opponent was all out, use full quota (120 balls for T20)
    const bowlingBalls = bowlingInnings.wickets === 10 ? 120 : bowlingInnings.ballsBowled;
    standing.ballsBowled += bowlingBalls;
  }

  /**
   * Calculate Net Run Rate (NRR) for a team
   * NRR = (Runs scored per over) - (Runs conceded per over)
   * @param {Object} standing - Team standing object
   * @returns {number} Net Run Rate
   */
  calculateNRR(standing) {
    if (standing.ballsFaced === 0 || standing.ballsBowled === 0) {
      return 0.0;
    }

    // Convert balls to overs (6 balls = 1 over)
    const oversFaced = standing.ballsFaced / 6;
    const oversBowled = standing.ballsBowled / 6;

    // Runs per over
    const runsPerOverScored = standing.runsScored / oversFaced;
    const runsPerOverConceded = standing.runsConceded / oversBowled;

    return parseFloat((runsPerOverScored - runsPerOverConceded).toFixed(3));
  }

  /**
   * Sort standings by points (descending), then NRR (descending)
   * @param {Array} standings - Standings to sort
   * @returns {Array} Sorted standings
   */
  sortStandings(standings) {
    return standings.sort((a, b) => {
      // First by points
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // Then by NRR
      if (b.netRunRate !== a.netRunRate) {
        return b.netRunRate - a.netRunRate;
      }
      // Then by wins (if still tied)
      if (b.won !== a.won) {
        return b.won - a.won;
      }
      // Finally alphabetically by name
      return a.clubName.localeCompare(b.clubName);
    });
  }

  /**
   * Get standings table for display
   * @param {Array} standings - Current standings
   * @param {number} limit - Number of teams to display (default all)
   * @returns {Array} Formatted standings for display
   */
  getStandingsTable(standings, limit = null) {
    const sorted = this.sortStandings([...standings]);
    const displayStandings = limit ? sorted.slice(0, limit) : sorted;

    return displayStandings.map((standing, index) => ({
      position: index + 1,
      team: standing.clubName,
      played: standing.played,
      won: standing.won,
      lost: standing.lost,
      tied: standing.tied,
      noResult: standing.noResult,
      points: standing.points,
      nrr: standing.netRunRate.toFixed(3)
    }));
  }

  /**
   * Format standings table as string for console output
   * @param {Array} standings - Current standings
   * @returns {string} Formatted table string
   */
  formatStandingsTable(standings) {
    const sorted = this.sortStandings([...standings]);

    let table = '\n';
    table += '┌────┬─────────────────────────────────┬────┬────┬────┬────┬────┬────┬─────────┐\n';
    table += '│ Pos│ Team                            │  P │  W │  L │  T │ NR │ Pts│   NRR   │\n';
    table += '├────┼─────────────────────────────────┼────┼────┼────┼────┼────┼────┼─────────┤\n';

    sorted.forEach((standing, index) => {
      const pos = String(index + 1).padStart(3);
      const team = standing.clubName.padEnd(32);
      const played = String(standing.played).padStart(3);
      const won = String(standing.won).padStart(3);
      const lost = String(standing.lost).padStart(3);
      const tied = String(standing.tied).padStart(3);
      const noResult = String(standing.noResult).padStart(3);
      const points = String(standing.points).padStart(3);
      const nrr = standing.netRunRate.toFixed(3).padStart(8);

      table += `│ ${pos}│ ${team}│ ${played}│ ${won}│ ${lost}│ ${tied}│ ${noResult}│ ${points}│ ${nrr}│\n`;
    });

    table += '└────┴─────────────────────────────────┴────┴────┴────┴────┴────┴────┴─────────┘\n';

    return table;
  }

  /**
   * Get playoff qualifiers (top 4 teams)
   * @param {Array} standings - Current standings
   * @returns {Array} Top 4 teams
   */
  getPlayoffQualifiers(standings) {
    const sorted = this.sortStandings([...standings]);
    return sorted.slice(0, 4);
  }

  /**
   * Calculate remaining matches needed for a team to guarantee playoff spot
   * @param {Array} standings - Current standings
   * @param {string} clubId - Club ID
   * @param {number} remainingMatches - Total remaining matches for the team
   * @returns {Object} Playoff qualification scenarios
   */
  getPlayoffScenarios(standings, clubId, remainingMatches) {
    const standing = standings.find(s => s.clubId === clubId);
    if (!standing) return null;

    const currentPosition = this.sortStandings([...standings]).findIndex(s => s.clubId === clubId) + 1;
    const maxPossiblePoints = standing.points + (remainingMatches * 2);

    // Find 5th place team's maximum possible points
    const sorted = this.sortStandings([...standings]);
    const fifthPlace = sorted[4];
    const fifthMaxPoints = fifthPlace ? fifthPlace.points + (remainingMatches * 2) : 0;

    return {
      currentPosition,
      currentPoints: standing.points,
      maxPossiblePoints,
      remainingMatches,
      guaranteed: maxPossiblePoints > fifthMaxPoints,
      eliminated: standing.points + (remainingMatches * 2) < (sorted[3]?.points || 0)
    };
  }
}

export default StandingsCalculator;
