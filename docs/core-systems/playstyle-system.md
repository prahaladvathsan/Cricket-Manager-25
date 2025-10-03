# Playstyle System

## Overview

The playstyle system introduces dynamic attribute modifiers that adapt player performance based on match context. Each player has playstyle ratings for various playing styles, and these ratings determine how effectively contextual modifiers enhance (or reduce) their attributes during match simulation.

**Key Features:**
- **21 Unique Playstyles**: 16 batting + 9 bowling (with overlap for balanced styles)
- **Dynamic Modifiers**: Attributes adjust based on match situation (phase, wickets, run rate, etc.)
- **Fully Configurable**: All weightages, modifiers, and conditions externalized to JSON
- **Non-Invasive Integration**: Existing match engine logic unchanged, only input attributes modified
- **Performance Optimized**: Modifiers calculated once per ball with minimal overhead

## Architecture

### 4-Layer System

```
┌─────────────────────────────────────────────────────┐
│         Configuration Layer                          │
│  playstyle-weightings.json + playstyle-modifiers.json│
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│         Calculation Layer                            │
│         PlaystyleCalculator.js                       │
│  (Calculates playstyle ratings from attributes)     │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│         Modifier Application Layer                   │
│       AttributeModifierSystem.js                     │
│  (Applies context-based modifiers to attributes)    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│         Match Engine Integration                     │
│        SimpleBallSimulator.js                        │
│  (Uses modified attributes for ball simulation)     │
└─────────────────────────────────────────────────────┘
```

## Terminology

### Role vs Playstyle

**Role** (4 types): Primary player classification
- Batsman
- Bowler
- All-rounder
- Wicket-keeper

**Playstyle** (21 types): Specific playing style within role
- **Batting**: Opener-Slogger, Finisher, Wall, etc.
- **Bowling**: Death Bowler, New Ball, Workhorse, etc.

**PlaystyleRating** (0-100 scale): Player's suitability for each playstyle
- Calculated from weighted attribute sum
- Higher rating = more effective playstyle modifiers

## Configuration Files

### playstyle-weightings.json

Location: `src/data/config/playstyle-weightings.json`

Defines attribute weightages for calculating playstyle ratings.

```json
{
  "batting": {
    "Finisher": {
      "attributes": {
        "technique": 2,
        "timing": 3,
        "attackingShots": 3,
        "range360": 3,
        "strength": 3,
        "aggression": 3,
        "judgement": 3,
        "creativity": 3
      }
    }
  },
  "bowling": {
    "Death Bowler": {
      "attributes": {
        "accuracy": 3,
        "variations": 3,
        "intelligence": 3,
        "defensiveBowling": 3,
        "temperament": 3
      }
    }
  }
}
```

**Editing Guidelines:**
- Higher weight = more important for playstyle
- Weight 0 = attribute not considered
- Max weight typically 3 for crucial attributes
- Weights 1-2 for supporting attributes

### playstyle-modifiers.json

Location: `src/data/config/playstyle-modifiers.json`

Defines conditional modifiers applied during matches.

```json
{
  "batting": {
    "Finisher": {
      "modifiers": [
        {
          "name": "Death Overs Excellence",
          "conditions": [
            {"field": "phase", "operator": "==", "value": "death"}
          ],
          "effects": [
            {"attribute": "attackingShots", "scalingFactor": 0.007},
            {"attribute": "range360", "scalingFactor": 0.005}
          ]
        },
        {
          "name": "Early Innings Wasted",
          "sideEffect": true,
          "conditions": [
            {"field": "over", "operator": "<=", "value": 12}
          ],
          "effects": [
            {"attribute": "defensiveShots", "scalingFactor": -0.005}
          ]
        }
      ]
    }
  }
}
```

**Editing Guidelines:**
- `scalingFactor`: Positive = bonus, Negative = penalty
- Typical range: 0.002 to 0.007 for balanced effects
- Higher values for specialized bonuses (e.g., Death Bowler in death overs)
- Side effects use negative scaling factors
- Multiple modifiers can be active simultaneously

## Playstyle Rating Calculation

### Formula

```javascript
PlaystyleRating = (Σ(attribute × weight) / max_possible) × 100
```

Where:
- `attribute`: Player attribute value (1-20 scale)
- `weight`: Importance weight for that attribute
- `max_possible`: Σ(weight × 20) for all weighted attributes
- Result: 0-100 scale

### Example Calculation

For "Finisher" playstyle with player:
- attackingShots: 18 (weight: 3)
- strength: 16 (weight: 3)
- aggression: 17 (weight: 3)
- judgement: 15 (weight: 3)
- ... (other attributes)

```javascript
weighted_sum = (18×3) + (16×3) + (17×3) + (15×3) + ...
max_possible = (3×20) + (3×20) + (3×20) + (3×20) + ...
PlaystyleRating = (weighted_sum / max_possible) × 100
```

### Implementation

```javascript
import playstyleCalculator from '../utils/PlaystyleCalculator.js';

// Calculate all playstyle ratings
const ratings = playstyleCalculator.calculateAllPlaystyleRatings(player);
// Returns: { batting: { ... }, bowling: { ... } }

// Calculate specific playstyle rating
const rating = playstyleCalculator.calculatePlaystyleRating(
  player,
  'batting',
  'Finisher'
);
// Returns: 78.5

// Get top playstyles for player's role
const primary = playstyleCalculator.getPlayerPrimaryPlaystyles(
  player,
  player.role,
  3
);
// Returns: { batting: [...], bowling: [...], primary: "Finisher" }
```

## Attribute Modifier Application

### Modifier Formula

```javascript
modifiedAttribute = attribute × (1 + PlaystyleRating × scalingFactor)
```

Where:
- `attribute`: Base attribute value (1-20)
- `PlaystyleRating`: 0-100 scale
- `scalingFactor`: Configuration value (typically 0.002-0.007)

### Example

Finisher with PlaystyleRating = 80 in death overs:

```javascript
// Configuration: attackingShots scalingFactor = 0.007
baseAttackingShots = 15
modifier = 1 + (80 × 0.007) = 1.56
modifiedAttackingShots = 15 × 1.56 = 23.4

// In match engine, this becomes effective rating of 23.4/20
// (56% bonus to attacking shots in death overs)
```

### Condition Evaluation

Conditions use match context fields:

```javascript
{
  "field": "phase",
  "operator": "==",
  "value": "death"
}
```

**Available Operators:**
- `==`: Equal to
- `!=`: Not equal to
- `>`: Greater than
- `<`: Less than
- `>=`: Greater than or equal
- `<=`: Less than or equal

**Available Fields:**
- `phase`: 'powerplay', 'middle', 'death'
- `over`: Current over (1-20)
- `wicketsInHand`: Remaining wickets (0-10)
- `currentRunRate`: Current run rate
- `requiredRunRate`: Required run rate (chase only)
- `ballsLeft`: Balls remaining in innings
- `currentPartnership`: Partnership runs
- `ballsFaced`: Batsman balls faced
- `oversBowled`: Bowler overs bowled

### Implementation

```javascript
import attributeModifierSystem from '../core/match-engine/AttributeModifierSystem.js';

// Apply batting modifiers
const modifiedStriker = attributeModifierSystem.applyBattingModifiers(
  striker,
  matchContext
);

// Apply bowling modifiers
const modifiedBowler = attributeModifierSystem.applyBowlingModifiers(
  bowler,
  matchContext
);

// Modified players have updated attributes for simulation
// Original player objects remain unchanged
```

## Match Engine Integration

### SimpleBallSimulator Integration

The playstyle system integrates seamlessly into `SimpleBallSimulator.js`:

```javascript
async simulateBall(ballContext) {
  // 1. Build match context
  const matchContext = this.buildMatchContext(ballContext);

  // 2. Apply modifiers
  const modifiedStriker = attributeModifierSystem.applyBattingModifiers(
    ballContext.striker,
    matchContext
  );
  const modifiedBowler = attributeModifierSystem.applyBowlingModifiers(
    ballContext.bowler,
    matchContext
  );

  // 3. Use modified attributes in 4-step simulation
  const decisionResult = this.decisionCalculator.calculateDecision({
    striker: modifiedStriker,
    bowler: modifiedBowler
  });
  // ... (contact, trajectory, fielding calculations)

  // 4. Return result with modifier metadata
  return {
    outcome: ...,
    metadata: {
      playstyleModifiers: {
        striker: {
          playstyle: "Finisher",
          rating: 78.5,
          appliedModifiers: [...]
        }
      }
    }
  };
}
```

### Match Context Building

```javascript
buildMatchContext(ballContext) {
  const matchSituation = ballContext.matchSituation || {};

  return {
    phase: matchSituation.phase || this.determinePhase(matchSituation.over),
    over: matchSituation.over || 1,
    wicketsInHand: matchSituation.wicketsInHand || 10,
    currentRunRate: matchSituation.currentRunRate || 0,
    requiredRunRate: matchSituation.requiredRunRate || 0,
    ballsLeft: matchSituation.ballsLeft || 120,
    currentPartnership: matchSituation.currentPartnership || 0,
    ballsFaced: matchSituation.ballsFaced || 0,
    oversBowled: matchSituation.oversBowled || 0
  };
}
```

## Player Store Integration

### Calculating Playstyles

```javascript
import usePlayerStore from '../stores/playerStore.js';

// Calculate for single player
const store = usePlayerStore.getState();
const playstyleData = store.calculatePlayerPlaystyles(playerId);
// Returns: { ratings: {...}, primary: { batting: "...", bowling: "..." } }

// Update player with playstyles
store.updatePlayerPlaystyles(playerId);
// Player object now has playstyleRatings and primaryPlaystyle fields

// Update all players (run once after loading player database)
store.updateAllPlayerPlaystyles();
```

### Player Schema

Updated player schema includes:

```json
{
  "playstyleRatings": {
    "batting": {
      "Opener - Slogger": 45.2,
      "Finisher": 78.5,
      "Wall": 23.1
    },
    "bowling": {
      "Death Bowler": 65.3,
      "New Ball": 42.8
    }
  },
  "primaryPlaystyle": {
    "batting": "Finisher",
    "bowling": "Death Bowler"
  }
}
```

## Batting Playstyles

### Opener Playstyles

**Opener - Slogger**
- **Description**: Aggressive powerplay hitter
- **Key Attributes**: attackingShots, vsPace, aggression, strength
- **Bonuses**: New ball mastery (powerplay), momentum generation (overs 1-8)
- **Penalties**: Consistency issues (always), struggle post-powerplay

**Opener - Balanced**
- **Description**: Platform builder
- **Key Attributes**: technique, concentration, defensiveShots
- **Bonuses**: New ball mastery, platform building (7+ wickets)
- **Penalties**: Post-powerplay struggle

**Opener - Anchor**
- **Description**: Defensive opener
- **Key Attributes**: technique, concentration, defensiveShots, judgement
- **Bonuses**: Pressure resistance (≤6 wickets), platform building
- **Penalties**: Post-powerplay struggle

### Middle Order Playstyles

**Finisher**
- **Description**: Death overs specialist
- **Key Attributes**: attackingShots, range360, judgement, creativity
- **Bonuses**: Death overs excellence (phase=death), high-pressure performance (RRR>CRR)
- **Penalties**: Early innings wasted (over≤12)

**Middle Order - Slogger**
- **Description**: Power hitter
- **Key Attributes**: attackingShots, strength, range360
- **Bonuses**: Middle overs mastery (overs 7-16), calculated aggression
- **Penalties**: Batting collapse (≤4 wickets)

**Runner**
- **Description**: Strike rotator
- **Key Attributes**: speed, neutralShots, placement
- **Bonuses**: Strike rotation (always), momentum maintenance (CRR≥RRR)
- **Penalties**: Boundary limitation (RRR>CRR)

**Wall**
- **Description**: Ultra-defensive
- **Key Attributes**: defensiveShots, vsPace, vsSpin
- **Bonuses**: Defensive mastery (always), time management
- **Penalties**: Acceleration pressure (RRR>CRR)

## Bowling Playstyles

### Phase Specialists

**New Ball**
- **Description**: Powerplay specialist
- **Key Attributes**: swing, bowlingSpeed, variations
- **Bonuses**: New ball swing (over≤6), first over (over≤2)
- **Penalties**: Old ball struggle (over>16)

**Death Bowler**
- **Description**: Death overs specialist
- **Key Attributes**: variations, intelligence, defensiveBowling
- **Bonuses**: Death overs mastery (phase=death), pressure immunity
- **Penalties**: Powerplay weakness

**Workhorse**
- **Description**: Consistent middle overs
- **Key Attributes**: accuracy, stamina, neutralBowling
- **Bonuses**: Pressure building, consistency (per over bowled)
- **Penalties**: Tail resistance (≤4 wickets)

### Role Specialists

**Striker**
- **Description**: Wicket-taker
- **Key Attributes**: bowlingSpeed, attackingBowling, aggression
- **Bonuses**: Field placement (always), aggressive line (≥5 wickets)
- **Penalties**: Middle overs decline

**Heartbreaker**
- **Description**: Partnership breaker
- **Key Attributes**: variations, intelligence, swing
- **Bonuses**: Breakthroughs (partnership≥30 balls), pressure building
- **Penalties**: Tail resistance

**Controller**
- **Description**: Economy specialist
- **Key Attributes**: intelligence, accuracy, defensiveBowling
- **Bonuses**: Run control (CRR>RRR), tactical bowling
- **Penalties**: Tail resistance

**Magician**
- **Description**: Spin wizard
- **Key Attributes**: turn, variations, intelligence
- **Bonuses**: Aggressive line, pressure building
- **Penalties**: Slippery ball (over≤12)

## Performance Impact

### Expected Modifier Ranges

**At 100% PlaystyleRating:**
- Maximum bonus: +70% attribute increase (e.g., Finisher attackingShots in death)
- Maximum penalty: -50% attribute decrease (side effects)
- Typical bonus: +20-40% for situational strengths
- Typical penalty: -20-30% for situational weaknesses

**At 50% PlaystyleRating:**
- Maximum bonus: +35% attribute increase
- Maximum penalty: -25% attribute decrease
- Typical bonus: +10-20%
- Typical penalty: -10-15%

### Example Scenarios

**Finisher (Rating: 85) in Death Overs:**
```
attackingShots: 16 → 25.5 (+59%)
range360: 14 → 20.0 (+43%)
judgement: 15 → 20.1 (+34%)
Overall batting effectiveness: +45% in death overs
```

**Death Bowler (Rating: 90) in Death Overs:**
```
variations: 17 → 26.2 (+54%)
intelligence: 16 → 23.2 (+45%)
defensiveBowling: 15 → 20.4 (+36%)
Overall bowling effectiveness: +45% in death overs
```

## Customization Guide

### Adding New Playstyles

1. **Add to playstyle-weightings.json:**
```json
{
  "batting": {
    "New Playstyle Name": {
      "description": "Description here",
      "attributes": {
        "attribute1": weight1,
        "attribute2": weight2
      }
    }
  }
}
```

2. **Add to playstyle-modifiers.json:**
```json
{
  "batting": {
    "New Playstyle Name": {
      "description": "Description here",
      "modifiers": [
        {
          "name": "Modifier Name",
          "conditions": [...],
          "effects": [...]
        }
      ]
    }
  }
}
```

3. **Update roleCategories** if needed

### Adjusting Balance

**Increasing Playstyle Effectiveness:**
- Increase `scalingFactor` in effects (e.g., 0.003 → 0.004)
- Add more bonuses with different conditions
- Reduce side effect penalties

**Decreasing Playstyle Effectiveness:**
- Decrease `scalingFactor` in effects
- Add more side effects
- Tighten bonus conditions (e.g., phase=death AND over>=18)

**Changing Playstyle Suitability:**
- Adjust attribute weights in playstyle-weightings.json
- Higher weights = more important for playstyle rating

### Testing Modifications

```javascript
// Test playstyle rating calculation
const rating = playstyleCalculator.calculatePlaystyleRating(
  player,
  'batting',
  'Finisher'
);
console.log(`Finisher rating: ${rating.toFixed(1)}/100`);

// Test modifier application
const modifiedPlayer = attributeModifierSystem.applyPlaystyleModifiers(
  player,
  'batting',
  'Finisher',
  matchContext
);
console.log('Modified attributes:', modifiedPlayer.attributes);

// Get active modifiers info
const modifiersInfo = attributeModifierSystem.getActiveModifiersInfo(
  'batting',
  'Finisher',
  matchContext
);
console.log('Active:', modifiersInfo.activeModifiers);
console.log('Inactive:', modifiersInfo.inactiveModifiers);
```

## Best Practices

### Configuration Editing

1. **Backup Configuration**: Always backup config files before editing
2. **Test Incrementally**: Make small changes and test impact
3. **Document Changes**: Add comments explaining balance decisions
4. **Version Control**: Use git to track configuration changes

### Performance Considerations

1. **Modifier Count**: Keep modifiers per playstyle reasonable (3-5 typical)
2. **Condition Complexity**: Simple conditions evaluate faster
3. **Calculation Frequency**: Modifiers calculated once per ball, minimal overhead

### Balance Guidelines

1. **Specialization vs Versatility**: Specialists should excel in narrow contexts
2. **Trade-offs**: Strong bonuses should have meaningful penalties
3. **Context Specificity**: Avoid "always active" bonuses that are too strong
4. **Rating Scaling**: Effects should scale meaningfully with PlaystyleRating

## Troubleshooting

### Player Has No Playstyle Ratings

**Problem**: Player object missing `playstyleRatings` field

**Solution**:
```javascript
const store = usePlayerStore.getState();
store.updatePlayerPlaystyles(playerId);
```

### Modifiers Not Applying

**Problem**: Modified attributes same as original

**Checklist**:
1. Player has `playstyleRatings` field populated
2. Player has `primaryPlaystyle` field set
3. Match context includes required fields (phase, over, etc.)
4. Playstyle name matches configuration exactly
5. PlaystyleRating > 0 for active playstyle

### Unexpected Modifier Values

**Problem**: Attribute modifiers too strong/weak

**Debug**:
```javascript
// Check playstyle rating
console.log(player.playstyleRatings);

// Check active modifiers
const info = attributeModifierSystem.getActiveModifiersInfo(
  'batting',
  player.primaryPlaystyle.batting,
  matchContext
);
console.log('Active modifiers:', info.activeModifiers);
```

## API Reference

See [`docs/api/playstyle-api.md`] for complete API documentation.

## Future Enhancements

Potential future additions to the playstyle system:

1. **Dynamic Playstyle Selection**: Players switch playstyles mid-match based on situation
2. **Team Tactics Integration**: Captain sets team-wide playstyle strategies
3. **Player Development**: Playstyle ratings improve with match experience
4. **Playstyle Synergies**: Bonuses for compatible playstyles in partnerships
5. **Advanced Modifiers**: Multi-condition logic (OR, NOT operators)
6. **Historical Tracking**: Track playstyle effectiveness over career

---

**Last Updated**: 2025-01-10
**Version**: 1.0.0
