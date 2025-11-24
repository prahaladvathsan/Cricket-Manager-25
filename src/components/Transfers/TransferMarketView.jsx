/**
 * @file TransferMarketView.jsx
 * @description Main transfer market container with tab navigation
 * Integrates Marketplace and Free Agency views
 */

import React, { useState, useMemo } from 'react';
import { ShoppingCart, Users, Clock, AlertCircle } from 'lucide-react';
import useTransferStore from '../../stores/transferStore';
import useTeamStore from '../../stores/teamStore';
import useFinanceStore from '../../stores/financeStore';
import MarketplaceView from './MarketplaceView';
import FreeAgencyView from './FreeAgencyView';

const TransferMarketView = ({ transferHandler }) => {
  const [activeTab, setActiveTab] = useState('marketplace');

  // Store state
  const {
    transferWindow,
    activeListings,
    freeAgents
  } = useTransferStore();

  const { userTeamId } = useTeamStore();
  const { getTeamFinances } = useFinanceStore();

  // Get user's finances
  const userFinances = useMemo(() => {
    return userTeamId ? getTeamFinances(userTeamId) : null;
  }, [userTeamId, getTeamFinances]);

  if (!transferWindow.isOpen) {
    return (
      <div className="card p-3 text-center">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
        <h2 className="text-lg font-bold text-text-primary mb-1">Transfer Window Closed</h2>
        <p className="text-sm text-text-secondary mb-3">
          The transfer window is currently closed. It will open during the off-season after the playoffs conclude.
        </p>
        <div className="max-w-xs mx-auto mt-3">
          <div className="card bg-bg-secondary p-2">
            <div className="text-xs text-text-secondary mb-0.5 text-center">Off-Season Transfer Window</div>
            <div className="text-base text-text-primary font-semibold text-center">Weeks 22-26</div>
            <div className="text-xs text-text-tertiary mt-1 text-center">5 weeks • 14-day listings</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tab Navigation with Days Remaining and Budget */}
      <div className="flex items-center justify-between border-b border-border-primary">
        <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors text-sm ${
            activeTab === 'marketplace'
              ? 'border-cricket-accent text-text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Marketplace</span>
          <span className="bg-bg-tertiary text-text-secondary text-xs px-1.5 py-0.5 rounded">
            {activeListings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('freeAgency')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors text-sm ${
            activeTab === 'freeAgency'
              ? 'border-cricket-accent text-text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Free Agency</span>
          <span className="bg-bg-tertiary text-text-secondary text-xs px-1.5 py-0.5 rounded">
            {freeAgents.length}
          </span>
        </button>
        </div>

        {/* Days Remaining and Budget */}
        <div className="flex items-center gap-3 px-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{transferWindow.daysRemaining} days left</span>
          </div>
          {userFinances && (
            <div className="flex items-center gap-1">
              <span>Budget:</span>
              <span className="text-trophy-gold font-semibold">
                ${(userFinances.currentBudget / 1000).toFixed(0)}K
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === 'marketplace' && (
          <MarketplaceView
            userTeamId={userTeamId}
            transferHandler={transferHandler}
          />
        )}

        {activeTab === 'freeAgency' && (
          <FreeAgencyView
            userTeamId={userTeamId}
            transferHandler={transferHandler}
          />
        )}
      </div>

      {/* Transfer Activity Summary (Footer) */}
      <div className="mt-3 card p-2">
        <h3 className="text-xs font-semibold text-text-secondary mb-2">Transfer Window Summary</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-text-primary">{activeListings.length}</div>
            <div className="text-xs text-text-secondary">Active Listings</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cricket-accent">{activeListings.filter(l => l.teamId === userTeamId).length}</div>
            <div className="text-xs text-text-secondary">Your Listings</div>
          </div>
          <div>
            <div className="text-lg font-bold text-trophy-gold">{freeAgents.length}</div>
            <div className="text-xs text-text-secondary">Free Agents</div>
          </div>
          <div>
            <div className="text-lg font-bold text-text-primary">
              ${(userFinances?.currentBudget / 1000000 || 0).toFixed(1)}M
            </div>
            <div className="text-xs text-text-secondary">Your Budget</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferMarketView;
