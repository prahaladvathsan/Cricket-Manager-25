/**
 * @file PreMatchFlow.jsx
 * @description Full-screen pre-match flow - standalone route like MatchdayUI
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Settings
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import PreviewTab from './tabs/PreviewTab';
import TossTab from './tabs/TossTab';
import LineupsTab from './tabs/LineupsTab';
import LoadingScreen from '../shared/LoadingScreen';

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

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

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
      <LoadingScreen
        message="Preparing Match"
        submessage="Loading match data..."
      />
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

  // Validate user team tactics
  const validateUserTactics = () => {
    const { getTeamTactics } = useTeamStore.getState();
    const { players } = usePlayerStore.getState();
    const userTeamId = userTeam?.id;

    if (!userTeamId) return { valid: true, errors: [] };

    const tactics = getTeamTactics(userTeamId);
    const errors = [];

    if (!tactics) {
      errors.push('Tactics not initialized');
      return { valid: false, errors };
    }

    // Validate squad selection
    if (!tactics.squadSelection || tactics.squadSelection.length !== 11) {
      errors.push('Must select exactly 11 players');
    }

    // Validate minimum bowlers
    const bowlers = tactics.squadSelection?.filter(playerId => {
      const player = players[playerId];
      return player && (player.role === 'bowler' || player.role === 'all-rounder');
    }) || [];

    if (bowlers.length < 5) {
      errors.push('Must have at least 5 bowling options');
    }

    // Validate wicket-keeper
    const hasWicketKeeper = tactics.squadSelection?.some(playerId => {
      const player = players[playerId];
      return player && player.role === 'wicket-keeper';
    });

    if (!hasWicketKeeper) {
      errors.push('Must have at least 1 wicket-keeper');
    }

    // Validate batting order
    if (!tactics.battingOrder || tactics.battingOrder.length !== 11) {
      errors.push('Batting order must have all 11 players');
    }

    // CRITICAL: Validate no injured players in playing XI
    const injuredPlayers = tactics.squadSelection?.filter(playerId => {
      const player = players[playerId];
      return player && player.condition?.injury;
    }) || [];

    if (injuredPlayers.length > 0) {
      const injuredPlayerNames = injuredPlayers.map(id => {
        const player = players[id];
        return `${player.name} (${player.condition.injuryDuration}d)`;
      }).join(', ');
      errors.push(`Injured players in XI: ${injuredPlayerNames}`);
    }

    return { valid: errors.length === 0, errors };
  };

  // Handle Continue button
  const handleContinue = () => {
    if (currentPhase === 0) {
      // CRITICAL: Validate tactics before allowing user to continue from Preview & Tactics phase
      const validation = validateUserTactics();
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setShowValidationModal(true);
        return; // Block progression
      }
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
                  <div className={`text-xs font-semibold drop-shadow-lg transition-colors ${idx === currentPhase
                    ? 'text-cricket-accent'
                    : idx < currentPhase
                      ? 'text-white'
                      : 'text-white/40'
                    }`}>
                    {phase}
                  </div>
                  {/* Progress bar */}
                  <div
                    className={`w-20 h-1.5 rounded-full transition-colors ${idx === currentPhase
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
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition-all shadow-sm flex-shrink-0 ${canContinue()
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

      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-bg-secondary border border-red-500/50 rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-red-500/10 px-6 py-4 border-b border-red-500/20 flex items-center gap-3">
              <div className="bg-red-500/20 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Issues Detected</h3>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-text-secondary mb-4">
                Please resolve the following issues with your team tactics before proceeding to the match:
              </p>

              <div className="bg-red-950/30 border border-red-500/20 rounded-md p-4 mb-6">
                <ul className="space-y-2">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-red-200 text-sm">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/game/tactics')}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold"
                >
                  <Settings className="w-5 h-5" />
                  Resolve in Tactics Page
                </button>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="btn-secondary w-full py-2 text-text-secondary hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreMatchFlow;
