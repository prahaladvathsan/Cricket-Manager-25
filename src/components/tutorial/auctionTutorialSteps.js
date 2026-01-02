/**
 * @file auctionTutorialSteps.js
 * @description Tutorial steps for the Auction system
 * Walks users through the auction flow from start to completion
 * Steps are triggered when auction state changes to 'in_progress'
 */

import {
  Play,
  DollarSign,
  Gavel,
  List,
  Users,
  Target,
  Clock,
  FastForward,
  SkipForward,
  ChevronRight,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react';

/**
 * Auction tutorial steps (13 total)
 * Shown when auction begins (auctionState changes to 'in_progress')
 *
 * Each step can have:
 * - tab: The tab to switch to when this step is shown
 * - targetSelector: CSS selector to highlight (null for centered modal)
 */
export const auctionTutorialSteps = [
  // ===== INTRODUCTION (2 steps) =====
  {
    id: 'auction-welcome',
    tab: null,
    targetSelector: null,
    title: 'Welcome to the Auction!',
    description: 'The player auction is where you build your squad. All 10 teams will compete to sign players. You have a ₹10 Crore budget to build a 25-player squad. Let\'s walk through how it works.',
    icon: Gavel,
    position: 'center'
  },
  {
    id: 'auction-status-bar',
    tab: 'auction',
    targetSelector: '.auction-status-bar',
    title: 'Auction Status',
    description: 'This bar shows your current budget, squad size (0/25), the current auction round, and overall status. Keep an eye on your budget - once it\'s gone, you can\'t bid anymore!',
    icon: DollarSign,
    position: 'bottom'
  },

  // ===== TABS OVERVIEW (1 step) =====
  {
    id: 'auction-tabs',
    tab: 'auction',
    targetSelector: '.auction-tab-nav',
    title: 'Auction Tabs',
    description: 'Four tabs help you track the auction: "Live Auction" for bidding, "Rounds" to see the schedule, "Team Squads" to view all teams\' acquisitions, and "Auction Log" for complete history.',
    icon: List,
    position: 'bottom'
  },

  // ===== ROUNDS TAB (1 step) =====
  {
    id: 'auction-rounds',
    tab: 'rounds',
    targetSelector: '.auction-rounds-grid',
    title: 'Auction Rounds',
    description: 'Players are grouped into rounds by category: Marquee (elite players) first, then Wicket-Keepers, All-Rounders, Batsmen, and Bowlers in rotation. Unsold players get another chance at 50% base price.',
    icon: List,
    position: 'top'
  },

  // ===== PLAYER CARD (1 step) =====
  {
    id: 'auction-player-card',
    tab: 'auction',
    targetSelector: '.auction-player-card',
    title: 'Player Up for Auction',
    description: 'Each player\'s card shows their role, attributes, playstyles, and base price. Click on the card for detailed stats. Evaluate carefully before bidding - good players go fast!',
    icon: Users,
    position: 'right'
  },

  // ===== BIDDING AREA (4 steps) =====
  {
    id: 'auction-current-bid',
    tab: 'auction',
    targetSelector: '.auction-bid-display',
    title: 'Current Bid & Timer',
    description: 'The current bid amount and leading team are shown here. When the timer runs out without a new bid, the player is sold to the highest bidder. Watch the timer closely!',
    icon: Clock,
    position: 'left'
  },
  {
    id: 'auction-bid-button',
    tab: 'auction',
    targetSelector: '.auction-bid-controls',
    title: 'Placing Bids',
    description: 'Click "Bid" to place a bid at the next increment. You can also set a "Max Bid" and the system will auto-bid for you up to that amount. This is useful when you really want a player.',
    icon: Gavel,
    position: 'top'
  },
  {
    id: 'auction-auto-bid-toggle',
    tab: 'auction',
    targetSelector: '.auction-bid-controls',
    title: 'Auto-Bid Control',
    description: 'The Auto-Bid toggle controls AI bidding when you skip. When ON (green), AI bids for you during skips. When OFF (red), you must bid manually - skipping won\'t acquire players. Hover over the ? icon for details.',
    icon: Zap,
    position: 'top'
  },
  {
    id: 'auction-skip-controls',
    tab: 'auction',
    targetSelector: '.auction-skip-controls',
    title: 'Skip Controls',
    description: '"Skip Player" fast-forwards the current auction. "Skip Round" completes the entire round instantly. "Skip to End" finishes the whole auction. Your Auto-Bid setting determines if AI bids for you when skipping.',
    icon: FastForward,
    position: 'top'
  },

  // ===== TEAM SQUADS TAB (1 step) =====
  {
    id: 'auction-team-squads',
    tab: 'squads',
    targetSelector: '.auction-squads-list',
    title: 'Team Squads',
    description: 'Track what players each team has signed and their remaining budgets. This helps you plan - if a rival is running low on funds, they\'ll have to pass on expensive players!',
    icon: Users,
    position: 'top'
  },

  // ===== AUCTION LOG (1 step) =====
  {
    id: 'auction-log',
    tab: 'log',
    targetSelector: '.auction-log-list',
    title: 'Auction Log',
    description: 'The complete auction history - every bid, sale, and unsold player. Use this to track auction trends and see what prices players are going for.',
    icon: TrendingUp,
    position: 'top'
  },

  // ===== COMPLETION (2 steps) =====
  {
    id: 'auction-strategy',
    tab: 'auction',
    targetSelector: null,
    title: 'Auction Strategy Tips',
    description: 'Balance your spending across all rounds - don\'t blow your budget early. Target players that fit your team\'s playstyle. Sometimes it\'s smart to let a rival overpay and save for later rounds.',
    icon: Target,
    position: 'center'
  },
  {
    id: 'auction-ready',
    tab: null,
    targetSelector: null,
    title: 'Ready to Build Your Squad!',
    description: 'Once all players are auctioned, the league season begins! Good luck, Manager - may the best team win!',
    icon: Award,
    position: 'center'
  }
];

export default auctionTutorialSteps;
