/**
 * @file CricketBallSpinner.jsx
 * @description Spinning cricket ball loading animation
 * Used as a themed replacement for generic loading spinners
 */

import React from 'react';

/**
 * CricketBallSpinner - Animated cricket ball for loading states
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes (default: "w-12 h-12")
 */
const CricketBallSpinner = ({ className = "w-12 h-12" }) => {
  return (
    <img
      src="/assets/effects/red_ball.svg"
      alt="Loading"
      className={`inline-block ${className} animate-spin`}
    />
  );
};

export default CricketBallSpinner;
