# Configuration Files Guide

This document describes all configuration files used in the Cricket Manager match engine and their purposes.

## Configuration Files Overview

| File | Location | Purpose | Used By |
|------|----------|---------|---------|
| **mentality-config.json** | `src/data/config/` | Batting/bowling mentalities, contact probabilities, edge behavior, wicket types | ContactCalculator, TrajectoryCalculator |
| **trajectory-config.json** | `src/data/config/` | Shot speed and direction calculation parameters | TrajectoryCalculator |
| **physics-config.json** | `src/data/config/` | Field dimensions, ball physics, fielder movement, algebraic calculations | BallTrajectoryPhysics, FielderMovementCalculator |
| **running-config.json** | `src/data/config/` | Running speeds, decision factors, risk assessment | RunningDecisionCalculator |
| **field-positioning-config.json** | `src/data/config/` | Field dimensions, fielding formations (attacking/neutral/defensive) | FieldPositioningSystem |

---

## mentality-config.json

**Purpose**: Player mentality configurations for batting and bowling strategies, contact probabilities, edge behavior, and wicket determination.

**Used by**:
- `ContactCalculator.js` - for contact probabilities
- `TrajectoryCalculator.js` - for mentality, edge behavior, and wicket types

### Sections:

#### batting
Defines shot type probabilities for different batting mentalities:
- **attacking**: 50% aerial, 50% grounded
- **neutral**: 30% aerial, 70% grounded
- **defensive**: 10% aerial, 90% grounded

#### bowling
Defines wicket probability multipliers for bowling mentalities:
- **attacking**: 0.70 wicket probability
- **neutral**: 0.50 wicket probability
- **defensive**: 0.30 wicket probability

#### contactThresholds
Contact type probability thresholds based on decision score delta:
- **baseProbabilityMatrix**: Probabilities for missed/edged/middled based on batting vs bowling decision score (-2 to +2)
- **executionAdjustments**: Probability adjustments per execution score difference
- **contactQuality**: Contact quality calculation parameters (d40 roll variance)

#### edgeBehavior
Defines how edges are handled:
- **contactQualityThreshold**: -10 (edges below this go behind wicket)
- **poorContact**: 50% chance ball carries to keeper, 50% falls short
- **betterContact**: Edge speed calculation and fielding resolution for slips

#### wicketTypes
Wicket determination and probabilities:
- **missed**: Types of wickets from missed balls (bowled, lbw, stumped)
- **probabilities**: Distribution (bowled: 0.5, lbw: 0.35, stumped: 0.15)
- **wicketProbability**: Base wicket probability (0.167) and contact quality adjustments

---

## trajectory-config.json

**Purpose**: Shot trajectory calculation parameters for ball speed and direction.

**Used by**: `TrajectoryCalculator.js`

### Sections:

#### directionCalculation
Parameters for calculating shot direction based on control and bias:
- **controlFactorMultiplier**: 0.3
- **biasAreas**: [45, 90, 135, 225, 270, 315] degrees

**Note**: Currently not used in code - direction calculation uses range360 and placement attributes instead.

#### shotSpeedCalculation
Formula for calculating shot speed from contact quality and strength:
- **baseSpeed**: 12 m/s
- **contactQualityMultiplier**: 1.5 (applied to sqrt(contactQuality))
- **shotPowerMultiplier**: 0.65
- **speedLimits**: min=10, max=40 m/s

**Formula**: `speed = baseSpeed + sqrt(contactQuality) × 1.5 + sqrt(strengthRoll) × sqrt(20) × 0.65`

---

## physics-config.json

**Purpose**: Algebraic trajectory and movement calculations with fixed physics assumptions.

**Used by**:
- `BallTrajectoryPhysics.js`
- `FielderMovementCalculator.js`

### Sections:

#### fieldDimensions
Field dimensions in meters:
- **boundaryRadius**: 70m from center
- **pitchLength**: 20.12m (22 yards)
- **strikerOffset**: 10.06m (11 yards from center)

#### shotTypes
Shot type physics parameters:
- **aerial**: Fixed 45° launch angle for maximum range
- **grounded**: Direct straight-line trajectory with algebraic deceleration

#### ballMovement
Ball physics constants:
- **gravity**: 10 m/s²
- **constantSpeed**: true (no deceleration)

#### fielderMovement
Fielder movement parameters:
- **baseSpeed**: 10.0 m/s (uses throw_speed attribute when available)

#### algebraicCalculations
Direct algebraic formulas for interception:
- **interceptionFormula**: Time step 0.1s, max 100 iterations
- **aerialInterception**: Catch window 0.5s, default throw speed 25 m/s
- **directionSelection**: Min angular gap 10°, max 20 direction options

#### boundaryCache
Pre-calculated boundary distances:
- **enabled**: true
- **precision**: integer_degrees (360 values)

---

## running-config.json

**Purpose**: Running decision and speed configurations.

**Used by**: `RunningDecisionCalculator.js`

### Sections:

#### runningSpeed
Running speed parameters in m/s:
- **baseSpeed**: 7.0 m/s
- **speedMultiplier**: 0.1
- **maxSpeed**: 9.0 m/s
- **wicketDistance**: 20.12m (22 yards)
- **turningPenalty**: 0.5s

#### decisionFactors
Factors affecting running decisions:
- **judgmentWeight**: 1
- **errorProbabilityBase**: 0.03 (3% base error rate)
- **combinedJudgmentDivisor**: 40

#### riskAssessment
Time margins for different risk levels:
- **safeMargin**: 0.5s
- **riskyMargin**: 0.2s
- **conservativeBonus**: 0.3s
- **aggressiveBonus**: -0.2s

---

## field-positioning-config.json

**Purpose**: Field positioning configurations for 2D fielding simulation.

**Used by**: `FieldPositioningSystem.js`

### Sections:

#### fieldDimensions
Field dimensions for 2D coordinate system in meters:
- **boundaryRadius**: 70m from center
- **pitchLength**: 20.12m (22 yards)
- **strikerOffset**: 10.06m from center

**Note**: Duplicates physics-config.json dimensions for FieldPositioningSystem usage.

#### formations
Three field setups with 11 fielder positions each (x, y coordinates):
- **attacking**: Aggressive field with close-in fielders and catching positions
- **neutral**: Balanced field with mixed close and boundary fielders
- **defensive**: Defensive field with most fielders on the boundary

Each formation includes:
- **bowler**: (0, -10)
- **keeper**: (0, 20)
- **9 other fielders**: Various positions based on formation type

---

## Reference Files

The following files have been moved to `docs/reference/` as they are not used by the code:

### game-rules.json
Contains WPL rules, match rules, and season structure for future implementation.

### attribute-ranges.json
Contains player attribute descriptions and valid ranges (1-20 scale) for documentation purposes.

---

## Configuration Best Practices

1. **All probabilities and thresholds are externalized** - no hardcoded values in code
2. **Config files are loaded once** - at module initialization for performance
3. **Consistent units** - all distances in meters, all speeds in m/s, all angles in degrees
4. **Clear descriptions** - each section includes description field explaining purpose
5. **Versioning** - each config has version number for future migration support

---

## Tuning Guidance

For tuning match outcomes, see [`docs/core-systems/match-engine-tuning.md`] for detailed guidance on:
- Adjusting dismissal types and rates
- Tuning boundary percentages
- Modifying edge behavior
- Balancing run rates
