/**
 * @file LiveScorecard.jsx
 * @description Real-time cricket scorecard for live matches
 * Subscribes to matchStore and calculates stats from ballByBall array
 */

import React, { useState, useMemo } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import useMatchStore from '../../../../stores/matchStore';
import usePlayerStore from '../../../../stores/playerStore';
import PlayerName from '../../../shared/PlayerName';

const LiveScorecard = ({ viewTab, hideTabs = false }) => {
  const [internalTab, setInternalTab] = useState('batting');
  const activeTab = viewTab || internalTab;
  const setActiveTab = setInternalTab;

  // Subscribe to matchStore
  const teams = useMatchStore(state => state.teams);
  const innings = useMatchStore(state => state.innings);
  const ballByBall = useMatchStore(state => state.ballByBall);
  const currentBall = useMatchStore(state => state.currentBall);
  const getPlayer = usePlayerStore(state => state.getPlayer);

  // Determine current innings
  const currentInnings = useMemo(() => {
    if (ballByBall.length === 0) return 1;
    return Math.max(...ballByBall.map(b => b.innings || 1));
  }, [ballByBall]);

  // Calculate batting stats from ballByBall (current innings only)
  const battingStats = useMemo(() => {
    const stats = {};
    const battingOrder = []; // Track order in which batsmen appeared

    // Filter by current innings
    const currentInningsBalls = ballByBall.filter(ball => ball.innings === currentInnings);

    currentInningsBalls.forEach(ball => {
      const strikerId = ball.striker;
      if (!strikerId) return;

      if (!stats[strikerId]) {
        stats[strikerId] = {
          id: strikerId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissal: null,
          battingPosition: battingOrder.length // Track position when first appeared
        };
        battingOrder.push(strikerId); // Add to batting order
      }

      // Add runs (including extras credited to batsman)
      stats[strikerId].runs += (ball.runs || 0);

      // Only count legal deliveries as balls faced (not wides)
      // Note: No balls count as balls faced but wickets can't fall on them
      if (ball.isLegal !== false && !ball.isWide) {
        stats[strikerId].balls += 1;
      }

      // Count boundaries
      if (ball.runs === 4 && (ball.outcome === 'FOUR' || ball.outcome === 'boundary')) {
        stats[strikerId].fours += 1;
      }
      if (ball.runs === 6 && (ball.outcome === 'SIX' || ball.outcome === 'six')) {
        stats[strikerId].sixes += 1;
      }

      // Track dismissal
      if (ball.isWicket && ball.dismissedPlayer === strikerId) {
        stats[strikerId].dismissal = ball.dismissalType || { type: 'out' };
      }
    });

    // Convert to array, add player names, and sort by batting order
    return Object.values(stats)
      .map(stat => ({
        ...stat,
        name: getPlayer(stat.id)?.name || 'Unknown',
        isOnStrike: stat.id === innings.striker
      }))
      .sort((a, b) => a.battingPosition - b.battingPosition); // Sort by batting order
  }, [ballByBall, currentInnings, innings.striker, getPlayer]);

  // Calculate bowling stats from ballByBall (current innings only)
  const bowlingStats = useMemo(() => {
    const stats = {};

    // Filter by current innings
    const currentInningsBalls = ballByBall.filter(ball => ball.innings === currentInnings);

    currentInningsBalls.forEach(ball => {
      const bowlerId = ball.bowler;
      if (!bowlerId) return;

      if (!stats[bowlerId]) {
        stats[bowlerId] = {
          id: bowlerId,
          ballsBowled: 0,
          runsConceded: 0,
          wickets: 0,
          maidens: 0,
          dots: 0,
          fours: 0,
          sixes: 0
        };
      }

      // Count legal deliveries (wides and no balls don't count towards the 6-ball over)
      if (ball.isLegal !== false && !ball.isWide) {
        stats[bowlerId].ballsBowled += 1;
      }

      // All runs conceded (including wides/no balls)
      stats[bowlerId].runsConceded += (ball.runs || 0);

      // Wickets
      if (ball.isWicket) stats[bowlerId].wickets += 1;

      // Dots (legal delivery with 0 runs)
      if (ball.runs === 0 && ball.isLegal !== false && !ball.isWide) {
        stats[bowlerId].dots += 1;
      }

      // Boundaries
      if (ball.runs === 4 && (ball.outcome === 'FOUR' || ball.outcome === 'boundary')) {
        stats[bowlerId].fours += 1;
      }
      if (ball.runs === 6 && (ball.outcome === 'SIX' || ball.outcome === 'six')) {
        stats[bowlerId].sixes += 1;
      }
    });

    // Convert to array and add player names
    return Object.values(stats)
      .filter(stat => stat.ballsBowled > 0)
      .map(stat => ({
        ...stat,
        name: getPlayer(stat.id)?.name || 'Unknown',
        isBowling: stat.id === innings.bowler
      }));
  }, [ballByBall, currentInnings, innings.bowler, getPlayer]);

  const battingTeam = teams.batting;
  const totalScore = battingTeam?.totalScore || 0;
  const wickets = battingTeam?.wickets || 0;
  const extras = battingTeam?.extras || { byes: 0, legByes: 0, wides: 0, noBalls: 0 };
  const totalExtras = extras.byes + extras.legByes + extras.wides + extras.noBalls + (extras.penalties || 0);
  const overs = currentBall?.over || 0;
  const balls = currentBall?.ball || 0;
  const currentRunRate = overs > 0 ? (totalScore / overs).toFixed(2) : '0.00';

  // Get partnerships and fall of wickets
  const partnerships = battingTeam?.partnerships || [];
  const fallOfWickets = battingTeam?.fallOfWickets || [];

  // Helper functions
  const formatDismissal = (dismissal) => {
    if (!dismissal || dismissal.type === 'not out') return 'not out';

    switch (dismissal.type) {
      case 'bowled':
        return `b ${dismissal.bowler}`;
      case 'caught':
        return `c ${dismissal.fielder} b ${dismissal.bowler}`;
      case 'lbw':
        return `lbw b ${dismissal.bowler}`;
      case 'run out':
        return `run out (${dismissal.fielder})`;
      case 'stumped':
        return `st ${dismissal.fielder} b ${dismissal.bowler}`;
      case 'hit wicket':
        return `hit wicket b ${dismissal.bowler}`;
      default:
        return dismissal.type;
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

  const formatOvers = (balls) => {
    const completedOvers = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return remainingBalls > 0 ? `${completedOvers}.${remainingBalls}` : `${completedOvers}`;
  };

  const BattingScorecard = () => (
    <div className="space-y-3">
      {/* Batting Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-text-secondary text-xs">
              <th className="text-left py-2 px-2 font-medium">Batsman</th>
              <th className="text-right py-2 px-2 font-medium">R</th>
              <th className="text-right py-2 px-2 font-medium">B</th>
              <th className="text-right py-2 px-2 font-medium">4s</th>
              <th className="text-right py-2 px-2 font-medium">6s</th>
              <th className="text-right py-2 px-2 font-medium">SR</th>
            </tr>
          </thead>
          <tbody>
            {battingStats.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-text-secondary">
                  No batting data yet
                </td>
              </tr>
            ) : (
              battingStats.map((batsman, idx) => (
                <tr
                  key={batsman.id}
                  className={`border-b border-border-secondary ${
                    batsman.isOnStrike ? 'bg-cricket-primary/10' : ''
                  }`}
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1">
                      <PlayerName playerId={batsman.id} />
                      {batsman.isOnStrike && (
                        <span className="text-xs text-cricket-accent">★</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-text-primary font-semibold">
                    {batsman.runs}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-text-secondary">
                    {batsman.balls}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-text-secondary">
                    {batsman.fours || 0}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-text-secondary">
                    {batsman.sixes || 0}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-text-secondary">
                    {calculateSR(batsman.runs, batsman.balls)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Extras and Total */}
      <div className="card p-3 bg-bg-tertiary">
        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Extras:</span>
              <span className="font-mono text-text-primary">
                {totalExtras} (b {extras.byes}, lb {extras.legByes}, w {extras.wides}, nb {extras.noBalls})
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-cricket-accent font-mono">
              {totalScore}/{wickets}
            </div>
            <div className="text-xs text-text-secondary">
              {formatOvers(overs * 6 + balls)} overs (RR: {currentRunRate})
            </div>
          </div>
        </div>
      </div>

      {/* Current Partnership */}
      {partnerships.length > 0 && partnerships[partnerships.length - 1].isActive && (
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-cricket-accent" />
            <span className="text-xs font-medium text-text-secondary">Current Partnership</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-primary">
              {partnerships[partnerships.length - 1].batsman1} & {partnerships[partnerships.length - 1].batsman2}
            </div>
            <div className="text-right">
              <div className="font-semibold text-text-primary">
                {partnerships[partnerships.length - 1].runs} runs
              </div>
              <div className="text-xs text-text-secondary">
                ({partnerships[partnerships.length - 1].balls} balls, RR: {
                  (partnerships[partnerships.length - 1].runs / (partnerships[partnerships.length - 1].balls / 6)).toFixed(2)
                })
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fall of Wickets */}
      {fallOfWickets.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-text-secondary">Fall of Wickets</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {fallOfWickets.map((fow, idx) => {
              const player = getPlayer(fow.batsman);
              const playerName = player?.name || 'Unknown';
              return (
                <div key={idx} className="text-text-secondary">
                  <span className="font-mono text-text-primary">{fow.score}/{fow.wicket}</span>
                  <span className="ml-1">({playerName}, {formatOvers(fow.balls)} ov)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const BowlingScorecard = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary text-text-secondary text-xs">
            <th className="text-left py-2 px-2 font-medium">Bowler</th>
            <th className="text-right py-2 px-2 font-medium">O</th>
            <th className="text-right py-2 px-2 font-medium">M</th>
            <th className="text-right py-2 px-2 font-medium">R</th>
            <th className="text-right py-2 px-2 font-medium">W</th>
            <th className="text-right py-2 px-2 font-medium">Econ</th>
            <th className="text-right py-2 px-2 font-medium">0s</th>
            <th className="text-right py-2 px-2 font-medium">4s</th>
            <th className="text-right py-2 px-2 font-medium">6s</th>
          </tr>
        </thead>
        <tbody>
          {bowlingStats.length === 0 ? (
            <tr>
              <td colSpan="9" className="text-center py-4 text-text-secondary">
                No bowling data yet
              </td>
            </tr>
          ) : (
            bowlingStats.map((bowler, idx) => (
              <tr
                key={bowler.id}
                className={`border-b border-border-secondary ${
                  bowler.isBowling ? 'bg-cricket-primary/10' : ''
                }`}
              >
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1">
                    <PlayerName playerId={bowler.id} />
                    {bowler.isBowling && (
                      <span className="text-xs text-cricket-accent">★</span>
                    )}
                  </div>
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-primary">
                  {formatOvers(bowler.ballsBowled)}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-secondary">
                  {bowler.maidens || 0}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-primary">
                  {bowler.runsConceded}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-positive font-semibold">
                  {bowler.wickets}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-secondary">
                  {calculateEconomy(bowler.runsConceded, bowler.ballsBowled)}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-secondary">
                  {bowler.dots || 0}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-secondary">
                  {bowler.fours || 0}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-secondary">
                  {bowler.sixes || 0}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Tab Toggle (hidden when caller forces a view) */}
      {!hideTabs && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('batting')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeTab === 'batting'
                ? 'bg-cricket-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            Batting
          </button>
          <button
            onClick={() => setActiveTab('bowling')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeTab === 'bowling'
                ? 'bg-cricket-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            Bowling
          </button>
        </div>
      )}

      {/* Scorecard Content */}
      {activeTab === 'batting' ? <BattingScorecard /> : <BowlingScorecard />}
    </div>
  );
};

export default React.memo(LiveScorecard);
