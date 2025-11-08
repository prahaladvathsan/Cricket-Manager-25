/**
 * @file MatchWeekScheduleGenerator.js
 * @description Generates weekday-based league schedule for WPL
 * Schedule: 1 match per weekday (Mon-Fri), weekends free
 */

class MatchWeekScheduleGenerator {
  /**
   * Generate complete league schedule with matches spread across weekdays
   * @param {Array} clubs - All league clubs
   * @param {Date} seasonStartDate - Season start date
   * @returns {Object} Schedule with fixtures and match information
   */
  generateMatchWeekSchedule(clubs, seasonStartDate = new Date()) {
    if (clubs.length !== 10) {
      throw new Error('Match week schedule requires exactly 10 teams');
    }

    // Start from the next Monday after the given date
    const startDate = this.getNextMonday(new Date(seasonStartDate));

    console.log(`\n📅 Season starts on: ${this.formatDate(startDate)} (Monday)`);

    const fixtures = [];
    let matchId = 1;
    let currentDate = new Date(startDate);

    // Generate double round-robin schedule
    const schedule = this.generateRoundRobinSchedule(clubs);

    // Each matchday has 5 matches (10 teams = 5 matches)
    // Schedule them across one week (Mon-Fri), one match per day
    schedule.forEach((matchday, matchdayIndex) => {
      matchday.forEach((match, matchIndex) => {
        // Skip weekends - only schedule on weekdays (Mon=1 to Fri=5)
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const fixture = {
          matchId: `match_${matchId}`,
          matchday: matchdayIndex + 1,
          homeTeam: match.home.id,
          homeTeamName: match.home.name,
          awayTeam: match.away.id,
          awayTeamName: match.away.name,
          venue: match.home.homeVenue || `${match.home.name} Stadium`,
          status: 'scheduled',
          round: matchdayIndex < 9 ? 1 : 2,
          date: this.formatDate(currentDate),
          dateObj: new Date(currentDate)
        };

        fixtures.push(fixture);
        matchId++;

        // Move to next day for next match
        currentDate.setDate(currentDate.getDate() + 1);
      });

      // After 5 matches (Mon-Fri), skip the weekend
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    const lastFixture = fixtures[fixtures.length - 1];
    console.log(`✅ Generated ${fixtures.length} fixtures across 18 matchdays`);
    console.log(`   Season runs from ${this.formatDate(startDate)} to ${this.formatDate(lastFixture.dateObj)}`);
    console.log(`   Schedule: 1 match per weekday (Mon-Fri), weekends free`);

    return {
      fixtures,
      seasonStart: startDate,
      seasonEnd: lastFixture.dateObj,
      totalMatchdays: schedule.length,
      totalMatches: fixtures.length
    };
  }

  /**
   * Get the next Monday from a given date
   * @param {Date} date - Starting date
   * @returns {Date} Next Monday
   */
  getNextMonday(date) {
    const result = new Date(date);
    const dayOfWeek = result.getDay();

    if (dayOfWeek === 1) {
      // Already Monday, use it
      return result;
    } else if (dayOfWeek === 0) {
      // Sunday, add 1 day to get Monday
      result.setDate(result.getDate() + 1);
    } else {
      // Tuesday-Saturday, add days to get to next Monday
      const daysUntilMonday = (8 - dayOfWeek) % 7;
      result.setDate(result.getDate() + daysUntilMonday);
    }

    return result;
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
   * Generate playoff schedule
   * @param {Date} leagueEndDate - End date of league stage
   * @param {Array} qualifiedTeams - Top 4 teams [1st, 2nd, 3rd, 4th]
   * @returns {Object} Playoff schedule with dates
   */
  generatePlayoffSchedule(leagueEndDate, qualifiedTeams) {
    // Start playoffs on next Monday after league ends
    const playoffStart = this.getNextMonday(new Date(leagueEndDate));
    playoffStart.setDate(playoffStart.getDate() + 7); // One week buffer

    const playoff1Date = new Date(playoffStart);
    const playoff2Date = new Date(playoffStart);
    playoff2Date.setDate(playoff2Date.getDate() + 7); // Following week

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
            homeTeam: null,
            awayTeam: null
          },
          {
            matchId: 'playoff_final',
            type: 'Final',
            description: 'Winner of Q1 vs Winner of Q2 - CHAMPION',
            date: this.formatDate(playoff2Date),
            homeTeam: null,
            awayTeam: null
          }
        ]
      }
    };

    return playoffs;
  }

  /**
   * Validate schedule
   * @param {Array} fixtures - Generated fixtures
   * @param {Array} clubs - All league clubs
   * @returns {Object} Validation result
   */
  validateSchedule(fixtures, clubs) {
    const issues = [];
    const totalGamesPerTeam = {};
    const matchesPerDay = {};

    // Initialize counters
    clubs.forEach(club => {
      totalGamesPerTeam[club.id] = 0;
    });

    // Check each fixture
    fixtures.forEach(fixture => {
      // Count games per team
      totalGamesPerTeam[fixture.homeTeam]++;
      totalGamesPerTeam[fixture.awayTeam]++;

      // Count matches per day
      const dateKey = fixture.date;
      matchesPerDay[dateKey] = (matchesPerDay[dateKey] || 0) + 1;

      // Check if match is on weekend
      const dayOfWeek = fixture.dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        issues.push(`Match ${fixture.matchId} scheduled on weekend (${fixture.date})`);
      }
    });

    // Validate: Each team should play 18 matches total (9 opponents × 2 rounds)
    Object.entries(totalGamesPerTeam).forEach(([teamId, count]) => {
      if (count !== 18) {
        const club = clubs.find(c => c.id === teamId);
        issues.push(`${club?.name || teamId}: ${count} total games (should be 18)`);
      }
    });

    // Validate: Should be only 1 match per day
    Object.entries(matchesPerDay).forEach(([date, count]) => {
      if (count !== 1) {
        issues.push(`${date}: ${count} matches (should be 1)`);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        totalMatches: fixtures.length,
        gamesPerTeam: totalGamesPerTeam,
        matchesPerDay: Object.keys(matchesPerDay).length
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
}

export default MatchWeekScheduleGenerator;
