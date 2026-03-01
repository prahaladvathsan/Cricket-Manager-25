/**
 * @file MyListingsView.jsx
 * @description User's transfer listings - informational view with cancel option
 * Transfers auto-complete on listing expiry to highest bidder
 */

import React, { useMemo } from 'react';
import { Clock, TrendingUp, Ban, Info } from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';
import useGameStore from '../../stores/gameStore';

const MyListingsView = ({ userTeamId, transferHandler }) => {
  // Get user's listings
  const userListings = useMemo(() => {
    return transferHandler.getUserListings(userTeamId);
  }, [transferHandler, userTeamId]);

  // Handle cancel listing (only when no bids)
  const handleCancelListing = (listing) => {
    if (listing.bids.length > 0) {
      alert('Cannot cancel listing with active bids');
      return;
    }

    const confirmed = window.confirm(
      `Cancel listing for ${listing.player.name}? The player will return to your squad.`
    );

    if (confirmed) {
      const result = transferHandler.cancelListing(userTeamId, listing.id);
      if (!result.success) {
        alert(result.error || 'Failed to cancel listing');
      }
    }
  };

  // Calculate time remaining using game-days
  const getTimeRemaining = (listing) => {
    const currentGameDay = useGameStore.getState().gameDay;
    if (listing.createdOnGameDay) {
      const elapsed = currentGameDay - listing.createdOnGameDay;
      const remaining = (listing.durationDays || 14) - elapsed;
      if (remaining <= 0) return { text: 'Today', isToday: true };
      return { text: `${remaining}d`, isToday: false };
    }
    // Fallback for legacy listings
    const diff = new Date(listing.expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: 'Today', isToday: true };
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days > 0) return { text: `${days}d`, isToday: false };
    return { text: 'Today', isToday: true };
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          My Listings ({userListings.length})
        </h2>
        {userListings.length > 0 && (
          <div className="text-xs text-text-secondary">
            Potential Revenue: <span className="text-trophy-gold font-semibold">
              ${(userListings.reduce((sum, l) => sum + (l.currentBid || l.listingPrice), 0) / 1000).toFixed(0)}K
            </span>
          </div>
        )}
      </div>

      {/* Info Banner */}
      {userListings.length > 0 && (
        <div className="flex items-start gap-2 card p-2 bg-blue-900/10 border border-blue-500/20">
          <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-300/80">
            Listings expire after 14 days. If bids exist, the highest bid is automatically accepted. If no bids, the player is released to free agency. You can cancel a listing only if it has no bids.
          </p>
        </div>
      )}

      {/* Listings */}
      {userListings.length > 0 ? (
        <div className="space-y-2">
          {userListings.map((listing) => {
            const hasBids = listing.bids.length > 0;
            const { text: timeRemaining, isToday } = getTimeRemaining(listing);

            return (
              <div
                key={listing.id}
                className="card border border-border-primary p-3"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PlayerName
                        playerId={listing.player.id}
                        className="text-sm font-semibold text-text-primary"
                        initialTab="transfers"
                      />
                      {hasBids ? (
                        <span className="text-xs bg-cricket-accent/20 text-cricket-accent px-1.5 py-0.5 rounded border border-cricket-accent/30">
                          {listing.bids.length} bid{listing.bids.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs bg-bg-tertiary text-text-tertiary px-1.5 py-0.5 rounded">
                          No bids
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {listing.player.primaryRole || listing.player.role} · Rating: {listing.player.rating?.toFixed(1)}
                    </div>
                  </div>

                  {/* Time Remaining */}
                  <div className={`flex items-center gap-1 text-xs ${isToday ? 'text-red-400 font-medium' : 'text-text-secondary'}`}>
                    <Clock className="w-3 h-3" />
                    <span>{timeRemaining}</span>
                  </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <div className="text-xs text-text-tertiary">Asking</div>
                    <div className="text-sm font-semibold text-text-primary">
                      ${(listing.listingPrice / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-tertiary">Top Bid</div>
                    <div className={`text-sm font-semibold ${hasBids ? 'text-trophy-gold' : 'text-text-tertiary'}`}>
                      {hasBids ? `$${(listing.currentBid / 1000).toFixed(0)}K` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-tertiary">vs. Asking</div>
                    <div className={`text-sm font-semibold ${
                      hasBids
                        ? listing.currentBid >= listing.listingPrice ? 'text-cricket-accent' : 'text-red-400'
                        : 'text-text-tertiary'
                    }`}>
                      {hasBids
                        ? `${listing.currentBid >= listing.listingPrice ? '+' : ''}$${((listing.currentBid - listing.listingPrice) / 1000).toFixed(0)}K`
                        : '-'}
                    </div>
                  </div>
                </div>

                {/* Current Bidder */}
                {hasBids && listing.currentBidder && (
                  <div className="flex items-center justify-between p-1.5 bg-bg-tertiary rounded text-xs mb-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-cricket-accent" />
                      <span className="text-text-secondary">Leading:</span>
                      <TeamName teamId={listing.currentBidder} className="text-text-primary font-medium" />
                    </div>
                    <span className="text-trophy-gold font-semibold">
                      ${(listing.currentBid / 1000).toFixed(0)}K
                    </span>
                  </div>
                )}

                {/* Status / Actions */}
                <div className="flex items-center justify-between">
                  {hasBids ? (
                    <div className="text-xs text-text-tertiary">
                      Will auto-complete to highest bidder on expiry
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCancelListing(listing)}
                      className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-2.5 py-1 rounded text-xs font-medium transition-colors"
                    >
                      <Ban className="w-3 h-3" />
                      <span>Cancel Listing</span>
                    </button>
                  )}
                </div>

                {/* Bid History */}
                {listing.bids.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-border-primary">
                    <div className="text-xs text-text-tertiary mb-1">Bid History</div>
                    <div className="space-y-0.5">
                      {listing.bids.slice(-3).reverse().map((bid, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <TeamName teamId={bid.teamId} className="text-text-secondary" />
                          <span className="text-text-primary">${(bid.amount / 1000).toFixed(0)}K</span>
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
        <div className="text-center py-6 card border border-border-primary">
          <p className="text-text-secondary text-sm">You have no active listings</p>
          <p className="text-xs text-text-tertiary mt-1">
            List players from your Squad page during the transfer window
          </p>
        </div>
      )}
    </div>
  );
};

export default MyListingsView;
