# Stores API Reference

## Overview

Cricket Manager uses Zustand for state management. This document provides the complete API reference for all store methods, properties, and usage patterns.

## Store Architecture

```javascript
// Import pattern
import useStoreName from '../stores/storeName';

// Usage pattern
const Component = () => {
  const { state, action } = useStoreName();
  // or
  const specificValue = useStoreName(state => state.specificValue);
};
```

## gameStore API

**Purpose**: Manages season progression, calendar, and global game settings.

### State Properties

```typescript
interface GameState {
  currentSeason: number;
  currentDate: string;
  gameSpeed: 'slow' | 'normal' | 'fast';
  isGameActive: boolean;
  settings: {
    autoSave: boolean;
    simulationSpeed: 'instant' | 'fast' | 'normal';
    showDetailedStats: boolean;
    soundEnabled: boolean;
  };
  calendar: {
    fixtures: Array<MatchFixture>;
    events: Array<CalendarEvent>;
  };
}
```

### Actions

#### `startNewSeason()`
Initialize a new season.

```javascript
const { startNewSeason } = useGameStore();

// Usage
await startNewSeason();
```

**Parameters**: None
**Returns**: `Promise<void>`
**Side Effects**: Resets season data, generates new fixtures

#### `advanceDate(days: number)`
Progress the game calendar.

```javascript
const { advanceDate } = useGameStore();

// Usage
advanceDate(1); // Advance by 1 day
advanceDate(7); // Advance by 1 week
```

**Parameters**:
- `days` (number): Number of days to advance

**Returns**: `void`
**Side Effects**: Updates current date, processes calendar events

#### `updateSettings(settings: Partial<GameSettings>)`
Update game preferences.

```javascript
const { updateSettings } = useGameStore();

// Usage
updateSettings({
  autoSave: true,
  simulationSpeed: 'fast'
});
```

**Parameters**:
- `settings` (object): Partial settings object

**Returns**: `void`

#### `pauseGame()` / `resumeGame()`
Control game state.

```javascript
const { pauseGame, resumeGame, isGameActive } = useGameStore();

// Usage
if (isGameActive) {
  pauseGame();
} else {
  resumeGame();
}
```

**Returns**: `void`

### Getters

#### `getCurrentDate()`
Get formatted current date.

```javascript
const getCurrentDate = useGameStore(state => state.getCurrentDate);

// Usage
const dateString = getCurrentDate(); // "2024-03-15"
```

**Returns**: `string` - ISO date string

#### `getUpcomingMatches(days: number)`
Get matches in next N days.

```javascript
const getUpcomingMatches = useGameStore(state => state.getUpcomingMatches);

// Usage
const nextMatches = getUpcomingMatches(7);
```

**Parameters**:
- `days` (number): Days to look ahead

**Returns**: `Array<MatchFixture>`

---

## teamStore API

**Purpose**: Manages all team data, squad composition, and user team selection.

### State Properties

```typescript
interface TeamState {
  teams: Record<string, Team>;
  userTeam: string | null;
  formations: Record<string, Formation>;
}

interface Team {
  id: string;
  name: string;
  city: string;
  stadium: string;
  squad: string[]; // player IDs
  finances: number;
  userControlled: boolean;
  tactics: TeamTactics;
}
```

### Actions

#### `selectUserTeam(teamId: string)`
Set the user's team.

```javascript
const { selectUserTeam } = useTeamStore();

// Usage
selectUserTeam('MUM'); // Mumbai Thunders
```

**Parameters**:
- `teamId` (string): Team identifier

**Returns**: `void`
**Side Effects**: Updates userTeam, saves to localStorage

#### `updateSquad(teamId: string, players: string[])`
Update team squad composition.

```javascript
const { updateSquad } = useTeamStore();

// Usage
const newSquad = ['player1', 'player2', 'player3'];
updateSquad('MUM', newSquad);
```

**Parameters**:
- `teamId` (string): Team identifier
- `players` (Array<string>): Array of player IDs

**Returns**: `void`
**Validation**: Checks squad size limits, salary cap

#### `transferPlayer(playerId: string, fromTeam: string, toTeam: string)`
Transfer player between teams.

```javascript
const { transferPlayer } = useTeamStore();

// Usage
transferPlayer('player123', 'MUM', 'LON');
```

**Parameters**:
- `playerId` (string): Player identifier
- `fromTeam` (string): Source team ID
- `toTeam` (string): Destination team ID

**Returns**: `void`
**Validation**: Checks squad limits, finances

#### `updateTactics(teamId: string, tactics: TeamTactics)`
Update team tactical settings.

```javascript
const { updateTactics } = useTeamStore();

// Usage
updateTactics('MUM', {
  battingOrder: ['player1', 'player2', 'player3'],
  bowlingOrder: ['bowler1', 'bowler2'],
  fieldingPositions: {
    wicketKeeper: 'player1',
    captain: 'player2'
  }
});
```

### Getters

#### `getTeam(teamId: string)`
Get specific team data.

```javascript
const getTeam = useTeamStore(state => state.getTeam);

// Usage
const team = getTeam('MUM');
```

**Returns**: `Team | null`

#### `getUserTeam()`
Get user's selected team.

```javascript
const getUserTeam = useTeamStore(state => state.getUserTeam);

// Usage
const userTeam = getUserTeam();
```

**Returns**: `Team | null`

#### `getTeamPlayers(teamId: string)`
Get players in team squad.

```javascript
const getTeamPlayers = useTeamStore(state => state.getTeamPlayers);

// Usage
const players = getTeamPlayers('MUM');
```

**Returns**: `Array<string>` - Player IDs

#### `getAllTeams()`
Get all teams as array.

```javascript
const getAllTeams = useTeamStore(state => state.getAllTeams);

// Usage
const teams = getAllTeams();
```

**Returns**: `Array<Team>`

---

## playerStore API

**Purpose**: Manages player database, search/filtering, and attribute systems.

### State Properties

```typescript
interface PlayerState {
  players: Record<string, Player>;
  isLoaded: boolean;
  filters: PlayerFilters;
  searchResults: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface Player {
  id: string;
  name: string;
  attributes: PlayerAttributes;
  condition: PlayerCondition;
  role: string;
  value: number;
  teamId: string | null;
}
```

### Actions

#### `loadPlayerDatabase()`
Initialize player database from JSON.

```javascript
const { loadPlayerDatabase, isLoaded } = usePlayerStore();

// Usage
if (!isLoaded) {
  await loadPlayerDatabase();
}
```

**Returns**: `Promise<void>`
**Side Effects**: Loads ~1000+ players into store

#### `searchPlayers(criteria: SearchCriteria)`
Filter players by criteria.

```javascript
const { searchPlayers } = usePlayerStore();

// Usage
searchPlayers({
  role: 'Batsman',
  minRating: 80,
  maxAge: 30,
  teamId: null // Free agents only
});
```

**Parameters**:
- `criteria` (object): Search filters

```typescript
interface SearchCriteria {
  role?: string;
  minRating?: number;
  maxRating?: number;
  minAge?: number;
  maxAge?: number;
  teamId?: string | null;
  nationality?: string;
}
```

**Returns**: `void`
**Side Effects**: Updates searchResults array

#### `updatePlayerCondition(playerId: string, updates: Partial<PlayerCondition>)`
Update player's current condition.

```javascript
const { updatePlayerCondition } = usePlayerStore();

// Usage
updatePlayerCondition('player123', {
  form: 85,
  fitness: 90,
  fatigue: 20
});
```

**Parameters**:
- `playerId` (string): Player identifier
- `updates` (object): Condition updates

**Returns**: `void`

#### `sortPlayers(field: string, order: 'asc' | 'desc')`
Sort search results.

```javascript
const { sortPlayers } = usePlayerStore();

// Usage
sortPlayers('attributes.batting.technique', 'desc');
```

**Parameters**:
- `field` (string): Field to sort by (supports nested paths)
- `order` (string): Sort direction

**Returns**: `void`

### Getters

#### `getPlayer(playerId: string)`
Get specific player data.

```javascript
const getPlayer = usePlayerStore(state => state.getPlayer);

// Usage
const player = getPlayer('player123');
```

**Returns**: `Player | null`

#### `getPlayersByRole(role: string)`
Get players by position.

```javascript
const getPlayersByRole = usePlayerStore(state => state.getPlayersByRole);

// Usage
const batsmen = getPlayersByRole('Batsman');
```

**Parameters**:
- `role` (string): Player role

**Returns**: `Array<Player>`

#### `getFreeAgents()`
Get players not assigned to teams.

```javascript
const getFreeAgents = usePlayerStore(state => state.getFreeAgents);

// Usage
const freeAgents = getFreeAgents();
```

**Returns**: `Array<Player>`

#### `getTopPlayers(count: number, attribute: string)`
Get highest-rated players by attribute.

```javascript
const getTopPlayers = usePlayerStore(state => state.getTopPlayers);

// Usage
const topBatsmen = getTopPlayers(10, 'batting.technique');
```

**Parameters**:
- `count` (number): Number of players to return
- `attribute` (string): Attribute path to sort by

**Returns**: `Array<Player>`

---

## matchStore API

**Purpose**: Manages active match simulation, ball-by-ball data, and match events.

### State Properties

```typescript
interface MatchState {
  matchId: string | null;
  status: 'scheduled' | 'live' | 'innings_break' | 'completed';
  matchType: 'T20' | 'ODI' | 'Test';
  teams: {
    batting: TeamMatchData;
    bowling: TeamMatchData;
  };
  innings: InningsData;
  currentBall: BallState;
  ballByBall: Array<BallResult>;
  commentary: Array<CommentaryEntry>;
  matchConditions: Record<string, PlayerMatchCondition>;
}
```

### Actions

#### `initializeMatch(config: MatchConfig)`
Start a new match.

```javascript
const { initializeMatch } = useMatchStore();

// Usage
initializeMatch({
  homeTeam: { id: 'MUM', squad: ['player1', 'player2'] },
  awayTeam: { id: 'LON', squad: ['player3', 'player4'] },
  venue: 'wankhede',
  tossWinner: 'MUM',
  tossDecision: 'bat'
});
```

**Parameters**:
- `config` (object): Match configuration

**Returns**: `void`
**Side Effects**: Initializes match state, sets up teams

#### `processBallResult(result: BallResult)`
Update match state with ball outcome from 4-step simulation.

```javascript
const { processBallResult } = useMatchStore();

// Usage - typically called by SimpleBallSimulator
processBallResult({
  outcome: 'FOUR',
  runs: 4,
  isWicket: false,
  isLegal: true,
  dismissalType: null,
  dismissedPlayer: null,
  commentary: 'Brilliant boundary shot!',
  conditionUpdates: {
    'striker123': { energy: -0.8, confidence: 5, fatigue: 0.08 },
    'bowler456': { energy: -1.2, confidence: -3, fatigue: 0.12 }
  },
  metadata: {
    decisionResult: { deliveryThreat: 35, judgmentAbility: 42 },
    contactResult: { type: 'MIDDLED', scoreDelta: 15 },
    trajectoryResult: { shotType: 'grounded', shotSpeed: 85 },
    fieldingResult: { outcome: 'FOUR', fieldingAction: {...} },
    timestamp: 1640995200000
  }
});
```

**Parameters**:
- `result` (object): Enhanced ball simulation result from 4-step architecture

**Returns**: `void`
**Side Effects**: Updates ball-by-ball record, player conditions, match statistics

#### `startSecondInnings()`
Transition to second innings.

```javascript
const { startSecondInnings } = useMatchStore();

// Usage
startSecondInnings();
```

**Returns**: `void`
**Side Effects**: Swaps batting/bowling teams, sets target

#### `completeMatch(result: string)`
Finish the match.

```javascript
const { completeMatch } = useMatchStore();

// Usage
completeMatch('Mumbai Thunders won by 6 wickets');
```

**Parameters**:
- `result` (string): Match result description

**Returns**: `void`

### Getters

#### `getCurrentSituation()`
Get match context for simulation.

```javascript
const getCurrentSituation = useMatchStore(state => state.getCurrentSituation);

// Usage
const situation = getCurrentSituation();
// Returns: { phase, required, ballsLeft, pressure }
```

**Returns**: `MatchSituation`

#### `getMatchSummary()`
Get complete match statistics.

```javascript
const getMatchSummary = useMatchStore(state => state.getMatchSummary);

// Usage
const summary = getMatchSummary();
```

**Returns**: `MatchSummary`

#### `getBowlingFigures(playerId: string)`
Get player's bowling statistics.

```javascript
const getBowlingFigures = useMatchStore(state => state.getBowlingFigures);

// Usage
const figures = getBowlingFigures('bowler123');
// Returns: { overs, maidens, runs, wickets }
```

**Returns**: `BowlingFigures`

---

## uiStore API

**Purpose**: Manages navigation state, modal visibility, and user interface preferences.

### State Properties

```typescript
interface UIState {
  currentPage: string;
  activeModal: string | null;
  modalData: any;
  sidebarOpen: boolean;
  notifications: Array<Notification>;
  preferences: UserPreferences;
}
```

### Actions

#### `navigateTo(page: string, data?: any)`
Change current page.

```javascript
const { navigateTo } = useUIStore();

// Usage
navigateTo('squad');
navigateTo('player', { playerId: 'player123' });
```

**Parameters**:
- `page` (string): Page identifier
- `data` (object, optional): Page data

**Returns**: `void`

#### `openModal(modalType: string, data?: any)`
Show modal dialog.

```javascript
const { openModal } = useUIStore();

// Usage
openModal('playerDetails', { playerId: 'player123' });
openModal('confirmTransfer', { player, fromTeam, toTeam });
```

**Parameters**:
- `modalType` (string): Modal component identifier
- `data` (object, optional): Modal data

**Returns**: `void`

#### `closeModal()`
Hide current modal.

```javascript
const { closeModal } = useUIStore();

// Usage
closeModal();
```

**Returns**: `void`

#### `addNotification(notification: Notification)`
Show notification message.

```javascript
const { addNotification } = useUIStore();

// Usage
addNotification({
  type: 'success',
  message: 'Player signed successfully!',
  duration: 3000
});
```

**Parameters**:
- `notification` (object): Notification data

**Returns**: `void`

#### `updatePreferences(preferences: Partial<UserPreferences>)`
Update user preferences.

```javascript
const { updatePreferences } = useUIStore();

// Usage
updatePreferences({
  theme: 'dark',
  soundEnabled: false
});
```

**Returns**: `void`

## Common Usage Patterns

### Multiple Store Usage

```javascript
const MatchDashboard = () => {
  // Subscribe to multiple stores
  const { currentSeason } = useGameStore();
  const { getUserTeam } = useTeamStore();
  const { status, teams } = useMatchStore();
  const { navigateTo } = useUIStore();

  const userTeam = getUserTeam();

  return (
    <div>
      <h1>Season {currentSeason}</h1>
      <h2>{userTeam?.name}</h2>
      {status === 'live' && (
        <div>Match in progress...</div>
      )}
    </div>
  );
};
```

### Derived State

```javascript
// Custom hook for derived state
const useTeamStats = (teamId) => {
  const players = usePlayerStore(state =>
    Object.values(state.players).filter(p => p.teamId === teamId)
  );

  return useMemo(() => ({
    totalPlayers: players.length,
    averageRating: players.reduce((sum, p) => sum + p.rating, 0) / players.length,
    totalValue: players.reduce((sum, p) => sum + p.value, 0)
  }), [players]);
};
```

### Error Handling

```javascript
const useAsyncAction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performAction = async (action) => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { performAction, loading, error };
};
```