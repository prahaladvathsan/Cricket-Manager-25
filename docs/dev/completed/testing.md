# Testing Guide

Comprehensive testing guidelines for Cricket Manager 25.

## Testing Philosophy

- **Configuration-driven**: Test outcome probabilities against config files
- **Deterministic**: Use seeded randomization for reproducible results
- **Performance-critical**: Match engine must maintain ~50k+ balls/second
- **Algebraic validation**: Verify 4-step calculation logic (Decision → Contact → Trajectory → Fielding)

## Test Scripts

### Match Engine Tests

#### Diagnostic Ball Test
**Purpose**: Validate outcome probabilities against config files

```bash
node src/test/diagnosticBallTest.js
```

**What it tests**:
- Outcome distribution (dot, 1, 2, 3, 4, 6, wicket)
- Dismissal type distribution (bowled, lbw, caught, etc.)
- Shot type distribution (missed, edged, grounded, aerial)
- Probability drift from config values

**When to use**:
- After changing config files
- After modifying match engine logic
- After playstyle/tactics changes

#### Detailed Match Test
**Purpose**: Full match simulation with detailed logging

```bash
node src/test/detailedMatchTest.js
```

**What it tests**:
- Complete T20 match (40 overs)
- Ball-by-ball simulation
- Scorecard accuracy
- Performance benchmarks

**When to use**:
- Integration testing after engine changes
- Performance profiling
- Debugging match flow issues

### Interactive Match Tests

#### Interactive Match Test
**Purpose**: Manually playable match with full user control

```bash
node src/test/interactiveMatchTest.js
```

**What it tests**:
- User team selection
- Tactical control (acceleration, bowling plans)
- In-match decision making
- Match state persistence

**When to use**:
- Manual testing of match flow
- User experience validation
- Debugging tactical logic

#### Demo Interactive Match
**Purpose**: Automated playthrough (no user input)

```bash
node src/test/demoInteractiveMatch.js
```

**What it tests**:
- End-to-end match flow
- AI decision making
- Tactical system integration
- Match completion

**When to use**:
- Quick smoke testing
- CI/CD integration (future)
- Regression testing

### League System Tests

#### League Test
**Purpose**: Test league structure and match scheduling

```bash
# Quick test (5 matches)
node src/test/leagueTest.js

# Full season (90 matches)
node src/test/leagueTest.js --full

# With playoffs
node src/test/leagueTest.js --full --playoffs

# With leaderboards
node src/test/leagueTest.js --full --playoffs --leaderboards

# Custom match count
node src/test/leagueTest.js --matches=20

# Force playoffs (for testing playoff logic)
node src/test/leagueTest.js --matches=10 --force-playoffs
```

**What it tests**:
- Fixture generation (double round-robin)
- Match simulation at scale
- Standings calculation (points, NRR)
- Playoff bracket logic
- Player statistics aggregation

**When to use**:
- League system changes
- Performance testing (90 matches)
- Playoff logic validation
- Leaderboard accuracy

### Auction System Tests

#### Demo Auction
**Purpose**: Test auction logic and AI bidding

```bash
node src/test/demoAuction.js
```

**What it tests**:
- Playstyle quota system
- Fit score calculation
- Budget-to-gap multiplier
- AI bidding determinism
- Fast mode logic

**When to use**:
- Auction system changes
- AI bidding tuning
- Quota validation

## Unit Testing (Future)

### Framework
- **Vitest** (recommended for Vite projects)
- **React Testing Library** for component testing

### Coverage Targets
- **Core systems**: 80%+ coverage
- **Match Engine**: 90%+ coverage
- **UI components**: 60%+ coverage

### Example Test Structure
```javascript
// src/core/match-engine/__tests__/SimpleBallSimulator.test.js
import { describe, it, expect } from 'vitest';
import SimpleBallSimulator from '../SimpleBallSimulator';

describe('SimpleBallSimulator', () => {
  it('should simulate a ball correctly', () => {
    const simulator = new SimpleBallSimulator();
    const result = simulator.simulateBall(/* params */);
    expect(result).toHaveProperty('outcome');
    expect(result).toHaveProperty('runs');
  });
});
```

## E2E Testing (Future)

### Framework
- **Playwright** for browser automation

### Test Scenarios
1. **Full game flow**: Auction → League → Playoffs
2. **Match simulation**: Play Ball → Over → Match complete
3. **Navigation**: All pages accessible
4. **State persistence**: Save → Reload → Continue

## Performance Testing

### Match Engine Benchmarks

**Target**: ~50,000+ balls/second

```bash
# Run detailed match test with performance logging
node src/test/detailedMatchTest.js
```

**Metrics to track**:
- Balls simulated per second
- Memory usage during simulation
- UI render performance (future)

### Performance Regression
- Track performance metrics over time
- Alert on >10% degradation
- Profile before/after major changes

## Testing Checklist

### Before Committing
- [ ] Run diagnostic ball test
- [ ] Run demo interactive match
- [ ] Check for console errors
- [ ] Verify no hardcoded probabilities

### Before Release
- [ ] Full season test (90 matches)
- [ ] All test scripts passing
- [ ] Performance benchmarks met
- [ ] UI smoke test (all pages)

### After Config Changes
- [ ] Run diagnostic ball test
- [ ] Validate outcome distributions
- [ ] Check for probability drift
- [ ] Update tuning docs if needed

### After Match Engine Changes
- [ ] Run all match tests
- [ ] Performance benchmarks
- [ ] Visual inspection (demo match)
- [ ] Edge case testing

## Debugging Tools

### Match Engine Debugging
```javascript
// Enable verbose logging in SimpleBallSimulator
const simulator = new SimpleBallSimulator({ debug: true });
```

### State Inspection
```javascript
// Log full match state
console.log(JSON.stringify(matchState, null, 2));
```

### Performance Profiling
```javascript
// Measure simulation time
console.time('simulateOver');
simulator.simulateOver(/* params */);
console.timeEnd('simulateOver');
```

## CI/CD Integration (Future)

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test
      - run: node src/test/diagnosticBallTest.js
      - run: node src/test/demoInteractiveMatch.js
```

## Common Issues

### Outcome Probability Drift
**Symptom**: Diagnostic test fails with >5% drift

**Solution**:
1. Check config file changes
2. Verify playstyle modifiers
3. Review tactics system changes
4. Re-tune if needed (see `docs/core-systems/match-engine-tuning.md`)

### Performance Degradation
**Symptom**: <50k balls/second

**Solution**:
1. Profile with Chrome DevTools
2. Check for synchronous I/O
3. Review array operations (use for loops, not map/filter)
4. Minimize object creation in hot paths

### Match Flow Bugs
**Symptom**: Match doesn't complete or hangs

**Solution**:
1. Enable debug logging
2. Check ball count logic
3. Verify dismissal handling
4. Test edge cases (all-out, target reached)

---

**Last Updated**: January 2025
**See also**: `docs/core-systems/match-engine-tuning.md` for tuning approach
