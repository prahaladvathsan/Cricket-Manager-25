/**
 * @file LeagueSimulator.js
 * @description Main league simulation engine
 * Orchestrates complete league season: squad distribution → fixtures → simulation → standings
 */

import fs from 'fs';
import SquadDistributor from './SquadDistributor.js';
import ScheduleGenerator from './ScheduleGenerator.js';
import PlayoffGenerator from './PlayoffGenerator.js';
import PlayoffSimulator from './PlayoffSimulator.js';
import MatchOrchestrator from './MatchOrchestrator.js';
import StandingsCalculator from './StandingsCalculator.js';
import LeaderboardsCalculator from './LeaderboardsCalculator.js';
import { create } from 'zustand';

class LeagueSimulator {
  constructor(leagueStore, playerStore, teamStore, matchStore) {
    this.leagueStore = leagueStore;
    this.playerStore = playerStore;
    this.teamStore = teamStore;
    this.matchStore = matchStore;

    this.squadDistributor = new SquadDistributor();
    this.scheduleGenerator = new ScheduleGenerator();
    this.playoffGenerator = new PlayoffGenerator();
    this.matchOrchestrator = new MatchOrchestrator(playerStore, teamStore, matchStore, leagueStore);
    this.playoffSimulator = new PlayoffSimulator(this.matchOrchestrator, leagueStore);
    this.standingsCalculator = new StandingsCalculator();
    this.leaderboards = new LeaderboardsCalculator();
  }

  /**
   * Initialize a new league season
   * @param {Object} config - League configuration
   * @returns {Object} Initialization result
   */
  initializeLeague(config) {
    const { clubsData, playersData, seasonName } = config;

    console.log('\n' + '='.repeat(80));
    console.log('🏆 INITIALIZING WORLD PREMIER LEAGUE SEASON');
    console.log('='.repeat(80) + '\n');

    // Clean up old match logs
    this.cleanupMatchLogs();

    // Step 1: Distribute squads
    console.log('📋 Step 1: Distributing players across clubs...');
    const clubsWithSquads = this.squadDistributor.distributeSquads(
      playersData,
      clubsData,
      25 // Squad size
    );

    // Validate distribution
    const validation = this.squadDistributor.validateDistribution(clubsWithSquads);
    if (!validation.valid) {
      console.warn(`⚠️ Squad distribution issues: ${validation.issues.join(', ')}`);
    } else {
      console.log('✅ Squad distribution validated\n');
    }

    // Step 2: Generate league schedule
    console.log('📅 Step 2: Generating league schedule...');
    const fixtures = this.scheduleGenerator.generateLeagueSchedule(clubsWithSquads);

    // Validate schedule
    const scheduleValidation = this.scheduleGenerator.validateSchedule(fixtures, clubsWithSquads);
    if (!scheduleValidation.valid) {
      throw new Error(`Schedule validation failed: ${scheduleValidation.issues.join(', ')}`);
    }
    console.log(`✅ Generated ${fixtures.length} fixtures (double round-robin)\n`);

    // Step 3: Initialize league store
    console.log('💾 Step 3: Initializing league state...');
    this.leagueStore.getState().initializeSeason({
      seasonId: `wpl_${Date.now()}`,
      seasonName: seasonName || 'WPL 2025',
      clubs: clubsWithSquads,
      fixtures
    });
    console.log('✅ League state initialized\n');

    console.log('='.repeat(80));
    console.log('✅ LEAGUE INITIALIZATION COMPLETE');
    console.log('='.repeat(80) + '\n');

    return {
      clubs: clubsWithSquads,
      fixtures,
      validation,
      scheduleValidation
    };
  }

  /**
   * Simulate complete league season (all 90 matches)
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Season results
   */
  async simulateFullLeague(options = {}) {
    const {
      showProgress = true,
      showStandingsAfterEvery = 10, // Show standings every N matches
      pauseAfter = null // Pause after N matches (for testing)
    } = options;

    const state = this.leagueStore.getState();
    const { fixtures, clubs } = state;

    if (!fixtures || fixtures.length === 0) {
      throw new Error('No fixtures found. Please initialize league first.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('⚽ STARTING FULL LEAGUE SIMULATION');
    console.log('='.repeat(80));
    console.log(`Total matches: ${fixtures.length}`);
    console.log(`Clubs: ${Object.keys(clubs).length}`);
    console.log('='.repeat(80) + '\n');

    const clubsMap = state.clubs;
    const startTime = Date.now();
    let matchCount = 0;

    // Simulate all league matches
    for (const fixture of fixtures) {
      matchCount++;

      const homeClub = clubsMap[fixture.homeTeam];
      const awayClub = clubsMap[fixture.awayTeam];

      if (!homeClub || !awayClub) {
        console.error(`❌ Club not found for fixture ${fixture.matchday}`);
        continue;
      }

      // Simulate match
      const result = await this.matchOrchestrator.simulateMatch(fixture, homeClub, awayClub);

      // Update leaderboards
      this.leaderboards.updateFromMatch(result);

      // Show progress
      if (showProgress && matchCount % showStandingsAfterEvery === 0) {
        this.displayProgress(matchCount, fixtures.length, startTime);
      }

      // Pause if requested (for testing)
      if (pauseAfter && matchCount >= pauseAfter) {
        console.log(`\n⏸️ Paused after ${matchCount} matches`);
        break;
      }

      // Reset match store for next match
      this.matchStore.getState().resetMatch();
    }

    // Calculate final results
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('🏁 LEAGUE STAGE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Matches completed: ${matchCount}`);
    console.log(`Time taken: ${duration}s`);
    console.log(`Average time per match: ${(duration / matchCount).toFixed(2)}s`);
    console.log('='.repeat(80) + '\n');

    // Display final standings
    this.matchOrchestrator.postMatchProcessor.displayStandings();

    // Get playoff qualifiers
    const finalStandings = this.leagueStore.getState().getCurrentStandings();
    const playoffTeams = this.standingsCalculator.getPlayoffQualifiers(finalStandings);

    console.log('\n🏆 PLAYOFF QUALIFIERS (Top 4):');
    playoffTeams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.clubName} (${team.points} points, NRR: ${team.netRunRate.toFixed(3)})`);
    });
    console.log();

    return {
      matchesPlayed: matchCount,
      duration,
      finalStandings,
      playoffTeams,
      leaderboards: this.leaderboards.getAllLeaderboards()
    };
  }

  /**
   * Simulate full season including playoffs
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Complete season results
   */
  async simulateFullSeason(options = {}) {
    const {
      includePlayoffs = true,
      showLeaderboards = true
    } = options;

    // Simulate league stage
    const leagueResults = await this.simulateFullLeague(options);

    // Display leaderboards after league stage
    if (showLeaderboards) {
      this.leaderboards.displayLeaderboards(10);
    }

    let playoffResults = null;
    let champion = null;

    // Simulate playoffs if requested
    if (includePlayoffs) {
      const clubsMap = this.leagueStore.getState().clubs;
      playoffResults = await this.playoffSimulator.simulatePlayoffs(clubsMap, leagueResults.finalStandings);
      champion = playoffResults.champion;

      // Update playoff results in leaderboards
      playoffResults.results.forEach(result => {
        this.leaderboards.updateFromMatch(result);
      });

      // Update league store stage
      this.leagueStore.getState().setStage('completed');
      this.leagueStore.getState().setChampion(champion);
    }

    // Display final leaderboards after playoffs
    if (showLeaderboards && includePlayoffs) {
      console.log('\n\n');
      console.log('='.repeat(80));
      console.log('📊 FINAL SEASON LEADERBOARDS (Including Playoffs)');
      console.log('='.repeat(80));
      this.leaderboards.displayLeaderboards(10);
    }

    return {
      league: leagueResults,
      playoffs: playoffResults,
      champion,
      leaderboards: this.leaderboards.getAllLeaderboards()
    };
  }

  /**
   * Simulate matches up to a specific matchday
   * @param {number} targetMatchday - Target matchday
   * @returns {Promise<Object>} Results up to matchday
   */
  async simulateUpToMatchday(targetMatchday) {
    const state = this.leagueStore.getState();
    const { fixtures, clubs, currentMatchday } = state;

    const clubsMap = state.clubs;
    const fixturesToPlay = fixtures.filter(f =>
      f.matchday > currentMatchday && f.matchday <= targetMatchday
    );

    console.log(`\nSimulating matchdays ${currentMatchday + 1} to ${targetMatchday}...`);
    console.log(`Matches to play: ${fixturesToPlay.length}\n`);

    for (const fixture of fixturesToPlay) {
      const homeClub = clubsMap[fixture.homeTeam];
      const awayClub = clubsMap[fixture.awayTeam];

      await this.matchOrchestrator.simulateMatch(fixture, homeClub, awayClub);

      // Reset match store
      this.matchStore.getState().resetMatch();
    }

    // Update current matchday
    this.leagueStore.getState().setMatchday(targetMatchday);

    const currentStandings = this.leagueStore.getState().getCurrentStandings();

    return {
      matchesPlayed: fixturesToPlay.length,
      currentMatchday: targetMatchday,
      standings: currentStandings
    };
  }

  /**
   * Display simulation progress
   * @param {number} completed - Matches completed
   * @param {number} total - Total matches
   * @param {number} startTime - Simulation start time
   */
  displayProgress(completed, total, startTime) {
    const percentage = ((completed / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgTime = (elapsed / completed).toFixed(2);
    const remaining = ((total - completed) * avgTime).toFixed(1);

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📊 Progress: ${completed}/${total} matches (${percentage}%)`);
    console.log(`⏱️  Elapsed: ${elapsed}s | Avg: ${avgTime}s/match | Est. remaining: ${remaining}s`);
    console.log(`${'─'.repeat(80)}\n`);

    // Show current standings
    this.matchOrchestrator.postMatchProcessor.displayStandings();
  }

  /**
   * Export league data to file
   * @param {string} filename - Output filename
   */
  exportLeagueData(filename) {
    const state = this.leagueStore.getState();

    const exportData = {
      seasonId: state.seasonId,
      seasonName: state.seasonName,
      stage: state.stage,
      currentMatchday: state.currentMatchday,
      standings: state.getCurrentStandings(),
      results: state.results,
      stats: state.stats
    };

    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`💾 League data exported to: ${filename}`);
  }

  /**
   * Get league statistics
   * @returns {Object} League statistics
   */
  getLeagueStats() {
    const state = this.leagueStore.getState();

    return {
      totalMatches: state.stats.totalMatches,
      completedMatches: state.stats.completedMatches,
      remainingMatches: state.stats.totalMatches - state.stats.completedMatches,
      highestScore: state.stats.highestScore,
      lowestScore: state.stats.lowestScore,
      standings: state.getCurrentStandings()
    };
  }

  /**
   * Clean up old match logs and league results
   */
  cleanupMatchLogs() {
    try {
      // Clean up match logs directory
      const matchLogsDir = 'match_logs/league';
      if (fs.existsSync(matchLogsDir)) {
        const files = fs.readdirSync(matchLogsDir);
        files.forEach(file => {
          fs.unlinkSync(`${matchLogsDir}/${file}`);
        });
        console.log(`🗑️  Cleaned up ${files.length} old match log(s)`);
      }

      // Clean up old league results files
      const rootFiles = fs.readdirSync('.');
      const leagueResultFiles = rootFiles.filter(f => f.startsWith('league_results_') && f.endsWith('.json'));
      leagueResultFiles.forEach(file => {
        fs.unlinkSync(file);
      });
      if (leagueResultFiles.length > 0) {
        console.log(`🗑️  Cleaned up ${leagueResultFiles.length} old league result(s)\n`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not clean up old logs: ${error.message}`);
    }
  }
}

export default LeagueSimulator;
