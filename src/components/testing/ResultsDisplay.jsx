/**
 * @file ResultsDisplay.jsx
 * @description Compact results display with distribution charts for testing mode
 */

import React from 'react';
import { BarChart3, Clock, Zap, Target, AlertTriangle } from 'lucide-react';

const Bar = ({ label, value, maxValue, color = 'bg-cricket-accent' }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-1">
      <div className="w-10 text-[10px] text-text-secondary text-right">{label}</div>
      <div className="flex-1 h-3 bg-bg-tertiary rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="w-12 text-[10px] text-text-primary text-right">{value.toFixed(1)}%</div>
    </div>
  );
};

const Stat = ({ label, value, color = 'text-cricket-accent' }) => (
  <div className="bg-bg-tertiary rounded p-1.5 text-center">
    <div className="text-[10px] text-text-muted">{label}</div>
    <div className={`text-sm font-bold ${color}`}>{value}</div>
  </div>
);

const ResultsDisplay = ({ results, isRunning }) => {
  if (isRunning) {
    return (
      <div className="card p-2 h-full flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cricket-accent mb-2" />
        <div className="text-xs text-text-primary">Running simulation...</div>
        <div className="text-[10px] text-text-muted">Please wait</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card p-2 h-full flex flex-col items-center justify-center text-center">
        <BarChart3 className="w-8 h-8 text-text-muted mb-2" />
        <div className="text-xs text-text-primary">No Results</div>
        <div className="text-[10px] text-text-muted">Configure and run test</div>
      </div>
    );
  }

  const { outcomeDistribution, contactDistribution, dismissalDistribution } = results;
  const maxOutcome = Math.max(...Object.values(outcomeDistribution).map(v => v.percentage));
  const maxContact = Math.max(...Object.values(contactDistribution).map(v => v.percentage));
  const maxDismissal = Object.keys(dismissalDistribution).length > 0
    ? Math.max(...Object.values(dismissalDistribution).map(v => v.percentage))
    : 0;

  return (
    <div className="card p-2 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 70px)' }}>
      <div className="flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-cricket-accent" />
        <span className="text-xs font-semibold text-text-primary">Results</span>
      </div>

      {/* Performance */}
      <div className="grid grid-cols-4 gap-1">
        <Stat label="Balls" value={results.totalBalls.toLocaleString()} />
        <Stat label="Time" value={`${results.simulationTime}ms`} color="text-blue-400" />
        <Stat label="Rate" value={`${(results.ballsPerSecond / 1000).toFixed(1)}k/s`} color="text-yellow-400" />
        <Stat label="Wkt%" value={`${(results.wicketProbability * 100).toFixed(2)}`} color="text-red-400" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-1 bg-bg-tertiary rounded p-1.5">
        <div className="text-center">
          <div className="text-[10px] text-text-muted">SR</div>
          <div className="text-sm font-bold text-green-400">{results.strikeRate.toFixed(1)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-text-muted">Econ</div>
          <div className="text-sm font-bold text-red-400">{results.economyRate.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-text-muted">Bndry</div>
          <div className="text-xs font-medium text-text-primary">{(results.boundaryRate * 100).toFixed(1)}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-text-muted">Dots</div>
          <div className="text-xs font-medium text-text-primary">{outcomeDistribution['0']?.percentage.toFixed(1) || 0}%</div>
        </div>
      </div>

      {/* Outcome Distribution */}
      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">OUTCOMES</div>
        <div className="space-y-0.5">
          {Object.entries(outcomeDistribution)
            .sort(([a], [b]) => {
              const order = ['0', '1', '2', '3', '4', '6', 'W'];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([outcome, data]) => (
              <Bar
                key={outcome}
                label={outcome === 'W' ? 'Wkt' : `${outcome}s`}
                value={data.percentage}
                maxValue={maxOutcome}
                color={
                  outcome === 'W' ? 'bg-red-500' :
                  outcome === '6' ? 'bg-purple-500' :
                  outcome === '4' ? 'bg-green-500' :
                  outcome === '0' ? 'bg-gray-500' :
                  'bg-cricket-accent'
                }
              />
            ))}
        </div>
      </div>

      {/* Contact Distribution */}
      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">CONTACT</div>
        <div className="space-y-0.5">
          {Object.entries(contactDistribution).map(([type, data]) => (
            <Bar
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1, 4)}
              value={data.percentage}
              maxValue={maxContact}
              color={type === 'middled' ? 'bg-green-500' : type === 'edged' ? 'bg-yellow-500' : 'bg-red-500'}
            />
          ))}
        </div>
      </div>

      {/* Dismissal Distribution */}
      {Object.keys(dismissalDistribution).length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-text-secondary mb-1">DISMISSALS</div>
          <div className="space-y-0.5">
            {Object.entries(dismissalDistribution)
              .sort(([, a], [, b]) => b.percentage - a.percentage)
              .map(([type, data]) => (
                <Bar
                  key={type}
                  label={type.charAt(0).toUpperCase() + type.slice(1, 5)}
                  value={data.percentage}
                  maxValue={maxDismissal}
                  color="bg-red-400"
                />
              ))}
          </div>
        </div>
      )}

      {/* Raw Counts */}
      <div className="bg-bg-tertiary rounded p-2">
        <div className="text-[10px] text-text-muted mb-2">Raw Counts</div>
        <div className="grid grid-cols-7 gap-2 text-[10px]">
          {['0', '1', '2', '3', '4', '6', 'W'].map((outcome) => {
            const data = outcomeDistribution[outcome];
            if (!data) return null;
            return (
              <div key={outcome} className="text-center">
                <div className={`text-xs font-bold ${
                  outcome === 'W' ? 'text-red-400' :
                  outcome === '6' ? 'text-purple-400' :
                  outcome === '4' ? 'text-green-400' :
                  outcome === '0' ? 'text-gray-400' :
                  'text-text-primary'
                }`}>
                  {data.count.toLocaleString()}
                </div>
                <div className="text-text-muted">{outcome === 'W' ? 'Wkt' : outcome}s</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
