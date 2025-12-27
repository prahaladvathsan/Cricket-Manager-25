/**
 * @file Sidebar.jsx
 * @description Navigation sidebar component
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  Trophy,
  ArrowRightLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clipboard,
  Calendar
} from 'lucide-react';
import useUIStore from '../../stores/uiStore';
import useTeamStore from '../../stores/teamStore';
import useGameStore from '../../stores/gameStore';
import useInboxStore from '../../stores/inboxStore';
import { getTeamIcon, getGameLogo } from '../../utils/assetHelpers';

const Sidebar = ({ currentPath }) => {
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { preferences, toggleSidebar } = useUIStore();
  const { sidebarCollapsed } = preferences;
  const { getUserTeam } = useTeamStore();
  const { currentSeason, currentWeek, currentPhase, isSimulating } = useGameStore();
  const { unreadCount } = useInboxStore();

  const userTeam = getUserTeam();

  const handleLogoClick = () => {
    setShowConfirmModal(true);
  };

  const confirmReturnToMenu = () => {
    setShowConfirmModal(false);
    navigate('/');
  };

  const navItems = [
    { path: '/game/home', label: 'Home', icon: LayoutDashboard },
    { path: '/game/inbox', label: 'Inbox', icon: Mail, badge: unreadCount },
    { path: '/game/squad', label: 'Squad', icon: Users },
    { path: '/game/tactics', label: 'Tactics', icon: Clipboard },
    { path: '/game/matches', label: 'Matches', icon: Target },
    { path: '/game/calendar', label: 'Calendar', icon: Calendar },
    { path: '/game/league', label: 'League', icon: Trophy },
    { path: '/game/transfers', label: 'Transfers', icon: ArrowRightLeft },
    { path: '/game/board', label: 'Board', icon: Building2 }
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-cricket-surface border-r border-gray-700 transition-all duration-300 z-10 ${
      sidebarCollapsed ? 'w-16' : 'w-48'
    } ${isSimulating ? 'pointer-events-none opacity-50' : ''}`}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-700">
        <div className="flex items-center justify-between h-10">
          {!sidebarCollapsed && (
            <button
              onClick={handleLogoClick}
              className="flex items-center justify-center flex-1 hover:opacity-80 transition-opacity"
              title="Return to Start Menu"
            >
              <img
                src={getGameLogo('light')}
                alt="Cricket Manager 25"
                className="h-8"
              />
            </button>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded hover:bg-cricket-primary transition-colors text-text-secondary hover:text-white flex-shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasBadge = item.badge && item.badge > 0;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`${item.path === '/game/inbox' ? 'inbox-link ' : ''}flex items-center justify-between p-2.5 rounded transition-colors ${
                    currentPath === item.path
                      ? 'bg-cricket-primary text-white shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-cricket-primary/30'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5" />
                    {!sidebarCollapsed && (
                      <span className="ml-3 font-bold text-[15px]">{item.label}</span>
                    )}
                  </div>
                  {hasBadge && !sidebarCollapsed && (
                    <span className="ml-auto bg-cricket-accent text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                  {hasBadge && sidebarCollapsed && (
                    <span className="absolute top-1 right-1 bg-cricket-accent text-white text-xxs font-bold rounded-full w-2 h-2"></span>
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
                <img
                  src={getTeamIcon(userTeam.id)}
                  alt={userTeam.shortName}
                  className="w-4 h-4"
                />
                <span className="font-medium text-cricket-text-primary text-xs">{userTeam.shortName}</span>
              </div>
            )}
            <p>Season {currentSeason} • Week {currentWeek}</p>
            <p className="capitalize">{currentPhase} Phase</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-primary rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-text-primary mb-3">Return to Start Menu?</h3>
            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to return to the start menu? Make sure you've saved your game progress.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmReturnToMenu}
                className="flex-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded font-medium transition-colors"
              >
                Return to Menu
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary py-2 rounded font-medium transition-colors border border-border-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;