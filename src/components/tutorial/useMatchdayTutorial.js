/**
 * @file useMatchdayTutorial.js
 * @description Hook for managing the Matchday tutorial walkthrough
 * Context-aware based on whether user is batting or bowling first
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import useGameStore from '../../stores/gameStore';
import useMatchStore from '../../stores/matchStore';
import useTeamStore from '../../stores/teamStore';
import { getMatchdayTutorialSteps } from './matchdayTutorialSteps';

/**
 * Hook to manage matchday tutorial state
 * @returns {{
 *   shouldShowTutorial: boolean,
 *   currentStep: number,
 *   currentStepData: Object,
 *   advance: () => void,
 *   skip: () => void,
 *   totalSteps: number,
 *   userBattingFirst: boolean
 * }}
 */
const useMatchdayTutorial = () => {
  const {
    tutorialProgress,
    settings,
    markScreenVisited
  } = useGameStore();

  const { visitedScreens, onboardingComplete } = tutorialProgress;
  const { tutorialEnabled } = settings;

  // Get match state to determine batting/bowling context
  const firstBattingTeamId = useMatchStore(state => state.firstBattingTeamId);
  const userTeamId = useTeamStore(state => state.userTeamId);

  // Determine if user is batting first
  const userBattingFirst = useMemo(() => {
    return firstBattingTeamId === userTeamId;
  }, [firstBattingTeamId, userTeamId]);

  // Get steps based on context
  const tutorialSteps = useMemo(() => {
    return getMatchdayTutorialSteps(userBattingFirst);
  }, [userBattingFirst]);

  // Local state for tutorial step within this session
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [started, setStarted] = useState(false);

  // Total steps in the matchday tutorial
  const totalSteps = tutorialSteps.length;

  // Current step data
  const currentStepData = tutorialSteps[currentStep] || null;

  // Show tutorial if:
  // - Tutorial is enabled globally
  // - Main onboarding is complete (don't interrupt main flow)
  // - Matchday tutorial hasn't been completed
  // - Not dismissed this session
  // - Tutorial has been started
  // - Match is initialized (firstBattingTeamId exists)
  const shouldShowTutorial = tutorialEnabled &&
                              onboardingComplete &&
                              !visitedScreens.includes('matchday-tutorial') &&
                              !dismissed &&
                              started &&
                              firstBattingTeamId !== null;

  // Start tutorial when match is ready
  useEffect(() => {
    if (firstBattingTeamId &&
        tutorialEnabled &&
        onboardingComplete &&
        !visitedScreens.includes('matchday-tutorial') &&
        !started) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        setStarted(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [firstBattingTeamId, tutorialEnabled, onboardingComplete, visitedScreens, started]);

  // Advance to next step
  const advance = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial complete - mark as visited
      markScreenVisited('matchday-tutorial');
      setDismissed(true);
    }
  }, [currentStep, totalSteps, markScreenVisited]);

  // Skip entire tutorial
  const skip = useCallback(() => {
    markScreenVisited('matchday-tutorial');
    setDismissed(true);
  }, [markScreenVisited]);

  return {
    shouldShowTutorial,
    currentStep,
    currentStepData,
    advance,
    skip,
    totalSteps,
    userBattingFirst
  };
};

export default useMatchdayTutorial;
