/**
 * @file tutorialSteps.js
 * @description Onboarding walkthrough steps configuration
 */

import { Play, LayoutGrid, Mail, Calendar, Save, PartyPopper } from 'lucide-react';

/**
 * Initial onboarding steps (6 total)
 * Shown after team selection for new games
 */
export const onboardingSteps = [
  {
    id: 'continue-button',
    targetSelector: '.continue-button',
    title: 'Advance Time',
    description: 'This is your main control. Click to advance the game day by day, trigger matches, and progress through the season.',
    icon: Play,
    position: 'bottom'
  },
  {
    id: 'sidebar-nav',
    targetSelector: '.sidebar-nav',
    title: 'Navigation',
    description: 'Use the sidebar to switch between screens: Home, Squad, Tactics, League, and more.',
    icon: LayoutGrid,
    position: 'right'
  },
  {
    id: 'inbox-badge',
    targetSelector: '.inbox-link',
    title: 'Inbox',
    description: 'Important messages appear here - match results, board communications, and tips. Check it regularly!',
    icon: Mail,
    position: 'bottom'
  },
  {
    id: 'calendar-display',
    targetSelector: '.calendar-display',
    title: 'Season Calendar',
    description: 'Track your progress through the season. Shows current day, week, and upcoming events like matches.',
    icon: Calendar,
    position: 'bottom'
  },
  {
    id: 'save-button',
    targetSelector: '.save-button',
    title: 'Save Your Game',
    description: 'Saves download as a file to your device. To load, use "Load Game" from the main menu. Tip: Enable "Ask where to save" in browser settings to choose your save location.',
    icon: Save,
    position: 'bottom'
  },
  {
    id: 'ready-to-play',
    targetSelector: null, // Centered modal, no target
    title: 'Ready to Play!',
    description: "You're all set! Check your Tactics to set up your team before your first match. Good luck!",
    icon: PartyPopper,
    position: 'center'
  }
];

export default onboardingSteps;
