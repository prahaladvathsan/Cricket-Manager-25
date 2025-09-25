#!/usr/bin/env node
/**
 * @file matchSimulationTest.js
 * @description Test script to simulate a full match using real player data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set working directory to project root
const projectRoot = path.resolve(__dirname, '../..');
process.chdir(projectRoot);

import TeamSelector from '../utils/teamSelector.js';
import ExtensibleBallSimulator from '../core/match-engine/ExtensibleBallSimulator.js';
import MatchEngine from '../core/match-engine/MatchEngine.js';

/**
 * Mock stores for testing
 */
class MockMatchStore {
  constructor() {
    this.state = {
      matchId: null,
      status: 'scheduled',
      teams: { batting: {}, bowling: {} },
      innings: { number: 1 },
      currentBall: { over: 0, ball: 0 },
      ballByBall: [],
      matchConditions: {},
      commentary: []
    };
  }

  getState() {
    return {
      ...this.state,
      initializeMatch: (config) => this.initializeMatch(config),
      setOpeningBatsmen: (striker, nonStriker) => this.setOpeningBatsmen(striker, nonStriker),
      setOpeningBowler: (bowler) => this.setOpeningBowler(bowler),
      processBallResult: (result) => this.processBallResult(result),
      startSecondInnings: () => this.startSecondInnings(),
      completeMatch: (result) => this.completeMatch(result),
      getCurrentSituation: () => this.getCurrentSituation()
    };
  }

  initializeMatch(config) {
    const { homeTeam, awayTeam, tossWinner, tossDecision } = config;

    const battingFirst = tossDecision === 'bat' ? tossWinner :
                        (tossWinner === homeTeam.id ? awayTeam.id : homeTeam.id);

    this.state = {
      ...this.state,
      matchId: `test_match_${Date.now()}`,
      status: 'live',
      teams: {
        batting: {
          id: battingFirst,
          name: battingFirst === homeTeam.id ? homeTeam.name : awayTeam.name,
          squad: battingFirst === homeTeam.id ? homeTeam.playingXI : awayTeam.playingXI,
          totalScore: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 }
        },
        bowling: {
          id: battingFirst === homeTeam.id ? awayTeam.id : homeTeam.id,
          name: battingFirst === homeTeam.id ? awayTeam.name : homeTeam.name,
          squad: battingFirst === homeTeam.id ? awayTeam.playingXI : homeTeam.playingXI
        }
      },
      innings: {
        number: 1,
        target: null,
        battingTeam: battingFirst,
        bowlingTeam: battingFirst === homeTeam.id ? awayTeam.id : homeTeam.id,
        striker: null,
        nonStriker: null,
        bowler: null,
        isComplete: false
      },
      currentBall: {
        over: 0,
        ball: 0,
        matchSituation: { phase: 'powerplay', required: null, ballsLeft: 120 }
      }
    };

    console.log(`Match initialized: ${this.state.teams.batting.name} vs ${this.state.teams.bowling.name}`);
  }

  setOpeningBatsmen(striker, nonStriker) {
    this.state.innings.striker = striker;
    this.state.innings.nonStriker = nonStriker;
    this.state.currentBall.striker = striker;
    this.state.currentBall.nonStriker = nonStriker;
  }

  setOpeningBowler(bowler) {
    this.state.innings.bowler = bowler;
    this.state.currentBall.bowler = bowler;
  }

  processBallResult(result) {
    this.state.ballByBall.push(result);
    this.state.commentary.push(result.commentary);

    // Update scores
    if (result.runs) {
      this.state.teams.batting.totalScore += result.runs;
    }

    if (result.isWicket) {
      this.state.teams.batting.wickets += 1;
    }

    // Update ball count for legal deliveries
    if (result.isLegal) {
      this.state.currentBall.ball += 1;
      if (this.state.currentBall.ball === 6) {
        this.state.currentBall.ball = 0;
        this.state.currentBall.over += 1;
        this.state.teams.batting.overs = this.state.currentBall.over;
      }
    }

    // Update match phase
    const totalBalls = this.state.currentBall.over * 6 + this.state.currentBall.ball;
    let phase = 'powerplay';
    if (totalBalls > 36) phase = 'middle';
    if (totalBalls > 96) phase = 'death';

    this.state.currentBall.matchSituation.phase = phase;
    this.state.currentBall.matchSituation.ballsLeft = 120 - totalBalls;

    // Update condition
    if (result.conditionUpdates) {
      Object.assign(this.state.matchConditions, result.conditionUpdates);
    }
  }

  getCurrentSituation() {
    return {
      score: `${this.state.teams.batting.totalScore}/${this.state.teams.batting.wickets}`,
      overs: `${this.state.currentBall.over}.${this.state.currentBall.ball}`,
      phase: this.state.currentBall.matchSituation.phase,
      runRate: this.state.teams.batting.totalScore / ((this.state.currentBall.over * 6 + this.state.currentBall.ball) / 6) || 0
    };
  }

  startSecondInnings() {
    const target = this.state.teams.batting.totalScore + 1;
    console.log(`\nSecond innings begins. Target: ${target}`);

    this.state.innings.number = 2;
    this.state.innings.target = target;

    // Swap teams
    const temp = this.state.teams.batting;
    this.state.teams.batting = {
      ...this.state.teams.bowling,
      totalScore: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 }
    };
    this.state.teams.bowling = temp;

    this.state.currentBall = {
      over: 0,
      ball: 0,
      matchSituation: {
        phase: 'powerplay',
        required: target,
        ballsLeft: 120
      }
    };
  }

  completeMatch(result) {
    this.state.status = 'completed';
    console.log(`\nMatch completed: ${result}`);
  }
}

class MockPlayerStore {
  constructor(players) {
    this.players = {};
    players.forEach(player => {
      this.players[player.id] = player;
    });
  }

  getState() {
    return {
      getPlayer: (id) => this.players[id],
      players: this.players
    };
  }
}

class MockTeamStore {
  constructor(teams) {
    this.teams = {};
    teams.forEach(team => {
      this.teams[team.id] = team;
    });
  }

  getState() {
    return {
      getTeam: (id) => this.teams[id],
      teams: this.teams
    };
  }
}

/**
 * Main test function
 */
async function runMatchSimulationTest() {
  console.log('🏏 Starting Cricket Match Simulation Test');
  console.log('=========================================\n');

  try {
    // Step 1: Select teams
    console.log('1. Selecting teams from player database...');
    const teamSelector = new TeamSelector();
    const { teamA, teamB } = teamSelector.selectTwoTeams({
      topPlayersCount: 100,
      teamSize: 11
    });

    // Step 2: Create match configuration
    console.log('\n2. Creating match configuration...');
    const matchConfig = teamSelector.createMatchConfig(teamA, teamB);
    console.log(`Toss: ${matchConfig.tossWinner} chose to ${matchConfig.tossDecision}`);

    // Step 3: Set up stores
    console.log('\n3. Setting up simulation stores...');
    const allPlayers = [...teamA.players, ...teamB.players];
    const playerStore = new MockPlayerStore(allPlayers);
    const teamStore = new MockTeamStore([teamA, teamB]);
    const matchStore = new MockMatchStore();

    // Step 4: Initialize match engine
    console.log('\n4. Initializing match engine...');
    const matchEngine = new MatchEngine(matchStore, playerStore, teamStore);

    // Step 5: Run simulation
    console.log('\n5. Starting match simulation...');
    console.log('=====================================\n');

    // Simulate using simplified approach
    await simulateMatch(matchEngine, matchConfig, teamSelector, allPlayers);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

/**
 * Simplified match simulation
 */
async function simulateMatch(matchEngine, matchConfig, teamSelector, allPlayers) {
  const matchStore = matchEngine.matchStore.getState();
  const playerStore = matchEngine.playerStore.getState();

  // Initialize match
  matchStore.initializeMatch(matchConfig);

  // Set up first innings
  await setupInnings(matchStore, teamSelector, matchConfig);

  // Simulate first innings
  console.log('🏏 FIRST INNINGS');
  console.log('================');
  await simulateInnings(matchStore, playerStore, 1);

  // Setup second innings
  matchStore.startSecondInnings();
  await setupInnings(matchStore, teamSelector, matchConfig);

  // Simulate second innings
  console.log('\n🏏 SECOND INNINGS');
  console.log('=================');
  await simulateInnings(matchStore, playerStore, 2);

  // Complete match
  const finalResult = calculateMatchResult(matchStore);
  matchStore.completeMatch(finalResult);

  // Print final summary
  printMatchSummary(matchStore);
}

/**
 * Set up innings with players
 */
async function setupInnings(matchStore, teamSelector, matchConfig) {
  const state = matchStore;
  const currentTeam = state.teams.batting.id === matchConfig.homeTeam.id ?
                     matchConfig.homeTeam : matchConfig.awayTeam;

  // Create team object for teamSelector methods
  const team = {
    players: currentTeam.players,
    id: currentTeam.id
  };

  // Set opening batsmen
  const openers = teamSelector.selectOpeningPair(team);
  matchStore.setOpeningBatsmen(openers.striker, openers.nonStriker);

  // Set opening bowler
  const bowlingTeam = state.teams.bowling.id === matchConfig.homeTeam.id ?
                     matchConfig.homeTeam : matchConfig.awayTeam;
  const bowlingTeamObj = { players: bowlingTeam.players };
  const openingBowler = teamSelector.selectOpeningBowler(bowlingTeamObj);
  matchStore.setOpeningBowler(openingBowler);

  console.log(`Batting: ${openers.striker} & ${openers.nonStriker}`);
  console.log(`Bowling: ${openingBowler}`);
}

/**
 * Simulate an innings
 */
async function simulateInnings(matchStore, playerStore, inningsNumber) {
  const simulator = new ExtensibleBallSimulator();
  await simulator.initialize();

  let ballCount = 0;
  const maxBalls = 120; // 20 overs
  const maxWickets = 10;

  while (ballCount < maxBalls && matchStore.teams.batting.wickets < maxWickets) {
    // Get current players
    const striker = playerStore.getPlayer(matchStore.innings.striker);
    const nonStriker = playerStore.getPlayer(matchStore.innings.nonStriker);
    const bowler = playerStore.getPlayer(matchStore.innings.bowler);

    if (!striker || !bowler) {
      console.log('Missing players, ending innings');
      break;
    }

    // Create ball context
    const ballContext = {
      striker,
      nonStriker,
      bowler,
      fieldingTeam: { squad: matchStore.teams.bowling.squad },
      wicketKeeper: striker, // Simplified
      matchSituation: matchStore.currentBall.matchSituation
    };

    // Simulate ball
    const ballResult = await simulator.simulateBall(ballContext);

    // Process result
    matchStore.processBallResult(ballResult);

    // Print progress
    if (ballCount % 6 === 5 || ballResult.isWicket || ballResult.runs >= 4) {
      const situation = matchStore.getCurrentSituation();
      console.log(`${situation.overs} ov: ${situation.score} (RR: ${situation.runRate.toFixed(1)}) - ${ballResult.commentary}`);
    }

    // Handle wicket - get new batsman
    if (ballResult.isWicket) {
      const newBatsman = getNextBatsman(matchStore, ballCount);
      if (newBatsman) {
        if (ballResult.dismissedPlayer === matchStore.innings.striker) {
          matchStore.setOpeningBatsmen(newBatsman, matchStore.innings.nonStriker);
        } else {
          matchStore.setOpeningBatsmen(matchStore.innings.striker, newBatsman);
        }
      }
    }

    // Rotate strike for odd runs
    if (ballResult.runs % 2 === 1) {
      const temp = matchStore.innings.striker;
      matchStore.setOpeningBatsmen(matchStore.innings.nonStriker, temp);
    }

    // Check for second innings target
    if (inningsNumber === 2 && matchStore.teams.batting.totalScore >= matchStore.innings.target) {
      console.log('Target achieved!');
      break;
    }

    ballCount++;

    // Add small delay for readability
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const situation = matchStore.getCurrentSituation();
  console.log(`\nInnings ${inningsNumber} completed: ${situation.score} in ${situation.overs} overs`);
}

/**
 * Get next batsman
 */
function getNextBatsman(matchStore, ballCount) {
  // Simple logic - just return a player ID
  const squad = matchStore.teams.batting.squad;
  const battedPlayers = new Set([
    matchStore.innings.striker,
    matchStore.innings.nonStriker
  ]);

  // Add dismissed players from ball-by-ball
  matchStore.ballByBall.forEach(ball => {
    if (ball.isWicket && ball.dismissedPlayer) {
      battedPlayers.add(ball.dismissedPlayer);
    }
  });

  // Find next available
  for (const playerId of squad) {
    if (!battedPlayers.has(playerId)) {
      return playerId;
    }
  }

  return null;
}

/**
 * Calculate match result
 */
function calculateMatchResult(matchStore) {
  const state = matchStore;

  if (state.innings.number === 1) {
    return 'Match incomplete - first innings only';
  }

  const target = state.innings.target;
  const score = state.teams.batting.totalScore;
  const wickets = state.teams.batting.wickets;

  if (score >= target) {
    const margin = 10 - wickets;
    return `${state.teams.batting.name} won by ${margin} wicket${margin !== 1 ? 's' : ''}`;
  } else {
    const margin = target - score - 1;
    return `${state.teams.bowling.name} won by ${margin} run${margin !== 1 ? 's' : ''}`;
  }
}

/**
 * Print match summary
 */
function printMatchSummary(matchStore) {
  const state = matchStore;

  console.log('\n🏆 MATCH SUMMARY');
  console.log('================');
  console.log(`Total balls simulated: ${state.ballByBall.length}`);
  console.log(`Boundaries: ${state.ballByBall.filter(b => ['FOUR', 'SIX'].includes(b.outcome)).length}`);
  console.log(`Wickets: ${state.ballByBall.filter(b => b.isWicket).length}`);
  console.log(`Dot balls: ${state.ballByBall.filter(b => b.outcome === 'DOT').length}`);

  // Get some interesting balls
  const boundaries = state.ballByBall.filter(b => ['FOUR', 'SIX'].includes(b.outcome));
  const wickets = state.ballByBall.filter(b => b.isWicket);

  if (boundaries.length > 0) {
    console.log('\nKey boundaries:');
    boundaries.slice(0, 3).forEach(ball => {
      console.log(`- ${ball.commentary}`);
    });
  }

  if (wickets.length > 0) {
    console.log('\nKey wickets:');
    wickets.slice(0, 3).forEach(ball => {
      console.log(`- ${ball.commentary}`);
    });
  }

  console.log('\n✅ Match simulation completed successfully!');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runMatchSimulationTest().catch(console.error);
}

export default runMatchSimulationTest;