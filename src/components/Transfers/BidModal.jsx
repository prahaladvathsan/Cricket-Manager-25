/**
 * @file BidModal.jsx
 * @description Modal for placing bids on transfer listings
 * Shows player details, current bid, and bid input with validation
 * All user input is in $K, converted to full dollars for the handler
 */

import React, { useState, useMemo } from 'react';
import { X, TrendingUp, AlertCircle, Info } from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';

const BidModal = ({ listing, onClose, onConfirm, userBudget }) => {
  const [bidAmountK, setBidAmountK] = useState('');
  const [error, setError] = useState('');

  // Calculate bid constraints (in full dollars internally)
  const minBid = useMemo(() => {
    return listing.currentBid > 0
      ? listing.currentBid + 10000 // +$10K minimum increment
      : listing.listingPrice;
  }, [listing.currentBid, listing.listingPrice]);

  const suggestedBid = minBid + 20000;
  // Half-price economics: full-bid ceiling is 2x current budget
  const maxAffordableBid = userBudget * 2;

  const bidAmountFull = (parseFloat(bidAmountK) || 0) * 1000;

  const validateBid = (amount) => {
    if (isNaN(amount) || amount <= 0) {
      return 'Please enter a valid amount';
    }
    if (amount < minBid) {
      return `Minimum bid is $${(minBid / 1000).toFixed(0)}K`;
    }
    // Half-price economics: actual cost is half the bid
    const actualCost = Math.round(amount / 2);
    if (actualCost > userBudget) {
      const shortfall = actualCost - userBudget;
      return `Insufficient budget (need $${(shortfall / 1000).toFixed(0)}K more)`;
    }
    return null;
  };

  const handleBidChange = (e) => {
    setBidAmountK(e.target.value);
    if (error) setError('');
  };

  const handleQuickBid = (fullAmount) => {
    setBidAmountK((fullAmount / 1000).toString());
    setError('');
  };

  const handleConfirm = () => {
    const validationError = validateBid(bidAmountFull);
    if (validationError) {
      setError(validationError);
      return;
    }
    onConfirm(bidAmountFull);
  };

  // Actual cost to buyer (half-price economics)
  const actualCost = Math.round(bidAmountFull / 2);
  const remainingBudget = userBudget - actualCost;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="card border border-border-primary max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border-primary">
          <h2 className="text-base font-bold text-text-primary">Place Bid</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Player Info */}
          <div className="card bg-bg-tertiary p-2">
            <div className="flex items-start justify-between mb-1">
              <div>
                <PlayerName playerId={listing.player.id} className="text-sm font-semibold text-text-primary" />
                <div className="text-xs text-text-tertiary mt-0.5">
                  {listing.player.primaryRole || listing.player.role} · Rating: {listing.player.rating?.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="text-xs text-text-secondary">
              Listed by: <TeamName teamId={listing.teamId} className="text-text-primary" />
            </div>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-2 gap-2">
            <div className="card bg-bg-tertiary p-2">
              <div className="text-xs text-text-tertiary mb-0.5">Asking Price</div>
              <div className="text-base font-semibold text-text-primary">
                ${(listing.listingPrice / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="card bg-bg-tertiary p-2">
              <div className="text-xs text-text-tertiary mb-0.5">Current Bid</div>
              <div className="text-base font-semibold text-trophy-gold">
                {listing.currentBid > 0
                  ? `$${(listing.currentBid / 1000).toFixed(0)}K`
                  : 'No bids'}
              </div>
              {listing.currentBidder && (
                <div className="text-xs text-text-tertiary mt-0.5">
                  by <TeamName teamId={listing.currentBidder} className="text-text-secondary" />
                </div>
              )}
            </div>
          </div>

          {/* Bid Input */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Your Bid ($K)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">$</span>
              <input
                type="number"
                value={bidAmountK}
                onChange={handleBidChange}
                placeholder={(minBid / 1000).toFixed(0)}
                className="w-full card border border-border-primary py-2 pl-7 pr-8 text-text-primary focus:outline-none focus:border-cricket-accent"
                min={minBid / 1000}
                step={10}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">K</span>
            </div>
            {error && (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick Bid Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickBid(minBid)}
              className="card bg-bg-tertiary hover:bg-border-primary text-text-primary py-1.5 rounded text-xs transition-colors"
            >
              Min: ${(minBid / 1000).toFixed(0)}K
            </button>
            <button
              onClick={() => handleQuickBid(suggestedBid)}
              className="bg-cricket-accent hover:bg-cricket-accent-dark text-white py-1.5 rounded text-xs transition-colors"
            >
              ${(suggestedBid / 1000).toFixed(0)}K
            </button>
            <button
              onClick={() => handleQuickBid(maxAffordableBid)}
              className="card bg-bg-tertiary hover:bg-border-primary text-text-primary py-1.5 rounded text-xs transition-colors"
            >
              Budget: ${(maxAffordableBid / 1000).toFixed(0)}K
            </button>
          </div>

          {/* Budget Info */}
          <div className="card bg-bg-tertiary p-2 text-xs">
            <div className="flex justify-between mb-0.5">
              <span className="text-text-tertiary">Your Budget:</span>
              <span className="text-text-primary font-semibold">${(userBudget / 1000).toFixed(0)}K</span>
            </div>
            {bidAmountFull > 0 && (
              <>
                <div className="flex justify-between mb-0.5">
                  <span className="text-text-tertiary">Actual Cost (50%):</span>
                  <span className="text-text-primary font-semibold">${(actualCost / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Budget After:</span>
                  <span className={`font-semibold ${remainingBudget >= 0 ? 'text-cricket-accent' : 'text-red-400'}`}>
                    ${(remainingBudget / 1000).toFixed(0)}K
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Half-price explainer */}
          <div className="flex items-start gap-1.5 text-xs text-text-tertiary">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Transfer costs are 50% of the bid price (half-year salary). The highest bid is automatically accepted when the listing expires.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-3 border-t border-border-primary">
          <button
            onClick={onClose}
            className="flex-1 card border border-border-primary text-text-secondary hover:text-text-primary py-2 rounded text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!bidAmountK || parseFloat(bidAmountK) * 1000 < minBid}
          >
            Place Bid
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidModal;
