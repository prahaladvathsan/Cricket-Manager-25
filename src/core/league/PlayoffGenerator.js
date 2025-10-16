/**
 * @file PlayoffGenerator.js
 * @description Generates playoff fixtures based on league standings
 * Playoff format: Eliminators → Qualifiers → Finals
 *
 * Standard T20 playoff format:
 * - Qualifier 1: 1st vs 2nd (winner to Final)
 * - Eliminator: 3rd vs 4th (loser eliminated)
 * - Qualifier 2: Loser of Q1 vs Winner of Eliminator (winner to Final)
 * - Final: Winner of Q1 vs Winner of Q2
 */

class PlayoffGenerator {
  /**
   * Generate playoff fixtures from league standings
   * @param {Array} standings - Final league standings (sorted by points/NRR)
   * @returns {Array} Playoff fixtures
   */
  generatePlayoffFixtures(standings) {
    if (standings.length < 4) {
      throw new Error('Need at least top 4 teams for playoffs');
    }

    const top4 = standings.slice(0, 4);

    const fixtures = [];

    // Qualifier 1: 1st vs 2nd
    fixtures.push({
      matchId: 'playoff_q1',
      matchday: 91, // After 90 league matches
      round: 'Qualifier 1',
      homeTeam: top4[0].clubId,
      homeTeamName: top4[0].clubName,
      awayTeam: top4[1].clubId,
      awayTeamName: top4[1].clubName,
      venue: this.selectNeutralVenue(),
      status: 'scheduled',
      type: 'playoff',
      description: '1st vs 2nd - Winner to Final'
    });

    // Eliminator: 3rd vs 4th
    fixtures.push({
      matchId: 'playoff_eliminator',
      matchday: 91,
      round: 'Eliminator',
      homeTeam: top4[2].clubId,
      homeTeamName: top4[2].clubName,
      awayTeam: top4[3].clubId,
      awayTeamName: top4[3].clubName,
      venue: this.selectNeutralVenue(),
      status: 'scheduled',
      type: 'playoff',
      description: '3rd vs 4th - Loser eliminated'
    });

    // Qualifier 2: To be determined after Q1 and Eliminator
    fixtures.push({
      matchId: 'playoff_q2',
      matchday: 92,
      round: 'Qualifier 2',
      homeTeam: null, // TBD: Loser of Q1
      homeTeamName: 'TBD (Loser Q1)',
      awayTeam: null, // TBD: Winner of Eliminator
      awayTeamName: 'TBD (Winner Eliminator)',
      venue: this.selectNeutralVenue(),
      status: 'pending',
      type: 'playoff',
      description: 'Loser of Q1 vs Winner of Eliminator - Winner to Final'
    });

    // Final: To be determined after Q1 and Q2
    fixtures.push({
      matchId: 'playoff_final',
      matchday: 93,
      round: 'Final',
      homeTeam: null, // TBD: Winner of Q1
      homeTeamName: 'TBD (Winner Q1)',
      awayTeam: null, // TBD: Winner of Q2
      awayTeamName: 'TBD (Winner Q2)',
      venue: this.selectNeutralVenue(),
      status: 'pending',
      type: 'playoff',
      description: 'Championship Final'
    });

    console.log(`Generated ${fixtures.length} playoff fixtures`);

    return fixtures;
  }

  /**
   * Update playoff fixtures after match results
   * @param {Array} playoffFixtures - Current playoff fixtures
   * @param {Object} result - Latest match result
   * @returns {Array} Updated playoff fixtures
   */
  updatePlayoffFixtures(playoffFixtures, result) {
    const updatedFixtures = [...playoffFixtures];

    // Handle Qualifier 1 result
    if (result.matchId === 'playoff_q1') {
      const winner = result.winner;
      const loser = result.homeTeam === winner ? result.awayTeam : result.homeTeam;

      // Update Final with Q1 winner
      const finalMatch = updatedFixtures.find(f => f.matchId === 'playoff_final');
      if (finalMatch) {
        finalMatch.homeTeam = winner;
        finalMatch.homeTeamName = result.winnerName;
      }

      // Update Q2 with Q1 loser
      const q2Match = updatedFixtures.find(f => f.matchId === 'playoff_q2');
      if (q2Match) {
        q2Match.homeTeam = loser;
        q2Match.homeTeamName = result.homeTeam === loser ? result.homeTeamName : result.awayTeamName;
        q2Match.status = 'scheduled'; // Can now be played
      }
    }

    // Handle Eliminator result
    if (result.matchId === 'playoff_eliminator') {
      const winner = result.winner;

      // Update Q2 with Eliminator winner
      const q2Match = updatedFixtures.find(f => f.matchId === 'playoff_q2');
      if (q2Match) {
        q2Match.awayTeam = winner;
        q2Match.awayTeamName = result.winnerName;
        q2Match.status = 'scheduled'; // Can now be played
      }
    }

    // Handle Qualifier 2 result
    if (result.matchId === 'playoff_q2') {
      const winner = result.winner;

      // Update Final with Q2 winner
      const finalMatch = updatedFixtures.find(f => f.matchId === 'playoff_final');
      if (finalMatch) {
        finalMatch.awayTeam = winner;
        finalMatch.awayTeamName = result.winnerName;
        finalMatch.status = 'scheduled'; // Can now be played
      }
    }

    return updatedFixtures;
  }

  /**
   * Select neutral venue for playoff matches
   * @returns {string} Venue name
   */
  selectNeutralVenue() {
    // For MVP, use a default neutral venue
    // In future, could rotate based on season or use specific playoff venues
    return 'WPL Championship Stadium';
  }

  /**
   * Check if playoffs are complete
   * @param {Array} playoffFixtures - Playoff fixtures
   * @param {Array} results - Match results
   * @returns {boolean} True if all playoff matches completed
   */
  arePlayoffsComplete(playoffFixtures, results) {
    const finalMatch = playoffFixtures.find(f => f.matchId === 'playoff_final');
    const finalResult = results.find(r => r.matchId === 'playoff_final');

    return finalMatch && finalResult && finalResult.status === 'completed';
  }

  /**
   * Get playoff champion
   * @param {Array} results - All match results
   * @returns {Object|null} Champion info or null
   */
  getPlayoffChampion(results) {
    const finalResult = results.find(r => r.matchId === 'playoff_final');

    if (!finalResult || finalResult.status !== 'completed') {
      return null;
    }

    return {
      championId: finalResult.winner,
      championName: finalResult.winnerName,
      runnerUpId: finalResult.homeTeam === finalResult.winner ? finalResult.awayTeam : finalResult.homeTeam,
      runnerUpName: finalResult.homeTeam === finalResult.winner ? finalResult.awayTeamName : finalResult.homeTeamName,
      margin: finalResult.margin
    };
  }
}

export default PlayoffGenerator;
