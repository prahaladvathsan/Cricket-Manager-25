/**
 * PitchVisualization - Center column container for pitch visualization
 *
 * Features:
 * - Match score display (comprehensive banner at top)
 * - 2D cricket field with SVG rendering
 * - Fielder positions (11 dots with hover labels)
 * - Ball trajectory layer (instant path drawing)
 * - Commentary feed (collapsible below pitch)
 *
 * Phase 3 Complete:
 * - CricketFieldSVG: Boundary, circles, pitch, stumps
 * - FielderPositions: 11 fielders mapped to positions
 * - BallTrajectoryLayer: Instant trajectory rendering
 * - MatchScoreDisplay: Comprehensive score banner
 */

import React from 'react';
import useMatchStore from '../../../../stores/matchStore';
import CricketFieldSVG from './CricketFieldSVG';
import FielderPositions from './FielderPositions';
import BallTrajectoryLayer from './BallTrajectoryLayer';

export default function PitchVisualization() {
  const ballByBall = useMatchStore(state => state.ballByBall);
  const latestBall = ballByBall.length > 0 ? ballByBall[ballByBall.length - 1] : null;

  return (
    <div className="pitch-visualization bg-bg-secondary rounded-lg border border-border-primary h-full flex flex-col">
      {/* Pitch Visualization Area - 2D Cricket Field */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="w-full max-w-4xl" style={{ height: '85vh' }}>
          <CricketFieldSVG>
            {/* Fielder Positions - 11 dots */}
            <FielderPositions highlightClosest={true} />

            {/* Ball Trajectory - Instant path rendering */}
            <BallTrajectoryLayer animationMode="instant" />
          </CricketFieldSVG>
        </div>
      </div>

      {/* Commentary Feed - Last Ball */}
      <div className="p-3 border-t border-border-primary bg-bg-tertiary">
        {latestBall?.commentary ? (
          <p className="text-xs text-text-secondary text-center">
            {latestBall.commentary}
          </p>
        ) : (
          <p className="text-xs text-text-secondary text-center opacity-50">
            Waiting for next ball...
          </p>
        )}
      </div>
    </div>
  );
}
