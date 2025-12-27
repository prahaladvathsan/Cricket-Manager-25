/**
 * @file MatchResultModal.jsx
 * @description Broadcast-style match summary modal - compact and wide
 */

import React from 'react';
import { X, Trophy, Zap } from 'lucide-react';
import PlayerName from './PlayerName';
import { getTeamBadge, getTeamBanner } from '../../utils/assetHelpers';

const MatchResultModal = ({ isOpen, onClose, matchResult }) => {
  if (!isOpen || !matchResult) return null;

  const {
    venue,
    matchType,
    innings1,
    innings2,
    winner,
    margin,
    playerOfMatch,
    superOver
  } = matchResult;

  // Get winner team name
  const winnerTeam = innings1.teamId === winner ? innings1.teamName :
                     innings2.teamId === winner ? innings2.teamName :
                     'Unknown Team';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-bg-secondary to-bg-primary border border-border-primary rounded-lg shadow-2xl w-full max-w-3xl my-auto">
        {/* Compact Header */}
        <div className="relative p-3 border-b border-border-primary">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cricket-primary/20 rounded">
              <Trophy className="w-4 h-4 text-cricket-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide">
                Match Summary
              </h2>
              <p className="text-xs text-text-secondary uppercase tracking-wide">
                {matchType || 'T20 International'} • {venue || 'Stadium'}
              </p>
            </div>
          </div>
        </div>

        {/* Innings Stacked Vertically */}
        <div className="p-4">
          <div className="space-y-3">
            {/* First Innings */}
            <div className="relative border border-border-primary rounded overflow-hidden">
              {/* Banner Background */}
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage: `url(${getTeamBanner(innings1.teamId)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />

              {/* Innings Header */}
              <div className="relative flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-primary/90">
                <div className="flex items-center gap-2">
                  <img
                    src={getTeamBadge(innings1.teamId)}
                    alt={innings1.teamName}
                    className="w-8 h-8 drop-shadow-lg"
                  />
                  <span className="text-sm font-bold text-cricket-accent uppercase">
                    {innings1.teamName}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-cricket-accent font-mono">
                    {innings1.totalScore}/{innings1.wickets}
                  </div>
                  <div className="text-xs text-text-secondary">
                    ({innings1.overs}.{innings1.balls} ov)
                  </div>
                </div>
              </div>

              {/* Batting and Bowling Stats */}
              <div className="relative grid grid-cols-2 divide-x divide-border-primary bg-bg-primary/95">
                {/* Top Batsmen */}
                <div className="p-2">
                  {innings1.topBatsmen && innings1.topBatsmen.length > 0 ? (
                    <div className="space-y-1">
                      {innings1.topBatsmen.map((batsman, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <PlayerName
                            playerId={batsman.id}
                            className="font-medium text-text-primary truncate flex-1 pr-2"
                          />
                          <div className="font-mono text-text-secondary whitespace-nowrap">
                            <span className="text-cricket-accent font-semibold">{batsman.runs}</span>
                            <span className="text-text-secondary"> ({batsman.balls})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary italic">No data</p>
                  )}
                </div>

                {/* Top Bowlers */}
                <div className="p-2">
                  {innings1.topBowlers && innings1.topBowlers.length > 0 ? (
                    <div className="space-y-1">
                      {innings1.topBowlers.map((bowler, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <PlayerName
                            playerId={bowler.id}
                            className="font-medium text-text-primary truncate flex-1 pr-2"
                          />
                          <div className="font-mono text-text-secondary whitespace-nowrap">
                            <span className="text-cricket-accent font-semibold">{bowler.wickets}-{bowler.runs}</span>
                            <span className="text-text-secondary"> ({bowler.overs})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary italic">No data</p>
                  )}
                </div>
              </div>
            </div>

            {/* Second Innings */}
            <div className="relative border border-border-primary rounded overflow-hidden">
              {/* Banner Background */}
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage: `url(${getTeamBanner(innings2.teamId)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />

              {/* Innings Header */}
              <div className="relative flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-primary/90">
                <div className="flex items-center gap-2">
                  <img
                    src={getTeamBadge(innings2.teamId)}
                    alt={innings2.teamName}
                    className="w-8 h-8 drop-shadow-lg"
                  />
                  <span className="text-sm font-bold text-cricket-accent uppercase">
                    {innings2.teamName}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-cricket-accent font-mono">
                    {innings2.totalScore}/{innings2.wickets}
                  </div>
                  <div className="text-xs text-text-secondary">
                    ({innings2.overs}.{innings2.balls} ov)
                  </div>
                </div>
              </div>

              {/* Batting and Bowling Stats */}
              <div className="relative grid grid-cols-2 divide-x divide-border-primary bg-bg-primary/95">
                {/* Top Batsmen */}
                <div className="p-2">
                  {innings2.topBatsmen && innings2.topBatsmen.length > 0 ? (
                    <div className="space-y-1">
                      {innings2.topBatsmen.map((batsman, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <PlayerName
                            playerId={batsman.id}
                            className="font-medium text-text-primary truncate flex-1 pr-2"
                          />
                          <div className="font-mono text-text-secondary whitespace-nowrap">
                            <span className="text-cricket-accent font-semibold">{batsman.runs}</span>
                            <span className="text-text-secondary"> ({batsman.balls})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary italic">No data</p>
                  )}
                </div>

                {/* Top Bowlers */}
                <div className="p-2">
                  {innings2.topBowlers && innings2.topBowlers.length > 0 ? (
                    <div className="space-y-1">
                      {innings2.topBowlers.map((bowler, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <PlayerName
                            playerId={bowler.id}
                            className="font-medium text-text-primary truncate flex-1 pr-2"
                          />
                          <div className="font-mono text-text-secondary whitespace-nowrap">
                            <span className="text-cricket-accent font-semibold">{bowler.wickets}-{bowler.runs}</span>
                            <span className="text-text-secondary"> ({bowler.overs})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary italic">No data</p>
                  )}
                </div>
              </div>
            </div>

            {/* Super Over Section (if applicable) */}
            {superOver && (
              <div className="border border-cricket-accent/50 rounded overflow-hidden bg-gradient-to-r from-cricket-accent/10 to-cricket-primary/10">
                {/* Super Over Header */}
                <div className="flex items-center justify-center gap-2 py-2 border-b border-cricket-accent/30 bg-cricket-accent/20">
                  <Zap className="w-4 h-4 text-cricket-accent" />
                  <span className="text-sm font-bold text-cricket-accent uppercase tracking-wide">Super Over</span>
                  <Zap className="w-4 h-4 text-cricket-accent" />
                </div>

                {/* Super Over Scores */}
                <div className="grid grid-cols-2 divide-x divide-cricket-accent/30">
                  {/* Team 1 (batted first in super over) */}
                  <div className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <img
                        src={getTeamBadge(superOver.team1?.teamId)}
                        alt={superOver.team1?.teamName}
                        className="w-6 h-6"
                      />
                      <span className="text-xs font-semibold text-text-primary uppercase">
                        {superOver.team1?.teamName}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-cricket-accent font-mono">
                      {superOver.team1?.runs}/{superOver.team1?.wickets}
                    </div>
                    <div className="text-xs text-text-secondary">
                      ({Math.floor(superOver.team1?.balls / 6)}.{superOver.team1?.balls % 6} ov)
                    </div>
                  </div>

                  {/* Team 2 (batted second in super over) */}
                  <div className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <img
                        src={getTeamBadge(superOver.team2?.teamId)}
                        alt={superOver.team2?.teamName}
                        className="w-6 h-6"
                      />
                      <span className="text-xs font-semibold text-text-primary uppercase">
                        {superOver.team2?.teamName}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-cricket-accent font-mono">
                      {superOver.team2?.runs}/{superOver.team2?.wickets}
                    </div>
                    <div className="text-xs text-text-secondary">
                      ({Math.floor(superOver.team2?.balls / 6)}.{superOver.team2?.balls % 6} ov)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Result Footer */}
        <div className="px-4 pb-3 pt-2 border-t border-border-primary">
          <div className="bg-cricket-accent text-center py-2 rounded uppercase font-bold text-base tracking-wide text-bg-primary">
            {winnerTeam} wins by {margin}
          </div>

          {/* Player of the Match */}
          {playerOfMatch && (
            <div className="mt-2 text-center">
              <span className="text-xs text-text-secondary uppercase tracking-wide">Player of the Match: </span>
              <PlayerName
                playerId={playerOfMatch.id}
                className="text-xs font-bold text-cricket-accent"
              />
              {playerOfMatch.performance && (
                <span className="text-xs text-text-secondary ml-1">({playerOfMatch.performance})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchResultModal;
