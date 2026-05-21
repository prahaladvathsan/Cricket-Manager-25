/**
 * @file TestingDashboard.jsx
 * @description Main testing mode UI for match engine balance and realism testing
 * Access via /testing URL only (no menu link)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Download, RotateCcw, Beaker, Activity, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../../stores/playerStore';
import useTeamStore from '../../stores/teamStore';
import useMatchStore from '../../stores/matchStore';
import useLeagueStore from '../../stores/leagueStore';
import PlayerSelector from './PlayerSelector';
import ConditionsPanel from './ConditionsPanel';
import TacticsPanel from './TacticsPanel';
import ResultsDisplay from './ResultsDisplay';
import MatchResultsDisplay from './MatchResultsDisplay';
import { runTestSimulation } from './TestSimulator';
import { runMatchSimulation } from './TestMatchRunner';
import { BATTER_ARCHETYPES, BOWLER_ARCHETYPES, resolvePreset } from './archetypePresets';

// Simulation count options (Ball Mode)
const SIM_COUNTS = [
  { label: '10k', value: 10000 },
  { label: '100k', value: 100000 },
  { label: '1M', value: 1000000 }
];

// Match Mode sample sizes
const MATCH_COUNTS = [
  { label: '10', value: 10 },
  { label: '100', value: 100 },
  { label: '1000', value: 1000 }
];

// Default test configuration
const getDefaultConfig = () => ({
  // Players
  strikerId: null,
  bowlerId: null,
  nonStrikerId: null,

  // Match Context
  // Phase: powerplay (1-6), earlyMiddle (7-11), lateMiddle (12-15), death (16-20)
  phase: 'earlyMiddle',
  over: 10,
  ball: 1,
  wicketsInHand: 7,
  currentRunRate: 8.0,
  requiredRunRate: 9.5, // Auto-calculated: (180 - 72) / (65/6) ≈ 9.5
  ballsLeft: 65, // 120 - (9*6 + 1) = 65 balls left at start of over 10.1
  target: 180,
  oversBowled: 2.0, // Current bowler's spell length (used by some playstyles)

  // Player Condition
  strikerConfidence: 60,
  strikerEnergy: 80,
  bowlerConfidence: 60,
  bowlerEnergy: 80,

  // Pressure
  battingPressure: 50,
  bowlingPressure: 50,

  // Note: leftRightPartnership and newBallBonus are auto-calculated by the match engine
  // from player.battingHand and over number - not configurable here

  // Batting Tactics
  accelerationTier: 'Cruise',
  battingPlaystyle: null, // Use player's primary
  battingPlaystyleRating: null, // Use player's rating

  // Bowling Tactics
  bowlingType: 'pace', // pace or spin
  lineLength: 'Wide Line',
  variation: 'Consistent Accuracy',
  bowlingPlaystyle: null, // Use player's primary
  bowlingPlaystyleRating: null, // Use player's rating

  // Fielding
  fieldTemplate: 'neutral_orthodox',

  // Attribute overrides (used by synthetic archetype presets)
  strikerAttributeOverrides: null,
  bowlerAttributeOverrides: null
});

const TestingDashboard = () => {
  const navigate = useNavigate();
  const players = usePlayerStore(state => state.players);
  const teams = useTeamStore(state => state.teams);

  // Mode: 'ball' (single-context N-ball sweeps) or 'match' (N full matches)
  const [mode, setMode] = useState('ball');

  const [config, setConfig] = useState(getDefaultConfig());
  const [matchConfig, setMatchConfig] = useState({
    homeTeamId: null,
    awayTeamId: null
  });
  const [results, setResults] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningCount, setRunningCount] = useState(null); // Track which count is running
  const [progress, setProgress] = useState(null); // For Match Mode batch progress
  const [error, setError] = useState(null);

  // Auto-select first two teams when entering Match Mode if not yet picked
  useEffect(() => {
    if (mode === 'match' && teams) {
      const teamIds = Object.keys(teams);
      if (teamIds.length >= 2 && !matchConfig.homeTeamId) {
        setMatchConfig({ homeTeamId: teamIds[0], awayTeamId: teamIds[1] });
      }
    }
  }, [mode, teams, matchConfig.homeTeamId]);

  // Get selected players
  const striker = config.strikerId ? players[config.strikerId] : null;
  const bowler = config.bowlerId ? players[config.bowlerId] : null;

  // Auto-update tactics when striker changes
  useEffect(() => {
    if (striker) {
      const updates = {};
      // Reset batting playstyle override to use player's primary
      updates.battingPlaystyle = null;
      updates.battingPlaystyleRating = null;
      // Set default tier based on player style
      const primaryStyle = striker.primaryPlaystyle?.batting || '';
      if (primaryStyle.includes('Slogger') || primaryStyle.includes('Pinch')) {
        updates.accelerationTier = 'Blitz';
      } else if (primaryStyle.includes('Anchor') || primaryStyle.includes('Wall')) {
        updates.accelerationTier = 'Build';
      } else if (primaryStyle.includes('Finisher')) {
        updates.accelerationTier = 'Cruise';
      } else {
        updates.accelerationTier = 'Rotate';
      }
      setConfig(prev => ({ ...prev, ...updates }));
    }
  }, [config.strikerId]);

  // Auto-update tactics when bowler changes
  useEffect(() => {
    if (bowler) {
      const updates = {};
      // Set bowling type from player
      const bType = bowler.bowlingType?.toLowerCase();
      updates.bowlingType = bType === 'spin' ? 'spin' : 'pace';
      // Reset playstyle override
      updates.bowlingPlaystyle = null;
      updates.bowlingPlaystyleRating = null;
      // Set default plans based on bowling type
      if (bType === 'spin') {
        updates.lineLength = 'Flat & Fast';
        updates.variation = 'Turn Candy Bag';
      } else {
        updates.lineLength = 'Wide Line';
        updates.variation = 'Consistent Accuracy';
      }
      setConfig(prev => ({ ...prev, ...updates }));
    }
  }, [config.bowlerId]);

  // Update config helper
  const updateConfig = useCallback((updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Apply an archetype preset
  const applyBatterArchetype = useCallback((presetId) => {
    const preset = BATTER_ARCHETYPES.find(p => p.id === presetId);
    if (!preset) return;
    const resolved = resolvePreset(preset, players);
    if (!resolved) {
      setError(`Could not resolve archetype "${preset.label}" — no matching player in DB`);
      return;
    }
    setError(null);
    updateConfig({
      strikerId: resolved.playerId,
      strikerAttributeOverrides: resolved.attributeOverrides,
      ...(resolved.accelerationTier ? { accelerationTier: resolved.accelerationTier } : {})
    });
  }, [players, updateConfig]);

  const applyBowlerArchetype = useCallback((presetId) => {
    const preset = BOWLER_ARCHETYPES.find(p => p.id === presetId);
    if (!preset) return;
    const resolved = resolvePreset(preset, players);
    if (!resolved) {
      setError(`Could not resolve archetype "${preset.label}" — no matching player in DB`);
      return;
    }
    setError(null);
    updateConfig({
      bowlerId: resolved.playerId,
      bowlerAttributeOverrides: resolved.attributeOverrides,
      ...(resolved.lineLength ? { lineLength: resolved.lineLength } : {}),
      ...(resolved.variation ? { variation: resolved.variation } : {})
    });
  }, [players, updateConfig]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setConfig(getDefaultConfig());
    setResults(null);
    setError(null);
  }, []);

  // Run simulation with specified ball count
  const handleRunTest = useCallback(async (ballCount) => {
    if (!config.strikerId) {
      setError('Select a striker');
      return;
    }
    if (!config.bowlerId) {
      setError('Select a bowler');
      return;
    }

    setError(null);
    setIsRunning(true);
    setRunningCount(ballCount);
    setResults(null);

    try {
      const testResults = await runTestSimulation(config, players, ballCount);
      setResults(testResults);
    } catch (err) {
      console.error('Test simulation error:', err);
      setError(err.message || 'Simulation failed');
    } finally {
      setIsRunning(false);
      setRunningCount(null);
    }
  }, [config, players]);

  // Run match simulation batch (Match Mode)
  const handleRunMatchTest = useCallback(async (count) => {
    if (!matchConfig.homeTeamId) {
      setError('Select home team');
      return;
    }
    if (!matchConfig.awayTeamId) {
      setError('Select away team');
      return;
    }
    if (matchConfig.homeTeamId === matchConfig.awayTeamId) {
      setError('Select two different teams');
      return;
    }

    setError(null);
    setIsRunning(true);
    setRunningCount(count);
    setMatchResults(null);
    setProgress({ completed: 0, total: count });

    try {
      const matchResultsData = await runMatchSimulation({
        homeTeamId: matchConfig.homeTeamId,
        awayTeamId: matchConfig.awayTeamId,
        matchCount: count,
        matchStore: useMatchStore,
        playerStore: usePlayerStore,
        teamStore: useTeamStore,
        leagueStore: useLeagueStore,
        onProgress: setProgress
      });
      setMatchResults(matchResultsData);
    } catch (err) {
      console.error('Match simulation error:', err);
      setError(err.message || 'Match simulation failed');
    } finally {
      setIsRunning(false);
      setRunningCount(null);
      setProgress(null);
    }
  }, [matchConfig]);

  // Export results — handles both Ball Mode and Match Mode
  const handleExport = useCallback((format) => {
    const active = mode === 'ball' ? results : matchResults;
    const activeConfig = mode === 'ball' ? config : matchConfig;
    if (!active) return;

    const filename = `match-engine-${mode}-${Date.now()}`;
    let content, mimeType, extension;

    if (format === 'json') {
      content = JSON.stringify({ mode, config: activeConfig, results: active, exportedAt: new Date().toISOString() }, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (mode === 'ball') {
      const lines = [
        'Metric,Value',
        `Total Balls,${active.totalBalls}`,
        `Simulation Time (ms),${active.simulationTime}`,
        `Balls Per Second,${active.ballsPerSecond}`,
        `Strike Rate,${active.strikeRate.toFixed(2)}`,
        `Economy Rate,${active.economyRate.toFixed(2)}`,
        `Boundary Rate %,${(active.boundaryRate * 100).toFixed(2)}`,
        `Wicket Probability %,${(active.wicketProbability * 100).toFixed(2)}`,
        `Contact Quality Mean,${active.contactQualityMean?.toFixed(2) ?? ''}`,
        `Contact Quality StdDev,${active.contactQualityStdDev?.toFixed(2) ?? ''}`,
        `Aerial Rate %,${((active.aerialRate ?? 0) * 100).toFixed(2)}`,
        `Six Among Aerial %,${((active.sixAmongAerialRate ?? 0) * 100).toFixed(2)}`,
        `Catch Attempts,${active.catchAttempts ?? 0}`,
        `Catch Conversion %,${((active.catchConversion ?? 0) * 100).toFixed(2)}`,
        `Grounded Interception %,${((active.groundedInterceptionRate ?? 0) * 100).toFixed(2)}`,
        '',
        'Outcome,Count,Percentage',
        ...Object.entries(active.outcomeDistribution).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'Contact Type,Count,Percentage',
        ...Object.entries(active.contactDistribution).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'CQ Bucket,Count,Percentage',
        ...Object.entries(active.cqDistribution || {}).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'Shot Speed Bucket (m/s),Count,Percentage',
        ...Object.entries(active.shotSpeedDistribution || {}).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'Hit Zone,Count,Percentage',
        ...Object.entries(active.hitZoneDistribution || {}).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'Decision Delta,Count,Percentage',
        ...Object.entries(active.decisionDeltaDistribution || {}).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'Execution Delta,Count,Percentage',
        ...Object.entries(active.executionDeltaDistribution || {}).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'Closest Fielder Distance (m),Count,Percentage',
        ...Object.entries(active.fielderDistanceDistribution || {}).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        'Dismissal,Count,Percentage',
        ...Object.entries(active.dismissalDistribution || {}).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`)
      ];
      content = lines.join('\n');
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      // Match Mode CSV
      const lines = [
        'Metric,Value',
        `Match Count,${active.matchCount}`,
        `Errors,${active.errors}`,
        `Simulation Time (ms),${active.simulationTime}`,
        `Matches Per Second (x1000),${active.matchesPerSecond}`,
        '',
        'Innings1 Total,Mean,Std,P10,P50,P90,Min,Max',
        `Score,${active.innings1.mean.toFixed(1)},${active.innings1.std.toFixed(1)},${active.innings1.p10},${active.innings1.p50},${active.innings1.p90},${active.innings1.min},${active.innings1.max}`,
        '',
        'Innings2 Total,Mean,Std,P10,P50,P90,Min,Max',
        `Score,${active.innings2.mean.toFixed(1)},${active.innings2.std.toFixed(1)},${active.innings2.p10},${active.innings2.p50},${active.innings2.p90},${active.innings2.min},${active.innings2.max}`,
        '',
        'Phase,Runs,Balls,Wickets,RunRate,RunsPerInnings,WicketsPerInnings,BoundaryRate,DotRate',
        ...Object.entries(active.phaseSummary).map(([phase, p]) =>
          `${phase},${p.runs},${p.balls},${p.wickets},${p.runRate.toFixed(2)},${p.runsPerInnings.toFixed(1)},${p.wicketsPerInnings.toFixed(2)},${(p.boundaryRate * 100).toFixed(2)}%,${(p.dotRate * 100).toFixed(2)}%`
        ),
        '',
        'Top Scorer Per Match (across all matches)',
        `Runs Mean,${active.topScorerStats.runs.mean.toFixed(1)}`,
        `Runs P50/P90,${active.topScorerStats.runs.p50}/${active.topScorerStats.runs.p90}`,
        `SR Mean,${active.topScorerStats.strikeRate.mean.toFixed(1)}`,
        '',
        'Top Bowler Per Match',
        `Wickets Mean,${active.topBowlerStats.wickets.mean.toFixed(2)}`,
        `Econ Mean,${active.topBowlerStats.economy.mean.toFixed(2)}`,
        '',
        'Batting Leaders (≥ minInnings)',
        'Name,Innings,Runs,Balls,SR,RunsPerInnings',
        ...active.battingLeaders.map(p => `${p.name},${p.innings},${p.runs},${p.balls},${p.strikeRate.toFixed(1)},${p.runsPerInnings.toFixed(1)}`),
        '',
        'Bowling Leaders (≥ minInnings)',
        'Name,Innings,Balls,Wickets,Runs,Economy,WicketsPerInnings',
        ...active.bowlingLeaders.map(p => `${p.name},${p.innings},${p.balls},${p.wickets},${p.runs},${p.economy.toFixed(2)},${p.wicketsPerInnings.toFixed(2)}`)
      ];
      content = lines.join('\n');
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mode, config, results, matchConfig, matchResults]);

  const activeCounts = mode === 'ball' ? SIM_COUNTS : MATCH_COUNTS;
  const ballModeReady = config.strikerId && config.bowlerId;
  const matchModeReady = matchConfig.homeTeamId && matchConfig.awayTeamId && matchConfig.homeTeamId !== matchConfig.awayTeamId;
  const ready = mode === 'ball' ? ballModeReady : matchModeReady;
  const activeResults = mode === 'ball' ? results : matchResults;

  return (
    <div className="min-h-screen bg-cricket-dark">
      {/* Compact Header */}
      <div className="bg-bg-secondary border-b border-border-primary px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1.5 hover:bg-bg-tertiary rounded">
              <ArrowLeft className="w-4 h-4 text-text-secondary" />
            </button>
            <Beaker className="w-5 h-5 text-cricket-accent" />
            <h1 className="text-base font-bold text-text-primary">Match Engine Testing</h1>
            <span className="text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">DEV</span>

            {/* Mode toggle */}
            <div className="flex items-center gap-0.5 bg-bg-tertiary rounded p-0.5 ml-2">
              <button
                onClick={() => setMode('ball')}
                disabled={isRunning}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  mode === 'ball' ? 'bg-cricket-accent text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Ball Mode
              </button>
              <button
                onClick={() => setMode('match')}
                disabled={isRunning}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  mode === 'match' ? 'bg-cricket-accent text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Match Mode
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {activeResults && (
              <>
                <button onClick={() => handleExport('csv')} className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => handleExport('json')} className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
              </>
            )}
            {/* Run count buttons (Ball or Match) */}
            <div className="flex items-center gap-1 bg-bg-tertiary rounded p-0.5">
              {activeCounts.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => (mode === 'ball' ? handleRunTest(value) : handleRunMatchTest(value))}
                  disabled={isRunning || !ready}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    isRunning && runningCount === value
                      ? 'bg-cricket-accent text-white'
                      : isRunning || !ready
                        ? 'text-text-muted cursor-not-allowed'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                >
                  {isRunning && runningCount === value ? (
                    <Activity className="w-3 h-3 animate-pulse" />
                  ) : null}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar for Match Mode */}
        {progress && mode === 'match' && (
          <div className="mt-1 text-[10px] text-text-muted">
            Running matches: {progress.completed} / {progress.total}
            <div className="h-1 bg-bg-tertiary rounded mt-0.5 overflow-hidden">
              <div className="h-full bg-cricket-accent" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Content */}
      {mode === 'ball' ? (
        <div className="p-2 grid grid-cols-12 gap-2" style={{ height: 'calc(100vh - 52px)' }}>
          <div className="col-span-3 overflow-y-auto space-y-2">
            <ArchetypePresetBar
              onApplyBatter={applyBatterArchetype}
              onApplyBowler={applyBowlerArchetype}
            />
            <PlayerSelector
              strikerId={config.strikerId}
              bowlerId={config.bowlerId}
              nonStrikerId={config.nonStrikerId}
              onSelectStriker={(id) => updateConfig({ strikerId: id, strikerAttributeOverrides: null })}
              onSelectBowler={(id) => updateConfig({ bowlerId: id, bowlerAttributeOverrides: null })}
              onSelectNonStriker={(id) => updateConfig({ nonStrikerId: id })}
            />
            {(config.strikerAttributeOverrides || config.bowlerAttributeOverrides) && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1 text-[10px] text-yellow-400">
                ⚠ Synthetic attribute overrides active — clear by re-selecting players
              </div>
            )}
          </div>
          <div className="col-span-3 overflow-y-auto">
            <TacticsPanel config={config} onUpdate={updateConfig} striker={striker} bowler={bowler} />
          </div>
          <div className="col-span-3 overflow-y-auto">
            <ConditionsPanel config={config} onUpdate={updateConfig} />
          </div>
          <div className="col-span-3 overflow-y-auto">
            <ResultsDisplay results={results} isRunning={isRunning} />
          </div>
        </div>
      ) : (
        <div className="p-2 grid grid-cols-12 gap-2" style={{ height: 'calc(100vh - 52px)' }}>
          <div className="col-span-4 overflow-y-auto">
            <MatchModeTeamPicker
              teams={teams}
              matchConfig={matchConfig}
              onUpdate={setMatchConfig}
              isRunning={isRunning}
            />
          </div>
          <div className="col-span-8 overflow-y-auto">
            <MatchResultsDisplay results={matchResults} isRunning={isRunning} progress={progress} />
          </div>
        </div>
      )}
    </div>
  );
};

// Inline archetype preset bar for Ball Mode
const ArchetypePresetBar = ({ onApplyBatter, onApplyBowler }) => {
  const [batterPick, setBatterPick] = React.useState('');
  const [bowlerPick, setBowlerPick] = React.useState('');

  const handleBatter = (id) => {
    setBatterPick(id);
    if (id) onApplyBatter(id);
  };
  const handleBowler = (id) => {
    setBowlerPick(id);
    if (id) onApplyBowler(id);
  };

  return (
    <div className="card p-2 space-y-1.5">
      <div className="text-[10px] font-semibold text-text-secondary">ARCHETYPE PRESETS</div>
      <select
        value={batterPick}
        onChange={(e) => handleBatter(e.target.value)}
        className="w-full bg-bg-tertiary text-text-primary text-[11px] rounded px-1.5 py-1 border border-border-primary"
      >
        <option value="">— load batter archetype —</option>
        {BATTER_ARCHETYPES.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <select
        value={bowlerPick}
        onChange={(e) => handleBowler(e.target.value)}
        className="w-full bg-bg-tertiary text-text-primary text-[11px] rounded px-1.5 py-1 border border-border-primary"
      >
        <option value="">— load bowler archetype —</option>
        {BOWLER_ARCHETYPES.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <div className="text-[9px] text-text-muted leading-tight">
        Loads a representative player from the DB + sets recommended tier/plan.
        SYNTHETIC presets apply extreme attribute overrides.
      </div>
    </div>
  );
};

// Inline team picker for Match Mode
const MatchModeTeamPicker = ({ teams, matchConfig, onUpdate, isRunning }) => {
  const teamList = Object.values(teams || {});
  return (
    <div className="card p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <Users className="w-4 h-4 text-cricket-accent" />
        <span className="text-sm font-semibold text-text-primary">Team Selection</span>
      </div>

      <div>
        <label className="text-[11px] text-text-secondary block mb-1">Home Team</label>
        <select
          value={matchConfig.homeTeamId || ''}
          onChange={(e) => onUpdate({ ...matchConfig, homeTeamId: e.target.value })}
          disabled={isRunning}
          className="w-full bg-bg-tertiary text-text-primary text-xs rounded px-2 py-1.5 border border-border-primary"
        >
          <option value="">— select —</option>
          {teamList.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[11px] text-text-secondary block mb-1">Away Team</label>
        <select
          value={matchConfig.awayTeamId || ''}
          onChange={(e) => onUpdate({ ...matchConfig, awayTeamId: e.target.value })}
          disabled={isRunning}
          className="w-full bg-bg-tertiary text-text-primary text-xs rounded px-2 py-1.5 border border-border-primary"
        >
          <option value="">— select —</option>
          {teamList.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="text-[10px] text-text-muted pt-2 border-t border-border-primary leading-tight">
        Match Mode runs full innings through QuickSimMatch — exercises dynamic
        acceleration tiers, pressure swings, fatigue/confidence decay. Tactics
        come from each team&apos;s stored tactics state (squadSelection, batting
        order, bowling rotation, field formation, bowling plans).
      </div>
    </div>
  );
};

export default TestingDashboard;
