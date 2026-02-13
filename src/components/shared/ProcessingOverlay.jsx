/**
 * @file ProcessingOverlay.jsx
 * @description Lightweight overlay shown during advanceDay() processing
 * Displays a cricket-themed loading message while player conditions are updated
 */

import React, { useMemo } from 'react';
import CricketBallSpinner from './CricketBallSpinner';

const CRICKET_MESSAGES = [
  'Rolling the pitch...',
  'Checking the weather...',
  'Tossing the coin...',
  'Warming up the bowlers...',
  'Polishing the ball...',
  'Consulting the third umpire...',
  'Reading the conditions...',
  'Setting the field...',
  'Stretching the hamstrings...',
  'Marking the crease...',
  'Chalking the boundary...',
  'Inspecting the outfield...',
  'Checking the sight screen...',
  'Reviewing the squad list...',
  'Waxing the outfield...'
];

const ProcessingOverlay = ({ isVisible }) => {
  // Pick a random message when the overlay becomes visible
  const message = useMemo(
    () => CRICKET_MESSAGES[Math.floor(Math.random() * CRICKET_MESSAGES.length)],
    [isVisible]
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 pointer-events-auto">
      <div className="flex flex-col items-center gap-4">
        <CricketBallSpinner className="w-12 h-12" />
        <p className="text-cricket-text-primary text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
