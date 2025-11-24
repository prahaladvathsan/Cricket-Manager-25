# Playstyle Display Rules

## Overview
This document clarifies how playstyles are displayed and configured for different player roles throughout the application.

## Display Rules by Role

### Batsmen
- **Primary Playstyle**: Batting playstyle (shown with ⭐)
- **Secondary Playstyle**: Bowling playstyle (if available)
- **In Team Selection**: Can configure both batting and bowling playstyles

### Bowlers
- **Primary Playstyle**: Bowling playstyle (shown with ⭐)
- **Secondary Playstyle**: Batting playstyle (shown with ⭐)
- **In Team Selection**: Can configure both batting and bowling playstyles

### All-Rounders
- **Primary Playstyle**: Batting playstyle (shown with ⭐)
- **Secondary Playstyle**: Bowling playstyle (shown with ⭐)
- **In Team Selection**: Can configure both batting and bowling playstyles

### Wicket-Keepers
- **Primary Playstyle**: Batting playstyle (shown with ⭐)
- **Secondary Playstyle**: Fielding playstyle (shown with ⭐)
- **In Team Selection**: Can configure batting and **fielding** playstyles (NOT bowling)

## Implementation Locations

### PlayerCard.jsx (Lines 87-98, compact variant)
```javascript
{player.role?.toLowerCase() === 'wicket-keeper' && player.primaryPlaystyle?.fielding ? (
  <span>{player.primaryPlaystyle.fielding}</span>
) : (
  <>
    {player.primaryPlaystyle?.batting && (
      <span>{player.primaryPlaystyle.batting}</span>
    )}
    {player.primaryPlaystyle?.bowling && (
      <span>| {player.primaryPlaystyle.bowling}</span>
    )}
  </>
)}
```

**Logic**:
- Wicket-keepers show fielding playstyle only
- All other roles show batting + bowling (if available)

### SquadPlaystyleTab.jsx (Lines 352-392)
**Batting Playstyle** (lines 328-349):
- All players can configure their batting playstyle
- Shows all batting playstyles with rating > 40
- Primary playstyle marked with ⭐

**Secondary Playstyle** (lines 352-392):
- **Wicket-keepers**: Show fielding playstyle (read-only display)
  - Shows top fielding playstyle rating (currently only "Wicketkeeper")
  - Marked with ⭐
- **All other roles**: Show bowling playstyle dropdown
  - Shows all bowling playstyles with rating > 40
  - Primary playstyle marked with ⭐

## Data Structure

### Player Object
```javascript
{
  primaryPlaystyle: {
    batting: "Opener - Balanced",    // All players
    bowling: "Swing Bowler",         // Batsmen, Bowlers, All-rounders
    fielding: "Wicketkeeper"         // Wicket-keepers only, null for others
  },
  playstyleRatings: {
    batting: { "Opener - Balanced": 85, ... },
    bowling: { "Swing Bowler": 72, ... },
    fielding: { "Wicketkeeper": 88 }  // All players have ratings
  },
  topPlaystyles: {
    batting: [{ name: "Opener - Balanced", rating: 85 }, ...],
    bowling: [{ name: "Swing Bowler", rating: 72 }, ...],
    fielding: [{ name: "Wicketkeeper", rating: 88 }]  // Empty [] for non-WK
  }
}
```

### Playstyle Overrides (Team Tactics)
```javascript
{
  playstyleOverrides: {
    "player-123": {
      batting: "Top Order - Anchor",   // Override for batting
      bowling: "Death Specialist",      // Override for bowling (non-WK)
      fielding: null                    // Fielding not overridable (read-only)
    }
  }
}
```

## Key Principles

1. **Batsmen**: Always show bowling playstyle as secondary (if available)
2. **Bowlers**: Always show batting playstyle as secondary (they bat too!)
3. **All-rounders**: Always show both batting and bowling playstyles
4. **Wicket-keepers**: Always show fielding playstyle instead of bowling
5. **Team Selection**:
   - Batting playstyle configurable for ALL players
   - Bowling playstyle configurable for non-wicketkeepers
   - Fielding playstyle displayed (read-only) for wicketkeepers only
6. **Extensibility**: Fielding category supports future playstyles (e.g., "Outfielder", "Slip Specialist") applicable to all players

## Why These Rules?

- **Batsmen show bowling**: Even specialist batsmen may bowl occasionally, so showing their bowling playstyle provides complete player information
- **Bowlers show batting**: All bowlers bat in the lineup (even at #11), so their batting playstyle matters
- **Wicket-keepers show fielding**: The fielding playstyle is more relevant than bowling for keepers, as it directly impacts their primary role
- **Consistency**: The ⭐ marker consistently indicates the player's primary (highest-rated) playstyle for each category
- **Future-proofing**: Using "fielding" instead of "wicketkeeping" allows expansion to other fielding specialists

## Related Files

- `src/components/shared/PlayerCard.jsx` - Player card display logic
- `src/components/tactics/tabs/SquadPlaystyleTab.jsx` - Team selection playstyle configuration
- `src/core/match-engine/interactive/TeamSelectionManager.js` - Team selection logic
- `src/utils/PlaystyleCalculator.js` - Playstyle rating calculations

## Last Updated
January 2025 (Updated to reflect fielding category rename from wicketkeeping)
