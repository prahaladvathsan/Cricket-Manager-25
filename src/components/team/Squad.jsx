/**
 * @file Squad.jsx
 * @description Team squad management page
 */

import React, { useState, useMemo } from 'react';
import { Users, Target, TrendingUp, DollarSign, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import PlayerCard from '../shared/PlayerCard';
import SetTacticsModal from '../tactics/SetTacticsModal';
import PlayerCardModal from '../shared/PlayerCardModal';
import PlayerName from '../shared/PlayerName';
import { getPrimaryBattingRating, getPrimaryBowlingRating, formatRating } from '../../utils/ratingHelper';

const Squad = () => {
  const [selectedTab, setSelectedTab] = useState('squad');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [showTacticsModal, setShowTacticsModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [nationalityFilter, setNationalityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const { getUserTeam } = useTeamStore();
  const { getPlayersByTeam } = usePlayerStore();

  const userTeam = getUserTeam();
  const squadPlayers = userTeam ? getPlayersByTeam(userTeam.id) : [];

  // Toggle category collapse
  const toggleCategory = (categoryName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Handle table sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Get unique nationalities for filter
  const availableNationalities = useMemo(() => {
    const nationalities = [...new Set(squadPlayers.map(p => p.nationality))].sort();
    return nationalities;
  }, [squadPlayers]);

  // Filtered and sorted players
  const filteredSortedPlayers = useMemo(() => {
    let result = [...squadPlayers];

    // Apply filters
    if (searchTerm) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter(p => p.role === roleFilter);
    }

    if (nationalityFilter !== 'all') {
      result = result.filter(p => p.nationality === nationalityFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'age':
          aVal = a.age || 0;
          bVal = b.age || 0;
          break;
        case 'nationality':
          aVal = a.nationality || '';
          bVal = b.nationality || '';
          break;
        case 'role':
          aVal = a.role || '';
          bVal = b.role || '';
          break;
        case 'battingHand':
          aVal = a.battingHand || '';
          bVal = b.battingHand || '';
          break;
        case 'bowlingStyle':
          aVal = a.bowlingStyle || '';
          bVal = b.bowlingStyle || '';
          break;
        case 'battingPlaystyle':
          aVal = getPrimaryBattingRating(a);
          bVal = getPrimaryBattingRating(b);
          break;
        case 'bowlingPlaystyle':
          aVal = getPrimaryBowlingRating(a);
          bVal = getPrimaryBowlingRating(b);
          break;
        case 'value':
          aVal = a.auctionValue || 0;
          bVal = b.auctionValue || 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return result;
  }, [squadPlayers, searchTerm, roleFilter, nationalityFilter, sortBy, sortDirection]);

  // Calculate squad statistics
  const squadStats = {
    totalPlayers: squadPlayers.length,
    batsmen: squadPlayers.filter(p => p.role === 'batsman').length,
    bowlers: squadPlayers.filter(p => p.role === 'bowler').length,
    allRounders: squadPlayers.filter(p => p.role === 'all-rounder').length,
    wicketKeepers: squadPlayers.filter(p => p.role === 'wicket-keeper').length
  };

  const tabs = [
    { id: 'squad', label: 'Squad Overview', icon: Users },
    { id: 'team-info', label: 'Team Info', icon: Target },
    { id: 'statistics', label: 'Statistics', icon: TrendingUp }
  ];

  if (!userTeam) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-text-primary">Squad</h1>
        <div className="card p-6">
          <p className="text-text-secondary">Please select a team first to view squad details.</p>
        </div>
      </div>
    );
  }

  // Sort indicator component
  const SortIndicator = ({ column }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const renderSquadOverview = () => (
    <div className="space-y-2">
      {/* Squad Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <div className="card p-2 text-center">
          <div className="text-2xl font-bold text-text-primary">{squadStats.totalPlayers}</div>
          <div className="text-text-secondary text-xs">Total Players</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-2xl font-bold text-text-primary">{squadStats.batsmen}</div>
          <div className="text-text-secondary text-xs">Batsmen</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-2xl font-bold text-text-primary">{squadStats.bowlers}</div>
          <div className="text-text-secondary text-xs">Bowlers</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-2xl font-bold text-text-primary">{squadStats.allRounders}</div>
          <div className="text-text-secondary text-xs">All-Rounders</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-2xl font-bold text-text-primary">{squadStats.wicketKeepers}</div>
          <div className="text-text-secondary text-xs">Keepers</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-2">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
          >
            <option value="all">All Roles</option>
            <option value="batsman">Batsman</option>
            <option value="bowler">Bowler</option>
            <option value="all-rounder">All-Rounder</option>
            <option value="wicket-keeper">Wicket-Keeper</option>
          </select>

          {/* Nationality Filter */}
          <select
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
          >
            <option value="all">All Nationalities</option>
            {availableNationalities.map(nat => (
              <option key={nat} value={nat}>{nat}</option>
            ))}
          </select>

          {/* Results count */}
          <div className="flex items-center px-3 text-xs text-text-secondary">
            Showing {filteredSortedPlayers.length} of {squadPlayers.length} players
          </div>
        </div>
      </div>

      {/* Squad Table */}
      {squadPlayers.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Players in Squad</h3>
          <p className="text-text-secondary mb-4 text-sm">
            Your squad is empty. Visit the Transfers section to build your team through the auction.
          </p>
          <button className="btn-primary">Go to Transfers</button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary">
                <th
                  onClick={() => handleSort('name')}
                  className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Player <SortIndicator column="name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('age')}
                  className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    Age <SortIndicator column="age" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nationality')}
                  className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Nation <SortIndicator column="nationality" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Role <SortIndicator column="role" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('battingHand')}
                  className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    Bat <SortIndicator column="battingHand" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('bowlingStyle')}
                  className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Bowling <SortIndicator column="bowlingStyle" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('battingPlaystyle')}
                  className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Batting Playstyle <SortIndicator column="battingPlaystyle" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('bowlingPlaystyle')}
                  className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Bowling Playstyle <SortIndicator column="bowlingPlaystyle" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('value')}
                  className="px-3 py-2 text-right font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Value <SortIndicator column="value" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSortedPlayers.map((player, idx) => (
                <tr
                  key={player.id}
                  className={`border-b border-border-primary hover:bg-bg-tertiary transition-colors ${
                    idx % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'
                  }`}
                >
                  <td className="px-3 py-2 font-medium">
                    <PlayerName playerId={player.id} player={player} className="font-medium" />
                  </td>
                  <td className="px-3 py-2 text-center text-text-secondary">{player.age || '-'}</td>
                  <td className="px-3 py-2 text-text-secondary">{player.nationality || '-'}</td>
                  <td className="px-3 py-2 text-text-secondary capitalize">{player.role || '-'}</td>
                  <td className="px-3 py-2 text-center text-text-secondary uppercase">{player.battingHand ? player.battingHand.charAt(0) : '-'}</td>
                  <td className="px-3 py-2 text-text-secondary text-xs">{player.bowlingStyle || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs truncate">{player.primaryPlaystyle?.batting || '-'}</span>
                      <span className="text-cricket-accent text-xs font-mono">{formatRating(getPrimaryBattingRating(player))}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs truncate">{player.primaryPlaystyle?.bowling || '-'}</span>
                      <span className="text-cricket-accent text-xs font-mono">{formatRating(getPrimaryBowlingRating(player))}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-trophy-gold">
                    ₹{player.auctionValue ? player.auctionValue.toFixed(1) : '0.0'} Cr
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTeamInfo = () => (
    <div className="space-y-2">
      {/* Team Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className="card p-2">
          <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
            <Target className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Team Information</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-full border-2"
                style={{ backgroundColor: userTeam.colors.primary, borderColor: userTeam.colors.secondary }}
              />
              <div>
                <div className="font-medium text-text-primary">{userTeam.name}</div>
                <div className="text-xs text-text-secondary">{userTeam.shortName}</div>
              </div>
            </div>
            <div className="pt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Head Coach:</span>
                <span className="text-text-primary">{userTeam.coachName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Home Venue:</span>
                <span className="text-text-primary">{userTeam.homeVenue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="card p-2">
          <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
            <DollarSign className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Financial Overview</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Budget Used</span>
                <span className="text-text-primary font-mono">
                  ₹{userTeam.finances.usedCap} / ₹{userTeam.finances.salaryCap} Cr
                </span>
              </div>
              <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                <div
                  className="bg-cricket-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${(userTeam.finances.usedCap / userTeam.finances.salaryCap) * 100}%` }}
                />
              </div>
            </div>
            <div className="pt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Available Budget:</span>
                <span className="text-status-win font-mono">₹{userTeam.finances.remainingBudget} Cr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Squad Size:</span>
                <span className="text-text-primary font-mono">{squadStats.totalPlayers}/25</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-4">
      <div className="card p-2">
        <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
          <TrendingUp className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-lg font-semibold text-text-primary">Season Statistics</h3>
        </div>
        <p className="text-text-secondary text-sm">
          Detailed statistics will be available once matches begin.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Tab Navigation */}
      <div className="border-b border-border-primary">
        <nav className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? 'border-cricket-accent text-cricket-accent'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex space-x-2 pb-2">
            <button
              className="btn-secondary text-sm px-3 py-1.5"
              onClick={() => setShowTacticsModal(true)}
            >
              Set Tactics
            </button>
            <button className="btn-primary text-sm px-3 py-1.5">Manage Squad</button>
          </div>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'squad' && renderSquadOverview()}
      {selectedTab === 'team-info' && renderTeamInfo()}
      {selectedTab === 'statistics' && renderStatistics()}

      {/* Set Tactics Modal */}
      <SetTacticsModal
        isOpen={showTacticsModal}
        onClose={() => setShowTacticsModal(false)}
        teamId={userTeam?.id}
      />

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

export default Squad;