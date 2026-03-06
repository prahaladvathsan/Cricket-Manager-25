/**
 * @file MyListingsView.jsx
 * @description Full squad table with list/release actions during transfer window
 */

import React, { useState, useMemo } from 'react';
import { Tag, Info, X } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import useTransferStore from '../../stores/transferStore';
import PlayerName from '../shared/PlayerName';
import SortableTable from '../shared/SortableTable';

const MyListingsView = ({ userTeamId, transferHandler }) => {
  const { getPlayersByTeam, careerStats, currentSeasonId } = usePlayerStore();
  const activeListings = useTransferStore(state => state.activeListings);

  // Listing modal state
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedPlayerForListing, setSelectedPlayerForListing] = useState(null);
  const [listingPrice, setListingPrice] = useState('');

  const squadPlayers = useMemo(() => getPlayersByTeam(userTeamId), [userTeamId, getPlayersByTeam]);

  const listedPlayerIds = useMemo(() => {
    return new Set(
      activeListings
        .filter(l => l.teamId === userTeamId)
        .map(l => l.playerId || l.player?.id)
    );
  }, [activeListings, userTeamId]);

  const userListingsCount = activeListings.filter(l => l.teamId === userTeamId).length;

  // Stat helpers
  const getStat = (pid, path) => {
    const seasons = careerStats[pid]?.seasons;
    if (!seasons || !currentSeasonId) return null;
    const s = seasons[currentSeasonId];
    if (!s) return null;
    return path.split('.').reduce((obj, key) => obj?.[key], s) ?? null;
  };

  const fmtNum = (val, decimals = 0) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toFixed(decimals);
  };

  // Handlers
  const handleListPlayer = (player) => {
    setSelectedPlayerForListing(player);
    setListingPrice('');
    setShowListingModal(true);
  };

  const confirmListing = () => {
    if (!selectedPlayerForListing || !listingPrice) return;
    const price = parseFloat(listingPrice) * 1000;
    if (isNaN(price) || price < 50000) {
      alert('Minimum listing price is $50K');
      return;
    }
    const result = transferHandler.listPlayerForSale(userTeamId, selectedPlayerForListing.id, price);
    if (result.success) {
      setShowListingModal(false);
      setSelectedPlayerForListing(null);
      setListingPrice('');
    } else {
      alert(result.error || 'Failed to list player');
    }
  };

  const handleReleasePlayer = (player) => {
    const recoup = Math.round((player.soldPrice || 0) * 0.5 * 0.3);
    const confirmed = window.confirm(
      `Release ${player.name} from your squad?\n\n` +
      (recoup > 0 ? `You will recoup $${(recoup / 1000).toFixed(0)}K.\n` : '') +
      `The player will become a free agent.`
    );
    if (confirmed) {
      const result = transferHandler.releasePlayer(userTeamId, player.id);
      if (!result.success) {
        alert(result.error || 'Failed to release player');
      }
    }
  };

  // Build table data
  const tableData = useMemo(() => squadPlayers.map(player => {
    const pid = player.id;
    const matches = getStat(pid, 'matches') ?? 0;
    const batRuns = getStat(pid, 'batting.runs') ?? 0;
    const batBalls = getStat(pid, 'batting.balls') ?? 0;
    const batDismissals = getStat(pid, 'batting.dismissals') ?? 0;
    const batImpact = getStat(pid, 'batting.impact') ?? 0;
    const wkts = getStat(pid, 'bowling.wickets') ?? 0;
    const bowlRuns = getStat(pid, 'bowling.runs') ?? 0;
    const bowlBalls = getStat(pid, 'bowling.balls') ?? 0;
    const bowlImpact = getStat(pid, 'bowling.impact') ?? 0;
    const fieldImpact = getStat(pid, 'fielding.impact') ?? 0;
    const totalImpact = batImpact + bowlImpact + fieldImpact;

    return {
      ...player,
      _mp: matches,
      _runs: batRuns,
      _avg: batDismissals > 0 ? batRuns / batDismissals : null,
      _sr: batBalls > 0 ? (batRuns / batBalls) * 100 : null,
      _batImpact: batImpact,
      _wkts: wkts,
      _er: bowlBalls > 0 ? (bowlRuns / bowlBalls) * 6 : null,
      _bowlSR: wkts > 0 ? bowlBalls / wkts : null,
      _bowlImpact: bowlImpact,
      _fieldImpact: fieldImpact,
      _ipm: matches > 0 ? totalImpact / matches : null,
    };
  }), [squadPlayers, careerStats, currentSeasonId]);

  const columns = [
    {
      key: 'name',
      label: 'Player',
      sortKey: 'name',
      render: (row) => (
        <PlayerName playerId={row.id} className="text-xs font-medium" initialTab="transfers" />
      ),
      cellClassName: 'px-2 py-1'
    },
    { key: '_mp', label: 'MP', sortKey: '_mp', render: (r) => <span className="text-xs font-mono text-text-secondary">{r._mp}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_runs', label: 'Runs', sortKey: '_runs', render: (r) => <span className="text-xs font-mono">{r._runs}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_avg', label: 'Avg', sortKey: '_avg', render: (r) => <span className="text-xs font-mono">{fmtNum(r._avg, 1)}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_sr', label: 'SR', sortKey: '_sr', render: (r) => <span className="text-xs font-mono">{fmtNum(r._sr, 1)}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_batImpact', label: 'Bat', sortKey: '_batImpact', render: (r) => <span className="text-xs font-mono text-cricket-accent">{fmtNum(r._batImpact, 1)}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_wkts', label: 'Wkts', sortKey: '_wkts', render: (r) => <span className="text-xs font-mono">{r._wkts}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_er', label: 'ER', sortKey: '_er', render: (r) => <span className="text-xs font-mono">{fmtNum(r._er, 2)}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_bowlSR', label: 'BSR', sortKey: '_bowlSR', render: (r) => <span className="text-xs font-mono">{fmtNum(r._bowlSR, 1)}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_bowlImpact', label: 'Bowl', sortKey: '_bowlImpact', render: (r) => <span className="text-xs font-mono text-blue-400">{fmtNum(r._bowlImpact, 1)}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_fieldImpact', label: 'Field', sortKey: '_fieldImpact', render: (r) => <span className="text-xs font-mono">{fmtNum(r._fieldImpact, 1)}</span>, cellClassName: 'px-1 py-1 text-right' },
    { key: '_ipm', label: 'IPM', sortKey: '_ipm', render: (r) => {
      if (r._ipm === null) return <span className="text-text-tertiary text-xs">—</span>;
      const cls = r._ipm >= 0 ? 'text-green-400' : 'text-red-400';
      return <span className={`text-xs font-mono font-semibold ${cls}`}>{r._ipm >= 0 ? '+' : ''}{r._ipm.toFixed(2)}</span>;
    }, cellClassName: 'px-1 py-1 text-right' },
    {
      key: 'actions',
      label: 'Actions',
      sortKey: 'id',
      sortable: false,
      align: 'center',
      render: (player) => {
        const isListed = listedPlayerIds.has(player.id);
        if (isListed) {
          return (
            <span className="flex items-center gap-1 text-xs text-green-400 font-medium justify-center">
              <Tag className="w-3 h-3" />
              Listed
            </span>
          );
        }
        return (
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => handleListPlayer(player)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-cricket-accent hover:bg-cricket-accent-dark text-white rounded transition-colors w-full justify-center"
            >
              <Tag className="w-3 h-3" />
              <span>List</span>
            </button>
            <button
              onClick={() => handleReleasePlayer(player)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors w-full justify-center"
            >
              <span>Release</span>
            </button>
          </div>
        );
      },
      cellClassName: 'px-2 py-1'
    }
  ];

  return (
    <div className="space-y-2">
      {/* Compact header */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{userListingsCount} listed · {squadPlayers.length - userListingsCount} available</span>
        <span className="text-text-tertiary">Listings expire after 14 days</span>
      </div>

      {/* Info banner */}
      {userListingsCount > 0 && (
        <div className="flex items-start gap-2 p-2 bg-blue-900/10 border border-blue-500/20 rounded text-xs text-blue-300/80">
          <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <span>If bids exist at expiry, the highest bid is automatically accepted. No bids = player released to free agency. You can cancel a no-bid listing from the Transfer Market tab.</span>
        </div>
      )}

      {/* Squad table */}
      <SortableTable
        data={tableData}
        columns={columns}
        defaultSortKey="_ipm"
        defaultSortDir="desc"
        containerClassName="border border-border-primary rounded"
        stripedRows={false}
      />

      {/* List for Transfer Modal */}
      {showListingModal && selectedPlayerForListing && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="card p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-text-primary">List Player for Transfer</h3>
              <button onClick={() => { setShowListingModal(false); setSelectedPlayerForListing(null); setListingPrice(''); }} className="text-text-tertiary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3">
              <div className="text-base font-semibold text-text-primary">{selectedPlayerForListing.name}</div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {selectedPlayerForListing.role}
                {selectedPlayerForListing.soldPrice > 0 && ` · Bought for $${(selectedPlayerForListing.soldPrice / 1000).toFixed(0)}K`}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-text-secondary mb-1">Asking Price (in $K)</label>
              <input
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder={selectedPlayerForListing.soldPrice > 0 ? `e.g. ${Math.round(selectedPlayerForListing.soldPrice / 1000)}` : 'e.g. 500'}
                min="50"
                className="w-full card border border-border-primary px-3 py-2 text-text-primary focus:outline-none focus:border-cricket-accent"
              />
              <div className="text-xs text-text-tertiary mt-1">Minimum: $50K</div>
            </div>

            <div className="mb-3 p-2 bg-bg-tertiary rounded text-xs text-text-secondary">
              The listing lasts 14 days. Highest bid is automatically accepted on expiry. No bids = released to free agency.
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmListing}
                disabled={!listingPrice || parseFloat(listingPrice) < 50}
                className="flex-1 bg-cricket-accent hover:bg-cricket-accent-dark text-white py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                List for Transfer
              </button>
              <button
                onClick={() => { setShowListingModal(false); setSelectedPlayerForListing(null); setListingPrice(''); }}
                className="flex-1 card border border-border-primary text-text-secondary hover:text-text-primary py-2 rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyListingsView;
