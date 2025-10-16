/**
 * @file PlayoffSimulator.js
 * @description Simulates playoff stage matches following T20 playoff format
 */

import PlayoffGenerator from './PlayoffGenerator.js';

class PlayoffSimulator {
  constructor(matchOrchestrator, leagueStore) {
    this.matchOrchestrator = matchOrchestrator;
    this.leagueStore = leagueStore;
    this.playoffGenerator = new PlayoffGenerator();
  }

  /**
   * Simulate entire playoff stage
   * @param {Map} clubsMap - Map of club ID to club object
   * @param {Array} standings - Final league standings
   * @returns {Promise<Object>} Playoff results including champion
   */
  async simulatePlayoffs(clubsMap, standings) {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 PLAYOFF STAGE');
    console.log('='.repeat(80));

    // Generate playoff fixtures
    const playoffFixtures = this.playoffGenerator.generatePlayoffFixtures(standings);
    const playoffResults = [];

    console.log('\n📋 Playoff Format:');
    console.log('  Qualifier 1: #1 vs #2 (Winner → Final)');
    console.log('  Eliminator:  #3 vs #4 (Loser eliminated)');
    console.log('  Qualifier 2: Loser Q1 vs Winner Eliminator (Winner → Final)');
    console.log('  Final:       Winner Q1 vs Winner Q2');

    // Match 1: Qualifier 1 (1st vs 2nd)
    const q1Fixture = playoffFixtures.find(f => f.matchId === 'playoff_q1');
    console.log('\n' + '='.repeat(80));
    console.log('⚔️  QUALIFIER 1: 1st vs 2nd');
    console.log('='.repeat(80));
    const q1Result = await this.simulatePlayoffMatch(q1Fixture, clubsMap);
    playoffResults.push(q1Result);
    this.playoffGenerator.updatePlayoffFixtures(playoffFixtures, q1Result);

    // Match 2: Eliminator (3rd vs 4th)
    const eliminatorFixture = playoffFixtures.find(f => f.matchId === 'playoff_eliminator');
    console.log('\n' + '='.repeat(80));
    console.log('⚔️  ELIMINATOR: 3rd vs 4th');
    console.log('='.repeat(80));
    const eliminatorResult = await this.simulatePlayoffMatch(eliminatorFixture, clubsMap);
    playoffResults.push(eliminatorResult);
    this.playoffGenerator.updatePlayoffFixtures(playoffFixtures, eliminatorResult);

    // Match 3: Qualifier 2 (Loser Q1 vs Winner Eliminator)
    const q2Fixture = playoffFixtures.find(f => f.matchId === 'playoff_q2');
    console.log('\n' + '='.repeat(80));
    console.log('⚔️  QUALIFIER 2: Second Chance');
    console.log('='.repeat(80));
    const q2Result = await this.simulatePlayoffMatch(q2Fixture, clubsMap);
    playoffResults.push(q2Result);
    this.playoffGenerator.updatePlayoffFixtures(playoffFixtures, q2Result);

    // Match 4: Final (Winner Q1 vs Winner Q2)
    const finalFixture = playoffFixtures.find(f => f.matchId === 'playoff_final');
    console.log('\n' + '='.repeat(80));
    console.log('🏆 CHAMPIONSHIP FINAL');
    console.log('='.repeat(80));
    const finalResult = await this.simulatePlayoffMatch(finalFixture, clubsMap);
    playoffResults.push(finalResult);

    // Get champion
    const champion = this.playoffGenerator.getPlayoffChampion(playoffResults);

    console.log('\n' + '='.repeat(80));
    console.log('🏆 WPL CHAMPION');
    console.log('='.repeat(80));
    console.log(`🥇 ${champion.championName.toUpperCase()}`);
    console.log(`🥈 Runner-up: ${champion.runnerUpName}`);
    console.log(`   Margin: ${champion.margin}`);
    console.log('='.repeat(80));

    return {
      fixtures: playoffFixtures,
      results: playoffResults,
      champion
    };
  }

  /**
   * Simulate single playoff match
   * @param {Object} fixture - Playoff fixture
   * @param {Map} clubsMap - Map of club ID to club object
   * @returns {Promise<Object>} Match result
   */
  async simulatePlayoffMatch(fixture, clubsMap) {
    const homeClub = clubsMap[fixture.homeTeam];
    const awayClub = clubsMap[fixture.awayTeam];

    if (!homeClub || !awayClub) {
      throw new Error(`Clubs not found for playoff match: ${fixture.matchId}`);
    }

    console.log(`\n${fixture.round}: ${homeClub.name} vs ${awayClub.name}`);
    console.log(`Venue: ${fixture.venue}`);

    // Simulate match using match orchestrator
    const result = await this.matchOrchestrator.simulateMatch(fixture, homeClub, awayClub);

    // Reset match store for next match
    this.matchOrchestrator.matchStore.getState().resetMatch();

    return result;
  }

  /**
   * Display playoff bracket summary
   * @param {Array} playoffResults - All playoff results
   */
  displayPlayoffBracket(playoffResults) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PLAYOFF BRACKET SUMMARY');
    console.log('='.repeat(80));

    playoffResults.forEach(result => {
      console.log(`\n${result.round || 'Match'}:`);
      console.log(`  ${result.homeTeamName} vs ${result.awayTeamName}`);
      console.log(`  Winner: ${result.winnerName} (${result.margin})`);
    });

    console.log('='.repeat(80));
  }
}

export default PlayoffSimulator;
