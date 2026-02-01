# Player System

## Overview

The player system is the foundation of Cricket Manager, providing realistic player modeling through a comprehensive attribute system, dynamic condition tracking, and data-driven progression mechanics.

## Player Attributes

### Attribute Scale (1-20)

All player attributes use a standardized 1-20 scale where:
- **1-5**: Poor/Amateur level
- **6-10**: Average/Semi-professional
- **11-15**: Good/Professional
- **16-20**: Excellent/World-class

### Batting Attributes

| Attribute | Description | Impact |
|-----------|-------------|---------|
| **technique** | Shot execution consistency | Contact quality, mishit rate |
| **timing** | Shot timing precision | Boundary conversion, clean hits |
| **footwork** | Movement and positioning | vs spin bowling, range360 |
| **placement** | Shot direction control | Gap finding, field manipulation |
| **range360** | Shot coverage around ground | Scoring options, field settings |
| **defensiveShots** | Defensive shot quality | Dot ball survival, pressure handling |
| **neutralShots** | Singles and rotation ability | Strike rotation, building innings |
| **attackingShots** | Boundary hitting power | Boundary frequency, acceleration |
| **vsPace** | Performance vs fast bowling | vs pace bowlers specifically |
| **vsSpin** | Performance vs spin bowling | vs spin bowlers specifically |

### Bowling Attributes

| Attribute | Description | Impact |
|-----------|-------------|---------|
| **accuracy** | Line and length consistency | Wide rate, dot ball percentage |
| **bowlingSpeed** | Bowling velocity | Pace effectiveness, intimidation |
| **swing** | Ball movement in air | Edge rate, wicket chances |
| **turn** | Spin deviation (spinners) | Spin effectiveness, deception |
| **variations** | Different delivery types | Unpredictability, wicket variety |
| **intelligence** | Strategic bowling | Match situation adaptation |
| **defensiveBowling** | Containment ability | Economy rate, pressure building |
| **neutralBowling** | Steady bowling | Consistent line and length |
| **attackingBowling** | Wicket-taking ability | Strike rate, aggressive bowling |

### Physical Attributes

| Attribute | Description | Impact |
|-----------|-------------|---------|
| **strength** | Physical power | Shot power, throwing distance |
| **speed** | Running speed | Between wicket running, fielding |
| **agility** | Movement quickness | Fielding range, reflexes |
| **maxFitness** | Peak fitness level | Stamina ceiling, injury resistance |
| **endurance** | Sustained effort ability | Fatigue accumulation rate |
| **stamina** | Current energy reserves | Match performance duration |

### Mental Attributes

| Attribute | Description | Impact |
|-----------|-------------|---------|
| **concentration** | Focus maintenance | Consistency, pressure handling |
| **temperament** | Emotional control | Performance under pressure |
| **aggression** | Attacking mindset | Shot selection, bowling strategy |
| **judgement** | Decision making | Shot selection, tactical awareness |
| **leadership** | Team influence | Captain effectiveness, morale |

### Wicketkeeping Attributes

| Attribute | Description | Impact |
|-----------|-------------|---------|
| **keeping** | Glove work quality | Clean takes, stumping chances |
| **collecting** | Ball gathering | Wide collection, bye prevention |
| **stumping** | Stumping execution | Stumping success rate |

## Player Condition (0-100 Scale)

### Dynamic Condition Attributes

| Condition | Description | Range | Impact |
|-----------|-------------|-------|---------|
| **form** | Recent performance trend | 0-100 | Overall performance modifier |
| **fitness** | Physical readiness | 0-100 | Attribute effectiveness |
| **fatigue** | Accumulated tiredness | 0-100 | Performance degradation |
| **morale** | Mental state | 0-100 | Consistency and effort |
| **energy** | Current match energy | 0-100 | Real-time performance |
| **confidence** | Self-belief level | 0-100 | Risk-taking, execution |

### Condition Effects

```javascript
// Condition impact on attributes
const effectiveAttribute = baseAttribute * (
  (form / 100) * 0.3 +
  (fitness / 100) * 0.4 +
  (1 - fatigue / 100) * 0.3
);
```

## Player Roles

### Primary Roles

- **Batsman**: Specialist batting, limited bowling
- **All-rounder**: Balanced batting and bowling
- **Bowler**: Specialist bowling, limited batting
- **Wicket-keeper**: Specialist keeper, batting varies

### Role-Specific Attributes

**Batsman Focus**:
- High batting attributes (12-20 range)
- Moderate physical attributes
- Strong mental attributes
- Limited bowling skills

**Bowler Focus**:
- High bowling attributes (12-20 range)
- Good physical attributes (especially stamina)
- Tactical mental attributes
- Basic batting skills

**All-rounder Balance**:
- Good batting and bowling (8-15 range)
- Excellent physical attributes
- Strong mental attributes
- Versatility valued over specialization

## Attribute Data Sources

### Statistical Derivation

Player attributes are derived from real T20 cricket statistics using:

**Range360 Calculation**:
```python
# Shot coverage across 8 field segments
segments = ['fine_leg', 'square_leg', 'mid_wicket', 'long_on',
           'long_off', 'cover', 'point', 'third_man']
coverage_score = sum(shots_in_segment > 0 for segment in segments) / 8
range360_attribute = normalize_to_scale(coverage_score, 1, 20)
```

**Bowling Accuracy**:
```python
# Wide percentage and dot ball rate
accuracy_score = (1 - wide_percentage) * 0.6 + dot_ball_rate * 0.4
accuracy_attribute = percentile_rank(accuracy_score) / 5 + 1  # 1-20 scale
```

**Technique Assessment**:
```python
# Consistency metrics
technique_score = (1 - strike_rate_variance) * 0.5 +
                 clean_hit_percentage * 0.5
technique_attribute = gaussian_normalize(technique_score, mean=10, std=4)
```

### GMA Filtering

Attributes use Geometric Moving Average filtering to emphasize recent performance:

```python
# 5-year GMA weighting
weights = [0.516, 0.258, 0.129, 0.065, 0.032]  # Recent to oldest
gma_value = sum(year_performance * weight for year_performance, weight in zip(years, weights))
```

## Player Development

### Age-Based Progression

```javascript
// Development curve
const getDevelopmentFactor = (age) => {
  if (age < 18) return 0.8;      // Developing
  if (age < 25) return 1.1;      // Improving
  if (age < 30) return 1.0;      // Peak
  if (age < 35) return 0.95;     // Slight decline
  return 0.85;                   // Declining
};
```

### Form Fluctuation

```javascript
// Form changes based on recent performance
const updateForm = (player, recentMatches) => {
  const averageRating = recentMatches.reduce((sum, match) =>
    sum + match.playerRating, 0) / recentMatches.length;

  const formChange = (averageRating - 50) * 0.1; // Scale factor
  player.condition.form = Math.max(0, Math.min(100,
    player.condition.form + formChange));
};
```

### Training Effects

```javascript
// Training impact on attributes
const applyTraining = (player, trainingType, intensity) => {
  const improvements = {
    batting: ['technique', 'timing', 'placement'],
    bowling: ['accuracy', 'variations', 'intelligence'],
    fitness: ['strength', 'speed', 'endurance']
  };

  const targetAttributes = improvements[trainingType];
  targetAttributes.forEach(attr => {
    const improvement = intensity * 0.01 * randomFactor();
    player.attributes[attr] = Math.min(20,
      player.attributes[attr] + improvement);
  });
};
```

## Player Valuation

### Value Calculation

```javascript
const calculatePlayerValue = (player) => {
  // Base value from attributes
  const attributeValue = Object.values(player.attributes)
    .reduce((sum, attr) => sum + attr, 0) * 50000; // £50k per attribute point

  // Age factor
  const ageFactor = getAgeFactor(player.age);

  // Role multiplier
  const roleMultipliers = {
    'Batsman': 1.2,
    'All-rounder': 1.5,
    'Bowler': 1.0,
    'Wicket-keeper': 1.3
  };

  // Form factor
  const formFactor = player.condition.form / 100;

  return Math.round(attributeValue * ageFactor *
    roleMultipliers[player.role] * formFactor);
};
```

### Market Dynamics

```javascript
// Supply and demand effects
const getMarketValue = (player, market) => {
  const baseValue = calculatePlayerValue(player);

  // Demand factors
  const roleDemand = market.demand[player.role] || 1.0;
  const ageBracketDemand = market.ageDemand[getAgeBracket(player.age)] || 1.0;

  // Supply factors
  const similarPlayers = market.getPlayersInRange(player.rating, 5);
  const supplyFactor = Math.max(0.5, 1 - (similarPlayers.length / 100));

  return Math.round(baseValue * roleDemand * ageBracketDemand * supplyFactor);
};
```

## Performance Integration

### Match Performance Calculation

```javascript
const calculateMatchPerformance = (player, matchSituation) => {
  // Base performance from attributes
  const relevantAttributes = getRelevantAttributes(player.role, matchSituation);
  const basePerformance = relevantAttributes.reduce((sum, attr) =>
    sum + player.attributes[attr], 0) / relevantAttributes.length;

  // Condition modifiers
  const conditionFactor = (
    player.condition.form * 0.3 +
    player.condition.fitness * 0.3 +
    player.condition.confidence * 0.2 +
    (100 - player.condition.fatigue) * 0.2
  ) / 100;

  // Situational modifiers
  const pressureFactor = 1 - (matchSituation.pressure * 0.2);
  const opponentFactor = getOpponentFactor(player, matchSituation.opponent);

  return basePerformance * conditionFactor * pressureFactor * opponentFactor;
};
```

### Attribute-Specific Performance

```javascript
// Batting performance
const getBattingPerformance = (player, bowler, situation) => {
  const technique = player.attributes.technique;
  const vsBowlingType = bowler.type === 'pace' ?
    player.attributes.vsPace : player.attributes.vsSpin;

  const matchupFactor = vsBowlingType / technique; // How well suited
  const situationalFactor = getSituationalFactor(situation.phase, situation.pressure);

  return (technique + vsBowlingType) / 2 * matchupFactor * situationalFactor;
};
```

## Data Persistence

### Player Database Schema

```javascript
// Player object structure
const playerSchema = {
  id: "string",
  name: "string",
  age: "number",
  DOB: "string (DD-MM-YYYY)",
  role: "string",
  nationality: "string",

  attributes: {
    batting: { /* batting attributes */ },
    bowling: { /* bowling attributes */ },
    physical: { /* physical attributes */ },
    mental: { /* mental attributes */ },
    wicketkeeping: { /* wicketkeeping attributes */ }
  },

  condition: {
    form: "number (0-100)",
    fitness: "number (0-100)",
    fatigue: "number (0-100)",
    morale: "number (0-100)",
    energy: "number (0-100)",
    confidence: "number (0-100)"
  },

  career: {
    matches: "number",
    runs: "number",
    wickets: "number",
    average: "number",
    strikeRate: "number"
  },

  contract: {
    teamId: "string",
    salary: "number",
    length: "number",
    releaseClause: "number"
  }
};
```

### Store Integration

```javascript
// Player store methods for player system
const playerStore = {
  // Attribute updates
  updatePlayerAttributes: (playerId, attributeUpdates) => { /* */ },
  updatePlayerCondition: (playerId, conditionUpdates) => { /* */ },

  // Performance tracking
  recordMatchPerformance: (playerId, matchStats) => { /* */ },
  updatePlayerForm: (playerId, performanceRating) => { /* */ },

  // Development
  applyTraining: (playerId, trainingType, effectiveness) => { /* */ },
  agePlayers: (timeElapsed) => { /* */ },

  // Valuation
  calculatePlayerValue: (playerId) => { /* */ },
  getMarketValue: (playerId, marketConditions) => { /* */ }
};
```

## Testing and Validation

### Attribute Distribution Testing

```javascript
// Validate realistic attribute distributions
const validateAttributeDistribution = (players) => {
  const attributes = ['technique', 'accuracy', 'speed'];

  attributes.forEach(attr => {
    const values = players.map(p => p.attributes[attr]);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, v) =>
      sum + Math.pow(v - mean, 2), 0) / values.length);

    // Expect mean ~10, std ~4-5 for realistic distribution
    console.log(`${attr}: mean=${mean.toFixed(1)}, std=${std.toFixed(1)}`);
  });
};
```

### Performance Correlation Testing

```javascript
// Test attribute-performance correlation
const testAttributeCorrelation = (players, matchData) => {
  const correlations = calculateCorrelations(
    players.map(p => p.attributes.technique),
    matchData.map(m => m.battingPerformance)
  );

  // Expect positive correlation between attributes and performance
  console.log(`Technique-Performance correlation: ${correlations.technique}`);
};
```