/**
 * @file MatchScorecard.jsx
 * @description Traditional cricket scorecard display with batting and bowling figures
 */

import React, { useState } from 'react';
import { Users, Activity, TrendingUp, Target } from 'lucide-react';
import PlayerCardModal from '../shared/PlayerCardModal';

const MatchScorecard = ({ matchData, innings, currentInnings = 1 }) => {
  const [activeTab, setActiveTab] = useState('batting');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  if (!matchData || !innings) {
    return (
      <div className="card p-4 text-center text-text-secondary">
        No scorecard data available
      </div>
    );
  }

  const { batting, bowling } = innings;

  // Get batting data
  const battingData = batting?.battingScorecard || [];
  const bowlingData = bowling?.bowlingFigures || [];
  const extras = batting?.extras || { byes: 0, legByes: 0, wides: 0, noBalls: 0 };
  const totalExtras = extras.byes + extras.legByes + extras.wides + extras.noBalls + (extras.penalties || 0);
  const totalScore = batting?.totalScore || 0;
  const wickets = batting?.wickets || 0;
  const overs = batting?.overs || 0;
  const balls = batting?.balls || 0;
  const currentRunRate = overs > 0 ? (totalScore / overs).toFixed(2) : '0.00';

  // Get bowling data
  const bowlingFigures = Object.values(bowlingData).filter(b => b.ballsBowled > 0);

  // Get partnerships
  const partnerships = batting?.partnerships || [];

  // Format dismissal text
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

  // Calculate strike rate
  const calculateSR = (runs, balls) => {
    if (balls === 0) return '0.0';
    return ((runs / balls) * 100).toFixed(1);
  };

  // Calculate economy
  const calculateEconomy = (runs, balls) => {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(2);
  };

  // Format overs
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
              <th className="text-left py-2 px-2 font-medium">Dismissal</th>
            </tr>
          </thead>
          <tbody>
            {battingData.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-text-secondary">
                  No batting data yet
                </td>
              </tr>
            ) : (
              battingData.map((batsman, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-border-secondary ${batsman.isOnStrike ? 'bg-cricket-primary/10' : ''
                    }`}
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1">
                      <span
                        className="text-cricket-accent hover:underline cursor-pointer font-medium"
                        onClick={() => {
                          setSelectedPlayerId(batsman.id);
                          setShowPlayerModal(true);
                        }}
                      >
                        {batsman.name}
                      </span>
                      {batsman.isOnStrike && (
                        <span className="text-xs text-cricket-accent">*</span>
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
                  <td className="py-2 px-2 text-text-secondary text-xs">
                    {formatDismissal(batsman.dismissal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Extras and Total */}
      <div className="card p-3 bg-transparent border border-white/10">
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
      {batting?.fallOfWickets && batting.fallOfWickets.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-text-secondary">Fall of Wickets</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {batting.fallOfWickets.map((fow, idx) => (
              <div key={idx} className="text-text-secondary">
                <span className="font-mono text-text-primary">{fow.score}/{fow.wicket}</span>
                <span className="ml-1">({fow.batsman}, {formatOvers(fow.balls)} ov)</span>
              </div>
            ))}
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
          {bowlingFigures.length === 0 ? (
            <tr>
              <td colSpan="9" className="text-center py-4 text-text-secondary">
                No bowling data yet
              </td>
            </tr>
          ) : (
            bowlingFigures.map((bowler, idx) => (
              <tr
                key={idx}
                className={`border-b border-border-secondary ${bowler.isBowling ? 'bg-cricket-primary/10' : ''
                  }`}
              >
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1">
                    <span
                      className="text-cricket-accent hover:underline cursor-pointer font-medium"
                      onClick={() => {
                        setSelectedPlayerId(bowler.id);
                        setShowPlayerModal(true);
                      }}
                    >
                      {bowler.name}
                    </span>
                    {bowler.isBowling && (
                      <span className="text-xs text-cricket-accent">*</span>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">
          Innings {currentInnings} Scorecard
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('batting')}
            className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'batting'
                ? 'bg-cricket-accent text-white'
                : 'bg-transparent border border-white/10 text-text-secondary hover:text-text-primary'
              }`}
          >
            Batting
          </button>
          <button
            onClick={() => setActiveTab('bowling')}
            className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'bowling'
                ? 'bg-cricket-accent text-white'
                : 'bg-transparent border border-white/10 text-text-secondary hover:text-text-primary'
              }`}
          >
            Bowling
          </button>
        </div>
      </div>

      {/* Scorecard Content */}
      {activeTab === 'batting' ? <BattingScorecard /> : <BowlingScorecard />}

      {/* Player Card Modal */}
      <PlayerCardModal
        isOpen={showPlayerModal}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayerId(null);
        }}
        playerId={selectedPlayerId}
      />
    </div>
  );
};

export default MatchScorecard;
