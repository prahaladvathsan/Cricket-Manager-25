/**
 * @file MatchAnalysisDrawer.jsx
 * @description 4-tab match analysis drawer: Phases | Batting | Bowling | Wagon Zone
 */

import React, { useState, useMemo } from 'react';
import { X, BarChart3, Users, Target, Map } from 'lucide-react';
import { createPortal } from 'react-dom';
import usePlayerStore from '../../stores/playerStore';
import useTeamStore from '../../stores/teamStore';
import { aggregateStats } from '../../utils/matchAnalytics';
import WagonZoneMap from '../shared/WagonZoneMap';
import PlayerName from '../shared/PlayerName';
import TeamName from '../shared/TeamName';

const PHASE_LABELS = {
  powerplay:   'Powerplay (1-6)',
  earlyMiddle: 'Early Mid (7-12)',
  lateMiddle:  'Late Mid (13-16)',
  death:       'Death (17-20)',
};

const PHASES = ['powerplay', 'earlyMiddle', 'lateMiddle', 'death'];

function sr(runs, balls) {
  if (!balls) return '-';
  return ((runs / balls) * 100).toFixed(1);
}
function econ(runs, balls) {
  if (!balls) return '-';
  return ((runs / balls) * 6).toFixed(2);
}
function dotPct(dots, balls) {
  if (!balls) return '-';
  return ((dots / balls) * 100).toFixed(0) + '%';
}

// ---- Phase Breakdown Tab ----
const PhasesTab = ({ analytics, result }) => {
  if (!analytics?.innings?.length) {
    return <p className="text-text-secondary text-sm py-8 text-center">No analytics data available for this match.</p>;
  }

  return (
    <div className="space-y-4">
      {analytics.innings.map(inn => (
        <div key={inn.inningsNumber} className="card p-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border-primary">
            <span className="text-xs text-text-tertiary">Innings {inn.inningsNumber}</span>
            {inn.battingTeamId && <TeamName teamId={inn.battingTeamId} variant="short" inline />}
            <span className="text-xs text-text-tertiary">batting</span>
          </div>

          {/* Mini Manhattan bars */}
          <div className="flex items-end gap-1 mb-3 h-16">
            {PHASES.map(phase => {
              const ph = inn.phases[phase];
              const maxR = Math.max(1, ...PHASES.map(p => inn.phases[p]?.runs || 0));
              const pct = ph ? (ph.runs / maxR) * 100 : 0;
              return (
                <div key={phase} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-xs text-trophy-gold font-mono leading-none">{ph?.runs || 0}</span>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(4, pct * 0.52)}px`, background: '#D4AF37', opacity: 0.8 }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mb-3">
            {PHASES.map(phase => (
              <div key={phase} className="flex-1 text-center text-[10px] text-text-tertiary leading-tight">
                {phase === 'powerplay' ? 'PP' : phase === 'earlyMiddle' ? 'EM' : phase === 'lateMiddle' ? 'LM' : 'DT'}
              </div>
            ))}
          </div>

          {/* Phase detail table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-tertiary border-b border-border-primary">
                <th className="text-left pb-1 font-normal">Phase</th>
                <th className="text-right pb-1 font-normal">Runs</th>
                <th className="text-right pb-1 font-normal">Balls</th>
                <th className="text-right pb-1 font-normal">Wkts</th>
                <th className="text-right pb-1 font-normal">4s</th>
                <th className="text-right pb-1 font-normal">6s</th>
                <th className="text-right pb-1 font-normal">RPO</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map(phase => {
                const ph = inn.phases[phase];
                if (!ph || ph.balls === 0) return null;
                return (
                  <tr key={phase} className="border-b border-border-primary/30">
                    <td className="py-0.5 text-text-secondary">{PHASE_LABELS[phase]}</td>
                    <td className="py-0.5 text-right font-mono text-trophy-gold">{ph.runs}</td>
                    <td className="py-0.5 text-right font-mono text-text-primary">{ph.balls}</td>
                    <td className="py-0.5 text-right font-mono text-red-400">{ph.wickets}</td>
                    <td className="py-0.5 text-right font-mono text-blue-400">{ph.fours}</td>
                    <td className="py-0.5 text-right font-mono text-purple-400">{ph.sixes}</td>
                    <td className="py-0.5 text-right font-mono text-text-primary">{econ(ph.runs, ph.balls)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

// ---- Batting Tab ----
const BattingTab = ({ analytics, result, onPlayerClick }) => {
  const [phaseFilter, setPhaseFilter] = useState('all');
  const { players } = usePlayerStore();

  const rows = useMemo(() => {
    if (!analytics?.innings) return [];
    const out = [];
    for (const inn of analytics.innings) {
      for (const [pid, pData] of Object.entries(inn.players)) {
        if (!pData.batting?.length) continue;
        const segs = phaseFilter === 'all' ? pData.batting : pData.batting.filter(s => s.phase === phaseFilter);
        const agg = aggregateStats(segs, {});
        if (agg.balls === 0) continue;
        out.push({ pid, inningsNumber: inn.inningsNumber, battingTeamId: inn.battingTeamId, ...agg });
      }
    }
    return out.sort((a, b) => b.runs - a.runs);
  }, [analytics, phaseFilter]);

  return (
    <div className="space-y-3">
      {/* Phase filter */}
      <div className="flex gap-1 flex-wrap">
        {['all', ...PHASES].map(p => (
          <button
            key={p}
            onClick={() => setPhaseFilter(p)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${phaseFilter === p ? 'bg-cricket-accent border-cricket-accent text-white' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}
          >
            {p === 'all' ? 'All' : p === 'powerplay' ? 'PP' : p === 'earlyMiddle' ? 'Early Mid' : p === 'lateMiddle' ? 'Late Mid' : 'Death'}
          </button>
        ))}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-tertiary border-b border-border-primary">
            <th className="text-left pb-1 font-normal">Batter</th>
            <th className="text-right pb-1 font-normal">R</th>
            <th className="text-right pb-1 font-normal">B</th>
            <th className="text-right pb-1 font-normal">4s</th>
            <th className="text-right pb-1 font-normal">6s</th>
            <th className="text-right pb-1 font-normal">SR</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} className="text-center text-text-tertiary py-4">No batting data</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={`${row.pid}-${row.inningsNumber}`} className="border-b border-border-primary/30 hover:bg-bg-tertiary/50 cursor-pointer" onClick={() => onPlayerClick?.(row.pid)}>
              <td className="py-0.5">
                <PlayerName playerId={row.pid} />
              </td>
              <td className="py-0.5 text-right font-mono text-trophy-gold">{row.runs}</td>
              <td className="py-0.5 text-right font-mono text-text-primary">{row.balls}</td>
              <td className="py-0.5 text-right font-mono text-blue-400">{row.fours}</td>
              <td className="py-0.5 text-right font-mono text-purple-400">{row.sixes}</td>
              <td className="py-0.5 text-right font-mono text-text-primary">{sr(row.runs, row.balls)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---- Bowling Tab ----
const BowlingTab = ({ analytics, result, onPlayerClick }) => {
  const [phaseFilter, setPhaseFilter] = useState('all');

  const rows = useMemo(() => {
    if (!analytics?.innings) return [];
    const out = [];
    for (const inn of analytics.innings) {
      for (const [pid, pData] of Object.entries(inn.players)) {
        if (!pData.bowling?.length) continue;
        const segs = phaseFilter === 'all' ? pData.bowling : pData.bowling.filter(s => s.phase === phaseFilter);
        const agg = aggregateStats(segs, {});
        if (agg.balls === 0) continue;
        out.push({ pid, inningsNumber: inn.inningsNumber, ...agg });
      }
    }
    return out.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
  }, [analytics, phaseFilter]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {['all', ...PHASES].map(p => (
          <button
            key={p}
            onClick={() => setPhaseFilter(p)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${phaseFilter === p ? 'bg-cricket-accent border-cricket-accent text-white' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}
          >
            {p === 'all' ? 'All' : p === 'powerplay' ? 'PP' : p === 'earlyMiddle' ? 'Early Mid' : p === 'lateMiddle' ? 'Late Mid' : 'Death'}
          </button>
        ))}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-tertiary border-b border-border-primary">
            <th className="text-left pb-1 font-normal">Bowler</th>
            <th className="text-right pb-1 font-normal">R</th>
            <th className="text-right pb-1 font-normal">B</th>
            <th className="text-right pb-1 font-normal">W</th>
            <th className="text-right pb-1 font-normal">Dots</th>
            <th className="text-right pb-1 font-normal">Econ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} className="text-center text-text-tertiary py-4">No bowling data</td></tr>
          )}
          {rows.map((row) => (
            <tr key={`${row.pid}-${row.inningsNumber}`} className="border-b border-border-primary/30 hover:bg-bg-tertiary/50 cursor-pointer" onClick={() => onPlayerClick?.(row.pid)}>
              <td className="py-0.5"><PlayerName playerId={row.pid} /></td>
              <td className="py-0.5 text-right font-mono text-text-primary">{row.runs}</td>
              <td className="py-0.5 text-right font-mono text-text-primary">{row.balls}</td>
              <td className="py-0.5 text-right font-mono text-red-400">{row.wickets}</td>
              <td className="py-0.5 text-right font-mono text-text-secondary">{row.dots}</td>
              <td className="py-0.5 text-right font-mono text-text-primary">{econ(row.runs, row.balls)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---- Wagon Zone Tab ----
const WagonZoneTab = ({ analytics }) => {
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [selectedZone, setSelectedZone] = useState(null);
  const [inningsFilter, setInningsFilter] = useState(0); // 0 = first innings

  const wagonData = useMemo(() => {
    if (!analytics?.innings) return [];
    const inn = analytics.innings[inningsFilter] || analytics.innings[0];
    if (!inn) return [];
    if (phaseFilter === 'all') return inn.wagonZones;
    return inn.wagonZones.filter(w => w.phase === phaseFilter);
  }, [analytics, phaseFilter, inningsFilter]);

  const inningsCount = analytics?.innings?.length || 0;

  return (
    <div className="space-y-3">
      {/* Innings selector */}
      {inningsCount > 1 && (
        <div className="flex gap-1">
          {analytics.innings.map((inn, i) => (
            <button
              key={i}
              onClick={() => setInningsFilter(i)}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${inningsFilter === i ? 'bg-cricket-accent border-cricket-accent text-white' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}
            >
              Innings {inn.inningsNumber}
              {inn.battingTeamId && <span className="ml-1 text-text-tertiary"><TeamName teamId={inn.battingTeamId} variant="short" inline /></span>}
            </button>
          ))}
        </div>
      )}

      {/* Phase filter */}
      <div className="flex gap-1 flex-wrap">
        {['all', ...PHASES].map(p => (
          <button
            key={p}
            onClick={() => { setPhaseFilter(p); setSelectedZone(null); }}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${phaseFilter === p ? 'bg-cricket-accent border-cricket-accent text-white' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}
          >
            {p === 'all' ? 'All' : p === 'powerplay' ? 'PP' : p === 'earlyMiddle' ? 'Early Mid' : p === 'lateMiddle' ? 'Late Mid' : 'Death'}
          </button>
        ))}
      </div>

      <WagonZoneMap
        data={wagonData}
        onZoneClick={zone => setSelectedZone(z => z === zone ? null : zone)}
        selectedZone={selectedZone}
      />
    </div>
  );
};

// ---- Main Drawer ----
const TABS = [
  { id: 'phases',   label: 'Phases',   Icon: BarChart3 },
  { id: 'batting',  label: 'Batting',  Icon: Users },
  { id: 'bowling',  label: 'Bowling',  Icon: Target },
  { id: 'wagon',    label: 'Wagon',    Icon: Map },
];

const MatchAnalysisDrawer = ({ isOpen, onClose, result, onPlayerClick }) => {
  const [activeTab, setActiveTab] = useState('phases');

  if (!isOpen || !result) return null;

  const analytics = result.analytics;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-start justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl bg-bg-secondary border-l border-border-primary flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cricket-accent" />
            <span className="font-semibold text-text-primary text-sm">Match Analysis</span>
            {result.homeTeam && result.awayTeam && (
              <span className="text-xs text-text-tertiary ml-1">
                <TeamName teamId={result.homeTeam} variant="short" inline /> vs <TeamName teamId={result.awayTeam} variant="short" inline />
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded transition-colors">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-primary shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors flex-1 justify-center ${
                activeTab === id
                  ? 'border-cricket-accent text-text-primary font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!analytics ? (
            <div className="text-center py-12">
              <p className="text-text-secondary text-sm">No analytics data for this match.</p>
              <p className="text-text-tertiary text-xs mt-1">Analytics are generated for matches played after this feature was added.</p>
            </div>
          ) : (
            <>
              {activeTab === 'phases'  && <PhasesTab  analytics={analytics} result={result} />}
              {activeTab === 'batting' && <BattingTab analytics={analytics} result={result} onPlayerClick={onPlayerClick} />}
              {activeTab === 'bowling' && <BowlingTab analytics={analytics} result={result} onPlayerClick={onPlayerClick} />}
              {activeTab === 'wagon'   && <WagonZoneTab analytics={analytics} />}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MatchAnalysisDrawer;
