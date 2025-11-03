/**
 * @file StartMenu.jsx
 * @description Main start menu with all game entry points
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  FolderOpen,
  Zap,
  Users,
  Settings,
  Download,
  BookOpen,
  Info,
  Trophy
} from 'lucide-react';

const StartMenu = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(null);

  const menuOptions = [
    {
      id: 'new-game',
      label: 'Start New Game',
      icon: Play,
      description: 'Begin a fresh career in the World Premier League',
      action: () => navigate('/team-selection')
    },
    {
      id: 'load-game',
      label: 'Load Game',
      icon: FolderOpen,
      description: 'Continue from a saved game',
      action: () => navigate('/load-game')
    },
    {
      id: 'quick-match',
      label: 'Quick Match',
      icon: Zap,
      description: 'Play an exhibition match without career mode',
      action: () => navigate('/quick-match'),
      badge: 'Coming Soon'
    },
    {
      id: 'player-browser',
      label: 'Player Database',
      icon: Users,
      description: 'Browse all 545 players and their stats',
      action: () => navigate('/player-browser')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Configure game preferences',
      action: () => navigate('/settings'),
      badge: 'Placeholder'
    },
    {
      id: 'download-db',
      label: 'Download Latest Database',
      icon: Download,
      description: 'Update player database with latest stats',
      action: () => alert('Database download feature coming soon!'),
      badge: 'Placeholder'
    },
    {
      id: 'tutorial',
      label: 'Tutorial',
      icon: BookOpen,
      description: 'Learn how to play Cricket Manager',
      action: () => navigate('/tutorial'),
      badge: 'Placeholder'
    },
    {
      id: 'credits',
      label: 'Credits',
      icon: Info,
      description: 'About Cricket Manager 25',
      action: () => navigate('/credits')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-dark via-cricket-secondary to-cricket-dark flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Trophy className="w-16 h-16 text-cricket-accent" />
            <div>
              <h1 className="text-6xl font-bold text-cricket-text-primary tracking-tight">
                Cricket Manager
              </h1>
              <p className="text-xl text-cricket-accent font-semibold mt-2">
                2025 Edition
              </p>
            </div>
          </div>
          <p className="text-cricket-text-secondary text-sm">
            World Premier League • Ball-by-Ball Simulation • 545 Players
          </p>
        </div>

        {/* Menu Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menuOptions.map((option) => {
            const Icon = option.icon;
            const isDisabled = option.badge && option.badge !== 'Coming Soon';

            return (
              <button
                key={option.id}
                onClick={option.action}
                disabled={isDisabled}
                onMouseEnter={() => setSelectedOption(option.id)}
                onMouseLeave={() => setSelectedOption(null)}
                className={`
                  relative card p-6 text-left transition-all duration-200
                  ${selectedOption === option.id ? 'ring-2 ring-cricket-primary scale-105' : ''}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cricket-primary/10 cursor-pointer'}
                `}
              >
                {/* Badge */}
                {option.badge && (
                  <div className="absolute top-3 right-3">
                    <span className={`
                      px-2 py-1 rounded text-xs font-semibold
                      ${option.badge === 'Coming Soon' ? 'bg-blue-900/50 text-blue-300' : 'bg-yellow-900/50 text-yellow-300'}
                    `}>
                      {option.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cricket-secondary rounded-lg">
                    <Icon className="w-6 h-6 text-cricket-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-cricket-text-primary mb-1">
                      {option.label}
                    </h3>
                    <p className="text-sm text-cricket-text-secondary">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-cricket-text-secondary">
          <p>Version 1.0.0 • Built with React + Vite</p>
          <p className="mt-1">
            Press any menu option to begin your journey
          </p>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;
