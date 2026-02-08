import React, { useState } from 'react';
import { getPlaystyleAbbr, getPlaystyleFullName, getPlaystyleColor } from '../../utils/playstyleAbbreviations';

/**
 * PlaystyleBadge Component
 *
 * Displays playstyle abbreviations with hover tooltips showing full names.
 * Follows ConditionBar tooltip pattern with prefix-based color coding.
 *
 * @param {Object} props
 * @param {string} props.playstyle - Full playstyle name (e.g., "Opener - Slogger")
 * @param {number} [props.rating] - Optional rating value to display
 * @param {'inline'|'badge'} [props.variant='inline'] - Display mode
 * @param {string} [props.className] - Additional CSS classes
 */
const PlaystyleBadge = ({ playstyle, rating, variant = 'inline', className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!playstyle) return null;

  const abbreviation = getPlaystyleAbbr(playstyle);
  const fullName = getPlaystyleFullName(abbreviation);
  const colorScheme = getPlaystyleColor(abbreviation);

  // Build display text
  const displayText = rating !== undefined
    ? `${abbreviation} (${rating.toFixed(0)})`
    : abbreviation;

  // Variant-specific styling
  const variantClasses = variant === 'badge'
    ? `px-2 py-1 rounded ${colorScheme.bg} ${colorScheme.text}`
    : colorScheme.text;

  return (
    <span
      className={`relative inline-block font-mono text-xs ${variantClasses} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      aria-label={fullName}
    >
      {displayText}

      {/* Tooltip */}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50 pointer-events-none border border-gray-700 px-2 py-1">
          {fullName}
          {rating !== undefined && ` (${rating.toFixed(0)})`}
        </span>
      )}
    </span>
  );
};

export default PlaystyleBadge;
