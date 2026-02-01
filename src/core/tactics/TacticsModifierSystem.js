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
    // Orchestrates 7 modifier stages
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
      bowlerPlans: tierPlanResult.bowlerPlans,
      strikerMetadata: modifiedStriker.tierMetadata,
      bowlerMetadata: modifiedBowler.planMetadata
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
      bowlingPressure: tacticsState.pressureIndex.bowling,
      strikerMetadata: pressureResult.strikerPressureMetadata,
      bowlerMetadata: pressureResult.bowlerPressureMetadata
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
    const { battingMentality, bowlingMentality} = this.calculateMentalities(tierPlanResult.strikerTier, tierPlanResult.bowlerPlans, modifiedBowler);

    // ========== Create UI Breakdown ==========
    const breakdown = this.createModifierBreakdown(modifierMetadata, modifiedStriker, modifiedBowler, tierPlanResult, matchupResult);

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler,
      battingMentality,
      bowlingMentality,
      metadata: modifierMetadata,
      breakdown: breakdown  // New: UI-friendly breakdown
    };
  }

  /**
   * Format conditions array into a human-readable string
   * @param {Array} conditions - Array of condition objects
   * @returns {string} Formatted condition string
   */
  formatConditions(conditions) {
    if (!conditions || conditions.length === 0) return null;

    return conditions.map(cond => {
      const { field, operator, value } = cond;
      // Convert field names to more readable format
      const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
      return `${fieldName} ${operator} ${value}`;
    }).join(' and ');
  }

  /**
   * Create UI-friendly modifier breakdown showing active effects
   * @param {Object} metadata - Raw modifier metadata
   * @param {Object} striker - Modified striker
   * @param {Object} bowler - Modified bowler
   * @param {Object} tierPlanResult - Tier/plan information
   * @param {Object} matchupResult - Matchup information
   * @returns {Object} Breakdown for UI display
   */
  createModifierBreakdown(metadata, striker, bowler, tierPlanResult, matchupResult) {
    const strikerBreakdown = {
      playstyleModifiers: [],
      tacticalModifiers: [],
      matchupModifiers: [],
      confidenceModifiers: [],
      energyModifiers: [],
      pressureModifiers: [],
      contextModifiers: []
    };

    const bowlerBreakdown = {
      playstyleModifiers: [],
      tacticalModifiers: [],
      matchupModifiers: [],
      confidenceModifiers: [],
      energyModifiers: [],
      pressureModifiers: [],
      contextModifiers: []
    };

    // Process each stage
    metadata.stages.forEach(stage => {
      switch (stage.stage) {
        case 1: // Playstyle
          // Striker playstyle - show each applied modifier with its effects
          if (stage.striker?.appliedModifiers && stage.striker.appliedModifiers.length > 0) {
            stage.striker.appliedModifiers.forEach(modifier => {
              // Format effect details into a readable string
              const effectStrings = modifier.effectDetails.map(eff => {
                const sign = eff.value > 0 ? '+' : '';
                return `${sign}${eff.value.toFixed(1)} ${eff.attribute}`;
              });

              strikerBreakdown.playstyleModifiers.push({
                name: modifier.name,
                value: modifier.sideEffect ? 0 : 1, // Just for color coding (positive/negative)
                description: effectStrings.join(', '),
                condition: this.formatConditions(modifier.conditions)
              });
            });
          }

          // Bowler playstyle - show each applied modifier with its effects
          if (stage.bowler?.appliedModifiers && stage.bowler.appliedModifiers.length > 0) {
            stage.bowler.appliedModifiers.forEach(modifier => {
              // Format effect details into a readable string
              const effectStrings = modifier.effectDetails.map(eff => {
                const sign = eff.value > 0 ? '+' : '';
                return `${sign}${eff.value.toFixed(1)} ${eff.attribute}`;
              });

              bowlerBreakdown.playstyleModifiers.push({
                name: modifier.name,
                value: modifier.sideEffect ? 0 : 1, // Just for color coding
                description: effectStrings.join(', '),
                condition: this.formatConditions(modifier.conditions)
              });
            });
          }
          break;

        case 2: // Matchup
          if (stage.matchup?.effect && stage.matchup.effect !== 'neutral') {
            const { effect, modifiers, bowlerStyle, rank } = stage.matchup;

            const modifierDescriptions = Object.entries(modifiers || {})
              .map(([attr, value]) => {
                const sign = value > 0 ? '+' : '';
                return `${sign}${value} ${attr}`;
              })
              .join(', ');

            const effectNames = {
              majorStrength: 'Major Strength',
              strength: 'Strength',
              weakness: 'Weakness',
              majorWeakness: 'Major Weakness'
            };

            const modifierValue = modifiers?.timing || 0;

            strikerBreakdown.matchupModifiers.push({
              name: effectNames[effect] || effect,
              value: modifierValue,
              description: modifierDescriptions || `${effectNames[effect]} vs ${bowlerStyle}`,
              condition: `Rank ${rank} vs ${bowlerStyle}`
            });
          }
          break;

        case 3: // Tier/Plan
          if (stage.strikerMetadata && stage.strikerMetadata.appliedModifiers) {
            const { bonuses = {}, penalties = {} } = stage.strikerMetadata.appliedModifiers;
            const allModifiers = { ...bonuses, ...penalties };

            if (Object.keys(allModifiers).length > 0) {
              const modifierDescriptions = Object.entries(allModifiers)
                .map(([attr, value]) => {
                  const sign = value > 0 ? '+' : '';
                  return `${sign}${value} ${attr}`;
                })
                .join(', ');

              strikerBreakdown.tacticalModifiers.push({
                name: `${stage.strikerTier} Acceleration`,
                value: Object.values(bonuses).reduce((sum, val) => sum + val, 0) -
                       Math.abs(Object.values(penalties).reduce((sum, val) => sum + val, 0)),
                description: modifierDescriptions,
                condition: `Tier: ${stage.strikerTier}`
              });
            }
          }

          if (stage.bowlerMetadata && stage.bowlerMetadata.appliedModifiers) {
            const { lineLengthModifiers, variationModifiers } = stage.bowlerMetadata.appliedModifiers;
            const allModifiers = {};

            if (lineLengthModifiers?.bonuses) Object.assign(allModifiers, lineLengthModifiers.bonuses);
            if (lineLengthModifiers?.penalties) Object.assign(allModifiers, lineLengthModifiers.penalties);
            if (variationModifiers?.bonuses) Object.assign(allModifiers, variationModifiers.bonuses);
            if (variationModifiers?.penalties) Object.assign(allModifiers, variationModifiers.penalties);

            if (Object.keys(allModifiers).length > 0) {
              const modifierDescriptions = Object.entries(allModifiers)
                .map(([attr, value]) => {
                  const sign = value > 0 ? '+' : '';
                  return `${sign}${value} ${attr}`;
                })
                .join(', ');

              const { lineLength, variation } = stage.bowlerMetadata;
              bowlerBreakdown.tacticalModifiers.push({
                name: `${lineLength} / ${variation}`,
                value: Object.values(allModifiers).reduce((sum, val) => sum + val, 0),
                description: modifierDescriptions,
                condition: `Plans: ${lineLength}, ${variation}`
              });
            }
          }
          break;

        case 4: // Confidence
          const strikerConfidence = stage.strikerConfidence;
          const bowlerConfidence = stage.bowlerConfidence;

          if (strikerConfidence > 60 || strikerConfidence < 40) {
            const level = strikerConfidence >= 81 ? 'Sky-High' : strikerConfidence >= 61 ? 'High' : strikerConfidence >= 41 ? 'Normal' : strikerConfidence >= 21 ? 'Low' : 'Shattered';
            const modifier = strikerConfidence >= 81 ? 2 : strikerConfidence >= 61 ? 1 : strikerConfidence >= 41 ? 0 : strikerConfidence >= 21 ? -1 : -2;
            let conditionStr = null;
            if (strikerConfidence >= 81) conditionStr = 'confidence >= 81';
            else if (strikerConfidence >= 61) conditionStr = 'confidence >= 61';
            else if (strikerConfidence >= 21) conditionStr = 'confidence >= 21';
            else conditionStr = 'confidence < 21';

            if (modifier !== 0) {
              strikerBreakdown.confidenceModifiers.push({
                name: `${level} Confidence`,
                value: modifier,
                description: `${modifier > 0 ? '+' : ''}${modifier} to all attributes`,
                condition: conditionStr
              });
            }
          }

          if (bowlerConfidence > 60 || bowlerConfidence < 40) {
            const level = bowlerConfidence >= 81 ? 'Sky-High' : bowlerConfidence >= 61 ? 'High' : bowlerConfidence >= 41 ? 'Normal' : bowlerConfidence >= 21 ? 'Low' : 'Shattered';
            const modifier = bowlerConfidence >= 81 ? 2 : bowlerConfidence >= 61 ? 1 : bowlerConfidence >= 41 ? 0 : bowlerConfidence >= 21 ? -1 : -2;
            let conditionStr = null;
            if (bowlerConfidence >= 81) conditionStr = 'confidence >= 81';
            else if (bowlerConfidence >= 61) conditionStr = 'confidence >= 61';
            else if (bowlerConfidence >= 21) conditionStr = 'confidence >= 21';
            else conditionStr = 'confidence < 21';

            if (modifier !== 0) {
              bowlerBreakdown.confidenceModifiers.push({
                name: `${level} Confidence`,
                value: modifier,
                description: `${modifier > 0 ? '+' : ''}${modifier} to all attributes`,
                condition: conditionStr
              });
            }
          }
          break;

        case 5: // Energy
          const strikerEnergy = stage.strikerEnergy;
          const bowlerEnergy = stage.bowlerEnergy;

          if (strikerEnergy < 80) {
            const level = strikerEnergy >= 60 ? 'Slightly Tired' : strikerEnergy >= 40 ? 'Tired' : strikerEnergy >= 20 ? 'Exhausted' : 'Gassed';
            const modifier = strikerEnergy >= 60 ? -1 : strikerEnergy >= 40 ? -2 : strikerEnergy >= 20 ? -1 : -2;
            const scope = strikerEnergy >= 40 ? 'physical' : 'all';
            let conditionStr = null;
            if (strikerEnergy >= 60) conditionStr = 'energy >= 60 and < 80';
            else if (strikerEnergy >= 40) conditionStr = 'energy >= 40 and < 60';
            else if (strikerEnergy >= 20) conditionStr = 'energy >= 20 and < 40';
            else conditionStr = 'energy < 20';

            strikerBreakdown.energyModifiers.push({
              name: `${level}`,
              value: modifier,
              description: `${modifier} to ${scope} attributes`,
              condition: conditionStr
            });
          }

          if (bowlerEnergy < 80) {
            const level = bowlerEnergy >= 60 ? 'Slightly Tired' : bowlerEnergy >= 40 ? 'Tired' : bowlerEnergy >= 20 ? 'Exhausted' : 'Gassed';
            const modifier = bowlerEnergy >= 60 ? -1 : bowlerEnergy >= 40 ? -2 : bowlerEnergy >= 20 ? -1 : -2;
            const scope = bowlerEnergy >= 40 ? 'physical' : 'all';
            let conditionStr = null;
            if (bowlerEnergy >= 60) conditionStr = 'energy >= 60 and < 80';
            else if (bowlerEnergy >= 40) conditionStr = 'energy >= 40 and < 60';
            else if (bowlerEnergy >= 20) conditionStr = 'energy >= 20 and < 40';
            else conditionStr = 'energy < 20';

            bowlerBreakdown.energyModifiers.push({
              name: `${level}`,
              value: modifier,
              description: `${modifier} to ${scope} attributes`,
              condition: conditionStr
            });
          }
          break;

        case 6: // Pressure
          if (stage.strikerMetadata && stage.strikerMetadata.penaltyApplied > 0) {
            const penalty = stage.strikerMetadata.penaltyApplied;
            const pressure = stage.battingPressure || 50;

            strikerBreakdown.pressureModifiers.push({
              name: 'High Pressure',
              value: -Math.round(penalty),
              description: `-${penalty.toFixed(1)} to playstyle rating`,
              condition: `pressure = ${pressure.toFixed(0)}`
            });
          }

          if (stage.bowlerMetadata && stage.bowlerMetadata.penaltyApplied > 0) {
            const penalty = stage.bowlerMetadata.penaltyApplied;
            const pressure = stage.bowlingPressure || 50;

            bowlerBreakdown.pressureModifiers.push({
              name: 'High Pressure',
              value: -Math.round(penalty),
              description: `-${penalty.toFixed(1)} to playstyle rating`,
              condition: `pressure = ${pressure.toFixed(0)}`
            });
          }
          break;

        case 7: // Contextual
          if (stage.leftRightActive) {
            bowlerBreakdown.contextModifiers.push({
              name: 'Left-Right Partnership',
              value: -2,
              description: '-2 accuracy',
              condition: 'left-right hand partnership'
            });
          }
          if (stage.newBallActive) {
            bowlerBreakdown.contextModifiers.push({
              name: 'New Ball Bonus',
              value: 2,
              description: '+2 swing',
              condition: 'over <= 6 (new ball)'
            });
          }
          break;
      }
    });

    return {
      striker: strikerBreakdown,
      bowler: bowlerBreakdown
    };
  }

  /**
   * Stage 1: Apply playstyle modifiers
   */
  applyPlaystyleModifiers(striker, bowler, matchContext) {
    const strikerResult = attributeModifierSystem.applyBattingModifiers(striker, matchContext, bowler);
    const bowlerResult = attributeModifierSystem.applyBowlingModifiers(bowler, matchContext, strikerResult.player || strikerResult);

    // Extract the actual player objects
    const modifiedStriker = strikerResult.player || strikerResult;
    const modifiedBowler = bowlerResult.player || bowlerResult;

    // Extract metadata from matchMetadata (where AttributeModifierSystem stores it)
    const strikerMetadata = modifiedStriker.matchMetadata ? {
      activePlaystyle: modifiedStriker.matchMetadata.activePlaystyle,
      playstyleRating: modifiedStriker.matchMetadata.playstyleRating,
      appliedModifiers: modifiedStriker.matchMetadata.appliedModifiers || []
    } : {};

    const bowlerMetadata = modifiedBowler.matchMetadata ? {
      activePlaystyle: modifiedBowler.matchMetadata.activePlaystyle,
      playstyleRating: modifiedBowler.matchMetadata.playstyleRating,
      appliedModifiers: modifiedBowler.matchMetadata.appliedModifiers || []
    } : {};

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler,
      strikerMetadata,
      bowlerMetadata
    };
  }

  /**
   * Stage 2: Apply matchup modifiers
   */
  applyMatchupModifiers(striker, bowler) {
    const modifiedStriker = matchupEvaluator.applyMatchupModifiers(striker, bowler);

    const matchupSummary = modifiedStriker.matchupMetadata ? {
      rank: modifiedStriker.matchupMetadata.rank,
      effect: modifiedStriker.matchupMetadata.effect,
      modifiers: modifiedStriker.matchupMetadata.modifiersApplied,
      bowlerStyle: modifiedStriker.matchupMetadata.bowlerStyle
    } : matchupEvaluator.evaluateMatchup(striker, bowler);

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
    const strikerConfidence = striker.condition?.confidence ?? 50;
    const bowlerConfidence = bowler.condition?.confidence ?? 50;

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
    const strikerEnergy = striker.condition?.energy ?? 100;
    const bowlerEnergy = bowler.condition?.energy ?? 100;

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
    const battingPressure = tacticsState.pressureIndex?.batting ?? 50;
    const bowlingPressure = tacticsState.pressureIndex?.bowling ?? 50;

    const modifiedStriker = pressureCalculator.applyPressureToPlaystyleRating(striker, battingPressure, 'batting');
    const modifiedBowler = pressureCalculator.applyPressureToPlaystyleRating(bowler, bowlingPressure, 'bowling');

    return {
      striker: modifiedStriker,
      bowler: modifiedBowler,
      strikerPressureMetadata: modifiedStriker.pressureMetadata || null,
      bowlerPressureMetadata: modifiedBowler.pressureMetadata || null
    };
  }

  /**
   * Stage 7: Apply contextual modifiers
   */
  applyContextualModifiers(bowler, striker, nonStriker, matchSituation) {
    const over = matchSituation.over;

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
    const striker = ballContext.striker;
    const bowler = ballContext.bowler;

    if (!striker) throw new Error('striker is required');
    if (!bowler) throw new Error('bowler is required');
    if (!matchSituation) throw new Error('matchSituation is required');

    return {
      phase: matchSituation.phase || this.determinePhase(matchSituation.over),
      over: matchSituation.over,
      ball: matchSituation.ball,
      wicketsInHand: matchSituation.wicketsInHand,
      currentRunRate: matchSituation.currentRunRate,
      requiredRunRate: matchSituation.requiredRunRate,
      ballsLeft: matchSituation.ballsLeft,
      target: matchSituation.target || null,
      currentPartnership: matchSituation.currentPartnership,
      currentPartnershipBalls: matchSituation.currentPartnershipBalls,
      ballsFaced: matchSituation.ballsFaced,
      oversBowled: matchSituation.oversBowled,
      batsmanTechnique: striker.attributes?.batting?.technique,
      batsmanFootwork: striker.attributes?.batting?.footwork,
      batsmanConcentration: striker.attributes?.mental?.concentration,
      bowlerAccuracy: bowler.attributes?.bowling?.accuracy,
      bowlerSwing: bowler.attributes?.bowling?.swing,
      bowlerTurn: bowler.attributes?.bowling?.turn
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
