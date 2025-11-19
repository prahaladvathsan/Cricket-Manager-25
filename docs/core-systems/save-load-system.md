# Save/Load System

## Overview

The Save/Load System provides persistent game state management using browser LocalStorage. Players can save up to 10 games at any point during gameplay and resume exactly where they left off, including mid-auction and mid-match states.

**Status**: ✅ **Complete and Working** (January 2025)

## Key Features

### 1. Save Game Manager (`src/utils/SaveGameManager.js`)

Central utility class managing all save/load operations with LocalStorage.

**Features:**
- **Max 10 save slots** (0-9) with LocalStorage persistence
- **Save size optimization**: Player IDs only, not full objects (100-200KB per save vs 5MB+)
- **Custom Map serialization** for Finance store (Map ↔ Array conversion)
- **Metadata indexing** for fast load screen rendering
- **Save anywhere**: Dashboard, mid-auction, mid-match
- **Custom naming**: Optional 50-char custom names or auto-generated
- **Delete functionality**: Remove saves with index updates

**Key Methods:**
```javascript
// Get all save metadata
SaveGameManager.getAllSaves()  // Returns: Array<{ slot, timestamp, saveName, metadata }>

// Get specific save data
SaveGameManager.getSave(slot)  // Returns: Full save object or null

// Save current game state
SaveGameManager.saveGame(slot, stores, saveName)  // Returns: boolean (success)

// Load saved game
SaveGameManager.loadGame(slot, stores)  // Returns: boolean (success)

// Delete save
SaveGameManager.deleteSave(slot)  // Returns: boolean (success)

// Get empty slots
SaveGameManager.getEmptySlots()  // Returns: Array<number>

// Check if saves are full
SaveGameManager.isFull()  // Returns: boolean
```

### 2. Start Menu System (`src/components/menu/StartMenu.jsx`)

Entry point for the game with multiple menu options.

**Active Options:**
- ✅ **Start New Game**: Begin fresh career with team selection
- ✅ **Load Game**: Resume from saved game (navigates to `/load-game`)
- ✅ **Player Database Browser**: Explore 545 players with filters
- ✅ **Credits**: Game information and feature highlights

**Placeholder Options** (future):
- ⏸️ Quick Match
- ⏸️ Settings
- ⏸️ Tutorial
- ⏸️ Download Database

### 3. Load Game Screen (`src/components/menu/LoadGame.jsx`)

10-slot grid interface for loading and managing saves.

**Features:**
- Visual save slot cards with metadata
- Delete functionality for each save
- Smart navigation to appropriate screen (auction/dashboard/match)
- Empty slot indicators
- Last saved date/time display
- Team position and budget preview

### 4. Save Game Modal (`src/components/shared/SaveGameModal.jsx`)

In-game modal for saving during gameplay.

**Features:**
- 10-slot selection grid
- Optional custom save naming (50 char max)
- Overwrite existing saves
- Real-time save slot status
- Auto-generated names (e.g., "Mumbai Thunders - S1 Pre-Season")

### 5. Auction State Persistence (`src/stores/auctionStore.js`)

**NEW Zustand store** created specifically for auction state persistence.

**Stored State:**
```javascript
{
  auctionState: 'not_started' | 'in_progress' | 'completed',
  rounds: [[playerIds]],           // Player IDs only (not full objects)
  currentRound: number,
  currentPlayerIndex: number,
  soldPlayers: [
    { playerId, teamId, price }
  ]
}
```

**Key Methods:**
```javascript
// Initialize auction (from Auction.jsx)
auctionStore.initializeAuction(rounds)  // rounds = [[playerIds]]

// Record player sale
auctionStore.recordSale(playerId, teamId, price)

// Move to next player
auctionStore.nextPlayer()

// Complete auction
auctionStore.completeAuction()

// Reset auction
auctionStore.resetAuction()
```

### 6. Additional UI Components

**ErrorBoundary** (`src/components/shared/ErrorBoundary.jsx`):
- React error boundary for graceful error handling
- Displays user-friendly error messages
- Prevents full app crashes

**GameEventModal** (`src/components/shared/GameEventModal.jsx`):
- In-game event notifications (player signings, match results, etc.)
- Auto-dismissing or user-controlled
- Stacked notifications queue

**PlayerBrowser** (`src/components/menu/PlayerBrowser.jsx`):
- Browse all 545 players
- Filter by role, nationality, team
- Search by name
- Sort by attributes and playstyle ratings
- View detailed player cards

**Credits** (`src/components/menu/Credits.jsx`):
- Game information and version
- Feature highlights
- Technology stack
- Developer credits

## Technical Architecture

### Save Data Structure

```javascript
{
  version: '1.0.0',
  slot: 0,
  timestamp: '2025-11-02T12:00:00.000Z',
  saveName: 'Mumbai Thunders - S1 Pre-Season',

  // 7 Store States (optimized)
  gameState: {
    currentSeason, currentPhase, currentWeek, currentDate, settings
  },

  teamState: {
    teams, userTeamId,
    squadLists: { teamId: [playerIds] },  // Player IDs only!
    playerStats, teamStats
  },

  playerState: {
    careerStats, currentSeasonId
    // NOTE: Player database NOT saved (static data loaded from JSON)
  },

  leagueState: {
    seasonId, fixtures, results, standings, stats,
    playoffFixtures, playoffResults, champion
  },

  financeState: {
    teamFinances: [[teamId, finances], ...],  // Map serialized to array
    transactionHistory
  },

  matchState: {
    matchId, status, teams, innings, currentBall, tacticsState
  },

  auctionState: {
    auctionState, rounds: [[playerIds]], currentRound,
    currentPlayerIndex, soldPlayers
  },

  // Display Metadata
  metadata: {
    userTeamName, season, phase, matchday, position, budget
  }
}
```

### Auction Restoration Flow

```
1. Mount Auction Component
2. Check auctionState === 'in_progress' in auctionStore
3. Initialize AuctionEngine (calculate basePrices from player data)
4. Restore soldPlayers → Update team squads and budgets
5. Convert round player IDs → player objects (from engine's playerPool)
6. Set auction state (rounds, currentRound, currentPlayerIndex)
7. Start auction for current player
8. Resume UI with correct price/timer
```

**Key Implementation Details:**
- Engine must be initialized FIRST to calculate basePrices
- soldPlayers replayed to restore team squads and budgets
- Player IDs converted to objects using engine's playerPool
- State synchronization between auctionStore and Auction component

### LocalStorage Usage

```
Total: ~3-4MB (well under 5-10MB browser limit)
- Manual saves: 10 × 200KB = 2MB
- Zustand stores: 8 stores × ~100KB = 1-2MB

Keys:
- cm25_save_0 through cm25_save_9 (manual saves)
- cm25_saves_index (metadata index)
- gameStore, teamStore, playerStore, etc. (Zustand persistence)
```

### Save Size Optimization

**Before Optimization:**
- Full player database: 545 players × ~10KB = 5.45MB
- Result: QuotaExceededError after 2-3 saves

**After Optimization:**
- Player IDs only: 545 IDs × 4 bytes = ~2KB
- Player objects reconstructed on load from static JSON
- Result: 100-200KB per save (96%+ size reduction)

### Finance Map Serialization

The Finance store uses JavaScript Maps which cannot be directly serialized to JSON.

**Solution:**
```javascript
// Save: Map → Array
financeState: {
  teamFinances: financeState.teamFinances instanceof Map
    ? Array.from(financeState.teamFinances.entries())
    : Array.isArray(financeState.teamFinances)
      ? financeState.teamFinances
      : []
}

// Load: Array → Map
const teamFinancesMap = new Map(saveData.financeState.teamFinances);
stores.financeStore.setState({ teamFinances: teamFinancesMap });
```

## Integration Points

### 1. Header Save Button

**Location:** `src/components/layout/Header.jsx`

```jsx
<button
  onClick={() => setShowSaveModal(true)}
  className="btn-secondary"
>
  <Save className="w-4 h-4" />
  Save Game
</button>

{showSaveModal && (
  <SaveGameModal
    isOpen={showSaveModal}
    onClose={() => setShowSaveModal(false)}
  />
)}
```

### 2. Transfers Component Integration (Auction)

**Location:** `src/components/layout/Transfers.jsx`

```jsx
import useAuctionStore from '../../stores/auctionStore';

// On auction start
savedAuction.initializeAuction(roundsWithIds);

// On player sold
savedAuction.recordSale(player.id, winner.id, finalPrice);

// After each player
savedAuction.nextPlayer();

// On auction complete
savedAuction.completeAuction();

// On component mount (restore saved auction)
useEffect(() => {
  if (savedAuction.auctionState === 'in_progress') {
    // Restore auction state...
  }
}, []);
```

### 3. Smart Navigation on Load

**Location:** `src/components/menu/LoadGame.jsx`

```jsx
const handleLoadGame = (slot) => {
  const success = SaveGameManager.loadGame(slot, stores);

  if (success) {
    const auctionState = useAuctionStore.getState();

    // Check auction state first
    if (auctionState.auctionState === 'in_progress') {
      navigate('/game/auction');
    } else {
      // Use GameController to determine dashboard/match
      navigate('/game/dashboard');
    }
  }
};
```

### 4. Route Structure

**Location:** `src/App.jsx`

```jsx
<Routes>
  {/* Start Menu Routes */}
  <Route path="/" element={<StartMenu />} />
  <Route path="/load-game" element={<LoadGame />} />
  <Route path="/player-browser" element={<PlayerBrowser />} />
  <Route path="/credits" element={<Credits />} />

  {/* Game Routes (with Layout) */}
  <Route path="/game" element={<Layout />}>
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="league" element={<League />} />
    <Route path="squad" element={<Squad />} />
    <Route path="match" element={<Match />} />
    <Route path="auction" element={<Auction />} />
    <Route path="finances" element={<Finances />} />
  </Route>
</Routes>
```

## Usage Examples

### Saving a Game

```javascript
import SaveGameManager from '../utils/SaveGameManager';
import useGameStore from '../stores/gameStore';
import useTeamStore from '../stores/teamStore';
// ... import all stores

const stores = {
  gameStore: useGameStore,
  teamStore: useTeamStore,
  playerStore: usePlayerStore,
  leagueStore: useLeagueStore,
  financeStore: useFinanceStore,
  matchStore: useMatchStore,
  auctionStore: useAuctionStore,
  uiStore: useUIStore
};

// Save to slot 0 with custom name
const success = SaveGameManager.saveGame(
  0,
  stores,
  'My Championship Run'
);

// Save with auto-generated name
const success = SaveGameManager.saveGame(0, stores);
```

### Loading a Game

```javascript
// Load from slot 0
const success = SaveGameManager.loadGame(0, stores);

if (success) {
  // Navigate to appropriate screen
  const auctionState = useAuctionStore.getState();

  if (auctionState.auctionState === 'in_progress') {
    navigate('/game/auction');
  } else {
    navigate('/game/dashboard');
  }
}
```

### Checking Save Status

```javascript
// Get all saves
const saves = SaveGameManager.getAllSaves();
console.log(`${saves.length} saves found`);

// Get empty slots
const emptySlots = SaveGameManager.getEmptySlots();
console.log(`Empty slots: ${emptySlots.join(', ')}`);

// Check if saves are full
if (SaveGameManager.isFull()) {
  alert('Maximum 10 saves reached. Delete a save to create a new one.');
}
```

## Bugs Fixed During Implementation

### Bug #1: Mid-Auction Save/Load Navigation
- **Issue**: Loading mid-auction save returned to dashboard
- **Root Cause**: Hardcoded navigation + no auction state persistence
- **Fix**: Created auctionStore + smart navigation in LoadGame

### Bug #2: Sidebar Navigation Routing
- **Issue**: Sidebar links navigated to start menu instead of game pages
- **Root Cause**: Missing `/game` prefix in routes
- **Fix**: Updated all sidebar paths to `/game/*`

### Bug #3: Auction State Not Persisted
- **Issue**: Lost auction progress on save/load
- **Root Cause**: Local React state, not Zustand store
- **Fix**: Created auctionStore with Zustand persistence

### Bug #4: LocalStorage Quota Exceeded
- **Issue**: QuotaExceededError after 2-3 saves
- **Root Cause**: Saving full 545-player database (5MB+)
- **Fix**: Only store player IDs, reconstruct objects on load (200KB)

### Bug #5: NaN Bid Prices on Restore
- **Issue**: basePrices showed NaN after loading mid-auction save
- **Root Cause**: Not calculating basePrices on restore
- **Fix**: Initialize engine first, then restore state

### Bug #6: Auction Progress Lost on Restore
- **Issue**: Previous purchases not reflected in team squads
- **Root Cause**: Not replaying soldPlayers
- **Fix**: Restore purchases from soldPlayers[] before resuming

### Bug #7: Finance Map Serialization Error
- **Issue**: "Map is not serializable to JSON"
- **Root Cause**: Finance store uses Map, JSON doesn't support Maps
- **Fix**: instanceof checks + Array.from/new Map conversion

## Performance Metrics

- **Save operation**: <100ms (optimized data size)
- **Load operation**: <200ms (indexed metadata)
- **Save size**: 100-200KB per save (vs 5MB+ before optimization)
- **Storage efficiency**: 96%+ reduction in size
- **LocalStorage usage**: ~3-4MB total (well under browser limits)

## Known Limitations

- **Browser-only**: No cloud sync (LocalStorage is local to browser)
- **10 save limit**: Hard limit to prevent storage abuse
- **No compression**: Could compress saves further with LZ-string
- **No validation**: Corrupted saves may fail to load
- **No versioning**: Save format changes may break old saves

## Future Enhancements

### Planned (Out of Current Scope)
- **Auto-save functionality**: Save after each major event
- **Cloud save sync**: Cross-device save synchronization
- **Save file export/import**: Share saves or backup externally
- **Save file compression**: Use LZ-string for smaller saves
- **Save file validation**: Detect and repair corrupted saves
- **Save versioning**: Migration system for format changes
- **Multiple profiles**: Support multiple player profiles

## Files Created

**Core System:**
- `src/utils/SaveGameManager.js` - Save/load logic
- `src/stores/auctionStore.js` - Auction state persistence

**UI Components:**
- `src/components/menu/StartMenu.jsx` - Main menu
- `src/components/menu/LoadGame.jsx` - Load screen
- `src/components/menu/PlayerBrowser.jsx` - Player database
- `src/components/menu/Credits.jsx` - Credits page
- `src/components/shared/SaveGameModal.jsx` - Save UI
- `src/components/shared/ErrorBoundary.jsx` - Error handling
- `src/components/shared/GameEventModal.jsx` - Event notifications

## Files Modified

**Integration:**
- `src/App.jsx` - Route restructuring
- `src/components/layout/Header.jsx` - Save button
- `src/components/layout/Sidebar.jsx` - Navigation fixes
- `src/components/auction/Auction.jsx` - Store integration

**Stores (Verified/Fixed):**
- `src/stores/gameStore.js` - Verified persistence
- `src/stores/teamStore.js` - Player ID optimization
- `src/stores/playerStore.js` - Static data handling
- `src/stores/financeStore.js` - Map serialization
- `src/stores/matchStore.js` - Verified persistence
- `src/stores/uiStore.js` - Verified persistence

## Testing Checklist

### Core Functionality ✅
- [x] Save game from dashboard
- [x] Save game mid-auction
- [x] Load game to dashboard
- [x] Load game mid-auction (resumes correctly)
- [x] Delete save
- [x] Overwrite existing save
- [x] Custom save naming
- [x] Auto-generated save names
- [x] 10 save slot limit

### Auction Integration ✅
- [x] Auction state persisted
- [x] Auction progress restored (rounds, current player)
- [x] Team squads restored correctly
- [x] Team budgets restored correctly
- [x] Player prices calculated correctly on restore

### Edge Cases ✅
- [x] Load with no saves (empty load screen)
- [x] Save when slots full (overwrite required)
- [x] Invalid slot number (error handling)
- [x] Corrupted save data (graceful failure)
- [x] LocalStorage quota exceeded (prevented by optimization)

## Best Practices Applied

1. **Single source of truth**: auctionStore for auction state
2. **Minimal essential state**: IDs only, reconstruct objects
3. **Defensive programming**: instanceof checks, fallbacks
4. **User-centric navigation**: Smart routing based on game state
5. **Error handling**: Try-catch blocks, user-friendly messages
6. **Performance optimization**: Indexed metadata, ID-only storage
7. **Separation of concerns**: SaveGameManager utility, dedicated stores

## References

- **Implementation Notes**: `docs/dev/implementation-notes/save-load-system/`
- **Design System**: `docs/frontend/design-system.md`
- **State Management**: `docs/frontend/state-management.md`
- **Auction System**: `docs/core-systems/auction-system.md`

---

**Last Updated**: January 2025
**Status**: ✅ Complete and Working
**Implementation Time**: ~2 days
**Lines of Code**: ~2000+ (9 new files, 10 modified files)
