/**
 * @file MatchResultModal.jsx
 * @description Modal for displaying match results after simulation
 */

import React from 'react';
import { X, Trophy, Target, Award, TrendingUp, ArrowRight } from 'lucide-react';

const MatchResultModal = ({ isOpen, onClose, matchResult, onContinue }) => {
  if (!isOpen || !matchResult) return null;

  const {
    winner,
    loser,
    winMargin,
    winType, // 'runs' or 'wickets'
    homeTeam,
    awayTeam,
    playerOfMatch,
    topScorer,
    topBowler
  } = matchResult;

  const isUserTeamWinner = winner.isUserTeam;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isUserTeamWinner ? 'bg-green-500/10 border-green-500/30' : 'bg-bg-tertiary border-border-primary'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${
              isUserTeamWinner ? 'bg-green-500/20' : 'bg-bg-tertiary'
            }`}>
              <Trophy className={`w-5 h-5 ${
                isUserTeamWinner ? 'text-green-400' : 'text-cricket-accent'
              }`} />
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
          {/* Winner Announcement */}
          <div className={`card p-6 text-center ${
            isUserTeamWinner ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-bg-tertiary'
          }`}>
            <div
              className="w-20 h-20 rounded-full mx-auto mb-3 border-2"
              style={{
                backgroundColor: winner.colors?.primary || '#2D5F3F',
                borderColor: winner.colors?.secondary || '#D4AF37'
              }}
            />
            <h3 className={`text-2xl font-bold mb-2 ${
              isUserTeamWinner ? 'text-green-400' : 'text-cricket-accent'
            }`}>
              {winner.name} Won!
            </h3>
            <p className="text-lg text-text-primary">
              by {winMargin} {winType === 'runs' ? 'runs' : 'wickets'}
            </p>
            {isUserTeamWinner && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded">
                  <Trophy className="w-4 h-4" />
                  Victory!
                </span>
              </div>
            )}
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`card p-4 ${homeTeam.id === winner.id ? 'border-2 border-cricket-accent' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full border"
                  style={{
                    backgroundColor: homeTeam.colors?.primary || '#2D5F3F',
                    borderColor: homeTeam.colors?.secondary || '#D4AF37'
                  }}
                />
                <h4 className="font-semibold text-text-primary text-sm">
                  {homeTeam.name}
                </h4>
              </div>
              <div className="text-3xl font-bold text-cricket-accent">
                {homeTeam.score}/{homeTeam.wickets}
              </div>
              <div className="text-sm text-text-secondary">
                {homeTeam.overs} overs
              </div>
            </div>

            <div className={`card p-4 ${awayTeam.id === winner.id ? 'border-2 border-cricket-accent' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full border"
                  style={{
                    backgroundColor: awayTeam.colors?.primary || '#2D5F3F',
                    borderColor: awayTeam.colors?.secondary || '#D4AF37'
                  }}
                />
                <h4 className="font-semibold text-text-primary text-sm">
                  {awayTeam.name}
                </h4>
              </div>
              <div className="text-3xl font-bold text-cricket-accent">
                {awayTeam.score}/{awayTeam.wickets}
              </div>
              <div className="text-sm text-text-secondary">
                {awayTeam.overs} overs
              </div>
            </div>
          </div>

          {/* Key Performances */}
          <div className="space-y-3">
            {/* Player of the Match */}
            {playerOfMatch && (
              <div className="card p-3 bg-cricket-primary/10 border border-cricket-accent">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-cricket-accent flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-text-secondary">Player of the Match</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {playerOfMatch.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {playerOfMatch.performance}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Top Scorer */}
              {topScorer && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-blue-400" />
                    <p className="text-xs text-text-secondary">Top Scorer</p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {topScorer.name}
                  </p>
                  <p className="text-lg font-bold text-blue-400">
                    {topScorer.runs} ({topScorer.balls})
                  </p>
                </div>
              )}

              {/* Top Bowler */}
              {topBowler && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <p className="text-xs text-text-secondary">Top Bowler</p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {topBowler.name}
                  </p>
                  <p className="text-lg font-bold text-red-400">
                    {topBowler.wickets}/{topBowler.runs}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border-primary">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            View Full Scorecard
          </button>
          <div className="flex-1"></div>
          <button
            onClick={() => {
              if (onContinue) {
                onContinue();
              }
              onClose();
            }}
            className="btn-primary flex items-center gap-2"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchResultModal;
