/**
 * @file useTacticsTutorial.js
 * @description Hook for managing the Tactics page tutorial walkthrough
 */

import { useState, useCallback, useEffect } from 'react';
import useGameStore from '../../stores/gameStore';
import { tacticsTutorialSteps } from './tacticsTutorialSteps';

/**
 * Hook to manage tactics tutorial state
 * @param {Function} setActiveTab - Function to switch tabs in TacticsPage
 * @returns {{
 *   shouldShowTutorial: boolean,
 *   currentStep: number,
 *   advance: () => void,
 *   skip: () => void,
 *   totalSteps: number
 * }}
 */
const useTacticsTutorial = (setActiveTab) => {
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

  // Total steps in the tactics tutorial
  const totalSteps = tacticsTutorialSteps.length;

  // Show tutorial if:
  // - Tutorial is enabled globally
  // - Main onboarding is complete (don't interrupt main flow)
  // - Tactics screen hasn't been visited/tutorial completed
  // - Not dismissed this session
  const shouldShowTutorial = tutorialEnabled &&
                              onboardingComplete &&
                              !visitedScreens.includes('tactics-tutorial') &&
                              !dismissed;

  // Auto-switch to the correct tab when step changes
  useEffect(() => {
    if (shouldShowTutorial && setActiveTab) {
      const step = tacticsTutorialSteps[currentStep];
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
      markScreenVisited('tactics-tutorial');
      setDismissed(true);
    }
  }, [currentStep, totalSteps, markScreenVisited]);

  // Skip entire tutorial
  const skip = useCallback(() => {
    markScreenVisited('tactics-tutorial');
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

export default useTacticsTutorial;
