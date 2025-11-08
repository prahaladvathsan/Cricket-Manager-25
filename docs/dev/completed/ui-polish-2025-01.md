# UI Polish & Tactics Redesign - January 2025

**Status**: ✅ Completed
**Date**: January 2025
**Estimated Time**: 10-13 hours
**Actual Time**: ~8 hours

## Overview

Comprehensive UI polish and tactics system redesign to improve usability, fix critical bugs, and implement proper over-by-over bowling assignment.

## Objectives

1. Fix global "rating" bug affecting multiple components
2. Redesign Squad Overview with sortable/filterable table
3. Expand Set Tactics Modal to full-screen
4. Fix data persistence between tactics tabs
5. Add bowling playstyle selection
6. Redesign Batting Order tab with merged controls
7. Complete redesign of Bowling Plans tab with over-by-over assignment

## Implementation Summary

### 1. Global Rating Bug Fix

**Problem**: Multiple components referenced `player.rating` which doesn't exist in player objects.

**Solution**:
- Created `src/utils/ratingHelper.js` with functions:
  - `getPrimaryBattingRating(player)` - Gets primary batting playstyle rating (0-100)
  - `getPrimaryBowlingRating(player)` - Gets primary bowling playstyle rating (0-100)
  - `getPlayerRating(player)` - Gets appropriate rating based on role
  - `formatRating(rating, decimals)` - Formats rating for display

**Files Modified**:
- `src/utils/ratingHelper.js` (NEW)
- `src/components/team/Squad.jsx`
- `src/components/tactics/tabs/SquadPlaystyleTab.jsx`

### 2. Squad Overview Table Redesign

**Problem**: Squad view used player cards in categorized groups, limiting visibility and comparison.

**Solution**:
- Replaced categorized player cards with sortable/filterable table
- **Columns**:
  1. Player (name)
  2. Age
  3. Nationality
  4. Role
  5. Batting Hand (R/L)
  6. Bowling Style
  7. Batting Playstyle (name + rating)
  8. Bowling Playstyle (name + rating)
  9. Auction Value (₹ Cr)

**Features**:
- Click column headers to sort (ascending/descending)
- Search filter (by name)
- Role filter dropdown
- Nationality filter dropdown
- Results counter
- Alternating row colors for readability
- Hover highlighting

**Files Modified**:
- `src/components/team/Squad.jsx`

### 3. Set Tactics Modal Full-Screen

**Problem**: Modal at 90vh max height didn't provide enough space for complex tactics configuration.

**Solution**:
- Expanded to 98vw × 98vh (near full-screen)
- Reduced padding from p-4 to p-2/p-3
- Compact header (text-lg instead of text-xl)
- Compact tabs (text-xs, smaller icons)
- Compact action buttons (text-xs)

**Files Modified**:
- `src/components/tactics/SetTacticsModal.jsx`

### 4. Data Persistence Bug Fix

**Problem**: Squad selection changes in "Squad & Playstyles" tab didn't sync to "Batting Order" tab.

**Root Cause**: `updateSquadSelection()` only updated `squadSelection` field, not `battingOrder`.

**Solution**:
Enhanced `updateSquadSelection()` in `teamStore.js` to:
1. Keep existing players in their batting order positions
2. Add new players at the end
3. Clean up tactics data for removed players (acceleration tiers, bowling plans, playstyle overrides)

**Files Modified**:
- `src/stores/teamStore.js` (lines 354-408)

### 5. Bowling Playstyle Dropdown

**Problem**: Squad & Playstyles tab only allowed batting playstyle changes.

**Solution**:
- Updated `updatePlaystyleOverride()` to accept object: `{batting?: string, bowling?: string}`
- Added `handleBowlingPlaystyleChange()` handler
- Added `getAvailableBowlingPlaystyles()` helper
- UI shows both batting and bowling dropdowns (bowling only shown if player has bowling playstyles with rating > 40)

**Files Modified**:
- `src/stores/teamStore.js` (lines 410-447)
- `src/components/tactics/tabs/SquadPlaystyleTab.jsx`

### 6. Batting Order Tab Redesign

**Problem**:
- Separate boxes for order and acceleration
- Incorrect position labels
- Displayed unnecessary attributes

**Solution**:
- Merged order and acceleration into single unified list
- **Correct position labels**:
  - 1-2: Opener (blue)
  - 3-4: Top (green)
  - 5-6: Middle (yellow)
  - 7-8: Lower (orange)
  - 9-11: Tail (red)
- Each row shows:
  - Move buttons (up/down)
  - Position number + label
  - Player name
  - Batting playstyle (with override detection)
  - Primary batting playstyle rating
  - Acceleration tier dropdown
- Removed: Role, individual attributes
- Added legend section with position definitions and acceleration guide

**Files Modified**:
- `src/components/tactics/tabs/BattingOrderTab.jsx`

### 7. Bowling Plans Tab Complete Redesign

**Problem**:
- 1-6 rotation didn't allow precise over assignment
- No way to plan bowling changes
- No part-timer support

**Solution**:
- **Main Section**: Over-by-over assignment (20 overs)
  - Each over has dropdown to assign bowler
  - Bowlers organized in optgroups:
    - **Primary Bowlers**: role === 'bowler' OR 'all-rounder'
    - **Part-timers**: bowling rating > 40
  - Shows bowler name and rating in dropdown

- **Side Panel**: Bowling plans for assigned bowlers
  - Only shows bowlers assigned to at least one over
  - For each bowler:
    - Name, type (Pace/Spin), playstyle, rating
    - Line-Length plan dropdown
    - Variation plan dropdown
    - Plans default to Wide Line + Consistent Accuracy
    - Star indicator for playstyle-boosted plans

- **Validation**:
  - Warning if bowler assigned > 4 overs
  - Warning if unassigned overs remain
  - Real-time warning display

**Files Modified**:
- `src/components/tactics/tabs/BowlingPlansTab.jsx`

## Technical Details

### Store Schema Changes

**teamTactics object**:
```javascript
{
  squadSelection: string[],           // 11 player IDs
  playstyleOverrides: {               // Changed from string to object
    [playerId]: {
      batting?: string,
      bowling?: string
    }
  },
  battingOrder: string[],             // Synced with squadSelection
  accelerationTiers: {
    [playerId]: string
  },
  bowlingPlans: {
    [playerId]: {
      lineLength: string,
      variation: string
    }
  },
  bowlingRotation: string[],          // Changed to 20-element array (over assignments)
  fieldFormation: string
}
```

### Helper Functions

**ratingHelper.js exports**:
- `getPrimaryBattingRating(player)` → number
- `getPrimaryBowlingRating(player)` → number
- `getPlayerRating(player)` → number (role-based)
- `formatRating(rating, decimals)` → string
- `getPlayerRatings(player)` → {batting, bowling}

## Files Changed

1. `src/utils/ratingHelper.js` (NEW - 117 lines)
2. `src/components/team/Squad.jsx` (complete table redesign)
3. `src/components/tactics/SetTacticsModal.jsx` (full-screen + compact)
4. `src/components/tactics/tabs/SquadPlaystyleTab.jsx` (bowling dropdown + rating fix)
5. `src/components/tactics/tabs/BattingOrderTab.jsx` (complete redesign)
6. `src/components/tactics/tabs/BowlingPlansTab.jsx` (complete redesign)
7. `src/stores/teamStore.js` (enhanced sync logic)

## Testing Notes

- All changes tested with dev server hot reload
- Data persistence verified across tab switches
- Playstyle overrides properly saved and loaded
- Bowling rotation properly saved to store
- Rating display consistent across all components

## Future Enhancements

- [ ] Drag-and-drop for batting order
- [ ] Drag-and-drop for over assignments
- [ ] Quick-fill buttons for bowling rotation (e.g., "Auto-assign primary bowlers")
- [ ] Bowling rotation presets (e.g., "Death specialist overs 16-20")
- [ ] Visual indicators for consecutive overs warning
- [ ] Undo/redo for tactics changes

## Lessons Learned

1. **Data flow debugging**: Always check store methods for proper state updates
2. **Component coupling**: Squad selection should auto-sync dependent data (batting order, etc.)
3. **Playstyle overrides**: Separate batting/bowling overrides prevent data loss
4. **Validation UX**: Real-time warnings better than blocking validation
5. **Compact design**: Reducing padding/font sizes dramatically improves information density

## References

- Original requirements: User messages (2025-01-04)
- Design inspiration: Football Manager series
- Playstyle system: `docs/core-systems/playstyle-system.md`
- Tactics engine: `docs/core-systems/tactics-system.md`
