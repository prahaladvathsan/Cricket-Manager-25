/**
 * @file PostMatchProcessor.js
 * @description Processes match results and updates league state
 * Records results, updates standings, saves match logs
 */

import fs from 'fs';
import path from 'path';
import StandingsCalculator from './StandingsCalculator.js';

class PostMatchProcessor {
  constructor(leagueStore) {
    this.leagueStore = leagueStore;
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
