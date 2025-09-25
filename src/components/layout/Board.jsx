/**
 * @file Board.jsx
 * @description Board objectives and finances
 */

import React from 'react';

const Board = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-cricket-text-primary">Board</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Season Objectives</h2>
          <ul className="space-y-2">
            <li className="flex items-center text-cricket-text-secondary">
              <span className="w-4 h-4 rounded-full bg-yellow-500 mr-3"></span>
              Build competitive squad
            </li>
            <li className="flex items-center text-cricket-text-secondary">
              <span className="w-4 h-4 rounded-full bg-gray-400 mr-3"></span>
              Qualify for playoffs
            </li>
            <li className="flex items-center text-cricket-text-secondary">
              <span className="w-4 h-4 rounded-full bg-gray-400 mr-3"></span>
              Win championship
            </li>
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Finances</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-cricket-text-secondary">Total Budget:</span>
              <span>₹90 Crores</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cricket-text-secondary">Spent:</span>
              <span>₹0 Crores</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Remaining:</span>
              <span>₹90 Crores</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;