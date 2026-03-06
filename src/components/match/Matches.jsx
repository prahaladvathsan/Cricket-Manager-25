/**
 * @file Matches.jsx
 * @description Stats hub: Fixtures, Results, Season Statistics, Match Analysis (with Insights)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, History, MapPin, BarChart3 } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import TeamName from '../shared/TeamName';
import PlayerName from '../shared/PlayerName';
import PlayerStatsTable from '../team/PlayerStatsTable';
import MatchAnalysisDrawer from './MatchAnalysisDrawer';
import TacticsRecommendations from '../tactics/TacticsRecommendations';
import PlayerCardModal from '../shared/PlayerCardModal';
import WagonZoneMap from '../shared/WagonZoneMap';
import { aggregateStats } from '../../utils/matchAnalytics';
import { ContextualTip, useScreenTip, screenTips } from '../tutorial';

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES = ['powerplay', 'earlyMiddle', 'lateMiddle', 'death'];
const PHASE_LABELS = { powerplay: 'Powerplay (1–6)', earlyMiddle: 'Early Middle (7–12)', lateMiddle: 'Late Middle (13–16)', death: 'Death (17–20)' };
const TIERS = ['Blockade', 'Build', 'Rotate', 'Cruise', 'Blitz', 'Hit Out/Get Out'];
const BOWLING_PLANS = [
  'Attacking Line', 'Wide Line', 'Short-Pitched', 'Yorker Execution',
  'Pace Variation Mix', 'Swing/Seam Focus', 'Bouncer Barrage', 'Consistent Accuracy',
  'Flight & Loop', 'Flat & Fast', 'Wide of Off', 'Stumps Attack',
  'Turn Candy Bag', 'Flight Variation', 'Pace Variation', 'Consistent Line',
];

function sr(runs, balls)   { return balls ? ((runs / balls) * 100).toFixed(1) : '—'; }
function econ(runs, balls) { return balls ? ((runs / balls) * 6).toFixed(2) : '—'; }

// ─── Styled select dropdown ───────────────────────────────────────────────────
const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="flex items-center gap-1.5 text-xs text-text-secondary">
    {label}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-bg-secondary border border-border-primary rounded px-2 py-0.5 text-text-primary text-xs focus:outline-none focus:border-cricket-accent cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value} className="bg-bg-secondary text-text-primary">{o.label}</option>)}
    </select>
  </label>
);

// ─── Th/Td helpers ────────────────────────────────────────────────────────────
const Th = ({ children, right }) => (
  <th className={`pb-1.5 font-medium text-text-tertiary text-xs ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, highlight, dim, right }) => (
  <td className={`py-1 text-xs font-mono ${right ? 'text-right' : 'text-left'} ${highlight ? 'text-trophy-gold font-semibold' : dim ? 'text-text-tertiary' : 'text-white/80'}`}>{children}</td>
);

// ─── Collect segments from a list of results for the user team ────────────────
function collectSegments(results, userTeamId) {
  const batting  = {}; // pid -> segments[]
  const bowling  = {}; // pid -> segments[]
  const wagonZones = []; // opponent batting wagonZone entries
  const phases   = { batting: {}, bowling: {} }; // phase -> accumulated phase stats

  for (const r of results) {
    if (!r.analytics) continue;
    for (const inn of r.analytics.innings || []) {
      const userBatting = inn.battingTeamId === userTeamId;
      const userBowling = inn.bowlingTeamId === userTeamId;

      // Phase accumulation (team level)
      if (userBatting && inn.phases) {
        for (const [ph, stats] of Object.entries(inn.phases)) {
          if (!phases.batting[ph]) phases.batting[ph] = { runs: 0, balls: 0, wickets: 0, fours: 0, sixes: 0, dots: 0 };
          phases.batting[ph].runs    += stats.runs    || 0;
          phases.batting[ph].balls   += stats.balls   || 0;
          phases.batting[ph].wickets += stats.wickets || 0;
          phases.batting[ph].fours   += stats.fours   || 0;
          phases.batting[ph].sixes   += stats.sixes   || 0;
          phases.batting[ph].dots    += stats.dots    || 0;
        }
      }
      if (userBowling && inn.phases) {
        for (const [ph, stats] of Object.entries(inn.phases)) {
          if (!phases.bowling[ph]) phases.bowling[ph] = { runs: 0, balls: 0, wickets: 0, fours: 0, sixes: 0, dots: 0 };
          phases.bowling[ph].runs    += stats.runs    || 0;
          phases.bowling[ph].balls   += stats.balls   || 0;
          phases.bowling[ph].wickets += stats.wickets || 0;
          phases.bowling[ph].fours   += stats.fours   || 0;
          phases.bowling[ph].sixes   += stats.sixes   || 0;
          phases.bowling[ph].dots    += stats.dots    || 0;
        }
      }

      // Per-player segments
      for (const [pid, pdata] of Object.entries(inn.players || {})) {
        if (userBatting && pdata.batting?.length) {
          batting[pid] = [...(batting[pid] || []), ...pdata.batting];
        }
        if (userBowling && pdata.bowling?.length) {
          bowling[pid] = [...(bowling[pid] || []), ...pdata.bowling];
        }
      }

      // Opponent wagon zones (when they bat vs user's bowling)
      if (userBowling && inn.wagonZones?.length) {
        wagonZones.push(...inn.wagonZones);
      }
    }
  }

  return { batting, bowling, wagonZones, phases };
}

// ─── Phases sub-tab ───────────────────────────────────────────────────────────
const PhasesPanel = ({ phases, teamName }) => {
  const hasBatting = PHASES.some(p => phases.batting[p]?.balls > 0);
  const hasBowling = PHASES.some(p => phases.bowling[p]?.balls > 0);
  if (!hasBatting && !hasBowling) return <p className="text-text-tertiary text-sm py-6 text-center">No phase data yet</p>;

  const PhaseTable = ({ data, title }) => {
    const maxRPO = Math.max(1, ...PHASES.map(p => data[p]?.balls > 0 ? (data[p].runs / data[p].balls * 6) : 0));
    return (
      <div>
        <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">{title}</p>
        {/* Manhattan */}
        <div className="flex items-end gap-px mb-1 h-12">
          {PHASES.map(ph => {
            const d = data[ph];
            const rpo = d?.balls > 0 ? (d.runs / d.balls * 6) : 0;
            const pct = (rpo / maxRPO) * 100;
            return (
              <div key={ph} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-trophy-gold font-mono leading-none">{d?.balls > 0 ? (d.runs / d.balls * 6).toFixed(1) : '—'}</span>
                <div className="w-full rounded-sm" style={{ height: `${Math.max(3, pct * 0.34)}px`, background: '#D4AF37', opacity: 0.75 }} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-px mb-3">
          {PHASES.map(ph => <div key={ph} className="flex-1 text-center text-[10px] text-text-tertiary">{ph === 'powerplay' ? 'PP' : ph === 'earlyMiddle' ? 'EM' : ph === 'lateMiddle' ? 'LM' : 'DT'}</div>)}
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-border-primary">
            <Th>Phase</Th><Th right>Runs</Th><Th right>Ovrs</Th><Th right>Wkts</Th><Th right>4s</Th><Th right>6s</Th><Th right>RPO</Th>
          </tr></thead>
          <tbody>
            {PHASES.map(ph => {
              const d = data[ph];
              if (!d || d.balls === 0) return null;
              return (
                <tr key={ph} className="border-b border-border-primary/20">
                  <Td>{PHASE_LABELS[ph]}</Td>
                  <Td right highlight>{d.runs}</Td>
                  <Td right>{Math.floor(d.balls / 6)}.{d.balls % 6}</Td>
                  <Td right>{d.wickets}</Td>
                  <Td right>{d.fours}</Td>
                  <Td right>{d.sixes}</Td>
                  <Td right>{econ(d.runs, d.balls)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {hasBatting && <PhaseTable data={phases.batting} title={`${teamName} batting`} />}
      {hasBowling && <PhaseTable data={phases.bowling} title={`${teamName} bowling`} />}
    </div>
  );
};

// ─── Batting sub-tab ──────────────────────────────────────────────────────────
const BattingPanel = ({ batting, phaseFilter, tierFilter, onPlayerClick }) => {
  const rows = useMemo(() => {
    return Object.entries(batting).map(([pid, segs]) => {
      let f = segs;
      if (phaseFilter !== 'all') f = f.filter(s => s.phase === phaseFilter);
      if (tierFilter  !== 'all') f = f.filter(s => s.tier  === tierFilter);
      const agg = aggregateStats(f, {});
      if (agg.balls === 0) return null;
      return { pid, ...agg };
    }).filter(Boolean).sort((a, b) => b.runs - a.runs);
  }, [batting, phaseFilter, tierFilter]);

  return (
    <table className="w-full">
      <thead><tr className="border-b border-border-primary">
        <Th>Batter</Th><Th right>Runs</Th><Th right>Balls</Th><Th right>SR</Th><Th right>4s</Th><Th right>6s</Th>
      </tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="text-center text-text-tertiary text-xs py-5">No data for selected filters</td></tr>}
        {rows.map(r => (
          <tr key={r.pid} className="border-b border-border-primary/20 hover:bg-bg-secondary/50 cursor-pointer" onClick={() => onPlayerClick?.(r.pid)}>
            <Td><PlayerName playerId={r.pid} /></Td>
            <Td right highlight>{r.runs}</Td>
            <Td right>{r.balls}</Td>
            <Td right>{sr(r.runs, r.balls)}</Td>
            <Td right>{r.fours}</Td>
            <Td right>{r.sixes}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── Bowling sub-tab ──────────────────────────────────────────────────────────
const BowlingPanel = ({ bowling, phaseFilter, planFilter, onPlayerClick }) => {
  const rows = useMemo(() => {
    return Object.entries(bowling).map(([pid, segs]) => {
      let f = segs;
      if (phaseFilter !== 'all') f = f.filter(s => s.phase === phaseFilter);
      if (planFilter  !== 'all') f = f.filter(s => s.plan  === planFilter);
      const agg = aggregateStats(f, {});
      if (agg.balls === 0) return null;
      return { pid, ...agg };
    }).filter(Boolean).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
  }, [bowling, phaseFilter, planFilter]);

  return (
    <table className="w-full">
      <thead><tr className="border-b border-border-primary">
        <Th>Bowler</Th><Th right>Wkts</Th><Th right>Runs</Th><Th right>Ovrs</Th><Th right>Econ</Th><Th right>Dots</Th>
      </tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="text-center text-text-tertiary text-xs py-5">No data for selected filters</td></tr>}
        {rows.map(r => (
          <tr key={r.pid} className="border-b border-border-primary/20 hover:bg-bg-secondary/50 cursor-pointer" onClick={() => onPlayerClick?.(r.pid)}>
            <Td><PlayerName playerId={r.pid} /></Td>
            <Td right highlight>{r.wickets}</Td>
            <Td right>{r.runs}</Td>
            <Td right>{Math.floor(r.balls / 6)}.{r.balls % 6}</Td>
            <Td right>{econ(r.runs, r.balls)}</Td>
            <Td right dim>{r.dots}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── Fielding sub-tab ───────────────────────────────────────────────────────
const WagonPanel = ({ wagonZones, phaseFilter }) => {
  const [selectedZone, setSelectedZone] = useState(null);
  const filteredData = useMemo(() => {
    if (phaseFilter === 'all') return wagonZones;
    return wagonZones.filter(w => w.phase === phaseFilter);
  }, [wagonZones, phaseFilter]);

  return filteredData.length === 0
    ? <p className="text-text-tertiary text-xs text-center py-6">No wagon zone data yet</p>
    : <WagonZoneMap data={filteredData} onZoneClick={z => setSelectedZone(v => v === z ? null : z)} selectedZone={selectedZone} />;
};

// ─── Analysis Tab ─────────────────────────────────────────────────────────────
const SUBTABS = ['Phases', 'Batting', 'Bowling', 'Fielding'];

const AnalysisTab = ({ userResults, userTeamId, onPlayerClick, teamName }) => {
  const [subTab,      setSubTab]      = useState('Phases');
  const [matchFilter, setMatchFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [tierFilter,  setTierFilter]  = useState('all');
  const [planFilter,  setPlanFilter]  = useState('all');

  const analysableResults = useMemo(() => userResults.filter(r => r.analytics), [userResults]);

  const selectedResults = useMemo(() => {
    if (matchFilter === 'all') return analysableResults;
    const idx = parseInt(matchFilter, 10);
    return analysableResults[idx] ? [analysableResults[idx]] : [];
  }, [analysableResults, matchFilter]);

  const segments = useMemo(
    () => collectSegments(selectedResults, userTeamId),
    [selectedResults, userTeamId]
  );

  // Reset contextual filters when sub-tab changes
  const handleSubTab = (t) => { setSubTab(t); setPhaseFilter('all'); setTierFilter('all'); setPlanFilter('all'); };

  if (analysableResults.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary text-sm">No analysable matches yet</p>
        <p className="text-xs text-text-tertiary mt-1">Analytics attach to matches played after this feature was added</p>
      </div>
    );
  }

  // Build match options for dropdown
  const matchOptions = [
    { value: 'all', label: 'All matches' },
    ...analysableResults.map((r, i) => {
      const won    = r.winner === userTeamId;
      const oppId  = r.homeTeam === userTeamId ? r.awayTeam : r.homeTeam;
      return { value: String(i), label: `MD${r.matchday} — ${won ? 'W' : 'L'}` };
    }),
  ];

  const phaseOptions = [
    { value: 'all', label: 'All phases' },
    ...PHASES.map(p => ({ value: p, label: PHASE_LABELS[p] })),
  ];

  return (
    <div className="space-y-0">
      {/* Sub-tab row */}
      <div className="flex border-b border-border-primary mb-3">
        {SUBTABS.map(t => (
          <button
            key={t}
            onClick={() => handleSubTab(t)}
            className={`flex-1 text-center py-2 text-xs font-medium border-b-2 transition-colors ${
              subTab === t
                ? 'border-cricket-accent text-cricket-accent'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* Filter bar — single row, dropdowns only */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-border-primary/40">
        <FilterSelect label="Match" value={matchFilter} onChange={setMatchFilter} options={matchOptions} />
        {subTab !== 'Phases' && (
          <FilterSelect label="Phase" value={phaseFilter} onChange={setPhaseFilter} options={phaseOptions} />
        )}
        {subTab === 'Batting' && (
          <FilterSelect
            label="Tier"
            value={tierFilter}
            onChange={setTierFilter}
            options={[{ value: 'all', label: 'All tiers' }, ...TIERS.map(t => ({ value: t, label: t }))]}
          />
        )}
        {subTab === 'Bowling' && (
          <FilterSelect
            label="Plan"
            value={planFilter}
            onChange={setPlanFilter}
            options={[{ value: 'all', label: 'All plans' }, ...BOWLING_PLANS.map(p => ({ value: p, label: p }))]}
          />
        )}
        {subTab === 'Fielding' && (
          <FilterSelect label="Phase" value={phaseFilter} onChange={setPhaseFilter} options={phaseOptions} />
        )}
      </div>

      {/* Content */}
      {subTab === 'Phases'    && <PhasesPanel  phases={segments.phases} teamName={teamName} />}
      {subTab === 'Batting'   && <BattingPanel batting={segments.batting}  phaseFilter={phaseFilter} tierFilter={tierFilter} onPlayerClick={onPlayerClick} />}
      {subTab === 'Bowling'   && <BowlingPanel bowling={segments.bowling}  phaseFilter={phaseFilter} planFilter={planFilter} onPlayerClick={onPlayerClick} />}
      {subTab === 'Fielding' && <WagonPanel  wagonZones={segments.wagonZones} phaseFilter={phaseFilter} />}

      {/* Insights */}
      <div className="mt-6 pt-4 border-t border-border-primary/40">
        <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Tactical Insights</p>
        <TacticsRecommendations teamId={userTeamId} />
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Matches = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getUserTeam } = useTeamStore();
  const { fixtures, results, clubs } = useLeagueStore();
  const { getPlayersByTeam, careerStats, currentSeasonId } = usePlayerStore();
  const [activeTab, setActiveTab] = useState('fixtures');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyticsPlayerId, setAnalyticsPlayerId] = useState(null);
  const [statsSubTab, setStatsSubTab] = useState('batting');
  const { shouldShow: showStatsTip, dismiss: dismissStatsTip } = useScreenTip('stats');

  const userTeam = getUserTeam();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (['results', 'fixtures', 'statistics', 'analysis'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const userFixtures = useMemo(() => {
    if (!userTeam) return [];
    return fixtures
      .filter(f => f.homeTeam === userTeam.id || f.awayTeam === userTeam.id)
      .filter(f => f.status === 'scheduled' || !f.status)
      .sort((a, b) => (a.matchday || 0) - (b.matchday || 0));
  }, [fixtures, userTeam]);

  const userResults = useMemo(() => {
    if (!userTeam) return [];
    return results
      .filter(r => r.homeTeam === userTeam.id || r.awayTeam === userTeam.id)
      .sort((a, b) => (b.matchday || 0) - (a.matchday || 0));
  }, [results, userTeam]);

  const userStats = useMemo(() => {
    if (!userTeam || userResults.length === 0) return { played: 0, wins: 0, losses: 0, nrr: 0 };
    const wins = userResults.filter(r => r.winner === userTeam.id).length;
    const losses = userResults.filter(r => r.winner && r.winner !== userTeam.id).length;
    let runsScored = 0, ballsFaced = 0, runsConceded = 0, ballsBowled = 0;
    userResults.forEach(result => {
      const isHome = result.homeTeam === userTeam.id;
      const ourInnings  = isHome ? result.innings1 : result.innings2;
      const theirInnings = isHome ? result.innings2 : result.innings1;
      if (ourInnings)   { runsScored  += ourInnings.totalScore   || 0; ballsFaced  += ourInnings.ballsBowled   || 120; }
      if (theirInnings) { runsConceded += theirInnings.totalScore || 0; ballsBowled += theirInnings.ballsBowled || 120; }
    });
    const nrr = ballsFaced > 0 && ballsBowled > 0
      ? (runsScored / ballsFaced * 6) - (runsConceded / ballsBowled * 6) : 0;
    return { played: userResults.length, wins, losses, nrr };
  }, [userResults, userTeam]);

  // Season stats for Statistics tab (same shape as Squad page)
  const squadPlayers = useMemo(() => {
    if (!userTeam) return [];
    return getPlayersByTeam(userTeam.id);
  }, [getPlayersByTeam, userTeam]);

  const battingStats = useMemo(() => {
    if (!currentSeasonId) return [];
    return squadPlayers.map(player => {
      const s = careerStats[player.id]?.seasons?.[currentSeasonId];
      if (!s) return null;
      return {
        playerId: player.id, playerName: player.name, role: player.role,
        matches: s.matches || 0, innings: s.matches || 0,
        runs: s.runs || 0, ballsFaced: s.ballsFaced || 0,
        battingAvg: s.battingAvg || 0, strikeRate: s.strikeRate || 0,
        fifties: s.fifties || 0, centuries: s.centuries || 0,
        highestScore: s.highestScore || 0, highestScoreNotOut: s.highestScoreNotOut || false,
        notOuts: s.notOuts || 0,
        battingImpact: s.battingImpact || 0, bowlingImpact: s.bowlingImpact || 0,
        fieldingImpact: s.fieldingImpact || 0,
      };
    }).filter(Boolean);
  }, [squadPlayers, careerStats, currentSeasonId]);

  const bowlingStats = useMemo(() => {
    if (!currentSeasonId) return [];
    return squadPlayers.map(player => {
      const s = careerStats[player.id]?.seasons?.[currentSeasonId];
      if (!s) return null;
      const bowlingStrikeRate = s.wickets > 0 ? Number((s.ballsBowled / s.wickets).toFixed(2)) : 0;
      return {
        playerId: player.id, playerName: player.name, role: player.role,
        matches: s.matches || 0, innings: s.matches || 0,
        ballsBowled: s.ballsBowled || 0, runsConceded: s.runsConceded || 0,
        wickets: s.wickets || 0, bowlingAvg: s.bowlingAvg || 0,
        economy: s.economy || 0, bowlingStrikeRate,
        bestBowling: s.bestBowling || null, fourWickets: s.fourWickets || 0,
        fiveWickets: s.fiveWickets || 0,
        battingImpact: s.battingImpact || 0, bowlingImpact: s.bowlingImpact || 0,
        fieldingImpact: s.fieldingImpact || 0,
      };
    }).filter(Boolean);
  }, [squadPlayers, careerStats, currentSeasonId]);

  const tabs = [
    { id: 'fixtures',   label: 'Fixtures',  count: userFixtures.length },
    { id: 'results',    label: 'Results',   count: userResults.length },
    { id: 'statistics', label: 'Statistics', count: null },
    { id: 'analysis',   label: 'Analysis',  count: null },
  ];

  return (<>
    <div className="space-y-2">
      <h1 className="sr-only">Stats</h1>

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-center py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? 'border-cricket-accent text-cricket-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-transparent border border-white/10 rounded text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Quick Stats — only on Fixtures and Results tabs */}
      {userTeam && (activeTab === 'fixtures' || activeTab === 'results') && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-text-primary">{userStats.played}</div>
            <div className="text-text-secondary text-sm">Matches Played</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-status-win">{userStats.wins}</div>
            <div className="text-text-secondary text-sm">Wins</div>
          </div>
          <div className="card p-2 text-center">
            <div className={`text-2xl font-bold ${userStats.nrr >= 0 ? 'text-status-win' : 'text-status-loss'}`}>
              {userStats.nrr >= 0 ? '+' : ''}{userStats.nrr.toFixed(3)}
            </div>
            <div className="text-text-secondary text-sm">Net Run Rate</div>
          </div>
        </div>
      )}

      {/* ── Fixtures ── */}
      {activeTab === 'fixtures' && (
        <div className="card p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
            <Calendar className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Upcoming Fixtures</h3>
          </div>
          {userFixtures.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {userFixtures.map((fixture, idx) => {
                const isHome = fixture.homeTeam === userTeam?.id;
                return (
                  <div key={idx} className="p-3 border border-border-primary rounded hover:bg-bg-secondary transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-text-tertiary px-1.5 py-0.5 bg-transparent border border-white/10 rounded">MD {fixture.matchday}</span>
                          {fixture.date && <span className="text-xs text-text-secondary">{fixture.date}</span>}
                          <span className={`text-xs font-medium ${isHome ? 'text-cricket-accent' : 'text-blue-400'}`}>{isHome ? 'Home' : 'Away'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary text-sm font-medium">vs</span>
                          <TeamName teamId={isHome ? fixture.awayTeam : fixture.homeTeam} inline={true} showTeamAsset="icon" className="font-semibold" />
                        </div>
                        {fixture.venue && (
                          <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
                            <MapPin className="w-3 h-3" /><span>{fixture.venue}</span>
                          </div>
                        )}
                      </div>
                      <button className="btn-secondary text-xs py-1 px-2" onClick={() => navigate(`/game/match/${fixture.matchId}/preview`)}>View</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">No upcoming fixtures</p>
              <p className="text-sm text-text-tertiary mt-2">Complete the auction to generate the season schedule</p>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {activeTab === 'results' && (
        <div className="card p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
            <History className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Match Results</h3>
          </div>
          {userResults.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {userResults.map((result, idx) => {
                const isHome = result.homeTeam === userTeam?.id;
                const won = result.winner === userTeam?.id;
                const ourInnings   = isHome ? result.innings1 : result.innings2;
                const theirInnings = isHome ? result.innings2 : result.innings1;
                return (
                  <div key={idx} className={`p-3 border rounded transition-colors ${won ? 'border-status-win/30 bg-status-win/5' : 'border-status-loss/30 bg-status-loss/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-tertiary px-1.5 py-0.5 bg-transparent border border-white/10 rounded">MD {result.matchday || idx + 1}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? 'bg-status-win/20 text-status-win' : 'bg-status-loss/20 text-status-loss'}`}>{won ? 'WON' : 'LOST'}</span>
                      </div>
                      {result.date && <span className="text-xs text-text-secondary">{result.date}</span>}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <TeamName teamId={userTeam?.id} inline={true} showTeamAsset="icon" className="font-medium" />
                        <span className="font-mono text-text-primary">
                          {ourInnings?.totalScore || 0}/{ourInnings?.wickets || 0}
                          {ourInnings?.ballsBowled && <span className="text-text-tertiary text-xs ml-1">({Math.floor((ourInnings.ballsBowled || 0) / 6)}.{(ourInnings.ballsBowled || 0) % 6})</span>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <TeamName teamId={isHome ? result.awayTeam : result.homeTeam} inline={true} showTeamAsset="icon" className={won ? 'text-text-secondary' : ''} showHoverEffect={!won} />
                        <span className="font-mono text-text-secondary">
                          {theirInnings?.totalScore || 0}/{theirInnings?.wickets || 0}
                          {theirInnings?.ballsBowled && <span className="text-text-tertiary text-xs ml-1">({Math.floor((theirInnings.ballsBowled || 0) / 6)}.{(theirInnings.ballsBowled || 0) % 6})</span>}
                        </span>
                      </div>
                    </div>
                    {result.margin && (
                      <div className={`text-xs mt-2 pt-2 border-t flex items-center justify-between ${won ? 'border-status-win/20 text-status-win' : 'border-status-loss/20 text-status-loss'}`}>
                        <span>{result.margin}</span>
                        {result.analytics && (
                          <button
                            onClick={e => { e.stopPropagation(); setAnalysisResult(result); }}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary hover:text-cricket-accent border border-border-primary hover:border-cricket-accent transition-colors"
                          >
                            <BarChart3 className="w-3 h-3" /> Analyse
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8"><p className="text-text-secondary">No matches played yet</p></div>
          )}
        </div>
      )}

      {/* ── Statistics ── */}
      {activeTab === 'statistics' && (
        <div className="card p-2">
          <div className="flex border-b border-border-primary mb-3">
            {['batting', 'bowling'].map(t => (
              <button
                key={t}
                onClick={() => setStatsSubTab(t)}
                className={`flex-1 text-center py-2 text-xs font-medium border-b-2 transition-colors ${statsSubTab === t ? 'border-cricket-accent text-cricket-accent' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}
              >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          {battingStats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary">No statistics yet</p>
              <p className="text-sm text-text-tertiary mt-1">Play matches to see player statistics here</p>
            </div>
          ) : (
            <PlayerStatsTable
              players={statsSubTab === 'batting' ? battingStats : bowlingStats}
              type={statsSubTab}
              roleFilter="all"
              minQualifying={1}
            />
          )}
        </div>
      )}

      {/* ── Analysis ── */}
      {activeTab === 'analysis' && (
        <div className="card p-2">
          <AnalysisTab
            userResults={userResults}
            userTeamId={userTeam?.id}
            onPlayerClick={pid => setAnalyticsPlayerId(pid)}
            teamName={userTeam?.shortName || userTeam?.name || 'Your team'}
          />
        </div>
      )}
    </div>

    {/* Single-match drawer from Results "Analyse" button */}
    <MatchAnalysisDrawer
      isOpen={!!analysisResult}
      onClose={() => setAnalysisResult(null)}
      result={analysisResult}
      onPlayerClick={pid => setAnalyticsPlayerId(pid)}
    />

    <PlayerCardModal
      isOpen={!!analyticsPlayerId}
      onClose={() => setAnalyticsPlayerId(null)}
      playerId={analyticsPlayerId}
      initialTab="analytics"
    />

    {showStatsTip && (
      <ContextualTip
        title={screenTips.stats.title}
        icon={screenTips.stats.icon}
        tips={screenTips.stats.tips}
        onDismiss={dismissStatsTip}
      />
    )}
  </>);
};

export default Matches;
