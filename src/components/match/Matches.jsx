/**
 * @file Matches.jsx
 * @description Fixtures and results page
 */

import React, { useState } from 'react';
import useTeamStore from '../../stores/teamStore';

const Matches = () => {
  const { getUserTeam } = useTeamStore();
  const [activeTab, setActiveTab] = useState('fixtures');
  
  const userTeam = getUserTeam();

  const tabs = [
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'results', label: 'Results' },
    { id: 'live', label: 'Live' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-cricket-text-primary">Matches</h1>
        <button className="btn-primary">Schedule View</button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-cricket-primary text-cricket-primary'
                  : 'border-transparent text-cricket-text-secondary hover:text-cricket-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'fixtures' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming Fixtures</h2>
            <div className="text-center py-8">
              <p className="text-cricket-text-secondary">No fixtures scheduled</p>
              <p className="text-sm text-cricket-text-secondary mt-2">
                Season schedule will be generated after squad finalization
              </p>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Results</h2>
            <div className="text-center py-8">
              <p className="text-cricket-text-secondary">No matches played yet</p>
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Live Matches</h2>
            <div className="text-center py-8">
              <p className="text-cricket-text-secondary">No live matches</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {userTeam && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xl font-bold">0</div>
            <div className="text-cricket-text-secondary">Matches Played</div>
          </div>
          <div className="card p-4">
            <div className="text-xl font-bold">0</div>
            <div className="text-cricket-text-secondary">Wins</div>
          </div>
          <div className="card p-4">
            <div className="text-xl font-bold">0</div>
            <div className="text-cricket-text-secondary">Losses</div>
          </div>
          <div className="card p-4">
            <div className="text-xl font-bold">-</div>
            <div className="text-cricket-text-secondary">Net Run Rate</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;