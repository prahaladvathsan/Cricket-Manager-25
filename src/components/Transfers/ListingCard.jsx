/**
 * @file ListingCard.jsx
 * @description Individual transfer listing card component
 * Displays player info, current bid, time remaining, and bid button
 */

import React, { useMemo } from 'react';
import { Clock, TrendingUp, Users } from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';

const ListingCard = ({ listing, onPlaceBid, userTeamId }) => {
  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    const now = Date.now();
    const expires = new Date(listing.expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }, [listing.expiresAt]);

  // Check if user is current bidder
  const isUserWinning = listing.currentBidder === userTeamId;
  const isOwnListing = listing.teamId === userTeamId;

  // Get primary role display
  const role = listing.player.primaryRole || listing.player.role || 'All-rounder';

  // Interest level indicator
  const interestLevel = listing.interestedTeams?.length || 0;
  const interestLabel = interestLevel >= 5 ? 'High' : interestLevel >= 2 ? 'Medium' : 'Low';
  const interestColor = interestLevel >= 5 ? 'text-trophy-gold' : interestLevel >= 2 ? 'text-yellow-500' : 'text-gray-500';

  return (
    <div className={`card border ${isOwnListing ? 'border-cricket-accent' : 'border-border-primary'} p-2`}>
      {/* Player Header */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <PlayerName playerId={listing.player.id} className="text-sm font-semibold text-text-primary truncate" />
            {isUserWinning && (
              <span className="text-xs bg-cricket-accent text-white px-1.5 py-0.5 rounded flex-shrink-0">
                Winning
              </span>
            )}
            {isOwnListing && (
              <span className="text-xs bg-trophy-gold text-gray-900 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                Yours
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary">
            <span>{role}</span>
            <span>•</span>
            <span>Rat: {listing.player.rating?.toFixed(1) || 'N/A'}</span>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="text-right flex-shrink-0 ml-2">
          <div className="flex items-center gap-0.5 text-xs text-text-secondary">
            <Clock className="w-3 h-3" />
            <span>{timeRemaining}</span>
          </div>
        </div>
      </div>

      {/* Listed By */}
      <div className="mb-2 text-xs text-text-secondary">
        By: <TeamName teamId={listing.teamId} className="text-text-primary" showYouSuffix />
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-xs text-text-tertiary mb-0.5">Asking</div>
          <div className="text-sm font-semibold text-text-primary">
            ${(listing.listingPrice / 1000).toFixed(0)}K
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary mb-0.5">Current Bid</div>
          <div className={`text-sm font-semibold ${listing.currentBid > 0 ? 'text-trophy-gold' : 'text-text-tertiary'}`}>
            {listing.currentBid > 0 ? `$${(listing.currentBid / 1000).toFixed(0)}K` : 'No bids'}
          </div>
        </div>
      </div>

      {/* AI Interest & Bids */}
      <div className="flex items-center gap-3 mb-2 text-xs">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-text-tertiary" />
          <span className="text-text-secondary">Interest:</span>
          <span className={interestColor}>{interestLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-text-tertiary" />
          <span className="text-text-secondary">Bids:</span>
          <span className="text-text-primary">{listing.bids?.length || 0}</span>
        </div>
      </div>

      {/* Action Button */}
      {!isOwnListing && (
        <button
          onClick={() => onPlaceBid(listing)}
          className="w-full bg-cricket-accent hover:bg-cricket-accent-dark text-white py-1.5 rounded text-sm font-medium transition-colors"
          disabled={timeRemaining === 'Expired'}
        >
          {isUserWinning ? 'Increase Bid' : 'Place Bid'}
        </button>
      )}

      {isOwnListing && listing.bids?.length > 0 && (
        <div className="text-center py-1.5 bg-cricket-accent/10 rounded">
          <div className="text-xs text-cricket-accent font-medium">
            Current bid: ${(listing.currentBid / 1000).toFixed(0)}K ({listing.bids.length} bids)
          </div>
        </div>
      )}

      {isOwnListing && listing.bids?.length === 0 && (
        <div className="text-center py-1.5 text-text-tertiary text-xs">
          No bids yet
        </div>
      )}
    </div>
  );
};

export default ListingCard;
