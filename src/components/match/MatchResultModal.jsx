/**
 * @file MatchResultModal.jsx
 * @description Modal showing match result after quick simulation
 */

import React from 'react';
import { X, Trophy, TrendingUp } from 'lucide-react';

const MatchResultModal = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  const {
    homeTeam,
    awayTeam,
    innings1,
    innings2,
    winner,
    margin
  } = result;

  const homeTeamWon = winner === homeTeam.id;
  const awayTeamWon = winner === awayTeam.id;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cricket-primary/20 rounded">
              <Trophy className="w-5 h-5 text-cricket-accent" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">
              Match Result
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Teams Score */}
          <div className="space-y-3">
            {/* Home Team */}
            <div className={`flex items-center justify-between p-4 rounded border-2 ${
              homeTeamWon ? 'border-cricket-accent bg-cricket-primary/5' : 'border-border-primary'
            }`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full border-2"
                  style={{
                    backgroundColor: homeTeam.colors?.primary || '#2D5F3F',
                    borderColor: homeTeam.colors?.secondary || '#D4AF37'
                  }}
                />
                <div>
                  <div className="font-bold text-text-primary flex items-center gap-2">
                    {homeTeam.name}
                    {homeTeamWon && <Trophy className="w-4 h-4 text-cricket-accent" />}
                  </div>
                  <div className="text-xs text-text-secondary">Home</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {innings1?.totalScore || 0}/{innings1?.wickets || 0}
                </div>
                <div className="text-xs text-text-secondary">
                  ({Math.floor((innings1?.ballsBowled || 0) / 6)}.{(innings1?.ballsBowled || 0) % 6} overs)
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div className={`flex items-center justify-between p-4 rounded border-2 ${
              awayTeamWon ? 'border-cricket-accent bg-cricket-primary/5' : 'border-border-primary'
            }`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full border-2"
                  style={{
                    backgroundColor: awayTeam.colors?.primary || '#2D5F3F',
                    borderColor: awayTeam.colors?.secondary || '#D4AF37'
                  }}
                />
                <div>
                  <div className="font-bold text-text-primary flex items-center gap-2">
                    {awayTeam.name}
                    {awayTeamWon && <Trophy className="w-4 h-4 text-cricket-accent" />}
                  </div>
                  <div className="text-xs text-text-secondary">Away</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {innings2?.totalScore || 0}/{innings2?.wickets || 0}
                </div>
                <div className="text-xs text-text-secondary">
                  ({Math.floor((innings2?.ballsBowled || 0) / 6)}.{(innings2?.ballsBowled || 0) % 6} overs)
                </div>
              </div>
            </div>
          </div>

          {/* Match Result */}
          <div className="card p-4 bg-cricket-primary/10 border border-cricket-accent text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-cricket-accent" />
              <h3 className="text-lg font-bold text-cricket-accent">
                {homeTeamWon ? homeTeam.name : awayTeam.name} Won
              </h3>
            </div>
            {margin && (
              <div className="text-sm text-text-primary">
                {margin}
              </div>
            )}
          </div>

          {/* Key Performances */}
          {(innings1?.topScorer || innings2?.topScorer || innings1?.topBowler || innings2?.topBowler) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cricket-accent" />
                Key Performances
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Top Scorers */}
                {innings1?.topScorer && (
                  <div className="card p-3">
                    <div className="text-text-secondary mb-1">Top Score ({homeTeam.shortName})</div>
                    <div className="font-semibold text-text-primary">{innings1.topScorer.name}</div>
                    <div className="text-cricket-accent font-mono">
                      {innings1.topScorer.runs} ({innings1.topScorer.balls})
                    </div>
                  </div>
                )}

                {innings2?.topScorer && (
                  <div className="card p-3">
                    <div className="text-text-secondary mb-1">Top Score ({awayTeam.shortName})</div>
                    <div className="font-semibold text-text-primary">{innings2.topScorer.name}</div>
                    <div className="text-cricket-accent font-mono">
                      {innings2.topScorer.runs} ({innings2.topScorer.balls})
                    </div>
                  </div>
                )}

                {/* Top Bowlers */}
                {innings1?.topBowler && (
                  <div className="card p-3">
                    <div className="text-text-secondary mb-1">Best Bowling ({awayTeam.shortName})</div>
                    <div className="font-semibold text-text-primary">{innings1.topBowler.name}</div>
                    <div className="text-cricket-accent font-mono">
                      {innings1.topBowler.wickets}/{innings1.topBowler.runs}
                    </div>
                  </div>
                )}

                {innings2?.topBowler && (
                  <div className="card p-3">
                    <div className="text-text-secondary mb-1">Best Bowling ({homeTeam.shortName})</div>
                    <div className="font-semibold text-text-primary">{innings2.topBowler.name}</div>
                    <div className="text-cricket-accent font-mono">
                      {innings2.topBowler.wickets}/{innings2.topBowler.runs}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border-primary">
          <button
            onClick={onClose}
            className="btn-primary w-full"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchResultModal;
