/**
 * @file CompletedTransfersView.jsx
 * @description Shows all completed transfers and free agency signings
 */

import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import useTransferStore from '../../stores/transferStore';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';
import SortableTable from '../shared/SortableTable';

const CompletedTransfersView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { completedTransfers } = useTransferStore();

  const filteredTransfers = useMemo(() => {
    let filtered = [...completedTransfers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.playerName || '').toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    return filtered;
  }, [completedTransfers, searchQuery, typeFilter]);

  const columns = [
    {
      key: 'player',
      label: 'Player',
      sortKey: 'playerName',
      render: (t) => (
        <div>
          <PlayerName playerId={t.playerId} className="text-sm font-medium text-white" initialTab="transfers" />
          <div className="text-xs text-gray-500">{t.playerRole || ''}</div>
        </div>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'rating',
      label: 'Rating',
      sortKey: 'playerRating',
      align: 'center',
      render: (t) => (
        <span className="text-sm text-text-primary font-medium">
          {t.playerRating ? t.playerRating.toFixed(1) : '-'}
        </span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'type',
      label: 'Type',
      sortKey: 'type',
      align: 'center',
      render: (t) => {
        const typeStyles = {
          free_agency: 'bg-blue-900/30 text-blue-400 border border-blue-500/30',
          release: 'bg-red-900/30 text-red-400 border border-red-500/30',
          transfer: 'bg-cricket-accent/20 text-cricket-accent border border-cricket-accent/30'
        };
        const typeLabels = {
          free_agency: 'Signed',
          release: 'Released',
          transfer: 'Transfer'
        };
        return (
          <span className={`text-xs px-2 py-0.5 rounded ${typeStyles[t.type] || typeStyles.transfer}`}>
            {typeLabels[t.type] || 'Transfer'}
          </span>
        );
      },
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'from',
      label: 'From',
      sortKey: 'fromTeamId',
      render: (t) => (
        t.fromTeamId
          ? <TeamName teamId={t.fromTeamId} className="text-sm text-gray-300" showYouSuffix />
          : <span className="text-sm text-gray-500 italic">Free Agent</span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'to',
      label: 'To',
      sortKey: 'toTeamId',
      render: (t) => (
        t.toTeamId
          ? <TeamName teamId={t.toTeamId} className="text-sm text-white font-medium" showYouSuffix />
          : <span className="text-sm text-gray-500 italic">Free Agent</span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'oldPrice',
      label: 'Old Price',
      sortKey: 'oldPrice',
      align: 'right',
      render: (t) => (
        <span className="text-sm text-gray-400">
          {t.oldPrice > 0
            ? (t.oldPrice >= 1000000
              ? `$${(t.oldPrice / 1000000).toFixed(1)}M`
              : `$${(t.oldPrice / 1000).toFixed(0)}K`)
            : '-'}
        </span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'newPrice',
      label: 'New Price',
      sortKey: 'newPrice',
      align: 'right',
      render: (t) => (
        <span className="text-sm text-trophy-gold font-medium">
          {t.newPrice >= 1000000
            ? `$${(t.newPrice / 1000000).toFixed(1)}M`
            : `$${(t.newPrice / 1000).toFixed(0)}K`}
        </span>
      ),
      cellClassName: 'px-3 py-2'
    },
    {
      key: 'fee',
      label: 'Fee Paid',
      sortKey: 'newPrice',
      align: 'right',
      render: (t) => {
        const fee = Math.round(t.newPrice / 2);
        return (
          <span className="text-sm text-cricket-accent font-medium">
            {fee >= 1000000
              ? `$${(fee / 1000000).toFixed(1)}M`
              : `$${(fee / 1000).toFixed(0)}K`}
          </span>
        );
      },
      cellClassName: 'px-3 py-2'
    }
  ];

  const filterComponent = (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-tertiary border border-gray-700 rounded py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-cricket-accent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="bg-tertiary border border-gray-700 rounded py-2 px-3 text-white focus:outline-none focus:border-cricket-accent"
      >
        <option value="all">All Types</option>
        <option value="transfer">Transfers</option>
        <option value="free_agency">Signings</option>
        <option value="release">Releases</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">
        Completed Transfers ({completedTransfers.length})
      </h2>

      <SortableTable
        data={filteredTransfers}
        columns={columns}
        defaultSortKey="newPrice"
        defaultSortDirection="desc"
        emptyMessage="No completed transfers yet"
        filterComponent={filterComponent}
        rowClassName="hover:bg-gray-800/50 transition-colors"
      />
    </div>
  );
};

export default CompletedTransfersView;
