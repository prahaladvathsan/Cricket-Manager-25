/**
 * @file ContactCalculator.js
 * @description Simplified contact quality determination using decision scores and execution
 * @module core/match-engine/ContactCalculator
 */

import mentalityConfig from '../../../data/config/mentality-config.json';

/**
 * @typedef {Object} ContactResult
 * @property {string} type - Contact type (MISSED, EDGED, MIDDLED)
 * @property {number} contactQuality - Contact Quality score (-97 to +97)
 * @property {number} batsmanExecutionScore - Batting execution score (0-3)
 * @property {number} bowlerExecutionScore - Bowling execution score (0-3)
 * @property {Object} breakdown - Detailed calculation breakdown
 */

/**
 * @typedef {Object} ContactContext
 * @property {Object} striker - Striking batsman
 * @property {Object} bowler - Current bowler
 * @property {Object} decisionResult - Result from DecisionCalculator
 */

class ContactCalculator {
  constructor() {
    // Load configuration
    this.config = mentalityConfig.contactThresholds;
  }

  /**
   * Calculate contact quality for a ball using new independent execution checks
   * @param {ContactContext} context - Ball context
   * @returns {ContactResult} Contact result
   */
  calculateContact(context) {
    const { striker, bowler, decisionResult } = context;

    // Step 1: Calculate bowling execution checks (3 independent)
    const bowlingExecutionResult = this.calculateBowlingExecutionChecks(bowler);

    // Step 2: Calculate batting execution checks (3 independent)
    const battingExecutionResult = this.calculateBattingExecutionChecks(striker);

    // Step 3: Get base probabilities from decision score difference
    const decisionScoreDelta = decisionResult.judgmentAbility - decisionResult.deliveryThreat;
    const baseProbabilities = this.getBaseProbabilities(decisionScoreDelta);

    // Step 4: Apply execution adjustments
    const executionScoreDelta = battingExecutionResult.score - bowlingExecutionResult.score;
    const finalProbabilities = this.applyExecutionAdjustments(baseProbabilities, executionScoreDelta);

    // Step 5: Determine contact type
    const contactType = this.selectContactWithProbability(finalProbabilities);

    // Step 6: Calculate Contact Quality
    const contactQuality = this.calculateContactQuality(striker, bowler);

    return {
      type: contactType,
      contactQuality,
      batsmanExecutionScore: battingExecutionResult.score,
      bowlerExecutionScore: bowlingExecutionResult.score,
      breakdown: {
        decisionScores: {
          batting: decisionResult.judgmentAbility,
          bowling: decisionResult.deliveryThreat,
          delta: decisionScoreDelta
        },
        executionScores: {
          batting: battingExecutionResult,
          bowling: bowlingExecutionResult,
          delta: executionScoreDelta
        },
        probabilities: {
          base: baseProbabilities,
          adjusted: finalProbabilities
        },
        contactQuality,
        contactType
      }
    };
  }

  /**
   * Calculate bowling execution checks (3 independent checks)
   * @param {Object} bowler - Bowler object
   * @returns {Object} Bowling execution result with individual checks and score
   */
  calculateBowlingExecutionChecks(bowler) {
    const accuracy = bowler.attributes?.bowling?.accuracy || 10;
    const swing = bowler.attributes?.bowling?.swing || 10;

    // Get speed or turn based on bowler type
    let thirdAttribute = 10;
    let thirdAttributeName = 'speed';
    const bowlingType = bowler.bowlingType;

    if (['fast', 'fast-medium', 'medium'].includes(bowlingType)) {
      thirdAttribute = bowler.attributes?.bowling?.bowlingSpeed || 10;
      thirdAttributeName = 'speed';
    } else if (['off-break', 'leg-break', 'left-arm-orthodox', 'chinaman'].includes(bowlingType)) {
      thirdAttribute = bowler.attributes?.bowling?.turn || 10;
      thirdAttributeName = 'turn';
    }

    // Independent attribute checks
    const accuracyCheck = Math.random() < (accuracy / 20);
    const swingCheck = Math.random() < (swing / 20);
    const speedTurnCheck = Math.random() < (thirdAttribute / 20);

    // Score is 1 point per successful check (0-3 total)
    const score = (accuracyCheck ? 1 : 0) + (swingCheck ? 1 : 0) + (speedTurnCheck ? 1 : 0);

    return {
      score,
      accuracyCheck,
      swingCheck,
      speedTurnCheck,
      attributes: {
        accuracy,
        swing,
        [thirdAttributeName]: thirdAttribute
      }
    };
  }

  /**
   * Calculate batting execution checks (3 independent checks)
   * @param {Object} striker - Striker object
   * @returns {Object} Batting execution result with individual checks and score
   */
  calculateBattingExecutionChecks(striker) {
    const timing = striker.attributes?.batting?.timing || 10;
    const footwork = striker.attributes?.batting?.footwork || 10;
    const technique = striker.attributes?.batting?.technique || 10;

    // Independent attribute checks
    const timingCheck = Math.random() < (timing / 20);
    const footworkCheck = Math.random() < (footwork / 20);
    const techniqueCheck = Math.random() < (technique / 20);

    // Score is 1 point per successful check (0-3 total)
    const score = (timingCheck ? 1 : 0) + (footworkCheck ? 1 : 0) + (techniqueCheck ? 1 : 0);

    return {
      score,
      timingCheck,
      footworkCheck,
      techniqueCheck,
      attributes: {
        timing,
        footwork,
        technique
      }
    };
  }

  /**
   * Get base probabilities from decision score delta
   * @param {number} decisionScoreDelta - Decision score difference (batting - bowling)
   * @returns {Object} Base probabilities
   */
  getBaseProbabilities(decisionScoreDelta) {
    // Clamp delta to valid range (-2 to +2)
    const clampedDelta = Math.max(-2, Math.min(2, decisionScoreDelta));
    const deltaKey = clampedDelta.toString();

    // Get base probabilities from config
    const baseProbabilities = this.config.baseProbabilityMatrix[deltaKey];

    if (!baseProbabilities) {
      // Fallback to neutral probabilities
      return this.config.baseProbabilityMatrix["0"];
    }

    return baseProbabilities;
  }

  /**
   * Apply execution adjustments to base probabilities
   * @param {Object} baseProbabilities - Base probability distribution
   * @param {number} executionScoreDelta - Execution score difference (batting - bowling)
   * @returns {Object} Adjusted probabilities
   */
  applyExecutionAdjustments(baseProbabilities, executionScoreDelta) {
    const adjustments = this.config.executionAdjustments.perPointDifference;

    // Calculate adjustments
    const missedAdjustment = adjustments.missed * executionScoreDelta;
    const edgedAdjustment = adjustments.edged * executionScoreDelta;
    const middledAdjustment = adjustments.middled * executionScoreDelta;

    // Apply adjustments
    let adjustedProbabilities = {
      missed: baseProbabilities.missed + missedAdjustment,
      edged: baseProbabilities.edged + edgedAdjustment,
      middled: baseProbabilities.middled + middledAdjustment
    };

    // Normalize to ensure probabilities sum to 1
    const total = adjustedProbabilities.missed + adjustedProbabilities.edged + adjustedProbabilities.middled;
    if (total > 0) {
      adjustedProbabilities.missed /= total;
      adjustedProbabilities.edged /= total;
      adjustedProbabilities.middled /= total;
    }

    // Clamp to valid probability range [0, 1]
    adjustedProbabilities.missed = Math.max(0, Math.min(1, adjustedProbabilities.missed));
    adjustedProbabilities.edged = Math.max(0, Math.min(1, adjustedProbabilities.edged));
    adjustedProbabilities.middled = Math.max(0, Math.min(1, adjustedProbabilities.middled));

    return adjustedProbabilities;
  }

  /**
   * Calculate Contact Quality using raw scores and d40 rolls
   * @param {Object} striker - Striking batsman
   * @param {Object} bowler - Current bowler
   * @returns {number} Contact Quality (-97 to +97)
   */
  calculateContactQuality(striker, bowler) {
    // Get batting attributes
    const timing = striker.attributes?.batting?.timing || 10;
    const footwork = striker.attributes?.batting?.footwork || 10;
    const technique = striker.attributes?.batting?.technique || 10;

    // Get bowling attributes
    const accuracy = bowler.attributes?.bowling?.accuracy || 10;
    const swing = bowler.attributes?.bowling?.swing || 10;

    // Get speed or turn based on bowler type
    let thirdBowlingAttribute = 10;
    const bowlingType = bowler.bowlingType;
    if (['fast', 'fast-medium', 'medium'].includes(bowlingType)) {
      thirdBowlingAttribute = bowler.attributes?.bowling?.bowlingSpeed || 10;
    } else if (['off-break', 'leg-break', 'left-arm-orthodox', 'chinaman'].includes(bowlingType)) {
      thirdBowlingAttribute = bowler.attributes?.bowling?.turn || 10;
    }

    // Generate d40 rolls
    const d40Config = this.config.contactQuality.d40Roll;
    const battingD40 = Math.floor(Math.random() * (d40Config.max - d40Config.min + 1)) + d40Config.min;
    const bowlingD40 = Math.floor(Math.random() * (d40Config.max - d40Config.min + 1)) + d40Config.min;

    // Calculate raw scores
    const battingRawScore = timing + footwork + technique + battingD40;
    const bowlingRawScore = accuracy + swing + thirdBowlingAttribute + bowlingD40;

    // Contact Quality is the difference
    const contactQuality = battingRawScore - bowlingRawScore;

    return contactQuality;
  }

  /**
   * Select contact type based on probabilities
   * @param {Object} probabilities - Contact type probabilities {missed, edged, middled}
   * @returns {string} Selected contact type
   */
  selectContactWithProbability(probabilities) {
    const random = Math.random();
    let cumulative = 0;

    // Check missed
    cumulative += probabilities.missed;
    if (random <= cumulative) {
      return 'MISSED';
    }

    // Check edged
    cumulative += probabilities.edged;
    if (random <= cumulative) {
      return 'EDGED';
    }

    // Default to middled
    return 'MIDDLED';
  }

  /**
   * Get detailed contact analysis
   * @param {ContactResult} result - Contact result
   * @param {ContactContext} context - Ball context
   * @returns {Object} Detailed analysis
   */
  getContactAnalysis(result, context) {
    const { batsmanScore, bowlerScore, scoreDelta, breakdown } = result;

    return {
      outcome: result.type,
      scores: {
        batsman: batsmanScore,
        bowler: bowlerScore,
        delta: scoreDelta
      },
      advantage: {
        player: scoreDelta > 0 ? 'batsman' : scoreDelta < 0 ? 'bowler' : 'neutral',
        magnitude: Math.abs(scoreDelta),
        description: this.getAdvantageDescription(scoreDelta)
      },
      breakdown: breakdown,
      expectedOutcome: this.getExpectedOutcome(scoreDelta),
      recommendations: this.generateRecommendations(result, context)
    };
  }

  /**
   * Get advantage description based on score delta
   * @param {number} scoreDelta - Score difference
   * @returns {string} Advantage description
   */
  getAdvantageDescription(scoreDelta) {
    const magnitude = Math.abs(scoreDelta);

    if (magnitude <= 5) return 'Evenly matched';
    if (magnitude <= 10) return 'Slight advantage';
    if (magnitude <= 20) return 'Clear advantage';
    if (magnitude <= 30) return 'Strong advantage';
    return 'Dominant advantage';
  }

  /**
   * Get expected outcome based on score delta
   * @param {number} scoreDelta - Score difference
   * @returns {string} Expected outcome
   */
  getExpectedOutcome(scoreDelta) {
    if (scoreDelta <= -20) return 'Likely missed or edged';
    if (scoreDelta <= -10) return 'Difficult for batsman';
    if (scoreDelta <= 10) return 'Balanced contest';
    if (scoreDelta <= 20) return 'Favors batsman';
    return 'Likely clean contact';
  }

  /**
   * Generate recommendations based on contact result
   * @param {ContactResult} result - Contact result
   * @param {ContactContext} context - Ball context
   * @returns {Array} Recommendations
   */
  generateRecommendations(result, context) {
    const recommendations = [];
    const { scoreDelta } = result;

    if (scoreDelta < -15) {
      recommendations.push('Bowler has strong advantage - vary pace and line');
    } else if (scoreDelta > 15) {
      recommendations.push('Batsman dominant - consider field changes');
    } else {
      recommendations.push('Evenly matched - maintain current approach');
    }

    return recommendations;
  }

}

export default ContactCalculator;