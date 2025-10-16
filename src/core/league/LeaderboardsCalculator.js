/**
 * @file LeaderboardsCalculator.js
 * @description Calculates and maintains player leaderboards across the season
 */

class LeaderboardsCalculator {
  constructor() {
    this.playerStats = new Map(); // playerId -> stats
  }

  /**
   * Initialize or reset leaderboards
   */
  reset() {
    this.playerStats.clear();
  }

  /**
   * Update player stats from match result
   * @param {Object} matchResult - Match result with ball-by-ball data
   */
  updateFromMatch(matchResult) {
    if (!matchResult.ballByBallData || matchResult.ballByBallData.length === 0) {
      return;
    }

    // Process batting stats
    this.updateBattingStats(matchResult);

    // Process bowling stats
    this.updateBowlingStats(matchResult);

    // Process fielding stats
    this.updateFieldingStats(matchResult);
  }

  /**
   * Update batting statistics
   * @param {Object} matchResult - Match result
   */
  updateBattingStats(matchResult) {
    const battingStats = new Map();

    // Aggregate runs, balls, 4s, 6s per batsman
    matchResult.ballByBallData.forEach(ball => {
      const batsmanId = ball.striker;
      if (!batsmanId) return;

      if (!battingStats.has(batsmanId)) {
        battingStats.set(batsmanId, {
          playerId: batsmanId,
          playerName: ball.strikerName || batsmanId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissals: 0,
          innings: 0
        });
      }

      const stats = battingStats.get(batsmanId);
      stats.balls += 1;
      stats.runs += ball.runs || 0;
      if (ball.runs === 4) stats.fours += 1;
      if (ball.runs === 6) stats.sixes += 1;
      if (ball.wicket && ball.dismissalType !== 'run_out') {
        stats.dismissals += 1;
      }
    });

    // Mark innings played (anyone who faced a ball)
    battingStats.forEach(stats => {
      stats.innings = 1;
    });

    // Merge into overall player stats
    battingStats.forEach((matchStats, playerId) => {
      if (!this.playerStats.has(playerId)) {
        this.playerStats.set(playerId, {
          playerId,
          playerName: matchStats.playerName,
          batting: {
            innings: 0,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            dismissals: 0,
            highScore: 0,
            average: 0,
            strikeRate: 0
          },
          bowling: {
            innings: 0,
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0,
            average: 0,
            strikeRate: 0,
            bestFigures: { wickets: 0, runs: 0 }
          },
          fielding: {
            catches: 0,
            runOuts: 0,
            stumpings: 0
          }
        });
      }

      const playerStats = this.playerStats.get(playerId);
      playerStats.batting.innings += matchStats.innings;
      playerStats.batting.runs += matchStats.runs;
      playerStats.batting.balls += matchStats.balls;
      playerStats.batting.fours += matchStats.fours;
      playerStats.batting.sixes += matchStats.sixes;
      playerStats.batting.dismissals += matchStats.dismissals;

      // Update high score
      if (matchStats.runs > playerStats.batting.highScore) {
        playerStats.batting.highScore = matchStats.runs;
      }

      // Calculate average and strike rate
      playerStats.batting.average = playerStats.batting.dismissals > 0
        ? playerStats.batting.runs / playerStats.batting.dismissals
        : playerStats.batting.runs;
      playerStats.batting.strikeRate = playerStats.batting.balls > 0
        ? (playerStats.batting.runs / playerStats.batting.balls) * 100
        : 0;
    });
  }

  /**
   * Update bowling statistics
   * @param {Object} matchResult - Match result
   */
  updateBowlingStats(matchResult) {
    const bowlingStats = new Map();

    // Aggregate wickets, runs, balls per bowler
    matchResult.ballByBallData.forEach(ball => {
      const bowlerId = ball.bowler;
      if (!bowlerId) return;

      if (!bowlingStats.has(bowlerId)) {
        bowlingStats.set(bowlerId, {
          playerId: bowlerId,
          playerName: ball.bowlerName || bowlerId,
          balls: 0,
          runs: 0,
          wickets: 0,
          maidens: 0, // Would need over-by-over data
          innings: 0
        });
      }

      const stats = bowlingStats.get(bowlerId);
      stats.balls += 1;
      stats.runs += ball.runs || 0;
      if (ball.wicket && ball.dismissalType !== 'run_out') {
        stats.wickets += 1;
      }
    });

    // Mark innings bowled
    bowlingStats.forEach(stats => {
      stats.innings = 1;
    });

    // Merge into overall player stats
    bowlingStats.forEach((matchStats, playerId) => {
      if (!this.playerStats.has(playerId)) {
        this.playerStats.set(playerId, {
          playerId,
          playerName: matchStats.playerName,
          batting: {
            innings: 0,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            dismissals: 0,
            highScore: 0,
            average: 0,
            strikeRate: 0
          },
          bowling: {
            innings: 0,
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0,
            average: 0,
            strikeRate: 0,
            bestFigures: { wickets: 0, runs: 0 }
          },
          fielding: {
            catches: 0,
            runOuts: 0,
            stumpings: 0
          }
        });
      }

      const playerStats = this.playerStats.get(playerId);
      playerStats.bowling.innings += matchStats.innings;
      playerStats.bowling.overs += matchStats.balls / 6;
      playerStats.bowling.runs += matchStats.runs;
      playerStats.bowling.wickets += matchStats.wickets;

      // Update best figures (this match's wickets and runs)
      if (matchStats.wickets > playerStats.bowling.bestFigures.wickets ||
          (matchStats.wickets === playerStats.bowling.bestFigures.wickets &&
           matchStats.runs < playerStats.bowling.bestFigures.runs)) {
        playerStats.bowling.bestFigures = {
          wickets: matchStats.wickets,
          runs: matchStats.runs
        };
      }

      // Calculate economy, average, strike rate
      playerStats.bowling.economy = playerStats.bowling.overs > 0
        ? playerStats.bowling.runs / playerStats.bowling.overs
        : 0;
      playerStats.bowling.average = playerStats.bowling.wickets > 0
        ? playerStats.bowling.runs / playerStats.bowling.wickets
        : 0;
      playerStats.bowling.strikeRate = playerStats.bowling.wickets > 0
        ? (playerStats.bowling.overs * 6) / playerStats.bowling.wickets
        : 0;
    });
  }

  /**
   * Update fielding statistics
   * @param {Object} matchResult - Match result
   */
  updateFieldingStats(matchResult) {
    matchResult.ballByBallData.forEach(ball => {
      if (!ball.wicket) return;

      // Handle catches
      if (ball.dismissalType === 'caught' && ball.fielderId) {
        if (!this.playerStats.has(ball.fielderId)) {
          this.playerStats.set(ball.fielderId, this.createEmptyPlayerStats(ball.fielderId, ball.fielderName));
        }
        this.playerStats.get(ball.fielderId).fielding.catches += 1;
      }

      // Handle run outs
      if (ball.dismissalType === 'run_out' && ball.fielderId) {
        if (!this.playerStats.has(ball.fielderId)) {
          this.playerStats.set(ball.fielderId, this.createEmptyPlayerStats(ball.fielderId, ball.fielderName));
        }
        this.playerStats.get(ball.fielderId).fielding.runOuts += 1;
      }

      // Handle stumpings
      if (ball.dismissalType === 'stumped' && ball.fielderId) {
        if (!this.playerStats.has(ball.fielderId)) {
          this.playerStats.set(ball.fielderId, this.createEmptyPlayerStats(ball.fielderId, ball.fielderName));
        }
        this.playerStats.get(ball.fielderId).fielding.stumpings += 1;
      }
    });
  }

  /**
   * Create empty player stats object
   * @param {string} playerId - Player ID
   * @param {string} playerName - Player name
   * @returns {Object} Empty stats object
   */
  createEmptyPlayerStats(playerId, playerName) {
    return {
      playerId,
      playerName: playerName || playerId,
      batting: {
        innings: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissals: 0,
        highScore: 0,
        average: 0,
        strikeRate: 0
      },
      bowling: {
        innings: 0,
        overs: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        average: 0,
        strikeRate: 0,
        bestFigures: { wickets: 0, runs: 0 }
      },
      fielding: {
        catches: 0,
        runOuts: 0,
        stumpings: 0
      }
    };
  }

  /**
   * Get top run scorers
   * @param {number} limit - Number of players to return
   * @returns {Array} Top scorers
   */
  getTopScorers(limit = 10) {
    return Array.from(this.playerStats.values())
      .filter(p => p.batting.innings > 0)
      .sort((a, b) => {
        if (b.batting.runs !== a.batting.runs) {
          return b.batting.runs - a.batting.runs;
        }
        return b.batting.average - a.batting.average;
      })
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        innings: p.batting.innings,
        runs: p.batting.runs,
        highScore: p.batting.highScore,
        average: parseFloat(p.batting.average.toFixed(2)),
        strikeRate: parseFloat(p.batting.strikeRate.toFixed(2)),
        fours: p.batting.fours,
        sixes: p.batting.sixes
      }));
  }

  /**
   * Get leading wicket takers
   * @param {number} limit - Number of players to return
   * @returns {Array} Top wicket takers
   */
  getTopWicketTakers(limit = 10) {
    return Array.from(this.playerStats.values())
      .filter(p => p.bowling.innings > 0 && p.bowling.wickets > 0)
      .sort((a, b) => {
        if (b.bowling.wickets !== a.bowling.wickets) {
          return b.bowling.wickets - a.bowling.wickets;
        }
        return a.bowling.economy - b.bowling.economy;
      })
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        innings: p.bowling.innings,
        wickets: p.bowling.wickets,
        runs: p.bowling.runs,
        economy: parseFloat(p.bowling.economy.toFixed(2)),
        average: parseFloat(p.bowling.average.toFixed(2)),
        strikeRate: parseFloat(p.bowling.strikeRate.toFixed(2)),
        bestFigures: `${p.bowling.bestFigures.wickets}/${p.bowling.bestFigures.runs}`
      }));
  }

  /**
   * Get most sixes
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with most sixes
   */
  getMostSixes(limit = 10) {
    return Array.from(this.playerStats.values())
      .filter(p => p.batting.innings > 0 && p.batting.sixes > 0)
      .sort((a, b) => b.batting.sixes - a.batting.sixes)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        sixes: p.batting.sixes,
        runs: p.batting.runs,
        strikeRate: parseFloat(p.batting.strikeRate.toFixed(2))
      }));
  }

  /**
   * Get most fours
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with most fours
   */
  getMostFours(limit = 10) {
    return Array.from(this.playerStats.values())
      .filter(p => p.batting.innings > 0 && p.batting.fours > 0)
      .sort((a, b) => b.batting.fours - a.batting.fours)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        fours: p.batting.fours,
        runs: p.batting.runs
      }));
  }

  /**
   * Get best batting average (min 3 innings)
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with best average
   */
  getBestBattingAverage(limit = 10) {
    return Array.from(this.playerStats.values())
      .filter(p => p.batting.innings >= 3 && p.batting.dismissals > 0)
      .sort((a, b) => b.batting.average - a.batting.average)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        innings: p.batting.innings,
        runs: p.batting.runs,
        average: parseFloat(p.batting.average.toFixed(2)),
        strikeRate: parseFloat(p.batting.strikeRate.toFixed(2))
      }));
  }

  /**
   * Get best bowling economy (min 3 innings)
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with best economy
   */
  getBestBowlingEconomy(limit = 10) {
    return Array.from(this.playerStats.values())
      .filter(p => p.bowling.innings >= 3 && p.bowling.overs > 0)
      .sort((a, b) => a.bowling.economy - b.bowling.economy)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        innings: p.bowling.innings,
        overs: parseFloat(p.bowling.overs.toFixed(1)),
        runs: p.bowling.runs,
        wickets: p.bowling.wickets,
        economy: parseFloat(p.bowling.economy.toFixed(2))
      }));
  }

  /**
   * Get most catches
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with most catches
   */
  getMostCatches(limit = 10) {
    return Array.from(this.playerStats.values())
      .filter(p => p.fielding.catches > 0)
      .sort((a, b) => b.fielding.catches - a.fielding.catches)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        catches: p.fielding.catches
      }));
  }

  /**
   * Get all leaderboards at once
   * @param {number} limit - Number of players per leaderboard
   * @returns {Object} All leaderboards
   */
  getAllLeaderboards(limit = 10) {
    return {
      topScorers: this.getTopScorers(limit),
      topWicketTakers: this.getTopWicketTakers(limit),
      mostSixes: this.getMostSixes(limit),
      mostFours: this.getMostFours(limit),
      bestBattingAverage: this.getBestBattingAverage(limit),
      bestBowlingEconomy: this.getBestBowlingEconomy(limit),
      mostCatches: this.getMostCatches(limit)
    };
  }

  /**
   * Display leaderboards to console
   * @param {number} limit - Number of players to show per leaderboard
   */
  displayLeaderboards(limit = 10) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SEASON LEADERBOARDS');
    console.log('='.repeat(80));

    // Top Scorers
    console.log('\n🏏 TOP RUN SCORERS');
    console.log('─'.repeat(80));
    const topScorers = this.getTopScorers(limit);
    console.log('Rank  Player                    Inns  Runs   HS   Avg    SR   4s  6s');
    console.log('─'.repeat(80));
    topScorers.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${p.innings.toString().padEnd(6)}` +
        `${p.runs.toString().padEnd(7)}` +
        `${p.highScore.toString().padEnd(5)}` +
        `${p.average.toFixed(1).padEnd(7)}` +
        `${p.strikeRate.toFixed(1).padEnd(5)}` +
        `${p.fours.toString().padEnd(4)}` +
        `${p.sixes}`
      );
    });

    // Top Wicket Takers
    console.log('\n🎯 LEADING WICKET TAKERS');
    console.log('─'.repeat(80));
    const topWickets = this.getTopWicketTakers(limit);
    console.log('Rank  Player                    Inns  Wkts  Runs  Econ   Avg    SR   Best');
    console.log('─'.repeat(80));
    topWickets.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${p.innings.toString().padEnd(6)}` +
        `${p.wickets.toString().padEnd(6)}` +
        `${p.runs.toString().padEnd(6)}` +
        `${p.economy.toFixed(2).padEnd(7)}` +
        `${p.average.toFixed(1).padEnd(7)}` +
        `${p.strikeRate.toFixed(1).padEnd(5)}` +
        `${p.bestFigures}`
      );
    });

    // Most Sixes
    console.log('\n💥 MOST SIXES');
    console.log('─'.repeat(80));
    const mostSixes = this.getMostSixes(limit);
    console.log('Rank  Player                    Sixes  Runs    SR');
    console.log('─'.repeat(80));
    mostSixes.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${p.sixes.toString().padEnd(7)}` +
        `${p.runs.toString().padEnd(8)}` +
        `${p.strikeRate.toFixed(1)}`
      );
    });

    // Best Batting Average
    console.log('\n📈 BEST BATTING AVERAGE (Min 3 innings)');
    console.log('─'.repeat(80));
    const bestAverage = this.getBestBattingAverage(limit);
    console.log('Rank  Player                    Inns  Runs   Avg    SR');
    console.log('─'.repeat(80));
    bestAverage.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${p.innings.toString().padEnd(6)}` +
        `${p.runs.toString().padEnd(7)}` +
        `${p.average.toFixed(2).padEnd(7)}` +
        `${p.strikeRate.toFixed(1)}`
      );
    });

    // Best Economy
    console.log('\n🎯 BEST BOWLING ECONOMY (Min 3 innings)');
    console.log('─'.repeat(80));
    const bestEconomy = this.getBestBowlingEconomy(limit);
    console.log('Rank  Player                    Inns  Overs  Runs  Wkts  Econ');
    console.log('─'.repeat(80));
    bestEconomy.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${p.innings.toString().padEnd(6)}` +
        `${p.overs.toFixed(1).padEnd(7)}` +
        `${p.runs.toString().padEnd(6)}` +
        `${p.wickets.toString().padEnd(6)}` +
        `${p.economy.toFixed(2)}`
      );
    });

    // Most Catches
    console.log('\n🧤 MOST CATCHES');
    console.log('─'.repeat(80));
    const mostCatches = this.getMostCatches(limit);
    console.log('Rank  Player                    Catches');
    console.log('─'.repeat(80));
    mostCatches.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${p.catches}`
      );
    });

    console.log('\n' + '='.repeat(80));
  }
}

export default LeaderboardsCalculator;
