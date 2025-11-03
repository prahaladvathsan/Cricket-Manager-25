# Critical Fixes Summary - Action Plan

**Generated**: 2025-11-02
**Priority**: URGENT - These issues prevent core functionality

---

## Issue #1: Match Simulation Broken

**File**: `src/components/match/Match.jsx`
**Lines**: 66-98, 101-161
**Status**: NON-FUNCTIONAL

### Problem
Match component creates MatchEngine but never initializes matchStore. The `handleStartMatch()` function calls `matchEngine.startMatch()` which expects the store to already contain match data, but it's empty.

### Fix Checklist
```javascript
// ❌ Current (broken)
const handleStartMatch = async () => {
  await matchEngine.startMatch(matchData); // matchStore is empty!
};

// ✅ Fixed version
const handleStartMatch = async () => {
  // 1. Initialize store FIRST
  matchStore.getState().initializeMatch({
    homeTeam: matchData.homeTeam,
    awayTeam: matchData.awayTeam,
    venue: matchData.venue,
    tossWinner: matchData.tossWinner,
    tossDecision: matchData.tossDecision
  });

  // 2. THEN start engine
  await matchEngine.startMatch(matchData);
};

// 3. Subscribe to store updates
useEffect(() => {
  const unsubscribe = matchStore.subscribe((state) => {
    // Update local commentary
    setCommentary(prev => {
      const newCommentary = state.commentary.filter(
        c => !prev.find(p => p.timestamp === c.timestamp)
      );
      return [...newCommentary, ...prev];
    });
  });
  return unsubscribe;
}, []);

// 4. Replace getState() calls with useMatchStore selectors
const teams = useMatchStore(state => state.teams);
const innings = useMatchStore(state => state.innings);
const currentBall = useMatchStore(state => state.currentBall);
```

**Estimated Time**: 3-4 hours

---

## Issue #2: No LocalStorage Persistence

**Files**: All stores in `src/stores/`
**Status**: ALL GAME STATE LOST ON REFRESH

### Problem
Zustand stores have NO persistence middleware. The `storage.js` utilities exist but are never used. Users lose all progress on page refresh.

### Fix Checklist

**Step 1: Install Zustand middleware** (if not already available)
```bash
npm install zustand@4.x  # Ensure persist middleware is available
```

**Step 2: Update each store**

```javascript
// src/stores/gameStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useGameStore = create(
  persist(
    (set, get) => ({
      // ... existing store definition
    }),
    {
      name: 'cricket-game-storage',
      version: 1,
      partialize: (state) => ({
        currentSeason: state.currentSeason,
        currentPhase: state.currentPhase,
        currentWeek: state.currentWeek,
        currentDate: state.currentDate,
        settings: state.settings
      })
    }
  )
);
```

**Step 3: Apply to critical stores**
- ✅ `gameStore.js` - season, phase, week, settings
- ✅ `teamStore.js` - teams, userTeamId, squadLists
- ✅ `leagueStore.js` - standings, fixtures, results, playoffData
- ✅ `playerStore.js` - players, careerStats (large - consider selective persistence)
- ✅ `financeStore.js` - teamFinances, transactionHistory
- ⚠️ `matchStore.js` - DO NOT persist (transient state for active match only)
- ⚠️ `uiStore.js` - Persist only preferences, not modals/navigation

**Step 4: Test**
1. Load game
2. Make changes (auction, play match, etc.)
3. Refresh page
4. Verify state restored

**Estimated Time**: 2-3 hours (includes testing)

---

## Issue #3: Runtime Error in matchStore

**File**: `src/stores/matchStore.js`
**Line**: 222
**Status**: WILL CRASH ON MATCH START

### Problem
```javascript
setOpeningBatsmen: (striker, nonStriker) => set((state) => {
  const battedPlayers = new Set(state.innings.battedPlayers);
  if (striker) battedPlayers.add(striker);
  if (nonStriker) battedPlayers.add(nonStriker);

  return {
    innings: {
      ...state.innings,
      striker,
      nonStriker,
      battedPlayers: battedArray  // ❌ UNDEFINED - should be Array.from(battedPlayers)
    },
    // ...
  };
}),
```

### Fix
**Line 222**: Change `battedPlayers: battedArray` to `battedPlayers: Array.from(battedPlayers)`

**Estimated Time**: 5 minutes

---

## Issue #4: GameController Not Used

**Files**:
- `src/core/game/GameController.js` (unused)
- `src/components/layout/Dashboard.jsx` (duplicates logic)
- `src/components/shared/GameEventModal.jsx` (orphaned)

**Status**: GAME FLOW NON-FUNCTIONAL

### Problem
GameController exists but is never instantiated. Dashboard manually finds next match. No guided game progression.

### Fix Checklist

**Step 1: Create React Hook**
```javascript
// src/hooks/useGameController.js
import { useMemo } from 'react';
import GameController from '../core/game/GameController';
import useGameStore from '../stores/gameStore';
import useLeagueStore from '../stores/leagueStore';
import useTeamStore from '../stores/teamStore';
import usePlayerStore from '../stores/playerStore';
import useMatchStore from '../stores/matchStore';

export function useGameController() {
  const controller = useMemo(() => {
    return new GameController({
      gameStore: useGameStore.getState(),
      leagueStore: useLeagueStore.getState(),
      teamStore: useTeamStore.getState(),
      playerStore: usePlayerStore.getState(),
      matchStore: useMatchStore.getState()
    });
  }, []); // Only create once

  return {
    getNextEvent: () => controller.getNextEvent(),
    advanceToNext: () => controller.advanceToNext(),
    initializeLeague: () => controller.initializeLeagueSeason(),
    startPlayoffs: () => controller.startPlayoffs(),
    endSeason: () => controller.endSeason()
  };
}
```

**Step 2: Update Dashboard**
```javascript
// src/components/layout/Dashboard.jsx
import { useGameController } from '../../hooks/useGameController';

const Dashboard = () => {
  const { getNextEvent, advanceToNext } = useGameController();
  const [showEventModal, setShowEventModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);

  // Replace manual next match logic (lines 44-55)
  useEffect(() => {
    const event = getNextEvent();
    if (event.type !== 'idle') {
      setCurrentEvent(event);
      setShowEventModal(true);
    }
  }, [getNextEvent]);

  const handleProceedEvent = (shouldSimulate) => {
    if (currentEvent.type === 'match') {
      if (shouldSimulate) {
        // Simulate match without UI
        simulateMatch(currentEvent.data);
      } else {
        // Navigate to match view
        navigate('/match', { state: { matchData: currentEvent.data } });
      }
    }
    // ... handle other event types
    advanceToNext();
  };

  return (
    <>
      {/* Dashboard content */}
      <GameEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        event={currentEvent}
        onProceed={handleProceedEvent}
      />
    </>
  );
};
```

**Estimated Time**: 4-5 hours (includes testing flow)

---

## Priority Order

1. **Issue #3** (5 min) - Fix the runtime error first (prevents crashes)
2. **Issue #2** (2-3 hrs) - Add persistence (enables testing)
3. **Issue #1** (3-4 hrs) - Fix match simulation (core feature)
4. **Issue #4** (4-5 hrs) - Integrate GameController (full game flow)

**Total Estimated Time**: ~10-12 hours

---

## Verification Tests

After fixes, run these tests:

### Test 1: Match Simulation
1. Select a team
2. Navigate to /matches
3. Click "Play Match"
4. Verify match loads without errors
5. Click "Start Match"
6. Verify ball-by-ball updates appear
7. Complete match
8. Verify result is saved

### Test 2: Persistence
1. Complete Test 1
2. Refresh page (F5)
3. Verify:
   - Selected team still active
   - Match result still in standings
   - Player stats preserved
   - Finance data intact

### Test 3: Game Flow
1. New game (clear localStorage)
2. Verify TeamSelectionModal appears
3. Select team
4. Verify GameEventModal shows "auction" event
5. Complete auction
6. Verify GameEventModal shows "season_start" event
7. Start season
8. Verify GameEventModal shows "match" event
9. Play/simulate match
10. Verify progression to next event

### Test 4: No Crashes
1. Navigate all routes without errors
2. Check console for errors
3. Verify error boundaries catch any component failures

---

## Additional Notes

### LocalStorage Size Management
With 545 players and multi-season stats, LocalStorage can fill up (~5-10MB limit). Monitor storage usage:

```javascript
// Add to a utility
function checkStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  console.log(`LocalStorage usage: ${(total / 1024).toFixed(2)} KB`);
  return total;
}
```

If approaching limits, implement:
- Selective persistence (don't save ballByBall arrays)
- Season archiving (compress old season data)
- Or migrate to IndexedDB (future enhancement)

### Testing Match Engine
The match engine itself (SimpleBallSimulator) is solid. Test it independently:

```bash
node src/test/demoInteractiveMatch.js
```

This confirms the core logic works. The issue is purely the React integration layer.

---

## Questions to Resolve Before Proceeding

1. **Match data format**: Does `matchData` from route state match MatchEngine's expected `MatchConfig` interface?
2. **Toss logic**: Where is toss decided? In Dashboard before navigation, or in Match component?
3. **Team selection**: Should Match.jsx show team selection UI, or is that in a separate modal?
4. **Bowling changes**: How are bowler changes handled? Manual user input or AI-controlled?

Review `src/test/demoInteractiveMatch.js` for reference implementation.

---

## Success Criteria

✅ User can play a full match from start to finish
✅ Match results appear in league standings
✅ Game state persists across page refreshes
✅ Dashboard "Continue" button works
✅ Season progresses: auction → league → playoffs
✅ No console errors during normal gameplay
✅ Error boundaries catch and display component errors

When all criteria are met, the application is ready for Phase 5 features (tactics UI, 2D visualization).
