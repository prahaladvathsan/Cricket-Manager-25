/**
 * @file RunningDecisionCalculator.js
 * @description Calculate running decisions and run-out probabilities for batsmen
 * @module core/match-engine/RunningDecisionCalculator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runningConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/config/running-config.json'), 'utf8'));

/**
 * @typedef {Object} RunningDecision
 * @property {number} runsAttempted - Number of runs batsmen attempt
 * @property {number} maxSafeRuns - Maximum runs that can be completed safely
 * @property {boolean} isRunOut - Whether run-out occurs
 * @property {string} runOutPlayer - Which batsman gets run out (if any)
 * @property {number} errorProbability - Probability of making running error
 * @property {Object} breakdown - Detailed calculation breakdown
 */

/**
 * @typedef {Object} FieldingTime
 * @property {number} totalTime - Total time for fielding and throwing
 * @property {number} fieldingTime - Time to reach and field ball
 * @property {number} throwTime - Time to throw back to wickets
 */

class RunningDecisionCalculator {
  constructor() {
    this.config = runningConfig;
    this.baseRunningSpeed = this.config.runningSpeed.baseSpeed;
    this.wicketDistance = this.config.runningSpeed.wicketDistance;

    console.log('✅ RunningDecisionCalculator initialized');
  }

  /**
   * Calculate running decision for batsmen
   * @param {Object} striker - Striking batsman
   * @param {Object} nonStriker - Non-striking batsman
   * @param {FieldingTime} fieldingTime - Total fielding time
   * @param {string} battingMentality - Current batting mentality
   * @returns {RunningDecision} Running decision and outcome
   */
  calculateRunningDecision(striker, nonStriker, fieldingTime, battingMentality = 'neutral') {
    // Calculate running speeds for both batsmen
    const strikerSpeed = this.calculateRunningSpeed(striker);
    const nonStrikerSpeed = this.calculateRunningSpeed(nonStriker);

    // Determine maximum safe runs based on time comparison
    const maxSafeRuns = this.calculateMaxSafeRuns(fieldingTime.totalTime, strikerSpeed, nonStrikerSpeed);

    // Calculate combined judgment for error probability
    const combinedJudgment = this.calculateCombinedJudgment(striker, nonStriker);
    const errorProbability = this.calculateErrorProbability(combinedJudgment);

    // Determine runs attempted based on mentality and judgment
    const runsAttempted = this.determineRunsAttempted(
      maxSafeRuns,
      combinedJudgment,
      battingMentality,
      fieldingTime
    );

    // Check for run-out
    const runOutResult = this.checkRunOut(
      runsAttempted,
      maxSafeRuns,
      errorProbability,
      striker,
      nonStriker
    );

    return {
      runsAttempted,
      maxSafeRuns,
      isRunOut: runOutResult.isRunOut,
      runOutPlayer: runOutResult.runOutPlayer,
      errorProbability,
      breakdown: {
        strikerSpeed,
        nonStrikerSpeed,
        combinedJudgment,
        fieldingTime: fieldingTime.totalTime,
        mentality: battingMentality,
        calculation: {
          timeAvailable: fieldingTime.totalTime,
          timeRequired: this.calculateRunningTime(runsAttempted, strikerSpeed, nonStrikerSpeed),
          safetyMargin: fieldingTime.totalTime - this.calculateRunningTime(maxSafeRuns, strikerSpeed, nonStrikerSpeed)
        }
      }
    };
  }

  /**
   * Calculate running speed for a batsman
   * @param {Object} batsman - Batsman object with attributes
   * @returns {number} Running speed in yards per second
   */
  calculateRunningSpeed(batsman) {
    const speed = batsman.attributes?.physical?.speed || 10;
    const fitness = batsman.attributes?.physical?.maxFitness || 10;

    // Combine speed and fitness for running ability
    const effectiveSpeed = (speed * 0.8 + fitness * 0.2) / 20; // Normalize to 0-1
    return this.baseRunningSpeed + (effectiveSpeed * this.config.runningSpeed.speedMultiplier * 20);
  }

  /**
   * Calculate maximum safe runs based on available time
   * @param {number} totalFieldingTime - Total time available before ball returns
   * @param {number} strikerSpeed - Striker running speed
   * @param {number} nonStrikerSpeed - Non-striker running speed
   * @returns {number} Maximum safe runs
   */
  calculateMaxSafeRuns(totalFieldingTime, strikerSpeed, nonStrikerSpeed) {
    let runs = 0;
    let timeUsed = 0;

    // Calculate time for each run
    while (timeUsed < totalFieldingTime) {
      const nextRunTime = this.calculateRunningTime(runs + 1, strikerSpeed, nonStrikerSpeed);
      if (timeUsed + nextRunTime + this.config.riskAssessment.safeMargin <= totalFieldingTime) {
        runs++;
        timeUsed = nextRunTime;
      } else {
        break;
      }
    }

    return runs;
  }

  /**
   * Calculate time required for specific number of runs
   * @param {number} runs - Number of runs
   * @param {number} strikerSpeed - Striker running speed
   * @param {number} nonStrikerSpeed - Non-striker running speed
   * @returns {number} Time required in seconds
   */
  calculateRunningTime(runs, strikerSpeed, nonStrikerSpeed) {
    if (runs === 0) return 0;

    const avgSpeed = (strikerSpeed + nonStrikerSpeed) / 2;
    const timePerRun = this.wicketDistance / avgSpeed;

    // Simple calculation: just time to run the required distance
    return runs * timePerRun;
  }

  /**
   * Calculate combined judgment of both batsmen
   * @param {Object} striker - Striking batsman
   * @param {Object} nonStriker - Non-striking batsman
   * @returns {number} Combined judgment score
   */
  calculateCombinedJudgment(striker, nonStriker) {
    const strikerJudgment = striker.attributes?.mental?.judgement || 10;
    const nonStrikerJudgment = nonStriker.attributes?.mental?.judgement || 10;

    // Weight striker judgment more heavily as they make the call
    return (strikerJudgment * 0.7) + (nonStrikerJudgment * 0.3);
  }

  /**
   * Calculate error probability based on combined judgment
   * @param {number} combinedJudgment - Combined judgment score
   * @returns {number} Error probability (0-1)
   */
  calculateErrorProbability(combinedJudgment) {
    // Formula: (1 - combinedJudgment/40) as specified
    const baseProbability = 1 - (combinedJudgment / this.config.decisionFactors.combinedJudgmentDivisor);
    return Math.max(0.01, Math.min(0.99, baseProbability));
  }

  /**
   * Determine how many runs batsmen attempt based on judgment and mentality
   * @param {number} maxSafeRuns - Maximum safe runs
   * @param {number} combinedJudgment - Combined judgment score
   * @param {string} battingMentality - Batting mentality
   * @param {FieldingTime} fieldingTime - Fielding time details
   * @returns {number} Runs attempted
   */
  determineRunsAttempted(maxSafeRuns, combinedJudgment, battingMentality, fieldingTime) {
    const mentalityEffects = this.config.mentalityEffects[battingMentality] || this.config.mentalityEffects.neutral;

    // Base decision: usually take safe runs
    let runsAttempted = maxSafeRuns;

    // Factor in mentality and judgment for risky running
    const riskTolerance = mentalityEffects.riskTolerance;
    const judgmentFactor = combinedJudgment / 20; // 0-1

    // Sometimes attempt one more run if close and risk tolerance allows
    if (maxSafeRuns < 3 && fieldingTime.totalTime > 2.0) {
      const riskRoll = Math.random();
      const riskThreshold = (1 - judgmentFactor) * riskTolerance;

      if (riskRoll < riskThreshold) {
        runsAttempted = maxSafeRuns + 1;
      }
    }

    return Math.max(0, runsAttempted);
  }

  /**
   * Check if run-out occurs based on attempted runs vs safe runs
   * @param {number} runsAttempted - Runs attempted by batsmen
   * @param {number} maxSafeRuns - Maximum safe runs
   * @param {number} errorProbability - Error probability
   * @param {Object} striker - Striking batsman
   * @param {Object} nonStriker - Non-striking batsman
   * @returns {{isRunOut: boolean, runOutPlayer: string}} Run-out result
   */
  checkRunOut(runsAttempted, maxSafeRuns, errorProbability, striker, nonStriker) {
    let isRunOut = false;
    let runOutPlayer = null;

    // Run-out occurs if attempting more than safe runs OR making an error
    if (runsAttempted > maxSafeRuns) {
      isRunOut = true;
    } else if (runsAttempted > 0) {
      // Even safe runs can result in run-out due to errors
      const errorRoll = Math.random();
      if (errorRoll < errorProbability) {
        isRunOut = true;
      }
    }

    // Determine which batsman gets run out (usually the one running to danger end)
    if (isRunOut) {
      // For now, randomly choose between striker and non-striker
      // In real cricket, this depends on which end the throw comes to
      runOutPlayer = Math.random() < 0.6 ? striker.name : nonStriker.name;
    }

    return { isRunOut, runOutPlayer };
  }

  /**
   * Calculate running outcome for boundary shots
   * @param {boolean} isBoundary - Whether shot reached boundary
   * @param {boolean} isSix - Whether it's a six
   * @returns {RunningDecision} Running decision for boundary
   */
  calculateBoundaryRuns(isBoundary, isSix = false) {
    if (!isBoundary) {
      throw new Error('calculateBoundaryRuns called for non-boundary shot');
    }

    const runs = isSix ? 6 : 4;

    return {
      runsAttempted: runs,
      maxSafeRuns: runs,
      isRunOut: false,
      runOutPlayer: null,
      errorProbability: 0,
      breakdown: {
        boundary: true,
        six: isSix,
        automatic: true
      }
    };
  }

  /**
   * Get running statistics for analysis
   * @param {Object[]} decisions - Array of running decisions
   * @returns {Object} Running statistics
   */
  getRunningStats(decisions) {
    const totalDecisions = decisions.length;
    if (totalDecisions === 0) return {};

    const runOuts = decisions.filter(d => d.isRunOut).length;
    const totalRuns = decisions.reduce((sum, d) => sum + (d.isRunOut ? 0 : d.runsAttempted), 0);
    const riskyRuns = decisions.filter(d => d.runsAttempted > d.maxSafeRuns).length;

    return {
      totalDecisions,
      runOuts,
      runOutRate: runOuts / totalDecisions,
      totalRuns,
      averageRuns: totalRuns / totalDecisions,
      riskyRunAttempts: riskyRuns,
      riskyRunRate: riskyRuns / totalDecisions
    };
  }
}

export default RunningDecisionCalculator;