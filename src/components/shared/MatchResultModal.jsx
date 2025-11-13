/**
 * @file MatchResultModal.jsx
 * @description Broadcast-style match summary modal
 */

import React from 'react';
import { X, Trophy } from 'lucide-react';
import PlayerName from './PlayerName';

const MatchResultModal = ({ isOpen, onClose, matchResult }) => {
  if (!isOpen || !matchResult) return null;

  const {
    venue,
    matchType,
    innings1,
    innings2,
    winner,
    margin,
    playerOfMatch
  } = matchResult;

  // Get winner team name
  const winnerTeam = innings1.teamId === winner ? innings1.teamName : innings2.teamName;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-bg-secondary to-bg-primary border border-border-primary rounded-lg shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="relative p-6 border-b border-border-primary">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cricket-primary/20 rounded">
              <Trophy className="w-6 h-6 text-cricket-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary uppercase tracking-wide">
                Match Summary
              </h2>
              <p className="text-sm text-text-secondary uppercase tracking-wide">
                {matchType || 'T20 International'} • {venue || 'Stadium'}
              </p>
            </div>
          </div>
        </div>

        {/* Innings Sections */}
        <div className="p-6 space-y-6">
          {/* First Innings */}
          <div className="border border-border-primary rounded-lg overflow-hidden">
            {/* Innings Header */}
            <div
              className="flex items-center justify-between p-3 border-b border-border-primary"
              style={{
                background: `linear-gradient(to right, ${innings1.teamColors?.primary || '#2D5F3F'}20, transparent)`
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2"
                  style={{
                    backgroundColor: innings1.teamColors?.primary || '#2D5F3F',
                    borderColor: innings1.teamColors?.secondary || '#D4AF37'
                  }}
                />
                <span className="text-lg font-bold text-cricket-accent uppercase">
                  {innings1.teamName}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cricket-accent font-mono">
                  {innings1.wickets}-{innings1.totalScore}
                </div>
                <div className="text-xs text-text-secondary uppercase">
                  {innings1.overs}.{innings1.balls} overs
                </div>
              </div>
            </div>

            {/* Batting and Bowling Stats */}
            <div className="grid grid-cols-2 divide-x divide-border-primary bg-bg-tertiary/50">
              {/* Top Batsmen */}
              <div className="p-4">
                {innings1.topBatsmen && innings1.topBatsmen.length > 0 ? (
                  <div className="space-y-2">
                    {innings1.topBatsmen.map((batsman, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <PlayerName
                          playerId={batsman.id}
                          className="font-semibold text-text-primary uppercase text-xs flex-1"
                        />
                        <div className="flex items-baseline gap-2 font-mono">
                          <span className="text-base font-bold text-cricket-accent">
                            {batsman.runs}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {batsman.balls}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No batting data</p>
                )}
              </div>

              {/* Top Bowlers */}
              <div className="p-4">
                {innings1.topBowlers && innings1.topBowlers.length > 0 ? (
                  <div className="space-y-2">
                    {innings1.topBowlers.map((bowler, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <PlayerName
                          playerId={bowler.id}
                          className="font-semibold text-text-primary uppercase text-xs flex-1"
                        />
                        <div className="flex items-baseline gap-2 font-mono">
                          <span className="text-xs text-text-secondary">
                            {bowler.overs}
                          </span>
                          <span className="text-base font-bold text-cricket-accent">
                            {bowler.wickets}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No bowling data</p>
                )}
              </div>
            </div>
          </div>

          {/* Second Innings */}
          <div className="border border-border-primary rounded-lg overflow-hidden">
            {/* Innings Header */}
            <div
              className="flex items-center justify-between p-3 border-b border-border-primary"
              style={{
                background: `linear-gradient(to right, ${innings2.teamColors?.primary || '#2D5F3F'}20, transparent)`
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2"
                  style={{
                    backgroundColor: innings2.teamColors?.primary || '#2D5F3F',
                    borderColor: innings2.teamColors?.secondary || '#D4AF37'
                  }}
                />
                <span className="text-lg font-bold text-cricket-accent uppercase">
                  {innings2.teamName}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cricket-accent font-mono">
                  {innings2.wickets}-{innings2.totalScore}
                </div>
                <div className="text-xs text-text-secondary uppercase">
                  {innings2.overs}.{innings2.balls} overs
                </div>
              </div>
            </div>

            {/* Batting and Bowling Stats */}
            <div className="grid grid-cols-2 divide-x divide-border-primary bg-bg-tertiary/50">
              {/* Top Batsmen */}
              <div className="p-4">
                {innings2.topBatsmen && innings2.topBatsmen.length > 0 ? (
                  <div className="space-y-2">
                    {innings2.topBatsmen.map((batsman, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <PlayerName
                          playerId={batsman.id}
                          className="font-semibold text-text-primary uppercase text-xs flex-1"
                        />
                        <div className="flex items-baseline gap-2 font-mono">
                          <span className="text-base font-bold text-cricket-accent">
                            {batsman.runs}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {batsman.balls}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No batting data</p>
                )}
              </div>

              {/* Top Bowlers */}
              <div className="p-4">
                {innings2.topBowlers && innings2.topBowlers.length > 0 ? (
                  <div className="space-y-2">
                    {innings2.topBowlers.map((bowler, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <PlayerName
                          playerId={bowler.id}
                          className="font-semibold text-text-primary uppercase text-xs flex-1"
                        />
                        <div className="flex items-baseline gap-2 font-mono">
                          <span className="text-xs text-text-secondary">
                            {bowler.overs}
                          </span>
                          <span className="text-base font-bold text-cricket-accent">
                            {bowler.wickets}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No bowling data</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Result Footer */}
        <div className="p-4 border-t border-border-primary">
          <div className="bg-cricket-accent text-center py-3 rounded uppercase font-bold text-lg tracking-wide text-bg-primary">
            {winnerTeam} wins by {margin}
          </div>

          {/* Player of the Match */}
          {playerOfMatch && (
            <div className="mt-3 text-center">
              <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Player of the Match</p>
              <PlayerName
                playerId={playerOfMatch.id}
                className="text-sm font-bold text-cricket-accent"
              />
              {playerOfMatch.performance && (
                <p className="text-xs text-text-secondary mt-1">{playerOfMatch.performance}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchResultModal;
