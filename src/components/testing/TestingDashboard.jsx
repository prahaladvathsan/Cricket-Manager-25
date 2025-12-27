/**
 * @file TestingDashboard.jsx
 * @description Main testing mode UI for match engine balance and realism testing
 * Access via /testing URL only (no menu link)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Download, RotateCcw, Beaker, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../../stores/playerStore';
import PlayerSelector from './PlayerSelector';
import ConditionsPanel from './ConditionsPanel';
import TacticsPanel from './TacticsPanel';
import ResultsDisplay from './ResultsDisplay';
import { runTestSimulation } from './TestSimulator';

// Simulation count options
const SIM_COUNTS = [
  { label: '10k', value: 10000 },
  { label: '100k', value: 100000 },
  { label: '1M', value: 1000000 }
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
  fieldTemplate: 'neutral_orthodox'
});

const TestingDashboard = () => {
  const navigate = useNavigate();
  const players = usePlayerStore(state => state.players);

  const [config, setConfig] = useState(getDefaultConfig());
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningCount, setRunningCount] = useState(null); // Track which count is running
  const [error, setError] = useState(null);

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

  // Export results
  const handleExport = useCallback((format) => {
    if (!results) return;

    const filename = `match-engine-test-${Date.now()}`;
    let content, mimeType, extension;

    if (format === 'json') {
      content = JSON.stringify({ config, results, exportedAt: new Date().toISOString() }, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      const lines = [
        'Metric,Value',
        `Total Balls,${results.totalBalls}`,
        `Simulation Time (ms),${results.simulationTime}`,
        `Balls Per Second,${results.ballsPerSecond}`,
        '',
        'Outcome,Count,Percentage',
        ...Object.entries(results.outcomeDistribution).map(([k, v]) => `${k},${v.count},${v.percentage.toFixed(2)}%`),
        '',
        `Strike Rate,${results.strikeRate.toFixed(2)}`,
        `Economy Rate,${results.economyRate.toFixed(2)}`
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
  }, [config, results]);

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
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {results && (
              <>
                <button onClick={() => handleExport('csv')} className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => handleExport('json')} className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
              </>
            )}
            {/* Simulation count buttons */}
            <div className="flex items-center gap-1 bg-bg-tertiary rounded p-0.5">
              {SIM_COUNTS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleRunTest(value)}
                  disabled={isRunning || !config.strikerId || !config.bowlerId}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    isRunning && runningCount === value
                      ? 'bg-cricket-accent text-white'
                      : isRunning || !config.strikerId || !config.bowlerId
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
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Content - 4 Column Layout */}
      <div className="p-2 grid grid-cols-12 gap-2" style={{ height: 'calc(100vh - 52px)' }}>
        {/* Col 1: Player Selection */}
        <div className="col-span-3 overflow-y-auto">
          <PlayerSelector
            strikerId={config.strikerId}
            bowlerId={config.bowlerId}
            nonStrikerId={config.nonStrikerId}
            onSelectStriker={(id) => updateConfig({ strikerId: id })}
            onSelectBowler={(id) => updateConfig({ bowlerId: id })}
            onSelectNonStriker={(id) => updateConfig({ nonStrikerId: id })}
          />
        </div>

        {/* Col 2: Tactics */}
        <div className="col-span-3 overflow-y-auto">
          <TacticsPanel
            config={config}
            onUpdate={updateConfig}
            striker={striker}
            bowler={bowler}
          />
        </div>

        {/* Col 3: Conditions */}
        <div className="col-span-3 overflow-y-auto">
          <ConditionsPanel config={config} onUpdate={updateConfig} />
        </div>

        {/* Col 4: Results */}
        <div className="col-span-3 overflow-y-auto">
          <ResultsDisplay results={results} isRunning={isRunning} />
        </div>
      </div>
    </div>
  );
};

export default TestingDashboard;
