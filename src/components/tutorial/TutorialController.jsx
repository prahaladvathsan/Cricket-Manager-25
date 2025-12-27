/**
 * @file TutorialController.jsx
 * @description Controller component that manages the onboarding tutorial flow
 * Wraps the game layout and shows tutorial overlays when appropriate
 */

import React from 'react';
import useGameStore from '../../stores/gameStore';
import TutorialSpotlight from './TutorialSpotlight';
import { onboardingSteps } from './tutorialSteps';

const TutorialController = ({ children }) => {
  const {
    tutorialProgress,
    settings,
    advanceOnboarding,
    skipOnboarding
  } = useGameStore();

  const { onboardingComplete, onboardingStep } = tutorialProgress;
  const { tutorialEnabled } = settings;

  // Don't show onboarding if:
  // - Tutorial is disabled in settings
  // - Onboarding is already complete
  const shouldShowOnboarding = tutorialEnabled && !onboardingComplete;

  // Get current step data
  const currentStep = shouldShowOnboarding ? onboardingSteps[onboardingStep] : null;

  // Handle next step
  const handleNext = () => {
    advanceOnboarding();
  };

  // Handle skip all
  const handleSkip = () => {
    skipOnboarding();
  };

  return (
    <>
      {children}

      {/* Onboarding overlay */}
      {currentStep && (
        <TutorialSpotlight
          targetSelector={currentStep.targetSelector}
          title={currentStep.title}
          description={currentStep.description}
          icon={currentStep.icon}
          step={onboardingStep + 1}
          totalSteps={onboardingSteps.length}
          position={currentStep.position}
          onNext={handleNext}
          onSkip={handleSkip}
        />
      )}
    </>
  );
};

export default TutorialController;
