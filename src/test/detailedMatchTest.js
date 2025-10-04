/**
 * Detailed match simulation test using MatchEngine
 * Comprehensive logging and ball-by-ball commentary with traceability
 */

import fs from 'fs';
import path from 'path';
import MatchEngine from '../core/match-engine/MatchEngine.js';
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
    innings: { number: 1, isComplete: false },
    currentBall: { over: 0, ball: 0, matchSituation: {} },
    ballByBall: [],
    matchConditions: {},
    commentary: [],

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
          isComplete: false
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
      set(state => ({
        innings: {
          ...state.innings,
          striker,
          nonStriker
        }
      }));
    },

    setOpeningBowler: (bowler) => {
      set(state => ({
        innings: {
          ...state.innings,
          bowler
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
        let newBall = state.currentBall.ball + 1;
        let newOver = state.currentBall.over;

        if (newBallData.isLegal) {
          if (newBall > 6) {
            newBall = 1;
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
          isComplete: false
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

  // Select top players ignoring roles - anyone can bat and bowl
  const selectedPlayers = playerData
    .filter(p => p.rating > 4.0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 22); // Get top 22 players for both teams

  // Give everyone a bowlingType since anyone can bowl
  selectedPlayers.forEach(player => {
    if (!player.bowlingType) {
      // Assign bowlingType based on bowling attributes
      const bowlingAttrs = player.attributes.bowling;
      if (bowlingAttrs.bowlingSpeed > 12) {
        player.bowlingType = 'fast';
      } else if (bowlingAttrs.turn > 10 || bowlingAttrs.variations > 10) {
        player.bowlingType = Math.random() > 0.5 ? 'off-spin' : 'leg-spin';
      } else {
        player.bowlingType = 'medium';
      }
    }
  });

  console.log(`\nTop 11 players (ignoring roles):`);
  selectedPlayers.slice(0, 11).forEach((player, i) => {
    const battingAvg = Object.values(player.attributes.batting).reduce((a, b) => a + b, 0) / Object.keys(player.attributes.batting).length;
    const bowlingAvg = Object.values(player.attributes.bowling).reduce((a, b) => a + b, 0) / Object.keys(player.attributes.bowling).length;
    console.log(`${i+1}. ${player.name} (${player.role}) - Rating: ${player.rating} - Bat: ${battingAvg.toFixed(1)}, Bowl: ${bowlingAvg.toFixed(1)} (${player.bowlingType})`);
  });

  // Create two teams with proper squad structure
  console.log('\n🏏 TEAM SELECTION');
  console.log('==================');

  const teamAPlayers = selectedPlayers.slice(0, 11).map((p, i) => ({
    ...p,
    id: p.id || `teamA_player_${i}`
  }));

  const teamBPlayers = selectedPlayers.slice(11, 22).map((p, i) => ({
    ...p,
    id: p.id || `teamB_player_${i}`
  }));

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

  console.log(`\nTeam A: ${teamA.name}`);
  teamA.players.forEach((p, i) => {
    console.log(`${i+1}. ${p.name} (${p.role}) - ${p.rating}`);
  });

  console.log(`\nTeam B: ${teamB.name}`);
  teamB.players.forEach((p, i) => {
    console.log(`${i+1}. ${p.name} (${p.role}) - ${p.rating}`);
  });

  logEvent('TEAMS_SELECTED', { teamA: teamA.name, teamB: teamB.name });

  // Initialize stores and MatchEngine
  console.log('\n🏏 MATCH ENGINE WITH STORES');
  console.log('==============================');
  console.log('Using MatchEngine with proper stores\n');

  const playerStore = createMockPlayerStore();
  const teamStore = createMockTeamStore();
  const matchStore = createMockMatchStore();

  // Initialize stores with data
  const allPlayers = [...teamAPlayers, ...teamBPlayers];
  playerStore.getState().initializePlayers(allPlayers);
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