/**
 * @file BattingOrderTab.jsx
 * @description Tab for setting batting order and acceleration tiers with drag-and-drop
 */

import React, { useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import HelpIcon from '../../shared/HelpIcon';
import tacticsConfig from '../../../data/config/tactics-config.json';
import { getPrimaryBattingRating, formatRating } from '../../../utils/ratingHelper';
import PlayerName from '../../shared/PlayerName';

const BattingOrderTab = ({ teamId, teamPlayers, onPlayerClick }) => {
  const { updateBattingOrder, updateAccelerationTier, updatePlaystyleOverride } = useTeamStore();
  const { players } = usePlayerStore();

  // Subscribe to team tactics changes to ensure UI updates reactively
  const teamTactics = useTeamStore((state) => state.teamTactics[teamId]);
  const battingOrder = teamTactics?.battingOrder || [];

  const [draggedIndex, setDraggedIndex] = useState(null);

  // Get acceleration tiers from config
  const accelerationTiers = useMemo(() => {
    if (!tacticsConfig?.accelerationTiers) return [];
    return Object.entries(tacticsConfig.accelerationTiers).map(([name, config]) => ({
      name,
      description: config.description
    }));
  }, []);

  // Get ordered players
  const orderedPlayers = useMemo(() => {
    return battingOrder
      .map(id => players[id])
      .filter(Boolean);
  }, [battingOrder, players]);

  // Get available batting playstyles for a player
  const getAvailableBattingPlaystyles = (player) => {
    if (!player.playstyleRatings?.batting) return [];

    return Object.entries(player.playstyleRatings.batting)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rating]) => ({ name, rating }));
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
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

    const newOrder = [...battingOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    updateBattingOrder(teamId, newOrder);
    setDraggedIndex(null);
  };

  const handleTierChange = (playerId, tier) => {
    updateAccelerationTier(teamId, playerId, tier);
  };

  const handleBattingPlaystyleChange = (playerId, playstyle) => {
    const player = players[playerId];
    const currentOverride = teamTactics?.playstyleOverrides?.[playerId];

    // If selecting primary playstyle, remove batting override (keep bowling if exists)
    if (playstyle === player.primaryPlaystyle.batting) {
      if (currentOverride?.bowling) {
        updatePlaystyleOverride(teamId, playerId, { batting: null, bowling: currentOverride.bowling });
      } else {
        updatePlaystyleOverride(teamId, playerId, null);
      }
    } else {
      updatePlaystyleOverride(teamId, playerId, { batting: playstyle });
    }
  };

  const getTierColor = (tierName) => {
    const tier = tierName.toLowerCase();
    if (tier.includes('blockade') || tier.includes('build')) return 'text-blue-400';
    if (tier.includes('rotate') || tier.includes('cruise')) return 'text-green-400';
    if (tier.includes('blitz') || tier.includes('hit out')) return 'text-red-400';
    return 'text-text-secondary';
  };

  const getPositionLabel = (index) => {
    if (index < 2) return 'Opener';
    if (index < 4) return 'Top';
    if (index < 6) return 'Middle';
    if (index < 8) return 'Lower';
    return 'Tail';
  };

  const getPositionColor = (index) => {
    if (index < 2) return 'bg-blue-500/20 text-blue-400';
    if (index < 4) return 'bg-green-500/20 text-green-400';
    if (index < 6) return 'bg-yellow-500/20 text-yellow-400';
    if (index < 8) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/20 text-red-400';
  };

  if (battingOrder.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-text-secondary">
          Please select 11 players in the Squad tab first
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary">
              Batting Order & Acceleration Tiers
            </h3>
            <HelpIcon width="w-4" height="h-4" tooltipClassName="min-w-[400px]">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">Setting Batting Order</h4>
                  <p className="mb-2">Match playstyles to positions. The position labels show recommended placements:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">Opener (1-2)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">Top (3-4)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">Middle (5-6)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">Lower (7-8)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">Tail (9-11)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">Acceleration Tiers</h4>
                  <p className="mb-2">Set each batter's aggression level:</p>
                  <div className="space-y-1 text-xs">
                    {accelerationTiers.map(({ name, description }) => (
                      <div key={name} className="flex items-start gap-2">
                        <span className={`font-medium whitespace-nowrap ${getTierColor(name)}`}>{name}:</span>
                        <span className="text-text-secondary">{description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </HelpIcon>
          </div>
          <span className="text-xs text-text-secondary">
            Drag to reorder | Configure playstyle & acceleration tier
          </span>
        </div>
      </div>

      {/* Batting Order List with Drag and Drop */}
      < div className="card p-3" >
        <div className="flex flex-col gap-1">
          {orderedPlayers.map((player, index) => {
            const currentTier = teamTactics?.accelerationTiers[player.id] || 'Rotate';
            const overrides = teamTactics?.playstyleOverrides?.[player.id];
            const battingPlaystyle = overrides?.batting || player.primaryPlaystyle?.batting || '';
            const battingRating = getPrimaryBattingRating(player);
            const isBattingPrimary = battingPlaystyle === player.primaryPlaystyle?.batting;
            const availableBattingPlaystyles = getAvailableBattingPlaystyles(player);
            const isDragging = draggedIndex === index;

            // Add special classes to first row for tutorial highlighting
            const isFirstRow = index === 0;

            return (
              <div
                key={player.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`${isFirstRow ? 'batting-order-row-first ' : ''}flex items-center gap-2 p-1 rounded transition-all ${isDragging
                  ? 'bg-cricket-primary/20 border border-cricket-accent'
                  : 'bg-bg-tertiary border border-transparent cursor-move hover:border-cricket-accent'
                  }`}
              >
                {/* Drag Handle */}
                <GripVertical className={`${isFirstRow ? 'batting-drag-handle ' : ''}w-4 h-4 text-text-secondary flex-shrink-0`} />

                {/* Position */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-text-primary font-mono w-5">
                    {index + 1}
                  </span>
                  <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${getPositionColor(index)}`}>
                    {getPositionLabel(index)}
                  </span>
                </div>

                {/* Player Name */}
                <div className="flex-1 min-w-0">
                  <PlayerName playerId={player.id} player={player} className="text-sm font-medium" />
                </div>

                {/* Batting Playstyle */}
                <select
                  value={battingPlaystyle}
                  onChange={(e) => handleBattingPlaystyleChange(player.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`${isFirstRow ? 'batting-playstyle-select ' : ''}w-[220px] px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent`}
                >
                  {availableBattingPlaystyles.map(({ name, rating }) => (
                    <option key={name} value={name}>
                      {name} ({rating.toFixed(0)})
                      {name === player.primaryPlaystyle?.batting && ' ⭐'}
                    </option>
                  ))}
                </select>

                {/* Acceleration Tier */}
                <select
                  value={currentTier}
                  onChange={(e) => handleTierChange(player.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`${isFirstRow ? 'batting-tier-select ' : ''}w-[140px] px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs font-medium focus:outline-none focus:border-cricket-accent ${getTierColor(currentTier)}`}
                >
                  {accelerationTiers.map(({ name, description }) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div >


    </div >
  );
};

export default BattingOrderTab;
