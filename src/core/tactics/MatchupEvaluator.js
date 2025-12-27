/**
 * @file MatchupEvaluator.js
 * @description Evaluate batsman vs bowling style matchups and apply modifiers
 * @module core/tactics/MatchupEvaluator
 */

import matchupConfig from '../../data/config/matchup-bonuses-config.json';

/**
 * @class MatchupEvaluator
 * @description Evaluates batsman-bowler matchups based on bowling style preferences
 */
class MatchupEvaluator {
  constructor() {
    this.bowlingStyles = matchupConfig.bowlingStyles;
    this.matchupEffects = matchupConfig.matchupEffects;
    console.log('✅ MatchupEvaluator initialized with 8 bowling styles');
  }

  /**
   * Determine bowler's primary bowling style from playstyle
   * @param {Object} bowler - Bowler object
   * @returns {string} Bowling style name
   */
  getBowlerStyle(bowler) {
    // Get primary bowling playstyle
    const primaryBowlingPlaystyle = bowler.primaryPlaystyle?.bowling || bowler.topPlaystyles?.bowling?.[0]?.name;

    if (!primaryBowlingPlaystyle) {
      // Fallback based on bowling type
      return bowler.bowlingType === 'pace' ? 'Hit-the-Deck Seamer' : 'Flat Spinner';
    }

    // Map playstyle to bowling style
    // The playstyle names should match the bowling styles from config
    return primaryBowlingPlaystyle;
  }

  /**
   * Evaluate matchup between batsman and bowler
   * @param {Object} batsman - Batsman object
   * @param {Object} bowler - Bowler object
   * @returns {Object} {rank, effect, modifiers} Matchup evaluation
   */
  evaluateMatchup(batsman, bowler) {
    const bowlerStyle = this.getBowlerStyle(bowler);

    // Get batsman's preference ranking for this bowling style
    const preferences = batsman.tactics?.bowlingStylePreferences;
    if (!preferences) {
      console.warn(`Batsman ${batsman.name} has no matchup preferences, defaulting to neutral`);
      return {
        rank: 4,
        effect: 'neutral',
        modifiers: {},
        bowlerStyle
      };
    }

    const rank = preferences[bowlerStyle];
    if (rank === undefined) {
      console.warn(`No preference found for style ${bowlerStyle}, defaulting to rank 4`);
      return {
        rank: 4,
        effect: 'neutral',
        modifiers: {},
        bowlerStyle
      };
    }

    // Determine effect based on rank
    let effectType = 'neutral';
    let effectConfig = null;

    for (const [type, config] of Object.entries(this.matchupEffects)) {
      if (config.ranks.includes(rank)) {
        effectType = type;
        effectConfig = config;
        break;
      }
    }

    return {
      rank,
      effect: effectType,
      modifiers: effectConfig?.attributeModifiers || {},
      description: effectConfig?.description || 'Neutral matchup',
      bowlerStyle
    };
  }

  /**
   * Apply matchup modifiers to batsman
   * @param {Object} batsman - Batsman object
   * @param {Object} bowler - Bowler object
   * @returns {Object} Modified batsman (copy)
   */
  applyMatchupModifiers(batsman, bowler) {
    const matchup = this.evaluateMatchup(batsman, bowler);
    // Deep clone batsman to avoid mutating original (must clone nested attribute objects)
    const modifiedBatsman = {
      ...batsman,
      attributes: {
        ...batsman.attributes,
        batting: { ...batsman.attributes?.batting },
        bowling: { ...batsman.attributes?.bowling },
        physical: { ...batsman.attributes?.physical },
        mental: { ...batsman.attributes?.mental },
        fielding: { ...batsman.attributes?.fielding }
      },
      condition: { ...batsman.condition }
    };

    // Apply modifiers
    if (matchup.modifiers && Object.keys(matchup.modifiers).length > 0) {
      Object.entries(matchup.modifiers).forEach(([attr, value]) => {
        this.applyAttributeModifier(modifiedBatsman, attr, value);
      });
    }

    // Store matchup info in metadata
    modifiedBatsman.matchupMetadata = {
      bowlerStyle: matchup.bowlerStyle,
      rank: matchup.rank,
      effect: matchup.effect,
      modifiersApplied: matchup.modifiers
    };

    return modifiedBatsman;
  }

  /**
   * Apply attribute modifier to batsman
   * @param {Object} batsman - Batsman object (will be mutated)
   * @param {string} attributeName - Attribute name
   * @param {number} modifier - Modifier value
   */
  applyAttributeModifier(batsman, attributeName, modifier) {
    // Matchup modifiers affect batting attributes specifically
    if (batsman.attributes?.batting && batsman.attributes.batting[attributeName] !== undefined) {
      batsman.attributes.batting[attributeName] += modifier;
      return;
    }

    // Fallback: search other categories
    if (batsman.attributes?.physical && batsman.attributes.physical[attributeName] !== undefined) {
      batsman.attributes.physical[attributeName] += modifier;
      return;
    }

    if (batsman.attributes?.mental && batsman.attributes.mental[attributeName] !== undefined) {
      batsman.attributes.mental[attributeName] += modifier;
      return;
    }

    console.warn(`Matchup attribute ${attributeName} not found for batsman ${batsman.name}`);
  }

  /**
   * Get matchup summary for display
   * @param {Object} batsman - Batsman object
   * @param {Object} bowler - Bowler object
   * @returns {Object} Matchup summary
   */
  getMatchupSummary(batsman, bowler) {
    const matchup = this.evaluateMatchup(batsman, bowler);

    let summary = '';
    if (matchup.effect === 'majorStrength') {
      summary = `${batsman.name} LOVES facing ${matchup.bowlerStyle} (Rank ${matchup.rank})`;
    } else if (matchup.effect === 'strength') {
      summary = `${batsman.name} plays well vs ${matchup.bowlerStyle} (Rank ${matchup.rank})`;
    } else if (matchup.effect === 'weakness') {
      summary = `${batsman.name} struggles vs ${matchup.bowlerStyle} (Rank ${matchup.rank})`;
    } else if (matchup.effect === 'majorWeakness') {
      summary = `${batsman.name} WEAK against ${matchup.bowlerStyle} (Rank ${matchup.rank})`;
    } else {
      summary = `${batsman.name} neutral vs ${matchup.bowlerStyle} (Rank ${matchup.rank})`;
    }

    return {
      summary,
      ...matchup
    };
  }

  /**
   * Get all matchup preferences for a batsman
   * @param {Object} batsman - Batsman object
   * @returns {Object} Sorted matchup preferences
   */
  getBatsmanMatchups(batsman) {
    const preferences = batsman.tactics?.bowlingStylePreferences;
    if (!preferences) {
      return null;
    }

    // Sort by rank (1 = best)
    const sorted = Object.entries(preferences)
      .sort(([, rankA], [, rankB]) => rankA - rankB)
      .map(([style, rank]) => {
        // Determine effect
        let effect = 'neutral';
        for (const [type, config] of Object.entries(this.matchupEffects)) {
          if (config.ranks.includes(rank)) {
            effect = type;
            break;
          }
        }

        return { style, rank, effect };
      });

    return {
      best: sorted.slice(0, 2),
      worst: sorted.slice(-2),
      all: sorted
    };
  }

  /**
   * Get info about evaluator
   * @returns {Object} Evaluator info
   */
  getInfo() {
    return {
      name: 'MatchupEvaluator',
      version: '1.0.0',
      bowlingStyles: this.bowlingStyles,
      effectTypes: Object.keys(this.matchupEffects),
      description: 'Evaluates batsman vs bowling style matchups',
      methods: [
        'evaluateMatchup(batsman, bowler)',
        'applyMatchupModifiers(batsman, bowler)',
        'getMatchupSummary(batsman, bowler)',
        'getBatsmanMatchups(batsman)',
        'getBowlerStyle(bowler)'
      ]
    };
  }
}

// Export singleton instance
export default new MatchupEvaluator();
