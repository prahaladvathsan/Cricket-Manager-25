/**
 * @file Sidebar.jsx
 * @description Navigation sidebar component
 */

import React from 'react';
import { Link } from 'react-router-dom';
import useUIStore from '../../stores/uiStore';
import useTeamStore from '../../stores/teamStore';
import useGameStore from '../../stores/gameStore';

const Sidebar = ({ currentPath }) => {
  const { preferences, toggleSidebar } = useUIStore();
  const { sidebarCollapsed } = preferences;
  const { getUserTeam } = useTeamStore();
  const { currentSeason, currentWeek, currentPhase } = useGameStore();
  
  const userTeam = getUserTeam();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/squad', label: 'Squad', icon: '👥' },
    { path: '/matches', label: 'Matches', icon: '🏏' },
    { path: '/league', label: 'League', icon: '🏆' },
    { path: '/transfers', label: 'Transfers', icon: '💰' },
    { path: '/board', label: 'Board', icon: '🏢' }
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-cricket-surface border-r border-gray-700 transition-all duration-300 z-10 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-cricket-text-primary">Cricket Manager</h1>
              <p className="text-sm text-cricket-text-secondary">WPL Edition</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded hover:bg-cricket-primary transition-colors"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded transition-colors ${
                  currentPath === item.path
                    ? 'bg-cricket-primary text-white'
                    : 'text-cricket-text-secondary hover:text-cricket-text-primary hover:bg-cricket-primary/20'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="ml-3">{item.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-cricket-text-secondary space-y-1">
            {userTeam && (
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full border"
                  style={{ backgroundColor: userTeam.colors.primary, borderColor: userTeam.colors.secondary }}
                />
                <span className="font-medium text-cricket-text-primary">{userTeam.shortName}</span>
              </div>
            )}
            <p>Season {currentSeason} • Week {currentWeek}</p>
            <p className="capitalize">{currentPhase} Phase</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;