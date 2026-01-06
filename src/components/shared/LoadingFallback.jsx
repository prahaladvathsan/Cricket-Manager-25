/**
 * @file LoadingFallback.jsx
 * @description Loading fallback components for lazy-loaded routes
 * Shows consistent loading UI while chunks download
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading fallback for route-level code splitting
 * Full screen loading indicator for page transitions
 */
export const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-cricket-dark">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-cricket-accent animate-spin mx-auto mb-4" />
      <p className="text-text-secondary">Loading...</p>
    </div>
  </div>
);

/**
 * Loading fallback for component-level code splitting
 * Compact loading indicator for smaller components
 */
export const ComponentLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 text-cricket-accent animate-spin" />
  </div>
);
