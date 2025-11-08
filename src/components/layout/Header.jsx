/**
 * @file Header.jsx
 * @description Top header component with quick actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, ChevronRight, Users, Play, FastForward, ArrowLeft } from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useMatchStore from '../../stores/matchStore';
import useNavigationStore from '../../stores/navigationStore';
import useInboxStore from '../../stores/inboxStore';
import SaveGameModal from '../shared/SaveGameModal';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import MessageGenerator from '../../utils/MessageGenerator';

const Header = () => {
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const {
    currentSeason,
    currentPhase,
    currentDate,
    gameDay,
    currentWeek,
    advanceDay,
    getCurrentEvent,
    isWeekend,
    calendarEvents
  } = useGameStore();
  const { getUserTeam } = useTeamStore();
  const { getClub, recordResult, recalculateStandings, advanceToNextMatch } = useLeagueStore();
  const { goBack, canGoBack } = useNavigationStore();
  const { addMessage } = useInboxStore();

  const userTeam = getUserTeam();
  const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Handle Continue button click
  const handleContinue = async () => {
    if (isSimulating) return;

    // Check for event on current day
    const event = getCurrentEvent();

    if (event && event.type === 'match') {
      // Match event - navigate to match or quick-sim
      const fixture = event.data;
      const isUserMatch = fixture && userTeam && (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);

      if (isUserMatch) {
        // Navigate to match view for user team matches
        navigate(`/game/match/${fixture.matchId}`);
      } else {
        // Quick-sim AI vs AI match
        setIsSimulating(true);

        try {
          const homeTeam = getClub(fixture.homeTeam);
          const awayTeam = getClub(fixture.awayTeam);

          if (!homeTeam || !awayTeam) {
            throw new Error('Team data not found for match');
          }

          const matchConfig = {
            id: fixture.matchId,
            homeTeam,
            awayTeam,
            venue: fixture.venue || homeTeam.homeGround,
            tossWinner: Math.random() < 0.5 ? homeTeam.id : awayTeam.id,
            tossDecision: Math.random() < 0.5 ? 'bat' : 'bowl'
          };

          // Run quick simulation
          const result = await quickSimMatch(
            matchConfig,
            useMatchStore,
            usePlayerStore,
            useTeamStore
          );

          if (!result || !result.winner) {
            throw new Error('Invalid match result');
          }

          // Record result and update standings
          recordResult(result);
          recalculateStandings();
          advanceToNextMatch();

          // Advance day after match
          advanceDay();
        } catch (error) {
          console.error('Error simulating match:', error);
        } finally {
          setIsSimulating(false);
        }
      }
    } else if (event && event.type === 'auction') {
      // Navigate to auction page
      navigate('/game/auction');
    } else {
      // Advance day (no event or rest day)
      const dayInfo = advanceDay();

      // Check if tomorrow has a match event
      const tomorrowEvent = calendarEvents.find(e => e.day === dayInfo.gameDay + 1);
      if (tomorrowEvent && tomorrowEvent.type === 'match' && userTeam) {
        const fixture = tomorrowEvent.data;
        const isUserMatch = fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id;

        if (isUserMatch) {
          // Generate match reminder message
          const homeTeam = getClub(fixture.homeTeam);
          const awayTeam = getClub(fixture.awayTeam);
          const isUserHome = fixture.homeTeam === userTeam.id;

          if (homeTeam && awayTeam) {
            addMessage(MessageGenerator.generateMatchReminderMessage(
              fixture,
              homeTeam,
              awayTeam,
              isUserHome
            ));
          }
        }
      }
    }
  };

  // Get button label based on current event
  const getContinueButtonLabel = () => {
    if (isSimulating) return 'Simulating...';

    const event = getCurrentEvent();
    if (event && event.type === 'match') {
      const fixture = event.data;
      const isUserMatch = fixture && userTeam && (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);
      return isUserMatch ? 'Matchday' : 'Simulate Match';
    } else if (event && event.type === 'auction') {
      return 'Auction';
    } else {
      return 'Continue';
    }
  };

  // Handle back button
  const handleBack = () => {
    const previousRoute = goBack();
    if (previousRoute) {
      navigate(previousRoute);
    }
  };

  // Handle Save
  const handleSave = () => {
    setShowSaveModal(true);
  };

  return (
    <>
      <header className="bg-cricket-surface border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Current Context */}
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            {canGoBack() && (
              <button
                onClick={handleBack}
                className="p-2 rounded hover:bg-cricket-primary/20 transition-colors text-cricket-text-secondary hover:text-cricket-text-primary"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-cricket-text-primary">
                {userTeam ? userTeam.name : 'Select Team'}
              </h2>
              <p className="text-xs text-cricket-text-secondary">
                Season {currentSeason} • Week {currentWeek} • Day {gameDay} • {formattedDate}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              onClick={handleContinue}
              disabled={isSimulating}
              className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2 disabled:opacity-50"
            >
              {isSimulating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (() => {
                const event = getCurrentEvent();
                if (event && event.type === 'match') {
                  return <Play className="w-4 h-4" />;
                } else if (event && event.type === 'auction') {
                  return <Users className="w-4 h-4" />;
                } else {
                  return <ChevronRight className="w-4 h-4" />;
                }
              })()}
              <span>{getContinueButtonLabel()}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Save Game Modal */}
      <SaveGameModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
      />
    </>
  );
};

export default Header;
