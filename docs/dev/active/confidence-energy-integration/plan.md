# Confidence & Energy Systems - Full Integration Plan

**Status**: In Progress
**Started**: 2025-01-20
**Feature Type**: Core System Integration + UI Enhancement

## Overview

Complete the integration of confidence and energy mechanisms into the match engine and create immersive, data-dense UI components to display real-time player conditions and modifier breakdowns.

## Current State

**Backend (60% complete)**:
- ✅ ConfidenceManager.js and EnergyManager.js fully implemented
- ✅ Configuration files complete with all triggers
- ✅ Integration into TacticsModifierSystem (Stages 4 & 5)
- ✅ Initialization at match start
- ✅ Energy updates for batting/bowling
- ❌ Confidence updates (never called)
- ❌ Fielding energy depletion (defined but not called)
- ❌ Morale updates after match

**UI (0% complete)**:
- No condition displays during matches
- No modifier breakdown visibility

## Goals

1. **Core Integration**: Activate confidence updates, add fielding energy, implement morale tracking
2. **Immersive UI**: Create data-dense Football Manager-style condition and modifier displays

## Executive Decisions

**UI Design**:
- **TacticsHub tabs**: Thin horizontal bars (4px height) below player names with numeric values
- **Live Scorecard**: Hover-to-expand overlay showing full modifier breakdown for next ball
- **Expansion layout**: Side-by-side (Striker | Bowler)
- **Modifiers**: Category-grouped by 7-stage system, non-zero only
- **Pinning**: Pin button to keep expansion open across balls
- **Colors**: Green (#22C55E) for energy, Gold (#D4AF37) for confidence

**Data Tracking**:
- Full implementation: Milestones (25/50 runs), run-rate based over targets, consecutive dots, wicket hauls
- Fielding energy: Deplete on every fielded ball (-1 per ball)

**Technical**:
- Calculate modifiers once before ball simulation, store, reuse
- Next ball preview in UI (show upcoming calculation before simulation)

## Implementation Phases

### Phase 1: Documentation Setup ✅
- Create active feature folder with plan.md, context.md, tasks.md

### Phase 2: Core Integration ✅
1. Add match situation tracking (consecutiveDots, overTargets, milestones)
2. Modify TacticsModifierSystem to return breakdown
3. Store breakdown during simulation with timing delay
4. Implement post-ball confidence updates
5. Implement fielding energy depletion
6. Implement morale updates after match

### Phase 3: UI Components ✅
1. Create ConditionBar.jsx (thin bars, 60px × 4px)
2. Create ModifierBreakdownPanel.jsx (split-screen with tactical details)
3. Update Live Scorecard with hover expansion
4. Add condition bars to TacticsHub Batting Order tab
5. Add condition bars to TacticsHub Bowling Plans tab
6. Update PlayerName tooltips with conditions

### Phase 4: Store Integration
- Update matchStore with tracking state and modifier breakdown
- Add helper actions for condition levels

### Phase 5: Testing
- Run existing tests (minimal approach)
- Manual visual testing in dev server

### Phase 6: Documentation
- Update context.md continuously
- Move to completed folder when done
- Update system documentation

## Success Criteria

✅ Confidence updates ball-by-ball based on performance
✅ Energy depletes for batting, bowling, and fielding
✅ Morale updates after match
✅ Live Scorecard expands on hover with modifier breakdown
✅ Breakdown shows next ball preview (side-by-side layout)
✅ Pin button keeps breakdown open
✅ TacticsHub shows thin condition bars with values
✅ Silent updates (color changes only, no animations)
✅ Existing tests pass

## Time Estimate

Total: 10-12 hours

## File Impact

**New Files (2)**:
- `src/components/shared/ConditionBar.jsx`
- `src/components/match/matchday/ModifierBreakdownPanel.jsx`

**Modified Files (7)**:
- `src/core/match-engine/core/MatchEngine.js` (major)
- `src/core/tactics/TacticsModifierSystem.js` (major)
- `src/stores/matchStore.js` (minor)
- `src/components/match/matchday/MatchdayUI.jsx` (moderate)
- `src/components/match/matchday/TacticsHub/TacticsHub.jsx` (moderate)
- `src/components/shared/PlayerName.jsx` (minor)
- `src/core/tactics/ConfidenceManager.js` (minor tweaks)

**Estimated LOC**: ~730 lines
