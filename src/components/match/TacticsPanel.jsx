/**
 * @file TacticsPanel.jsx
 * @description In-match tactical controls for user team
 */

import React, { useState, useMemo } from 'react';
import {
  Settings,
  Target,
  Activity,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  TrendingUp
} from 'lucide-react';
import useMatchStore from '../../stores/matchStore';
import usePlayerStore from '../../stores/playerStore';
import tacticsConfig from '../../data/config/tactics-config.json';
import bowlingPlansConfig from '../../data/config/bowling-plans-config.json';

const TacticsPanel = ({ userTeamId, isUserTeamBatting }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Match store state
  const tacticsState = useMatchStore((state) => state.tacticsState);
  const innings = useMatchStore((state) => state.innings);
  const currentBall = useMatchStore((state) => state.currentBall);

  // Match store actions
  const updateCurrentAcceleration = useMatchStore((state) => state.updateCurrentAcceleration);
  const updateBowlingPlan = useMatchStore((state) => state.updateBowlingPlan);

  // Player store
  const { players } = usePlayerStore();

  // Get current players
  const striker = players[innings?.striker];
  const nonStriker = players[innings?.nonStriker];
  const bowler = players[innings?.bowler];

  // Get acceleration tiers
  const accelerationTiers = useMemo(() => {
    if (!tacticsConfig?.accelerationTiers) return [];
    return Object.keys(tacticsConfig.accelerationTiers);
  }, []);

  // Get bowling plans
  const getBowlingPlans = (bowlingType) => {
    const isPace = bowlingType === 'pace';
    const config = isPace ? bowlingPlansConfig.paceBowling : bowlingPlansConfig.spinBowling;

    return {
      lineLengthPlans: Object.keys(config.lineLengthPlans),
      variationPlans: Object.keys(config.variationPlans)
    };
  };

  // Handle acceleration tier change
  const handleTierChange = (playerType, tier) => {
    updateCurrentAcceleration(playerType, tier);
  };

  // Handle bowling plan change
  const handleBowlingPlanChange = (planType, value) => {
    if (!bowler) return;

    const currentPlans = tacticsState.bowlingPlans[bowler.id] || {
      lineLength: 'Wide Line',
      variation: 'Consistent Accuracy'
    };

    updateBowlingPlan(bowler.id, {
      ...currentPlans,
      [planType]: value
    });
  };

  // Get tier color
  const getTierColor = (tier) => {
    const tierLower = tier.toLowerCase();
    if (tierLower.includes('blockade') || tierLower.includes('build')) return 'text-blue-400';
    if (tierLower.includes('rotate') || tierLower.includes('cruise')) return 'text-green-400';
    if (tierLower.includes('blitz') || tierLower.includes('hit out')) return 'text-red-400';
    return 'text-text-secondary';
  };

  if (!userTeamId) {
    return null;
  }

  return (
    <div className="card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Match Tactics
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {isUserTeamBatting ? (
            <>
              {/* Batting Tactics */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border-primary">
                  <Target className="w-3 h-3 text-cricket-accent" />
                  <span className="text-xs font-medium text-text-secondary">
                    Batting Tactics
                  </span>
                </div>

                {/* Striker */}
                {striker && (
                  <div className="p-2 bg-bg-tertiary rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-secondary">
                        Striker: <span className="text-text-primary font-medium">{striker.name}</span>
                      </span>
                      <span className="text-xs text-cricket-accent">*</span>
                    </div>
                    <select
                      value={tacticsState.currentAcceleration?.striker || 'Rotate'}
                      onChange={(e) => handleTierChange('striker', e.target.value)}
                      className={`w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs font-medium focus:outline-none focus:border-cricket-accent ${
                        getTierColor(tacticsState.currentAcceleration?.striker || 'Rotate')
                      }`}
                    >
                      {accelerationTiers.map(tier => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Non-Striker */}
                {nonStriker && (
                  <div className="p-2 bg-bg-tertiary rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-secondary">
                        Non-Striker: <span className="text-text-primary font-medium">{nonStriker.name}</span>
                      </span>
                    </div>
                    <select
                      value={tacticsState.currentAcceleration?.nonStriker || 'Rotate'}
                      onChange={(e) => handleTierChange('nonStriker', e.target.value)}
                      className={`w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs font-medium focus:outline-none focus:border-cricket-accent ${
                        getTierColor(tacticsState.currentAcceleration?.nonStriker || 'Rotate')
                      }`}
                    >
                      {accelerationTiers.map(tier => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* DLS Situation (if available) */}
                {tacticsState.battingParScore && (
                  <div className="p-2 bg-cricket-primary/10 rounded border border-cricket-accent/30">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-3 h-3 text-cricket-accent" />
                      <span className="text-xs font-medium text-cricket-accent">
                        Match Situation
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary space-y-0.5">
                      <div className="flex justify-between">
                        <span>Target Run Rate:</span>
                        <span className="font-mono text-text-primary">
                          {tacticsState.targetRunRate?.toFixed(2) || '8.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Recommendation:</span>
                        <span className={`font-medium ${getTierColor('Cruise')}`}>
                          Cruise
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Bowling Tactics */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border-primary">
                  <Activity className="w-3 h-3 text-cricket-accent" />
                  <span className="text-xs font-medium text-text-secondary">
                    Bowling Tactics
                  </span>
                </div>

                {bowler ? (
                  <>
                    {/* Current Bowler Info */}
                    <div className="p-2 bg-bg-tertiary rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-secondary">
                          Current Bowler
                        </span>
                        <span className="text-xs text-cricket-accent">*</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">
                          {bowler.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          bowler.bowlingType === 'pace' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {bowler.bowlingType === 'pace' ? 'Pace' : 'Spin'}
                        </span>
                      </div>
                    </div>

                    {/* Bowling Plans */}
                    {(() => {
                      const plans = getBowlingPlans(bowler.bowlingType);
                      const currentPlans = tacticsState.bowlingPlans?.[bowler.id] || {
                        lineLength: 'Wide Line',
                        variation: 'Consistent Accuracy'
                      };

                      return (
                        <>
                          {/* Line-Length Plan */}
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">
                              Line-Length Plan
                            </label>
                            <select
                              value={currentPlans.lineLength}
                              onChange={(e) => handleBowlingPlanChange('lineLength', e.target.value)}
                              className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                            >
                              {plans.lineLengthPlans.map(plan => (
                                <option key={plan} value={plan}>
                                  {plan}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Variation Plan */}
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">
                              Variation Plan
                            </label>
                            <select
                              value={currentPlans.variation}
                              onChange={(e) => handleBowlingPlanChange('variation', e.target.value)}
                              className="w-full px-2 py-1 bg-bg-secondary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
                            >
                              {plans.variationPlans.map(plan => (
                                <option key={plan} value={plan}>
                                  {plan}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-xs text-text-secondary text-center py-2">
                    No bowler selected yet
                  </p>
                )}
              </div>
            </>
          )}

          {/* Pressure Index */}
          <div className="p-2 bg-bg-tertiary rounded">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-3 h-3 text-cricket-accent" />
              <span className="text-xs font-medium text-text-secondary">
                Pressure Index
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Batting:</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cricket-accent transition-all"
                      style={{ width: `${tacticsState.pressureIndex?.batting || 50}%` }}
                    />
                  </div>
                  <span className="font-mono text-text-primary min-w-[24px]">
                    {tacticsState.pressureIndex?.batting || 50}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Bowling:</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 transition-all"
                      style={{ width: `${tacticsState.pressureIndex?.bowling || 50}%` }}
                    />
                  </div>
                  <span className="font-mono text-text-primary min-w-[24px]">
                    {tacticsState.pressureIndex?.bowling || 50}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-xs text-text-secondary bg-bg-tertiary/50 p-2 rounded">
            <p>Tactics can be changed at the start of each over or after a wicket.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticsPanel;
