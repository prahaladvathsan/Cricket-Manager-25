/**
 * @file TacticsModifierSystem.js
 * @description Orchestrates all tactical modifier systems in correct order
 * @module core/tactics/TacticsModifierSystem
 */

import attributeModifierSystem from '../match-engine/systems/AttributeModifierSystem.js';
import matchupEvaluator from './MatchupEvaluator.js';
import accelerationTierManager from './AccelerationTierManager.js';
import bowlingPlanManager from './BowlingPlanManager.js';
import confidenceManager from './ConfidenceManager.js';
import energyManager from './EnergyManager.js';
import pressureCalculator from './PressureCalculator.js';
import contextualModifierManager from './ContextualModifierManager.js';

/**
 * @class TacticsModifierSystem
 * @description Central orchestrator for all tactical modifiers in correct application order
 *
 * Modifier Chain Order (CRITICAL):
 * 1. Playstyle modifiers (existing AttributeModifierSystem)
 * 2. Matchup modifiers (MatchupEvaluator)
 * 3. Tier/Plan modifiers (AccelerationTierManager / BowlingPlanManager)
 * 4. Confidence modifiers (ConfidenceManager)
 * 5. Energy modifiers (EnergyManager)
 * 6. Pressure modifiers (PressureCalculator - playstyle rating ONLY)
 * 7. Contextual modifiers (ContextualModifierManager)
 */
class TacticsModifierSystem {
  constructor() {
    console.log('✅ TacticsModifierSystem initialized - orchestrating 7 modifier stages');
  }

  /**
   * Apply all tactical modifiers to striker and bowler in correct order
   * @param {Object} ballContext - Ball context with striker, bowler, nonStriker, etc.
   * @param {Object} tacticsState - Current tactics state from matchStore
   * @param {Object} matchSituation - Current match situation
   * @returns {Object} Modified players and calculated mentalities
   */
  applyAllModifiers(ballContext, tacticsState, matchSituation) {
    // Extract players
    let modifiedStriker = ballContext.striker;
    let modifiedBowler = ballContext.bowler;
    const nonStriker = ballContext.nonStriker;

    // Build match context for playstyle evaluation
    const matchContext = this.buildMatchContext(ballContext, matchSituation);

    // Track all applied modifiers for metadata
    const modifierMetadata = {
      stages: []
    };

    // ========== STAGE 1: Playstyle Modifiers ==========
    const playstyleResult = this.applyPlaystyleModifiers(modifiedStriker, modifiedBowler, matchContext);
    modifiedStriker = playstyleResult.striker;
    modifiedBowler = playstyleResult.bowler;
    modifierMetadata.stages.push({
      stage: 1,
      name: 'Playstyle',
      striker: playstyleResult.strikerMetadata,
      bowler: playstyleResult.bowlerMetadata
    });

    // ========== STAGE 2: Matchup Modifiers ==========
    const matchupResult = this.applyMatchupModifiers(modifiedStriker, modifiedBowler);
    modifiedStriker = matchupResult.striker;
    modifierMetadata.stages.push({
      stage: 2,
      name: 'Matchup',
      matchup: matchupResult.matchupSummary
    });

    // ========== STAGE 3: Tier/Plan Modifiers ==========
    const tierPlanResult = this.applyTierAndPlanModifiers(modifiedStriker, modifiedBowler, tacticsState);
    modifiedStriker = tierPlanResult.striker;
    modifiedBowler = tierPlanResult.bowler;
    modifierMetadata.stages.push({
      stage: 3,
      name: 'Tier/Plan',
      strikerTier: tierPlanResult.strikerTier,
      bowlerPlans: tierPlanResult.bowlerPlans
    });

    // ========== STAGE 4: Confidence Modifiers ==========
    const confidenceResult = this.applyConfidenceModifiers(modifiedStriker, modifiedBowler);
    modifiedStriker = confidenceResult.striker;
    modifiedBowler = confidenceResult.bowler;
    modifierMetadata.stages.push({
      stage: 4,
      name: 'Confidence',
      strikerConfidence: confidenceResult.strikerConfidence,
      bowlerConfidence: confidenceResult.bowlerConfidence
    });

    // ========== STAGE 5: Energy Modifiers ==========
    const energyResult = this.applyEnergyModifiers(modifiedStriker, modifiedBowler);
    modifiedStriker = energyResult.striker;
    modifiedBowler = energyResult.bowler;
    modifierMetadata.stages.push({
      stage: 5,
      name: 'Energy',
      strikerEnergy: energyResult.strikerEnergy,
      bowlerEnergy: energyResult.bowlerEnergy
    });

    // ========== STAGE 6: Pressure Modifiers (Playstyle Rating ONLY) ==========
    const pressureResult = this.applyPressureModifiers(modifiedStriker, modifiedBowler, tacticsState);
    modifiedStriker = pressureResult.striker;
    modifiedBowler = pressureResult.bowler;
    modifierMetadata.stages.push({
      stage: 6,
      name: 'Pressure',
      battingPressure: tacticsState.pressureIndex.batting,
      bowlingPressure: tacticsState.pressureIndex.bowling
    });

    // ========== STAGE 7: Contextual Modifiers ==========
    const contextualResult = this.applyContextualModifiers(modifiedBowler, modifiedStriker, nonStriker, matchSituation);
    modifiedBowler = contextualResult.bowler;
    modifierMetadata.stages.push({
      stage: 7,
      name: 'Contextual',
      leftRightActive: contextualResult.leftRightActive,
      newBallActive: contextualResult.newBallActive
    });

    // ========== Calculate Mentalities ==========
    const { battingMentality, bowlingMentality } = this.calculateMentalities(tierPlanResult.strikerTier, tierPlanResult.bowlerPlans, modifiedBowler);

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler,
      battingMentality,
      bowlingMentality,
      metadata: modifierMetadata
    };
  }

  /**
   * Stage 1: Apply playstyle modifiers
   */
  applyPlaystyleModifiers(striker, bowler, matchContext) {
    const strikerResult = attributeModifierSystem.applyBattingModifiers(striker, matchContext, bowler);
    const bowlerResult = attributeModifierSystem.applyBowlingModifiers(bowler, matchContext, strikerResult.player || strikerResult);

    return {
      striker: strikerResult.player || strikerResult,
      bowler: bowlerResult.player || bowlerResult,
      strikerMetadata: strikerResult.metadata || {},
      bowlerMetadata: bowlerResult.metadata || {}
    };
  }

  /**
   * Stage 2: Apply matchup modifiers
   */
  applyMatchupModifiers(striker, bowler) {
    const modifiedStriker = matchupEvaluator.applyMatchupModifiers(striker, bowler);
    const matchupSummary = matchupEvaluator.evaluateMatchup(striker, bowler);

    return {
      striker: modifiedStriker,
      matchupSummary
    };
  }

  /**
   * Stage 3: Apply tier and bowling plan modifiers
   */
  applyTierAndPlanModifiers(striker, bowler, tacticsState) {
    // Get striker's acceleration tier
    const strikerTier = tacticsState.currentAcceleration?.striker || 'Rotate';
    const modifiedStriker = accelerationTierManager.applyTierModifiers(striker, strikerTier);

    // Get bowler's plans
    const bowlerPlans = tacticsState.bowlingPlans?.[bowler.id] || bowler.tactics?.defaultBowlingPlans || {
      lineLength: 'Wide Line',
      variation: 'Consistent Accuracy'
    };

    const modifiedBowler = bowlingPlanManager.applyPlanModifiers(bowler, bowlerPlans.lineLength, bowlerPlans.variation);

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler,
      strikerTier,
      bowlerPlans
    };
  }

  /**
   * Stage 4: Apply confidence modifiers
   */
  applyConfidenceModifiers(striker, bowler) {
    const strikerConfidence = striker.condition?.confidence || 50;
    const bowlerConfidence = bowler.condition?.confidence || 50;

    const modifiedStriker = confidenceManager.applyConfidenceModifiers(striker, strikerConfidence);
    const modifiedBowler = confidenceManager.applyConfidenceModifiers(bowler, bowlerConfidence);

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler,
      strikerConfidence,
      bowlerConfidence
    };
  }

  /**
   * Stage 5: Apply energy modifiers
   */
  applyEnergyModifiers(striker, bowler) {
    const strikerEnergy = striker.condition?.energy || 100;
    const bowlerEnergy = bowler.condition?.energy || 100;

    const modifiedStriker = energyManager.applyEnergyModifiers(striker, strikerEnergy);
    const modifiedBowler = energyManager.applyEnergyModifiers(bowler, bowlerEnergy);

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler,
      strikerEnergy,
      bowlerEnergy
    };
  }

  /**
   * Stage 6: Apply pressure modifiers (playstyle rating ONLY)
   */
  applyPressureModifiers(striker, bowler, tacticsState) {
    const battingPressure = tacticsState.pressureIndex?.batting || 50;
    const bowlingPressure = tacticsState.pressureIndex?.bowling || 50;

    const modifiedStriker = pressureCalculator.applyPressureToPlaystyleRating(striker, battingPressure, 'batting');
    const modifiedBowler = pressureCalculator.applyPressureToPlaystyleRating(bowler, bowlingPressure, 'bowling');

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler
    };
  }

  /**
   * Stage 7: Apply contextual modifiers
   */
  applyContextualModifiers(bowler, striker, nonStriker, matchSituation) {
    const over = matchSituation.over || 1;

    const leftRightActive = contextualModifierManager.checkLeftRightCombo(striker, nonStriker);
    const newBallActive = contextualModifierManager.checkNewBallBoost(over, bowler.bowlingType);

    const modifiedBowler = contextualModifierManager.applyAllContextualModifiers(bowler, striker, nonStriker, over);

    return {
      bowler: modifiedBowler,
      leftRightActive,
      newBallActive
    };
  }

  /**
   * Calculate batting and bowling mentalities
   */
  calculateMentalities(strikerTier, bowlerPlans, bowler) {
    // Batting mentality from acceleration tier
    const battingMentality = accelerationTierManager.selectMentalityForBall(strikerTier);

    // Bowling mentality from bowling plans
    const bowlingType = this.determineBowlingType(bowler);
    const bowlingMentalityProbs = bowlingPlanManager.calculateMentalityProbabilities(
      bowlerPlans.lineLength,
      bowlerPlans.variation,
      bowlingType
    );
    const bowlingMentality = bowlingPlanManager.selectDeliveryMentality(bowlingMentalityProbs);

    return {
      battingMentality,
      bowlingMentality
    };
  }

  /**
   * Determine bowling type (pace/spin) from bowler
   */
  determineBowlingType(bowler) {
    if (!bowler.bowlingType) return 'pace';

    const type = bowler.bowlingType.toLowerCase();

    if (type.includes('spin') || type.includes('leg') || type.includes('off')) {
      return 'spin';
    }

    return 'pace';
  }

  /**
   * Build match context for playstyle modifier evaluation
   */
  buildMatchContext(ballContext, matchSituation) {
    const striker = ballContext.striker || {};
    const bowler = ballContext.bowler || {};

    return {
      // Match phase
      phase: matchSituation.phase || this.determinePhase(matchSituation.over),
      over: matchSituation.over || 1,
      ball: matchSituation.ball || 1,

      // Team state
      wicketsInHand: matchSituation.wicketsInHand || 10,
      currentRunRate: matchSituation.currentRunRate || 0,
      requiredRunRate: matchSituation.requiredRunRate || 0,

      // Innings state
      ballsLeft: matchSituation.ballsLeft || 120,
      target: matchSituation.target || null,

      // Partnership state
      currentPartnership: matchSituation.currentPartnership || 0,
      currentPartnershipBalls: matchSituation.currentPartnershipBalls || 0,

      // Player state
      ballsFaced: matchSituation.ballsFaced || 0,
      oversBowled: matchSituation.oversBowled || 0,

      // Batsman attributes
      batsmanTechnique: striker.attributes?.batting?.technique || 0,
      batsmanFootwork: striker.attributes?.batting?.footwork || 0,
      batsmanConcentration: striker.attributes?.mental?.concentration || 0,

      // Bowler attributes
      bowlerAccuracy: bowler.attributes?.bowling?.accuracy || 0,
      bowlerSwing: bowler.attributes?.bowling?.swing || 0,
      bowlerTurn: bowler.attributes?.bowling?.turn || 0
    };
  }

  /**
   * Determine match phase from over number
   */
  determinePhase(over) {
    if (over <= 6) return 'powerplay';
    if (over >= 17) return 'death';
    return 'middle';
  }

  /**
   * Get info about system
   */
  getInfo() {
    return {
      name: 'TacticsModifierSystem',
      version: '1.0.0',
      description: 'Central orchestrator for all tactical modifiers',
      modifierChain: [
        '1. Playstyle modifiers (AttributeModifierSystem)',
        '2. Matchup modifiers (MatchupEvaluator)',
        '3. Tier/Plan modifiers (AccelerationTierManager/BowlingPlanManager)',
        '4. Confidence modifiers (ConfidenceManager)',
        '5. Energy modifiers (EnergyManager)',
        '6. Pressure modifiers (PressureCalculator - playstyle rating ONLY)',
        '7. Contextual modifiers (ContextualModifierManager)'
      ],
      methods: [
        'applyAllModifiers(ballContext, tacticsState, matchSituation)'
      ]
    };
  }
}

// Export singleton instance
export default new TacticsModifierSystem();
