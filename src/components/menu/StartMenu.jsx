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
  BookOpen,
  Info,
  Globe
} from 'lucide-react';
import '../../styles/wallpaper.css';
import { getGameLogo } from '../../utils/assetHelpers';

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
      id: 'multiplayer',
      label: 'Multiplayer',
      icon: Globe,
      description: 'Compete with 10 players in turn-based league mode',
      action: () => navigate('/multiplayer'),
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
      action: () => navigate('/settings')
    },
    {
      id: 'manual',
      label: 'Game Manual',
      icon: BookOpen,
      description: 'Complete guide to Cricket Manager',
      action: () => navigate('/manual')
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
    <div className="min-h-screen app-wallpaper flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo and Heading */}
        <div className="text-center mb-8">
          <img
            src={getGameLogo('light')}
            alt="Cricket Manager 25"
            className="h-32 mx-auto mb-4"
          />

        </div>

        {/* Menu Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {menuOptions.map((option) => {
            const Icon = option.icon;
            const isDisabled = !!option.badge;

            return (
              <button
                key={option.id}
                onClick={option.action}
                disabled={isDisabled}
                onMouseEnter={() => setSelectedOption(option.id)}
                onMouseLeave={() => setSelectedOption(null)}
                className={`
                  relative card px-6 py-5 text-left transition-all duration-200
                  ${selectedOption === option.id ? 'ring-2 ring-cricket-primary scale-[1.02]' : ''}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cricket-primary/10 cursor-pointer'}
                `}
              >
                {/* Badge */}
                {option.badge && (
                  <div className="absolute top-2 right-2">
                    <span className={`
                      px-1.5 py-0.5 rounded text-xs font-semibold
                      ${option.badge === 'Coming Soon' ? 'bg-blue-900/50 text-blue-300' : 'bg-yellow-900/50 text-yellow-300'}
                    `}>
                      {option.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cricket-secondary rounded-lg">
                    <Icon className="w-6 h-6 text-cricket-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-cricket-text-primary">
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
        <div className="mt-4 text-center text-xs text-cricket-text-secondary">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;
