/**
 * @file MatchLive.jsx
 * @description Full-screen live match view with MatchEngine integration and dynamic tactics
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipForward,
  FastForward,
  X,
  Settings,
  TrendingUp,
  Users,
  Target,
  Zap,
  ArrowRight
} from 'lucide-react';
import useMatchStore from '../../stores/matchStore';
import usePlayerStore from '../../stores/playerStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import useGameStore from '../../stores/gameStore';
import MatchEngine from '../../core/match-engine/core/MatchEngine';
import TeamName from '../shared/TeamName';
import MatchResultModal from '../shared/MatchResultModal';
import { updatePlayerStats, calculatePlayerOfMatch, findTopScorer, findTopBowler, extractPlayerStatsFromBalls } from '../../utils/MatchStatsUpdater';

const MatchLive = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Store state
  const matchStore = useMatchStore();
  const playerStore = usePlayerStore();
  const teamStore = useTeamStore();
  const { getClub, recordResult, recalculateStandings, advanceToNextMatch } = useLeagueStore();
  const { advanceDay } = useGameStore();

  // Component state
  const [matchEngine, setMatchEngine] = useState(null);
  const [matchState, setMatchState] = useState('not_started'); // not_started, in_progress, completed
  const [isSimulating, setIsSimulating] = useState(false);
  const [showTacticsPanel, setShowTacticsPanel] = useState(false);
  const [simError, setSimError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [hasProcessedResult, setHasProcessedResult] = useState(false);
  const autoSimRef = useRef(null);

  // Match data from navigation
  const navMatchData = location.state?.matchData;

  useEffect(() => {
    if (!navMatchData || !navMatchData.toss) {
      console.warn('No match data provided, redirecting to preview');
      navigate(`/game/match/${matchId}/preview`, { replace: true });
      return;
    }

    initializeMatch();

    return () => {
      if (autoSimRef.current) {
        clearInterval(autoSimRef.current);
      }
    };
  }, []);

  // Debug: Log matchState changes
  useEffect(() => {
    console.log('🔄 matchState changed to:', matchState);
  }, [matchState]);

  // Watch matchStore.status for completion
  useEffect(() => {
    console.log('👀 matchStore.status:', matchStore.status);
    if (matchStore.status === 'completed' && matchState !== 'completed') {
      console.log('✅ matchStore status is completed, updating matchState!');
      setMatchState('completed');
    }
  }, [matchStore.status]);

  const initializeMatch = async () => {
    try {
      console.log('🏏 Initializing match with MatchEngine...');

      const toss = navMatchData.toss;
      const homeTeam = navMatchData.homeTeam;
      const awayTeam = navMatchData.awayTeam;

      // Get player squads for both teams
      console.log('🔍 Fetching players for teams:', {
        homeTeamId: homeTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamId: awayTeam.id,
        awayTeamName: awayTeam.name
      });

      // Debug: Check total players in store
      const totalPlayers = Object.keys(playerStore.players).length;
      console.log(`📊 Total players in store: ${totalPlayers}`);

      // Sample a few players to check their currentTeam assignment
      const samplePlayers = Object.values(playerStore.players).slice(0, 5);
      console.log('Sample player assignments:', samplePlayers.map(p => ({
        name: p.name,
        currentTeam: p.currentTeam || 'UNASSIGNED'
      })));

      const homePlayers = playerStore.getPlayersByTeam(homeTeam.id);
      const awayPlayers = playerStore.getPlayersByTeam(awayTeam.id);

      console.log('📊 Players found:', {
        homePlayers: homePlayers.length,
        awayPlayers: awayPlayers.length,
        homePlayersList: homePlayers.map(p => p.name),
        awayPlayersList: awayPlayers.map(p => p.name)
      });

      // Also check squadLists from teamStore
      const homeSquadList = teamStore.squadLists?.[homeTeam.id] || [];
      const awaySquadList = teamStore.squadLists?.[awayTeam.id] || [];

      console.log('📊 SquadLists from teamStore:', {
        homeSquadList: homeSquadList.length,
        awaySquadList: awaySquadList.length
      });

      // Fallback: Use squadLists if getPlayersByTeam doesn't return enough players
      let finalHomePlayers = homePlayers;
      let finalAwayPlayers = awayPlayers;

      if (homePlayers.length < 11 && homeSquadList.length >= 11) {
        console.warn('⚠️ Using squadList for home team as fallback');
        finalHomePlayers = homeSquadList
          .slice(0, 11)
          .map(playerId => playerStore.players[playerId])
          .filter(Boolean);
      }

      if (awayPlayers.length < 11 && awaySquadList.length >= 11) {
        console.warn('⚠️ Using squadList for away team as fallback');
        finalAwayPlayers = awaySquadList
          .slice(0, 11)
          .map(playerId => playerStore.players[playerId])
          .filter(Boolean);
      }

      if (finalHomePlayers.length < 11 || finalAwayPlayers.length < 11) {
        // Better error message with debugging info
        const errorMsg = `Insufficient players in team squads. ` +
          `${homeTeam.name}: ${finalHomePlayers.length} players (need 11), ` +
          `${awayTeam.name}: ${finalAwayPlayers.length} players (need 11). ` +
          `SquadLists: ${homeTeam.name}=${homeSquadList.length}, ${awayTeam.name}=${awaySquadList.length}`;
        throw new Error(errorMsg);
      }

      // Select playing XI (first 11 players)
      const homePlayingXI = finalHomePlayers.slice(0, 11).map(p => p.id);
      const awayPlayingXI = finalAwayPlayers.slice(0, 11).map(p => p.id);

      // Create match config with correct structure for matchStore
      const matchConfig = {
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
        venue: navMatchData.venue,
        tossWinner: toss.winner.id,
        tossDecision: toss.decision
      };

      console.log('✅ Match config prepared:', matchConfig);

      // Create MatchEngine instance
      const engine = new MatchEngine(
        useMatchStore,
        usePlayerStore,
        useTeamStore,
        { silent: false }
      );

      // Configure for interactive mode
      engine.config.interactiveMode = true;
      engine.config.showBallByBall = true;
      engine.config.simulationSpeed = 'instant';

      console.log('✅ MatchEngine created');

      setMatchEngine(engine);

      // Start match (initializes stores and sets up opening players)
      await engine.startMatch(matchConfig);

      // Pause immediately for ball-by-ball control
      engine.isPaused = true;

      setMatchState('in_progress');
      console.log('✅ Match initialized and ready');

    } catch (error) {
      console.error('❌ Error initializing match:', error);
      setSimError(error.message);
      setMatchState('error');
    }
  };

  const handlePlayBall = async () => {
    if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

    setSimError(null);
    setIsSimulating(true);

    try {
      await matchEngine.simulateBall();

      if (matchEngine.isMatchComplete()) {
        console.log('🏏 Match completed! Setting matchState to completed');
        setMatchState('completed');
      } else if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
        await matchEngine.startSecondInnings();
      }
    } catch (error) {
      console.error('Error simulating ball:', error);
      setSimError(error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSkipOver = async () => {
    if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

    setSimError(null);
    setIsSimulating(true);

    try {
      const ballsInOver = 6 - (matchStore.currentBall?.ball || 0);

      for (let i = 0; i < ballsInOver; i++) {
        if (matchEngine.isInningsComplete() || matchEngine.isMatchComplete()) break;
        await matchEngine.simulateBall();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (matchEngine.isMatchComplete()) {
        console.log('🏏 Match completed via Skip Over! Setting matchState to completed');
        setMatchState('completed');
      } else if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
        await matchEngine.startSecondInnings();
      }
    } catch (error) {
      console.error('Error skipping over:', error);
      setSimError(error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAutoSimulate = async () => {
    if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

    setSimError(null);
    setIsSimulating(true);

    try {
      matchEngine.isPaused = false;

      while (!matchEngine.isMatchComplete() && !matchEngine.isPaused) {
        await matchEngine.simulateBall();

        if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
          await matchEngine.startSecondInnings();
        }

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log('🏏 Match completed via Auto-Simulate! Setting matchState to completed');
      setMatchState('completed');
    } catch (error) {
      console.error('Error auto-simulating:', error);
      setSimError(error.message);
      matchEngine.isPaused = true;
    } finally {
      setIsSimulating(false);
    }
  };

  const handlePauseSimulation = () => {
    if (matchEngine) {
      matchEngine.isPaused = true;
      setIsSimulating(false);
    }
  };

  const handleExitMatch = () => {
    if (autoSimRef.current) clearInterval(autoSimRef.current);
    navigate('/game/matches');
  };

  /**
   * Process match result and update all stores
   */
  const processMatchResult = () => {
    if (!matchEngine || hasProcessedResult) return;

    try {
      console.log('📊 Processing interactive match result...');

      const currentMatchState = matchEngine.getState();
      const homeTeam = navMatchData.homeTeam;
      const awayTeam = navMatchData.awayTeam;

      // Extract innings data
      const innings1 = currentMatchState.innings.number === 1
        ? {
            battingTeam: currentMatchState.teams.batting.id,
            totalScore: currentMatchState.teams.batting.totalScore,
            wickets: currentMatchState.teams.batting.wickets,
            overs: currentMatchState.currentBall.over,
            balls: currentMatchState.currentBall.ball
          }
        : calculateInningsScore(currentMatchState.ballByBall, 1);

      const innings2 = currentMatchState.innings.number === 2
        ? {
            battingTeam: currentMatchState.teams.batting.id,
            totalScore: currentMatchState.teams.batting.totalScore,
            wickets: currentMatchState.teams.batting.wickets,
            overs: currentMatchState.currentBall.over,
            balls: currentMatchState.currentBall.ball
          }
        : { totalScore: 0, wickets: 0, overs: 0, balls: 0 };

      // Determine winner
      let winner, winnerTeam, loserTeam, winMargin, winType;

      if (innings2.totalScore > innings1.totalScore) {
        // Team batting second won
        winner = innings2.battingTeam;
        winnerTeam = winner === homeTeam.id ? homeTeam : awayTeam;
        loserTeam = winner === homeTeam.id ? awayTeam : homeTeam;
        winMargin = 10 - innings2.wickets;
        winType = 'wickets';
      } else {
        // Team batting first won (or tie, but treat as first team win)
        winner = innings1.battingTeam;
        winnerTeam = winner === homeTeam.id ? homeTeam : awayTeam;
        loserTeam = winner === homeTeam.id ? awayTeam : homeTeam;
        winMargin = innings1.totalScore - innings2.totalScore;
        winType = 'runs';
      }

      // Create match config for stat updater
      const matchConfig = {
        matchId: matchId,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          players: playerStore.getPlayersByTeam(homeTeam.id)
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          players: playerStore.getPlayersByTeam(awayTeam.id)
        },
        venue: navMatchData.venue || homeTeam.homeGround
      };

      // Update player and team stats
      updatePlayerStats(matchConfig, currentMatchState, useTeamStore, usePlayerStore);

      // Extract player stats for leaderboards and awards
      const playerStats = extractPlayerStatsFromBalls(currentMatchState.ballByBall, matchConfig);

      // Calculate awards
      const playerOfMatch = calculatePlayerOfMatch(playerStats, matchConfig);
      const topScorer = findTopScorer(playerStats, matchConfig);
      const topBowler = findTopBowler(playerStats, matchConfig);

      // Create result object for league store
      const leagueResult = {
        matchId: matchId,
        homeTeam: homeTeam.id,
        homeTeamName: homeTeam.name,
        awayTeam: awayTeam.id,
        awayTeamName: awayTeam.name,
        venue: navMatchData.venue || homeTeam.homeGround,
        innings1: {
          ...innings1,
          battingTeam: innings1.battingTeam || (currentMatchState.innings.number === 1
            ? currentMatchState.teams.batting.id
            : currentMatchState.teams.bowling.id)
        },
        innings2: {
          ...innings2,
          battingTeam: innings2.battingTeam || currentMatchState.teams.batting.id
        },
        winner: winner,
        winnerName: winnerTeam.name,
        margin: `${winMargin} ${winType}`,
        result: 'win',
        status: 'completed',
        ballByBallData: currentMatchState.ballByBall,
        timestamp: new Date().toISOString()
      };

      // Record result in league store
      recordResult(leagueResult);
      recalculateStandings();
      advanceToNextMatch();

      // Create result object for modal
      const modalResult = {
        winner: {
          id: winnerTeam.id,
          name: winnerTeam.name,
          colors: getClub(winnerTeam.id)?.colors,
          isUserTeam: winnerTeam.isUserTeam
        },
        loser: {
          id: loserTeam.id,
          name: loserTeam.name,
          colors: getClub(loserTeam.id)?.colors,
          isUserTeam: loserTeam.isUserTeam
        },
        winMargin,
        winType,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          colors: getClub(homeTeam.id)?.colors,
          score: homeTeam.id === innings1.battingTeam ? innings1.totalScore : innings2.totalScore,
          wickets: homeTeam.id === innings1.battingTeam ? innings1.wickets : innings2.wickets,
          overs: homeTeam.id === innings1.battingTeam
            ? `${innings1.overs}.${innings1.balls}`
            : `${innings2.overs}.${innings2.balls}`
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          colors: getClub(awayTeam.id)?.colors,
          score: awayTeam.id === innings1.battingTeam ? innings1.totalScore : innings2.totalScore,
          wickets: awayTeam.id === innings1.battingTeam ? innings1.wickets : innings2.wickets,
          overs: awayTeam.id === innings1.battingTeam
            ? `${innings1.overs}.${innings1.balls}`
            : `${innings2.overs}.${innings2.balls}`
        },
        playerOfMatch: playerOfMatch ? {
          name: playerOfMatch.name,
          performance: playerOfMatch.reason
        } : null,
        topScorer,
        topBowler
      };

      setMatchResult(modalResult);
      setHasProcessedResult(true);

      console.log('✅ Match result processed successfully');
    } catch (error) {
      console.error('Error processing match result:', error);
      setSimError('Failed to process match result');
    }
  };

  /**
   * Calculate innings score from ball-by-ball data
   */
  const calculateInningsScore = (ballByBall, inningsNumber) => {
    const inningsBalls = ballByBall.filter(b => b.innings === inningsNumber);

    let totalScore = 0;
    let wickets = 0;
    let legalBalls = 0;

    inningsBalls.forEach(ball => {
      totalScore += ball.runs || 0;
      if (ball.isWicket) wickets++;
      if (ball.isLegal) legalBalls++;
    });

    const overs = Math.floor(legalBalls / 6);
    const balls = legalBalls % 6;

    return {
      totalScore,
      wickets,
      overs,
      balls,
      ballsBowled: legalBalls
    };
  };

  /**
   * Handle Continue button after match completion
   */
  const handleContinue = () => {
    // Process result if not already done
    if (!hasProcessedResult) {
      processMatchResult();
    }

    // Navigate to home and show modal
    navigate('/game/home');
    setShowResultModal(true);
  };

  /**
   * Handle result modal close/continue
   */
  const handleResultModalClose = () => {
    setShowResultModal(false);
    // Advance day after viewing result
    advanceDay();
  };

  if (matchState === 'error') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center">
          <div className="text-status-loss mb-4">
            <X className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Match Error</h2>
          <p className="text-text-secondary mb-4">{simError || 'Failed to initialize match'}</p>
          <button onClick={handleExitMatch} className="btn-primary">
            Return to Matches
          </button>
        </div>
      </div>
    );
  }

  if (matchState === 'not_started' || !matchEngine) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-primary mx-auto mb-4"></div>
          <p className="text-text-primary text-lg">Initializing match...</p>
        </div>
      </div>
    );
  }

  const teams = matchStore.teams || {};
  const innings = matchStore.innings || {};
  const currentBall = matchStore.currentBall || {};
  const ballByBall = matchStore.ballByBall || [];
  const commentary = matchStore.commentary || [];
  const tacticsState = matchStore.tacticsState || {};

  const battingTeam = teams.batting || {};
  const bowlingTeam = teams.bowling || {};

  // Calculate current run rate and required run rate
  const totalBalls = (currentBall.over || 0) * 6 + (currentBall.ball || 0);
  const currentRunRate = totalBalls > 0 ? (battingTeam.totalScore || 0) / (totalBalls / 6) : 0;

  let requiredRunRate = 0;
  if (innings.number === 2 && innings.target) {
    const runsNeeded = innings.target - (battingTeam.totalScore || 0);
    const ballsRemaining = 120 - totalBalls;
    requiredRunRate = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)) : 0;
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header Bar */}
      <div className="bg-cricket-surface border-b border-border-primary p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleExitMatch}
            className="btn-secondary text-sm"
          >
            <X className="w-4 h-4" />
            <span>Exit</span>
          </button>
          <div className="text-text-primary font-semibold">
            {navMatchData?.homeTeam?.name} vs {navMatchData?.awayTeam?.name}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTacticsPanel(!showTacticsPanel)}
            className="btn-secondary text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Tactics</span>
          </button>
        </div>
      </div>

      {/* Main Match Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scorecard & Commentary (70%) */}
        <div className="flex-[7] flex flex-col overflow-hidden">
          {/* Scoreboard */}
          <div className="bg-bg-secondary border-b border-border-primary p-6">
            <div className="max-w-4xl mx-auto">
              {/* Innings Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-text-secondary">
                  {innings.number === 1 ? '1st Innings' : '2nd Innings'}
                </div>
                <div className="text-sm text-text-secondary">
                  {navMatchData?.venue}
                </div>
              </div>

              {/* Main Score */}
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-text-primary font-mono mb-2">
                  {battingTeam.totalScore || 0}/{battingTeam.wickets || 0}
                </div>
                <div className="text-lg">
                  <TeamName teamId={battingTeam.id} inline={true} className="text-lg" />
                </div>
                <div className="text-text-tertiary text-sm mt-1">
                  {currentBall.over || 0}.{currentBall.ball || 0} overs
                  {innings.number === 2 && innings.target && (
                    <span className="ml-4">
                      Target: {innings.target} • Need {innings.target - (battingTeam.totalScore || 0)} runs
                    </span>
                  )}
                </div>
              </div>

              {/* Run Rate Info */}
              <div className="flex justify-center gap-8 text-sm">
                <div className="text-center">
                  <div className="text-text-tertiary">Current RR</div>
                  <div className="text-text-primary font-bold font-mono">
                    {currentRunRate.toFixed(2)}
                  </div>
                </div>
                {innings.number === 2 && innings.target && (
                  <div className="text-center">
                    <div className="text-text-tertiary">Required RR</div>
                    <div className={`font-bold font-mono ${
                      requiredRunRate > currentRunRate ? 'text-status-loss' : 'text-status-win'
                    }`}>
                      {requiredRunRate.toFixed(2)}
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-text-tertiary">Partnership</div>
                  <div className="text-text-primary font-bold font-mono">
                    45 (32)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Players */}
          <div className="bg-bg-tertiary/50 border-b border-border-primary p-4">
            <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
              <div className="card p-3">
                <div className="text-xs text-text-tertiary mb-1">Striker</div>
                <div className="text-sm font-semibold text-text-primary">
                  {innings.striker || 'Selecting...'}
                </div>
                <div className="text-xs text-cricket-accent font-mono mt-1">
                  24 (18) • 4s: 2, 6s: 1
                </div>
              </div>

              <div className="card p-3">
                <div className="text-xs text-text-tertiary mb-1">Non-Striker</div>
                <div className="text-sm font-semibold text-text-primary">
                  {innings.nonStriker || 'Selecting...'}
                </div>
                <div className="text-xs text-cricket-accent font-mono mt-1">
                  12 (15) • 4s: 1
                </div>
              </div>

              <div className="card p-3">
                <div className="text-xs text-text-tertiary mb-1">Bowler</div>
                <div className="text-sm font-semibold text-text-primary">
                  {innings.bowler || 'Selecting...'}
                </div>
                <div className="text-xs text-cricket-accent font-mono mt-1">
                  2-0-18-1 • Econ: 9.0
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-bg-secondary border-b border-border-primary p-4">
            <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
              {(() => {
                console.log('🎮 Rendering controls. matchState:', matchState, 'isSimulating:', isSimulating);
                return null;
              })()}
              {matchState === 'completed' ? (
                <button
                  onClick={handleContinue}
                  className="btn-primary px-8 py-3 flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePlayBall}
                    disabled={isSimulating}
                    className="btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-5 h-5" />
                    <span>Play Ball</span>
                  </button>

                  <button
                    onClick={handleSkipOver}
                    disabled={isSimulating}
                    className="btn-secondary px-6 py-3 flex items-center gap-2 disabled:opacity-50"
                  >
                    <SkipForward className="w-5 h-5" />
                    <span>Skip Over</span>
                  </button>

                  {!isSimulating ? (
                    <button
                      onClick={handleAutoSimulate}
                      className="btn-secondary px-6 py-3 flex items-center gap-2"
                    >
                      <FastForward className="w-5 h-5" />
                      <span>Auto-Simulate</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseSimulation}
                      className="btn-secondary px-6 py-3 flex items-center gap-2"
                    >
                      <Pause className="w-5 h-5" />
                      <span>Pause</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {simError && (
              <div className="mt-3 p-3 bg-status-loss/10 border border-status-loss rounded text-center">
                <div className="text-status-loss text-sm">{simError}</div>
              </div>
            )}
          </div>

          {/* Commentary Feed */}
          <div className="flex-1 overflow-y-auto p-4 bg-bg-primary">
            <div className="max-w-4xl mx-auto space-y-2">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Commentary</h3>
              {commentary.length > 0 ? (
                commentary.slice().reverse().map((comment, idx) => (
                  <div key={idx} className="card p-3">
                    <div className="text-sm text-text-primary">{comment}</div>
                  </div>
                ))
              ) : (
                <div className="text-text-tertiary text-sm text-center py-8">
                  Match commentary will appear here
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tactics Hub (30%) */}
        {showTacticsPanel && (
          <div className="flex-[3] bg-bg-secondary border-l border-border-primary overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Tactics Hub</h2>
                <button
                  onClick={() => setShowTacticsPanel(false)}
                  className="p-1 hover:bg-bg-tertiary rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Batting Tactics */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-cricket-accent" />
                  Batting Approach
                </h3>

                <div className="space-y-2">
                  <div className="text-xs text-text-secondary mb-2">Acceleration Mode</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Rotate', 'Attack', 'Aggressive', 'All-Out'].map((mode) => (
                      <button
                        key={mode}
                        className={`btn-secondary text-xs py-2 ${
                          tacticsState.currentAcceleration?.striker === mode ? 'bg-cricket-primary text-white' : ''
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bowling Tactics */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cricket-accent" />
                  Bowling Plan
                </h3>

                <div className="space-y-2">
                  <div className="text-xs text-text-secondary mb-2">Current Plan</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Attack', 'Contain', 'Defensive', 'Aggressive'].map((plan) => (
                      <button
                        key={plan}
                        className="btn-secondary text-xs py-2"
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field Settings */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cricket-accent" />
                  Field Settings
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Attacking Fielders</span>
                    <span className="text-text-primary font-mono">4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Boundary Riders</span>
                    <span className="text-text-primary font-mono">5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Close Catchers</span>
                    <span className="text-text-primary font-mono">2</span>
                  </div>
                </div>
              </div>

              {/* Match Situation */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cricket-accent" />
                  Match Situation
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Phase</span>
                    <span className="text-cricket-accent font-semibold">
                      {currentBall.matchSituation?.phase || 'Powerplay'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Pressure Index</span>
                    <span className="text-text-primary font-mono">
                      {tacticsState.pressureIndex?.batting || 50}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Target RR</span>
                    <span className="text-text-primary font-mono">
                      {tacticsState.targetRunRate?.toFixed(2) || '8.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Match Result Modal */}
      <MatchResultModal
        isOpen={showResultModal}
        onClose={handleResultModalClose}
        matchResult={matchResult}
        onContinue={handleResultModalClose}
      />
    </div>
  );
};

export default MatchLive;
