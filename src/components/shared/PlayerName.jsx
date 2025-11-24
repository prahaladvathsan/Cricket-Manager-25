/**
 * @file PlayerName.jsx
 * @description Reusable clickable player name component that opens PlayerCardModal
 * Use this component for ALL player name displays throughout the app to ensure
 * consistent clickable behavior and player card modal functionality.
 *
 * @example
 * // Simple usage with player ID
 * <PlayerName playerId="player-123" />
 *
 * @example
 * // With player object
 * <PlayerName player={playerObject} />
 *
 * @example
 * // With custom styling
 * <PlayerName playerId="player-123" className="font-bold text-lg" />
 *
 * @example
 * // Inline display (no wrapping)
 * <PlayerName playerId="player-123" inline={true} />
 */

import React, { useState, useMemo } from 'react';
import PlayerCardModal from './PlayerCardModal';
import usePlayerStore from '../../stores/playerStore';
import useMatchStore from '../../stores/matchStore';

/**
 * PlayerName Component - Clickable player name that opens player card modal
 *
 * @param {string} playerId - Player ID (required if player object not provided)
 * @param {Object} player - Player object (optional, will fetch from store if not provided)
 * @param {boolean} inline - Display inline without wrapping (default: true)
 * @param {string} className - Additional CSS classes
 * @param {boolean} showHoverEffect - Show hover underline effect (default: true)
 * @param {function} onBeforeOpen - Callback to execute before opening modal (e.g., to close parent modal)
 */
const PlayerName = ({
  playerId,
  player = null,
  inline = true,
  className = '',
  showHoverEffect = true,
  onBeforeOpen = null
}) => {
  const [showModal, setShowModal] = useState(false);
  const { players } = usePlayerStore();
  const matchConditions = useMatchStore(state => state.matchConditions);

  // Get player data from store
  const playerData = useMemo(() => {
    if (player) return player;
    if (playerId) {
      return players[playerId];
    }
    return null;
  }, [player, playerId, players]);

  // Get condition info for tooltip
  const conditionInfo = useMemo(() => {
    const actualPlayerId = playerId || playerData?.id;
    if (!actualPlayerId || !matchConditions || !matchConditions[actualPlayerId]) {
      return null;
    }
    const conditions = matchConditions[actualPlayerId];
    return {
      confidence: Math.round(conditions.confidence || 50),
      energy: Math.round(conditions.energy || 100)
    };
  }, [playerId, playerData, matchConditions]);

  if (!playerData) {
    // Fallback for missing player data
    return (
      <span className={`text-text-secondary ${className}`}>
        {playerId || 'Unknown Player'}
      </span>
    );
  }

  // Create tooltip text
  const tooltipText = conditionInfo
    ? `${playerData.name} | Confidence: ${conditionInfo.confidence} | Energy: ${conditionInfo.energy}`
    : `View ${playerData.name} details`;

  // Determine element type
  const ElementType = inline ? 'span' : 'div';

  return (
    <>
      <ElementType
        onClick={(e) => {
          e.stopPropagation();
          if (onBeforeOpen) {
            onBeforeOpen();
          }
          setShowModal(true);
        }}
        className={`
          text-cricket-accent
          cursor-pointer
          ${showHoverEffect ? 'hover:underline' : ''}
          transition-colors
          ${className}
        `}
        title={tooltipText}
      >
        {playerData.name}
      </ElementType>

      <PlayerCardModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        playerId={playerId || playerData.id}
      />
    </>
  );
};

export default PlayerName;
