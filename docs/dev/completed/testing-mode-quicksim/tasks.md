# Testing Mode & Quick-Sim - Tasks

## Testing Mode UI (COMPLETE)
- [x] Add /testing route to App.jsx
- [x] Create src/components/testing/ directory
- [x] Create TestingDashboard.jsx - 4-column layout with 10k/100k/1M simulation buttons
- [x] Create PlayerSelector.jsx - searchable dropdown with role-appropriate playstyle ratings
- [x] Create ConditionsPanel.jsx - interdependent fields (4 phases, over↔ballsLeft↔phase, CRR↔RRR↔target, DLS pressure)
- [x] Create TacticsPanel.jsx - batting/bowling tactics (bowling type derived from bowler)
- [x] Create TestSimulator.js - 10k/100k/1M simulation with proper fielding via setFieldFormation()
- [x] Create ResultsDisplay.jsx - outcome/contact/dismissal charts + color-coded raw counts
- [x] Add FieldTemplateSelector compact mode (flat grid, no headers)
- [x] Add CSV export button
- [x] Add JSON export button

## Quick-Sim Optimization
- [x] Add performance timing to QuickSimMatch.js (baseline)
- [x] Skip refreshFieldingPositions() in silent mode (MatchEngine.js)
- [x] Replace deep clones with shallow spread in 8 files:
  - [x] AttributeModifierSystem.js
  - [x] AccelerationTierManager.js
  - [x] BowlingPlanManager.js
  - [x] ConfidenceManager.js
  - [x] EnergyManager.js
  - [x] ContextualModifierManager.js (2 methods)
  - [x] PressureCalculator.js
  - [x] MatchupEvaluator.js
- [x] Build project to verify no errors

## Performance Verification
To benchmark the quick-sim performance:
1. Start dev server: `npm run dev`
2. Load/start a game
3. Open browser console (F12)
4. Run a quick-sim match
5. Look for: `⚡ Quick-sim completed: X balls in Yms (Z balls/sec)`

Expected improvement: Significant due to shallow spread replacing JSON.parse(JSON.stringify())
