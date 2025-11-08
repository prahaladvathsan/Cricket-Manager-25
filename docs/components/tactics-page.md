# Tactics Page

## Overview

Full-page interface for managing team tactics, converted from SetTacticsModal. Accessible via sidebar navigation or `/game/tactics` route.

**Location**: `src/components/tactics/TacticsPage.jsx`

## Purpose

Configure playing XI, batting order, bowling plans, and fielding positions. Validation flow changed from "Save" to "Validate" with success message.

## Features

**Four tabs**:
1. **Squad & Playstyle** - Select 11 players, view team playstyle distribution
2. **Batting Order** - Arrange batting order (1-11)
3. **Bowling Plans** - Assign bowlers to overs, set bowling plans
4. **Fielding** - Set captain and wicketkeeper

**Validation**:
- No auto-save on tab change
- Click "Validate Tactics" button to check rules
- Shows success message if valid
- Shows error list if invalid

**Utilities**:
- Reset to defaults button (top-right)
- Player card modal (click player for details)

## Component Structure

```
TacticsPage.jsx
├── SquadPlaystyleTab         (src/components/tactics/tabs/)
├── BattingOrderTab
├── BowlingPlansTab
├── FieldingTab
└── PlayerCardModal           (src/components/shared/)
```

## Tab Details

### 1. Squad & Playstyle Tab

**Features**:
- Player selection grid (available → selected)
- Squad validation (11 players, role requirements)
- Playstyle distribution chart
- Role breakdown (batsmen, bowlers, all-rounders)

**Validation rules**:
- Exactly 11 players
- At least 1 wicketkeeper
- At least 4 specialist batsmen
- At least 4 specialist bowlers

### 2. Batting Order Tab

**Features**:
- Drag-and-drop reordering
- Role indicators (batsman/all-rounder)
- Openers highlighted
- Auto-numbering (1-11)

**Validation rules**:
- All 11 positions filled
- Logical order (batsmen before bowlers typically)

### 3. Bowling Plans Tab

**Features**:
- Assign bowlers to over groups (1-6, 7-14, 15-20)
- Set bowling plan for each over group (aggressive, defensive, yorker, etc.)
- Max 4 overs per bowler enforcement
- Visual over allocation bars

**Validation rules**:
- All 20 overs assigned
- No bowler exceeds 4 overs
- Only bowlers/all-rounders selectable

### 4. Fielding Tab

**Features**:
- Captain selection dropdown
- Wicketkeeper selection dropdown
- Role display for selected players

**Validation rules**:
- Captain selected
- Wicketkeeper selected
- Wicketkeeper must have keeper role

## Validation Flow

**Old (Modal)**:
- Click "Save Tactics"
- Validates all tabs
- Closes modal if valid, shows errors if invalid

**New (Page)**:
- Click "Validate Tactics"
- Validates all tabs
- Shows success message if valid (tactics auto-saved)
- Shows error list if invalid
- User stays on page

**Implementation**:
```javascript
// TacticsPage.jsx:80-111
const handleValidate = () => {
  const errors = validateTactics(teamId, teamTactics, teamPlayers);

  if (errors.length === 0) {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  } else {
    setValidationErrors(errors);
  }
};
```

**Success state**: Green banner at top for 3 seconds

**Error state**: Red banner with bullet list of errors

## Player Card Modal

**Trigger**: Click any player in tactics tabs

**Shows**:
- Full player attributes
- Career statistics
- Playstyle ratings
- Role and nationality

**Location**: `src/components/shared/PlayerCardModal.jsx`

## State Management

**Store**: `teamStore`

**Key methods**:
```javascript
const {
  getTeamTactics,        // Get current tactics
  updateTactics,         // Save tactics (called by validate)
  hasTactics,            // Check if tactics exist
  initializeDefaultTactics,  // Create default tactics
  resetTacticsToDefaults     // Reset button
} = useTeamStore();
```

**Tactics structure**:
```javascript
{
  selectedSquad: ['player1', 'player2', ...],  // 11 player IDs
  battingOrder: ['player1', 'player2', ...],   // 11 player IDs in order
  bowlingPlan: {
    powerplay: ['bowler1', 'bowler2'],         // Overs 1-6
    middle: ['bowler3', 'bowler4'],            // Overs 7-14
    death: ['bowler1', 'bowler5']              // Overs 15-20
  },
  bowlingPlans: {
    powerplay: 'aggressive',
    middle: 'defensive',
    death: 'yorker'
  },
  captain: 'player1',
  wicketKeeper: 'player2'
}
```

## Navigation

**Routes**:
- Path: `/game/tactics`
- Sidebar: "Tactics" nav item (Shield icon)

**Access points**:
- Sidebar navigation
- Match reminder messages ("Set your tactics!")
- Pre-match flow (future)

## Styling

**Layout**: Full-height page with header and tabbed content

**Theme**: Cricket Manager dark theme
- Cricket green tabs
- Compact spacing (p-2, p-3)
- Data-dense layout

**Icons**: Lucide React
- Users (squad)
- Target (batting)
- Activity (bowling)
- Shield (fielding)
- RotateCcw (reset)
- CheckCircle (validate)

## Auto-Initialization

**Logic**: If tactics don't exist and squad has players, auto-create default tactics

**Implementation**:
```javascript
// TacticsPage.jsx:42-48
useEffect(() => {
  if (teamId && !hasTactics(teamId) && teamPlayers.length > 0) {
    initializeDefaultTactics(teamId, teamPlayers);
  }
}, [teamId, hasTactics, initializeDefaultTactics, teamPlayers]);
```

**Default tactics**:
- Squad: First 11 players sorted by rating
- Batting order: Sorted by batting rating
- Bowling plan: Even distribution across phases
- Captain: Highest-rated player
- Wicketkeeper: First keeper found

## Gotchas

1. **No auto-save** - Must click "Validate Tactics" to save
2. **Success message auto-hides** - 3-second timeout (not dismissible)
3. **Tab switching** - Does NOT validate on tab change (can have invalid state)
4. **Reset confirmation** - No "Are you sure?" dialog (instant reset)
5. **Player modal scroll** - Modal content scrollable if player has long stats
6. **Initialization timing** - Requires teamPlayers loaded (async)

## Future Enhancements

1. **Pre-match tactics** - Auto-open before user matches
2. **Opponent analysis** - Show opponent squad/tactics
3. **Formations** - Visual field positioning (2D)
4. **Quick tactics** - Presets (aggressive, defensive, balanced)
5. **Matchup analysis** - Highlight favorable/unfavorable matchups
6. **Undo/redo** - Tactics change history
