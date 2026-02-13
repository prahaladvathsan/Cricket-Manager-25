/**
 * @file FreeAgencyView.jsx
 * @description Free agency pool - sign released players without bidding
 * Instant signing with budget validation only
 */

import React, { useState, useMemo } from 'react';
import { UserPlus, Search, X } from 'lucide-react';
import useTransferStore from '../../stores/transferStore';
import useFinanceStore from '../../stores/financeStore';
import useTeamStore from '../../stores/teamStore';
import PlayerName from '../shared/PlayerName';
import { getPlayerRating } from '../../utils/ratingHelper';

const FreeAgencyView = ({ userTeamId, transferHandler }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [signPrice, setSignPrice] = useState('');

  // Store state
  const { freeAgents } = useTransferStore();
  const { getTeamFinances } = useFinanceStore();
  const { squadLists } = useTeamStore();

  // Get user's budget and squad
  const userFinances = getTeamFinances(userTeamId);
  const userBudget = userFinances?.currentBudget || 0;
  const userSquad = squadLists[userTeamId] || [];
  const squadSize = userSquad.length;
  const MAX_SQUAD_SIZE = 25; // Must match auctionConfig.squadSize.max

  // Filter free agents
  const filteredAgents = useMemo(() => {
    let filtered = [...freeAgents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(p =>
        (p.primaryRole || p.role || '').toLowerCase() === selectedRole.toLowerCase()
      );
    }

    // Sort by rating (descending)
    filtered.sort((a, b) => getPlayerRating(b) - getPlayerRating(a));

    return filtered;
  }, [freeAgents, searchQuery, selectedRole]);

  // Handle sign player
  const handleSignClick = (player) => {
    setSelectedPlayer(player);
    setSignPrice(''); // Reset price
  };

  // Handle confirm sign
  const handleConfirmSign = () => {
    if (!selectedPlayer) return;

    const price = parseFloat(signPrice);

    if (isNaN(price) || price < 50000) {
      alert('Minimum signing price is $50K');
      return;
    }

    if (price > userBudget) {
      alert('Insufficient budget');
      return;
    }

    if (squadSize >= MAX_SQUAD_SIZE) {
      alert(`Cannot sign - maximum squad size is ${MAX_SQUAD_SIZE} players`);
      return;
    }

    const confirmed = window.confirm(
      `Sign ${selectedPlayer.name} for $${(price / 1000).toFixed(0)}K?`
    );

    if (confirmed) {
      const result = transferHandler.signFreeAgent(userTeamId, selectedPlayer.id, price);

      if (result.success) {
        setSelectedPlayer(null);
        setSignPrice('');
        // Success notification is handled by transferHandler
      } else {
        alert(result.error || 'Failed to sign player');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Free Agency ({filteredAgents.length})
        </h2>
        <div className="text-sm text-gray-400">
          <span>Budget: <span className="text-trophy-gold font-semibold">${(userBudget / 1000).toFixed(0)}K</span></span>
          <span className="mx-2">•</span>
          <span>Squad: <span className="text-white font-semibold">{squadSize}/{MAX_SQUAD_SIZE}</span></span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-tertiary border border-gray-700 rounded py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-cricket-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="bg-tertiary border border-gray-700 rounded py-2 px-3 text-white focus:outline-none focus:border-cricket-accent"
        >
          <option value="all">All Roles</option>
          <option value="batsman">Batsman</option>
          <option value="bowler">Bowler</option>
          <option value="allrounder">All-rounder</option>
          <option value="wicketkeeper">Wicketkeeper</option>
        </select>
      </div>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 text-sm text-blue-300">
        <strong>Free Agency:</strong> Sign released players instantly without bidding. You set the price based on your budget and squad needs.
      </div>

      {/* Free Agents List */}
      {filteredAgents.length > 0 ? (
        <div className="space-y-2">
          {filteredAgents.map((player) => {
            const role = player.primaryRole || player.role || 'All-rounder';
            const rating = getPlayerRating(player);

            return (
              <div
                key={player.id}
                className="bg-tertiary border border-gray-700 rounded p-3 flex items-center justify-between hover:border-cricket-accent/50 transition-colors"
              >
                {/* Player Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <PlayerName playerId={player.id} className="text-base font-semibold text-white" />
                    <span className="text-sm text-gray-400">{role}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-400">Rating: {rating.toFixed(1)}</span>
                  </div>
                  {player.previousTeamId && (
                    <div className="text-sm text-gray-500 mt-1">
                      Previously: {player.previousTeamId}
                    </div>
                  )}
                </div>

                {/* Sign Button */}
                <button
                  onClick={() => handleSignClick(player)}
                  className="flex items-center gap-2 bg-cricket-accent hover:bg-cricket-accent-dark text-white px-4 py-2 rounded font-medium transition-colors"
                  disabled={squadSize >= MAX_SQUAD_SIZE}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 card border border-border-primary">
          <p className="text-text-secondary text-sm">
            {freeAgents.length === 0
              ? 'No free agents available'
              : 'No players match your filters'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-cricket-accent hover:text-cricket-accent-dark text-xs"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Sign Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary border border-gray-700 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Sign Free Agent</h3>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Player Info */}
              <div className="bg-tertiary border border-gray-700 rounded p-3">
                <PlayerName playerId={selectedPlayer.id} className="text-lg font-semibold text-white" />
                <div className="text-sm text-gray-400 mt-1">
                  {selectedPlayer.primaryRole || selectedPlayer.role} • Rating: {selectedPlayer.rating?.toFixed(1)}
                </div>
              </div>

              {/* Signing Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Signing Price (minimum $50K)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={signPrice}
                    onChange={(e) => setSignPrice(e.target.value)}
                    placeholder="500"
                    className="w-full bg-tertiary border border-gray-700 rounded py-2 pl-8 pr-12 text-white focus:outline-none focus:border-cricket-accent"
                    min={50}
                    step={10}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">K</span>
                </div>
              </div>

              {/* Quick Price Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSignPrice('100')}
                  className="bg-tertiary hover:bg-gray-700 text-white py-2 rounded text-sm transition-colors"
                >
                  $100K
                </button>
                <button
                  onClick={() => setSignPrice('250')}
                  className="bg-tertiary hover:bg-gray-700 text-white py-2 rounded text-sm transition-colors"
                >
                  $250K
                </button>
                <button
                  onClick={() => setSignPrice('500')}
                  className="bg-tertiary hover:bg-gray-700 text-white py-2 rounded text-sm transition-colors"
                >
                  $500K
                </button>
              </div>

              {/* Budget Info */}
              <div className="bg-tertiary border border-gray-700 rounded p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Current Budget:</span>
                  <span className="text-white font-semibold">${(userBudget / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">After Signing:</span>
                  <span className={`font-semibold ${userBudget - (parseFloat(signPrice) * 1000 || 0) >= 0 ? 'text-cricket-accent' : 'text-red-400'}`}>
                    ${((userBudget - (parseFloat(signPrice) * 1000 || 0)) / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="flex-1 bg-tertiary hover:bg-gray-700 text-white py-2 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSign}
                className="flex-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded font-medium transition-colors"
                disabled={!signPrice || parseFloat(signPrice) * 1000 < 50000}
              >
                Confirm Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeAgencyView;
