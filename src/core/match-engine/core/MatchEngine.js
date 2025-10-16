/**
 * @file MatchEngine.js
 * @description Main match simulation orchestrator - coordinates entire match simulation
 * @module core/match-engine/MatchEngine
 */

import SimpleBallSimulator from './SimpleBallSimulator.js';
import parTargetCalculator from '../../tactics/ParTargetCalculator.js';
import dlsCalculator from '../../tactics/DLSCalculator.js';
import confidenceManager from '../../tactics/ConfidenceManager.js';
import energyManager from '../../tactics/EnergyManager.js';
import pressureCalculator from '../../tactics/PressureCalculator.js';
import accelerationTierManager from '../../tactics/AccelerationTierManager.js';

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
      simulationSpeed: 'instant', // normal | fast | instant
      interactiveMode: false // Set to true for interactive matches with user control
    };

    // State
    this.isSimulating = false;
    this.isPaused = false;

    // Interactive mode callbacks
    this.onStartOfOver = null; // Callback for user input at start of over
    this.onAfterBall = null;   // Callback for user input after each ball
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
    matchState.setCurrentBowler(openingBowler);

    // Set up field formation (random for testing)
    this.setupFieldFormation(bowlingTeam);

    // Initialize player conditions for match
    this.initializePlayerConditions(battingSquad.concat(bowlingSquad));

    // Initialize tactical state (par targets, pressure, etc.)
    // For 2nd innings, use target as par score; for 1st innings, use default
    const parScore = innings.number === 2 && innings.target ? innings.target : null;
    this.initializeTacticalState(matchState, parScore);
  }

  /**
   * Set up field formation for the bowling team
   * @param {Object} bowlingTeam - Bowling team object
   */
  setupFieldFormation(bowlingTeam) {
    // Get all 11 fielders (including bowler and wicket-keeper)
    const allFielders = bowlingTeam.players.map(p => ({
      ...this.playerStore.getState().getPlayer(p.id || p),
      id: p.id || p
    }));

    // Take first 11 fielders
    const fielders = allFielders.slice(0, 11);

    if (fielders.length < 11) {
      console.warn(`Only ${fielders.length} fielders available, need 11. Using available fielders.`);
      // Pad with duplicates if necessary
      while (fielders.length < 11 && allFielders.length > 0) {
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

    // Get full player objects
    const playerObjects = allPlayers.map(id => this.playerStore.getState().getPlayer(id));

    // Initialize confidence and energy using tactical managers
    const confidenceMap = confidenceManager.initializeMatchConfidence(playerObjects);
    const energyMap = energyManager.initializeMatchEnergy(playerObjects);

    // Merge into match conditions
    const conditionUpdates = {};
    allPlayers.forEach(playerId => {
      const player = this.playerStore.getState().getPlayer(playerId);
      if (player) {
        conditionUpdates[playerId] = {
          energy: energyMap[playerId] || 100,
          confidence: confidenceMap[playerId] || 50,
          fatigue: player.condition?.fatigue || 0
        };
      }
    });

    // Update match conditions
    matchState.matchConditions = conditionUpdates;
  }

  /**
   * Initialize tactical state (par targets, pressure, etc.)
   * @param {Object} matchState - Match state from store
   * @param {number} [battingParScore] - Optional batting par score (defaults to 160)
   */
  initializeTacticalState(matchState, battingParScore = null) {
    const parScore = battingParScore || 160; // Use provided par score or default T20 par score
    const wicketsInHand = 10;

    // Calculate over targets using DLS
    const overTargets = parTargetCalculator.calculateOverTargets(parScore, wicketsInHand);
    const targetRunRate = parScore / 20;

    // Update tactics state using Zustand action
    const updateTacticsState = this.matchStore.getState().updateTacticsState;
    if (updateTacticsState) {
      updateTacticsState({
        battingParScore: parScore,
        targetRunRate: targetRunRate,
        overTargets: overTargets,
        accelerationMode: 'auto', // Can be changed to 'manual' by user
        currentAcceleration: {
          striker: 'Rotate',
          nonStriker: 'Rotate'
        },
        bowlingPlans: {}, // Will use player defaults
        pressureIndex: {
          batting: 50,
          bowling: 50
        }
      });
    }

    console.log(`Tactical state initialized: Par ${parScore}, TRR ${targetRunRate.toFixed(2)}`);
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
    let matchState = this.matchStore.getState();
    let { currentBall, innings, teams } = matchState;

    // Check if we need to handle start of over
    if (this.isStartOfOver() && !(currentBall.over === 0 && currentBall.ball === 0)) {
      await this.handleStartOfOver();
      // After start of over, bowler may change, so get fresh state
      matchState = this.matchStore.getState();
      ({ currentBall, innings, teams } = matchState);
    }

    // Get player objects
    const striker = this.playerStore.getState().getPlayer(innings.striker);
    const nonStriker = this.playerStore.getState().getPlayer(innings.nonStriker);
    const bowler = this.playerStore.getState().getPlayer(innings.bowler);

    const wicketKeeper = this.getWicketKeeper(teams.bowling.squad);

    if (!striker || !nonStriker || !bowler) {
      throw new Error('Missing required players for ball simulation');
    }

    // Build enhanced match situation for tactics
    const enhancedMatchSituation = {
      ...currentBall.matchSituation,
      over: currentBall.over,
      ball: currentBall.ball,
      wicketsInHand: this.config.maxWickets - teams.batting.wickets,
      currentRunRate: teams.batting.totalScore / ((currentBall.over * 6 + currentBall.ball) / 6 || 1),
      requiredRunRate: innings.target ?
        ((innings.target - teams.batting.totalScore) / (currentBall.matchSituation.ballsLeft / 6 || 1)) : 0,
      targetRunRate: matchState.tacticsState?.targetRunRate || 8.0
    };

    // Create ball context with proper fielding information and tactics
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
      matchSituation: enhancedMatchSituation,
      tacticsState: matchState.tacticsState
    };

    // Simulate the ball
    const ballResult = await this.ballSimulator.simulateBall(ballContext);

    // Add batsman and bowler info to ball result for tracking
    ballResult.batsmanId = striker.id;
    ballResult.bowlerId = bowler.id;

    // Set dismissed player if wicket (always the striker in current implementation)
    if (ballResult.isWicket) {
      ballResult.dismissedPlayer = striker.id;
    }

    // Process ball result
    matchState.processBallResult(ballResult);

    // Extract tactics information (get fresh state after processBallResult)
    const freshState = this.matchStore.getState();
    const tacticsInfo = this.formatTacticsInfo(ballResult, freshState);

    // Format and display ball result
    const resultText = this.formatBallResult(ballResult);
    console.log(`${currentBall.over}.${currentBall.ball + 1}: ${bowler.name} to ${striker.name}, ${resultText}${tacticsInfo}`);

    // Check if target reached immediately after processing ball result
    if (innings.number === 2 && teams.batting.totalScore >= innings.target) {
      innings.isComplete = true;
      console.log(`\nTarget reached! ${teams.batting.name} wins by ${this.config.maxWickets - teams.batting.wickets} wickets`);
      return;
    }

    // Handle post-ball events
    await this.handlePostBallEvents(ballResult);

    // Call interactive callback if in interactive mode
    if (this.config.interactiveMode && this.onAfterBall) {
      await this.onAfterBall(matchState, ballResult);
    }
  }

  /**
   * Check if it's the start of an over (ball 0, but not the very first ball)
   * @returns {boolean}
   */
  isStartOfOver() {
    const matchState = this.matchStore.getState();
    const { currentBall } = matchState;
    return currentBall.ball === 0 && currentBall.over > 0;
  }

  /**
   * Format ball result for display
   * @param {Object} ballResult - Ball simulation result
   * @returns {string} Formatted result text
   */
  formatBallResult(ballResult) {
    if (ballResult.isWicket) {
      const dismissalType = ballResult.dismissalType || 'out';
      return `OUT (${dismissalType})`;
    }

    switch (ballResult.runs) {
      case 0: return 'no run';
      case 1: return '1 run';
      case 2: return '2 runs';
      case 3: return '3 runs';
      case 4: return 'FOUR';
      case 5: return '5 runs';
      case 6: return 'SIX';
      default: return `${ballResult.runs} runs`;
    }
  }

  /**
   * Format tactics information for ball commentary
   * @param {Object} ballResult - Ball simulation result
   * @param {Object} matchState - Current match state
   * @returns {string} Formatted tactics info
   */
  formatTacticsInfo(ballResult, matchState) {
    const DEBUG_TACTICS = false;
    const tacticsState = matchState.tacticsState;

    // DEBUG: Log state for first 3 balls to diagnose issue
    if (DEBUG_TACTICS && matchState.currentBall.over === 0 && matchState.currentBall.ball < 3) {
      console.log('[DEBUG formatTacticsInfo]', {
        hasTacticsState: !!tacticsState,
        hasCurrentAcceleration: !!tacticsState?.currentAcceleration,
        strikerValue: tacticsState?.currentAcceleration?.striker,
        fullCurrentAcceleration: tacticsState?.currentAcceleration
      });
    }

    if (!tacticsState) return '';

    // Get batting acceleration tier
    const battingTier = tacticsState.currentAcceleration?.striker || 'Unknown';

    // Get bowler's bowling plans
    const bowlerId = ballResult.bowlerId;
    const bowler = this.playerStore.getState().getPlayer(bowlerId);
    const bowlerPlans = tacticsState.bowlingPlans?.[bowlerId] || bowler?.tactics?.defaultBowlingPlans || {
      lineLength: 'Wide Line',
      variation: 'Consistent Accuracy'
    };

    return ` [Batting: ${battingTier} | Bowling: ${bowlerPlans.lineLength}, ${bowlerPlans.variation}]`;
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

    // Update tactical state after ball
    this.updateTacticalStateAfterBall(ballResult);

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
   * Update tactical state after ball (confidence, energy, pressure)
   * @param {Object} ballResult - Ball simulation result
   */
  updateTacticalStateAfterBall(ballResult) {
    const matchState = this.matchStore.getState();
    const { innings, teams, currentBall } = matchState;

    // Ensure tacticsState exists
    if (!matchState.tacticsState) {
      matchState.tacticsState = {
        pressureIndex: { batting: 50, bowling: 50 }
      };
    }

    // Get player IDs
    const strikerId = ballResult.batsmanId;
    const bowlerId = ballResult.bowlerId;

    // Get full player objects with current conditions
    const striker = {
      ...this.playerStore.getState().getPlayer(strikerId),
      condition: matchState.matchConditions[strikerId]
    };
    const bowler = {
      ...this.playerStore.getState().getPlayer(bowlerId),
      condition: matchState.matchConditions[bowlerId]
    };

    // Update energy
    const strikerEnergy = energyManager.updateBattingEnergy(striker, 1, ballResult.runs);
    const bowlerOversCount = this.calculateOversBowled(matchState.ballByBall)[bowlerId] || 1;
    const bowlerEnergy = energyManager.updateBowlingEnergy(bowler, bowlerOversCount, 1);

    matchState.matchConditions[strikerId].energy = strikerEnergy;
    matchState.matchConditions[bowlerId].energy = bowlerEnergy;

    // Update pressure based on DLS resources
    const ballsRemaining = currentBall.matchSituation.ballsLeft || 120;
    const wicketsLost = teams.batting.wickets;
    const actualResources = dlsCalculator.getResourcePercentage(ballsRemaining, wicketsLost);

    // Calculate expected resources based on par/target score
    const targetScore = matchState.tacticsState?.battingParScore || 160;
    const currentScore = teams.batting.totalScore;
    const expectedResources = dlsCalculator.calculateExpectedResources(currentScore, targetScore);

    const pressure = pressureCalculator.calculatePressure(actualResources, expectedResources);
    matchState.tacticsState.pressureIndex = pressure;
  }

  /**
   * Handle wicket event
   * @param {Object} ballResult - Ball result containing wicket
   * @returns {Promise<void>}
   */
  async handleWicket(ballResult) {
    const matchState = this.matchStore.getState();
    const { teams, innings } = matchState;

    // Get dismissed player name for logging
    const dismissedPlayer = this.playerStore.getState().getPlayer(ballResult.dismissedPlayer);

    // Check if innings should end (all 10 wickets fallen)
    if (teams.batting.wickets >= this.config.maxWickets) {
      // All out
      innings.isComplete = true;
      console.log(`\n${teams.batting.name} all out for ${teams.batting.totalScore}`);
      return;
    }

    // Bring in new batsman
    const newBatsmanId = this.selectNextBatsman();
    if (!newBatsmanId) {
      innings.isComplete = true;
      console.log(`\n${teams.batting.name} all out for ${teams.batting.totalScore}`);
      return;
    }

    const newBatsman = this.playerStore.getState().getPlayer(newBatsmanId);
    console.log(`${newBatsman.name} comes to the crease`);

    // Update striker/non-striker based on who got out
    if (ballResult.dismissedPlayer === innings.striker) {
      matchState.setOpeningBatsmen(newBatsmanId, innings.nonStriker);
    } else {
      matchState.setOpeningBatsmen(innings.striker, newBatsmanId);
    }
  }

  /**
   * Select next batsman from squad
   * @returns {string|null} Next batsman ID or null if none available
   */
  selectNextBatsman() {
    const matchState = this.matchStore.getState();
    const { teams, innings } = matchState;

    // Use the battedPlayers list maintained by the matchStore
    const battedPlayers = new Set(innings.battedPlayers);

    // First, try to find specialist batsmen
    for (const playerId of teams.batting.squad) {
      if (!battedPlayers.has(playerId)) {
        const player = this.playerStore.getState().getPlayer(playerId);
        if (player && ['batsman', 'all-rounder', 'wicket-keeper'].includes(player.role)) {
          return playerId;
        }
      }
    }

    // If no specialist batsmen available, bowlers can bat (tail-enders)
    for (const playerId of teams.batting.squad) {
      if (!battedPlayers.has(playerId)) {
        const player = this.playerStore.getState().getPlayer(playerId);
        if (player && player.role === 'bowler') {
          return playerId;
        }
      }
    }

    return null; // No more players available - team is all out
  }

  /**
   * Handle start of over (called at ball 0 of each over except first)
   * This handles bowler selection, acceleration tier updates, and user input
   * Note: Strike rotation now happens in handleEndOfOver()
   * @returns {Promise<void>}
   */
  async handleStartOfOver() {
    const matchState = this.matchStore.getState();
    const { teams, currentBall, tacticsState } = matchState;

    // Auto-select acceleration tiers if in auto mode
    if (tacticsState?.accelerationMode === 'auto') {
      const parScore = tacticsState.battingParScore || 160;
      const TRR = tacticsState.targetRunRate || 8.0;
      const ballsRemaining = currentBall.matchSituation.ballsLeft || 120;
      const wicketsLost = teams.batting.wickets;

      const matchSituation = {
        currentRunRate: teams.batting.totalScore / ((currentBall.over * 6 + currentBall.ball) / 6 || 1),
        requiredRunRate: TRR
      };

      const newTier = accelerationTierManager.autoSelectTier(
        matchSituation,
        parScore,
        teams.batting.totalScore,
        ballsRemaining,
        wicketsLost
      );

      tacticsState.currentAcceleration.striker = newTier;
      tacticsState.currentAcceleration.nonStriker = newTier;
    }

    // Select new bowler (can't bowl consecutive overs)
    const newBowler = this.selectNextBowler();
    if (newBowler) {
      matchState.setCurrentBowler(newBowler);
    }

    // Call interactive callback if in interactive mode
    if (this.config.interactiveMode && this.onStartOfOver) {
      await this.onStartOfOver(matchState);
    }
  }

  /**
   * Handle end of over (called after 6th ball is bowled)
   * Rotates strike and displays summary
   * Note: Strike ALWAYS rotates at end of over. If last ball scored odd runs (1,3,5),
   * this creates a double rotation (once for odd runs, once for end of over), which is
   * CORRECT cricket behavior - the batsman facing at end of over becomes non-striker.
   * @returns {Promise<void>}
   */
  async handleEndOfOver() {
    const matchState = this.matchStore.getState();
    const { teams, currentBall } = matchState;

    // Rotate strike at end of over (always happens in cricket)
    this.rotateStrike();

    // Display over summary
    console.log(`--- End of over ${currentBall.over}: ${teams.batting.name} ${teams.batting.totalScore}/${teams.batting.wickets} ---\n`);
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

    // Get all potential bowlers (anyone except wicketkeeper)
    const potentialBowlers = teams.bowling.squad
      .map(playerId => this.playerStore.getState().getPlayer(playerId))
      .filter(player => player && player.role !== 'wicket-keeper');

    // Calculate bowling rating for each player
    const bowlersWithRatings = potentialBowlers.map(player => {
      const bowlingAttrs = player.attributes.bowling;
      const bowlingRating = Object.values(bowlingAttrs).reduce((a, b) => a + b, 0) / Object.keys(bowlingAttrs).length;

      return {
        id: player.id,
        player,
        bowlingRating,
        oversBowled: oversBowled[player.id] || 0
      };
    });

    // Sort by bowling rating (descending) to identify top bowlers
    bowlersWithRatings.sort((a, b) => b.bowlingRating - a.bowlingRating);

    // Determine bowling attack: prefer specialist bowlers/all-rounders
    const specialistBowlers = bowlersWithRatings.filter(b =>
      b.player.role === 'bowler' || b.player.role === 'all-rounder'
    );

    // Primary bowling attack: use only specialists
    let bowlingAttack = specialistBowlers;

    // If we have fewer than 4 specialists, add part-timers as backup
    if (bowlingAttack.length < 4) {
      const partTimers = bowlersWithRatings.filter(b =>
        b.player.role !== 'bowler' && b.player.role !== 'all-rounder'
      );
      const needed = Math.min(4 - bowlingAttack.length, partTimers.length);
      bowlingAttack = [...specialistBowlers, ...partTimers.slice(0, needed)];
    }

    // Find available bowlers from the bowling attack
    const availableBowlers = bowlingAttack.filter(b =>
      b.id !== currentBowler &&
      b.oversBowled < this.config.maxBowlerOvers
    );

    if (availableBowlers.length === 0) {
      // Emergency: allow current bowler to continue or pick anyone available
      const anyAvailable = bowlersWithRatings.filter(b =>
        b.id !== currentBowler &&
        b.oversBowled < this.config.maxBowlerOvers
      );

      if (anyAvailable.length > 0) {
        return anyAvailable[0].id;
      }
      return currentBowler;
    }

    // Select bowler with least overs from the bowling attack
    const selectedBowler = availableBowlers.reduce((prev, curr) =>
      curr.oversBowled < prev.oversBowled ? curr : prev
    );

    // Assign bowlingType if not present
    if (!selectedBowler.player.bowlingType) {
      const bowlingAttrs = selectedBowler.player.attributes.bowling;
      if (bowlingAttrs.bowlingSpeed > 12) {
        selectedBowler.player.bowlingType = 'fast';
      } else if (bowlingAttrs.turn > 10 || bowlingAttrs.variations > 10) {
        selectedBowler.player.bowlingType = Math.random() > 0.5 ? 'off-spin' : 'leg-spin';
      } else {
        selectedBowler.player.bowlingType = 'medium';
      }
    }

    return selectedBowler.id;
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
   * Check if end of over (just completed 6th ball)
   * @returns {boolean} Whether it's end of over
   */
  isEndOfOver() {
    const matchState = this.matchStore.getState();
    // After processBallResult, if ball is 0 and over > 0, we just completed an over
    // This is checked AFTER processBallResult has incremented the counters
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

    // Finalize tactical state (energy, fatigue, morale)
    this.finalizeTacticalState();

    // Determine match result
    const result = this.calculateMatchResult(teams, innings);

    // Update match store
    matchState.completeMatch(result.description);

    console.log('Match completed:', result.description);

    return result;
  }

  /**
   * Finalize tactical state at match end
   */
  finalizeTacticalState() {
    const matchState = this.matchStore.getState();
    const { teams } = matchState;

    // Get all players
    const allPlayers = [...teams.batting.squad, ...teams.bowling.squad].map(id => ({
      ...this.playerStore.getState().getPlayer(id),
      condition: matchState.matchConditions[id]
    }));

    // Finalize energy (updates fitness, fatigue, and injuries)
    const energyUpdates = energyManager.finalizeMatchEnergy(allPlayers);

    // Apply updates to player conditions
    Object.entries(energyUpdates).forEach(([playerId, updates]) => {
      const player = this.playerStore.getState().getPlayer(playerId);
      if (player && player.condition) {
        player.condition.fitness = updates.fitness;
        player.condition.fatigue = updates.fatigue;
        if (updates.injuryDuration) {
          player.condition.injuryDuration = updates.injuryDuration;
          console.log(`⚠️ ${player.name} injured for ${updates.injuryDuration} days`);
        }
      }
    });

    console.log('Tactical state finalized: energy, fatigue, and injuries updated');
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