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
  Globe,
  Sparkles
} from 'lucide-react';
import '../../styles/wallpaper.css';
import { getGameLogo } from '../../utils/assetHelpers';
import PatchNotesModal from './PatchNotesModal';
import usePlayerStore from '../../stores/playerStore';

const StartMenu = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(null);
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  // Get dynamic player count
  const { players } = usePlayerStore();
  const playerCount = players ? (Array.isArray(players) ? players.length : Object.keys(players).length) : 0;

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
      label: 'Player Database Editor',
      icon: Users,
      description: `Browse and edit all ${playerCount} players and their stats`,
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
        <div className="mt-4 text-center text-xs text-cricket-text-secondary flex justify-center gap-4 items-center">
          {/* Animated Version Badge */}
          <button
            onClick={() => setShowPatchNotes(true)}
            className="group relative px-3 py-1.5 bg-gradient-to-r from-cricket-accent/20 to-cricket-accent/10 border border-cricket-accent/30 rounded-full hover:from-cricket-accent/30 hover:to-cricket-accent/20 hover:border-cricket-accent/50 transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cricket-accent animate-pulse" />
              <span className="text-cricket-accent font-semibold">v1.1.4</span>
              <span className="text-cricket-text-tertiary text-[10px]">NEW!</span>
            </div>
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cricket-accent text-black text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              What's New? Click to see! ✨
            </div>
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 bg-cricket-accent/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </button>

          <span className="text-cricket-text-secondary/50">•</span>
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cricket-primary transition-colors hover:underline"
          >
            Privacy Policy
          </a>
          <span className="text-cricket-text-secondary/50">•</span>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cricket-primary transition-colors hover:underline"
          >
            Terms of Service
          </a>
        </div>
      </div>

      {/* Patch Notes Modal */}
      <PatchNotesModal
        isOpen={showPatchNotes}
        onClose={() => setShowPatchNotes(false)}
      />
    </div>
  );
};

export default StartMenu;
