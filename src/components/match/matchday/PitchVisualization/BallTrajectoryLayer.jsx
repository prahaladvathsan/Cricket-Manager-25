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
      console.log('🏏 [TRAJECTORY] No balls yet');
      return null;
    }

    const latestBall = ballByBall[ballByBall.length - 1];
    const trajectoryResult = latestBall?.metadata?.trajectoryResult;
    const fieldingResult = latestBall?.metadata?.fieldingResult;

    console.log('🏏 [TRAJECTORY] Latest ball:', {
      ballNumber: ballByBall.length,
      over: latestBall.over,
      ball: latestBall.ball,
      runs: latestBall.runs,
      hasMetadata: !!latestBall.metadata,
      hasTrajectoryResult: !!trajectoryResult,
      hasFieldingResult: !!fieldingResult,
      trajectoryResult,
      fieldingResult
    });

    // Don't render trajectory for these shot types
    if (!trajectoryResult) {
      console.log('🏏 [TRAJECTORY] ❌ No trajectory data in metadata');
      return null;
    }

    if (trajectoryResult.shotType === 'missed' || trajectoryResult.shotType === 'edged_behind') {
      console.log('🏏 [TRAJECTORY] ❌ Filtered out shot type:', trajectoryResult.shotType);
      return null;
    }

    if (!trajectoryResult.direction) {
      console.log('🏏 [TRAJECTORY] ❌ No direction:', trajectoryResult.direction);
      return null;
    }

    // Get actual shot data from fieldingResult
    if (!fieldingResult || !fieldingResult.trajectory) {
      console.log('🏏 [TRAJECTORY] ❌ No fielding result trajectory data');
      return null;
    }

    const trajectory = fieldingResult.trajectory;

    if (!trajectory.shotDistance || trajectory.shotDistance === 0) {
      console.log('🏏 [TRAJECTORY] ❌ Zero or missing shotDistance:', trajectory.shotDistance);
      return null;
    }

    console.log('🏏 [TRAJECTORY] ✅ Valid trajectory:', {
      shotType: trajectoryResult.shotType,
      direction: trajectory.direction,
      shotDistance: trajectory.shotDistance,
      bouncePoint: trajectory.bouncePoint
    });

    return {
      shotType: trajectoryResult.shotType,
      direction: trajectory.direction,
      shotDistance: trajectory.shotDistance,
      bouncePoint: trajectory.bouncePoint, // For aerial shots
      shotSpeed: trajectory.shotSpeed
    };
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
      console.log('📐 [PATH] No trajectory provided to renderer');
      return null;
    }

    // Use shotDistance (actual ball travel distance) instead of expectedDistance
    const distance = trajectory.shotDistance;
    const direction = trajectory.direction;
    const bouncePoint = trajectory.bouncePoint; // For aerial shots

    // console.log('📐 [PATH] Input values:', {
    //   shotDistance: distance,
    //   direction,
    //   shotType: trajectory.shotType,
    //   bouncePoint
    // });

    if (typeof distance !== 'number' || isNaN(distance) ||
        typeof direction !== 'number' || isNaN(direction)) {
      // console.log('📐 [PATH] ❌ Invalid number types');
      return null;
    }

    // Striker position (batting end) - POSITIVE Y in CricketFieldSVG coordinate system
    // CricketFieldSVG: "Positive Y = keeper/striker end, Negative Y = bowler end"
    // After scale(1,-1) flip: Positive Y data → Positive Y visual (UP) = TOP of screen
    const strikerX = 0;
    const strikerY = 10.06; // POSITIVE Y = striker at TOP (after flip)

    // console.log('📐 [PATH] Striker position (data coords):', { strikerX, strikerY });
    // console.log('📐 [PATH] ⚠️ Parent SVG has scale(1, -1) - Y flipped for rendering');
    // console.log('📐 [PATH] Visual: striker at TOP (y=+10.06), bowler at BOTTOM (y=-10.06)');

    // Convert direction to radians
    // Match engine uses counter-clockwise from 0°=leg side (positive X axis)
    const angleRad = (direction * Math.PI) / 180;

    // Calculate end point from trajectory
    const endX = strikerX + distance * Math.cos(angleRad);
    const endY = strikerY + distance * Math.sin(angleRad);

    // console.log('📐 [PATH] Shot direction:', direction, '° counter-clockwise from leg side (0°=+X)');
    // console.log('📐 [PATH] Angle negated for Y-flip:', (-direction), '°');
    console.log('📐 [PATH] Calculated end point (data coords):', {
      endX: endX.toFixed(2),
      endY: endY.toFixed(2),
      visualY: (-endY).toFixed(2) // What it looks like after flip
    });

    // Calculate distance from center (striker is offset from center)
    const strikerDistanceFromCenter = Math.abs(strikerY);
    const endDistanceFromCenter = Math.sqrt(endX * endX + endY * endY);
    const ballTraveledFromCenter = endDistanceFromCenter - strikerDistanceFromCenter;

    // console.log('📐 [PATH] Distance analysis:', {
    //   shotDistance: distance.toFixed(2) + 'm',
    //   strikerFromCenter: strikerDistanceFromCenter.toFixed(2) + 'm',
    //   endFromCenter: endDistanceFromCenter.toFixed(2) + 'm',
    //   ballTravelFromCenter: ballTraveledFromCenter.toFixed(2) + 'm',
    //   crossedInnerCircle: endDistanceFromCenter > 30,
    //   crossedBoundary: endDistanceFromCenter > 70
    // });

    // Final validation
    if (isNaN(endX) || isNaN(endY)) {
      // console.log('📐 [PATH] ❌ Calculated NaN values');
      return null;
    }

    // Generate SVG path based on shot type
    let aerialPath = null;
    let groundPath = null;
    let bounceX = null;
    let bounceY = null;

    if (trajectory.shotType === 'aerial' && bouncePoint) {
      // Aerial shot with bounce point: TWO segments
      // Segment 1: Curved/dashed from striker to bounce point (aerial phase)
      // Segment 2: Straight solid from bounce point to end (ground phase)

      // Calculate bounce point position (bouncePoint.r is in polar from striker)
      // Use same negated angle as end point
      const bounceDistance = bouncePoint.r;
      bounceX = strikerX + bounceDistance * Math.cos(angleRad);
      bounceY = strikerY + bounceDistance * Math.sin(angleRad);

      // Aerial segment (curved, dashed)
      // Arc should go "up" visually - since Y is flipped, subtract from midY to go up
      const midX = (strikerX + bounceX) / 2;
      const midY = (strikerY + bounceY) / 2 - Math.min(bounceDistance * 0.2, 15); // MINUS makes arc go "up" after Y-flip
      aerialPath = `M ${strikerX},${strikerY} Q ${midX},${midY} ${bounceX},${bounceY}`;

      // Ground segment (straight, solid) - only if ball continues after bounce
      if (distance > bounceDistance) {
        groundPath = `M ${bounceX},${bounceY} L ${endX},${endY}`;
      }

      // console.log('📐 [PATH] Aerial shot with bounce:', {
      //   phase1: 'Curved (striker → bounce)',
      //   bouncePoint: `(${bounceX.toFixed(2)}, ${bounceY.toFixed(2)})`,
      //   bounceDistance: bounceDistance.toFixed(2) + 'm',
      //   phase2: groundPath ? 'Straight (bounce → end)' : 'None (caught/six)',
      //   finalDistance: distance.toFixed(2) + 'm'
      // });
    } else if (trajectory.shotType === 'aerial') {
      // Aerial shot without bounce point data (fallback: simple curve)
      const midX = (strikerX + endX) / 2;
      const midY = (strikerY + endY) / 2 - Math.min(distance * 0.2, 15); // MINUS makes arc go "up" after Y-flip
      aerialPath = `M ${strikerX},${strikerY} Q ${midX},${midY} ${endX},${endY}`;

      // console.log('📐 [PATH] Aerial shot (no bounce data - fallback curve)');
    } else {
      // Grounded shot: Single straight line
      groundPath = `M ${strikerX},${strikerY} L ${endX},${endY}`;

      // console.log('📐 [PATH] Grounded shot: straight line');
    }

    // console.log('📐 [PATH] ✅ Path generated successfully');
    // console.log('═'.repeat(80));

    return {
      aerialPath,    // Curved/dashed segment (striker to bounce)
      groundPath,    // Straight segment (bounce to end OR full grounded shot)
      bounceX,       // Bounce point X (for marker)
      bounceY,       // Bounce point Y (for marker)
      endX,
      endY,
      shotType: trajectory.shotType,
      distance
    };
  }, [trajectory]);

  if (!pathData) {
    return null;
  }

  return (
    <g id="ball-trajectory">
      {/* Aerial segment (curved, dashed) - striker to bounce point */}
      {pathData.aerialPath && (
        <path
          d={pathData.aerialPath}
          fill="none"
          stroke="#EA4335"
          strokeWidth="0.4"
          strokeDasharray="1.5 1"
          opacity="0.9"
          strokeLinecap="round"
        />
      )}

      {/* Ground segment (straight, solid) - bounce to end OR full grounded shot */}
      {pathData.groundPath && (
        <path
          d={pathData.groundPath}
          fill="none"
          stroke="#EA4335"
          strokeWidth="0.4"
          strokeDasharray="none"
          opacity="0.9"
          strokeLinecap="round"
        />
      )}

      {/* Bounce point marker (for aerial shots) */}
      {pathData.bounceX !== null && pathData.bounceY !== null && (
        <circle
          cx={pathData.bounceX}
          cy={pathData.bounceY}
          r="0.8"
          fill="#FF69B4"
          stroke="white"
          strokeWidth="0.15"
          opacity="0.8"
        />
      )}

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
