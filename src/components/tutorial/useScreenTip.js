/**
 * @file useScreenTip.js
 * @description Hook for managing contextual screen tips
 */

import useGameStore from '../../stores/gameStore';

/**
 * Hook to check if a screen tip should be shown and handle dismissal
 * @param {string} screenId - The screen identifier
 * @returns {{ shouldShow: boolean, dismiss: () => void }}
 */
const useScreenTip = (screenId) => {
  const {
    tutorialProgress,
    settings,
    markScreenVisited
  } = useGameStore();

  const { visitedScreens, dismissedTips, onboardingComplete } = tutorialProgress;
  const { tutorialEnabled } = settings;

  // Show tip if:
  // - Tutorial is enabled
  // - Onboarding is complete (don't show during onboarding)
  // - Screen hasn't been visited before
  // - Tip hasn't been permanently dismissed
  const shouldShow = tutorialEnabled &&
                     onboardingComplete &&
                     !visitedScreens.includes(screenId) &&
                     !dismissedTips.includes(screenId);

  const dismiss = () => {
    markScreenVisited(screenId);
  };

  return { shouldShow, dismiss };
};

export default useScreenTip;
