/**
 * @file FinancesTab.jsx
 * @description Detailed financial breakdown for Board page
 */

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import useFinanceStore from '../../stores/financeStore';

const FinancesTab = () => {
  const userTeam = useTeamStore(state => state.getUserTeam());
  const getTeamFinances = useFinanceStore(state => state.getTeamFinances);
  const getTeamTransactionHistory = useFinanceStore(state => state.getTeamTransactionHistory);

  if (!userTeam) return null;

  const finances = getTeamFinances(userTeam.id);
  const transactions = getTeamTransactionHistory(userTeam.id);

  if (!finances) {
    return (
      <div className="card p-6 text-center">
        <p className="text-text-secondary">No financial data available.</p>
      </div>
    );
  }

  const totalBudget = finances.initialBudget + finances.totalRevenue;
  const spent = finances.totalExpenses;
  const available = finances.currentBudget;
  const budgetUsedPercent = totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(1) : 0;

  // Format currency
  const formatCurrency = (amount) => {
    return `$${(Math.abs(amount) / 1000000).toFixed(2)}M`;
  };

  // Format transaction type
  const getTransactionLabel = (type) => {
    const labels = {
      'expense_auction': 'Auction Spending',
      'expense_transfer_purchase': 'Transfer Purchase',
      'revenue_transfer_sale': 'Transfer Sale',
      'revenue_sponsorship': 'Sponsorship',
      'revenue_tickets': 'Ticket Sales',
      'revenue_broadcast': 'Broadcast Revenue',
      'revenue_match_win': 'Match Win Bonus',
      'revenue_season_end_prize': 'Season Prize Money'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Summary - Compact Ledger Style */}
      <div className="card p-3">
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-border-primary/50">
              <td className="py-1 text-text-secondary font-semibold">Total Budget</td>
              <td className="py-1 text-right text-cricket-accent font-mono font-bold">{formatCurrency(totalBudget)}</td>
              <td className="py-1 text-right text-text-tertiary text-[10px]">Initial: {formatCurrency(finances.initialBudget)}</td>
            </tr>
            <tr className="border-b border-border-primary/50">
              <td className="py-1 text-text-secondary font-semibold">Total Expenses</td>
              <td className="py-1 text-right text-red-400 font-mono font-bold">{formatCurrency(spent)}</td>
              <td className="py-1 text-right text-text-tertiary text-[10px]">{budgetUsedPercent}% used</td>
            </tr>
            <tr className="border-t-2 border-cricket-accent bg-cricket-primary/10">
              <td className="py-1.5 text-text-primary font-bold">Available Budget</td>
              <td className="py-1.5 text-right text-green-400 font-mono font-bold text-sm">{formatCurrency(available)}</td>
              <td className="py-1.5"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Revenue & Expenses - Accountant's Ledger Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue */}
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border-primary">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-text-primary">Revenue</h3>
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Sponsorship</td>
                <td className="py-1 text-right text-green-400 font-mono">{formatCurrency(finances.sponsorshipRevenue)}</td>
              </tr>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Ticket Sales</td>
                <td className="py-1 text-right text-green-400 font-mono">{formatCurrency(finances.ticketRevenue)}</td>
              </tr>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Broadcast</td>
                <td className="py-1 text-right text-green-400 font-mono">{formatCurrency(finances.broadcastRevenue)}</td>
              </tr>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Match Wins</td>
                <td className="py-1 text-right text-green-400 font-mono">{formatCurrency(finances.prizeMoneyWins)}</td>
              </tr>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Season Prizes</td>
                <td className="py-1 text-right text-green-400 font-mono">{formatCurrency(finances.prizeMoneySeasonEnd)}</td>
              </tr>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Transfer Sales</td>
                <td className="py-1 text-right text-green-400 font-mono">{formatCurrency(finances.transferEarnings)}</td>
              </tr>
              <tr className="border-t-2 border-border-primary font-bold bg-bg-tertiary/50">
                <td className="py-1.5 text-text-primary">Total Revenue</td>
                <td className="py-1.5 text-right text-green-400 font-mono">{formatCurrency(finances.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expenses */}
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border-primary">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-text-primary">Expenses</h3>
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Auction Spending</td>
                <td className="py-1 text-right text-red-400 font-mono">{formatCurrency(finances.auctionSpending)}</td>
              </tr>
              <tr className="border-b border-border-primary/50 hover:bg-bg-secondary/50">
                <td className="py-1 text-text-secondary">Transfer Purchases</td>
                <td className="py-1 text-right text-red-400 font-mono">{formatCurrency(finances.transferSpending)}</td>
              </tr>
              <tr className="border-t-2 border-border-primary font-bold bg-bg-tertiary/50">
                <td className="py-1.5 text-text-primary">Total Expenses</td>
                <td className="py-1.5 text-right text-red-400 font-mono">{formatCurrency(finances.totalExpenses)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History - Ledger Style */}
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border-primary">
          <Calendar className="w-3 h-3 text-cricket-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Transaction Ledger</h3>
        </div>

        {transactions.length > 0 ? (
          <div className="overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg-primary">
                <tr className="border-b border-border-primary text-text-secondary">
                  <th className="text-left py-1.5 px-2 font-semibold">Date</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Type</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Description</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(-50).reverse().map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-border-primary/30 hover:bg-bg-secondary/50 transition-colors"
                  >
                    <td className="py-1 px-2 text-text-tertiary whitespace-nowrap font-mono">
                      {new Date(transaction.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-1 px-2 text-text-secondary whitespace-nowrap">
                      {getTransactionLabel(transaction.type)}
                    </td>
                    <td className="py-1 px-2 text-text-secondary truncate max-w-xs">
                      {transaction.description || '-'}
                    </td>
                    <td className={`py-1 px-2 text-right font-mono font-semibold whitespace-nowrap ${
                      transaction.type.startsWith('revenue') ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type.startsWith('revenue') ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-4 text-xs">No transactions recorded</p>
        )}
      </div>

      {/* Tip Card */}
      <div className="card p-3 bg-bg-secondary">
        <p className="text-xs text-text-secondary">
          <span className="font-medium">Tip:</span> Monitor your budget carefully during the auction and transfer windows.
          Staying within budget is crucial for long-term success.
        </p>
      </div>
    </div>
  );
};

export default FinancesTab;
