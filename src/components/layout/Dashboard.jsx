/**
 * @file Dashboard.jsx
 * @description Main dashboard with season overview
 */

import React from 'react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';

const Dashboard = () => {
  const { currentSeason, currentPhase, currentWeek } = useGameStore();
  const { getUserTeam } = useTeamStore();
  
  const userTeam = getUserTeam();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-cricket-text-primary">Dashboard</h1>
        <div className="text-cricket-text-secondary">
          Season {currentSeason} • Week {currentWeek}
        </div>
      </div>

      {/* Team Selection */}
      {!userTeam && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Cricket Manager</h2>
          <p className="text-cricket-text-secondary mb-4">
            Choose your team to begin your World Premier League management journey.
          </p>
          <button className="btn-primary">
            Select Team
          </button>
        </div>
      )}

      {/* Dashboard Grid */}
      {userTeam && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Next Match */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Next Match</h3>
            <p className="text-cricket-text-secondary">No upcoming matches</p>
          </div>

          {/* Squad Status */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Squad Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-cricket-text-secondary">Players:</span>
                <span>0/25</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cricket-text-secondary">Overseas:</span>
                <span>0/8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cricket-text-secondary">Budget:</span>
                <span>₹90 Cr</span>
              </div>
            </div>
          </div>

          {/* League Position */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">League Position</h3>
            <div className="text-2xl font-bold text-cricket-primary">-</div>
            <p className="text-cricket-text-secondary">Season not started</p>
          </div>

          {/* Recent Form */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Recent Form</h3>
            <p className="text-cricket-text-secondary">No matches played</p>
          </div>

          {/* Objectives */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Objectives</h3>
            <ul className="space-y-1 text-sm">
              <li className="text-cricket-text-secondary">• Build your squad</li>
              <li className="text-cricket-text-secondary">• Qualify for playoffs</li>
              <li className="text-cricket-text-secondary">• Win the championship</li>
            </ul>
          </div>

          {/* News */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Latest News</h3>
            <p className="text-cricket-text-secondary text-sm">
              WPL 2024 auction preparations underway
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;