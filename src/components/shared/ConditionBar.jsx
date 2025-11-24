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
 * @returns {JSX.Element}
 */
export default function ConditionBar({ type, value, showValue = false, className = '' }) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Determine color based on type
  // Green (#22C55E) for energy, Gold (#D4AF37) for confidence
  const barColor = type === 'energy' ? '#22C55E' : '#D4AF37';

  // Calculate opacity based on value (0.3 to 1.0)
  const opacity = 0.3 + (clampedValue / 100) * 0.7;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Bar container */}
      <div
        className="relative w-[60px] h-1 bg-gray-700 rounded-sm overflow-hidden"
        title={`${type === 'energy' ? 'Energy' : 'Confidence'}: ${Math.round(clampedValue)}`}
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
    </div>
  );
}
