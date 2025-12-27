/**
 * @file ConditionsPanel.jsx
 * @description Compact match conditions panel for testing mode with interdependent fields
 *
 * Phase definitions:
 * - powerplay: Overs 1-6
 * - earlyMiddle: Overs 7-11
 * - lateMiddle: Overs 12-15
 * - death: Overs 16-20
 */

import React, { useCallback } from 'react';
import { Settings, Zap, TrendingUp, Activity, Target } from 'lucide-react';
import pressureCalculator from '../../core/tactics/PressureCalculator.js';

// Phase definitions with over ranges
const PHASES = [
  { id: 'powerplay', label: 'PP', fullLabel: 'Powerplay', overRange: [1, 6] },
  { id: 'earlyMiddle', label: 'EM', fullLabel: 'Early Middle', overRange: [7, 11] },
  { id: 'lateMiddle', label: 'LM', fullLabel: 'Late Middle', overRange: [12, 15] },
  { id: 'death', label: 'Death', fullLabel: 'Death', overRange: [16, 20] }
];

// Get phase from over number
const getPhaseFromOver = (over) => {
  if (over <= 6) return 'powerplay';
  if (over <= 11) return 'earlyMiddle';
  if (over <= 15) return 'lateMiddle';
  return 'death';
};

// Get default over for a phase
const getDefaultOverForPhase = (phase) => {
  const phaseConfig = PHASES.find(p => p.id === phase);
  return phaseConfig ? phaseConfig.overRange[0] : 10;
};

// Calculate balls left from over and ball
// over=1, ball=1 means "about to bowl 1st ball" → 120 balls left
// over=20, ball=6 means "about to bowl last ball" → 1 ball left
const calculateBallsLeft = (over, ball) => {
  const ballsBowled = (over - 1) * 6 + (ball - 1);
  return 120 - ballsBowled;
};

// Calculate current score from CRR and balls bowled
const calculateCurrentScore = (currentRunRate, ballsBowled) => {
  const overs = ballsBowled / 6;
  return Math.round(currentRunRate * overs);
};

// Calculate required run rate from target, current score, and balls left
const calculateRRR = (target, currentScore, ballsLeft) => {
  if (ballsLeft <= 0) return 0;
  const runsNeeded = target - currentScore;
  const oversLeft = ballsLeft / 6;
  return Math.max(0, runsNeeded / oversLeft);
};

// Calculate pressure using central PressureCalculator
// Uses combined resource ratio and CRR/RRR ratio with sigmoid curve
const calculatePressure = (wicketsInHand, ballsLeft, currentScore, target, currentRunRate, requiredRunRate) => {
  const pressure = pressureCalculator.calculatePressure({
    ballsLeft,
    wicketsInHand,
    currentScore,
    target,
    currentRunRate,
    requiredRunRate
  });

  return {
    batPressure: pressure.batting,
    bowlPressure: pressure.bowling
  };
};

// Calculate target from RRR, current score, and balls left
const calculateTargetFromRRR = (requiredRunRate, currentScore, ballsLeft) => {
  const oversLeft = ballsLeft / 6;
  const runsNeeded = requiredRunRate * oversLeft;
  return Math.round(currentScore + runsNeeded);
};

const Slider = ({ label, value, onChange, min, max, step = 1, unit = '' }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-text-muted w-20 truncate">{label}</span>
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-cricket-accent"
    />
    <span className="text-[10px] text-text-primary w-10 text-right">
      {typeof value === 'number' ? (step < 1 ? value.toFixed(1) : value) : value}{unit}
    </span>
  </div>
);

const NumInput = ({ label, value, onChange, min, max, step = 1, width = 'w-12' }) => (
  <div className="flex items-center gap-1">
    <span className="text-[10px] text-text-muted">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      className={`${width} px-1 py-0.5 bg-bg-tertiary border border-border-primary rounded text-[10px] text-text-primary text-center`}
    />
  </div>
);

const Section = ({ title, icon: Icon, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1 text-text-primary">
      <Icon className="w-3 h-3 text-cricket-accent" />
      <span className="text-[10px] font-semibold">{title}</span>
    </div>
    <div className="space-y-1.5 pl-4">{children}</div>
  </div>
);

const ConditionsPanel = ({ config, onUpdate }) => {
  // Helper to recalculate RRR and pressure when relevant values change
  const recalculateDerivedValues = useCallback((updates, baseConfig = config) => {
    const newConfig = { ...baseConfig, ...updates };
    const ballsBowled = 120 - newConfig.ballsLeft;
    const currentScore = calculateCurrentScore(newConfig.currentRunRate, ballsBowled);
    const newRRR = calculateRRR(newConfig.target, currentScore, newConfig.ballsLeft);
    const { batPressure, bowlPressure } = calculatePressure(
      newConfig.wicketsInHand,
      newConfig.ballsLeft,
      currentScore,
      newConfig.target,
      newConfig.currentRunRate,
      newRRR
    );

    return {
      ...updates,
      requiredRunRate: Math.round(newRRR * 10) / 10,
      battingPressure: batPressure,
      bowlingPressure: bowlPressure
    };
  }, [config]);

  // Handle over change - update phase, balls left, RRR, and pressure
  const handleOverChange = useCallback((newOver) => {
    const clampedOver = Math.min(20, Math.max(1, newOver));
    const newPhase = getPhaseFromOver(clampedOver);
    const newBallsLeft = Math.max(1, calculateBallsLeft(clampedOver, config.ball));

    const updates = recalculateDerivedValues({
      over: clampedOver,
      phase: newPhase,
      ballsLeft: newBallsLeft
    });
    onUpdate(updates);
  }, [config.ball, onUpdate, recalculateDerivedValues]);

  // Handle ball change - update balls left, RRR, and pressure
  const handleBallChange = useCallback((newBall) => {
    const clampedBall = Math.min(6, Math.max(1, newBall));
    const newBallsLeft = Math.max(1, calculateBallsLeft(config.over, clampedBall));

    const updates = recalculateDerivedValues({
      ball: clampedBall,
      ballsLeft: newBallsLeft
    });
    onUpdate(updates);
  }, [config.over, onUpdate, recalculateDerivedValues]);

  // Handle phase change - update over, balls left, RRR, and pressure
  const handlePhaseChange = useCallback((newPhase) => {
    const newOver = getDefaultOverForPhase(newPhase);
    const newBallsLeft = Math.max(1, calculateBallsLeft(newOver, 1));

    const updates = recalculateDerivedValues({
      phase: newPhase,
      over: newOver,
      ball: 1,
      ballsLeft: newBallsLeft
    });
    onUpdate(updates);
  }, [onUpdate, recalculateDerivedValues]);

  // Handle balls left manual change - update over, ball, phase, RRR, and pressure
  const handleBallsLeftChange = useCallback((newBallsLeft) => {
    const clampedBallsLeft = Math.min(120, Math.max(1, newBallsLeft));
    const ballsBowled = 120 - clampedBallsLeft;
    const newOver = Math.min(20, Math.floor(ballsBowled / 6) + 1);
    const newBall = Math.min(6, (ballsBowled % 6) + 1);
    const newPhase = getPhaseFromOver(newOver);

    const updates = recalculateDerivedValues({
      ballsLeft: clampedBallsLeft,
      over: newOver,
      ball: newBall,
      phase: newPhase
    });
    onUpdate(updates);
  }, [onUpdate, recalculateDerivedValues]);

  // Handle target change - update RRR and pressure
  const handleTargetChange = useCallback((newTarget) => {
    const updates = recalculateDerivedValues({ target: Math.max(0, newTarget) });
    onUpdate(updates);
  }, [onUpdate, recalculateDerivedValues]);

  // Handle current run rate change - update RRR and pressure
  const handleCRRChange = useCallback((newCRR) => {
    const updates = recalculateDerivedValues({ currentRunRate: newCRR });
    onUpdate(updates);
  }, [onUpdate, recalculateDerivedValues]);

  // Handle wickets change - update pressure
  const handleWicketsChange = useCallback((newWickets) => {
    const clampedWickets = Math.min(10, Math.max(0, newWickets));
    const updates = recalculateDerivedValues({ wicketsInHand: clampedWickets });
    onUpdate(updates);
  }, [onUpdate, recalculateDerivedValues]);

  // Handle RRR change - update target and pressure
  const handleRRRChange = useCallback((newRRR) => {
    const ballsBowled = 120 - config.ballsLeft;
    const currentScore = calculateCurrentScore(config.currentRunRate, ballsBowled);
    const newTarget = calculateTargetFromRRR(newRRR, currentScore, config.ballsLeft);
    const { batPressure, bowlPressure } = calculatePressure(
      config.wicketsInHand,
      config.ballsLeft,
      currentScore,
      newTarget,
      config.currentRunRate,
      newRRR
    );

    onUpdate({
      requiredRunRate: newRRR,
      target: newTarget,
      battingPressure: batPressure,
      bowlingPressure: bowlPressure
    });
  }, [config.ballsLeft, config.currentRunRate, config.wicketsInHand, onUpdate]);

  return (
    <div className="card p-2 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 70px)' }}>
      <div className="flex items-center gap-1.5">
        <Settings className="w-3.5 h-3.5 text-cricket-accent" />
        <span className="text-xs font-semibold text-text-primary">Conditions</span>
      </div>

      {/* Match Phase */}
      <Section title="Phase & Timing" icon={Zap}>
        <div className="grid grid-cols-4 gap-1 mb-1">
          {PHASES.map(p => (
            <button
              key={p.id}
              onClick={() => handlePhaseChange(p.id)}
              title={`${p.fullLabel} (Overs ${p.overRange[0]}-${p.overRange[1]})`}
              className={`px-1 py-0.5 text-[10px] rounded ${
                config.phase === p.id ? 'bg-cricket-accent text-white' : 'bg-bg-tertiary text-text-secondary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <NumInput
            label="Over"
            value={config.over}
            onChange={handleOverChange}
            min={1}
            max={20}
          />
          <NumInput
            label="Ball"
            value={config.ball}
            onChange={handleBallChange}
            min={1}
            max={6}
          />
          <NumInput
            label="Wkts"
            value={config.wicketsInHand}
            onChange={handleWicketsChange}
            min={0}
            max={10}
          />
        </div>
        <Slider
          label="Balls Left"
          value={config.ballsLeft}
          onChange={handleBallsLeftChange}
          min={1}
          max={120}
        />
        <div className="text-[10px] text-text-muted text-right">
          Over {config.over - 1}.{config.ball - 1} | {config.ballsLeft} balls remaining
        </div>
      </Section>

      {/* Run Rates */}
      <Section title="Run Rates" icon={TrendingUp}>
        <Slider label="Current RR" value={config.currentRunRate} onChange={handleCRRChange} min={0} max={36} step={0.5} />
        <Slider label="Required RR" value={config.requiredRunRate} onChange={handleRRRChange} min={0} max={36} step={0.5} />
        <NumInput label="Target" value={config.target} onChange={handleTargetChange} min={0} max={300} width="w-14" />
      </Section>

      {/* Bowler Spell */}
      <Section title="Bowler Spell" icon={Activity}>
        <Slider label="Overs Bowled" value={config.oversBowled} onChange={(v) => onUpdate({ oversBowled: v })} min={0} max={4} step={0.1} />
      </Section>

      {/* Player Condition */}
      <Section title="Condition" icon={Activity}>
        <div className="text-[10px] text-text-muted">Striker</div>
        <Slider label="Confidence" value={config.strikerConfidence} onChange={(v) => onUpdate({ strikerConfidence: v })} min={0} max={100} />
        <Slider label="Energy" value={config.strikerEnergy} onChange={(v) => onUpdate({ strikerEnergy: v })} min={0} max={100} />
        <div className="text-[10px] text-text-muted mt-1">Bowler</div>
        <Slider label="Confidence" value={config.bowlerConfidence} onChange={(v) => onUpdate({ bowlerConfidence: v })} min={0} max={100} />
        <Slider label="Energy" value={config.bowlerEnergy} onChange={(v) => onUpdate({ bowlerEnergy: v })} min={0} max={100} />
      </Section>

      {/* Pressure - Display only, auto-calculated from wickets & balls */}
      <Section title="Pressure" icon={Target}>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-bg-tertiary rounded p-1.5 text-center">
            <div className="text-[10px] text-text-muted">Batting</div>
            <div className="text-sm font-bold text-yellow-400">{config.battingPressure}</div>
          </div>
          <div className="bg-bg-tertiary rounded p-1.5 text-center">
            <div className="text-[10px] text-text-muted">Bowling</div>
            <div className="text-sm font-bold text-blue-400">{config.bowlingPressure}</div>
          </div>
        </div>
        <div className="text-[10px] text-text-muted text-center">
          DLS resources vs target (same as match engine)
        </div>
      </Section>

      {/* Contextual Info - Auto-calculated from other settings */}
      <Section title="Auto Modifiers" icon={Settings}>
        <div className="text-[10px] text-text-muted italic mb-1">
          Auto-calculated by match engine:
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-text-secondary">Left-Right Partnership</span>
            <span className="text-text-muted">From player hands</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">New Ball Bonus</span>
            <span className="text-text-muted">Over 1-6 + pace</span>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default ConditionsPanel;
