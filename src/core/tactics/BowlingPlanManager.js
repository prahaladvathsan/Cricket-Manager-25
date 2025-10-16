/**
 * @file BowlingPlanManager.js
 * @description Manage bowling plans (line-length + variation) and calculate delivery mentality
 * @module core/tactics/BowlingPlanManager
 */

import bowlingPlansConfig from '../../data/config/bowling-plans-config.json' with { type: "json" };

/**
 * @class BowlingPlanManager
 * @description Manages bowling plans for pace and spin bowlers
 */
class BowlingPlanManager {
  constructor() {
    this.paceLineLengthPlans = bowlingPlansConfig.paceBowling.lineLengthPlans;
    this.paceVariationPlans = bowlingPlansConfig.paceBowling.variationPlans;
    this.spinLineLengthPlans = bowlingPlansConfig.spinBowling.lineLengthPlans;
    this.spinVariationPlans = bowlingPlansConfig.spinBowling.variationPlans;
    this.playstyleBoostAmount = bowlingPlansConfig.playstyleBoostAmount;
    console.log('✅ BowlingPlanManager initialized with pace/spin plans');
  }

  /**
   * Get available plans for a bowler based on bowling type
   * @param {string} bowlingType - 'pace' or 'spin'
   * @returns {Object} {lineLengthPlans, variationPlans}
   */
  getAvailablePlans(bowlingType) {
    if (bowlingType === 'pace') {
      return {
        lineLengthPlans: Object.keys(this.paceLineLengthPlans),
        variationPlans: Object.keys(this.paceVariationPlans)
      };
    } else {
      return {
        lineLengthPlans: Object.keys(this.spinLineLengthPlans),
        variationPlans: Object.keys(this.spinVariationPlans)
      };
    }
  }

  /**
   * Calculate combined mentality probabilities from two plans
   * @param {string} lineLengthPlan - Line-length plan name
   * @param {string} variationPlan - Variation plan name
   * @param {string} bowlingType - 'pace' or 'spin'
   * @returns {Object} {attacking, neutral, defensive} percentages
   */
  calculateMentalityProbabilities(lineLengthPlan, variationPlan, bowlingType) {
    const lineLengthPlans = bowlingType === 'pace' ? this.paceLineLengthPlans : this.spinLineLengthPlans;
    const variationPlans = bowlingType === 'pace' ? this.paceVariationPlans : this.spinVariationPlans;

    const llPlan = lineLengthPlans[lineLengthPlan];
    const varPlan = variationPlans[variationPlan];

    if (!llPlan || !varPlan) {
      console.warn(`Invalid bowling plans: ${lineLengthPlan}, ${variationPlan}. Using defaults.`);
      return { attacking: 0.33, neutral: 0.34, defensive: 0.33 };
    }

    // Sum tendency scores
    const attackingTotal = llPlan.tendencyScores.attacking + varPlan.tendencyScores.attacking;
    const neutralTotal = llPlan.tendencyScores.neutral + varPlan.tendencyScores.neutral;
    const defensiveTotal = llPlan.tendencyScores.defensive + varPlan.tendencyScores.defensive;

    const total = attackingTotal + neutralTotal + defensiveTotal;

    return {
      attacking: attackingTotal / total,
      neutral: neutralTotal / total,
      defensive: defensiveTotal / total
    };
  }

  /**
   * Select delivery mentality based on combined probabilities
   * @param {Object} probabilities - {attacking, neutral, defensive}
   * @returns {string} Selected mentality ('attacking', 'neutral', 'defensive')
   */
  selectDeliveryMentality(probabilities) {
    const roll = Math.random();

    if (roll < probabilities.attacking) {
      return 'attacking';
    } else if (roll < probabilities.attacking + probabilities.neutral) {
      return 'neutral';
    } else {
      return 'defensive';
    }
  }

  /**
   * Apply bowling plan modifiers to bowler
   * @param {Object} bowler - Bowler object
   * @param {string} lineLengthPlan - Line-length plan name
   * @param {string} variationPlan - Variation plan name
   * @returns {Object} Modified bowler (copy)
   */
  applyPlanModifiers(bowler, lineLengthPlan, variationPlan) {
    const bowlingType = bowler.bowlingType || 'pace';
    const lineLengthPlans = bowlingType === 'pace' ? this.paceLineLengthPlans : this.spinLineLengthPlans;
    const variationPlans = bowlingType === 'pace' ? this.paceVariationPlans : this.spinVariationPlans;

    const llPlan = lineLengthPlans[lineLengthPlan];
    const varPlan = variationPlans[variationPlan];

    if (!llPlan || !varPlan) {
      console.warn(`Invalid bowling plans for ${bowler.name}, no modifiers applied`);
      return { ...bowler };
    }

    const modifiedBowler = JSON.parse(JSON.stringify(bowler)); // Deep copy

    // Apply line-length plan modifiers
    this.applyPlanSet(modifiedBowler, llPlan);

    // Apply variation plan modifiers
    this.applyPlanSet(modifiedBowler, varPlan);

    return modifiedBowler;
  }

  /**
   * Apply a single plan's modifiers to bowler
   * @param {Object} bowler - Bowler object (will be mutated)
   * @param {Object} plan - Plan configuration
   */
  applyPlanSet(bowler, plan) {
    // Apply bonuses
    if (plan.attributeModifiers.bonuses) {
      Object.entries(plan.attributeModifiers.bonuses).forEach(([attr, value]) => {
        this.applyAttributeModifier(bowler, attr, value);
      });
    }

    // Apply penalties
    if (plan.attributeModifiers.penalties) {
      Object.entries(plan.attributeModifiers.penalties).forEach(([attr, value]) => {
        this.applyAttributeModifier(bowler, attr, value);
      });
    }
  }

  /**
   * Apply attribute modifier to bowler
   * @param {Object} bowler - Bowler object (will be mutated)
   * @param {string} attributeName - Attribute name
   * @param {number} modifier - Modifier value
   */
  applyAttributeModifier(bowler, attributeName, modifier) {
    // Search in bowling attributes
    if (bowler.attributes?.bowling && bowler.attributes.bowling[attributeName] !== undefined) {
      bowler.attributes.bowling[attributeName] += modifier;
      return;
    }

    // Search in physical attributes
    if (bowler.attributes?.physical && bowler.attributes.physical[attributeName] !== undefined) {
      bowler.attributes.physical[attributeName] += modifier;
      return;
    }

    // Search in mental attributes
    if (bowler.attributes?.mental && bowler.attributes.mental[attributeName] !== undefined) {
      bowler.attributes.mental[attributeName] += modifier;
      return;
    }

    console.warn(`Bowling plan attribute ${attributeName} not found for ${bowler.name}`);
  }

  /**
   * Check if plans match bowler's playstyle and apply boost
   * @param {Object} bowler - Bowler object
   * @param {string} lineLengthPlan - Line-length plan name
   * @param {string} variationPlan - Variation plan name
   * @returns {Object} {boosted: boolean, plans: [], newRating: number}
   */
  applyPlaystyleBoost(bowler, lineLengthPlan, variationPlan) {
    const bowlingType = bowler.bowlingType || 'pace';
    const lineLengthPlans = bowlingType === 'pace' ? this.paceLineLengthPlans : this.spinLineLengthPlans;
    const variationPlans = bowlingType === 'pace' ? this.paceVariationPlans : this.spinVariationPlans;

    const llPlan = lineLengthPlans[lineLengthPlan];
    const varPlan = variationPlans[variationPlan];

    if (!llPlan || !varPlan) {
      return { boosted: false, plans: [], newRating: 0 };
    }

    const primaryPlaystyle = bowler.primaryPlaystyle?.bowling;
    if (!primaryPlaystyle) {
      return { boosted: false, plans: [], newRating: 0 };
    }

    const matchedPlans = [];

    // Check line-length plan
    if (llPlan.playstyleBoosted && llPlan.playstyleBoosted.includes(primaryPlaystyle)) {
      matchedPlans.push(lineLengthPlan);
    }

    // Check variation plan
    if (varPlan.playstyleBoosted && varPlan.playstyleBoosted.includes(primaryPlaystyle)) {
      matchedPlans.push(variationPlan);
    }

    if (matchedPlans.length > 0 && bowler.playstyleRatings?.bowling) {
      const originalRating = bowler.playstyleRatings.bowling[primaryPlaystyle] || 0;
      const boost = this.playstyleBoostAmount * matchedPlans.length; // Stack boosts if both match
      const newRating = originalRating + boost;

      return {
        boosted: true,
        plans: matchedPlans,
        newRating,
        originalRating,
        boost
      };
    }

    return { boosted: false, plans: [], newRating: 0 };
  }

  /**
   * Get info about manager
   * @returns {Object} Manager info
   */
  getInfo() {
    return {
      name: 'BowlingPlanManager',
      version: '1.0.0',
      pacePlans: {
        lineLength: Object.keys(this.paceLineLengthPlans),
        variation: Object.keys(this.paceVariationPlans)
      },
      spinPlans: {
        lineLength: Object.keys(this.spinLineLengthPlans),
        variation: Object.keys(this.spinVariationPlans)
      },
      playstyleBoost: this.playstyleBoostAmount,
      description: 'Manages bowling plans with line-length and variation strategies',
      methods: [
        'getAvailablePlans(bowlingType)',
        'calculateMentalityProbabilities(ll, var, type)',
        'selectDeliveryMentality(probabilities)',
        'applyPlanModifiers(bowler, ll, var)',
        'applyPlaystyleBoost(bowler, ll, var)'
      ]
    };
  }
}

// Export singleton instance
export default new BowlingPlanManager();
