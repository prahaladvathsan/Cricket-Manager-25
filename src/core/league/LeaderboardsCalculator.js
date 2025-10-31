/**
 * @file LeaderboardsCalculator.js
 * @description Transfer System V2 - Pure collation layer for leaderboards
 * Collates player stats from teamStore instead of tracking internally
 * Stats are reset on transfer, so leaderboards show current team performance
 */

class LeaderboardsCalculator {
  constructor(teamStore, playerStore = null, leagueStore = null) {
    this.teamStore = teamStore;
    this.playerStore = playerStore; // V2: For looking up player names
    this.leagueStore = leagueStore; // V3: For looking up team names
  }

  /**
   * Get all player stats by collating from team stores
   * @returns {Array} Array of player stats with teamId
   */
  getAllPlayerStats() {
    const allPlayerStats = [];

    if (!this.teamStore) {
      return allPlayerStats;
    }

    const state = this.teamStore.getState();

    // Iterate through playerStats directly instead of teams
    // (teams only contains the last two teams from the most recent match)
    const playerStats = state.playerStats || {};

    Object.entries(playerStats).forEach(([teamId, teamPlayerStats]) => {
      Object.entries(teamPlayerStats).forEach(([playerId, stats]) => {
        // Get player name - try playerStore first, then squad
        let playerName = playerId; // Default to ID if not found

        if (this.playerStore) {
          // Try playerStore lookup first (most reliable)
          const player = this.playerStore.getState().getPlayer(playerId);
          if (player?.name) {
            playerName = player.name;
          }
        }

        // Fall back to squad list if playerStore didn't work
        if (playerName === playerId) {
          const squadList = state.squadLists?.[teamId] || [];
          const squadPlayer = squadList.find(p => p.id === playerId);
          if (squadPlayer?.name) {
            playerName = squadPlayer.name;
          }
        }

        // Get team name from leagueStore
        let teamName = teamId; // Default to team ID
        if (this.leagueStore) {
          const clubs = this.leagueStore.getState().clubs || {};
          const club = clubs[teamId];
          if (club?.name) {
            teamName = club.name;
          }
        }

        allPlayerStats.push({
          playerId,
          playerName,
          teamId,
          teamName,
          ...stats
        });
      });
    });

    return allPlayerStats;
  }

  /**
   * Get top run scorers
   * @param {number} limit - Number of players to return
   * @returns {Array} Top scorers
   */
  getTopScorers(limit = 10) {
    const allStats = this.getAllPlayerStats();

    return allStats
      .filter(p => p.runs > 0)
      .sort((a, b) => {
        if (b.runs !== a.runs) {
          return b.runs - a.runs;
        }
        return b.battingAverage - a.battingAverage;
      })
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        matches: p.matches || 0,
        runs: p.runs || 0,
        average: parseFloat((p.battingAverage || 0).toFixed(2)),
        strikeRate: parseFloat((p.strikeRate || 0).toFixed(2))
      }));
  }

  /**
   * Get leading wicket takers
   * @param {number} limit - Number of players to return
   * @returns {Array} Top wicket takers
   */
  getTopWicketTakers(limit = 10) {
    const allStats = this.getAllPlayerStats();

    return allStats
      .filter(p => p.wickets > 0)
      .sort((a, b) => {
        if (b.wickets !== a.wickets) {
          return b.wickets - a.wickets;
        }
        return a.economy - b.economy;
      })
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        matches: p.matches || 0,
        wickets: p.wickets || 0,
        economy: parseFloat((p.economy || 0).toFixed(2)),
        average: parseFloat((p.bowlingAverage || 0).toFixed(2))
      }));
  }

  /**
   * Get best batting average
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with best average
   */
  getBestBattingAverage(limit = 10) {
    const allStats = this.getAllPlayerStats();

    return allStats
      .filter(p => p.battingAverage > 0)
      .sort((a, b) => b.battingAverage - a.battingAverage)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        matches: p.matches || 0,
        runs: p.runs || 0,
        average: parseFloat((p.battingAverage || 0).toFixed(2)),
        strikeRate: parseFloat((p.strikeRate || 0).toFixed(2))
      }));
  }

  /**
   * Get best bowling economy
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with best economy
   */
  getBestBowlingEconomy(limit = 10) {
    const allStats = this.getAllPlayerStats();

    return allStats
      .filter(p => p.economy > 0)
      .sort((a, b) => a.economy - b.economy)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        matches: p.matches || 0,
        wickets: p.wickets || 0,
        economy: parseFloat((p.economy || 0).toFixed(2)),
        average: parseFloat((p.bowlingAverage || 0).toFixed(2))
      }));
  }

  /**
   * Get best batting strike rate
   * @param {number} limit - Number of players to return
   * @returns {Array} Players with best strike rate
   */
  getBestStrikeRate(limit = 10) {
    const allStats = this.getAllPlayerStats();

    return allStats
      .filter(p => p.strikeRate > 0)
      .sort((a, b) => b.strikeRate - a.strikeRate)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        matches: p.matches || 0,
        runs: p.runs || 0,
        average: parseFloat((p.battingAverage || 0).toFixed(2)),
        strikeRate: parseFloat((p.strikeRate || 0).toFixed(2))
      }));
  }

  /**
   * Get all leaderboards at once
   * @param {number} limit - Number of players per leaderboard
   * @returns {Object} All leaderboards
   */
  getAllLeaderboards(limit = 10) {
    return {
      batting: this.getTopScorers(50), // Return more for transfer AI usage
      bowling: this.getTopWicketTakers(50), // Return more for transfer AI usage
      topScorers: this.getTopScorers(limit),
      topWicketTakers: this.getTopWicketTakers(limit),
      bestBattingAverage: this.getBestBattingAverage(limit),
      bestBowlingEconomy: this.getBestBowlingEconomy(limit),
      bestStrikeRate: this.getBestStrikeRate(limit)
    };
  }

  /**
   * Display leaderboards to console
   * @param {number} limit - Number of players to show per leaderboard
   */
  displayLeaderboards(limit = 10) {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SEASON LEADERBOARDS');
    console.log('═'.repeat(80));

    // Top Scorers
    console.log('\n🏏 TOP RUN SCORERS');
    console.log('─'.repeat(80));
    const topScorers = this.getTopScorers(limit);
    console.log('Rank  Player                    Team         Matches  Runs   Avg    SR');
    console.log('─'.repeat(80));
    topScorers.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${(p.teamName || p.teamId || '').substring(0, 12).padEnd(13)}` +
        `${p.matches.toString().padEnd(9)}` +
        `${p.runs.toString().padEnd(7)}` +
        `${p.average.toFixed(1).padEnd(7)}` +
        `${p.strikeRate.toFixed(1)}`
      );
    });

    // Top Wicket Takers
    console.log('\n🎯 LEADING WICKET TAKERS');
    console.log('─'.repeat(80));
    const topWickets = this.getTopWicketTakers(limit);
    console.log('Rank  Player                    Team         Matches  Wkts  Econ   Avg');
    console.log('─'.repeat(80));
    topWickets.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${(p.teamName || p.teamId || '').substring(0, 12).padEnd(13)}` +
        `${p.matches.toString().padEnd(9)}` +
        `${p.wickets.toString().padEnd(6)}` +
        `${p.economy.toFixed(2).padEnd(7)}` +
        `${p.average.toFixed(1)}`
      );
    });

    // Best Batting Average
    console.log('\n📈 BEST BATTING AVERAGE');
    console.log('─'.repeat(80));
    const bestAverage = this.getBestBattingAverage(limit);
    console.log('Rank  Player                    Team         Matches  Runs   Avg    SR');
    console.log('─'.repeat(80));
    bestAverage.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${(p.teamName || p.teamId || '').substring(0, 12).padEnd(13)}` +
        `${p.matches.toString().padEnd(9)}` +
        `${p.runs.toString().padEnd(7)}` +
        `${p.average.toFixed(2).padEnd(7)}` +
        `${p.strikeRate.toFixed(1)}`
      );
    });

    // Best Economy
    console.log('\n🎯 BEST BOWLING ECONOMY');
    console.log('─'.repeat(80));
    const bestEconomy = this.getBestBowlingEconomy(limit);
    console.log('Rank  Player                    Team         Matches  Wkts  Econ   Avg');
    console.log('─'.repeat(80));
    bestEconomy.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${(p.teamName || p.teamId || '').substring(0, 12).padEnd(13)}` +
        `${p.matches.toString().padEnd(9)}` +
        `${p.wickets.toString().padEnd(6)}` +
        `${p.economy.toFixed(2).padEnd(7)}` +
        `${p.average.toFixed(1)}`
      );
    });

    // Best Strike Rate
    console.log('\n💥 BEST STRIKE RATE');
    console.log('─'.repeat(80));
    const bestSR = this.getBestStrikeRate(limit);
    console.log('Rank  Player                    Team         Matches  Runs   Avg    SR');
    console.log('─'.repeat(80));
    bestSR.forEach(p => {
      console.log(
        `${p.rank.toString().padEnd(6)}` +
        `${p.playerName.substring(0, 24).padEnd(26)}` +
        `${(p.teamName || p.teamId || '').substring(0, 12).padEnd(13)}` +
        `${p.matches.toString().padEnd(9)}` +
        `${p.runs.toString().padEnd(7)}` +
        `${p.average.toFixed(1).padEnd(7)}` +
        `${p.strikeRate.toFixed(1)}`
      );
    });

    console.log('\n' + '═'.repeat(80));
  }
}

export default LeaderboardsCalculator;
