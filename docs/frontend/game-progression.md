# Game Progression System

## Overview
The game progression system manages the flow from preseason through league matches to playoffs, using event-based modals triggered by the Continue button in the Header.

## Architecture

### Core Components
- **GameController** (`src/core/game/GameController.js`) - Analyzes game state and determines next events
- **GameEventModal** (`src/components/shared/GameEventModal.jsx`) - Displays events and action buttons
- **Header** (`src/components/layout/Header.jsx`) - Contains Continue button and handles event actions

### Event Flow
```
User clicks Continue → GameController.getNextEvent() → Modal displays event → User chooses action → Navigate/Execute
```

## Event Types

| Event Type | Trigger | Action |
|------------|---------|--------|
| `team_selection` | No user team selected | Navigate to team selection |
| `auction` | Team selected but no squad | Navigate to auction page |
| `season_start` | Squad complete, preseason | Initialize league fixtures |
| `match` | User's next league match | Play or simulate match |
| `simulate_others` | Other teams' matches pending | Simulate AI matches |
| `league_end` | All league matches complete | Transition to playoffs |
| `playoff_match` | User's playoff match | Play or simulate playoff |
| `season_end` | Playoffs complete | Season summary |

## GameController Logic

```javascript
getNextEvent() {
  // Check current phase (preseason/league/playoffs/offseason)
  // Check team state (selected, squad built)
  // Check fixtures (user's next match, pending matches)
  // Return event object: { type, message, data }
}
```

**Key Methods:**
- `getNextEvent()` - Returns next event based on game state
- `initializeLeagueSeason()` - Start league phase
- `startPlayoffs()` - Transition to playoffs
- `endSeason()` - Move to offseason

## Store Integration

GameController accesses Zustand stores directly (hooks already return state):
```javascript
const { currentPhase } = this.gameStore;           // NOT .getState()
const { fixtures, results } = this.leagueStore;
const { userTeamId } = this.teamStore;
```

## Modal Configuration

GameEventModal uses `getEventConfig()` to determine:
- Icon (Trophy, Target, Calendar, CheckCircle)
- Title and description
- Action button label
- Show/hide Simulate button

## Implementation Status

### ✅ Working
- Continue button triggers GameController
- Modal displays appropriate event
- Proper Zustand store access pattern

### 🚧 In Progress
- Navigation to specific pages (auction, match, team selection)
- Event action handling (currently logs to console)
- Match simulation integration

## Next Steps (Phase 5)

1. **Add React Router navigation** in Header.jsx `handleEventAction()`
2. **Create missing pages**:
   - Team Selection page
   - Auction page (adapt from `src/test/auctionTest.js`)
   - Match page (adapt from `src/test/interactiveMatchTest.js`)
3. **Implement action handlers**:
   - `season_start` → Initialize fixtures in leagueStore
   - `match` → Navigate to `/match/:id` with match data
   - `simulate_others` → Run AI match simulation
4. **State persistence**: Save game state to LocalStorage

## Code Examples

### Triggering Event Flow
```javascript
// Header.jsx - handleContinue
const handleContinue = () => {
  const nextEvent = gameController.getNextEvent();
  setCurrentEvent(nextEvent);
  setShowEventModal(true);
};
```

### Handling Event Actions
```javascript
// Header.jsx - handleEventAction
const handleEventAction = (shouldSimulate) => {
  switch (currentEvent.type) {
    case 'auction':
      navigate('/auction');  // TODO: Add navigation
      break;
    case 'match':
      if (shouldSimulate) {
        // Simulate match logic
      } else {
        navigate(`/match/${currentEvent.data.id}`);
      }
      break;
  }
};
```

## Files Reference
- Core logic: `src/core/game/GameController.js`
- Modal UI: `src/components/shared/GameEventModal.jsx`
- Integration: `src/components/layout/Header.jsx`
- State: `src/stores/{gameStore,leagueStore,teamStore}.js`
