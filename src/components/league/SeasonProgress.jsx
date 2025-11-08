/**
 * @file SeasonProgress.jsx
 * @description Season progress card showing current status and next fixture
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  TrendingUp,
  Play,
  FastForward,
  Trophy,
  MapPin,
  Clock,
  AlertCircle,
  X as CloseIcon
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';
import useMatchStore from '../../stores/matchStore';
import usePlayerStore from '../../stores/playerStore';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import MatchResultModal from '../shared/MatchResultModal';

const SeasonProgress = () => {
  const navigate = useNavigate();

  // Component state
  const [showResultModal, setShowResultModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);

  // League store
  const getSeasonProgress = useLeagueStore((state) => state.getSeasonProgress);
  const getNextFixture = useLeagueStore((state) => state.getNextFixture);
  const isUserTeamMatch = useLeagueStore((state) => state.isUserTeamMatch);
  const getClub = useLeagueStore((state) => state.getClub);
  const recordResult = useLeagueStore((state) => state.recordResult);
  const advanceToNextMatch = useLeagueStore((state) => state.advanceToNextMatch);
  const stage = useLeagueStore((state) => state.stage);
  const seasonName = useLeagueStore((state) => state.seasonName);

  // Team store
  const userTeam = useTeamStore((state) => state.userTeam);

  const progress = getSeasonProgress();
  const nextFixture = getNextFixture();
  const isUserMatch = nextFixture ? isUserTeamMatch(nextFixture, userTeam?.id) : false;

  // Get team details for next fixture
  const homeTeam = nextFixture ? getClub(nextFixture.homeTeam) : null;
  const awayTeam = nextFixture ? getClub(nextFixture.awayTeam) : null;

  // Handle play/continue button
  const handlePlayMatch = async () => {
    if (!nextFixture || isSimulating) return;

    // Clear previous errors
    setSimError(null);

    if (isUserMatch) {
      // Navigate to match view for user team matches
      navigate(`/game/match/${nextFixture.id}`);
    } else {
      // Quick-sim AI vs AI match
      setIsSimulating(true);

      try {
        // Validate teams exist
        if (!homeTeam || !awayTeam) {
          throw new Error('Team data not found for match');
        }

        const matchConfig = {
          id: nextFixture.id,
          homeTeam,
          awayTeam,
          venue: nextFixture.venue || homeTeam.homeGround,
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

        // Validate result
        if (!result || !result.winner) {
          throw new Error('Invalid match result received');
        }

        // Record result in league store
        recordResult(result);

        // Show result modal
        setMatchResult(result);
        setShowResultModal(true);
      } catch (error) {
        console.error('Error quick-simulating match:', error);
        setSimError(error.message || 'Failed to simulate match. Please try again.');
      } finally {
        setIsSimulating(false);
      }
    }
  };

  // Handle result modal close
  const handleResultModalClose = () => {
    setShowResultModal(false);
    setMatchResult(null);
  };

  // Handle continue after AI match
  const handleContinueAfterAI = () => {
    advanceToNextMatch();
    handleResultModalClose();
  };

  // If season is complete
  if (!nextFixture && stage === 'completed') {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-5 h-5 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">
            Season Complete
          </h3>
        </div>
        <div className="text-center py-6">
          <Trophy className="w-16 h-16 mx-auto mb-3 text-trophy-gold" />
          <p className="text-text-primary font-semibold mb-1">
            {seasonName} Complete!
          </p>
          <p className="text-sm text-text-secondary">
            View final standings and champion below
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Match Result Modal */}
      {showResultModal && matchResult && (
        <MatchResultModal
          isOpen={showResultModal}
          onClose={handleResultModalClose}
          matchResult={matchResult}
          onContinue={handleContinueAfterAI}
        />
      )}

      <div className="card p-4">
        {/* Error Alert */}
        {simError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-400">{simError}</p>
              </div>
              <button
                onClick={() => setSimError(null)}
                className="p-0.5 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
              >
                <CloseIcon className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">
            Season Progress
          </h3>
          <span className="ml-auto text-xs text-text-secondary">
            {stage === 'league' ? 'League Stage' : 'Playoffs'}
          </span>
        </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Matches Completed</span>
          <span className="font-mono text-text-primary">
            {progress.completed}/{progress.totalFixtures}
          </span>
        </div>
        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-cricket-accent transition-all duration-300"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{progress.remaining} matches remaining</span>
          <span className="font-semibold text-cricket-accent">
            {progress.progressPercent}%
          </span>
        </div>
      </div>

      {/* Next Fixture */}
      {nextFixture && homeTeam && awayTeam && (
        <div className="border-t border-border-primary pt-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-cricket-accent" />
            <span className="text-xs font-medium text-text-secondary">
              Next Fixture
            </span>
            {isUserMatch && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-cricket-primary/20 text-cricket-accent rounded">
                Your Match
              </span>
            )}
          </div>

          {/* Teams */}
          <div className="space-y-2 mb-3">
            {/* Home Team */}
            <div className={`flex items-center gap-2 p-2 rounded ${
              homeTeam.id === userTeam?.id ? 'bg-cricket-primary/10 border border-cricket-accent/30' : 'bg-bg-tertiary'
            }`}>
              <div
                className="w-8 h-8 rounded-full border flex-shrink-0"
                style={{
                  backgroundColor: homeTeam.colors?.primary || '#2D5F3F',
                  borderColor: homeTeam.colors?.secondary || '#D4AF37'
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {homeTeam.name}
                  </span>
                  {homeTeam.id === userTeam?.id && (
                    <span className="text-xs text-cricket-accent">You</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-text-secondary">Home</span>
            </div>

            {/* Away Team */}
            <div className={`flex items-center gap-2 p-2 rounded ${
              awayTeam.id === userTeam?.id ? 'bg-cricket-primary/10 border border-cricket-accent/30' : 'bg-bg-tertiary'
            }`}>
              <div
                className="w-8 h-8 rounded-full border flex-shrink-0"
                style={{
                  backgroundColor: awayTeam.colors?.primary || '#2D5F3F',
                  borderColor: awayTeam.colors?.secondary || '#D4AF37'
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {awayTeam.name}
                  </span>
                  {awayTeam.id === userTeam?.id && (
                    <span className="text-xs text-cricket-accent">You</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-text-secondary">Away</span>
            </div>
          </div>

          {/* Match Details */}
          <div className="flex items-center gap-4 text-xs text-text-secondary mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{nextFixture.venue || homeTeam.homeGround}</span>
            </div>
            {nextFixture.matchday && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Matchday {nextFixture.matchday}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handlePlayMatch}
            disabled={isSimulating}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded font-medium transition-colors ${
              isUserMatch
                ? 'bg-cricket-accent text-white hover:bg-cricket-accent/90 disabled:opacity-50'
                : 'bg-bg-tertiary text-text-primary hover:bg-border-primary disabled:opacity-50'
            }`}
          >
            {isSimulating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Simulating...</span>
              </>
            ) : isUserMatch ? (
              <>
                <Play className="w-4 h-4" />
                <span>Play Match</span>
              </>
            ) : (
              <>
                <FastForward className="w-4 h-4" />
                <span>Quick Simulate</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
    </>
  );
};

export default SeasonProgress;
