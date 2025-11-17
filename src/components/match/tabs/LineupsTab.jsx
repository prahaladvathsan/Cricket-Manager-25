/**
 * @file LineupsTab.jsx
 * @description Lineups tab for pre-match flow
 * Displays both teams' playing XI in batting order with player roles
 */

import React, { useMemo } from 'react';
import { Users, Shield, Target } from 'lucide-react';
import usePlayerStore from '../../../stores/playerStore';
import useTeamStore from '../../../stores/teamStore';
import PlayerName from '../../shared/PlayerName';
import TeamName from '../../shared/TeamName';

const LineupsTab = ({ matchData, tossState, onStartMatch }) => {
  const { homeTeam, awayTeam } = matchData;
  const { players } = usePlayerStore();
  const { teamTactics } = useTeamStore();

  // Determine which team bats first based on toss
  const battingFirstTeam = useMemo(() => {
    if (!tossState.decision) return null;
    return tossState.decision === 'bat' ? tossState.winner : (tossState.winner.id === homeTeam.id ? awayTeam : homeTeam);
  }, [tossState, homeTeam, awayTeam]);

  const bowlingFirstTeam = useMemo(() => {
    if (!tossState.decision) return null;
    return tossState.decision === 'bowl' ? tossState.winner : (tossState.winner.id === homeTeam.id ? awayTeam : homeTeam);
  }, [tossState, homeTeam, awayTeam]);

  // Get lineup for a team (batting order)
  const getTeamLineup = (teamId) => {
    const tactics = teamTactics[teamId];
    if (!tactics || !tactics.battingOrder) {
      // Fallback: use squad selection if batting order not set
      return tactics?.squadSelection?.slice(0, 11) || [];
    }
    return tactics.battingOrder.slice(0, 11);
  };

  // Get role badge styling
  const getRoleBadge = (role) => {
    const badges = {
      'batsman': { label: 'Bat', class: 'bg-blue-900/40 text-blue-300' },
      'bowler': { label: 'Bowl', class: 'bg-red-900/40 text-red-300' },
      'all-rounder': { label: 'All', class: 'bg-purple-900/40 text-purple-300' },
      'wicket-keeper': { label: 'WK', class: 'bg-cyan-900/40 text-cyan-300' }
    };
    return badges[role] || { label: 'Bat', class: 'bg-blue-900/40 text-blue-300' };
  };

  // Get lineups
  const battingLineup = battingFirstTeam ? getTeamLineup(battingFirstTeam.id) : [];
  const bowlingLineup = bowlingFirstTeam ? getTeamLineup(bowlingFirstTeam.id) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-4 text-center">
        <h3 className="text-xl font-bold text-text-primary mb-2">
          Team Lineups
        </h3>
        {battingFirstTeam && (
          <div className="text-sm text-cricket-accent font-semibold">
            <TeamName teamId={battingFirstTeam.id} inline={true} /> will bat first
          </div>
        )}
      </div>

      {/* Lineups Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Batting Team */}
        {battingFirstTeam && (
          <div className="card p-4">
            <div className="text-center pb-3 mb-3 border-b border-border-primary">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-2 border-2"
                style={{
                  backgroundColor: battingFirstTeam.colors?.primary || '#2D5F3F',
                  borderColor: battingFirstTeam.colors?.secondary || '#D4AF37'
                }}
              />
              <h4 className="font-bold text-text-primary mb-1">
                <TeamName teamId={battingFirstTeam.id} inline={true} className="font-bold" />
              </h4>
              <div className="flex items-center justify-center gap-1.5 text-xs text-cricket-accent">
                <Target className="w-3 h-3" />
                <span>Batting First</span>
              </div>
            </div>

            {/* Player List */}
            <div className="space-y-1.5">
              {battingLineup.map((playerId, index) => {
                const player = players[playerId];
                if (!player) return null;

                const roleBadge = getRoleBadge(player.role);

                return (
                  <div
                    key={playerId}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-bg-tertiary transition-colors"
                  >
                    <span className="text-xs font-mono text-text-tertiary w-5">
                      {index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <PlayerName
                        playerId={playerId}
                        inline={true}
                        className="text-sm font-medium truncate"
                      />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleBadge.class}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                );
              })}

              {battingLineup.length === 0 && (
                <div className="text-sm text-text-secondary text-center py-4">
                  No lineup available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bowling Team */}
        {bowlingFirstTeam && (
          <div className="card p-4">
            <div className="text-center pb-3 mb-3 border-b border-border-primary">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-2 border-2"
                style={{
                  backgroundColor: bowlingFirstTeam.colors?.primary || '#2D5F3F',
                  borderColor: bowlingFirstTeam.colors?.secondary || '#D4AF37'
                }}
              />
              <h4 className="font-bold text-text-primary mb-1">
                <TeamName teamId={bowlingFirstTeam.id} inline={true} className="font-bold" />
              </h4>
              <div className="flex items-center justify-center gap-1.5 text-xs text-cricket-accent">
                <Shield className="w-3 h-3" />
                <span>Bowling First</span>
              </div>
            </div>

            {/* Player List */}
            <div className="space-y-1.5">
              {bowlingLineup.map((playerId, index) => {
                const player = players[playerId];
                if (!player) return null;

                const roleBadge = getRoleBadge(player.role);

                return (
                  <div
                    key={playerId}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-bg-tertiary transition-colors"
                  >
                    <span className="text-xs font-mono text-text-tertiary w-5">
                      {index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <PlayerName
                        playerId={playerId}
                        inline={true}
                        className="text-sm font-medium truncate"
                      />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleBadge.class}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                );
              })}

              {bowlingLineup.length === 0 && (
                <div className="text-sm text-text-secondary text-center py-4">
                  No lineup available
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ready Message */}
      <div className="card p-4 text-center">
        <p className="text-sm text-cricket-accent font-medium">
          ✓ All preparations complete. Click "Start Match" below to begin!
        </p>
      </div>
    </div>
  );
};

export default LineupsTab;
