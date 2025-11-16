/**
 * @file PreMatchFlow.jsx
 * @description Full-screen pre-match flow - standalone route like MatchdayUI
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';
import PreviewTab from './tabs/PreviewTab';
import TossTab from './tabs/TossTab';
import LineupsTab from './tabs/LineupsTab';

const PreMatchFlow = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { getFixtureById, clubs } = useLeagueStore();
  const { getUserTeam } = useTeamStore();

  const [currentPhase, setCurrentPhase] = useState(0); // 0: Preview, 1: Toss, 2: Lineups
  const [matchData, setMatchData] = useState(null);
  const [tossState, setTossState] = useState({
    completed: false,
    animating: false,
    caller: null,
    winner: null,
    userWonToss: false,
    userCalledToss: false,
    decision: null,
    decisionMade: false
  });

  const userTeam = getUserTeam();

  useEffect(() => {
    if (!matchId) return;

    const fixture = getFixtureById(matchId);
    if (!fixture) {
      console.warn('Fixture not found');
      navigate('/game/matches');
      return;
    }

    const homeTeamData = clubs[fixture.homeTeam];
    const awayTeamData = clubs[fixture.awayTeam];

    if (!homeTeamData || !awayTeamData) {
      console.warn('Team data not found');
      return;
    }

    setMatchData({
      id: fixture.id,
      homeTeam: homeTeamData,
      awayTeam: awayTeamData,
      venue: fixture.venue || `${homeTeamData.name} Stadium`,
      date: fixture.date || 'Match Day',
      matchday: fixture.matchday,
      matchType: 'League Match',
      userTeamId: userTeam?.id
    });
  }, [matchId, getFixtureById, clubs, userTeam, navigate]);

  if (!matchData) {
    return (
      <div className="fixed inset-0 bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  const phases = ['Preview & Tactics', 'Toss', 'Lineups'];

  // Handle toss completion
  const handleTossComplete = (newTossState) => {
    setTossState(newTossState);
  };

  // Handle start match
  const handleStartMatch = () => {
    navigate(`/game/match/${matchId}/live`, {
      state: {
        matchData: {
          ...matchData,
          toss: tossState
        }
      }
    });
  };

  // Handle Continue button
  const handleContinue = () => {
    if (currentPhase === 0) {
      setCurrentPhase(1);
    } else if (currentPhase === 1) {
      if (tossState.completed && tossState.decision) {
        setCurrentPhase(2);
      }
    } else if (currentPhase === 2) {
      handleStartMatch();
    }
  };

  // Handle Back button
  const handleBack = () => {
    if (currentPhase === 0) {
      navigate(`/game/match/${matchId}/preview`);
    } else {
      setCurrentPhase(currentPhase - 1);
    }
  };

  // Check if Continue button should be enabled
  const canContinue = () => {
    if (currentPhase === 0) return true;
    if (currentPhase === 1) return tossState.completed && tossState.decision;
    if (currentPhase === 2) return true;
    return false;
  };

  // Get Continue button text
  const getContinueButtonText = () => {
    if (currentPhase === 2) return 'Start Match';
    return 'Continue';
  };

  // Gradient background using team colors
  const gradientStyle = {
    background: `linear-gradient(to right, ${matchData.homeTeam.colors?.primary || '#2D5F3F'} 0%, #1a1a1a 50%, ${matchData.awayTeam.colors?.primary || '#2D5F3F'} 100%)`
  };

  return (
    <div className="fixed inset-0 bg-bg-primary flex flex-col">
      {/* Header - Matching MatchdayUI style */}
      <div style={gradientStyle} className="border-b-2 border-cricket-primary/30 shadow-lg">
        <div className="flex items-stretch h-20 relative">
          {/* Left: Back button (fixed width) */}
          <div className="w-20 flex items-center justify-center border-r border-white/10 flex-shrink-0">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-black/20 rounded transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-white drop-shadow-lg" />
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col justify-center px-6 py-2 min-w-0">
            {/* Match info header */}
            <p className="text-xs text-white/70 drop-shadow-lg mb-2 text-center">
              {matchData.homeTeam.shortName} vs {matchData.awayTeam.shortName}
            </p>

            {/* Tab titles and Progress indicators */}
            <div className="flex items-center justify-center gap-8">
              {phases.map((phase, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 min-w-[100px]">
                  {/* Tab title */}
                  <div className={`text-xs font-semibold drop-shadow-lg transition-colors ${
                    idx === currentPhase
                      ? 'text-cricket-accent'
                      : idx < currentPhase
                      ? 'text-white'
                      : 'text-white/40'
                  }`}>
                    {phase}
                  </div>
                  {/* Progress bar */}
                  <div
                    className={`w-20 h-1.5 rounded-full transition-colors ${
                      idx === currentPhase
                        ? 'bg-cricket-accent shadow-lg'
                        : idx < currentPhase
                        ? 'bg-cricket-primary/80'
                        : 'bg-white/20'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Continue button (absolute positioning) */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <button
              onClick={handleContinue}
              disabled={!canContinue()}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition-all shadow-sm flex-shrink-0 ${
                canContinue()
                  ? 'bg-cricket-primary hover:bg-cricket-primary-light text-white hover:shadow-md'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <span>{getContinueButtonText()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-full p-3">
          <div className="max-w-5xl mx-auto">
            {currentPhase === 0 && (
              <PreviewTab matchData={matchData} />
            )}

            {currentPhase === 1 && (
              <TossTab
                matchData={matchData}
                tossState={tossState}
                onTossComplete={handleTossComplete}
              />
            )}

            {currentPhase === 2 && (
              <LineupsTab
                matchData={matchData}
                tossState={tossState}
                onStartMatch={handleStartMatch}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreMatchFlow;
