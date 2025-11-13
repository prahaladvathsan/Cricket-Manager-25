/**
 * @file BallTrajectoryAnimation.jsx
 * @description Animated ball trajectory visualization with outcome indicators
 */

import React, { useEffect, useState } from 'react';

/**
 * BallTrajectoryAnimation Component
 * Shows animated ball trajectory with different styles for aerial vs grounded shots
 *
 * @param {Object} lastBall - Ball result with metadata { outcome, metadata: { trajectory, shotType } }
 * @param {number} strikerOffset - Striker position offset from center (10.06m)
 * @param {number} boundaryRadius - Boundary radius (70m)
 */
const BallTrajectoryAnimation = ({
  lastBall,
  strikerOffset,
  boundaryRadius
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation when new ball arrives
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    return () => clearTimeout(timer);
  }, [lastBall]);

  if (!lastBall || !lastBall.metadata || !lastBall.metadata.trajectory) {
    return null;
  }

  const { trajectory, shotType } = lastBall.metadata;
  const { stopPoint, bouncePoint, direction, isBoundary } = trajectory;

  // Calculate path based on shot type
  const startX = 0;
  const startY = -strikerOffset;

  // Use stopPoint for final position
  const endX = stopPoint?.x || 0;
  const endY = stopPoint?.y || 0;

  // Determine if shot is aerial
  const isAerial = shotType === 'aerial';
  const isGrounded = shotType === 'grounded';

  // Calculate control point for quadratic curve (for aerial shots)
  const controlX = endX / 2;
  const controlY = endY / 2 + (isAerial ? 15 : 3); // Higher arc for aerial shots

  // Path for trajectory
  const pathD = isAerial
    ? `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`
    : `M ${startX},${startY} L ${endX},${endY}`;

  // Outcome indicator at end point
  const outcomeColor = {
    'SIX': '#EF4444',
    'FOUR': '#3B82F6',
    'WICKET': '#DC2626',
    'DOT': '#6B7280'
  }[lastBall.outcome] || '#D4AF37';

  const outcomeLabel = {
    'SIX': '6',
    'FOUR': '4',
    'WICKET': 'W',
    'DOT': '•'
  }[lastBall.outcome] || lastBall.runs?.toString() || '';

  return (
    <g className={isAnimating ? 'animate-fade-in' : 'opacity-50'}>
      {/* Ball Path */}
      <path
        d={pathD}
        fill="none"
        stroke="#EF4444"
        strokeWidth="0.4"
        strokeDasharray={isAerial ? "2,2" : "none"}
        opacity={isAnimating ? 1 : 0.3}
        className="transition-opacity duration-300"
      />

      {/* Bounce Point (for aerial shots) */}
      {isAerial && bouncePoint && (
        <circle
          cx={bouncePoint.x}
          cy={bouncePoint.y}
          r={0.8}
          fill="none"
          stroke="#EF4444"
          strokeWidth="0.3"
          opacity={isAnimating ? 0.6 : 0.2}
        />
      )}

      {/* Animated Ball */}
      {isAnimating && (
        <circle
          cx={startX}
          cy={startY}
          r={1}
          fill="#EF4444"
          className="ball-trajectory-animation"
          style={{
            '--end-x': `${endX}px`,
            '--end-y': `${endY}px`,
            '--arc-height': `${isAerial ? '15px' : '3px'}`
          }}
        >
          <animateMotion
            dur="1.5s"
            path={pathD}
            fill="freeze"
          />
        </circle>
      )}

      {/* Outcome Indicator at End Point */}
      <g opacity={isAnimating ? 1 : 0.5}>
        <circle
          cx={endX}
          cy={endY}
          r={2.5}
          fill={outcomeColor}
          stroke="#ffffff"
          strokeWidth="0.4"
        />
        <text
          x={endX}
          y={endY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontSize="2.5"
          fontWeight="bold"
          style={{ transform: 'scaleY(-1)' }}
        >
          {outcomeLabel}
        </text>
      </g>

      {/* Boundary Marker (if boundary) */}
      {isBoundary && (
        <circle
          cx={endX}
          cy={endY}
          r={4}
          fill="none"
          stroke={lastBall.outcome === 'SIX' ? '#EF4444' : '#3B82F6'}
          strokeWidth="0.5"
          strokeDasharray="1,1"
          opacity={isAnimating ? 0.8 : 0.3}
          className="animate-pulse"
        />
      )}
    </g>
  );
};

export default BallTrajectoryAnimation;
