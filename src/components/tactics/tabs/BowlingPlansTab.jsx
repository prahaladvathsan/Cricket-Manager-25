/**
 * @file BowlingPlansTab.jsx
 * @description Tab for setting over-by-over bowling assignments and bowling plans
 */

import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import bowlingPlansConfig from '../../../data/config/bowling-plans-config.json';
import { getPrimaryBowlingRating, formatRating } from '../../../utils/ratingHelper';
import PlayerName from '../../shared/PlayerName';

const BowlingPlansTab = ({ teamId, teamPlayers, onPlayerClick }) => {
  const { getTeamTactics, updateBowlingPlans, updateBowlingRotation } = useTeamStore();
  const { players } = usePlayerStore();

  const teamTactics = getTeamTactics(teamId);

  // Over assignments: array of 20 player IDs (or null for unassigned)
  const overAssignments = useMemo(() => {
    const assignments = teamTactics?.bowlingRotation || [];
    // Ensure we have exactly 20 slots
    return Array.from({ length: 20 }, (_, i) => assignments[i] || null);
  }, [teamTactics?.bowlingRotation]);

  // Categorize bowlers: Primary vs Part-timers
  const { primaryBowlers, partTimers } = useMemo(() => {
    const selectedIds = teamTactics?.squadSelection || [];
    const allPlayers = selectedIds.map(id => players[id]).filter(Boolean);

    const primary = [];
    const partTime = [];

    allPlayers.forEach(player => {
      const isPrimary = player.role === 'bowler' || player.role === 'all-rounder';
      const bowlingRating = getPrimaryBowlingRating(player);

      if (isPrimary) {
        primary.push(player);
      } else if (bowlingRating > 40) {
        partTime.push(player);
      }
    });

    // Sort by bowling rating
    primary.sort((a, b) => getPrimaryBowlingRating(b) - getPrimaryBowlingRating(a));
    partTime.sort((a, b) => getPrimaryBowlingRating(b) - getPrimaryBowlingRating(a));

    return { primaryBowlers: primary, partTimers: partTime };
  }, [teamTactics?.squadSelection, players]);

  // Get unique bowlers assigned
  const assignedBowlers = useMemo(() => {
    const uniqueIds = [...new Set(overAssignments.filter(id => id !== null))];
    return uniqueIds.map(id => players[id]).filter(Boolean);
  }, [overAssignments, players]);

  // Handle over assignment change
  const handleOverAssignment = (overIndex, playerId) => {
    const newAssignments = [...overAssignments];
    newAssignments[overIndex] = playerId === '' ? null : playerId;
    updateBowlingRotation(teamId, newAssignments);
  };

  // Get bowling plans for bowling type
  const getBowlingPlans = (bowlingType) => {
    const isPace = bowlingType === 'pace';
    const config = isPace ? bowlingPlansConfig.paceBowling : bowlingPlansConfig.spinBowling;

    return {
      lineLengthPlans: Object.entries(config.lineLengthPlans).map(([name, data]) => ({
        name,
        description: data.description,
        playstyleBoosted: data.playstyleBoosted
      })),
      variationPlans: Object.entries(config.variationPlans).map(([name, data]) => ({
        name,
        description: data.description,
        playstyleBoosted: data.playstyleBoosted
      }))
    };
  };

  const handlePlanChange = (playerId, planType, value) => {
    const currentPlans = teamTactics?.bowlingPlans[playerId] || {};
    const newPlans = {
      ...currentPlans,
      [planType]: value
    };
    updateBowlingPlans(teamId, playerId, newPlans);
  };

  // Check if plan boosts player's primary playstyle
  const planBoostsPlaystyle = (player, plan) => {
    const primaryBowlingPlaystyle = player.primaryPlaystyle?.bowling;
    if (!primaryBowlingPlaystyle || !plan.playstyleBoosted) return false;
    return plan.playstyleBoosted.includes(primaryBowlingPlaystyle);
  };

  // Validation warnings
  const getWarnings = () => {
    const warnings = [];
    const bowlerOvers = {};

    // Count overs per bowler
    overAssignments.forEach(playerId => {
      if (playerId) {
        bowlerOvers[playerId] = (bowlerOvers[playerId] || 0) + 1;
      }
    });

    // Check for >4 overs per bowler
    Object.entries(bowlerOvers).forEach(([playerId, count]) => {
      if (count > 4) {
        const player = players[playerId];
        warnings.push(`${player?.name || 'Unknown'} assigned ${count} overs (max 4)`);
      }
    });

    // Check for unassigned overs
    const unassigned = overAssignments.filter(id => !id).length;
    if (unassigned > 0) {
      warnings.push(`${unassigned} over(s) not assigned`);
    }

    return warnings;
  };

  const warnings = getWarnings();

  if (primaryBowlers.length === 0 && partTimers.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-text-secondary">
          No bowlers in playing XI. Please select players in the Squad tab.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Main Section: Over Assignments */}
      <div className="lg:col-span-2 space-y-3">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="card p-2 bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-yellow-400 mb-1">Warnings:</p>
                <ul className="text-xs text-yellow-400 space-y-0.5">
                  {warnings.map((warn, idx) => (
                    <li key={idx}>• {warn}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Over Assignment List */}
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
            <Activity className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-base font-semibold text-text-primary">
              Over-by-Over Bowling Assignment
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {overAssignments.map((playerId, overIndex) => {
              const player = playerId ? players[playerId] : null;
              const overNumber = overIndex + 1;

              return (
                <div key={overIndex} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-text-secondary min-w-[30px]">
                    Over {overNumber}:
                  </span>
                  <select
                    value={playerId || ''}
                    onChange={(e) => handleOverAssignment(overIndex, e.target.value)}
                    className="flex-1 px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                  >
                    <option value="">Unassigned</option>
                    {primaryBowlers.length > 0 && (
                      <optgroup label="Primary Bowlers">
                        {primaryBowlers.map(bowler => {
                          const overrides = teamTactics?.playstyleOverrides?.[bowler.id];
                          const playstyle = overrides?.bowling || bowler.primaryPlaystyle?.bowling;
                          const rating = getPrimaryBowlingRating(bowler);
                          return (
                            <option key={bowler.id} value={bowler.id}>
                              {bowler.name} ({formatRating(rating)})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {partTimers.length > 0 && (
                      <optgroup label="Part-timers">
                        {partTimers.map(bowler => {
                          const overrides = teamTactics?.playstyleOverrides?.[bowler.id];
                          const playstyle = overrides?.bowling || bowler.primaryPlaystyle?.bowling;
                          const rating = getPrimaryBowlingRating(bowler);
                          return (
                            <option key={bowler.id} value={bowler.id}>
                              {bowler.name} ({formatRating(rating)})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Panel: Bowling Plans */}
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
          <CheckCircle className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">
            Bowling Plans
          </h3>
        </div>

        {assignedBowlers.length === 0 ? (
          <p className="text-xs text-text-secondary text-center py-4">
            Assign bowlers to overs to set their bowling plans
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {assignedBowlers.map(player => {
              const bowlingType = player.bowlingType || 'pace';
              const plans = getBowlingPlans(bowlingType);
              const currentPlans = teamTactics?.bowlingPlans[player.id] || {
                lineLength: player.tactics?.defaultBowlingPlans?.lineLength || 'Wide Line',
                variation: player.tactics?.defaultBowlingPlans?.variation || 'Consistent Accuracy'
              };

              const lineLengthPlan = plans.lineLengthPlans.find(p => p.name === currentPlans.lineLength);
              const variationPlan = plans.variationPlans.find(p => p.name === currentPlans.variation);
              const overrides = teamTactics?.playstyleOverrides?.[player.id];
              const playstyle = overrides?.bowling || player.primaryPlaystyle?.bowling;
              const rating = getPrimaryBowlingRating(player);

              return (
                <div key={player.id} className="p-2 bg-bg-tertiary rounded">
                  {/* Player Header */}
                  <div className="mb-2 pb-2 border-b border-border-primary">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold">
                        <PlayerName playerId={player.id} player={player} className="text-sm font-semibold" />
                      </h4>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        bowlingType === 'pace' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {bowlingType === 'pace' ? 'Pace' : 'Spin'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-secondary truncate">{playstyle}</span>
                      <span className="text-cricket-accent font-mono font-semibold">{formatRating(rating)}</span>
                    </div>
                  </div>

                  {/* Line-Length Plan */}
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Line-Length
                    </label>
                    <select
                      value={currentPlans.lineLength}
                      onChange={(e) => handlePlanChange(player.id, 'lineLength', e.target.value)}
                      className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                    >
                      {plans.lineLengthPlans.map((plan) => (
                        <option key={plan.name} value={plan.name}>
                          {plan.name}{planBoostsPlaystyle(player, plan) && ' ⭐'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Variation Plan */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Variation
                    </label>
                    <select
                      value={currentPlans.variation}
                      onChange={(e) => handlePlanChange(player.id, 'variation', e.target.value)}
                      className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                    >
                      {plans.variationPlans.map((plan) => (
                        <option key={plan.name} value={plan.name}>
                          {plan.name}{planBoostsPlaystyle(player, plan) && ' ⭐'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Boost Indicator */}
                  {(planBoostsPlaystyle(player, lineLengthPlan) || planBoostsPlaystyle(player, variationPlan)) && (
                    <div className="mt-2 pt-2 border-t border-border-primary">
                      <div className="flex items-center gap-1 text-xs text-cricket-accent">
                        <CheckCircle className="w-3 h-3" />
                        <span>+10 boost active</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BowlingPlansTab;
