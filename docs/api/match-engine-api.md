# Match Engine API Reference

## Overview

The Match Engine API provides comprehensive interfaces for cricket match simulation using **algebraic physics calculations** and **Contact Quality calculations**. The simplified system uses direct mathematical formulas for maximum performance while maintaining realistic cricket simulation. This document covers all public methods and event interfaces for the match engine components.

## Core Components

### SimpleBallSimulator

The primary ball simulation engine using simplified 4-step calculation with algebraic physics and Contact Quality system.

#### Constructor
```javascript
new SimpleBallSimulator()
```
- No parameters required - all calculators initialized internally
- Loads configuration from JSON files automatically

#### Methods

**`async simulateBall(ballContext)`**
- **Purpose**: Simulate a complete ball using 4-step calculation
- **Parameters**:
  - `ballContext`: Ball simulation context object
- **Returns**: `Promise<BallResult>` Complete ball result with metadata
- **Example**:
```javascript
const simulator = new SimpleBallSimulator();
const result = await simulator.simulateBall({
  striker: strikerPlayer,
  bowler: bowlerPlayer,
  fieldingTeam: fieldingTeamObject,
  battingMentality: 'attacking',
  bowlingMentality: 'neutral',
  wicketKeeper: keeperPlayer,
  matchSituation: {
    over: 5,
    ball: 3,
    score: 45,
    wickets: 2,
    phase: 'powerplay'
  }
});
```

**`setFieldFormation(formationType, fielders)`**
- **Purpose**: Set field formation for 2D simulation (required before ball simulation)
- **Parameters**:
  - `formationType`: 'attacking' | 'neutral' | 'defensive'
  - `fielders`: Array of 9 fielder player objects
- **Returns**: Array of positioned fielders with 2D coordinates
- **Example**:
```javascript
const fielders = bowlingTeam.players.slice(0, 9);
const fieldingPositions = simulator.setFieldFormation('neutral', fielders);
```

**`getInfo()`**
- **Purpose**: Get simulator architecture and configuration information
- **Returns**: Object with simulator details
- **Example**:
```javascript
const info = simulator.getInfo();
console.log(info.name); // 'SimpleBallSimulator'
console.log(info.architecture); // '4-step-2D-physics'
console.log(info.steps); // ['Decision', 'Contact', 'Trajectory', '2D-Fielding']
```

**`determineFinalOutcome(trajectoryResult, fieldingResult)`**
- **Purpose**: Convert calculation results to final ball outcome
- **Parameters**:
  - `trajectoryResult`: Result from TrajectoryCalculator
  - `fieldingResult`: Result from FieldingCalculator (if applicable)
- **Returns**: Object with final outcome details

**`generateCommentary(outcome, context)`**
- **Purpose**: Generate ball commentary based on outcome
- **Parameters**:
  - `outcome`: Final ball outcome
  - `context`: Ball context for personalized commentary
- **Returns**: String commentary

#### Ball Context Structure

```javascript
BallContext = {
  striker: {
    id: string,
    name: string,
    attributes: {
      mental: { judgement: number },
      batting: {
        technique: number,
        timing: number,
        footwork: number,
        shotSelection: number,
        shotPower: number,
        placement: number,
        range360: number
      }
    }
  },
  bowler: {
    id: string,
    name: string,
    attributes: {
      bowling: {
        intelligence: number,
        variations: number,
        accuracy: number,
        swing: number,
        bowlingSpeed: number, // for fast bowlers
        turn: number // for spinners
      }
    }
  },
  nonStriker: {
    id: string,
    name: string,
    attributes: { /* similar to striker */ }
  },
  fieldingTeam: {
    squad: Array<Player>,
    fieldingPositions: Array<{
      name: string,
      x: number,
      y: number,
      fielder: Player
    }>
  },
  battingMentality: 'attacking' | 'neutral' | 'defensive',
  bowlingMentality: 'attacking' | 'neutral' | 'defensive',
  wicketKeeper: Player,
  matchSituation: {
    innings: number,
    over: number,
    ball: number,
    score: number,
    wickets: number,
    ballsRemaining: number,
    phase: 'powerplay' | 'middle' | 'death'
  }
}
```

#### Ball Result Structure (Enhanced)

```javascript
BallResult = {
  outcome: 'DOT' | 'RUNS' | 'FOUR' | 'SIX' | 'CAUGHT' | 'BOWLED' | 'LBW' | 'STUMPED' | 'RUN_OUT',
  runs: number,
  isWicket: boolean,
  isLegal: boolean,
  dismissalType: string | null,
  dismissedPlayer: string | null,
  commentary: string,
  conditionUpdates: Object,
  metadata: {
    decisionResult: {
      deliveryThreat: 0-2,          // Independent check scores
      judgmentAbility: 0-2,         // Independent check scores
      breakdown: {
        bowler: {
          intelligence: number,
          variations: number,
          intelligenceCheck: boolean,
          variationsCheck: boolean,
          total: 0-2
        },
        striker: {
          judgment: number,
          shotSelection: number,
          judgmentCheck: boolean,
          shotSelectionCheck: boolean,
          total: 0-2
        }
      }
    },
    contactResult: {
      type: 'MISSED' | 'EDGED' | 'MIDDLED',
      contactQuality: number,       // NEW: -97 to +97 range
      batsmanExecutionScore: 0-3,   // Independent execution checks
      bowlerExecutionScore: 0-3,    // Independent execution checks
      breakdown: {
        decisionScores: { batting: 0-2, bowling: 0-2, delta: number },
        executionScores: {
          batting: { score: 0-3, timingCheck: boolean, footworkCheck: boolean, techniqueCheck: boolean },
          bowling: { score: 0-3, accuracyCheck: boolean, swingCheck: boolean, speedTurnCheck: boolean }
        },
        probabilities: { base: Object, adjusted: Object },
        contactQuality: number
      }
    },
    trajectoryResult: {
      shotType: 'missed' | 'caught_behind' | 'aerial' | 'grounded',
      shotSpeed: 20-120,            // Enhanced speed range
      direction: 1-360,             // Attribute-driven direction selection
      directionOptions: number,     // Number of directions evaluated (1-range360)
      bestDirection: boolean,       // Whether best or 2nd best direction was chosen
      isWicket: boolean,
      wicketType: string | null,
      trajectory: Object,           // 2D trajectory points
      breakdown: {
        contactQuality: number,     // Contact Quality integration
        wicketProbability: number,  // For missed balls
        calculatedSpeed: number,    // For middled balls
        directionSelection: Object  // Direction selection process data
      }
    },
    fieldingResult: {
      fieldFormation: 'attacking' | 'neutral' | 'defensive',
      closestFielder: Player,
      expectedShotDistance: number, // -1 for catches, boundary distance if unstoppable
      interceptionAnalysis: Object, // All 9 fielders' analysis
      isBoundary: boolean,
      isCatch: boolean,
      runningDecision: Object,      // Running time vs fielding time analysis
      outcome: string,
      runs: number,
      isWicket: boolean,
      dismissalType: string | null
    } | null,
    timestamp: number
  }
}
```

#### Step-by-Step Calculation (Enhanced)

**Step 1: Independent Probability Checks**
```javascript
// Internal calculation - not directly accessible
decisionResult = {
  deliveryThreat: 0-2, // Intelligence check + Variations check
  judgmentAbility: 0-2, // Judgment check + Shot Selection check
  breakdown: {
    bowler: {
      intelligenceCheck: random() < (intelligence/20),
      variationsCheck: random() < (variations/20),
      total: successfulChecks
    },
    striker: {
      judgmentCheck: random() < (judgment/20),
      shotSelectionCheck: random() < (shotSelection/20),
      total: successfulChecks
    }
  }
}
```

**Step 2: Contact Quality Calculation**
```javascript
// Internal calculation - not directly accessible
contactResult = {
  type: 'MISSED' | 'EDGED' | 'MIDDLED', // From probability matrix
  contactQuality: battingRawScore - bowlingRawScore, // -97 to +97
  batsmanExecutionScore: 0-3, // Independent execution checks
  bowlerExecutionScore: 0-3, // Independent execution checks
  breakdown: {
    executionScores: {
      batting: { timingCheck, footworkCheck, techniqueCheck },
      bowling: { accuracyCheck, swingCheck, speedTurnCheck }
    },
    probabilities: { base: matrixLookup, adjusted: withExecutionModifiers },
    contactQuality: rawScoresWithD40Rolls
  }
}
```

**Step 3: 2D Trajectory with Attribute-Driven Direction Selection**
```javascript
// Internal calculation - not directly accessible
trajectoryResult = {
  shotType: 'missed' | 'caught_behind' | 'aerial' | 'grounded',
  shotSpeed: 50 + (contactQuality * 1.2) + (shotPower * 2), // 20-120 range
  direction: selectedFromAttributeDrivenAlgorithm, // 1-360 degrees
  directionOptions: 1-range360, // Roll for number of options
  bestDirection: placementAttributeCheck, // Best vs 2nd best selection
  trajectory: ballPhysicsCalculation, // 2D trajectory points
  isWicket: boolean, // Contact Quality affects wicket probability
  wicketType: 'bowled' | 'lbw' | 'caught' | null
}
```

**Step 4: 2D Physics-Based Fielding Resolution**
```javascript
// Internal calculation - not directly accessible
fieldingResult = {
  fieldFormation: 'attacking' | 'neutral' | 'defensive',
  closestFielder: fielderObject,
  expectedShotDistance: interceptionDistance, // -1 for catches, boundary if unstoppable
  interceptionAnalysis: all9FieldersAnalysis,
  isBoundary: boundaryCalculation,
  isCatch: catchingCalculation,
  runningDecision: judgmentVsFieldingTime,
  outcome: 'DOT' | 'RUNS' | 'FOUR' | 'SIX' | 'CAUGHT' | 'RUN_OUT',
  runs: number,
  isWicket: boolean
}
```

#### Usage Examples

**Basic Ball Simulation with 2D Fielding**
```javascript
import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js';

const simulator = new SimpleBallSimulator();

// Set up field formation (required for 2D simulation)
const fielders = bowlingTeam.players.slice(0, 9);
const fieldingPositions = simulator.setFieldFormation('neutral', fielders);

// Enhanced ball context with 2D data
const ballContext = {
  striker: strikerPlayer,
  nonStriker: nonStrikerPlayer,
  bowler: bowlerPlayer,
  fieldingTeam: {
    squad: fielders,
    fieldingPositions: fieldingPositions
  },
  battingMentality: 'attacking',
  bowlingMentality: 'neutral',
  wicketKeeper: keeperPlayer,
  matchSituation: { /* ... */ }
};

// Simulate ball with 2D physics
const result = await simulator.simulateBall(ballContext);
console.log(`${result.outcome}: ${result.runs} runs`);
console.log(`Commentary: ${result.commentary}`);

// Access 2D simulation metadata
console.log('Direction:', result.metadata.trajectoryResult.direction + '°');
console.log('Closest Fielder:', result.metadata.fieldingResult.closestFielder.name);
console.log('Expected Shot Distance:', result.metadata.fieldingResult.expectedShotDistance);
```

**Multiple Ball Simulation**
```javascript
const simulator = new SimpleBallSimulator();
const ballResults = [];

for (let ball = 1; ball <= 6; ball++) {
  const ballContext = createBallContext(over, ball);
  const result = await simulator.simulateBall(ballContext);
  ballResults.push(result);

  console.log(`Ball ${ball}: ${result.outcome} (${result.runs} runs)`);
}
```

**Error Handling**
```javascript
try {
  const result = await simulator.simulateBall(ballContext);
  // Process result
} catch (error) {
  console.error('Ball simulation failed:', error);
  // Fallback handling
}
```

---

### MatchEngine

The primary orchestrator for match simulation.

#### Constructor
```javascript
new MatchEngine(matchStore, playerStore, teamStore)
```

#### Configuration
```javascript
matchEngine.config = {
  maxOvers: 20,
  maxWickets: 10,
  powerplayOvers: 6,
  maxBowlerOvers: 4,
  simulationSpeed: 'normal' // 'normal' | 'fast' | 'instant'
}
```

#### Methods

**`startMatch(matchConfig)`**
- **Purpose**: Initialize and start a new match
- **Parameters**:
  - `matchConfig`: Object containing home/away teams, venue, toss details
- **Returns**: `Promise<void>`
- **Example**:
```javascript
await matchEngine.startMatch({
  homeTeam: { id: 'MUM', name: 'Mumbai Thunders', playingXI: [...] },
  awayTeam: { id: 'LON', name: 'London Lions', playingXI: [...] },
  venue: 'wankhede',
  tossWinner: 'MUM',
  tossDecision: 'bat'
});
```

**`simulateInnings()`**
- **Purpose**: Simulate complete innings with ball-by-ball progression
- **Returns**: `Promise<void>`

**`simulateBall()`**
- **Purpose**: Simulate single ball with full context
- **Returns**: `Promise<void>`

**`pauseSimulation()` / `resumeSimulation()` / `stopSimulation()`**
- **Purpose**: Control simulation flow
- **Returns**: `void`

**`getMatchStatus()`**
- **Purpose**: Get current match state and simulation status
- **Returns**: Object with simulation state and match situation

---

## Selection Managers

Strategic player selection systems for bowlers and batsmen with phase-specific intelligence.

### BowlerSelectionManager

**Constructor**: `new BowlerSelectionManager(eventSystem, playerStore, teamStore)`

**Core Methods**:
- `handleOverComplete(matchState, context)` - Main selection at end of over
- `selectBowler(selectionContext)` - Strategic selection using multiple factors
- `updateBowlerEffectiveness(ballResult, context)` - Real-time performance tracking

**Selection Context**:
```javascript
{
  matchSituation: { phase, over, score, wickets, target, runRate },
  availableBowlers: [{ id, player, oversBowled, effectiveness }],
  battingPair: { striker, nonStriker },
  teamStrategy: string
}
```

**Strategies**: `powerplayStrategy()`, `middleOversStrategy()`, `deathOversStrategy()`

### BatsmanSelectionManager

**Constructor**: `new BatsmanSelectionManager(eventSystem, playerStore, teamStore)`

**Core Methods**:
- `handleWicketFall(wicketDetails, matchState, context)` - Selection when wicket falls
- `selectBatsman(selectionContext)` - Comprehensive situational analysis
- `updateBatsmanPerformance(ballResult, context)` - Performance tracking

**Selection Context**:
```javascript
{
  matchSituation: { phase, over, score, wickets, target, requiredRate },
  availableBatsmen: [{ id, player, battingOrderIndex, recentForm }],
  bowlingAttack: { currentBowler, attackType },
  teamStrategy: string
}
```

**Strategies**: `powerplayStrategy()`, `middleOversStrategy()`, `deathOversStrategy()`, `chaseStrategy()`, `consolidationStrategy()`

### Usage Examples

```javascript
// Bowler selection
const bowlerManager = new BowlerSelectionManager(eventSystem, playerStore, teamStore);
const bowlerResult = await bowlerManager.selectBowler(selectionContext);

// Batsman selection
const batsmanManager = new BatsmanSelectionManager(eventSystem, playerStore, teamStore);
const batsmanResult = await batsmanManager.selectBatsman(selectionContext);
```

**Selection Results**: Both return `{ selectedPlayer, reasoning, strategicFactors, approach }`

---

This API reference provides complete documentation for integrating and extending the match engine selection systems.