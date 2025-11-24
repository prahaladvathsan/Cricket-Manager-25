/**
 * @file MyListingsView.jsx
 * @description Manage user's transfer listings
 * Shows active listings, current bids, and accept/reject options
 */

import React, { useMemo } from 'react';
import { Clock, TrendingUp, Ban, Check } from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';

const MyListingsView = ({ userTeamId, transferHandler }) => {
  // Get user's listings
  const userListings = useMemo(() => {
    return transferHandler.getUserListings(userTeamId);
  }, [transferHandler, userTeamId]);

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
      // Success notification is handled by transferHandler
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

  // Calculate time remaining for a listing
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          My Listings ({userListings.length})
        </h2>
        {userListings.length > 0 && (
          <div className="text-sm text-gray-400">
            Potential Revenue: <span className="text-trophy-gold font-semibold">
              ${(userListings.reduce((sum, l) => sum + (l.currentBid || 0), 0) / 1000).toFixed(0)}K
            </span>
          </div>
        )}
      </div>

      {/* Listings */}
      {userListings.length > 0 ? (
        <div className="space-y-3">
          {userListings.map((listing) => {
            const hasBids = listing.bids.length > 0;
            const timeRemaining = getTimeRemaining(listing.expiresAt);

            return (
              <div
                key={listing.id}
                className="bg-tertiary border border-cricket-accent rounded p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PlayerName
                        playerId={listing.player.id}
                        className="text-lg font-semibold text-white"
                      />
                      {hasBids ? (
                        <span className="text-xs bg-cricket-accent text-white px-2 py-0.5 rounded">
                          {listing.bids.length} bid{listing.bids.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                          No bids
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {listing.player.primaryRole || listing.player.role} • Rating: {listing.player.rating?.toFixed(1)}
                    </div>
                  </div>

                  {/* Time Remaining */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{timeRemaining}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Asking Price</div>
                    <div className="text-base font-semibold text-white">
                      ${(listing.listingPrice / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Current Bid</div>
                    <div className={`text-base font-semibold ${hasBids ? 'text-trophy-gold' : 'text-gray-400'}`}>
                      {hasBids ? `$${(listing.currentBid / 1000).toFixed(0)}K` : 'No bids'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Profit</div>
                    <div className={`text-base font-semibold ${hasBids ? 'text-cricket-accent' : 'text-gray-400'}`}>
                      {hasBids
                        ? `+$${((listing.currentBid - listing.listingPrice) / 1000).toFixed(0)}K`
                        : '-'}
                    </div>
                  </div>
                </div>

                {/* Current Bidder */}
                {hasBids && listing.currentBidder && (
                  <div className="mb-3 p-2 bg-secondary rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-cricket-accent" />
                        <span className="text-gray-400">Current bidder:</span>
                        <TeamName teamId={listing.currentBidder} className="text-white font-semibold" />
                      </div>
                      <div className="text-sm text-cricket-accent font-semibold">
                        ${(listing.currentBid / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {hasBids && (
                    <button
                      onClick={() => handleAcceptBid(listing)}
                      className="flex-1 flex items-center justify-center gap-2 bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded font-medium transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept Bid</span>
                    </button>
                  )}
                  {!hasBids && (
                    <button
                      onClick={() => handleCancelListing(listing)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Cancel Listing</span>
                    </button>
                  )}
                </div>

                {/* Bid History */}
                {listing.bids.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-500 mb-2">Bid History</div>
                    <div className="space-y-1">
                      {listing.bids.slice(-3).reverse().map((bid, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <TeamName teamId={bid.teamId} className="text-gray-400" />
                          <span className="text-gray-300">${(bid.amount / 1000).toFixed(0)}K</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 card border border-border-primary">
          <p className="text-text-secondary text-sm">You have no active listings</p>
          <p className="text-xs text-text-tertiary mt-1">
            List players from your Squad screen during the transfer window
          </p>
        </div>
      )}
    </div>
  );
};

export default MyListingsView;
