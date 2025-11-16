/**
 * @file PlayerStatsTable.jsx
 * @description Reusable statistics table component for batting and bowling stats
 */

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import PlayerName from '../shared/PlayerName';

/**
 * PlayerStatsTable Component
 * @param {Object} props
 * @param {Array} props.players - Array of player stat objects
 * @param {'batting'|'bowling'} props.type - Type of statistics to display
 * @param {string} props.roleFilter - Current role filter
 * @param {number} props.minQualifying - Minimum qualifying criteria
 */
const PlayerStatsTable = ({ players, type, roleFilter, minQualifying }) => {
  const [sortBy, setSortBy] = useState(type === 'batting' ? 'runs' : 'wickets');
  const [sortDirection, setSortDirection] = useState('desc');

  // Handle column sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc'); // Default to descending for most stats
    }
  };

  // Sort indicator component
  const SortIndicator = ({ column }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // Filter and sort players
  const filteredSortedPlayers = useMemo(() => {
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

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortBy] ?? 0;
      let bVal = b[sortBy] ?? 0;

      // Handle string columns
      if (sortBy === 'playerName' || sortBy === 'role') {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // Numeric columns
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [players, roleFilter, minQualifying, sortBy, sortDirection, type]);

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

  // Render batting statistics table
  const renderBattingTable = () => (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary bg-bg-secondary">
            <th
              onClick={() => handleSort('playerName')}
              className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors sticky left-0 bg-bg-secondary z-10"
            >
              <div className="flex items-center gap-1">
                Player <SortIndicator column="playerName" />
              </div>
            </th>
            <th
              onClick={() => handleSort('role')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Role <SortIndicator column="role" />
              </div>
            </th>
            <th
              onClick={() => handleSort('matches')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                M <SortIndicator column="matches" />
              </div>
            </th>
            <th
              onClick={() => handleSort('innings')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                I <SortIndicator column="innings" />
              </div>
            </th>
            <th
              onClick={() => handleSort('runs')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Runs <SortIndicator column="runs" />
              </div>
            </th>
            <th
              onClick={() => handleSort('ballsFaced')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Balls <SortIndicator column="ballsFaced" />
              </div>
            </th>
            <th
              onClick={() => handleSort('battingAvg')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Avg <SortIndicator column="battingAvg" />
              </div>
            </th>
            <th
              onClick={() => handleSort('strikeRate')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                SR <SortIndicator column="strikeRate" />
              </div>
            </th>
            <th
              onClick={() => handleSort('fifties')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                50s <SortIndicator column="fifties" />
              </div>
            </th>
            <th
              onClick={() => handleSort('centuries')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                100s <SortIndicator column="centuries" />
              </div>
            </th>
            <th
              onClick={() => handleSort('highestScore')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                HS <SortIndicator column="highestScore" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredSortedPlayers.length === 0 ? (
            <tr>
              <td colSpan="11" className="px-3 py-8 text-center text-text-secondary">
                No batting statistics available with current filters
              </td>
            </tr>
          ) : (
            filteredSortedPlayers.map((player, idx) => (
              <tr
                key={player.playerId}
                className={`border-b border-border-primary hover:bg-bg-tertiary transition-colors ${
                  idx % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'
                }`}
              >
                <td className="px-3 py-2 font-medium sticky left-0 bg-inherit">
                  <PlayerName playerId={player.playerId} className="font-medium" />
                </td>
                <td className="px-3 py-2 text-center text-text-secondary text-xs uppercase">
                  {player.role === 'batsman' ? 'BAT' : player.role === 'all-rounder' ? 'ALL' : player.role === 'wicket-keeper' ? 'WK' : 'BOWL'}
                </td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{player.matches || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{player.innings || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-cricket-accent font-semibold">{player.runs || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-secondary">{player.ballsFaced || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{formatAverage(player.battingAvg)}</td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{formatStrikeRate(player.strikeRate)}</td>
                <td className="px-3 py-2 text-center font-mono text-text-secondary">{player.fifties || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-secondary">{player.centuries || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-trophy-gold font-semibold">
                  {player.highestScore || 0}{player.highestScoreNotOut ? '*' : ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Render bowling statistics table
  const renderBowlingTable = () => (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary bg-bg-secondary">
            <th
              onClick={() => handleSort('playerName')}
              className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors sticky left-0 bg-bg-secondary z-10"
            >
              <div className="flex items-center gap-1">
                Player <SortIndicator column="playerName" />
              </div>
            </th>
            <th
              onClick={() => handleSort('role')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Role <SortIndicator column="role" />
              </div>
            </th>
            <th
              onClick={() => handleSort('matches')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                M <SortIndicator column="matches" />
              </div>
            </th>
            <th
              onClick={() => handleSort('innings')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                I <SortIndicator column="innings" />
              </div>
            </th>
            <th
              onClick={() => handleSort('ballsBowled')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Overs <SortIndicator column="ballsBowled" />
              </div>
            </th>
            <th
              onClick={() => handleSort('runsConceded')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Runs <SortIndicator column="runsConceded" />
              </div>
            </th>
            <th
              onClick={() => handleSort('wickets')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Wkts <SortIndicator column="wickets" />
              </div>
            </th>
            <th
              onClick={() => handleSort('bowlingAvg')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Avg <SortIndicator column="bowlingAvg" />
              </div>
            </th>
            <th
              onClick={() => handleSort('economy')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                Econ <SortIndicator column="economy" />
              </div>
            </th>
            <th
              onClick={() => handleSort('bowlingStrikeRate')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                SR <SortIndicator column="bowlingStrikeRate" />
              </div>
            </th>
            <th className="px-3 py-2 text-center font-semibold text-text-primary">
              Best
            </th>
            <th
              onClick={() => handleSort('fourWickets')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                4W <SortIndicator column="fourWickets" />
              </div>
            </th>
            <th
              onClick={() => handleSort('fiveWickets')}
              className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-center gap-1">
                5W <SortIndicator column="fiveWickets" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredSortedPlayers.length === 0 ? (
            <tr>
              <td colSpan="13" className="px-3 py-8 text-center text-text-secondary">
                No bowling statistics available with current filters
              </td>
            </tr>
          ) : (
            filteredSortedPlayers.map((player, idx) => (
              <tr
                key={player.playerId}
                className={`border-b border-border-primary hover:bg-bg-tertiary transition-colors ${
                  idx % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'
                }`}
              >
                <td className="px-3 py-2 font-medium sticky left-0 bg-inherit">
                  <PlayerName playerId={player.playerId} className="font-medium" />
                </td>
                <td className="px-3 py-2 text-center text-text-secondary text-xs uppercase">
                  {player.role === 'bowler' ? 'BOWL' : player.role === 'all-rounder' ? 'ALL' : 'BAT'}
                </td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{player.matches || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{player.innings || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-secondary">{formatOvers(player.ballsBowled)}</td>
                <td className="px-3 py-2 text-center font-mono text-text-secondary">{player.runsConceded || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-cricket-accent font-semibold">{player.wickets || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{formatAverage(player.bowlingAvg)}</td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{formatEconomy(player.economy)}</td>
                <td className="px-3 py-2 text-center font-mono text-text-primary">{formatStrikeRate(player.bowlingStrikeRate)}</td>
                <td className="px-3 py-2 text-center font-mono text-trophy-gold font-semibold">{formatBestBowling(player.bestBowling)}</td>
                <td className="px-3 py-2 text-center font-mono text-text-secondary">{player.fourWickets || 0}</td>
                <td className="px-3 py-2 text-center font-mono text-text-secondary">{player.fiveWickets || 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return type === 'batting' ? renderBattingTable() : renderBowlingTable();
};

export default PlayerStatsTable;
