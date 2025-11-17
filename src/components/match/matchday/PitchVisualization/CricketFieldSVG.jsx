import React from 'react';

/**
 * CricketFieldSVG - Base cricket field rendering component
 *
 * Renders a 2D cricket field with:
 * - Boundary circle (70m radius)
 * - Inner circle (30m radius, dashed)
 * - Pitch rectangle (20.12m × 3.05m)
 * - Stumps at both ends
 *
 * Coordinate System:
 * - Origin at center (0, 0)
 * - Y-axis points up (positive Y = top of screen, negative Y = bottom)
 * - Bowler/Non-striker at (0, -10.06) - BOTTOM of screen
 * - Keeper/Striker at (0, +10.06) - TOP of screen
 * - All dimensions in meters
 * - SVG viewBox: -80 -80 160 160 (accommodates 70m boundary + padding)
 *
 * Design System:
 * - Cricket Green (#2D5F3F) background
 * - White strokes for field markings
 * - Responsive via viewBox (maintains aspect ratio)
 */
const CricketFieldSVG = ({ children, className = '' }) => {
  // Field dimensions from field-positioning-config.json
  const BOUNDARY_RADIUS = 70; // meters
  const INNER_CIRCLE_RADIUS = 30; // meters (powerplay circle)
  const PITCH_LENGTH = 20.12; // meters (22 yards)
  const PITCH_WIDTH = 3.05; // meters (~10 feet)
  const STRIKER_OFFSET = 10.06; // meters (11 yards from center)
  const STUMP_RADIUS = 0.5; // meters (visual size)

  return (
    <svg
      viewBox="-80 -80 160 160"
      className={`w-full h-full ${className}`}
      style={{ aspectRatio: '1 / 1' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background - Cricket Green */}
      <rect
        x="-80"
        y="-80"
        width="160"
        height="160"
        fill="#2D5F3F"
      />

      {/* Boundary Circle - 70m radius */}
      <circle
        cx="0"
        cy="0"
        r={BOUNDARY_RADIUS}
        fill="none"
        stroke="white"
        strokeWidth="0.4"
        opacity="0.9"
      />

      {/* Inner Circle (30m) - Dashed for powerplay restrictions */}
      <circle
        cx="0"
        cy="0"
        r={INNER_CIRCLE_RADIUS}
        fill="none"
        stroke="white"
        strokeWidth="0.3"
        strokeDasharray="2 1"
        opacity="0.6"
      />

      {/* Pitch Rectangle - 20.12m × 3.05m, centered vertically */}
      <rect
        x={-PITCH_WIDTH / 2}
        y={-PITCH_LENGTH / 2}
        width={PITCH_WIDTH}
        height={PITCH_LENGTH}
        fill="#3D7050"
        stroke="white"
        strokeWidth="0.2"
        opacity="0.8"
      />

      {/* Pitch creases - batting crease lines */}
      {/* Striker crease at -10.06m */}
      <line
        x1={-PITCH_WIDTH}
        y1={-STRIKER_OFFSET}
        x2={PITCH_WIDTH}
        y2={-STRIKER_OFFSET}
        stroke="white"
        strokeWidth="0.15"
        opacity="0.7"
      />

      {/* Bowler crease at +10.06m */}
      <line
        x1={-PITCH_WIDTH}
        y1={STRIKER_OFFSET}
        x2={PITCH_WIDTH}
        y2={STRIKER_OFFSET}
        stroke="white"
        strokeWidth="0.15"
        opacity="0.7"
      />

      {/* Stumps - Striker End (bottom) */}
      <g id="striker-stumps">
        <circle
          cx="0"
          cy={-STRIKER_OFFSET}
          r={STUMP_RADIUS}
          fill="#D4AF37"
          stroke="white"
          strokeWidth="0.1"
        />
        {/* Stump details - three vertical lines */}
        <line
          x1="-0.3"
          y1={-STRIKER_OFFSET - 0.4}
          x2="-0.3"
          y2={-STRIKER_OFFSET + 0.4}
          stroke="white"
          strokeWidth="0.08"
          opacity="0.8"
        />
        <line
          x1="0"
          y1={-STRIKER_OFFSET - 0.4}
          x2="0"
          y2={-STRIKER_OFFSET + 0.4}
          stroke="white"
          strokeWidth="0.08"
          opacity="0.8"
        />
        <line
          x1="0.3"
          y1={-STRIKER_OFFSET - 0.4}
          x2="0.3"
          y2={-STRIKER_OFFSET + 0.4}
          stroke="white"
          strokeWidth="0.08"
          opacity="0.8"
        />
      </g>

      {/* Stumps - Bowler End (top) */}
      <g id="bowler-stumps">
        <circle
          cx="0"
          cy={STRIKER_OFFSET}
          r={STUMP_RADIUS}
          fill="#D4AF37"
          stroke="white"
          strokeWidth="0.1"
        />
        {/* Stump details - three vertical lines */}
        <line
          x1="-0.3"
          y1={STRIKER_OFFSET - 0.4}
          x2="-0.3"
          y2={STRIKER_OFFSET + 0.4}
          stroke="white"
          strokeWidth="0.08"
          opacity="0.8"
        />
        <line
          x1="0"
          y1={STRIKER_OFFSET - 0.4}
          x2="0"
          y2={STRIKER_OFFSET + 0.4}
          stroke="white"
          strokeWidth="0.08"
          opacity="0.8"
        />
        <line
          x1="0.3"
          y1={STRIKER_OFFSET - 0.4}
          x2="0.3"
          y2={STRIKER_OFFSET + 0.4}
          stroke="white"
          strokeWidth="0.08"
          opacity="0.8"
        />
      </g>

      {/* Render children (fielders, trajectories, etc.) on top of field */}
      {children}
    </svg>
  );
};

export default CricketFieldSVG;
