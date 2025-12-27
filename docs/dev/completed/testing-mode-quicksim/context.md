# Testing Mode & Quick-Sim - Context

## Session Start
- Date: December 2024
- Branch: testing

## Files Changed

### Phase 1: Testing Mode UI (COMPLETE)
- `src/App.jsx` - Added /testing route
- `src/components/testing/TestingDashboard.jsx` - Main container with 4-column layout, 10k/100k/1M simulation buttons
- `src/components/testing/PlayerSelector.jsx` - Searchable dropdown showing role-appropriate playstyle ratings
- `src/components/testing/ConditionsPanel.jsx` - Interdependent match conditions (4 phases, over↔ballsLeft↔phase auto-sync, CRR↔RRR↔target auto-sync, DLS-based pressure read-only)
- `src/components/testing/TacticsPanel.jsx` - Batting tactics (6 tiers, 16 playstyles), bowling tactics (type derived from bowler, plans, 8 playstyles), compact field template selector
- `src/components/testing/TestSimulator.js` - 10k/100k/1M ball simulation with proper fielding via setFieldFormation()
- `src/components/testing/ResultsDisplay.jsx` - Bar charts for outcome/contact/dismissal distributions, color-coded raw counts grid
- `src/components/tactics/tabs/FieldTemplateSelector.jsx` - Added `compact` prop for flat grid mode (no category headers)

### Phase 2: Quick-Sim Optimization (COMPLETE)
- `src/core/match-engine/utils/QuickSimMatch.js` - Added performance timing with console output
- `src/core/match-engine/core/MatchEngine.js` - Added `this.silent` property and skip `refreshFieldingPositions()` in silent mode

### Phase 3: Deep Clone Elimination (COMPLETE)
Replaced `JSON.parse(JSON.stringify(player))` with shallow spread in:
- `src/core/match-engine/systems/AttributeModifierSystem.js` (line ~29)
- `src/core/tactics/AccelerationTierManager.js` (applyTierModifiers)
- `src/core/tactics/BowlingPlanManager.js` (applyPlanModifiers)
- `src/core/tactics/ConfidenceManager.js` (applyConfidenceModifiers)
- `src/core/tactics/EnergyManager.js` (applyEnergyModifiers)
- `src/core/tactics/ContextualModifierManager.js` (applyLeftRightPenalty, applyNewBallBoost)
- `src/core/tactics/PressureCalculator.js` (applyPressureToPlaystyleRating)
- `src/core/tactics/MatchupEvaluator.js` (applyMatchupModifiers)

## Key Decisions
1. Testing mode at /testing (URL access only, no menu link)
2. Reuse FieldTemplateSelector with `compact={true}` for flat grid (no category headers)
3. 10k/100k/1M ball simulations (3 buttons)
4. Export as CSV/JSON
5. 7-stage modifiers MUST run every ball (dynamic)
6. Only freeze tactical INPUTS (batting order, tiers, bowling assignments)
7. Replace JSON.parse(JSON.stringify()) with shallow spread for performance
8. 4 phases: Powerplay (1-6), Early Middle (7-11), Late Middle (12-15), Death (16-20)
9. Interdependent fields: Over↔Phase↔Balls Left, CRR↔RRR↔Target
10. Pressure is read-only, calculated from DLS resources (wickets + balls)
11. Bowling type derived from bowler (not a toggle)
12. Player selector shows role-appropriate playstyle ratings

## Optimization Pattern Used
```javascript
// BEFORE (slow):
const modifiedPlayer = JSON.parse(JSON.stringify(player));

// AFTER (fast):
const modifiedPlayer = {
  ...player,
  attributes: { ...player.attributes },
  condition: { ...player.condition }
};
```

## Current State
- All implementation tasks complete
- Final benchmark pending
