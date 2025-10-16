/**
 * @file InteractiveMatchConstants.js
 * @description Centralized constants for interactive match system
 * Removes magic numbers and strings from the main controller
 */

export const FIELD_FORMATIONS = ['attacking', 'neutral', 'defensive'];

export const ACCELERATION_TIERS = [
  'Blockade',
  'Build',
  'Rotate',
  'Cruise',
  'Blitz',
  'Hit Out/Get Out'
];

export const BOWLING_PLAN_OPTIONS = {
  pace: {
    lineLength: [
      'Attacking Line',
      'Wide Line',
      'Short-Pitched',
      'Yorker Execution'
    ],
    variation: [
      'Pace Variation Mix',
      'Swing/Seam Focus',
      'Bouncer Barrage',
      'Consistent Accuracy'
    ]
  },
  spin: {
    lineLength: [
      'Flight & Loop',
      'Flat & Fast',
      'Wide of Off',
      'Stumps Attack'
    ],
    variation: [
      'Turn Candy Bag',
      'Flight Variation',
      'Pace Variation',
      'Consistent Line'
    ]
  }
};

export const SQUAD_SIZES = {
  full: 25,
  playing11: 11
};

export const MATCH_CONFIG = {
  maxOvers: 20,
  maxWickets: 10,
  maxBowlerOvers: 4,
  powerplayOvers: 6,
  defaultParScore: 160
};

export const TEAM_BALANCE_TARGETS = {
  squad: {
    keepers: { min: 1, target: 2 },
    bowlers: { min: 4, target: 8 },
    allRounders: { min: 2, target: 7 },
    batsmen: { min: 8, target: 12 }
  },
  playing11: {
    keepers: { min: 1, max: 1 },
    bowlingOptions: { min: 5, target: 6 }, // bowlers + all-rounders
    allRounders: { min: 0, target: 3 },
    bowlers: { min: 3, target: 4 }
  }
};

export const MENU_OPTIONS = {
  playing11Selection: {
    auto: '1',
    manual: '2'
  },
  battingOrder: {
    keep: '1',
    customize: '2'
  },
  accelerationMode: {
    auto: '1',
    manual: '2'
  },
  fieldFormation: {
    attacking: '1',
    neutral: '2',
    defensive: '3',
    keep: '4'
  }
};

export const DISPLAY_CONSTANTS = {
  tableBorder: '='.repeat(80),
  sectionBorder: '-'.repeat(80),
  wideTableBorder: '='.repeat(140),
  wideSectionBorder: '-'.repeat(140),
  scorecardBorder: '='.repeat(100)
};

/**
 * Get bowling plan options based on bowler type
 * @param {string} bowlerType - 'pace' or 'spin'
 * @returns {Object} { lineLength: Array, variation: Array }
 */
export function getBowlingPlanOptions(bowlerType) {
  const isPaceBowler = bowlerType === 'pace';
  return BOWLING_PLAN_OPTIONS[isPaceBowler ? 'pace' : 'spin'];
}

/**
 * Get acceleration tier name by index
 * @param {number} index - Tier index (0-5)
 * @returns {string} Tier name
 */
export function getAccelerationTierName(index) {
  return ACCELERATION_TIERS[index] || 'Rotate';
}

/**
 * Get field formation by index
 * @param {number} index - Formation index (0-2)
 * @returns {string} Formation name
 */
export function getFieldFormation(index) {
  return FIELD_FORMATIONS[index] || 'neutral';
}
