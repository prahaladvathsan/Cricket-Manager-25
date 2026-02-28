/**
 * @file RetentionNegotiationModal.jsx
 * @description Modal for negotiating retention salary with a player
 */

import React, { useState } from 'react';
import { X, UserCheck, UserX, ChevronRight } from 'lucide-react';
import PlayerName from '../shared/PlayerName';
import PlaystyleBadge from '../shared/PlaystyleBadge';
import retentionConfig from '../../data/config/retentionConfig.json';

const RetentionNegotiationModal = ({ player, marketValue, attemptNumber, playerResponse, onPropose, onAcceptCounter, onRelease, onClose }) => {
  const [offeredSalary, setOfferedSalary] = useState(
    playerResponse?.counterOffer || Math.round(marketValue * 0.8)
  );

  const maxAttempts = retentionConfig.negotiation.maxAttemptsPerPlayer;
  const minSalary = Math.round(marketValue * 0.5);
  const maxSalary = Math.round(marketValue * 1.2);

  const formatMoney = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    return `$${(val / 1000).toFixed(0)}K`;
  };

  // Slider percentage for custom track fill
  const sliderPct = maxSalary > minSalary ? ((offeredSalary - minSalary) / (maxSalary - minSalary)) * 100 : 50;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50">
      <div className="bg-bg-tertiary border border-border-primary rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <h3 className="text-base font-bold text-text-primary">Retention Negotiation</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Player Info */}
        <div className="px-4 py-3 border-b border-border-primary">
          <div className="flex items-center justify-between">
            <div>
              <PlayerName playerId={player.id} className="text-text-primary font-bold text-base" />
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-text-tertiary text-xs capitalize">{player.role}</span>
                {player.topPlaystyles?.batting?.[0] && (
                  <PlaystyleBadge playstyle={player.topPlaystyles.batting[0].name} category="batting" />
                )}
                {player.topPlaystyles?.bowling?.[0] && (
                  <PlaystyleBadge playstyle={player.topPlaystyles.bowling[0].name} category="bowling" />
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-trophy-gold font-bold text-base">{formatMoney(marketValue)}</div>
              <div className="text-text-tertiary text-xs">Market Value</div>
            </div>
          </div>

          {/* Attempt progress bar */}
          <div className="flex items-center gap-1.5 mt-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xxs font-bold transition-colors ${
                  n < attemptNumber ? 'bg-text-tertiary text-bg-primary' :
                  n === attemptNumber ? 'bg-trophy-gold text-bg-primary' :
                  'bg-bg-tertiary text-text-tertiary'
                }`}>
                  {n}
                </div>
                {n < maxAttempts && (
                  <ChevronRight size={10} className="text-text-tertiary" />
                )}
              </div>
            ))}
            <span className="text-xxs text-text-tertiary ml-1">Attempt {attemptNumber} of {maxAttempts}</span>
          </div>
        </div>

        {/* Player Response */}
        {playerResponse && (
          <div className={`mx-4 mt-3 px-3 py-2 rounded text-sm ${
            playerResponse.reason === 'accepted' ? 'bg-green-900/40 border border-green-800 text-green-400' :
            playerResponse.reason === 'final_rejection' ? 'bg-red-900/40 border border-red-800 text-red-400' :
            'bg-yellow-900/30 border border-yellow-800/60 text-yellow-400'
          }`}>
            {playerResponse.reason === 'accepted' && (
              <span className="flex items-center gap-2"><UserCheck size={14} /> Player accepted the offer!</span>
            )}
            {playerResponse.reason === 'wants_more' && (
              <span>Wants more — counter-offer: <span className="font-bold text-yellow-300">{formatMoney(playerResponse.counterOffer)}</span></span>
            )}
            {playerResponse.reason === 'final_rejection' && (
              <span className="flex items-center gap-2"><UserX size={14} /> Final rejection. Must be released.</span>
            )}
          </div>
        )}

        {/* Salary Slider */}
        {(!playerResponse || playerResponse.reason === 'wants_more') && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">Your Offer</span>
              <span className="text-base font-bold text-text-primary">{formatMoney(offeredSalary)}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={minSalary}
                max={maxSalary}
                step={10000}
                value={offeredSalary}
                onChange={e => setOfferedSalary(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-trophy-gold [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg-primary
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-trophy-gold [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-bg-primary"
                style={{
                  background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${sliderPct}%, #242B33 ${sliderPct}%, #242B33 100%)`
                }}
              />
            </div>
            <div className="flex justify-between text-xxs text-text-tertiary mt-1">
              <span>{formatMoney(minSalary)}</span>
              <span>{formatMoney(maxSalary)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border-primary">
          {playerResponse?.reason === 'accepted' ? (
            <button
              onClick={onClose}
              className="w-full bg-green-700 hover:bg-green-600 text-white py-2.5 rounded font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <UserCheck size={16} /> Done
            </button>
          ) : playerResponse?.reason === 'final_rejection' ? (
            <button
              onClick={() => onRelease(player.id)}
              className="w-full bg-red-700 hover:bg-red-600 text-white py-2.5 rounded font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <UserX size={16} /> Release to Auction Pool
            </button>
          ) : (
            <div className="space-y-2">
              {/* Primary action row */}
              <div className="flex gap-2">
                {playerResponse?.counterOffer && (
                  <button
                    onClick={() => onAcceptCounter(player.id, playerResponse.counterOffer)}
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2.5 rounded font-semibold text-sm transition-colors"
                  >
                    Accept {formatMoney(playerResponse.counterOffer)}
                  </button>
                )}
                <button
                  onClick={() => onPropose(player.id, offeredSalary)}
                  className="flex-1 bg-trophy-gold hover:bg-cricket-accent-light text-bg-primary py-2.5 rounded font-semibold text-sm transition-colors"
                >
                  Propose {formatMoney(offeredSalary)}
                </button>
              </div>
              {/* Secondary action */}
              <button
                onClick={() => onRelease(player.id)}
                className="w-full bg-red-900/40 hover:bg-red-800/50 text-red-400 py-1.5 rounded text-xs font-medium transition-colors border border-red-800/50"
              >
                Release Player
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetentionNegotiationModal;
