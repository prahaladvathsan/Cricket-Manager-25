# Data Flow Architecture

## Overview

Cricket Manager follows a unidirectional data flow pattern with Zustand stores as the single source of truth. This document outlines how data moves through the application and the patterns used for state management.

## Data Flow Diagram

```
User Interaction
       ↓
UI Components
       ↓
Store Actions
       ↓
State Updates
       ↓
Core Systems (if needed)
       ↓
State Updates
       ↓
Component Re-rendering
```

## Store-Centric Architecture

### Central State Management

```
                    ┌─────────────────┐
                    │   Application   │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │  Zustand Stores │
                    └─────────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐         ┌─────▼─────┐         ┌─────▼─────┐
   │gameStore│         │teamStore  │         │playerStore│
   └─────────┘         └───────────┘         └───────────┘
        │                     │                     │
   ┌────▼────┐         ┌─────▼─────┐         ┌─────▼─────┐
   │matchStore│        │uiStore    │         │localStorage│
   └─────────┘         └───────────┘         └───────────┘
```

## Data Flow Patterns

### 1. User Actions → Store Updates

```javascript
// Example: Team selection flow
const TeamSelection = () => {
  const { teams, selectUserTeam } = useTeamStore();

  const handleTeamSelect = (teamId) => {
    // 1. User interaction
    selectUserTeam(teamId);
    // 2. Store action updates state
    // 3. Component re-renders with new data
  };

  return (
    <div>
      {Object.values(teams).map(team => (
        <button
          key={team.id}
          onClick={() => handleTeamSelect(team.id)}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
};
```

### 2. Cross-Store Communication

```javascript
// Example: Match initialization requiring multiple stores
const startMatch = async (homeTeamId, awayTeamId) => {
  // 1. Get team data
  const homeTeam = useTeamStore.getState().getTeam(homeTeamId);
  const awayTeam = useTeamStore.getState().getTeam(awayTeamId);

  // 2. Get player data
  const homeSquad = homeTeam.squad.map(playerId =>
    usePlayerStore.getState().getPlayer(playerId)
  );

  // 3. Initialize match
  useMatchStore.getState().initializeMatch({
    homeTeam: { ...homeTeam, squad: homeSquad },
    awayTeam: { ...awayTeam, squad: awaySquad }
  });

  // 4. Update UI
  useUIStore.getState().navigateTo('match');
};
```

### 3. Async Operations

```javascript
// Example: Loading player database
const loadPlayerData = async () => {
  const { setLoading, setPlayers, setError } = usePlayerStore.getState();

  try {
    // 1. Set loading state
    setLoading(true);

    // 2. Fetch data
    const response = await fetch('/data/players.json');
    const players = await response.json();

    // 3. Update store
    setPlayers(players);
  } catch (error) {
    // 4. Handle errors
    setError(error.message);
  } finally {
    // 5. Clear loading
    setLoading(false);
  }
};
```

## Component Data Access Patterns

### 1. Direct Store Subscription

```javascript
// Subscribe to specific store slice
const PlayerCard = ({ playerId }) => {
  const player = usePlayerStore(state => state.players[playerId]);

  if (!player) return <div>Player not found</div>;

  return (
    <div>
      <h3>{player.name}</h3>
      <p>Rating: {player.rating}</p>
    </div>
  );
};
```

### 2. Derived State

```javascript
// Custom hook for computed data
const useTeamStats = (teamId) => {
  return usePlayerStore(
    useCallback(
      state => {
        const teamPlayers = Object.values(state.players)
          .filter(p => p.teamId === teamId);

        return {
          count: teamPlayers.length,
          averageRating: teamPlayers.reduce((sum, p) =>
            sum + p.rating, 0) / teamPlayers.length,
          totalValue: teamPlayers.reduce((sum, p) =>
            sum + p.value, 0)
        };
      },
      [teamId]
    )
  );
};
```

### 3. Multiple Store Coordination

```javascript
// Component using multiple stores
const Dashboard = () => {
  const { currentSeason, currentDate } = useGameStore();
  const { getUserTeam } = useTeamStore();
  const { status } = useMatchStore();
  const { navigateTo } = useUIStore();

  const userTeam = getUserTeam();

  return (
    <div>
      <Header season={currentSeason} date={currentDate} />
      <TeamInfo team={userTeam} />
      {status === 'live' && <MatchWidget />}
    </div>
  );
};
```

## Core System Integration

### Match Engine Data Flow (NEW 4-Step Architecture)

```javascript
// Match simulation data flow with new 4-step ball simulation
const simulateMatch = async () => {
  // 1. Get initial state from stores
  const matchState = useMatchStore.getState();
  const teams = {
    batting: useTeamStore.getState().getTeam(matchState.teams.batting.id),
    bowling: useTeamStore.getState().getTeam(matchState.teams.bowling.id)
  };

  // 2. Create match context
  const matchContext = {
    teams,
    players: teams.batting.squad.concat(teams.bowling.squad)
      .map(id => usePlayerStore.getState().getPlayer(id)),
    venue: matchState.venue,
    conditions: matchState.conditions
  };

  // 3. Initialize SimpleBallSimulator with 4-step flow
  const ballSimulator = new SimpleBallSimulator();

  // 4. Simulate balls using new 4-step architecture
  while (!matchState.isComplete) {
    // Get current ball context with mentalities
    const ballContext = {
      striker: getCurrentStriker(matchState),
      nonStriker: getCurrentNonStriker(matchState),
      bowler: getCurrentBowler(matchState),
      battingMentality: getBattingMentality(matchState),
      bowlingMentality: getBowlingMentality(matchState),
      fieldingTeam: teams.bowling,
      matchSituation: getMatchSituation(matchState)
    };

    // Simulate ball through 4-step process:
    // Step 1: Decision (threat vs judgment)
    // Step 2: Contact (execution + decision scores)
    // Step 3: Trajectory (mentality-based shot type)
    // Step 4: Fielding (fixed probability resolution)
    const ballResult = await ballSimulator.simulateBall(ballContext);

    // Update match state with detailed metadata
    useMatchStore.getState().processBallResult({
      ...ballResult,
      metadata: {
        ...ballResult.metadata,
        ballContext,
        timestamp: Date.now()
      }
    });

    // Update player conditions using result
    updatePlayerConditions(ballResult.conditionUpdates);
  }
};
```

### Player Development Data Flow

```javascript
// Player development over time
const processPlayerDevelopment = (timeElapsed) => {
  const { players, updatePlayer } = usePlayerStore.getState();

  Object.values(players).forEach(player => {
    // 1. Age-based development
    const ageFactor = getAgeFactor(player.age);

    // 2. Form changes based on recent performance
    const recentMatches = getRecentMatches(player.id);
    const formChange = calculateFormChange(recentMatches);

    // 3. Training effects
    const trainingBonus = getTrainingBonus(player.id);

    // 4. Apply changes
    updatePlayer(player.id, {
      attributes: applyDevelopment(player.attributes, ageFactor, trainingBonus),
      condition: {
        ...player.condition,
        form: Math.max(0, Math.min(100, player.condition.form + formChange))
      }
    });
  });
};
```

## State Persistence

### Save/Load Data Flow

```javascript
// Save game state
const saveGame = (slotId) => {
  // 1. Collect state from all stores
  const gameState = {
    game: useGameStore.getState(),
    teams: useTeamStore.getState(),
    players: usePlayerStore.getState(),
    match: useMatchStore.getState(),
    ui: useUIStore.getState(),
    timestamp: Date.now()
  };

  // 2. Serialize and save
  const serializedState = JSON.stringify(gameState);
  localStorage.setItem(`save-${slotId}`, serializedState);

  // 3. Update UI
  useUIStore.getState().addNotification({
    type: 'success',
    message: 'Game saved successfully!'
  });
};

// Load game state
const loadGame = (slotId) => {
  try {
    // 1. Load from storage
    const serializedState = localStorage.getItem(`save-${slotId}`);
    const gameState = JSON.parse(serializedState);

    // 2. Restore state to all stores
    useGameStore.setState(gameState.game);
    useTeamStore.setState(gameState.teams);
    usePlayerStore.setState(gameState.players);
    useMatchStore.setState(gameState.match);
    useUIStore.setState(gameState.ui);

    // 3. Navigate to appropriate page
    useUIStore.getState().navigateTo('dashboard');
  } catch (error) {
    useUIStore.getState().addNotification({
      type: 'error',
      message: 'Failed to load game'
    });
  }
};
```

## Error Handling Patterns

### Store-Level Error Handling

```javascript
// Error boundary in stores
const createErrorSafeStore = (storeCreator) => {
  return create((set, get) => ({
    ...storeCreator(set, get),
    error: null,
    clearError: () => set({ error: null }),

    // Wrapper for safe actions
    safeAction: async (action, ...args) => {
      try {
        set({ error: null });
        await action(...args);
      } catch (error) {
        set({ error: error.message });
        console.error('Store action failed:', error);
      }
    }
  }));
};
```

### Component Error Boundaries

```javascript
// Error boundary component
class DataFlowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Data flow error:', error, errorInfo);

    // Log to error tracking service
    trackError(error, { context: 'dataFlow', ...errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Performance Optimizations

### Selective Subscriptions

```javascript
// Good: Subscribe only to needed data
const PlayerName = ({ playerId }) => {
  const playerName = usePlayerStore(
    useCallback(
      state => state.players[playerId]?.name,
      [playerId]
    )
  );

  return <span>{playerName}</span>;
};

// Bad: Subscribe to entire store
const PlayerName = ({ playerId }) => {
  const { players } = usePlayerStore();
  return <span>{players[playerId]?.name}</span>;
};
```

### Memoization Patterns

```javascript
// Memoized selectors
const createTeamSelector = (teamId) =>
  createSelector(
    [state => state.teams[teamId], state => state.players],
    (team, players) => ({
      ...team,
      squad: team.squad.map(id => players[id]).filter(Boolean)
    })
  );

// Usage
const useTeamWithPlayers = (teamId) => {
  const selector = useMemo(() => createTeamSelector(teamId), [teamId]);
  return useTeamStore(selector);
};
```

### Batch Updates

```javascript
// Batch multiple state updates
const processMatchEnd = (matchResult) => {
  // Batch all updates together
  const updates = [];

  // Update player stats
  matchResult.playerStats.forEach(stats => {
    updates.push(() => updatePlayerStats(stats.playerId, stats));
  });

  // Update team records
  updates.push(() => updateTeamRecord(matchResult.winner, matchResult.loser));

  // Update calendar
  updates.push(() => advanceCalendar(1));

  // Execute all updates in batch
  React.unstable_batchedUpdates(() => {
    updates.forEach(update => update());
  });
};
```

## Data Validation

### Input Validation

```javascript
// Validate data before store updates
const validatePlayerUpdate = (playerId, updates) => {
  const player = usePlayerStore.getState().players[playerId];
  if (!player) throw new Error('Player not found');

  if (updates.attributes) {
    Object.entries(updates.attributes).forEach(([attr, value]) => {
      if (value < 1 || value > 20) {
        throw new Error(`Invalid attribute value: ${attr} = ${value}`);
      }
    });
  }

  if (updates.condition) {
    Object.entries(updates.condition).forEach(([cond, value]) => {
      if (value < 0 || value > 100) {
        throw new Error(`Invalid condition value: ${cond} = ${value}`);
      }
    });
  }

  return true;
};
```

### State Consistency Checks

```javascript
// Validate state consistency
const validateGameState = () => {
  const { teams } = useTeamStore.getState();
  const { players } = usePlayerStore.getState();

  // Check team-player relationships
  Object.values(teams).forEach(team => {
    team.squad.forEach(playerId => {
      const player = players[playerId];
      if (!player) {
        console.warn(`Player ${playerId} not found but in team ${team.id}`);
      } else if (player.teamId !== team.id) {
        console.warn(`Player ${playerId} teamId mismatch`);
      }
    });
  });

  // Check squad size limits
  Object.values(teams).forEach(team => {
    if (team.squad.length > 25) {
      console.warn(`Team ${team.id} exceeds squad limit`);
    }
  });
};
```

## Debugging Data Flow

### Store State Inspection

```javascript
// Debug helper for stores
window.debugStores = () => {
  const state = {
    game: useGameStore.getState(),
    teams: useTeamStore.getState(),
    players: usePlayerStore.getState(),
    match: useMatchStore.getState(),
    ui: useUIStore.getState()
  };

  console.log('Current store state:', state);
  return state;
};

// Debug specific store
window.debugPlayerStore = () => {
  const state = usePlayerStore.getState();
  console.log('Player store:', {
    playerCount: Object.keys(state.players).length,
    isLoaded: state.isLoaded,
    searchResults: state.searchResults.length,
    filters: state.filters
  });
};
```

### Data Flow Tracing

```javascript
// Trace data flow for debugging
const createTracingStore = (name, storeCreator) => {
  return create((set, get) => {
    const wrappedSet = (updates) => {
      console.log(`[${name}] State update:`, updates);
      return set(updates);
    };

    return {
      ...storeCreator(wrappedSet, get),
      _storeName: name
    };
  });
};
```