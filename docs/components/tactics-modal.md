# Set Tactics Modal Component

**Component**: `SetTacticsModal.jsx`
**Location**: `src/components/tactics/`
**Status**: ✅ Complete (Updated January 2025)

## Overview

Full-screen modal for comprehensive team tactics configuration before matches. Provides four tabs for configuring squad selection, playstyle overrides, batting order, acceleration tiers, bowling assignments, and bowling plans.

## Component Structure

```jsx
<SetTacticsModal isOpen={boolean} onClose={function} teamId={string} />
```

### Props

- `isOpen` (boolean): Controls modal visibility
- `onClose` (function): Callback when modal is closed
- `teamId` (string): ID of team to configure tactics for

## Features

### Modal Layout
- **Full-screen**: 98vw × 98vh with minimal padding (p-2)
- **Compact header**: Text-lg title, small icons (w-4 h-4)
- **Compact tabs**: Text-xs with 3.5px icons
- **Maximized content area**: Flex-1 with overflow-y-auto

### Tabs

#### 1. Squad & Playstyles
**Component**: `SquadPlaystyleTab.jsx`

**Purpose**: Select 11-player squad and override playstyles

**Features**:
- Two-column layout: Available Squad | Playing XI
- Search and role filtering
- Drag/drop or click to add/remove players
- Independent batting and bowling playstyle overrides
- Validation warnings (11 players, wicket-keeper, 5 bowlers)
- Primary playstyle ratings displayed (0-100 scale)

**Data Updates**:
- `updateSquadSelection(teamId, playerIds)` - Auto-syncs batting order
- `updatePlaystyleOverride(teamId, playerId, {batting, bowling})`

#### 2. Batting Order
**Component**: `BattingOrderTab.jsx`

**Purpose**: Set batting order and acceleration tiers

**Features**:
- Unified list (order + acceleration merged)
- Move buttons (up/down) for reordering
- Position labels with colors:
  - 1-2: Opener (blue)
  - 3-4: Top (green)
  - 5-6: Middle (yellow)
  - 7-8: Lower (orange)
  - 9-11: Tail (red)
- Displays: Name, Playstyle, Rating, Acceleration Dropdown
- Legend section with position definitions and tier guide

**Data Updates**:
- `updateBattingOrder(teamId, orderedPlayerIds)`
- `updateAccelerationTier(teamId, playerId, tier)`

**Acceleration Tiers** (from `tactics-config.json`):
- Very Slow (Blockade)
- Slow (Build)
- Medium (Rotate)
- Fast (Cruise)
- Very Fast (Blitz)

#### 3. Bowling Plans
**Component**: `BowlingPlansTab.jsx`

**Purpose**: Assign bowlers to overs and configure bowling plans

**Features**:
- **Main section**: 20 over assignments (4-column grid)
  - Each over has dropdown with bowlers
  - Optgroups: Primary Bowlers | Part-timers
  - Shows bowler name and rating
  - Validation warnings (>4 overs, unassigned)

- **Side panel**: Bowling plans for assigned bowlers
  - Only shows bowlers assigned to ≥1 over
  - Displays: Name, Type (Pace/Spin), Playstyle, Rating
  - Line-Length plan dropdown (4 options)
  - Variation plan dropdown (4 options)
  - Star indicator for playstyle-boosted plans (+10)

**Bowler Classification**:
- **Primary**: `role === 'bowler' || role === 'all-rounder'`
- **Part-timer**: `bowlingRating > 40 && role !== 'bowler'`

**Default Plans**:
- Line-Length: "Wide Line"
- Variation: "Consistent Accuracy"

**Data Updates**:
- `updateBowlingRotation(teamId, overAssignments)` - 20-element array
- `updateBowlingPlans(teamId, playerId, {lineLength, variation})`

#### 4. Fielding
**Component**: `FieldingTab.jsx`

**Purpose**: Set field formation

**Features**:
- Field formation selector (Attacking/Neutral/Defensive)
- Preview of field positions (future enhancement)

**Data Updates**:
- `updateFieldFormation(teamId, formation)`

### Actions

- **Reset to Defaults**: Reinitializes all tactics from player defaults
- **Cancel**: Closes modal without validation
- **Save Tactics**: Validates and saves (closes modal if valid)

### Validation

**Required**:
- ✅ 11 players selected
- ✅ At least 1 wicket-keeper
- ✅ At least 5 bowling options

**Warnings** (non-blocking):
- ⚠️ Bowler assigned >4 overs
- ⚠️ Unassigned overs remain

## Store Integration

### State Structure

```javascript
teamTactics: {
  [teamId]: {
    squadSelection: string[],        // 11 player IDs
    playstyleOverrides: {
      [playerId]: {
        batting?: string,
        bowling?: string
      }
    },
    battingOrder: string[],           // Synced with squadSelection
    accelerationTiers: {
      [playerId]: string              // Tier name
    },
    bowlingPlans: {
      [playerId]: {
        lineLength: string,
        variation: string
      }
    },
    bowlingRotation: string[],        // 20-element array (over assignments)
    fieldFormation: string            // 'attacking' | 'neutral' | 'defensive'
  }
}
```

### Store Methods

**teamStore.js**:
- `getTeamTactics(teamId)` → TeamTactics
- `initializeDefaultTactics(teamId, players)` → void
- `resetTacticsToDefaults(teamId, players)` → void
- `updateSquadSelection(teamId, playerIds)` → void (auto-syncs battingOrder)
- `updatePlaystyleOverride(teamId, playerId, {batting, bowling})` → void
- `updateBattingOrder(teamId, orderedPlayerIds)` → void
- `updateAccelerationTier(teamId, playerId, tier)` → void
- `updateBowlingPlans(teamId, playerId, {lineLength, variation})` → void
- `updateBowlingRotation(teamId, overAssignments)` → void
- `updateFieldFormation(teamId, formation)` → void

## Design Patterns

### Data Synchronization
- Squad selection changes automatically sync to batting order
- Removed players are cleaned from all tactics data
- Existing players maintain their positions and settings

### Playstyle Override System
- Separate batting and bowling overrides
- `null` or `undefined` means "use primary playstyle"
- Star (⭐) indicator for primary playstyles
- Yellow "(Override)" label for non-primary selections

### Rating Display
- Primary playstyle ratings (0-100 scale) from `ratingHelper.js`
- Format: "78.5" or "N/A"
- Displayed consistently across all tabs

### Validation Strategy
- Real-time validation (non-blocking warnings)
- Save-time validation (blocking errors)
- Clear error messages in warning banner

## Usage Example

```jsx
import SetTacticsModal from '../components/tactics/SetTacticsModal';

const Squad = () => {
  const [showTactics, setShowTactics] = useState(false);
  const { getUserTeam } = useTeamStore();
  const userTeam = getUserTeam();

  return (
    <div>
      <button onClick={() => setShowTactics(true)}>
        Set Tactics
      </button>

      <SetTacticsModal
        isOpen={showTactics}
        onClose={() => setShowTactics(false)}
        teamId={userTeam?.id}
      />
    </div>
  );
};
```

## Performance Considerations

- Uses `useMemo` for derived data (filtered lists, sorted players)
- Minimal re-renders via selective store subscriptions
- Efficient dropdown rendering (optgroups prevent long flat lists)

## Accessibility

- Keyboard navigation support (tab, enter, arrow keys)
- Clear labels for all inputs
- Color-coding with text labels (not color-only)
- Focus management on modal open/close

## Future Enhancements

- [ ] Drag-and-drop for batting order
- [ ] Drag-and-drop for over assignments
- [ ] Quick-fill presets for bowling rotation
- [ ] Visual field position editor
- [ ] Undo/redo for tactics changes
- [ ] Tactics templates (save/load configurations)
- [ ] Opponent tactics analysis
- [ ] AI suggestions based on playstyles

## Related Documentation

- [Playstyle System](../core-systems/playstyle-system.md)
- [Tactics System](../core-systems/tactics-system.md)
- [Rating Helper](../api/rating-helper.md)
- [Team Store API](../api/stores-api.md#teamstore)

---

**Last Updated**: January 2025
