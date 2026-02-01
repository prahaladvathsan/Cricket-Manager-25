/**
 * @file MarketplaceView.jsx
 * @description Transfer marketplace - compact table view of all listings
 * Shows user's own listings and others' listings with appropriate actions
 */

import React, { useState, useMemo } from 'react';
import { Search, X, TrendingUp, Check, Ban } from 'lucide-react';
import useTransferStore from '../../stores/transferStore';
import useFinanceStore from '../../stores/financeStore';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';
import BidModal from './BidModal';
import SortableTable from '../shared/SortableTable';

const MarketplaceView = ({ userTeamId, transferHandler }) => {
  const [selectedListing, setSelectedListing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Store state
  const { activeListings } = useTransferStore();
  const { getTeamFinances } = useFinanceStore();

  // Get user's budget
  const userFinances = getTeamFinances(userTeamId);
  const userBudget = userFinances?.currentBudget || 0;

  // Filter listings
  const filteredListings = useMemo(() => {
    let filtered = [...activeListings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.player.name.toLowerCase().includes(query) ||
        l.teamId?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(l =>
        (l.player.primaryRole || l.player.role || '').toLowerCase() === roleFilter.toLowerCase()
      );
    }

    return filtered;
  }, [activeListings, searchQuery, roleFilter]);

  // Calculate time remaining
  const getTimeRemaining = (expiresAt) => {
    const now = Date.now();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Handle bid
  const handlePlaceBid = (listing) => {
    setSelectedListing(listing);
  };

  const handleConfirmBid = (bidAmount) => {
    if (!selectedListing) return;

    const result = transferHandler.placeBid(userTeamId, selectedListing.id, bidAmount);

    if (result.success) {
      setSelectedListing(null);
    } else {
      alert(result.error || 'Failed to place bid');
    }
  };

  // Handle accept bid
  const handleAcceptBid = (listing) => {
    if (!listing.currentBidder) {
      alert('No bids to accept');
      return;
    }

    const confirmed = window.confirm(
      `Accept bid of $${(listing.currentBid / 1000).toFixed(0)}K for ${listing.player.name}?`
    );

    if (confirmed) {
      const result = transferHandler.acceptBid(userTeamId, listing.id);
      if (!result.success) {
        alert(result.error || 'Failed to accept bid');
      }
    }
  };

  // Handle cancel listing
  const handleCancelListing = (listing) => {
    if (listing.bids.length > 0) {
      alert('Cannot cancel listing with active bids');
      return;
    }

    const confirmed = window.confirm(
      `Cancel listing for ${listing.player.name}?`
    );

    if (confirmed) {
      const result = transferHandler.cancelListing(userTeamId, listing.id);
      if (!result.success) {
        alert(result.error || 'Failed to cancel listing');
      }
    }
  };

  // Separate user's listings for stats
  const userListingsCount = filteredListings.filter(l => l.teamId === userTeamId).length;

  // Column definitions
  const columns = [
    {
      key: 'player',
      label: 'Player',
      sortKey: 'player.name',
      render: (listing) => (
        <PlayerName playerId={listing.player.id} className="text-text-primary font-medium" />
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortKey: 'player.primaryRole', // primaryRole might be undefined, fallback handled in component logic usually, but here we sort by it.
      render: (listing) => (
        <span className="text-text-secondary">
          {listing.player.primaryRole || listing.player.role}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortKey: 'player.rating',
      align: 'center',
      render: (listing) => (
        <span className="text-text-primary font-medium">
          {listing.player.rating?.toFixed(1) || 'N/A'}
        </span>
      ),
    },
    {
      key: 'seller',
      label: 'Seller',
      sortKey: 'teamId',
      render: (listing) => listing.teamId === userTeamId ? (
        <span className="text-cricket-accent font-semibold">You</span>
      ) : (
        <TeamName teamId={listing.teamId} className="text-text-secondary" />
      ),
    },
    {
      key: 'price',
      label: 'Asking',
      sortKey: 'listingPrice',
      align: 'right',
      render: (listing) => (
        <span className="text-text-primary font-medium">
          ${(listing.listingPrice / 1000).toFixed(0)}K
        </span>
      ),
    },
    {
      key: 'bid',
      label: 'Current Bid',
      sortKey: 'currentBid',
      align: 'right',
      render: (listing) => listing.bids.length > 0 ? (
        <span className="text-trophy-gold font-semibold">
          ${(listing.currentBid / 1000).toFixed(0)}K
        </span>
      ) : (
        <span className="text-text-tertiary">-</span>
      ),
    },
    {
      key: 'bids',
      label: 'Bids',
      sortKey: 'bids.length',
      align: 'center',
      render: (listing) => listing.bids.length > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs bg-cricket-accent/20 text-cricket-accent px-2 py-0.5 rounded">
          <TrendingUp className="w-3 h-3" />
          <span>{listing.bids.length}</span>
        </span>
      ) : (
        <span className="text-text-tertiary text-xs">0</span>
      ),
    },
    {
      key: 'time',
      label: 'Time',
      sortKey: 'expiresAt',
      align: 'center',
      render: (listing) => (
        <span className="text-text-secondary text-xs">
          {getTimeRemaining(listing.expiresAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'center',
      render: (listing) => {
        const isOwnListing = listing.teamId === userTeamId;
        const hasBids = listing.bids.length > 0;

        if (isOwnListing) {
          return (
            <div className="flex items-center justify-center gap-1">
              {hasBids ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAcceptBid(listing); }}
                  className="flex items-center gap-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>Accept</span>
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCancelListing(listing); }}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  <Ban className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          );
        } else {
          return (
            <button
              onClick={(e) => { e.stopPropagation(); handlePlaceBid(listing); }}
              className="bg-cricket-accent hover:bg-cricket-accent-dark text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Bid
            </button>
          );
        }
      },
    },
  ];

  // Filter component to pass to SortableTable
  const FilterComponent = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search players or teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full card border border-border-primary py-1.5 pl-7 pr-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-cricket-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="card border border-border-primary py-1.5 px-2 text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
        >
          <option value="all">All Roles</option>
          <option value="batsman">Batsman</option>
          <option value="bowler">Bowler</option>
          <option value="allrounder">All-rounder</option>
          <option value="wicketkeeper">Wicketkeeper</option>
        </select>

        {/* Budget Display */}
        <div className="text-xs text-text-secondary whitespace-nowrap">
          Budget: <span className="text-trophy-gold font-semibold">${(userBudget / 1000).toFixed(0)}K</span>
        </div>
      </div>

       {/* Stats */}
       <div className="flex items-center gap-3 text-xs text-text-secondary">
        <span>{filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''}</span>
        {userListingsCount > 0 && (
          <>
            <span>•</span>
            <span className="text-cricket-accent font-semibold">{userListingsCount} your listing{userListingsCount !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <SortableTable
        data={filteredListings}
        columns={columns}
        defaultSort={{ column: 'expiresAt', direction: 'asc' }}
        filterComponent={FilterComponent}
        emptyState={
          <tr>
            <td colSpan={columns.length} className="px-3 py-12 text-center">
              <p className="text-text-secondary text-sm">
                {activeListings.length === 0
                  ? 'No active listings'
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
            </td>
          </tr>
        }
        getRowClassName={(item) => item.teamId === userTeamId ? 'bg-cricket-primary/5' : ''}
      />

      {/* Bid Modal */}
      {selectedListing && (
        <BidModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onConfirm={handleConfirmBid}
          userBudget={userBudget}
        />
      )}
    </>
  );
};

export default MarketplaceView;
