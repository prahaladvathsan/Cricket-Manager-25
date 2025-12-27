/**
 * @file TutorialSpotlight.jsx
 * @description Spotlight overlay component for tutorial onboarding
 * Creates a dark overlay with a cutout spotlight around the target element
 * Smart positioning ensures tooltip never overlaps target or goes out of viewport
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, X } from 'lucide-react';

const TutorialSpotlight = ({
  targetSelector,
  title,
  description,
  icon: Icon,
  step,
  totalSteps,
  position = 'bottom',
  onNext,
  onSkip
}) => {
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({ top: 0, left: 0 });

  // Tooltip dimensions
  const TOOLTIP_WIDTH = 320;
  const TOOLTIP_HEIGHT = 220; // Approximate max height
  const GAP = 16; // Gap between target and tooltip
  const VIEWPORT_PADDING = 16; // Min distance from viewport edges

  // Calculate the best position for tooltip that doesn't overlap target
  const calculateTooltipPosition = useCallback((rect, preferredPosition) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Define spotlight bounds (with padding)
    const spotlightBounds = {
      top: rect.top - 8,
      left: rect.left - 8,
      right: rect.left + rect.width + 8,
      bottom: rect.top + rect.height + 8
    };

    // Calculate available space in each direction
    const spaceTop = spotlightBounds.top - VIEWPORT_PADDING;
    const spaceBottom = viewportHeight - spotlightBounds.bottom - VIEWPORT_PADDING;
    const spaceLeft = spotlightBounds.left - VIEWPORT_PADDING;
    const spaceRight = viewportWidth - spotlightBounds.right - VIEWPORT_PADDING;

    // Try positions in order of preference
    const positionOrder = [preferredPosition];

    // Add fallback positions based on preferred
    if (preferredPosition === 'bottom' || preferredPosition === 'top') {
      positionOrder.push('bottom', 'top', 'right', 'left');
    } else {
      positionOrder.push('right', 'left', 'bottom', 'top');
    }

    // Remove duplicates while preserving order
    const uniquePositions = [...new Set(positionOrder)];

    for (const pos of uniquePositions) {
      let top, left;
      let fits = false;

      switch (pos) {
        case 'bottom':
          if (spaceBottom >= TOOLTIP_HEIGHT + GAP) {
            top = spotlightBounds.bottom + GAP;
            left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
            fits = true;
          }
          break;
        case 'top':
          if (spaceTop >= TOOLTIP_HEIGHT + GAP) {
            top = spotlightBounds.top - TOOLTIP_HEIGHT - GAP;
            left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
            fits = true;
          }
          break;
        case 'right':
          if (spaceRight >= TOOLTIP_WIDTH + GAP) {
            top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
            left = spotlightBounds.right + GAP;
            fits = true;
          }
          break;
        case 'left':
          if (spaceLeft >= TOOLTIP_WIDTH + GAP) {
            top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
            left = spotlightBounds.left - TOOLTIP_WIDTH - GAP;
            fits = true;
          }
          break;
      }

      if (fits) {
        // Clamp horizontal position to viewport
        left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING));
        // Clamp vertical position to viewport
        top = Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - TOOLTIP_HEIGHT - VIEWPORT_PADDING));

        // Final check: ensure no overlap with spotlight
        const tooltipBounds = {
          top: top,
          left: left,
          right: left + TOOLTIP_WIDTH,
          bottom: top + TOOLTIP_HEIGHT
        };

        const overlaps = !(
          tooltipBounds.right < spotlightBounds.left ||
          tooltipBounds.left > spotlightBounds.right ||
          tooltipBounds.bottom < spotlightBounds.top ||
          tooltipBounds.top > spotlightBounds.bottom
        );

        if (!overlaps) {
          return { top, left };
        }
      }
    }

    // Last resort: position in the corner with most space, avoiding overlap
    // Find the quadrant with most space
    const quadrants = [
      { name: 'bottomRight', space: spaceBottom + spaceRight, top: spotlightBounds.bottom + GAP, left: spotlightBounds.right + GAP },
      { name: 'bottomLeft', space: spaceBottom + spaceLeft, top: spotlightBounds.bottom + GAP, left: spotlightBounds.left - TOOLTIP_WIDTH - GAP },
      { name: 'topRight', space: spaceTop + spaceRight, top: spotlightBounds.top - TOOLTIP_HEIGHT - GAP, left: spotlightBounds.right + GAP },
      { name: 'topLeft', space: spaceTop + spaceLeft, top: spotlightBounds.top - TOOLTIP_HEIGHT - GAP, left: spotlightBounds.left - TOOLTIP_WIDTH - GAP }
    ];

    quadrants.sort((a, b) => b.space - a.space);

    for (const q of quadrants) {
      let { top, left } = q;

      // Clamp to viewport
      left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING));
      top = Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - TOOLTIP_HEIGHT - VIEWPORT_PADDING));

      // Check no overlap
      const tooltipBounds = {
        top: top,
        left: left,
        right: left + TOOLTIP_WIDTH,
        bottom: top + TOOLTIP_HEIGHT
      };

      const overlaps = !(
        tooltipBounds.right < spotlightBounds.left - 4 ||
        tooltipBounds.left > spotlightBounds.right + 4 ||
        tooltipBounds.bottom < spotlightBounds.top - 4 ||
        tooltipBounds.top > spotlightBounds.bottom + 4
      );

      if (!overlaps) {
        return { top, left };
      }
    }

    // Ultimate fallback: just put it at bottom-right of viewport
    return {
      top: viewportHeight - TOOLTIP_HEIGHT - VIEWPORT_PADDING,
      left: viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING
    };
  }, []);

  // Calculate target element position
  const updatePosition = useCallback(() => {
    if (!targetSelector) {
      // Centered mode (no target)
      setTargetRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      return;
    }

    const target = document.querySelector(targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        // Add padding around spotlight
        paddingTop: rect.top - 8,
        paddingLeft: rect.left - 8,
        paddingWidth: rect.width + 16,
        paddingHeight: rect.height + 16
      });

      // Calculate smart tooltip position
      const tooltipPos = calculateTooltipPosition(rect, position);
      setTooltipStyle({
        position: 'fixed',
        top: tooltipPos.top,
        left: tooltipPos.left,
        transform: 'none'
      });
    }
  }, [targetSelector, position, calculateTooltipPosition]);

  // Scroll target element into view
  useEffect(() => {
    if (targetSelector) {
      const target = document.querySelector(targetSelector);
      if (target) {
        // Scroll element into view with some padding
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [targetSelector]);

  // Update on mount and resize
  useEffect(() => {
    // Delay initial position calculation to allow scroll to settle
    const initialTimeout = setTimeout(updatePosition, 100);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); // Capture scroll on all elements

    // Additional update after scroll settles
    const scrollTimeout = setTimeout(updatePosition, 300);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearTimeout(initialTimeout);
      clearTimeout(scrollTimeout);
    };
  }, [updatePosition]);

  const isLastStep = step === totalSteps;
  const isCentered = !targetSelector;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White = visible (dark overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black = transparent (spotlight cutout) */}
            {targetRect && (
              <rect
                x={targetRect.paddingLeft}
                y={targetRect.paddingTop}
                width={targetRect.paddingWidth}
                height={targetRect.paddingHeight}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight ring highlight */}
      {targetRect && (
        <div
          className="absolute rounded-lg ring-4 ring-cricket-accent animate-pulse pointer-events-none"
          style={{
            top: targetRect.paddingTop,
            left: targetRect.paddingLeft,
            width: targetRect.paddingWidth,
            height: targetRect.paddingHeight
          }}
        />
      )}

      {/* Click blocker (except on target) */}
      <div
        className="absolute inset-0"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Tooltip Card */}
      <div
        className="bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-5 w-80 animate-fadeIn"
        style={{
          ...tooltipStyle,
          pointerEvents: 'auto',
          zIndex: 10000
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-cricket-primary/20 rounded-lg">
                <Icon className="w-5 h-5 text-cricket-accent" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-cricket-text-primary">
                {title}
              </h3>
              <p className="text-xs text-cricket-text-tertiary">
                Step {step} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-1 text-cricket-text-tertiary hover:text-cricket-text-secondary transition-colors"
            title="Skip tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-cricket-text-secondary mb-4 leading-relaxed">
          {description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-sm text-cricket-text-tertiary hover:text-cricket-text-secondary transition-colors"
          >
            Skip All
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-4 py-2 bg-cricket-primary text-white rounded-lg
                       hover:bg-cricket-primary-dark transition-colors font-medium text-sm"
          >
            {isLastStep ? "Let's Go!" : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < step
                  ? 'bg-cricket-accent'
                  : i === step - 1
                  ? 'bg-cricket-primary'
                  : 'bg-border-primary'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorialSpotlight;
