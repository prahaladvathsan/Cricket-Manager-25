# Match Engine Architecture

## Overview

The Cricket Manager match engine is a simplified ball-by-ball simulation system using SimpleBallSimulator with a 4-step calculation flow, **independent probability checks**, and **algebraic physics calculations**. The engine uses direct mathematical formulas instead of complex simulations, creating realistic cricket outcomes with maximum performance.

**ARCHITECTURE**: Direct orchestrator pattern with Decision → Contact → Trajectory → Fielding calculation steps using independent probability checks, Contact Quality system, and simplified algebraic physics.

## Core Architecture

### SimpleBallSimulator (Primary Component)

```
SimpleBallSimulator
├── DecisionCalculator (Pre-contact decisions)
├── ContactCalculator (Contact quality determination)
├── TrajectoryCalculator (Shot direction & trajectory with 2D physics)
├── FieldingCalculator2D (2D physics-based fielding resolution)
├── BallTrajectoryPhysics (Algebraic trajectory calculations)
├── FieldPositioningSystem (Fielder formation management)
├── FielderMovementCalculator (Interception analysis)
├── RunningDecisionCalculator (Running decisions & outcomes)
└── ProbabilityEngine (Configurable probability calculations)
```

**Single Import**: Users only need `import SimpleBallSimulator` - all calculators are managed internally.

### Data Flow (4-Step Architecture)

1. **Ball Context Setup**: Players, mentalities, match situation prepared
2. **4-Step Ball Simulation**:
   - **Step 1**: DecisionCalculator - Delivery threat vs Judgment ability
   - **Step 2**: ContactCalculator - Execution scores + decision scores = contact type
   - **Step 3**: TrajectoryCalculator - Attribute-driven direction selection + algebraic trajectory
   - **Step 4**: FieldingCalculator2D - Algebraic fielding with polar coordinate interception
3. **Result Processing**: Final outcome with detailed metadata returned
4. **Match Integration**: Results used by match engine for state updates

## Ball Simulation Components

### 1. SimpleBallSimulator.js (Primary Interface)

**Purpose**: Single interface for complete ball simulation

**Usage**:
```javascript
import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js';

const simulator = new SimpleBallSimulator();
const result = await simulator.simulateBall(ballContext);
```

**Key Methods**:
- `simulateBall(ballContext)`: Complete 4-step ball simulation with 2D physics
- `setFieldFormation(formationType, fielders)`: Set fielding formation and positions
- `getInfo()`: Get simulator information and configuration
- `determineFinalOutcome()`: Convert calculation results to final outcome
- `generateCommentary()`: Create ball commentary

### 2. DecisionCalculator.js (Independent Probability Checks)

**Purpose**: Calculate delivery threat and batting judgment using independent probability checks

**Calculation Method**:
- **Bowling Decision Score**: Intelligence check + Variations check (0-2 points)
  - Intelligence Check: Success if `random(0-1) < (intelligence/20)`
  - Variations Check: Success if `random(0-1) < (variations/20)`
- **Batting Decision Score**: Judgment check + Shot Selection check (0-2 points)
  - Judgment Check: Success if `random(0-1) < (judgment/20)`
  - Shot Selection Check: Success if `random(0-1) < (shotSelection/20)`
- **Output**: Two scores (0-2 each) passed to ContactCalculator

**Key Features**:
- Independent probability checks instead of attribute addition
- Each attribute contributes independently to success
- More realistic skill representation with variance

### 3. ContactCalculator.js (Independent Execution Checks + Contact Quality)

**Purpose**: Determine contact quality using independent execution checks and Contact Quality calculation

**Calculation Method**:
- **Bowling Execution Checks** (0-3 points):
  - Accuracy Check: Success if `random(0-1) < (accuracy/20)`
  - Swing/Spin Check: Success if `random(0-1) < (swing/20)`
  - Speed Check: Success if `random(0-1) < (speed/20)`
- **Batting Execution Checks** (0-3 points):
  - Timing Check: Success if `random(0-1) < (timing/20)`
  - Footwork Check: Success if `random(0-1) < (footwork/20)`
  - Technique Check: Success if `random(0-1) < (technique/20)`
- **Base Probability Matrix**: Realistic percentages based on decision score delta (-2 to +2)
- **Execution Adjustments**: Applied based on execution score difference
- **Contact Quality**: `battingRawScore - bowlingRawScore` where raw scores include d40 rolls

**Key Features**:
- Independent execution checks for each skill
- Realistic base probability matrix with execution adjustments
- Contact Quality calculation for shot speed and trajectory
- Range: -97 to +97 (typically -60 to +60)

### 4. TrajectoryCalculator.js (Simplified Trajectory with Angular Gap Analysis)

**Purpose**: Determine shot outcomes, direction, and trajectory using Contact Quality and attribute-driven direction selection

**Attribute-Driven Direction Selection Algorithm**:
1. **Direction Options**: Roll 1-{range360 attribute} for number of possible directions
2. **Random Directions**: Generate n random directions (1-360 degrees) and add to array
3. **Direction Evaluation**: Use angular gap analysis (grounded) or distance separation (aerial) for each direction
4. **Best Direction Selection**: Use placement attribute to choose:
   - Roll d20: if ≤ placement → choose best direction
   - Roll d20: if > placement → choose 2nd best direction
5. **Expected Shot Distance**:
   - Caught = -1 (shot distance)
   - Boundary = boundary distance
   - Fielded = interception distance

**Processing Logic**:
- **Missed Balls**: Wicket probability adjusted by Contact Quality
  - Base: (50/3)% ≈ 16.67%
  - Positive Contact Quality reduces wicket chance (÷6)
  - Negative Contact Quality increases wicket chance (÷3)
- **Edged Balls**: Enhanced wicketkeeper catching logic
  - Contact Quality < 0: 66.7% carries to keeper (catch probability based on wicketkeeper skill)
  - Contact Quality ≥ 0: Aerial shot to slip cordon with speed = 20 + Contact Quality
- **Middled Balls**: Shot speed and simplified trajectory calculation
  - Speed = 50 + (Contact Quality × 1.2) + (shotPower × 2)
  - Direction determined by attribute-driven selection algorithm
  - Algebraic trajectory using direct mathematical formulas

**Key Features**:
- Attribute-driven direction selection using range360 and placement
- Angular gap analysis for grounded shots, distance separation for aerial shots
- Contact Quality drives realistic wicket probabilities and shot speeds
- Enhanced wicketkeeper involvement in edge catches
- Direct algebraic calculations for maximum performance

### 5. FieldingCalculator2D.js (Algebraic Fielding Resolution)

**Purpose**: Resolve shot outcomes using algebraic calculations, polar coordinate fielder positioning, and direct interception formulas

**2D Fielding Process**:
1. **Field Formation Setup**: Use FieldPositioningSystem to position 9 fielders
2. **Ball Trajectory Calculation**: Use BallTrajectoryPhysics for 2D ball movement
3. **Fielder Interception Analysis**: Use FielderMovementCalculator to determine closest fielder
4. **Running Decision**: Use RunningDecisionCalculator for batting decisions
5. **Final Outcome**: Combine interception, catching, and running results

**Key Features**:
- Physics-based 2D simulation replacing probability tables
- Real-time fielder interception calculations
- Speed-dependent bounce points for aerial shots
- Attribute-driven running decisions with error probability
- Integration with all 2D simulation components

### 6. BallTrajectoryPhysics.js (Algebraic Trajectory Engine)

**Purpose**: Calculate ball trajectories using direct algebraic formulas

**Trajectory Calculation**:
- **Grounded Shots**: Constant speed straight-line movement (no deceleration)
- **Aerial Shots**: Fixed 45° launch angle with algebraic bounce calculation
  - Bounce Distance: `speed² / gravity` (where gravity = 10 m/s²)
  - Aerial Time: `speed / (gravity * √2)`
- **Boundary Cache**: Pre-calculated distances for all 360° from striker position

**Key Features**:
- Ultra-simplified physics: no deceleration, constant speed movement
- Fixed launch angle assumption for maximum performance
- Boundary distance cache for instant lookup
- Striker offset: 11 yards from field center

### 7. FieldPositioningSystem.js (Fielder Formation Management)

**Purpose**: Manage fielding formations and convert to 2D coordinates

**Formation Management**:
- **Formations Available**: attacking, neutral, defensive
- **Fielder Positioning**: Convert formation coordinates to 2D positions
- **Formation Persistence**: Maintains formation throughout match (for testing)

**Coordinate System**:
- **Striker Position**: (0, -11) - 11 yards from field center
- **Boundary**: Circle with radius 90 yards
- **Angles**: 0° = straight, measured from striker position

**Key Features**:
- Configuration-driven field formations
- Direct polar coordinate storage (r, θ)
- Formation validation and fielder assignment
- Integration with algebraic trajectory calculations

### 8. FielderMovementCalculator.js (Algebraic Interception Analysis)

**Purpose**: Calculate fielder interception using direct mathematical formulas

**Algebraic Interception Analysis**:
1. **Grounded Shots**: Direct formula check `V*sin(θ₁) ≤ U` then time = `R / (V*cos(θ₁) + √(U² - V²*sin²(θ₁)))`
2. **Aerial Shots**: Law of cosines for fielder-to-bounce distance, compare with aerial time
3. **Polar Coordinates**: All calculations use (r, θ) from striker position
4. **Fielding Time**: `interception_distance/shot_speed + interception_distance/throw_power`

**Movement Calculation**:
- **Fielder Speed**: Attribute-based movement with simplified formula
- **No Complex Physics**: Direct mathematical interception checks
- **Polar Coordinate System**: Eliminates coordinate conversion overhead

**Key Features**:
- Direct algebraic formulas for maximum performance
- Polar coordinate system for efficiency
- Combined interception and throw time calculation
- Integration with simplified direction selection

### 9. RunningDecisionCalculator.js (Running Decisions & Outcomes)

**Purpose**: Calculate running decisions and outcomes based on fielding time vs batsman judgment

**Decision Process**:
1. **Fielding Time Calculation**: Time for pickup, throw, and collection
2. **Running Time Calculation**: Time for batsmen to complete runs
3. **Decision Making**: Combined judgment determines error probability
4. **Error Probability**: `1 - combinedJudgment / 40`
5. **Outcome**: Safe run or run out based on probability

**Time Calculations**:
- **Running Speed**: `baseSpeed + (speedAttribute * speedMultiplier)`
- **Fielding Time**: Direct calculation from algebraic interception formulas
- **Ultra-simplified Physics**: No complex time components

**Key Features**:
- Judgment-based error probability calculation
- Attribute-driven running speeds
- Direct fielding time integration
- Integration with algebraic fielding calculations

## Ball Simulation Decision Flow

### Step 1: Independent Probability Checks

```
Ball Context Input
    ↓
Independent Decision Checks:
├── Bowling Decision Score (0-2):
│   ├── Intelligence Check: random(0-1) < (intelligence/20)
│   └── Variations Check: random(0-1) < (variations/20)
└── Batting Decision Score (0-2):
    ├── Judgment Check: random(0-1) < (judgment/20)
    └── Shot Selection Check: random(0-1) < (shotSelection/20)
    ↓
[Scores (0-2 each) passed to Contact Calculator]
```

### Step 2: Contact Quality Determination

```
Contact Calculation:
├── Independent Execution Checks:
│   ├── Bowling Execution (0-3): Accuracy + Swing + Speed/Turn checks
│   └── Batting Execution (0-3): Timing + Footwork + Technique checks
├── Base Probability Matrix: Decision score delta (-2 to +2)
├── Execution Adjustments: Applied per execution score difference
└── Contact Quality Calculation:
    ├── Batting Raw = timing + footwork + technique + d40Roll
    ├── Bowling Raw = accuracy + swing + speed/turn + d40Roll
    └── Contact Quality = Batting Raw - Bowling Raw (-97 to +97)
    ↓
[Contact Type & Quality passed to Trajectory Calculator]
```

### Step 3: 2D Trajectory Determination with Attribute-Driven Direction Selection

```
Contact Result Processing with Contact Quality & 2D Physics:
├── MISSED → Wicket Probability:
│   ├── Base: 16.67% (50/3)%
│   ├── Contact Quality > 0: Reduce by Quality/6
│   └── Contact Quality ≤ 0: Increase by |Quality|/3
├── EDGED → Enhanced Wicketkeeper Logic:
│   ├── Contact Quality < 0: 66.7% carries to keeper
│   │   └── Catch Probability = wicketkeeper catching / 20
│   └── Contact Quality ≥ 0: Aerial to slip cordon (speed = 20 + Quality)
└── MIDDLED → 2D Shot Calculation:
    ├── Speed = 50 + (Contact Quality × 1.2) + (shotPower × 2)
    ├── Direction Selection (Attribute-Driven):
    │   ├── Step 1: Roll 1-{range360} for direction options
    │   ├── Step 2: Generate n random directions (1-360°)
    │   ├── Step 3: Evaluate expected shot distance for each direction
    │   └── Step 4: Use placement attribute to choose best vs 2nd best
    ├── 2D Trajectory Creation:
    │   ├── BallTrajectoryPhysics calculates trajectory points
    │   ├── Speed-dependent bounce point for aerial shots
    │   └── Integration with field positioning system
    ├── Type Based on Batting Mentality:
    │   ├── Attacking: 70% Aerial, 30% Grounded
    │   ├── Neutral: 45% Aerial, 55% Grounded
    │   └── Defensive: 20% Aerial, 80% Grounded
    └── Range: 20-120 mph (clamped)
```

### Step 4: 2D Physics-Based Fielding Resolution

```
2D Fielding Simulation Process:
├── FIELD SETUP:
│   ├── FieldPositioningSystem sets 9 fielders in formation
│   ├── Formation options: attacking, neutral, defensive
│   └── 2D coordinates assigned to each fielder
├── BALL TRAJECTORY:
│   ├── BallTrajectoryPhysics calculates 2D movement
│   ├── Trajectory points generated based on speed and direction
│   └── Aerial shots: speed-dependent bounce point calculation
├── FIELDER INTERCEPTION ANALYSIS:
│   ├── FielderMovementCalculator analyzes all 9 fielders
│   ├── Distance and time calculations for each fielder
│   ├── Interception possibility determined (can reach ball before boundary?)
│   └── Expected shot distance calculated (-1 for catches, boundary distance if unstoppable)
├── CATCHING RESOLUTION:
│   ├── If fielder can intercept: catching probability = fielder.catching / 20
│   ├── Failed catch: ball continues, boundary or further fielding
│   └── Successful catch: wicket outcome
└── RUNNING DECISION:
    ├── RunningDecisionCalculator evaluates fielding time vs running time
    ├── Combined judgment determines error probability: 1 - combined_judgment/40
    ├── Error probability applied: safe run vs run out
    └── Final outcome: runs scored, wickets, or run out
```

## Configuration & Customization

### Game Configuration Files

- **`mentality-config.json`**: Base probability matrix, Contact Quality parameters, enhanced edge behavior, wicket probabilities
- **`fielding-config.json`**: Speed-based outcome tables, enhanced run distributions, boundary types (legacy)
- **`field-positioning-config.json`**: Polar coordinate field formations (attacking, neutral, defensive), field dimensions
- **`physics-config.json`**: Algebraic physics parameters, boundary cache, constant speed movement, fixed launch angles
- **`running-config.json`**: Running decision factors, error probability calculation, simplified fielding time components
- **Configuration Loading**: All calculators load from JSON files, no hardcoded values
- **New Features**: Algebraic calculations, boundary distance cache, polar coordinate systems

### SimpleBallSimulator API

```javascript
// Initialize simulator
const simulator = new SimpleBallSimulator();

// Set field formation (required for algebraic simulation)
const fielders = bowlingTeam.players.slice(0, 9);  // 9 fielders (excluding bowler and keeper)
const fieldingPositions = simulator.setFieldFormation('neutral', fielders);  // Returns polar coordinates (r, θ)

// Ball context structure (enhanced for 2D)
const ballContext = {
  striker: playerObject,
  nonStriker: playerObject,  // Required for running decisions
  bowler: playerObject,
  fieldingTeam: {
    squad: fielders,
    fieldingPositions: fieldingPositions  // 2D coordinates for each fielder
  },
  battingMentality: 'attacking' | 'neutral' | 'defensive',
  bowlingMentality: 'attacking' | 'neutral' | 'defensive',
  wicketKeeper: playerObject,
  matchSituation: { /* over, ball, score, etc */ }
};

// Simulate ball with 2D physics
const result = await simulator.simulateBall(ballContext);

// Result structure (Enhanced with 2D Simulation Data)
{
  outcome: 'DOT' | 'RUNS' | 'FOUR' | 'SIX' | 'CAUGHT' | 'BOWLED' | 'LBW' | 'RUN_OUT' | ...,
  runs: number,
  isWicket: boolean,
  dismissalType: string | null,
  commentary: string,
  metadata: {
    decisionResult: {
      deliveryThreat: 0-2,     // Independent check scores
      judgmentAbility: 0-2,
      breakdown: { /* Individual check results */ }
    },
    contactResult: {
      type: 'MISSED' | 'EDGED' | 'MIDDLED',
      contactQuality: -97 to +97,    // Contact Quality calculation
      batsmanExecutionScore: 0-3,
      bowlerExecutionScore: 0-3,
      breakdown: { /* Execution checks & probabilities */ }
    },
    trajectoryResult: {
      shotSpeed: 20-120,       // Contact Quality-based speed
      direction: 1-360,        // Attribute-driven direction selection
      shotType: 'aerial' | 'grounded',
      directionOptions: number,   // Number of directions evaluated (1-range360)
      bestDirection: boolean,     // Whether best or 2nd best direction was chosen
      trajectory: { /* 2D trajectory points */ }
    },
    fieldingResult: {
      fieldFormation: 'attacking' | 'neutral' | 'defensive',
      closestFielder: playerObject,
      expectedShotDistance: number,  // -1 for catches, boundary distance if unstoppable
      interceptionAnalysis: { /* All 9 fielders' analysis */ },
      isBoundary: boolean,
      isCatch: boolean,
      runningDecision: { /* Running time vs fielding time analysis */ }
    }
  }
}
```

## Player Attribute Integration

See [`docs/data/player-attributes.md`] for complete attribute details. Key integrations:

**Decision Phase (0-2 points each)**: Independent probability checks
- **Bowling**: intelligence/20 + variations/20 probability checks
- **Batting**: judgment/20 + shotSelection/20 probability checks

**Execution Phase (0-3 points each)**: Independent execution checks
- **Bowling**: accuracy/20 + swing/20 + speed/20 probability checks
- **Batting**: timing/20 + footwork/20 + technique/20 probability checks

**Contact Quality Calculation**: Raw attribute scores + d40 variance
- **Batting Raw**: timing + footwork + technique + d40(1-40)
- **Bowling Raw**: accuracy + swing + speed/turn + d40(1-40)
- **Result**: Typically -60 to +60, theoretical range -97 to +97

**Output Calculation**:
- **Shot Speed**: 50 + (Contact Quality × 1.2) + (shotPower × 2), clamped 20-120
- **Direction**: Attribute-driven selection using range360 and placement attributes
- **Fielding Integration**: speed, catching, agility attributes used in 2D interception analysis
- **Running Decisions**: judgment attributes combined for error probability calculation

## Testing & Usage

### Test Files
- **`simple4StepTest.js`**: Direct calculator testing
- **`detailedMatchTest.js`**: Full match simulation with SimpleBallSimulator and 2D fielding
- **`performance-analysis.js`**: Performance testing of 2D simulation components
- **`debug-ball-test.js`**: Debug testing for ball simulation outputs

### Example Usage
```javascript
import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js';

const simulator = new SimpleBallSimulator();
console.log(simulator.getInfo()); // Architecture information

// Set up field formation for 2D simulation
const fielders = bowlingTeam.players.slice(0, 9);
const fieldingPositions = simulator.setFieldFormation('neutral', fielders);

// Enhanced ball context with 2D data
const ballContext = { /* ... enhanced context as shown above ... */ };

const ballResult = await simulator.simulateBall(ballContext);
console.log(`${ballResult.outcome}: ${ballResult.runs} runs - ${ballResult.commentary}`);

// Access 2D simulation metadata
console.log(`Direction: ${ballResult.metadata.trajectoryResult.direction}°`);
console.log(`Closest Fielder: ${ballResult.metadata.fieldingResult.closestFielder.name}`);
```

## Performance Considerations

- **Ultra-High Performance**: Algebraic simulation achieves ~50,000+ balls/second processing speed
- **Direct Mathematical Formulas**: No simulation loops, maximum performance with algebraic calculations
- **Single Import**: Simplified dependency management with all components included
- **Memory Efficient**: Minimal object creation, boundary distance cache, polar coordinates
- **Configuration Caching**: JSON configs loaded once at initialization
- **Optimized Algorithms**: Direct algebraic formulas eliminate complex calculations
- **No Physics Simulation**: Constant speed movement, fixed launch angles for maximum efficiency

## Future Enhancements

1. ✅ **COMPLETED** - Simplified algebraic physics with direct mathematical formulas
2. ✅ **COMPLETED** - Polar coordinate fielder positioning system
3. **Comprehensive Field Position Library**: Add exhaustive list of cricket fielding positions
4. **Dynamic Conditions**: Reintroduce player fatigue and form effects
5. **Environmental Factors**: Weather and pitch condition integration
6. **Advanced Field Tactics**: User-controlled field setting and tactical changes

This simplified algebraic architecture provides realistic cricket simulation with maximum performance through direct mathematical calculations.

---

## Summary

The Cricket Manager match engine has been simplified from complex 2D physics simulations to direct algebraic calculations for ultra-high performance (~50,000+ balls/second). Key changes include:

- **Fixed Launch Angles**: 45° assumption for aerial shots with `bounce_distance = speed²/gravity`
- **Polar Coordinates**: All fielder positions stored as (r, θ) from striker position
- **Direct Interception**: Mathematical formulas replace trajectory point analysis
- **Constant Speed Movement**: No deceleration forces (except gravity for projectiles)
- **Boundary Cache**: Pre-calculated distances for all 360° directions
- **Angular Gap Analysis**: Grounded shots use fielder angle gaps, aerial shots use distance separation

This maintains cricket realism while achieving exceptional performance through mathematical optimization.

## Match Engine Script Flow

### Complete System Architecture

See the interactive Mermaid flowchart: [`match-engine-flow.mmd`](./match-engine-flow.mmd)

**Key Flow Summary:**
1. **Test Script** loads players and initializes stores
2. **MatchEngine** orchestrates match setup and ball-by-ball simulation
3. **Field Formation** set once per innings using polar coordinates
4. **SimpleBallSimulator** executes 4-step process with algebraic calculations:
   - DecisionCalculator: Independent probability checks
   - ContactCalculator: Contact Quality calculation (-97 to +97)
   - TrajectoryCalculator: Attribute-driven direction selection + algebraic trajectory
   - FieldingCalculator2D: Algebraic fielding with direct interception formulas
5. **Result Processing** updates match state and handles completion

### Script Dependencies and Relationships

**Core Orchestration Layer:**
- `MatchEngine.js` → `SimpleBallSimulator.js` (primary ball engine)
- `SimpleBallSimulator.js` → All calculator components

**Calculator Dependencies:**
```
SimpleBallSimulator
├── DecisionCalculator (independent)
├── ContactCalculator → ProbabilityEngine
├── TrajectoryCalculator → BallTrajectoryPhysics + FielderMovementCalculator
└── FieldingCalculator2D → FieldPositioningSystem + FielderMovementCalculator + RunningDecisionCalculator
```

**2D Simulation Components:**
```
2D Physics Stack
├── FieldPositioningSystem (field setup)
├── BallTrajectoryPhysics (ball movement)
├── FielderMovementCalculator (interception analysis)
└── RunningDecisionCalculator (batting decisions)
```

**Configuration Loading:**
- Each component loads its own config file at initialization
- No runtime configuration changes during simulation
- All probability values externalized to config files

### Match Simulation Sequence

1. **Test Script Setup** (`detailedMatchTest.js`)
   - Loads player database (22 players)
   - Creates two 11-player teams
   - Initializes Zustand stores
   - Creates MatchEngine instance

2. **MatchEngine Initialization**
   - Configures match parameters (20 overs, 10 wickets, etc.)
   - Sets up SimpleBallSimulator with all 2D components
   - Prepares field formations array

3. **Match Start Flow**
   - `startMatch()` calls `setupOpeningPlayers()`
   - Selects striker, nonStriker, and opening bowler
   - `setupFieldFormation()` randomly assigns formation
   - Calls `simulateInnings()` for ball-by-ball loop

4. **Ball-by-Ball Simulation**
   - `simulateBall()` executes 4-step process
   - Field positions remain constant per innings
   - Each ball uses existing fieldingPositions
   - Results processed and stored in match state

5. **Result Processing**
   - Ball outcomes update team scores and match state
   - Commentary generated and logged
   - Match completion conditions checked
   - Test script captures and saves detailed logs

This architecture ensures clean separation of concerns while providing comprehensive 2D physics simulation with exceptional performance.