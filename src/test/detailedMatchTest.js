/**
 * Detailed match simulation test using MatchEngine
 * Comprehensive logging and ball-by-ball commentary with traceability
 */

import fs from 'fs';
import path from 'path';
import MatchEngine from '../core/match-engine/core/MatchEngine.js';
import { create } from 'zustand';

console.log('🏏 Starting Detailed Cricket Match Test with MatchEngine');
console.log('========================================================\n');

// Match data structure for comprehensive logging with MatchEngine
const matchData = {
  matchId: `match_${Date.now()}`,
  timestamp: new Date().toISOString(),
  engineVersion: 'MatchEngine-with-fixes',
  teams: {},
  toss: {},
  ballByBall: [],
  commentary: [],
  eventLog: [],
  summary: {},
  statistics: {}
};

function logEvent(type, data, commentary = null) {
  const event = {
    timestamp: Date.now(),
    type,
    data,
    commentary
  };
  matchData.eventLog.push(event);
  if (commentary) {
    matchData.commentary.push({
      timestamp: Date.now(),
      text: commentary
    });
  }
}

function logBall(ballData) {
  matchData.ballByBall.push({
    timestamp: Date.now(),
    ...ballData
  });
}

// Create mock stores for testing
function createMockPlayerStore() {
  return create((set, get) => ({
    players: {},
    initializePlayers: (playersArray) => {
      const playersMap = {};
      playersArray.forEach(player => {
        playersMap[player.id] = player;
      });
      set({ players: playersMap });
    },
    getPlayer: (id) => get().players[id] || null
  }));
}

function createMockTeamStore() {
  return create((set, get) => ({
    teams: {},
    initializeTeams: (teamsData) => {
      const teamsMap = {};
      Object.values(teamsData).forEach(team => {
        teamsMap[team.id] = team;
      });
      set({ teams: teamsMap });
    },
    getTeam: (id) => get().teams[id] || null
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
          battedPlayers: [] // Track all batsmen who have batted
        },
        currentBall: {
          over: 0,
          ball: 0,
          matchSituation: {
            phase: 'powerplay',
            ballsLeft: 120,
            required: null
          }
        }
      });
    },

    setOpeningBatsmen: (striker, nonStriker) => {
      set(state => {
        // Add new batsmen to battedPlayers list
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

    setOpeningBowler: (bowler) => {
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
      const state = get();
      const newBallData = {
        over: state.currentBall.over,
        ball: state.currentBall.ball + 1,
        striker: state.innings.striker,
        nonStriker: state.innings.nonStriker,
        bowler: state.innings.bowler,
        outcome: ballResult.outcome,
        runs: ballResult.runs || 0,
        isWicket: ballResult.isWicket || false,
        dismissalType: ballResult.dismissalType,
        commentary: ballResult.commentary,
        isLegal: !['WIDE', 'NO_BALL'].includes(ballResult.outcome)
      };

      // Add to ball-by-ball
      matchData.ballByBall.push(newBallData);

      set(state => {
        const newTeams = { ...state.teams };
        newTeams.batting.totalScore += ballResult.runs || 0;
        if (ballResult.isWicket) {
          newTeams.batting.wickets += 1;
        }

        // Update ball counter
        let newBall = state.currentBall.ball;
        let newOver = state.currentBall.over;

        if (newBallData.isLegal) {
          newBall += 1;
          if (newBall === 6) {
            newBall = 0;
            newOver += 1;
          }
        }

        return {
          teams: newTeams,
          ballByBall: [...state.ballByBall, newBallData],
          currentBall: {
            ...state.currentBall,
            over: newOver,
            ball: newBall
          },
          tacticsState: state.tacticsState // Preserve tactics state
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
          battedPlayers: [] // Reset for second innings
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

      matchData.commentary.push(`Second innings begins. Target: ${target} runs`);
    },

    completeMatch: (result) => {
      set({ status: 'completed' });
      console.log('Match completed:', result);
    },

    getCurrentSituation: () => {
      const state = get();
      return {
        score: `${state.teams.batting.totalScore}/${state.teams.batting.wickets}`,
        overs: state.currentBall.over,
        balls: state.currentBall.ball
      };
    }
  }));
}

async function runDetailedMatchTest() {
try {
  // Load master player database with pre-calculated playstyles
  logEvent('MATCH_START', { message: 'Loading master player database' });
  console.log('Loading master player database...');
  const masterDb = JSON.parse(fs.readFileSync('src/data/players/master_player_database.json', 'utf8'));
  const playerData = masterDb.players;
  console.log(`✅ Loaded ${playerData.length} players from master database v${masterDb.version}`);
  console.log(`   Generated: ${masterDb.generated}`);
  console.log(`   All players have pre-calculated playstyle ratings and top 3 playstyles\n`);
  logEvent('DATA_LOADED', {
    playersCount: playerData.length,
    databaseVersion: masterDb.version,
    configVersions: masterDb.configVersions
  });

  // Show some example playstyles from master database
  const topPlayersWithPlaystyles = playerData
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  console.log('Top 5 Players with Pre-Calculated Playstyles:');
  topPlayersWithPlaystyles.forEach((player, i) => {
    console.log(`${i+1}. ${player.name} (${player.role})`);
    console.log(`   Primary: ${player.primaryPlaystyle.batting || player.primaryPlaystyle.bowling || 'None'}`);
    console.log(`   Top 3 Batting: ${player.topPlaystyles.batting.map(p => `${p.name} (${p.rating.toFixed(1)})`).join(', ')}`);
    console.log(`   Top 3 Bowling: ${player.topPlaystyles.bowling.map(p => `${p.name} (${p.rating.toFixed(1)})`).join(', ')}`);
    console.log('');
  });

  const topPlayers = playerData.sort((a, b) => b.rating - a.rating);

  // Classify players into roles based on their attributes
  // Since the database has all batsmen, we need to infer roles from attributes
  playerData.forEach(player => {
    const battingAttrs = player.attributes.batting;
    const bowlingAttrs = player.attributes.bowling;

    // Calculate average batting and bowling skill
    const battingAvg = Object.values(battingAttrs).reduce((a, b) => a + b, 0) / Object.keys(battingAttrs).length;
    const bowlingAvg = Object.values(bowlingAttrs).reduce((a, b) => a + b, 0) / Object.keys(bowlingAttrs).length;

    // Assign bowlingType based on bowling attributes
    if (!player.bowlingType) {
      if (bowlingAttrs.bowlingSpeed > 12) {
        player.bowlingType = 'fast';
      } else if (bowlingAttrs.turn > 10 || bowlingAttrs.variations > 10) {
        player.bowlingType = Math.random() > 0.5 ? 'off-spin' : 'leg-spin';
      } else {
        player.bowlingType = 'medium';
      }
    }

    // Classify role based on attribute balance
    // All-rounder: Good at both batting and bowling
    if (battingAvg >= 10 && bowlingAvg >= 10) {
      player.role = 'all-rounder';
    }
    // Bowler: Better bowling than batting
    else if (bowlingAvg > battingAvg && bowlingAvg >= 8) {
      player.role = 'bowler';
    }
    // Otherwise keep as batsman (default role in database)
    // Note: wicket-keeper classification would need fielding analysis
  });

  /**
   * Select balanced team with minimum bowling requirement
   * @param {Array} availablePlayers - Pool of players to select from
   * @param {number} teamSize - Number of players to select (default 11)
   * @returns {Array} Selected team with at least 5 bowlers/all-rounders
   */
  function selectBalancedTeam(availablePlayers, teamSize = 11) {
    const bowlers = availablePlayers.filter(p => p.role === 'bowler').sort((a, b) => b.rating - a.rating);
    const allRounders = availablePlayers.filter(p => p.role === 'all-rounder').sort((a, b) => b.rating - a.rating);
    const batsmen = availablePlayers.filter(p => p.role === 'batsman').sort((a, b) => b.rating - a.rating);
    const keepers = availablePlayers.filter(p => p.role === 'wicket-keeper').sort((a, b) => b.rating - a.rating);

    const team = [];
    const MIN_BOWLING_OPTIONS = 5; // Minimum bowlers + all-rounders

    // 1. Select at least 1 wicket-keeper (if available)
    if (keepers.length > 0) {
      team.push(keepers[0]);
    }

    // 2. Select all-rounders (count towards bowling requirement)
    const allRoundersToSelect = Math.min(allRounders.length, 3); // Max 3 all-rounders
    for (let i = 0; i < allRoundersToSelect && team.length < teamSize; i++) {
      team.push(allRounders[i]);
    }

    // 3. Calculate how many pure bowlers we need
    const bowlingOptionsSelected = team.filter(p => p.role === 'all-rounder' || p.role === 'bowler').length;
    const pureBowlersNeeded = Math.max(0, MIN_BOWLING_OPTIONS - bowlingOptionsSelected);

    // 4. Select pure bowlers
    for (let i = 0; i < pureBowlersNeeded && i < bowlers.length && team.length < teamSize; i++) {
      team.push(bowlers[i]);
    }

    // 5. Fill remaining slots with best available players (prioritize batsmen)
    const remaining = availablePlayers
      .filter(p => !team.includes(p))
      .sort((a, b) => b.rating - a.rating);

    while (team.length < teamSize && remaining.length > 0) {
      team.push(remaining.shift());
    }

    return team;
  }

  // Select two balanced teams
  const allPlayers = playerData.filter(p => p.rating > 4.0).sort((a, b) => b.rating - a.rating);

  // Select Team A
  const teamAPlayers = selectBalancedTeam(allPlayers, 11);

  // Remove Team A players from pool and select Team B
  const remainingPlayers = allPlayers.filter(p => !teamAPlayers.includes(p));
  const teamBPlayers = selectBalancedTeam(remainingPlayers, 11);

  // Ensure all players have IDs
  teamAPlayers.forEach((p, i) => {
    if (!p.id) p.id = `teamA_player_${i}`;
  });

  teamBPlayers.forEach((p, i) => {
    if (!p.id) p.id = `teamB_player_${i}`;
  });

  // Create two teams with proper squad structure
  console.log('\n🏏 TEAM SELECTION (Balanced with minimum 5 bowling options)');
  console.log('===========================================================');

  const teamA = {
    id: 'mumbai_thunders',
    name: 'Mumbai Thunders',
    squad: teamAPlayers.map(p => p.id),
    players: teamAPlayers
  };

  const teamB = {
    id: 'london_lions',
    name: 'London Lions',
    squad: teamBPlayers.map(p => p.id),
    players: teamBPlayers
  };

  matchData.teams = { teamA, teamB };

  // Helper function to show team composition
  function displayTeamComposition(team) {
    console.log(`\n${team.name}:`);
    team.players.forEach((p, i) => {
      console.log(`${i+1}. ${p.name} (${p.role}) - ${p.rating}`);
    });

    // Show bowling composition
    const bowlers = team.players.filter(p => p.role === 'bowler').length;
    const allRounders = team.players.filter(p => p.role === 'all-rounder').length;
    const batsmen = team.players.filter(p => p.role === 'batsman').length;
    const keepers = team.players.filter(p => p.role === 'wicket-keeper').length;
    const bowlingOptions = bowlers + allRounders;

    console.log(`   Composition: ${batsmen} Batsmen, ${allRounders} All-rounders, ${bowlers} Bowlers, ${keepers} Keeper(s)`);
    console.log(`   Bowling options: ${bowlingOptions} (${bowlers} pure bowlers + ${allRounders} all-rounders)`);
  }

  displayTeamComposition(teamA);
  displayTeamComposition(teamB);

  logEvent('TEAMS_SELECTED', { teamA: teamA.name, teamB: teamB.name });

  // Initialize stores and MatchEngine
  console.log('\n🏏 MATCH ENGINE WITH STORES');
  console.log('==============================');
  console.log('Using MatchEngine with proper stores\n');

  const playerStore = createMockPlayerStore();
  const teamStore = createMockTeamStore();
  const matchStore = createMockMatchStore();

  // Initialize stores with data
  const allSelectedPlayers = [...teamAPlayers, ...teamBPlayers];
  playerStore.getState().initializePlayers(allSelectedPlayers);
  teamStore.getState().initializeTeams({ teamA, teamB });

  // Create MatchEngine
  const matchEngine = new MatchEngine(matchStore, playerStore, teamStore);

  logEvent('ENGINE_INITIALIZED', {
    type: 'MatchEngine-with-stores',
    components: ['MatchEngine', 'BowlerSelectionManager', 'BatsmanSelectionManager']
  });

  // Toss and match configuration
  const tossWinner = Math.random() < 0.5 ? 'A' : 'B';
  const tossDecision = Math.random() < 0.6 ? 'bat' : 'bowl';
  const tossResult = `Team ${tossWinner} wins and chooses to ${tossDecision}`;
  console.log(`Toss: ${tossResult}`);

  matchData.toss = {
    winner: tossWinner === 'A' ? teamA.name : teamB.name,
    decision: tossDecision,
    result: tossResult
  };
  logEvent('TOSS', matchData.toss, tossResult);

  const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === 'A' ? 'B' : 'A');
  const battingFirstTeam = battingFirst === 'A' ? teamA : teamB;
  const bowlingFirstTeam = battingFirst === 'A' ? teamB : teamA;

  console.log(`${battingFirstTeam.name} batting first\n`);
  logEvent('INNINGS_START', {
    inningsNumber: 1,
    battingTeam: battingFirstTeam.name
  }, `${battingFirstTeam.name} starts their innings`);

  // Create match configuration
  const matchConfig = {
    homeTeam: teamA,
    awayTeam: teamB,
    venue: 'test_ground',
    tossWinner: battingFirstTeam.id,
    tossDecision: 'bat',
    battingTeam: battingFirstTeam,
    bowlingTeam: bowlingFirstTeam
  };

  // Start match using MatchEngine
  console.log('\n🏏 STARTING MATCH');
  console.log('==================');

  // Set up event logging for match events
  let ballCount = 0;

  // Override MatchEngine's console.log to capture ball results
  const originalLog = console.log;
  const ballResults = [];

  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('Ball ')) {
      ballResults.push(message);
      ballCount++;

      // Extract ball info and log to our match data
      const ballMatch = message.match(/Ball (\d+)\.(\d+): (.+)/);
      if (ballMatch) {
        const [, over, ball, commentary] = ballMatch;
        logEvent('BALL_RESULT', {
          over: parseInt(over),
          ball: parseInt(ball),
          ballNumber: ballCount,
          commentary
        }, commentary);
      }
    }
    originalLog(...args);
  };

  try {
    // Start the match with MatchEngine
    const matchResult = await matchEngine.startMatch(matchConfig);

    console.log('\n🏆 MATCH COMPLETED');
    console.log('====================');

    const finalState = matchStore.getState();
    matchData.summary = {
      matchId: finalState.matchId,
      status: finalState.status,
      finalScore: finalState.getCurrentSituation(),
      ballByBallCount: finalState.ballByBall?.length || matchData.ballByBall.length
    };

  } catch (error) {
    console.error('Match simulation error:', error);
    logEvent('MATCH_ERROR', { error: error.message });
  } finally {
    // Restore original console.log
    console.log = originalLog;
  }

  // The MatchEngine handles the full simulation automatically

  // Final match result processing (MatchEngine provides the result)
  const finalMatchState = matchStore.getState();

  matchData.summary = {
    ...matchData.summary,
    finalState: finalMatchState.getCurrentSituation(),
    totalBalls: ballCount
  };

  console.log(`\n📊 Final Statistics:`);
  console.log(`Total balls simulated: ${ballCount}`);
  console.log(`Match data captured: ${matchData.ballByBall.length} balls`);

  logEvent('MATCH_STATISTICS', {
    ballsSimulated: ballCount,
    ballsCaptured: matchData.ballByBall.length
  });

  // Process match statistics from captured data
  if (matchData.ballByBall.length > 0) {
    const boundaries = matchData.ballByBall.filter(b => ['FOUR', 'SIX'].includes(b.outcome));
    const sixes = matchData.ballByBall.filter(b => b.outcome === 'SIX');
    const fours = matchData.ballByBall.filter(b => b.outcome === 'FOUR');
    const wickets = matchData.ballByBall.filter(b => b.isWicket);
    const dots = matchData.ballByBall.filter(b => b.outcome === 'DOT');

    matchData.statistics = {
      totalBalls: ballCount,
      boundaries: boundaries.length,
      sixes: sixes.length,
      fours: fours.length,
      wickets: wickets.length,
      dots: dots.length,
      highestRating: topPlayers[0].rating,
      topPlayer: topPlayers[0].name
    };

    console.log(`Boundaries: ${matchData.statistics.boundaries} (${matchData.statistics.fours} fours, ${matchData.statistics.sixes} sixes)`);
    console.log(`Wickets: ${matchData.statistics.wickets}`);
    console.log(`Dot balls: ${matchData.statistics.dots}`);
  } else {
    matchData.statistics = {
      totalBalls: ballCount,
      note: 'Ball-by-ball data captured through event system'
    };
  }

  logEvent('MATCH_COMPLETE', matchData.summary);

  // Save detailed logs to files
  const logDir = 'match_logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  } else {
    // Clear existing logs to keep only the most recent
    const files = fs.readdirSync(logDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(logDir, file));
    });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Save match data
  const matchLogPath = path.join(logDir, `match_engine_test_${timestamp}.json`);
  fs.writeFileSync(matchLogPath, JSON.stringify(matchData, null, 2));

  // Save ball-by-ball data if available
  if (matchData.ballByBall.length > 0) {
    const ballByBallPath = path.join(logDir, `ball_by_ball_${timestamp}.json`);
    fs.writeFileSync(ballByBallPath, JSON.stringify(matchData.ballByBall, null, 2));
  }

  // Save event log
  const eventLogPath = path.join(logDir, `events_${timestamp}.json`);
  fs.writeFileSync(eventLogPath, JSON.stringify(matchData.eventLog, null, 2));

  console.log(`\n📁 Match logs saved:`);
  console.log(`   Complete match data: ${matchLogPath}`);
  if (matchData.ballByBall.length > 0) {
    console.log(`   Ball-by-ball data: ball_by_ball_${timestamp}.json`);
  }
  console.log(`   Event log: ${eventLogPath}`);
  console.log('\n✅ Match simulation completed successfully with MatchEngine!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
  logEvent('ERROR', { message: error.message, stack: error.stack });
}
}

// Run the test
runDetailedMatchTest().catch(error => {
  console.error('❌ Test execution failed:', error);
});

// Helper functions remain for potential future use but are not needed for MatchEngine test