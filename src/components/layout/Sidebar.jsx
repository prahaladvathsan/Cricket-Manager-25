/**
 * @file Sidebar.jsx
 * @description Navigation sidebar component
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  Trophy,
  ArrowRightLeft,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
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
    { path: '/game/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/game/squad', label: 'Squad', icon: Users },
    { path: '/game/matches', label: 'Matches', icon: Target },
    { path: '/game/league', label: 'League', icon: Trophy },
    { path: '/game/transfers', label: 'Transfers', icon: ArrowRightLeft },
    { path: '/game/board', label: 'Board', icon: Building2 }
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-cricket-surface border-r border-gray-700 transition-all duration-300 z-10 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-base font-bold text-cricket-text-primary">Cricket Manager 25</h1>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded hover:bg-cricket-primary transition-colors text-text-secondary hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center p-2 rounded transition-colors text-sm ${
                    currentPath === item.path
                      ? 'bg-cricket-primary text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-cricket-primary/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {!sidebarCollapsed && (
                    <span className="ml-2.5">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-xxs text-cricket-text-secondary space-y-0.5">
            {userTeam && (
              <div className="flex items-center space-x-1.5 mb-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full border"
                  style={{ backgroundColor: userTeam.colors.primary, borderColor: userTeam.colors.secondary }}
                />
                <span className="font-medium text-cricket-text-primary text-xs">{userTeam.shortName}</span>
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