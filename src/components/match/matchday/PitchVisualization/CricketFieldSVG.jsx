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
 * - Data: Positive Y = keeper/striker end, Negative Y = bowler end
 * - Rendering: Y-axis is flipped via transform="scale(1, -1)"
 * - Visual result: Keeper/striker at TOP, bowler at BOTTOM (correct orientation)
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
      {/* Apply Y-axis flip: positive Y data = top of screen */}
      <g transform="scale(1, -1)">
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
      </g>

      {/* Zone Legend - Top Right Corner Overlay (outside flip for correct text orientation) */}
      <g id="zone-legend" transform="translate(52, -65)">
        {/* Semi-transparent background */}
        <rect
          x="0"
          y="0"
          width="24"
          height="24"
          fill="#1a1a1a"
          opacity="0.9"
          rx="1.5"
        />

        {/* Legend entries */}
        <g transform="translate(2, 2.5)">
          {/* Bowler/Keeper - BLACK */}
          <circle cx="1.8" cy="1.8" r="1.2" fill="#000000" stroke="white" strokeWidth="0.15" />
          <text x="4" y="2.5" fontSize="3" fill="white" fontWeight="600">B/K</text>

          {/* Silly - Red */}
          <circle cx="1.8" cy="5.5" r="1.2" fill="#EF4444" />
          <text x="4" y="6.2" fontSize="3" fill="white" fontWeight="500">Silly</text>

          {/* Close - Orange */}
          <circle cx="1.8" cy="9.2" r="1.2" fill="#F97316" />
          <text x="4" y="9.9" fontSize="3" fill="white" fontWeight="500">Close</text>

          {/* Ring - Yellow */}
          <circle cx="1.8" cy="12.9" r="1.2" fill="#EAB308" />
          <text x="4" y="13.6" fontSize="3" fill="white" fontWeight="500">Ring</text>

          {/* Boundary - Blue */}
          <circle cx="1.8" cy="16.6" r="1.2" fill="#3B82F6" />
          <text x="4" y="17.3" fontSize="3" fill="white" fontWeight="500">Boundary</text>
        </g>
      </g>
    </svg>
  );
};

export default CricketFieldSVG;
