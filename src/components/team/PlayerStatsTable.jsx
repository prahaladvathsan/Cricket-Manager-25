/**
 * @file PlayerStatsTable.jsx
 * @description Reusable statistics table component for batting and bowling stats
 */

import React, { useMemo } from 'react';
import PlayerName from '../shared/PlayerName';
import SortableTable from '../shared/SortableTable';

/**
 * PlayerStatsTable Component
 * @param {Object} props
 * @param {Array} props.players - Array of player stat objects
 * @param {'batting'|'bowling'} props.type - Type of statistics to display
 * @param {string} props.roleFilter - Current role filter
 * @param {number} props.minQualifying - Minimum qualifying criteria
 */
const PlayerStatsTable = ({ players, type, roleFilter, minQualifying }) => {
  // Filter players
  const filteredPlayers = useMemo(() => {
    let result = [...players];

    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(p => {
        const role = p.role?.toLowerCase();
        if (roleFilter === 'batsmen') {
          return role === 'batsman' || role === 'wicket-keeper';
        } else if (roleFilter === 'bowlers') {
          return role === 'bowler';
        } else if (roleFilter === 'all-rounders') {
          return role === 'all-rounder';
        }
        return true;
      });
    }

    // Apply minimum qualifying criteria
    if (type === 'batting') {
      result = result.filter(p => p.matches >= minQualifying);
    } else if (type === 'bowling') {
      result = result.filter(p => (p.ballsBowled || 0) >= (minQualifying * 6)); // Convert overs to balls
    }

    return result;
  }, [players, roleFilter, minQualifying, type]);

  // Format helpers
  const formatAverage = (avg) => {
    if (avg === undefined || avg === null) return '-';
    return avg.toFixed(2);
  };

  const formatStrikeRate = (sr) => {
    if (sr === undefined || sr === null) return '-';
    return sr.toFixed(2);
  };

  const formatEconomy = (econ) => {
    if (econ === undefined || econ === null) return '-';
    return econ.toFixed(2);
  };

  const formatOvers = (balls) => {
    if (!balls || balls === 0) return '0.0';
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  const formatBestBowling = (best) => {
    if (!best || !best.wickets) return '-';
    return `${best.wickets}/${best.runs}`;
  };

  // Batting Columns Definition
  const battingColumns = [
    {
      key: 'player',
      label: 'Player',
      sortKey: 'playerName',
      sticky: true,
      render: (player) => (
        <PlayerName playerId={player.playerId} className="font-medium" />
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortKey: 'role',
      align: 'center',
      render: (player) => (
        <span className="text-text-secondary text-xs uppercase">
          {player.role === 'batsman' ? 'BAT' : player.role === 'all-rounder' ? 'ALL' : player.role === 'wicket-keeper' ? 'WK' : 'BOWL'}
        </span>
      ),
    },
    {
      key: 'matches',
      label: 'M',
      sortKey: 'matches',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{player.matches || 0}</span>,
    },
    {
      key: 'innings',
      label: 'I',
      sortKey: 'innings',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{player.innings || 0}</span>,
    },
    {
      key: 'runs',
      label: 'Runs',
      sortKey: 'runs',
      align: 'center',
      render: (player) => <span className="font-mono text-cricket-accent font-semibold">{player.runs || 0}</span>,
    },
    {
      key: 'balls',
      label: 'Balls',
      sortKey: 'ballsFaced',
      align: 'center',
      render: (player) => <span className="font-mono text-text-secondary">{player.ballsFaced || 0}</span>,
    },
    {
      key: 'avg',
      label: 'Avg',
      sortKey: 'battingAvg',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{formatAverage(player.battingAvg)}</span>,
    },
    {
      key: 'sr',
      label: 'SR',
      sortKey: 'strikeRate',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{formatStrikeRate(player.strikeRate)}</span>,
    },
    {
      key: 'fifties',
      label: '50s',
      sortKey: 'fifties',
      align: 'center',
      render: (player) => <span className="font-mono text-text-secondary">{player.fifties || 0}</span>,
    },
    {
      key: 'centuries',
      label: '100s',
      sortKey: 'centuries',
      align: 'center',
      render: (player) => <span className="font-mono text-text-secondary">{player.centuries || 0}</span>,
    },
    {
      key: 'hs',
      label: 'HS',
      sortKey: 'highestScore',
      align: 'center',
      render: (player) => (
        <span className="font-mono text-trophy-gold font-semibold">
          {player.highestScore || 0}{player.highestScoreNotOut ? '*' : ''}
        </span>
      ),
    },
    {
      key: 'impact',
      label: 'Impact',
      sortKey: 'totalImpact',
      align: 'center',
      headerClassName: 'text-trophy-gold',
      render: (player) => (
        <span className={`font-mono font-semibold ${
          (player.totalImpact || 0) >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {(player.totalImpact || 0) >= 0 ? '+' : ''}{(player.totalImpact || 0).toFixed(1)}
        </span>
      ),
    },
  ];

  // Bowling Columns Definition
  const bowlingColumns = [
    {
      key: 'player',
      label: 'Player',
      sortKey: 'playerName',
      sticky: true,
      render: (player) => (
        <PlayerName playerId={player.playerId} className="font-medium" />
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortKey: 'role',
      align: 'center',
      render: (player) => (
        <span className="text-text-secondary text-xs uppercase">
          {player.role === 'bowler' ? 'BOWL' : player.role === 'all-rounder' ? 'ALL' : 'BAT'}
        </span>
      ),
    },
    {
      key: 'matches',
      label: 'M',
      sortKey: 'matches',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{player.matches || 0}</span>,
    },
    {
      key: 'innings',
      label: 'I',
      sortKey: 'innings',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{player.innings || 0}</span>,
    },
    {
      key: 'overs',
      label: 'Overs',
      sortKey: 'ballsBowled',
      align: 'center',
      render: (player) => <span className="font-mono text-text-secondary">{formatOvers(player.ballsBowled)}</span>,
    },
    {
      key: 'runs',
      label: 'Runs',
      sortKey: 'runsConceded',
      align: 'center',
      render: (player) => <span className="font-mono text-text-secondary">{player.runsConceded || 0}</span>,
    },
    {
      key: 'wickets',
      label: 'Wkts',
      sortKey: 'wickets',
      align: 'center',
      render: (player) => <span className="font-mono text-cricket-accent font-semibold">{player.wickets || 0}</span>,
    },
    {
      key: 'avg',
      label: 'Avg',
      sortKey: 'bowlingAvg',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{formatAverage(player.bowlingAvg)}</span>,
    },
    {
      key: 'econ',
      label: 'Econ',
      sortKey: 'economy',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{formatEconomy(player.economy)}</span>,
    },
    {
      key: 'sr',
      label: 'SR',
      sortKey: 'bowlingStrikeRate',
      align: 'center',
      render: (player) => <span className="font-mono text-text-primary">{formatStrikeRate(player.bowlingStrikeRate)}</span>,
    },
    {
      key: 'best',
      label: 'Best',
      sortable: false, // Cannot easily sort by this string representation
      align: 'center',
      render: (player) => <span className="font-mono text-trophy-gold font-semibold">{formatBestBowling(player.bestBowling)}</span>,
    },
    {
      key: '4w',
      label: '4W',
      sortKey: 'fourWickets',
      align: 'center',
      render: (player) => <span className="font-mono text-text-secondary">{player.fourWickets || 0}</span>,
    },
    {
      key: '5w',
      label: '5W',
      sortKey: 'fiveWickets',
      align: 'center',
      render: (player) => <span className="font-mono text-text-secondary">{player.fiveWickets || 0}</span>,
    },
    {
      key: 'impact',
      label: 'Impact',
      sortKey: 'totalImpact',
      align: 'center',
      headerClassName: 'text-trophy-gold',
      render: (player) => (
        <span className={`font-mono font-semibold ${
          (player.totalImpact || 0) >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {(player.totalImpact || 0) >= 0 ? '+' : ''}{(player.totalImpact || 0).toFixed(1)}
        </span>
      ),
    },
  ];

  return (
    <SortableTable
      data={filteredPlayers}
      columns={type === 'batting' ? battingColumns : bowlingColumns}
      defaultSort={
        type === 'batting'
          ? { column: 'runs', direction: 'desc' }
          : { column: 'wickets', direction: 'desc' }
      }
      emptyState={
        <tr>
          <td colSpan={type === 'batting' ? battingColumns.length : bowlingColumns.length} className="px-3 py-8 text-center text-text-secondary">
            No {type} statistics available with current filters
          </td>
        </tr>
      }
      stripedRows={true}
      hoverRows={true}
    />
  );
};

export default PlayerStatsTable;
