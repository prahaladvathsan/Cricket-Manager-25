/**
 * @file MarketplaceView.jsx
 * @description Transfer marketplace - compact table view of all listings
 * Shows user's own listings and others' listings with appropriate actions
 */

import React, { useState, useMemo } from 'react';
import { Search, X, TrendingUp, Check, Ban, Clock } from 'lucide-react';
import useTransferStore from '../../stores/transferStore';
import useFinanceStore from '../../stores/financeStore';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';
import BidModal from './BidModal';

const MarketplaceView = ({ userTeamId, transferHandler }) => {
  const [selectedListing, setSelectedListing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState('timeRemaining');
  const [sortDirection, setSortDirection] = useState('asc');

  // Store state
  const { activeListings } = useTransferStore();
  const { getTeamFinances } = useFinanceStore();

  // Get user's budget
  const userFinances = getTeamFinances(userTeamId);
  const userBudget = userFinances?.currentBudget || 0;

  // Filter and sort listings
  const displayedListings = useMemo(() => {
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

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'price':
          aVal = a.listingPrice;
          bVal = b.listingPrice;
          break;
        case 'bid':
          aVal = a.currentBid || 0;
          bVal = b.currentBid || 0;
          break;
        case 'rating':
          aVal = a.player.rating || 0;
          bVal = b.player.rating || 0;
          break;
        case 'timeRemaining':
          aVal = new Date(a.expiresAt).getTime();
          bVal = new Date(b.expiresAt).getTime();
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [activeListings, searchQuery, roleFilter, sortField, sortDirection]);

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

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  // Separate user's listings
  const userListingsCount = displayedListings.filter(l => l.teamId === userTeamId).length;

  return (
    <div className="space-y-3">
      {/* Header with Filters */}
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
        <span>{displayedListings.length} listing{displayedListings.length !== 1 ? 's' : ''}</span>
        {userListingsCount > 0 && (
          <>
            <span>•</span>
            <span className="text-cricket-accent font-semibold">{userListingsCount} your listing{userListingsCount !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      {/* Table */}
      {displayedListings.length > 0 ? (
        <div className="card border border-border-primary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary bg-bg-secondary">
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Player</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Role</th>
                <th className="px-3 py-2 text-center font-semibold text-text-primary">
                  <button
                    onClick={() => handleSort('rating')}
                    className="hover:text-cricket-accent transition-colors"
                  >
                    Rating {sortField === 'rating' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Seller</th>
                <th className="px-3 py-2 text-right font-semibold text-text-primary">
                  <button
                    onClick={() => handleSort('price')}
                    className="hover:text-cricket-accent transition-colors"
                  >
                    Asking {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-semibold text-text-primary">
                  <button
                    onClick={() => handleSort('bid')}
                    className="hover:text-cricket-accent transition-colors"
                  >
                    Current Bid {sortField === 'bid' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="px-3 py-2 text-center font-semibold text-text-primary">Bids</th>
                <th className="px-3 py-2 text-center font-semibold text-text-primary">
                  <button
                    onClick={() => handleSort('timeRemaining')}
                    className="hover:text-cricket-accent transition-colors flex items-center gap-1 mx-auto"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Time {sortField === 'timeRemaining' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-center font-semibold text-text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedListings.map((listing, idx) => {
                const isOwnListing = listing.teamId === userTeamId;
                const hasBids = listing.bids.length > 0;
                const timeRemaining = getTimeRemaining(listing.expiresAt);

                return (
                  <tr
                    key={listing.id}
                    className={`border-b border-border-primary hover:bg-bg-tertiary transition-colors ${
                      isOwnListing ? 'bg-cricket-primary/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <PlayerName playerId={listing.player.id} className="text-text-primary font-medium" />
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {listing.player.primaryRole || listing.player.role}
                    </td>
                    <td className="px-3 py-2 text-center text-text-primary font-medium">
                      {listing.player.rating?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="px-3 py-2">
                      {isOwnListing ? (
                        <span className="text-cricket-accent font-semibold">You</span>
                      ) : (
                        <TeamName teamId={listing.teamId} className="text-text-secondary" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-text-primary font-medium">
                      ${(listing.listingPrice / 1000).toFixed(0)}K
                    </td>
                    <td className="px-3 py-2 text-right">
                      {hasBids ? (
                        <span className="text-trophy-gold font-semibold">
                          ${(listing.currentBid / 1000).toFixed(0)}K
                        </span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {hasBids ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-cricket-accent/20 text-cricket-accent px-2 py-0.5 rounded">
                          <TrendingUp className="w-3 h-3" />
                          <span>{listing.bids.length}</span>
                        </span>
                      ) : (
                        <span className="text-text-tertiary text-xs">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-text-secondary text-xs">
                      {timeRemaining}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isOwnListing ? (
                        <div className="flex items-center justify-center gap-1">
                          {hasBids ? (
                            <button
                              onClick={() => handleAcceptBid(listing)}
                              className="flex items-center gap-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelListing(listing)}
                              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePlaceBid(listing)}
                          className="bg-cricket-accent hover:bg-cricket-accent-dark text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Bid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 card border border-border-primary">
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
        </div>
      )}

      {/* Bid Modal */}
      {selectedListing && (
        <BidModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onConfirm={handleConfirmBid}
          userBudget={userBudget}
        />
      )}
    </div>
  );
};

export default MarketplaceView;
