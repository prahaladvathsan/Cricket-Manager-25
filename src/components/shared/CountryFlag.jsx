/**
 * @file CountryFlag.jsx
 * @description Reusable country flag component for player nationalities
 */

import React from 'react';
import { FLAG_COMPONENTS } from '../../utils/flagRegistry';
import { getISOFromNationality } from '../../utils/nationalityMapper';

/**
 * CountryFlag Component
 * Displays flag icon for a given nationality
 *
 * @param {Object} props
 * @param {string} props.nationality - Full nationality name (e.g., 'Australia')
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.title] - Tooltip title (defaults to nationality)
 * @returns {JSX.Element|null} Flag component or fallback
 */
const CountryFlag = ({ nationality, className = 'w-6 h-4', title }) => {
  if (!nationality) return null;

  const isoCode = getISOFromNationality(nationality);

  // Handle West Indies special case (no official ISO code)
  if (nationality === 'West Indies') {
    return (
      <div
        className={`${className} bg-maroon-900 border border-maroon-700 rounded-sm flex items-center justify-center`}
        title={title || nationality}
      >
        <span className="text-[8px] font-bold text-white">WI</span>
      </div>
    );
  }

  if (!isoCode) {
    // Fallback for unknown nationalities - show initials
    const initials = nationality
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        className={`${className} bg-gray-700 border border-gray-600 rounded-sm flex items-center justify-center`}
        title={title || nationality}
      >
        <span className="text-[8px] font-bold text-gray-300">{initials}</span>
      </div>
    );
  }

  // Get the specific flag component from the registry (selective imports)
  const FlagComponent = FLAG_COMPONENTS[isoCode];

  if (!FlagComponent) {
    // Fallback if flag component doesn't exist
    return (
      <div
        className={`${className} bg-gray-700 border border-gray-600 rounded-sm`}
        title={title || nationality}
      />
    );
  }

  return (
    <div className={`${className} rounded-sm overflow-hidden border border-gray-600`} title={title || nationality}>
      <FlagComponent className="w-full h-full" />
    </div>
  );
};

export default CountryFlag;
