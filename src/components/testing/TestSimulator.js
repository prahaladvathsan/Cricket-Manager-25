/**
 * @file TestSimulator.js
 * @description Runs 10,000 ball simulations with static configuration for testing
 *
 * IMPORTANT: This simulator MUST exactly emulate the main match engine behavior.
 * Key integration points:
 * - Uses SimpleBallSimulator.setFieldFormation() to position fielders (like MatchEngine)
 * - Returns fieldingPositions (NOT squad) for FieldingCalculator2D compatibility
 * - Uses same TacticsModifierSystem chain as live matches
 */

import SimpleBallSimulator from '../../core/match-engine/core/SimpleBallSimulator.js';

const DEFAULT_SIMULATION_COUNT = 10000;

/**
 * Create a generic fielder with average attributes (used as fallback)
 */
function createGenericFielder(id) {
  return {
    id: `generic_fielder_${id}`,
    name: `Fielder ${id}`,
    role: 'All-rounder',
    attributes: {
      batting: { technique: 10, timing: 10, power: 10, defensiveShots: 10, offensiveShots: 10 },
      bowling: { accuracy: 10, swing: 10, pace: 10, variation: 10 },
      fielding: {
        catching: 12,
        groundFielding: 12,
        throwingAccuracy: 12,
        throwingPower: 12,
        throw_speed: 25, // Used by FielderMovementCalculator
        reflexes: 12
      },
      physical: {
        speed: 12,
        stamina: 12,
        agility: 12
      },
      mental: {
        concentration: 10,
        composure: 10
      }
    },
    condition: { confidence: 50, energy: 100 }
  };
}

/**
 * Build ball context from test configuration
 * @param {Object} config - Test configuration
 * @param {Object} players - Player database
 * @param {SimpleBallSimulator} simulator - Simulator instance (for setFieldFormation)
 */
function buildBallContext(config, players, simulator) {
  const striker = players[config.strikerId];
  const bowler = players[config.bowlerId];
  const nonStriker = config.nonStrikerId ? players[config.nonStrikerId] : null;

  if (!striker || !bowler) {
    throw new Error('Invalid player selection');
  }

  // Clone players to avoid mutation
  const strikerCopy = JSON.parse(JSON.stringify(striker));
  const bowlerCopy = JSON.parse(JSON.stringify(bowler));

  // Apply condition overrides
  strikerCopy.condition = {
    ...strikerCopy.condition,
    confidence: config.strikerConfidence,
    energy: config.strikerEnergy
  };

  bowlerCopy.condition = {
    ...bowlerCopy.condition,
    confidence: config.bowlerConfidence,
    energy: config.bowlerEnergy
  };

  // Apply playstyle overrides if specified
  if (config.battingPlaystyle) {
    strikerCopy.selectedPlaystyle = { batting: config.battingPlaystyle };
    strikerCopy.primaryPlaystyle = { ...strikerCopy.primaryPlaystyle, batting: config.battingPlaystyle };
    if (config.battingPlaystyleRating !== null) {
      strikerCopy.playstyleRatings = strikerCopy.playstyleRatings || {};
      strikerCopy.playstyleRatings.batting = strikerCopy.playstyleRatings.batting || {};
      strikerCopy.playstyleRatings.batting[config.battingPlaystyle] = config.battingPlaystyleRating;
    }
  }

  if (config.bowlingPlaystyle) {
    bowlerCopy.selectedPlaystyle = { bowling: config.bowlingPlaystyle };
    bowlerCopy.primaryPlaystyle = { ...bowlerCopy.primaryPlaystyle, bowling: config.bowlingPlaystyle };
    if (config.bowlingPlaystyleRating !== null) {
      bowlerCopy.playstyleRatings = bowlerCopy.playstyleRatings || {};
      bowlerCopy.playstyleRatings.bowling = bowlerCopy.playstyleRatings.bowling || {};
      bowlerCopy.playstyleRatings.bowling[config.bowlingPlaystyle] = config.bowlingPlaystyleRating;
    }
  }

  // Build fielding team with proper fieldingPositions (like MatchEngine does)
  const fieldingTeam = buildFieldingTeam(config.fieldTemplate, bowlerCopy, strikerCopy, players, simulator);

  // Build tactics state
  const tacticsState = {
    currentAcceleration: {
      striker: config.accelerationTier,
      nonStriker: config.accelerationTier
    },
    bowlingPlans: {
      [bowlerCopy.id]: {
        lineLength: config.lineLength,
        variation: config.variation
      }
    },
    pressureIndex: {
      batting: config.battingPressure,
      bowling: config.bowlingPressure
    }
  };

  // Build match situation
  const matchSituation = {
    phase: config.phase,
    over: config.over,
    ball: config.ball,
    wicketsInHand: config.wicketsInHand,
    currentRunRate: config.currentRunRate,
    requiredRunRate: config.requiredRunRate,
    ballsLeft: config.ballsLeft,
    target: config.target,
    oversBowled: config.oversBowled || 0 // Current bowler's spell (used by some playstyles)
  };

  // Build ball context
  // Note: leftRightPartnership and newBall are auto-calculated by TacticsModifierSystem
  // based on player.battingHand and matchSituation.over - not from config
  return {
    striker: strikerCopy,
    bowler: bowlerCopy,
    nonStriker: nonStriker ? JSON.parse(JSON.stringify(nonStriker)) : strikerCopy,
    wicketKeeper: fieldingTeam.wicketKeeper,
    fieldingTeam,
    tacticsState,
    matchSituation
  };
}

/**
 * Build a fielding team from a formation template
 * CRITICAL: Uses simulator.setFieldFormation() to match MatchEngine behavior exactly
 *
 * @param {string} templateId - Field formation template ID
 * @param {Object} bowler - Bowler player object
 * @param {Object} striker - Striker player object (to exclude from fielders)
 * @param {Object} players - Player database
 * @param {SimpleBallSimulator} simulator - Simulator instance with setFieldFormation method
 */
function buildFieldingTeam(templateId, bowler, striker, players, simulator) {
  // Get 11 fielders from player database (excluding striker and bowler)
  const playerValues = Object.values(players);
  const fielders = [];
  let fielderIndex = 0;

  // Build array of 11 fielders (including bowler in position)
  for (let i = 0; i < 11 && fielderIndex < playerValues.length; ) {
    const candidate = playerValues[fielderIndex];
    fielderIndex++;

    // Skip striker (they're batting)
    if (candidate.id === striker.id) continue;

    // Clone the player to avoid mutations
    const fielder = JSON.parse(JSON.stringify(candidate));

    // Ensure fielding attributes exist with throw_speed for FielderMovementCalculator
    if (!fielder.attributes) fielder.attributes = {};
    if (!fielder.attributes.fielding) {
      fielder.attributes.fielding = {
        catching: 12,
        groundFielding: 12,
        throwingAccuracy: 12,
        throwingPower: 12,
        throw_speed: 25,
        reflexes: 12
      };
    } else if (!fielder.attributes.fielding.throw_speed) {
      // Add throw_speed if missing (derived from throwingPower)
      fielder.attributes.fielding.throw_speed = fielder.attributes.fielding.throwingPower || 25;
    }

    fielders.push(fielder);
    i++;
  }

  // Fill remaining slots with generic fielders if needed
  while (fielders.length < 11) {
    fielders.push(createGenericFielder(fielders.length + 1));
  }

  // CRITICAL: Use simulator's setFieldFormation to get properly positioned fielders
  // This is exactly what MatchEngine does at line 263:
  //   const fieldingPositions = this.ballSimulator.setFieldFormation(this.currentFieldFormation, fielders);
  const fieldingPositions = simulator.setFieldFormation(templateId, fielders);

  // Find the wicket keeper (first fielder, typically has keeper role or position behind stumps)
  const wicketKeeper = fielders[0];

  return {
    id: 'test-fielding-team',
    name: 'Test Fielding Team',
    squad: fielders,
    fieldingPositions, // CRITICAL: This is what FieldingCalculator2D expects
    formation: templateId,
    wicketKeeper
  };
}

/**
 * Run test simulation with given configuration
 * Uses SimpleBallSimulator with exact same flow as main MatchEngine
 * @param {Object} config - Test configuration
 * @param {Object} players - Player database
 * @param {number} ballCount - Number of balls to simulate (default: 10000)
 */
export async function runTestSimulation(config, players, ballCount = DEFAULT_SIMULATION_COUNT) {
  const startTime = performance.now();
  const simulationCount = ballCount;

  // Create simulator in silent mode
  const simulator = new SimpleBallSimulator({ silent: true });

  // Build base context with simulator (for setFieldFormation)
  const baseContext = buildBallContext(config, players, simulator);

  // Tracking variables
  const outcomes = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '6': 0, 'W': 0 };
  const contactTypes = { middled: 0, edged: 0, missed: 0 };
  const dismissalTypes = {};
  let totalRuns = 0;
  let legalBalls = 0;

  // Run simulations
  for (let i = 0; i < simulationCount; i++) {
    try {
      const result = await simulator.simulateBall(baseContext);

      // Track outcome
      if (result.isWicket) {
        outcomes['W']++;
        const dismissal = result.dismissalType || 'unknown';
        dismissalTypes[dismissal] = (dismissalTypes[dismissal] || 0) + 1;
      } else {
        const runs = result.runs || 0;
        if (runs === 0) outcomes['0']++;
        else if (runs === 1) outcomes['1']++;
        else if (runs === 2) outcomes['2']++;
        else if (runs === 3) outcomes['3']++;
        else if (runs === 4) outcomes['4']++;
        else if (runs >= 6) outcomes['6']++;
      }

      // Track contact type (property is 'type', values are MIDDLED/EDGED/MISSED uppercase)
      const contact = result.metadata?.contactResult?.type?.toUpperCase() || 'MIDDLED';
      if (contact === 'MIDDLED') contactTypes.middled++;
      else if (contact === 'EDGED') contactTypes.edged++;
      else if (contact === 'MISSED') contactTypes.missed++;
      else contactTypes.middled++; // Default

      // Track runs and legal balls
      if (result.isLegal !== false) {
        legalBalls++;
        totalRuns += result.runs || 0;
      }
    } catch (err) {
      console.warn('Ball simulation error:', err);
    }
  }

  const endTime = performance.now();
  const simulationTime = Math.round(endTime - startTime);

  // Calculate distributions
  const outcomeDistribution = {};
  for (const [key, count] of Object.entries(outcomes)) {
    outcomeDistribution[key] = {
      count,
      percentage: (count / simulationCount) * 100
    };
  }

  const contactDistribution = {};
  const totalContact = contactTypes.middled + contactTypes.edged + contactTypes.missed;
  for (const [key, count] of Object.entries(contactTypes)) {
    contactDistribution[key] = {
      count,
      percentage: totalContact > 0 ? (count / totalContact) * 100 : 0
    };
  }

  const dismissalDistribution = {};
  const totalDismissals = outcomes['W'];
  for (const [key, count] of Object.entries(dismissalTypes)) {
    dismissalDistribution[key] = {
      count,
      percentage: totalDismissals > 0 ? (count / totalDismissals) * 100 : 0
    };
  }

  // Calculate key metrics
  const strikeRate = legalBalls > 0 ? (totalRuns / legalBalls) * 100 : 0;
  const overs = legalBalls / 6;
  const economyRate = overs > 0 ? totalRuns / overs : 0;
  const wicketProbability = outcomes['W'] / simulationCount;
  const boundaryRate = (outcomes['4'] + outcomes['6']) / simulationCount;

  return {
    totalBalls: simulationCount,
    simulationTime,
    ballsPerSecond: Math.round(simulationCount / (simulationTime / 1000)),
    outcomeDistribution,
    contactDistribution,
    dismissalDistribution,
    strikeRate,
    economyRate,
    wicketProbability,
    boundaryRate,
    totalRuns,
    legalBalls
  };
}
