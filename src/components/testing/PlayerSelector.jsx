/**
 * @file PlayerSelector.jsx
 * @description Compact searchable player selector for testing mode
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, User, ChevronDown, X } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';

const ROLES = ['All', 'Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'];

// Helper to get player's primary batting playstyle rating
const getBatRating = (player) => {
  const primaryStyle = player?.primaryPlaystyle?.batting;
  if (!primaryStyle) return null;
  return player?.playstyleRatings?.batting?.[primaryStyle] ?? null;
};

// Helper to get player's primary bowling playstyle rating
const getBowlRating = (player) => {
  const primaryStyle = player?.primaryPlaystyle?.bowling;
  if (!primaryStyle) return null;
  return player?.playstyleRatings?.bowling?.[primaryStyle] ?? null;
};

// Format rating for display
const formatRating = (rating) => {
  if (rating === null || rating === undefined) return '-';
  return Math.round(rating);
};

// Get display string for player's playstyle(s) based on role
const getPlaystyleDisplay = (player) => {
  const role = player?.role?.toLowerCase() || '';
  const batStyle = player?.primaryPlaystyle?.batting;
  const bowlStyle = player?.primaryPlaystyle?.bowling;
  const batRating = getBatRating(player);
  const bowlRating = getBowlRating(player);

  if (role === 'bowler') {
    // Bowlers: show bowling playstyle only
    return bowlStyle ? `${bowlStyle}: ${formatRating(bowlRating)}` : '-';
  } else if (role === 'all-rounder') {
    // All-rounders: show both
    const parts = [];
    if (batStyle) parts.push(`${batStyle}: ${formatRating(batRating)}`);
    if (bowlStyle) parts.push(`${bowlStyle}: ${formatRating(bowlRating)}`);
    return parts.length > 0 ? parts.join(' | ') : '-';
  } else {
    // Batsman/Wicketkeeper: show batting playstyle
    return batStyle ? `${batStyle}: ${formatRating(batRating)}` : '-';
  }
};

const PlayerDropdown = ({ label, selectedId, onSelect, excludeIds = [] }) => {
  const players = usePlayerStore(state => state.players);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const filteredPlayers = useMemo(() => {
    return Object.values(players)
      .filter(player => {
        if (excludeIds.includes(player.id)) return false;
        if (roleFilter !== 'All' && player.role?.toLowerCase() !== roleFilter.toLowerCase()) return false;
        if (search) {
          const s = search.toLowerCase();
          return player.name.toLowerCase().includes(s) || player.currentTeam?.toLowerCase().includes(s);
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by primary rating (batting for batsmen, bowling for bowlers)
        const aRating = Math.max(getBatRating(a), getBowlRating(a));
        const bRating = Math.max(getBatRating(b), getBowlRating(b));
        return bRating - aRating;
      })
      .slice(0, 50);
  }, [players, search, roleFilter, excludeIds]);

  const selectedPlayer = selectedId ? players[selectedId] : null;

  const handleSelect = useCallback((playerId) => {
    onSelect(playerId);
    setIsOpen(false);
    setSearch('');
  }, [onSelect]);

  return (
    <div className="relative">
      <div className="text-[10px] text-text-muted mb-0.5">{label}</div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-bg-tertiary border border-border-primary rounded hover:border-border-secondary text-left"
      >
        {selectedPlayer ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-primary truncate">{selectedPlayer.name}</div>
              <div className="text-[10px] text-text-muted">
                {selectedPlayer.role} | {getPlaystyleDisplay(selectedPlayer)}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onSelect(null); }} className="p-0.5 hover:bg-bg-secondary rounded">
              <X className="w-3 h-3 text-text-muted" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-text-muted">Select...</span>
        )}
        <ChevronDown className={`w-3 h-3 text-text-muted ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg-secondary border border-border-primary rounded shadow-lg max-h-64 overflow-hidden">
          <div className="p-1.5 border-b border-border-primary">
            <div className="relative">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-6 pr-2 py-1 bg-bg-tertiary border border-border-primary rounded text-xs text-text-primary"
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-0.5 p-1 border-b border-border-primary overflow-x-auto">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap ${
                  roleFilter === role ? 'bg-cricket-accent text-white' : 'bg-bg-tertiary text-text-secondary'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="p-2 text-center text-text-muted text-xs">No players</div>
            ) : (
              filteredPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => handleSelect(player.id)}
                  className="w-full flex items-center gap-2 px-2 py-1 hover:bg-bg-tertiary text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-primary truncate">{player.name}</div>
                    <div className="text-[10px] text-text-muted">
                      {player.role} | {getPlaystyleDisplay(player)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerSelector = ({ strikerId, bowlerId, nonStrikerId, onSelectStriker, onSelectBowler, onSelectNonStriker }) => {
  const players = usePlayerStore(state => state.players);
  const striker = strikerId ? players[strikerId] : null;
  const bowler = bowlerId ? players[bowlerId] : null;

  return (
    <div className="card p-2">
      <div className="flex items-center gap-1.5 mb-2">
        <User className="w-3.5 h-3.5 text-cricket-accent" />
        <span className="text-xs font-semibold text-text-primary">Players</span>
      </div>

      <div className="space-y-2">
        <PlayerDropdown
          label="Striker"
          selectedId={strikerId}
          onSelect={onSelectStriker}
          excludeIds={[bowlerId, nonStrikerId].filter(Boolean)}
        />
        <PlayerDropdown
          label="Bowler"
          selectedId={bowlerId}
          onSelect={onSelectBowler}
          excludeIds={[strikerId, nonStrikerId].filter(Boolean)}
        />
        <PlayerDropdown
          label="Non-Striker (optional)"
          selectedId={nonStrikerId}
          onSelect={onSelectNonStriker}
          excludeIds={[strikerId, bowlerId].filter(Boolean)}
        />
      </div>

      {/* Matchup Preview */}
      {(striker || bowler) && (
        <div className="mt-2 pt-2 border-t border-border-primary">
          <div className="text-[10px] text-text-muted mb-1">Matchup</div>
          <div className="grid grid-cols-2 gap-2">
            {striker && (
              <div className="bg-bg-tertiary rounded p-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-green-400 font-medium">BAT</span>
                  <span className="text-[10px] text-green-400 font-bold">{formatRating(getBatRating(striker))}</span>
                </div>
                <div className="text-xs text-text-primary truncate">{striker.name}</div>
                <div className="text-[10px] text-text-muted">{striker.primaryPlaystyle?.batting || '-'}</div>
                <div className="text-[10px] text-text-muted">{striker.battingHand === 'left' ? 'LHB' : 'RHB'}</div>
              </div>
            )}
            {bowler && (
              <div className="bg-bg-tertiary rounded p-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-red-400 font-medium">BOWL</span>
                  <span className="text-[10px] text-red-400 font-bold">{formatRating(getBowlRating(bowler))}</span>
                </div>
                <div className="text-xs text-text-primary truncate">{bowler.name}</div>
                <div className="text-[10px] text-text-muted">{bowler.primaryPlaystyle?.bowling || '-'}</div>
                <div className="text-[10px] text-text-muted">{bowler.bowlingType || 'Pace'} | {bowler.bowlingStyleAbbrev || '-'}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSelector;
