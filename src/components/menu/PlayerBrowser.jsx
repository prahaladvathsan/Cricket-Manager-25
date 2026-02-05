/**
 * @file PlayerBrowser.jsx
 * @description Data-dense spreadsheet browser for all 376 players with advanced filtering, sorting, and toggleable columns
 * 10 default columns + 65 toggleable columns (16 batting + 8 bowling + 1 fielding playstyles + 40 attributes) = 75 total
 *
 * Refactored to use SortableTable with enableScrollSync for fixed-header scroll synchronization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Columns,
  UserPlus,
  RotateCcw,
  MoreVertical,
  Edit3,
  Sparkles
} from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import CricketBallSpinner from '../shared/CricketBallSpinner';
import SortableTable from '../shared/SortableTable';
import { getPrimaryBattingRating, getPrimaryBowlingRating } from '../../utils/ratingHelper';
import usePlayerStore from '../../stores/playerStore';
import DatabaseExportModal from '../modals/DatabaseExportModal';
import DatabaseImportModal from '../modals/DatabaseImportModal';
import CreatePlayerModal from '../modals/CreatePlayerModal';
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

  // UI state
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreatePlayerModalOpen, setIsCreatePlayerModalOpen] = useState(false);

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
  const { players: playersFromStore, resetAllCustomizations, isPlayerCustomized } = usePlayerStore();

  // Debug logging
  console.log('[PlayerBrowser] playersFromStore:', {
    type: typeof playersFromStore,
    isArray: Array.isArray(playersFromStore),
    length: playersFromStore?.length,
    isObject: playersFromStore && typeof playersFromStore === 'object',
    keys: playersFromStore && typeof playersFromStore === 'object' ? Object.keys(playersFromStore).slice(0, 5) : null
  });

  // Load players when store is populated
  useEffect(() => {
    console.log('[PlayerBrowser] useEffect triggered, playersFromStore:', playersFromStore?.length || 'undefined');

    // Handle both array and object formats
    let playersArray = playersFromStore;
    if (playersFromStore && !Array.isArray(playersFromStore) && typeof playersFromStore === 'object') {
      playersArray = Object.values(playersFromStore);
      console.log('[PlayerBrowser] Converted object to array, length:', playersArray.length);
    }

    if (playersArray && playersArray.length > 0) {
      console.log('[PlayerBrowser] Setting players, count:', playersArray.length);
      setPlayers(playersArray);
      setLoading(false);
    }
  }, [playersFromStore]);

  // Helper functions for color coding
  const getRoleColor = (role) => {
    switch (role) {
      case 'Batsman': return 'text-blue-400';
      case 'Bowler': return 'text-red-400';
      case 'All-Rounder': return 'text-green-400';
      case 'Wicket-Keeper': return 'text-yellow-400';
      default: return 'text-text-secondary';
    }
  };

  const getGradientColor = (value, min, max) => {
    if (value === 0 || max === min) return 'text-text-secondary';
    const normalized = (value - min) / (max - min);
    if (normalized < 0.33) return 'text-red-400';
    if (normalized < 0.67) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRatingColor = (rating) => getGradientColor(rating, 0, 100);
  const getAttributeColor = (value) => getGradientColor(value, 1, 20);

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

  // Filter players (sorting is handled by SortableTable)
  const filteredPlayers = useMemo(() => {
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

    return result;
  }, [players, filters]);

  // Custom sort function for complex columns
  const customSort = (a, b, column, direction) => {
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
        if (column.startsWith('playstyle:')) {
          const playstyleName = column.replace('playstyle:', '');
          aVal = a.playstyleRatings?.batting?.[playstyleName] ||
                 a.playstyleRatings?.bowling?.[playstyleName] || 0;
          bVal = b.playstyleRatings?.batting?.[playstyleName] ||
                 b.playstyleRatings?.bowling?.[playstyleName] || 0;
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Handle attributes
        if (column.startsWith('attr:')) {
          const [category, attr] = column.replace('attr:', '').split('.');
          aVal = a.attributes?.[category]?.[attr] || 0;
          bVal = b.attributes?.[category]?.[attr] || 0;
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
    }
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

  // Build columns dynamically based on visibility
  const columns = useMemo(() => {
    const cols = [];

    // Default columns
    if (visibleColumns.default) {
      cols.push({
        key: 'name',
        label: 'Player',
        sortKey: 'name',
        sticky: true,
        width: '200px',
        render: (player) => (
          <div className="flex items-center gap-1.5">
            <PlayerName playerId={player.id} className="font-medium" />
            {player.isCustomPlayer && (
              <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" title="Custom Player" />
            )}
            {player.isModified && !player.isCustomPlayer && (
              <Edit3 className="w-3 h-3 text-yellow-400 flex-shrink-0" title="Modified" />
            )}
          </div>
        ),
      });

      cols.push({
        key: 'age',
        label: 'Age',
        sortKey: 'age',
        align: 'center',
        defaultDirection: 'desc',
        render: (player) => <span className="font-mono text-text-primary">{player.age}</span>,
      });

      cols.push({
        key: 'nationality',
        label: 'Nation',
        sortKey: 'nationality',
        width: '100px',
        render: (player) => <span className="text-text-primary">{player.nationality}</span>,
      });

      cols.push({
        key: 'role',
        label: 'Role',
        sortKey: 'role',
        width: '100px',
        render: (player) => (
          <span className={`font-semibold ${getRoleColor(player.role)}`}>{player.role}</span>
        ),
      });

      cols.push({
        key: 'battingHand',
        label: 'Hand',
        sortKey: 'battingHand',
        align: 'center',
        render: (player) => (
          <span className="text-text-primary">
            {player.battingHand === 'left' ? 'L' : player.battingHand === 'right' ? 'R' : '-'}
          </span>
        ),
      });

      cols.push({
        key: 'bowlingType',
        label: 'Type',
        sortKey: 'bowlingType',
        align: 'center',
        width: '100px',
        render: (player) => (
          <span className="text-text-primary capitalize">{player.bowlingType || '-'}</span>
        ),
      });

      cols.push({
        key: 'bowlingStyle',
        label: 'Style',
        sortKey: 'bowlingStyle',
        width: '120px',
        render: (player) => (
          <span className="text-text-secondary text-xs">{player.bowlingStyleAbbrev || '-'}</span>
        ),
      });

      cols.push({
        key: 'primaryBattingPlaystyle',
        label: 'Bat Style',
        sortKey: 'primaryBattingPlaystyle',
        width: '180px',
        defaultDirection: 'desc',
        render: (player) => player.primaryPlaystyle?.batting ? (
          <div className="text-xs">
            <div className="text-blue-400 font-medium">{player.primaryPlaystyle.batting}</div>
            <div className={`font-mono ${getRatingColor(Math.round(player.topPlaystyles?.batting?.[0]?.rating || 0))}`}>
              {Math.round(player.topPlaystyles?.batting?.[0]?.rating || 0)}
            </div>
          </div>
        ) : '-',
      });

      cols.push({
        key: 'primaryBowlingPlaystyle',
        label: 'Bowl Style',
        sortKey: 'primaryBowlingPlaystyle',
        width: '180px',
        defaultDirection: 'desc',
        render: (player) => player.primaryPlaystyle?.bowling ? (
          <div className="text-xs">
            <div className="text-red-400 font-medium">{player.primaryPlaystyle.bowling}</div>
            <div className={`font-mono ${getRatingColor(Math.round(player.topPlaystyles?.bowling?.[0]?.rating || 0))}`}>
              {Math.round(player.topPlaystyles?.bowling?.[0]?.rating || 0)}
            </div>
          </div>
        ) : '-',
      });

      cols.push({
        key: 'primaryFieldingPlaystyle',
        label: 'Field Style',
        sortKey: 'primaryFieldingPlaystyle',
        width: '180px',
        defaultDirection: 'desc',
        render: (player) => player.primaryPlaystyle?.fielding ? (
          <div className="text-xs">
            <div className="text-yellow-400 font-medium">{player.primaryPlaystyle.fielding}</div>
            <div className={`font-mono ${getRatingColor(Math.round(player.topPlaystyles?.fielding?.[0]?.rating || 0))}`}>
              {Math.round(player.topPlaystyles?.fielding?.[0]?.rating || 0)}
            </div>
          </div>
        ) : '-',
      });
    }

    // Batting Playstyles
    if (visibleColumns.battingPlaystyles) {
      COLUMN_GROUPS.battingPlaystyles.forEach(playstyle => {
        cols.push({
          key: `bp_${playstyle}`,
          label: <span className="text-xs">{playstyle}</span>,
          sortKey: `playstyle:${playstyle}`,
          align: 'center',
          width: '70px',
          defaultDirection: 'desc',
          render: (player) => {
            const rating = Math.round(player.playstyleRatings?.batting?.[playstyle] || 0);
            return <span className={`font-mono text-xs ${getRatingColor(rating)}`}>{rating}</span>;
          },
        });
      });
    }

    // Bowling Playstyles
    if (visibleColumns.bowlingPlaystyles) {
      COLUMN_GROUPS.bowlingPlaystyles.forEach(playstyle => {
        cols.push({
          key: `bop_${playstyle}`,
          label: <span className="text-xs">{playstyle}</span>,
          sortKey: `playstyle:${playstyle}`,
          align: 'center',
          width: '70px',
          defaultDirection: 'desc',
          render: (player) => {
            const rating = Math.round(player.playstyleRatings?.bowling?.[playstyle] || 0);
            return <span className={`font-mono text-xs ${getRatingColor(rating)}`}>{rating}</span>;
          },
        });
      });
    }

    // Fielding Playstyles
    if (visibleColumns.fieldingPlaystyles) {
      COLUMN_GROUPS.fieldingPlaystyles.forEach(playstyle => {
        cols.push({
          key: `fp_${playstyle}`,
          label: <span className="text-xs">{playstyle}</span>,
          sortKey: `playstyle:${playstyle}`,
          align: 'center',
          width: '70px',
          defaultDirection: 'desc',
          render: (player) => {
            const rating = Math.round(player.playstyleRatings?.fielding?.[playstyle] || 0);
            return <span className={`font-mono text-xs ${getRatingColor(rating)}`}>{rating}</span>;
          },
        });
      });
    }

    // Batting Attributes
    if (visibleColumns.battingAttributes) {
      COLUMN_GROUPS.battingAttributes.forEach(({ key, label }) => {
        cols.push({
          key: `ba_${key}`,
          label: <span className="text-xs">{label}</span>,
          sortKey: `attr:batting.${key}`,
          align: 'center',
          width: '60px',
          defaultDirection: 'desc',
          render: (player) => {
            const value = player.attributes?.batting?.[key] || 0;
            return <span className={`font-mono text-xs ${getAttributeColor(value)}`}>{value}</span>;
          },
        });
      });
    }

    // Bowling Attributes
    if (visibleColumns.bowlingAttributes) {
      COLUMN_GROUPS.bowlingAttributes.forEach(({ key, label }) => {
        cols.push({
          key: `boa_${key}`,
          label: <span className="text-xs">{label}</span>,
          sortKey: `attr:bowling.${key}`,
          align: 'center',
          width: '60px',
          defaultDirection: 'desc',
          render: (player) => {
            const value = player.attributes?.bowling?.[key] || 0;
            return <span className={`font-mono text-xs ${getAttributeColor(value)}`}>{value}</span>;
          },
        });
      });
    }

    // Physical Attributes
    if (visibleColumns.physicalAttributes) {
      COLUMN_GROUPS.physicalAttributes.forEach(({ key, label }) => {
        cols.push({
          key: `pa_${key}`,
          label: <span className="text-xs">{label}</span>,
          sortKey: `attr:physical.${key}`,
          align: 'center',
          width: '60px',
          defaultDirection: 'desc',
          render: (player) => {
            const value = player.attributes?.physical?.[key] || 0;
            return <span className={`font-mono text-xs ${getAttributeColor(value)}`}>{value}</span>;
          },
        });
      });
    }

    // Mental Attributes
    if (visibleColumns.mentalAttributes) {
      COLUMN_GROUPS.mentalAttributes.forEach(({ key, label }) => {
        cols.push({
          key: `ma_${key}`,
          label: <span className="text-xs">{label}</span>,
          sortKey: `attr:mental.${key}`,
          align: 'center',
          width: '60px',
          defaultDirection: 'desc',
          render: (player) => {
            const value = player.attributes?.mental?.[key] || 0;
            return <span className={`font-mono text-xs ${getAttributeColor(value)}`}>{value}</span>;
          },
        });
      });
    }

    // Fielding Attributes
    if (visibleColumns.fieldingAttributes) {
      COLUMN_GROUPS.fieldingAttributes.forEach(({ key, label }) => {
        cols.push({
          key: `fa_${key}`,
          label: <span className="text-xs">{label}</span>,
          sortKey: `attr:fielding.${key}`,
          align: 'center',
          width: '60px',
          defaultDirection: 'desc',
          render: (player) => {
            const value = player.attributes?.fielding?.[key] || 0;
            return <span className={`font-mono text-xs ${getAttributeColor(value)}`}>{value}</span>;
          },
        });
      });
    }

    return cols;
  }, [visibleColumns]);

  // Filter component for SortableTable
  const FilterComponent = (
    <div className="space-y-3">
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
                {[
                  { key: 'battingPlaystyles', label: 'All Batting Playstyles (16)' },
                  { key: 'bowlingPlaystyles', label: 'All Bowling Playstyles (8)' },
                  { key: 'fieldingPlaystyles', label: 'Fielding Playstyle (1)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumnGroup(key)}
                      className="rounded"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="border-t border-border-primary pt-2 mt-2">
                <div className="text-xs font-semibold text-text-secondary uppercase mb-1">Attributes</div>
                {[
                  { key: 'battingAttributes', label: 'Batting Attributes (11)' },
                  { key: 'bowlingAttributes', label: 'Bowling Attributes (10)' },
                  { key: 'physicalAttributes', label: 'Physical Attributes (6)' },
                  { key: 'mentalAttributes', label: 'Mental Attributes (5)' },
                  { key: 'fieldingAttributes', label: 'Fielding Attributes (8)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-1 rounded">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumnGroup(key)}
                      className="rounded"
                    />
                    <span>{label}</span>
                  </label>
                ))}
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
  );

  // Custom empty state
  const emptyState = (
    <tr>
      <td colSpan={columns.length || 10} className="px-3 py-12 text-center">
        <Search className="w-12 h-12 text-cricket-text-secondary mx-auto mb-3 opacity-50" />
        <p className="text-cricket-text-primary font-semibold">No players found</p>
        <p className="text-cricket-text-secondary text-sm mt-1">
          Try adjusting your search or filters
        </p>
      </td>
    </tr>
  );

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
          <div className="flex items-center gap-3">
            {/* Create Player Button */}
            <button
              onClick={() => setIsCreatePlayerModalOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Create Player
            </button>

            {/* Export Button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>

            {/* Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="btn-secondary p-2"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showActionsDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-bg-secondary border border-border-primary rounded shadow-lg z-20">
                  <button
                    onClick={async () => {
                      if (confirm('Reset all customizations? This will remove all player modifications and custom players.')) {
                        await resetAllCustomizations();
                        setShowActionsDropdown(false);
                        // Trigger page reload to refresh from master DB
                        window.location.reload();
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-bg-tertiary flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset All Customizations
                  </button>
                </div>
              )}
            </div>

            <div className="text-sm text-cricket-text-secondary">
              {filteredPlayers.length} / {players.length} players
            </div>
          </div>
        </div>

        {/* SortableTable with scroll sync */}
        <SortableTable
          data={filteredPlayers}
          columns={columns}
          defaultSort={{ column: 'name', direction: 'asc' }}
          customSort={customSort}
          filterComponent={FilterComponent}
          emptyState={emptyState}
          enableScrollSync={true}
        />
      </div>

      {/* Modals */}
      <DatabaseExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <DatabaseImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          // Reload page to apply imported changes
          window.location.reload();
        }}
      />

      <CreatePlayerModal
        isOpen={isCreatePlayerModalOpen}
        onClose={() => setIsCreatePlayerModalOpen(false)}
      />

      {/* Click outside handler for actions dropdown */}
      {showActionsDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowActionsDropdown(false)}
        />
      )}
    </div>
  );
};

export default PlayerBrowser;
