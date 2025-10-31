/**
 * @file MatchOrchestrator.js
 * @description Orchestrates complete match flow: Pre-Match → Match → Post-Match
 * Coordinates between PreMatchSetup, MatchEngine, and PostMatchProcessor
 */

import PreMatchSetup from './PreMatchSetup.js';
import PostMatchProcessor from './PostMatchProcessor.js';
import MatchEngine from '../match-engine/core/MatchEngine.js';
import MatchDisplayFormatter from '../match-engine/interactive/MatchDisplayFormatter.js';

class MatchOrchestrator {
  constructor(playerStore, teamStore, matchStore, leagueStore, teamStoreForStats = null, playerStoreForStats = null) {
    this.playerStore = playerStore;
    this.teamStore = teamStore;
    this.matchStore = matchStore;
    this.leagueStore = leagueStore;

    this.preMatchSetup = new PreMatchSetup();
    // V2: Pass teamStore and playerStore to PostMatchProcessor for stats tracking
    this.postMatchProcessor = new PostMatchProcessor(leagueStore, teamStoreForStats || teamStore, playerStoreForStats || playerStore);
    this.displayFormatter = new MatchDisplayFormatter(playerStore);
  }

  /**
   * Simulate complete match from start to finish
   * @param {Object} fixture - Match fixture
   * @param {Object} homeClub - Home club with squad
   * @param {Object} awayClub - Away club with squad
   * @returns {Promise<Object>} Match result
   */
  async simulateMatch(fixture, homeClub, awayClub) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏏 MATCHDAY ${fixture.matchday}: ${homeClub.name} vs ${awayClub.name}`);
    console.log(`${'='.repeat(80)}`);

    try {
      // Phase 1: Pre-Match Setup
      const matchConfig = this.preMatchSetup.prepareMatch(
        homeClub,
        awayClub,
        fixture.venue,
        this.playerStore
      );

      // Validate match config
      const validation = this.preMatchSetup.validateMatchConfig(matchConfig);
      if (!validation.valid) {
        throw new Error(`Invalid match config: ${validation.issues.join(', ')}`);
      }

      // Phase 2: Match Simulation
      const matchResult = await this.runMatch(matchConfig);

      // Phase 3: Post-Match Processing
      const result = this.postMatchProcessor.processMatchResult(matchConfig, matchResult);

      return result;

    } catch (error) {
      console.error(`❌ Error simulating match: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run match simulation using MatchEngine
   * @param {Object} matchConfig - Match configuration
   * @returns {Promise<Object>} Final match state
   */
  async runMatch(matchConfig) {
    // Initialize match engine with silent mode for league simulation
    const matchEngine = new MatchEngine(this.matchStore, this.playerStore, this.teamStore, { silent: true });

    // Configure for automated simulation (no user interaction)
    matchEngine.config.simulationSpeed = 'instant'; // Fast simulation
    matchEngine.config.interactiveMode = false; // Fully automated
    matchEngine.config.showBallByBall = false; // Hide ball-by-ball commentary for league simulation

    // Note: playerStore is already initialized at league level with all players
    // No need to reinitialize here (would overwrite with only current match players)

    // Initialize team store with team data
    this.teamStore.getState().initializeTeams({
      [matchConfig.homeTeam.id]: matchConfig.homeTeam,
      [matchConfig.awayTeam.id]: matchConfig.awayTeam
    });

    // Initialize match in store
    this.matchStore.getState().initializeMatch(matchConfig);

    // Set up opening players
    await matchEngine.setupOpeningPlayers();

    // Initialize player conditions and tactical state
    const matchState = this.matchStore.getState();
    const allPlayerIds = matchState.teams.batting.squad.concat(matchState.teams.bowling.squad);
    matchEngine.initializePlayerConditions(allPlayerIds);
    matchEngine.initializeTacticalState(matchState, matchConfig.battingParScore);

    console.log(`\n⚡ Simulating match...`);

    // Simulate first innings
    await matchEngine.simulateInnings();

    // Get final match state
    const finalMatchState = this.matchStore.getState();

    console.log(`✅ Match simulation complete\n`);

    // Display match scorecard
    this.displayMatchScorecard(finalMatchState, matchConfig);

    return finalMatchState;
  }

  /**
   * Simulate match with progress callback
   * @param {Object} fixture - Match fixture
   * @param {Object} homeClub - Home club
   * @param {Object} awayClub - Away club
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Match result
   */
  async simulateMatchWithProgress(fixture, homeClub, awayClub, onProgress) {
    // For future implementation: call onProgress periodically during simulation
    // For now, just simulate normally
    return this.simulateMatch(fixture, homeClub, awayClub);
  }

  /**
   * Batch simulate multiple matches
   * @param {Array} fixtures - Array of fixtures
   * @param {Object} clubsMap - Map of club ID to club object
   * @param {Function} onMatchComplete - Callback after each match
   * @returns {Promise<Array>} Array of match results
   */
  async simulateMatches(fixtures, clubsMap, onMatchComplete = null) {
    const results = [];

    for (const fixture of fixtures) {
      const homeClub = clubsMap[fixture.homeTeam];
      const awayClub = clubsMap[fixture.awayTeam];

      if (!homeClub || !awayClub) {
        console.error(`❌ Club not found for fixture ${fixture.matchday}`);
        continue;
      }

      const result = await this.simulateMatch(fixture, homeClub, awayClub);
      results.push(result);

      if (onMatchComplete) {
        onMatchComplete(result, fixtures.indexOf(fixture) + 1, fixtures.length);
      }

      // Reset match store for next match
      this.matchStore.getState().resetMatch();
    }

    return results;
  }

  /**
   * Get match summary
   * @param {Object} matchState - Match state
   * @returns {Object} Match summary
   */
  getMatchSummary(matchState) {
    const { teams, innings, ballByBall } = matchState;

    return {
      battingTeam: teams.batting.name,
      bowlingTeam: teams.bowling.name,
      score: `${teams.batting.totalScore}/${teams.batting.wickets}`,
      overs: `${matchState.currentBall.over}.${matchState.currentBall.ball}`,
      target: innings.target,
      ballsPlayed: ballByBall.length,
      boundaries: ballByBall.filter(b => b.runs === 4 || b.runs === 6).length
    };
  }

  /**
   * Display match scorecard using MatchDisplayFormatter
   * @param {Object} matchState - Final match state
   * @param {Object} matchConfig - Match configuration
   */
  displayMatchScorecard(matchState, matchConfig) {
    // Determine which team batted first
    const battingFirst = matchConfig.battingTeam;
    const bowlingFirst = matchConfig.bowlingTeam;

    // Display full scorecard
    this.displayFormatter.displayFullStats(matchState, battingFirst, bowlingFirst);
  }
}

export default MatchOrchestrator;
