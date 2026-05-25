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
import useFinanceStore from '../../../stores/financeStore';
import useGameStore from '../../../stores/gameStore';
import { ArrowLeft, Play, Pause, FastForward, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Users2 } from 'lucide-react';
import TeamName from '../../shared/TeamName';
import PlayerName from '../../shared/PlayerName';
import ConditionBar from '../../shared/ConditionBar';
import LoadingScreen from '../../shared/LoadingScreen';
import ModifierBreakdownPanel from './ModifierBreakdownPanel';
import TacticsHub from './TacticsHub/TacticsHub';
import PitchVisualization from './PitchVisualization/PitchVisualization';
import StatsHub from './StatsHub/StatsHub';
import RunRateWorm from './StatsHub/RunRateWorm';
import ManhattanChart from './StatsHub/ManhattanChart';
import PartnershipsPanel from './StatsHub/PartnershipsPanel';
import MatchEngine from '../../../core/match-engine/core/MatchEngine';
import { updatePlayerStats, calculatePlayerOfMatch, findTopScorer, findTopBowler, extractPlayerStatsFromBalls } from '../../../utils/MatchStatsUpdater';
import { getTeamIcon } from '../../../utils/assetHelpers';
import SuperOverSelectionModal from '../SuperOverSelectionModal';
import { TutorialSpotlight } from '../../tutorial';
import useMatchdayTutorial from '../../tutorial/useMatchdayTutorial';
import SaveGameManager from '../../../utils/SaveGameManager';
import useInboxStore from '../../../stores/inboxStore';
import MessageGenerator from '../../../utils/MessageGenerator';
import useAuctionStore from '../../../stores/auctionStore';
import useTransferStore from '../../../stores/transferStore';
import AutosaveIndicator from '../../shared/AutosaveIndicator';

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
  const matchConditions = useMatchStore(state => state.matchConditions);
  const currentModifierBreakdown = useMatchStore(state => state.currentModifierBreakdown);
  const tacticsState = useMatchStore(state => state.tacticsState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSkipDropdown, setShowSkipDropdown] = useState(false);
  const [showModifierBreakdown, setShowModifierBreakdown] = useState(false);
  const [isBreakdownPinned, setIsBreakdownPinned] = useState(false);
  const skipDropdownRef = React.useRef(null);

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

  const bowlerId = innings?.bowler;
  const currentInningsNumber = innings?.number || 1;

  // Holds the previous bowler at end-of-over so the over strip keeps showing the
  // just-completed over until the new bowler's first ball lands.
  const [displayedBowlerId, setDisplayedBowlerId] = useState(bowlerId);
  const [displayedInnings, setDisplayedInnings] = useState(currentInningsNumber);

  React.useEffect(() => {
    if (!bowlerId) return;
    if (!displayedBowlerId || displayedInnings !== currentInningsNumber) {
      setDisplayedBowlerId(bowlerId);
      setDisplayedInnings(currentInningsNumber);
      return;
    }
    if (bowlerId === displayedBowlerId) return;
    // Defer swap until the new bowler's first ball is recorded — engine reassigns
    // innings.bowler at start-of-over, before the delivery lands. Checking "any ball
    // this innings" wrongly matches an earlier over by the same bowler.
    let lastBallInInnings = null;
    for (let i = ballByBall.length - 1; i >= 0; i--) {
      if (ballByBall[i].innings === currentInningsNumber) {
        lastBallInInnings = ballByBall[i];
        break;
      }
    }
    if (lastBallInInnings?.bowlerId === bowlerId) {
      setDisplayedBowlerId(bowlerId);
    }
  }, [bowlerId, ballByBall, currentInningsNumber, displayedBowlerId, displayedInnings]);

  // Calculate bowler stats from ballByBall (for the *displayed* bowler)
  const bowlerStats = React.useMemo(() => {
    if (!displayedBowlerId || !ballByBall || ballByBall.length === 0) return { overs: '0', maidens: 0, runs: 0, wickets: 0 };
    const bowlerBalls = ballByBall.filter(b => b.bowlerId === displayedBowlerId);
    const legalBalls = bowlerBalls.filter(b => b.isLegal !== false).length;
    const overs = Math.floor(legalBalls / 6);
    const balls = legalBalls % 6;
    return {
      overs: balls > 0 ? `${overs}.${balls}` : `${overs}`,
      maidens: 0, // Would need to track complete overs for this
      runs: bowlerBalls.reduce((sum, b) => sum + (b.runs || 0), 0),
      wickets: bowlerBalls.filter(b => b.isWicket).length
    };
  }, [displayedBowlerId, ballByBall]);

  // Get the over to display: the most recent over bowled by the displayed bowler.
  // This naturally holds the previous over after ball 6 — once we swap displayedBowlerId
  // to the new bowler, this picks up their freshly-started over.
  const currentOverBalls = React.useMemo(() => {
    if (!ballByBall || ballByBall.length === 0 || !displayedBowlerId) return [];

    const bowlerBalls = ballByBall.filter(
      b => b.innings === currentInningsNumber && b.bowlerId === displayedBowlerId
    );
    if (bowlerBalls.length === 0) return [];

    const displayOver = Math.max(...bowlerBalls.map(b => b.over));
    const overBalls = bowlerBalls.filter(b => b.over === displayOver);

    return overBalls.map(b => {
      if (b.isWicket) return 'W';
      if (!b.isLegal) {
        if (b.extras?.wides > 0) return 'Wd';
        if (b.extras?.noBalls > 0) return 'Nb';
        return 'X';
      }
      if (b.runs === 0) return '•';
      return b.runs.toString();
    });
  }, [ballByBall, currentInningsNumber, displayedBowlerId]);

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
          console.log('🏏 Match completed! Finalizing match result...');

          // For interactive matches, MatchEngine might not have called completeMatch
          // if the match was paused. We need to call it explicitly.
          await matchEngine.completeMatch();

          console.log('🏏 Triggering completion handler');
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

  // Click outside handler for skip dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (skipDropdownRef.current && !skipDropdownRef.current.contains(event.target)) {
        setShowSkipDropdown(false);
      }
    };

    if (showSkipDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSkipDropdown]);

  const handleSkipOver = async () => {
    if (!matchEngine || isPlaying) return;
    setShowSkipDropdown(false);

    // Save original speed and switch to instant for skipping
    const originalSpeed = matchEngine.config.simulationSpeed;
    matchEngine.config.simulationSpeed = 'instant';
    matchEngine.isPaused = false;

    const startOver = matchEngine.matchStore.getState().currentBall?.over || 0;
    try {
      while (!matchEngine.isInningsComplete()) {
        const currentOver = matchEngine.matchStore.getState().currentBall?.over || 0;
        if (currentOver > startOver) break;
        await matchEngine.simulateBall();
      }
      matchEngine.isPaused = true;
    } catch (error) {
      console.error('Error skipping over:', error);
      matchEngine.isPaused = true;
    } finally {
      // Restore original speed
      matchEngine.config.simulationSpeed = originalSpeed;
    }
  };

  const handleSkipOvers = async (count) => {
    if (!matchEngine || isPlaying) return;
    setShowSkipDropdown(false);

    // Save original speed and switch to instant for skipping
    const originalSpeed = matchEngine.config.simulationSpeed;
    matchEngine.config.simulationSpeed = 'instant';
    matchEngine.isPaused = false;

    const startOver = matchEngine.matchStore.getState().currentBall?.over || 0;
    const targetOver = startOver + count;
    try {
      while (!matchEngine.isInningsComplete()) {
        const currentOver = matchEngine.matchStore.getState().currentBall?.over || 0;
        if (currentOver >= targetOver) break;
        await matchEngine.simulateBall();
      }
      matchEngine.isPaused = true;
    } catch (error) {
      console.error('Error skipping overs:', error);
      matchEngine.isPaused = true;
    } finally {
      // Restore original speed
      matchEngine.config.simulationSpeed = originalSpeed;
    }
  };

  const handleSkipInnings = async () => {
    if (!matchEngine || isPlaying) return;
    setShowSkipDropdown(false);

    // Save original speed and switch to instant for skipping
    const originalSpeed = matchEngine.config.simulationSpeed;
    matchEngine.config.simulationSpeed = 'instant';
    matchEngine.isPaused = false;

    const startInnings = matchEngine.matchStore.getState().innings?.number || 1;
    try {
      while (!matchEngine.isInningsComplete()) {
        await matchEngine.simulateBall();
      }
      // If 1st innings just completed, need to start 2nd innings
      if (startInnings === 1 && !matchEngine.isMatchComplete()) {
        matchEngine.startSecondInnings();
      }
      matchEngine.isPaused = true;
    } catch (error) {
      console.error('Error skipping innings:', error);
      matchEngine.isPaused = true;
    } finally {
      // Restore original speed
      matchEngine.config.simulationSpeed = originalSpeed;
    }
  };

  // Gradient background using team colors
  const gradientStyle = {
    background: leftTeam && rightTeam
      ? `linear-gradient(to right, ${leftTeam.colors?.primary || '#2D5F3F'} 0%, #1a1a1a 50%, ${rightTeam.colors?.primary || '#2D5F3F'} 100%)`
      : 'linear-gradient(to right, #2D5F3F 0%, #1a1a1a 50%, #2D5F3F 100%)'
  };

  // Text shadow style for legibility on light backgrounds
  const textShadowStyle = {
    textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.7), 0 0 12px rgba(0,0,0,0.5)'
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
    <div style={gradientStyle} className="match-header-bar border-b-2 border-cricket-primary/30 shadow-lg">
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
          <div className={`w-44 flex-shrink-0 ${battingTeam?.id === firstBattingTeamId ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <img
                src={getTeamIcon(firstBattingTeamId)}
                alt={leftTeam?.name}
                className="w-5 h-5 drop-shadow-lg"
              />
              <div
                className={`text-xs font-bold uppercase tracking-wide truncate ${battingTeam?.id === firstBattingTeamId ? 'text-cricket-accent' : 'text-white'}`}
                style={textShadowStyle}
              >
                {leftTeam?.name || 'Team 1'}
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white font-mono tracking-tight" style={textShadowStyle}>{leftTeamScore.runs}</span>
              <span className="text-lg font-semibold text-cricket-accent font-mono" style={textShadowStyle}>/{leftTeamScore.wickets}</span>
              <span className="text-xs text-white/70 font-mono ml-1" style={textShadowStyle}>({leftTeamScore.overs}.{leftTeamScore.balls})</span>
            </div>
          </div>

          <div className="w-px h-14 bg-white/20" />

          {/* Center: Players on their team's side, Metrics in center - Hover for modifier breakdown */}
          <div
            className="match-header-center relative flex items-center gap-3 flex-1 justify-center min-w-0"
            onMouseEnter={() => !isBreakdownPinned && setShowModifierBreakdown(true)}
            onMouseLeave={() => !isBreakdownPinned && setShowModifierBreakdown(false)}
          >
            {/* Determine if left team (first batting) is currently batting */}
            {(() => {
              const leftTeamIsBatting = battingTeam?.id === firstBattingTeamId;

              // Batsmen column component - same layout on both sides: ★ | Name | Stats
              const BatsmenColumn = () => (
                <div className="w-48 flex flex-col gap-0.5 flex-shrink-0">
                  {/* Top batsman (always shows first batsman, star moves) */}
                  {batsmanOnTop && (
                    <div className="flex items-center gap-1.5 h-7">
                      <span className={`text-cricket-accent font-bold text-sm w-3 ${batsmanOnTop.isStriker ? '' : 'invisible'}`} style={textShadowStyle}>★</span>
                      <PlayerName playerId={batsmanOnTop.id} className="font-semibold text-white text-xs truncate flex-1" style={textShadowStyle} />
                      <span className="font-mono text-xs text-white/90 w-16 text-right" style={textShadowStyle}>
                        {batsmanOnTop.stats.runs}({batsmanOnTop.stats.balls})
                      </span>
                    </div>
                  )}
                  {/* Bottom batsman (always shows second batsman, star moves) */}
                  {batsmanOnBottom && (
                    <div className="flex items-center gap-1.5 h-7">
                      <span className={`text-cricket-accent font-bold text-sm w-3 ${batsmanOnBottom.isStriker ? '' : 'invisible'}`} style={textShadowStyle}>★</span>
                      <PlayerName playerId={batsmanOnBottom.id} className="font-medium text-white/80 text-xs truncate flex-1" style={textShadowStyle} />
                      <span className="font-mono text-xs text-white/70 w-16 text-right" style={textShadowStyle}>
                        {batsmanOnBottom.stats.runs}({batsmanOnBottom.stats.balls})
                      </span>
                    </div>
                  )}
                </div>
              );

              // Bowler column component
              const BowlerColumn = ({ alignRight = false }) => (
                <div className={`w-52 flex flex-col gap-0.5 flex-shrink-0 ${alignRight ? 'items-end' : ''}`}>
                  {displayedBowlerId && bowlerStats ? (
                    <>
                      {/* Row 1: Bowler name + stats */}
                      <div className={`flex items-center gap-2 h-7 ${alignRight ? 'flex-row-reverse' : ''}`}>
                        <PlayerName playerId={displayedBowlerId} className={`font-semibold text-white text-xs truncate flex-1 ${alignRight ? 'text-right' : ''}`} style={textShadowStyle} />
                        <span className="font-mono text-xs text-white/90 whitespace-nowrap" style={textShadowStyle}>
                          {bowlerStats.overs}-{bowlerStats.maidens}-{bowlerStats.runs}-{bowlerStats.wickets}
                        </span>
                      </div>
                      {/* Row 2: Current over balls */}
                      <div className={`flex items-center gap-1 h-7 ${alignRight ? 'flex-row-reverse' : ''}`}>
                        {currentOverBalls.length > 0 ? (
                          currentOverBalls.map((ball, idx) => (
                            <div
                              key={idx}
                              className={`
                                w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                                ${ball === 'W' ? 'bg-red-600 text-white' : ''}
                                ${ball === '•' ? 'bg-gray-600 text-white' : ''}
                                ${ball === '4' ? 'bg-blue-600 text-white' : ''}
                                ${ball === '6' ? 'bg-purple-600 text-white' : ''}
                                ${['1', '2', '3'].includes(ball) ? 'bg-green-700 text-white' : ''}
                                ${['Wd', 'Nb'].includes(ball) ? 'bg-orange-600 text-white text-[10px]' : ''}
                              `}
                              style={textShadowStyle}
                            >
                              {ball}
                            </div>
                          ))
                        ) : (
                          <div className="h-5">&nbsp;</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-7">&nbsp;</div>
                      <div className="h-7">&nbsp;</div>
                    </>
                  )}
                </div>
              );

              // Central Metrics component with win probability gradient
              const MetricsColumn = () => {
                // Get pressure index (0-100, <50 = batting winning, >50 = bowling winning)
                const pressureIndex = tacticsState?.pressureIndex?.batting ?? 50;

                // Calculate right team win probability based on which team is batting
                // If left team batting: high pressure = right team (bowling) winning
                // If right team batting: high pressure = left team (bowling) winning
                const rightTeamWinProb = leftTeamIsBatting ? pressureIndex : (100 - pressureIndex);

                // Get team colors
                const leftTeamColor = leftTeam?.colors?.primary || '#2D5F3F';
                const rightTeamColor = rightTeam?.colors?.primary || '#2D5F3F';

                // Create gradient style - the transition point shifts based on win probability
                // rightTeamWinProb = 0 → all left color (left team dominating)
                // rightTeamWinProb = 50 → even split at center
                // rightTeamWinProb = 100 → all right color (right team dominating)
                // The transition center is at (100 - rightTeamWinProb)%
                const transitionCenter = 100 - rightTeamWinProb;
                const gradientStyle = {
                  background: `linear-gradient(to right,
                    ${leftTeamColor} ${Math.max(0, transitionCenter - 15)}%,
                    ${rightTeamColor} ${Math.min(100, transitionCenter + 15)}%)`
                };

                return (
                  <div
                    className="w-36 px-3 py-1.5 rounded border border-white/30 flex-shrink-0"
                    style={gradientStyle}
                  >
                    {/* CRR and RRR in single row */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white/90 uppercase tracking-wide font-semibold" style={textShadowStyle}>CRR</span>
                        <span className="font-mono font-bold text-white text-sm" style={textShadowStyle}>{currentRunRate.toFixed(2)}</span>
                      </div>
                      {isSecondInnings && requiredRunRate > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/90 uppercase tracking-wide font-semibold" style={textShadowStyle}>RRR</span>
                          <span className="font-mono font-bold text-white text-sm" style={textShadowStyle}>{requiredRunRate.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {/* Need X from Y text below */}
                    {isSecondInnings && ballsRemaining > 0 && (
                      <div className="text-center pt-0.5 border-t border-white/20">
                        <span className="text-xs font-semibold text-white" style={textShadowStyle}>
                          Need <span className="font-bold">{runsRequired}</span> from <span className="font-bold">{ballsRemaining}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              };

              // Render based on which team is batting
              // Left team batting: Batsmen left, Bowler right
              // Right team batting: Bowler left, Batsmen right
              return leftTeamIsBatting ? (
                <>
                  <BatsmenColumn />
                  <div className="w-px h-14 bg-white/20" />
                  <MetricsColumn />
                  <div className="w-px h-14 bg-white/20" />
                  <BowlerColumn />
                </>
              ) : (
                <>
                  <BowlerColumn />
                  <div className="w-px h-14 bg-white/20" />
                  <MetricsColumn />
                  <div className="w-px h-14 bg-white/20" />
                  <BatsmenColumn />
                </>
              );
            })()}

            {/* Modifier Breakdown Panel */}
            {(showModifierBreakdown || isBreakdownPinned) && currentModifierBreakdown && innings && (
              <ModifierBreakdownPanel
                strikerBreakdown={currentModifierBreakdown.striker}
                bowlerBreakdown={currentModifierBreakdown.bowler}
                strikerName={currentModifierBreakdown.strikerName || 'Striker'}
                bowlerName={currentModifierBreakdown.bowlerName || 'Bowler'}
                striker={innings.striker ? getPlayer(innings.striker) : null}
                bowler={innings.bowler ? getPlayer(innings.bowler) : null}
                strikerTier={tacticsState?.currentAcceleration?.striker || 'Rotate'}
                bowlerPlans={tacticsState?.bowlingPlans?.[innings.bowler]}
                isPinned={isBreakdownPinned}
                onPin={() => setIsBreakdownPinned(!isBreakdownPinned)}
                onClose={() => {
                  setIsBreakdownPinned(false);
                  setShowModifierBreakdown(false);
                }}
                swapSides={battingTeam?.id !== firstBattingTeamId}
              />
            )}
          </div>

          <div className="w-px h-14 bg-white/20" />

          {/* Right Team Score + Name (fixed width) */}
          <div className={`w-44 flex-shrink-0 text-right ${battingTeam?.id === secondBattingTeamId ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-center gap-1.5 mb-1 justify-end">
              <div
                className={`text-xs font-bold uppercase tracking-wide truncate ${battingTeam?.id === secondBattingTeamId ? 'text-cricket-accent' : 'text-white'}`}
                style={textShadowStyle}
              >
                {rightTeam?.name || 'Team 2'}
              </div>
              <img
                src={getTeamIcon(secondBattingTeamId)}
                alt={rightTeam?.name}
                className="w-5 h-5 drop-shadow-lg"
              />
            </div>
            {rightTeamScore ? (
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-white font-mono tracking-tight" style={textShadowStyle}>{rightTeamScore.runs}</span>
                <span className="text-lg font-semibold text-cricket-accent font-mono" style={textShadowStyle}>/{rightTeamScore.wickets}</span>
                <span className="text-xs text-white/70 font-mono ml-1" style={textShadowStyle}>({rightTeamScore.overs}.{rightTeamScore.balls})</span>
              </div>
            ) : (
              <div className="text-xs text-white/50 italic" style={textShadowStyle}>
                Yet to bat
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls (fixed width, same as back button) */}
        <div className="match-controls w-20 flex flex-col items-center justify-center gap-1 px-2 flex-shrink-0 border-l border-white/10">
          {status === 'completed' ? (
            <button
              onClick={() => {
                console.log('🔘 Continue button clicked');
                if (onMatchComplete) {
                  onMatchComplete();
                } else {
                  console.error('❌ onMatchComplete is undefined!');
                }
              }}
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

              {/* Skip Dropdown */}
              <div ref={skipDropdownRef} className="relative w-full">
                <button
                  onClick={() => setShowSkipDropdown(!showSkipDropdown)}
                  className="flex items-center justify-center gap-1 px-2 py-1 bg-black/40 hover:bg-black/60 border border-white/20 text-white rounded transition-all text-xs w-full"
                  disabled={!matchEngine || isPlaying}
                  title="Skip options"
                >
                  <FastForward className="w-3 h-3" />
                  <span>Skip</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Dropdown Menu */}
                {showSkipDropdown && !isPlaying && matchEngine && (
                  <div className="absolute top-full mt-1 right-0 bg-bg-secondary border border-border-primary rounded shadow-lg z-50 min-w-max">
                    <button
                      onClick={handleSkipOver}
                      className="w-full px-3 py-2 text-xs text-text-primary hover:bg-cricket-primary/20 transition-colors text-left flex items-center gap-2 border-b border-border-primary"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Skip Over</span>
                    </button>
                    <button
                      onClick={() => handleSkipOvers(5)}
                      className="w-full px-3 py-2 text-xs text-text-primary hover:bg-cricket-primary/20 transition-colors text-left flex items-center gap-2 border-b border-border-primary"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Skip 5 Overs</span>
                    </button>
                    <button
                      onClick={handleSkipInnings}
                      className="w-full px-3 py-2 text-xs text-text-primary hover:bg-cricket-primary/20 transition-colors text-left flex items-center gap-2"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Skip to End of Innings</span>
                    </button>
                  </div>
                )}
              </div>
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
/**
 * Cycleable list of stats hub panels rendered in the innings-break modal's right column.
 * Append new entries to extend — each entry just needs a label, an icon, and a component.
 */
const INNINGS_BREAK_STAT_PANELS = [
  { id: 'worm', label: 'Run Rate Worm', icon: TrendingUp, Component: RunRateWorm },
  { id: 'manhattan', label: 'Manhattan', icon: BarChart3, Component: ManhattanChart },
  { id: 'partnerships', label: 'Partnerships', icon: Users2, Component: PartnershipsPanel },
];

/**
 * Compact dismissal label for the innings-break scorecard — patterned on
 * ScorecardModal.formatDismissal but resolves player names inline.
 */
const formatDismissalShort = (dismissal, getPlayer) => {
  if (!dismissal || dismissal.type === 'not out') return 'not out';
  const bowlerName = dismissal.bowler ? (getPlayer(dismissal.bowler)?.name?.split(' ').slice(-1)[0] || '') : '';
  const fielderName = dismissal.fielder ? (getPlayer(dismissal.fielder)?.name?.split(' ').slice(-1)[0] || '') : '';
  switch (dismissal.type) {
    case 'bowled': return `b ${bowlerName}`;
    case 'caught': return `c ${fielderName} b ${bowlerName}`;
    case 'lbw': return `lbw b ${bowlerName}`;
    case 'run out': return `run out (${fielderName})`;
    case 'stumped': return `st ${fielderName} b ${bowlerName}`;
    case 'hit wicket': return `hit wicket b ${bowlerName}`;
    default: return dismissal.type;
  }
};

/**
 * Compact ball-by-ball-derived scorecard for one innings. Drops boundary-count
 * columns (4s/6s/0s) the user said aren't useful here and shows dismissals
 * under each batsman name (ScorecardModal pattern). `innings` defaults to 1 so
 * existing innings-break call sites stay unchanged.
 */
const InningsBreakScorecard = ({ innings = 1 } = {}) => {
  const ballByBall = useMatchStore(state => state.ballByBall);
  const getPlayer = usePlayerStore(state => state.getPlayer);

  const inningsBalls = React.useMemo(
    () => (ballByBall || []).filter(b => b.innings === innings),
    [ballByBall, innings]
  );

  const battingRows = React.useMemo(() => {
    const stats = {};
    const order = [];
    inningsBalls.forEach(ball => {
      const sid = ball.striker;
      if (!sid) return;
      if (!stats[sid]) {
        stats[sid] = { id: sid, runs: 0, balls: 0, dismissal: null };
        order.push(sid);
      }
      stats[sid].runs += ball.runs || 0;
      if (ball.isLegal !== false && !ball.isWide) stats[sid].balls += 1;
      if (ball.isWicket && ball.dismissedPlayer === sid) {
        stats[sid].dismissal = {
          type: ball.dismissalType?.type || ball.dismissalType || 'out',
          bowler: ball.bowler,
          fielder: ball.fielderId
        };
      }
    });
    return order.map(id => stats[id]);
  }, [inningsBalls]);

  const bowlingRows = React.useMemo(() => {
    const stats = {};
    const order = [];
    inningsBalls.forEach(ball => {
      const bid = ball.bowler;
      if (!bid) return;
      if (!stats[bid]) {
        stats[bid] = { id: bid, runs: 0, wickets: 0, balls: 0, maidens: 0 };
        order.push(bid);
      }
      stats[bid].runs += ball.runs || 0;
      if (ball.isWicket) stats[bid].wickets += 1;
      if (ball.isLegal !== false) stats[bid].balls += 1;
    });
    return order.map(id => stats[id]);
  }, [inningsBalls]);

  const sr = (runs, balls) => balls === 0 ? '0.0' : ((runs / balls) * 100).toFixed(1);
  const econ = (runs, balls) => balls === 0 ? '0.00' : ((runs / balls) * 6).toFixed(2);
  const oversFmt = (balls) => {
    const o = Math.floor(balls / 6);
    const r = balls % 6;
    return r > 0 ? `${o}.${r}` : `${o}`;
  };

  return (
    <div className="text-xs">
      {/* Batting */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wide text-trophy-gold font-bold mb-1.5">Batting</div>
        <table className="w-full">
          <thead>
            <tr className="text-text-secondary text-[10px] border-b border-border-primary">
              <th className="text-left py-1 font-medium">Batsman</th>
              <th className="text-right py-1 font-medium w-10">R</th>
              <th className="text-right py-1 font-medium w-10">B</th>
              <th className="text-right py-1 font-medium w-12">SR</th>
            </tr>
          </thead>
          <tbody>
            {battingRows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-2 text-text-secondary">No batting data</td></tr>
            ) : battingRows.map(b => (
              <tr key={b.id} className="border-b border-border-secondary/50">
                <td className="py-0.5">
                  <span className="inline-flex items-baseline gap-1.5 max-w-full">
                    <PlayerName playerId={b.id} className="text-text-primary text-xs" />
                    <span className="text-[9px] text-text-secondary italic truncate">
                      {formatDismissalShort(b.dismissal, getPlayer)}
                    </span>
                  </span>
                </td>
                <td className="text-right py-0.5 font-mono text-text-primary font-semibold">{b.runs}</td>
                <td className="text-right py-0.5 font-mono text-text-secondary">{b.balls}</td>
                <td className="text-right py-0.5 font-mono text-text-secondary">{sr(b.runs, b.balls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bowling */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-trophy-gold font-bold mb-1.5">Bowling</div>
        <table className="w-full">
          <thead>
            <tr className="text-text-secondary text-[10px] border-b border-border-primary">
              <th className="text-left py-1 font-medium">Bowler</th>
              <th className="text-right py-1 font-medium w-10">O</th>
              <th className="text-right py-1 font-medium w-8">M</th>
              <th className="text-right py-1 font-medium w-10">R</th>
              <th className="text-right py-1 font-medium w-8">W</th>
              <th className="text-right py-1 font-medium w-12">Econ</th>
            </tr>
          </thead>
          <tbody>
            {bowlingRows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-2 text-text-secondary">No bowling data</td></tr>
            ) : bowlingRows.map(b => (
              <tr key={b.id} className="border-b border-border-secondary/50">
                <td className="py-0.5">
                  <PlayerName playerId={b.id} className="text-text-primary text-xs" />
                </td>
                <td className="text-right py-0.5 font-mono text-text-primary">{oversFmt(b.balls)}</td>
                <td className="text-right py-0.5 font-mono text-text-secondary">{b.maidens}</td>
                <td className="text-right py-0.5 font-mono text-text-primary">{b.runs}</td>
                <td className="text-right py-0.5 font-mono text-text-positive font-semibold">{b.wickets}</td>
                <td className="text-right py-0.5 font-mono text-text-secondary">{econ(b.runs, b.balls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Modal shown between innings — pauses the engine so the user can set bowling tactics
 * before the bowling innings begins. Visible whenever matchStore.status === 'innings_break'.
 *
 * 3-column layout: left = full scorecard (batting top, bowling bottom), center = innings
 * summary + target/RRR + win prediction (gradient pattern reused from MetricsColumn),
 * right = cycleable Stats Hub panels (worm / manhattan / partnerships / ...).
 */
const InningsBreakModal = ({ matchEngine }) => {
  const status = useMatchStore(state => state.status);
  const teams = useMatchStore(state => state.teams);
  const currentBall = useMatchStore(state => state.currentBall);
  const ballByBall = useMatchStore(state => state.ballByBall);
  const clubs = useLeagueStore(state => state.clubs);
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const userTeamId = useTeamStore(state => state.userTeamId);
  const [isResuming, setIsResuming] = useState(false);

  // Top performers from the just-completed first innings — derived from ballByBall so
  // we don't depend on results[] (which isn't populated until match end).
  const innings1Stats = React.useMemo(() => {
    if (!ballByBall || ballByBall.length === 0) return { topBatsman: null, topBowler: null };
    const balls1 = ballByBall.filter(b => b.innings === 1);

    const batters = new Map();
    const bowlers = new Map();
    balls1.forEach(b => {
      if (b.batsmanId) {
        const cur = batters.get(b.batsmanId) || { runs: 0, balls: 0 };
        cur.runs += b.runs || 0;
        if (b.isLegal !== false) cur.balls += 1;
        batters.set(b.batsmanId, cur);
      }
      if (b.bowlerId) {
        const cur = bowlers.get(b.bowlerId) || { runs: 0, wickets: 0, balls: 0 };
        cur.runs += b.runs || 0;
        if (b.isWicket) cur.wickets += 1;
        if (b.isLegal !== false) cur.balls += 1;
        bowlers.set(b.bowlerId, cur);
      }
    });

    let topBatsman = null;
    batters.forEach((v, id) => {
      if (!topBatsman || v.runs > topBatsman.runs) topBatsman = { id, ...v };
    });
    let topBowler = null;
    bowlers.forEach((v, id) => {
      // Rank by wickets, then by economy (lower runs better)
      if (!topBowler ||
          v.wickets > topBowler.wickets ||
          (v.wickets === topBowler.wickets && v.runs < topBowler.runs)) {
        topBowler = { id, ...v };
      }
    });
    return { topBatsman, topBowler };
  }, [ballByBall]);

  if (status !== 'innings_break' || !matchEngine) return null;

  const battedTeam = teams?.batting;
  const bowledTeam = teams?.bowling;
  const score = battedTeam?.totalScore ?? 0;
  const wickets = battedTeam?.wickets ?? 0;
  const overs = currentBall?.over ?? 0;
  const balls = currentBall?.ball ?? 0;
  const target = score + 1;
  const battedClub = clubs?.[battedTeam?.id];
  const bowledClub = clubs?.[bowledTeam?.id];
  const battedTeamName = battedClub?.name || battedTeam?.name || 'First innings team';
  const bowledTeamName = bowledClub?.name || bowledTeam?.name || 'Second innings team';
  const battedColor = battedClub?.colors?.primary || '#2D5F3F';
  const bowledColor = bowledClub?.colors?.primary || '#2D5F3F';

  // Required run rate over a full 2nd innings
  const requiredRR = target / 20;

  // Simple chase-difficulty win prediction: par RRR ~ 8.0. Each rpo above par drops the
  // chasing team's chance by ~10%. Clamp to [10, 90] so we never imply certainty.
  const PAR_RR = 8.0;
  const rawChasingWinProb = 50 + (PAR_RR - requiredRR) * 10;
  const chasingWinProb = Math.max(10, Math.min(90, Math.round(rawChasingWinProb)));
  const battedWinProb = 100 - chasingWinProb;

  // Gradient: batted team on the left, chasing team on the right. Transition center
  // shifts based on the chasing team's win probability (higher = bar tilts to chasing color).
  const transitionCenter = 100 - chasingWinProb;
  const winProbGradient = {
    background: `linear-gradient(to right,
      ${battedColor} ${Math.max(0, transitionCenter - 15)}%,
      ${bowledColor} ${Math.min(100, transitionCenter + 15)}%)`
  };

  // Label the continue button based on whether the user is the chasing team
  const userIsChasing = userTeamId && bowledTeam?.id === userTeamId;
  const userIsBatted = userTeamId && battedTeam?.id === userTeamId;
  const continueLabel = userIsChasing
    ? 'Start Batting Innings'
    : userIsBatted
      ? 'Start Bowling Innings'
      : 'Start Second Innings';

  const handleContinue = async () => {
    if (isResuming) return;
    setIsResuming(true);
    try {
      await matchEngine.resumeAfterInningsBreak();
    } catch (err) {
      console.error('Failed to resume after innings break:', err);
      setIsResuming(false);
    }
  };

  const TeamBadge = ({ teamId, size = 64 }) => (
    <img
      src={getTeamIcon(teamId)}
      alt=""
      style={{ width: size, height: size }}
      className="object-contain drop-shadow-lg"
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
  );

  const topBatsmanPlayer = innings1Stats.topBatsman ? getPlayer(innings1Stats.topBatsman.id) : null;
  const topBowlerPlayer = innings1Stats.topBowler ? getPlayer(innings1Stats.topBowler.id) : null;

  return <InningsBreakModalLayout
    battedTeam={battedTeam}
    bowledTeam={bowledTeam}
    battedTeamName={battedTeamName}
    bowledTeamName={bowledTeamName}
    battedColor={battedColor}
    bowledColor={bowledColor}
    score={score}
    wickets={wickets}
    overs={overs}
    balls={balls}
    target={target}
    requiredRR={requiredRR}
    battedWinProb={battedWinProb}
    chasingWinProb={chasingWinProb}
    winProbGradient={winProbGradient}
    topBatsmanPlayer={topBatsmanPlayer}
    topBowlerPlayer={topBowlerPlayer}
    topBatsmanStats={innings1Stats.topBatsman}
    topBowlerStats={innings1Stats.topBowler}
    continueLabel={continueLabel}
    isResuming={isResuming}
    onContinue={handleContinue}
    TeamBadge={TeamBadge}
  />;
};

/**
 * Pure layout component for the innings-break modal. Split out so the data hook above
 * stays focused on data derivation and the layout/markup stays readable.
 */
const InningsBreakModalLayout = ({
  battedTeam, bowledTeam, battedTeamName, bowledTeamName, battedColor, bowledColor,
  score, wickets, overs, balls, target, requiredRR,
  battedWinProb, chasingWinProb, winProbGradient,
  topBatsmanPlayer, topBowlerPlayer, topBatsmanStats, topBowlerStats,
  continueLabel, isResuming, onContinue, TeamBadge
}) => {
  // Right-column cycleable stats — index into INNINGS_BREAK_STAT_PANELS
  const [statIndex, setStatIndex] = useState(0);
  const totalPanels = INNINGS_BREAK_STAT_PANELS.length;
  const currentPanel = INNINGS_BREAK_STAT_PANELS[statIndex];
  const CurrentPanelComponent = currentPanel?.Component;
  const CurrentPanelIcon = currentPanel?.icon;
  const cyclePrev = () => setStatIndex((statIndex - 1 + totalPanels) % totalPanels);
  const cycleNext = () => setStatIndex((statIndex + 1) % totalPanels);

  const innings1RR = (score / Math.max(1, ((overs * 6 + balls) / 6))).toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <div className="bg-black/85 backdrop-blur-md border border-border-primary rounded-lg w-[95vw] max-w-7xl h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Top banner: gradient with both team badges */}
        <div
          className="px-6 py-4 border-b border-border-primary flex-shrink-0"
          style={{
            background: `linear-gradient(to right, ${battedColor}cc 0%, #1a1a1a 50%, ${bowledColor}cc 100%)`
          }}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <TeamBadge teamId={battedTeam?.id} size={56} />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">First Innings</div>
                <div className="text-sm font-bold text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {battedTeamName}
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">Innings Break</div>
              <h3 className="text-xl font-bold text-trophy-gold mt-0.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                End of First Innings
              </h3>
            </div>
            <div className="flex items-center gap-3 min-w-0 flex-row-reverse">
              <TeamBadge teamId={bowledTeam?.id} size={56} />
              <div className="min-w-0 text-right">
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">Chasing</div>
                <div className="text-sm font-bold text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {bowledTeamName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body: left (scorecard, full height) | right side (split into top + bottom) */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          {/* LEFT — Compact scorecard, batting + bowling stacked, full height (37%) */}
          <div className="basis-[37%] flex-shrink-0 border-r border-border-primary flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border-primary flex-shrink-0">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Scorecard</div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <InningsBreakScorecard />
            </div>
          </div>

          {/* RIGHT SIDE WRAPPER — split into top (summary + stats) and bottom (win pred + button) */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top: summary (center, 26%) + stats hub (right, 37%) — flex-grow ratios divide the 63% available */}
            <div className="flex-1 flex flex-row min-h-0">
              {/* CENTER — Summary, top performers, target, RRR */}
              <div className="flex-[26] border-r border-border-primary flex flex-col min-h-0 overflow-y-auto">
                {/* Score */}
                <div className="px-5 py-4 text-center border-b border-border-primary">
                  <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">{battedTeamName}</div>
                  <div className="text-5xl font-bold text-text-primary font-mono">
                    {score}<span className="text-3xl text-text-secondary">/{wickets}</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    ({overs}.{balls} overs · {innings1RR} RR)
                  </div>
                </div>

                {/* Top performers */}
                {(topBatsmanPlayer || topBowlerPlayer) && (
                  <div className="px-5 py-3 border-b border-border-primary grid grid-cols-2 gap-3 text-xs">
                    {topBatsmanPlayer && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-0.5">Top Batter</div>
                        <div className="font-semibold text-text-primary truncate">{topBatsmanPlayer.name}</div>
                        <div className="font-mono text-cricket-accent">
                          {topBatsmanStats.runs} <span className="text-text-secondary">({topBatsmanStats.balls})</span>
                        </div>
                      </div>
                    )}
                    {topBowlerPlayer && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-0.5">Top Bowler</div>
                        <div className="font-semibold text-text-primary truncate">{topBowlerPlayer.name}</div>
                        <div className="font-mono text-cricket-accent">
                          {topBowlerStats.wickets}/{topBowlerStats.runs}
                          <span className="text-text-secondary"> ({(topBowlerStats.balls / 6).toFixed(1)} ov)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Target + RRR */}
                <div className="px-5 py-4 text-center flex-1 flex flex-col justify-center">
                  <div className="text-xs uppercase tracking-wide text-text-secondary mb-2">
                    Target for {bowledTeamName}
                  </div>
                  <div className="flex items-center justify-center gap-5">
                    <div>
                      <div className="text-4xl font-bold text-trophy-gold font-mono leading-none">{target}</div>
                      <div className="text-[10px] uppercase tracking-wide text-text-secondary mt-1">runs to win</div>
                    </div>
                    <div className="w-px h-12 bg-border-primary" />
                    <div>
                      <div className="text-4xl font-bold text-cricket-accent font-mono leading-none">{requiredRR.toFixed(2)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-text-secondary mt-1">required RR</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — Cycleable stats panels */}
              <div className="flex-[37] flex flex-col min-h-0">
                <div className="px-3 py-2 border-b border-border-primary flex-shrink-0 flex items-center justify-between gap-2">
                  <button
                    onClick={cyclePrev}
                    className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Previous stat"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    {CurrentPanelIcon && <CurrentPanelIcon className="w-3.5 h-3.5 text-cricket-accent" />}
                    <span>{currentPanel?.label}</span>
                  </div>
                  <button
                    onClick={cycleNext}
                    className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Next stat"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 [&_.bg-bg-tertiary]:!bg-transparent [&_.bg-bg-tertiary]:!p-0">
                  {CurrentPanelComponent && <CurrentPanelComponent />}
                </div>
                {/* Pagination dots */}
                <div className="px-3 py-2 border-t border-border-primary flex items-center justify-center gap-1.5 flex-shrink-0">
                  {INNINGS_BREAK_STAT_PANELS.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setStatIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === statIndex ? 'w-6 bg-cricket-accent' : 'w-1.5 bg-text-secondary/40 hover:bg-text-secondary'
                      }`}
                      aria-label={`Show ${p.label}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: Win prediction + Continue button — spans both center & stats columns */}
            <div className="border-t border-border-primary flex-shrink-0 px-5 py-4 flex items-center gap-5">
              {/* Win prediction (takes the available width on the left) */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-semibold flex items-center justify-between">
                  <span>Win Prediction</span>
                </div>
                <div
                  className="h-8 rounded border border-white/20 flex items-center justify-between px-3"
                  style={winProbGradient}
                >
                  <span className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                    {battedWinProb}%
                  </span>
                  <span className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                    {chasingWinProb}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-text-secondary">
                  <span className="truncate max-w-[45%]">{battedTeamName}</span>
                  <span className="truncate max-w-[45%] text-right">{bowledTeamName}</span>
                </div>
              </div>

              {/* Continue button (fixed width on the right) */}
              <button
                onClick={onContinue}
                disabled={isResuming}
                className="w-64 flex-shrink-0 px-6 py-3 bg-cricket-primary hover:bg-cricket-primary/80 disabled:bg-cricket-primary/40 disabled:cursor-not-allowed text-white font-bold rounded transition-colors text-base"
              >
                {isResuming ? 'Starting...' : continueLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * End-of-match screen. Reuses the innings-break 3-column layout but:
 *  - Header announces the result (winner banner replaces "End of First Innings").
 *  - Scorecard panel adds an Innings 1 / Innings 2 toggle.
 *  - Center column shows match summary (both team scores, margin, player of match)
 *    instead of the first-innings target/RRR block.
 *  - Bottom CTA navigates back to the home dashboard.
 * Right column charts (worm/manhattan/partnerships) auto-render full match.
 */
const MatchEndScreen = ({ result, onContinue }) => {
  const [selectedInnings, setSelectedInnings] = useState(1);
  const [statIndex, setStatIndex] = useState(0);
  const userTeamId = useTeamStore(state => state.userTeamId);
  const clubs = useLeagueStore(state => state.clubs);

  if (!result) return null;

  const {
    firstBattingTeam, secondBattingTeam,
    innings1Data, innings2Data,
    winner, margin, playerOfMatch
  } = result;

  const firstColor = firstBattingTeam?.colors?.primary || clubs?.[firstBattingTeam?.id]?.colors?.primary || '#2D5F3F';
  const secondColor = secondBattingTeam?.colors?.primary || clubs?.[secondBattingTeam?.id]?.colors?.primary || '#2D5F3F';

  const winnerIsFirst = winner === firstBattingTeam?.id;
  const winnerTeam = winnerIsFirst ? firstBattingTeam : secondBattingTeam;
  const loserTeam = winnerIsFirst ? secondBattingTeam : firstBattingTeam;
  const winnerColor = winnerIsFirst ? firstColor : secondColor;
  const loserColor = winnerIsFirst ? secondColor : firstColor;
  const userWon = userTeamId && userTeamId === winner;
  const userInvolved = userTeamId && (userTeamId === firstBattingTeam?.id || userTeamId === secondBattingTeam?.id);

  // Result gradient: solid winner color tilted heavily toward them
  const resultGradient = {
    background: `linear-gradient(to right, ${winnerColor} 0%, ${winnerColor} 65%, ${loserColor}80 100%)`
  };

  const totalPanels = INNINGS_BREAK_STAT_PANELS.length;
  const currentPanel = INNINGS_BREAK_STAT_PANELS[statIndex];
  const CurrentPanelComponent = currentPanel?.Component;
  const CurrentPanelIcon = currentPanel?.icon;
  const cyclePrev = () => setStatIndex((statIndex - 1 + totalPanels) % totalPanels);
  const cycleNext = () => setStatIndex((statIndex + 1) % totalPanels);

  const TeamBadge = ({ teamId, size = 56 }) => (
    <img
      src={getTeamIcon(teamId)}
      alt=""
      style={{ width: size, height: size }}
      className="object-contain drop-shadow-lg"
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
  );

  const inningsTeamName = (innings) => {
    const team = innings === 1 ? firstBattingTeam : secondBattingTeam;
    return team?.name || `Innings ${innings}`;
  };

  const formatOvers = (overs, balls) => {
    if (typeof overs === 'string') return overs;
    if (balls) return `${overs}.${balls}`;
    return `${overs ?? 0}`;
  };

  const i1 = innings1Data || {};
  const i2 = innings2Data || {};

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <div className="bg-black/85 backdrop-blur-md border border-border-primary rounded-lg w-[95vw] max-w-7xl h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Top banner — both team badges flank a winner declaration */}
        <div
          className="px-6 py-4 border-b border-border-primary flex-shrink-0"
          style={{
            background: `linear-gradient(to right, ${firstColor}cc 0%, #1a1a1a 50%, ${secondColor}cc 100%)`
          }}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <TeamBadge teamId={firstBattingTeam?.id} size={56} />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">First Innings</div>
                <div className="text-sm font-bold text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {firstBattingTeam?.name}
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
                {userInvolved ? (userWon ? 'Victory' : 'Defeat') : 'Match Complete'}
              </div>
              <h3 className="text-xl font-bold text-trophy-gold mt-0.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {winnerTeam?.name} won {margin ? `by ${margin.replace(/^won by\s*/i, '')}` : ''}
              </h3>
            </div>
            <div className="flex items-center gap-3 min-w-0 flex-row-reverse">
              <TeamBadge teamId={secondBattingTeam?.id} size={56} />
              <div className="min-w-0 text-right">
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">Second Innings</div>
                <div className="text-sm font-bold text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {secondBattingTeam?.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body: left (scorecard with innings toggle) | right side (summary + charts + bottom bar) */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          {/* LEFT — Scorecard with innings toggle */}
          <div className="basis-[37%] flex-shrink-0 border-r border-border-primary flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-border-primary flex-shrink-0 flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Scorecard</div>
              <div className="flex items-center gap-1 bg-bg-tertiary/40 rounded p-0.5">
                {[1, 2].map(n => (
                  <button
                    key={n}
                    onClick={() => setSelectedInnings(n)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                      selectedInnings === n
                        ? 'bg-cricket-accent text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title={inningsTeamName(n)}
                  >
                    Innings {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <InningsBreakScorecard innings={selectedInnings} />
            </div>
          </div>

          {/* RIGHT SIDE WRAPPER */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top: summary (center, 26%) + stats hub (right, 37%) */}
            <div className="flex-1 flex flex-row min-h-0">
              {/* CENTER — Match summary */}
              <div className="flex-[26] border-r border-border-primary flex flex-col min-h-0 overflow-y-auto">
                {/* Both innings scores */}
                <div className="px-5 py-4 border-b border-border-primary">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-2 text-center font-semibold">Final Scores</div>
                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-text-secondary truncate">{firstBattingTeam?.name}</span>
                      <span className="text-2xl font-bold text-text-primary font-mono whitespace-nowrap">
                        {i1.totalScore ?? 0}<span className="text-lg text-text-secondary">/{i1.wickets ?? 0}</span>
                        <span className="text-[10px] text-text-secondary ml-1.5">({formatOvers(i1.overs, i1.balls)})</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-text-secondary truncate">{secondBattingTeam?.name}</span>
                      <span className="text-2xl font-bold text-text-primary font-mono whitespace-nowrap">
                        {i2.totalScore ?? 0}<span className="text-lg text-text-secondary">/{i2.wickets ?? 0}</span>
                        <span className="text-[10px] text-text-secondary ml-1.5">({formatOvers(i2.overs, i2.balls)})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div className="px-5 py-4 text-center border-b border-border-primary">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1.5 font-semibold">Result</div>
                  <div className="text-xl font-bold text-trophy-gold leading-tight">
                    {winnerTeam?.name}
                  </div>
                  <div className="text-sm text-text-primary mt-0.5">
                    won {margin ? `by ${margin.replace(/^won by\s*/i, '')}` : ''}
                  </div>
                </div>

                {/* Player of Match */}
                {playerOfMatch?.id && (
                  <div className="px-5 py-4 flex-1 flex flex-col justify-center text-center">
                    <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1.5 font-semibold">Player of the Match</div>
                    <div className="text-base font-bold text-cricket-accent">
                      <PlayerName playerId={playerOfMatch.id} />
                    </div>
                    {playerOfMatch.performance && (
                      <div className="text-xs text-text-secondary mt-1 px-2">
                        {playerOfMatch.performance}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT — Cycleable stats panels (full match) */}
              <div className="flex-[37] flex flex-col min-h-0">
                <div className="px-3 py-2 border-b border-border-primary flex-shrink-0 flex items-center justify-between gap-2">
                  <button
                    onClick={cyclePrev}
                    className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Previous stat"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    {CurrentPanelIcon && <CurrentPanelIcon className="w-3.5 h-3.5 text-cricket-accent" />}
                    <span>{currentPanel?.label}</span>
                  </div>
                  <button
                    onClick={cycleNext}
                    className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Next stat"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 [&_.bg-bg-tertiary]:!bg-transparent [&_.bg-bg-tertiary]:!p-0">
                  {CurrentPanelComponent && <CurrentPanelComponent />}
                </div>
                {/* Pagination dots */}
                <div className="px-3 py-2 border-t border-border-primary flex items-center justify-center gap-1.5 flex-shrink-0">
                  {INNINGS_BREAK_STAT_PANELS.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setStatIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === statIndex ? 'w-6 bg-cricket-accent' : 'w-1.5 bg-text-secondary/40 hover:bg-text-secondary'
                      }`}
                      aria-label={`Show ${p.label}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: result bar + Continue button */}
            <div className="border-t border-border-primary flex-shrink-0 px-5 py-4 flex items-center gap-5">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-semibold flex items-center justify-between">
                  <span>Match Result</span>
                </div>
                <div
                  className="h-8 rounded border border-white/20 flex items-center justify-center px-3"
                  style={resultGradient}
                >
                  <span className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                    {winnerTeam?.name} won{margin ? ` by ${margin.replace(/^won by\s*/i, '')}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-text-secondary">
                  <span className="truncate max-w-[45%]">{firstBattingTeam?.name}</span>
                  <span className="truncate max-w-[45%] text-right">{secondBattingTeam?.name}</span>
                </div>
              </div>

              <button
                onClick={onContinue}
                className="w-64 flex-shrink-0 px-6 py-3 bg-cricket-primary hover:bg-cricket-primary/80 text-white font-bold rounded transition-colors text-base"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MatchdayUI() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [matchEngine, setMatchEngine] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [hasProcessedResult, setHasProcessedResult] = useState(false);
  const initializingRef = React.useRef(false); // Prevent concurrent initializations

  // Super Over state
  const [showSuperOverModal, setShowSuperOverModal] = useState(false);
  const [tieData, setTieData] = useState(null); // Stores tie match data for super over
  const userTeamId = useTeamStore(state => state.userTeamId);

  // Match-end screen state. Screen is purely informational —
  // match-completion state changes (advanceDay, autosave) run inline in
  // processMatchResult before the screen opens. Closing it navigates home.
  const [matchEndResult, setMatchEndResult] = useState(null);

  // Matchday tutorial hook
  const {
    shouldShowTutorial,
    currentStep,
    currentStepData,
    advance: advanceTutorial,
    skip: skipTutorial,
    totalSteps
  } = useMatchdayTutorial();

  const status = useMatchStore(state => state.status);
  const matchStoreId = useMatchStore(state => state.matchId);
  const getPlayersByTeam = usePlayerStore(state => state.getPlayersByTeam);
  const players = usePlayerStore(state => state.players);
  const { getClub, recordResult, recalculateStandings, advanceToNextMatch, standings } = useLeagueStore();
  const { processMatchFinancials } = useFinanceStore();
  const { advanceDay } = useGameStore();

  // Match data from navigation state
  const navMatchData = location.state?.matchData;

  // Debug: Log status changes
  useEffect(() => {
    console.log('🔄 Match status changed to:', status);
  }, [status]);

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

        // Get playing XI from team tactics (NOT from all players!)
        const homeTactics = useTeamStore.getState().getTeamTactics(homeTeam.id);
        const awayTactics = useTeamStore.getState().getTeamTactics(awayTeam.id);

        // Use squadSelection from tactics as playing XI
        let homePlayingXI = homeTactics?.squadSelection || [];
        let awayPlayingXI = awayTactics?.squadSelection || [];

        // Fallback to squadLists if tactics not set
        if (homePlayingXI.length < 11) {
          const homeSquadList = useTeamStore.getState().squadLists?.[homeTeam.id] || [];
          homePlayingXI = homeSquadList.slice(0, 11);
          console.warn(`⚠ Home team ${homeTeam.name} has no tactics squadSelection, using first 11 from squadList`);
        }

        if (awayPlayingXI.length < 11) {
          const awaySquadList = useTeamStore.getState().squadLists?.[awayTeam.id] || [];
          awayPlayingXI = awaySquadList.slice(0, 11);
          console.warn(`⚠ Away team ${awayTeam.name} has no tactics squadSelection, using first 11 from squadList`);
        }

        // Validate we have 11 players for each team
        if (homePlayingXI.length < 11 || awayPlayingXI.length < 11) {
          throw new Error(`Insufficient players: ${homeTeam.name} has ${homePlayingXI.length}, ${awayTeam.name} has ${awayPlayingXI.length} (need 11 each)`);
        }

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
        // interactive: true → engine pauses at the innings break for the modal flow.
        // Quick-sim, sim-to-date, and MatchOrchestrator omit this and get auto-progression.
        const engine = new MatchEngine(
          useMatchStore,
          usePlayerStore,
          useTeamStore,
          { silent: false, interactive: true }
        );

        // Configure for ball-by-ball interactive mode with delays
        engine.config.showBallByBall = true;
        // Read simulation speed from user settings (numeric ms value)
        const userSimSpeed = useGameStore.getState().settings.simulationSpeed;
        engine.config.simulationSpeed = userSimSpeed;
        engine.config.ballDelay = userSimSpeed; // Match the delay to user preference

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

    // Always initialize - MatchEngine is React state and lost on remount,
    // even if matchStore still has the matchId from a previous session or save load.
    // Reset matchStore first to avoid stale state from previous match/save.
    console.log('🏏 MatchdayUI mount: resetting matchStore and initializing fresh engine',
      { matchId, currentStoreMatchId: matchStoreId, currentStatus: useMatchStore.getState().status });
    useMatchStore.getState().resetMatch();
    initializeMatch();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      initializingRef.current = false; // Reset on unmount
    };
  }, [matchId]); // Only depend on matchId (not navMatchData to prevent re-runs)

  /**
   * Format player of match performance text
   * @param {Object} player - Player stats from calculatePlayerOfMatch
   * @returns {string} Formatted performance string
   */
  const formatPlayerOfMatchPerformance = (player) => {
    const hasBatting = player.runs > 0 || player.ballsFaced > 0;
    const hasBowling = player.wickets > 0 || player.ballsBowled > 0;

    if (hasBatting && hasBowling) {
      // All-rounder: "45 (32) & 2-18 (4.0)"
      const overs = Math.floor(player.ballsBowled / 6) + (player.ballsBowled % 6) / 10;
      return `${player.runs} (${player.ballsFaced}) & ${player.wickets}-${player.runsConceded} (${overs.toFixed(1)})`;
    } else if (hasBatting) {
      // Batting only: "45 (32)"
      return `${player.runs} (${player.ballsFaced})`;
    } else if (hasBowling) {
      // Bowling only: "2-18 (4.0)"
      const overs = Math.floor(player.ballsBowled / 6) + (player.ballsBowled % 6) / 10;
      return `${player.wickets}-${player.runsConceded} (${overs.toFixed(1)})`;
    }

    return 'N/A';
  };

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

      // Set season ID for career stats tracking
      const currentSeasonId = useLeagueStore.getState().seasonId;
      if (currentSeasonId) {
        usePlayerStore.getState().setCurrentSeasonId(currentSeasonId);
        console.log('✅ Season ID set for career stats:', currentSeasonId);
      }

      // Determine winner from match state
      const winner = currentMatchState.winner;
      const ballByBall = currentMatchState.ballByBall || [];

      console.log('🏆 Winner from matchStore:', winner);
      console.log('🏆 Match status:', currentMatchState.status);

      // Get first batting team from matchStore
      const firstBattingTeamId = currentMatchState.firstBattingTeamId;
      console.log('🏏 First batting team:', firstBattingTeamId);
      console.log('🏏 Home team:', homeTeam.id, homeTeam.name);
      console.log('🏏 Away team:', awayTeam.id, awayTeam.name);

      // Calculate innings summaries from ballByBall data
      const calculateInningsScore = (inningsNum) => {
        const inningsBalls = ballByBall.filter(b => b.innings === inningsNum);
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

      const secondBattingTeamId = firstBattingTeamId === homeTeam.id ? awayTeam.id : homeTeam.id;
      const innings1 = { ...calculateInningsScore(1), battingTeam: firstBattingTeamId };
      const innings2 = { ...calculateInningsScore(2), battingTeam: secondBattingTeamId };

      // CHECK FOR TIE - Super Over Required!
      if (innings1.totalScore === innings2.totalScore) {
        console.log('🏏 MATCH TIED - Super Over Required!');

        // Determine which team is user's team
        const isUserHome = homeTeam.id === userTeamId;
        const userTeam = isUserHome ? homeTeam : awayTeam;
        const opponentTeam = isUserHome ? awayTeam : homeTeam;

        // Get first batting team from matchStore
        const firstBattingTeamId = currentMatchState.firstBattingTeamId;

        // 2nd innings batting team bats first in super over
        // Second batting team is whichever team wasn't first batting team
        const secondBattingTeamId = firstBattingTeamId === homeTeam.id ? awayTeam.id : homeTeam.id;
        const superOverBatsFirst = secondBattingTeamId;

        // Get playing XIs for squad selection
        const homeTactics = useTeamStore.getState().getTeamTactics(homeTeam.id);
        const awayTactics = useTeamStore.getState().getTeamTactics(awayTeam.id);
        const homePlayingXI = homeTactics?.squadSelection || [];
        const awayPlayingXI = awayTactics?.squadSelection || [];

        // Store tie data for super over modal
        setTieData({
          homeTeam,
          awayTeam,
          innings1,
          innings2,
          ballByBall,
          firstBattingTeamId,
          superOverBatsFirst,
          userPlayingXI: isUserHome ? homePlayingXI : awayPlayingXI,
          opponentPlayingXI: isUserHome ? awayPlayingXI : homePlayingXI,
          userBatsFirst: superOverBatsFirst === userTeamId
        });

        // Show super over modal instead of result modal
        setShowSuperOverModal(true);
        return; // Don't process result yet - wait for super over
      }

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

      // Helper function to get top batsmen for an innings
      const getTopBatsmen = (inningsNum, limit = 4) => {
        const inningsBalls = ballByBall.filter(b => b.innings === inningsNum);
        const batsmenStats = {};

        inningsBalls.forEach(ball => {
          if (!batsmenStats[ball.batsmanId]) {
            batsmenStats[ball.batsmanId] = { runs: 0, balls: 0 };
          }
          batsmenStats[ball.batsmanId].runs += ball.runs || 0;
          if (ball.isLegal) {
            batsmenStats[ball.batsmanId].balls++;
          }
        });

        return Object.entries(batsmenStats)
          .map(([id, stats]) => ({ id, ...stats }))
          .sort((a, b) => b.runs - a.runs)
          .slice(0, limit);
      };

      // Helper function to get top bowlers for an innings
      const getTopBowlers = (inningsNum, limit = 4) => {
        const inningsBalls = ballByBall.filter(b => b.innings === inningsNum);
        const bowlerStats = {};

        inningsBalls.forEach(ball => {
          if (!bowlerStats[ball.bowlerId]) {
            bowlerStats[ball.bowlerId] = { runs: 0, wickets: 0, balls: 0 };
          }
          bowlerStats[ball.bowlerId].runs += ball.runs || 0;
          if (ball.isWicket) {
            bowlerStats[ball.bowlerId].wickets++;
          }
          if (ball.isLegal) {
            bowlerStats[ball.bowlerId].balls++;
          }
        });

        return Object.entries(bowlerStats)
          .map(([id, stats]) => {
            const overs = Math.floor(stats.balls / 6);
            const ballsRemainder = stats.balls % 6;
            const oversStr = ballsRemainder > 0 ? `${overs}.${ballsRemainder}` : `${overs}`;
            return {
              id,
              wickets: stats.wickets,
              runs: stats.runs,
              overs: oversStr
            };
          })
          .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
          .slice(0, limit);
      };

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

      // Create result object for league store (without ballByBall to save storage space)
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
        timestamp: new Date().toISOString()
      };

      // Determine which team batted first (use matchStore's firstBattingTeamId)
      const firstBattingTeam = firstBattingTeamId === homeTeam.id ? homeTeam : awayTeam;
      const secondBattingTeam = firstBattingTeamId === homeTeam.id ? awayTeam : homeTeam;

      console.log('✅ First batting team:', firstBattingTeam.name);
      console.log('✅ Second batting team:', secondBattingTeam.name);

      // Prepare full scorecard data for storage
      const fullScorecard = {
        venue: navMatchData.venue || homeTeam.homeGround,
        matchType: 'World Premier League T20',
        firstBattingTeam: {
          id: firstBattingTeam.id,
          name: firstBattingTeam.name,
          colors: getClub(firstBattingTeam.id)?.colors
        },
        secondBattingTeam: {
          id: secondBattingTeam.id,
          name: secondBattingTeam.name,
          colors: getClub(secondBattingTeam.id)?.colors
        },
        innings1Data: {
          totalScore: innings1.totalScore,
          wickets: innings1.wickets,
          overs: innings1.overs,
          balls: innings1.balls,
          topBatsmen: getTopBatsmen(1),
          topBowlers: getTopBowlers(1)
        },
        innings2Data: {
          totalScore: innings2.totalScore,
          wickets: innings2.wickets,
          overs: innings2.overs,
          balls: innings2.balls,
          topBatsmen: getTopBatsmen(2),
          topBowlers: getTopBowlers(2)
        },
        winner: winner,
        margin: `${winMargin} ${winType}`,
        playerOfMatch: playerOfMatch ? {
          id: playerOfMatch.id,
          performance: formatPlayerOfMatchPerformance(playerOfMatch)
        } : null
      };

      // Record result in league store with full scorecard
      console.log('📊 Recording league result:', {
        matchId: leagueResult.matchId,
        homeTeam: leagueResult.homeTeam,
        awayTeam: leagueResult.awayTeam,
        winner: leagueResult.winner,
        winnerName: leagueResult.winnerName
      });
      recordResult(leagueResult, fullScorecard);
      recalculateStandings();

      // Process match financials (revenue and performance tracking)
      processMatchFinancials(leagueResult, standings);

      advanceToNextMatch();

      setHasProcessedResult(true);

      // Send match result inbox message — resolve player names first
      const opponentTeam = userTeamId === homeTeam.id ? awayTeam : homeTeam;
      const allPlayers = usePlayerStore.getState().players;
      const resolveName = (id) => allPlayers[id]?.name || id;
      const scorecardWithNames = {
        ...fullScorecard,
        innings1Data: {
          ...fullScorecard.innings1Data,
          topBatsmen: (fullScorecard.innings1Data.topBatsmen || []).map(p => ({ ...p, name: resolveName(p.id) })),
          topBowlers: (fullScorecard.innings1Data.topBowlers || []).map(p => ({ ...p, name: resolveName(p.id) }))
        },
        innings2Data: {
          ...fullScorecard.innings2Data,
          topBatsmen: (fullScorecard.innings2Data.topBatsmen || []).map(p => ({ ...p, name: resolveName(p.id) })),
          topBowlers: (fullScorecard.innings2Data.topBowlers || []).map(p => ({ ...p, name: resolveName(p.id) }))
        },
        playerOfMatch: fullScorecard.playerOfMatch ? {
          ...fullScorecard.playerOfMatch,
          name: resolveName(fullScorecard.playerOfMatch.id)
        } : null
      };
      useInboxStore.getState().addMessage(
        MessageGenerator.generateMatchResultMessage(scorecardWithNames, userTeamId, opponentTeam.name)
      );

      // All match-completion state changes happen here, BEFORE the modal opens.
      // advanceDay first so the autosave snapshot captures the new gameDay /
      // processed calendar event; modal is then purely informational.
      advanceDay();

      const userWon = winner === userTeamId;
      const score = `${innings1.totalScore}/${innings1.wickets} vs ${innings2.totalScore}/${innings2.wickets}`;

      SaveGameManager.autosaveAfterMatch(
        {
          gameStore: useGameStore,
          teamStore: useTeamStore,
          playerStore: usePlayerStore,
          leagueStore: useLeagueStore,
          financeStore: useFinanceStore,
          matchStore: useMatchStore,
          auctionStore: useAuctionStore,
          inboxStore: useInboxStore,
          transferStore: useTransferStore
        },
        {
          opponentName: opponentTeam.name,
          result: userWon ? 'win' : 'loss',
          score
        }
      ).then(result => {
        if (result.success) {
          console.log('💾 Autosave created after match');
        }
      });

      console.log('✅ Match result processed successfully');

      // Match-end screen opens last — purely informational. Its Continue
      // button navigates back to /game/home; no game-state side-effects.
      setMatchEndResult({
        venue: navMatchData.venue || homeTeam.homeGround,
        matchType: 'World Premier League T20',
        firstBattingTeam: {
          id: firstBattingTeam.id,
          name: firstBattingTeam.name,
          colors: getClub(firstBattingTeam.id)?.colors
        },
        secondBattingTeam: {
          id: secondBattingTeam.id,
          name: secondBattingTeam.name,
          colors: getClub(secondBattingTeam.id)?.colors
        },
        innings1Data: {
          totalScore: innings1.totalScore,
          wickets: innings1.wickets,
          overs: innings1.overs,
          balls: innings1.balls,
          topBatsmen: getTopBatsmen(1),
          topBowlers: getTopBowlers(1)
        },
        innings2Data: {
          totalScore: innings2.totalScore,
          wickets: innings2.wickets,
          overs: innings2.overs,
          balls: innings2.balls,
          topBatsmen: getTopBatsmen(2),
          topBowlers: getTopBowlers(2)
        },
        winner: winner,
        margin: `${winMargin} ${winType}`,
        playerOfMatch: playerOfMatch ? {
          id: playerOfMatch.id,
          performance: formatPlayerOfMatchPerformance(playerOfMatch)
        } : null
      });
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
    // The showResult() call inside processMatchResult() will handle showing the modal
    if (!hasProcessedResult) {
      processMatchResult();
    }
  };

  /**
   * Handle super over completion
   * @param {Object} selections - User and AI selections
   */
  const handleSuperOverStart = async (selections) => {
    if (!matchEngine || !tieData) return;

    console.log('🏏 Starting Super Over with selections:', selections);

    try {
      // Determine team order for super over
      // Team that batted second in main match bats first in super over
      const team1Id = tieData.superOverBatsFirst; // 2nd innings batting team
      const team2Id = team1Id === tieData.homeTeam.id ? tieData.awayTeam.id : tieData.homeTeam.id;
      const team1Name = team1Id === tieData.homeTeam.id ? tieData.homeTeam.name : tieData.awayTeam.name;
      const team2Name = team2Id === tieData.homeTeam.id ? tieData.homeTeam.name : tieData.awayTeam.name;

      // Determine which selection belongs to which team
      const isUserTeam1 = team1Id === userTeamId;
      const team1Selection = isUserTeam1 ? selections.userSelection : selections.aiSelection;
      const team2Selection = isUserTeam1 ? selections.aiSelection : selections.userSelection;

      // Simulate super over
      const superOverResult = await matchEngine.simulateSuperOver(
        team1Selection,
        team2Selection,
        team1Id,
        team1Name,
        team2Id,
        team2Name
      );

      console.log('🏆 Super Over Result:', superOverResult);

      // Close super over modal
      setShowSuperOverModal(false);

      // Now process the full result with super over winner
      processMatchResultWithSuperOver(superOverResult);

    } catch (error) {
      console.error('Error simulating super over:', error);
    }
  };

  /**
   * Process match result after super over completes
   */
  const processMatchResultWithSuperOver = (superOverResult) => {
    if (!tieData) return;

    const { homeTeam, awayTeam, innings1, innings2, ballByBall, firstBattingTeamId } = tieData;

    // Set season ID for career stats tracking
    const currentSeasonId = useLeagueStore.getState().seasonId;
    if (currentSeasonId) {
      usePlayerStore.getState().setCurrentSeasonId(currentSeasonId);
    }

    // Create match config for stat updater (super over stats NOT included)
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

    // Update player stats (main match only, NOT super over)
    updatePlayerStats(matchConfig, { ballByBall }, useTeamStore, usePlayerStore);

    // Extract player stats for awards
    const playerStats = extractPlayerStatsFromBalls(ballByBall, matchConfig);
    const playerOfMatch = calculatePlayerOfMatch(playerStats, matchConfig);

    // Helper functions for top batsmen/bowlers
    const getTopBatsmen = (inningsNum, limit = 4) => {
      const inningsBalls = ballByBall.filter(b => b.innings === inningsNum);
      const batsmenStats = {};

      inningsBalls.forEach(ball => {
        if (!batsmenStats[ball.batsmanId]) {
          batsmenStats[ball.batsmanId] = { runs: 0, balls: 0 };
        }
        batsmenStats[ball.batsmanId].runs += ball.runs || 0;
        if (ball.isLegal) {
          batsmenStats[ball.batsmanId].balls++;
        }
      });

      return Object.entries(batsmenStats)
        .map(([id, stats]) => ({ id, ...stats }))
        .sort((a, b) => b.runs - a.runs)
        .slice(0, limit);
    };

    const getTopBowlers = (inningsNum, limit = 4) => {
      const inningsBalls = ballByBall.filter(b => b.innings === inningsNum);
      const bowlerStats = {};

      inningsBalls.forEach(ball => {
        if (!bowlerStats[ball.bowlerId]) {
          bowlerStats[ball.bowlerId] = { runs: 0, wickets: 0, balls: 0 };
        }
        bowlerStats[ball.bowlerId].runs += ball.runs || 0;
        if (ball.isWicket) {
          bowlerStats[ball.bowlerId].wickets++;
        }
        if (ball.isLegal) {
          bowlerStats[ball.bowlerId].balls++;
        }
      });

      return Object.entries(bowlerStats)
        .map(([id, stats]) => {
          const overs = Math.floor(stats.balls / 6);
          const ballsRemainder = stats.balls % 6;
          const oversStr = ballsRemainder > 0 ? `${overs}.${ballsRemainder}` : `${overs}`;
          return { id, wickets: stats.wickets, runs: stats.runs, overs: oversStr };
        })
        .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
        .slice(0, limit);
    };

    // Winner from super over
    const winner = superOverResult.winner;
    const winnerTeam = winner === homeTeam.id ? homeTeam : awayTeam;

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
      margin: 'Super Over',
      result: 'win',
      status: 'completed',
      timestamp: new Date().toISOString(),
      superOver: superOverResult
    };

    // Determine which team batted first
    const firstBattingTeam = firstBattingTeamId === homeTeam.id ? homeTeam : awayTeam;
    const secondBattingTeam = firstBattingTeamId === homeTeam.id ? awayTeam : homeTeam;

    // Prepare full scorecard data
    const fullScorecard = {
      venue: navMatchData.venue || homeTeam.homeGround,
      matchType: 'World Premier League T20',
      firstBattingTeam: {
        id: firstBattingTeam.id,
        name: firstBattingTeam.name,
        colors: getClub(firstBattingTeam.id)?.colors
      },
      secondBattingTeam: {
        id: secondBattingTeam.id,
        name: secondBattingTeam.name,
        colors: getClub(secondBattingTeam.id)?.colors
      },
      innings1Data: {
        totalScore: innings1.totalScore,
        wickets: innings1.wickets,
        overs: innings1.overs,
        balls: innings1.balls,
        topBatsmen: getTopBatsmen(1),
        topBowlers: getTopBowlers(1)
      },
      innings2Data: {
        totalScore: innings2.totalScore,
        wickets: innings2.wickets,
        overs: innings2.overs,
        balls: innings2.balls,
        topBatsmen: getTopBatsmen(2),
        topBowlers: getTopBowlers(2)
      },
      winner: winner,
      margin: 'Super Over',
      superOver: superOverResult,
      playerOfMatch: playerOfMatch ? {
        id: playerOfMatch.id,
        performance: formatPlayerOfMatchPerformance(playerOfMatch)
      } : null
    };

    // Record result in league store
    recordResult(leagueResult, fullScorecard);
    recalculateStandings();
    processMatchFinancials(leagueResult, standings);
    advanceToNextMatch();

    // Show result modal
    showResult(fullScorecard);

    setHasProcessedResult(true);
    setTieData(null);

    console.log('✅ Match result with super over processed successfully');
  };

  // Show loading state
  if (isInitializing) {
    return (
      <LoadingScreen
        message="Loading Match"
        submessage="Initializing match engine..."
      />
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
  if (status !== 'live' && status !== 'completed' && status !== 'innings_break') {
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
    console.warn('⚠️ MatchdayUI: matchEngine is null but passed all checks.',
      { isInitializing, initError, matchStoreId, status, matchId });
    return (
      <LoadingScreen
        message="Preparing Match"
        submessage="Setting up teams and field positions..."
      />
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

      {/* Match End Screen — innings-break-style layout for match completion */}
      <MatchEndScreen
        result={matchEndResult}
        onContinue={() => navigate('/game/home')}
      />

      {/* Innings Break Modal */}
      <InningsBreakModal matchEngine={matchEngine} />

      {/* Super Over Selection Modal */}
      {showSuperOverModal && tieData && (
        <SuperOverSelectionModal
          isOpen={showSuperOverModal}
          onClose={() => setShowSuperOverModal(false)}
          onStartSuperOver={handleSuperOverStart}
          userTeamId={userTeamId}
          opponentTeamId={tieData.homeTeam.id === userTeamId ? tieData.awayTeam.id : tieData.homeTeam.id}
          userPlayingXI={tieData.userPlayingXI}
          opponentPlayingXI={tieData.opponentPlayingXI}
          userBatsFirst={tieData.userBatsFirst}
        />
      )}

      {/* Matchday Tutorial */}
      {shouldShowTutorial && currentStepData && (
        <TutorialSpotlight
          targetSelector={currentStepData.targetSelector}
          title={currentStepData.title}
          description={currentStepData.description}
          icon={currentStepData.icon}
          step={currentStep + 1}
          totalSteps={totalSteps}
          position={currentStepData.position}
          onNext={advanceTutorial}
          onSkip={skipTutorial}
        />
      )}

      {/* Autosave indicator */}
      <AutosaveIndicator />
    </div>
  );
}
