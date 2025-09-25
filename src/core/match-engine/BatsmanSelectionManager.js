/**
 * @file BatsmanSelectionManager.js
 * @description Manages batsman selection at the fall of every wicket with strategic decision making
 * @module core/match-engine/BatsmanSelectionManager
 */

/**
 * @typedef {Object} BatsmanSelectionContext
 * @property {Object} matchSituation - Current match situation (phase, overs, score, target)
 * @property {Array} availableBatsmen - List of available batsmen with stats
 * @property {Object} dismissalDetails - Details of the dismissal
 * @property {Object} currentPartnership - Current partnership details
 * @property {Object} bowlingAttack - Current bowling attack analysis
 * @property {string} teamStrategy - Team's batting strategy preference
 * @property {Object} battingOrder - Planned batting order
 */

/**
 * @typedef {Object} BatsmanSelectionResult
 * @property {string} selectedBatsman - Selected batsman ID
 * @property {string} reasoning - Reasoning for selection
 * @property {Object} strategicFactors - Factors that influenced the decision
 * @property {string} battingApproach - Recommended batting approach
 * @property {Object} partnershipStrategy - Strategy for the new partnership
 * @property {number} promotionIndex - How much the batsman was promoted/demoted
 */

class BatsmanSelectionManager {
  constructor(eventSystem, playerStore, teamStore) {
    this.eventSystem = eventSystem;
    this.playerStore = playerStore;
    this.teamStore = teamStore;

    // Selection strategies based on match situation
    this.strategies = {
      powerplay: this.powerplayStrategy.bind(this),
      middle: this.middleOversStrategy.bind(this),
      death: this.deathOversStrategy.bind(this),
      chase: this.chaseStrategy.bind(this),
      consolidation: this.consolidationStrategy.bind(this),
      acceleration: this.accelerationStrategy.bind(this)
    };

    // Batsman performance tracking
    this.batsmanPerformance = new Map();

    // Batting order flexibility
    this.battingOrderPreferences = new Map();

    // Register event handlers
    this.registerEventHandlers();
  }

  /**
   * Register event handlers for batsman selection
   */
  registerEventHandlers() {
    // Handle wicket fall and batsman selection
    this.eventSystem.on('match:wicket_fallen', async (event) => {
      const { wicketDetails, matchState, context } = event.data;
      return this.handleWicketFall(wicketDetails, matchState, context);
    });

    // Handle manual batsman selection
    this.eventSystem.on('match:manual_batsman_selection', async (event) => {
      const { batsmanId, matchState } = event.data;
      return this.handleManualSelection(batsmanId, matchState);
    });

    // Update batsman performance after each ball
    this.eventSystem.on('match:ball_complete', async (event) => {
      const { ballResult, context } = event.data;
      this.updateBatsmanPerformance(ballResult, context);
    });

    // Handle batting order adjustments
    this.eventSystem.on('match:adjust_batting_order', async (event) => {
      const { adjustments, matchState } = event.data;
      return this.adjustBattingOrder(adjustments, matchState);
    });
  }

  /**
   * Handle wicket fall and select next batsman
   * @param {Object} wicketDetails - Details of the wicket that fell
   * @param {Object} matchState - Current match state
   * @param {Object} context - Match context
   * @returns {Promise<BatsmanSelectionResult>}
   */
  async handleWicketFall(wicketDetails, matchState, context) {
    const selectionContext = this.buildSelectionContext(wicketDetails, matchState, context);

    // Check if innings should end (all out or target reached)
    if (this.shouldEndInnings(selectionContext)) {
      return {
        selectedBatsman: null,
        reasoning: 'Innings complete - no more batsmen needed',
        strategicFactors: { inningsComplete: true }
      };
    }

    // Emit pre-selection event for user intervention
    const preSelectionResult = await this.eventSystem.emit('batsman_selection:pre_select', {
      context: selectionContext,
      autoSelect: context.autoSelect !== false
    });

    // Check if user wants to make manual selection
    if (preSelectionResult.manualSelection) {
      return this.waitForManualSelection(selectionContext);
    }

    // Automatic selection
    const selection = await this.selectBatsman(selectionContext);

    // Emit post-selection event
    await this.eventSystem.emit('batsman_selection:selected', {
      selection,
      context: selectionContext
    });

    return selection;
  }

  /**
   * Build comprehensive context for batsman selection
   * @param {Object} wicketDetails - Details of the wicket that fell
   * @param {Object} matchState - Current match state
   * @param {Object} context - Match context
   * @returns {BatsmanSelectionContext}
   */
  buildSelectionContext(wicketDetails, matchState, context) {
    const { teams, currentBall, innings } = matchState;
    const battingTeam = teams.batting;

    // Get batsmen already out or currently batting
    const unavailableBatsmen = this.getUnavailableBatsmen(matchState);

    // Get available batsmen
    const availableBatsmen = this.getAvailableBatsmen(
      battingTeam.squad,
      unavailableBatsmen
    );

    // Analyze current bowling attack
    const bowlingAttack = this.analyzeBowlingAttack(matchState, context);

    // Get remaining partner details
    const remainingPartner = this.getRemainingPartner(wicketDetails, matchState);

    return {
      matchSituation: {
        phase: currentBall.matchSituation.phase,
        over: currentBall.over,
        ball: currentBall.ball,
        score: teams.batting.totalScore,
        wickets: teams.batting.wickets,
        target: innings.target,
        required: currentBall.matchSituation.required,
        ballsLeft: currentBall.matchSituation.ballsLeft,
        runRate: teams.batting.totalScore / ((currentBall.over * 6 + currentBall.ball) / 6) || 0,
        requiredRate: innings.target ?
          ((currentBall.matchSituation.required || 0) / (currentBall.matchSituation.ballsLeft / 6)) : null
      },
      availableBatsmen,
      dismissalDetails: wicketDetails,
      currentPartnership: {
        partner: remainingPartner,
        runs: this.getCurrentPartnershipRuns(matchState),
        balls: this.getCurrentPartnershipBalls(matchState)
      },
      bowlingAttack,
      teamStrategy: battingTeam.strategy || 'balanced',
      battingOrder: this.getCurrentBattingOrder(battingTeam.squad, unavailableBatsmen),
      wicketsInHand: 10 - teams.batting.wickets,
      recentDismissals: this.getRecentDismissals(matchState.ballByBall, 3)
    };
  }

  /**
   * Get batsmen who are unavailable (out or currently batting)
   * @param {Object} matchState - Current match state
   * @returns {Set} Set of unavailable batsman IDs
   */
  getUnavailableBatsmen(matchState) {
    const unavailable = new Set();

    // Add current batsmen
    unavailable.add(matchState.innings.striker);
    unavailable.add(matchState.innings.nonStriker);

    // Add dismissed batsmen
    matchState.ballByBall.forEach(ball => {
      if (ball.isWicket && ball.dismissedPlayer) {
        unavailable.add(ball.dismissedPlayer);
      }
    });

    return unavailable;
  }

  /**
   * Get available batsmen for selection
   * @param {Array} squad - Batting team squad
   * @param {Set} unavailableBatsmen - Set of unavailable batsman IDs
   * @returns {Array} Available batsmen with stats and analysis
   */
  getAvailableBatsmen(squad, unavailableBatsmen) {
    return squad
      .filter(playerId => {
        const player = this.playerStore.getState().getPlayer(playerId);
        return player &&
               ['batsman', 'all-rounder', 'wicket-keeper'].includes(player.role) &&
               !unavailableBatsmen.has(playerId);
      })
      .map((playerId, index) => {
        const player = this.playerStore.getState().getPlayer(playerId);
        const performance = this.batsmanPerformance.get(playerId) || this.getDefaultPerformance(player);
        const battingOrderIndex = squad.indexOf(playerId);

        return {
          id: playerId,
          player,
          battingOrderIndex,
          performance,
          recentForm: performance.recentForm,
          matchupScore: 0, // Will be calculated against current bowlers
          situationalFit: 0, // Will be calculated based on match situation
          preferredPosition: this.getPreferredBattingPosition(player)
        };
      });
  }

  /**
   * Select best batsman based on current context
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Promise<BatsmanSelectionResult>}
   */
  async selectBatsman(context) {
    const { matchSituation, availableBatsmen, bowlingAttack, teamStrategy } = context;

    if (availableBatsmen.length === 0) {
      return {
        selectedBatsman: null,
        reasoning: 'No more batsmen available',
        strategicFactors: { allOut: true }
      };
    }

    // Determine the primary strategy based on match situation
    const primaryStrategy = this.determinePrimaryStrategy(context);
    const strategicSelection = this.strategies[primaryStrategy](context);

    // Calculate bowler matchup scores for each batsman
    const batsmenWithMatchups = availableBatsmen.map(batsman => ({
      ...batsman,
      matchupScore: this.calculateBatsmanBowlerMatchup(batsman, bowlingAttack),
      situationalFit: this.calculateSituationalFit(batsman, context)
    }));

    // Calculate final scores combining all factors
    const finalScores = batsmenWithMatchups.map(batsman => ({
      ...batsman,
      finalScore: this.calculateFinalScore(batsman, strategicSelection, context)
    }));

    // Sort by final score (highest first)
    finalScores.sort((a, b) => b.finalScore - a.finalScore);

    const selectedBatsman = finalScores[0];

    // Calculate promotion/demotion from normal batting order
    const normalPosition = selectedBatsman.battingOrderIndex;
    const currentPosition = this.getCurrentBattingPosition(context);
    const promotionIndex = normalPosition - currentPosition;

    return {
      selectedBatsman: selectedBatsman.id,
      reasoning: this.generateSelectionReasoning(selectedBatsman, strategicSelection, context),
      strategicFactors: strategicSelection.factors,
      battingApproach: strategicSelection.battingApproach,
      partnershipStrategy: this.generatePartnershipStrategy(selectedBatsman, context),
      promotionIndex
    };
  }

  /**
   * Determine primary strategy based on match situation
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {string} Primary strategy name
   */
  determinePrimaryStrategy(context) {
    const { matchSituation, wicketsInHand } = context;

    // Chase scenario (second innings)
    if (matchSituation.target) {
      if (matchSituation.requiredRate > 12 || matchSituation.ballsLeft < 30) {
        return 'acceleration';
      } else if (matchSituation.requiredRate > 8) {
        return 'chase';
      } else {
        return 'consolidation';
      }
    }

    // First innings scenarios
    if (matchSituation.phase === 'powerplay') {
      return 'powerplay';
    } else if (matchSituation.phase === 'death' || matchSituation.over >= 16) {
      return 'acceleration';
    } else if (wicketsInHand <= 4) {
      return 'consolidation';
    } else {
      return 'middle';
    }
  }

  /**
   * Powerplay batting strategy (overs 1-6)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  powerplayStrategy(context) {
    return {
      preferences: {
        attributes: ['technique', 'timing', 'vsPace'],
        battingTypes: ['aggressive', 'stroke_player'],
        weights: { technique: 0.3, timing: 0.3, vsPace: 0.4 }
      },
      factors: {
        fieldRestrictions: true,
        newBall: context.matchSituation.over < 2,
        powerplay: true
      },
      battingApproach: 'calculated_aggression'
    };
  }

  /**
   * Middle overs batting strategy (overs 7-15)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  middleOversStrategy(context) {
    return {
      preferences: {
        attributes: ['placement', 'vsSpin', 'range360'],
        battingTypes: ['accumulator', 'anchor'],
        weights: { placement: 0.4, vsSpin: 0.3, range360: 0.3 }
      },
      factors: {
        spinBowling: true,
        buildInnings: true,
        rotatestrike: true
      },
      battingApproach: 'accumulate_and_accelerate'
    };
  }

  /**
   * Death overs batting strategy (overs 16-20)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  deathOversStrategy(context) {
    return {
      preferences: {
        attributes: ['range360', 'timing', 'temperament'],
        battingTypes: ['finisher', 'power_hitter'],
        weights: { range360: 0.4, timing: 0.3, temperament: 0.3 }
      },
      factors: {
        boundaries: true,
        powerHitting: true,
        finisher: true
      },
      battingApproach: 'aggressive_finishing'
    };
  }

  /**
   * Chase batting strategy (second innings with moderate target)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  chaseStrategy(context) {
    const requiredRate = context.matchSituation.requiredRate || 7;

    return {
      preferences: {
        attributes: ['temperament', 'placement', 'timing'],
        battingTypes: ['chase_specialist', 'reliable'],
        weights: { temperament: 0.4, placement: 0.3, timing: 0.3 }
      },
      factors: {
        chase: true,
        pressure: requiredRate > 8,
        calculated: requiredRate < 8
      },
      battingApproach: requiredRate > 8 ? 'controlled_aggression' : 'steady_accumulation'
    };
  }

  /**
   * Consolidation batting strategy (after wickets fall)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  consolidationStrategy(context) {
    return {
      preferences: {
        attributes: ['technique', 'temperament', 'defensiveShots'],
        battingTypes: ['anchor', 'reliable'],
        weights: { technique: 0.4, temperament: 0.3, defensiveShots: 0.3 }
      },
      factors: {
        stability: true,
        wicketsDown: true,
        rebuild: true
      },
      battingApproach: 'stabilize_and_build'
    };
  }

  /**
   * Acceleration batting strategy (need quick runs)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  accelerationStrategy(context) {
    return {
      preferences: {
        attributes: ['range360', 'attackingShots', 'timing'],
        battingTypes: ['aggressive', 'power_hitter'],
        weights: { range360: 0.4, attackingShots: 0.3, timing: 0.3 }
      },
      factors: {
        urgency: true,
        boundaries: true,
        risk: true
      },
      battingApproach: 'aggressive_acceleration'
    };
  }

  /**
   * Calculate batsman vs bowling attack matchup
   * @param {Object} batsman - Batsman data
   * @param {Object} bowlingAttack - Current bowling attack analysis
   * @returns {number} Matchup score (0-100)
   */
  calculateBatsmanBowlerMatchup(batsman, bowlingAttack) {
    const { currentBowler, recentBowlers, attackType } = bowlingAttack;
    const batsmanAttributes = batsman.player.attributes;

    let matchupScore = 50;

    // Matchup against current bowler
    if (currentBowler) {
      const bowlerType = currentBowler.bowlingType;
      if (['fast', 'fast-medium', 'medium'].includes(bowlerType)) {
        matchupScore = (matchupScore + (batsmanAttributes.vsPace || 50)) / 2;
      } else if (bowlerType.includes('spin')) {
        matchupScore = (matchupScore + (batsmanAttributes.vsSpin || 50)) / 2;
      }
    }

    // Adjust for bowling attack style
    if (attackType === 'pace_heavy') {
      matchupScore = matchupScore * (1 + (batsmanAttributes.vsPace - 50) / 100);
    } else if (attackType === 'spin_heavy') {
      matchupScore = matchupScore * (1 + (batsmanAttributes.vsSpin - 50) / 100);
    }

    return Math.max(0, Math.min(100, matchupScore));
  }

  /**
   * Calculate how well batsman fits the current situation
   * @param {Object} batsman - Batsman data
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {number} Situational fit score (0-100)
   */
  calculateSituationalFit(batsman, context) {
    const { matchSituation, teamStrategy } = context;
    const player = batsman.player;

    let fitScore = 50;

    // Phase-specific fit
    if (matchSituation.phase === 'powerplay' && player.specialties?.includes('powerplay_specialist')) {
      fitScore += 20;
    } else if (matchSituation.phase === 'death' && player.specialties?.includes('finisher')) {
      fitScore += 20;
    }

    // Role-specific fit
    if (matchSituation.target) {
      // Chasing - prefer reliable batsmen
      if (player.specialties?.includes('chase_specialist')) {
        fitScore += 15;
      }
    }

    // Pressure situation fit
    if (context.wicketsInHand <= 4 && player.attributes.temperament > 15) {
      fitScore += 10;
    }

    return Math.max(0, Math.min(100, fitScore));
  }

  /**
   * Calculate final selection score
   * @param {Object} batsman - Batsman data with matchup and situational scores
   * @param {Object} strategicSelection - Strategic preferences
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {number} Final score
   */
  calculateFinalScore(batsman, strategicSelection, context) {
    let score = 50; // Base score

    // Strategic attribute preferences
    const weights = strategicSelection.preferences.weights || {};
    Object.entries(weights).forEach(([attr, weight]) => {
      const attributeValue = batsman.player.attributes[attr] || 10;
      score += (attributeValue - 10) * weight * 2; // Scale to 0-20 range
    });

    // Batting type preference
    const preferredTypes = strategicSelection.preferences.battingTypes || [];
    if (preferredTypes.some(type => batsman.player.battingStyle === type ||
                                   batsman.player.specialties?.includes(type))) {
      score += 15;
    }

    // Matchup advantage
    score += (batsman.matchupScore - 50) * 0.25;

    // Situational fit
    score += (batsman.situationalFit - 50) * 0.2;

    // Recent form
    score += (batsman.recentForm - 50) * 0.15;

    // Batting order consideration (slight penalty for major promotions/demotions)
    const orderDifference = Math.abs(batsman.battingOrderIndex - this.getCurrentBattingPosition(context));
    if (orderDifference > 2) {
      score -= orderDifference * 2;
    }

    // Performance in match so far
    score += (batsman.performance.overall - 50) * 0.1;

    return Math.max(0, score);
  }

  /**
   * Analyze current bowling attack
   * @param {Object} matchState - Current match state
   * @param {Object} context - Match context
   * @returns {Object} Bowling attack analysis
   */
  analyzeBowlingAttack(matchState, context) {
    const currentBowler = this.playerStore.getState().getPlayer(matchState.innings.bowler);
    const recentBalls = matchState.ballByBall.slice(-12); // Last 2 overs

    const recentBowlers = [...new Set(recentBalls.map(ball => ball.bowler))]
      .map(id => this.playerStore.getState().getPlayer(id))
      .filter(Boolean);

    // Determine attack type
    const paceCount = recentBowlers.filter(b => ['fast', 'fast-medium', 'medium'].includes(b.bowlingType)).length;
    const spinCount = recentBowlers.filter(b => b.bowlingType.includes('spin')).length;

    let attackType = 'balanced';
    if (paceCount > spinCount * 1.5) attackType = 'pace_heavy';
    else if (spinCount > paceCount * 1.5) attackType = 'spin_heavy';

    return {
      currentBowler,
      recentBowlers,
      attackType,
      dominantType: paceCount > spinCount ? 'pace' : 'spin'
    };
  }

  /**
   * Get the remaining partner after a wicket
   * @param {Object} wicketDetails - Wicket details
   * @param {Object} matchState - Current match state
   * @returns {Object} Remaining partner details
   */
  getRemainingPartner(wicketDetails, matchState) {
    const partnerId = wicketDetails.dismissedPlayer === matchState.innings.striker ?
                     matchState.innings.nonStriker : matchState.innings.striker;

    return this.playerStore.getState().getPlayer(partnerId);
  }

  /**
   * Get current partnership runs
   * @param {Object} matchState - Current match state
   * @returns {number} Partnership runs
   */
  getCurrentPartnershipRuns(matchState) {
    // Find the last wicket or start of innings
    let partnershipStart = 0;
    for (let i = matchState.ballByBall.length - 1; i >= 0; i--) {
      if (matchState.ballByBall[i].isWicket) {
        partnershipStart = matchState.teams.batting.totalScore -
                          (matchState.ballByBall[i].totalScore || 0);
        break;
      }
    }
    return partnershipStart;
  }

  /**
   * Get current partnership balls
   * @param {Object} matchState - Current match state
   * @returns {number} Partnership balls
   */
  getCurrentPartnershipBalls(matchState) {
    let balls = 0;
    for (let i = matchState.ballByBall.length - 1; i >= 0; i--) {
      if (matchState.ballByBall[i].isWicket) break;
      if (matchState.ballByBall[i].isLegal) balls++;
    }
    return balls;
  }

  /**
   * Get current batting order based on availability
   * @param {Array} squad - Team squad
   * @param {Set} unavailableBatsmen - Unavailable batsmen
   * @returns {Array} Current batting order
   */
  getCurrentBattingOrder(squad, unavailableBatsmen) {
    return squad.filter(id => !unavailableBatsmen.has(id));
  }

  /**
   * Get current batting position (wickets fallen + 1)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {number} Current batting position
   */
  getCurrentBattingPosition(context) {
    return context.matchSituation.wickets + 1;
  }

  /**
   * Get recent dismissals for pattern analysis
   * @param {Array} ballByBall - Ball by ball record
   * @param {number} count - Number of recent dismissals
   * @returns {Array} Recent dismissals
   */
  getRecentDismissals(ballByBall, count) {
    return ballByBall
      .filter(ball => ball.isWicket)
      .slice(-count)
      .map(ball => ({
        dismissalType: ball.dismissalType,
        bowler: ball.bowler,
        over: ball.over,
        ball: ball.ball
      }));
  }

  /**
   * Check if innings should end
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {boolean} Whether innings should end
   */
  shouldEndInnings(context) {
    return context.availableBatsmen.length === 0 ||
           context.matchSituation.wickets >= 10 ||
           (context.matchSituation.target &&
            context.matchSituation.score >= context.matchSituation.target);
  }

  /**
   * Handle manual batsman selection
   * @param {string} batsmanId - Manually selected batsman ID
   * @param {Object} matchState - Current match state
   * @returns {Promise<BatsmanSelectionResult>}
   */
  async handleManualSelection(batsmanId, matchState) {
    const batsman = this.playerStore.getState().getPlayer(batsmanId);

    if (!batsman) {
      throw new Error(`Invalid batsman selection: ${batsmanId}`);
    }

    return {
      selectedBatsman: batsmanId,
      reasoning: 'Manual selection by captain/user',
      strategicFactors: { manual: true },
      battingApproach: 'user_defined',
      partnershipStrategy: 'user_defined',
      promotionIndex: 0
    };
  }

  /**
   * Wait for manual selection (used in interactive mode)
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Promise<BatsmanSelectionResult>}
   */
  async waitForManualSelection(context) {
    return new Promise((resolve) => {
      // Emit event for UI to show batsman selection interface
      this.eventSystem.emit('ui:show_batsman_selection', {
        context,
        onSelection: resolve
      });
    });
  }

  /**
   * Update batsman performance tracking
   * @param {Object} ballResult - Result of the ball
   * @param {Object} context - Ball context
   */
  updateBatsmanPerformance(ballResult, context) {
    const batsmanId = ballResult.striker;
    if (!batsmanId) return;

    let performance = this.batsmanPerformance.get(batsmanId) || this.getDefaultPerformance();

    // Update based on ball result
    performance.ballsFaced += 1;
    performance.runsScored += ballResult.runs || 0;

    if (ballResult.runs >= 4) {
      performance.boundaries += 1;
      performance.overall += 1;
    } else if (ballResult.runs === 0) {
      performance.dots += 1;
    }

    if (ballResult.isWicket && ballResult.dismissedPlayer === batsmanId) {
      performance.dismissals += 1;
      performance.overall -= 2;
    }

    // Calculate strike rate
    performance.strikeRate = performance.ballsFaced > 0 ?
      (performance.runsScored / performance.ballsFaced) * 100 : 0;

    // Update recent form (last 12 balls)
    performance.recentBalls.push(ballResult);
    if (performance.recentBalls.length > 12) {
      performance.recentBalls.shift();
    }

    performance.recentForm = this.calculateRecentForm(performance.recentBalls);

    this.batsmanPerformance.set(batsmanId, performance);
  }

  /**
   * Get default performance values for new batsman
   * @param {Object} player - Player data
   * @returns {Object} Default performance
   */
  getDefaultPerformance(player) {
    return {
      overall: 50,
      ballsFaced: 0,
      runsScored: 0,
      boundaries: 0,
      dots: 0,
      dismissals: 0,
      strikeRate: 0,
      recentForm: player?.attributes?.form || 50,
      recentBalls: []
    };
  }

  /**
   * Calculate recent form based on recent balls
   * @param {Array} recentBalls - Recent balls faced
   * @returns {number} Recent form score (0-100)
   */
  calculateRecentForm(recentBalls) {
    if (recentBalls.length === 0) return 50;

    let score = 50;
    recentBalls.forEach(ball => {
      if (ball.runs >= 4) score += 6;
      else if (ball.runs > 0) score += ball.runs;
      else score -= 1; // Dot ball

      if (ball.isWicket && ball.dismissedPlayer) score -= 10;
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get preferred batting position for a player
   * @param {Object} player - Player data
   * @returns {number} Preferred position
   */
  getPreferredBattingPosition(player) {
    // Based on player role and attributes
    if (player.role === 'wicket-keeper') return 7;
    if (player.specialties?.includes('opener')) return 1;
    if (player.specialties?.includes('finisher')) return 6;
    if (player.role === 'all-rounder') return 5;

    // Default based on batting attributes
    const aggression = player.attributes.attackingShots || 10;
    if (aggression > 16) return 3; // Aggressive top order
    if (aggression > 13) return 4; // Middle order
    return 5; // Lower middle order
  }

  /**
   * Generate selection reasoning text
   * @param {Object} selectedBatsman - Selected batsman
   * @param {Object} strategicSelection - Strategic selection data
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {string} Reasoning text
   */
  generateSelectionReasoning(selectedBatsman, strategicSelection, context) {
    const reasons = [];
    const player = selectedBatsman.player;

    // Situation-specific reasoning
    if (context.matchSituation.phase === 'powerplay') {
      reasons.push('powerplay specialist with strong technique against pace');
    } else if (context.matchSituation.phase === 'death') {
      reasons.push('experienced finisher with boundary-hitting ability');
    } else if (context.matchSituation.target && context.matchSituation.requiredRate > 8) {
      reasons.push('chase specialist under pressure');
    } else {
      reasons.push('solid middle-order batsman to build innings');
    }

    // Form reasoning
    if (selectedBatsman.recentForm > 70) {
      reasons.push('excellent recent form');
    }

    // Matchup reasoning
    if (selectedBatsman.matchupScore > 65) {
      reasons.push('favorable matchup against current bowling');
    }

    return `Selected ${player.name} as ${reasons.join(' and ')}`;
  }

  /**
   * Generate partnership strategy for new batsman
   * @param {Object} selectedBatsman - Selected batsman
   * @param {BatsmanSelectionContext} context - Selection context
   * @returns {Object} Partnership strategy
   */
  generatePartnershipStrategy(selectedBatsman, context) {
    const { currentPartnership, matchSituation } = context;
    const partner = currentPartnership.partner;

    const strategy = {
      primary: 'balanced',
      focus: 'partnership_building',
      roles: {
        newBatsman: 'settler',
        partner: 'guide'
      }
    };

    // Adjust based on match situation
    if (matchSituation.target && matchSituation.requiredRate > 10) {
      strategy.primary = 'aggressive';
      strategy.focus = 'quick_runs';
      strategy.roles.newBatsman = 'aggressor';
    } else if (context.wicketsInHand <= 4) {
      strategy.primary = 'consolidation';
      strategy.focus = 'stabilization';
      strategy.roles.newBatsman = 'anchor';
    }

    return strategy;
  }

  /**
   * Adjust batting order based on match conditions
   * @param {Object} adjustments - Batting order adjustments
   * @param {Object} matchState - Current match state
   * @returns {Promise<Object>} Adjustment result
   */
  async adjustBattingOrder(adjustments, matchState) {
    // Store batting order preferences for future selections
    adjustments.forEach(adjustment => {
      this.battingOrderPreferences.set(adjustment.playerId, adjustment.newPosition);
    });

    return {
      success: true,
      adjustments: adjustments.length,
      message: 'Batting order adjusted successfully'
    };
  }

  /**
   * Get batsman selection statistics
   * @returns {Object} Selection statistics
   */
  getStats() {
    return {
      totalSelections: this.batsmanPerformance.size,
      averagePerformance: Array.from(this.batsmanPerformance.values())
        .reduce((sum, perf) => sum + perf.overall, 0) / this.batsmanPerformance.size || 0,
      orderAdjustments: this.battingOrderPreferences.size,
      eventHandlers: this.eventSystem.getStats().handlerCount
    };
  }

  /**
   * Reset batsman performance tracking
   */
  reset() {
    this.batsmanPerformance.clear();
    this.battingOrderPreferences.clear();
  }
}

export default BatsmanSelectionManager;