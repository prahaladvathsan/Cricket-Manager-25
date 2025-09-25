/**
 * @file Header.jsx
 * @description Top header component with quick actions
 */

import React from 'react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';

const Header = () => {
  const { currentSeason, currentPhase, currentDate } = useGameStore();
  const { getUserTeam } = useTeamStore();
  
  const userTeam = getUserTeam();
  const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="bg-cricket-surface border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Current Context */}
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-lg font-semibold text-cricket-text-primary">
              {userTeam ? userTeam.name : 'Select Team'}
            </h2>
            <p className="text-sm text-cricket-text-secondary">
              Season {currentSeason} • {currentPhase} • {formattedDate}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-4">
          <button className="btn-secondary text-sm">
            ⚙️ Settings
          </button>
          <button className="btn-secondary text-sm">
            💾 Save
          </button>
          <button className="btn-primary text-sm">
            ▶️ Continue
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;