/**
 * @file OverviewTab.jsx
 * @description Overview tab showing complete team tactics at a glance
 */

import React, { useMemo } from 'react';
import { Target, Activity, Shield } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import { getPrimaryBattingRating, getPrimaryBowlingRating } from '../../../utils/ratingHelper';
import PlayerName from '../../shared/PlayerName';

const OverviewTab = ({ teamId, teamPlayers, onPlayerClick }) => {
  const { updateCaptain, updateViceCaptain, updateWicketKeeper } = useTeamStore();
  const { players } = usePlayerStore();

  // Subscribe to team tactics changes to ensure UI updates reactively
  const teamTactics = useTeamStore((state) => state.teamTactics[teamId]);
  const battingOrder = teamTactics?.battingOrder || [];

  // Convert overAssignments object { 1: 'id', 2: 'id', ... } to array
  const overAssignments = useMemo(() => {
    const assignmentsObj = teamTactics?.overAssignments || {};
    return Array.from({ length: 20 }, (_, i) => assignmentsObj[i + 1] || null);
  }, [teamTactics?.overAssignments]);

  // Get ordered batsmen
  const orderedBatsmen = useMemo(() => {
    return battingOrder
      .map(id => players[id])
      .filter(Boolean);
  }, [battingOrder, players]);

  // Get all bowlers from playing XI with their over assignments
  const allBowlers = useMemo(() => {
    const selectedIds = teamTactics?.squadSelection || [];
    const allPlayers = selectedIds.map(id => players[id]).filter(Boolean);

    // Categorize bowlers
    const bowlers = [];
    allPlayers.forEach(player => {
      const isPrimary = player.role === 'bowler' || player.role === 'all-rounder';
      const bowlingRating = getPrimaryBowlingRating(player);

      if (isPrimary || bowlingRating > 40) {
        bowlers.push(player);
      }
    });

    // Sort by bowling rating
    bowlers.sort((a, b) => getPrimaryBowlingRating(b) - getPrimaryBowlingRating(a));

    // Calculate overs for each bowler
    const bowlerOvers = {};
    overAssignments.forEach((playerId, index) => {
      if (playerId) {
        if (!bowlerOvers[playerId]) {
          bowlerOvers[playerId] = [];
        }
        bowlerOvers[playerId].push(index + 1); // Over numbers (1-20)
      }
    });

    // Return bowlers with their overs
    return bowlers.map(player => ({
      player,
      overs: (bowlerOvers[player.id] || []).sort((a, b) => a - b)
    }));
  }, [teamTactics?.squadSelection, overAssignments, players]);

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

  const getTierColor = (tierName) => {
    const tier = tierName.toLowerCase();
    if (tier.includes('blockade') || tier.includes('build')) return 'text-blue-400';
    if (tier.includes('rotate') || tier.includes('cruise')) return 'text-green-400';
    if (tier.includes('blitz') || tier.includes('hit out')) return 'text-red-400';
    return 'text-text-secondary';
  };

  if (battingOrder.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-text-secondary">
          Please configure your tactics in the other tabs first
        </p>
      </div>
    );
  }

  // Get fielding setup info
  const fieldingSetup = useMemo(() => {
    const powerplayPositions = teamTactics?.fielding?.powerplay?.positions || [];
    const postPowerplayPositions = teamTactics?.fielding?.postPowerplay?.positions || [];
    const powerplayAssignments = teamTactics?.fielding?.powerplay?.playerAssignments || {};
    const postPowerplayAssignments = teamTactics?.fielding?.postPowerplay?.playerAssignments || {};

    const INNER_CIRCLE_RADIUS = 30;

    const categorizePositions = (positions) => {
      let close = 0, circle = 0, boundary = 0;
      positions.forEach((pos, idx) => {
        if (idx === 0 || idx === 1) return; // Skip bowler and keeper
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        if (distance < 15) close++;
        else if (distance <= INNER_CIRCLE_RADIUS) circle++;
        else boundary++;
      });
      return { close, circle, boundary };
    };

    return {
      powerplay: categorizePositions(powerplayPositions),
      postPowerplay: categorizePositions(postPowerplayPositions),
      powerplayAssignments,
      postPowerplayAssignments,
      powerplayPositions,
      postPowerplayPositions
    };
  }, [teamTactics?.fielding]);

  // Get all players in playing XI for fielding display (keeper at top, then others)
  const fieldingPlayers = useMemo(() => {
    const squadSelection = teamTactics?.squadSelection || [];
    const allPlayers = squadSelection
      .map(id => players[id])
      .filter(p => p);

    // Separate keeper and non-keepers
    const keeper = allPlayers.find(p => p.role === 'Wicketkeeper' || p.primaryRole === 'Wicketkeeper');
    const nonKeepers = allPlayers.filter(p => p.role !== 'Wicketkeeper' && p.primaryRole !== 'Wicketkeeper');

    // Return keeper first, then others
    return keeper ? [keeper, ...nonKeepers] : allPlayers;
  }, [teamTactics?.squadSelection, players]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2">
      {/* Batting Overview */}
      <div className="card p-2 lg:col-span-2">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-border-primary">
          <Target className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Batting Order</h3>
        </div>

        {/* 4-column table */}
        <div className="space-y-0.5">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-1 text-xs font-semibold text-text-secondary mb-1">
            <div>#</div>
            <div>Name</div>
            <div>Playstyle</div>
            <div>Tier</div>
          </div>

          {/* Rows */}
          {orderedBatsmen.map((player, index) => {
            const currentTier = teamTactics?.accelerationTiers[player.id] || 'Rotate';
            const overrides = teamTactics?.playstyleOverrides?.[player.id];

            // Get batting playstyle - check override, then primary, then top playstyle
            let battingPlaystyle = overrides?.batting || player.primaryPlaystyle?.batting;

            // If no primary playstyle, get the highest rated batting playstyle
            if (!battingPlaystyle && player.playstyleRatings?.batting) {
              const topBattingPlaystyle = Object.entries(player.playstyleRatings.batting)
                .sort((a, b) => b[1] - a[1])[0];
              if (topBattingPlaystyle) {
                battingPlaystyle = topBattingPlaystyle[0];
              }
            }

            // Get rating for the active playstyle (not just primary)
            const battingRating = battingPlaystyle && player.playstyleRatings?.batting?.[battingPlaystyle]
              ? player.playstyleRatings.batting[battingPlaystyle]
              : 0;

            return (
              <div key={player.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-1 p-0.5 bg-bg-tertiary rounded text-xs">
                <div className="font-mono font-bold text-text-primary w-5">{index + 1}</div>
                <div className="truncate text-text-primary">
                  <PlayerName playerId={player.id} player={player} />
                </div>
                <div className="text-text-secondary truncate">
                  {battingPlaystyle ? `${battingPlaystyle} (${battingRating.toFixed(0)})` : 'N/A'}
                </div>
                <div className={`truncate ${getTierColor(currentTier)}`}>
                  {currentTier}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bowling Overview - Reduced width */}
      <div className="card p-2 lg:col-span-2">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-border-primary">
          <Activity className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Bowling Rotation</h3>
        </div>
        <div className="space-y-1">
          {allBowlers.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">
              No bowlers in playing XI
            </p>
          ) : (
            allBowlers.map(({ player, overs }) => {
              const overrides = teamTactics?.playstyleOverrides?.[player.id];
              const bowlingPlaystyle = overrides?.bowling || player.primaryPlaystyle?.bowling;

              // Get rating for the active playstyle (not just primary)
              const bowlingRating = bowlingPlaystyle && player.playstyleRatings?.bowling?.[bowlingPlaystyle]
                ? player.playstyleRatings.bowling[bowlingPlaystyle]
                : 0;

              const currentPlans = teamTactics?.bowlingPlans[player.id];

              // If no plans, skip this bowler
              if (!currentPlans) {
                return null;
              }

              return (
                <div
                  key={player.id}
                  className="p-0.5 bg-bg-tertiary rounded space-y-0.5"
                >
                  {/* Row 1: Name, Playstyle, Overs */}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-xs">
                    <div className="truncate text-text-primary">
                      <PlayerName playerId={player.id} player={player} />
                    </div>
                    <div className="text-text-secondary truncate">
                      {bowlingPlaystyle} ({bowlingRating.toFixed(0)})
                    </div>
                    <div className={`font-mono whitespace-nowrap ${overs.length > 0 ? 'text-cricket-accent' : 'text-text-tertiary'}`}>
                      {overs.length > 0 ? `${overs.length} ov` : '—'}
                    </div>
                  </div>

                  {/* Row 2: Line/Length, Variation, Over numbers */}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-xs text-text-secondary">
                    <div className="truncate">
                      {currentPlans.lineLength}
                    </div>
                    <div className="truncate">
                      {currentPlans.variation}
                    </div>
                    <div className="text-text-tertiary whitespace-nowrap">
                      {overs.length > 0 ? overs.join(', ') : 'None'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Fielding Setup */}
      <div className="card p-2 lg:col-span-2">
        <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Fielding Setup</h3>
          </div>
          {/* Summary at top */}
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-text-secondary">PP:</span>
              <span className="font-mono text-red-400">{fieldingSetup.powerplay.close}</span>
              <span className="text-text-tertiary">•</span>
              <span className="font-mono text-green-400">{fieldingSetup.powerplay.circle}</span>
              <span className="text-text-tertiary">•</span>
              <span className="font-mono text-blue-400">{fieldingSetup.powerplay.boundary}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-text-secondary">Norm:</span>
              <span className="font-mono text-red-400">{fieldingSetup.postPowerplay.close}</span>
              <span className="text-text-tertiary">•</span>
              <span className="font-mono text-green-400">{fieldingSetup.postPowerplay.circle}</span>
              <span className="text-text-tertiary">•</span>
              <span className="font-mono text-blue-400">{fieldingSetup.postPowerplay.boundary}</span>
            </div>
          </div>
        </div>

        {/* 3-column table */}
        <div className="space-y-0.5">
          {/* Header */}
          <div className="grid grid-cols-3 gap-1 text-xs font-semibold text-text-secondary mb-1">
            <div>Player</div>
            <div>Powerplay</div>
            <div>Normal</div>
          </div>

          {/* Rows */}
          {fieldingPlayers.slice(0, 11).map((player, idx) => {
            // Find which position this player is assigned to
            const ppPositionIndex = Object.entries(fieldingSetup.powerplayAssignments)
              .find(([pos, playerId]) => playerId === player.id)?.[0];
            const normPositionIndex = Object.entries(fieldingSetup.postPowerplayAssignments)
              .find(([pos, playerId]) => playerId === player.id)?.[0];

            const ppPosition = ppPositionIndex
              ? fieldingSetup.powerplayPositions[parseInt(ppPositionIndex)]
              : null;
            const normPosition = normPositionIndex
              ? fieldingSetup.postPowerplayPositions[parseInt(normPositionIndex)]
              : null;

            return (
              <div key={player.id} className="grid grid-cols-3 gap-1 p-0.5 bg-bg-tertiary rounded text-xs">
                <div className="truncate text-text-primary">
                  <PlayerName playerId={player.id} player={player} />
                </div>
                <div className="text-text-secondary truncate">
                  {ppPosition?.name?.replace(/_/g, ' ') || 'Auto'}
                </div>
                <div className="text-text-secondary truncate">
                  {normPosition?.name?.replace(/_/g, ' ') || 'Auto'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Assignment */}
      <div className="card p-2 lg:col-span-6">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-border-primary">
          <Shield className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Role Assignment</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Wicket-keeper */}
          <div className="p-1.5 bg-bg-tertiary rounded">
            <label className="block text-xs text-text-secondary mb-1">Wicket-keeper</label>
            <select
              value={teamTactics?.wicketKeeper || ''}
              onChange={(e) => updateWicketKeeper(teamId, e.target.value || null)}
              className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
            >
              <option value="">Select keeper...</option>
              {orderedBatsmen
                .filter(p => p.role === 'wicket-keeper')
                .map(player => {
                  const keeperRating = player.playstyleRatings?.fielding?.Wicketkeeper || 0;
                  return (
                    <option key={player.id} value={player.id}>
                      {player.name} ({Math.round(keeperRating)})
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Captain */}
          <div className="p-1.5 bg-bg-tertiary rounded">
            <label className="block text-xs text-text-secondary mb-1">Captain</label>
            <select
              value={teamTactics?.captain || ''}
              onChange={(e) => updateCaptain(teamId, e.target.value || null)}
              className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
            >
              <option value="">Select captain...</option>
              {orderedBatsmen.map(player => {
                const leadership = player.attributes?.mental?.leadership || 0;
                return (
                  <option key={player.id} value={player.id}>
                    {player.name} ({leadership})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Vice-Captain */}
          <div className="p-1.5 bg-bg-tertiary rounded">
            <label className="block text-xs text-text-secondary mb-1">Vice-Captain</label>
            <select
              value={teamTactics?.viceCaptain || ''}
              onChange={(e) => updateViceCaptain(teamId, e.target.value || null)}
              className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
              disabled={!teamTactics?.captain}
            >
              <option value="">Select vice-captain...</option>
              {orderedBatsmen
                .filter(p => p.id !== teamTactics?.captain)
                .map(player => {
                  const leadership = player.attributes?.mental?.leadership || 0;
                  return (
                    <option key={player.id} value={player.id}>
                      {player.name} ({leadership})
                    </option>
                  );
                })}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
