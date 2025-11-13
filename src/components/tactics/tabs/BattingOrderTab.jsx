/**
 * @file BattingOrderTab.jsx
 * @description Tab for setting batting order and acceleration tiers
 */

import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import tacticsConfig from '../../../data/config/tactics-config.json';
import { getPrimaryBattingRating, formatRating } from '../../../utils/ratingHelper';
import PlayerName from '../../shared/PlayerName';

const BattingOrderTab = ({ teamId, teamPlayers, onPlayerClick }) => {
  const { getTeamTactics, updateBattingOrder, updateAccelerationTier } = useTeamStore();
  const { players } = usePlayerStore();

  const teamTactics = getTeamTactics(teamId);
  const battingOrder = teamTactics?.battingOrder || [];

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

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newOrder = [...battingOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    updateBattingOrder(teamId, newOrder);
  };

  const handleMoveDown = (index) => {
    if (index === battingOrder.length - 1) return;
    const newOrder = [...battingOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    updateBattingOrder(teamId, newOrder);
  };

  const handleTierChange = (playerId, tier) => {
    updateAccelerationTier(teamId, playerId, tier);
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
            <Info className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-base font-semibold text-text-primary">
              Batting Order & Acceleration Tiers
            </h3>
          </div>
          <span className="text-xs text-text-secondary">
            Use arrows to reorder | Set acceleration tier for each batsman
          </span>
        </div>
      </div>

      {/* Merged Batting Order List */}
      <div className="card p-3">
        <div className="space-y-2">
          {orderedPlayers.map((player, index) => {
            const currentTier = teamTactics?.accelerationTiers[player.id] || 'Rotate';
            const overrides = teamTactics?.playstyleOverrides?.[player.id];
            const battingPlaystyle = overrides?.batting || player.primaryPlaystyle?.batting;
            const battingRating = getPrimaryBattingRating(player);

            return (
              <div
                key={player.id}
                className="flex items-center gap-2 p-2 bg-bg-tertiary rounded hover:bg-bg-secondary transition-colors"
              >
                {/* Move Buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-bg-primary rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === battingOrder.length - 1}
                    className="p-0.5 hover:bg-bg-primary rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                </div>

                {/* Position */}
                <div className="flex flex-col items-center min-w-[50px]">
                  <span className="text-base font-bold text-text-primary font-mono">
                    {index + 1}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${getPositionColor(index)}`}>
                    {getPositionLabel(index)}
                  </span>
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">
                    <PlayerName playerId={player.id} player={player} className="text-sm font-medium" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-secondary truncate max-w-[200px]">
                      {battingPlaystyle}
                    </span>
                    <span className="text-cricket-accent font-mono font-semibold">
                      {formatRating(battingRating)}
                    </span>
                  </div>
                </div>

                {/* Acceleration Tier Dropdown */}
                <div className="min-w-[180px]">
                  <select
                    value={currentTier}
                    onChange={(e) => handleTierChange(player.id, e.target.value)}
                    className={`w-full px-2 py-1.5 bg-bg-secondary border border-border-primary rounded text-xs font-medium focus:outline-none focus:border-cricket-accent ${getTierColor(currentTier)}`}
                  >
                    {accelerationTiers.map(({ name, description }) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Position Labels */}
          <div>
            <p className="text-xs font-semibold text-text-primary mb-2">Position Labels:</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">Opener</span>
                <span className="text-text-secondary">1-2</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">Top</span>
                <span className="text-text-secondary">3-4</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">Middle</span>
                <span className="text-text-secondary">5-6</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">Lower</span>
                <span className="text-text-secondary">7-8</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">Tail</span>
                <span className="text-text-secondary">9-11</span>
              </div>
            </div>
          </div>

          {/* Acceleration Tier Guide */}
          <div>
            <p className="text-xs font-semibold text-text-primary mb-2">Acceleration Guide:</p>
            <div className="space-y-1 text-xs">
              {accelerationTiers.map(({ name, description }) => (
                <div key={name} className="flex items-start gap-2">
                  <span className={`font-medium ${getTierColor(name)}`}>{name}:</span>
                  <span className="text-text-secondary flex-1">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattingOrderTab;
