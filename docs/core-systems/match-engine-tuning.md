# Match Engine Outcome Tuning

## Overview

This document describes the outcome probability tuning process for the Cricket Manager match engine, ensuring realistic T20-like distributions for dismissals, boundaries, and scoring rates.

## Configuration Files

All probabilities and thresholds are externalized to JSON configuration files:

### mentality-config.json
- **Contact Probabilities**: Base probabilities for missed/edged/middled based on decision score delta
- **Edge Behavior**: Contact quality threshold for edged_behind vs aerial edges to slips
- **Wicket Types**: Probability distribution for bowled/lbw/stumped
- **Wicket Probability**: Base rates and adjustments based on contact quality

### physics-config.json
- **Ball Physics**: Launch angles, gravity, boundary distances
- **Fielding Parameters**: Fielder speeds, throw speeds, reaction times
- **Boundary Calculations**: Pre-calculated boundary distances for all angles

### running-config.json
- **Running Speeds**: Base speeds and attribute multipliers for batsmen
- **Decision Thresholds**: Safety margins and judgment factors

### field-positioning-config.json
- **Formations**: Attacking, neutral, defensive field setups
- **Fielder Positions**: Polar coordinates (r, θ) for each position

## Shot Type Distribution

Current tuning achieves the following distribution (5000 ball sample):

- **Grounded**: ~45% (2250 balls)
- **Aerial**: ~26% (1300 balls)
- **Missed**: ~23% (1150 balls)
- **Edged Behind**: ~6% (300 balls)

### Edge Classification

The `contactQualityThreshold` in mentality-config.json determines which edges go behind vs to slips:

```json
"edgeBehavior": {
  "contactQualityThreshold": -10,
  "description": "Edges with contactQuality < -10 go behind wicket, better edges go to slips"
}
```

- **Poor edges** (contactQuality < -10): Go behind to keeper as "edged_behind" shots
- **Better edges** (contactQuality >= -10): Go to slips as aerial shots

### Keeper Catch Mechanics

For edged_behind shots:

1. **50% chance ball carries to keeper** (carriesChance: 0.5)
2. **50% chance ball falls short** (dot ball)
3. **If carries, catch probability = keeper_catching / 20**

Example: Keeper with catching=15 → 75% catch rate on edges that carry

## Dismissal Distribution

Target T20-like distributions achieved (5000 ball test):

| Dismissal Type | Count | Percentage | Target Range |
|---------------|-------|------------|--------------|
| LBW | 82 | 19.5% | 18-22% |
| Caught Behind | 92 | 21.9% | 18-24% |
| Bowled | 69 | 16.4% | 14-18% |
| Stumped | 69 | 16.4% | 14-18% |
| Caught (fielding) | 65 | 15.4% | 12-18% |
| Run Out | 44 | 10.5% | 8-12% |

**Dropped Catches**: ~40-60 per 5000 balls (1.0-1.2%)

## Wicket Probability Formula

Base wicket probability for missed balls:

```javascript
let wicketProbability = wicketConfig.base; // 0.167 (16.7%)

if (contactQuality < 0) {
  // Poor contact increases wicket chance
  const adjustment = Math.abs(contactQuality) / divisor;
  wicketProbability = Math.min(maxProbability, wicketProbability + adjustment / 100);
}
```

For contactQuality = -50:
- Adjustment = 50 / 3 = 16.67
- Final probability = 0.167 + 0.1667 = 0.334 (33.4%)

## Diagnostic Testing

Use `src/test/diagnosticBallTest.js` to validate outcome distributions:

```bash
node src/test/diagnosticBallTest.js
```

This simulates 5000 balls and outputs:
- Shot type distribution
- Dismissal type breakdown
- Speed vs outcome analysis
- Fielding interception rates
- Dropped catch counts

## Tuning Guidelines

### To Increase Wickets
1. Increase `wicketProbability.base` in mentality-config.json
2. Adjust `contactQualityAdjustment` divisors (lower = more impact)
3. Increase edge probabilities in `baseProbabilityMatrix`

### To Change Edge Behavior
1. Adjust `contactQualityThreshold` (-10 currently)
   - Lower value = fewer edges behind, more to slips
   - Higher value = more edges behind
2. Adjust `carriesChance` (0.5 currently)
   - Higher = more edges carry to keeper

### To Adjust Dismissal Types
1. Modify `wicketTypes.probabilities` in mentality-config.json
2. Current: bowled=0.5, lbw=0.35, stumped=0.15

### To Change Boundary Rates
1. Adjust fielder speeds in physics-config.json
2. Modify field formations in field-positioning-config.json
3. Tune fielder reaction times and throw speeds

## Common Issues

### Issue: Too Many Bowled/LBW
**Solution**: Lower `wicketProbability.base` or increase `contactQualityAdjustment.positive.divisor`

### Issue: Not Enough Edges
**Solution**: Increase edge probabilities in `baseProbabilityMatrix` for all decision score deltas

### Issue: Too Many Caught Behind
**Solution**:
- Lower `carriesChance` below 0.5
- Increase `contactQualityThreshold` (makes fewer edges go behind)

### Issue: Run Rate Too High/Low
**Solution**:
- Adjust boundary distances in physics-config.json
- Modify fielder speeds and formations
- Tune shot speed calculations in TrajectoryCalculator

## Performance Notes

- Simulation speed: ~50,000+ balls/second
- 5000-ball diagnostic test: <1 second
- Full T20 match (240 balls): <10ms

## Next Steps

- [ ] Further tune boundary rates to match T20 averages (6-8 per over)
- [ ] Validate run rates align with target scoring rates (8-10 runs/over)
- [ ] Test with different player attribute ranges
- [ ] Add match situation context (pressure, pitch conditions)
