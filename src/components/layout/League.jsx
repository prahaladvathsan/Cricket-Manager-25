/**
 * @file League.jsx
 * @description League standings and statistics
 */

import React from 'react';

const League = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-cricket-text-primary">League</h1>
      
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">WPL 2024 Standings</h2>
        <div className="text-center py-8">
          <p className="text-cricket-text-secondary">League table will be available once season begins</p>
        </div>
      </div>
    </div>
  );
};

export default League;