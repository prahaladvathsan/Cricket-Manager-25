/**
 * @file PlayerBrowser.jsx
 * @description Data-dense spreadsheet browser for all 376 players with advanced filtering, sorting, and toggleable columns
 * 10 default columns + 65 toggleable columns (16 batting + 8 bowling + 1 fielding playstyles + 40 attributes) = 75 total
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Columns
} from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import CricketBallSpinner from '../shared/CricketBallSpinner';
import { getPrimaryBattingRating, getPrimaryBowlingRating } from '../../utils/ratingHelper';
import usePlayerStore from '../../stores/playerStore';
import '../../styles/wallpaper.css';

// Column group definitions
const COLUMN_GROUPS = {
  battingPlaystyles: [
    'Opener - Slogger', 'Opener - Balanced', 'Opener - Anchor',
    'Top Order - Slogger', 'Top Order - Balanced', 'Top Order - Anchor',
    'Middle Order - Slogger', 'Middle Order - Balanced', 'Middle Order - Anchor',
    'Lower Order - Slogger', 'Lower Order - Balanced', 'Lower Order - Anchor',
    'Finisher', 'Runner', 'Pinch-Hitter', 'Wall'
  ],
  bowlingPlaystyles: [
    'Swing Bowler', 'Hit-the-Deck Seamer', 'Short-Ball Specialist', 'Death Specialist',
    'Classical Spinner', 'Flat Spinner', 'Mystery Spinner', 'Containment Spinner'
  ],
  fieldingPlaystyles: [
    'Wicketkeeper'
  ],
  battingAttributes: [
    { key: 'technique', label: 'Tech' },
    { key: 'timing', label: 'Timing' },
    { key: 'footwork', label: 'Ftwk' },
    { key: 'placement', label: 'Place' },
    { key: 'range360', label: '360°' },
    { key: 'defensiveShots', label: 'Def' },
    { key: 'neutralShots', label: 'Neut' },
    { key: 'attackingShots', label: 'Atk' },
    { key: 'vsPace', label: 'vPace' },
    { key: 'vsSpin', label: 'vSpin' },
    { key: 'creativity', label: 'Creat' }
  ],
  bowlingAttributes: [
    { key: 'accuracy', label: 'Acc' },
    { key: 'bowlingSpeed', label: 'Speed' },
    { key: 'swing', label: 'Swing' },
    { key: 'turn', label: 'Turn' },
    { key: 'flight', label: 'Flight' },
    { key: 'variations', label: 'Var' },
    { key: 'intelligence', label: 'IQ' },
    { key: 'defensiveBowling', label: 'Def' },
    { key: 'neutralBowling', label: 'Neut' },
    { key: 'attackingBowling', label: 'Atk' }
  ],
  physicalAttributes: [
    { key: 'strength', label: 'Str' },
    { key: 'speed', label: 'Spd' },
    { key: 'agility', label: 'Agi' },
    { key: 'maxFitness', label: 'Fit' },
    { key: 'endurance', label: 'End' },
    { key: 'stamina', label: 'Stam' }
  ],
  mentalAttributes: [
    { key: 'concentration', label: 'Conc' },
    { key: 'temperament', label: 'Temp' },
    { key: 'aggression', label: 'Agg' },
    { key: 'judgement', label: 'Judg' },
    { key: 'leadership', label: 'Lead' }
  ],
  fieldingAttributes: [
    { key: 'catching', label: 'Catch' },
    { key: 'reflexes', label: 'Reflex' },
    { key: 'groundFielding', label: 'Ground' },
    { key: 'throwPower', label: 'ThwPow' },
    { key: 'throwAccuracy', label: 'ThwAcc' },
    { key: 'keeping', label: 'Keep' },
    { key: 'collecting', label: 'Collect' },
    { key: 'stumping', label: 'Stump' }
  ]
};

const PlayerBrowser = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs for scroll sync
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableContainerRef = useRef(null);

  // State for fixed positioning
  const [isScrollbarFixed, setIsScrollbarFixed] = useState(false);
  const [tablePosition, setTablePosition] = useState({ left: 0, width: 0 });
  const fixedHeaderRef = useRef(null);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    roles: [],
    battingHand: 'all',
    bowlingType: 'all',
    battingRange: [0, 100],
    bowlingRange: [0, 100],
    ageRange: [18, 40],
    nationalities: [],
    playstyles: { batting: [], bowling: [] }
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState({ column: 'name', direction: 'asc' });

  // UI state
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    default: true,
    battingPlaystyles: false,
    bowlingPlaystyles: false,
    fieldingPlaystyles: false,
    battingAttributes: false,
    bowlingAttributes: false,
    physicalAttributes: false,
    mentalAttributes: false,
    fieldingAttributes: false
  });

  // Get players from store (already loaded by App.jsx via web worker)
  const { players: playersFromStore } = usePlayerStore();

  // Load players when store is populated
  useEffect(() => {
    if (playersFromStore && playersFromStore.length > 0) {
      loadPlayers();
    }
  }, [playersFromStore]);

  // Handle scroll to make scrollbar and headers fixed
  useEffect(() => {
    const handleScroll = () => {
      if (tableContainerRef.current && tableScrollRef.current) {
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        const tableRect = tableScrollRef.current.getBoundingClientRect();
        const shouldBeFixed = containerRect.top <= 0;

        setIsScrollbarFixed(shouldBeFixed);

        if (shouldBeFixed) {
          setTablePosition({
            left: tableRect.left,
            width: tableRect.width
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Sync scroll between top and bottom scrollbars and fixed header
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;

    if (!topScroll || !tableScroll) return;

    // Set the scroll width of top scroller to match table
    const updateScrollWidth = () => {
      const scrollWidth = tableScroll.scrollWidth;
      topScroll.firstChild.style.width = `${scrollWidth}px`;
    };

    updateScrollWidth();

    // Sync scroll positions
    const handleTopScroll = () => {
      if (tableScroll.scrollLeft !== topScroll.scrollLeft) {
        tableScroll.scrollLeft = topScroll.scrollLeft;
      }
      // Also sync fixed header
      if (isScrollbarFixed && fixedHeaderRef.current && fixedHeaderRef.current.scrollLeft !== topScroll.scrollLeft) {
        fixedHeaderRef.current.scrollLeft = topScroll.scrollLeft;
      }
    };

    const handleTableScroll = () => {
      if (topScroll.scrollLeft !== tableScroll.scrollLeft) {
        topScroll.scrollLeft = tableScroll.scrollLeft;
      }

      // Sync fixed header scroll
      if (isScrollbarFixed && fixedHeaderRef.current) {
        fixedHeaderRef.current.scrollLeft = tableScroll.scrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    tableScroll.addEventListener('scroll', handleTableScroll);

    // Update scroll width when players or columns change
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableScroll.firstChild) {
      resizeObserver.observe(tableScroll.firstChild);
    }

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      tableScroll.removeEventListener('scroll', handleTableScroll);
      resizeObserver.disconnect();
    };
  }, [players, visibleColumns, isScrollbarFixed]);

  const loadPlayers = () => {
    // Use already-loaded data from playerStore (no re-fetch needed)
    setPlayers(playersFromStore || []);
    setLoading(false);
  };

  // Multi-field search function
  const searchPlayer = (player, searchTerm) => {
    const term = searchTerm.toLowerCase();
    return (
      player.name.toLowerCase().includes(term) ||
      player.fullName?.toLowerCase().includes(term) ||
      player.nationality.toLowerCase().includes(term) ||
      player.bowlingStyle?.toLowerCase().includes(term) ||
      player.primaryPlaystyle?.batting?.toLowerCase().includes(term) ||
      player.primaryPlaystyle?.bowling?.toLowerCase().includes(term)
    );
  };

  // Filter and sort players
  const filteredSortedPlayers = useMemo(() => {
    let result = [...players];

    // Apply search filter
    if (filters.search) {
      result = result.filter(p => searchPlayer(p, filters.search));
    }

    // Apply role filter
    if (filters.roles.length > 0) {
      result = result.filter(p => filters.roles.includes(p.role));
    }

    // Apply batting hand filter
    if (filters.battingHand !== 'all') {
      result = result.filter(p => p.battingHand === filters.battingHand);
    }

    // Apply bowling type filter
    if (filters.bowlingType !== 'all') {
      if (filters.bowlingType === 'none') {
        result = result.filter(p => !p.bowlingType);
      } else {
        result = result.filter(p => p.bowlingType === filters.bowlingType);
      }
    }

    // Apply batting overall range filter
    if (filters.battingRange[0] > 0 || filters.battingRange[1] < 100) {
      result = result.filter(p => {
        const rating = getPrimaryBattingRating(p);
        return rating >= filters.battingRange[0] && rating <= filters.battingRange[1];
      });
    }

    // Apply bowling overall range filter
    if (filters.bowlingRange[0] > 0 || filters.bowlingRange[1] < 100) {
      result = result.filter(p => {
        const rating = getPrimaryBowlingRating(p);
        return rating >= filters.bowlingRange[0] && rating <= filters.bowlingRange[1];
      });
    }

    // Apply age range filter
    if (filters.ageRange[0] > 18 || filters.ageRange[1] < 40) {
      result = result.filter(p =>
        p.age >= filters.ageRange[0] && p.age <= filters.ageRange[1]
      );
    }

    // Apply nationality filter
    if (filters.nationalities.length > 0) {
      result = result.filter(p => filters.nationalities.includes(p.nationality));
    }

    // Apply sorting
    result.sort((a, b) => {
      const { column, direction } = sortConfig;
      let aVal, bVal;

      // Handle different column types
      switch (column) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);

        case 'age':
        case 'nationality':
        case 'role':
        case 'battingHand':
        case 'bowlingType':
        case 'bowlingStyle':
          aVal = (a[column] || '').toString().toLowerCase();
          bVal = (b[column] || '').toString().toLowerCase();
          return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);

        case 'battingOverall':
          aVal = getPrimaryBattingRating(a);
          bVal = getPrimaryBattingRating(b);
          return direction === 'asc' ? aVal - bVal : bVal - aVal;

        case 'bowlingOverall':
          aVal = getPrimaryBowlingRating(a);
          bVal = getPrimaryBowlingRating(b);
          return direction === 'asc' ? aVal - bVal : bVal - aVal;

        case 'primaryBattingPlaystyle':
          aVal = a.topPlaystyles?.batting?.[0]?.rating || 0;
          bVal = b.topPlaystyles?.batting?.[0]?.rating || 0;
          return direction === 'asc' ? aVal - bVal : bVal - aVal;

        case 'primaryBowlingPlaystyle':
          aVal = a.topPlaystyles?.bowling?.[0]?.rating || 0;
          bVal = b.topPlaystyles?.bowling?.[0]?.rating || 0;
          return direction === 'asc' ? aVal - bVal : bVal - aVal;

        case 'primaryFieldingPlaystyle':
          aVal = a.topPlaystyles?.fielding?.[0]?.rating || 0;
          bVal = b.topPlaystyles?.fielding?.[0]?.rating || 0;
          return direction === 'asc' ? aVal - bVal : bVal - aVal;

        default:
          // Handle playstyle ratings
          if (column.includes('playstyle:')) {
            const playstyleName = column.replace('playstyle:', '');
            aVal = a.playstyleRatings?.batting?.[playstyleName] ||
                   a.playstyleRatings?.bowling?.[playstyleName] || 0;
            bVal = b.playstyleRatings?.batting?.[playstyleName] ||
                   b.playstyleRatings?.bowling?.[playstyleName] || 0;
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
          }

          // Handle attributes
          if (column.includes('attr:')) {
            const [category, attr] = column.replace('attr:', '').split('.');
            aVal = a.attributes?.[category]?.[attr] || 0;
            bVal = b.attributes?.[category]?.[attr] || 0;
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
          }

          return 0;
      }
    });

    return result;
  }, [players, filters, sortConfig]);

  // Handle sort column click
  const handleSort = (column) => {
    if (sortConfig.column === column) {
      setSortConfig({
        column,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({
        column,
        direction: column === 'name' ? 'asc' : 'desc' // Alphabetical asc, numeric desc
      });
    }
  };

  // Sort indicator component
  const SortIndicator = ({ column }) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-3 h-3" /> :
      <ArrowDown className="w-3 h-3" />;
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'Batsman': return 'text-blue-400';
      case 'Bowler': return 'text-red-400';
      case 'All-Rounder': return 'text-green-400';
      case 'Wicket-Keeper': return 'text-yellow-400';
      default: return 'text-text-secondary';
    }
  };

  // Get gradient color from red (min) to green (max) based on value and range
  const getGradientColor = (value, min, max) => {
    if (value === 0 || max === min) return 'text-text-secondary';

    // Normalize value to 0-1 range
    const normalized = (value - min) / (max - min);

    // Color gradient: red (0%) -> yellow (50%) -> green (100%)
    if (normalized < 0.33) {
      return 'text-red-400';
    } else if (normalized < 0.67) {
      return 'text-yellow-400';
    } else {
      return 'text-green-400';
    }
  };

  // Get rating color gradient (0-100 scale)
  const getRatingColor = (rating) => {
    return getGradientColor(rating, 0, 100);
  };

  // Get attribute value color (1-20 scale)
  const getAttributeColor = (value) => {
    return getGradientColor(value, 1, 20);
  };

  // Toggle column visibility
  const toggleColumnGroup = (groupName) => {
    setVisibleColumns(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      search: '',
      roles: [],
      battingHand: 'all',
      bowlingType: 'all',
      battingRange: [0, 100],
      bowlingRange: [0, 100],
      ageRange: [18, 40],
      nationalities: [],
      playstyles: { batting: [], bowling: [] }
    });
  };

  // Get unique values for filter dropdowns
  const uniqueRoles = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
  const uniqueNationalities = [...new Set(players.map(p => p.nationality))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-cricket-dark flex items-center justify-center">
        <div className="text-center">
          <CricketBallSpinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-cricket-text-primary">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-wallpaper p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => alert('Database download feature coming soon!')}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Update Database
            </button>
            <div className="text-sm text-cricket-text-secondary">
              {filteredSortedPlayers.length} / {players.length} players
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-4 space-y-3">
          {/* Primary filter row */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cricket-text-secondary" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search name, nationality, playstyle..."
                className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
              />
            </div>

            {/* Role filter */}
            <select
              multiple
              size={1}
              value={filters.roles}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                setFilters({ ...filters, roles: selectedOptions });
              }}
              className="px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent min-w-[120px]"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            {/* Batting Hand */}
            <select
              value={filters.battingHand}
              onChange={(e) => setFilters({ ...filters, battingHand: e.target.value })}
              className="px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
            >
              <option value="all">All Hands</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>

            {/* Bowling Type */}
            <select
              value={filters.bowlingType}
              onChange={(e) => setFilters({ ...filters, bowlingType: e.target.value })}
              className="px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
            >
              <option value="all">All Types</option>
              <option value="pace">Pace</option>
              <option value="spin">Spin</option>
              <option value="none">None</option>
            </select>

            {/* Columns dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                className="px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary hover:border-cricket-accent transition-colors flex items-center gap-2"
              >
                <Columns className="w-4 h-4" />
                Columns
                {showColumnsDropdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showColumnsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-bg-secondary border border-border-primary rounded shadow-lg z-20 p-3 space-y-2">
                  <div className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
                    Column Visibility
                  </div>

                  <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                    <input
                      type="checkbox"
                      checked={visibleColumns.default}
                      onChange={() => toggleColumnGroup('default')}
                      className="rounded"
                    />
                    <span>Default Columns (10)</span>
                  </label>

                  <div className="border-t border-border-primary pt-2 mt-2">
                    <div className="text-xs font-semibold text-text-secondary uppercase mb-1">Playstyles</div>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.battingPlaystyles}
                        onChange={() => toggleColumnGroup('battingPlaystyles')}
                        className="rounded"
                      />
                      <span>All Batting Playstyles (16)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.bowlingPlaystyles}
                        onChange={() => toggleColumnGroup('bowlingPlaystyles')}
                        className="rounded"
                      />
                      <span>All Bowling Playstyles (8)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.fieldingPlaystyles}
                        onChange={() => toggleColumnGroup('fieldingPlaystyles')}
                        className="rounded"
                      />
                      <span>Fielding Playstyle (1)</span>
                    </label>
                  </div>

                  <div className="border-t border-border-primary pt-2 mt-2">
                    <div className="text-xs font-semibold text-text-secondary uppercase mb-1">Attributes</div>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.battingAttributes}
                        onChange={() => toggleColumnGroup('battingAttributes')}
                        className="rounded"
                      />
                      <span>Batting Attributes (11)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.bowlingAttributes}
                        onChange={() => toggleColumnGroup('bowlingAttributes')}
                        className="rounded"
                      />
                      <span>Bowling Attributes (10)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.physicalAttributes}
                        onChange={() => toggleColumnGroup('physicalAttributes')}
                        className="rounded"
                      />
                      <span>Physical Attributes (6)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.mentalAttributes}
                        onChange={() => toggleColumnGroup('mentalAttributes')}
                        className="rounded"
                      />
                      <span>Mental Attributes (5)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                      <input
                        type="checkbox"
                        checked={visibleColumns.fieldingAttributes}
                        onChange={() => toggleColumnGroup('fieldingAttributes')}
                        className="rounded"
                      />
                      <span>Fielding Attributes (8)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* More Filters toggle */}
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary hover:border-cricket-accent transition-colors flex items-center gap-2"
            >
              More Filters
              {showMoreFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Reset button */}
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary hover:border-cricket-accent transition-colors"
            >
              Reset
            </button>
          </div>

          {/* More filters (expandable) */}
          {showMoreFilters && (
            <div className="border-t border-border-primary pt-3 mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Batting Overall Range */}
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">
                    Batting Overall: {filters.battingRange[0]} - {filters.battingRange[1]}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.battingRange[0]}
                      onChange={(e) => setFilters({
                        ...filters,
                        battingRange: [parseInt(e.target.value), filters.battingRange[1]]
                      })}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.battingRange[1]}
                      onChange={(e) => setFilters({
                        ...filters,
                        battingRange: [filters.battingRange[0], parseInt(e.target.value)]
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Bowling Overall Range */}
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">
                    Bowling Overall: {filters.bowlingRange[0]} - {filters.bowlingRange[1]}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.bowlingRange[0]}
                      onChange={(e) => setFilters({
                        ...filters,
                        bowlingRange: [parseInt(e.target.value), filters.bowlingRange[1]]
                      })}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.bowlingRange[1]}
                      onChange={(e) => setFilters({
                        ...filters,
                        bowlingRange: [filters.bowlingRange[0], parseInt(e.target.value)]
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Age Range */}
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">
                    Age: {filters.ageRange[0]} - {filters.ageRange[1]}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="18"
                      max="40"
                      value={filters.ageRange[0]}
                      onChange={(e) => setFilters({
                        ...filters,
                        ageRange: [parseInt(e.target.value), filters.ageRange[1]]
                      })}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="18"
                      max="40"
                      value={filters.ageRange[1]}
                      onChange={(e) => setFilters({
                        ...filters,
                        ageRange: [filters.ageRange[0], parseInt(e.target.value)]
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Nationality */}
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Nationality</label>
                  <select
                    multiple
                    value={filters.nationalities}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFilters({ ...filters, nationalities: selected });
                    }}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent h-20"
                  >
                    {uniqueNationalities.map(nat => (
                      <option key={nat} value={nat}>{nat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Scrollbar */}
        <div
          ref={topScrollRef}
          className="overflow-x-auto overflow-y-hidden mb-2"
          style={{
            height: '12px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#4B5563 #1F2937',
            ...(isScrollbarFixed && {
              position: 'fixed',
              top: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              backgroundColor: '#1a1f2e',
              borderBottom: '1px solid #2a3142',
              marginBottom: 0,
              maxWidth: '1800px',
              width: '100%'
            })
          }}
        >
          <div style={{ height: '1px' }}></div>
        </div>

        {/* Spacer when scrollbar is fixed */}
        {isScrollbarFixed && <div style={{ height: '12px', marginBottom: '8px' }}></div>}

        {/* Fixed Header (when scrolled) */}
        {isScrollbarFixed && (
          <div
            ref={fixedHeaderRef}
            style={{
              position: 'fixed',
              top: '12px',
              left: `${tablePosition.left}px`,
              width: `${tablePosition.width}px`,
              zIndex: 85,
              overflowX: 'auto',
              overflowY: 'hidden',
              backgroundColor: '#1a1f2e',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            className="hide-scrollbar"
          >
            <style>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <table className="text-sm" style={{ minWidth: 'max-content', width: '100%' }}>
              <thead style={{ backgroundColor: '#1a1f2e' }}>
                <tr className="border-b border-border-primary bg-bg-secondary">
                  {/* Render ALL columns same as main table */}
                  {visibleColumns.default && (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-primary sticky left-0 bg-bg-secondary z-40 min-w-[200px]">
                        <div className="flex items-center gap-1">Player</div>
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-text-primary">Age</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-primary min-w-[100px]">Nation</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-primary min-w-[100px]">Role</th>
                      <th className="px-3 py-2 text-center font-semibold text-text-primary">Hand</th>
                      <th className="px-3 py-2 text-center font-semibold text-text-primary min-w-[100px]">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-primary min-w-[120px]">Style</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-primary min-w-[180px]">Bat Style</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-primary min-w-[180px]">Bowl Style</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-primary min-w-[180px]">Field Style</th>
                    </>
                  )}

                  {/* Batting Playstyles */}
                  {visibleColumns.battingPlaystyles && COLUMN_GROUPS.battingPlaystyles.map(playstyle => (
                    <th key={playstyle} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[70px]">
                      <span className="text-xs">{playstyle}</span>
                    </th>
                  ))}

                  {/* Bowling Playstyles */}
                  {visibleColumns.bowlingPlaystyles && COLUMN_GROUPS.bowlingPlaystyles.map(playstyle => (
                    <th key={playstyle} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[70px]">
                      <span className="text-xs">{playstyle}</span>
                    </th>
                  ))}

                  {/* Fielding Playstyles */}
                  {visibleColumns.fieldingPlaystyles && COLUMN_GROUPS.fieldingPlaystyles.map(playstyle => (
                    <th key={playstyle} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[70px]">
                      <span className="text-xs">{playstyle}</span>
                    </th>
                  ))}

                  {/* Batting Attributes */}
                  {visibleColumns.battingAttributes && COLUMN_GROUPS.battingAttributes.map(({ key, label }) => (
                    <th key={key} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[60px]">
                      <span className="text-xs">{label}</span>
                    </th>
                  ))}

                  {/* Bowling Attributes */}
                  {visibleColumns.bowlingAttributes && COLUMN_GROUPS.bowlingAttributes.map(({ key, label }) => (
                    <th key={key} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[60px]">
                      <span className="text-xs">{label}</span>
                    </th>
                  ))}

                  {/* Physical Attributes */}
                  {visibleColumns.physicalAttributes && COLUMN_GROUPS.physicalAttributes.map(({ key, label }) => (
                    <th key={key} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[60px]">
                      <span className="text-xs">{label}</span>
                    </th>
                  ))}

                  {/* Mental Attributes */}
                  {visibleColumns.mentalAttributes && COLUMN_GROUPS.mentalAttributes.map(({ key, label }) => (
                    <th key={key} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[60px]">
                      <span className="text-xs">{label}</span>
                    </th>
                  ))}

                  {/* Fielding Attributes */}
                  {visibleColumns.fieldingAttributes && COLUMN_GROUPS.fieldingAttributes.map(({ key, label }) => (
                    <th key={key} className="px-2 py-2 text-center font-semibold text-text-primary min-w-[60px]">
                      <span className="text-xs">{label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        )}

        {/* Table */}
        <div ref={tableContainerRef} className="card" style={{ overflow: 'visible' }}>
          <div
            ref={tableScrollRef}
            className="overflow-x-auto"
            style={{
              overflowX: 'auto',
              overflowY: 'visible',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: '#4B5563 #1F2937'
            }}
          >
            {/* Spacer for fixed header height */}
            {isScrollbarFixed && <div style={{ height: '41px' }}></div>}

            <table className="text-sm" style={{ minWidth: 'max-content', width: '100%' }}>
            <thead
              style={{
                position: 'sticky',
                top: '0',
                zIndex: 90,
                backgroundColor: '#1a1f2e',
                ...(isScrollbarFixed && {
                  visibility: 'hidden'
                })
              }}
            >
              <tr className="border-b border-border-primary bg-bg-secondary">
                {/* Default columns (always visible when default is checked) */}
                {visibleColumns.default && (
                  <>
                    {/* Player Name - Sticky */}
                    <th
                      onClick={() => handleSort('name')}
                      className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors sticky left-0 bg-bg-secondary z-40 min-w-[200px]"
                    >
                      <div className="flex items-center gap-1">
                        Player <SortIndicator column="name" />
                      </div>
                    </th>

                    {/* Age */}
                    <th
                      onClick={() => handleSort('age')}
                      className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Age <SortIndicator column="age" />
                      </div>
                    </th>

                    {/* Nationality */}
                    <th
                      onClick={() => handleSort('nationality')}
                      className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Nation <SortIndicator column="nationality" />
                      </div>
                    </th>

                    {/* Role */}
                    <th
                      onClick={() => handleSort('role')}
                      className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Role <SortIndicator column="role" />
                      </div>
                    </th>

                    {/* Bat Hand */}
                    <th
                      onClick={() => handleSort('battingHand')}
                      className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Hand <SortIndicator column="battingHand" />
                      </div>
                    </th>

                    {/* Bowl Type */}
                    <th
                      onClick={() => handleSort('bowlingType')}
                      className="px-3 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Type <SortIndicator column="bowlingType" />
                      </div>
                    </th>

                    {/* Bowl Style */}
                    <th
                      onClick={() => handleSort('bowlingStyle')}
                      className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Style <SortIndicator column="bowlingStyle" />
                      </div>
                    </th>

                    {/* Primary Batting Playstyle */}
                    <th
                      onClick={() => handleSort('primaryBattingPlaystyle')}
                      className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[180px]"
                    >
                      <div className="flex items-center gap-1">
                        Bat Style <SortIndicator column="primaryBattingPlaystyle" />
                      </div>
                    </th>

                    {/* Primary Bowling Playstyle */}
                    <th
                      onClick={() => handleSort('primaryBowlingPlaystyle')}
                      className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[180px]"
                    >
                      <div className="flex items-center gap-1">
                        Bowl Style <SortIndicator column="primaryBowlingPlaystyle" />
                      </div>
                    </th>

                    {/* Primary Fielding Playstyle */}
                    <th
                      onClick={() => handleSort('primaryFieldingPlaystyle')}
                      className="px-3 py-2 text-left font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[180px]"
                    >
                      <div className="flex items-center gap-1">
                        Field Style <SortIndicator column="primaryFieldingPlaystyle" />
                      </div>
                    </th>
                  </>
                )}

                {/* Batting Playstyles (toggleable) */}
                {visibleColumns.battingPlaystyles && COLUMN_GROUPS.battingPlaystyles.map(playstyle => (
                  <th
                    key={playstyle}
                    onClick={() => handleSort(`playstyle:${playstyle}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[70px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{playstyle}</span>
                      <SortIndicator column={`playstyle:${playstyle}`} />
                    </div>
                  </th>
                ))}

                {/* Bowling Playstyles (toggleable) */}
                {visibleColumns.bowlingPlaystyles && COLUMN_GROUPS.bowlingPlaystyles.map(playstyle => (
                  <th
                    key={playstyle}
                    onClick={() => handleSort(`playstyle:${playstyle}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[70px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{playstyle}</span>
                      <SortIndicator column={`playstyle:${playstyle}`} />
                    </div>
                  </th>
                ))}

                {/* Fielding Playstyles (toggleable) */}
                {visibleColumns.fieldingPlaystyles && COLUMN_GROUPS.fieldingPlaystyles.map(playstyle => (
                  <th
                    key={playstyle}
                    onClick={() => handleSort(`playstyle:${playstyle}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[70px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{playstyle}</span>
                      <SortIndicator column={`playstyle:${playstyle}`} />
                    </div>
                  </th>
                ))}

                {/* Batting Attributes (toggleable) */}
                {visibleColumns.battingAttributes && COLUMN_GROUPS.battingAttributes.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(`attr:batting.${key}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[60px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{label}</span>
                      <SortIndicator column={`attr:batting.${key}`} />
                    </div>
                  </th>
                ))}

                {/* Bowling Attributes (toggleable) */}
                {visibleColumns.bowlingAttributes && COLUMN_GROUPS.bowlingAttributes.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(`attr:bowling.${key}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[60px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{label}</span>
                      <SortIndicator column={`attr:bowling.${key}`} />
                    </div>
                  </th>
                ))}

                {/* Physical Attributes (toggleable) */}
                {visibleColumns.physicalAttributes && COLUMN_GROUPS.physicalAttributes.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(`attr:physical.${key}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[60px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{label}</span>
                      <SortIndicator column={`attr:physical.${key}`} />
                    </div>
                  </th>
                ))}

                {/* Mental Attributes (toggleable) */}
                {visibleColumns.mentalAttributes && COLUMN_GROUPS.mentalAttributes.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(`attr:mental.${key}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[60px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{label}</span>
                      <SortIndicator column={`attr:mental.${key}`} />
                    </div>
                  </th>
                ))}

                {/* Fielding Attributes (toggleable) */}
                {visibleColumns.fieldingAttributes && COLUMN_GROUPS.fieldingAttributes.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(`attr:fielding.${key}`)}
                    className="px-2 py-2 text-center font-semibold text-text-primary cursor-pointer hover:bg-bg-tertiary transition-colors min-w-[60px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{label}</span>
                      <SortIndicator column={`attr:fielding.${key}`} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan="100" className="px-3 py-12 text-center">
                    <Search className="w-12 h-12 text-cricket-text-secondary mx-auto mb-3 opacity-50" />
                    <p className="text-cricket-text-primary font-semibold">No players found</p>
                    <p className="text-cricket-text-secondary text-sm mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSortedPlayers.map((player, idx) => {
                  const battingRating = getPrimaryBattingRating(player);
                  const bowlingRating = getPrimaryBowlingRating(player);

                  return (
                    <tr
                      key={player.id}
                      className={`border-b border-border-primary hover:bg-bg-tertiary transition-colors ${
                        idx % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'
                      }`}
                    >
                      {/* Default columns */}
                      {visibleColumns.default && (
                        <>
                          {/* Player Name - Sticky */}
                          <td className="px-3 py-2 font-medium sticky left-0 bg-inherit z-20">
                            <PlayerName playerId={player.id} className="font-medium" />
                          </td>

                          {/* Age */}
                          <td className="px-3 py-2 text-center font-mono text-text-primary">
                            {player.age}
                          </td>

                          {/* Nationality */}
                          <td className="px-3 py-2 text-text-primary">
                            {player.nationality}
                          </td>

                          {/* Role */}
                          <td className="px-3 py-2">
                            <span className={`font-semibold ${getRoleColor(player.role)}`}>
                              {player.role}
                            </span>
                          </td>

                          {/* Bat Hand */}
                          <td className="px-3 py-2 text-center text-text-primary">
                            {player.battingHand === 'left' ? 'L' : player.battingHand === 'right' ? 'R' : '-'}
                          </td>

                          {/* Bowl Type */}
                          <td className="px-3 py-2 text-center text-text-primary capitalize">
                            {player.bowlingType || '-'}
                          </td>

                          {/* Bowl Style */}
                          <td className="px-3 py-2 text-text-secondary text-xs">
                            {player.bowlingStyleAbbrev || '-'}
                          </td>

                          {/* Primary Batting Playstyle */}
                          <td className="px-3 py-2">
                            {player.primaryPlaystyle?.batting ? (
                              <div className="text-xs">
                                <div className="text-blue-400 font-medium">
                                  {player.primaryPlaystyle.batting}
                                </div>
                                <div className={`font-mono ${getRatingColor(Math.round(player.topPlaystyles?.batting?.[0]?.rating || 0))}`}>
                                  {Math.round(player.topPlaystyles?.batting?.[0]?.rating || 0)}
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Primary Bowling Playstyle */}
                          <td className="px-3 py-2">
                            {player.primaryPlaystyle?.bowling ? (
                              <div className="text-xs">
                                <div className="text-red-400 font-medium">
                                  {player.primaryPlaystyle.bowling}
                                </div>
                                <div className={`font-mono ${getRatingColor(Math.round(player.topPlaystyles?.bowling?.[0]?.rating || 0))}`}>
                                  {Math.round(player.topPlaystyles?.bowling?.[0]?.rating || 0)}
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Primary Fielding Playstyle */}
                          <td className="px-3 py-2">
                            {player.primaryPlaystyle?.fielding ? (
                              <div className="text-xs">
                                <div className="text-yellow-400 font-medium">
                                  {player.primaryPlaystyle.fielding}
                                </div>
                                <div className={`font-mono ${getRatingColor(Math.round(player.topPlaystyles?.fielding?.[0]?.rating || 0))}`}>
                                  {Math.round(player.topPlaystyles?.fielding?.[0]?.rating || 0)}
                                </div>
                              </div>
                            ) : '-'}
                          </td>
                        </>
                      )}

                      {/* Batting Playstyles (toggleable) */}
                      {visibleColumns.battingPlaystyles && COLUMN_GROUPS.battingPlaystyles.map(playstyle => {
                        const rating = Math.round(player.playstyleRatings?.batting?.[playstyle] || 0);
                        return (
                          <td key={playstyle} className={`px-2 py-2 text-center font-mono text-xs ${getRatingColor(rating)}`}>
                            {rating}
                          </td>
                        );
                      })}

                      {/* Bowling Playstyles (toggleable) */}
                      {visibleColumns.bowlingPlaystyles && COLUMN_GROUPS.bowlingPlaystyles.map(playstyle => {
                        const rating = Math.round(player.playstyleRatings?.bowling?.[playstyle] || 0);
                        return (
                          <td key={playstyle} className={`px-2 py-2 text-center font-mono text-xs ${getRatingColor(rating)}`}>
                            {rating}
                          </td>
                        );
                      })}

                      {/* Fielding Playstyles (toggleable) */}
                      {visibleColumns.fieldingPlaystyles && COLUMN_GROUPS.fieldingPlaystyles.map(playstyle => {
                        const rating = Math.round(player.playstyleRatings?.fielding?.[playstyle] || 0);
                        return (
                          <td key={playstyle} className={`px-2 py-2 text-center font-mono text-xs ${getRatingColor(rating)}`}>
                            {rating}
                          </td>
                        );
                      })}

                      {/* Batting Attributes (toggleable) */}
                      {visibleColumns.battingAttributes && COLUMN_GROUPS.battingAttributes.map(({ key }) => {
                        const value = player.attributes?.batting?.[key] || 0;
                        return (
                          <td key={key} className={`px-2 py-2 text-center font-mono text-xs ${getAttributeColor(value)}`}>
                            {value}
                          </td>
                        );
                      })}

                      {/* Bowling Attributes (toggleable) */}
                      {visibleColumns.bowlingAttributes && COLUMN_GROUPS.bowlingAttributes.map(({ key }) => {
                        const value = player.attributes?.bowling?.[key] || 0;
                        return (
                          <td key={key} className={`px-2 py-2 text-center font-mono text-xs ${getAttributeColor(value)}`}>
                            {value}
                          </td>
                        );
                      })}

                      {/* Physical Attributes (toggleable) */}
                      {visibleColumns.physicalAttributes && COLUMN_GROUPS.physicalAttributes.map(({ key }) => {
                        const value = player.attributes?.physical?.[key] || 0;
                        return (
                          <td key={key} className={`px-2 py-2 text-center font-mono text-xs ${getAttributeColor(value)}`}>
                            {value}
                          </td>
                        );
                      })}

                      {/* Mental Attributes (toggleable) */}
                      {visibleColumns.mentalAttributes && COLUMN_GROUPS.mentalAttributes.map(({ key }) => {
                        const value = player.attributes?.mental?.[key] || 0;
                        return (
                          <td key={key} className={`px-2 py-2 text-center font-mono text-xs ${getAttributeColor(value)}`}>
                            {value}
                          </td>
                        );
                      })}

                      {/* Fielding Attributes (toggleable) */}
                      {visibleColumns.fieldingAttributes && COLUMN_GROUPS.fieldingAttributes.map(({ key }) => {
                        const value = player.attributes?.fielding?.[key] || 0;
                        return (
                          <td key={key} className={`px-2 py-2 text-center font-mono text-xs ${getAttributeColor(value)}`}>
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBrowser;
