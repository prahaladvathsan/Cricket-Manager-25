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
import useAuctionStore from '../../stores/auctionStore';
import SaveGameModal from '../shared/SaveGameModal';
import MatchResultModal from '../match/MatchResultModal';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import MessageGenerator from '../../utils/MessageGenerator';

const Header = () => {
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
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
  const { auctionState } = useAuctionStore();

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
      // Match event - navigate to pre-match flow or quick-sim
      const fixture = event.data;
      const isUserMatch = fixture && userTeam && (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);

      if (isUserMatch) {
        // Navigate to pre-match flow for user team matches
        navigate(`/game/match/${fixture.matchId || fixture.id}/pre-match`);
      } else {
        // Quick-sim AI vs AI match
        setIsSimulating(true);

        try {
          const homeTeam = getClub(fixture.homeTeam);
          const awayTeam = getClub(fixture.awayTeam);

          if (!homeTeam || !awayTeam) {
            throw new Error('Team data not found for match');
          }

          // Get playing XI for both teams
          const homePlayers = usePlayerStore.getState().getPlayersByTeam(homeTeam.id);
          const awayPlayers = usePlayerStore.getState().getPlayersByTeam(awayTeam.id);

          // Select top 11 players for each team (by overall rating or just first 11)
          const homePlayingXI = homePlayers.slice(0, 11).map(p => p.id);
          const awayPlayingXI = awayPlayers.slice(0, 11).map(p => p.id);

          const tossWinnerId = Math.random() < 0.5 ? homeTeam.id : awayTeam.id;
          const tossDecision = Math.random() < 0.5 ? 'bat' : 'bowl';

          const matchConfig = {
            id: fixture.matchId,
            homeTeam: {
              ...homeTeam,
              playingXI: homePlayingXI,  // matchStore expects playingXI
              players: homePlayingXI      // MatchEngine expects players
            },
            awayTeam: {
              ...awayTeam,
              playingXI: awayPlayingXI,
              players: awayPlayingXI
            },
            venue: fixture.venue || homeTeam.homeGround,
            tossWinner: tossWinnerId,
            tossDecision: tossDecision
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

          // Show result modal
          setMatchResult(result);
          setShowResultModal(true);

          // Don't advance day yet - wait for user to close modal
        } catch (error) {
          console.error('Error simulating match:', error);
          // Still advance day on error
          advanceDay();
        } finally {
          setIsSimulating(false);
        }
      }
    } else if (event && event.type === 'auction') {
      // Check if auction is already completed
      if (auctionState === 'completed') {
        // Auction already done, just advance day
        advanceDay();
      } else {
        // Navigate to auction page
        navigate('/game/auction');
      }
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
      // Check if auction is already completed
      if (auctionState === 'completed') {
        return 'Continue';
      }
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

  // Handle Result Modal Close
  const handleResultModalClose = () => {
    setShowResultModal(false);
    setMatchResult(null);
    // Advance day after viewing result
    advanceDay();
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
                  // Check if auction is already completed
                  if (auctionState === 'completed') {
                    return <ChevronRight className="w-4 h-4" />;
                  }
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

      {/* Match Result Modal */}
      <MatchResultModal
        isOpen={showResultModal}
        onClose={handleResultModalClose}
        result={matchResult}
      />
    </>
  );
};

export default Header;
