/**
 * @file Board.jsx
 * @description Board objectives and finances
 */

import React, { useState } from 'react';
import ObjectivesPanel from '../board/ObjectivesPanel';
import FinancialSummary from '../board/FinancialSummary';
import FinancialDetailsModal from '../board/FinancialDetailsModal';

const Board = () => {
  const [showFinancialModal, setShowFinancialModal] = useState(false);

  return (
    <>
      {/* Financial Details Modal */}
      <FinancialDetailsModal
        isOpen={showFinancialModal}
        onClose={() => setShowFinancialModal(false)}
      />

      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-text-primary">Board</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Objectives */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-3">Season Objectives</h3>
          <ObjectivesPanel />
        </div>

        {/* Finances */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-3">Finances</h3>
          <FinancialSummary
            onClick={() => setShowFinancialModal(true)}
          />

          <div className="mt-3 card p-3 bg-bg-secondary">
            <p className="text-xs text-text-secondary">
              💡 <span className="font-medium">Tip:</span> Monitor your budget carefully during the auction and transfer windows.
              Staying within budget is crucial for long-term success.
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Board;
