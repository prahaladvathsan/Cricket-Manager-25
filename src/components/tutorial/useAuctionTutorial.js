/**
 * @file useAuctionTutorial.js
 * @description Hook for managing the Auction tutorial walkthrough
 * Triggered when auction starts (auctionState changes to 'in_progress')
 */

import { useState, useCallback, useEffect } from 'react';
import useGameStore from '../../stores/gameStore';
import { auctionTutorialSteps } from './auctionTutorialSteps';

/**
 * Hook to manage auction tutorial state
 * @param {string} auctionState - Current auction state ('not_started', 'in_progress', 'completed')
 * @param {Function} setActiveTab - Function to switch tabs in Transfers page
 * @returns {{
 *   shouldShowTutorial: boolean,
 *   currentStep: number,
 *   advance: () => void,
 *   skip: () => void,
 *   totalSteps: number
 * }}
 */
const useAuctionTutorial = (auctionState, setActiveTab) => {
  const {
    tutorialProgress,
    settings,
    markScreenVisited
  } = useGameStore();

  const { visitedScreens, onboardingComplete } = tutorialProgress;
  const { tutorialEnabled } = settings;

  // Local state for tutorial step within this session
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [started, setStarted] = useState(false);

  // Total steps in the auction tutorial
  const totalSteps = auctionTutorialSteps.length;

  // Show tutorial if:
  // - Tutorial is enabled globally
  // - Main onboarding is complete (don't interrupt main flow)
  // - Auction tutorial hasn't been completed
  // - Not dismissed this session
  // - Auction has started (is in_progress)
  // - Tutorial has been started (triggered by auction starting)
  const shouldShowTutorial = tutorialEnabled &&
                              onboardingComplete &&
                              !visitedScreens.includes('auction-tutorial') &&
                              !dismissed &&
                              auctionState === 'in_progress' &&
                              started;

  // Trigger tutorial when auction starts
  useEffect(() => {
    if (auctionState === 'in_progress' &&
        tutorialEnabled &&
        onboardingComplete &&
        !visitedScreens.includes('auction-tutorial') &&
        !started) {
      setStarted(true);
    }
  }, [auctionState, tutorialEnabled, onboardingComplete, visitedScreens, started]);

  // Auto-switch to the correct tab when step changes
  useEffect(() => {
    if (shouldShowTutorial && setActiveTab) {
      const step = auctionTutorialSteps[currentStep];
      if (step?.tab) {
        setActiveTab(step.tab);
      }
    }
  }, [currentStep, shouldShowTutorial, setActiveTab]);

  // Advance to next step
  const advance = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial complete - mark as visited
      markScreenVisited('auction-tutorial');
      setDismissed(true);
    }
  }, [currentStep, totalSteps, markScreenVisited]);

  // Skip entire tutorial
  const skip = useCallback(() => {
    markScreenVisited('auction-tutorial');
    setDismissed(true);
  }, [markScreenVisited]);

  return {
    shouldShowTutorial,
    currentStep,
    advance,
    skip,
    totalSteps
  };
};

export default useAuctionTutorial;
