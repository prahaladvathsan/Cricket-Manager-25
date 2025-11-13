/**
 * @file TeamCard.jsx
 * @description Reusable team card component for displaying team information
 * and roster across League, Match, and other views. Football Manager-inspired design.
 */

import React, { useMemo } from 'react';
import { Trophy, Users, TrendingUp, Target } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useLeagueStore from '../../stores/leagueStore';
import PlayerName from './PlayerName';

/**
 * TeamCard Component
 *
 * @param {Object} team - Team/Club object
 * @param {string} teamId - Team ID (alternative to team object)
 * @param {string} variant - Display variant: 'full' | 'compact' | 'roster' (default: 'full')
 * @param {boolean} showRoster - Show team roster (default: true for 'full', false for 'compact')
 * @param {boolean} showStats - Show team statistics (default: true)
 * @param {function} onClick - Optional click handler
 * @param {string} className - Additional CSS classes
 * @param {function} onPlayerClick - Callback when player name is clicked (to close parent modal)
 */
const TeamCard = ({
  team = null,
  teamId = null,
  variant = 'full',
  showRoster = true,
  showStats = true,
  onClick = null,
  className = '',
  onPlayerClick = null
}) => {
  // Get team data from stores if teamId is provided
  const { getTeam, squadLists } = useTeamStore();
  const { players } = usePlayerStore();
  const { clubs, standings } = useLeagueStore();

  // Determine team object
  const teamData = useMemo(() => {
    if (team) return team;
    if (teamId) {
      // Try to get from clubs first (has more info), then from teams
      return clubs[teamId] || getTeam(teamId);
    }
    return null;
  }, [team, teamId, clubs, getTeam]);

  if (!teamData) return null;

  const teamStandings = standings.find(s => s.clubId === teamData.id);
  const roster = squadLists[teamData.id] || teamData.playerIds || [];

  // Get roster players
  const rosterPlayers = useMemo(() => {
    return roster
      .map(playerId => players[playerId])
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by role priority: batsman, all-rounder, wicket-keeper, bowler
        const rolePriority = { 'batsman': 1, 'all-rounder': 2, 'wicket-keeper': 3, 'bowler': 4 };
        return (rolePriority[a.role?.toLowerCase()] || 5) - (rolePriority[b.role?.toLowerCase()] || 5);
      });
  }, [roster, players]);

  // Calculate roster statistics
  const rosterStats = useMemo(() => {
    const roles = { batsman: 0, bowler: 0, 'all-rounder': 0, 'wicket-keeper': 0 };
    rosterPlayers.forEach(player => {
      const role = player.role?.toLowerCase();
      if (roles.hasOwnProperty(role)) {
        roles[role]++;
      }
    });
    return roles;
  }, [rosterPlayers]);

  // Role colors
  const roleColors = {
    'batsman': 'bg-blue-900/30 text-blue-400',
    'bowler': 'bg-red-900/30 text-red-400',
    'all-rounder': 'bg-purple-900/30 text-purple-400',
    'wicket-keeper': 'bg-green-900/30 text-green-400'
  };

  // Compact variant - minimal info
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center justify-between p-2 bg-bg-secondary border border-border-primary rounded hover:border-border-accent transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Trophy className="w-4 h-4 text-cricket-accent flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary truncate">{teamData.name}</div>
            <div className="text-xs text-text-secondary">
              {roster.length} players
            </div>
          </div>
        </div>
        {teamStandings && (
          <div className="text-sm font-bold text-cricket-accent ml-3">
            {teamStandings.points} pts
          </div>
        )}
      </div>
    );
  }

  // Full variant - complete team details with roster
  return (
    <div className={`card p-4 ${onClick ? 'cursor-pointer hover:border-cricket-accent' : ''} ${className}`} onClick={onClick}>
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-border-primary">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-cricket-accent flex-shrink-0" />
            <h3 className="text-xl font-bold text-text-primary">{teamData.name}</h3>
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            {teamData.shortName && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-bg-tertiary text-text-secondary">
                {teamData.shortName}
              </span>
            )}
            {teamData.city && (
              <span className="text-text-secondary">{teamData.city}</span>
            )}
            {teamData.country && (
              <span className="text-text-tertiary text-xs">{teamData.country}</span>
            )}
          </div>
        </div>
      </div>

      {/* Team Statistics */}
      {showStats && teamStandings && (
        <div className="mb-4 p-3 bg-cricket-primary/10 border border-cricket-primary/30 rounded-lg">
          <div className="text-xs text-cricket-accent font-semibold mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Season Statistics
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xs text-text-secondary mb-1">Played</div>
              <div className="text-lg font-bold text-text-primary">{teamStandings.played}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-text-secondary mb-1">Won</div>
              <div className="text-lg font-bold text-status-excellent">{teamStandings.won}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-text-secondary mb-1">Lost</div>
              <div className="text-lg font-bold text-status-poor">{teamStandings.lost}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-text-secondary mb-1">NRR</div>
              <div className={`text-lg font-bold ${
                teamStandings.netRunRate >= 0 ? 'text-status-excellent' : 'text-status-poor'
              }`}>
                {teamStandings.netRunRate >= 0 ? '+' : ''}{teamStandings.netRunRate.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roster Composition */}
      {showRoster && rosterPlayers.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
            <Users className="w-4 h-4 text-cricket-accent" />
            Squad Composition ({rosterPlayers.length} players)
          </div>

          {/* Role Distribution */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {Object.entries(rosterStats).map(([role, count]) => (
              <div key={role} className="text-center p-2 bg-bg-tertiary rounded">
                <div className={`text-xs capitalize ${roleColors[role]?.split(' ')[1] || 'text-text-secondary'}`}>
                  {role === 'wicket-keeper' ? 'W-Keeper' : role}
                </div>
                <div className="text-lg font-bold text-text-primary">{count}</div>
              </div>
            ))}
          </div>

          {/* Player List */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {rosterPlayers.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2 bg-bg-secondary rounded hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-mono text-text-tertiary w-6">
                    {idx + 1}
                  </span>
                  <div className="text-sm font-medium truncate">
                    <PlayerName
                      playerId={player.id}
                      player={player}
                      className="text-sm font-medium"
                      onBeforeOpen={onPlayerClick}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xxs font-medium ${
                    roleColors[player.role?.toLowerCase()] || 'bg-bg-tertiary text-text-secondary'
                  }`}>
                    {player.role}
                  </span>
                  {player.primaryPlaystyle?.batting && (
                    <span className="text-xxs text-text-secondary truncate max-w-24">
                      {player.primaryPlaystyle.batting}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Details */}
      {teamData.homeGround && (
        <div className="mt-4 pt-3 border-t border-border-primary">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Target className="w-3 h-3" />
            <span>Home Ground: {teamData.homeGround}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamCard;
