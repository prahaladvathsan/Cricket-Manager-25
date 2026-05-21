/**
 * @file MatchResultsDisplay.jsx
 * @description Renders aggregated results from Match Mode (N full matches)
 * including innings distributions, phase splits, top performers, and IRL
 * benchmark comparison.
 */

import React from 'react';
import { BarChart3, Trophy } from 'lucide-react';
import CricketBallSpinner from '../shared/CricketBallSpinner';

// IRL T20 reference benchmarks for pass/fail callouts
const IRL_BENCHMARKS = {
  inningsTotal: { min: 155, max: 180, label: '155-180' },
  inningsWickets: { min: 6, max: 8, label: '6-8' },
  boundaryRate: { min: 0.14, max: 0.16, label: '14-16%' },
  dotRate: { min: 0.38, max: 0.42, label: '38-42%' },
  phaseRR: {
    powerplay: { min: 8.0, max: 8.5 },
    earlyMiddle: { min: 7.0, max: 8.0 },
    lateMiddle: { min: 7.5, max: 8.5 },
    death: { min: 9.5, max: 11.0 }
  }
};

const Stat = ({ label, value, color = 'text-text-primary', badge = null }) => (
  <div className="bg-bg-tertiary rounded p-1.5">
    <div className="text-[10px] text-text-muted">{label}</div>
    <div className={`text-sm font-bold ${color}`}>{value}</div>
    {badge && <div className="text-[9px] text-text-muted">{badge}</div>}
  </div>
);

const Pass = ({ ok, label }) => (
  <span className={`text-[9px] px-1 py-0.5 rounded ${ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
    {ok ? '✓' : '✗'} {label}
  </span>
);

function passCheck(value, { min, max }) {
  return value >= min && value <= max;
}

const MatchResultsDisplay = ({ results, isRunning, progress }) => {
  if (isRunning && !results) {
    return (
      <div className="card p-3 h-full flex flex-col items-center justify-center">
        <CricketBallSpinner className="h-8 w-8 mb-2" />
        <div className="text-xs text-text-primary">Running match simulation...</div>
        {progress && (
          <div className="text-[10px] text-text-muted mt-1">
            {progress.completed} / {progress.total} matches
          </div>
        )}
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card p-3 h-full flex flex-col items-center justify-center text-center">
        <BarChart3 className="w-8 h-8 text-text-muted mb-2" />
        <div className="text-xs text-text-primary">No Match Results</div>
        <div className="text-[10px] text-text-muted">Pick two teams and run a batch</div>
      </div>
    );
  }

  const {
    matchCount, errors, simulationTime,
    innings1, innings2, inningsAll,
    inningsAllWickets,
    phaseSummary,
    topScorerStats, topBowlerStats,
    battingLeaders, bowlingLeaders,
    wins, homeTeamName, awayTeamName, homeTeamId, awayTeamId
  } = results;

  // Aggregate boundary and dot rate across all phases
  const allBalls = Object.values(phaseSummary).reduce((sum, p) => sum + p.balls, 0);
  const allBoundaryBalls = Object.values(phaseSummary).reduce((sum, p) => sum + Math.round(p.boundaryRate * p.balls), 0);
  const allDotBalls = Object.values(phaseSummary).reduce((sum, p) => sum + Math.round(p.dotRate * p.balls), 0);
  const overallBoundaryRate = allBalls > 0 ? allBoundaryBalls / allBalls : 0;
  const overallDotRate = allBalls > 0 ? allDotBalls / allBalls : 0;

  return (
    <div className="card p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 70px)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-cricket-accent" />
          <span className="text-sm font-semibold text-text-primary">Match Mode Results</span>
        </div>
        <div className="text-[10px] text-text-muted">
          {matchCount} matches · {(simulationTime / 1000).toFixed(1)}s · {errors > 0 && <span className="text-red-400">{errors} errors</span>}
        </div>
      </div>

      {/* Win record */}
      <div className="grid grid-cols-3 gap-1 bg-bg-tertiary rounded p-2">
        <div className="text-center">
          <div className="text-[10px] text-text-muted truncate">{homeTeamName}</div>
          <div className="text-base font-bold text-cricket-accent">{wins[homeTeamId] || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-text-muted">Ties</div>
          <div className="text-base font-bold text-yellow-400">{wins.ties || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-text-muted truncate">{awayTeamName}</div>
          <div className="text-base font-bold text-cricket-accent">{wins[awayTeamId] || 0}</div>
        </div>
      </div>

      {/* IRL benchmark pass/fail summary */}
      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">IRL T20 BENCHMARK CHECK</div>
        <div className="flex flex-wrap gap-1">
          <Pass ok={passCheck(inningsAll.mean, IRL_BENCHMARKS.inningsTotal)}
                label={`InnMean ${inningsAll.mean.toFixed(0)} (${IRL_BENCHMARKS.inningsTotal.label})`} />
          <Pass ok={passCheck(inningsAllWickets.mean, IRL_BENCHMARKS.inningsWickets)}
                label={`InnWkts ${inningsAllWickets.mean.toFixed(1)} (${IRL_BENCHMARKS.inningsWickets.label})`} />
          <Pass ok={passCheck(overallBoundaryRate, IRL_BENCHMARKS.boundaryRate)}
                label={`Bndry ${(overallBoundaryRate * 100).toFixed(1)}% (${IRL_BENCHMARKS.boundaryRate.label})`} />
          <Pass ok={passCheck(overallDotRate, IRL_BENCHMARKS.dotRate)}
                label={`Dot ${(overallDotRate * 100).toFixed(1)}% (${IRL_BENCHMARKS.dotRate.label})`} />
          {Object.entries(phaseSummary).map(([phase, p]) => {
            const bench = IRL_BENCHMARKS.phaseRR[phase];
            if (!bench) return null;
            return (
              <Pass key={phase} ok={passCheck(p.runRate, bench)}
                    label={`${phase} RR ${p.runRate.toFixed(2)} (${bench.min}-${bench.max})`} />
            );
          })}
        </div>
      </div>

      {/* Innings total distribution */}
      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">INNINGS TOTAL (all innings)</div>
        <div className="grid grid-cols-5 gap-1">
          <Stat label="Mean ± σ" value={`${inningsAll.mean.toFixed(0)} ± ${inningsAll.std.toFixed(0)}`} />
          <Stat label="P10" value={inningsAll.p10} />
          <Stat label="P50" value={inningsAll.p50} />
          <Stat label="P90" value={inningsAll.p90} />
          <Stat label="Range" value={`${inningsAll.min}–${inningsAll.max}`} />
        </div>
        <div className="text-[10px] text-text-muted mt-1">
          1st inn: μ={innings1.mean.toFixed(0)} σ={innings1.std.toFixed(0)} ·
          2nd inn: μ={innings2.mean.toFixed(0)} σ={innings2.std.toFixed(0)}
        </div>
      </div>

      {/* Wickets per innings */}
      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">WICKETS PER INNINGS</div>
        <div className="grid grid-cols-4 gap-1">
          <Stat label="Mean" value={inningsAllWickets.mean.toFixed(2)} />
          <Stat label="P10" value={inningsAllWickets.p10} />
          <Stat label="P50" value={inningsAllWickets.p50} />
          <Stat label="P90" value={inningsAllWickets.p90} />
        </div>
      </div>

      {/* Phase summary */}
      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">PHASE SUMMARY</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-text-muted border-b border-border-primary">
                <th className="text-left py-1">Phase</th>
                <th className="text-right">RR</th>
                <th className="text-right">Runs/Inn</th>
                <th className="text-right">Wkt/Inn</th>
                <th className="text-right">Bndry%</th>
                <th className="text-right">Dot%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(phaseSummary).map(([phase, p]) => (
                <tr key={phase} className="border-b border-border-primary/30">
                  <td className="py-1 text-text-primary capitalize">{phase}</td>
                  <td className="text-right text-cricket-accent font-medium">{p.runRate.toFixed(2)}</td>
                  <td className="text-right">{p.runsPerInnings.toFixed(1)}</td>
                  <td className="text-right">{p.wicketsPerInnings.toFixed(2)}</td>
                  <td className="text-right">{(p.boundaryRate * 100).toFixed(1)}%</td>
                  <td className="text-right">{(p.dotRate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top performers per match */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] font-semibold text-text-secondary mb-1">TOP SCORER (per match)</div>
          <div className="bg-bg-tertiary rounded p-2 text-[10px] space-y-0.5">
            <div className="flex justify-between"><span className="text-text-muted">Runs μ</span><span>{topScorerStats.runs.mean.toFixed(1)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">P50 / P90</span><span>{topScorerStats.runs.p50} / {topScorerStats.runs.p90}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Max</span><span className="text-green-400">{topScorerStats.runs.max}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">SR μ</span><span>{topScorerStats.strikeRate.mean.toFixed(1)}</span></div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-text-secondary mb-1">TOP BOWLER (per match)</div>
          <div className="bg-bg-tertiary rounded p-2 text-[10px] space-y-0.5">
            <div className="flex justify-between"><span className="text-text-muted">Wkts μ</span><span>{topBowlerStats.wickets.mean.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">P50 / P90</span><span>{topBowlerStats.wickets.p50} / {topBowlerStats.wickets.p90}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Max</span><span className="text-green-400">{topBowlerStats.wickets.max}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Econ μ</span><span>{topBowlerStats.economy.mean.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Per-player leaders */}
      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">BATTING LEADERS (≥ min innings)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-text-muted border-b border-border-primary">
                <th className="text-left py-1">Player</th>
                <th className="text-right">Inn</th>
                <th className="text-right">R</th>
                <th className="text-right">B</th>
                <th className="text-right">SR</th>
                <th className="text-right">R/Inn</th>
              </tr>
            </thead>
            <tbody>
              {(battingLeaders || []).slice(0, 10).map(p => (
                <tr key={p.id} className="border-b border-border-primary/30">
                  <td className="py-1 truncate max-w-[120px]">{p.name}</td>
                  <td className="text-right">{p.innings}</td>
                  <td className="text-right">{p.runs}</td>
                  <td className="text-right">{p.balls}</td>
                  <td className="text-right text-cricket-accent">{p.strikeRate.toFixed(1)}</td>
                  <td className="text-right text-green-400">{p.runsPerInnings.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold text-text-secondary mb-1">BOWLING LEADERS (≥ min innings)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-text-muted border-b border-border-primary">
                <th className="text-left py-1">Player</th>
                <th className="text-right">Inn</th>
                <th className="text-right">B</th>
                <th className="text-right">W</th>
                <th className="text-right">R</th>
                <th className="text-right">Econ</th>
                <th className="text-right">W/Inn</th>
              </tr>
            </thead>
            <tbody>
              {(bowlingLeaders || []).slice(0, 10).map(p => (
                <tr key={p.id} className="border-b border-border-primary/30">
                  <td className="py-1 truncate max-w-[120px]">{p.name}</td>
                  <td className="text-right">{p.innings}</td>
                  <td className="text-right">{p.balls}</td>
                  <td className="text-right text-red-400">{p.wickets}</td>
                  <td className="text-right">{p.runs}</td>
                  <td className="text-right text-cricket-accent">{p.economy.toFixed(2)}</td>
                  <td className="text-right text-red-400">{p.wicketsPerInnings.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MatchResultsDisplay;
