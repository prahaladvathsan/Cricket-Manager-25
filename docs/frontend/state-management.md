# State Management Guide

## Overview

Cricket Manager uses Zustand for state management, providing a simple and efficient way to manage application state without the complexity of Redux.

## Store Architecture

```
Application State
├── gameStore     - Season progression, calendar, settings
├── teamStore     - All teams, squad management, user team
├── playerStore   - Player database, filtering, search
├── matchStore    - Active match state, ball-by-ball data
└── uiStore       - Navigation, modals, user preferences
```

## Store Patterns

### Basic Store Structure

```javascript
import { create } from 'zustand';

const useExampleStore = create((set, get) => ({
  // State
  someState: initialValue,

  // Actions
  updateState: (newValue) => set({ someState: newValue }),

  // Computed values
  getComputedValue: () => {
    const state = get();
    return state.someState * 2;
  },

  // Complex actions
  complexAction: (params) => set((state) => ({
    someState: calculateNewValue(state.someState, params)
  })),
}));
```

## Individual Store Guides

### gameStore.js - Game Session Management

**Purpose**: Manages season progression, calendar, and global game settings.

**Key State**:
```javascript
{
  currentSeason: number,
  currentDate: string,
  gameSpeed: 'slow' | 'normal' | 'fast',
  settings: {
    autoSave: boolean,
    simulationSpeed: string,
    showDetailedStats: boolean
  },
  isGameActive: boolean
}
```

**Key Actions**:
- `startNewSeason()` - Initialize new season
- `advanceDate(days)` - Progress game calendar
- `updateSettings(settings)` - Modify game preferences
- `pauseGame()` / `resumeGame()` - Game state control

**Usage Example**:
```javascript
import useGameStore from '../stores/gameStore';

const GameComponent = () => {
  const { currentSeason, advanceDate, updateSettings } = useGameStore();

  const handleNextDay = () => {
    advanceDate(1);
  };

  return (
    <div>
      <p>Season: {currentSeason}</p>
      <button onClick={handleNextDay}>Next Day</button>
    </div>
  );
};
```

### teamStore.js - Team and Squad Management

**Purpose**: Manages all team data, squad composition, and user team selection.

**Key State**:
```javascript
{
  teams: {
    [teamId]: {
      id: string,
      name: string,
      squad: string[], // player IDs
      finances: number,
      userControlled: boolean
    }
  },
  userTeam: string | null, // selected team ID
  formations: object
}
```

**Key Actions**:
- `selectUserTeam(teamId)` - Set user's team
- `updateSquad(teamId, players)` - Modify team roster
- `transferPlayer(playerId, fromTeam, toTeam)` - Player transfers
- `getTeam(teamId)` - Get specific team data
- `getUserTeam()` - Get user's selected team

**Usage Example**:
```javascript
import useTeamStore from '../stores/teamStore';

const TeamSelection = () => {
  const { teams, userTeam, selectUserTeam } = useTeamStore();

  return (
    <div>
      {Object.values(teams).map(team => (
        <button
          key={team.id}
          onClick={() => selectUserTeam(team.id)}
          className={userTeam === team.id ? 'selected' : ''}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
};
```

### playerStore.js - Player Database Management

**Purpose**: Manages player database, search/filtering, and attribute systems.

**Key State**:
```javascript
{
  players: {
    [playerId]: {
      id: string,
      name: string,
      attributes: object, // 1-20 scale
      condition: object,  // 0-100 scale
      role: string,
      value: number
    }
  },
  filters: object,
  searchResults: string[] // player IDs
}
```

**Key Actions**:
- `loadPlayerDatabase()` - Initialize player data
- `searchPlayers(criteria)` - Filter player database
- `getPlayer(playerId)` - Get specific player
- `updatePlayerCondition(playerId, updates)` - Modify player state
- `getPlayersByRole(role)` - Filter by position

**Usage Example**:
```javascript
import usePlayerStore from '../stores/playerStore';

const PlayerBrowser = () => {
  const { searchPlayers, searchResults, getPlayer } = usePlayerStore();

  const handleSearch = (criteria) => {
    searchPlayers({
      role: criteria.position,
      minRating: criteria.rating
    });
  };

  return (
    <div>
      {searchResults.map(playerId => {
        const player = getPlayer(playerId);
        return (
          <div key={playerId}>
            <h3>{player.name}</h3>
            <p>Role: {player.role}</p>
          </div>
        );
      })}
    </div>
  );
};
```

### matchStore.js - Active Match State

**Purpose**: Manages current match simulation, ball-by-ball data, and match events.

**Key State**:
```javascript
{
  matchId: string | null,
  status: 'scheduled' | 'live' | 'innings_break' | 'completed',
  teams: {
    batting: object,
    bowling: object
  },
  innings: object,
  currentBall: object,
  ballByBall: array,
  commentary: array
}
```

**Key Actions**:
- `initializeMatch(config)` - Start new match
- `processBallResult(result)` - Update match state
- `startSecondInnings()` - Innings transition
- `completeMatch(result)` - Finish match
- `getCurrentSituation()` - Get match context

**Usage Example**:
```javascript
import useMatchStore from '../stores/matchStore';

const MatchDisplay = () => {
  const {
    status,
    teams,
    currentBall,
    commentary
  } = useMatchStore();

  if (status !== 'live') return null;

  return (
    <div>
      <div className="score">
        {teams.batting.name}: {teams.batting.totalScore}/{teams.batting.wickets}
      </div>
      <div className="current-ball">
        Over {currentBall.over}.{currentBall.ball}
      </div>
      <div className="commentary">
        {commentary.slice(-5).map((comment, i) => (
          <p key={i}>{comment.text}</p>
        ))}
      </div>
    </div>
  );
};
```

### uiStore.js - UI State and Navigation

**Purpose**: Manages navigation state, modal visibility, and user interface preferences.

**Key State**:
```javascript
{
  currentPage: string,
  activeModal: string | null,
  sidebarOpen: boolean,
  notifications: array,
  preferences: {
    theme: string,
    soundEnabled: boolean,
    animationsEnabled: boolean
  }
}
```

**Key Actions**:
- `navigateTo(page)` - Change current page
- `openModal(modalType, data)` - Show modal
- `closeModal()` - Hide modal
- `toggleSidebar()` - Sidebar visibility
- `addNotification(message)` - Show notification

## State Subscription Patterns

### Component Subscription

```javascript
// Subscribe to specific store slice
const Component = () => {
  const userTeam = useTeamStore(state => state.userTeam);
  const selectTeam = useTeamStore(state => state.selectUserTeam);

  // Component only re-renders when userTeam changes
};
```

### Multiple Store Usage

```javascript
// Use multiple stores in one component
const Dashboard = () => {
  const { currentSeason } = useGameStore();
  const { userTeam } = useTeamStore();
  const { players } = usePlayerStore();

  // Combine data from multiple stores
};
```

### Computed Values

```javascript
// Derived state pattern
const useComputedStats = () => {
  const players = usePlayerStore(state => state.players);
  const userTeam = useTeamStore(state => state.userTeam);

  return useMemo(() => {
    if (!userTeam) return null;

    const teamPlayers = Object.values(players)
      .filter(p => p.teamId === userTeam);

    return {
      totalPlayers: teamPlayers.length,
      averageRating: teamPlayers.reduce((sum, p) => sum + p.rating, 0) / teamPlayers.length
    };
  }, [players, userTeam]);
};
```

## Performance Optimization

### Selective Subscriptions

```javascript
// Good: Only subscribe to needed data
const name = usePlayerStore(state => state.players[playerId]?.name);

// Bad: Subscribe to entire store
const { players } = usePlayerStore();
const name = players[playerId]?.name;
```

### Memoized Selectors

```javascript
import { useMemo } from 'react';

const useTeamPlayers = (teamId) => {
  return usePlayerStore(
    useMemo(
      () => state => Object.values(state.players).filter(p => p.teamId === teamId),
      [teamId]
    )
  );
};
```

### Batch Updates

```javascript
// Update multiple state properties together
const handleComplexUpdate = () => {
  useTeamStore.setState(state => ({
    teams: updateTeamData(state.teams),
    formations: updateFormations(state.formations),
    lastUpdated: Date.now()
  }));
};
```

## Persistence Integration

### Auto-Save Pattern with Compression

All major stores use **gzip compression** to reduce localStorage usage by 60-80%. This prevents quota exceeded errors during long simulation sessions.

```javascript
import { persist, createJSONStorage } from 'zustand/middleware';
import { compressedStorageOptions } from '../utils/compression.js';

// Store with compressed localStorage persistence
const useGameStore = create(
  persist(
    (set, get) => ({
      // store implementation
    }),
    {
      name: 'cm25-game-store',
      version: 4,
      storage: createJSONStorage(() => localStorage, compressedStorageOptions)
    }
  )
);
```

**Compression Details** (`src/utils/compression.js`):
- Uses pako (gzip) for compression
- Data stored with `__COMPRESSED__:` prefix
- Backward compatible - reads old uncompressed data
- Typical compression ratio: 60-80%

**Store Versions with Compression**:
| Store | Version | Key |
|-------|---------|-----|
| gameStore | 4 | cm25-game-store |
| teamStore | 3 | cm25-team-store |
| playerStore | 2 | cm25-player-store |
| leagueStore | 3 | cm25-league-store |
| inboxStore | 2 | cm25-inbox-store |

### Save Game Management

```javascript
// Manual save/load operations use SaveGameManager
import SaveGameManager from '../utils/SaveGameManager';

// Save to slot (handles compression automatically)
SaveGameManager.saveGame(0, stores, 'My Save');

// Load from slot
SaveGameManager.loadGame(0, stores);
```

## Testing Patterns

### Store Testing

```javascript
import { renderHook, act } from '@testing-library/react';
import useTeamStore from '../stores/teamStore';

test('should select user team', () => {
  const { result } = renderHook(() => useTeamStore());

  act(() => {
    result.current.selectUserTeam('team1');
  });

  expect(result.current.userTeam).toBe('team1');
});
```

## Common Patterns

### Loading States

```javascript
const useAsyncAction = () => {
  const [loading, setLoading] = useState(false);
  const updateStore = useStore(state => state.updateAction);

  const performAction = async (data) => {
    setLoading(true);
    try {
      const result = await apiCall(data);
      updateStore(result);
    } finally {
      setLoading(false);
    }
  };

  return { performAction, loading };
};
```

### Error Handling

```javascript
const useStoreWithError = create((set) => ({
  data: null,
  error: null,
  loading: false,

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchFromAPI();
      set({ data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
```