/**
 * @file Board.jsx
 * @description Board page with Objectives and Finances tabs
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Target, DollarSign, Construction } from 'lucide-react';
import ObjectivesPanel from '../board/ObjectivesPanel';
import FinancesTab from '../board/FinancesTab';

const Board = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'objectives';
  const [selectedTab, setSelectedTab] = useState(initialTab);

  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['objectives', 'finances'].includes(tabParam)) {
      setSelectedTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: 'objectives', label: 'Objectives', icon: Target },
    { id: 'finances', label: 'Finances', icon: DollarSign }
  ];

  return (
    <div className="relative space-y-4">
      <h1 className="sr-only">Board Room</h1>

      {/* WIP Overlay */}
      <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm z-10 flex items-center justify-center rounded">
        <div className="text-center">
          <Construction className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-secondary">Work in Progress</h2>
          <p className="text-sm text-text-tertiary mt-1">Board features coming soon</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <nav className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-cricket-accent text-cricket-accent'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'objectives' && <ObjectivesPanel />}
      {selectedTab === 'finances' && <FinancesTab />}
    </div>
  );
};

export default Board;
