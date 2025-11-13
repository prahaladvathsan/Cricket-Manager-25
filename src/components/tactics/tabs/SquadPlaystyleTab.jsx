/**
 * @file SquadPlaystyleTab.jsx
 * @description Tab for selecting playing XI and setting playstyle overrides
 */

import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Users as UsersIcon, UserCheck } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import { getPlayerRating, formatRating } from '../../../utils/ratingHelper';
import PlayerName from '../../shared/PlayerName';

const SquadPlaystyleTab = ({ teamId, teamPlayers, onPlayerClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { getTeamTactics, updateSquadSelection, updatePlaystyleOverride } = useTeamStore();
  const { players } = usePlayerStore();

  const teamTactics = getTeamTactics(teamId);
  const selectedPlayerIds = teamTactics?.squadSelection || [];

  // Filter available players
  const availablePlayers = useMemo(() => {
    return teamPlayers
      .filter(p => !selectedPlayerIds.includes(p.id))
      .filter(p => {
        // Role filter
        if (roleFilter !== 'all' && p.role !== roleFilter) return false;

        // Search filter
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        return true;
      })
      .sort((a, b) => getPlayerRating(b) - getPlayerRating(a)); // Sort by primary playstyle rating
  }, [teamPlayers, selectedPlayerIds, roleFilter, searchTerm]);

  // Get selected players with details
  const selectedPlayers = useMemo(() => {
    return selectedPlayerIds
      .map(id => players[id])
      .filter(Boolean);
  }, [selectedPlayerIds, players]);

  const handleAddPlayer = (playerId) => {
    if (selectedPlayerIds.length >= 11) {
      alert('Squad is full (11 players maximum)');
      return;
    }

    const newSelection = [...selectedPlayerIds, playerId];
    updateSquadSelection(teamId, newSelection);
  };

  const handleRemovePlayer = (playerId) => {
    const newSelection = selectedPlayerIds.filter(id => id !== playerId);
    updateSquadSelection(teamId, newSelection);

    // Also remove playstyle override if it exists
    if (teamTactics?.playstyleOverrides[playerId]) {
      updatePlaystyleOverride(teamId, playerId, null);
    }
  };

  const handleBattingPlaystyleChange = (playerId, playstyle) => {
    const player = players[playerId];
    const currentOverride = teamTactics?.playstyleOverrides[playerId];

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

  const handleBowlingPlaystyleChange = (playerId, playstyle) => {
    const player = players[playerId];
    const currentOverride = teamTactics?.playstyleOverrides[playerId];

    // If selecting primary playstyle, remove bowling override (keep batting if exists)
    if (playstyle === player.primaryPlaystyle.bowling) {
      if (currentOverride?.batting) {
        updatePlaystyleOverride(teamId, playerId, { batting: currentOverride.batting, bowling: null });
      } else {
        updatePlaystyleOverride(teamId, playerId, null);
      }
    } else {
      updatePlaystyleOverride(teamId, playerId, { bowling: playstyle });
    }
  };

  // Get available batting playstyles for a player (rating > 40)
  const getAvailableBattingPlaystyles = (player) => {
    if (!player.playstyleRatings?.batting) return [];

    return Object.entries(player.playstyleRatings.batting)
      .filter(([_, rating]) => rating > 40)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rating]) => ({ name, rating }));
  };

  // Get available bowling playstyles for a player (rating > 40)
  const getAvailableBowlingPlaystyles = (player) => {
    if (!player.playstyleRatings?.bowling) return [];

    return Object.entries(player.playstyleRatings.bowling)
      .filter(([_, rating]) => rating > 40)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rating]) => ({ name, rating }));
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'batsman': return 'text-blue-400';
      case 'bowler': return 'text-red-400';
      case 'all-rounder': return 'text-purple-400';
      case 'wicket-keeper': return 'text-green-400';
      default: return 'text-text-secondary';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500/20 text-blue-400';
      case 'bowler': return 'bg-red-500/20 text-red-400';
      case 'all-rounder': return 'bg-purple-500/20 text-purple-400';
      case 'wicket-keeper': return 'bg-green-500/20 text-green-400';
      default: return 'bg-bg-tertiary text-text-secondary';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Column: Available Squad */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
          <UsersIcon className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">
            Available Squad
          </h3>
          <span className="ml-auto text-xs text-text-secondary">
            {availablePlayers.length} players
          </span>
        </div>

        {/* Filters */}
        <div className="space-y-2 mb-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
            />
          </div>

          {/* Role Filter */}
          <div className="flex gap-1">
            {['all', 'batsman', 'bowler', 'all-rounder', 'wicket-keeper'].map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  roleFilter === role
                    ? 'bg-cricket-accent/20 text-cricket-accent'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Available Players List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availablePlayers.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-4">
              {searchTerm || roleFilter !== 'all' ? 'No players match filters' : 'All players selected'}
            </p>
          ) : (
            availablePlayers.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-2 p-2 bg-bg-tertiary rounded hover:bg-bg-secondary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium truncate">
                      <PlayerName playerId={player.id} player={player} className="text-sm font-medium" />
                    </div>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${getRoleBadgeColor(player.role)}`}>
                      {player.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>Rating: {formatRating(getPlayerRating(player))}</span>
                    <span>•</span>
                    <span className="truncate">{player.primaryPlaystyle?.batting || 'N/A'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddPlayer(player.id)}
                  className="p-1.5 bg-cricket-accent/20 text-cricket-accent rounded hover:bg-cricket-accent/30 transition-colors"
                  title="Add to playing XI"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Selected Playing XI */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
          <UserCheck className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">
            Playing XI
          </h3>
          <span className={`ml-auto text-xs ${
            selectedPlayers.length === 11 ? 'text-text-positive' : 'text-text-secondary'
          }`}>
            {selectedPlayers.length}/11 selected
          </span>
        </div>

        {/* Validation Warnings */}
        <div className="mb-3 space-y-1">
          {selectedPlayers.length < 11 && (
            <p className="text-xs text-yellow-400">⚠ Select {11 - selectedPlayers.length} more player(s)</p>
          )}
          {selectedPlayers.length === 11 && (
            <>
              {selectedPlayers.filter(p => p.role === 'wicket-keeper').length === 0 && (
                <p className="text-xs text-red-400">⚠ No wicket-keeper selected</p>
              )}
              {selectedPlayers.filter(p => p.role === 'bowler' || p.role === 'all-rounder').length < 5 && (
                <p className="text-xs text-red-400">⚠ Need at least 5 bowling options</p>
              )}
            </>
          )}
        </div>

        {/* Selected Players List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {selectedPlayers.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-4">
              No players selected yet
            </p>
          ) : (
            selectedPlayers.map((player, idx) => {
              const availableBattingPlaystyles = getAvailableBattingPlaystyles(player);
              const availableBowlingPlaystyles = getAvailableBowlingPlaystyles(player);
              const overrides = teamTactics?.playstyleOverrides[player.id];
              const currentBattingPlaystyle = overrides?.batting || player.primaryPlaystyle?.batting;
              const currentBowlingPlaystyle = overrides?.bowling || player.primaryPlaystyle?.bowling;
              const isBattingPrimary = currentBattingPlaystyle === player.primaryPlaystyle?.batting;
              const isBowlingPrimary = currentBowlingPlaystyle === player.primaryPlaystyle?.bowling;

              return (
                <div
                  key={player.id}
                  className="p-2 bg-bg-tertiary rounded"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs text-text-secondary font-mono min-w-[20px]">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          <PlayerName playerId={player.id} player={player} className="text-sm font-medium" />
                        </div>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${getRoleBadgeColor(player.role)}`}>
                          {player.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                      title="Remove from playing XI"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playstyle Selectors */}
                  <div className="ml-6 space-y-2">
                    {/* Batting Playstyle */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        Batting Playstyle {!isBattingPrimary && <span className="text-yellow-400">(Override)</span>}
                      </label>
                      <select
                        value={currentBattingPlaystyle}
                        onChange={(e) => handleBattingPlaystyleChange(player.id, e.target.value)}
                        className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                      >
                        {availableBattingPlaystyles.map(({ name, rating }) => (
                          <option key={name} value={name}>
                            {name} ({rating.toFixed(0)})
                            {name === player.primaryPlaystyle?.batting && ' ⭐'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bowling Playstyle */}
                    {availableBowlingPlaystyles.length > 0 && (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Bowling Playstyle {!isBowlingPrimary && <span className="text-yellow-400">(Override)</span>}
                        </label>
                        <select
                          value={currentBowlingPlaystyle}
                          onChange={(e) => handleBowlingPlaystyleChange(player.id, e.target.value)}
                          className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                        >
                          {availableBowlingPlaystyles.map(({ name, rating }) => (
                            <option key={name} value={name}>
                              {name} ({rating.toFixed(0)})
                              {name === player.primaryPlaystyle?.bowling && ' ⭐'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SquadPlaystyleTab;
