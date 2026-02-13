/**
 * @file BidModal.jsx
 * @description Modal for placing bids on transfer listings
 * Shows player details, current bid, and bid input with validation
 */

import React, { useState, useMemo } from 'react';
import { X, TrendingUp, AlertCircle } from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';

const BidModal = ({ listing, onClose, onConfirm, userBudget }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');

  // Calculate bid constraints
  const minBid = useMemo(() => {
    return listing.currentBid > 0
      ? listing.currentBid + 10000 // +$10K minimum increment
      : listing.listingPrice;
  }, [listing.currentBid, listing.listingPrice]);

  const suggestedBid = minBid + 20000; // +$20K over minimum
  const maxBid = listing.listingPrice * 1.5; // 150% of listing price

  // Validate bid amount
  const validateBid = (amount) => {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return 'Please enter a valid amount';
    }

    if (numAmount < minBid) {
      return `Minimum bid is $${(minBid / 1000).toFixed(0)}K`;
    }

    if (numAmount > maxBid) {
      return `Maximum bid is $${(maxBid / 1000).toFixed(0)}K`;
    }

    if (numAmount > userBudget) {
      const shortfall = numAmount - userBudget;
      return `Insufficient budget (need $${(shortfall / 1000).toFixed(0)}K more)`;
    }

    return null;
  };

  // Handle bid input change
  const handleBidChange = (e) => {
    const value = e.target.value;
    setBidAmount(value);

    // Clear error when user types
    if (error) setError('');
  };

  // Handle quick bid buttons
  const handleQuickBid = (amount) => {
    setBidAmount(amount.toString());
    setError('');
  };

  // Handle confirm
  const handleConfirm = () => {
    const numAmount = parseFloat(bidAmount);
    const validationError = validateBid(numAmount);

    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm(numAmount);
  };

  // Remaining budget after bid
  const remainingBudget = userBudget - (parseFloat(bidAmount) || 0);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-secondary border border-gray-700 rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Place Bid</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Player Info */}
          <div className="bg-tertiary border border-gray-700 rounded p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <PlayerName playerId={listing.player.id} className="text-lg font-semibold text-white" />
                <div className="text-sm text-gray-400 mt-1">
                  {listing.player.primaryRole || listing.player.role} • Rating: {listing.player.rating?.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Listed by: <TeamName teamId={listing.teamId} className="text-white" />
            </div>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-tertiary border border-gray-700 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Asking Price</div>
              <div className="text-lg font-semibold text-white">
                ${(listing.listingPrice / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="bg-tertiary border border-gray-700 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Current Bid</div>
              <div className="text-lg font-semibold text-trophy-gold">
                {listing.currentBid > 0
                  ? `$${(listing.currentBid / 1000).toFixed(0)}K`
                  : 'No bids'}
              </div>
            </div>
          </div>

          {/* Bid Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Bid Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={bidAmount}
                onChange={handleBidChange}
                placeholder={(minBid / 1000).toFixed(0)}
                className="w-full bg-tertiary border border-gray-700 rounded py-2 pl-8 pr-12 text-white focus:outline-none focus:border-cricket-accent"
                min={minBid}
                step={10000}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">K</span>
            </div>
            {error && (
              <div className="flex items-center gap-1 mt-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick Bid Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickBid(minBid)}
              className="bg-tertiary hover:bg-gray-700 text-white py-2 rounded text-sm transition-colors"
            >
              Min: ${(minBid / 1000).toFixed(0)}K
            </button>
            <button
              onClick={() => handleQuickBid(suggestedBid)}
              className="bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded text-sm transition-colors"
            >
              Suggested: ${(suggestedBid / 1000).toFixed(0)}K
            </button>
            <button
              onClick={() => handleQuickBid(maxBid)}
              className="bg-tertiary hover:bg-gray-700 text-white py-2 rounded text-sm transition-colors"
            >
              Max: ${(maxBid / 1000).toFixed(0)}K
            </button>
          </div>

          {/* Budget Info */}
          <div className="bg-tertiary border border-gray-700 rounded p-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Current Budget:</span>
              <span className="text-white font-semibold">${(userBudget / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">After Bid:</span>
              <span className={`font-semibold ${remainingBudget >= 0 ? 'text-cricket-accent' : 'text-red-400'}`}>
                ${(remainingBudget / 1000).toFixed(0)}K
              </span>
            </div>
          </div>

          {/* Bid Activity */}
          {listing.bids && listing.bids.length > 0 && (
            <div className="bg-tertiary border border-gray-700 rounded p-3">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                <TrendingUp className="w-4 h-4" />
                <span>Recent Activity ({listing.bids.length} bids)</span>
              </div>
              <div className="text-sm text-gray-300">
                {listing.interestedTeams?.length || 0} teams interested
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 bg-tertiary hover:bg-gray-700 text-white py-2 rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded font-medium transition-colors"
            disabled={!bidAmount || parseFloat(bidAmount) < minBid}
          >
            Confirm Bid
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidModal;
