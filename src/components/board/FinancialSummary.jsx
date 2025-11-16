/**
 * @file FinancialSummary.jsx
 * @description Reusable financial summary component for Board and Home pages
 */

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';

/**
 * FinancialSummary Component
 * @param {Object} props
 * @param {boolean} props.compact - Use compact layout (for Home page)
 * @param {Function} props.onClick - Click handler (to open details modal)
 */
const FinancialSummary = ({ compact = false, onClick }) => {
  const userTeam = useTeamStore(state => state.userTeam);

  if (!userTeam || !userTeam.finances) {
    return null;
  }

  const { salaryCap, usedCap, remainingBudget } = userTeam.finances;
  const budgetUsedPercent = ((usedCap / salaryCap) * 100).toFixed(1);

  // Compact version for Home page
  if (compact) {
    return (
      <div
        onClick={onClick}
        className="card p-3 cursor-pointer hover:bg-cricket-primary/10 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-text-primary">Finances</h4>
          <DollarSign className="w-4 h-4 text-cricket-accent" />
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Available</span>
            <span className="font-semibold text-status-win">
              ₹{remainingBudget.toFixed(1)} Cr
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Total Budget</span>
            <span className="text-text-secondary">
              ₹{salaryCap.toFixed(1)} Cr
            </span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  budgetUsedPercent > 90 ? 'bg-red-500' :
                  budgetUsedPercent > 75 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${budgetUsedPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full version for Board page
  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:bg-cricket-primary/10 transition-colors"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cricket-primary/20 rounded">
          <DollarSign className="w-6 h-6 text-cricket-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Team Finances</h3>
          <p className="text-xs text-text-secondary">Click to view details</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-text-secondary mb-1">Total Budget</div>
          <div className="text-xl font-bold text-text-primary">
            ₹{salaryCap.toFixed(1)} Cr
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Available</div>
          <div className="text-xl font-bold text-cricket-accent">
            ₹{remainingBudget.toFixed(1)} Cr
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Spent</div>
          <div className="text-sm font-semibold text-red-400 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            ₹{usedCap.toFixed(1)} Cr
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Budget Used</div>
          <div className={`text-sm font-semibold flex items-center gap-1 ${
            budgetUsedPercent > 90 ? 'text-red-400' :
            budgetUsedPercent > 75 ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            <TrendingUp className="w-3 h-3" />
            {budgetUsedPercent}%
          </div>
        </div>
      </div>

      {/* Budget Usage Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>Budget Utilization</span>
          <span>{budgetUsedPercent}% of ₹{salaryCap} Cr</span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              budgetUsedPercent > 90 ? 'bg-red-500' :
              budgetUsedPercent > 75 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${budgetUsedPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>₹0</span>
          <span>₹{salaryCap.toFixed(1)} Cr</span>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
