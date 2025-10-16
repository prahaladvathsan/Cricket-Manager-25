/**
 * @file AIMatchController.js
 * @description Handles AI decision-making for non-controlled teams in interactive matches
 * Separates AI logic from user input logic
 */

import bowlingPlansConfig from '../../../data/config/bowling-plans-config.json' with { type: "json" };

class AIMatchController {
  constructor(matchStore, playerStore) {
    this.matchStore = matchStore;
    this.playerStore = playerStore;
  }

  /**
   * Get recommended bowling plan for a bowler based on their playstyle
   * @param {Object} bowler - Bowler player object
   * @returns {Object} { lineLength, variation, reason }
   */
  getRecommendedBowlingPlan(bowler) {
    const playstyle = bowler.primaryPlaystyle?.bowling || '';
    const bowlingType = bowler.bowlingType === 'spin' || bowler.bowlingType === 'off-spin' || bowler.bowlingType === 'leg-spin' ? 'spin' : 'pace';

    const plansConfig = bowlingType === 'pace' ? bowlingPlansConfig.paceBowling : bowlingPlansConfig.spinBowling;

    // Find plans that boost this bowler's playstyle
    let recommendedLine = null;
    let recommendedVariation = null;

    // Search line/length plans for playstyle boost
    for (const [planName, plan] of Object.entries(plansConfig.lineLengthPlans)) {
      if (plan.playstyleBoosted?.includes(playstyle)) {
        recommendedLine = planName;
        break;
      }
    }

    // Search variation plans for playstyle boost
    for (const [planName, plan] of Object.entries(plansConfig.variationPlans)) {
      if (plan.playstyleBoosted?.includes(playstyle)) {
        recommendedVariation = planName;
        break;
      }
    }

    // Fallback defaults if no match found
    if (!recommendedLine) {
      recommendedLine = bowlingType === 'pace' ? 'Wide Line' : 'Flight & Loop';
    }
    if (!recommendedVariation) {
      recommendedVariation = 'Consistent Accuracy';
    }

    return {
      lineLength: recommendedLine,
      variation: recommendedVariation,
      reason: `Recommended for ${playstyle} playstyle`
    };
  }

  /**
   * AI decides whether to bat or bowl first (simple logic)
   * @returns {string} 'bat' or 'bowl'
   */
  decideTossChoice() {
    // Bat first most of the time (70% probability)
    return Math.random() < 0.7 ? 'bat' : 'bowl';
  }

  /**
   * AI selects field formation based on match situation
   * @param {Object} matchState - Current match state
   * @returns {string} Field formation ('attacking', 'neutral', 'defensive')
   */
  selectFieldFormation(matchState) {
    const { currentBall, innings, teams } = matchState;
    const runRate = currentBall.over > 0 ? (teams.batting.totalScore / (currentBall.over + currentBall.ball / 6)).toFixed(2) : 0;

    // Powerplay (overs 1-6): Attacking
    if (currentBall.over < 6) {
      return 'attacking';
    }

    // Death overs (16-20): Defensive
    if (currentBall.over >= 15) {
      return 'defensive';
    }

    // Second innings - consider target
    if (innings.number === 2) {
      const required = innings.target - teams.batting.totalScore;
      const ballsLeft = 120 - (currentBall.over * 6 + currentBall.ball);
      const reqRunRate = ballsLeft > 0 ? (required / ballsLeft * 6) : 0;

      // If batting team needs high run rate, go defensive
      if (reqRunRate > 10) {
        return 'defensive';
      } else if (reqRunRate < 6) {
        // If they're cruising, go attacking
        return 'attacking';
      }
    }

    // Middle overs: Neutral (default)
    return 'neutral';
  }

  /**
   * AI selects bowling plans for a bowler
   * Now uses smart recommendation based on playstyle
   * @param {Object} bowler - Bowler player object
   * @returns {Object} Bowling plans { lineLength, variation }
   */
  selectBowlingPlans(bowler) {
    // Use smart recommendation based on playstyle
    const recommendation = this.getRecommendedBowlingPlan(bowler);
    return {
      lineLength: recommendation.lineLength,
      variation: recommendation.variation
    };
  }

  /**
   * AI selects acceleration tier for batsmen (uses auto-selection)
   * This method is mainly for consistency - the actual logic is in AccelerationTierManager
   * @param {Object} matchState - Current match state
   * @returns {string} Acceleration tier (returns 'auto' to use system auto-selection)
   */
  selectAccelerationTier(matchState) {
    // AI always uses auto-selection for acceleration
    return 'auto';
  }

  /**
   * AI selects opening batsmen (uses first two in batting order)
   * @param {Array} battingSquad - Batting team squad (player IDs)
   * @returns {Object} { striker, nonStriker }
   */
  selectOpeningBatsmen(battingSquad) {
    return {
      striker: battingSquad[0],
      nonStriker: battingSquad[1]
    };
  }

  /**
   * AI selects opening bowler (first available non-keeper)
   * @param {Array} bowlingSquad - Bowling team squad (player IDs)
   * @returns {string} Bowler ID
   */
  selectOpeningBowler(bowlingSquad) {
    // Find first non-keeper
    for (const playerId of bowlingSquad) {
      const player = this.playerStore.getState().getPlayer(playerId);
      if (player && player.role !== 'wicket-keeper') {
        // Ensure player has bowlingType
        if (!player.bowlingType) {
          player.bowlingType = 'medium';
        }
        return playerId;
      }
    }

    // Fallback: use first player
    const playerId = bowlingSquad[0];
    const player = this.playerStore.getState().getPlayer(playerId);
    if (player && !player.bowlingType) {
      player.bowlingType = 'medium';
    }
    return playerId;
  }

  /**
   * AI makes a decision at the start of an over
   * @param {Object} matchState - Current match state
   * @param {Object} bowlingTeam - Bowling team object
   * @returns {Object} { fieldFormation, bowlingPlans }
   */
  makeStartOfOverDecisions(matchState, bowlingTeam) {
    const { innings } = matchState;
    const bowlerId = innings.bowler;
    const bowler = this.playerStore.getState().getPlayer(bowlerId);

    return {
      fieldFormation: this.selectFieldFormation(matchState),
      bowlingPlans: this.selectBowlingPlans(bowler),
      accelerationMode: 'auto' // AI always uses auto
    };
  }
}

export default AIMatchController;
