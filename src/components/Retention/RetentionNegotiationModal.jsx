/**
 * @file RetentionNegotiationModal.jsx
 * @description Modal for negotiating retention salary with a player
 */

import React, { useState } from 'react';
import { X, DollarSign, UserCheck, UserX } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-800 border border-surface-600 rounded-lg w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-600">
          <h3 className="text-lg font-bold text-text-primary">Retention Negotiation</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        {/* Player Info */}
        <div className="p-4 border-b border-surface-600">
          <div className="flex items-center gap-3">
            <div>
              <PlayerName playerId={player.id} className="text-text-primary font-bold text-lg" />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-text-secondary text-sm capitalize">{player.role}</span>
                {player.topPlaystyles?.batting?.[0] && (
                  <PlaystyleBadge playstyle={player.topPlaystyles.batting[0].name} category="batting" />
                )}
                {player.topPlaystyles?.bowling?.[0] && (
                  <PlaystyleBadge playstyle={player.topPlaystyles.bowling[0].name} category="bowling" />
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-sm">
            <span className="text-text-secondary">Market Value: <span className="text-trophy-gold font-medium">{formatMoney(marketValue)}</span></span>
            <span className="text-text-secondary">Hint Range: {formatMoney(Math.round(marketValue * 0.75))} - {formatMoney(Math.round(marketValue * 1.1))}</span>
          </div>
        </div>

        {/* Attempt Counter */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Attempt</span>
            {[1, 2, 3].map(n => (
              <div key={n} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                n < attemptNumber ? 'bg-red-600 text-white' :
                n === attemptNumber ? 'bg-trophy-gold text-black' :
                'bg-surface-600 text-text-secondary'
              }`}>
                {n}
              </div>
            ))}
            <span className="text-xs text-text-secondary ml-1">of {maxAttempts}</span>
          </div>
        </div>

        {/* Player Response (if exists) */}
        {playerResponse && (
          <div className={`mx-4 mt-3 p-3 rounded text-sm ${
            playerResponse.reason === 'accepted' ? 'bg-green-900/30 border border-green-700 text-green-300' :
            playerResponse.reason === 'final_rejection' ? 'bg-red-900/30 border border-red-700 text-red-300' :
            'bg-yellow-900/30 border border-yellow-700 text-yellow-300'
          }`}>
            {playerResponse.reason === 'accepted' && 'Player has accepted the offer!'}
            {playerResponse.reason === 'wants_more' && (
              <>Player wants more. Counter-offer: <span className="font-bold">{formatMoney(playerResponse.counterOffer)}</span></>
            )}
            {playerResponse.reason === 'final_rejection' && 'Player has rejected all offers. Must be released to auction pool.'}
          </div>
        )}

        {/* Salary Input */}
        {(!playerResponse || playerResponse.reason === 'wants_more') && (
          <div className="p-4">
            <label className="block text-sm text-text-secondary mb-2">Offered Salary</label>
            <div className="flex items-center gap-3">
              <DollarSign size={16} className="text-trophy-gold" />
              <input
                type="range"
                min={minSalary}
                max={maxSalary}
                step={10000}
                value={offeredSalary}
                onChange={e => setOfferedSalary(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="text"
                value={formatMoney(offeredSalary)}
                readOnly
                className="w-24 bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-text-primary text-center"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-surface-600">
          {playerResponse?.reason === 'accepted' ? (
            <button
              onClick={onClose}
              className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded font-medium flex items-center justify-center gap-2"
            >
              <UserCheck size={16} /> Done
            </button>
          ) : playerResponse?.reason === 'final_rejection' ? (
            <button
              onClick={() => onRelease(player.id)}
              className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded font-medium flex items-center justify-center gap-2"
            >
              <UserX size={16} /> Release to Pool
            </button>
          ) : (
            <>
              {playerResponse?.counterOffer && (
                <button
                  onClick={() => onAcceptCounter(player.id, playerResponse.counterOffer)}
                  className="flex-1 bg-trophy-gold hover:bg-yellow-500 text-black py-2 rounded font-medium text-sm"
                >
                  Accept Counter ({formatMoney(playerResponse.counterOffer)})
                </button>
              )}
              <button
                onClick={() => onPropose(player.id, offeredSalary)}
                className="flex-1 bg-cricket-green hover:bg-green-700 text-white py-2 rounded font-medium text-sm"
              >
                Propose {formatMoney(offeredSalary)}
              </button>
              <button
                onClick={() => onRelease(player.id)}
                className="bg-surface-600 hover:bg-surface-500 text-text-secondary py-2 px-4 rounded text-sm"
              >
                Release
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetentionNegotiationModal;
