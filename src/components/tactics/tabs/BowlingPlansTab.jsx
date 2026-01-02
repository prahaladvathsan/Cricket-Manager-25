/**
 * @file BowlingPlansTab.jsx
 * @description Tab for setting over-by-over bowling assignments and bowling plans
 */

import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import HelpIcon from '../../shared/HelpIcon';
import bowlingPlansConfig from '../../../data/config/bowling-plans-config.json';
import { getPrimaryBowlingRating, formatRating } from '../../../utils/ratingHelper';
import PlayerName from '../../shared/PlayerName';

const BowlingPlansTab = ({ teamId, teamPlayers, onPlayerClick }) => {
  const { updateBowlingPlans, updateOverAssignments, updatePlaystyleOverride, autoAssignBowlingRotation } = useTeamStore();
  const { players } = usePlayerStore();

  // Subscribe to team tactics changes to ensure UI updates when playing XI changes
  const teamTactics = useTeamStore((state) => state.teamTactics[teamId]);

  // Over assignments: array of 20 player IDs (or null for unassigned)
  // Convert overAssignments object { 1: 'id', 2: 'id', ... } to array
  const overAssignments = useMemo(() => {
    const assignmentsObj = teamTactics?.overAssignments || {};
    return Array.from({ length: 20 }, (_, i) => assignmentsObj[i + 1] || null);
  }, [teamTactics?.overAssignments]);

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

  // Get all bowlers from playing XI (for bowling plans section)
  const allBowlers = useMemo(() => {
    // Combine primary bowlers and part-timers
    return [...primaryBowlers, ...partTimers];
  }, [primaryBowlers, partTimers]);

  // Handle over assignment change
  const handleOverAssignment = (overIndex, playerId) => {
    // Convert array to object format { 1: 'id', 2: 'id', ... }
    const newAssignmentsObj = {};
    overAssignments.forEach((id, idx) => {
      if (id) newAssignmentsObj[idx + 1] = id;
    });
    // Update the specific over
    const overNumber = overIndex + 1;
    if (playerId === '') {
      delete newAssignmentsObj[overNumber];
    } else {
      newAssignmentsObj[overNumber] = playerId;
    }
    updateOverAssignments(teamId, newAssignmentsObj);
  };

  // Auto-assign bowling rotation using teamStore method
  const handleAutoAssign = () => {
    if (primaryBowlers.length === 0 && partTimers.length === 0) {
      alert('No bowlers available for auto-assignment');
      return;
    }

    const newAssignmentsArray = autoAssignBowlingRotation(teamId);
    if (newAssignmentsArray.length === 20) {
      // Convert array to object format { 1: 'id', 2: 'id', ... }
      const newAssignmentsObj = {};
      newAssignmentsArray.forEach((id, idx) => {
        if (id) newAssignmentsObj[idx + 1] = id;
      });
      updateOverAssignments(teamId, newAssignmentsObj);
    } else {
      alert('Failed to auto-assign bowling rotation. Please check your playing XI.');
    }
  };

  // Get available bowling playstyles for a player
  const getAvailableBowlingPlaystyles = (player) => {
    if (!player.playstyleRatings?.bowling) return [];

    return Object.entries(player.playstyleRatings.bowling)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rating]) => ({ name, rating }));
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

  const handleBowlingPlaystyleChange = (playerId, playstyle) => {
    const player = players[playerId];
    const currentOverride = teamTactics?.playstyleOverrides?.[playerId];

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

  // Group overs by phase
  const phases = [
    { name: 'Powerplay', overs: [0, 1, 2, 3, 4, 5] },
    { name: 'Early Middle', overs: [6, 7, 8, 9, 10, 11] },
    { name: 'Late Middle', overs: [12, 13, 14, 15] },
    { name: 'Death', overs: [16, 17, 18, 19] }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
      {/* Main Section: Over Assignments */}
      <div className="lg:col-span-3 space-y-2">
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

        {/* Over Assignment List - Grouped by Phase */}
        <div className="bowling-over-assignment card p-2">
          <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-border-primary">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-sm font-semibold text-text-primary">
                Over assignment
              </h3>
              <HelpIcon width="w-3.5" height="h-3.5" tooltipClassName="min-w-[400px]" align="left">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-text-primary mb-2">Over Assignments</h4>
                    <p className="mb-2">Assign a bowler to each of the 20 overs. Max 4 overs per bowler.</p>
                    <div className="text-xs space-y-1">
                      <p className="text-text-secondary font-medium mt-1">Match Phases:</p>
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cricket-accent"></div>Powerplay (1-6)</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>Early Middle (7-12)</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>Late Middle (13-16)</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>Death (17-20)</li>
                      </ul>
                      <p className="mt-2 text-text-tertiary italic">Tip: Use "Auto Assign" for a quick setup.</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary mb-2">Bowling Plans</h4>
                    <p>Set Line & Length for each bowler. Different plans boost specific playstyles:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-text-secondary">
                      <li>Line & Length (e.g., Yorker Attack)</li>
                      <li>Variations (e.g., Slower Balls)</li>
                    </ul>
                    <p className="mt-1 text-xs text-cricket-accent">Plans marked with ⭐ boost the bowler.</p>
                  </div>
                </div>
              </HelpIcon>
            </div>
            <button
              onClick={handleAutoAssign}
              className="bowling-auto-assign btn-secondary text-xs px-2 py-1"
            >
              Auto Assign
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {phases.map((phase, phaseIndex) => (
              <div key={phase.name} className="space-y-1">
                {/* Phase Header */}
                <div className="text-xs font-semibold text-cricket-accent mb-0.5">
                  {phase.name}
                </div>

                {/* Overs in this phase */}
                {phase.overs.map((overIndex, overIdx) => {
                  const playerId = overAssignments[overIndex];
                  const overNumber = overIndex + 1;
                  // Add class to first over select for tutorial
                  const isFirstOver = phaseIndex === 0 && overIdx === 0;

                  return (
                    <div key={overIndex} className="space-y-0.5">
                      <div className="text-xs text-text-secondary">Over {overNumber}</div>
                      <select
                        value={playerId || ''}
                        onChange={(e) => handleOverAssignment(overIndex, e.target.value)}
                        className={`${isFirstOver ? 'bowling-over-select-first ' : ''}w-full px-1.5 py-0.5 bg-bg-tertiary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent`}
                      >
                        <option value="">—</option>
                        {primaryBowlers.length > 0 && (
                          <optgroup label="Primary">
                            {primaryBowlers.map(bowler => (
                              <option key={bowler.id} value={bowler.id}>
                                {bowler.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {partTimers.length > 0 && (
                          <optgroup label="Part-time">
                            {partTimers.map(bowler => (
                              <option key={bowler.id} value={bowler.id}>
                                {bowler.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side Panel: Bowling Plans */}
      <div className="bowling-plans-panel lg:col-span-2 card p-2">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-border-primary">
          <CheckCircle className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Bowling Plans
          </h3>
        </div>

        {allBowlers.length === 0 ? (
          <p className="text-xs text-text-secondary text-center py-4">
            No bowlers in playing XI. Add bowlers in the Squad tab.
          </p>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {allBowlers.map((player, bowlerIndex) => {
              const bowlingType = player.bowlingType || 'pace';
              const plans = getBowlingPlans(bowlingType);
              const currentPlans = teamTactics?.bowlingPlans[player.id];

              // If no plans set yet, skip this player
              if (!currentPlans) {
                return null; // Skip rendering this player's plans until they're initialized
              }

              const lineLengthPlan = plans.lineLengthPlans.find(p => p.name === currentPlans.lineLength);
              const variationPlan = plans.variationPlans.find(p => p.name === currentPlans.variation);
              const overrides = teamTactics?.playstyleOverrides?.[player.id];
              const playstyle = overrides?.bowling || player.primaryPlaystyle?.bowling || '';
              const rating = getPrimaryBowlingRating(player);
              const isBowlingPrimary = playstyle === player.primaryPlaystyle?.bowling;
              const availableBowlingPlaystyles = getAvailableBowlingPlaystyles(player);

              // Add class to first bowler's plans for tutorial
              const isFirstBowler = bowlerIndex === 0;

              return (
                <div key={player.id} className={`${isFirstBowler ? 'bowling-plans-first ' : ''}p-1 bg-bg-tertiary rounded`}>
                  {/* Row 1: Name, Role, Playstyle */}
                  <div className="grid grid-cols-2 gap-1 mb-0.5">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <PlayerName playerId={player.id} player={player} className="text-xs font-semibold" />
                      </div>
                      <span className={`px-1 py-0.5 text-xs rounded ${bowlingType === 'pace' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                        {bowlingType === 'pace' ? 'Pace' : 'Spin'}
                      </span>
                    </div>
                    <select
                      value={playstyle}
                      onChange={(e) => handleBowlingPlaystyleChange(player.id, e.target.value)}
                      className="px-1.5 py-0.5 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                    >
                      {availableBowlingPlaystyles.map(({ name, rating }) => (
                        <option key={name} value={name}>
                          {name} ({rating.toFixed(0)})
                          {name === player.primaryPlaystyle?.bowling && ' ⭐'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: Line-Length & Variation Plans */}
                  <div className={`${isFirstBowler ? 'bowling-plan-selects ' : ''}grid grid-cols-2 gap-1`}>
                    <select
                      value={currentPlans.lineLength}
                      onChange={(e) => handlePlanChange(player.id, 'lineLength', e.target.value)}
                      className={`${isFirstBowler ? 'bowling-line-length-select ' : ''}px-1.5 py-0.5 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent`}
                    >
                      {plans.lineLengthPlans.map((plan) => (
                        <option key={plan.name} value={plan.name}>
                          {plan.name}{planBoostsPlaystyle(player, plan) && ' ⭐'}
                        </option>
                      ))}
                    </select>

                    <select
                      value={currentPlans.variation}
                      onChange={(e) => handlePlanChange(player.id, 'variation', e.target.value)}
                      className="px-1.5 py-0.5 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                    >
                      {plans.variationPlans.map((plan) => (
                        <option key={plan.name} value={plan.name}>
                          {plan.name}{planBoostsPlaystyle(player, plan) && ' ⭐'}
                        </option>
                      ))}
                    </select>
                  </div>
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
