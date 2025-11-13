/**
 * @file ScorecardModal.jsx
 * @description Full-screen modal with innings-separated scorecard
 * Shows 1st and 2nd innings in separate tabs, formatted like actual cricket scorecard
 */

import React, { useState, useMemo } from 'react';
import { X, FileText, Target, TrendingUp, Trophy } from 'lucide-react';
import useMatchStore from '../../../../../stores/matchStore';
import useLeagueStore from '../../../../../stores/leagueStore';
import usePlayerStore from '../../../../../stores/playerStore';
import PlayerName from '../../../../shared/PlayerName';

const ScorecardModal = ({ isOpen, onClose }) => {
  // Subscribe to stores
  const ballByBall = useMatchStore(state => state.ballByBall);
  const innings = useMatchStore(state => state.innings);
  const matchId = useMatchStore(state => state.matchId);
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const getClub = useLeagueStore(state => state.getClub);

  // Get match fixture to determine team IDs for both innings
  const fixture = useLeagueStore(state => {
    const fixtures = state.fixtures || [];
    return fixtures.find(f => f.id === matchId);
  });

  // Determine which innings to show tabs for
  const maxInnings = Math.max(...ballByBall.map(b => b.innings || 1), 1);
  const hasSecondInnings = maxInnings >= 2;

  const [activeInnings, setActiveInnings] = useState(maxInnings); // Default to current innings

  // Calculate stats for a specific innings
  const calculateInningsStats = useMemo(() => (inningsNum) => {
    const inningsBalls = ballByBall.filter(ball => ball.innings === inningsNum);

    // Batting stats
    const battingStats = {};
    const battingOrder = []; // Track order in which batsmen appeared
    inningsBalls.forEach(ball => {
      const strikerId = ball.striker;
      if (!strikerId) return;

      if (!battingStats[strikerId]) {
        battingStats[strikerId] = {
          id: strikerId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissal: null,
          dismissalBowler: null,
          dismissalFielder: null,
          battingPosition: battingOrder.length // Track position when first appeared
        };
        battingOrder.push(strikerId); // Add to batting order
      }

      battingStats[strikerId].runs += (ball.runs || 0);
      if (ball.isLegal !== false && !ball.isWide) {
        battingStats[strikerId].balls += 1;
      }
      if (ball.runs === 4) battingStats[strikerId].fours += 1;
      if (ball.runs === 6) battingStats[strikerId].sixes += 1;

      if (ball.isWicket && ball.dismissedPlayer === strikerId) {
        battingStats[strikerId].dismissal = ball.dismissalType || { type: 'out' };
        battingStats[strikerId].dismissalBowler = ball.bowler;
        if (ball.metadata?.fieldingResult?.fielder) {
          battingStats[strikerId].dismissalFielder = ball.metadata.fieldingResult.fielder;
        }
      }
    });

    // Bowling stats
    const bowlingStats = {};
    inningsBalls.forEach(ball => {
      const bowlerId = ball.bowler;
      if (!bowlerId) return;

      if (!bowlingStats[bowlerId]) {
        bowlingStats[bowlerId] = {
          id: bowlerId,
          ballsBowled: 0,
          runsConceded: 0,
          wickets: 0,
          maidens: 0,
          dots: 0,
          fours: 0,
          sixes: 0,
          extras: 0
        };
      }

      if (ball.isLegal !== false && !ball.isWide) {
        bowlingStats[bowlerId].ballsBowled += 1;
      }
      bowlingStats[bowlerId].runsConceded += (ball.runs || 0);
      if (ball.isWicket) bowlingStats[bowlerId].wickets += 1;
      if (ball.runs === 0 && ball.isLegal !== false && !ball.isWide) {
        bowlingStats[bowlerId].dots += 1;
      }
      if (ball.runs === 4) bowlingStats[bowlerId].fours += 1;
      if (ball.runs === 6) bowlingStats[bowlerId].sixes += 1;
      if (ball.isWide || ball.outcome === 'no ball') {
        bowlingStats[bowlerId].extras += (ball.runs || 0);
      }
    });

    // Calculate totals
    const totalRuns = inningsBalls.reduce((sum, ball) => sum + (ball.runs || 0), 0);
    const totalWickets = inningsBalls.filter(ball => ball.isWicket).length;
    const totalBalls = inningsBalls.filter(ball => ball.isLegal !== false && !ball.isWide).length;
    const overs = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;

    return {
      batting: Object.values(battingStats).sort((a, b) => a.battingPosition - b.battingPosition),
      bowling: Object.values(bowlingStats),
      totalRuns,
      totalWickets,
      overs,
      balls
    };
  }, [ballByBall]);

  // Helper functions
  const formatDismissal = (stat) => {
    if (!stat.dismissal || stat.dismissal.type === 'not out') return 'not out';

    const bowlerName = getPlayer(stat.dismissalBowler)?.name || 'Unknown';
    const fielderName = stat.dismissalFielder ? getPlayer(stat.dismissalFielder)?.name : null;

    switch (stat.dismissal.type) {
      case 'bowled':
        return `b ${bowlerName}`;
      case 'caught':
        return fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
      case 'lbw':
        return `lbw b ${bowlerName}`;
      case 'run out':
        return fielderName ? `run out (${fielderName})` : 'run out';
      case 'stumped':
        return fielderName ? `st ${fielderName} b ${bowlerName}` : `st b ${bowlerName}`;
      case 'hit wicket':
        return `hit wicket b ${bowlerName}`;
      default:
        return stat.dismissal.type;
    }
  };

  const calculateSR = (runs, balls) => {
    if (balls === 0) return '0.0';
    return ((runs / balls) * 100).toFixed(1);
  };

  const calculateEconomy = (runs, balls) => {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(2);
  };

  const formatOvers = (overs, balls) => {
    return balls > 0 ? `${overs}.${balls}` : `${overs}`;
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const inningsData = calculateInningsStats(activeInnings);

  // Get team name for current innings
  const getBattingTeamName = (inningsNum) => {
    if (!fixture) return 'Team';
    if (inningsNum === 1) return getClub(fixture.homeTeam)?.name || 'Home Team';
    return getClub(fixture.awayTeam)?.name || 'Away Team';
  };

  const InningsScorecard = ({ inningsNum }) => {
    const data = calculateInningsStats(inningsNum);
    const teamName = getBattingTeamName(inningsNum);

    return (
      <div className="space-y-4">
        {/* Team Header */}
        <div className="flex items-center justify-between border-b-2 border-cricket-accent pb-2">
          <h3 className="text-lg font-bold text-text-primary">{teamName} Innings</h3>
          <div className="text-2xl font-mono font-bold text-cricket-accent">
            {data.totalRuns}/{data.totalWickets}
            <span className="text-sm text-text-secondary ml-2">
              ({formatOvers(data.overs, data.balls)} ov)
            </span>
          </div>
        </div>

        {/* Batting Card */}
        <div>
          <h4 className="text-sm font-semibold text-text-secondary mb-2">BATTING</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-2 px-2 font-semibold text-xs text-text-secondary">BATSMAN</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs text-text-secondary">DISMISSAL</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">R</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">B</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">4s</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">6s</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">SR</th>
                </tr>
              </thead>
              <tbody>
                {data.batting.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-text-secondary">
                      No batting data
                    </td>
                  </tr>
                ) : (
                  data.batting.map((batsman) => (
                    <tr key={batsman.id} className="border-b border-border-secondary/50">
                      <td className="py-2 px-2 text-text-primary">
                        <PlayerName playerId={batsman.id} />
                      </td>
                      <td className="py-2 px-2 text-text-tertiary text-xs italic">
                        {formatDismissal(batsman)}
                      </td>
                      <td className="text-right py-2 px-1 font-mono font-semibold text-text-primary">
                        {batsman.runs}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {batsman.balls}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {batsman.fours}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {batsman.sixes}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {calculateSR(batsman.runs, batsman.balls)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bowling Card */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">BOWLING</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-2 px-2 font-semibold text-xs text-text-secondary">BOWLER</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">O</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">M</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">R</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">W</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">ECON</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">0s</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">4s</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs text-text-secondary">6s</th>
                </tr>
              </thead>
              <tbody>
                {data.bowling.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-text-secondary">
                      No bowling data
                    </td>
                  </tr>
                ) : (
                  data.bowling.map((bowler) => (
                    <tr key={bowler.id} className="border-b border-border-secondary/50">
                      <td className="py-2 px-2 text-text-primary">
                        <PlayerName playerId={bowler.id} />
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-primary">
                        {formatOvers(Math.floor(bowler.ballsBowled / 6), bowler.ballsBowled % 6)}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {bowler.maidens}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-primary">
                        {bowler.runsConceded}
                      </td>
                      <td className="text-right py-2 px-1 font-mono font-semibold text-text-positive">
                        {bowler.wickets}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {calculateEconomy(bowler.runsConceded, bowler.ballsBowled)}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {bowler.dots}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {bowler.fours}
                      </td>
                      <td className="text-right py-2 px-1 font-mono text-text-secondary">
                        {bowler.sixes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cricket-accent" />
              <h2 className="text-lg font-semibold text-text-primary">
                Full Scorecard
              </h2>
            </div>
            {/* Innings Tabs */}
            {hasSecondInnings && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveInnings(1)}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    activeInnings === 1
                      ? 'bg-cricket-primary text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  1st Innings
                </button>
                <button
                  onClick={() => setActiveInnings(2)}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    activeInnings === 2
                      ? 'bg-cricket-primary text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  2nd Innings
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <style jsx>{`
            .flex-1::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <InningsScorecard inningsNum={activeInnings} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(ScorecardModal);
