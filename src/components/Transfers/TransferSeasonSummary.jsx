/**
 * @file TransferSeasonSummary.jsx
 * @description Persistent transfer window summary shown after window closes, until auction begins.
 * Renders a stats header + reuses CompletedTransfersView for the table.
 */

import React, { useMemo } from 'react';
import { ArrowRightLeft, UserMinus, UserPlus, DollarSign, TrendingUp } from 'lucide-react';
import useTransferStore from '../../stores/transferStore';
import useTeamStore from '../../stores/teamStore';
import CompletedTransfersView from './CompletedTransfersView';

const TransferSeasonSummary = () => {
  const { transferWindowSummary, completedTransfers } = useTransferStore();
  const { userTeamId } = useTeamStore();

  // Use snapshot from summary if available, else live completedTransfers
  const transfers = transferWindowSummary?.completedTransfers || completedTransfers || [];

  const stats = useMemo(() => {
    const sales = transfers.filter(t => t.type === 'transfer');
    const releases = transfers.filter(t => t.type === 'release');
    const signings = transfers.filter(t => t.type === 'free_agency');
    const totalSpent = sales.reduce((sum, t) => sum + Math.round((t.newPrice || 0) / 2), 0);

    return {
      salesCount: sales.length,
      releasesCount: releases.length,
      signingsCount: signings.length,
      totalSpent,
      total: transfers.length
    };
  }, [transfers]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card p-3">
        <h2 className="text-lg font-bold text-text-primary mb-1">Transfer Window Summary</h2>
        <p className="text-xs text-text-secondary">The off-season transfer window has closed. Here's a summary of all activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-2">
        <div className="card p-2 text-center">
          <ArrowRightLeft className="w-4 h-4 text-cricket-accent mx-auto mb-1" />
          <div className="text-lg font-bold text-text-primary">{stats.salesCount}</div>
          <div className="text-xs text-text-secondary">Transfers</div>
        </div>
        <div className="card p-2 text-center">
          <UserMinus className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-text-primary">{stats.releasesCount}</div>
          <div className="text-xs text-text-secondary">Released</div>
        </div>
        <div className="card p-2 text-center">
          <UserPlus className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-text-primary">{stats.signingsCount}</div>
          <div className="text-xs text-text-secondary">Signed</div>
        </div>
        <div className="card p-2 text-center">
          <DollarSign className="w-4 h-4 text-trophy-gold mx-auto mb-1" />
          <div className="text-lg font-bold text-trophy-gold">
            ${(stats.totalSpent / 1000000).toFixed(1)}M
          </div>
          <div className="text-xs text-text-secondary">Fees Paid</div>
        </div>
        <div className="card p-2 text-center">
          <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-text-primary">{stats.total}</div>
          <div className="text-xs text-text-secondary">Total Activity</div>
        </div>
      </div>

      {/* Reuse CompletedTransfersView for the table */}
      <CompletedTransfersView />
    </div>
  );
};

export default TransferSeasonSummary;
