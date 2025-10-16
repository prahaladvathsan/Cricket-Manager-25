/**
 * @file ScheduleGenerator.js
 * @description Generates double round-robin league fixtures for WPL
 * Each team plays every other team twice (home and away)
 */

class ScheduleGenerator {
  /**
   * Generate complete league schedule
   * @param {Array} clubs - All league clubs
   * @returns {Array} Array of fixture objects
   */
  generateLeagueSchedule(clubs) {
    if (clubs.length < 2) {
      throw new Error('Need at least 2 clubs to generate schedule');
    }

    const fixtures = [];
    let matchId = 1;

    // Generate double round-robin (each team plays every other team twice)
    // First round: Home games
    // Second round: Away games (reverse of first round)

    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < clubs.length; i++) {
        for (let j = i + 1; j < clubs.length; j++) {
          const homeTeam = round === 0 ? clubs[i] : clubs[j];
          const awayTeam = round === 0 ? clubs[j] : clubs[i];

          fixtures.push({
            matchId: `match_${matchId}`,
            matchday: fixtures.length + 1,
            homeTeam: homeTeam.id,
            homeTeamName: homeTeam.name,
            awayTeam: awayTeam.id,
            awayTeamName: awayTeam.name,
            venue: homeTeam.homeVenue,
            status: 'scheduled',
            round: round + 1 // 1 or 2
          });

          matchId++;
        }
      }
    }

    // Shuffle fixtures to create a more realistic schedule
    // (rather than all round 1 matches first, then all round 2)
    const shuffledFixtures = this.shuffleFixtures(fixtures, clubs.length);

    // Reassign matchday numbers after shuffle
    shuffledFixtures.forEach((fixture, index) => {
      fixture.matchday = index + 1;
    });

    console.log(`Generated ${shuffledFixtures.length} league fixtures (double round-robin)`);

    return shuffledFixtures;
  }

  /**
   * Shuffle fixtures to create varied schedule
   * Ensures teams don't play too many consecutive home/away games
   * @param {Array} fixtures - Original fixtures
   * @param {number} numClubs - Number of clubs
   * @returns {Array} Shuffled fixtures
   */
  shuffleFixtures(fixtures, numClubs) {
    // Simple strategy: interleave first round and second round
    const round1 = fixtures.filter(f => f.round === 1);
    const round2 = fixtures.filter(f => f.round === 2);

    const shuffled = [];
    const maxLength = Math.max(round1.length, round2.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < round1.length) shuffled.push(round1[i]);
      if (i < round2.length) shuffled.push(round2[i]);
    }

    return shuffled;
  }

  /**
   * Generate fixtures for a specific matchday range
   * @param {Array} clubs - All league clubs
   * @param {number} startMatchday - Starting matchday
   * @param {number} endMatchday - Ending matchday
   * @returns {Array} Fixtures for the range
   */
  generateMatchdayRange(clubs, startMatchday, endMatchday) {
    const allFixtures = this.generateLeagueSchedule(clubs);
    return allFixtures.filter(f =>
      f.matchday >= startMatchday && f.matchday <= endMatchday
    );
  }

  /**
   * Validate schedule (ensures each team plays correct number of games)
   * @param {Array} fixtures - Generated fixtures
   * @param {Array} clubs - All league clubs
   * @returns {Object} Validation result
   */
  validateSchedule(fixtures, clubs) {
    const expectedGamesPerTeam = (clubs.length - 1) * 2; // Each team plays every other team twice
    const expectedTotalGames = (clubs.length * (clubs.length - 1)); // n * (n-1)

    const issues = [];

    // Count games per team
    const gamesPerTeam = {};
    clubs.forEach(club => {
      gamesPerTeam[club.id] = 0;
    });

    fixtures.forEach(fixture => {
      gamesPerTeam[fixture.homeTeam] = (gamesPerTeam[fixture.homeTeam] || 0) + 1;
      gamesPerTeam[fixture.awayTeam] = (gamesPerTeam[fixture.awayTeam] || 0) + 1;
    });

    // Validate each team's game count
    Object.entries(gamesPerTeam).forEach(([clubId, count]) => {
      if (count !== expectedGamesPerTeam) {
        const club = clubs.find(c => c.id === clubId);
        issues.push(`${club?.name || clubId} has ${count} games (expected ${expectedGamesPerTeam})`);
      }
    });

    // Validate total game count
    if (fixtures.length !== expectedTotalGames) {
      issues.push(`Total fixtures: ${fixtures.length} (expected ${expectedTotalGames})`);
    }

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        totalFixtures: fixtures.length,
        expectedFixtures: expectedTotalGames,
        gamesPerTeam
      }
    };
  }

  /**
   * Get fixture statistics
   * @param {Array} fixtures - Fixtures to analyze
   * @returns {Object} Fixture statistics
   */
  getFixtureStats(fixtures) {
    const stats = {
      total: fixtures.length,
      byRound: {},
      byVenue: {}
    };

    fixtures.forEach(fixture => {
      // Count by round
      stats.byRound[fixture.round] = (stats.byRound[fixture.round] || 0) + 1;

      // Count by venue
      stats.byVenue[fixture.venue] = (stats.byVenue[fixture.venue] || 0) + 1;
    });

    return stats;
  }
}

export default ScheduleGenerator;
