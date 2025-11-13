/**
 * MatchdayUI - Main container for the redesigned matchday interface
 *
 * Layout: Three-column grid
 * - Left (30%): Tactics Hub with tactical controls
 * - Center (40%): Pitch Visualization with 2D field and ball trajectories
 * - Right (30%): Stats Hub with scorecard and charts
 *
 * Features:
 * - Real-time updates from matchStore
 * - Responsive layout (3-col desktop, stack tablet/mobile)
 * - Football Manager-inspired data-dense aesthetic
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useMatchStore from '../../../stores/matchStore';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import useLeagueStore from '../../../stores/leagueStore';
import useGameStore from '../../../stores/gameStore';
import { ArrowLeft, Play, Pause, FastForward, ArrowRight } from 'lucide-react';
import TeamName from '../../shared/TeamName';
import PlayerName from '../../shared/PlayerName';
import TacticsHub from './TacticsHub/TacticsHub';
import PitchVisualization from './PitchVisualization/PitchVisualization';
import StatsHub from './StatsHub/StatsHub';
import MatchEngine from '../../../core/match-engine/core/MatchEngine';
import MatchResultModal from '../../shared/MatchResultModal';
import { updatePlayerStats, calculatePlayerOfMatch, findTopScorer, findTopBowler, extractPlayerStatsFromBalls } from '../../../utils/MatchStatsUpdater';

/**
 * MatchHeader - Broadcast-style HUD with 2-row layout
 */
const MatchHeader = ({ matchId, matchEngine, onMatchComplete }) => {
  const navigate = useNavigate();
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const clubs = useLeagueStore(state => state.clubs);
  const status = useMatchStore(state => state.status);
  const teams = useMatchStore(state => state.teams);
  const innings = useMatchStore(state => state.innings);
  const currentBall = useMatchStore(state => state.currentBall);
  const ballByBall = useMatchStore(state => state.ballByBall);
  const firstBattingTeamId = useMatchStore(state => state.firstBattingTeamId);
  const homeTeamId = useMatchStore(state => state.homeTeamId);
  const awayTeamId = useMatchStore(state => state.awayTeamId);
  const [isPlaying, setIsPlaying] = useState(false);

  // Debug: Log status changes
  useEffect(() => {
    console.log('🔄 Match status changed to:', status);
  }, [status]);

  const battingTeam = teams.batting;
  const bowlingTeam = teams.bowling;

  // Team positioning: first batting team on left, second batting team on right (fixed throughout match)
  const secondBattingTeamId = React.useMemo(() => {
    if (!firstBattingTeamId || !homeTeamId || !awayTeamId) return null;
    return firstBattingTeamId === homeTeamId ? awayTeamId : homeTeamId;
  }, [firstBattingTeamId, homeTeamId, awayTeamId]);

  const leftTeam = clubs?.[firstBattingTeamId];
  const rightTeam = clubs?.[secondBattingTeamId];

  // Get scores for both teams
  const isFirstInnings = innings?.number === 1;

  // Calculate first innings score from ballByBall if in 2nd innings
  const firstInningsData = React.useMemo(() => {
    if (isFirstInnings || !ballByBall || ballByBall.length === 0) return null;

    // Filter balls from innings 1
    const firstInningsBalls = ballByBall.filter(b => b.innings === 1);

    if (firstInningsBalls.length === 0) {
      // No balls found, use innings.target as backup (target = first innings score + 1)
      if (innings?.target) {
        return { runs: innings.target - 1, wickets: 10, overs: 20, balls: 0 };
      }
      return { runs: 0, wickets: 0, overs: 20, balls: 0 };
    }

    // Calculate total runs and wickets
    const runs = firstInningsBalls.reduce((sum, b) => sum + (b.runs || 0), 0);
    const wickets = firstInningsBalls.filter(b => b.isWicket).length;

    // Get last ball to determine overs
    const lastBall = firstInningsBalls[firstInningsBalls.length - 1];
    const finalOvers = lastBall?.over || 20;
    const finalBalls = lastBall?.ball || 0;

    return { runs, wickets, overs: finalOvers, balls: finalBalls };
  }, [isFirstInnings, ballByBall, innings]);

  // Left team (first batting team) score
  const leftTeamScore = isFirstInnings
    ? { runs: battingTeam?.totalScore || 0, wickets: battingTeam?.wickets || 0, overs: currentBall?.over || 0, balls: currentBall?.ball || 0 }
    : (firstInningsData || { runs: 0, wickets: 10, overs: 20, balls: 0 });

  // Right team (second batting team) score
  const rightTeamScore = isFirstInnings
    ? null // Yet to bat
    : { runs: battingTeam?.totalScore || 0, wickets: battingTeam?.wickets || 0, overs: currentBall?.over || 0, balls: currentBall?.ball || 0 };

  // Current batting team's detailed info for central display
  const score = battingTeam?.totalScore || 0;
  const wickets = battingTeam?.wickets || 0;
  const overs = currentBall?.over || 0;
  const balls = currentBall?.ball || 0;

  // Current batsmen
  const strikerId = innings?.striker;
  const nonStrikerId = innings?.nonStriker;

  // Calculate batsman stats from ballByBall
  const strikerStats = React.useMemo(() => {
    if (!strikerId || !ballByBall || ballByBall.length === 0) return { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const batsmanBalls = ballByBall.filter(b => b.batsmanId === strikerId);
    return {
      runs: batsmanBalls.reduce((sum, b) => sum + (b.runs || 0), 0),
      balls: batsmanBalls.filter(b => b.isLegal !== false).length,
      fours: batsmanBalls.filter(b => b.runs === 4).length,
      sixes: batsmanBalls.filter(b => b.runs === 6).length
    };
  }, [strikerId, ballByBall]);

  const nonStrikerStats = React.useMemo(() => {
    if (!nonStrikerId || !ballByBall || ballByBall.length === 0) return { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const batsmanBalls = ballByBall.filter(b => b.batsmanId === nonStrikerId);
    return {
      runs: batsmanBalls.reduce((sum, b) => sum + (b.runs || 0), 0),
      balls: batsmanBalls.filter(b => b.isLegal !== false).length,
      fours: batsmanBalls.filter(b => b.runs === 4).length,
      sixes: batsmanBalls.filter(b => b.runs === 6).length
    };
  }, [nonStrikerId, ballByBall]);

  // Current bowler
  const bowlerId = innings?.bowler;

  // Track previous bowler to detect changes
  const prevBowlerRef = React.useRef(bowlerId);

  // Calculate bowler stats from ballByBall
  const bowlerStats = React.useMemo(() => {
    if (!bowlerId || !ballByBall || ballByBall.length === 0) return { overs: '0', maidens: 0, runs: 0, wickets: 0 };
    const bowlerBalls = ballByBall.filter(b => b.bowlerId === bowlerId);
    const legalBalls = bowlerBalls.filter(b => b.isLegal !== false).length;
    const overs = Math.floor(legalBalls / 6);
    const balls = legalBalls % 6;
    return {
      overs: balls > 0 ? `${overs}.${balls}` : `${overs}`,
      maidens: 0, // Would need to track complete overs for this
      runs: bowlerBalls.reduce((sum, b) => sum + (b.runs || 0), 0),
      wickets: bowlerBalls.filter(b => b.isWicket).length
    };
  }, [bowlerId, ballByBall]);

  // Get current over's ball outcomes (persist until bowler changes)
  const currentOverBalls = React.useMemo(() => {
    if (!ballByBall || ballByBall.length === 0) return [];

    const currentOver = currentBall?.over || 0;
    const currentInnings = innings?.number || 1;

    // Detect if bowler changed
    const bowlerChanged = prevBowlerRef.current !== bowlerId;
    if (bowlerChanged) {
      prevBowlerRef.current = bowlerId;
    }

    // Find which over to display
    let displayOver = currentOver;

    // If bowler didn't change, check if current over is empty (just started)
    // If so, show the previous over's balls
    if (!bowlerChanged && bowlerId) {
      const currentOverBallsCount = ballByBall.filter(b =>
        b.innings === currentInnings && b.over === currentOver && b.bowlerId === bowlerId
      ).length;

      // If current over has no balls yet, show the last completed over by this bowler
      if (currentOverBallsCount === 0 && currentOver > 0) {
        // Find the most recent over bowled by this bowler
        const bowlerOvers = ballByBall
          .filter(b => b.innings === currentInnings && b.bowlerId === bowlerId)
          .map(b => b.over);

        if (bowlerOvers.length > 0) {
          displayOver = Math.max(...bowlerOvers);
        }
      }
    }

    // Filter balls from the display over
    const overBalls = ballByBall.filter(b =>
      b.innings === currentInnings && b.over === displayOver && b.bowlerId === bowlerId
    );

    // Map to display format
    return overBalls.map(b => {
      if (b.isWicket) return 'W';
      if (!b.isLegal) {
        // Wide or No ball
        if (b.extras?.wides > 0) return 'Wd';
        if (b.extras?.noBalls > 0) return 'Nb';
        return 'X';
      }
      // Regular delivery - show runs
      if (b.runs === 0) return '•'; // Dot ball
      return b.runs.toString();
    });
  }, [ballByBall, currentBall, innings, bowlerId]);

  // Calculate run rates
  const totalBalls = (overs * 6) + balls;
  const currentRunRate = totalBalls > 0 ? (score / totalBalls) * 6 : 0;
  const isSecondInnings = innings?.number === 2;
  const target = innings?.target || 0;
  const ballsRemaining = 120 - totalBalls;
  const runsRequired = target - score;
  const requiredRunRate = isSecondInnings && ballsRemaining > 0
    ? (runsRequired / ballsRemaining) * 6
    : 0;

  // Color coding for CRR/RRR box (green if on track, red if behind)
  const isOnTrack = isSecondInnings ? currentRunRate >= requiredRunRate : true;

  const handlePlayPause = async () => {
    if (!matchEngine) return;
    if (isPlaying) {
      matchEngine.isPaused = true;
      setIsPlaying(false);
    } else {
      matchEngine.isPaused = false;
      setIsPlaying(true);
      try {
        await matchEngine.simulateInnings();
        setIsPlaying(false);

        // Check if match is complete
        if (matchEngine.isMatchComplete()) {
          console.log('🏏 Match completed! Triggering completion handler');
          if (onMatchComplete) {
            onMatchComplete();
          }
        }
      } catch (error) {
        console.error('Error simulating innings:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleSkipOver = async () => {
    if (!matchEngine || isPlaying) return;
    matchEngine.isPaused = false;
    const currentOver = currentBall?.over || 0;
    try {
      while ((currentBall?.over || 0) === currentOver && !matchEngine.isInningsComplete()) {
        await matchEngine.simulateBall();
      }
      matchEngine.isPaused = true;
    } catch (error) {
      console.error('Error skipping over:', error);
      matchEngine.isPaused = true;
    }
  };

  // Gradient background using team colors
  const gradientStyle = {
    background: leftTeam && rightTeam
      ? `linear-gradient(to right, ${leftTeam.colors?.primary || '#2D5F3F'} 0%, #1a1a1a 50%, ${rightTeam.colors?.primary || '#2D5F3F'} 100%)`
      : 'linear-gradient(to right, #2D5F3F 0%, #1a1a1a 50%, #2D5F3F 100%)'
  };

  // Fixed batsmen positions - sort by ID to keep consistent order regardless of strike
  const batsmen = [];
  if (strikerId && strikerStats) {
    batsmen.push({ id: strikerId, stats: strikerStats, isStriker: true });
  }
  if (nonStrikerId && nonStrikerStats) {
    batsmen.push({ id: nonStrikerId, stats: nonStrikerStats, isStriker: false });
  }
  // Sort by player ID to maintain fixed positions
  batsmen.sort((a, b) => a.id.localeCompare(b.id));

  const batsmanOnTop = batsmen[0] || null;
  const batsmanOnBottom = batsmen[1] || null;

  return (
    <div style={gradientStyle} className="border-b-2 border-cricket-primary/30 shadow-lg">
      {/* Single Row: All match information */}
      <div className="flex items-stretch h-20">
        {/* Left: Back button (fixed width) */}
        <div className="w-20 flex items-center justify-center border-r border-white/10 flex-shrink-0">
          <button
            onClick={() => navigate('/game/matches')}
            className="p-2 hover:bg-black/20 rounded transition-colors"
            aria-label="Back to matches"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-center px-4 py-2 gap-3 min-w-0">
          {/* Left Team Name + Score (fixed width) */}
          <div className={`w-40 flex-shrink-0 ${battingTeam?.id === firstBattingTeamId ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`text-xs font-bold uppercase tracking-wide drop-shadow-lg mb-1 truncate ${battingTeam?.id === firstBattingTeamId ? 'text-cricket-accent' : 'text-white'}`}>
              {leftTeam?.name || 'Team 1'}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white font-mono tracking-tight drop-shadow-lg">{leftTeamScore.runs}</span>
              <span className="text-lg font-semibold text-cricket-accent font-mono drop-shadow-lg">/{leftTeamScore.wickets}</span>
              <span className="text-xs text-white/70 font-mono drop-shadow-lg ml-1">({leftTeamScore.overs}.{leftTeamScore.balls})</span>
            </div>
          </div>

          <div className="w-px h-14 bg-white/20" />

          {/* Center: Batsmen, Metrics, Bowler */}
          <div className="flex items-center gap-3 flex-1 justify-center min-w-0">

            {/* Batsmen - Fixed positions (fixed width) */}
            <div className="w-48 flex flex-col gap-0.5 flex-shrink-0">
              {/* Top batsman (always shows first batsman, star moves) */}
              {batsmanOnTop && (
                <div className="flex items-center gap-1.5 h-7">
                  <span className={`text-cricket-accent font-bold text-sm drop-shadow-lg w-3 ${batsmanOnTop.isStriker ? '' : 'invisible'}`}>★</span>
                  <PlayerName playerId={batsmanOnTop.id} className="font-semibold text-white text-xs drop-shadow-lg truncate flex-1" />
                  <span className="font-mono text-xs text-white/90 drop-shadow-lg w-16 text-right">
                    {batsmanOnTop.stats.runs}({batsmanOnTop.stats.balls})
                  </span>
                </div>
              )}
              {/* Bottom batsman (always shows second batsman, star moves) */}
              {batsmanOnBottom && (
                <div className="flex items-center gap-1.5 h-7">
                  <span className={`text-cricket-accent font-bold text-sm drop-shadow-lg w-3 ${batsmanOnBottom.isStriker ? '' : 'invisible'}`}>★</span>
                  <PlayerName playerId={batsmanOnBottom.id} className="font-medium text-white/80 text-xs drop-shadow-lg truncate flex-1" />
                  <span className="font-mono text-xs text-white/70 drop-shadow-lg w-16 text-right">
                    {batsmanOnBottom.stats.runs}({batsmanOnBottom.stats.balls})
                  </span>
                </div>
              )}
            </div>

            <div className="w-px h-14 bg-white/20" />

            {/* Central Metrics - Compact with Need X from Y below (fixed width) */}
            <div className={`w-36 px-3 py-1.5 rounded ${isSecondInnings ? (isOnTrack ? 'bg-green-900/40 border border-green-500/50' : 'bg-red-900/40 border border-red-500/50') : 'bg-black/30 border border-white/20'} flex-shrink-0`}>
              {/* CRR and RRR in single row */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/70 uppercase tracking-wide font-semibold">CRR</span>
                  <span className="font-mono font-bold text-white text-sm drop-shadow-lg">{currentRunRate.toFixed(2)}</span>
                </div>
                {isSecondInnings && requiredRunRate > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/70 uppercase tracking-wide font-semibold">RRR</span>
                    <span className="font-mono font-bold text-cricket-accent text-sm drop-shadow-lg">{requiredRunRate.toFixed(2)}</span>
                  </div>
                )}
              </div>
              {/* Need X from Y text below */}
              {isSecondInnings && ballsRemaining > 0 && (
                <div className="text-center pt-0.5 border-t border-white/10">
                  <span className="text-xs font-semibold text-white/90 drop-shadow-lg">
                    Need <span className="text-cricket-accent font-bold">{runsRequired}</span> from <span className="text-cricket-accent font-bold">{ballsRemaining}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="w-px h-14 bg-white/20" />

            {/* Bowler (fixed width) */}
            <div className="w-52 flex flex-col gap-0.5 flex-shrink-0">
              {bowlerId && bowlerStats ? (
                <>
                  {/* Row 1: Bowler name + stats - aligned with top batsman */}
                  <div className="flex items-center gap-2 h-7">
                    <PlayerName playerId={bowlerId} className="font-semibold text-white text-xs drop-shadow-lg truncate flex-1" />
                    <span className="font-mono text-xs text-white/90 drop-shadow-lg whitespace-nowrap">
                      {bowlerStats.overs}-{bowlerStats.maidens}-{bowlerStats.runs}-{bowlerStats.wickets}
                    </span>
                  </div>
                  {/* Row 2: Current over balls - ALWAYS render to maintain spacing */}
                  <div className="flex items-center gap-1 h-7">
                    {currentOverBalls.length > 0 ? (
                      currentOverBalls.map((ball, idx) => (
                        <div
                          key={idx}
                          className={`
                            w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold drop-shadow-lg
                            ${ball === 'W' ? 'bg-red-600 text-white' : ''}
                            ${ball === '•' ? 'bg-gray-600 text-white' : ''}
                            ${ball === '4' ? 'bg-blue-600 text-white' : ''}
                            ${ball === '6' ? 'bg-purple-600 text-white' : ''}
                            ${['1', '2', '3'].includes(ball) ? 'bg-green-700 text-white' : ''}
                            ${['Wd', 'Nb'].includes(ball) ? 'bg-orange-600 text-white text-[10px]' : ''}
                          `}
                        >
                          {ball}
                        </div>
                      ))
                    ) : (
                      // Empty placeholder to maintain row height
                      <div className="h-5">&nbsp;</div>
                    )}
                  </div>
                </>
              ) : (
                // No bowler - render empty rows to maintain spacing
                <>
                  <div className="h-7">&nbsp;</div>
                  <div className="h-7">&nbsp;</div>
                </>
              )}
            </div>
          </div>

          <div className="w-px h-14 bg-white/20" />

          {/* Right Team Score + Name (fixed width) */}
          <div className={`w-40 flex-shrink-0 text-right ${battingTeam?.id === secondBattingTeamId ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`text-xs font-bold uppercase tracking-wide drop-shadow-lg mb-1 truncate ${battingTeam?.id === secondBattingTeamId ? 'text-cricket-accent' : 'text-white'}`}>
              {rightTeam?.name || 'Team 2'}
            </div>
            {rightTeamScore ? (
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-white font-mono tracking-tight drop-shadow-lg">{rightTeamScore.runs}</span>
                <span className="text-lg font-semibold text-cricket-accent font-mono drop-shadow-lg">/{rightTeamScore.wickets}</span>
                <span className="text-xs text-white/70 font-mono drop-shadow-lg ml-1">({rightTeamScore.overs}.{rightTeamScore.balls})</span>
              </div>
            ) : (
              <div className="text-xs text-white/50 italic drop-shadow-lg">
                Yet to bat
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls (fixed width, same as back button) */}
        <div className="w-20 flex flex-col items-center justify-center gap-1 px-2 flex-shrink-0 border-l border-white/10">
          {status === 'completed' ? (
            <button
              onClick={onMatchComplete}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-cricket-accent hover:bg-cricket-accent/90 text-white rounded font-semibold transition-all shadow-md text-xs w-full"
            >
              <span>Continue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <>
              <button
                onClick={handlePlayPause}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-cricket-primary hover:bg-cricket-primary-light text-white rounded font-semibold transition-all shadow-sm hover:shadow-md text-xs w-full"
                disabled={!matchEngine}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={handleSkipOver}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-black/40 hover:bg-black/60 border border-white/20 text-white rounded transition-all text-xs w-full"
                disabled={!matchEngine || isPlaying}
                title="Skip to end of current over"
              >
                <FastForward className="w-3 h-3" />
                <span>Skip</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * MatchdayUI - Main container component
 */
export default function MatchdayUI() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [matchEngine, setMatchEngine] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [hasProcessedResult, setHasProcessedResult] = useState(false);
  const initializingRef = React.useRef(false); // Prevent concurrent initializations

  const status = useMatchStore(state => state.status);
  const matchStoreId = useMatchStore(state => state.matchId);
  const getPlayersByTeam = usePlayerStore(state => state.getPlayersByTeam);
  const players = usePlayerStore(state => state.players);
  const { getClub, recordResult, recalculateStandings, advanceToNextMatch } = useLeagueStore();
  const { advanceDay } = useGameStore();

  // Match data from navigation state
  const navMatchData = location.state?.matchData;

  // Initialize match on mount (only once)
  useEffect(() => {
    let isMounted = true;

    // Prevent concurrent initializations
    if (initializingRef.current) {
      console.log('⚠️ Initialization already in progress, skipping...');
      return;
    }

    const initializeMatch = async () => {
      initializingRef.current = true; // Mark as initializing

      try {
        // Check if match data was provided via navigation
        if (!navMatchData || !navMatchData.toss) {
          console.warn('No match data provided');
          if (isMounted) {
            setInitError('No match data provided. Please start the match from the preview screen.');
            setIsInitializing(false);
            initializingRef.current = false;
          }
          return;
        }

        console.log('🏏 Initializing match with MatchEngine...');

        const toss = navMatchData.toss;
        const homeTeam = navMatchData.homeTeam;
        const awayTeam = navMatchData.awayTeam;

        // Get player squads for both teams
        const homePlayers = getPlayersByTeam(homeTeam.id);
        const awayPlayers = getPlayersByTeam(awayTeam.id);

        // Also check squadLists as fallback
        const homeSquadList = useTeamStore.getState().squadLists?.[homeTeam.id] || [];
        const awaySquadList = useTeamStore.getState().squadLists?.[awayTeam.id] || [];

        let finalHomePlayers = homePlayers;
        let finalAwayPlayers = awayPlayers;

        if (homePlayers.length < 11 && homeSquadList.length >= 11) {
          finalHomePlayers = homeSquadList
            .slice(0, 11)
            .map(playerId => players[playerId])
            .filter(Boolean);
        }

        if (awayPlayers.length < 11 && awaySquadList.length >= 11) {
          finalAwayPlayers = awaySquadList
            .slice(0, 11)
            .map(playerId => players[playerId])
            .filter(Boolean);
        }

        if (finalHomePlayers.length < 11 || finalAwayPlayers.length < 11) {
          throw new Error(`Insufficient players: ${homeTeam.name} has ${finalHomePlayers.length}, ${awayTeam.name} has ${finalAwayPlayers.length} (need 11 each)`);
        }

        // Select playing XI (first 11 players)
        const homePlayingXI = finalHomePlayers.slice(0, 11).map(p => p.id);
        const awayPlayingXI = finalAwayPlayers.slice(0, 11).map(p => p.id);

        // Create match config
        const matchConfig = {
          matchId: matchId, // Use matchId from URL params
          homeTeam: {
            ...homeTeam,
            playingXI: homePlayingXI,
            players: homePlayingXI
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

        // Create MatchEngine instance with correct parameters
        const engine = new MatchEngine(
          useMatchStore,
          usePlayerStore,
          useTeamStore,
          { silent: false }
        );

        // Configure for ball-by-ball interactive mode with delays
        engine.config.interactiveMode = true;
        engine.config.showBallByBall = true;
        engine.config.simulationSpeed = 'normal'; // ~1s per ball (not instant!)
        engine.config.ballDelay = 1000; // 1 second delay between balls

        // IMPORTANT: Pause BEFORE starting the match
        engine.isPaused = true;

        // Start match (initializes stores and sets up opening players WITHOUT auto-playing)
        await engine.startMatch(matchConfig);

        if (isMounted) {
          setMatchEngine(engine);
          setIsInitializing(false);
          initializingRef.current = false; // Reset after successful init
          console.log('✅ Match initialized successfully (paused, awaiting user control)');
        }

      } catch (error) {
        console.error('❌ Error initializing match:', error);
        if (isMounted) {
          setInitError(error.message || 'Failed to initialize match');
          setIsInitializing(false);
          initializingRef.current = false; // Reset after error
        }
      }
    };

    // Only initialize if match isn't already loaded
    if (!matchStoreId || matchStoreId !== matchId) {
      initializeMatch();
    } else {
      setIsInitializing(false);
      console.log('✅ Match already loaded in store');
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      initializingRef.current = false; // Reset on unmount
    };
  }, [matchId]); // Only depend on matchId (not navMatchData to prevent re-runs)

  /**
   * Process match result and update all stores
   */
  const processMatchResult = () => {
    if (!matchEngine || hasProcessedResult) return;

    try {
      console.log('📊 Processing interactive match result...');

      // Get current match state from matchStore
      const currentMatchState = useMatchStore.getState();
      const homeTeam = navMatchData.homeTeam;
      const awayTeam = navMatchData.awayTeam;

      // Determine winner from match state
      const winner = currentMatchState.winner;
      const ballByBall = currentMatchState.ballByBall || [];

      // Calculate innings summaries from ballByBall data
      const calculateInningsScore = (inningsNum) => {
        const inningsBalls = ballByBall.filter(b => b.innings === inningsNum);
        let totalScore = 0;
        let wickets = 0;
        let legalBalls = 0;
        let battingTeam = null;

        inningsBalls.forEach(ball => {
          totalScore += ball.runs || 0;
          if (ball.isWicket) wickets++;
          if (ball.isLegal) legalBalls++;
          if (!battingTeam && ball.battingTeam) battingTeam = ball.battingTeam;
        });

        const overs = Math.floor(legalBalls / 6);
        const balls = legalBalls % 6;

        return {
          battingTeam,
          totalScore,
          wickets,
          overs,
          balls,
          ballsBowled: legalBalls
        };
      };

      const innings1 = calculateInningsScore(1);
      const innings2 = calculateInningsScore(2);

      // Create match config for stat updater
      const matchConfig = {
        matchId: matchId,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          players: getPlayersByTeam(homeTeam.id)
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          players: getPlayersByTeam(awayTeam.id)
        },
        venue: navMatchData.venue || homeTeam.homeGround
      };

      // Update player and team stats
      updatePlayerStats(matchConfig, { ballByBall }, useTeamStore, usePlayerStore);

      // Extract player stats for leaderboards and awards
      const playerStats = extractPlayerStatsFromBalls(ballByBall, matchConfig);

      // Calculate awards
      const playerOfMatch = calculatePlayerOfMatch(playerStats, matchConfig);
      const topScorer = findTopScorer(playerStats, matchConfig);
      const topBowler = findTopBowler(playerStats, matchConfig);

      // Determine win margin and type
      let winMargin, winType;
      const winnerTeam = winner === homeTeam.id ? homeTeam : awayTeam;
      const loserTeam = winner === homeTeam.id ? awayTeam : homeTeam;

      if (innings2.totalScore > innings1.totalScore) {
        winMargin = 10 - innings2.wickets;
        winType = 'wickets';
      } else {
        winMargin = innings1.totalScore - innings2.totalScore;
        winType = 'runs';
      }

      // Create result object for league store
      const leagueResult = {
        matchId: matchId,
        homeTeam: homeTeam.id,
        homeTeamName: homeTeam.name,
        awayTeam: awayTeam.id,
        awayTeamName: awayTeam.name,
        venue: navMatchData.venue || homeTeam.homeGround,
        innings1,
        innings2,
        winner: winner,
        winnerName: winnerTeam.name,
        margin: `${winMargin} ${winType}`,
        result: 'win',
        status: 'completed',
        ballByBallData: ballByBall,
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
          score: innings1.battingTeam === homeTeam.id ? innings1.totalScore : innings2.totalScore,
          wickets: innings1.battingTeam === homeTeam.id ? innings1.wickets : innings2.wickets,
          overs: innings1.battingTeam === homeTeam.id
            ? `${innings1.overs}.${innings1.balls || 0}`
            : `${innings2.overs}.${innings2.balls || 0}`
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          colors: getClub(awayTeam.id)?.colors,
          score: innings1.battingTeam === awayTeam.id ? innings1.totalScore : innings2.totalScore,
          wickets: innings1.battingTeam === awayTeam.id ? innings1.wickets : innings2.wickets,
          overs: innings1.battingTeam === awayTeam.id
            ? `${innings1.overs}.${innings1.balls || 0}`
            : `${innings2.overs}.${innings2.balls || 0}`
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
    }
  };

  /**
   * Handle Continue button after match completion
   */
  const handleMatchComplete = () => {
    console.log('🎯 handleMatchComplete called, status:', status);

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

  // Show loading state
  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Loading Match...
          </h2>
          <p className="text-text-secondary">
            Initializing match engine...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (initError) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Failed to Load Match
          </h2>
          <p className="text-text-secondary mb-4">
            {initError}
          </p>
          <button
            onClick={() => navigate('/game/matches')}
            className="px-4 py-2 bg-cricket-primary text-white rounded-md hover:bg-cricket-primary-light transition-colors"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  // Check if match exists in store
  if (!matchStoreId || matchStoreId !== matchId) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Match not found
          </h2>
          <p className="text-text-secondary mb-4">
            The match you're looking for is not currently loaded.
          </p>
          <button
            onClick={() => navigate('/game/matches')}
            className="px-4 py-2 bg-cricket-primary text-white rounded-md hover:bg-cricket-primary-light transition-colors"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  // Check if match is in the right state
  if (status !== 'live' && status !== 'completed') {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Match not started
          </h2>
          <p className="text-text-secondary mb-4">
            This match hasn't started yet.
          </p>
          <button
            onClick={() => window.location.href = '/matches'}
            className="px-4 py-2 bg-cricket-primary text-white rounded-md hover:bg-cricket-primary-light transition-colors"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  // Don't render UI until match engine is ready
  if (!matchEngine) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Preparing Match...
          </h2>
          <p className="text-text-secondary">
            Setting up teams and field positions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Header with controls */}
      <MatchHeader matchId={matchId} matchEngine={matchEngine} onMatchComplete={handleMatchComplete} />

      {/* Main 3-column grid */}
      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
          {/* Left Column: Tactics Hub (25%) */}
          <div className="lg:col-span-3 overflow-y-auto min-h-0">
            <TacticsHub />
          </div>

          {/* Center Column: Pitch Visualization (42%) */}
          <div className="lg:col-span-5 overflow-y-auto min-h-0">
            <PitchVisualization />
          </div>

          {/* Right Column: Stats Hub (33%) */}
          <div className="lg:col-span-4 overflow-y-auto min-h-0">
            <StatsHub />
          </div>
        </div>
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
}
