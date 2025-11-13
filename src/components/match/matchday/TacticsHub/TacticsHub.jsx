/**
 * TacticsHub - Left column container for tactical controls
 *
 * Features contextual tabs based on batting/bowling status:
 * - When batting: Shows Batting tab only
 * - When bowling: Shows Bowling + Fielding tabs
 *
 * Tabs:
 * - Batting: Acceleration tier control + batting order management
 * - Bowling: Bowling plans (line/length + variation) + over assignments
 * - Fielding: Field formation selector
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Target, Shield } from 'lucide-react';
import useMatchStore from '../../../../stores/matchStore';
import useTeamStore from '../../../../stores/teamStore';
import BattingAccelerationPanel from './BattingAccelerationPanel';
import BowlingPlansPanel from './BowlingPlansPanel';
import FieldFormationPanel from './FieldFormationPanel';

export default function TacticsHub() {
  const [activeTab, setActiveTab] = useState('batting');

  // Get user team and current batting team
  const userTeamId = useTeamStore(state => state.userTeamId);
  const currentBattingTeam = useMatchStore(state => state.innings?.battingTeam);

  // Determine if user is batting or bowling
  const userIsBatting = currentBattingTeam === userTeamId;

  // All possible tabs
  const allTabs = [
    { id: 'batting', label: 'Batting', icon: Users, showWhen: 'batting' },
    { id: 'bowling', label: 'Bowling', icon: Target, showWhen: 'bowling' },
    { id: 'fielding', label: 'Fielding', icon: Shield, showWhen: 'bowling' },
  ];

  // Filter tabs based on context
  const tabs = useMemo(() => {
    return allTabs.filter(tab => {
      if (tab.showWhen === 'batting') return userIsBatting;
      if (tab.showWhen === 'bowling') return !userIsBatting;
      return true;
    });
  }, [userIsBatting]);

  // Auto-switch to first available tab when context changes
  useEffect(() => {
    const tabIds = tabs.map(t => t.id);
    if (!tabIds.includes(activeTab)) {
      setActiveTab(tabIds[0]);
    }
  }, [tabs, activeTab]);

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-primary h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border-primary">
        <h2 className="text-lg font-semibold text-text-primary">Tactics Hub</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-cricket-primary text-white border-b-2 border-cricket-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-1.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {activeTab === 'batting' && <BattingAccelerationPanel />}

        {activeTab === 'bowling' && <BowlingPlansPanel />}

        {activeTab === 'fielding' && <FieldFormationPanel />}
      </div>
    </div>
  );
}
