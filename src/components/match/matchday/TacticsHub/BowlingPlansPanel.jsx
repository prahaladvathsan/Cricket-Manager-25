/**
 * BowlingPlansPanel - Enhanced bowling plan controls
 *
 * Features:
 * - Sub-tabs: Over Assignments | Bowling Plans
 * - Over Assignments: 20-over list with bowler assignment + freeze logic
 * - Bowling Plans: Line/Length plans (4 options for pace/spin)
 * - Bowling Plans: Variation plans (4 options for pace/spin)
 * - Over quotas display (e.g., "2/4 overs bowled")
 * - Current bowler highlighted
 * - Per-bowler plan customization
 * - Scrollbar hiding CSS
 */

import React, { useState, useMemo, useEffect } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import usePlayerStore from '../../../../stores/playerStore';
import useTeamStore from '../../../../stores/teamStore';
import { Target, Zap, List } from 'lucide-react';
import PlayerName from '../../../shared/PlayerName';
import ConditionBar from '../../../shared/ConditionBar';
import bowlingPlansConfig from '../../../../data/config/bowling-plans-config.json';

// Helper function to convert config plans to UI format
const convertConfigToUIPlans = (configPlans) => {
  return Object.keys(configPlans).map(planId => ({
    id: planId,
    label: planId,
    description: configPlans[planId].description
  }));
};

// Dynamically load plans from config
const PACE_LINE_LENGTH_PLANS = convertConfigToUIPlans(bowlingPlansConfig.paceBowling.lineLengthPlans);
const PACE_VARIATION_PLANS = convertConfigToUIPlans(bowlingPlansConfig.paceBowling.variationPlans);
const SPIN_LINE_LENGTH_PLANS = convertConfigToUIPlans(bowlingPlansConfig.spinBowling.lineLengthPlans);
const SPIN_VARIATION_PLANS = convertConfigToUIPlans(bowlingPlansConfig.spinBowling.variationPlans);

/**
 * Plan selector dropdown
 */
const PlanSelector = ({ label, currentPlan, plans, onChange, icon: Icon }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3 text-text-secondary" />
        <label className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      </div>
      <select
        value={currentPlan || plans[0].id}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-xs bg-bg-tertiary text-text-primary border border-border-primary rounded hover:border-cricket-accent transition-colors cursor-pointer"
      >
        {plans.map(plan => (
          <option key={plan.id} value={plan.id}>
            {plan.label} - {plan.description}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Bowler row component
 */
const BowlerRow = ({ playerId, isCurrentBowler, bowlingPlans, onUpdatePlan }) => {
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const matchConditions = useMatchStore(state => state.matchConditions);
  const player = getPlayer(playerId);

  if (!player) return null;

  // Determine if bowler is pace or spin based on bowlingType
  const isPaceBowler = player.bowlingType === 'pace';
  const lineLengthPlans = isPaceBowler ? PACE_LINE_LENGTH_PLANS : SPIN_LINE_LENGTH_PLANS;
  const variationPlans = isPaceBowler ? PACE_VARIATION_PLANS : SPIN_VARIATION_PLANS;

  const currentPlans = bowlingPlans[playerId] || {
    lineLength: lineLengthPlans[0].id,
    variation: variationPlans[0].id
  };

  const handleLineLengthChange = (newPlan) => {
    onUpdatePlan(playerId, { ...currentPlans, lineLength: newPlan });
  };

  const handleVariationChange = (newPlan) => {
    onUpdatePlan(playerId, { ...currentPlans, variation: newPlan });
  };

  return (
    <div className={`p-2 border-b transition-colors ${
      isCurrentBowler
        ? 'bg-cricket-primary bg-opacity-10 border-cricket-primary'
        : 'bg-bg-tertiary border-border-primary'
    }`}>
      {/* Bowler info */}
      <div className="mb-2 space-y-1">
        <div className="flex items-center gap-2">
          <PlayerName playerId={playerId} />
          <span className="text-xs text-text-secondary">
            ({player.bowlingType})
          </span>
          {isCurrentBowler && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-cricket-accent text-cricket-dark rounded">
              BOWLING
            </span>
          )}
        </div>
        {/* Condition bars */}
        <div className="flex gap-1.5">
          <ConditionBar
            type="confidence"
            value={matchConditions[playerId]?.confidence || 50}
            showValue={false}
          />
          <ConditionBar
            type="energy"
            value={matchConditions[playerId]?.energy || 100}
            showValue={false}
          />
        </div>
      </div>

      {/* Plan selectors */}
      <div className="space-y-2">
        <PlanSelector
          label="Line/Length"
          currentPlan={currentPlans.lineLength}
          plans={lineLengthPlans}
          onChange={handleLineLengthChange}
          icon={Target}
        />
        <PlanSelector
          label="Variation"
          currentPlan={currentPlans.variation}
          plans={variationPlans}
          onChange={handleVariationChange}
          icon={Zap}
        />
      </div>
    </div>
  );
};

/**
 * Over Assignments Tab - 20-over bowling assignments
 */
const OverAssignmentsTab = ({ bowlers, currentBall, currentBowler, overAssignments, onUpdateAssignment }) => {
  const ballByBall = useMatchStore(state => state.ballByBall);
  const currentInnings = useMatchStore(state => state.innings?.number);

  // Calculate which overs are completed (only for current innings)
  const completedOvers = useMemo(() => {
    if (!ballByBall || ballByBall.length === 0 || !currentInnings) return [];

    const oversSet = new Set();
    ballByBall.forEach(ball => {
      // Only consider balls from current innings
      if (ball.innings !== currentInnings) return;

      // An over is complete when ball 5 (6th ball, 0-indexed) is bowled
      if (ball.ball === 5) {
        oversSet.add(ball.over + 1); // Convert to 1-indexed
      }
    });
    return Array.from(oversSet);
  }, [ballByBall, currentInnings]);

  // Determine current over number (1-indexed) from currentBall
  const currentOverNumber = currentBall ? currentBall.over + 1 : 0;

  // Calculate overs bowled by each bowler (only for current innings)
  const oversBowled = useMemo(() => {
    if (!ballByBall || ballByBall.length === 0 || !currentInnings) return {};

    const counts = {};
    const oversTracked = new Set();

    ballByBall.forEach(ball => {
      // Only consider balls from current innings
      if (ball.innings !== currentInnings) return;

      const overKey = `${ball.over}-${ball.bowlerId}`;

      if (!oversTracked.has(overKey)) {
        counts[ball.bowlerId] = (counts[ball.bowlerId] || 0) + 1;
        oversTracked.add(overKey);
      }
    });

    return counts;
  }, [ballByBall, currentInnings]);

  // Generate 20 overs list
  const overs = Array.from({ length: 20 }, (_, i) => i + 1);

  const handleAssignmentChange = (overNumber, bowlerId) => {
    onUpdateAssignment(overNumber, bowlerId);
  };

  return (
    <div className="space-y-2">
      {/* Overs List */}
      <div
        className="space-y-0 overflow-y-auto scrollbar-hide"
        style={{ maxHeight: '400px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {overs.map(overNumber => {
          const isCompleted = completedOvers.includes(overNumber);
          const isCurrent = overNumber === currentOverNumber;
          const isFrozen = isCompleted || isCurrent;
          const assignedBowlerId = overAssignments[overNumber] || '';

          return (
            <div
              key={overNumber}
              className={`p-1.5 border-b transition-colors ${
                isCurrent
                  ? 'bg-cricket-accent bg-opacity-10 border-cricket-accent'
                  : isFrozen
                  ? 'bg-bg-tertiary border-border-primary opacity-60'
                  : 'bg-bg-tertiary border-border-primary hover:border-cricket-primary hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Over number */}
                <div className="flex-shrink-0 w-14">
                  <span className="text-xs font-semibold text-text-primary">
                    {overNumber}
                  </span>
                  {isCurrent && (
                    <span className="ml-1 text-xs text-cricket-accent font-semibold">
                      LIVE
                    </span>
                  )}
                </div>

                {/* Bowler selector */}
                <div className="flex-1">
                  <select
                    value={assignedBowlerId}
                    onChange={(e) => handleAssignmentChange(overNumber, e.target.value)}
                    disabled={isFrozen}
                    className={`w-full px-2 py-1 text-xs bg-bg-primary text-text-primary border border-border-primary rounded transition-colors ${
                      isFrozen
                        ? 'cursor-not-allowed opacity-60'
                        : 'hover:border-cricket-accent cursor-pointer'
                    }`}
                  >
                    <option value="">Select...</option>
                    {bowlers.map(bowler => {
                      const bowled = oversBowled[bowler.id] || 0;
                      const maxOvers = 4; // T20 limit per bowler
                      const canBowl = bowled < maxOvers;

                      return (
                        <option
                          key={bowler.id}
                          value={bowler.id}
                          disabled={!canBowl && !isFrozen}
                        >
                          {bowler.name} ({bowled}/{maxOvers})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Bowling Plans Tab - Line/Length and Variation strategies
 */
const BowlingPlansTab = ({ bowlers, currentBowler, bowlingPlans, onUpdatePlan }) => {
  return (
    <div className="space-y-2">
      {/* Current Bowler */}
      {currentBowler && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-text-secondary uppercase px-2">Current Bowler</h4>
          <BowlerRow
            playerId={currentBowler}
            isCurrentBowler={true}
            bowlingPlans={bowlingPlans}
            onUpdatePlan={onUpdatePlan}
          />
        </div>
      )}

      {/* All Bowlers */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-text-secondary uppercase px-2">
          Bowling Squad ({bowlers.length})
        </h4>
        <div
          className="space-y-2 overflow-y-auto scrollbar-hide"
          style={{ maxHeight: '400px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {bowlers
            .filter(bowler => bowler.id !== currentBowler)
            .map(bowler => (
              <BowlerRow
                key={bowler.id}
                playerId={bowler.id}
                isCurrentBowler={false}
                bowlingPlans={bowlingPlans}
                onUpdatePlan={onUpdatePlan}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Main BowlingPlansPanel component with sub-tabs
 */
export default function BowlingPlansPanel() {
  const [activeSubTab, setActiveSubTab] = useState('assignments');
  const innings = useMatchStore(state => state.innings);
  const tacticsState = useMatchStore(state => state.tacticsState);
  const teams = useMatchStore(state => state.teams);
  const currentBall = useMatchStore(state => state.currentBall);
  const ballByBall = useMatchStore(state => state.ballByBall);
  const currentInnings = useMatchStore(state => state.innings?.number);
  const matchStore = useMatchStore();

  const bowlingTeam = teams.bowling;
  const currentBowler = innings.bowler;
  const bowlingPlans = tacticsState.bowlingPlans || {};
  const overAssignments = tacticsState.overAssignments || {};

  // Get bowling rotation from team tactics
  const teamTactics = useTeamStore(state => state.teamTactics);
  const bowlingRotation = teamTactics[bowlingTeam.id]?.bowlingRotation || [];

  // IMPORTANT: Get squadSelection from team tactics (authoritative source for playing XI)
  const bowlingTeamTactics = teamTactics[bowlingTeam.id];
  const playingXI = bowlingTeamTactics?.squadSelection || bowlingTeam.squad;

  // Get all bowlers from playing XI (primary bowlers + part-timers with bowling rating > 40)
  const getPlayer = usePlayerStore(state => state.getPlayer);

  // Helper to calculate primary bowling rating
  const getPrimaryBowlingRating = (player) => {
    if (!player?.attributes?.bowling) return 0;
    const bowlingAttrs = player.attributes.bowling;
    return Object.values(bowlingAttrs).reduce((a, b) => a + b, 0) / Object.keys(bowlingAttrs).length;
  };

  const bowlers = playingXI
    .map(playerId => getPlayer(playerId))
    .filter(player => {
      if (!player) return false;
      const isPrimary = player.role === 'bowler' || player.role === 'all-rounder';
      const bowlingRating = getPrimaryBowlingRating(player);
      return isPrimary || bowlingRating > 40;
    })
    .sort((a, b) => {
      // Sort: current bowler first, then by role (bowlers before all-rounders)
      if (a.id === currentBowler) return -1;
      if (b.id === currentBowler) return 1;
      if (a.role === 'bowler' && b.role !== 'bowler') return -1;
      if (b.role === 'bowler' && a.role !== 'bowler') return 1;
      return 0;
    });

  // Initialize over assignments from bowling rotation on mount (only if empty)
  useEffect(() => {
    if (Object.keys(overAssignments).length === 0 && bowlingRotation.length > 0 && bowlers.length > 0) {
      // Create initial over assignments based on bowling rotation
      // Each bowler can bowl max 4 overs in T20 (20 overs total)
      const initialAssignments = {};
      let rotationIndex = 0;
      const oversPerBowler = {};

      for (let over = 1; over <= 20; over++) {
        // Find next bowler who hasn't reached 4 overs
        let attempts = 0;
        while (attempts < bowlingRotation.length) {
          const bowlerId = bowlingRotation[rotationIndex % bowlingRotation.length];
          const currentOvers = oversPerBowler[bowlerId] || 0;

          if (currentOvers < 4) {
            initialAssignments[over] = bowlerId;
            oversPerBowler[bowlerId] = currentOvers + 1;
            rotationIndex++;
            break;
          }

          rotationIndex++;
          attempts++;
        }
      }

      // Update matchStore with initial assignments
      matchStore.updateTacticsState({ overAssignments: initialAssignments });
    }
  }, [bowlingRotation, bowlers.length]); // Only run when bowlingRotation or bowlers change

  // Auto-update over assignments with actual bowlers (backward info flow)
  useEffect(() => {
    if (!ballByBall || ballByBall.length === 0 || !currentInnings) return;

    const updatedAssignments = { ...overAssignments };
    let hasChanges = false;

    // Group balls by over to find who actually bowled each over
    const oversToBowlers = {};
    ballByBall.forEach(ball => {
      // Only process balls from current innings
      if (ball.innings !== currentInnings) return;

      const overNumber = ball.over + 1; // Convert to 1-indexed

      // Track who bowled this over (first ball determines the bowler for the over)
      if (!oversToBowlers[overNumber]) {
        oversToBowlers[overNumber] = ball.bowlerId;
      }
    });

    // Update assignments for overs that have been bowled
    Object.entries(oversToBowlers).forEach(([overNumber, actualBowlerId]) => {
      const assignedBowler = updatedAssignments[overNumber];

      // Update if: not assigned OR assigned bowler doesn't match actual bowler
      // This handles both empty assignments and corrections (quota exceeded, consecutive overs)
      if (!assignedBowler || assignedBowler === '' || assignedBowler !== actualBowlerId) {
        updatedAssignments[overNumber] = actualBowlerId;
        hasChanges = true;
      }
    });

    // Only update store if there are changes
    if (hasChanges) {
      matchStore.updateTacticsState({ overAssignments: updatedAssignments });
    }
  }, [ballByBall?.length, currentInnings]); // Run when new balls are added or innings changes

  // Update bowling plan for a bowler
  const handleUpdatePlan = (bowlerId, newPlans) => {
    const updatedPlans = {
      ...bowlingPlans,
      [bowlerId]: newPlans
    };
    matchStore.updateTacticsState({ bowlingPlans: updatedPlans });
  };

  // Update over assignment
  const handleUpdateAssignment = (overNumber, bowlerId) => {
    const updatedAssignments = {
      ...overAssignments,
      [overNumber]: bowlerId
    };
    matchStore.updateTacticsState({ overAssignments: updatedAssignments });
  };

  // Sub-tabs configuration
  const subTabs = [
    { id: 'assignments', label: 'Overs', icon: List },
    { id: 'plans', label: 'Plans', icon: Target }
  ];

  return (
    <div className="bowling-plans-panel space-y-1">
      {/* Sub-tab Switcher */}
      <div className="flex border-b border-border-primary">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-cricket-accent border-cricket-accent'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-secondary'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'assignments' && (
        <OverAssignmentsTab
          bowlers={bowlers}
          currentBall={currentBall}
          currentBowler={currentBowler}
          overAssignments={overAssignments}
          onUpdateAssignment={handleUpdateAssignment}
        />
      )}

      {activeSubTab === 'plans' && (
        <BowlingPlansTab
          bowlers={bowlers}
          currentBowler={currentBowler}
          bowlingPlans={bowlingPlans}
          onUpdatePlan={handleUpdatePlan}
        />
      )}
    </div>
  );
}
