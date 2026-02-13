/**
 * BattingAccelerationPanel - Enhanced batting acceleration tier controls
 *
 * Features:
 * - 6-tier acceleration system (Blockade → Hit Out/Get Out)
 * - Control striker and non-striker acceleration independently
 * - Auto/Manual mode toggle
 * - Full batting order display with drag-and-drop reordering
 * - Freeze logic for batted/dismissed players
 * - Player role badges
 * - Match situation info (RRR, phase, AI suggestions)
 */

import React, { useState } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import usePlayerStore from '../../../../stores/playerStore';
import useTeamStore from '../../../../stores/teamStore';
import { TrendingUp, Zap, Shield, GripVertical } from 'lucide-react';
import PlayerName from '../../../shared/PlayerName';
import ConditionBar from '../../../shared/ConditionBar';

// Acceleration tiers in order
const ACCELERATION_TIERS = [
  { id: 'Blockade', label: 'Blockade', color: 'bg-blue-600', icon: Shield },
  { id: 'Build', label: 'Build', color: 'bg-blue-500', icon: Shield },
  { id: 'Rotate', label: 'Rotate', color: 'bg-green-500', icon: TrendingUp },
  { id: 'Cruise', label: 'Cruise', color: 'bg-yellow-500', icon: TrendingUp },
  { id: 'Blitz', label: 'Blitz', color: 'bg-orange-500', icon: Zap },
  { id: 'Hit Out/Get Out', label: 'Hit Out', color: 'bg-red-500', icon: Zap },
];

// Player role configuration
const ROLE_CONFIG = {
  batsman: { label: 'Bat', color: 'bg-blue-600' },
  bowler: { label: 'Bowl', color: 'bg-red-600' },
  'all-rounder': { label: 'AR', color: 'bg-purple-600' },
  'wicket-keeper': { label: 'WK', color: 'bg-cyan-600' },
};

/**
 * Role badge component
 */
const RoleBadge = ({ role }) => {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG['batsman'];
  return (
    <span className={`px-1.5 py-0.5 text-xs font-semibold ${config.color} text-white rounded`}>
      {config.label}
    </span>
  );
};

/**
 * Compact tier selector dropdown component
 */
const TierSelector = ({ currentTier, playerId, isAtCrease, disabled }) => {
  const userTeamId = useTeamStore(state => state.userTeamId);
  const innings = useMatchStore(state => state.innings);
  const updateTacticsState = useMatchStore(state => state.updateTacticsState);
  const updateAccelerationTier = useTeamStore(state => state.updateAccelerationTier);
  const currentAcceleration = useMatchStore(state => state.tacticsState?.currentAcceleration || {});

  const handleTierChange = (newTier) => {
    if (disabled) return;

    console.log('[TierSelector] Changing tier for player:', playerId, 'from', currentTier, 'to', newTier, 'isAtCrease:', isAtCrease);

    // If player is at crease, update current acceleration in match state
    if (isAtCrease) {
      const isStriker = innings.striker === playerId;
      const playerType = isStriker ? 'striker' : 'nonStriker';

      console.log('[TierSelector] Updating current acceleration for', playerType);
      updateTacticsState({
        currentAcceleration: {
          ...currentAcceleration,
          [playerType]: newTier
        }
      });
    }

    // Always update the default tier in team tactics for this player
    // This ensures when they come in to bat, their tier is remembered
    console.log('[TierSelector] Updating acceleration tier in team tactics for', userTeamId, playerId);
    updateAccelerationTier(userTeamId, playerId, newTier);
  };

  const currentTierData = ACCELERATION_TIERS.find(t => t.id === currentTier) || ACCELERATION_TIERS[2];

  return (
    <div className="relative">
      <select
        value={currentTier}
        onChange={(e) => handleTierChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-1 py-0.5 text-xs font-medium rounded border transition-colors ${
          disabled
            ? 'bg-bg-tertiary text-text-secondary border-border-primary cursor-not-allowed opacity-50'
            : 'bg-bg-tertiary text-text-primary border-border-primary hover:border-cricket-accent cursor-pointer'
        }`}
      >
        {ACCELERATION_TIERS.map(tier => (
          <option key={tier.id} value={tier.id}>
            {tier.label}
          </option>
        ))}
      </select>

      {/* Color indicator */}
      <div className={`absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${currentTierData.color} pointer-events-none`} />
    </div>
  );
};

/**
 * Main BattingAccelerationPanel component
 */
export default function BattingAccelerationPanel() {
  const innings = useMatchStore(state => state.innings);
  const tacticsState = useMatchStore(state => state.tacticsState);
  const ballByBall = useMatchStore(state => state.ballByBall);
  const matchConditions = useMatchStore(state => state.matchConditions);
  const updateTacticsState = useMatchStore(state => state.updateTacticsState);
  const getPlayer = usePlayerStore(state => state.getPlayer);

  const userTeamId = useTeamStore(state => state.userTeamId);
  const striker = innings?.striker;
  const nonStriker = innings?.nonStriker;
  const battedPlayers = innings?.battedPlayers || [];

  // Get team tactics for user's team (since this tab only shows when user is batting)
  const { getTeamTactics, updateBattingOrder } = useTeamStore();
  const teamTactics = getTeamTactics(userTeamId);
  const battingOrder = teamTactics?.battingOrder || [];
  const accelerationTiers = teamTactics?.accelerationTiers || {};

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState(null);

  const accelerationMode = tacticsState?.accelerationMode || 'auto';
  const currentAcceleration = tacticsState?.currentAcceleration || {
    striker: 'Rotate',
    nonStriker: 'Rotate'
  };

  // Calculate dismissed players from ball-by-ball data
  const dismissedPlayers = ballByBall
    ?.filter(ball => ball.isWicket && ball.wicketType !== 'run out')
    .map(ball => ball.batsmanId) || [];

  // Combine batted and dismissed for freeze logic
  const frozenPlayers = [...new Set([...battedPlayers, ...dismissedPlayers])];

  // Toggle between Auto and Manual mode
  const toggleMode = () => {
    const newMode = accelerationMode === 'auto' ? 'manual' : 'auto';
    updateTacticsState({ accelerationMode: newMode });
  };

  // Drag-and-drop handlers
  const handleDragStart = (e, index) => {
    // Don't allow dragging batsmen who are at crease or have already batted
    const playerId = battingOrder[index];
    const isAtCrease = playerId === striker || playerId === nonStriker;
    const isFrozen = frozenPlayers.includes(playerId);

    if (isAtCrease || isFrozen) {
      e.preventDefault();
      return;
    }

    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    // Don't allow dropping on frozen positions
    const targetPlayerId = battingOrder[dropIndex];
    const isTargetAtCrease = targetPlayerId === striker || targetPlayerId === nonStriker;
    const isTargetFrozen = frozenPlayers.includes(targetPlayerId);

    if (isTargetAtCrease || isTargetFrozen) {
      setDraggedIndex(null);
      return;
    }

    // Reorder batting order
    const newBattingOrder = [...battingOrder];
    const [draggedPlayer] = newBattingOrder.splice(draggedIndex, 1);
    newBattingOrder.splice(dropIndex, 0, draggedPlayer);

    // Update team tactics
    updateBattingOrder(userTeamId, newBattingOrder);

    setDraggedIndex(null);
  };

  return (
    <div className="acceleration-panel space-y-1 overflow-y-auto scrollbar-hide" style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* CSS for webkit scrollbar hiding */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Auto Button */}
      <button
        onClick={toggleMode}
        className={`w-full px-2 py-1 text-xs font-medium rounded transition-colors ${
          accelerationMode === 'auto'
            ? 'bg-green-600 text-white'
            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border-primary'
        }`}
      >
        Auto
      </button>

      {/* Full Batting Order */}
      <div className="space-y-0">
        {battingOrder.map((playerId, index) => {
          const player = getPlayer(playerId);

          if (!player) return null;

          const position = index + 1;
          const isStriker = playerId === striker;
          const isNonStriker = playerId === nonStriker;
          const isAtCrease = isStriker || isNonStriker;
          const isDismissed = dismissedPlayers.includes(playerId);
          const isFrozen = frozenPlayers.includes(playerId);
          const isDraggable = !isAtCrease && !isFrozen;
          const isDragging = draggedIndex === index;

          // Get tier for this player
          const playerTier = isAtCrease
            ? (isStriker ? currentAcceleration.striker : currentAcceleration.nonStriker)
            : (accelerationTiers[playerId] || 'Rotate');

          return (
            <div
              key={playerId}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`px-1.5 py-1.5 border-b transition-all ${
                isAtCrease
                  ? 'bg-cricket-primary bg-opacity-20 border-cricket-primary'
                  : isFrozen
                  ? 'bg-bg-tertiary border-border-primary opacity-40'
                  : isDragging
                  ? 'bg-cricket-accent bg-opacity-20 border-cricket-accent'
                  : 'bg-bg-secondary border-border-primary hover:bg-bg-tertiary'
              } ${isDraggable ? 'cursor-move' : 'cursor-default'}`}
            >
              <div className="flex items-center gap-2">
                {/* Drag handle for upcoming batsmen */}
                {isDraggable && (
                  <GripVertical className="w-4 h-4 text-text-secondary flex-shrink-0" />
                )}

                {/* Position number */}
                <span className={`text-xs font-semibold w-4 ${
                  isAtCrease ? 'text-cricket-accent' : isFrozen ? 'text-text-tertiary' : 'text-text-secondary'
                }`}>
                  {position}
                </span>

                {/* Player name and condition bars */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <PlayerName playerId={playerId} />
                  {/* Condition bars */}
                  <div className="flex gap-1.5">
                    <ConditionBar
                      type="confidence"
                      value={matchConditions[playerId]?.confidence ?? 50}
                      showValue={false}
                    />
                    <ConditionBar
                      type="energy"
                      value={matchConditions[playerId]?.energy ?? 100}
                      showValue={false}
                    />
                  </div>
                </div>

                {/* Status indicator for dismissed */}
                {isDismissed && (
                  <span className="text-xs text-text-tertiary">Out</span>
                )}

                {/* Tier selector for non-dismissed players */}
                {!isDismissed && (
                  <div className="w-16">
                    <TierSelector
                      currentTier={playerTier}
                      playerId={playerId}
                      isAtCrease={isAtCrease}
                      disabled={accelerationMode === 'auto'}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
