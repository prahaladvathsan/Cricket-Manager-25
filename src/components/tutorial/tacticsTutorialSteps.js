/**
 * @file tacticsTutorialSteps.js
 * @description Tutorial steps specifically for the Tactics page
 * Walks users through each tab and explains key controls
 * Each step can specify a 'tab' property to auto-switch to that tab
 */

import {
  Eye,
  Users,
  UserPlus,
  Sparkles,
  Target,
  GripVertical,
  Zap,
  Activity,
  ListOrdered,
  Settings2,
  Shield,
  LayoutTemplate,
  Move,
  UserCheck,
  CheckCircle
} from 'lucide-react';

/**
 * Tactics page tutorial steps (17 total)
 * Shown when user first visits the Tactics page
 *
 * Each step can have:
 * - tab: The tab to switch to when this step is shown (overview, squad, batting, bowling, fielding)
 * - targetSelector: CSS selector to highlight (null for centered modal)
 */
export const tacticsTutorialSteps = [
  // ===== INTRODUCTION (1 step) =====
  {
    id: 'tactics-tabs',
    tab: 'overview',
    targetSelector: '.tactics-tab-nav',
    title: 'Tactics Navigation',
    description: 'The Tactics page has 5 tabs. We\'ll walk through each one to set up your match strategy. Use these tabs anytime to adjust your team.',
    icon: Eye,
    position: 'bottom'
  },

  // ===== OVERVIEW TAB (1 step) =====
  {
    id: 'tactics-overview',
    tab: 'overview',
    targetSelector: '.tactics-tab-overview',
    title: 'Overview Tab',
    description: 'See your complete tactical setup at a glance - batting order, bowling rotation, fielding positions, and role assignments (Captain, Vice-Captain, Wicket-keeper).',
    icon: Eye,
    position: 'bottom'
  },

  // ===== SQUAD & PLAYSTYLES TAB (3 steps) =====
  {
    id: 'tactics-squad-intro',
    tab: 'squad',
    targetSelector: '.tactics-tab-squad',
    title: 'Playing XI & Playstyles',
    description: 'This tab is where you build your team. Select 11 players and configure their playstyles. Let\'s take a closer look.',
    icon: Users,
    position: 'bottom'
  },
  {
    id: 'tactics-squad-selection',
    tab: 'squad',
    targetSelector: '.squad-add-player-btn',
    title: 'Squad Selection',
    description: 'Click the + button to add players from your available squad (left) to your Playing XI (right). You need exactly 11 players including at least 1 wicket-keeper and 5 bowling options.',
    icon: UserPlus,
    position: 'left'
  },
  {
    id: 'tactics-squad-playstyles',
    tab: 'squad',
    targetSelector: '.squad-playstyle-selectors',
    title: 'Playstyle Configuration',
    description: 'Set batting and bowling playstyles using these dropdowns. The star (⭐) marks the natural playstyle - using it gives best results. You can override for tactical variety, but ratings will be lower.',
    icon: Sparkles,
    position: 'top'
  },

  // ===== BATTING ORDER TAB (3 steps) =====
  {
    id: 'tactics-batting-intro',
    tab: 'batting',
    targetSelector: '.tactics-tab-batting',
    title: 'Batting Order',
    description: 'Set your batting lineup and how aggressively each player should bat. This directly impacts your scoring rate and wicket risk.',
    icon: Target,
    position: 'bottom'
  },
  {
    id: 'tactics-batting-order',
    tab: 'batting',
    targetSelector: '.batting-order-row-first',
    title: 'Setting Batting Order',
    description: 'Drag players using the grip handle to reorder. Match playstyles to positions - put "Opener" playstyles at 1-2, "Middle Order" at 5-6, etc. The position labels (Opener, Top, Middle, Lower, Tail) show recommended placements.',
    icon: GripVertical,
    position: 'bottom'
  },
  {
    id: 'tactics-batting-acceleration',
    tab: 'batting',
    targetSelector: '.batting-tier-select',
    title: 'Acceleration Tiers',
    description: 'Set each batter\'s aggression: Blockade (safest) → Build → Rotate → Cruise → Blitz (most aggressive). Higher tiers score faster but risk more wickets. Tail-enders should usually be on Blitz.',
    icon: Zap,
    position: 'top'
  },

  // ===== BOWLING PLANS TAB (3 steps) =====
  {
    id: 'tactics-bowling-intro',
    tab: 'bowling',
    targetSelector: '.tactics-tab-bowling',
    title: 'Bowling Plans',
    description: 'Assign bowlers to overs and set their bowling strategies. Good bowling rotation is key to restricting opposition scoring.',
    icon: Activity,
    position: 'bottom'
  },
  {
    id: 'tactics-bowling-overs',
    tab: 'bowling',
    targetSelector: '.bowling-over-assignment',
    title: 'Over Assignments',
    description: 'Assign a bowler to each of the 20 overs using the dropdowns. Each bowler can bowl maximum 4 overs. Overs are grouped by phase: Powerplay (1-6), Early Middle (7-12), Late Middle (13-16), Death (17-20). Use "Auto Assign" for a quick setup.',
    icon: ListOrdered,
    position: 'bottom'
  },
  {
    id: 'tactics-bowling-plans',
    tab: 'bowling',
    targetSelector: '.bowling-plans-first',
    title: 'Bowling Plans',
    description: 'Set Line & Length (e.g., Yorker Attack, Good Length) and Variation plans for each bowler. Plans with a star (⭐) boost that bowler\'s primary playstyle. Pace and spin bowlers have different plan options.',
    icon: Settings2,
    position: 'left'
  },

  // ===== FIELDING TAB (4 steps) =====
  {
    id: 'tactics-fielding-intro',
    tab: 'fielding',
    targetSelector: '.tactics-tab-fielding',
    title: 'Fielding Setup',
    description: 'Configure your fielding formations. You set separate formations for Powerplay (overs 1-6, max 2 outside circle) and Normal play (overs 7-20, max 5 outside circle).',
    icon: Shield,
    position: 'bottom'
  },
  {
    id: 'tactics-fielding-templates',
    tab: 'fielding',
    targetSelector: '.fielding-template-selector',
    title: 'Formation Templates',
    description: 'Choose from preset templates like "Attacking Press", "Defensive Ring", or "Slip Cordon". Each template is optimized for different situations - attacking to take wickets, or defensive to save runs.',
    icon: LayoutTemplate,
    position: 'top'
  },
  {
    id: 'tactics-fielding-customize',
    tab: 'fielding',
    targetSelector: '.fielding-visual-editor',
    title: 'Customizing Positions',
    description: 'Click "Customize" to open the field editor and drag fielders to custom positions. The inner circle (30-yard) is shown - during Powerplay, only 2 fielders can be outside it. The editor validates T20 rules automatically.',
    icon: Move,
    position: 'top'
  },
  {
    id: 'tactics-fielding-assignment',
    tab: 'fielding',
    targetSelector: '.fielding-player-assignments',
    title: 'Player Assignments',
    description: 'Assign specific players to fielding positions based on their skills. Your best catchers should be in catching positions (slips, gully). Athletic fielders go to the boundary. Wicketkeeper is assigned separately.',
    icon: UserCheck,
    position: 'left'
  },

  // ===== COMPLETION (2 steps) =====
  {
    id: 'tactics-validate',
    tab: 'overview',
    targetSelector: '.tactics-validate-btn',
    title: 'Validate Tactics',
    description: 'Click "Validate Tactics" to check for errors: missing wicket-keeper, not enough bowlers, injured players, etc. Fix any issues before your match!',
    icon: CheckCircle,
    position: 'top'
  },
  {
    id: 'tactics-ready',
    tab: null, // Stay on current tab
    targetSelector: null,
    title: 'Tactics Complete!',
    description: 'Your tactics are auto-saved. Changes take effect in your next match. You can adjust tactics anytime between matches. Good luck, Manager!',
    icon: CheckCircle,
    position: 'center'
  }
];

export default tacticsTutorialSteps;
