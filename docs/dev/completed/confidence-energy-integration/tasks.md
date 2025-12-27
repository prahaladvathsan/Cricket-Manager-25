# Confidence & Energy Integration - Task Checklist

**Last Updated**: 2025-01-20

## Phase 1: Documentation Setup

- [x] Create `docs/dev/active/confidence-energy-integration/` folder
- [x] Create `plan.md`
- [x] Create `context.md`
- [x] Create `tasks.md` (this file)

## Phase 2: Core Integration (Match Engine)

### 2.1 Match Situation Tracking
- [ ] Add `consecutiveDots` Map to match state
- [ ] Add `overTargets` Map to match state
- [ ] Add `batsmanMilestones` Map to match state
- [ ] Add `currentModifierBreakdown` to match state
- [ ] Implement `calculateOverTargets()` helper method
- [ ] Initialize tracking maps in match initialization

### 2.2 TacticsModifierSystem Breakdown
- [ ] Modify Stage 1 (Playstyle) to track non-zero modifiers
- [ ] Modify Stage 2 (Tactics) to track non-zero modifiers
- [ ] Modify Stage 3 (Mentality) to track non-zero modifiers
- [ ] Modify Stage 4 (Matchups) to track non-zero modifiers
- [ ] Modify Stage 5 (Confidence) to track non-zero modifiers
- [ ] Modify Stage 6 (Energy) to track non-zero modifiers
- [ ] Modify Stage 7 (Context) to track non-zero modifiers
- [ ] Update return structure to include breakdown object
- [ ] Test that breakdown only contains non-zero values

### 2.3 Modifier Breakdown Integration
- [x] Modifiers calculated during simulation (not pre-calculated)
- [x] SimpleBallSimulator returns breakdown in ballResult
- [x] Store breakdown in matchState before outcome
- [x] Add timing delay (1.5s normal / 0.5s fast)
- [x] Remove inter-ball delays

### 2.4 Post-Ball Confidence Updates
- [ ] Track consecutive dots (increment on dot, reset otherwise)
- [ ] Check for 25-run milestone
- [ ] Check for 50-run milestone
- [ ] Prepare confidenceResult object (runs, wicket, boundary, dots)
- [ ] Prepare overResult object (maiden, wickets, haul)
- [ ] Calculate run rate and over target
- [ ] Prepare matchSituation object
- [ ] Call `confidenceManager.updateBattingConfidence()`
- [ ] Call `confidenceManager.updateBowlingConfidence()`
- [ ] Store updated confidence values in matchConditions

### 2.5 Fielding Energy Depletion
- [ ] Get fielding team players
- [ ] Loop through all fielders
- [ ] Prepare action object (type, isCatch, isBoundary)
- [ ] Call `energyManager.updateFieldingEnergy()` for each fielder
- [ ] Store updated energy values in matchConditions

### 2.6 Morale Updates After Match
- [ ] Locate match completion handler
- [ ] Get all players from both teams
- [ ] Get final confidence for each player
- [ ] Get confidence history for each player
- [ ] Call `confidenceManager.updateMoraleAfterMatch()`
- [ ] Update player.condition.morale
- [ ] Update player.condition.confidenceHistory (keep last 5)

### 2.7 Helper Methods
- [ ] Implement `isOverComplete()` checker
- [ ] Implement `isOverMaiden()` checker
- [ ] Implement `getWicketsThisOver()` counter
- [ ] Implement `getBowlerWicketCount()` counter

## Phase 3: UI Components

### 3.1 ConditionBar Component
- [ ] Create `src/components/shared/ConditionBar.jsx`
- [ ] Implement props interface (type, value, showValue, className)
- [ ] Style thin horizontal bar (60px × 4px)
- [ ] Implement green color for energy
- [ ] Implement gold color for confidence
- [ ] Add percentage-based width calculation
- [ ] Add numeric value display (optional)
- [ ] Add smooth transition animation
- [ ] Test with various values (0, 50, 100)

### 3.2 ModifierBreakdownPanel Component
- [ ] Create `src/components/match/matchday/ModifierBreakdownPanel.jsx`
- [ ] Implement props interface (breakdowns, names, isPinned, handlers)
- [ ] Create header with title and pin button
- [ ] Implement two-column grid layout
- [ ] Create renderModifierCategory helper function
- [ ] Style striker column (left, green accent)
- [ ] Style bowler column (right, blue accent)
- [ ] Add color coding for positive/negative values
- [ ] Implement scrolling for long lists
- [ ] Add close button when pinned
- [ ] Test with sample modifier data

### 3.3 Live Scorecard Expansion
- [ ] Locate Live Scorecard in MatchdayUI.jsx
- [ ] Add state for showModifierBreakdown
- [ ] Add state for isBreakdownPinned
- [ ] Wrap scorecard in hover-sensitive container
- [ ] Add onMouseEnter handler
- [ ] Add onMouseLeave handler (respect pinned state)
- [ ] Add thin condition bars to striker display
- [ ] Add ModifierBreakdownPanel below scorecard
- [ ] Wire up pin button handler
- [ ] Wire up close button handler
- [ ] Test hover behavior
- [ ] Test pin/unpin functionality

### 3.4 TacticsHub - Batting Order Tab
- [ ] Locate batting order table in TacticsHub.jsx
- [ ] Modify player name cell to flex-col layout
- [ ] Add PlayerName component
- [ ] Add thin confidence bar below name
- [ ] Add thin energy bar below name
- [ ] Set showValue={true} for both bars
- [ ] Adjust cell padding for new height
- [ ] Test with all batsmen in order

### 3.5 TacticsHub - Bowling Plans Tab
- [ ] Locate bowling plans table in TacticsHub.jsx
- [ ] Modify bowler name cell to flex-col layout
- [ ] Add PlayerName component
- [ ] Add thin confidence bar below name
- [ ] Add thin energy bar below name
- [ ] Set showValue={true} for both bars
- [ ] Adjust cell padding for new height
- [ ] Test with all bowlers in list

### 3.6 PlayerName Tooltips
- [ ] Locate PlayerName.jsx component
- [ ] Check if Tooltip is already used
- [ ] Add condition props (confidence, energy) to component
- [ ] Create tooltip content structure
- [ ] Add player name header
- [ ] Add confidence bar with value
- [ ] Add energy bar with value
- [ ] Add level names (e.g., "High · Tired")
- [ ] Import getConfidenceLevel and getEnergyLevel helpers
- [ ] Test tooltip on various player names

## Phase 4: Store Integration

### 4.1 matchStore Updates
- [ ] Add `matchTracking` object to state
- [ ] Add `currentModifierBreakdown` to state
- [ ] Implement `updatePlayerConditions()` action
- [ ] Implement `setModifierBreakdown()` action
- [ ] Implement `getPlayerConditionLevel()` helper
- [ ] Add confidence level mapping (5 levels)
- [ ] Add energy level mapping (5 levels)
- [ ] Test store actions with sample data

### 4.2 Persistence Verification
- [ ] Verify matchConditions persists through match
- [ ] Verify conditions sync to teamStore after match
- [ ] Verify LocalStorage saves/loads conditions
- [ ] Test match resume with saved conditions

## Phase 5: Testing & Validation

### 5.1 Existing Tests
- [ ] Run `node src/test/demoInteractiveMatch.js`
- [ ] Verify no console errors
- [ ] Verify match completes successfully
- [ ] Run `node src/test/leagueTest.js`
- [ ] Verify no console errors
- [ ] Verify season completes successfully

### 5.2 Manual Visual Testing
- [ ] Start dev server (`npm run dev`)
- [ ] Start new game
- [ ] Play interactive match
- [ ] Test Live Scorecard hover expansion
- [ ] Test pin button functionality
- [ ] Test modifier breakdown display (non-zero only)
- [ ] Test TacticsHub Batting Order bars
- [ ] Test TacticsHub Bowling Plans bars
- [ ] Test PlayerName tooltips
- [ ] Verify color scheme (green/gold)

### 5.3 Functional Testing
- [ ] Hit boundary → verify confidence increase
- [ ] Face 10 balls → verify confidence increase
- [ ] 3 consecutive dots → verify confidence decrease
- [ ] Reach 25 runs → verify +5 confidence bonus
- [ ] Reach 50 runs → verify +10 confidence bonus
- [ ] Face many balls → verify energy decrease (batting)
- [ ] Bowl 4 overs → verify energy decrease (bowling)
- [ ] Check fielders → verify energy decrease (fielding)
- [ ] Complete match → verify morale updated

## Phase 6: Documentation Updates

### 6.1 Active Folder Updates
- [ ] Update `context.md` with all files changed
- [ ] Update `context.md` with line numbers
- [ ] Document any deviations from plan
- [ ] Update `tasks.md` completion status

### 6.2 Move to Completed
- [ ] Verify all success criteria met
- [ ] Move folder to `docs/dev/completed/`
- [ ] Add completion date to plan.md
- [ ] Add final summary to plan.md

### 6.3 System Documentation
- [ ] Update `docs/core-systems/tactics-system.md`
- [ ] Update `docs/frontend/design-system.md`
- [ ] Document ConditionBar component
- [ ] Document ModifierBreakdownPanel component
- [ ] Document modifier breakdown pattern

## Next Immediate Steps (Top 3)

1. **Start Phase 2**: Add match situation tracking to MatchEngine.js
2. **Modify TacticsModifierSystem**: Update to return modifier breakdown
3. **Implement prepareForNextBall()**: Calculate modifiers before simulation

---

**Total Tasks**: 100+
**Completed**: 4
**In Progress**: 0
**Remaining**: 96+
