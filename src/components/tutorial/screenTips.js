/**
 * @file screenTips.js
 * @description Per-screen contextual tips shown on first visit
 */

import {
  Home,
  Users,
  Trophy,
  ArrowLeftRight,
  Gamepad2,
  Calendar
} from 'lucide-react';

/**
 * Contextual tips for each main screen
 * Shown first time user visits the screen
 */
export const screenTips = {
  home: {
    id: 'home',
    title: 'Your Dashboard',
    icon: Home,
    tips: [
      'Track your team status, fixtures, and standings at a glance',
      'View your board objectives and current progress',
      'Check upcoming matches and recent results'
    ]
  },
  squad: {
    id: 'squad',
    title: 'Squad Management',
    icon: Users,
    tips: [
      'View all 25 players in your squad',
      'Check player fitness, form, and injury status',
      'Click any player to see detailed stats and playstyle ratings'
    ]
  },
  // Note: Tactics has its own dedicated tutorial walkthrough (tacticsTutorialSteps.js)
  league: {
    id: 'league',
    title: 'League Table',
    icon: Trophy,
    tips: [
      'Track WPL standings - Top 4 teams make playoffs',
      'Net Run Rate (NRR) is the tiebreaker for equal points',
      'View fixtures and results for all 90 league matches'
    ]
  },
  transfers: {
    id: 'transfers',
    title: 'Transfer Market',
    icon: ArrowLeftRight,
    tips: [
      'Buy and sell players during the transfer window',
      'Your budget is shown at the top',
      'Auction happens at season start (odd seasons only)'
    ]
  },
  match: {
    id: 'match',
    title: 'Match Day',
    icon: Gamepad2,
    tips: [
      'Left panel: Control batting acceleration and bowling tactics',
      'Center: Watch the live 2D visualization',
      'Right panel: View scorecard, partnerships, and statistics'
    ]
  },
  calendar: {
    id: 'calendar',
    title: 'Season Calendar',
    icon: Calendar,
    tips: [
      'View all fixtures and events for the season',
      'Hover over any future date and click "Sim to Date" to fast-forward',
      'AI will handle your matches and all league events automatically'
    ]
  }
};

export default screenTips;
