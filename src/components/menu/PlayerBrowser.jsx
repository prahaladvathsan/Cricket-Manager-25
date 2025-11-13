/**
 * @file PlayerBrowser.jsx
 * @description Browse and search all 545 players
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  User,
  TrendingUp,
  Activity
} from 'lucide-react';
import PlayerName from '../shared/PlayerName';

const PlayerBrowser = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    nationality: 'all',
    battingStyle: 'all',
    bowlingType: 'all'
  });
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, sortBy, players]);

  const loadPlayers = async () => {
    try {
      const playersModule = await import('../../data/players/master_player_database.json');
      setPlayers(playersModule.default.players || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading players:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...players];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.fullName?.toLowerCase().includes(search)
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(p => p.role === filters.role);
    }

    // Nationality filter
    if (filters.nationality !== 'all') {
      filtered = filtered.filter(p => p.nationality === filters.nationality);
    }

    // Batting style filter
    if (filters.battingStyle !== 'all') {
      filtered = filtered.filter(p => p.battingStyle === filters.battingStyle);
    }

    // Bowling type filter
    if (filters.bowlingType !== 'all') {
      filtered = filtered.filter(p => p.bowlingType === filters.bowlingType);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'age':
        filtered.sort((a, b) => a.age - b.age);
        break;
      case 'overall':
        filtered.sort((a, b) => (b.overall || 0) - (a.overall || 0));
        break;
      default:
        break;
    }

    setFilteredPlayers(filtered);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Batsman': return 'text-blue-400';
      case 'Bowler': return 'text-red-400';
      case 'All-Rounder': return 'text-green-400';
      case 'Wicket-Keeper': return 'text-yellow-400';
      default: return 'text-cricket-text-secondary';
    }
  };

  // Get unique values for filters
  const uniqueRoles = [...new Set(players.map(p => p.role))];
  const uniqueNationalities = [...new Set(players.map(p => p.nationality))].sort();
  const uniqueBattingStyles = [...new Set(players.map(p => p.battingStyle))].sort();
  const uniqueBowlingTypes = [...new Set(players.map(p => p.bowlingType).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-cricket-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-primary mx-auto mb-4"></div>
          <p className="text-cricket-text-primary">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cricket-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>
          <h1 className="text-3xl font-bold text-cricket-text-primary">
            Player Database
          </h1>
          <div className="text-sm text-cricket-text-secondary">
            {filteredPlayers.length} / {players.length} players
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cricket-text-secondary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search players..."
                  className="w-full pl-10 pr-4 py-2 bg-cricket-secondary border border-cricket-primary/30 rounded text-cricket-text-primary placeholder-cricket-text-secondary focus:outline-none focus:border-cricket-primary"
                />
              </div>
            </div>

            {/* Role Filter */}
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="px-3 py-2 bg-cricket-secondary border border-cricket-primary/30 rounded text-cricket-text-primary focus:outline-none focus:border-cricket-primary"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            {/* Nationality Filter */}
            <select
              value={filters.nationality}
              onChange={(e) => setFilters({ ...filters, nationality: e.target.value })}
              className="px-3 py-2 bg-cricket-secondary border border-cricket-primary/30 rounded text-cricket-text-primary focus:outline-none focus:border-cricket-primary"
            >
              <option value="all">All Nations</option>
              {uniqueNationalities.map(nat => (
                <option key={nat} value={nat}>{nat}</option>
              ))}
            </select>

            {/* Batting Style Filter */}
            <select
              value={filters.battingStyle}
              onChange={(e) => setFilters({ ...filters, battingStyle: e.target.value })}
              className="px-3 py-2 bg-cricket-secondary border border-cricket-primary/30 rounded text-cricket-text-primary focus:outline-none focus:border-cricket-primary"
            >
              <option value="all">All Batting</option>
              {uniqueBattingStyles.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-cricket-secondary border border-cricket-primary/30 rounded text-cricket-text-primary focus:outline-none focus:border-cricket-primary"
            >
              <option value="name">Sort: Name</option>
              <option value="age">Sort: Age</option>
              <option value="overall">Sort: Overall</option>
            </select>
          </div>
        </div>

        {/* Players Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cricket-secondary border-b border-cricket-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cricket-text-secondary uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cricket-text-secondary uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cricket-text-secondary uppercase tracking-wider">
                    Nation
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-cricket-text-secondary uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cricket-text-secondary uppercase tracking-wider">
                    Batting
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cricket-text-secondary uppercase tracking-wider">
                    Bowling
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cricket-text-secondary uppercase tracking-wider">
                    Primary Playstyle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cricket-secondary">
                {filteredPlayers.slice(0, 100).map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-cricket-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-cricket-text-secondary" />
                        <div>
                          <div className="font-semibold">
                            <PlayerName playerId={player.id} player={player} className="font-semibold" />
                          </div>
                          <div className="text-xs text-cricket-text-secondary">
                            {player.fullName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${getRoleColor(player.role)}`}>
                        {player.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cricket-text-primary">
                      {player.nationality}
                    </td>
                    <td className="px-4 py-3 text-center text-cricket-text-primary">
                      {player.age}
                    </td>
                    <td className="px-4 py-3 text-cricket-text-secondary text-sm">
                      {player.battingStyle}
                    </td>
                    <td className="px-4 py-3 text-cricket-text-secondary text-sm">
                      {player.bowlingType || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs">
                        {player.primaryPlaystyle?.batting && (
                          <span className="text-blue-400">
                            {player.primaryPlaystyle.batting}
                          </span>
                        )}
                        {player.primaryPlaystyle?.bowling && (
                          <span className="text-red-400">
                            {player.primaryPlaystyle.bowling}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPlayers.length > 100 && (
            <div className="p-4 bg-cricket-secondary/50 text-center text-sm text-cricket-text-secondary">
              Showing first 100 of {filteredPlayers.length} players. Use filters to narrow down results.
            </div>
          )}

          {filteredPlayers.length === 0 && (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-cricket-text-secondary mx-auto mb-3 opacity-50" />
              <p className="text-cricket-text-primary font-semibold">No players found</p>
              <p className="text-cricket-text-secondary text-sm mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerBrowser;
