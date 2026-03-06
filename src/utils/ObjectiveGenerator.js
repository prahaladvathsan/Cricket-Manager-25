/**
 * @file ObjectiveGenerator.js
 * @description Generates board objectives for each season with weighted scoring
 */

import { Target, Trophy, Award, TrendingUp, Home, Zap, Medal, Users, Flame, BarChart, Star, Crosshair, DollarSign, MapPin, PiggyBank } from 'lucide-react';

// Region labels for sign_from_region objective display
const REGION_LABELS = {
  AU: 'Australian',
  ENG: 'English',
  IND: 'Indian',
  SA: 'South African',
  WI: 'West Indian'
};

// Icon mapping (can't store components in Zustand persist, so we store strings)
export const ICON_MAP = {
  target: Target,
  trophy: Trophy,
  award: Award,
  trendingUp: TrendingUp,
  home: Home,
  zap: Zap,
  medal: Medal,
  users: Users,
  flame: Flame,
  barChart: BarChart,
  star: Star,
  crosshair: Crosshair,
  dollarSign: DollarSign,
  mapPin: MapPin,
  piggyBank: PiggyBank
};

/**
 * Master list of objective templates
 * Each objective has:
 * - id: unique identifier
 * - title: display name
 * - description: what the objective entails
 * - weight: importance for board score (0-100, total must be 100)
 * - icon: Lucide icon component
 * - isMandatory: if true, always included
 * - calculateProgress: function to determine completion %
 * - calculateStatus: function to determine current status
 */
const OBJECTIVE_TEMPLATES = [
  {
    id: 'playoffs',
    title: 'Qualify for Playoffs',
    description: 'Finish in the top 4 to qualify for playoffs',
    weight: 30, // 30% of board score
    icon: 'target',
    isMandatory: true,
    difficultyTier: 'hard',
    calculateProgress: (gameData) => {
      const { userPosition, played, totalMatches, stage } = gameData;

      if (userPosition <= 4 && played === totalMatches) return 100;
      if (userPosition > 4 && played === totalMatches) return 0;

      // During season, estimate based on trajectory
      const progressThroughSeason = (played / totalMatches) * 100;
      const positionScore = userPosition <= 4 ? 100 : Math.max(0, 100 - ((userPosition - 4) * 20));

      return Math.min(100, Math.round((progressThroughSeason + positionScore) / 2));
    },
    calculateStatus: (gameData) => {
      const { userPosition, played, totalMatches, stage } = gameData;

      if (stage === 'playoffs' && userPosition <= 4) return 'completed';
      if (stage === 'completed' && userPosition > 4) return 'failed';
      if (userPosition <= 4) return 'on_track';
      if (userPosition > 8) return 'at_risk';
      return 'in_progress';
    },
    getDetails: (gameData) => {
      const { userPosition, played, totalMatches, stage } = gameData;
      const remaining = totalMatches - played;

      if (played === 0) return 'Season not started';
      if (stage === 'completed') {
        return userPosition <= 4 ? 'Qualified for playoffs' : 'Failed to qualify';
      }
      if (stage === 'playoffs') return 'Playoffs in progress';

      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return `Currently ${getOrdinal(userPosition)} place, ${remaining} match${remaining !== 1 ? 'es' : ''} remaining`;
    }
  },

  {
    id: 'championship',
    title: 'Win the Championship',
    description: 'Win the World Premier League title',
    weight: 25, // 25% of board score
    icon: 'trophy',
    isMandatory: false,
    difficultyTier: 'hard',
    calculateProgress: (gameData) => {
      const { userPosition, stage, champion, userTeamId } = gameData;

      if (champion?.id === userTeamId) return 100;
      if (stage === 'completed') return 0;
      if (stage === 'playoffs') {
        if (userPosition <= 4) return 50;
        return 0;
      }
      if (stage === 'league') {
        if (userPosition <= 2) return 40;
        if (userPosition <= 4) return 30;
        if (userPosition <= 6) return 20;
        return 10;
      }
      return 0;
    },
    calculateStatus: (gameData) => {
      const { userPosition, stage, champion, userTeamId } = gameData;

      if (champion?.id === userTeamId) return 'completed';
      if (stage === 'completed') return 'failed';
      if (stage === 'playoffs' && userPosition <= 4) return 'in_progress';
      if (stage === 'league' && userPosition <= 4) return 'on_track';
      return 'pending';
    },
    getDetails: (gameData) => {
      const { userPosition, stage, champion, userTeamId } = gameData;

      if (champion?.id === userTeamId) return 'Champions! 🏆';
      if (stage === 'completed') return 'Season completed';
      if (stage === 'playoffs') return 'Competing for the title';
      if (userPosition <= 4) return 'On track for playoffs';
      return 'Need to improve league position';
    }
  },

  {
    id: 'top_2',
    title: 'Finish in Top 2',
    description: 'Secure a top 2 finish in the league stage',
    weight: 12,
    icon: 'award',
    isMandatory: false,
    difficultyTier: 'hard',
    calculateProgress: (gameData) => {
      const { userPosition, played, totalMatches } = gameData;

      if (userPosition <= 2 && played === totalMatches) return 100;
      if (userPosition > 2 && played === totalMatches) return 0;

      const progressThroughSeason = (played / totalMatches) * 100;
      const positionScore = userPosition <= 2 ? 100 : Math.max(0, 100 - ((userPosition - 2) * 25));

      return Math.min(100, Math.round((progressThroughSeason + positionScore) / 2));
    },
    calculateStatus: (gameData) => {
      const { userPosition, played, totalMatches } = gameData;

      if (userPosition <= 2 && played === totalMatches) return 'completed';
      if (userPosition > 2 && played === totalMatches) return 'failed';
      if (userPosition <= 2) return 'on_track';
      if (userPosition <= 4) return 'in_progress';
      return 'at_risk';
    },
    getDetails: (gameData) => {
      const { userPosition } = gameData;

      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return `Currently ${getOrdinal(userPosition)} place`;
    }
  },

  {
    id: 'positive_nrr',
    title: 'Achieve Positive NRR',
    description: 'Maintain a positive net run rate throughout the season',
    weight: 10,
    icon: 'trendingUp',
    isMandatory: false,
    difficultyTier: 'easy',
    calculateProgress: (gameData) => {
      const { userStanding } = gameData;
      const nrr = userStanding?.nrr || 0;

      if (nrr > 0) return 100;
      if (nrr === 0) return 50;
      return Math.max(0, 50 + (nrr * 10)); // Scale negative NRR
    },
    calculateStatus: (gameData) => {
      const { userStanding } = gameData;
      const nrr = userStanding?.nrr || 0;

      if (nrr > 0.5) return 'completed';
      if (nrr > 0) return 'on_track';
      if (nrr > -0.5) return 'in_progress';
      return 'at_risk';
    },
    getDetails: (gameData) => {
      const { userStanding } = gameData;
      const nrr = userStanding?.nrr || 0;

      return `Current NRR: ${nrr.toFixed(3)}`;
    }
  },

  {
    id: 'home_wins',
    title: 'Win 7+ Home Matches',
    description: 'Dominate at your home ground',
    weight: 8,
    icon: 'home',
    isMandatory: false,
    difficultyTier: 'medium',
    calculateProgress: (gameData) => {
      const { homeWins = 0 } = gameData;
      const target = 7;

      return Math.min(100, Math.round((homeWins / target) * 100));
    },
    calculateStatus: (gameData) => {
      const { homeWins = 0, homeMatchesPlayed = 0 } = gameData;
      const target = 7;
      const totalHomeMatches = 9; // Half of 18 matches
      const remaining = totalHomeMatches - homeMatchesPlayed;

      if (homeWins >= target) return 'completed';
      if (homeWins + remaining >= target) return 'on_track';
      return 'at_risk';
    },
    getDetails: (gameData) => {
      const { homeWins = 0, homeMatchesPlayed = 0 } = gameData;
      const totalHomeMatches = 9;

      return `${homeWins} wins from ${homeMatchesPlayed} home matches`;
    }
  },

  {
    id: 'first_3_wins',
    title: 'Win First 3 Matches',
    description: 'Start the season strong with 3 consecutive wins',
    weight: 10,
    icon: 'zap',
    isMandatory: false,
    difficultyTier: 'easy',
    calculateProgress: (gameData) => {
      const { winsInFirst3 = 0 } = gameData;

      return Math.round((winsInFirst3 / 3) * 100);
    },
    calculateStatus: (gameData) => {
      const { winsInFirst3 = 0, played = 0 } = gameData;

      if (winsInFirst3 >= 3) return 'completed';
      if (played < 3 && winsInFirst3 === played) return 'on_track';
      if (played >= 3) return 'failed';
      return 'at_risk';
    },
    getDetails: (gameData) => {
      const { winsInFirst3 = 0, played = 0 } = gameData;

      if (played === 0) return 'Season not started';
      if (played >= 3) {
        return winsInFirst3 === 3 ? 'Perfect start!' : `Won ${winsInFirst3} of first 3`;
      }
      return `${winsInFirst3} wins from ${played} matches so far`;
    }
  },

  {
    id: 'best_batsman',
    title: 'Player Wins Best Batsman Award',
    description: 'Have a player from your squad finish as the league\'s top run scorer',
    weight: 12,
    icon: 'star',
    isMandatory: false,
    difficultyTier: 'hard',
    calculateProgress: (gameData) => {
      const { userBestBatsmanRank = null, userBestBatsmanRuns = 0, topScorerRuns = 1 } = gameData;

      if (userBestBatsmanRank === 1) return 100;
      if (userBestBatsmanRank === 2) return 75;
      if (userBestBatsmanRank === 3) return 50;
      if (userBestBatsmanRank && userBestBatsmanRank <= 5) return 25;

      // If no rank yet, estimate based on runs vs top scorer
      if (topScorerRuns > 0 && userBestBatsmanRuns > 0) {
        return Math.min(100, Math.round((userBestBatsmanRuns / topScorerRuns) * 100));
      }

      return 0;
    },
    calculateStatus: (gameData) => {
      const { userBestBatsmanRank = null, played = 0 } = gameData;

      if (userBestBatsmanRank === 1) return 'completed';
      if (userBestBatsmanRank && userBestBatsmanRank <= 3) return 'on_track';
      if (userBestBatsmanRank && userBestBatsmanRank <= 5) return 'in_progress';
      if (played === 0) return 'pending';
      return 'at_risk';
    },
    getDetails: (gameData) => {
      const { userBestBatsmanName = 'No player', userBestBatsmanRank = null, userBestBatsmanRuns = 0, played = 0 } = gameData;

      if (played === 0) return 'Season not started';
      if (userBestBatsmanRank === 1) return `${userBestBatsmanName} leads with ${userBestBatsmanRuns} runs!`;
      if (userBestBatsmanRank) return `${userBestBatsmanName}: #${userBestBatsmanRank} with ${userBestBatsmanRuns} runs`;
      return `Best: ${userBestBatsmanName} with ${userBestBatsmanRuns} runs`;
    }
  },

  {
    id: 'best_bowler',
    title: 'Player Wins Best Bowler Award',
    description: 'Have a player from your squad finish as the league\'s top wicket taker',
    weight: 12,
    icon: 'crosshair',
    isMandatory: false,
    difficultyTier: 'hard',
    calculateProgress: (gameData) => {
      const { userBestBowlerRank = null, userBestBowlerWickets = 0, topBowlerWickets = 1 } = gameData;

      if (userBestBowlerRank === 1) return 100;
      if (userBestBowlerRank === 2) return 75;
      if (userBestBowlerRank === 3) return 50;
      if (userBestBowlerRank && userBestBowlerRank <= 5) return 25;

      // If no rank yet, estimate based on wickets vs top bowler
      if (topBowlerWickets > 0 && userBestBowlerWickets > 0) {
        return Math.min(100, Math.round((userBestBowlerWickets / topBowlerWickets) * 100));
      }

      return 0;
    },
    calculateStatus: (gameData) => {
      const { userBestBowlerRank = null, played = 0 } = gameData;

      if (userBestBowlerRank === 1) return 'completed';
      if (userBestBowlerRank && userBestBowlerRank <= 3) return 'on_track';
      if (userBestBowlerRank && userBestBowlerRank <= 5) return 'in_progress';
      if (played === 0) return 'pending';
      return 'at_risk';
    },
    getDetails: (gameData) => {
      const { userBestBowlerName = 'No player', userBestBowlerRank = null, userBestBowlerWickets = 0, played = 0 } = gameData;

      if (played === 0) return 'Season not started';
      if (userBestBowlerRank === 1) return `${userBestBowlerName} leads with ${userBestBowlerWickets} wickets!`;
      if (userBestBowlerRank) return `${userBestBowlerName}: #${userBestBowlerRank} with ${userBestBowlerWickets} wickets`;
      return `Best: ${userBestBowlerName} with ${userBestBowlerWickets} wickets`;
    }
  },

  {
    id: 'beat_rival',
    title: 'Beat Your Rival',
    description: 'Defeat your designated rival team in both encounters',
    weight: 8,
    icon: 'users',
    isMandatory: false,
    difficultyTier: 'medium',
    calculateProgress: (gameData) => {
      const { rivalWins = 0, rivalMatchesPlayed = 0 } = gameData;
      const target = 2;

      if (rivalMatchesPlayed === 0) return 0;
      return Math.round((rivalWins / target) * 100);
    },
    calculateStatus: (gameData) => {
      const { rivalWins = 0, rivalMatchesPlayed = 0 } = gameData;
      const target = 2;

      if (rivalWins >= target) return 'completed';
      if (rivalMatchesPlayed < 2) return 'in_progress';
      return 'failed';
    },
    getDetails: (gameData) => {
      const { rivalWins = 0, rivalMatchesPlayed = 0, rivalTeamName = 'rival' } = gameData;

      if (rivalMatchesPlayed === 0) return `Haven't faced ${rivalTeamName} yet`;
      return `${rivalWins} wins vs ${rivalTeamName} (${rivalMatchesPlayed} matches played)`;
    }
  },

  {
    id: 'win_streak',
    title: 'Win 4 Consecutive Matches',
    description: 'Build momentum with a 4-match winning streak',
    weight: 10,
    icon: 'flame',
    isMandatory: false,
    difficultyTier: 'medium',
    calculateProgress: (gameData) => {
      const { longestWinStreak = 0 } = gameData;
      const target = 4;

      return Math.min(100, Math.round((longestWinStreak / target) * 100));
    },
    calculateStatus: (gameData) => {
      const { longestWinStreak = 0, currentWinStreak = 0 } = gameData;
      const target = 4;

      if (longestWinStreak >= target) return 'completed';
      if (currentWinStreak >= 2) return 'on_track';
      if (currentWinStreak >= 1) return 'in_progress';
      return 'pending';
    },
    getDetails: (gameData) => {
      const { longestWinStreak = 0, currentWinStreak = 0 } = gameData;

      if (longestWinStreak >= 4) return `Achieved ${longestWinStreak} match streak`;
      if (currentWinStreak > 0) return `Current streak: ${currentWinStreak} wins`;
      return 'No active win streak';
    }
  },

  {
    id: 'score_200',
    title: 'Score 200+ in a Match',
    description: 'Post a massive total of 200+ runs in a T20 match',
    weight: 8,
    icon: 'barChart',
    isMandatory: false,
    difficultyTier: 'easy',
    calculateProgress: (gameData) => {
      const { highestScore = 0 } = gameData;
      const target = 200;

      if (highestScore >= target) return 100;
      return Math.min(100, Math.round((highestScore / target) * 100));
    },
    calculateStatus: (gameData) => {
      const { highestScore = 0 } = gameData;
      const target = 200;

      if (highestScore >= target) return 'completed';
      if (highestScore >= 190) return 'on_track';
      if (highestScore >= 180) return 'in_progress';
      return 'pending';
    },
    getDetails: (gameData) => {
      const { highestScore = 0 } = gameData;

      if (highestScore >= 200) return `Highest score: ${highestScore}`;
      if (highestScore > 0) return `Best so far: ${highestScore} runs`;
      return 'No matches played yet';
    }
  },

  {
    id: 'keep_under_cap',
    title: 'Stay Under Budget',
    description: 'Keep total squad salary at or below 80% of the cap at season end',
    weight: 8,
    icon: 'piggyBank',
    isMandatory: false,
    difficultyTier: 'easy',
    calculateProgress: (gameData) => {
      const { squadSalaryRatio = null } = gameData;
      if (squadSalaryRatio === null) return 50; // Unknown — in progress
      if (squadSalaryRatio <= 0.8) return 100;
      if (squadSalaryRatio <= 0.9) return 70;
      if (squadSalaryRatio <= 1.0) return 40;
      return 0;
    },
    calculateStatus: (gameData) => {
      const { squadSalaryRatio = null } = gameData;
      if (squadSalaryRatio === null) return 'pending';
      if (squadSalaryRatio <= 0.8) return 'on_track';
      if (squadSalaryRatio <= 1.0) return 'in_progress';
      return 'at_risk';
    },
    getDetails: (gameData) => {
      const { squadSalaryRatio = null } = gameData;
      if (squadSalaryRatio === null) return 'Season not started';
      const pct = Math.round(squadSalaryRatio * 100);
      return `Squad salary at ${pct}% of cap (target: ≤80%)`;
    }
  },

  {
    id: 'sell_for_profit',
    title: 'Sell High',
    description: 'Sell at least 1 player for more than their original auction price',
    weight: 10,
    icon: 'dollarSign',
    isMandatory: false,
    difficultyTier: 'medium',
    calculateProgress: (gameData) => {
      const { transferSellProfit = 0 } = gameData;
      if (transferSellProfit > 0) return 100;
      return 0;
    },
    calculateStatus: (gameData) => {
      const { transferSellProfit = 0 } = gameData;
      if (transferSellProfit > 0) return 'completed';
      return 'pending';
    },
    getDetails: (gameData) => {
      const { transferSellProfit = 0 } = gameData;
      if (transferSellProfit > 0) {
        return `Sold a player for $${(transferSellProfit / 1000000).toFixed(2)}M profit!`;
      }
      return 'Sell a player above their auction price during the transfer window';
    }
  },

  {
    id: 'sign_from_region',
    title: 'Regional Scout',
    description: 'Sign a player from a designated region during the transfer window',
    weight: 10,
    icon: 'mapPin',
    isMandatory: false,
    difficultyTier: 'medium',
    calculateProgress: (gameData) => {
      const { signedFromRegion = false } = gameData;
      return signedFromRegion ? 100 : 0;
    },
    calculateStatus: (gameData) => {
      const { signedFromRegion = false } = gameData;
      return signedFromRegion ? 'completed' : 'pending';
    },
    getDetails: (gameData) => {
      const { signedFromRegion = false, signedRegionTarget = null } = gameData;
      const regionLabel = signedRegionTarget ? REGION_LABELS[signedRegionTarget] || signedRegionTarget : 'a target region';
      if (signedFromRegion) return `Signed an ${regionLabel} player!`;
      return `Sign a player from ${regionLabel} during the transfer window`;
    }
  }
];

/**
 * Generate objectives for a new season
 * @param {number} season - Season number
 * @param {string} rivalTeamName - Name of the designated rival team
 * @param {string} signedRegionTarget - Region code for sign_from_region objective (AU/ENG/IND/SA/WI)
 * @returns {Array} Array of 5 selected objectives (1 mandatory + 1 hard + 2 medium + 1 easy)
 */
export function generateSeasonObjectives(season, rivalTeamName = 'Sydney Sharks', signedRegionTarget = null) {
  // Always include the mandatory objective (playoffs)
  const mandatory = OBJECTIVE_TEMPLATES.find(obj => obj.isMandatory);

  // Get all non-mandatory objectives grouped by tier
  const optional = OBJECTIVE_TEMPLATES.filter(obj => !obj.isMandatory);
  const hardPool = optional.filter(obj => obj.difficultyTier === 'hard');
  const mediumPool = optional.filter(obj => obj.difficultyTier === 'medium');
  const easyPool = optional.filter(obj => obj.difficultyTier === 'easy');

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  // Pick 1 hard + 2 medium + 1 easy
  const selectedHard = shuffle(hardPool).slice(0, 1);
  const selectedMedium = shuffle(mediumPool).slice(0, 2);
  const selectedEasy = shuffle(easyPool).slice(0, 1);

  const selected = [...selectedHard, ...selectedMedium, ...selectedEasy];

  // Assign a random region target at season start for sign_from_region
  const regions = ['AU', 'ENG', 'IND', 'SA', 'WI'];
  const regionTarget = signedRegionTarget || regions[Math.floor(Math.random() * regions.length)];

  // Combine mandatory + selected objectives
  const objectives = [mandatory, ...selected].map(template => ({
    ...template,
    season,
    rivalTeamName, // Store rival name for beat_rival objective
    signedRegionTarget: template.id === 'sign_from_region' ? regionTarget : undefined,
    progress: 0,
    status: 'pending',
    details: template.getDetails({
      userPosition: 10,
      played: 0,
      totalMatches: 18,
      stage: 'league',
      userStanding: { nrr: 0 },
      signedRegionTarget: regionTarget
    })
  }));

  return objectives;
}

/**
 * Calculate overall board score based on weighted objectives
 * @param {Array} objectives - Array of objective objects with progress
 * @returns {number} Board score (0-100)
 */
export function calculateBoardScore(objectives) {
  if (!objectives || objectives.length === 0) return 0;

  let totalScore = 0;

  objectives.forEach(obj => {
    const template = OBJECTIVE_TEMPLATES.find(t => t.id === obj.id);
    if (template) {
      const weightedProgress = (obj.progress * template.weight) / 100;
      totalScore += weightedProgress;
    }
  });

  return Math.round(totalScore);
}

/**
 * Update objective progress and status
 * @param {Object} objective - Objective to update
 * @param {Object} gameData - Current game state data
 * @returns {Object} Updated objective
 */
export function updateObjective(objective, gameData) {
  const template = OBJECTIVE_TEMPLATES.find(t => t.id === objective.id);

  if (!template) return objective;

  // Add rival team name to gameData if it's the beat_rival objective
  if (objective.id === 'beat_rival') {
    gameData.rivalTeamName = objective.rivalTeamName;
  }

  return {
    ...objective,
    progress: template.calculateProgress(gameData),
    status: template.calculateStatus(gameData),
    details: template.getDetails(gameData)
  };
}

/**
 * Update all objectives with current game state
 * @param {Array} objectives - Array of objectives
 * @param {Object} gameData - Current game state data
 * @returns {Array} Updated objectives
 */
export function updateAllObjectives(objectives, gameData) {
  return objectives.map(obj => updateObjective(obj, gameData));
}

export default {
  generateSeasonObjectives,
  calculateBoardScore,
  updateObjective,
  updateAllObjectives,
  OBJECTIVE_TEMPLATES
};
