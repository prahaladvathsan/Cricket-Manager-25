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
import { buildFielderArray } from '../../../utils/fielderArrayBuilder.js';
import { applyPlaystyleOverrides, restoreOriginalPlaystyles } from '../../TacticsLoader.js';

// DEBUG: Set to true to enable match engine debugging
const DEBUG_MATCH_ENGINE = false;

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
  constructor(matchStore, playerStore, teamStore, options = {}) {
    const { silent = false } = options;

    this.matchStore = matchStore;
    this.playerStore = playerStore;
    this.teamStore = teamStore;
    this.ballSimulator = new SimpleBallSimulator({ silent });

    // Field formations for testing - will be randomly assigned
    this.fieldFormations = ['attacking_pace_cordon', 'neutral_orthodox', 'defensive_ring_fence'];
    this.currentFieldFormation = null;

    // Match configuration
    this.config = {
      maxOvers: 20,
      maxWickets: 10,
      powerplayOvers: 6,
      maxBowlerOvers: 4,
      simulationSpeed: 'instant', // normal | fast | instant
      interactiveMode: false, // Set to true for interactive matches with user control
      showBallByBall: true // Set to false to hide ball-by-ball commentary
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
      // Ensure both teams have complete bowling rotations (auto-complete if needed)
      const homeTeamId = matchConfig.homeTeam.id;
      const awayTeamId = matchConfig.awayTeam.id;
      this.teamStore.getState().ensureCompleteBowlingRotation(homeTeamId);
      this.teamStore.getState().ensureCompleteBowlingRotation(awayTeamId);

      // Apply playstyle overrides for both teams BEFORE match starts
      const homeTactics = this.teamStore.getState().getTacticsForMatch(homeTeamId);
      const awayTactics = this.teamStore.getState().getTacticsForMatch(awayTeamId);

      if (homeTactics?.playstyleOverrides) {
        applyPlaystyleOverrides(this.playerStore, homeTactics.playstyleOverrides);
      }
      if (awayTactics?.playstyleOverrides) {
        applyPlaystyleOverrides(this.playerStore, awayTactics.playstyleOverrides);
      }

      // Initialize match in store
      this.matchStore.getState().initializeMatch(matchConfig);

      // Load bowling plans and rotation from team tactics for the bowling team
      const matchState = this.matchStore.getState();
      const bowlingTeamId = matchState.teams.bowling.id;
      const teamTactics = this.teamStore.getState().getTacticsForMatch(bowlingTeamId);

      if (teamTactics) {
        const tacticsUpdate = {};

        // Load bowling plans
        if (teamTactics.bowlingPlans) {
          tacticsUpdate.bowlingPlans = teamTactics.bowlingPlans;
        }

        // Convert bowling rotation array to overAssignments object
        // bowlingRotation is an array where index = over number (0-19)
        // overAssignments is an object where key = over number (1-20), value = bowler ID
        if (teamTactics.bowlingRotation && teamTactics.bowlingRotation.length > 0) {
          const overAssignments = {};
          teamTactics.bowlingRotation.forEach((bowlerId, index) => {
            if (bowlerId) {
              overAssignments[index + 1] = bowlerId; // Convert from 0-indexed to 1-indexed
            }
          });
          tacticsUpdate.overAssignments = overAssignments;
        }

        // Update matchStore with tactics
        if (Object.keys(tacticsUpdate).length > 0) {
          this.matchStore.getState().updateTacticsState(tacticsUpdate);
        }
      }

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

    // Select opening batsmen from batting order
    const battingSquad = teams.batting.squad;
    if (battingSquad.length < 2) {
      throw new Error('Insufficient batsmen in squad');
    }

    // Get batting order from team tactics
    const teamTactics = this.teamStore.getState().getTeamTactics(innings.battingTeam);
    const battingOrder = teamTactics?.battingOrder || [];

    // Use batting order if available, otherwise use squad order
    let striker, nonStriker;
    if (battingOrder.length >= 2) {
      striker = battingOrder[0];
      nonStriker = battingOrder[1];
      //console.log('[MatchEngine setupOpeningPlayers] Using batting order:', striker, nonStriker);
    } else {
      striker = battingSquad[0];
      nonStriker = battingSquad[1];
      //console.log('[MatchEngine setupOpeningPlayers] No batting order found, using squad order');
    }

    // Select opening bowler (first bowler in squad)
    const bowlingSquad = teams.bowling.squad;
    const openingBowler = this.selectNextBowler();

    // Update match state
    matchState.setOpeningBatsmen(striker, nonStriker);
    matchState.setCurrentBowler(openingBowler);

    // Set up field formation - create team object with players from matchState
    const bowlingTeamWithPlayers = {
      ...bowlingTeam,
      players: bowlingSquad  // Add squad (player IDs) from matchState
    };
    this.setupFieldFormation(bowlingTeamWithPlayers);

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
    if (DEBUG_MATCH_ENGINE) {
      console.log('[MatchEngine] setupFieldFormation called with:', {
        hasPlayers: !!bowlingTeam?.players,
        playersLength: bowlingTeam?.players?.length,
        teamName: bowlingTeam?.name
      });
    }

    // Get all 11 fielders (including bowler and wicket-keeper)
    const allFielders = bowlingTeam.players.map(p => ({
      ...this.playerStore.getState().getPlayer(p.id || p),
      id: p.id || p
    }));

    // Find wicketkeeper by role
    const wicketKeeper = this.getWicketKeeper(bowlingTeam.players);

    // Filter out wicketkeeper from remaining fielders to avoid duplication
    const nonKeeperFielders = allFielders.filter(f => f.id !== wicketKeeper.id);

    // Take first 9 non-keeper fielders (we need 11 total: 1 bowler + 1 keeper + 9 others)
    const otherFielders = nonKeeperFielders.slice(0, 9);

    // Ensure we have exactly 11 fielders with keeper at position 1
    // Position 0 is bowler (will be updated dynamically during match)
    // Position 1 is wicketkeeper (guaranteed to be the actual keeper)
    // Positions 2-10 are other fielders (9 fielders)
    const fielders = [
      nonKeeperFielders[0] || allFielders[0], // Position 0: bowler placeholder (first non-keeper)
      wicketKeeper,                            // Position 1: wicketkeeper (guaranteed)
      ...otherFielders                         // Positions 2-10: remaining 9 fielders
    ];

    if (fielders.length < 11) {
      console.warn(`Only ${fielders.length} fielders available, need 11. Using available fielders.`);
      // Pad with duplicates if necessary
      while (fielders.length < 11 && allFielders.length > 0) {
        fielders.push(allFielders[fielders.length % allFielders.length]);
      }
    }

    // Get formation from matchStore (set by user via TacticsHub or use default)
    const matchState = this.matchStore.getState();
    const currentFormation = matchState.innings?.currentFieldFormation || 'neutral_orthodox';
    this.currentFieldFormation = currentFormation;

    // Set field formation in the ball simulator
    const fieldingPositions = this.ballSimulator.setFieldFormation(this.currentFieldFormation, fielders);

    // Store fielding positions for later use
    this.fieldingPositions = fieldingPositions;

    // Store bowling squad for later use in refreshFieldingPositions()
    this.bowlingSquad = bowlingTeam.players;

    if (DEBUG_MATCH_ENGINE) {
      console.log('[MatchEngine] Field formation setup complete:', {
        formation: this.currentFieldFormation,
        positionsLength: fieldingPositions?.length,
        storedPositionsLength: this.fieldingPositions?.length,
        wicketKeeper: wicketKeeper.name,
        wicketKeeperAtPosition1: this.fieldingPositions[1]?.fielder?.id === wicketKeeper.id
      });
    }

    if (this.config.showBallByBall) {
      console.log(`Field formation set: ${this.currentFieldFormation} with ${fieldingPositions.length} positioned fielders (keeper: ${wicketKeeper.name})`);
    }
  }

  /**
   * Refresh fielding positions with current bowler (CALLED BEFORE EACH BALL)
   * CRITICAL: This ensures position 0 always has the current bowler for accurate physics
   *
   * Tactics Integration:
   * - Reads currentFieldFormation from matchStore (updated by TacticsHub UI)
   * - User changes in TacticsHub are immediately reflected in next ball simulation
   * - Formation changes during match are fully supported
   *
   * @param {string} currentBowlerId - Current bowler's player ID
   */
  refreshFieldingPositions(currentBowlerId) {
    // Build standardized fielder array with current bowler at position 0
    const fielders = buildFielderArray({
      bowlingSquad: this.bowlingSquad,
      currentBowlerId: currentBowlerId,
      playerStore: this.playerStore
    });

    if (fielders.length === 0) {
      console.error('[MatchEngine] Failed to build fielder array');
      return;
    }

    // Get current formation from matchStore (updated by TacticsHub when user changes formation)
    // This ensures user changes are immediately picked up in the next ball simulation
    const matchState = this.matchStore.getState();
    const currentFormation = matchState.innings?.currentFieldFormation || this.currentFieldFormation;

    // Update formation if changed
    if (currentFormation !== this.currentFieldFormation) {
      this.currentFieldFormation = currentFormation;
      if (this.config.showBallByBall) {
        console.log(`Field formation updated to: ${currentFormation}`);
      }
    }

    // Set field formation in the ball simulator with current fielders
    const fieldingPositions = this.ballSimulator.setFieldFormation(this.currentFieldFormation, fielders);

    // Store fielding positions for this ball
    this.fieldingPositions = fieldingPositions;

    const DEBUG_REFRESH = false;
    if (DEBUG_REFRESH) {
      console.log('[MatchEngine] Fielding positions refreshed:', {
        currentBowler: fielders[0]?.name,
        keeper: fielders[1]?.name,
        formation: this.currentFieldFormation,
        totalPositions: fieldingPositions?.length
      });
    }
  }

  /**
   * Update fielding positions when bowler changes
   * Swaps the previous bowler back to their fielding position and new bowler to bowling position
   * @param {string} previousBowlerId - ID of previous bowler
   * @param {string} newBowlerId - ID of new bowler
   */
  updateFieldingPositionsForBowlerChange(previousBowlerId, newBowlerId) {
    if (!this.fieldingPositions || this.fieldingPositions.length === 0) {
      return; // No positions to update
    }

    // Find the positions of both bowlers in the fielding array
    let previousBowlerIndex = -1;
    let newBowlerIndex = -1;

    for (let i = 0; i < this.fieldingPositions.length; i++) {
      const fielder = this.fieldingPositions[i].fielder;
      if (fielder && fielder.id === previousBowlerId) {
        previousBowlerIndex = i;
      }
      if (fielder && fielder.id === newBowlerId) {
        newBowlerIndex = i;
      }
    }

    // Swap the fielders in the positions array
    if (previousBowlerIndex !== -1 && newBowlerIndex !== -1) {
      const temp = this.fieldingPositions[previousBowlerIndex].fielder;
      this.fieldingPositions[previousBowlerIndex].fielder = this.fieldingPositions[newBowlerIndex].fielder;
      this.fieldingPositions[newBowlerIndex].fielder = temp;

      if (this.config.showBallByBall) {
        const prevBowler = this.playerStore.getState().getPlayer(previousBowlerId);
        const newBowler = this.playerStore.getState().getPlayer(newBowlerId);
        console.log(`Fielding swap: ${prevBowler?.name} returns to field, ${newBowler?.name} takes the ball`);
      }
    }
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

    // Initialize match situation tracking for confidence/energy updates
    if (!matchState.matchTracking) {
      matchState.matchTracking = {};
    }
    matchState.matchTracking.consecutiveDots = {};      // playerId → consecutive dot ball count
    matchState.matchTracking.batsmanMilestones = {};    // playerId → [25, 50, ...] milestones reached
    matchState.matchTracking.overTargets = {};          // teamId → required run rate for current over
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
        // NOTE: bowlingPlans should already be loaded from team tactics, don't reset them here
        pressureIndex: {
          batting: 50,
          bowling: 50
        }
      });
    }

    if (this.config.showBallByBall) {
      console.log(`Tactical state initialized: Par ${parScore}, TRR ${targetRunRate.toFixed(2)}`);
    }
  }

  /**
   * Calculate over targets (run rate) for confidence updates
   * @param {Object} matchState - Match state
   * @returns {number} Required run rate for batting team
   */
  calculateOverTargets(matchState) {
    const { innings, teams } = matchState;
    const currentOver = Math.floor((teams.batting.balls || 0) / 6) + 1;
    const remainingOvers = Math.max(0.1, 20 - currentOver);

    if (innings.number === 2 && innings.target) {
      // Second innings: Calculate required run rate to reach target
      const currentScore = teams.batting.totalScore || 0;
      const runsNeeded = Math.max(0, innings.target - currentScore);
      return runsNeeded / remainingOvers;
    } else {
      // First innings: Use par score (180 for T20)
      return 9.0; // 180 runs / 20 overs
    }
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
        // No inter-ball delay - delay is now inside simulateBall() between modifier display and outcome
      }

      // Only proceed with match completion/second innings if NOT paused
      if (!this.isPaused) {
        // Check if match is complete or needs second innings
        if (this.isMatchComplete()) {
          await this.completeMatch();
        } else if (this.isInningsComplete()) {
          await this.startSecondInnings();
        }
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

    // Log header at the very start of ball simulation (before any other logs)
    // const ballNumber = matchState.ballByBall.length + 1;
    // const ballNotation = `${currentBall.over}.${currentBall.ball + 1}`;
    // console.log('\n' + '═'.repeat(80));
    // console.log(`🏏 BALL #${ballNumber} | Over ${ballNotation}`);
    // console.log('═'.repeat(80));

    // CRITICAL: Refresh fielding positions with current bowler BEFORE ball simulation
    // This ensures position 0 has the actual current bowler, not a placeholder
    this.refreshFieldingPositions(innings.bowler);

    // Check if we need to handle start of over
    if (this.isStartOfOver() && !(currentBall.over === 0 && currentBall.ball === 0)) {
      await this.handleStartOfOver();
      // After start of over, bowler may change, so get fresh state
      matchState = this.matchStore.getState();
      ({ currentBall, innings, teams } = matchState);

      // Refresh fielding positions again if bowler changed
      this.refreshFieldingPositions(innings.bowler);
    }

    // Get player objects
    const striker = this.playerStore.getState().getPlayer(innings.striker);
    const nonStriker = this.playerStore.getState().getPlayer(innings.nonStriker);
    const bowler = this.playerStore.getState().getPlayer(innings.bowler);

    // Debug: Log who is facing this ball
    // if (DEBUG_MATCH_ENGINE && currentBall.over === 0 && currentBall.ball < 3) {
    //   console.log(`[MatchEngine simulateBall] Over ${currentBall.over}.${currentBall.ball} - Striker: ${striker?.name} (${innings.striker}), Non-Striker: ${nonStriker?.name} (${innings.nonStriker})`);
    // }

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

    // NOTE: Formation change handling is now done in refreshFieldingPositions()
    // which is called at the start of simulateBall() before we reach this point
    // No need for duplicate logic here

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

    // DEBUG: Log fielding team context on first few balls
    // if (DEBUG_MATCH_ENGINE && currentBall.over === 0 && currentBall.ball < 3) {
    //   console.log('[MatchEngine] Ball context fielding team:', {
    //     bowlingSquadLength: teams.bowling.squad.length,
    //     fieldingPositionsLength: this.fieldingPositions?.length,
    //     hasFieldingPositions: !!this.fieldingPositions,
    //     over: currentBall.over,
    //     ball: currentBall.ball
    //   });
    // }

    // Simulate the ball
    const ballResult = await this.ballSimulator.simulateBall(ballContext);

    // Add batsman and bowler info to ball result for tracking
    ballResult.batsmanId = striker.id;
    ballResult.bowlerId = bowler.id;
    ballResult.strikerName = striker.name;
    ballResult.nonStrikerName = nonStriker.name;
    ballResult.bowlerName = bowler.name;

    // Set dismissed player if wicket (always the striker in current implementation)
    if (ballResult.isWicket) {
      ballResult.dismissedPlayer = striker.id;
      ballResult.dismissedPlayerName = striker.name;

      // Add fielder information for catches and stumpings
      if (ballResult.dismissalType === 'caught' && ballResult.fieldingAction?.fielder) {
        // Aerial catch from 2D fielding system - has fielding action
        const fielderObj = ballResult.fieldingAction.fielder.fielder || ballResult.fieldingAction.fielder;
        ballResult.fielderId = fielderObj.id;
        ballResult.fielderName = fielderObj.name;
      } else if (ballResult.dismissalType === 'caught_behind') {
        // Caught behind from trajectory calculator - credit wicketkeeper
        ballResult.fielderId = wicketKeeper.id;
        ballResult.fielderName = wicketKeeper.name;
      } else if (ballResult.dismissalType === 'stumped') {
        // Stumping is by wicket keeper
        ballResult.fielderId = wicketKeeper.id;
        ballResult.fielderName = wicketKeeper.name;
      } else if (ballResult.dismissalType === 'run_out' && ballResult.fieldingAction?.fielder) {
        // Run out with fielding action data
        const fielderObj = ballResult.fieldingAction.fielder.fielder || ballResult.fieldingAction.fielder;
        ballResult.fielderId = fielderObj.id;
        ballResult.fielderName = fielderObj.name;
      }
    }

    // STEP 1: Store and display modifier breakdown immediately (before ball outcome)
    if (ballResult.modifierBreakdown) {
      this.matchStore.getState().setModifierBreakdown({
        ...ballResult.modifierBreakdown,
        strikerName: striker.name,
        bowlerName: bowler.name
      });
    }

    // STEP 2: Add delay to show modifiers before outcome (1.5 seconds)
    if (this.config.simulationSpeed === 'normal') {
      await this.delay(1500);
    } else if (this.config.simulationSpeed === 'fast') {
      await this.delay(500);
    }
    // No delay for instant mode

    // STEP 3: Process ball result (applies outcome to UI)
    matchState.processBallResult(ballResult);

    // Extract tactics information (get fresh state after processBallResult)
    const freshState = this.matchStore.getState();
    const tacticsInfo = this.formatTacticsInfo(ballResult, freshState);

    // Format and display ball result
    if (this.config.showBallByBall) {
      const resultText = this.formatBallResult(ballResult);
      // console.log(`${currentBall.over}.${currentBall.ball + 1}: ${bowler.name} to ${striker.name}, ${resultText}${tacticsInfo}`);
    }

    // Check if target reached immediately after processing ball result
    if (innings.number === 2 && teams.batting.totalScore >= innings.target) {
      innings.isComplete = true;
      // console.log(`\nTarget reached! ${teams.batting.name} wins by ${this.config.maxWickets - teams.batting.wickets} wickets`);
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

    // Ensure matchConditions exists for these players
    if (!matchState.matchConditions[strikerId]) {
      matchState.matchConditions[strikerId] = { energy: 100, confidence: 50, fatigue: 0 };
    }
    if (!matchState.matchConditions[bowlerId]) {
      matchState.matchConditions[bowlerId] = { energy: 100, confidence: 50, fatigue: 0 };
    }

    // Update energy
    const strikerEnergy = energyManager.updateBattingEnergy(striker, 1, ballResult.runs);
    const bowlerOversCount = this.calculateOversBowled(matchState.ballByBall)[bowlerId] || 1;
    const bowlerEnergy = energyManager.updateBowlingEnergy(bowler, bowlerOversCount, 1);

    matchState.matchConditions[strikerId].energy = strikerEnergy;
    matchState.matchConditions[bowlerId].energy = bowlerEnergy;

    // Update fielding energy for all fielders
    const fieldingTeamSquad = innings.bowlingTeam === teams.bowling.id
      ? teams.bowling.squad
      : teams.batting.squad;

    fieldingTeamSquad.forEach(fielderId => {
      if (!matchState.matchConditions[fielderId]) {
        matchState.matchConditions[fielderId] = { energy: 100, confidence: 50, fatigue: 0 };
      }

      const fielder = {
        ...this.playerStore.getState().getPlayer(fielderId),
        condition: matchState.matchConditions[fielderId]
      };

      const action = {
        type: 'field',
        isCatch: ballResult.isWicket && (ballResult.dismissalType === 'caught' || ballResult.dismissalType === 'caught and bowled'),
        isBoundary: ballResult.runs === 4 || ballResult.runs === 6
      };

      const fielderEnergy = energyManager.updateFieldingEnergy(fielder, action);
      matchState.matchConditions[fielderId].energy = fielderEnergy;
    });

    // Initialize match tracking if not exists
    if (!matchState.matchTracking) {
      matchState.matchTracking = {
        consecutiveDots: {},
        batsmanMilestones: {},
        overTargets: {}
      };
    }

    // Track consecutive dots
    const isDot = ballResult.runs === 0 && !ballResult.isWicket && !ballResult.isExtra;
    if (isDot) {
      matchState.matchTracking.consecutiveDots[strikerId] =
        (matchState.matchTracking.consecutiveDots[strikerId] || 0) + 1;
    } else {
      matchState.matchTracking.consecutiveDots[strikerId] = 0;
    }

    // Track milestones (25, 50 runs)
    if (!matchState.matchTracking.batsmanMilestones[strikerId]) {
      matchState.matchTracking.batsmanMilestones[strikerId] = [];
    }

    // Get striker's current score from ballByBall data
    const strikerScore = this.getPlayerScore(matchState.ballByBall, strikerId);
    const milestones = matchState.matchTracking.batsmanMilestones[strikerId];

    if (strikerScore >= 25 && !milestones.includes(25)) {
      milestones.push(25);
    }
    if (strikerScore >= 50 && !milestones.includes(50)) {
      milestones.push(50);
    }

    // Calculate over target (run rate)
    const overTarget = this.calculateOverTargets(matchState);
    matchState.matchTracking.overTargets[innings.battingTeam] = overTarget;

    // Prepare confidence update data
    const confidenceResult = {
      runs: ballResult.runs,
      isWicket: ballResult.isWicket,
      isBoundary: ballResult.runs === 4 || ballResult.runs === 6,
      consecutiveDots: matchState.matchTracking.consecutiveDots[strikerId] || 0
    };

    // Check if over just completed for over-level confidence updates
    const ballsThisOver = (teams.batting.balls % 6) || 6;
    const isOverComplete = ballsThisOver === 6;

    let overResult = null;
    if (isOverComplete) {
      // Calculate over statistics
      const overBalls = matchState.ballByBall.slice(-6);
      const overRuns = overBalls.reduce((sum, b) => sum + (b.bowlerId === bowlerId ? b.runs : 0), 0);
      const overWickets = overBalls.filter(b => b.bowlerId === bowlerId && b.isWicket).length;
      const isMaiden = overRuns === 0 && overWickets === 0;

      // Get bowler's total wickets this match
      const bowlerWickets = matchState.ballByBall.filter(b => b.bowlerId === bowlerId && b.isWicket).length;
      const wicketHaul = bowlerWickets >= 3 ? bowlerWickets : null;

      overResult = {
        isMaiden,
        wicketsInOver: overWickets,
        wicketHaul
      };
    }

    // Prepare match situation for confidence updates
    const strikerBalls = matchState.ballByBall.filter(b => b.batsmanId === strikerId).length;
    const actualRunRate = strikerBalls > 0 ? (strikerScore / strikerBalls) * 6 : 0;

    // Check if batsman just reached a milestone
    const recentMilestone = milestones.length > 0 ? milestones[milestones.length - 1] : null;
    const justReachedMilestone = recentMilestone && strikerScore === recentMilestone;

    const matchSituation = {
      batterScore: strikerScore,
      batterBalls: strikerBalls,
      overNumber: Math.floor(teams.batting.balls / 6) + 1,
      overTarget: overTarget,
      actualRunRate: actualRunRate,
      recentMilestone: justReachedMilestone ? recentMilestone : null
    };

    // Update batting confidence
    const strikerConfidence = confidenceManager.updateBattingConfidence(
      striker,
      confidenceResult,
      overResult,
      matchSituation
    );

    // Update bowling confidence
    const bowlerConfidence = confidenceManager.updateBowlingConfidence(
      bowler,
      confidenceResult,
      overResult,
      matchSituation
    );

    // Store updated confidence values
    matchState.matchConditions[strikerId].confidence = strikerConfidence;
    matchState.matchConditions[bowlerId].confidence = bowlerConfidence;

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
    // console.log('[MatchEngine handleWicket] Dismissed:', dismissedPlayer?.name, 'ID:', ballResult.dismissedPlayer);
    // console.log('[MatchEngine handleWicket] Current batsmen - Striker:', innings.striker, 'Non-Striker:', innings.nonStriker);
    // console.log('[MatchEngine handleWicket] Batted players before:', innings.battedPlayers);

    // Check if innings should end (all 10 wickets fallen)
    if (teams.batting.wickets >= this.config.maxWickets) {
      // All out
      innings.isComplete = true;
      // console.log(`\n${teams.batting.name} all out for ${teams.batting.totalScore}`);
      return;
    }

    // Bring in new batsman
    const newBatsmanId = this.selectNextBatsman();
    if (!newBatsmanId) {
      innings.isComplete = true;
      // console.log(`\n${teams.batting.name} all out for ${teams.batting.totalScore}`);
      return;
    }

    const newBatsman = this.playerStore.getState().getPlayer(newBatsmanId);
    // console.log(`[MatchEngine handleWicket] New batsman: ${newBatsman.name} (ID: ${newBatsmanId})`);

    // Initialize match conditions for new batsman if not already initialized
    if (!matchState.matchConditions[newBatsmanId]) {
      // console.log(`[MatchEngine handleWicket] Initializing match conditions for ${newBatsman.name}`);
      matchState.matchConditions[newBatsmanId] = { energy: 100, confidence: 50, fatigue: 0 };
    }

    // Update striker/non-striker based on who got out
    if (ballResult.dismissedPlayer === innings.striker) {
      // console.log('[MatchEngine handleWicket] Striker got out, replacing striker with new batsman');
      matchState.setOpeningBatsmen(newBatsmanId, innings.nonStriker);
    } else {
      // console.log('[MatchEngine handleWicket] Non-striker got out, replacing non-striker with new batsman');
      matchState.setOpeningBatsmen(innings.striker, newBatsmanId);
    }

    // Verify update
    const newState = this.matchStore.getState();
    // console.log('[MatchEngine handleWicket] After update - Striker:', newState.innings.striker, 'Non-Striker:', newState.innings.nonStriker);
    // console.log('[MatchEngine handleWicket] Batted players after:', newState.innings.battedPlayers);
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

    // Get batting order from team tactics
    const teamTactics = this.teamStore.getState().getTeamTactics(teams.batting.id);
    const battingOrder = teamTactics?.battingOrder || [];

    // console.log('[MatchEngine selectNextBatsman] battingOrder:', battingOrder);
    // console.log('[MatchEngine selectNextBatsman] battedPlayers:', Array.from(battedPlayers));

    // If batting order is defined, use it
    if (battingOrder.length > 0) {
      for (const playerId of battingOrder) {
        if (!battedPlayers.has(playerId)) {
          const player = this.playerStore.getState().getPlayer(playerId);
          if (player) {
            // console.log('[MatchEngine selectNextBatsman] Selected from batting order:', player.name, playerId);
            return playerId;
          }
        }
      }
    } else {
      // Fallback: use role-based selection
      // console.log('[MatchEngine selectNextBatsman] No batting order found, using role-based selection');

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
    const { teams, currentBall, tacticsState, innings } = matchState;

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

    // Store previous bowler before selecting new one
    const previousBowler = innings.bowler;

    // Select new bowler (can't bowl consecutive overs)
    const newBowler = this.selectNextBowler();
    if (newBowler) {
      matchState.setCurrentBowler(newBowler);

      // Update fielding positions: swap previous bowler back to field, new bowler to bowling position
      this.updateFieldingPositionsForBowlerChange(previousBowler, newBowler);
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
    if (this.config.showBallByBall) {
      console.log(`--- End of over ${currentBall.over}: ${teams.batting.name} ${teams.batting.totalScore}/${teams.batting.wickets} ---\n`);
    }
  }

  /**
   * Rotate strike between batsmen
   */
  rotateStrike() {
    const matchState = this.matchStore.getState();
    const { striker, nonStriker } = matchState.innings;

    const strikerPlayer = this.playerStore.getState().getPlayer(striker);
    const nonStrikerPlayer = this.playerStore.getState().getPlayer(nonStriker);

    //console.log('[MatchEngine rotateStrike] Before:', strikerPlayer?.name, '→', nonStrikerPlayer?.name);
    matchState.setOpeningBatsmen(nonStriker, striker);

    // Verify strike rotated
    const newState = this.matchStore.getState();
    const newStrikerPlayer = this.playerStore.getState().getPlayer(newState.innings.striker);
    const newNonStrikerPlayer = this.playerStore.getState().getPlayer(newState.innings.nonStriker);
    //console.log('[MatchEngine rotateStrike] After:', newStrikerPlayer?.name, '→', newNonStrikerPlayer?.name);
  }

  /**
   * Select next bowler for new over
   * Uses ONLY pre-assigned bowling rotation from team tactics
   * No fallback logic - assignments must be complete before match starts
   * @returns {string} Next bowler ID
   */
  selectNextBowler() {
    const matchState = this.matchStore.getState();
    const { teams, currentBall, tacticsState } = matchState;

    // Get over assignments from tactics
    const overAssignments = tacticsState?.overAssignments || {};
    const upcomingOverNumber = currentBall.over + 1; // Next over (0-indexed in currentBall, 1-indexed in assignments)
    const assignedBowlerId = overAssignments[upcomingOverNumber];

    // Validate assignment exists
    if (!assignedBowlerId) {
      throw new Error(
        `No bowler assigned for over ${upcomingOverNumber}. ` +
        `Bowling rotation should have been auto-completed during match initialization.`
      );
    }

    // Validate bowler exists and is in playing XI
    const assignedPlayer = this.playerStore.getState().getPlayer(assignedBowlerId);
    const isInPlayingXI = teams.bowling.squad.includes(assignedBowlerId);

    if (!assignedPlayer) {
      throw new Error(
        `Assigned bowler ${assignedBowlerId} for over ${upcomingOverNumber} does not exist.`
      );
    }

    if (!isInPlayingXI) {
      throw new Error(
        `Assigned bowler ${assignedPlayer.name} for over ${upcomingOverNumber} is not in the playing XI. ` +
        `This should not happen - bowling rotation should only contain players from playing XI.`
      );
    }

    if (this.config.showBallByBall) {
      console.log(`✓ Over ${upcomingOverNumber}: ${assignedPlayer.name} to bowl`);
    }

    return assignedBowlerId;
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
   * Get player's current score from ball-by-ball record
   * @param {Array} ballByBall - Ball by ball record
   * @param {string} playerId - Player ID
   * @returns {number} Player's runs scored
   */
  getPlayerScore(ballByBall, playerId) {
    return ballByBall
      .filter(ball => ball.batsmanId === playerId && !ball.isExtra)
      .reduce((total, ball) => total + ball.runs, 0);
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

    // Load bowling plans and rotation from team tactics for the new bowling team (second innings)
    const updatedMatchState = this.matchStore.getState();
    const bowlingTeamId = updatedMatchState.teams.bowling.id;
    const teamTactics = this.teamStore.getState().getTacticsForMatch(bowlingTeamId);

    if (teamTactics) {
      const tacticsUpdate = {};

      // Load bowling plans
      if (teamTactics.bowlingPlans) {
        tacticsUpdate.bowlingPlans = teamTactics.bowlingPlans;
      }

      // Convert bowling rotation array to overAssignments object
      // bowlingRotation is an array where index = over number (0-19)
      // overAssignments is an object where key = over number (1-20), value = bowler ID
      if (teamTactics.bowlingRotation && teamTactics.bowlingRotation.length > 0) {
        const overAssignments = {};
        teamTactics.bowlingRotation.forEach((bowlerId, index) => {
          if (bowlerId) {
            overAssignments[index + 1] = bowlerId; // Convert from 0-indexed to 1-indexed
          }
        });
        tacticsUpdate.overAssignments = overAssignments;
      }

      // Update matchStore with tactics for the new bowling team
      if (Object.keys(tacticsUpdate).length > 0) {
        this.matchStore.getState().updateTacticsState(tacticsUpdate);
      }
    }

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

    // Clean up playstyle overrides for all players from both teams
    const allPlayerIds = [...new Set([...teams.batting.squad, ...teams.bowling.squad])];
    restoreOriginalPlaystyles(this.playerStore, allPlayerIds);

    // Update match store with full result object (including winner)
    this.matchStore.getState().completeMatch(result);

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
        // Calculate injury severity based on duration
        let injurySeverity = null;
        if (updates.injuryDuration) {
          if (updates.injuryDuration <= 30) {
            injurySeverity = 'minor';
          } else if (updates.injuryDuration <= 60) {
            injurySeverity = 'major';
          } else {
            injurySeverity = 'severe';
          }
        }

        // Use playerStore.updatePlayerCondition to properly persist all updates
        const conditionUpdates = {
          fitness: updates.fitness,
          fatigue: updates.fatigue
        };

        if (updates.injuryDuration) {
          conditionUpdates.injuryDuration = updates.injuryDuration;
          conditionUpdates.injury = injurySeverity;
          conditionUpdates.fatigue = 0; // Reset fatigue to 0 when injured (player will rest during recovery)
          console.log(`⚠️ ${player.name} injured (${injurySeverity}) for ${updates.injuryDuration} days`);

          // Send injury inbox message only for user's squad players
          if (this.inboxStore && this.teamStore) {
            const userTeamId = this.teamStore.getState().userTeamId;
            const isUserPlayer = player.currentTeam === userTeamId;

            if (isUserPlayer) {
              // Use dynamic import for MessageGenerator to avoid bundling issues
              import('../../../utils/MessageGenerator').then(module => {
                const MessageGenerator = module.default;
                const matchId = this.matchId || 'current_match';
                this.inboxStore.getState().addMessage(
                  MessageGenerator.generateInjuryMessage(player, updates.injuryDuration, injurySeverity, matchId)
                );
              }).catch(error => {
                console.error('Error loading MessageGenerator for injury message:', error);
              });
            }
          }
        }

        this.playerStore.getState().updatePlayerCondition(playerId, conditionUpdates);
      }
    });

    // Finalize confidence → morale updates
    allPlayers.forEach(player => {
      const playerId = player.id;
      const finalConfidence = matchState.matchConditions[playerId]?.confidence || 50;

      // Get confidence history (keep last 5 matches)
      const actualPlayer = this.playerStore.getState().getPlayer(playerId);
      if (actualPlayer && actualPlayer.condition) {
        const confidenceHistory = actualPlayer.condition.confidenceHistory || [];

        // Update morale using confidence manager
        const newMorale = confidenceManager.updateMoraleAfterMatch(
          player,
          finalConfidence,
          confidenceHistory
        );

        actualPlayer.condition.morale = newMorale;

        // Update confidence history (keep last 5 matches)
        actualPlayer.condition.confidenceHistory = [
          ...confidenceHistory.slice(-4),
          finalConfidence
        ];
      }
    });

    if (this.config.showBallByBall) {
      console.log('Tactical state finalized: energy, fatigue, injuries, and morale updated');
    }
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