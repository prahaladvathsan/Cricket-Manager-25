/**
 * @file PitchVisualization.jsx
 * @description 2D circular cricket pitch visualization with fielder positions and ball animation
 */

import React from 'react';
import PlayerName from '../../shared/PlayerName';
import BallTrajectoryAnimation from './BallTrajectoryAnimation';

/**
 * PitchVisualization Component
 * Renders a 2D cricket field with boundary, pitch, fielders, and ball trajectory
 *
 * @param {Object} fieldingPositions - Object of fielder positions { playerId: { x, y } }
 * @param {string} strikerId - Current striker player ID
 * @param {string} nonStrikerId - Current non-striker player ID
 * @param {string} bowlerId - Current bowler player ID
 * @param {Object} lastBall - Last ball result with trajectory data
 * @param {boolean} showAnimation - Whether to show ball animation
 */
const PitchVisualization = ({
  fieldingPositions = {},
  strikerId,
  nonStrikerId,
  bowlerId,
  lastBall,
  showAnimation = false
}) => {
  // Constants from field-positioning-config.json
  const BOUNDARY_RADIUS = 70; // meters
  const PITCH_LENGTH = 20.12; // meters (22 yards)
  const INNER_CIRCLE_RADIUS = 30; // meters
  const STRIKER_OFFSET = 10.06; // meters from center

  // SVG dimensions (viewBox scale matches meters)
  const VIEW_SIZE = 160; // -80 to 80 in both directions
  const CENTER = 0;

  // Scale factor to fit in viewBox
  const scale = (meters) => meters;

  return (
    <div className="relative w-full aspect-square bg-cricket-primary-dark rounded-lg overflow-hidden">
      <svg
        viewBox={`${-VIEW_SIZE/2} ${-VIEW_SIZE/2} ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="w-full h-full"
        style={{ transform: 'scaleY(-1)' }} // Flip Y-axis so positive Y is up
      >
        {/* Boundary Circle */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={scale(BOUNDARY_RADIUS)}
          fill="#2D5F3F"
          stroke="#ffffff"
          strokeWidth="0.5"
        />

        {/* Inner Circle (30m) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={scale(INNER_CIRCLE_RADIUS)}
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.3"
          strokeDasharray="2,2"
          opacity="0.4"
        />

        {/* Pitch Rectangle */}
        <rect
          x={-1}
          y={-scale(PITCH_LENGTH/2)}
          width={2}
          height={scale(PITCH_LENGTH)}
          fill="#C19A6B"
          stroke="#8B7355"
          strokeWidth="0.2"
        />

        {/* Crease Lines */}
        <line
          x1={-3}
          y1={-scale(STRIKER_OFFSET)}
          x2={3}
          y1={-scale(STRIKER_OFFSET)}
          stroke="#ffffff"
          strokeWidth="0.3"
        />
        <line
          x1={-3}
          y1={scale(STRIKER_OFFSET)}
          x2={3}
          y2={scale(STRIKER_OFFSET)}
          stroke="#ffffff"
          strokeWidth="0.3"
        />

        {/* Stumps */}
        <g>
          {/* Striker end stumps */}
          <rect
            x={-0.3}
            y={-scale(STRIKER_OFFSET) - 0.5}
            width={0.6}
            height={1}
            fill="#ffffff"
          />
          {/* Bowler end stumps */}
          <rect
            x={-0.3}
            y={scale(STRIKER_OFFSET) - 0.5}
            width={0.6}
            height={1}
            fill="#ffffff"
          />
        </g>

        {/* Fielder Positions */}
        {Object.entries(fieldingPositions).map(([playerId, position]) => {
          if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            return null;
          }

          return (
            <g key={playerId}>
              <circle
                cx={scale(position.x)}
                cy={scale(position.y)}
                r={1.5}
                fill="#3B82F6"
                stroke="#ffffff"
                strokeWidth="0.3"
                className="cursor-pointer hover:fill-cricket-accent transition-colors"
              />
              {/* Fielder label on hover */}
              <title>{playerId}</title>
            </g>
          );
        })}

        {/* Bowler Position (at bowler's end) */}
        {bowlerId && (
          <g>
            <circle
              cx={0}
              cy={scale(STRIKER_OFFSET + 5)}
              r={2}
              fill="#EF4444"
              stroke="#ffffff"
              strokeWidth="0.4"
            />
            <text
              x={0}
              y={scale(STRIKER_OFFSET + 5)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize="2"
              fontWeight="bold"
              style={{ transform: 'scaleY(-1)' }}
            >
              B
            </text>
          </g>
        )}

        {/* Striker Position */}
        {strikerId && (
          <g>
            <circle
              cx={0}
              cy={-scale(STRIKER_OFFSET)}
              r={2}
              fill="#10B981"
              stroke="#ffffff"
              strokeWidth="0.4"
            />
            <text
              x={0}
              y={-scale(STRIKER_OFFSET)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize="2"
              fontWeight="bold"
              style={{ transform: 'scaleY(-1)' }}
            >
              S
            </text>
          </g>
        )}

        {/* Non-Striker Position */}
        {nonStrikerId && (
          <g>
            <circle
              cx={0}
              cy={scale(STRIKER_OFFSET)}
              r={2}
              fill="#10B981"
              stroke="#ffffff"
              strokeWidth="0.4"
              opacity="0.7"
            />
            <text
              x={0}
              y={scale(STRIKER_OFFSET)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize="2"
              fontWeight="bold"
              style={{ transform: 'scaleY(-1)' }}
            >
              N
            </text>
          </g>
        )}

        {/* Ball Trajectory Animation */}
        {showAnimation && lastBall && (
          <BallTrajectoryAnimation
            lastBall={lastBall}
            strikerOffset={STRIKER_OFFSET}
            boundaryRadius={BOUNDARY_RADIUS}
          />
        )}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-bg-primary/80 backdrop-blur-sm rounded p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 border border-white"></div>
          <span className="text-text-primary">Batsmen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
          <span className="text-text-primary">Bowler</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
          <span className="text-text-primary">Fielders</span>
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-2 right-2 text-xs text-white/60 font-mono">
        <div className="text-center">N</div>
      </div>
    </div>
  );
};

export default PitchVisualization;
