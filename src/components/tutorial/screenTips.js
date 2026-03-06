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
  Calendar,
  BarChart3,
  Shield
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
      'The auction happens at the start of odd-numbered seasons — bid on available players',
      'During the transfer window you can buy and sell players with other clubs',
      'Your budget and remaining squad slots are shown at the top'
    ]
  },
  transferWindow: {
    id: 'transferWindow',
    title: 'Transfer Window',
    icon: ArrowLeftRight,
    tips: [
      'Browse available players in the Transfer Market tab',
      'List your own players for sale from the My Listings tab — shows your full squad with stats',
      'Transfer window is open for 5 weeks — bids auto-complete on listing expiry'
    ]
  },
  retention: {
    id: 'retention',
    title: 'Retention Phase',
    icon: Shield,
    tips: [
      'Before the auction, you can retain key players from last season at a negotiated salary',
      'Each retained player counts against your salary cap — retain wisely to stay in budget',
      'Click a player to negotiate a salary — they may accept, counter, or decline',
      'Players you don\'t retain enter the auction pool where all teams can bid on them'
    ]
  },
  stats: {
    id: 'stats',
    title: 'Team Statistics',
    icon: BarChart3,
    tips: [
      'View your upcoming fixtures and match results',
      'Statistics tab shows season batting & bowling stats for your squad',
      'Analysis tab breaks down performance by phase, player, and bowling plan'
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
