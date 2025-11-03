/**
 * @file Header.jsx
 * @description Top header component with quick actions
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, Play } from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useMatchStore from '../../stores/matchStore';
import GameController from '../../core/game/GameController';
import GameEventModal from '../shared/GameEventModal';
import SaveGameModal from '../shared/SaveGameModal';

const Header = () => {
  const navigate = useNavigate();
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);

  const gameStore = useGameStore();
  const teamStore = useTeamStore();
  const leagueStore = useLeagueStore();
  const playerStore = usePlayerStore();
  const matchStore = useMatchStore();

  const { currentSeason, currentPhase, currentDate } = gameStore;
  const { getUserTeam } = teamStore;

  const userTeam = getUserTeam();
  const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Initialize GameController
  const gameController = useMemo(() => new GameController({
    gameStore,
    leagueStore,
    teamStore,
    playerStore,
    matchStore
  }), [gameStore, leagueStore, teamStore, playerStore, matchStore]);

  // Handle Continue button click
  const handleContinue = () => {
    console.log('Continue button clicked!');
    console.log('Current Phase:', gameStore.currentPhase);
    console.log('User Team ID:', teamStore.userTeamId);

    try {
      const nextEvent = gameController.getNextEvent();
      console.log('Next Event:', nextEvent);
      setCurrentEvent(nextEvent);
      setShowEventModal(true);
    } catch (error) {
      console.error('Error getting next event:', error);
      alert('Error: ' + error.message);
    }
  };

  // Handle event action
  const handleEventAction = (shouldSimulate) => {
    if (!currentEvent) return;

    // Close modal before navigation
    setShowEventModal(false);

    // Handle different event types
    switch (currentEvent.type) {
      case 'team_selection':
        // Navigate to squad page for team selection
        navigate('/game/squad');
        break;

      case 'auction':
        // Navigate to auction page
        navigate('/game/auction');
        break;

      case 'season_start':
        // Initialize league season
        gameController.initializeLeagueSeason();
        break;

      case 'match':
      case 'playoff_match':
        if (shouldSimulate) {
          // Simulate match
          console.log('Simulate match:', currentEvent.data);
          // TODO: Call match simulation logic
        } else {
          // Play match interactively - navigate to match page
          navigate('/game/match', { state: { matchData: currentEvent.data } });
        }
        break;

      case 'simulate_others':
        // Simulate all pending matches
        console.log('Simulating other matches...');
        // TODO: Call league simulation logic
        break;

      case 'league_end':
        // Transition to playoffs
        gameController.startPlayoffs();
        break;

      case 'season_end':
        // End season
        gameController.endSeason();
        break;

      default:
        console.log('Unknown event type:', currentEvent.type);
    }
  };

  // Handle Save
  const handleSave = () => {
    setShowSaveModal(true);
  };

  // Handle Settings
  const handleSettings = () => {
    console.log('Opening settings...');
    // TODO: Implement settings modal
  };

  return (
    <>
      <header className="bg-cricket-surface border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Current Context */}
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-base font-semibold text-cricket-text-primary">
                {userTeam ? userTeam.name : 'Select Team'}
              </h2>
              <p className="text-xs text-cricket-text-secondary">
                Season {currentSeason} • {currentPhase} • {formattedDate}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSettings}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
            <button
              onClick={handleSave}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              onClick={handleContinue}
              className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Continue</span>
            </button>
          </div>
        </div>
      </header>

      {/* Game Event Modal */}
      <GameEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        event={currentEvent}
        onProceed={handleEventAction}
      />

      {/* Save Game Modal */}
      <SaveGameModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
      />
    </>
  );
};

export default Header;
