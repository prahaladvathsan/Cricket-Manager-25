import React, { useMemo } from 'react';
import useMatchStore from '../../../../stores/matchStore';

/**
 * BallTrajectoryLayer - Renders ball trajectory path after each delivery
 *
 * Features:
 * - Instant path rendering (current implementation)
 * - Extensible architecture for future animation modes
 * - Differentiates aerial (dashed curve) vs grounded (solid line)
 * - Red path with end point circle
 * - Handles edge cases (missed/edged shots)
 *
 * Trajectory Data Source:
 * - `matchStore.ballByBall[latest].metadata.trajectoryResult`
 * - Contains: shotType, direction (degrees), expectedDistance (meters)
 *
 * Coordinate Transform:
 * - Striker position: (0, -10.06)
 * - Direction: 0° = straight (toward bowler), 90° = leg side, 270° = off side
 * - Distance in meters, converted to SVG coordinates
 *
 * Future Animation Modes:
 * - 'instant': Draw path immediately (current)
 * - 'animated': Ball moves along path with React Spring (future)
 * - 'advanced': Ball + fielders animated with interception (future)
 */
const BallTrajectoryLayer = ({ animationMode = 'instant' }) => {
  // Get latest ball data
  const ballByBall = useMatchStore(state => state.ballByBall);

  // Extract trajectory from latest ball
  const trajectoryData = useMemo(() => {
    if (!ballByBall || ballByBall.length === 0) {
      return null;
    }

    const latestBall = ballByBall[ballByBall.length - 1];
    const trajectory = latestBall?.metadata?.trajectoryResult;

    // Don't render trajectory for these shot types
    if (!trajectory ||
        trajectory.shotType === 'missed' ||
        trajectory.shotType === 'edged_behind' ||
        !trajectory.direction ||
        trajectory.expectedDistance === 0) {
      return null;
    }

    return trajectory;
  }, [ballByBall]);

  // Render based on animation mode (extensible switch)
  switch (animationMode) {
    case 'instant':
      return <InstantPathRenderer trajectory={trajectoryData} />;
    case 'animated':
      // Placeholder for future implementation
      return <AnimatedBallRenderer trajectory={trajectoryData} />;
    case 'advanced':
      // Placeholder for future implementation
      return <AdvancedSimulationRenderer trajectory={trajectoryData} />;
    default:
      return <InstantPathRenderer trajectory={trajectoryData} />;
  }
};

/**
 * InstantPathRenderer - Draws trajectory path immediately
 * Current implementation for Phase 3
 */
const InstantPathRenderer = ({ trajectory }) => {
  const pathData = useMemo(() => {
    if (!trajectory) {
      return null;
    }

    // Validate trajectory data has valid numbers
    const distance = trajectory.expectedDistance;
    const direction = trajectory.direction;

    if (typeof distance !== 'number' || isNaN(distance) ||
        typeof direction !== 'number' || isNaN(direction)) {
      return null;
    }

    // Striker position (batting end)
    const strikerX = 0;
    const strikerY = -10.06;

    // Convert direction (degrees) to radians
    const angleRad = (direction * Math.PI) / 180;

    // Calculate end point from trajectory
    const endX = strikerX + distance * Math.cos(angleRad);
    const endY = strikerY + distance * Math.sin(angleRad);

    // Final validation - ensure calculated values are valid
    if (isNaN(endX) || isNaN(endY)) {
      return null;
    }

    // Generate SVG path based on shot type
    let path = '';

    if (trajectory.shotType === 'aerial') {
      // Aerial shot: Parabolic curve (dashed)
      // Use quadratic Bezier curve for approximation
      const midX = (strikerX + endX) / 2;
      const midY = (strikerY + endY) / 2 - Math.min(distance * 0.2, 15); // Arc height

      path = `M ${strikerX},${strikerY} Q ${midX},${midY} ${endX},${endY}`;
    } else if (trajectory.shotType === 'grounded') {
      // Grounded shot: Straight line (solid)
      path = `M ${strikerX},${strikerY} L ${endX},${endY}`;
    } else {
      // Fallback: straight line
      path = `M ${strikerX},${strikerY} L ${endX},${endY}`;
    }

    return {
      path,
      endX,
      endY,
      shotType: trajectory.shotType,
      distance
    };
  }, [trajectory]);

  if (!pathData) {
    return null;
  }

  const isAerial = pathData.shotType === 'aerial';

  return (
    <g id="ball-trajectory">
      {/* Trajectory path */}
      <path
        d={pathData.path}
        fill="none"
        stroke="#EA4335"
        strokeWidth="0.4"
        strokeDasharray={isAerial ? "1.5 1" : "none"}
        opacity="0.9"
        strokeLinecap="round"
      />

      {/* End point circle */}
      <circle
        cx={pathData.endX}
        cy={pathData.endY}
        r="1"
        fill="#EA4335"
        stroke="white"
        strokeWidth="0.2"
        opacity="0.9"
      />

      {/* Distance label (optional) */}
      {pathData.distance > 10 && (
        <text
          x={pathData.endX}
          y={pathData.endY + 3}
          textAnchor="middle"
          fontSize="1.8"
          fill="white"
          fontWeight="bold"
          opacity="0.8"
          style={{ pointerEvents: 'none' }}
        >
          {Math.round(pathData.distance)}m
        </text>
      )}
    </g>
  );
};

/**
 * AnimatedBallRenderer - Placeholder for future animation feature
 * Ball moves along path with React Spring (1-2s animation)
 */
const AnimatedBallRenderer = ({ trajectory }) => {
  // TODO: Implement in Phase 6 (future enhancement)
  // - Use React Spring for smooth animation
  // - Animate ball position along path
  // - Show fielder reactions
  console.warn('AnimatedBallRenderer not yet implemented - falling back to instant');
  return <InstantPathRenderer trajectory={trajectory} />;
};

/**
 * AdvancedSimulationRenderer - Placeholder for future advanced animation
 * Ball + fielders animated with realistic interception logic
 */
const AdvancedSimulationRenderer = ({ trajectory }) => {
  // TODO: Implement in Phase 6 (future enhancement)
  // - Animate ball trajectory with physics
  // - Animate fielder movements toward ball
  // - Show catch attempts, boundary slides, etc.
  console.warn('AdvancedSimulationRenderer not yet implemented - falling back to instant');
  return <InstantPathRenderer trajectory={trajectory} />;
};

export default BallTrajectoryLayer;
