/**
 * @file FreeAgencyView.jsx
 * @description Free agency pool - sign released/unsold players without bidding
 * Uses SortableTable with asking price, status, and sign action
 */

import React, { useState, useMemo } from 'react';
import { UserPlus, Search, X } from 'lucide-react';
import useTransferStore from '../../stores/transferStore';
import useFinanceStore from '../../stores/financeStore';
import useTeamStore from '../../stores/teamStore';
import PlayerName from '../shared/PlayerName';
import SortableTable from '../shared/SortableTable';
import { getPlayerRating } from '../../utils/ratingHelper';

const FreeAgencyView = ({ userTeamId, transferHandler }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Store state
  const { freeAgents } = useTransferStore();
  const { getTeamFinances } = useFinanceStore();
  const { squadLists } = useTeamStore();

  // Get user's budget and squad
  const userFinances = getTeamFinances(userTeamId);
  const userBudget = userFinances?.currentBudget || 0;
  const userSquad = squadLists[userTeamId] || [];
  const squadSize = userSquad.length;
  const MAX_SQUAD_SIZE = 25;

  // Filter free agents
  const filteredAgents = useMemo(() => {
    let filtered = freeAgents.map(p => ({
      ...p,
      _rating: getPlayerRating(p),
      _role: p.primaryRole || p.role || 'All-rounder',
      _askingPrice: p.askingPrice || 200000,
      _status: p.status || 'unsold',
      _signingCost: Math.round((p.askingPrice || 200000) / 2)
    }));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(p =>
        p._role.toLowerCase() === selectedRole.toLowerCase()
      );
    }

    return filtered;
  }, [freeAgents, searchQuery, selectedRole]);

  // Handle sign
  const handleSignClick = (player) => {
    setSelectedPlayer(player);
  };

  const handleConfirmSign = () => {
    if (!selectedPlayer) return;

    const askingPrice = selectedPlayer._askingPrice;
    const signingCost = Math.round(askingPrice / 2);

    if (signingCost > userBudget) {
      alert('Insufficient budget');
      return;
    }

    if (squadSize >= MAX_SQUAD_SIZE) {
      alert(`Cannot sign - maximum squad size is ${MAX_SQUAD_SIZE} players`);
      return;
    }

    const confirmed = window.confirm(
      `Sign ${selectedPlayer.name} for $${(signingCost / 1000).toFixed(0)}K (half of $${(askingPrice / 1000).toFixed(0)}K annual salary)?`
    );

    if (confirmed) {
      const result = transferHandler.signFreeAgent(userTeamId, selectedPlayer.id, askingPrice);
      if (result.success) {
        setSelectedPlayer(null);
      } else {
        alert(result.error || 'Failed to sign player');
      }
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Player',
      sortKey: 'name',
      render: (player) => (
        <PlayerName playerId={player.id} className="text-sm font-medium text-white" initialTab="transfers" />
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'role',
      label: 'Role',
      sortKey: '_role',
      render: (player) => (
        <span className="text-sm text-gray-300">{player._role}</span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'rating',
      label: 'Rating',
      sortKey: '_rating',
      align: 'center',
      render: (player) => (
        <span className="text-sm text-white font-medium">{player._rating.toFixed(1)}</span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'askingPrice',
      label: 'Asking Price',
      sortKey: '_askingPrice',
      align: 'right',
      render: (player) => (
        <span className="text-sm text-trophy-gold font-medium">
          {player._askingPrice >= 1000000
            ? `$${(player._askingPrice / 1000000).toFixed(1)}M`
            : `$${(player._askingPrice / 1000).toFixed(0)}K`}
        </span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'signingCost',
      label: 'Signing Cost',
      sortKey: '_signingCost',
      align: 'right',
      render: (player) => (
        <span className="text-sm text-cricket-accent font-medium">
          {player._signingCost >= 1000000
            ? `$${(player._signingCost / 1000000).toFixed(1)}M`
            : `$${(player._signingCost / 1000).toFixed(0)}K`}
        </span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'status',
      label: 'Status',
      sortKey: '_status',
      align: 'center',
      render: (player) => (
        <span className={`text-xs px-2 py-0.5 rounded ${
          player._status === 'released'
            ? 'bg-red-900/30 text-red-400 border border-red-500/30'
            : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
        }`}>
          {player._status === 'released' ? 'Released' : 'Unsold'}
        </span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'center',
      render: (player) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleSignClick(player); }}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-cricket-accent hover:bg-cricket-accent-dark text-white rounded transition-colors mx-auto"
          disabled={squadSize >= MAX_SQUAD_SIZE}
        >
          <UserPlus className="w-3 h-3" />
          <span>Sign</span>
        </button>
      ),
      cellClassName: 'px-3 py-2'
    }
  ];

  // Filter component
  const filterComponent = (
    <div className="flex items-center gap-3">
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
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Free Agency ({filteredAgents.length})
        </h2>
        <div className="text-sm text-gray-400">
          <span>Budget: <span className="text-trophy-gold font-semibold">${(userBudget / 1000).toFixed(0)}K</span></span>
          <span className="mx-2">|</span>
          <span>Squad: <span className="text-white font-semibold">{squadSize}/{MAX_SQUAD_SIZE}</span></span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 text-sm text-blue-300">
        <strong>Free Agency:</strong> Sign released or unsold players instantly. Signing cost is half the asking price (half-year salary).
      </div>

      {/* Table */}
      <SortableTable
        data={filteredAgents}
        columns={columns}
        defaultSortKey="_rating"
        defaultSortDirection="desc"
        emptyMessage={freeAgents.length === 0 ? 'No free agents available' : 'No players match your filters'}
        filterComponent={filterComponent}
        rowClassName="hover:bg-gray-800/50 transition-colors"
      />

      {/* Sign Confirmation Modal */}
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
                  {selectedPlayer._role} | Rating: {selectedPlayer._rating.toFixed(1)}
                </div>
                <div className={`text-xs mt-1 ${selectedPlayer._status === 'released' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {selectedPlayer._status === 'released' ? 'Released' : 'Unsold at Auction'}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-tertiary border border-gray-700 rounded p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Annual Salary (Asking):</span>
                  <span className="text-trophy-gold font-semibold">
                    ${(selectedPlayer._askingPrice / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Signing Cost (Half-Year):</span>
                  <span className="text-cricket-accent font-bold">
                    ${(selectedPlayer._signingCost / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between text-sm">
                  <span className="text-gray-400">Current Budget:</span>
                  <span className="text-white font-semibold">${(userBudget / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">After Signing:</span>
                  <span className={`font-semibold ${userBudget - selectedPlayer._signingCost >= 0 ? 'text-cricket-accent' : 'text-red-400'}`}>
                    ${((userBudget - selectedPlayer._signingCost) / 1000).toFixed(0)}K
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
                disabled={selectedPlayer._signingCost > userBudget || squadSize >= MAX_SQUAD_SIZE}
              >
                Sign for ${(selectedPlayer._signingCost / 1000).toFixed(0)}K
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeAgencyView;
