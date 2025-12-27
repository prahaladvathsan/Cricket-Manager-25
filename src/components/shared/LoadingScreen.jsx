/**
 * @file LoadingScreen.jsx
 * @description Fullscreen loading screen for transitions between game states
 * Used before heavy animations/graphics are rendered to prevent laggy appearance
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { getGameLogo } from '../../utils/assetHelpers';

/**
 * LoadingScreen - Fullscreen loading overlay
 * @param {Object} props
 * @param {string} props.message - Primary loading message
 * @param {string} props.submessage - Secondary descriptive text
 * @param {boolean} props.showLogo - Whether to show the game logo (default: true)
 */
const LoadingScreen = ({
  message = 'Loading...',
  submessage = '',
  showLogo = true
}) => {
  return (
    <div className="fixed inset-0 z-[200] bg-cricket-dark flex items-center justify-center">
      <div className="text-center">
        {showLogo && (
          <img
            src={getGameLogo('light')}
            alt="Cricket Manager 25"
            className="h-20 mx-auto mb-6 animate-pulse"
          />
        )}
        <div className="relative mb-4">
          <Loader2 className="w-12 h-12 text-cricket-accent animate-spin mx-auto" />
        </div>
        <p className="text-cricket-text-primary text-xl font-semibold">
          {message}
        </p>
        {submessage && (
          <p className="text-cricket-text-secondary text-sm mt-2">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
