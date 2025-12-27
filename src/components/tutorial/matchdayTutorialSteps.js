/**
 * @file matchdayTutorialSteps.js
 * @description Tutorial steps for the Matchday UI
 * Walks users through the live match interface
 * Steps are context-aware based on whether user is batting or bowling first
 */

import {
  Play,
  LayoutGrid,
  Zap,
  Target,
  Shield,
  Eye,
  BarChart3,
  Monitor,
  CheckCircle,
  Info
} from 'lucide-react';

/**
 * Universal intro steps - shown to all users regardless of batting/bowling
 */
export const universalIntroSteps = [
  {
    id: 'matchday-welcome',
    targetSelector: null,
    title: 'Welcome to Match Day!',
    description: "Your match is about to begin! This tutorial will walk you through the live match interface. You can control the pace and make tactical adjustments as the match progresses.",
    icon: Play,
    position: 'center'
  },
  {
    id: 'matchday-header',
    targetSelector: '.match-header-bar',
    title: 'Match Header',
    description: "The broadcast-style header shows both teams' scores, current batsmen (★ marks striker), bowler figures, current over balls, and run rate metrics (CRR/RRR).",
    icon: Monitor,
    position: 'bottom'
  },
  {
    id: 'matchday-modifier-panel',
    targetSelector: '.match-header-center',
    title: 'Modifier Breakdown',
    description: "Hover over the center of the header to see the Modifier Breakdown panel. This shows exactly how playstyles, tactics, matchups, conditions, and other factors are affecting the current batsman and bowler.",
    icon: Info,
    position: 'bottom'
  },
  {
    id: 'matchday-controls',
    targetSelector: '.match-controls',
    title: 'Play Controls',
    description: 'Use Play to start ball-by-ball simulation, Pause to stop and adjust tactics, and Skip for fast-forwarding (over, 5 overs, or entire innings).',
    icon: Play,
    position: 'left'
  },
  {
    id: 'matchday-three-columns',
    targetSelector: null,
    title: 'Three-Panel Layout',
    description: 'The match view has three sections: Tactics Hub (left) for in-match tactical changes, Pitch Visualization (center) for field view and ball trajectories, and Stats Hub (right) for scorecard and analytics.',
    icon: LayoutGrid,
    position: 'center'
  }
];

/**
 * Batting-first steps - shown when user's team bats first
 */
export const battingFirstSteps = [
  {
    id: 'matchday-batting-tactics',
    targetSelector: '.tactics-hub',
    title: 'Batting Tactics',
    description: 'When your team is batting, the Tactics Hub shows the Batting tab. This is where you control your approach to the innings.',
    icon: Target,
    position: 'right'
  },
  {
    id: 'matchday-acceleration',
    targetSelector: '.acceleration-panel',
    title: 'Acceleration Tiers',
    description: "Set each batsman's aggression level: Blockade (safest), Build, Rotate, Cruise, or Blitz (most aggressive). Higher tiers score faster but risk more wickets.",
    icon: Zap,
    position: 'right'
  },
  {
    id: 'matchday-pitch-batting',
    targetSelector: '.pitch-visualization',
    title: 'Pitch View',
    description: "Watch the ball trajectory and fielder positions. You'll see where shots are going and how close fielders are to taking catches or stopping boundaries.",
    icon: Eye,
    position: 'left'
  },
  {
    id: 'matchday-scorecard',
    targetSelector: '.stats-hub',
    title: 'Stats Hub',
    description: 'Click any tab to view: Scorecard (batting/bowling cards), Worm (run rate over time), Manhattan (runs per over), or Partnerships. Click the panel to expand for full details.',
    icon: BarChart3,
    position: 'left'
  }
];

/**
 * Bowling-first steps - shown when user's team bowls first
 */
export const bowlingFirstSteps = [
  {
    id: 'matchday-bowling-tactics',
    targetSelector: '.tactics-hub',
    title: 'Bowling & Fielding Tactics',
    description: 'When your team is bowling, you get two tabs: Bowling for plans and Fielding for formations. Switch between them to adjust your strategy.',
    icon: Target,
    position: 'right'
  },
  {
    id: 'matchday-bowling-plans',
    targetSelector: '.bowling-plans-panel',
    title: 'Bowling Plans',
    description: "Set each bowler's Line & Length (e.g., Yorker Attack, Short Pitch) and Variation plan. Stars indicate plans that boost the bowler's natural playstyle.",
    icon: Target,
    position: 'right'
  },
  {
    id: 'matchday-fielding-live',
    targetSelector: '.fielding-tactics-panel',
    title: 'Fielding Formations',
    description: 'Switch between preset formations during the match. Different formations work better for different situations - attacking to take wickets, or defensive to save runs.',
    icon: Shield,
    position: 'right'
  },
  {
    id: 'matchday-pitch-bowling',
    targetSelector: '.pitch-visualization',
    title: 'Pitch View',
    description: "The field shows your 11 fielders positioned around the pitch. You'll see ball trajectories and how close fielders get to taking catches or stopping runs.",
    icon: Eye,
    position: 'left'
  },
  {
    id: 'matchday-scorecard-bowling',
    targetSelector: '.stats-hub',
    title: 'Stats Hub',
    description: 'Track opposition batting and your bowling figures. Click any tab to view detailed stats and expand for full-screen analysis.',
    icon: BarChart3,
    position: 'left'
  }
];

/**
 * Completion step - shown at the end
 */
export const completionStep = {
  id: 'matchday-ready',
  targetSelector: null,
  title: 'Ready to Play!',
  description: "You now know the basics. Press Play to start the action, make tactical changes when paused, and enjoy the match! Good luck, Manager!",
  icon: CheckCircle,
  position: 'center'
};

/**
 * Get all steps based on whether user is batting or bowling first
 * @param {boolean} userBattingFirst - True if user's team bats first
 * @returns {Array} Array of tutorial steps in order
 */
export const getMatchdayTutorialSteps = (userBattingFirst) => {
  const contextSteps = userBattingFirst ? battingFirstSteps : bowlingFirstSteps;
  return [
    ...universalIntroSteps,
    ...contextSteps,
    completionStep
  ];
};

export default getMatchdayTutorialSteps;
