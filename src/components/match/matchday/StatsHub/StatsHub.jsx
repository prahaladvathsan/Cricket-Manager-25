/**
 * StatsHub - Right column container for stats and visualizations
 *
 * Features four tabs:
 * - Scorecard: Traditional cricket scorecard (batting/bowling)
 * - Worm: Run rate line chart
 * - Manhattan: Runs per over bar chart
 * - Partnerships: Partnership tracker
 *
 * Each tab has an expand button to open a full-screen modal with enhanced details
 */

import React, { useState } from 'react';
import { FileText, TrendingUp, BarChart3, Users2 } from 'lucide-react';
import LiveScorecard from './LiveScorecard';
import RunRateWorm from './RunRateWorm';
import ManhattanChart from './ManhattanChart';
import PartnershipsPanel from './PartnershipsPanel';

// Import modal components
import ScorecardModal from './modals/ScorecardModal';
import WormModal from './modals/WormModal';
import ManhattanModal from './modals/ManhattanModal';
import PartnershipsModal from './modals/PartnershipsModal';

export default function StatsHub() {
  const [activeTab, setActiveTab] = useState('scorecard');
  const [expandedModal, setExpandedModal] = useState(null);

  const tabs = [
    { id: 'scorecard', label: 'Scorecard', icon: FileText },
    { id: 'worm', label: 'Worm', icon: TrendingUp },
    { id: 'manhattan', label: 'Manhattan', icon: BarChart3 },
    { id: 'partnerships', label: 'Partnerships', icon: Users2 },
  ];

  return (
    <div className="stats-hub bg-bg-secondary rounded-lg border border-border-primary h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border-primary">
        <h2 className="text-lg font-semibold text-text-primary">Stats Hub</h2>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-border-primary">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
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

      {/* Tab Content - Clickable to expand */}
      <div
        className="flex-1 overflow-y-auto p-4 cursor-pointer hover:bg-bg-tertiary/30 transition-colors [&::-webkit-scrollbar]:hidden"
        onClick={() => setExpandedModal(activeTab)}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* Content */}
        <div>
          {activeTab === 'scorecard' && <LiveScorecard />}
          {activeTab === 'worm' && <RunRateWorm />}
          {activeTab === 'manhattan' && <ManhattanChart />}
          {activeTab === 'partnerships' && <PartnershipsPanel />}
        </div>
      </div>

      {/* Modals */}
      <ScorecardModal
        isOpen={expandedModal === 'scorecard'}
        onClose={() => setExpandedModal(null)}
      />
      <WormModal
        isOpen={expandedModal === 'worm'}
        onClose={() => setExpandedModal(null)}
      />
      <ManhattanModal
        isOpen={expandedModal === 'manhattan'}
        onClose={() => setExpandedModal(null)}
      />
      <PartnershipsModal
        isOpen={expandedModal === 'partnerships'}
        onClose={() => setExpandedModal(null)}
      />
    </div>
  );
}
