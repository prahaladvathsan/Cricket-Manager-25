/**
 * @file MatchWeekScheduleGenerator.js
 * @description Generates match-week based league schedule for WPL
 * Each match week is a weekend with 5 matches, each team plays once per week
 */

class MatchWeekScheduleGenerator {
  /**
   * Generate complete league schedule with match weeks
   * @param {Array} clubs - All league clubs
   * @param {Date} seasonStartDate - Season start date (should be a Saturday)
   * @returns {Object} Schedule with fixtures and match week information
   */
  generateMatchWeekSchedule(clubs, seasonStartDate = new Date('2025-02-01')) {
    if (clubs.length !== 10) {
      throw new Error('Match week schedule requires exactly 10 teams');
    }

    // Ensure start date is a Saturday
    const startDate = new Date(seasonStartDate);
    const dayOfWeek = startDate.getDay();
    if (dayOfWeek !== 6) { // 6 = Saturday
      // Adjust to next Saturday
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
      startDate.setDate(startDate.getDate() + daysUntilSaturday);
    }

    console.log(`\n📅 Season starts on: ${this.formatDate(startDate)} (Saturday)`);

    const fixtures = [];
    const matchWeeks = [];
    let matchId = 1;
    let weekNumber = 1;

    // Generate double round-robin schedule
    // Using circle method for round-robin scheduling
    const schedule = this.generateRoundRobinSchedule(clubs);

    // Each round has 9 matchdays (since we have 10 teams)
    // Each matchday has 5 matches
    // Total: 18 matchdays (9 per round) = 18 match weeks

    schedule.forEach((matchday, matchdayIndex) => {
      // Calculate date for this match week (every Saturday)
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);

      const weekFixtures = [];

      matchday.forEach(match => {
        const fixture = {
          matchId: `match_${matchId}`,
          matchday: matchdayIndex + 1,
          matchWeek: weekNumber,
          homeTeam: match.home.id,
          homeTeamName: match.home.name,
          awayTeam: match.away.id,
          awayTeamName: match.away.name,
          venue: match.home.homeVenue,
          status: 'scheduled',
          round: matchdayIndex < 9 ? 1 : 2,
          date: this.formatDate(weekDate),
          dateObj: new Date(weekDate)
        };

        fixtures.push(fixture);
        weekFixtures.push(fixture);
        matchId++;
      });

      matchWeeks.push({
        weekNumber,
        date: this.formatDate(weekDate),
        dateObj: new Date(weekDate),
        matchdayNumber: matchdayIndex + 1,
        fixtures: weekFixtures,
        matchCount: weekFixtures.length
      });

      weekNumber++;
    });

    console.log(`✅ Generated ${fixtures.length} fixtures across ${matchWeeks.length} match weeks`);
    console.log(`   Season runs from ${this.formatDate(startDate)} to ${this.formatDate(matchWeeks[matchWeeks.length - 1].dateObj)}`);

    return {
      fixtures,
      matchWeeks,
      seasonStart: startDate,
      seasonEnd: matchWeeks[matchWeeks.length - 1].dateObj,
      totalWeeks: matchWeeks.length
    };
  }

  /**
   * Generate round-robin schedule using circle method
   * @param {Array} clubs - All league clubs
   * @returns {Array} Array of matchdays, each containing 5 matches
   */
  generateRoundRobinSchedule(clubs) {
    const n = clubs.length;
    const schedule = [];

    // Create teams array (for circle method)
    const teams = [...clubs];

    // Generate first round (n-1 matchdays)
    for (let round = 0; round < n - 1; round++) {
      const matchday = [];

      // Generate matches for this round
      for (let i = 0; i < n / 2; i++) {
        const home = teams[i];
        const away = teams[n - 1 - i];

        matchday.push({ home, away });
      }

      schedule.push(matchday);

      // Rotate teams (keep first team fixed)
      const fixed = teams[0];
      const rotating = teams.slice(1);
      rotating.unshift(rotating.pop()); // Rotate clockwise
      teams.splice(0, teams.length, fixed, ...rotating);
    }

    // Generate second round (reverse home/away)
    const secondRound = schedule.map(matchday =>
      matchday.map(match => ({
        home: match.away,
        away: match.home
      }))
    );

    return [...schedule, ...secondRound];
  }

  /**
   * Generate playoff schedule (2-week format)
   * @param {Date} leagueEndDate - End date of league stage
   * @param {Array} qualifiedTeams - Top 4 teams [1st, 2nd, 3rd, 4th]
   * @returns {Object} Playoff schedule with dates
   */
  generatePlayoffSchedule(leagueEndDate, qualifiedTeams) {
    const playoffStart = new Date(leagueEndDate);
    playoffStart.setDate(playoffStart.getDate() + 7); // Next Saturday

    const playoff1Date = new Date(playoffStart);
    const playoff2Date = new Date(playoffStart);
    playoff2Date.setDate(playoff2Date.getDate() + 7); // Following Saturday

    const playoffs = {
      week1: {
        weekNumber: 'Playoff Week 1',
        date: this.formatDate(playoff1Date),
        dateObj: playoff1Date,
        matches: [
          {
            matchId: 'playoff_q1',
            type: 'Qualifier 1',
            homeTeam: qualifiedTeams[0]?.clubId,
            homeTeamName: qualifiedTeams[0]?.clubName,
            awayTeam: qualifiedTeams[1]?.clubId,
            awayTeamName: qualifiedTeams[1]?.clubName,
            description: '1st vs 2nd - Winner to Final',
            date: this.formatDate(playoff1Date)
          },
          {
            matchId: 'playoff_e',
            type: 'Eliminator',
            homeTeam: qualifiedTeams[2]?.clubId,
            homeTeamName: qualifiedTeams[2]?.clubName,
            awayTeam: qualifiedTeams[3]?.clubId,
            awayTeamName: qualifiedTeams[3]?.clubName,
            description: '3rd vs 4th - Winner to Qualifier 2',
            date: this.formatDate(playoff1Date)
          }
        ]
      },
      week2: {
        weekNumber: 'Playoff Week 2',
        date: this.formatDate(playoff2Date),
        dateObj: playoff2Date,
        matches: [
          {
            matchId: 'playoff_q2',
            type: 'Qualifier 2',
            description: 'Loser of Q1 vs Winner of Eliminator - Winner to Final',
            date: this.formatDate(playoff2Date),
            // Teams TBD based on week 1 results
            homeTeam: null,
            awayTeam: null
          },
          {
            matchId: 'playoff_final',
            type: 'Final',
            description: 'Winner of Q1 vs Winner of Q2 - CHAMPION',
            date: this.formatDate(playoff2Date),
            // Teams TBD based on earlier results
            homeTeam: null,
            awayTeam: null
          }
        ]
      }
    };

    return playoffs;
  }

  /**
   * Validate match week schedule
   * @param {Array} matchWeeks - Generated match weeks
   * @param {Array} clubs - All league clubs
   * @returns {Object} Validation result
   */
  validateMatchWeekSchedule(matchWeeks, clubs) {
    const issues = [];
    const gamesPerTeamPerWeek = {};
    const totalGamesPerTeam = {};

    // Initialize counters
    clubs.forEach(club => {
      totalGamesPerTeam[club.id] = 0;
    });

    // Check each match week
    matchWeeks.forEach((week, index) => {
      const weekTeams = {};

      week.fixtures.forEach(fixture => {
        // Count games per team this week
        weekTeams[fixture.homeTeam] = (weekTeams[fixture.homeTeam] || 0) + 1;
        weekTeams[fixture.awayTeam] = (weekTeams[fixture.awayTeam] || 0) + 1;

        // Count total games per team
        totalGamesPerTeam[fixture.homeTeam]++;
        totalGamesPerTeam[fixture.awayTeam]++;
      });

      // Validate: Each team should play exactly once per week
      Object.entries(weekTeams).forEach(([teamId, count]) => {
        if (count !== 1) {
          const club = clubs.find(c => c.id === teamId);
          issues.push(`Week ${index + 1}: ${club?.name || teamId} plays ${count} times (should be 1)`);
        }
      });

      // Validate: Should be exactly 5 matches per week (10 teams = 5 matches)
      if (week.fixtures.length !== 5) {
        issues.push(`Week ${index + 1}: ${week.fixtures.length} matches (should be 5)`);
      }
    });

    // Validate total games per team (should be 18: play each of 9 other teams twice)
    Object.entries(totalGamesPerTeam).forEach(([teamId, count]) => {
      if (count !== 18) {
        const club = clubs.find(c => c.id === teamId);
        issues.push(`${club?.name || teamId}: ${count} total games (should be 18)`);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        totalWeeks: matchWeeks.length,
        totalMatches: matchWeeks.reduce((sum, week) => sum + week.fixtures.length, 0),
        gamesPerTeam: totalGamesPerTeam
      }
    };
  }

  /**
   * Format date as readable string
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Get fixtures for a specific match week
   * @param {Array} matchWeeks - All match weeks
   * @param {number} weekNumber - Week number
   * @returns {Object|null} Match week object
   */
  getMatchWeek(matchWeeks, weekNumber) {
    return matchWeeks.find(week => week.weekNumber === weekNumber) || null;
  }

  /**
   * Get match weeks in a range
   * @param {Array} matchWeeks - All match weeks
   * @param {number} startWeek - Start week number
   * @param {number} endWeek - End week number
   * @returns {Array} Match weeks in range
   */
  getMatchWeekRange(matchWeeks, startWeek, endWeek) {
    return matchWeeks.filter(week =>
      week.weekNumber >= startWeek && week.weekNumber <= endWeek
    );
  }
}

export default MatchWeekScheduleGenerator;
