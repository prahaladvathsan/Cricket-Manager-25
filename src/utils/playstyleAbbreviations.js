/**
 * Playstyle Abbreviation System
 *
 * Provides systematic 3-5 character abbreviations for all 25 playstyles
 * with prefix-based color coding for visual hierarchy.
 *
 * Pattern:
 * - Batting positions: [O/T/M/L]-[SLG/BAL/ANC] (blue spectrum gradient)
 * - Batting specialists: S-[FIN/RUN/PNH/WAL] (purple)
 * - Pace bowling: P-[SWG/HTD/SBS/DTH] (red)
 * - Spin bowling: S-[CLS/FLT/MYS/CTN] (orange)
 * - Fielding: WKP (cyan)
 */

export const PLAYSTYLE_ABBREVIATIONS = {
  // Batting - Positional (12)
  'Opener - Slogger': 'O-SLG',
  'Opener - Balanced': 'O-BAL',
  'Opener - Anchor': 'O-ANC',
  'Top Order - Slogger': 'T-SLG',
  'Top Order - Balanced': 'T-BAL',
  'Top Order - Anchor': 'T-ANC',
  'Middle Order - Slogger': 'M-SLG',
  'Middle Order - Balanced': 'M-BAL',
  'Middle Order - Anchor': 'M-ANC',
  'Lower Order - Slogger': 'L-SLG',
  'Lower Order - Balanced': 'L-BAL',
  'Lower Order - Anchor': 'L-ANC',

  // Batting - Specialist (4)
  'Finisher': 'S-FIN',
  'Runner': 'S-RUN',
  'Pinch-Hitter': 'S-PNH',
  'Wall': 'S-WAL',

  // Bowling - Pace (4)
  'Swing Bowler': 'P-SWG',
  'Hit-the-Deck Seamer': 'P-HTD',
  'Short-Ball Specialist': 'P-SBS',
  'Death Specialist': 'P-DTH',

  // Bowling - Spin (4)
  'Classical Spinner': 'S-CLS',
  'Flat Spinner': 'S-FLT',
  'Mystery Spinner': 'S-MYS',
  'Containment Spinner': 'S-CTN',

  // Fielding (1)
  'Wicketkeeper': 'WKP'
};

// Reverse mapping for lookup
export const ABBREVIATION_TO_PLAYSTYLE = Object.fromEntries(
  Object.entries(PLAYSTYLE_ABBREVIATIONS).map(([full, abbr]) => [abbr, full])
);

/**
 * Prefix-based color mapping
 * Each prefix group gets distinct colors for visual hierarchy
 *
 * Matches existing conventions:
 * - Pace bowling: Red (from TacticsPanel.jsx, BowlingPlansTab.jsx)
 * - Spin bowling: Purple (from TacticsPanel.jsx, BowlingPlansTab.jsx)
 * - Batting positions: Blue spectrum gradient (Opener → Top → Middle → Lower)
 */
export const PREFIX_COLORS = {
  'O': { text: 'text-blue-400', bg: 'bg-blue-500/20', hex: '#60A5FA' },      // Opener (matches BattingOrderTab)
  'T': { text: 'text-green-400', bg: 'bg-green-500/20', hex: '#4ADE80' },    // Top Order (matches BattingOrderTab)
  'M': { text: 'text-yellow-400', bg: 'bg-yellow-500/20', hex: '#FACC15' }, // Middle Order (matches BattingOrderTab)
  'L': { text: 'text-orange-400', bg: 'bg-orange-500/20', hex: '#FB923C' }, // Lower Order (matches BattingOrderTab)
  'S-F': { text: 'text-pink-400', bg: 'bg-pink-500/20', hex: '#F472B6' }, // Specialist batting (distinct from spin purple)
  'S-C': { text: 'text-purple-400', bg: 'bg-purple-500/20', hex: '#C084FC' }, // Spin bowling (matches TacticsPanel)
  'P': { text: 'text-red-400', bg: 'bg-red-500/20', hex: '#F87171' },      // Pace bowling (matches TacticsPanel)
  'WKP': { text: 'text-cyan-400', bg: 'bg-cyan-500/20', hex: '#22D3EE' }   // Wicketkeeper
};

/**
 * Get abbreviation for a full playstyle name
 * @param {string} fullName - Full playstyle name (e.g., "Opener - Slogger")
 * @returns {string} Abbreviation (e.g., "O-SLG") or original if not found
 */
export const getPlaystyleAbbr = (fullName) => {
  return PLAYSTYLE_ABBREVIATIONS[fullName] || fullName;
};

/**
 * Get full playstyle name from abbreviation
 * @param {string} abbreviation - Abbreviation (e.g., "O-SLG")
 * @returns {string} Full name (e.g., "Opener - Slogger") or original if not found
 */
export const getPlaystyleFullName = (abbreviation) => {
  return ABBREVIATION_TO_PLAYSTYLE[abbreviation] || abbreviation;
};

/**
 * Get color scheme for a playstyle abbreviation based on prefix
 * Disambiguates S- prefix (specialist batting vs spin bowling)
 *
 * @param {string} abbreviation - Playstyle abbreviation
 * @returns {Object} Color scheme with text, bg, and hex properties
 */
export const getPlaystyleColor = (abbreviation) => {
  // Wicketkeeper special case
  if (abbreviation === 'WKP') {
    return PREFIX_COLORS['WKP'];
  }

  // Disambiguate S- prefix by checking exact abbreviations
  if (abbreviation.startsWith('S-')) {
    // Specialist batting (pink): S-FIN, S-RUN, S-PNH, S-WAL
    if (abbreviation === 'S-FIN' || abbreviation === 'S-RUN' ||
        abbreviation === 'S-PNH' || abbreviation === 'S-WAL') {
      return PREFIX_COLORS['S-F'];
    }
    // Spin bowling (purple): S-CLS, S-FLT, S-MYS, S-CTN
    if (abbreviation === 'S-CLS' || abbreviation === 'S-FLT' ||
        abbreviation === 'S-MYS' || abbreviation === 'S-CTN') {
      return PREFIX_COLORS['S-C'];
    }
  }

  // Standard prefix extraction (O-, T-, M-, L-, P-)
  const prefix = abbreviation.split('-')[0];
  return PREFIX_COLORS[prefix] || PREFIX_COLORS['O']; // Default to opener color
};
