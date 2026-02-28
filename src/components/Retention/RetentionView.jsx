/**
 * @file RetentionView.jsx
 * @description Full-screen retention phase UI — user selects players to retain before auction
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, UserX, Shield, DollarSign, AlertTriangle } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';
import SortableTable from '../shared/SortableTable';
import PlayerName from '../shared/PlayerName';
import PlaystyleBadge from '../shared/PlaystyleBadge';
import RetentionNegotiationModal from './RetentionNegotiationModal';
import RetentionEngine from '../../core/retention/RetentionEngine';
import RetentionAI from '../../core/retention/RetentionAI';
import { evaluateOffer } from '../../core/retention/PlayerAcceptance';
import retentionConfig from '../../data/config/retentionConfig.json';

const retentionEngine = new RetentionEngine();
const retentionAI = new RetentionAI();

const formatMoney = (val) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  return `$${(val / 1000).toFixed(0)}K`;
};

const RetentionView = () => {
  const navigate = useNavigate();
  const [negotiatingPlayer, setNegotiatingPlayer] = useState(null);
  const [playerResponse, setPlayerResponse] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null); // { type, playerId, playerName }

  // Store state
  const { teamRetentions, confirmRetention, releaseToPool } = useTeamStore();
  const userTeamId = useTeamStore(s => s.userTeamId);
  const squadLists = useTeamStore(s => s.squadLists);
  const completeRetentionPhase = useGameStore(s => s.completeRetentionPhase);
  const players = usePlayerStore(s => s.players);
  const currentSeason = useGameStore(s => s.currentSeason);

  // Get user team's squad and retention state
  const userSquadIds = squadLists[userTeamId] || [];
  const userSquad = useMemo(() => userSquadIds.map(id => players[id]).filter(Boolean), [userSquadIds, players]);
  const userRetention = teamRetentions[userTeamId] || { retainedPlayers: [], releasedPlayers: [], totalSalary: 0, auctionPurse: 10000000 };

  // Categorize players
  const retainedIds = new Set(userRetention.retainedPlayers.map(r => r.playerId));
  const releasedIds = new Set(userRetention.releasedPlayers.map(r => r.playerId));

  const squadWithStatus = useMemo(() => userSquad.map(p => {
    const marketValue = retentionAI.getMarketValue(p);
    let status = 'pending';
    let salary = null;
    if (retainedIds.has(p.id)) {
      status = 'retained';
      salary = userRetention.retainedPlayers.find(r => r.playerId === p.id)?.salary;
    } else if (releasedIds.has(p.id)) {
      status = 'released';
    }
    return { ...p, retentionStatus: status, marketValue, retentionSalary: salary };
  }), [userSquad, retainedIds, releasedIds, userRetention]);

  const pendingPlayers = squadWithStatus.filter(p => p.retentionStatus === 'pending');
  const retainedCount = userRetention.retainedPlayers.length;

  // Tier progress
  const currentTier = retentionConfig.retentionCaps.tiers.find(t => retainedCount < t.retentionsUpTo) || retentionConfig.retentionCaps.tiers[retentionConfig.retentionCaps.tiers.length - 1];
  const tierCapUsedPct = currentTier ? (userRetention.totalSalary / currentTier.cumulativeSalaryCap) * 100 : 100;

  // Handlers
  const handlePropose = (playerId, offeredSalary) => {
    const player = players[playerId];
    const marketValue = retentionAI.getMarketValue(player);

    // Validate tier cap first
    const validation = retentionEngine.validateRetention(userTeamId, userRetention.retainedPlayers, offeredSalary);
    if (!validation.valid) {
      alert(validation.reason);
      return;
    }

    const result = evaluateOffer(player, offeredSalary, marketValue, attemptNumber);

    if (result.accepted) {
      confirmRetention(userTeamId, playerId, offeredSalary);
      setPlayerResponse({ ...result });
    } else {
      setPlayerResponse(result);
      setAttemptNumber(prev => prev + 1);

      if (result.reason === 'final_rejection') {
        releaseToPool(userTeamId, playerId, 'final_rejection');
      }
    }
  };

  const handleAcceptCounter = (playerId, counterOffer) => {
    const validation = retentionEngine.validateRetention(userTeamId, userRetention.retainedPlayers, counterOffer);
    if (!validation.valid) {
      alert(validation.reason);
      return;
    }
    confirmRetention(userTeamId, playerId, counterOffer);
    setPlayerResponse({ accepted: true, counterOffer: null, reason: 'accepted' });
  };

  const handleRelease = (playerId) => {
    const player = players[playerId];
    setConfirmAction({ type: 'release', playerId, playerName: player?.name || 'this player' });
  };

  const confirmRelease = (playerId) => {
    releaseToPool(userTeamId, playerId, 'user_released');
    setNegotiatingPlayer(null);
    setPlayerResponse(null);
    setAttemptNumber(1);
    setConfirmAction(null);
  };

  const handleComplete = () => {
    setConfirmAction({ type: 'complete', pendingCount: pendingPlayers.length });
  };

  const confirmComplete = () => {
    // Release all pending players
    for (const p of pendingPlayers) {
      releaseToPool(userTeamId, p.id, 'not_retained');
    }

    // Finalize retentions
    const stores = { playerStore: usePlayerStore, teamStore: useTeamStore };
    retentionEngine.finalizeRetentions(useTeamStore.getState().teamRetentions, stores);
    completeRetentionPhase();
    setConfirmAction(null);

    // Navigate to auction
    navigate('/game/transfers');
  };

  const openNegotiation = (player) => {
    setNegotiatingPlayer(player);
    setPlayerResponse(null);
    setAttemptNumber(1);
  };

  // Table columns
  const columns = [
    {
      key: 'player',
      label: 'Player',
      sortKey: 'name',
      render: (row) => <PlayerName playerId={row.id} className="text-text-primary font-medium" />
    },
    {
      key: 'role',
      label: 'Role',
      sortKey: 'role',
      render: (row) => <span className="text-text-secondary capitalize text-sm">{row.role}</span>
    },
    {
      key: 'playstyle',
      label: 'Playstyle',
      render: (row) => (
        <div className="flex gap-1">
          {row.topPlaystyles?.batting?.[0] && <PlaystyleBadge playstyle={row.topPlaystyles.batting[0].name} category="batting" />}
          {row.topPlaystyles?.bowling?.[0] && <PlaystyleBadge playstyle={row.topPlaystyles.bowling[0].name} category="bowling" />}
        </div>
      )
    },
    {
      key: 'marketValue',
      label: 'Market Value',
      sortKey: 'marketValue',
      render: (row) => <span className="text-trophy-gold font-medium">{formatMoney(row.marketValue)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortKey: 'retentionStatus',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          row.retentionStatus === 'retained' ? 'bg-green-900/40 text-green-400 border border-green-700' :
          row.retentionStatus === 'released' ? 'bg-red-900/40 text-red-400 border border-red-700' :
          'bg-surface-600 text-text-secondary'
        }`}>
          {row.retentionStatus === 'retained' && `Retained (${formatMoney(row.retentionSalary)})`}
          {row.retentionStatus === 'released' && 'Released'}
          {row.retentionStatus === 'pending' && 'Pending'}
        </span>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => row.retentionStatus === 'pending' ? (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openNegotiation(row); }}
            className="px-2 py-1 bg-cricket-green hover:bg-green-700 text-white rounded text-xs font-medium"
          >
            Retain
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleRelease(row.id); }}
            className="px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded text-xs font-medium"
          >
            Release
          </button>
        </div>
      ) : null
    }
  ];

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Squad Table */}
      <div className="flex-1 min-w-0">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Shield size={20} className="text-trophy-gold" />
            Season {currentSeason} Pre-Auction Retention
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Retain up to {retentionConfig.retentionCaps.maxRetentionsPerTeam} players before the auction. Retained salaries reduce your auction purse.
          </p>
        </div>

        <SortableTable
          data={squadWithStatus}
          columns={columns}
          defaultSortKey="marketValue"
          defaultSortDirection="desc"
          rowKey="id"
        />
      </div>

      {/* Right: Summary Panel */}
      <div className="w-72 shrink-0">
        <div className="bg-surface-800 border border-surface-600 rounded-lg p-4 sticky top-4">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <DollarSign size={16} className="text-trophy-gold" /> Retention Summary
          </h3>

          {/* Retained count */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">Retained</span>
              <span className="text-text-primary font-medium">
                {retainedCount} / {retentionConfig.retentionCaps.maxRetentionsPerTeam}
              </span>
            </div>
            <div className="w-full bg-surface-600 rounded-full h-2">
              <div
                className="bg-cricket-green rounded-full h-2 transition-all"
                style={{ width: `${(retainedCount / retentionConfig.retentionCaps.maxRetentionsPerTeam) * 100}%` }}
              />
            </div>
          </div>

          {/* Tier cap progress */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">Salary Cap Used</span>
              <span className="text-text-primary font-medium">
                {formatMoney(userRetention.totalSalary)} / {formatMoney(currentTier?.cumulativeSalaryCap || 0)}
              </span>
            </div>
            <div className="w-full bg-surface-600 rounded-full h-2">
              <div
                className={`rounded-full h-2 transition-all ${tierCapUsedPct > 90 ? 'bg-red-500' : tierCapUsedPct > 70 ? 'bg-yellow-500' : 'bg-trophy-gold'}`}
                style={{ width: `${Math.min(100, tierCapUsedPct)}%` }}
              />
            </div>
          </div>

          {/* Tier breakdown */}
          <div className="mb-3 space-y-1">
            <span className="text-xs text-text-secondary font-medium">Tier Caps:</span>
            {retentionConfig.retentionCaps.tiers.map((tier, i) => (
              <div key={i} className={`flex justify-between text-xs ${
                retainedCount <= tier.retentionsUpTo && (i === 0 || retainedCount > retentionConfig.retentionCaps.tiers[i-1].retentionsUpTo)
                  ? 'text-trophy-gold font-medium' : 'text-text-secondary'
              }`}>
                <span>Up to {tier.retentionsUpTo} players</span>
                <span>{formatMoney(tier.cumulativeSalaryCap)}</span>
              </div>
            ))}
          </div>

          {/* Auction purse */}
          <div className="border-t border-surface-600 pt-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Auction Purse</span>
              <span className="text-trophy-gold font-bold">{formatMoney(userRetention.auctionPurse)}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              ${formatMoney(retentionConfig.auctionPurse.base)} base - {formatMoney(userRetention.totalSalary)} retained
            </p>
          </div>

          {/* Pending warning */}
          {pendingPlayers.length > 0 && (
            <div className="flex items-start gap-2 mb-3 p-2 bg-yellow-900/20 border border-yellow-800 rounded text-xs text-yellow-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{pendingPlayers.length} player(s) still pending — they will be released to auction if you complete now.</span>
            </div>
          )}

          {/* Complete button */}
          <button
            onClick={handleComplete}
            className="w-full bg-cricket-green hover:bg-green-700 text-white py-2 rounded font-medium text-sm flex items-center justify-center gap-2"
          >
            <UserCheck size={16} /> Complete Retentions
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50">
          <div className="bg-bg-tertiary border border-border-primary rounded-lg w-full max-w-sm shadow-xl p-5">
            <h3 className="text-lg font-bold text-text-primary mb-3">
              {confirmAction.type === 'release' ? 'Release Player' : 'Complete Retentions'}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {confirmAction.type === 'release'
                ? `Are you sure you want to release ${confirmAction.playerName}? They will be added to the auction pool.`
                : `Are you sure you want to complete retentions?${confirmAction.pendingCount > 0 ? ` ${confirmAction.pendingCount} pending player(s) will be released to the auction pool.` : ''}`
              }
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-3 py-2 bg-bg-tertiary hover:bg-bg-hover text-text-secondary rounded text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmAction.type === 'release' ? confirmRelease(confirmAction.playerId) : confirmComplete()}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium text-white ${
                  confirmAction.type === 'release' ? 'bg-red-700 hover:bg-red-600' : 'bg-cricket-green hover:bg-green-700'
                }`}
              >
                {confirmAction.type === 'release' ? 'Release' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Negotiation Modal */}
      {negotiatingPlayer && (
        <RetentionNegotiationModal
          player={negotiatingPlayer}
          marketValue={negotiatingPlayer.marketValue}
          attemptNumber={attemptNumber}
          playerResponse={playerResponse}
          onPropose={handlePropose}
          onAcceptCounter={handleAcceptCounter}
          onRelease={handleRelease}
          onClose={() => {
            setNegotiatingPlayer(null);
            setPlayerResponse(null);
            setAttemptNumber(1);
          }}
        />
      )}
    </div>
  );
};

export default RetentionView;
