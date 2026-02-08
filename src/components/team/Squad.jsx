/**
 * @file Squad.jsx
 * @description Team squad management page
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Target, TrendingUp, DollarSign, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search, Tag, Activity } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';
import useFinanceStore from '../../stores/financeStore';
import useTransferStore from '../../stores/transferStore';
import { useTransferSystem } from '../../hooks/useTransferSystem';
import PlayerCard from '../shared/PlayerCard';

import PlayerCardModal from '../shared/PlayerCardModal';
import PlayerName from '../shared/PlayerName';
import PlayerStatsTable from './PlayerStatsTable';
import SortableTable from '../shared/SortableTable';
import { getPrimaryBattingRating, getPrimaryBowlingRating, getPrimaryFieldingRating, formatRating } from '../../utils/ratingHelper';
import { getTeamBadge, getTeamBanner } from '../../utils/assetHelpers';
import { ContextualTip, useScreenTip, screenTips } from '../tutorial';

const Squad = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'squad';
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['squad', 'condition', 'team-info', 'statistics'].includes(tabParam)) {
      setSelectedTab(tabParam);
    }
  }, [searchParams]);

  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  // Filter state (sorting now handled by SortableTable)
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [nationalityFilter, setNationalityFilter] = useState('all');

  // Statistics tab state
  const [statsSubTab, setStatsSubTab] = useState('batting');
  const [statsRoleFilter, setStatsRoleFilter] = useState('all');
  const [minQualifying, setMinQualifying] = useState(1);

  // Transfer listing modal state
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedPlayerForListing, setSelectedPlayerForListing] = useState(null);
  const [listingPrice, setListingPrice] = useState('');

  const { getUserTeam } = useTeamStore();
  const players = usePlayerStore(state => state.players);
  const careerStats = usePlayerStore(state => state.careerStats);
  const currentSeasonId = usePlayerStore(state => state.currentSeasonId);
  const { getPlayersByTeam } = usePlayerStore();
  const currentWeek = useGameStore(state => state.currentWeek);
  const getTeamFinances = useFinanceStore(state => state.getTeamFinances);
  const transferWindow = useTransferStore(state => state.transferWindow);
  const { transferHandler, transferMarket, isReady } = useTransferSystem();

  const userTeam = getUserTeam();
  const squadPlayers = userTeam ? getPlayersByTeam(userTeam.id) : [];
  const finances = userTeam ? getTeamFinances(userTeam.id) : null;

  // Tutorial: Screen tip for first-time visitors
  const { shouldShow: showTip, dismiss: dismissTip } = useScreenTip('squad');

  // Check if transfer window is open
  const isTransferWindowOpen = transferWindow?.isOpen && currentWeek >= 22 && currentWeek <= 26;

  // Handle listing player for transfer
  const handleListPlayer = (player) => {
    setSelectedPlayerForListing(player);
    setListingPrice(''); // Reset price
    setShowListingModal(true);
  };

  // Confirm listing
  const confirmListing = () => {
    if (!selectedPlayerForListing || !userTeam || !listingPrice || !transferMarket) return;

    const price = parseFloat(listingPrice) * 1000; // Convert from K to actual value
    if (isNaN(price) || price < 50000) {
      alert('Minimum listing price is $50K');
      return;
    }

    // Ensure backend transfer window is open
    if (!transferMarket.windowOpen && isTransferWindowOpen) {
      console.log('🔓 Opening backend transfer window from Squad page');
      transferMarket.openTransferWindow('offSeason', currentWeek, 14);
    }

    const result = transferHandler.listPlayerForSale(userTeam.id, selectedPlayerForListing.id, price);

    if (result.success) {
      setShowListingModal(false);
      setSelectedPlayerForListing(null);
      setListingPrice('');
      alert('Player listed successfully!');
    } else {
      alert(result.error || 'Failed to list player');
    }
  };

  // Toggle category collapse
  const toggleCategory = (categoryName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Get unique nationalities for filter
  const availableNationalities = useMemo(() => {
    const nationalities = [...new Set(squadPlayers.map(p => p.nationality))].sort();
    return nationalities;
  }, [squadPlayers]);

  // Filtered players (sorting handled by SortableTable)
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

    return result;
  }, [squadPlayers, searchTerm, roleFilter, nationalityFilter]);

  // Calculate squad statistics
  const squadStats = {
    totalPlayers: squadPlayers.length,
    batsmen: squadPlayers.filter(p => p.role === 'batsman').length,
    bowlers: squadPlayers.filter(p => p.role === 'bowler').length,
    allRounders: squadPlayers.filter(p => p.role === 'all-rounder').length,
    wicketKeepers: squadPlayers.filter(p => p.role === 'wicket-keeper').length
  };

  // Prepare batting statistics data
  const battingStats = useMemo(() => {
    if (!currentSeasonId) return [];

    return squadPlayers
      .map(player => {
        const seasonStats = careerStats[player.id]?.seasons[currentSeasonId];

        if (!seasonStats) return null;

        // Calculate total impact
        const totalImpact = seasonStats.totalImpact || 0;

        return {
          playerId: player.id,
          playerName: player.name,
          role: player.role,
          matches: seasonStats.matches || 0,
          innings: seasonStats.matches || 0, // In T20, innings = matches for most players
          runs: seasonStats.runs || 0,
          ballsFaced: seasonStats.ballsFaced || 0,
          battingAvg: seasonStats.battingAvg || 0,
          strikeRate: seasonStats.strikeRate || 0,
          fifties: seasonStats.fifties || 0,
          centuries: seasonStats.centuries || 0,
          highestScore: seasonStats.highestScore || 0,
          highestScoreNotOut: seasonStats.highestScoreNotOut || false,
          notOuts: seasonStats.notOuts || 0,
          battingImpact: seasonStats.battingImpact || 0,
          bowlingImpact: seasonStats.bowlingImpact || 0,
          fieldingImpact: seasonStats.fieldingImpact || 0,
          totalImpact
        };
      })
      .filter(Boolean); // Remove threshold - show all players with stats
  }, [squadPlayers, careerStats, currentSeasonId]);

  // Prepare bowling statistics data
  const bowlingStats = useMemo(() => {
    if (!currentSeasonId) return [];

    return squadPlayers
      .map(player => {
        const seasonStats = careerStats[player.id]?.seasons[currentSeasonId];

        if (!seasonStats) return null;

        // Calculate bowling strike rate
        const bowlingStrikeRate = seasonStats.wickets > 0
          ? Number((seasonStats.ballsBowled / seasonStats.wickets).toFixed(2))
          : 0;

        // Find best bowling figures (this will need to be tracked separately in match updates)
        const bestBowling = seasonStats.bestBowling || null;

        // Calculate 4W hauls (need to track this in match updates)
        const fourWickets = seasonStats.fourWickets || 0;

        // Calculate total impact
        const totalImpact = seasonStats.totalImpact || 0;

        return {
          playerId: player.id,
          playerName: player.name,
          role: player.role,
          matches: seasonStats.matches || 0,
          innings: seasonStats.matches || 0, // In T20, bowling innings = matches for bowlers
          ballsBowled: seasonStats.ballsBowled || 0,
          runsConceded: seasonStats.runsConceded || 0,
          wickets: seasonStats.wickets || 0,
          bowlingAvg: seasonStats.bowlingAvg || 0,
          economy: seasonStats.economy || 0,
          bowlingStrikeRate,
          bestBowling,
          fourWickets,
          fiveWickets: seasonStats.fiveWickets || 0,
          battingImpact: seasonStats.battingImpact || 0,
          bowlingImpact: seasonStats.bowlingImpact || 0,
          fieldingImpact: seasonStats.fieldingImpact || 0,
          totalImpact
        };
      })
      .filter(Boolean); // Remove threshold - show all players with stats
  }, [squadPlayers, careerStats, currentSeasonId]);

  const tabs = [
    { id: 'squad', label: 'Squad Overview', icon: Users },
    { id: 'condition', label: 'Condition', icon: Activity },
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

  const renderSquadOverview = () => {
    // Custom sort for squad overview
    const squadCustomSort = (a, b, column, direction) => {
      let aVal, bVal;

      switch (column) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'battingPlaystyle':
          aVal = getPrimaryBattingRating(a);
          bVal = getPrimaryBattingRating(b);
          break;
        case 'bowlingPlaystyle':
          aVal = getPrimaryBowlingRating(a);
          bVal = getPrimaryBowlingRating(b);
          break;
        case 'fieldingPlaystyle':
          aVal = getPrimaryFieldingRating(a);
          bVal = getPrimaryFieldingRating(b);
          break;
        case 'value':
          aVal = a.soldPrice || 0;
          bVal = b.soldPrice || 0;
          break;
        case 'age':
          aVal = a.age || 0;
          bVal = b.age || 0;
          break;
        default:
          aVal = a[column] || '';
          bVal = b[column] || '';
      }

      if (typeof aVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    };

    // Squad overview columns
    const squadColumns = [
      {
        key: 'name',
        label: 'Player',
        sortKey: 'name',
        render: (player) => <PlayerName playerId={player.id} player={player} className="font-medium" />,
        cellClassName: 'px-3 py-2 font-medium'
      },
      {
        key: 'age',
        label: 'Age',
        sortKey: 'age',
        align: 'center',
        render: (player) => <span className="text-text-secondary">{player.age || '-'}</span>,
        cellClassName: 'px-3 py-2'
      },
      {
        key: 'nationality',
        label: 'Nation',
        sortKey: 'nationality',
        render: (player) => <span className="text-xs">{player.nationality || '-'}</span>,
        headerClassName: 'px-2 py-2 w-16',
        cellClassName: 'px-2 py-2 text-text-secondary'
      },
      {
        key: 'role',
        label: 'Role',
        sortKey: 'role',
        render: (player) => <span className="capitalize">{player.role || '-'}</span>,
        cellClassName: 'px-3 py-2 text-text-secondary'
      },
      {
        key: 'battingHand',
        label: 'Bat Hand',
        sortKey: 'battingHand',
        align: 'center',
        render: (player) => <span className="uppercase">{player.battingHand ? player.battingHand.charAt(0) : '-'}</span>,
        cellClassName: 'px-3 py-2 text-text-secondary'
      },
      {
        key: 'bowlingStyle',
        label: 'Bowling Style',
        sortKey: 'bowlingStyle',
        align: 'center',
        render: (player) => <span className="text-xs">{player.bowlingStyleAbbrev || '-'}</span>,
        cellClassName: 'px-3 py-2 text-text-secondary'
      },
      {
        key: 'battingPlaystyle',
        label: 'Batting Playstyle',
        sortKey: 'battingPlaystyle',
        render: (player) => (
          <div className="flex flex-col">
            <span className="text-text-secondary text-xs truncate">{player.primaryPlaystyle?.batting || '-'}</span>
            <span className="text-cricket-accent text-xs font-mono">{formatRating(getPrimaryBattingRating(player))}</span>
          </div>
        ),
        cellClassName: 'px-3 py-2'
      },
      {
        key: 'bowlingPlaystyle',
        label: 'Bowling Playstyle',
        sortKey: 'bowlingPlaystyle',
        render: (player) => (
          <div className="flex flex-col">
            <span className="text-text-secondary text-xs truncate">{player.primaryPlaystyle?.bowling || '-'}</span>
            <span className="text-cricket-accent text-xs font-mono">{formatRating(getPrimaryBowlingRating(player))}</span>
          </div>
        ),
        cellClassName: 'px-3 py-2'
      },
      {
        key: 'fieldingPlaystyle',
        label: 'Fielding Playstyle',
        sortKey: 'fieldingPlaystyle',
        render: (player) => (
          <div className="flex flex-col">
            <span className="text-text-secondary text-xs truncate">{player.primaryPlaystyle?.fielding || '-'}</span>
            <span className="text-cricket-accent text-xs font-mono">{formatRating(getPrimaryFieldingRating(player))}</span>
          </div>
        ),
        cellClassName: 'px-3 py-2'
      },
      {
        key: 'value',
        label: 'Value',
        sortKey: 'value',
        align: 'right',
        render: (player) => (
          <span className="font-mono text-trophy-gold">
            {player.soldPrice ? (
              player.soldPrice >= 1000000
                ? `$${(player.soldPrice / 1000000).toFixed(1)}M`
                : `$${(player.soldPrice / 1000).toFixed(0)}K`
            ) : '$0K'}
          </span>
        ),
        cellClassName: 'px-3 py-2'
      }
    ];

    // Add actions column if transfer window is open
    if (isTransferWindowOpen) {
      squadColumns.push({
        key: 'actions',
        label: 'Actions',
        sortKey: 'id',
        sortable: false,
        align: 'center',
        render: (player) => (
          <button
            onClick={() => handleListPlayer(player)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-cricket-accent hover:bg-cricket-accent-dark text-white rounded transition-colors mx-auto"
          >
            <Tag className="w-3 h-3" />
            <span>List</span>
          </button>
        ),
        cellClassName: 'px-3 py-2'
      });
    }

    // Filter component
    const filterComponent = (
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
    );

    // Empty state
    const emptyState = (
      <tr>
        <td colSpan={squadColumns.length} className="px-3 py-12">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">No Players in Squad</h3>
            <p className="text-text-secondary mb-4 text-sm">
              Your squad is empty. Visit the Transfers section to build your team through the auction.
            </p>
            <button className="btn-primary">Go to Transfers</button>
          </div>
        </td>
      </tr>
    );

    return (
      <div className="space-y-2">
        {/* Wrapped SortableTable with banner background */}
        <div className="relative">
          {/* Banner Background */}
          {squadPlayers.length > 0 && (
            <div
              className="absolute inset-0 opacity-70 rounded-lg pointer-events-none"
              style={{
                backgroundImage: `url(${getTeamBanner(userTeam.id)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}

          <div className="relative">
            <SortableTable
              data={filteredSortedPlayers}
              columns={squadColumns}
              defaultSort={{ column: 'name', direction: 'asc' }}
              customSort={squadCustomSort}
              filterComponent={filterComponent}
              emptyState={emptyState}
              tableClassName="bg-bg-primary/95"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTeamInfo = () => (
    <div className="space-y-2">
      {/* Squad Composition */}
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
        {finances && (
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
                    ${(finances.totalExpenses / 1000000).toFixed(1)}M / ${((finances.initialBudget + finances.totalRevenue) / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                  <div
                    className="bg-cricket-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${((finances.totalExpenses / (finances.initialBudget + finances.totalRevenue)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Available Budget:</span>
                  <span className="text-status-win font-mono">${(finances.currentBudget / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Squad Size:</span>
                  <span className="text-text-primary font-mono">{squadStats.totalPlayers}/25</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStatistics = () => {
    // Check if any stats exist
    const hasStats = currentSeasonId && (battingStats.length > 0 || bowlingStats.length > 0);

    if (!hasStats) {
      return (
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
    }

    return (
      <div className="space-y-2">
        {/* Sub-tabs for Batting/Bowling */}
        <div className="flex items-center gap-2 border-b border-border-primary pb-2">
          <button
            onClick={() => setStatsSubTab('batting')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${statsSubTab === 'batting'
              ? 'bg-cricket-accent text-cricket-primary'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
              }`}
          >
            Batting Statistics
          </button>
          <button
            onClick={() => setStatsSubTab('bowling')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${statsSubTab === 'bowling'
              ? 'bg-cricket-accent text-cricket-primary'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
              }`}
          >
            Bowling Statistics
          </button>
        </div>

        {/* Filters */}
        <div className="card p-2">
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-text-secondary">Filter by:</label>

            {/* Role Filter */}
            <select
              value={statsRoleFilter}
              onChange={(e) => setStatsRoleFilter(e.target.value)}
              className="px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
            >
              <option value="all">All Roles</option>
              {statsSubTab === 'batting' ? (
                <>
                  <option value="batsmen">Batsmen & WKs</option>
                  <option value="all-rounders">All-Rounders</option>
                </>
              ) : (
                <>
                  <option value="bowlers">Bowlers</option>
                  <option value="all-rounders">All-Rounders</option>
                </>
              )}
            </select>

            {/* Minimum Qualifying */}
            <label className="text-xs text-text-secondary ml-4">
              {statsSubTab === 'batting' ? 'Min. Matches:' : 'Min. Overs:'}
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={minQualifying}
              onChange={(e) => setMinQualifying(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:border-cricket-accent"
            />

            <div className="ml-auto text-xs text-text-secondary">
              {statsSubTab === 'batting'
                ? `${battingStats.length} player${battingStats.length !== 1 ? 's' : ''} with batting stats`
                : `${bowlingStats.length} player${bowlingStats.length !== 1 ? 's' : ''} with bowling stats`
              }
            </div>
          </div>
        </div>

        {/* Statistics Table */}
        {statsSubTab === 'batting' && (
          <PlayerStatsTable
            players={battingStats}
            type="batting"
            roleFilter={statsRoleFilter}
            minQualifying={minQualifying}
          />
        )}
        {statsSubTab === 'bowling' && (
          <PlayerStatsTable
            players={bowlingStats}
            type="bowling"
            roleFilter={statsRoleFilter}
            minQualifying={minQualifying}
          />
        )}
      </div>
    );
  };

  // Helper function to get condition bar color
  const getConditionBarColor = (value, type = 'default') => {
    if (type === 'fatigue') {
      // Fatigue always shows red
      return 'bg-status-loss';
    }
    // For fitness, form, etc. - high is good
    if (value >= 70) return 'bg-status-win';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-status-loss';
  };

  // Helper function to format injury status
  const formatInjury = (injury) => {
    if (!injury) return { text: 'Fit', isInjured: false };
    return { text: injury, isInjured: true };
  };

  // Count injured players
  const injuredCount = useMemo(() => {
    return squadPlayers.filter(p => p.condition?.injury).length;
  }, [squadPlayers]);

  // Custom sort function for condition table
  const conditionCustomSort = (a, b, column, direction) => {
    const aCondition = a.condition || {};
    const bCondition = b.condition || {};

    if (column === 'name') {
      const aVal = a.name.toLowerCase();
      const bVal = b.name.toLowerCase();
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (column === 'injury') {
      // Injured players first when descending
      const aVal = aCondition.injury ? 1 : 0;
      const bVal = bCondition.injury ? 1 : 0;
      if (aVal !== bVal) {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (aVal === 1) {
        // Both injured - sort by duration
        const aDur = aCondition.injuryDuration ?? 0;
        const bDur = bCondition.injuryDuration ?? 0;
        return direction === 'asc' ? aDur - bDur : bDur - aDur;
      }
      // Both not injured - sort by fatigue, then fitness
      const aFatigue = aCondition.fatigue ?? 0;
      const bFatigue = bCondition.fatigue ?? 0;
      if (aFatigue !== bFatigue) {
        return direction === 'asc' ? aFatigue - bFatigue : bFatigue - aFatigue;
      }
      const aFitness = aCondition.fitness ?? 85;
      const bFitness = bCondition.fitness ?? 85;
      return direction === 'asc' ? bFitness - aFitness : aFitness - bFitness;
    }

    // Default numeric sorting for other columns
    const aVal = aCondition[column] ?? (column === 'fitness' ? 85 : 50);
    const bVal = bCondition[column] ?? (column === 'fitness' ? 85 : 50);
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  };

  // Row class generator for injured players
  const getConditionRowClassName = (player) => {
    const injuryInfo = formatInjury(player.condition?.injury);
    return injuryInfo.isInjured ? 'bg-status-loss/10' : '';
  };

  const renderCondition = () => {
    // Condition bar render helper
    const renderConditionBar = (value, type = 'default') => (
      <div className="flex flex-col items-center">
        <span className="text-xs font-mono mb-1">{Math.round(value)}</span>
        <div className="w-14 h-1.5 bg-bg-tertiary rounded-full">
          <div
            className={`h-full rounded-full ${getConditionBarColor(value, type)}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    );

    // Columns definition for condition table
    const conditionColumns = [
      {
        key: 'name',
        label: 'Player',
        sortKey: 'name',
        render: (player) => {
          const injuryInfo = formatInjury(player.condition?.injury);
          return (
            <PlayerName
              playerId={player.id}
              player={player}
              className={`font-medium ${injuryInfo.isInjured ? 'text-status-loss' : ''}`}
            />
          );
        },
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5 font-medium'
      },
      {
        key: 'role',
        label: 'Role',
        sortKey: 'role',
        sortable: false,
        render: (player) => <span className="capitalize text-xs">{player.role || '-'}</span>,
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5 text-text-secondary'
      },
      {
        key: 'fitness',
        label: 'Fitness',
        sortKey: 'fitness',
        defaultDirection: 'desc',
        align: 'center',
        render: (player) => renderConditionBar(player.condition?.fitness ?? 85),
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5'
      },
      {
        key: 'form',
        label: 'Form',
        sortKey: 'form',
        defaultDirection: 'desc',
        align: 'center',
        render: (player) => renderConditionBar(player.condition?.form ?? 50),
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5'
      },
      {
        key: 'fatigue',
        label: 'Fatigue',
        sortKey: 'fatigue',
        defaultDirection: 'desc',
        align: 'center',
        render: (player) => renderConditionBar(player.condition?.fatigue ?? 0, 'fatigue'),
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5'
      },
      {
        key: 'morale',
        label: 'Morale',
        sortKey: 'morale',
        defaultDirection: 'desc',
        align: 'center',
        render: (player) => renderConditionBar(player.condition?.morale ?? 50),
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5'
      },
      {
        key: 'injury',
        label: 'Injury Status',
        sortKey: 'injury',
        defaultDirection: 'desc',
        align: 'center',
        render: (player) => {
          const injuryInfo = formatInjury(player.condition?.injury);
          return (
            <span className={`text-xs font-medium ${injuryInfo.isInjured ? 'text-status-loss bg-status-loss/20 px-2 py-1 rounded' : 'text-status-win'}`}>
              {injuryInfo.text}
            </span>
          );
        },
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5'
      },
      {
        key: 'injuryDuration',
        label: 'Injury Duration',
        sortKey: 'injuryDuration',
        defaultDirection: 'desc',
        align: 'center',
        render: (player) => {
          const duration = player.condition?.injuryDuration;
          return duration ? (
            <span className="text-xs font-medium text-status-loss">
              {duration} day{duration > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-text-tertiary">-</span>
          );
        },
        headerClassName: 'px-4 py-2.5',
        cellClassName: 'px-4 py-2.5'
      }
    ];

    return (
      <div className="space-y-2">
        {/* Condition Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-status-win">{squadPlayers.filter(p => (p.condition?.fitness ?? 85) >= 70).length}</div>
            <div className="text-text-secondary text-xs">Match Fit</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-yellow-500">{squadPlayers.filter(p => (p.condition?.fitness ?? 85) >= 40 && (p.condition?.fitness ?? 85) < 70).length}</div>
            <div className="text-text-secondary text-xs">Moderate Fitness</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-status-loss">{squadPlayers.filter(p => (p.condition?.fitness ?? 85) < 40).length}</div>
            <div className="text-text-secondary text-xs">Low Fitness</div>
          </div>
          <div className="card p-2 text-center border-2 border-status-loss">
            <div className="text-2xl font-bold text-status-loss">{injuredCount}</div>
            <div className="text-text-secondary text-xs">Injured</div>
          </div>
        </div>

        {/* Condition Table */}
        <SortableTable
          data={squadPlayers}
          columns={conditionColumns}
          defaultSort={{ column: 'injury', direction: 'desc' }}
          customSort={conditionCustomSort}
          getRowClassName={getConditionRowClassName}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Team Squad</h1>
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
                  className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${selectedTab === tab.id
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

        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'squad' && renderSquadOverview()}
      {selectedTab === 'condition' && renderCondition()}
      {selectedTab === 'team-info' && renderTeamInfo()}
      {selectedTab === 'statistics' && renderStatistics()}



      {/* Player Card Modal */}
      <PlayerCardModal
        isOpen={showPlayerModal}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayerId(null);
        }}
        playerId={selectedPlayerId}
      />

      {/* List for Transfer Modal */}
      {showListingModal && selectedPlayerForListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-4 max-w-md w-full">
            <h3 className="text-lg font-bold text-text-primary mb-3">List Player for Transfer</h3>

            <div className="mb-4">
              <div className="text-sm text-text-secondary mb-2">Player:</div>
              <div className="text-base font-semibold text-text-primary">{selectedPlayerForListing.name}</div>
              <div className="text-xs text-text-tertiary mt-1">{selectedPlayerForListing.role} • ${selectedPlayerForListing.auctionValue?.toFixed(1)}M Value</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-text-secondary mb-2">Asking Price (in $K)</label>
              <input
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="e.g. 500 for $500K"
                min="50"
                className="w-full card border border-border-primary px-3 py-2 text-text-primary focus:outline-none focus:border-cricket-accent"
              />
              <div className="text-xs text-text-tertiary mt-1">Minimum: $50K</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmListing}
                disabled={!listingPrice || parseFloat(listingPrice) < 50}
                className="flex-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Listing
              </button>
              <button
                onClick={() => {
                  setShowListingModal(false);
                  setSelectedPlayerForListing(null);
                  setListingPrice('');
                }}
                className="flex-1 card border border-border-primary text-text-secondary hover:text-text-primary py-2 rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Tip for first visit */}
      {showTip && (
        <ContextualTip
          title={screenTips.squad.title}
          icon={screenTips.squad.icon}
          tips={screenTips.squad.tips}
          onDismiss={dismissTip}
        />
      )}
    </div>
  );
};

export default Squad;