# Player Attributes Reference

This document describes the player attribute system used in Cricket Manager for match simulation and team management.

## Attribute Scale

All attributes use a **1-20 scale** where:
- **1-5**: Below average / Weakness
- **6-10**: Average / Developing
- **11-15**: Above average / Proficient
- **16-20**: Elite / World-class

## Attribute Categories

### 🏏 Batting Attributes

| Attribute | Description | Match Engine Usage |
|-----------|-------------|-------------------|
| **technique** | Shot execution and technical soundness | Batting execution check (1 of 3) |
| **timing** | Ability to time shots for power | Batting execution check (2 of 3), drives shot speed |
| **footwork** | Movement to the ball | Batting execution check (3 of 3) |
| **defensive_shots** | Ability to play defensive strokes | Shot type selection |
| **neutral_shots** | Singles and rotation ability | Shot type selection |
| **attacking_shots** | Boundary hitting ability | Shot type selection |
| **range360** | Shot direction variety | Number of direction options (1-20 possible directions) |
| **placement** | Gap finding ability | Direction selection quality (d20 ≤ placement = best direction) |
| **vsPace** | Performance against pace bowling | Attribute modifier vs pace bowlers |
| **vsSpin** | Performance against spin bowling | Attribute modifier vs spin bowlers |
| **creativity** | Shot innovation and variety | Future feature |

### 🥎 Bowling Attributes

| Attribute | Description | Match Engine Usage |
|-----------|-------------|-------------------|
| **accuracy** | Line and length control | Bowling execution check (1 of 3) |
| **defensive_bowling** | Dot ball bowling ability | Economy rate and containment |
| **neutral_bowling** | Balanced attack/defense bowling | Standard bowling approach |
| **attacking_bowling** | Wicket-taking aggression | Strike rate and wicket probability |
| **ball_speed** (pace) | Bowling speed | Bowling execution check (3 of 3 for pace) |
| **turn** (spin) | Amount of turn/spin | Bowling execution check (3 of 3 for spin) |
| **swing** (pace) | Swing/seam movement | Bowling execution check (2 of 3 for pace) |
| **flight** (spin) | Flight and dip variation | Bowling execution check (2 of 3 for spin) |
| **variations** | Variety of deliveries | Bowling decision check (2 of 2) |
| **intelligence** | Tactical bowling awareness | Bowling decision check (1 of 2) |

### 💪 Physical Attributes

| Attribute | Description | Match Engine Usage |
|-----------|-------------|-------------------|
| **strength** | Physical power | Shot speed calculation (d(strength) roll) |
| **speed** | Running speed | Fielder movement speed, running speed |
| **agility** | Movement and reflexes | Fielding effectiveness |
| **stamina** | Endurance over long periods | Fatigue accumulation rate |
| **fitness** | Current physical condition | Performance modifier |
| **endurance** | Recovery ability | Fatigue recovery rate |

### 🧠 Mental Attributes

| Attribute | Description | Match Engine Usage |
|-----------|-------------|-------------------|
| **concentration** | Focus under pressure | Performance consistency |
| **temperament** | Composure in high-pressure situations | Pressure modifier |
| **judgment** | Decision-making quality | Batting decision check (1 of 2), running decisions |
| **aggression** | Risk-taking propensity | Mentality determination |
| **leadership** | Team influence and captaincy | Future feature |

### ⚡ Fielding & Wicket-Keeping

| Attribute | Description | Match Engine Usage |
|-----------|-------------|-------------------|
| **catching** | Catching ability | Catch success probability = catching / 20 |
| **reflexes** | Reaction time | Close-in catching, keeper reactions |
| **groundFielding** | Field movement and stopping | Fielding effectiveness |
| **throwPower** | Throw distance | Long throws to stumps |
| **throwAccuracy** | Throw accuracy | Run-out probability |
| **keeping** (keeper) | Wicket-keeping technique | Wicketkeeping rating (40% weight) |
| **collecting** (keeper) | Ball collection cleanness | Wicketkeeping rating (25% weight) |
| **stumping** (keeper) | Stumping ability | Wicketkeeping rating (20% weight) |

**Wicket-Keeper Attribute Ranges:**
- **Keepers**: keeping, collecting, stumping = 10-20 (elite)
- **Non-keepers**: keeping, collecting, stumping = 1-4 (minimal)

## Condition Attributes (0-100 Scale)

| Attribute | Description | Effect on Performance |
|-----------|-------------|---------------------|
| **form** | Recent performance trend | ±20% attribute modifier |
| **fitness** | Physical readiness | Performance degradation if low |
| **fatigue** | Match/session tiredness | Cumulative performance penalty |
| **morale** | Mental state and confidence | Concentration and judgment modifier |

## Match Engine Integration

### Decision Phase (Independent Probability Checks)

**Bowling Decision Score (0-2)**:
- Intelligence check: Success if `random() < intelligence/20`
- Variations check: Success if `random() < variations/20`

**Batting Decision Score (0-2)**:
- Judgment check: Success if `random() < judgment/20`
- Shot selection check: Success if `random() < shotSelection/20`

### Contact Phase (Execution + Contact Quality)

**Bowling Execution (0-3)**:
- Accuracy check: Success if `random() < accuracy/20`
- Swing/Flight check: Success if `random() < swing/20` or `flight/20`
- Speed/Turn check: Success if `random() < speed/20` or `turn/20`

**Batting Execution (0-3)**:
- Timing check: Success if `random() < timing/20`
- Footwork check: Success if `random() < footwork/20`
- Technique check: Success if `random() < technique/20`

**Contact Quality Calculation**:
```
battingRawScore = timing + footwork + technique + d40
bowlingRawScore = accuracy + swing/flight + speed/turn + d40
contactQuality = battingRawScore - bowlingRawScore  // Range: -97 to +97
```

### Trajectory Phase

**Shot Speed**:
```
baseSpeed = 12
contactQualityComponent = sqrt(abs(contactQuality)) * 1.5 * sign(contactQuality)
strengthComponent = sqrt(d(strength)) * sqrt(20) * 0.65
speed = baseSpeed + contactQualityComponent + strengthComponent
// Clamped to 10-40 m/s
```

**Shot Direction**:
```
numDirections = roll(1, range360)  // 1-20 possible directions
directions = generate(numDirections)  // Random angles
bestDirection = evaluateBest(directions)  // Gap analysis
if roll(d20) <= placement:
  selectedDirection = bestDirection
else:
  selectedDirection = 2ndBestDirection
```

### Fielding Phase

**Fielder Speed**: `baseSpeed + (speedAttribute * speedMultiplier)`
**Catch Probability**: `catchingAttribute / 20`
**Interception**: Algebraic time-to-ball vs time-to-fielder analysis

### Running Phase

**Running Error Probability**:
```
combinedJudgment = (striker.judgment + nonStriker.judgment) / 2
errorProbability = 1 - (combinedJudgment / 40)
```

## Playstyle System

Players have playstyle ratings (0-100) for 25 different playstyles that apply dynamic attribute modifiers based on match context:

- **16 Batting Playstyles**: Opener-Slogger, Finisher, Wall, Runner, etc.
- **8 Bowling Playstyles**: Death Specialist, Swing Bowler, Classical Spinner, etc. (segregated by pace/spin)
- **1 Wicketkeeping Playstyle**: Wicketkeeper (specialist glovework rating)

See [`docs/core-systems/playstyle-system.md`] for complete playstyle documentation.

## Data Source

Player attributes are generated from real T20 cricket statistics using an external data processor with GMA (Geometric Moving Average) filtering and percentile-based conversion.

**Processing Pipeline**: Raw T20 Data → GMA Filtering → Percentile Ranking → 1-20 Attribute Conversion → Enhanced Player Database

For data processing details, see the `cricket-data-processor` repository documentation.

## Related Documentation

- [Match Engine Architecture](../core-systems/match-engine.md) - How attributes are used in simulation
- [Playstyle System](../core-systems/playstyle-system.md) - Dynamic attribute modifiers
- [Configuration Guide](configuration-guide.md) - Match engine config files
