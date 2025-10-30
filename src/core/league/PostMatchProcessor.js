/**
 * @file PostMatchProcessor.js
 * @description Processes match results and updates league state
 * Records results, updates standings, saves match logs
 */

import fs from 'fs';
import path from 'path';
import StandingsCalculator from './StandingsCalculator.js';

class PostMatchProcessor {
  constructor(leagueStore, teamStore = null, playerStore = null) {
    this.leagueStore = leagueStore;
    this.teamStore = teamStore;
    this.playerStore = playerStore;
    this.standingsCalculator = new StandingsCalculator();
    this.matchLogDir = 'match_logs/league';
  }

  /**
   * Process match result and update league state
   * @param {Object} matchConfig - Original match configuration
   * @param {Object} matchState - Final match state from MatchEngine
   * @returns {Object} Processed match result
   */
  processMatchResult(matchConfig, matchState) {
    console.log(`\n📊 Processing match result...`);

    // Extract match result
    const result = this.extractMatchResult(matchConfig, matchState);

    // Record result in league store
    this.leagueStore.getState().recordResult(result);

    // Update standings
    const currentStandings = this.leagueStore.getState().standings;
    const updatedStandings = this.standingsCalculator.updateStandings(currentStandings, result);
    this.leagueStore.getState().updateStandings(updatedStandings);

    // Update player stats (team-specific and career)
    if (this.teamStore && this.playerStore) {
      this.updatePlayerStats(matchConfig, matchState);
    }

    // Save match log
    this.saveMatchLog(result, matchState);

    // Display result summary
    this.displayResultSummary(result);

    return result;
  }

  /**
   * Extract match result from match state
   * @param {Object} matchConfig - Match configuration
   * @param {Object} matchState - Final match state
   * @returns {Object} Match result object
   */
  extractMatchResult(matchConfig, matchState) {
    const { teams, innings, ballByBall } = matchState;

    // Determine innings scores
    let innings1, innings2;

    if (innings.number === 1) {
      // Match ended in first innings (unlikely but possible)
      innings1 = {
        battingTeam: teams.batting.id,
        totalScore: teams.batting.totalScore,
        wickets: teams.batting.wickets,
        overs: matchState.currentBall.over,
        balls: matchState.currentBall.ball,
        ballsBowled: (matchState.currentBall.over * 6) + matchState.currentBall.ball
      };
      innings2 = {
        battingTeam: teams.bowling.id,
        totalScore: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        ballsBowled: 0
      };
    } else {
      // Normal completion - both innings played
      // First innings is the current bowling team (they batted in innings 1)
      const firstInningsScore = this.calculateInningsScore(ballByBall, 1);
      const secondInningsScore = {
        battingTeam: teams.batting.id,
        totalScore: teams.batting.totalScore,
        wickets: teams.batting.wickets,
        overs: matchState.currentBall.over,
        balls: matchState.currentBall.ball,
        ballsBowled: (matchState.currentBall.over * 6) + matchState.currentBall.ball
      };

      innings1 = {
        battingTeam: teams.bowling.id, // Current bowling team batted first
        ...firstInningsScore
      };
      innings2 = secondInningsScore;
    }

    // Determine winner
    let winner, winnerName, margin, result;

    if (innings2.totalScore >= innings1.totalScore + 1) {
      // Team batting second won
      winner = innings2.battingTeam;
      winnerName = winner === matchConfig.homeTeam.id ? matchConfig.homeTeam.name : matchConfig.awayTeam.name;
      margin = `${10 - innings2.wickets} wickets`;
      result = 'win';
    } else if (innings2.totalScore === innings1.totalScore) {
      // Tie
      winner = null;
      winnerName = null;
      margin = 'tie';
      result = 'tie';
    } else {
      // Team batting first won
      winner = innings1.battingTeam;
      winnerName = winner === matchConfig.homeTeam.id ? matchConfig.homeTeam.name : matchConfig.awayTeam.name;
      margin = `${(innings1.totalScore + 1) - innings2.totalScore} runs`;
      result = 'win';
    }

    return {
      matchId: matchConfig.matchId || `match_${Date.now()}`,
      homeTeam: matchConfig.homeTeam.id,
      homeTeamName: matchConfig.homeTeam.name,
      awayTeam: matchConfig.awayTeam.id,
      awayTeamName: matchConfig.awayTeam.name,
      venue: matchConfig.venue,
      innings1,
      innings2,
      winner,
      winnerName,
      margin,
      result,
      status: 'completed',
      ballByBallCount: ballByBall.length,
      ballByBallData: ballByBall, // Include for leaderboards
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate innings score from ball-by-ball data
   * @param {Array} ballByBall - Ball-by-ball record
   * @param {number} inningsNumber - Innings number (1 or 2)
   * @returns {Object} Innings score summary
   */
  calculateInningsScore(ballByBall, inningsNumber) {
    const inningsBalls = ballByBall.filter(b => b.innings === inningsNumber);

    let totalScore = 0;
    let wickets = 0;
    let legalBalls = 0;

    inningsBalls.forEach(ball => {
      totalScore += ball.runs || 0;
      if (ball.isWicket) wickets++;
      if (ball.isLegal) legalBalls++;
    });

    const overs = Math.floor(legalBalls / 6);
    const balls = legalBalls % 6;

    return {
      totalScore,
      wickets,
      overs,
      balls,
      ballsBowled: legalBalls
    };
  }

  /**
   * Display result summary in console
   * @param {Object} result - Match result
   */
  displayResultSummary(result) {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 MATCH RESULT');
    console.log('='.repeat(80));
    console.log(`${result.homeTeamName} vs ${result.awayTeamName} at ${result.venue}`);
    console.log('');
    console.log(`${result.innings1.battingTeam === result.homeTeam ? result.homeTeamName : result.awayTeamName}: ${result.innings1.totalScore}/${result.innings1.wickets} (${result.innings1.overs}.${result.innings1.balls} overs)`);
    console.log(`${result.innings2.battingTeam === result.homeTeam ? result.homeTeamName : result.awayTeamName}: ${result.innings2.totalScore}/${result.innings2.wickets} (${result.innings2.overs}.${result.innings2.balls} overs)`);
    console.log('');

    if (result.result === 'tie') {
      console.log('Match tied!');
    } else {
      console.log(`${result.winnerName} won by ${result.margin}`);
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Save match log to file
   * @param {Object} result - Match result
   * @param {Object} matchState - Complete match state
   */
  saveMatchLog(result, matchState) {
    // Create directory if it doesn't exist
    if (!fs.existsSync(this.matchLogDir)) {
      fs.mkdirSync(this.matchLogDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(this.matchLogDir, `${result.matchId}_${timestamp}.json`);

    const matchLog = {
      result,
      ballByBall: matchState.ballByBall,
      commentary: matchState.commentary,
      tacticsState: matchState.tacticsState
    };

    try {
      fs.writeFileSync(filename, JSON.stringify(matchLog, null, 2));
      console.log(`💾 Match log saved: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to save match log: ${error.message}`);
    }
  }

  /**
   * Get match statistics
   * @param {Object} matchState - Match state
   * @returns {Object} Match statistics
   */
  getMatchStats(matchState) {
    const { ballByBall } = matchState;

    const stats = {
      totalBalls: ballByBall.length,
      boundaries: ballByBall.filter(b => b.runs === 4 || b.runs === 6).length,
      fours: ballByBall.filter(b => b.runs === 4).length,
      sixes: ballByBall.filter(b => b.runs === 6).length,
      wickets: ballByBall.filter(b => b.isWicket).length,
      dots: ballByBall.filter(b => b.runs === 0 && b.isLegal).length,
      extras: ballByBall.filter(b => !b.isLegal).length
    };

    return stats;
  }

  /**
   * Update player stats in teamStore and playerStore
   * @param {Object} matchConfig - Match configuration
   * @param {Object} matchState - Match state with ball-by-ball data
   */
  updatePlayerStats(matchConfig, matchState) {
    const { ballByBall } = matchState;
    const homeTeamId = matchConfig.homeTeam.id;
    const awayTeamId = matchConfig.awayTeam.id;

    // Extract player stats from ball-by-ball data
    const playerStats = this.extractPlayerStatsFromBalls(ballByBall);

    // Update stats for both teams
    [homeTeamId, awayTeamId].forEach(teamId => {
      const teamPlayerStats = playerStats[teamId];

      if (!teamPlayerStats) return;

      Object.entries(teamPlayerStats).forEach(([playerId, stats]) => {
        // Update team-specific stats in teamStore
        this.teamStore.getState().updatePlayerStats(teamId, playerId, stats);

        // Update career stats in playerStore
        this.playerStore.getState().updateCareerStats(playerId, stats);
      });

      // Recalculate team aggregate stats
      this.teamStore.getState().recalculateTeamStats(teamId);
    });
  }

  /**
   * Extract player stats from ball-by-ball data
   * @param {Array} ballByBall - Ball-by-ball records
   * @returns {Object} Player stats by team and player ID
   */
  extractPlayerStatsFromBalls(ballByBall) {
    const stats = {};

    // Initialize tracking for dismissals
    const dismissals = new Set();

    ballByBall.forEach(ball => {
      if (!ball.isLegal) return; // Skip extras that aren't legal deliveries

      const battingTeam = ball.battingTeam;
      const bowlingTeam = ball.bowlingTeam;
      const batsmanId = ball.batsman;
      const bowlerId = ball.bowler;

      // Initialize team stats if needed
      if (!stats[battingTeam]) stats[battingTeam] = {};
      if (!stats[bowlingTeam]) stats[bowlingTeam] = {};

      // Initialize batsman stats if needed
      if (!stats[battingTeam][batsmanId]) {
        stats[battingTeam][batsmanId] = {
          runs: 0,
          ballsFaced: 0,
          dismissed: false,
          wickets: 0,
          ballsBowled: 0,
          runsConceded: 0
        };
      }

      // Initialize bowler stats if needed
      if (!stats[bowlingTeam][bowlerId]) {
        stats[bowlingTeam][bowlerId] = {
          runs: 0,
          ballsFaced: 0,
          dismissed: false,
          wickets: 0,
          ballsBowled: 0,
          runsConceded: 0
        };
      }

      // Update batting stats
      const batsmanStats = stats[battingTeam][batsmanId];
      batsmanStats.ballsFaced += 1;
      batsmanStats.runs += (ball.runsScored || 0);

      // Track dismissal (only count once per player)
      if (ball.isWicket && ball.dismissedPlayer === batsmanId) {
        const dismissalKey = `${battingTeam}-${batsmanId}`;
        if (!dismissals.has(dismissalKey)) {
          batsmanStats.dismissed = true;
          dismissals.add(dismissalKey);
        }
      }

      // Update bowling stats
      const bowlerStats = stats[bowlingTeam][bowlerId];
      bowlerStats.ballsBowled += 1;
      bowlerStats.runsConceded += (ball.runs || 0); // Total runs including extras

      if (ball.isWicket) {
        bowlerStats.wickets += 1;
      }
    });

    return stats;
  }

  /**
   * Display current league standings
   */
  displayStandings() {
    const standings = this.leagueStore.getState().getCurrentStandings();
    const table = this.standingsCalculator.formatStandingsTable(standings);

    console.log('\n📊 LEAGUE STANDINGS');
    console.log(table);
  }
}

export default PostMatchProcessor;
