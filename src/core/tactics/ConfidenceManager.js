/**
 * @file ConfidenceManager.js
 * @description Manage player confidence system with ball-level, milestone, and over-level triggers
 * @module core/tactics/ConfidenceManager
 */

import confidenceConfig from '../../data/config/confidence-config.json';

/**
 * @class ConfidenceManager
 * @description Manages dynamic confidence system for players during matches
 */
class ConfidenceManager {
  constructor() {
    this.levels = confidenceConfig.confidenceLevels;
    this.battingTriggers = confidenceConfig.battingTriggers;
    this.bowlingTriggers = confidenceConfig.bowlingTriggers;
    this.limits = confidenceConfig.limits;
    console.log('✅ ConfidenceManager initialized with 5 confidence levels');
  }

  /**
   * Initialize match confidence for all players (confidence = morale)
   * @param {Object[]} players - Array of player objects
   * @returns {Object} Player confidence map {playerId: confidence}
   */
  initializeMatchConfidence(players) {
    const confidenceMap = {};

    players.forEach(player => {
      const playerId = typeof player === 'string' ? player : player.id;
      const playerObj = typeof player === 'string' ? null : player;

      // confidence = morale (default 50 if not set)
      const morale = playerObj?.condition?.morale || 50;
      confidenceMap[playerId] = this.clampConfidence(morale);
    });

    return confidenceMap;
  }

  /**
   * Update batting confidence based on ball/over/milestone triggers
   * @param {Object} player - Player object
   * @param {Object} ballResult - Ball result
   * @param {Object} overResult - Over result (if end of over)
   * @param {Object} matchSituation - Current match situation
   * @returns {number} Updated confidence value
   */
  updateBattingConfidence(player, ballResult, overResult, matchSituation) {
    let currentConfidence = player.condition?.confidence || 50;
    let delta = 0;

    // Ball-level triggers
    if (ballResult.runs === 4) {
      delta += this.battingTriggers.ballLevel.score4.change;
    }
    if (ballResult.runs === 6) {
      delta += this.battingTriggers.ballLevel.score6.change;
    }

    // Track consecutive dot balls (need to pass from matchSituation or ball metadata)
    if (ballResult.runs === 0 && !ballResult.isWicket && matchSituation.consecutiveDots >= 3) {
      delta += this.battingTriggers.ballLevel.every3Dots.change;
    }

    // Every 10 balls survived trigger
    const ballsFaced = matchSituation.ballsFaced || 0;
    if (ballsFaced > 0 && ballsFaced % 10 === 0) {
      delta += this.battingTriggers.ballLevel.every10Balls.change;
    }

    // Milestone triggers
    const playerScore = matchSituation.playerScore || 0;
    if (playerScore === 25) {
      delta += this.battingTriggers.milestones.reach25.change;
    }
    if (playerScore === 50) {
      delta += this.battingTriggers.milestones.reach50.change;
    }

    // Over-level triggers (if end of over)
    if (overResult && overResult.isEndOfOver) {
      const overRuns = overResult.runsScored || 0;
      const targetRuns = overResult.targetRuns || 0;

      if (overRuns >= targetRuns) {
        // Met or exceeded target
        const bonus = overRuns - targetRuns;
        delta += this.battingTriggers.overLevel.targetMet.baseChange;
        delta += bonus * this.battingTriggers.overLevel.targetMet.bonusPerRun;
      } else {
        // Missed target
        const shortfall = targetRuns - overRuns;
        delta += this.battingTriggers.overLevel.targetMissed.baseChange;
        delta -= shortfall * this.battingTriggers.overLevel.targetMissed.penaltyPerRun;
      }

      // CRR vs RRR/TRR check
      const currentRunRate = matchSituation.currentRunRate || 0;
      const requiredRunRate = matchSituation.requiredRunRate || matchSituation.targetRunRate || 0;

      if (currentRunRate < requiredRunRate) {
        delta += this.battingTriggers.overLevel.crrCheck.change;
      }
    }

    const newConfidence = this.clampConfidence(currentConfidence + delta);
    return newConfidence;
  }

  /**
   * Update bowling confidence based on triggers
   * @param {Object} bowler - Bowler object
   * @param {Object} ballResult - Ball result
   * @param {Object} overResult - Over result (if end of over)
   * @param {Object} matchSituation - Current match situation
   * @returns {number} Updated confidence value
   */
  updateBowlingConfidence(bowler, ballResult, overResult, matchSituation) {
    let currentConfidence = bowler.condition?.confidence || 50;
    let delta = 0;

    // Ball-level triggers
    if (ballResult.isWicket) {
      delta += this.bowlingTriggers.ballLevel.takeWicket.change;
    }

    if (ballResult.runs === 4 || ballResult.runs === 6) {
      delta += this.bowlingTriggers.ballLevel.concedeBoundary.change;
    }

    // Every 3 dot balls (need tracker)
    if (ballResult.runs === 0 && !ballResult.isWicket && matchSituation.bowlerDotBalls >= 3) {
      delta += this.bowlingTriggers.ballLevel.every3Dots.change;
    }

    // Over-level triggers (if end of over)
    if (overResult && overResult.isEndOfOver) {
      const overRuns = overResult.runsConceded || 0;
      const targetRuns = overResult.targetRunsToDefend || 0;

      // Maiden over
      if (overRuns === 0) {
        delta += this.bowlingTriggers.overLevel.maidenOver.change;
      }

      // Target defended/failed
      if (targetRuns > 0) {
        if (overRuns <= targetRuns) {
          const saved = targetRuns - overRuns;
          delta += this.bowlingTriggers.overLevel.targetDefended.baseChange;
          delta += saved * this.bowlingTriggers.overLevel.targetDefended.bonusPerRun;
        } else {
          const excess = overRuns - targetRuns;
          delta += this.bowlingTriggers.overLevel.targetFailed.baseChange;
          delta -= excess * this.bowlingTriggers.overLevel.targetFailed.penaltyPerRun;
        }
      }

      // CRR vs RRR/TRR check
      const currentRunRate = matchSituation.currentRunRate || 0;
      const requiredRunRate = matchSituation.requiredRunRate || matchSituation.targetRunRate || 0;

      if (currentRunRate > requiredRunRate) {
        delta += this.bowlingTriggers.overLevel.crrCheck.change;
      }
    }

    // Milestone: wicket haul (need to track wickets in match)
    const wicketsInMatch = matchSituation.bowlerWickets || 0;
    if (wicketsInMatch === 3 || wicketsInMatch === 4 || wicketsInMatch >= 5) {
      delta += this.bowlingTriggers.milestones.wicketHaul.change;
    }

    const newConfidence = this.clampConfidence(currentConfidence + delta);
    return newConfidence;
  }

  /**
   * Get confidence level name from confidence value
   * @param {number} confidence - Confidence value (0-100)
   * @returns {string} Level name
   */
  getConfidenceLevel(confidence) {
    for (const [levelName, levelData] of Object.entries(this.levels)) {
      if (confidence >= levelData.range[0] && confidence <= levelData.range[1]) {
        return levelName;
      }
    }
    return 'Normal'; // Fallback
  }

  /**
   * Apply confidence modifiers to ALL player attributes
   * @param {Object} player - Player object
   * @param {number} confidence - Current confidence value
   * @returns {Object} Modified player (copy)
   */
  applyConfidenceModifiers(player, confidence) {
    const levelName = this.getConfidenceLevel(confidence);
    const levelData = this.levels[levelName];
    const modifier = levelData.attributeModifier;

    if (modifier === 0) {
      return player; // No modification for Normal confidence
    }

    const modifiedPlayer = JSON.parse(JSON.stringify(player)); // Deep copy

    // Apply modifier to ALL attribute categories
    this.applyModifierToAllAttributes(modifiedPlayer, modifier);

    return modifiedPlayer;
  }

  /**
   * Apply modifier to all attributes across all categories
   * @param {Object} player - Player object (will be mutated)
   * @param {number} modifier - Modifier value (+2, +1, 0, -1, -2)
   */
  applyModifierToAllAttributes(player, modifier) {
    if (!player.attributes) return;

    // Batting attributes
    if (player.attributes.batting) {
      Object.keys(player.attributes.batting).forEach(attr => {
        player.attributes.batting[attr] += modifier;
      });
    }

    // Bowling attributes
    if (player.attributes.bowling) {
      Object.keys(player.attributes.bowling).forEach(attr => {
        player.attributes.bowling[attr] += modifier;
      });
    }

    // Physical attributes
    if (player.attributes.physical) {
      Object.keys(player.attributes.physical).forEach(attr => {
        player.attributes.physical[attr] += modifier;
      });
    }

    // Mental attributes
    if (player.attributes.mental) {
      Object.keys(player.attributes.mental).forEach(attr => {
        player.attributes.mental[attr] += modifier;
      });
    }

    // Fielding attributes
    if (player.attributes.fielding) {
      Object.keys(player.attributes.fielding).forEach(attr => {
        player.attributes.fielding[attr] += modifier;
      });
    }
  }

  /**
   * Update morale after match (rolling 5-match average)
   * @param {Object} player - Player object
   * @param {number} finalConfidence - Final confidence at match end
   * @param {Array} confidenceHistory - Array of confidence values from last 5 matches
   * @returns {number} Updated morale
   */
  updateMoraleAfterMatch(player, finalConfidence, confidenceHistory = []) {
    // Add current match confidence to history
    const updatedHistory = [...confidenceHistory, finalConfidence];

    // Keep only last 5 matches
    const rollingWindow = confidenceConfig.matchLevelTracking.moraleCalculation.rollingWindow;
    const recentHistory = updatedHistory.slice(-rollingWindow);

    // Calculate average
    const sum = recentHistory.reduce((acc, val) => acc + val, 0);
    const newMorale = sum / recentHistory.length;

    return this.clampConfidence(newMorale);
  }

  /**
   * Clamp confidence value to valid range (0-100)
   * @param {number} confidence - Confidence value
   * @returns {number} Clamped confidence
   */
  clampConfidence(confidence) {
    return Math.max(this.limits.min, Math.min(this.limits.max, confidence));
  }

  /**
   * Get info about manager
   * @returns {Object} Manager info
   */
  getInfo() {
    return {
      name: 'ConfidenceManager',
      version: '1.0.0',
      levels: Object.keys(this.levels),
      limits: this.limits,
      description: 'Manages dynamic confidence system with ball/over/milestone triggers',
      methods: [
        'initializeMatchConfidence(players)',
        'updateBattingConfidence(player, ballResult, overResult, matchSituation)',
        'updateBowlingConfidence(bowler, ballResult, overResult, matchSituation)',
        'getConfidenceLevel(confidence)',
        'applyConfidenceModifiers(player, confidence)',
        'updateMoraleAfterMatch(player, finalConfidence, history)'
      ]
    };
  }
}

// Export singleton instance
export default new ConfidenceManager();
