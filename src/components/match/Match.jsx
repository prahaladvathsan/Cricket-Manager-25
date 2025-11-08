/**
 * @file Match.jsx
 * @description Live match view for playing matches interactively
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipForward, FastForward, Trophy, ChevronRight, X, AlertCircle
} from 'lucide-react';
import useMatchStore from '../../stores/matchStore';
import usePlayerStore from '../../stores/playerStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import MatchEngine from '../../core/match-engine/core/MatchEngine';
import MatchScorecard from './MatchScorecard';
import CommentaryFeed from './CommentaryFeed';
import TacticsPanel from './TacticsPanel';
import PreMatchModal from './PreMatchModal';

const Match = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  // Subscribe to matchStore updates
  const teams = useMatchStore((state) => state.teams);
  const innings = useMatchStore((state) => state.innings);
  const currentBall = useMatchStore((state) => state.currentBall);
  const ballByBall = useMatchStore((state) => state.ballByBall);
  const matchStatus = useMatchStore((state) => state.status);

  // Store actions
  const initializeMatchStore = useMatchStore((state) => state.initializeMatch);
  const resetMatchStore = useMatchStore((state) => state.resetMatch);

  // League store
  const getFixtureById = useLeagueStore((state) => state.getFixtureById);
  const getNextFixture = useLeagueStore((state) => state.getNextFixture);
  const getClub = useLeagueStore((state) => state.getClub);

  // Team store
  const userTeam = useTeamStore((state) => state.userTeam);

  // Component local state
  const [matchEngine, setMatchEngine] = useState(null);
  const [matchState, setMatchState] = useState('not_started');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showPreMatchModal, setShowPreMatchModal] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [tossResult, setTossResult] = useState(null);
  const [simError, setSimError] = useState(null);
  const autoSimulateRef = useRef(null);

  useEffect(() => {
    // Load match data from league store using matchId parameter
    let fixture = null;

    // Try to get fixture by ID if matchId is provided
    if (matchId) {
      fixture = getFixtureById(matchId);
    }

    // Fallback to next fixture if matchId not found
    if (!fixture) {
      fixture = getNextFixture();
    }

    if (!fixture) {
      console.warn('No fixture found, redirecting to league');
      navigate('/game/league');
      return;
    }

    const homeTeam = getClub(fixture.homeTeam);
    const awayTeam = getClub(fixture.awayTeam);

    setMatchData({
      id: fixture.id,
      homeTeam,
      awayTeam,
      venue: fixture.venue || homeTeam.homeGround,
      weather: fixture.weather || 'Clear',
      matchday: fixture.matchday
    });

    return () => {
      // Cleanup
      if (autoSimulateRef.current) {
        clearInterval(autoSimulateRef.current);
      }
    };
  }, [matchId, getFixtureById, getNextFixture, getClub, navigate]);

  // Initialize match after pre-match modal
  const handleStartMatch = async (toss) => {
    if (!matchData) return;

    try {
      setTossResult(toss);
      setShowPreMatchModal(false);

      // Determine batting team based on toss
      const battingFirst = toss.decision === 'bat' ? toss.winner.id :
                          (toss.winner.id === matchData.homeTeam.id ? matchData.awayTeam.id : matchData.homeTeam.id);

      // Initialize matchStore with match configuration
      initializeMatchStore({
        homeTeam: matchData.homeTeam.id,
        awayTeam: matchData.awayTeam.id,
        venue: matchData.venue,
        tossWinner: toss.winner.id,
        tossDecision: toss.decision,
        battingFirst
      });

      // Create match engine
      const engine = new MatchEngine(
        useMatchStore,
        usePlayerStore,
        useTeamStore,
        { silent: false }
      );

      // Configure for interactive mode
      engine.config.interactiveMode = true;
      engine.config.showBallByBall = true;
      engine.config.simulationSpeed = 'instant'; // No delays in interactive mode

      setMatchEngine(engine);

      // Initialize match (set up opening players, etc.)
      await engine.startMatch({
        ...matchData,
        tossWinner: toss.winner.id,
        tossDecision: toss.decision
      });

      // Pause immediately after initialization (don't auto-simulate)
      engine.isPaused = true;

      setMatchState('in_progress');
    } catch (error) {
      console.error('Error starting match:', error);
      setMatchState('error');
    }
  };

  // Simulate single ball
  const handlePlayBall = async () => {
    if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

    // Clear previous errors
    setSimError(null);

    try {
      setIsSimulating(true);

      // Simulate one ball
      await matchEngine.simulateBall();

      // Check if innings/match is complete
      if (matchEngine.isMatchComplete()) {
        setMatchState('completed');
      } else if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
        // Start second innings automatically
        await matchEngine.startSecondInnings();
      }

      setIsSimulating(false);
    } catch (error) {
      console.error('Error simulating ball:', error);
      setSimError(error.message || 'Failed to simulate ball. Try reloading the match.');
      setIsSimulating(false);
    }
  };

  // Skip entire over
  const handleSkipOver = async () => {
    if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

    // Clear previous errors
    setSimError(null);

    try {
      setIsSimulating(true);

      const ballsRemaining = 6 - (currentBall?.ball || 0);

      for (let i = 0; i < ballsRemaining; i++) {
        if (matchEngine.isInningsComplete() || matchEngine.isMatchComplete()) {
          break;
        }

        await matchEngine.simulateBall();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for visual feedback
      }

      // Check if innings/match is complete
      if (matchEngine.isMatchComplete()) {
        setMatchState('completed');
      } else if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
        // Start second innings automatically
        await matchEngine.startSecondInnings();
      }

      setIsSimulating(false);
    } catch (error) {
      console.error('Error skipping over:', error);
      setSimError(error.message || 'Failed to skip over. Try reloading the match.');
      setIsSimulating(false);
    }
  };

  // Auto-simulate entire match
  const handleAutoSimulate = async () => {
    if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

    // Clear previous errors
    setSimError(null);

    setIsSimulating(true);

    try {
      // Unpause the engine and let it run
      matchEngine.isPaused = false;

      // Simulate balls rapidly until match complete
      while (!matchEngine.isMatchComplete() && !matchEngine.isPaused) {
        await matchEngine.simulateBall();

        // Check if innings complete
        if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
          await matchEngine.startSecondInnings();
        }

        // Small delay to allow UI updates (can be removed for even faster simulation)
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      setMatchState('completed');
      setIsSimulating(false);
    } catch (error) {
      console.error('Error auto-simulating:', error);
      setSimError(error.message || 'Failed to auto-simulate match. Try reloading.');
      matchEngine.isPaused = true;
      setIsSimulating(false);
    }
  };

  // Pause simulation
  const handlePause = () => {
    if (matchEngine) {
      matchEngine.isPaused = true;
    }
    setIsSimulating(false);
  };

  // Handle match completion
  const handleContinue = () => {
    // Navigate back to league/dashboard
    navigate('/game/league');
  };

  // Format score display
  const formatScore = (teamData) => {
    if (!teamData) return '0/0';
    return `${teamData.totalScore || 0}/${teamData.wickets || 0}`;
  };

  // Format overs
  const formatOvers = (overs, balls) => {
    if (!overs && !balls) return '0.0';
    return `${overs || 0}.${balls || 0}`;
  };

  // Determine if user team is batting
  const isUserTeamBatting = () => {
    if (!userTeam || !innings) return false;
    return innings.battingTeam === userTeam.id;
  };

  // Determine current innings number
  const currentInnings = innings?.number || 1;

  if (!matchData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-accent mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading match...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Pre-Match Modal */}
      {showPreMatchModal && (
        <PreMatchModal
          isOpen={showPreMatchModal}
          onClose={() => navigate('/game/league')}
          matchData={matchData}
          onStartMatch={handleStartMatch}
        />
      )}

      <div className="space-y-4">
        {/* Match Header */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Trophy className="w-5 h-5 text-cricket-accent" />
                {matchData.homeTeam?.name} vs {matchData.awayTeam?.name}
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                T20 Match • {matchData.venue} • Matchday {matchData.matchday}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {matchState === 'in_progress' && (
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded animate-pulse">
                  LIVE
                </span>
              )}
              {matchState === 'completed' && (
                <button onClick={handleContinue} className="btn-primary flex items-center gap-1 text-sm py-1.5 px-3">
                  <ChevronRight className="w-4 h-4" />
                  Continue
                </button>
              )}
              <button
                onClick={() => navigate('/game/league')}
                className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                title="Exit match"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className={`text-center p-3 rounded ${
              innings?.battingTeam === matchData.homeTeam?.id
                ? 'bg-cricket-primary/10 border-2 border-cricket-accent'
                : 'bg-bg-tertiary'
            }`}>
              <div className="text-sm font-semibold text-text-primary">
                {matchData.homeTeam?.name}
              </div>
              <div className="text-3xl font-bold text-cricket-accent mt-1">
                {innings?.battingTeam === matchData.homeTeam?.id
                  ? formatScore(teams?.batting)
                  : formatScore(teams?.bowling)}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                {innings?.battingTeam === matchData.homeTeam?.id
                  ? formatOvers(innings?.overs, innings?.balls) + ' overs'
                  : ''}
              </div>
            </div>
            <div className={`text-center p-3 rounded ${
              innings?.battingTeam === matchData.awayTeam?.id
                ? 'bg-cricket-primary/10 border-2 border-cricket-accent'
                : 'bg-bg-tertiary'
            }`}>
              <div className="text-sm font-semibold text-text-primary">
                {matchData.awayTeam?.name}
              </div>
              <div className="text-3xl font-bold text-cricket-accent mt-1">
                {innings?.battingTeam === matchData.awayTeam?.id
                  ? formatScore(teams?.batting)
                  : formatScore(teams?.bowling)}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                {innings?.battingTeam === matchData.awayTeam?.id
                  ? formatOvers(innings?.overs, innings?.balls) + ' overs'
                  : ''}
              </div>
            </div>
          </div>

          {/* Target Display (2nd Innings) */}
          {innings?.number === 2 && innings?.target && (
            <div className="p-2 bg-bg-tertiary rounded text-center text-sm">
              <span className="text-text-secondary">Target: </span>
              <span className="font-bold text-cricket-accent">{innings.target}</span>
              <span className="text-text-secondary ml-3">Required Rate: </span>
              <span className="font-bold">
                {((innings.target - (teams?.batting?.totalScore || 0)) /
                  ((120 - ((innings?.overs || 0) * 6 + (innings?.balls || 0))) / 6)).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {simError && (
          <div className="card p-3 bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-500 mb-1">Simulation Error</h3>
                <p className="text-sm text-red-400">{simError}</p>
              </div>
              <button
                onClick={() => setSimError(null)}
                className="p-1 hover:bg-red-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Match Controls */}
        {matchState === 'in_progress' && (
          <div className="card p-3">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handlePlayBall}
                disabled={isSimulating}
                className="btn-secondary flex items-center gap-2 text-sm py-1.5 px-3"
              >
                <Play className="w-4 h-4" />
                Play Ball
              </button>
              <button
                onClick={handleSkipOver}
                disabled={isSimulating}
                className="btn-secondary flex items-center gap-2 text-sm py-1.5 px-3"
              >
                <SkipForward className="w-4 h-4" />
                Skip Over
              </button>
              {!isSimulating ? (
                <button
                  onClick={handleAutoSimulate}
                  className="btn-primary flex items-center gap-2 text-sm py-1.5 px-3"
                >
                  <FastForward className="w-4 h-4" />
                  Auto-Simulate
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="btn-secondary flex items-center gap-2 text-sm py-1.5 px-3"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Scorecard (5 columns) */}
          <div className="lg:col-span-5">
            <div className="card p-4">
              <MatchScorecard
                matchData={matchData}
                innings={innings}
                currentInnings={currentInnings}
              />
            </div>
          </div>

          {/* Center Column: Commentary (4 columns) */}
          <div className="lg:col-span-4">
            <div className="card p-4">
              <CommentaryFeed
                ballByBall={ballByBall}
                autoScroll={true}
              />
            </div>
          </div>

          {/* Right Column: Tactics Panel (3 columns) - Only for user team */}
          {userTeam && (
            <div className="lg:col-span-3">
              <TacticsPanel
                userTeamId={userTeam.id}
                isUserTeamBatting={isUserTeamBatting()}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Match;
