/**
 * @file TestSimulator.js
 * @description Runs N-ball simulations with static configuration for testing
 *
 * IMPORTANT: This simulator MUST exactly emulate the main match engine behavior.
 * Key integration points:
 * - Uses SimpleBallSimulator.setFieldFormation() to position fielders (like MatchEngine)
 * - Returns fieldingPositions (NOT squad) for FieldingCalculator2D compatibility
 * - Uses same TacticsModifierSystem chain as live matches
 * - Passes captureMetadata:true so per-ball decisionResult/contactResult/
 *   trajectoryResult/fieldingResult are available for histogram aggregation
 *   (commentary + modifierBreakdown stay disabled for performance).
 */

import SimpleBallSimulator from '../../core/match-engine/core/SimpleBallSimulator.js';

const DEFAULT_SIMULATION_COUNT = 10000;

// Histogram bucket definitions
const CQ_BUCKETS = ['<-50', '-50_-40', '-40_-30', '-30_-20', '-20_-10', '-10_0', '0_10', '10_20', '20_30', '30_40', '40_50', '>50'];
const SPEED_BUCKETS = ['0-5', '5-10', '10-15', '15-20', '20-25', '25-30', '30-35', '35-40', '40-45', '45+'];
const FIELDER_DIST_BUCKETS = ['0-5', '5-10', '10-15', '15-20', '20-25', '25-30', '30-35', '35+'];
const HIT_ZONES = ['fineLeg', 'point', 'cover', 'midOff', 'midOn', 'midWicket'];

function bucketCQ(cq) {
  if (cq < -50) return 0;
  if (cq < -40) return 1;
  if (cq < -30) return 2;
  if (cq < -20) return 3;
  if (cq < -10) return 4;
  if (cq < 0) return 5;
  if (cq < 10) return 6;
  if (cq < 20) return 7;
  if (cq < 30) return 8;
  if (cq < 40) return 9;
  if (cq < 50) return 10;
  return 11;
}

function bucketSpeed(speed) {
  if (speed < 5) return 0;
  if (speed < 10) return 1;
  if (speed < 15) return 2;
  if (speed < 20) return 3;
  if (speed < 25) return 4;
  if (speed < 30) return 5;
  if (speed < 35) return 6;
  if (speed < 40) return 7;
  if (speed < 45) return 8;
  return 9;
}

function bucketFielderDist(d) {
  if (d < 5) return 0;
  if (d < 10) return 1;
  if (d < 15) return 2;
  if (d < 20) return 3;
  if (d < 25) return 4;
  if (d < 30) return 5;
  if (d < 35) return 6;
  return 7;
}

function emptyHistogram(labels) {
  return labels.reduce((acc, k) => { acc[k] = 0; return acc; }, {});
}

/**
 * Deep-merge attribute overrides into a cloned player. Used by synthetic
 * archetype presets that need extreme values (e.g. timing=20 across the board).
 * Overrides shape: { batting: {timing: 20, ...}, bowling: {...}, physical: {...}, mental: {...}, fielding: {...} }
 */
function applyAttributeOverrides(player, overrides) {
  if (!overrides || !player) return;
  if (!player.attributes) player.attributes = {};
  for (const [category, values] of Object.entries(overrides)) {
    if (!player.attributes[category]) player.attributes[category] = {};
    for (const [attr, value] of Object.entries(values)) {
      player.attributes[category][attr] = value;
    }
  }
}

function toDistribution(histogram, total) {
  const out = {};
  for (const [k, count] of Object.entries(histogram)) {
    out[k] = { count, percentage: total > 0 ? (count / total) * 100 : 0 };
  }
  return out;
}

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

  // Apply attribute overrides (used by synthetic archetype presets to manufacture
  // extreme test cases — e.g. timing=20 across the board). Deep merges into
  // attributes.{batting,bowling,physical,mental,fielding}.
  applyAttributeOverrides(strikerCopy, config.strikerAttributeOverrides);
  applyAttributeOverrides(bowlerCopy, config.bowlerAttributeOverrides);

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

  // Create simulator in silent mode but with metadata capture enabled
  // (commentary + modifierBreakdown remain disabled for performance)
  const simulator = new SimpleBallSimulator({ silent: true, captureMetadata: true });

  // Build base context with simulator (for setFieldFormation)
  const baseContext = buildBallContext(config, players, simulator);

  // Outcome counters
  const outcomes = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '6': 0, 'W': 0 };
  const contactTypes = { middled: 0, edged: 0, missed: 0 };
  const dismissalTypes = {};
  let totalRuns = 0;
  let legalBalls = 0;

  // New histogram counters
  const cqHistogram = emptyHistogram(CQ_BUCKETS);
  const shotSpeedHistogram = emptyHistogram(SPEED_BUCKETS);
  const fielderDistHistogram = emptyHistogram(FIELDER_DIST_BUCKETS);
  const hitZoneHistogram = emptyHistogram(HIT_ZONES);
  const decisionDelta = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 };
  const executionDelta = { '-3': 0, '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0 };
  const battingExecScore = { '0': 0, '1': 0, '2': 0, '3': 0 };
  const bowlingExecScore = { '0': 0, '1': 0, '2': 0, '3': 0 };
  const shotTypeCounts = { grounded: 0, aerial: 0, missed: 0, edged_behind: 0 };

  // Derived rate counters
  let cqSum = 0;
  let cqSumSq = 0;
  let cqSampleCount = 0;
  let aerialShots = 0;
  let groundedShots = 0;
  let sixesFromAerial = 0;
  let catchAttempts = 0;
  let catchesTaken = 0;
  let groundedIntercepted = 0;  // grounded shots not reaching boundary

  // Run simulations
  for (let i = 0; i < simulationCount; i++) {
    try {
      const result = await simulator.simulateBall(baseContext);
      const meta = result.metadata || {};
      const contact = meta.contactResult || {};
      const decision = meta.decisionResult || {};
      const trajectory = meta.trajectoryResult || {};
      const fielding = meta.fieldingResult || {};

      // Outcome counting
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

      // Contact type — now reads real metadata
      const ctype = contact.type;
      if (ctype === 'MIDDLED') contactTypes.middled++;
      else if (ctype === 'EDGED') contactTypes.edged++;
      else if (ctype === 'MISSED') contactTypes.missed++;

      // Contact Quality
      if (typeof contact.contactQuality === 'number') {
        const cq = contact.contactQuality;
        cqHistogram[CQ_BUCKETS[bucketCQ(cq)]]++;
        cqSum += cq;
        cqSumSq += cq * cq;
        cqSampleCount++;
      }

      // Execution scores
      if (typeof contact.batsmanExecutionScore === 'number') {
        battingExecScore[contact.batsmanExecutionScore]++;
      }
      if (typeof contact.bowlerExecutionScore === 'number') {
        bowlingExecScore[contact.bowlerExecutionScore]++;
      }
      if (typeof contact.batsmanExecutionScore === 'number' && typeof contact.bowlerExecutionScore === 'number') {
        const ed = contact.batsmanExecutionScore - contact.bowlerExecutionScore;
        if (ed >= -3 && ed <= 3) executionDelta[ed]++;
      }

      // Decision delta
      if (typeof decision.judgmentAbility === 'number' && typeof decision.deliveryThreat === 'number') {
        const dd = decision.judgmentAbility - decision.deliveryThreat;
        if (dd >= -2 && dd <= 2) decisionDelta[dd]++;
      }

      // Shot type + speed + zone
      const shotType = trajectory.shotType;
      if (shotType && shotType in shotTypeCounts) shotTypeCounts[shotType]++;
      if (shotType === 'aerial') {
        aerialShots++;
        if (result.runs === 6) sixesFromAerial++;
      } else if (shotType === 'grounded') {
        groundedShots++;
        // Grounded shot was intercepted (didn't reach boundary) if it produced
        // anything other than a four. Wickets via run-out also count as intercepted.
        if (result.runs !== 4) groundedIntercepted++;
      }
      if (typeof trajectory.shotSpeed === 'number' && trajectory.shotSpeed > 0) {
        shotSpeedHistogram[SPEED_BUCKETS[bucketSpeed(trajectory.shotSpeed)]]++;
      }
      if (result.hitZone && result.hitZone in hitZoneHistogram) {
        hitZoneHistogram[result.hitZone]++;
      }

      // Closest fielder distance + catch attempts
      const fAction = fielding.fieldingAction;
      if (fAction?.type === 'catch') {
        catchAttempts++;
        catchesTaken++;
      } else if (fAction?.type === 'dropped_catch') {
        catchAttempts++;
      }
      const closest = fielding.closestFielder;
      if (closest && typeof closest.distance === 'number' && closest.distance > 0 && closest.distance < 200) {
        fielderDistHistogram[FIELDER_DIST_BUCKETS[bucketFielderDist(closest.distance)]]++;
      }

      // Runs and legal balls
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

  // Key metrics
  const strikeRate = legalBalls > 0 ? (totalRuns / legalBalls) * 100 : 0;
  const overs = legalBalls / 6;
  const economyRate = overs > 0 ? totalRuns / overs : 0;
  const wicketProbability = outcomes['W'] / simulationCount;
  const boundaryRate = (outcomes['4'] + outcomes['6']) / simulationCount;

  // Derived rates
  const cqMean = cqSampleCount > 0 ? cqSum / cqSampleCount : 0;
  const cqVariance = cqSampleCount > 0 ? (cqSumSq / cqSampleCount) - (cqMean * cqMean) : 0;
  const cqStdDev = Math.sqrt(Math.max(0, cqVariance));
  const aerialRate = (aerialShots + groundedShots) > 0
    ? aerialShots / (aerialShots + groundedShots)
    : 0;
  const sixAmongAerialRate = aerialShots > 0 ? sixesFromAerial / aerialShots : 0;
  const catchConversion = catchAttempts > 0 ? catchesTaken / catchAttempts : 0;
  const groundedInterceptionRate = groundedShots > 0 ? groundedIntercepted / groundedShots : 0;

  return {
    totalBalls: simulationCount,
    simulationTime,
    ballsPerSecond: Math.round(simulationCount / (simulationTime / 1000)),

    // Existing fields (preserved)
    outcomeDistribution,
    contactDistribution,
    dismissalDistribution,
    strikeRate,
    economyRate,
    wicketProbability,
    boundaryRate,
    totalRuns,
    legalBalls,

    // New histograms / distributions
    cqDistribution: toDistribution(cqHistogram, cqSampleCount),
    shotSpeedDistribution: toDistribution(shotSpeedHistogram, Object.values(shotSpeedHistogram).reduce((a, b) => a + b, 0)),
    fielderDistanceDistribution: toDistribution(fielderDistHistogram, Object.values(fielderDistHistogram).reduce((a, b) => a + b, 0)),
    hitZoneDistribution: toDistribution(hitZoneHistogram, Object.values(hitZoneHistogram).reduce((a, b) => a + b, 0)),
    decisionDeltaDistribution: toDistribution(decisionDelta, Object.values(decisionDelta).reduce((a, b) => a + b, 0)),
    executionDeltaDistribution: toDistribution(executionDelta, Object.values(executionDelta).reduce((a, b) => a + b, 0)),
    battingExecDistribution: toDistribution(battingExecScore, Object.values(battingExecScore).reduce((a, b) => a + b, 0)),
    bowlingExecDistribution: toDistribution(bowlingExecScore, Object.values(bowlingExecScore).reduce((a, b) => a + b, 0)),
    shotTypeDistribution: toDistribution(shotTypeCounts, Object.values(shotTypeCounts).reduce((a, b) => a + b, 0)),

    // Scalar derived metrics
    contactQualityMean: cqMean,
    contactQualityStdDev: cqStdDev,
    aerialRate,
    sixAmongAerialRate,
    catchAttempts,
    catchConversion,
    groundedInterceptionRate
  };
}
