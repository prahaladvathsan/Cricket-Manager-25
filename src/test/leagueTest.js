/**
 * @file leagueTest.js
 * @description Test script for full league simulation
 * Usage: node src/test/leagueTest.js [options]
 *
 * MATCH-WEEK MODE (Default):
 *   --week-by-week    Simulate league week by week with standings after each week
 *   --weeks=N         Simulate only first N weeks (for testing)
 *   --full            Simulate complete season (18 weeks + playoffs)
 *   --playoffs        Include playoff simulation (default in full season)
 *   --leaderboards    Display player leaderboards (default in full season)
 *
 * AUCTION MODE:
 *   --auction         Use auction for player distribution (default: random)
 *   --ai-only         All teams controlled by AI in auction (default: random if no --auction)
 *   --fast-auction    Use fast auction mode (instant bidding, no delays)
 *
 * LEGACY MODE:
 *   --legacy          Use old continuous match simulation (no match weeks)
 *   --matches=N       (Legacy) Simulate only first N matches
 *   --force-playoffs  (Legacy) Simulate playoffs with current standings
 */

import fs from 'fs';
import { create } from 'zustand';
import LeagueSimulator from '../core/league/LeagueSimulator.js';
import useLeagueStore from '../stores/leagueStore.js';
import useFinanceStore from '../stores/financeStore.js';
import TransferManager from '../core/finance/TransferManager.js';

// Import teams data
const teamsData = JSON.parse(fs.readFileSync('src/data/teams/wpl-teams.json', 'utf8'));

// Import player database
const playerDb = JSON.parse(fs.readFileSync('src/data/players/master_player_database.json', 'utf8'));

// ============================================
// MOCK STORES (same pattern as interactiveMatchTest.js)
// ============================================

function createMockPlayerStore() {
  return create((set, get) => ({
    players: {},
    careerStats: {}, // V2: Career stats
    currentSeasonId: null, // V2: Current season

    initializePlayers: (playersArray) => {
      const playersMap = {};
      playersArray.forEach(player => {
        playersMap[player.id] = player;
      });
      set({ players: playersMap });
    },
    getPlayer: (id) => get().players[id] || null,

    // V2: Career stats methods
    setCurrentSeasonId: (seasonId) => {
      set({ currentSeasonId: seasonId });
    },
    initializeCareerStats: (playerId) => {
      const stats = get().careerStats;
      if (!stats[playerId]) {
        stats[playerId] = {
          cumulative: {
            totalMatches: 0,
            totalRuns: 0,
            totalBallsFaced: 0,
            careerBattingAvg: 0,
            careerStrikeRate: 0,
            totalWickets: 0,
            totalBallsBowled: 0,
            totalRunsConceded: 0,
            careerEconomy: 0,
            careerBowlingAvg: 0
          },
          seasons: {}
        };
        set({ careerStats: { ...stats } });
      }
    },
    updateCareerStats: (playerId, matchStats) => {
      // Mock implementation - just initialize if needed
      const stats = get().careerStats;
      if (!stats[playerId]) {
        get().initializeCareerStats(playerId);
      }
    },
    getCareerStats: (playerId) => {
      return get().careerStats[playerId] || null;
    }
  }));
}

function createMockTeamStore() {
  return create((set, get) => ({
    teams: {},
    squadLists: {}, // V2: Squad lists
    playerStats: {}, // V2: Team-specific player stats
    teamStats: {}, // V2: Team aggregate stats

    initializeTeams: (teamsData) => {
      const teamsMap = {};
      const squadLists = {};
      Object.values(teamsData).forEach(team => {
        teamsMap[team.id] = team;
        // Store squad list for leaderboards
        if (team.squad) {
          squadLists[team.id] = team.squad;
        }
      });
      set({ teams: teamsMap, squadLists: { ...squadLists } });
    },
    getTeam: (id) => get().teams[id] || null,

    // V2: Team stats methods
    initializeTeamStats: (teamId) => {
      const stats = get().teamStats;
      const playerStats = get().playerStats;
      stats[teamId] = {
        matches: 0,
        battingAverage: 0,
        strikeRate: 0,
        economy: 0,
        bowlingAverage: 0
      };
      playerStats[teamId] = {};
      set({ teamStats: { ...stats }, playerStats: { ...playerStats } });
    },
    getTeamStats: (teamId) => {
      return get().teamStats[teamId] || null;
    },
    getPlayerStats: (teamId, playerId) => {
      const teamPlayerStats = get().playerStats[teamId];
      return teamPlayerStats ? teamPlayerStats[playerId] || null : null;
    },
    updatePlayerStats: (teamId, playerId, stats) => {
      const playerStats = get().playerStats;
      if (!playerStats[teamId]) {
        playerStats[teamId] = {};
      }
      if (!playerStats[teamId][playerId]) {
        playerStats[teamId][playerId] = {
          matches: 0,
          runs: 0,
          ballsFaced: 0,
          dismissed: 0,
          battingAverage: 0,
          strikeRate: 0,
          wickets: 0,
          ballsBowled: 0,
          runsConceded: 0,
          economy: 0,
          bowlingAverage: 0
        };
      }

      const playerStat = playerStats[teamId][playerId];

      // Increment match count if player participated
      if (stats.ballsFaced > 0 || stats.ballsBowled > 0) {
        playerStat.matches += 1;
      }

      // Accumulate batting stats
      if (stats.runs !== undefined) playerStat.runs += stats.runs;
      if (stats.ballsFaced !== undefined) playerStat.ballsFaced += stats.ballsFaced;
      if (stats.dismissed === true) playerStat.dismissed += 1;

      // Accumulate bowling stats
      if (stats.wickets !== undefined) playerStat.wickets += stats.wickets;
      if (stats.ballsBowled !== undefined) playerStat.ballsBowled += stats.ballsBowled;
      if (stats.runsConceded !== undefined) playerStat.runsConceded += stats.runsConceded;

      // Calculate batting average (runs / dismissals)
      playerStat.battingAverage = playerStat.dismissed > 0
        ? playerStat.runs / playerStat.dismissed
        : playerStat.runs;

      // Calculate strike rate (runs per 100 balls)
      playerStat.strikeRate = playerStat.ballsFaced > 0
        ? (playerStat.runs / playerStat.ballsFaced) * 100
        : 0;

      // Calculate economy (runs per over)
      playerStat.economy = playerStat.ballsBowled > 0
        ? (playerStat.runsConceded / playerStat.ballsBowled) * 6
        : 0;

      // Calculate bowling average (runs per wicket)
      playerStat.bowlingAverage = playerStat.wickets > 0
        ? playerStat.runsConceded / playerStat.wickets
        : 0;

      set({ playerStats: { ...playerStats } });
    },
    recalculateTeamStats: (teamId) => {
      // Mock implementation - do nothing
    },
    resetPlayerStats: (playerId, teamId) => {
      const playerStats = get().playerStats;
      if (playerStats[teamId] && playerStats[teamId][playerId]) {
        delete playerStats[teamId][playerId];
        set({ playerStats: { ...playerStats } });
      }
    }
  }));
}

function createMockMatchStore() {
  return create((set, get) => ({
    matchId: null,
    status: 'scheduled',
    teams: { batting: {}, bowling: {} },
    innings: { number: 1, isComplete: false, battedPlayers: [] },
    currentBall: { over: 0, ball: 0, matchSituation: {} },
    ballByBall: [],
    matchConditions: {},
    commentary: [],
    tacticsState: {
      battingParScore: null,
      targetRunRate: 8.0,
      overTargets: [],
      accelerationMode: 'auto',
      currentAcceleration: {
        striker: 'Rotate',
        nonStriker: 'Rotate'
      },
      bowlingPlans: {},
      pressureIndex: {
        batting: 50,
        bowling: 50
      }
    },

    initializeMatch: (config) => {
      set({
        matchId: `match_${Date.now()}`,
        status: 'live',
        teams: {
          batting: {
            id: config.battingTeam.id,
            name: config.battingTeam.name,
            squad: config.battingTeam.squad,
            totalScore: 0,
            wickets: 0,
            overs: 0,
            balls: 0
          },
          bowling: {
            id: config.bowlingTeam.id,
            name: config.bowlingTeam.name,
            squad: config.bowlingTeam.squad,
            totalScore: 0,
            wickets: 0,
            overs: 0,
            balls: 0
          }
        },
        innings: {
          number: 1,
          battingTeam: config.battingTeam.id,
          bowlingTeam: config.bowlingTeam.id,
          striker: null,
          nonStriker: null,
          bowler: null,
          target: null,
          isComplete: false,
          battedPlayers: []
        },
        currentBall: {
          over: 0,
          ball: 0,
          matchSituation: {
            phase: 'powerplay',
            ballsLeft: 120,
            required: null
          }
        },
        ballByBall: [],
        matchConditions: {},
        commentary: []
      });
    },

    setOpeningBatsmen: (striker, nonStriker) => {
      set(state => {
        const battedPlayers = new Set(state.innings.battedPlayers);
        if (striker) battedPlayers.add(striker);
        if (nonStriker) battedPlayers.add(nonStriker);

        return {
          innings: {
            ...state.innings,
            striker,
            nonStriker,
            battedPlayers: Array.from(battedPlayers)
          }
        };
      });
    },

    setCurrentBowler: (bowler) => {
      set(state => ({
        innings: {
          ...state.innings,
          bowler
        }
      }));
    },

    updateTacticsState: (tacticsUpdate) => {
      set(state => ({
        tacticsState: {
          ...state.tacticsState,
          ...tacticsUpdate
        }
      }));
    },

    processBallResult: (ballResult) => {
      set(state => {
        const newBallData = {
          innings: state.innings.number,
          over: state.currentBall.over,
          ball: state.currentBall.ball + 1,
          striker: state.innings.striker,
          nonStriker: state.innings.nonStriker,
          bowler: state.innings.bowler,
          batsmanId: ballResult.batsmanId || state.innings.striker,
          bowlerId: ballResult.bowlerId || state.innings.bowler,
          strikerName: ballResult.strikerName,
          nonStrikerName: ballResult.nonStrikerName,
          bowlerName: ballResult.bowlerName,
          fielderId: ballResult.fielderId,
          fielderName: ballResult.fielderName,
          fieldingAction: ballResult.fieldingAction,
          outcome: ballResult.outcome,
          runs: ballResult.runs || 0,
          isWicket: ballResult.isWicket || false,
          dismissalType: ballResult.dismissalType,
          commentary: ballResult.commentary,
          isLegal: !['WIDE', 'NO_BALL'].includes(ballResult.outcome)
        };

        const newTeams = { ...state.teams };
        newTeams.batting.totalScore += ballResult.runs || 0;
        if (ballResult.isWicket) {
          newTeams.batting.wickets += 1;
        }

        let newBall = state.currentBall.ball;
        let newOver = state.currentBall.over;
        let newBallsLeft = state.currentBall.matchSituation.ballsLeft || 120;

        if (newBallData.isLegal) {
          newBall += 1;
          newBallsLeft -= 1;
          if (newBall === 6) {
            newBall = 0;
            newOver += 1;
          }
        }

        return {
          ...state,
          teams: newTeams,
          ballByBall: [...state.ballByBall, newBallData],
          currentBall: {
            ...state.currentBall,
            over: newOver,
            ball: newBall,
            matchSituation: {
              ...state.currentBall.matchSituation,
              ballsLeft: newBallsLeft
            }
          }
        };
      });
    },

    startSecondInnings: () => {
      const state = get();
      const target = state.teams.batting.totalScore + 1;

      set({
        innings: {
          ...state.innings,
          number: 2,
          battingTeam: state.innings.bowlingTeam,
          bowlingTeam: state.innings.battingTeam,
          target,
          isComplete: false,
          battedPlayers: []
        },
        teams: {
          batting: {
            ...state.teams.bowling,
            totalScore: 0,
            wickets: 0,
            overs: 0,
            balls: 0
          },
          bowling: state.teams.batting
        },
        currentBall: {
          over: 0,
          ball: 0,
          matchSituation: {
            phase: 'powerplay',
            ballsLeft: 120,
            required: target
          }
        },
        status: 'live'
      });
    },

    completeMatch: (result) => {
      set({ status: 'completed' });
    },

    getCurrentSituation: () => {
      const state = get();
      return {
        score: `${state.teams.batting.totalScore}/${state.teams.batting.wickets}`,
        overs: state.currentBall.over,
        balls: state.currentBall.ball
      };
    },

    resetMatch: () => set({
      matchId: null,
      status: 'scheduled',
      teams: { batting: {}, bowling: {} },
      innings: { number: 1, isComplete: false, battedPlayers: [] },
      currentBall: { over: 0, ball: 0, matchSituation: {} },
      ballByBall: [],
      matchConditions: {},
      commentary: [],
      tacticsState: {
        battingParScore: null,
        targetRunRate: 8.0,
        overTargets: [],
        accelerationMode: 'auto',
        currentAcceleration: {
          striker: 'Rotate',
          nonStriker: 'Rotate'
        },
        bowlingPlans: {},
        pressureIndex: {
          batting: 50,
          bowling: 50
        }
      }
    })
  }));
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

async function runLeagueTest() {
  console.log('\n🏏 WORLD PREMIER LEAGUE - FULL SEASON SIMULATION');
  console.log('='.repeat(80));
  console.log('💡 TIP: Use --auction flag to enable auction-based squad distribution');
  console.log('💡 TIP: Use --auction --ai-only for fully automated auction');
  console.log('='.repeat(80) + '\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let matchLimit = null;
  let weekLimit = null;
  let fullSeason = false;
  let includePlayoffs = false;
  let forcePlayoffs = false;
  let showLeaderboards = false;
  let weekByWeek = false;
  let useLegacyMode = false;
  let useAuction = false;
  let auctionAIOnly = false;
  let fastAuction = false;

  args.forEach(arg => {
    if (arg.startsWith('--matches=')) {
      matchLimit = parseInt(arg.split('=')[1]);
      useLegacyMode = true;
    }
    if (arg.startsWith('--weeks=')) {
      weekLimit = parseInt(arg.split('=')[1]);
      weekByWeek = true;
    }
    if (arg === '--full') {
      fullSeason = true;
    }
    if (arg === '--playoffs') {
      includePlayoffs = true;
    }
    if (arg === '--force-playoffs') {
      forcePlayoffs = true;
      includePlayoffs = true;
      useLegacyMode = true;
    }
    if (arg === '--leaderboards') {
      showLeaderboards = true;
    }
    if (arg === '--week-by-week') {
      weekByWeek = true;
    }
    if (arg === '--legacy') {
      useLegacyMode = true;
    }
    if (arg === '--auction') {
      useAuction = true;
    }
    if (arg === '--ai-only') {
      auctionAIOnly = true;
    }
    if (arg === '--fast-auction') {
      fastAuction = true;
    }
  });

  // Default to week-by-week mode unless legacy is specified
  if (!useLegacyMode && !weekByWeek) {
    weekByWeek = true;
  }

  // In week-by-week mode, default to showing playoffs and leaderboards in full season
  if (weekByWeek && fullSeason) {
    includePlayoffs = true;
    showLeaderboards = true;
  }

  // Create stores
  const playerStore = createMockPlayerStore();
  const teamStore = createMockTeamStore();
  const matchStore = createMockMatchStore();
  const leagueStore = useLeagueStore;
  const financeStore = useFinanceStore;

  // Create transfer manager (for finance + transfer integration)
  const transferManager = new TransferManager(financeStore);

  // Create league simulator with finance + transfer integration
  const leagueSimulator = new LeagueSimulator(
    leagueStore,
    playerStore,
    teamStore,
    matchStore,
    financeStore,      // Finance tracking enabled
    transferManager    // Transfer system enabled
  );

  try {
    // Prepare teams data with user control flag if auction mode
    let preparedClubs = teamsData;
    if (useAuction && !auctionAIOnly) {
      // Mark Chennai Cobras as user-controlled
      preparedClubs = teamsData.map(team => ({
        ...team,
        isUserControlled: team.id === 't_chennai'
      }));
      console.log('\n🎮 AUCTION MODE: You will control Chennai Cobras');
      console.log('   Other teams will be controlled by AI\n');
    } else if (useAuction && auctionAIOnly) {
      console.log('\n🤖 AUCTION MODE (AI-ONLY): All teams controlled by AI\n');
    }

    if (fastAuction && useAuction) {
      console.log('⚡ FAST AUCTION MODE: Instant bidding (no delays)\n');
    }

    // Initialize league
    const initResult = await leagueSimulator.initializeLeague({
      clubsData: preparedClubs,
      playersData: playerDb.players,
      seasonName: 'WPL 2025 Season 1',
      useMatchWeeks: weekByWeek,
      seasonStartDate: new Date('2025-02-01'), // Start on a Saturday
      useAuction,
      fastAuction,
      userBidCallback: null // TODO: Add interactive callback for user-controlled auction
    });

    if (weekByWeek) {
      console.log(`\n✅ League initialized with ${initResult.clubs.length} clubs`);
      console.log(`   ${initResult.matchWeeks.length} match weeks scheduled`);
      console.log(`   ${initResult.fixtures.length} total fixtures\n`);
    } else {
      console.log(`\n✅ League initialized with ${initResult.clubs.length} clubs and ${initResult.fixtures.length} fixtures\n`);
    }

    let seasonResult;

    // WEEK-BY-WEEK MODE
    if (weekByWeek) {
      const simOptions = {
        showProgress: true,
        pauseAfterWeeks: weekLimit,
        includePlayoffs,
        showLeaderboards
      };

      if (weekLimit && !fullSeason) {
        console.log(`\n⚠️  TEST MODE: Simulating only first ${weekLimit} weeks\n`);
      } else if (fullSeason) {
        console.log(`\n🏁 FULL SEASON MODE: Simulating all 18 weeks + playoffs\n`);
        console.log(`🏆 PLAYOFFS ENABLED: Will simulate knockout stage after league`);
        console.log(`📊 LEADERBOARDS ENABLED: Will display player statistics\n`);
      } else {
        console.log(`\n⚠️  QUICK TEST: Simulating first 3 weeks (use --full for complete season)\n`);
        simOptions.pauseAfterWeeks = 3;
      }

      seasonResult = await leagueSimulator.simulateByMatchWeek(simOptions);
    }
    // LEGACY MODE
    else {
      const simOptions = {
        showProgress: true,
        showStandingsAfterEvery: fullSeason ? 10 : 5,
        pauseAfter: matchLimit
      };

      if (matchLimit && !fullSeason) {
        console.log(`\n⚠️  TEST MODE: Simulating only first ${matchLimit} matches\n`);
      } else if (fullSeason) {
        console.log(`\n🏁 FULL SEASON MODE: Simulating all 90 matches\n`);
      } else {
        console.log(`\n⚠️  QUICK TEST: Simulating first 5 matches (use --full for complete season)\n`);
        simOptions.pauseAfter = 5;
      }

      if (includePlayoffs && !forcePlayoffs && !fullSeason && matchLimit !== 90) {
        console.log(`\n⚠️  WARNING: Playoffs require full 90-match season. Use --full or --force-playoffs\n`);
        includePlayoffs = false;
      }

      if (includePlayoffs) {
        console.log(`\n🏆 PLAYOFFS ENABLED: Will simulate knockout stage after league\n`);
      }

      if (showLeaderboards) {
        console.log(`\n📊 LEADERBOARDS ENABLED: Will display player statistics\n`);
      }

      // Use simulateFullSeason if playoffs or leaderboards are requested
      if (includePlayoffs || showLeaderboards) {
        seasonResult = await leagueSimulator.simulateFullSeason({
          ...simOptions,
          includePlayoffs,
          showLeaderboards
        });
      } else {
        seasonResult = await leagueSimulator.simulateFullLeague(simOptions);
      }
    }

    // Display financial summary if finance tracking was enabled
    if (financeStore && financeStore.getState().initialized) {
      console.log('\n' + '='.repeat(80));
      console.log('💰 FINANCIAL SUMMARY');
      console.log('='.repeat(80));

      const financialSummary = financeStore.getState().getFinancialSummary();
      console.log(`Total Budget: $${(financialSummary.totalBudget / 1000000).toFixed(2)}M`);
      console.log(`Total Revenue: $${(financialSummary.totalRevenue / 1000000).toFixed(2)}M`);
      console.log(`Total Expenses: $${(financialSummary.totalExpenses / 1000000).toFixed(2)}M`);
      console.log(`Total Transactions: ${financialSummary.totalTransactions}`);

      // Show transfer activity if transfers happened
      if (transferManager) {
        const transfers = transferManager.getCompletedTransfers();
        if (transfers.length > 0) {
          console.log(`\n🔄 Completed Transfers: ${transfers.length}`);
          const totalTransferValue = transfers.reduce((sum, t) => sum + t.totalCost, 0);
          console.log(`   Total Transfer Value: $${(totalTransferValue / 1000000).toFixed(2)}M`);
        }
      }

      console.log('='.repeat(80) + '\n');
    }

    // Display final results
    console.log('\n' + '='.repeat(80));
    console.log('📈 SEASON SUMMARY');
    console.log('='.repeat(80));

    if (weekByWeek) {
      // Week-by-week mode
      console.log(`Match weeks completed: ${seasonResult.weeksCompleted}`);
      console.log(`Total matches played: ${seasonResult.matchesPlayed}`);
      console.log(`Total time: ${seasonResult.duration}s`);
      console.log(`Avg time per match: ${(seasonResult.duration / seasonResult.matchesPlayed).toFixed(2)}s`);

      if (seasonResult.playoffs) {
        console.log(`\nPlayoff matches: 4`);
        console.log(`🏆 CHAMPION: ${seasonResult.champion.championName}`);
        console.log(`   Runner-up: ${seasonResult.champion.runnerUpName}`);
        console.log(`   Final margin: ${seasonResult.champion.margin}`);
      }
    } else if (seasonResult.league) {
      // Full season with playoffs/leaderboards (legacy mode)
      console.log(`League matches: ${seasonResult.league.matchesPlayed}`);
      console.log(`League time: ${seasonResult.league.duration}s`);

      if (seasonResult.playoffs) {
        console.log(`Playoff matches: 4`);
        console.log(`\n🏆 CHAMPION: ${seasonResult.champion.championName}`);
        console.log(`   Runner-up: ${seasonResult.champion.runnerUpName}`);
        console.log(`   Final margin: ${seasonResult.champion.margin}`);
      }
    } else {
      // League only (legacy mode)
      console.log(`Matches played: ${seasonResult.matchesPlayed}`);
      console.log(`Total time: ${seasonResult.duration}s`);
      console.log(`Avg time per match: ${(seasonResult.duration / seasonResult.matchesPlayed).toFixed(2)}s`);
    }

    console.log('='.repeat(80) + '\n');

    // Export league data
    const exportFilename = `league_results_${Date.now()}.json`;
    leagueSimulator.exportLeagueData(exportFilename);

    console.log('\n✅ League test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during league test:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runLeagueTest().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
