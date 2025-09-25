/**
 * @file MatchEngine.js
 * @description Main match simulation orchestrator - coordinates entire match simulation
 * @module core/match-engine/MatchEngine
 */

import SimpleBallSimulator from './SimpleBallSimulator.js';

/**
 * @typedef {Object} MatchConfig
 * @property {Object} homeTeam - Home team data
 * @property {Object} awayTeam - Away team data
 * @property {string} venue - Venue ID
 * @property {string} tossWinner - Team ID that won toss
 * @property {string} tossDecision - 'bat' or 'bowl'
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} result - Match result description
 * @property {string} winningTeam - ID of winning team
 * @property {number} margin - Victory margin (runs or wickets)
 * @property {Object} summary - Match summary statistics
 */

class MatchEngine {
  constructor(matchStore, playerStore, teamStore) {
    this.matchStore = matchStore;
    this.playerStore = playerStore;
    this.teamStore = teamStore;
    this.ballSimulator = new SimpleBallSimulator();

    // Field formations for testing - will be randomly assigned
    this.fieldFormations = ['attacking', 'neutral', 'defensive'];
    this.currentFieldFormation = null;

    // Match configuration
    this.config = {
      maxOvers: 20,
      maxWickets: 10,
      powerplayOvers: 6,
      maxBowlerOvers: 4,
      simulationSpeed: 'instant' // normal | fast | instant
    };

    // State
    this.isSimulating = false;
    this.isPaused = false;
  }

  /**
   * Start a new match
   * @param {MatchConfig} matchConfig - Match configuration
   * @returns {Promise<void>}
   */
  async startMatch(matchConfig) {
    try {
      // Initialize match in store
      this.matchStore.getState().initializeMatch(matchConfig);

      // Set up opening players
      await this.setupOpeningPlayers();

      console.log(`Match started: ${matchConfig.homeTeam.name} vs ${matchConfig.awayTeam.name}`);

      // Start first innings
      return this.simulateInnings();

    } catch (error) {
      console.error('Error starting match:', error);
      throw error;
    }
  }

  /**
   * Set up opening batsmen and bowler
   * @returns {Promise<void>}
   */
  async setupOpeningPlayers() {
    const matchState = this.matchStore.getState();
    const { teams, innings } = matchState;

    // Get batting team squad
    const battingTeam = this.teamStore.getState().getTeam(innings.battingTeam);
    const bowlingTeam = this.teamStore.getState().getTeam(innings.bowlingTeam);

    if (!battingTeam || !bowlingTeam) {
      throw new Error('Team data not found');
    }

    // Select opening batsmen (first two batsmen in lineup)
    const battingSquad = teams.batting.squad;
    if (battingSquad.length < 2) {
      throw new Error('Insufficient batsmen in squad');
    }

    const striker = battingSquad[0];
    const nonStriker = battingSquad[1];

    // Select opening bowler (first bowler in squad)
    const bowlingSquad = teams.bowling.squad;
    const openingBowler = this.selectOpeningBowler(bowlingSquad);

    // Update match state
    matchState.setOpeningBatsmen(striker, nonStriker);
    matchState.setOpeningBowler(openingBowler);

    // Set up field formation (random for testing)
    this.setupFieldFormation(bowlingTeam);

    // Initialize player conditions for match
    this.initializePlayerConditions(battingSquad.concat(bowlingSquad));
  }

  /**
   * Set up field formation for the bowling team
   * @param {Object} bowlingTeam - Bowling team object
   */
  setupFieldFormation(bowlingTeam) {
    // Get 9 fielders (excluding bowler and wicket-keeper)
    const allFielders = bowlingTeam.players.map(p => ({
      ...this.playerStore.getState().getPlayer(p.id || p),
      id: p.id || p
    })).filter(p => p && p.role !== 'wicket-keeper');

    // Take first 9 fielders (bowler will be handled separately)
    const fielders = allFielders.slice(0, 9);

    if (fielders.length < 9) {
      console.warn(`Only ${fielders.length} fielders available, need 9. Using available fielders.`);
      // Pad with duplicates if necessary
      while (fielders.length < 9 && allFielders.length > 0) {
        fielders.push(allFielders[fielders.length % allFielders.length]);
      }
    }

    // Random formation selection for testing
    this.currentFieldFormation = this.fieldFormations[Math.floor(Math.random() * this.fieldFormations.length)];

    // Set field formation in the ball simulator
    const fieldingPositions = this.ballSimulator.setFieldFormation(this.currentFieldFormation, fielders);

    // Store fielding positions for later use
    this.fieldingPositions = fieldingPositions;

    console.log(`Field formation set: ${this.currentFieldFormation} with ${fieldingPositions.length} positioned fielders`);
  }

  /**
   * Initialize player conditions for the match
   * @param {Array} allPlayers - All players in both squads
   */
  initializePlayerConditions(allPlayers) {
    const matchState = this.matchStore.getState();
    const conditionUpdates = {};

    allPlayers.forEach(playerId => {
      const player = this.playerStore.getState().getPlayer(playerId);
      if (player) {
        conditionUpdates[playerId] = {
          energy: player.condition?.fitness || 100,
          confidence: player.condition?.form || 50,
          fatigue: 0
        };
      }
    });

    // Update match conditions
    matchState.matchConditions = conditionUpdates;
  }

  /**
   * Select opening bowler - any player can bowl except wicketkeeper
   * @param {Array} bowlingSquad - Bowling team squad
   * @returns {string} Selected bowler ID
   */
  selectOpeningBowler(bowlingSquad) {
    // Anyone can bowl except wicketkeeper
    for (const playerId of bowlingSquad) {
      const player = this.playerStore.getState().getPlayer(playerId);
      if (player && player.role !== 'wicket-keeper') {
        // Ensure player has a bowlingType
        if (!player.bowlingType) {
          player.bowlingType = 'medium'; // Default bowling type
        }
        return playerId;
      }
    }

    // Emergency fallback - even wicketkeeper can bowl if needed
    if (bowlingSquad.length > 0) {
      const playerId = bowlingSquad[0];
      const player = this.playerStore.getState().getPlayer(playerId);
      if (player && !player.bowlingType) {
        player.bowlingType = 'medium';
      }
      return playerId;
    }

    throw new Error('No players available for bowling');
  }

  /**
   * Simulate an innings
   * @returns {Promise<void>}
   */
  async simulateInnings() {
    this.isSimulating = true;

    try {
      while (!this.isInningsComplete() && !this.isPaused) {
        await this.simulateBall();

        // Apply simulation speed delay
        if (this.config.simulationSpeed === 'normal') {
          await this.delay(1000); // 1 second per ball
        } else if (this.config.simulationSpeed === 'fast') {
          await this.delay(200); // 0.2 seconds per ball
        }
        // No delay for instant simulation
      }

      // Check if match is complete or needs second innings
      if (this.isMatchComplete()) {
        await this.completeMatch();
      } else {
        await this.startSecondInnings();
      }

    } catch (error) {
      console.error('Error during innings simulation:', error);
      this.isSimulating = false;
      throw error;
    }
  }

  /**
   * Simulate a single ball
   * @returns {Promise<void>}
   */
  async simulateBall() {
    const matchState = this.matchStore.getState();
    const { currentBall, innings, teams } = matchState;

    // Get player objects
    const striker = this.playerStore.getState().getPlayer(innings.striker);
    const nonStriker = this.playerStore.getState().getPlayer(innings.nonStriker);
    const bowler = this.playerStore.getState().getPlayer(innings.bowler);
    const wicketKeeper = this.getWicketKeeper(teams.bowling.squad);

    if (!striker || !nonStriker || !bowler) {
      throw new Error('Missing required players for ball simulation');
    }

    // Create ball context with proper fielding information
    const ballContext = {
      striker: {
        ...striker,
        condition: matchState.matchConditions[striker.id] || {}
      },
      nonStriker: {
        ...nonStriker,
        condition: matchState.matchConditions[nonStriker.id] || {}
      },
      bowler: {
        ...bowler,
        condition: matchState.matchConditions[bowler.id] || {}
      },
      fieldingTeam: {
        squad: teams.bowling.squad.map(id => ({
          ...this.playerStore.getState().getPlayer(id),
          condition: matchState.matchConditions[id] || {}
        })),
        fieldingPositions: this.fieldingPositions || [] // Include positioned fielders with their coordinates
      },
      wicketKeeper,
      matchSituation: currentBall.matchSituation,
      battingMentality: this.determineBattingMentality(currentBall.matchSituation),
      bowlingMentality: this.determineBowlingMentality(currentBall.matchSituation)
    };

    // Simulate the ball
    const ballResult = await this.ballSimulator.simulateBall(ballContext);

    // Process ball result
    matchState.processBallResult(ballResult);

    // Check if target reached immediately after processing ball result
    if (innings.number === 2 && teams.batting.totalScore >= innings.target) {
      innings.isComplete = true;
      console.log(`Target reached! ${teams.batting.name} wins by ${this.config.maxWickets - teams.batting.wickets} wickets`);
      return;
    }

    // Handle post-ball events
    await this.handlePostBallEvents(ballResult);

    console.log(`Ball ${currentBall.over}.${currentBall.ball}: ${ballResult.commentary}`);
  }

  /**
   * Determine batting mentality based on match situation
   * @param {Object} matchSituation - Current match situation
   * @returns {string} Batting mentality ('attacking', 'neutral', 'defensive')
   */
  determineBattingMentality(matchSituation) {
    if (!matchSituation) return 'neutral';

    const ballsLeft = matchSituation.ballsLeft || 120;
    const required = matchSituation.required;

    // For testing, use simple logic
    if (ballsLeft < 30 && required && required > ballsLeft * 0.8) {
      return 'attacking'; // Need quick runs
    } else if (ballsLeft > 90) {
      return 'defensive'; // Early innings, build foundation
    }
    return 'neutral';
  }

  /**
   * Determine bowling mentality based on match situation
   * @param {Object} matchSituation - Current match situation
   * @returns {string} Bowling mentality ('attacking', 'neutral', 'defensive')
   */
  determineBowlingMentality(matchSituation) {
    if (!matchSituation) return 'neutral';

    const ballsLeft = matchSituation.ballsLeft || 120;

    // For testing, use simple logic
    if (ballsLeft < 30) {
      return 'defensive'; // Try to contain runs
    } else if (ballsLeft > 90) {
      return 'attacking'; // Try to get wickets early
    }
    return 'neutral';
  }

  /**
   * Handle events after ball simulation
   * @param {Object} ballResult - Result of the simulated ball
   * @returns {Promise<void>}
   */
  async handlePostBallEvents(ballResult) {
    const matchState = this.matchStore.getState();

    // Handle wicket
    if (ballResult.isWicket) {
      await this.handleWicket(ballResult);
    }

    // Handle end of over
    if (this.isEndOfOver()) {
      await this.handleEndOfOver();
    }

    // Rotate strike for odd runs
    if (ballResult.runs % 2 === 1) {
      this.rotateStrike();
    }
  }

  /**
   * Handle wicket event
   * @param {Object} ballResult - Ball result containing wicket
   * @returns {Promise<void>}
   */
  async handleWicket(ballResult) {
    const matchState = this.matchStore.getState();
    const { teams, innings } = matchState;

    // Check if innings should end
    if (teams.batting.wickets >= this.config.maxWickets - 1) {
      // All out or last wicket
      innings.isComplete = true;
      return;
    }

    // Bring in new batsman
    const newBatsman = this.selectNextBatsman();
    if (!newBatsman) {
      innings.isComplete = true;
      return;
    }

    // Update striker/non-striker based on who got out
    if (ballResult.dismissedPlayer === innings.striker) {
      matchState.setOpeningBatsmen(newBatsman, innings.nonStriker);
    } else {
      matchState.setOpeningBatsmen(innings.striker, newBatsman);
    }
  }

  /**
   * Select next batsman from squad
   * @returns {string|null} Next batsman ID or null if none available
   */
  selectNextBatsman() {
    const matchState = this.matchStore.getState();
    const { teams, ballByBall } = matchState;

    // Get players already batted
    const battedPlayers = new Set([
      matchState.innings.striker,
      matchState.innings.nonStriker
    ]);

    // Add dismissed players
    ballByBall.forEach(ball => {
      if (ball.isWicket && ball.dismissedPlayer) {
        battedPlayers.add(ball.dismissedPlayer);
      }
    });

    // Find next available batsman
    for (const playerId of teams.batting.squad) {
      if (!battedPlayers.has(playerId)) {
        const player = this.playerStore.getState().getPlayer(playerId);
        if (player && ['batsman', 'all-rounder', 'wicket-keeper'].includes(player.role)) {
          return playerId;
        }
      }
    }

    return null; // No more batsmen available
  }

  /**
   * Handle end of over
   * @returns {Promise<void>}
   */
  async handleEndOfOver() {
    const matchState = this.matchStore.getState();

    // Rotate strike at end of over
    this.rotateStrike();

    // Select new bowler (can't bowl consecutive overs)
    const newBowler = this.selectNextBowler();
    if (newBowler) {
      matchState.setOpeningBowler(newBowler);
    }
  }

  /**
   * Rotate strike between batsmen
   */
  rotateStrike() {
    const matchState = this.matchStore.getState();
    const { striker, nonStriker } = matchState.innings;

    matchState.setOpeningBatsmen(nonStriker, striker);
  }

  /**
   * Select next bowler for new over
   * @returns {string|null} Next bowler ID
   */
  selectNextBowler() {
    const matchState = this.matchStore.getState();
    const { teams, currentBall, ballByBall } = matchState;

    // Calculate overs bowled by each bowler
    const oversBowled = this.calculateOversBowled(ballByBall);
    const currentBowler = matchState.innings.bowler;

    // Find available bowlers - anyone except wicketkeeper and current bowler
    const availableBowlers = teams.bowling.squad.filter(playerId => {
      const player = this.playerStore.getState().getPlayer(playerId);
      if (!player || playerId === currentBowler || (oversBowled[playerId] || 0) >= this.config.maxBowlerOvers) {
        return false;
      }

      // Assign bowlingType if not present
      if (!player.bowlingType && player.role !== 'wicket-keeper') {
        player.bowlingType = 'medium';
      }

      // Allow anyone except wicketkeeper to bowl
      return player.role !== 'wicket-keeper';
    });

    if (availableBowlers.length === 0) {
      // Emergency: allow current bowler to continue
      return currentBowler;
    }

    // Improved selection: pick bowler with least overs bowled
    const bowlerWithLeastOvers = availableBowlers.reduce((prev, curr) => {
      const prevOvers = oversBowled[prev] || 0;
      const currOvers = oversBowled[curr] || 0;
      return currOvers < prevOvers ? curr : prev;
    });

    return bowlerWithLeastOvers;
  }

  /**
   * Calculate overs bowled by each bowler
   * @param {Array} ballByBall - Ball by ball record
   * @returns {Object} Overs bowled by each bowler
   */
  calculateOversBowled(ballByBall) {
    const oversBowled = {};
    let currentOver = 0;
    let ballInOver = 0;
    let currentBowlerInOver = null;

    ballByBall.forEach(ball => {
      if (ball.isLegal) {
        ballInOver++;
        currentBowlerInOver = ball.bowler;

        if (ballInOver === 6) {
          // Complete over
          oversBowled[currentBowlerInOver] = (oversBowled[currentBowlerInOver] || 0) + 1;
          ballInOver = 0;
          currentOver++;
          currentBowlerInOver = null;
        }
      }
    });

    return oversBowled;
  }

  /**
   * Get wicket keeper from squad
   * @param {Array} squad - Team squad
   * @returns {Object} Wicket keeper player
   */
  getWicketKeeper(squad) {
    for (const playerId of squad) {
      const player = this.playerStore.getState().getPlayer(playerId);
      if (player && player.role === 'wicket-keeper') {
        return player;
      }
    }

    // Fallback to first player if no designated keeper
    return this.playerStore.getState().getPlayer(squad[0]);
  }

  /**
   * Check if current innings is complete
   * @returns {boolean} Whether innings is complete
   */
  isInningsComplete() {
    const matchState = this.matchStore.getState();
    const { teams, currentBall, innings } = matchState;

    return innings.isComplete ||
           teams.batting.wickets >= this.config.maxWickets ||
           currentBall.over >= this.config.maxOvers ||
           (innings.number === 2 && teams.batting.totalScore >= innings.target);
  }

  /**
   * Check if end of over
   * @returns {boolean} Whether it's end of over
   */
  isEndOfOver() {
    const matchState = this.matchStore.getState();
    return matchState.currentBall.ball === 0 && matchState.currentBall.over > 0;
  }

  /**
   * Check if match is complete
   * @returns {boolean} Whether match is complete
   */
  isMatchComplete() {
    const matchState = this.matchStore.getState();
    const { innings } = matchState;

    return innings.number === 2 && this.isInningsComplete();
  }

  /**
   * Start second innings
   * @returns {Promise<void>}
   */
  async startSecondInnings() {
    const matchState = this.matchStore.getState();

    // Start innings break
    matchState.status = 'innings_break';

    // Brief delay for innings break
    await this.delay(100);

    // Start second innings
    matchState.startSecondInnings();

    // Set up opening players for second innings
    await this.setupOpeningPlayers();

    // Continue simulation
    return this.simulateInnings();
  }

  /**
   * Complete the match and determine result
   * @returns {Promise<MatchResult>}
   */
  async completeMatch() {
    const matchState = this.matchStore.getState();
    const { teams, innings } = matchState;

    this.isSimulating = false;

    // Determine match result
    const result = this.calculateMatchResult(teams, innings);

    // Update match store
    matchState.completeMatch(result.description);

    console.log('Match completed:', result.description);

    return result;
  }

  /**
   * Calculate match result
   * @param {Object} teams - Both teams data
   * @param {Object} innings - Innings data
   * @returns {MatchResult} Match result
   */
  calculateMatchResult(teams, innings) {
    const firstInningsScore = innings.number === 1 ?
      teams.batting.totalScore :
      teams.bowling.totalScore; // Bowling team from 2nd innings was batting in 1st

    const secondInningsScore = innings.number === 2 ?
      teams.batting.totalScore : 0;

    if (innings.number === 1) {
      // Match incomplete - first innings only
      return {
        result: 'Match incomplete',
        winningTeam: null,
        margin: 0,
        description: 'Match ended after first innings'
      };
    }

    // Second innings completed
    if (secondInningsScore >= innings.target) {
      // Team batting second won
      const margin = this.config.maxWickets - teams.batting.wickets;
      return {
        result: 'win',
        winningTeam: teams.batting.id,
        margin,
        description: `${teams.batting.name} won by ${margin} wicket${margin !== 1 ? 's' : ''}`
      };
    } else {
      // Team batting first won
      const margin = innings.target - secondInningsScore - 1;
      return {
        result: 'win',
        winningTeam: teams.bowling.id,
        margin,
        description: `${teams.bowling.name} won by ${margin} run${margin !== 1 ? 's' : ''}`
      };
    }
  }

  /**
   * Pause the simulation
   */
  pauseSimulation() {
    this.isPaused = true;
  }

  /**
   * Resume the simulation
   */
  resumeSimulation() {
    this.isPaused = false;
    if (this.isSimulating) {
      return this.simulateInnings();
    }
  }

  /**
   * Stop the simulation
   */
  stopSimulation() {
    this.isSimulating = false;
    this.isPaused = false;
  }

  /**
   * Get current match status
   * @returns {Object} Current match status
   */
  getMatchStatus() {
    const matchState = this.matchStore.getState();
    return {
      isSimulating: this.isSimulating,
      isPaused: this.isPaused,
      status: matchState.status,
      situation: matchState.getCurrentSituation()
    };
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MatchEngine;