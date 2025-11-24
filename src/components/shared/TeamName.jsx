/**
 * @file TeamName.jsx
 * @description Reusable clickable team name component that opens TeamCardModal
 * Use this component for ALL team name displays throughout the app to ensure
 * consistent clickable behavior and team card modal functionality.
 *
 * @example
 * // Simple usage with team ID
 * <TeamName teamId="mumbai-thunders" />
 *
 * @example
 * // With custom styling
 * <TeamName teamId="mumbai-thunders" className="font-bold text-lg" />
 *
 * @example
 * // Display short name
 * <TeamName teamId="mumbai-thunders" variant="short" />
 *
 * @example
 * // Inline display (no wrapping)
 * <TeamName teamId="mumbai-thunders" inline={true} />
 */

import React, { useState, useMemo } from 'react';
import TeamCardModal from './TeamCardModal';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';

/**
 * TeamName Component - Clickable team name that opens team card modal
 *
 * @param {string} teamId - Team ID (required)
 * @param {Object} team - Team object (optional, will fetch from stores if not provided)
 * @param {string} variant - Display variant: 'full' | 'short' (default: 'full')
 * @param {boolean} inline - Display inline without wrapping (default: false)
 * @param {string} className - Additional CSS classes
 * @param {boolean} showHoverEffect - Show hover underline effect (default: true)
 * @param {boolean} disableClick - Disable click handling (useful when inside clickable parent) (default: false)
 * @param {function} onBeforeOpen - Callback to execute before opening modal (e.g., to close parent modal)
 */
const TeamName = ({
  teamId,
  team = null,
  variant = 'full',
  inline = false,
  className = '',
  showHoverEffect = true,
  disableClick = false,
  onBeforeOpen = null
}) => {
  const [showModal, setShowModal] = useState(false);
  const { clubs } = useLeagueStore();
  const { getTeam } = useTeamStore();

  // Get team data from stores
  const teamData = useMemo(() => {
    if (team) return team;
    if (teamId) {
      return clubs[teamId] || getTeam(teamId);
    }
    return null;
  }, [team, teamId, clubs, getTeam]);

  if (!teamData) {
    // Fallback for missing team data
    return (
      <span className={`text-text-secondary ${className}`}>
        {teamId || 'Unknown Team'}
      </span>
    );
  }

  // Determine display name based on variant
  const displayName = variant === 'short' && teamData.shortName
    ? teamData.shortName
    : teamData.name;

  // Determine element type
  const ElementType = inline ? 'span' : 'div';

  return (
    <>
      <ElementType
        onClick={disableClick ? undefined : (e) => {
          e.stopPropagation();
          if (onBeforeOpen) {
            onBeforeOpen();
          }
          setShowModal(true);
        }}
        className={`
          text-cricket-accent
          ${disableClick ? '' : 'cursor-pointer'}
          ${showHoverEffect && !disableClick ? 'hover:underline' : ''}
          transition-colors
          ${className}
        `}
        title={disableClick ? undefined : `View ${teamData.name} details`}
      >
        {displayName}
      </ElementType>

      {!disableClick && (
        <TeamCardModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          teamId={teamId}
          team={teamData}
        />
      )}
    </>
  );
};

export default TeamName;
