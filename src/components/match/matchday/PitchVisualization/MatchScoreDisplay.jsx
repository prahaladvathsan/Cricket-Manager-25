import React, { useEffect, useState } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import usePlayerStore from '../../../../stores/playerStore';
import PlayerName from '../../../shared/PlayerName';
import TeamName from '../../../shared/TeamName';

/**
 * MatchScoreDisplay - Comprehensive score banner above pitch
 *
 * Features:
 * - Current score (145/3) in large Trophy Gold font
 * - Overs (15.4/20)
 * - Current batsmen with runs/balls
 * - Current bowler with figures
 * - Run rates: Current RR + Required RR (2nd innings)
 * - Compact single-row layout (Football Manager aesthetic)
 * - Uses <PlayerName /> and <TeamName /> components
 *
 * Layout:
 * [Team Name] 145/3 (15.4/20) • RR: 8.50 | Striker (45 off 30) • Non-Striker (23 off 18) | Bowler (2-34-1)
 */
const MatchScoreDisplay = () => {
  const getPlayer = usePlayerStore(state => state.getPlayer);

  // Match state subscriptions
  const teams = useMatchStore(state => state.teams);
  const currentBall = useMatchStore(state => state.currentBall);
  const innings = useMatchStore(state => state.innings);
  const matchInfo = useMatchStore(state => state.matchInfo);
  const ballByBall = useMatchStore(state => state.ballByBall);

  // Batting team info
  const battingTeam = teams?.batting;
  const score = battingTeam?.totalScore || 0;
  const wickets = battingTeam?.wickets || 0;
  const overs = currentBall?.over || 0;
  const balls = currentBall?.ball || 0;

  // Current batsmen
  const strikerId = innings?.striker;
  const nonStrikerId = innings?.nonStriker;
  const striker = strikerId ? getPlayer(strikerId) : null;
  const nonStriker = nonStrikerId ? getPlayer(nonStrikerId) : null;

  // Find striker and non-striker stats
  const strikerStats = battingTeam?.battingStats?.find(b => b.playerId === strikerId);
  const nonStrikerStats = battingTeam?.battingStats?.find(b => b.playerId === nonStrikerId);

  // Current bowler (live, from engine)
  const bowlerId = innings?.bowler;
  const currentInningsNumber = innings?.number || 1;

  // Hold the displayed bowler at end-of-over until the new bowler delivers their first
  // ball — keeps the bowler name + figures in sync with the BowlerColumn in the header.
  const [displayedBowlerId, setDisplayedBowlerId] = useState(bowlerId);
  const [displayedInnings, setDisplayedInnings] = useState(currentInningsNumber);

  useEffect(() => {
    if (!bowlerId) return;
    if (!displayedBowlerId || displayedInnings !== currentInningsNumber) {
      setDisplayedBowlerId(bowlerId);
      setDisplayedInnings(currentInningsNumber);
      return;
    }
    if (bowlerId === displayedBowlerId) return;
    const newBowlerHasDelivered = ballByBall?.some(
      b => b.innings === currentInningsNumber && b.bowlerId === bowlerId
    );
    if (newBowlerHasDelivered) {
      setDisplayedBowlerId(bowlerId);
    }
  }, [bowlerId, ballByBall, currentInningsNumber, displayedBowlerId, displayedInnings]);

  const bowler = displayedBowlerId ? getPlayer(displayedBowlerId) : null;

  // Find bowler stats (for the displayed bowler, not the live one)
  const bowlingTeam = teams?.bowling;
  const bowlerStats = bowlingTeam?.bowlingStats?.find(b => b.playerId === displayedBowlerId);

  // Calculate run rates
  const totalBalls = (overs * 6) + balls;
  const currentRunRate = totalBalls > 0 ? (score / totalBalls) * 6 : 0;

  // Required run rate (2nd innings only)
  const isSecondInnings = matchInfo?.currentInnings === 2;
  const target = matchInfo?.target || 0;
  const requiredRunRate = isSecondInnings && totalBalls < 120
    ? ((target - score) / (120 - totalBalls)) * 6
    : 0;

  return (
    <div className="p-3 border-b border-border-primary bg-bg-tertiary">
      {/* Main Score Row */}
      <div className="flex items-center justify-between gap-4 mb-2">
        {/* Left: Team + Score */}
        <div className="flex items-center gap-3">
          <TeamName teamId={battingTeam?.id} className="text-sm font-medium" />
          <div className="text-3xl font-bold text-cricket-accent font-mono">
            {score}/{wickets}
          </div>
          <div className="text-lg text-text-secondary font-mono">
            ({overs}.{balls}/20)
          </div>
        </div>

        {/* Right: Run Rates */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-text-secondary">RR: </span>
            <span className="font-mono font-medium text-text-primary">
              {currentRunRate.toFixed(2)}
            </span>
          </div>
          {isSecondInnings && requiredRunRate > 0 && (
            <div>
              <span className="text-text-secondary">Req: </span>
              <span className="font-mono font-medium text-cricket-accent">
                {requiredRunRate.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Players Row */}
      <div className="flex items-center justify-between gap-4 text-xs">
        {/* Left: Current Batsmen */}
        <div className="flex items-center gap-3">
          {striker && strikerStats && (
            <div className="flex items-center gap-1">
              <PlayerName playerId={strikerId} className="font-medium" />
              <span className="font-mono text-text-secondary">
                ({strikerStats.runs} off {strikerStats.balls})
              </span>
              <span className="text-cricket-accent">*</span>
            </div>
          )}
          {nonStriker && nonStrikerStats && (
            <div className="flex items-center gap-1">
              <span className="text-text-secondary">•</span>
              <PlayerName playerId={nonStrikerId} className="font-medium" />
              <span className="font-mono text-text-secondary">
                ({nonStrikerStats.runs} off {nonStrikerStats.balls})
              </span>
            </div>
          )}
        </div>

        {/* Right: Current Bowler */}
        {bowler && bowlerStats && (
          <div className="flex items-center gap-1">
            <PlayerName playerId={displayedBowlerId} className="font-medium" />
            <span className="font-mono text-text-secondary">
              ({bowlerStats.overs || 0}-{bowlerStats.runs || 0}-{bowlerStats.wickets || 0})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchScoreDisplay;
