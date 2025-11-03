# Zustand State Management Patterns

Modern state management using Zustand with clean store organization, selector patterns, and async actions.

---

## Store Organization

### Feature-Based Stores

Organize stores by feature/domain:

```
src/stores/
├── gameStore.js          # Game state (season, match, etc.)
├── playerStore.js        # Player data and management
├── teamStore.js          # Team and squad management
├── matchStore.js         # Match simulation state
└── uiStore.js            # UI state (modals, notifications)
```

**Principles:**
- One store per feature domain
- Keep stores focused and cohesive
- Avoid circular dependencies between stores

---

## Basic Store Pattern

### Simple Store Structure

```javascript
import { create } from 'zustand';

/**
 * @typedef {Object} GameState
 * @property {number} currentSeason - Current season number
 * @property {string|null} selectedTeam - Currently selected team ID
 * @property {boolean} isPaused - Whether game is paused
 */

/**
 * @typedef {Object} GameActions
 * @property {(season: number) => void} setSeason - Set current season
 * @property {(teamId: string) => void} selectTeam - Select a team
 * @property {() => void} togglePause - Toggle pause state
 * @property {() => void} reset - Reset to initial state
 */

/**
 * @typedef {GameState & GameActions} GameStore
 */

const initialState = {
    currentSeason: 1,
    selectedTeam: null,
    isPaused: false,
};

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<GameStore>>} */
export const useGameStore = create((set, get) => ({
    // State
    ...initialState,

    // Actions
    setSeason: (season) => set({ currentSeason: season }),

    selectTeam: (teamId) => set({ selectedTeam: teamId }),

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    reset: () => set(initialState),
}));
```

---

## Selector Patterns

### Basic Selectors

```javascript
// ❌ AVOID - Re-renders on ANY state change
function Component() {
    const store = useGameStore();
    return <div>{store.currentSeason}</div>;
}

// ✅ CORRECT - Only re-renders when currentSeason changes
function Component() {
    const currentSeason = useGameStore((state) => state.currentSeason);
    return <div>{currentSeason}</div>;
}
```

### Multiple Selectors

```javascript
// ✅ CORRECT - Separate selectors for granular re-renders
function Component() {
    const currentSeason = useGameStore((state) => state.currentSeason);
    const selectedTeam = useGameStore((state) => state.selectedTeam);
    const togglePause = useGameStore((state) => state.togglePause);

    return (
        <div>
            <h1>Season {currentSeason}</h1>
            <p>Team: {selectedTeam}</p>
            <button onClick={togglePause}>Pause</button>
        </div>
    );
}
```

### Custom Selector Hooks

```javascript
/**
 * Custom hook for commonly used game state
 * @returns {{season: number, team: string|null, isPaused: boolean}}
 */
export function useGameInfo() {
    return useGameStore((state) => ({
        season: state.currentSeason,
        team: state.selectedTeam,
        isPaused: state.isPaused,
    }));
}

// Usage
function Dashboard() {
    const { season, team, isPaused } = useGameInfo();
    // ...
}
```

---

## Async Actions Pattern

### Fetch Data in Actions

```javascript
import { create } from 'zustand';

/**
 * @typedef {Object} PlayerState
 * @property {Array<Object>} players - List of players
 * @property {boolean} isLoading - Loading state
 * @property {Error|null} error - Error if fetch failed
 */

export const usePlayerStore = create((set, get) => ({
    // State
    players: [],
    isLoading: false,
    error: null,

    // Async action
    /**
     * Fetch all players from API
     * @returns {Promise<void>}
     */
    fetchPlayers: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch('/api/players');
            const data = await response.json();

            set({ players: data, isLoading: false });
        } catch (error) {
            set({ error, isLoading: false });
            console.error('Failed to fetch players:', error);
        }
    },

    /**
     * Add a new player
     * @param {Object} player - Player data
     * @returns {Promise<void>}
     */
    addPlayer: async (player) => {
        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(player),
            });

            const newPlayer = await response.json();

            set((state) => ({
                players: [...state.players, newPlayer],
            }));
        } catch (error) {
            console.error('Failed to add player:', error);
            throw error;
        }
    },

    /**
     * Delete a player
     * @param {number} playerId - Player ID to delete
     * @returns {Promise<void>}
     */
    deletePlayer: async (playerId) => {
        try {
            await fetch(`/api/players/${playerId}`, { method: 'DELETE' });

            set((state) => ({
                players: state.players.filter(p => p.id !== playerId),
            }));
        } catch (error) {
            console.error('Failed to delete player:', error);
            throw error;
        }
    },
}));
```

### Using Async Actions

```javascript
function PlayerList() {
    const players = usePlayerStore((state) => state.players);
    const isLoading = usePlayerStore((state) => state.isLoading);
    const error = usePlayerStore((state) => state.error);
    const fetchPlayers = usePlayerStore((state) => state.fetchPlayers);
    const deletePlayer = usePlayerStore((state) => state.deletePlayer);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            {players.map(player => (
                <div key={player.id}>
                    {player.name}
                    <button onClick={() => deletePlayer(player.id)}>
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
}
```

---

## Computed Values (Derived State)

### Using get() for Derived State

```javascript
export const useTeamStore = create((set, get) => ({
    players: [],
    selectedPlayerIds: [],

    /**
     * Get selected players (computed)
     * @returns {Array<Object>}
     */
    getSelectedPlayers: () => {
        const { players, selectedPlayerIds } = get();
        return players.filter(p => selectedPlayerIds.includes(p.id));
    },

    /**
     * Get team total rating (computed)
     * @returns {number}
     */
    getTotalRating: () => {
        const players = get().getSelectedPlayers();
        return players.reduce((sum, p) => sum + p.rating, 0);
    },

    togglePlayerSelection: (playerId) => {
        set((state) => {
            const isSelected = state.selectedPlayerIds.includes(playerId);
            return {
                selectedPlayerIds: isSelected
                    ? state.selectedPlayerIds.filter(id => id !== playerId)
                    : [...state.selectedPlayerIds, playerId],
            };
        });
    },
}));

// Usage
function TeamStats() {
    const totalRating = useTeamStore((state) => state.getTotalRating());
    return <div>Total Rating: {totalRating}</div>;
}
```

### Selector with Derivation

```javascript
// ✅ CORRECT - Compute in selector for auto-caching
function TeamStats() {
    const { totalRating, avgRating } = useTeamStore((state) => {
        const selected = state.players.filter(p =>
            state.selectedPlayerIds.includes(p.id)
        );

        const total = selected.reduce((sum, p) => sum + p.rating, 0);
        const avg = selected.length > 0 ? total / selected.length : 0;

        return { totalRating: total, avgRating: avg };
    });

    return (
        <div>
            <div>Total: {totalRating}</div>
            <div>Average: {avgRating.toFixed(1)}</div>
        </div>
    );
}
```

---

## Nested State Updates

### Updating Nested Objects

```javascript
export const useMatchStore = create((set) => ({
    match: {
        innings: 1,
        score: { runs: 0, wickets: 0 },
        over: 0,
    },

    /**
     * Update runs scored
     * @param {number} runs - Runs to add
     */
    addRuns: (runs) => {
        set((state) => ({
            match: {
                ...state.match,
                score: {
                    ...state.match.score,
                    runs: state.match.score.runs + runs,
                },
            },
        }));
    },

    /**
     * Take a wicket
     */
    takeWicket: () => {
        set((state) => ({
            match: {
                ...state.match,
                score: {
                    ...state.match.score,
                    wickets: state.match.score.wickets + 1,
                },
            },
        }));
    },
}));
```

### Using Immer for Complex Updates

```javascript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useMatchStore = create(
    immer((set) => ({
        match: {
            innings: 1,
            score: { runs: 0, wickets: 0 },
            over: 0,
        },

        /**
         * Update runs scored (with Immer)
         * @param {number} runs - Runs to add
         */
        addRuns: (runs) => {
            set((state) => {
                state.match.score.runs += runs;
            });
        },

        /**
         * Take a wicket (with Immer)
         */
        takeWicket: () => {
            set((state) => {
                state.match.score.wickets += 1;
            });
        },
    }))
);
```

---

## Array Updates

### Common Array Operations

```javascript
export const usePlayerStore = create((set) => ({
    players: [],

    /**
     * Add player to array
     * @param {Object} player
     */
    addPlayer: (player) => {
        set((state) => ({
            players: [...state.players, player],
        }));
    },

    /**
     * Remove player from array
     * @param {number} playerId
     */
    removePlayer: (playerId) => {
        set((state) => ({
            players: state.players.filter(p => p.id !== playerId),
        }));
    },

    /**
     * Update player in array
     * @param {number} playerId
     * @param {Object} updates
     */
    updatePlayer: (playerId, updates) => {
        set((state) => ({
            players: state.players.map(p =>
                p.id === playerId ? { ...p, ...updates } : p
            ),
        }));
    },

    /**
     * Reorder players
     * @param {number} fromIndex
     * @param {number} toIndex
     */
    reorderPlayers: (fromIndex, toIndex) => {
        set((state) => {
            const players = [...state.players];
            const [removed] = players.splice(fromIndex, 1);
            players.splice(toIndex, 0, removed);
            return { players };
        });
    },
}));
```

---

## Persistence

### LocalStorage Persistence

```javascript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useGameStore = create(
    persist(
        (set, get) => ({
            currentSeason: 1,
            selectedTeam: null,

            setSeason: (season) => set({ currentSeason: season }),
            selectTeam: (teamId) => set({ selectedTeam: teamId }),
        }),
        {
            name: 'cricket-manager-game', // LocalStorage key
            storage: createJSONStorage(() => localStorage),

            // Optional: Only persist specific fields
            partialize: (state) => ({
                currentSeason: state.currentSeason,
                selectedTeam: state.selectedTeam,
            }),
        }
    )
);
```

### Session Storage

```javascript
export const useUIStore = create(
    persist(
        (set) => ({
            sidebarOpen: true,
            theme: 'light',

            toggleSidebar: () => set((state) => ({
                sidebarOpen: !state.sidebarOpen
            })),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'cricket-manager-ui',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
```

---

## Cross-Store Communication

### Accessing Other Stores

```javascript
import { usePlayerStore } from './playerStore';
import { useTeamStore } from './teamStore';

export const useMatchStore = create((set, get) => ({
    matchId: null,
    inProgress: false,

    /**
     * Start a match with selected team
     */
    startMatch: () => {
        // Access other store
        const selectedTeam = useTeamStore.getState().selectedTeam;
        const players = usePlayerStore.getState().getSelectedPlayers();

        if (!selectedTeam || players.length === 0) {
            console.error('Cannot start match: no team/players selected');
            return;
        }

        set({
            matchId: Date.now(),
            inProgress: true,
        });
    },

    /**
     * End match and update player stats
     */
    endMatch: () => {
        const { matchId } = get();

        // Update players in player store
        usePlayerStore.getState().updatePlayersAfterMatch(matchId);

        set({ inProgress: false });
    },
}));
```

### Subscribe to Store Changes

```javascript
// Listen to changes from another store
useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe(
        (state) => state.players,
        (players, prevPlayers) => {
            console.log('Players changed:', players.length);
        }
    );

    return unsubscribe;
}, []);
```

---

## Middleware Patterns

### DevTools Integration

```javascript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useGameStore = create(
    devtools(
        (set) => ({
            currentSeason: 1,
            setSeason: (season) => set({ currentSeason: season }),
        }),
        { name: 'GameStore' }
    )
);
```

### Combining Middleware

```javascript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useGameStore = create(
    devtools(
        persist(
            (set) => ({
                currentSeason: 1,
                setSeason: (season) => set({ currentSeason: season }),
            }),
            { name: 'cricket-manager-game' }
        ),
        { name: 'GameStore' }
    )
);
```

---

## Testing Patterns

### Reset Store for Tests

```javascript
export const useGameStore = create((set) => ({
    currentSeason: 1,
    selectedTeam: null,

    setSeason: (season) => set({ currentSeason: season }),

    // Test helper
    __reset: () => set({
        currentSeason: 1,
        selectedTeam: null,
    }),
}));

// In tests
afterEach(() => {
    useGameStore.getState().__reset();
});
```

### Access Store Outside React

```javascript
// Direct access without hooks
const currentSeason = useGameStore.getState().currentSeason;

// Call actions
useGameStore.getState().setSeason(2);

// Useful for utilities and non-React code
export function getCurrentSeason() {
    return useGameStore.getState().currentSeason;
}
```

---

## Performance Optimization

### Shallow Comparison

```javascript
import { shallow } from 'zustand/shallow';

// ✅ CORRECT - Only re-render if selected fields change
function Component() {
    const { season, team } = useGameStore(
        (state) => ({
            season: state.currentSeason,
            team: state.selectedTeam,
        }),
        shallow
    );

    return <div>{season} - {team}</div>;
}
```

### Memoized Selectors

```javascript
import { useMemo } from 'react';

function PlayerList() {
    const players = usePlayerStore((state) => state.players);
    const filter = usePlayerStore((state) => state.filter);

    // Memoize expensive computation
    const filteredPlayers = useMemo(() => {
        return players.filter(p => p.name.includes(filter));
    }, [players, filter]);

    return (
        <div>
            {filteredPlayers.map(p => <PlayerCard key={p.id} player={p} />)}
        </div>
    );
}
```

---

## Complete Example: Match Store

```javascript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

/**
 * @typedef {Object} Ball
 * @property {number} runs
 * @property {boolean} wicket
 * @property {string} description
 */

/**
 * @typedef {Object} MatchState
 * @property {string|null} matchId
 * @property {boolean} inProgress
 * @property {number} innings
 * @property {Object} score
 * @property {number} score.runs
 * @property {number} score.wickets
 * @property {number} over
 * @property {Array<Ball>} balls
 */

export const useMatchStore = create(
    devtools(
        persist(
            (set, get) => ({
                // State
                matchId: null,
                inProgress: false,
                innings: 1,
                score: { runs: 0, wickets: 0 },
                over: 0,
                balls: [],

                // Actions
                /**
                 * Start a new match
                 * @param {string} matchId
                 */
                startMatch: (matchId) => {
                    set({
                        matchId,
                        inProgress: true,
                        innings: 1,
                        score: { runs: 0, wickets: 0 },
                        over: 0,
                        balls: [],
                    });
                },

                /**
                 * Record a ball
                 * @param {Ball} ball
                 */
                recordBall: (ball) => {
                    set((state) => ({
                        balls: [...state.balls, ball],
                        score: {
                            runs: state.score.runs + ball.runs,
                            wickets: ball.wicket
                                ? state.score.wickets + 1
                                : state.score.wickets,
                        },
                        over: state.balls.length % 6 === 5
                            ? state.over + 1
                            : state.over,
                    }));
                },

                /**
                 * End match
                 */
                endMatch: () => {
                    set({ inProgress: false });
                },

                /**
                 * Get current run rate (computed)
                 * @returns {number}
                 */
                getRunRate: () => {
                    const { score, over } = get();
                    return over > 0 ? (score.runs / over).toFixed(2) : 0;
                },

                // Reset for testing
                __reset: () => set({
                    matchId: null,
                    inProgress: false,
                    innings: 1,
                    score: { runs: 0, wickets: 0 },
                    over: 0,
                    balls: [],
                }),
            }),
            {
                name: 'cricket-manager-match',
                partialize: (state) => ({
                    matchId: state.matchId,
                    score: state.score,
                    innings: state.innings,
                }),
            }
        ),
        { name: 'MatchStore' }
    )
);

// Custom selector hook
export function useMatchInfo() {
    return useMatchStore((state) => ({
        inProgress: state.inProgress,
        score: state.score,
        over: state.over,
        runRate: state.getRunRate(),
    }));
}
```

---

## Summary

**Zustand Best Practices:**
- ✅ One store per feature/domain
- ✅ Use selectors for granular re-renders
- ✅ Keep actions in the store
- ✅ Use `get()` for accessing current state in actions
- ✅ Persist important state with persist middleware
- ✅ Use Immer middleware for complex nested updates
- ✅ Add devtools middleware in development
- ✅ Create custom selector hooks for common patterns
- ✅ Use shallow comparison for object selectors
- ✅ Add __reset for testing
- ❌ Avoid subscribing to entire store
- ❌ Don't mutate state directly

**See Also:**
- [component-patterns.md](component-patterns.md) - Using stores in components
- [javascript-jsdoc-standards.md](javascript-jsdoc-standards.md) - Typing stores
- [performance.md](performance.md) - Optimization techniques
