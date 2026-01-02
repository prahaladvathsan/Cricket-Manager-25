/**
 * @file ConditionBar.jsx
 * @description Thin horizontal bar showing player confidence or energy
 * @module components/shared/ConditionBar
 */

import React from 'react';

/**
 * ConditionBar - Displays a thin horizontal bar for confidence or energy
 * @param {Object} props
 * @param {'confidence' | 'energy'} props.type - Type of condition
 * @param {number} props.value - Value (0-100)
 * @param {boolean} [props.showValue=false] - Show numeric value
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.width='w-[60px]'] - Width class for the bar
 * @param {string} [props.height='h-1'] - Height class for the bar
 * @param {string} [props.tooltip] - Optional tooltip text to override default
 * @returns {JSX.Element}
 */
export default function ConditionBar({ type, value, showValue = false, className = '', width = 'w-[60px]', height = 'h-1', tooltip }) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Determine color based on type
  // Green (#22C55E) for energy, Gold (#D4AF37) for confidence
  const barColor = type === 'energy' ? '#22C55E' : '#D4AF37';

  // Calculate opacity based on value (0.3 to 1.0)
  const opacity = 0.3 + (clampedValue / 100) * 0.7;

  // Determine tooltip text
  const tooltipText = tooltip || `${type === 'energy' ? 'Energy' : 'Confidence'}: ${Math.round(clampedValue)}`;

  return (
    <div
      className={`relative flex items-center gap-1.5 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Bar container */}
      <div
        className={`relative ${width} ${height} bg-gray-700 rounded-sm overflow-hidden`}
      >
        {/* Filled portion */}
        <div
          className="absolute top-0 left-0 h-full transition-all duration-300 ease-out"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: barColor,
            opacity: opacity
          }}
        />
      </div>

      {/* Optional numeric value */}
      {showValue && (
        <span className="text-xs text-gray-400 w-6 text-right font-mono">
          {Math.round(clampedValue)}
        </span>
      )}

      {/* Custom Tooltip */}
      {isHovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50 pointer-events-none border border-gray-700">
          {tooltipText}
        </div>
      )}
    </div>
  );
}
