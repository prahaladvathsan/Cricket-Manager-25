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

  const { updateSquadSelection, updatePlaystyleOverride } = useTeamStore();
  const { players } = usePlayerStore();

  // Subscribe to team tactics changes to ensure UI updates reactively
  const teamTactics = useTeamStore((state) => state.teamTactics[teamId]);
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

  const handleFieldingPlaystyleChange = (playerId, playstyle) => {
    const player = players[playerId];
    const currentOverride = teamTactics?.playstyleOverrides[playerId];

    // If selecting primary playstyle, remove fielding override (keep batting if exists)
    if (playstyle === player.primaryPlaystyle.fielding) {
      if (currentOverride?.batting) {
        updatePlaystyleOverride(teamId, playerId, { batting: currentOverride.batting, fielding: null });
      } else {
        updatePlaystyleOverride(teamId, playerId, null);
      }
    } else {
      updatePlaystyleOverride(teamId, playerId, { fielding: playstyle });
    }
  };

  // Get available batting playstyles for a player (all playstyles, sorted by rating)
  const getAvailableBattingPlaystyles = (player) => {
    if (!player.playstyleRatings?.batting) return [];

    return Object.entries(player.playstyleRatings.batting)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rating]) => ({ name, rating }));
  };

  // Get available bowling playstyles for a player (all playstyles, sorted by rating)
  const getAvailableBowlingPlaystyles = (player) => {
    if (!player.playstyleRatings?.bowling) return [];

    return Object.entries(player.playstyleRatings.bowling)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rating]) => ({ name, rating }));
  };

  // Get available fielding playstyles for a player (all playstyles, sorted by rating)
  const getAvailableFieldingPlaystyles = (player) => {
    if (!player.playstyleRatings?.fielding) return [];

    return Object.entries(player.playstyleRatings.fielding)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rating]) => ({ name, rating }));
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'batsman': return 'text-blue-400';
      case 'bowler': return 'text-red-400';
      case 'all-rounder': return 'text-purple-400';
      case 'wicket-keeper': return 'text-cyan-400';
      default: return 'text-text-secondary';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500/20 text-blue-400';
      case 'bowler': return 'bg-red-500/20 text-red-400';
      case 'all-rounder': return 'bg-purple-500/20 text-purple-400';
      case 'wicket-keeper': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-bg-tertiary text-text-secondary';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Left Column: Available Squad */}
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1.5">
          <UsersIcon className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">
            Available Squad
          </h3>
          <span className="ml-auto text-xs text-text-secondary">
            {availablePlayers.length} players
          </span>
        </div>

        {/* Filters */}
        <div className="space-y-1.5 mb-2">
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
        <div className="flex flex-col gap-1 overflow-y-auto">
          {availablePlayers.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-4">
              {searchTerm || roleFilter !== 'all' ? 'No players match filters' : 'All players selected'}
            </p>
          ) : (
            availablePlayers.map(player => {
              const availableBattingPlaystyles = getAvailableBattingPlaystyles(player);
              const availableBowlingPlaystyles = getAvailableBowlingPlaystyles(player);
              const availableFieldingPlaystyles = getAvailableFieldingPlaystyles(player);
              const overrides = teamTactics?.playstyleOverrides?.[player.id];
              const currentBattingPlaystyle = overrides?.batting || player.primaryPlaystyle?.batting || '';
              const currentBowlingPlaystyle = overrides?.bowling || player.primaryPlaystyle?.bowling || '';
              const currentFieldingPlaystyle = overrides?.fielding || player.primaryPlaystyle?.fielding || '';
              const isBattingPrimary = currentBattingPlaystyle === player.primaryPlaystyle?.batting;
              const isBowlingPrimary = currentBowlingPlaystyle === player.primaryPlaystyle?.bowling;
              const isFieldingPrimary = currentFieldingPlaystyle === player.primaryPlaystyle?.fielding;

              return (
                <div
                  key={player.id}
                  className="p-1.5 bg-bg-tertiary rounded"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium">
                          <PlayerName playerId={player.id} player={player} className="text-sm font-medium" />
                        </div>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${getRoleBadgeColor(player.role)}`}>
                          {player.role}
                        </span>
                        {player.condition?.injury && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400" title={`${player.condition.injury} injury - ${player.condition.injuryDuration} days remaining`}>
                            🔴 Injured {player.condition.injuryDuration}d
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddPlayer(player.id)}
                      className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      title="Add to playing XI"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playstyle Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Batting Playstyle */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-0.5">
                        Batting
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

                    {/* Fielding Playstyle (for wicket-keepers) OR Bowling Playstyle (for others) */}
                    {player.role === 'wicket-keeper' ? (
                      player.topPlaystyles?.fielding?.[0] && (
                        <div>
                          <label className="block text-xs text-text-secondary mb-0.5">
                            Fielding
                          </label>
                          <div className="px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary">
                            {player.topPlaystyles.fielding[0].name} ({player.topPlaystyles.fielding[0].rating.toFixed(0)}) ⭐
                          </div>
                        </div>
                      )
                    ) : (
                      <div>
                        <label className="block text-xs text-text-secondary mb-0.5">
                          Bowling
                        </label>
                        {availableBowlingPlaystyles.length > 0 ? (
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
                        ) : (
                          <div className="text-xs text-text-tertiary italic">No data</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Selected Playing XI */}
      <div className="card pt-3 px-3 pb-0">
        <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1.5">
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
        <div className="mb-2 space-y-0.5">
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
          {selectedPlayers.filter(p => p.condition?.injury).length > 0 && (
            <p className="text-xs text-red-400 font-semibold">🔴 WARNING: {selectedPlayers.filter(p => p.condition?.injury).length} injured player(s) in playing XI!</p>
          )}
        </div>

        {/* Selected Players List */}
        <div className="flex flex-col gap-1 overflow-y-auto">
          {selectedPlayers.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-4">
              No players selected yet
            </p>
          ) : (
            selectedPlayers.map((player, idx) => {
              const availableBattingPlaystyles = getAvailableBattingPlaystyles(player);
              const availableBowlingPlaystyles = getAvailableBowlingPlaystyles(player);
              const availableFieldingPlaystyles = getAvailableFieldingPlaystyles(player);
              const overrides = teamTactics?.playstyleOverrides?.[player.id];
              const currentBattingPlaystyle = overrides?.batting || player.primaryPlaystyle?.batting || '';
              const currentBowlingPlaystyle = overrides?.bowling || player.primaryPlaystyle?.bowling || '';
              const currentFieldingPlaystyle = overrides?.fielding || player.primaryPlaystyle?.fielding || '';
              const isBattingPrimary = currentBattingPlaystyle === player.primaryPlaystyle?.batting;
              const isBowlingPrimary = currentBowlingPlaystyle === player.primaryPlaystyle?.bowling;
              const isFieldingPrimary = currentFieldingPlaystyle === player.primaryPlaystyle?.fielding;

              return (
                <div
                  key={player.id}
                  className="p-1.5 bg-bg-tertiary rounded"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-xs text-text-secondary font-mono min-w-[20px]">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium">
                          <PlayerName playerId={player.id} player={player} className="text-sm font-medium" />
                        </div>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${getRoleBadgeColor(player.role)}`}>
                          {player.role}
                        </span>
                        {player.condition?.injury && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400 font-semibold" title={`${player.condition.injury} injury - ${player.condition.injuryDuration} days remaining`}>
                            ⚠ Injured {player.condition.injuryDuration}d
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove from playing XI"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playstyle Selectors */}
                  <div className="ml-5 grid grid-cols-2 gap-2">
                    {/* Batting Playstyle */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-0.5">
                        Batting
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

                    {/* Fielding Playstyle (for wicket-keepers) OR Bowling Playstyle (for others) */}
                    {player.role === 'wicket-keeper' ? (
                      player.topPlaystyles?.fielding?.[0] && (
                        <div>
                          <label className="block text-xs text-text-secondary mb-0.5">
                            Fielding
                          </label>
                          <div className="px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary">
                            {player.topPlaystyles.fielding[0].name} ({player.topPlaystyles.fielding[0].rating.toFixed(0)}) ⭐
                          </div>
                        </div>
                      )
                    ) : (
                      <div>
                        <label className="block text-xs text-text-secondary mb-0.5">
                          Bowling
                        </label>
                        {availableBowlingPlaystyles.length > 0 ? (
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
                        ) : (
                          <div className="text-xs text-text-tertiary italic">No data</div>
                        )}
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
