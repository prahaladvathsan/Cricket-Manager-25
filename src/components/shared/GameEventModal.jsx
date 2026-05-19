/**
 * @file GameEventModal.jsx
 * @description Modal for displaying game progression events
 */

import React from 'react';
import {
  X,
  Trophy,
  Target,
  Calendar,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const GameEventModal = ({ isOpen, onClose, event, onProceed }) => {
  if (!isOpen || !event) return null;

  const getEventConfig = () => {
    switch (event.type) {
      case 'team_selection':
        return {
          icon: Trophy,
          title: 'Welcome to Cricket Manager',
          description: event.message,
          actionLabel: 'Select Team',
          showProceed: true
        };

      case 'auction':
        return {
          icon: Target,
          title: 'Player Auction',
          description: event.message,
          actionLabel: 'Go to Auction',
          showProceed: true
        };

      case 'season_start':
        return {
          icon: Calendar,
          title: 'Season Starting',
          description: 'The league season is ready to begin. Good luck!',
          actionLabel: 'Start Season',
          showProceed: true
        };

      case 'match':
        return {
          icon: Target,
          title: 'Next Match',
          description: `${event.data?.homeTeam} vs ${event.data?.awayTeam}`,
          subtitle: event.data?.venue ? `Venue: ${event.data.venue}` : null,
          actionLabel: 'Play Match',
          showProceed: true,
          showSkip: true
        };

      case 'simulate_others':
        return {
          icon: Calendar,
          title: 'Other Matches',
          description: event.message,
          actionLabel: 'Simulate Matches',
          showProceed: true
        };

      case 'league_end':
        return {
          icon: Trophy,
          title: 'League Complete!',
          description: event.message,
          actionLabel: 'View Standings',
          showProceed: true
        };

      case 'playoff_match':
        return {
          icon: Trophy,
          title: 'Playoff Match',
          description: event.message,
          actionLabel: 'Play Match',
          showProceed: true,
          showSkip: true
        };

      case 'season_end':
        return {
          icon: CheckCircle,
          title: 'Season Complete!',
          description: 'Congratulations on completing the season!',
          actionLabel: 'View Results',
          showProceed: true
        };

      default:
        return {
          icon: Calendar,
          title: 'Continue',
          description: event.message,
          actionLabel: 'Continue',
          showProceed: true
        };
    }
  };

  const config = getEventConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-black/85 backdrop-blur-md border border-border-primary rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cricket-primary/20 rounded">
              <Icon className="w-5 h-5 text-cricket-accent" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">
              {config.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-text-primary text-lg mb-2">{config.description}</p>
          {config.subtitle && (
            <p className="text-text-secondary text-sm">{config.subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border-primary">
          {config.showSkip && (
            <button
              onClick={() => {
                onProceed(true); // Pass true to indicate skip
                onClose();
              }}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <span>Simulate</span>
            </button>
          )}
          {config.showProceed && (
            <button
              onClick={() => {
                onProceed(false); // Pass false to indicate play
                onClose();
              }}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <span>{config.actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameEventModal;
