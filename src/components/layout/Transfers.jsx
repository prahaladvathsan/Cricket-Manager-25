/**
 * @file Transfers.jsx
 * @description Auction and player transfers management
 */

import React, { useMemo } from 'react';
import { Calendar, RefreshCw, Users, TrendingUp, DollarSign } from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useAuctionStore from '../../stores/auctionStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';

const Transfers = () => {
  const currentWeek = useGameStore(state => state.currentWeek);
  const currentPhase = useGameStore(state => state.currentPhase);
  const auctionState = useAuctionStore(state => state.auctionState);
  const soldPlayers = useAuctionStore(state => state.soldPlayers);
  const userTeam = useTeamStore(state => state.userTeam);
  const players = usePlayerStore(state => state.players);

  const isTransferWindowOpen = currentWeek >= 10 && currentWeek <= 12;
  const isLeagueActive = currentPhase === 'league' || currentPhase === 'playoffs';
  const auctionCompleted = auctionState === 'completed';

  // Calculate transfer window dates
  const transferWindowDates = useMemo(() => {
    // WPL season starts in early February
    const seasonStartDate = new Date('2025-02-01');
    const week10Start = new Date(seasonStartDate);
    week10Start.setDate(week10Start.getDate() + (9 * 7)); // 9 weeks * 7 days

    const week12End = new Date(week10Start);
    week12End.setDate(week12End.getDate() + (3 * 7) - 1); // 3 weeks minus 1 day

    return {
      start: week10Start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: week12End.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  }, []);

  // Calculate auction summary statistics
  const auctionSummary = useMemo(() => {
    if (!auctionCompleted || !userTeam) return null;

    const userPurchases = soldPlayers.filter(sale => sale.teamId === userTeam.id);
    const totalSpent = userPurchases.reduce((sum, sale) => sum + sale.price, 0);
    const avgPrice = userPurchases.length > 0 ? totalSpent / userPurchases.length : 0;

    // Find most expensive and cheapest purchases
    const sortedPurchases = [...userPurchases].sort((a, b) => b.price - a.price);
    const mostExpensive = sortedPurchases[0];
    const cheapest = sortedPurchases[sortedPurchases.length - 1];

    return {
      totalPlayers: userPurchases.length,
      totalSpent,
      avgPrice,
      mostExpensive,
      cheapest,
      budgetRemaining: (userTeam.finances?.salaryCap || 90) - (userTeam.finances?.usedCap || 0)
    };
  }, [auctionCompleted, soldPlayers, userTeam]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold text-text-primary">Transfers & Auction</h1>

      {/* Transfer Window Banner */}
      {isLeagueActive && !isTransferWindowOpen && (
        <div className="card p-3 bg-cricket-primary/10 border border-cricket-accent">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cricket-accent" />
            <div>
              <h4 className="font-semibold text-text-primary">Transfer Window</h4>
              <p className="text-sm text-text-secondary">
                Opens Week 10-12 ({transferWindowDates.start} - {transferWindowDates.end})
              </p>
            </div>
          </div>
        </div>
      )}

      {isTransferWindowOpen && (
        <div className="card p-3 bg-green-900/20 border border-green-500">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-green-400 animate-pulse" />
            <div>
              <h4 className="font-semibold text-green-400">Transfer Window is OPEN</h4>
              <p className="text-sm text-text-secondary">
                Closes on {transferWindowDates.end}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auction Summary (if completed) */}
      {auctionCompleted && auctionSummary && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Auction Summary</h3>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="card p-3 bg-bg-secondary text-center">
                <div className="text-2xl font-bold text-text-primary">{auctionSummary.totalPlayers}</div>
                <div className="text-xs text-text-secondary">Players Acquired</div>
              </div>
              <div className="card p-3 bg-bg-secondary text-center">
                <div className="text-2xl font-bold text-trophy-gold">
                  ₹{auctionSummary.totalSpent.toFixed(1)} Cr
                </div>
                <div className="text-xs text-text-secondary">Total Spent</div>
              </div>
              <div className="card p-3 bg-bg-secondary text-center">
                <div className="text-2xl font-bold text-text-primary">
                  ₹{auctionSummary.avgPrice.toFixed(1)} Cr
                </div>
                <div className="text-xs text-text-secondary">Average Price</div>
              </div>
              <div className="card p-3 bg-bg-secondary text-center">
                <div className="text-2xl font-bold text-status-win">
                  ₹{auctionSummary.budgetRemaining.toFixed(1)} Cr
                </div>
                <div className="text-xs text-text-secondary">Budget Remaining</div>
              </div>
            </div>

            {/* Notable Purchases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {auctionSummary.mostExpensive && (
                <div className="card p-3 bg-bg-secondary">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-trophy-gold" />
                    <h4 className="font-semibold text-text-primary">Most Expensive</h4>
                  </div>
                  <p className="text-text-primary font-medium">
                    {players[auctionSummary.mostExpensive.playerId]?.name || 'Unknown Player'}
                  </p>
                  <p className="text-trophy-gold font-bold">
                    ₹{auctionSummary.mostExpensive.price.toFixed(1)} Cr
                  </p>
                </div>
              )}

              {auctionSummary.cheapest && auctionSummary.cheapest.playerId !== auctionSummary.mostExpensive?.playerId && (
                <div className="card p-3 bg-bg-secondary">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-status-win" />
                    <h4 className="font-semibold text-text-primary">Best Value</h4>
                  </div>
                  <p className="text-text-primary font-medium">
                    {players[auctionSummary.cheapest.playerId]?.name || 'Unknown Player'}
                  </p>
                  <p className="text-status-win font-bold">
                    ₹{auctionSummary.cheapest.price.toFixed(1)} Cr
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Squad Building Complete Message */}
          <div className="card p-4 bg-cricket-primary/10 border border-cricket-accent">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-cricket-accent" />
              <div>
                <h4 className="font-semibold text-text-primary">Squad Building Complete</h4>
                <p className="text-sm text-text-secondary">
                  Your squad is finalized. Transfer window will open during Week 10-12 for mid-season adjustments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Auction State */}
      {!auctionCompleted && (
        <div className="card p-8 text-center">
          <Users className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Squad Yet</h3>
          <p className="text-text-secondary mb-4">
            Complete the auction from the Team Selection screen to build your squad.
          </p>
          <p className="text-xs text-text-secondary">
            Transfer system will be available after the auction is complete.
          </p>
        </div>
      )}
    </div>
  );
};

export default Transfers;
