# Confidence & Energy Integration - Implementation Context

**Last Updated**: 2025-01-20
**Current Phase**: Phase 3 - UI Components (in progress)

## Current State

### What's Been Done

**Phase 1 - Documentation Setup:**
- ✅ Created active feature documentation folder
- ✅ Created plan.md with approved implementation strategy
- ✅ Created context.md (this file) for living documentation
- ✅ Created tasks.md with granular checklist

**Phase 2 - Core Integration: ✅ COMPLETE**
- ✅ Added match situation tracking to MatchEngine.js (lines 353-360)
- ✅ Added calculateOverTargets() helper method (lines 400-419)
- ✅ Added getPlayerScore() helper method (lines 1329-1333)
- ✅ Implemented comprehensive confidence updates in updateTacticalStateAfterBall() (lines 859-963)
  - Tracks consecutive dots, milestones (25/50), over targets
  - Updates batting and bowling confidence based on performance
  - Uses ConfidenceManager with all config triggers
- ✅ Implemented fielding energy depletion for all fielders (lines 834-857)
  - All 11 fielders lose energy per ball
  - Uses EnergyManager.updateFieldingEnergy()
- ✅ Implemented morale updates after match completion (lines 1464-1489)
  - Morale = rolling 5-match average of final confidence
  - Updates player.condition.morale and confidenceHistory
- ✅ Added modifier breakdown to TacticsModifierSystem (lines 145-321)
  - New createModifierBreakdown() method
  - Returns UI-friendly breakdown with 7 stages
  - Only includes non-zero modifiers
- ✅ Integrated breakdown into ball simulation flow
  - SimpleBallSimulator calculates modifiers during simulation, returns breakdown in ballResult
  - MatchEngine stores breakdown immediately before applying outcome (lines 625-632)
  - Delay added between breakdown display and outcome (1.5s normal / 0.5s fast)
- ✅ Updated matchStore with state and helper methods
  - Added matchTracking state (consecutiveDots, batsmanMilestones, overTargets)
  - Added currentModifierBreakdown state
  - Added getPlayerConfidenceLevel() helper (lines 591-600)
  - Added getPlayerEnergyLevel() helper (lines 607-616)
  - Added updatePlayerConditions() action (lines 623-631)
  - Added setModifierBreakdown() action (lines 637-639)

**Phase 3 - UI Components: ✅ COMPLETE**
- ✅ Created ConditionBar.jsx component (~55 lines)
  - Thin horizontal bar (60px × 4px)
  - Green for energy (#22C55E), Gold for confidence (#D4AF37)
  - Optional numeric value display
  - Smooth transitions with opacity based on value
- ✅ Created ModifierBreakdownPanel.jsx component (~175 lines)
  - Two-column side-by-side layout (Striker | Bowler)
  - Category-grouped modifiers (7 categories)
  - Pin/unpin functionality for staying open
  - Color-coded values (green positive, red negative)
  - Overlay dropdown style
- ✅ Integrated into Live Scorecard in MatchdayUI.jsx (~20 lines)
  - Hover expansion on center section of Live Scorecard
  - Shows striker and bowler modifier breakdowns side-by-side
  - Pin/unpin functionality to keep panel open
  - Updates with each ball simulation
- ✅ Added condition bars to BattingAccelerationPanel.jsx (~15 lines)
  - Imported ConditionBar and matchConditions
  - Displays confidence and energy bars below each batsman's name
  - Side-by-side horizontal bars with no numeric values
- ✅ Added condition bars to BowlingPlansPanel.jsx (~15 lines)
  - Imported ConditionBar and matchConditions
  - Displays confidence and energy bars below each bowler's name
  - Appears in BowlerRow component used in both current and squad lists
- ✅ Enhanced PlayerName.jsx with condition tooltips (~20 lines)
  - Imported matchStore to access matchConditions
  - Dynamic tooltip shows confidence and energy when available
  - Falls back to basic tooltip outside match context
  - Format: "Player Name | Confidence: 75 | Energy: 85"

### Files Changed

#### Documentation
- `docs/dev/active/confidence-energy-integration/plan.md` - Created
- `docs/dev/active/confidence-energy-integration/context.md` - Created, updated twice
- `docs/dev/active/confidence-energy-integration/tasks.md` - Created

#### Core Engine
- **`src/core/match-engine/core/MatchEngine.js`** - **MAJOR modifications (~220 lines added)**
  - Lines 353-360: Initialize matchTracking state (consecutiveDots, batsmanMilestones, overTargets)
  - Lines 400-419: calculateOverTargets() method for run-rate based targets
  - Lines 591-598: Store modifier breakdown from ballResult into matchState
  - Lines 834-857: Fielding energy depletion for all 11 fielders
  - Lines 859-963: Comprehensive confidence update logic
    - Tracks consecutive dots, milestones, over targets
    - Prepares confidenceResult, overResult, matchSituation objects
    - Calls ConfidenceManager.updateBattingConfidence()
    - Calls ConfidenceManager.updateBowlingConfidence()
  - Lines 1329-1333: getPlayerScore() helper method
  - Lines 1464-1489: Morale finalization after match completion

- **`src/core/tactics/TacticsModifierSystem.js`** - **MAJOR addition (~180 lines added)**
  - Lines 133-143: Modified applyAllModifiers() return to include breakdown
  - Lines 145-321: New createModifierBreakdown() method
    - Processes all 7 modifier stages
    - Creates UI-friendly structure with name/value/description
    - Only includes non-zero modifiers
    - Handles confidence/energy levels, playstyles, matchups, tactics, context

- **`src/core/match-engine/core/SimpleBallSimulator.js`** - **Minor addition (~3 lines)**
  - Line 85: Extract modifierBreakdown from tacticsResult
  - Line 146: Add modifierBreakdown to return value

#### UI Components
- **`src/components/shared/ConditionBar.jsx`** - **Created (~55 lines)**
  - Reusable thin horizontal bar component
  - Props: type, value, showValue, className
  - Color-coded (green/gold) with opacity scaling
- **`src/components/match/matchday/ModifierBreakdownPanel.jsx`** - **Created (~175 lines)**
  - Expandable modifier breakdown panel
  - Side-by-side striker/bowler layout
  - Pin/unpin functionality
  - Category-grouped modifiers with color coding
- **`src/components/match/matchday/MatchdayUI.jsx`** - **Modified (~20 lines added)**
  - Lines 26-27: Import ConditionBar and ModifierBreakdownPanel
  - Lines 50-51: Added matchConditions and currentModifierBreakdown from store
  - Lines 54-55: State for showModifierBreakdown and isBreakdownPinned
  - Lines 397-401: Hover container for center section
  - Lines 500-514: ModifierBreakdownPanel component with pin/close handlers
- **`src/components/match/matchday/TacticsHub/BattingAccelerationPanel.jsx`** - **Modified (~15 lines added)**
  - Line 20: Import ConditionBar
  - Line 237: Get matchConditions from store
  - Lines 411-426: Modified player name section to flex column with condition bars
- **`src/components/match/matchday/TacticsHub/BowlingPlansPanel.jsx`** - **Modified (~15 lines added)**
  - Line 21: Import ConditionBar
  - Line 71: Get matchConditions in BowlerRow component
  - Lines 101-126: Modified bowler info section with condition bars below name
- **`src/components/shared/PlayerName.jsx`** - **Modified (~20 lines added)**
  - Line 27: Import useMatchStore
  - Line 49: Get matchConditions from store
  - Lines 60-71: Calculate conditionInfo for tooltip
  - Lines 83-85: Create dynamic tooltipText based on conditions
  - Line 107: Use tooltipText in title attribute

#### Stores
- **`src/stores/matchStore.js`** - **Complete (~60 lines added)**
  - Lines 110-118: Added matchTracking and currentModifierBreakdown to state
  - Lines 591-600: getPlayerConfidenceLevel() helper method
  - Lines 607-616: getPlayerEnergyLevel() helper method
  - Lines 623-631: updatePlayerConditions() action
  - Lines 637-639: setModifierBreakdown() action

## Key Decisions Made

1. **Modifier Calculation Flow**: Calculate modifiers once before ball simulation, store breakdown, reuse for actual simulation. This ensures UI preview matches actual calculation.

2. **UI Visibility**: Thin condition bars (4px height) in TacticsHub, expandable modifier breakdown in Live Scorecard on hover.

3. **Expansion Behavior**: Overlay/dropdown with pin button. Unpinned = closes on mouse leave. Pinned = stays open across balls.

4. **Color Scheme**: Green for energy, Gold for confidence (no gradients, solid colors with opacity based on value).

5. **Data Tracking**: Full implementation of milestones, over targets, consecutive dots, wicket hauls.

## Technical Architecture Notes

### Modifier Breakdown Structure

```javascript
{
  striker: {
    playstyleModifiers: [
      { name: "Modifier Name", value: 10, description: "..." }
    ],
    tacticalModifiers: [...],
    mentalityModifiers: [...],
    matchupModifiers: [...],
    confidenceModifiers: [...],
    energyModifiers: [...],
    contextModifiers: [...]
  },
  bowler: { /* same structure */ }
}
```

### Match State Tracking

New additions to match state:
- `consecutiveDots`: Map<playerId, count>
- `overTargets`: Map<teamId, requiredRunRate>
- `batsmanMilestones`: Map<playerId, [25, 50, ...]>
- `currentModifierBreakdown`: { striker, bowler }

### Execution Flow

```
simulateBall()
  ↓
SimpleBallSimulator: Calculate modifiers once, use throughout ball
  ↓
Return ballResult with modifierBreakdown
  ↓
Store breakdown in matchStore (correct player data)
  ↓
Delay (1.5s normal / 0.5s fast) - UI shows modifiers
  ↓
processBallResult() - Apply outcome to UI
  ↓
updateTacticalStateAfterBall() - Update confidence/energy
  ↓
Next ball immediately (no inter-ball delay)
```

## Implementation Complete

All three phases have been successfully completed:
- **Phase 1**: Documentation setup ✅
- **Phase 2**: Core integration (confidence updates, energy depletion, morale, modifier breakdown) ✅
- **Phase 3**: UI components (condition bars, modifier breakdown panel, tooltips) ✅

## Testing Status

- ✅ Build verification: `npm run build` completed successfully
- ⏳ Manual visual testing: Ready for user testing in dev server (`npm run dev`)

## Next Steps for User

1. Run `npm run dev` to start the development server
2. Start a match and observe:
   - Thin condition bars below player names in TacticsHub (Batting Order and Bowling Plans tabs)
   - Hover over the Live Scorecard center section to see full modifier breakdown
   - Pin the breakdown panel to keep it open across balls
   - Hover over player names to see confidence/energy tooltips
3. Watch confidence/energy values change ball-by-ball based on performance

## Issues & Blockers

None

## Notes

- Following CLAUDE.md repo guidelines for configuration-driven development
- All probabilities remain in config files
- Using Football Manager-inspired data-dense UI patterns
- Maintaining compatibility with existing test scripts
