/**
 * @file DecisionCalculator.js
 * @description Pre-contact decision calculation system for delivery threat and batting judgment
 * @module core/match-engine/DecisionCalculator
 */

/**
 * @typedef {Object} DecisionResult
 * @property {number} deliveryThreat - Delivery threat score (0-2)
 * @property {number} judgmentAbility - Batsman judgment score (0-2)
 * @property {Object} breakdown - Detailed breakdown of calculation
 */

/**
 * @typedef {Object} DecisionContext
 * @property {Object} bowler - Current bowler with attributes
 * @property {Object} striker - Striking batsman with attributes
 */

class DecisionCalculator {
  constructor() {
    // No dependencies needed for simplified calculation
  }

  /**
   * Calculate delivery threat and judgment ability using independent probability checks
   * @param {DecisionContext} context - Decision context
   * @returns {DecisionResult} Decision result
   */
  calculateDecision(context) {
    const { bowler, striker } = context;

    // Calculate bowling decision score (0-2 points)
    const bowlingDecisionResult = this.calculateBowlingDecisionScore(bowler);

    // Calculate batting decision score (0-2 points)
    const battingDecisionResult = this.calculateBattingDecisionScore(striker);

    return {
      deliveryThreat: bowlingDecisionResult.score,
      judgmentAbility: battingDecisionResult.score,
      breakdown: {
        bowler: {
          intelligence: bowler.attributes.bowling.intelligence,
          variations: bowler.attributes.bowling.variations,
          intelligenceCheck: bowlingDecisionResult.intelligenceCheck,
          variationsCheck: bowlingDecisionResult.variationsCheck,
          total: bowlingDecisionResult.score
        },
        striker: {
          judgment: striker.attributes.mental.judgement,
          shotSelection: striker.attributes.batting.technique, // Using technique as proxy
          judgmentCheck: battingDecisionResult.judgmentCheck,
          shotSelectionCheck: battingDecisionResult.shotSelectionCheck,
          total: battingDecisionResult.score
        }
      }
    };
  }

  /**
   * Calculate bowling decision score using independent probability checks
   * @param {Object} bowler - Bowler object
   * @returns {Object} Bowling decision result with checks and score
   */
  calculateBowlingDecisionScore(bowler) {
    const intelligence = bowler.attributes?.bowling?.intelligence || 10;
    const variations = bowler.attributes?.bowling?.variations || 10;

    // Independent attribute checks
    const intelligenceCheck = Math.random() < (intelligence / 20);
    const variationsCheck = Math.random() < (variations / 20);

    // Score is 1 point per successful check (0-2 total)
    const score = (intelligenceCheck ? 1 : 0) + (variationsCheck ? 1 : 0);

    return {
      score,
      intelligenceCheck,
      variationsCheck,
      intelligence,
      variations
    };
  }

  /**
   * Calculate batting decision score using independent probability checks
   * @param {Object} striker - Striker object
   * @returns {Object} Batting decision result with checks and score
   */
  calculateBattingDecisionScore(striker) {
    const judgment = striker.attributes?.mental?.judgement || 10;
    const shotSelection = striker.attributes?.batting?.technique || 10; // Use technique as proxy for shot selection

    // Independent attribute checks
    const judgmentCheck = Math.random() < (judgment / 20);
    const shotSelectionCheck = Math.random() < (shotSelection / 20);

    // Score is 1 point per successful check (0-2 total)
    const score = (judgmentCheck ? 1 : 0) + (shotSelectionCheck ? 1 : 0);

    return {
      score,
      judgmentCheck,
      shotSelectionCheck,
      judgment,
      shotSelection
    };
  }

  /**
   * Get detailed analysis of decision calculation
   * @param {DecisionResult} result - Decision result
   * @returns {Object} Detailed analysis
   */
  getDecisionAnalysis(result) {
    const { deliveryThreat, judgmentAbility, breakdown } = result;
    const advantage = judgmentAbility - deliveryThreat;

    return {
      deliveryThreat: {
        score: deliveryThreat,
        rating: this.getRating(deliveryThreat, 2),
        components: breakdown.bowler
      },
      judgmentAbility: {
        score: judgmentAbility,
        rating: this.getRating(judgmentAbility, 2),
        components: breakdown.striker
      },
      advantage: {
        value: advantage,
        favoredPlayer: advantage > 0 ? 'batsman' : advantage < 0 ? 'bowler' : 'neutral',
        magnitude: Math.abs(advantage),
        description: this.getAdvantageDescription(advantage)
      }
    };
  }

  /**
   * Get rating for a score
   * @param {number} score - Score to rate
   * @param {number} maxScore - Maximum possible score
   * @returns {string} Rating description
   */
  getRating(score, maxScore) {
    const percentage = (score / maxScore) * 100;

    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Very Good';
    if (percentage >= 60) return 'Good';
    if (percentage >= 45) return 'Average';
    if (percentage >= 30) return 'Below Average';
    return 'Poor';
  }

  /**
   * Get advantage description
   * @param {number} advantage - Advantage value
   * @returns {string} Advantage description
   */
  getAdvantageDescription(advantage) {
    const magnitude = Math.abs(advantage);

    if (magnitude <= 2) return 'Evenly matched';
    if (magnitude <= 5) return 'Slight advantage';
    if (magnitude <= 10) return 'Clear advantage';
    if (magnitude <= 15) return 'Strong advantage';
    return 'Dominant advantage';
  }
}

export default DecisionCalculator;