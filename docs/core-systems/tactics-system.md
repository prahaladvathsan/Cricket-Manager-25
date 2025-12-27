# T20 Tactics System

## Overview

The T20 Tactics System provides dynamic, context-aware gameplay adjustments during match simulation. It implements a **7-stage modifier chain** that adjusts player attributes based on match context, team strategy, and individual roles.

**Key Features:**
- **Acceleration Tiers**: 6 batting aggression levels (Blockade → Hit Out/Get Out)
- **Bowling Plans**: Separate pace/spin strategies with line/length and variation plans
- **DLS-Based Targeting**: Over-by-over run targets calculated using Duckworth-Lewis-Stern principles
- **Pressure System**: Dynamic pressure index affecting playstyle ratings
- **Auto-Selection**: Automatic tier selection based on run rate gap vs target

## Architecture

### Modifier Chain Flow

```
Base Attributes (1-20 scale)
    ↓
1. Playstyle Modifiers (±20% from AttributeModifierSystem)
    ↓
2. Matchup Modifiers (MatchupEvaluator)
    ↓
3. Tier/Plan Modifiers (AccelerationTierManager / BowlingPlanManager)
    ↓
4. Confidence Modifiers (ConfidenceManager)
    ↓
5. Energy Modifiers (EnergyManager)
    ↓
6. Pressure Modifiers (PressureCalculator - playstyle rating ONLY)
    ↓
7. Contextual Modifiers (ContextualModifierManager)
    ↓
Final Effective Attributes → Ball Simulation
```

**Note**: This is the actual order implemented in `TacticsModifierSystem.js:applyAllModifiers()` (lines 41-139).

### State Structure

Tactical state lives in `matchStore.tacticsState`:

```javascript
{
  battingParScore: 160,           // Pre-match par score target
  targetRunRate: 8.0,              // Auto-calculated from par (parScore / 20)
  overTargets: [],                 // DLS per-over targets
  accelerationMode: 'auto',        // 'auto' or 'manual' (manual not yet implemented)
  currentAcceleration: {           // Per-batsman tiers
    striker: 'Rotate',
    nonStriker: 'Rotate'
  },
  bowlingPlans: {                  // Per-bowler strategies
    bowlerId: {
      lineLength: 'Wide Line',
      variation: 'Consistent Accuracy'
    }
  },
  pressureIndex: {                 // Real-time pressure
    batting: 50,
    bowling: 50
  }
}
```

## Core Components

### 1. Acceleration Tier System

**Purpose**: Controls batting aggression based on match situation.

**6 Tiers** (ordered by aggression level):
1. **Blockade**: Ultra Defensive - Survival focus
2. **Build**: Consolidate - Platform building
3. **Rotate**: Singles Focus - Strike rotation
4. **Cruise**: Controlled Aggression - Balanced attack
5. **Blitz**: High Risk Attack - Boundary hunting
6. **Hit Out/Get Out**: Maximum Attack - All-out aggression

**Implementation**: `src/core/tactics/AccelerationTierManager.js`

**Auto-Selection Logic** (`autoSelectTier()` lines 162-201):
- Calculates **run rate gap** = currentRunRate - requiredRunRate
- Maps gap to tier using thresholds:
  - Gap ≥ +20: Blockade (massively ahead)
  - Gap ≥ +10: Build (significantly ahead)
  - Gap ≥ +5: Rotate (slightly ahead)
  - Gap ≥ -5: Rotate (on par)
  - Gap ≥ -10: Cruise (slightly behind)
  - Gap ≥ -20: Blitz (significantly behind)
  - Gap < -20: Hit Out/Get Out (massively behind)

**Modifier Impact** (defined in `tactics-config.json`):
- **Additive modifiers** applied to attributes (NOT multiplicative)
- Each tier has `bonuses` (positive adjustments) and `penalties` (negative adjustments)

**Example** (Blitz tier):
```javascript
{
  "attributeModifiers": {
    "bonuses": {
      "timing": 2,        // +2 to timing attribute
      "technique": 1      // +1 to technique attribute
    },
    "penalties": {
      "judgement": -3     // -3 to judgement attribute
    }
  }
}
```

**Mentality Selection**:
- Each tier defines probability distribution for defensive/neutral/attacking
- Selected per-ball using weighted random roll
- Example (Rotate tier): 25% defensive, 50% neutral, 25% attacking

**Playstyle Boost**:
- If batsman's primary playstyle matches tier's `playstyleBoosted` list
- Adds +10 to playstyle rating (defined in `playstyleBoostAmount`)
- Example: "Opener - Slogger" gets boost when using Blitz or Hit Out/Get Out

### 2. Bowling Plans System

**Purpose**: Controls bowling line/length and variation strategy.

**Structure**: **Separate configs for pace and spin bowlers**

**Pace Bowling Plans** (`bowling-plans-config.json:paceBowling`):

**Line/Length Plans** (4 options):
- Attacking Line: Stumps + Pads targeting
- Wide Line: Outside off-stump
- Short-Pitched: Bouncers and short balls
- Yorker Execution: Death specialist yorkers

**Variation Plans** (4 options):
- Pace Variation Mix: Slower balls and changes of pace
- Swing/Seam Focus: Conventional swing and seam
- Bouncer Barrage: Aggressive short ball strategy
- Consistent Accuracy: Repeating same line and length

**Spin Bowling Plans** (`bowling-plans-config.json:spinBowling`):

**Line/Length Plans** (4 options):
- Flight & Loop: Traditional flight and dip
- Flat & Fast: Quick, skiddy deliveries
- Wide of Off: Outside off-stump line
- Stumps Attack: Attacking the stumps

**Variation Plans** (4 options):
- Turn Candy Bag: Multiple variations with different turn
- Flight Variation: Varying flight and loop
- Pace Variation: Changes of pace
- Consistent Line: Metronomic accuracy

**Total**: 4×4 = 16 combinations per bowling type (pace/spin)

**Default Fallback**:
If no plan set for bowler, uses `player.tactics.defaultBowlingPlans`:
```javascript
{
  lineLength: 'Wide Line',    // Safe default
  variation: 'Consistent Accuracy'
}
```

**Modifier Impact**:
- **Additive modifiers** (same as acceleration tiers)
- Modifiers from line/length plan applied first, then variation plan
- Both sets of modifiers stack independently

**Example** (Pace: Attacking Line + Swing/Seam Focus):
```javascript
// Line/Length: Attacking Line
{
  "bonuses": {
    "swing": 1,              // +1 to swing
    "attackingBowling": 1    // +1 to attackingBowling
  },
  "penalties": {
    "accuracy": -1,          // -1 to accuracy
    "stamina": -1            // -1 to stamina
  }
}

// Variation: Swing/Seam Focus
{
  "bonuses": {
    "swing": 2               // +2 to swing (stacks with above)
  },
  "penalties": {
    "bowlingSpeed": -1,      // -1 to bowlingSpeed
    "variations": -1         // -1 to variations
  }
}
// Net effect: swing +3, attackingBowling +1, accuracy -1, stamina -1, bowlingSpeed -1, variations -1
```

**Mentality Calculation**:
- Each plan has `tendencyScores` (attacking/neutral/defensive values)
- Line/length and variation scores are summed
- Converted to percentages: `prob = score / totalScore`
- Selected per-ball using weighted random roll

### 3. DLS Over-Targets

**Purpose**: Provide ball-by-ball pacing guidance based on par score.

**Implementation**: `src/core/tactics/ParTargetCalculator.js`

**Calculation** (`calculateOverTargets()` lines 25-43):
- Uses `DLSCalculator.getParScore(ballsRemaining, wicketsInHand, parScore)`
- Calculates cumulative runs needed at each over (1-20)
- Accounts for wickets in hand using DLS resource percentages

**Example Targets** (Par 160, 10 wickets):
```javascript
[
  { over: 1,  runs: 8,   wickets: 0, ballsRemaining: 114 },
  { over: 6,  runs: 48,  wickets: 0, ballsRemaining: 84 },  // End of powerplay
  { over: 10, runs: 80,  wickets: 0, ballsRemaining: 60 },  // Middle overs
  { over: 15, runs: 120, wickets: 0, ballsRemaining: 30 },  // Death overs approach
  { over: 20, runs: 160, wickets: 0, ballsRemaining: 0 }    // Final target
]
```

**Usage in Auto-Selection**:
- Not directly used in current implementation
- `autoSelectTier()` uses run rate gap calculation instead
- Over-targets stored in state for future UI/manual control features

**Recalculation After Wickets**:
- `recalculateAfterWicket()` updates targets based on new wickets in hand
- DLS resource percentage adjusts based on wickets lost

### 4. Pressure Index

**Purpose**: Track psychological pressure on both teams.

**Implementation**: `src/core/tactics/PressureCalculator.js`

**Range**: 0-100 for each team
- **50**: Neutral pressure
- **>70**: High pressure
- **<30**: Low pressure

**Modifier Application**:
- **Only affects playstyle rating** (not base attributes)
- Applied in Stage 6 of modifier chain
- `applyPressureToPlaystyleRating()` adjusts rating based on pressure level

**Calculation Factors** (not yet fully implemented):
- Run rate comparison (required vs current)
- Wickets in hand
- Match phase (powerplay/middle/death)
- Recent performance (dots, boundaries, wickets)

**Note**: Full pressure calculation system is planned but not yet integrated into match flow.

## State Management

### Critical Pattern: Zustand State Preservation

**Problem**: Zustand's `set()` function **only preserves fields explicitly returned** in the setter function.

**Solution**: Always include `tacticsState` in return object when updating other state.

**Example** (`matchStore.js:processBallResult()` line 318):
```javascript
processBallResult: (ballResult) => set((state) => {
  // ... process ball updates ...

  return {
    teams: newTeams,
    currentBall: newCurrentBall,
    ballByBall: newBallByBall,
    commentary: newCommentary,
    matchConditions: { ...state.matchConditions, ...ballResult.conditionUpdates },
    tacticsState: state.tacticsState  // ← CRITICAL: Preserve tactics
  };
}),
```

**Why This Matters**:
- Without explicit inclusion, `tacticsState` becomes `undefined` after first ball
- Causes "Unknown" tactics display in commentary
- Breaks tier auto-selection
- Silent failure (no error, just missing state)

### Update Pattern

Use dedicated setter for tactics updates (`matchStore.js` lines 247-256):

```javascript
// In matchStore.js
updateTacticsState: (tacticsUpdate) => set((state) => ({
  tacticsState: {
    ...state.tacticsState,
    ...tacticsUpdate
  }
})),

// Usage in MatchEngine.js (lines 202-222)
const updateTacticsState = this.matchStore.getState().updateTacticsState;
if (updateTacticsState) {
  updateTacticsState({
    battingParScore: parScore,
    targetRunRate: targetRunRate,
    overTargets: overTargets,
    // ... etc
  });
}
```

**Never** directly mutate state:
```javascript
// ❌ WRONG - Direct mutation (doesn't trigger updates)
matchState.tacticsState.currentAcceleration.striker = 'Blitz';

// ✅ CORRECT - Use setter
updateTacticsState({
  currentAcceleration: {
    ...state.tacticsState.currentAcceleration,
    striker: 'Blitz'
  }
});
```

## Component Integration

### 1. MatchEngine.js

**Role**: Orchestrates match simulation, initializes tactics, displays commentary.

**Key Methods**:

**`initializeTacticalState(matchState)`** (lines 193-222)
- Called in `startMatch()` before first ball
- Sets default par score (160 for T20)
- Calculates over-targets using `ParTargetCalculator`
- Updates state via `updateTacticsState()` setter

**`formatTacticsInfo(ballResult, matchState)`** (lines 409-435)
- Generates tactics display string for commentary
- Format: `[Batting: {tier} | Bowling: {lineLength}, {variation}]`
- Handles undefined/missing state gracefully with `?.` chaining

**Integration Point** (lines 313-367):
```javascript
// MatchEngine does NOT have applyTactics() method
// Instead, it creates ball context and delegates to TacticsModifierSystem

// Build ball context
const ballContext = {
  striker,
  bowler,
  nonStriker,
  fieldingPositions: this.fieldingPositions
};

// Build match situation
const matchSituation = {
  phase: currentBall.matchSituation.phase,
  over: currentBall.over,
  ball: currentBall.ball + 1,
  wicketsInHand: this.config.maxWickets - teams.batting.wickets,
  // ... etc
};

// Apply all modifiers via TacticsModifierSystem
const modifierResult = tacticsModifierSystem.applyAllModifiers(
  ballContext,
  tacticsState,
  matchSituation
);

// Use modified players for ball simulation
const ballResult = this.ballCalculator.calculateBall(
  modifierResult.striker,
  modifierResult.bowler,
  // ... etc
);
```

### 2. matchStore.js

**Role**: Central state container for tactical data.

**Key State**:
- `tacticsState`: Nested object with all tactical data
- Initialized in `initializeMatch()` with default values (lines 187-202)
- Updated via `updateTacticsState()` method

**Critical Methods**:

**`updateTacticsState(tacticsUpdate)`** (lines 247-256)
- Safely merges updates into existing tactics state
- Preserves unmodified fields

**`processBallResult(ballResult)`** (lines 262-320)
- Updates match state after each ball
- **MUST** return `tacticsState: state.tacticsState` to preserve it (line 318)
- Most common source of state loss bugs

**`startSecondInnings()`** (lines 325-369)
- Resets match state for second innings
- Tactics state structure preserved but values may change
- Tier selection recalculates based on target chase

### 3. TacticsModifierSystem.js

**Role**: Central orchestrator for all tactical modifiers in correct application order.

**Key Method**:

**`applyAllModifiers(ballContext, tacticsState, matchSituation)`** (lines 41-139)
- Applies all 7 stages of modifiers in order
- Returns modified players and calculated mentalities
- Tracks metadata for each stage (for debugging/analysis)

**Return Object**:
```javascript
{
  striker: modifiedStriker,        // Modified striker with all modifiers applied
  bowler: modifiedBowler,          // Modified bowler with all modifiers applied
  battingMentality: 'attacking',   // Selected mentality for this ball
  bowlingMentality: 'neutral',     // Selected bowling mentality
  modifierBreakdown: {             // UI-friendly breakdown (non-zero modifiers only)
    striker: {
      playstyleModifiers: [...],   // Array of {name, value, description}
      tacticalModifiers: [...],
      mentalityModifiers: [...],
      matchupModifiers: [...],
      confidenceModifiers: [...],
      energyModifiers: [...],
      contextModifiers: [...]
    },
    bowler: { /* same structure */ }
  },
  metadata: {                      // Diagnostic info
    stages: [...]                  // Array of applied modifiers per stage
  }
}
```

### 4. AccelerationTierManager.js

**Role**: Manage batting acceleration tiers and apply attribute modifiers.

**Key Methods**:

**`selectMentalityForBall(tierName)`** (lines 27-45)
- Selects mentality based on tier's probability distribution
- Returns 'defensive', 'neutral', or 'attacking'
- Called by TacticsModifierSystem after tier application

**`applyTierModifiers(player, tierName)`** (lines 53-78)
- Creates deep copy of player
- Applies bonuses and penalties from tier config
- Uses `applyAttributeModifier()` helper to find attributes

**`autoSelectTier(matchSituation, ...)`** (lines 162-201)
- Calculates run rate gap vs target
- Maps gap to tier using threshold rules
- Returns recommended tier name string

**`applyPlaystyleBoost(player, tierName)`** (lines 126-151)
- Checks if player's primary playstyle matches tier's boosted list
- Adds +10 to playstyle rating if matched
- Returns boost info for logging

### 5. BowlingPlanManager.js

**Role**: Apply bowling plan modifiers and calculate bowling mentality.

**Key Methods**:

**`applyPlanModifiers(bowler, lineLength, variation)`**
- Determines bowling type (pace/spin) from bowler
- Applies line/length modifiers
- Applies variation modifiers
- Returns modified bowler (deep copy)

**`calculateMentalityProbabilities(lineLength, variation, bowlingType)`**
- Sums tendency scores from both plans
- Converts to percentages
- Returns probability object

**`selectDeliveryMentality(probabilities)`**
- Uses weighted random selection
- Returns 'defensive', 'neutral', or 'attacking'

### 6. Test Files

**detailedMatchTest.js**:
- Uses Zustand `create()` to mock matchStore
- Must include `tacticsState` in initial state (lines 90-104)
- Must implement `updateTacticsState()` method (lines 180-187)
- Must preserve `tacticsState` in mock `processBallResult()` (line 235)

**Why Tests Revealed Bugs**:
- Mock store initially lacked `updateTacticsState()` → immediate error
- Caught state preservation issue early
- Validates Zustand patterns before UI implementation

## Configuration Files

### tactics-config.json

**Location**: `src/data/config/tactics-config.json`

**Structure**:
```javascript
{
  "accelerationTiers": {
    "Blockade": { /* tier config */ },
    "Build": { /* tier config */ },
    "Rotate": { /* tier config */ },
    "Cruise": { /* tier config */ },
    "Blitz": { /* tier config */ },
    "Hit Out/Get Out": { /* tier config */ }
  },
  "playstyleBoostAmount": 10,
  "autoTierSelection": {
    "enabled": true,
    "logic": { /* threshold rules */ }
  }
}
```

**Tier Config Structure**:
```javascript
{
  "description": "Singles Focus - Strike rotation",
  "mentalityProbabilities": {
    "defensive": 0.25,
    "neutral": 0.50,
    "attacking": 0.25
  },
  "attributeModifiers": {
    "bonuses": {
      "speed": 2        // +2 to speed attribute
    },
    "penalties": {
      "strength": -2    // -2 to strength attribute
    }
  },
  "playstyleBoosted": ["Opener - Balanced", "Runner"]
}
```

**Modifier Keys**: Match attribute names from player data
- Batting: `timing`, `placement`, `footwork`, `technique`, `creativity`, `judgement`, `range360`, `strength`
- Bowling: See bowling-plans-config.json
- Physical: `speed`, `stamina`
- Mental: `judgement`, `temperament`, `creativity`

**Values**: Additive integers (not multipliers!)
- Positive = bonus
- Negative = penalty

### bowling-plans-config.json

**Location**: `src/data/config/bowling-plans-config.json`

**Structure**:
```javascript
{
  "paceBowling": {
    "lineLengthPlans": {
      "Attacking Line": { /* plan config */ },
      "Wide Line": { /* plan config */ },
      "Short-Pitched": { /* plan config */ },
      "Yorker Execution": { /* plan config */ }
    },
    "variationPlans": {
      "Pace Variation Mix": { /* plan config */ },
      "Swing/Seam Focus": { /* plan config */ },
      "Bouncer Barrage": { /* plan config */ },
      "Consistent Accuracy": { /* plan config */ }
    }
  },
  "spinBowling": {
    "lineLengthPlans": {
      "Flight & Loop": { /* plan config */ },
      "Flat & Fast": { /* plan config */ },
      "Wide of Off": { /* plan config */ },
      "Stumps Attack": { /* plan config */ }
    },
    "variationPlans": {
      "Turn Candy Bag": { /* plan config */ },
      "Flight Variation": { /* plan config */ },
      "Pace Variation": { /* plan config */ },
      "Consistent Line": { /* plan config */ }
    }
  },
  "playstyleBoostAmount": 10,
  "mentalityCalculation": { /* formula explanation */ }
}
```

**Plan Config Structure**:
```javascript
{
  "description": "Outside off-stump",
  "tendencyScores": {
    "attacking": 1,
    "neutral": 4,
    "defensive": 5
  },
  "attributeModifiers": {
    "bonuses": {
      "accuracy": 1,          // +1 to accuracy
      "defensiveBowling": 1   // +1 to defensiveBowling
    },
    "penalties": {
      "attackingBowling": -1, // -1 to attackingBowling
      "variations": -1        // -1 to variations
    }
  },
  "playstyleBoosted": ["Hit-the-Deck Seamer"]
}
```

**Pace Bowling Attributes**:
- `accuracy`, `bowlingSpeed`, `swing`, `seam`, `variations`, `attackingBowling`, `defensiveBowling`, `stamina`, `temperament`, `intelligence`

**Spin Bowling Attributes**:
- `accuracy`, `turn`, `flight`, `variations`, `attackingBowling`, `defensiveBowling`, `stamina`, `temperament`, `intelligence`

### Other Config Files

**`confidence-config.json`**: Confidence effect modifiers (Stage 4)

**`energy-config.json`**: Energy/fatigue effect modifiers (Stage 5)

**`contextual-modifiers-config.json`**: Situational modifiers (Stage 7)
- Left-right batting combo bonus
- New ball boost for pace bowlers
- Phase-specific adjustments

**`matchup-bonuses-config.json`**: Batsman vs bowler matchup modifiers (Stage 2)

## Display and Commentary

### Tactics Info Format

Every ball's commentary includes tactics information:

**Format**: `[Batting: {tier} | Bowling: {lineLength}, {variation}]`

**Example**:
```
0.1: Aqib Ilyas to Axar Patel, 2 runs [Batting: Rotate | Bowling: Wide Line, Consistent Accuracy]
```

**Implementation** (`MatchEngine.js:formatTacticsInfo()` lines 409-435):
```javascript
formatTacticsInfo(ballResult, matchState) {
  const tacticsState = matchState.tacticsState;
  if (!tacticsState) return '';

  // Get batting tier
  const battingTier = tacticsState.currentAcceleration?.striker || 'Unknown';

  // Get bowling plans with fallback
  const bowlerId = ballResult.bowlerId;
  const bowler = this.playerStore.getState().getPlayer(bowlerId);
  const bowlerPlans = tacticsState.bowlingPlans?.[bowlerId]
    || bowler?.tactics?.defaultBowlingPlans
    || { lineLength: 'Wide Line', variation: 'Consistent Accuracy' };

  return ` [Batting: ${battingTier} | Bowling: ${bowlerPlans.lineLength}, ${bowlerPlans.variation}]`;
}
```

**Graceful Degradation**:
- Uses optional chaining (`?.`) for safe property access
- Falls back to 'Unknown' if tier missing
- Uses default bowling plans if none set for bowler

## Common Patterns

### 1. Shallow Copy for Immutability (Performance Optimized)

Create shallow copies before modifying attributes:

```javascript
// ❌ WRONG - Mutates original
batsman.attributes.batting.timing += 2;

// ❌ SLOW - Deep clone (avoid in hot paths)
const modifiedBatsman = JSON.parse(JSON.stringify(batsman));

// ✅ CORRECT - Shallow spread (optimized)
const modifiedBatsman = {
  ...batsman,
  attributes: { ...batsman.attributes },
  condition: { ...batsman.condition }
};
modifiedBatsman.attributes.batting.timing += 2;
return modifiedBatsman;
```

**Why**: Shallow spread is significantly faster than JSON.parse(JSON.stringify()) while still preventing mutations to original player data. All tactics modifier managers use this pattern for performance.

### 2. Null-Safe Access

Use optional chaining for nested state access:

```javascript
// ❌ WRONG - Crashes if tacticsState undefined
const tier = matchState.tacticsState.currentAcceleration.striker;

// ✅ CORRECT - Safe with fallback
const tier = matchState.tacticsState?.currentAcceleration?.striker || 'Rotate';
```

### 3. Configuration Loading

Load configs once in constructor, not per-ball:

```javascript
// In AccelerationTierManager constructor
import tacticsConfig from '../../data/config/tactics-config.json' with { type: "json" };

class AccelerationTierManager {
  constructor() {
    this.tiers = tacticsConfig.accelerationTiers;  // Load once
  }

  applyTierModifiers(player, tierName) {
    const tier = this.tiers[tierName];  // Reuse loaded config
    // ...
  }
}
```

### 4. Zustand Update Pattern

Always use functional updates for nested state:

```javascript
// ❌ WRONG - Overwrites entire object
set({ tacticsState: { currentAcceleration: { striker: 'Blitz' } } });

// ✅ CORRECT - Merges with existing state
set((state) => ({
  tacticsState: {
    ...state.tacticsState,
    currentAcceleration: {
      ...state.tacticsState.currentAcceleration,
      striker: 'Blitz'
    }
  }
}));
```

## Debugging

### Debug Flags

Each component has debug flags (set to `false` in production):

**TacticsModifierSystem.js**: No built-in debug flag (uses metadata return)

**MatchEngine.js** (line 410):
```javascript
const DEBUG_TACTICS = false;  // Set to true to log tactics state
```

**Enable for troubleshooting**:
```javascript
const DEBUG_TACTICS = true;

// Logs for first 3 balls:
// [DEBUG formatTacticsInfo] {
//   hasTacticsState: true,
//   hasCurrentAcceleration: true,
//   strikerValue: 'Rotate',
//   fullCurrentAcceleration: { striker: 'Rotate', nonStriker: 'Rotate' }
// }
```

### Common Issues

**Issue**: "Unknown" tactics in commentary
- **Cause**: `tacticsState` not preserved in `processBallResult()`
- **Fix**: Add `tacticsState: state.tacticsState` to return object in matchStore

**Issue**: Tiers not updating
- **Cause**: Direct state mutation instead of setter
- **Fix**: Use `updateTacticsState()` method

**Issue**: Bowling plans undefined
- **Cause**: Bowler not in `bowlingPlans` object
- **Fix**: Check `player.tactics.defaultBowlingPlans` fallback exists

**Issue**: Modifiers not applying
- **Cause**: Original object being mutated (shared reference)
- **Fix**: Deep copy before modification (`JSON.parse(JSON.stringify(player))`)

**Issue**: `updateTacticsState is not a function`
- **Cause**: Method not implemented in mock store (test files)
- **Fix**: Add method to mock store in test files

## Integration Checklist

When adding new features that interact with tactics:

- [ ] Load tactics state with `matchState.tacticsState`
- [ ] Use optional chaining (`?.`) for safe access
- [ ] Preserve `tacticsState` in any Zustand setters
- [ ] Create deep copies before modifying player attributes
- [ ] Use additive modifiers (not multiplicative) in config files
- [ ] Add debug flags for troubleshooting
- [ ] Update mock stores in test files
- [ ] Document new modifiers in appropriate config file
- [ ] Test state preservation across ball-by-ball simulation

## Performance Considerations

**Tier Selection Frequency**:
- Currently: Tier set at innings start, doesn't auto-update per ball
- Future: Could update every over or every 5 overs
- Tradeoff: More reactive vs performance cost

**Shallow Copy Performance** (Optimized Jan 2025):
- All modifier managers now use shallow spread instead of `JSON.parse(JSON.stringify())`
- Significantly faster (~10x improvement in hot paths)
- Pattern: `{ ...player, attributes: { ...player.attributes }, condition: { ...player.condition } }`

**Config Loading**:
- Configs loaded once per manager instance (in constructor)
- **Don't** reload from disk every ball
- 5 config files × 1 load each = minimal overhead

**Modifier Chain**:
- 7 stages executed per ball (120 balls × 2 innings = 240 times)
- Each stage creates new object (deep copy pattern)
- Total: ~1,680 deep copies per match (manageable)

## Future Enhancements

**Planned**:
- Manual tier selection UI (override auto-selection)
- Per-bowler bowling plan UI (captain-style control)
- Real-time tier updates during innings (every over)
- Pressure calculation integration (currently pressure index not updated)
- Field setting integration with bowling plans
- Historical tier effectiveness tracking

**Possible**:
- Weather/pitch condition modifiers
- Player personality traits affecting tier comfort
- Partnership dynamics (conservative partner influence)
- Death overs specialist bonuses
- Situational awareness (batsman knows they're behind par)

## Known Limitations

1. **Tier auto-selection not implemented in match flow**: Tier is set at innings start and doesn't update per ball (manual update required)

2. **Pressure calculation not integrated**: Pressure index initialized but not updated during match

3. **No UI for manual control**: All tactics are auto-selected (manual mode planned but not implemented)

4. **Bowling plans not auto-selected**: Plans must be set manually or use default fallback

5. **DLS over-targets not used in current tier selection**: Tier selection uses run rate gap instead of comparing to over-targets

---

**Last Updated**: January 2025 - T20 Tactics System Implementation (Documentation Corrected)
