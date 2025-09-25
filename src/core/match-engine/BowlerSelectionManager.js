/**
 * @file BowlerSelectionManager.js
 * @description Manages bowler selection at the start of every over with strategic decision making
 * @module core/match-engine/BowlerSelectionManager
 */

/**
 * @typedef {Object} BowlerSelectionContext
 * @property {Object} matchSituation - Current match situation (phase, overs, score)
 * @property {Array} availableBowlers - List of available bowlers with stats
 * @property {Object} oversBowled - Overs bowled by each bowler
 * @property {string} currentBowler - Current bowler (cannot bowl consecutive overs)
 * @property {Object} battingPair - Current batting pair with their stats
 * @property {Object} fieldingRestrictions - Current fielding restrictions
 * @property {string} teamStrategy - Team's bowling strategy preference
 */

/**
 * @typedef {Object} BowlerSelectionResult
 * @property {string} selectedBowler - Selected bowler ID
 * @property {string} reasoning - Reasoning for selection
 * @property {Object} strategicFactors - Factors that influenced the decision
 * @property {string} bowlingStrategy - Recommended bowling strategy for the over
 * @property {Object} fieldingChanges - Suggested fielding position changes
 */

class BowlerSelectionManager {
  constructor(eventSystem, playerStore, teamStore) {
    this.eventSystem = eventSystem;
    this.playerStore = playerStore;
    this.teamStore = teamStore;

    // Selection strategies
    this.strategies = {
      powerplay: this.powerplayStrategy.bind(this),
      middle: this.middleOversStrategy.bind(this),
      death: this.deathOversStrategy.bind(this),
      pressure: this.pressureStrategy.bind(this)
    };

    // Bowler effectiveness tracking
    this.bowlerEffectiveness = new Map();

    // Register event handlers
    this.registerEventHandlers();
  }

  /**
   * Register event handlers for bowler selection
   */
  registerEventHandlers() {
    // Handle bowler selection request
    this.eventSystem.on('match:over_complete', async (event) => {
      const { matchState, context } = event.data;
      return this.handleOverComplete(matchState, context);
    });

    // Handle manual bowler selection
    this.eventSystem.on('match:manual_bowler_selection', async (event) => {
      const { bowlerId, matchState } = event.data;
      return this.handleManualSelection(bowlerId, matchState);
    });

    // Update bowler effectiveness after each ball
    this.eventSystem.on('match:ball_complete', async (event) => {
      const { ballResult, context } = event.data;
      this.updateBowlerEffectiveness(ballResult, context);
    });
  }

  /**
   * Handle over completion and select next bowler
   * @param {Object} matchState - Current match state
   * @param {Object} context - Match context
   * @returns {Promise<BowlerSelectionResult>}
   */
  async handleOverComplete(matchState, context) {
    const selectionContext = this.buildSelectionContext(matchState, context);

    // Emit pre-selection event for user intervention
    const preSelectionResult = await this.eventSystem.emit('bowler_selection:pre_select', {
      context: selectionContext,
      autoSelect: context.autoSelect !== false
    });

    // Check if user wants to make manual selection
    if (preSelectionResult.manualSelection) {
      return this.waitForManualSelection(selectionContext);
    }

    // Automatic selection
    const selection = await this.selectBowler(selectionContext);

    // Emit post-selection event
    await this.eventSystem.emit('bowler_selection:selected', {
      selection,
      context: selectionContext
    });

    return selection;
  }

  /**
   * Build comprehensive context for bowler selection
   * @param {Object} matchState - Current match state
   * @param {Object} context - Match context
   * @returns {BowlerSelectionContext}
   */
  buildSelectionContext(matchState, context) {
    const { teams, currentBall, innings } = matchState;
    const bowlingTeam = teams.bowling;

    // Calculate overs bowled by each bowler
    const oversBowled = this.calculateOversBowled(matchState.ballByBall);

    // Get available bowlers (excluding current bowler and those at max overs)
    const availableBowlers = this.getAvailableBowlers(
      bowlingTeam.squad,
      innings.bowler,
      oversBowled,
      context.maxBowlerOvers || 4
    );

    // Get current batting pair
    const battingPair = {
      striker: this.playerStore.getState().getPlayer(innings.striker),
      nonStriker: this.playerStore.getState().getPlayer(innings.nonStriker)
    };

    return {
      matchSituation: {
        phase: currentBall.matchSituation.phase,
        over: currentBall.over,
        score: teams.batting.totalScore,
        wickets: teams.batting.wickets,
        target: innings.target,
        required: currentBall.matchSituation.required,
        ballsLeft: currentBall.matchSituation.ballsLeft,
        runRate: teams.batting.totalScore / ((currentBall.over * 6) / 6) || 0
      },
      availableBowlers,
      oversBowled,
      currentBowler: innings.bowler,
      battingPair,
      fieldingRestrictions: this.getFieldingRestrictions(currentBall.matchSituation.phase),
      teamStrategy: bowlingTeam.strategy || 'balanced',
      bowlerEffectiveness: this.bowlerEffectiveness,
      recentBalls: this.getRecentBalls(matchState.ballByBall, 12) // Last 2 overs
    };
  }

  /**
   * Get available bowlers for selection - anyone except wicketkeeper
   * @param {Array} squad - Bowling team squad
   * @param {string} currentBowler - Current bowler (cannot bowl consecutive overs)
   * @param {Object} oversBowled - Overs bowled by each bowler
   * @param {number} maxOvers - Maximum overs per bowler
   * @returns {Array} Available bowlers with stats
   */
  getAvailableBowlers(squad, currentBowler, oversBowled, maxOvers) {
    return squad
      .filter(playerId => {
        const player = this.playerStore.getState().getPlayer(playerId);
        if (!player || playerId === currentBowler || (oversBowled[playerId] || 0) >= maxOvers) {
          return false;
        }

        // Assign bowlingType if not present
        if (!player.bowlingType && player.role !== 'wicket-keeper') {
          player.bowlingType = 'medium';
        }

        // Allow anyone except wicketkeeper to bowl
        return player.role !== 'wicket-keeper';
      })
      .map(playerId => {
        const player = this.playerStore.getState().getPlayer(playerId);
        const oversBowledCount = oversBowled[playerId] || 0;
        const effectiveness = this.bowlerEffectiveness.get(playerId) || this.getDefaultEffectiveness(player);

        return {
          id: playerId,
          player,
          oversBowled: oversBowledCount,
          remainingOvers: maxOvers - oversBowledCount,
          effectiveness,
          recentForm: effectiveness.recentForm,
          matchupScore: 0 // Will be calculated against current batsmen
        };
      });
  }

  /**
   * Select best bowler based on current context
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {Promise<BowlerSelectionResult>}
   */
  async selectBowler(context) {
    const { matchSituation, availableBowlers, battingPair, teamStrategy } = context;

    if (availableBowlers.length === 0) {
      // Emergency: allow current bowler to continue (shouldn't happen in normal circumstances)
      return {
        selectedBowler: context.currentBowler,
        reasoning: 'No other bowlers available - emergency continuation',
        strategicFactors: { emergency: true },
        bowlingStrategy: 'maintain',
        fieldingChanges: {}
      };
    }

    // Apply appropriate strategy based on match phase
    const strategy = this.strategies[matchSituation.phase] || this.strategies.middle;
    const strategicSelection = strategy(context);

    // Calculate matchup scores against current batsmen
    const bowlersWithMatchups = availableBowlers.map(bowler => ({
      ...bowler,
      matchupScore: this.calculateBatsmanBowlerMatchup(bowler, battingPair)
    }));

    // Combine strategic and matchup factors
    const finalScores = bowlersWithMatchups.map(bowler => ({
      ...bowler,
      finalScore: this.calculateFinalScore(bowler, strategicSelection, context)
    }));

    // Sort by final score (highest first)
    finalScores.sort((a, b) => b.finalScore - a.finalScore);

    const selectedBowler = finalScores[0];

    return {
      selectedBowler: selectedBowler.id,
      reasoning: this.generateSelectionReasoning(selectedBowler, strategicSelection, context),
      strategicFactors: strategicSelection.factors,
      bowlingStrategy: strategicSelection.bowlingStrategy,
      fieldingChanges: this.suggestFieldingChanges(selectedBowler, context)
    };
  }

  /**
   * Powerplay bowling strategy (overs 1-6)
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  powerplayStrategy(context) {
    const { availableBowlers, matchSituation } = context;

    // Prefer fast bowlers with good new ball skills
    const preferences = {
      bowlingTypes: ['fast', 'fast-medium'],
      attributes: ['accuracy', 'swing', 'bowlingSpeed'],
      weights: { pace: 0.4, accuracy: 0.3, swing: 0.3 },
      bowlingStrategy: 'attack_with_discipline'
    };

    return {
      preferences,
      factors: {
        newBall: matchSituation.over < 2,
        fieldRestrictions: true,
        attackingIntent: 0.7
      },
      bowlingStrategy: preferences.bowlingStrategy
    };
  }

  /**
   * Middle overs bowling strategy (overs 7-15)
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  middleOversStrategy(context) {
    const { matchSituation, battingPair } = context;

    // Prefer spinners and accurate bowlers
    const preferences = {
      bowlingTypes: ['off-spin', 'leg-spin', 'left-arm-spin', 'medium'],
      attributes: ['accuracy', 'variations', 'intelligence'],
      weights: { accuracy: 0.4, variations: 0.3, intelligence: 0.3 },
      bowlingStrategy: 'build_pressure'
    };

    // Adjust based on match situation
    if (matchSituation.runRate > 8.5) {
      preferences.bowlingStrategy = 'contain_and_strike';
      preferences.weights.accuracy = 0.5;
    }

    return {
      preferences,
      factors: {
        spinFriendly: true,
        buildPressure: matchSituation.runRate < 8.0,
        containment: matchSituation.runRate > 8.5
      },
      bowlingStrategy: preferences.bowlingStrategy
    };
  }

  /**
   * Death overs bowling strategy (overs 16-20)
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  deathOversStrategy(context) {
    const { matchSituation, availableBowlers } = context;

    // Prefer experienced fast bowlers with variations
    const preferences = {
      bowlingTypes: ['fast', 'fast-medium'],
      attributes: ['accuracy', 'variations', 'bowlingSpeed', 'temperament'],
      weights: { accuracy: 0.35, variations: 0.25, experience: 0.25, pace: 0.15 },
      bowlingStrategy: 'death_bowling'
    };

    // Use best available death bowler
    const deathBowlers = availableBowlers.filter(b =>
      b.player.specialties?.includes('death_bowling') ||
      b.player.attributes.temperament > 15
    );

    return {
      preferences,
      factors: {
        deathBowling: true,
        variations: true,
        experience: true,
        yorkerSkill: true
      },
      bowlingStrategy: preferences.bowlingStrategy,
      priorityBowlers: deathBowlers.map(b => b.id)
    };
  }

  /**
   * Pressure situation bowling strategy
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {Object} Strategic selection preferences
   */
  pressureStrategy(context) {
    const { matchSituation } = context;

    const preferences = {
      attributes: ['accuracy', 'temperament', 'intelligence'],
      weights: { temperament: 0.4, accuracy: 0.35, intelligence: 0.25 },
      bowlingStrategy: 'pressure_bowling'
    };

    return {
      preferences,
      factors: {
        highPressure: true,
        mentalStrength: true,
        clutchPerformance: true
      },
      bowlingStrategy: preferences.bowlingStrategy
    };
  }

  /**
   * Calculate batsman-bowler matchup score
   * @param {Object} bowler - Bowler data
   * @param {Object} battingPair - Current batting pair
   * @returns {number} Matchup score (0-100)
   */
  calculateBatsmanBowlerMatchup(bowler, battingPair) {
    const { striker, nonStriker } = battingPair;
    const bowlerType = bowler.player.bowlingType;

    // Calculate striker matchup
    const strikerMatchup = this.getBatsmanBowlerMatchup(striker, bowlerType);
    const nonStrikerMatchup = this.getBatsmanBowlerMatchup(nonStriker, bowlerType);

    // Weight striker more heavily (they face most balls)
    return (strikerMatchup * 0.7) + (nonStrikerMatchup * 0.3);
  }

  /**
   * Get individual batsman vs bowler matchup score
   * @param {Object} batsman - Batsman data
   * @param {string} bowlerType - Bowler type
   * @returns {number} Matchup score
   */
  getBatsmanBowlerMatchup(batsman, bowlerType) {
    const batsmanAttributes = batsman.attributes;

    // Default matchup scores
    let matchupScore = 50;

    // Pace vs spin preferences
    if (['fast', 'fast-medium', 'medium'].includes(bowlerType)) {
      matchupScore = batsmanAttributes.vsPace || 50;
    } else if (bowlerType.includes('spin')) {
      matchupScore = batsmanAttributes.vsSpin || 50;
    }

    // Apply form and confidence modifiers
    const form = batsman.condition?.form || 50;
    const confidence = batsman.condition?.confidence || 50;

    matchupScore = matchupScore * (1 + (form - 50) / 100) * (1 + (confidence - 50) / 200);

    return Math.max(0, Math.min(100, matchupScore));
  }

  /**
   * Calculate final selection score
   * @param {Object} bowler - Bowler data with matchup score
   * @param {Object} strategicSelection - Strategic preferences
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {number} Final score
   */
  calculateFinalScore(bowler, strategicSelection, context) {
    let score = 50; // Base score

    // Bowler type preference
    if (strategicSelection.preferences.bowlingTypes?.includes(bowler.player.bowlingType)) {
      score += 20;
    }

    // Attribute scores
    const weights = strategicSelection.preferences.weights || {};
    Object.entries(weights).forEach(([attr, weight]) => {
      const attributeValue = bowler.player.attributes[attr] || 10;
      score += (attributeValue - 10) * weight * 2; // Scale to 0-20 range
    });

    // Matchup advantage
    score += (bowler.matchupScore - 50) * 0.3;

    // Effectiveness and form
    score += (bowler.effectiveness.overall - 50) * 0.2;
    score += (bowler.recentForm - 50) * 0.15;

    // Overs remaining (prefer bowlers with more overs left in balanced situations)
    score += bowler.remainingOvers * 2;

    // Priority bowlers (for death overs)
    if (strategicSelection.priorityBowlers?.includes(bowler.id)) {
      score += 15;
    }

    return Math.max(0, score);
  }

  /**
   * Handle manual bowler selection
   * @param {string} bowlerId - Manually selected bowler ID
   * @param {Object} matchState - Current match state
   * @returns {Promise<BowlerSelectionResult>}
   */
  async handleManualSelection(bowlerId, matchState) {
    const bowler = this.playerStore.getState().getPlayer(bowlerId);

    if (!bowler) {
      throw new Error(`Invalid bowler selection: ${bowlerId}`);
    }

    return {
      selectedBowler: bowlerId,
      reasoning: 'Manual selection by captain/user',
      strategicFactors: { manual: true },
      bowlingStrategy: 'user_defined',
      fieldingChanges: {}
    };
  }

  /**
   * Wait for manual selection (used in interactive mode)
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {Promise<BowlerSelectionResult>}
   */
  async waitForManualSelection(context) {
    return new Promise((resolve) => {
      // Emit event for UI to show bowler selection interface
      this.eventSystem.emit('ui:show_bowler_selection', {
        context,
        onSelection: resolve
      });
    });
  }

  /**
   * Update bowler effectiveness tracking
   * @param {Object} ballResult - Result of the ball
   * @param {Object} context - Ball context
   */
  updateBowlerEffectiveness(ballResult, context) {
    const bowlerId = ballResult.bowler;
    if (!bowlerId) return;

    let effectiveness = this.bowlerEffectiveness.get(bowlerId) || this.getDefaultEffectiveness();

    // Update based on ball result
    if (ballResult.isWicket) {
      effectiveness.wickets += 1;
      effectiveness.overall += 2;
    }

    if (ballResult.runs === 0) {
      effectiveness.dots += 1;
      effectiveness.overall += 0.5;
    } else if (ballResult.runs >= 4) {
      effectiveness.boundaries += 1;
      effectiveness.overall -= 1;
    }

    effectiveness.ballsBowled += 1;
    effectiveness.runsConceded += ballResult.runs || 0;

    // Calculate economy rate
    const oversBowled = effectiveness.ballsBowled / 6;
    effectiveness.economyRate = oversBowled > 0 ? effectiveness.runsConceded / oversBowled : 0;

    // Update recent form (last 12 balls)
    effectiveness.recentBalls.push(ballResult);
    if (effectiveness.recentBalls.length > 12) {
      effectiveness.recentBalls.shift();
    }

    effectiveness.recentForm = this.calculateRecentForm(effectiveness.recentBalls);

    this.bowlerEffectiveness.set(bowlerId, effectiveness);
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
   * Get fielding restrictions for current phase
   * @param {string} phase - Match phase
   * @returns {Object} Fielding restrictions
   */
  getFieldingRestrictions(phase) {
    const restrictions = {
      powerplay: { outsideCircle: 2, slipCordon: 2 },
      middle: { outsideCircle: 5, slipCordon: 0 },
      death: { outsideCircle: 5, slipCordon: 0 }
    };

    return restrictions[phase] || restrictions.middle;
  }

  /**
   * Get recent balls from ball-by-ball record
   * @param {Array} ballByBall - Ball by ball record
   * @param {number} count - Number of recent balls to get
   * @returns {Array} Recent balls
   */
  getRecentBalls(ballByBall, count) {
    return ballByBall.slice(-count);
  }

  /**
   * Get default effectiveness values for new bowler
   * @param {Object} player - Player data
   * @returns {Object} Default effectiveness
   */
  getDefaultEffectiveness(player) {
    return {
      overall: 50,
      economyRate: 7.0,
      wickets: 0,
      dots: 0,
      boundaries: 0,
      ballsBowled: 0,
      runsConceded: 0,
      recentForm: player?.attributes?.form || 50,
      recentBalls: []
    };
  }

  /**
   * Calculate recent form based on recent balls
   * @param {Array} recentBalls - Recent balls bowled
   * @returns {number} Recent form score (0-100)
   */
  calculateRecentForm(recentBalls) {
    if (recentBalls.length === 0) return 50;

    let score = 50;
    recentBalls.forEach(ball => {
      if (ball.isWicket) score += 8;
      else if (ball.runs === 0) score += 2;
      else if (ball.runs >= 4) score -= 4;
      else if (ball.runs <= 2) score += 1;
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate selection reasoning text
   * @param {Object} selectedBowler - Selected bowler
   * @param {Object} strategicSelection - Strategic selection data
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {string} Reasoning text
   */
  generateSelectionReasoning(selectedBowler, strategicSelection, context) {
    const reasons = [];

    // Phase-specific reasoning
    if (context.matchSituation.phase === 'powerplay') {
      reasons.push('powerplay specialist with pace and accuracy');
    } else if (context.matchSituation.phase === 'death') {
      reasons.push('experienced death bowler with variations');
    } else {
      reasons.push('middle overs specialist to build pressure');
    }

    // Matchup reasoning
    if (selectedBowler.matchupScore > 70) {
      reasons.push('favorable matchup against current batsmen');
    }

    // Form reasoning
    if (selectedBowler.recentForm > 70) {
      reasons.push('excellent recent form');
    }

    return `Selected ${selectedBowler.player.name} as ${reasons.join(' and ')}`;
  }

  /**
   * Suggest fielding changes for the new bowler
   * @param {Object} selectedBowler - Selected bowler
   * @param {BowlerSelectionContext} context - Selection context
   * @returns {Object} Suggested fielding changes
   */
  suggestFieldingChanges(selectedBowler, context) {
    const changes = {};
    const bowlerType = selectedBowler.player.bowlingType;
    const phase = context.matchSituation.phase;

    // Basic fielding suggestions based on bowler type and phase
    if (bowlerType.includes('spin') && phase === 'middle') {
      changes.suggestionType = 'spin_field';
      changes.description = 'Set attacking field for spin bowling';
    } else if (bowlerType.includes('fast') && phase === 'death') {
      changes.suggestionType = 'death_field';
      changes.description = 'Set defensive field for death bowling';
    }

    return changes;
  }

  /**
   * Get bowler selection statistics
   * @returns {Object} Selection statistics
   */
  getStats() {
    return {
      totalSelections: this.bowlerEffectiveness.size,
      averageEffectiveness: Array.from(this.bowlerEffectiveness.values())
        .reduce((sum, eff) => sum + eff.overall, 0) / this.bowlerEffectiveness.size || 0,
      eventHandlers: this.eventSystem.getStats().handlerCount
    };
  }

  /**
   * Reset bowler effectiveness tracking
   */
  reset() {
    this.bowlerEffectiveness.clear();
  }
}

export default BowlerSelectionManager;