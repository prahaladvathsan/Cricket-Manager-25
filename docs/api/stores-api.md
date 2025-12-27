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

**Location**: `src/stores/gameStore.js` (persisted: `cm25-game-store` v4, compressed)

### State Properties

```typescript
interface GameState {
  currentSeason: number;
  currentPhase: 'preseason' | 'league' | 'playoffs' | 'offseason';
  currentWeek: number;
  currentDate: string;         // ISO date string
  gameDay: number;             // Integer counter starting at 1
  calendarEvents: Array<CalendarEvent>;
  isSimulating: boolean;
  settings: {
    difficulty: 'easy' | 'normal' | 'hard';
    simulationSpeed: 'instant' | 'fast' | 'normal';
    currency: string;
    nameProtection: boolean;
    autosave: boolean;
  };
}

interface CalendarEvent {
  day: number;      // Game day number
  type: string;     // 'match' | 'auction' | 'rest' | custom
  data: Object;     // Event-specific data (fixture, etc.)
}
```

### Actions

#### `advanceDay()`
Progress game by one day (v2).

```javascript
const { advanceDay } = useGameStore();

// Usage - called by Header Continue button
const result = advanceDay();

// Returns:
{
  type: 'match' | 'rest' | null,
  data: { matchId, homeTeam, awayTeam },
  isWeekend: boolean,
  gameDay: number,
  date: Date
}
```

**Returns**: `Object` - Event info for new day
**Side Effects**:
- Increments gameDay
- Updates currentDate
- Auto-advances week on Sunday→Monday transition
- Detects scheduled events

**Integration**:
```javascript
// Header.jsx
const handleContinue = () => {
  const { type, data, gameDay } = advanceDay();

  if (type === 'match') {
    navigate(`/game/match/${data.matchId}`);
  } else if (type === 'auction') {
    navigate('/game/auction');
  }
  // else: continue to next day
};
```

#### `advanceWeek()` / `advancePhase(newPhase: string)`
Progress week or season phase.

```javascript
const { advanceWeek, advancePhase } = useGameStore();

advanceWeek();
advancePhase('playoffs');
```

#### `scheduleEvent(day: number, type: string, data: Object)`
Schedule calendar event.

```javascript
const { scheduleEvent } = useGameStore();

// Usage
scheduleEvent(5, 'match', { matchId: 'fixture_001', homeTeam: 'MUM', awayTeam: 'LON' });
scheduleEvent(10, 'auction', {});
```

**Parameters**:
- `day` (number): Game day number
- `type` (string): Event type
- `data` (object): Event data

#### `scheduleEvents(events: Array<CalendarEvent>)`
Bulk schedule events.

```javascript
const { scheduleEvents } = useGameStore();

// Usage - schedule full season fixtures
const fixtures = leagueStore.fixtures.map((fixture, i) => ({
  day: i + 10,  // Start at day 10
  type: 'match',
  data: { matchId: fixture.id, homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam }
}));

scheduleEvents(fixtures);
```

#### `getCurrentEvent()` / `isWeekend()`
Get current day info.

```javascript
const { getCurrentEvent, isWeekend } = useGameStore();

const event = getCurrentEvent(); // Event for current gameDay or null
const weekend = isWeekend();     // true if Sat/Sun
```

#### `updateSettings(newSettings: Object)`
Update game preferences.

```javascript
const { updateSettings } = useGameStore();

updateSettings({
  autosave: true,
  simulationSpeed: 'fast'
});
```

#### `resetForNewSeason()` / `resetForNewGame()`
Reset state.

```javascript
const { resetForNewSeason, resetForNewGame } = useGameStore();

// New season (keep settings)
resetForNewSeason(); // Increments currentSeason, resets gameDay, clears events

// Brand new game (full reset)
resetForNewGame();
```

### Persistence

Version 2 persists:
- Season state (currentSeason, currentPhase, currentWeek)
- Calendar state (gameDay, currentDate, calendarEvents)
- Settings

**Migration**: Version bump handles old saves gracefully

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

---

## leagueStore API

**Purpose**: Manages league fixtures, match results, standings, and season progression.

### State Properties

```typescript
interface LeagueState {
  // Season info
  seasonId: string | null;
  seasonName: string;
  currentMatchday: number;
  currentWeek: number;
  currentFixtureIndex: number;  // Linear progression pointer
  stage: 'league' | 'playoffs' | 'completed';
  useMatchWeeks: boolean;

  // Fixtures & Results
  fixtures: Array<Fixture>;
  matchWeeks: Array<MatchWeek>;
  results: Array<MatchResult>;

  // Standings
  standings: Array<Standing>;

  // Clubs
  clubs: Record<string, Club>;

  // Statistics
  stats: {
    totalMatches: number;
    completedMatches: number;
    highestScore: { score: number; team: string; matchId: string };
    lowestScore: { score: number; team: string; matchId: string };
  };

  // Playoffs
  playoffFixtures: Array<Fixture>;
  playoffResults: Array<MatchResult>;
  champion: Champion | null;
}
```

### Actions

#### `initializeSeason(config: SeasonConfig)`
Initialize a new league season.

```javascript
const { initializeSeason } = useLeagueStore();

// Usage
initializeSeason({
  seasonId: 'wpl_2025_s1',
  seasonName: 'WPL 2025 Season 1',
  clubs: wplClubs,           // Array of 10 clubs
  fixtures: generatedFixtures, // Array of 90 fixtures
  matchWeeks: null,          // Optional match week schedule
  useMatchWeeks: false       // Use linear progression
});
```

**Parameters:**
- `config.seasonId` (string): Unique season identifier
- `config.seasonName` (string): Display name
- `config.clubs` (Array<Club>): All league clubs
- `config.fixtures` (Array<Fixture>): Pre-generated fixtures
- `config.matchWeeks` (Array<MatchWeek>, optional): Match week groupings
- `config.useMatchWeeks` (boolean, optional): Enable match week mode

**Returns**: `void`
**Side Effects**:
- Initializes standings for all clubs
- Resets match progression to start
- Clears previous season data

#### `recordResult(result: MatchResult)`
Record a completed match result.

```javascript
const { recordResult } = useLeagueStore();

// Usage
recordResult({
  matchId: 'fixture_001',
  winner: winnerClub,
  loser: loserClub,
  winMargin: 25,
  winType: 'runs',
  homeTeam: { ...homeClub, score: 180, wickets: 7, overs: '20.0' },
  awayTeam: { ...awayClub, score: 155, wickets: 10, overs: '19.2' },
  playerOfMatch: { name: 'V. Kohli', performance: '78 (45)' },
  topScorer: { name: 'V. Kohli', runs: 78, balls: 45 },
  topBowler: { name: 'J. Bumrah', wickets: 3, runs: 28 },
  innings1: innings1Data,
  innings2: innings2Data
});
```

**Parameters:**
- `result` (object): Match result from MatchEngine or QuickSimMatch

**Returns**: `void`
**Side Effects**: Updates stats (highest/lowest scores, completed matches)

#### `updateStandings(newStandings: Array<Standing>)`
Replace current standings with updated version.

```javascript
const { updateStandings } = useLeagueStore();

// Usage
const updatedStandings = calculateNewStandings(currentStandings, matchResult);
updateStandings(updatedStandings);
```

**Returns**: `void`

#### `advanceMatchday()`
Increment current matchday counter.

```javascript
const { advanceMatchday } = useLeagueStore();

// Usage
advanceMatchday();
```

**Returns**: `void`

#### `setStage(stage: string)`
Set league stage.

```javascript
const { setStage } = useLeagueStore();

// Usage
setStage('playoffs');  // 'league' | 'playoffs' | 'completed'
```

**Returns**: `void`

### Getters

#### `getClub(clubId: string)`
Get club data by ID.

```javascript
const getClub = useLeagueStore(state => state.getClub);

// Usage
const club = getClub('mumbai_thunders');
```

**Returns**: `Club | null`

#### `getNextFixture()`
Get next unplayed fixture based on currentFixtureIndex.

```javascript
const getNextFixture = useLeagueStore(state => state.getNextFixture);

// Usage
const nextFixture = getNextFixture();
// Returns: { id, homeTeam, awayTeam, venue, matchday } or null
```

**Returns**: `Fixture | null`
**Logic**: Returns `fixtures[currentFixtureIndex]` or playoff fixture if league complete

**Example:**
```javascript
const nextFixture = getNextFixture();

if (!nextFixture) {
  console.log('Season complete');
} else {
  console.log(`Next: ${nextFixture.homeTeam} vs ${nextFixture.awayTeam}`);
}
```

#### `getFixtureById(fixtureId: string)`
Retrieve specific fixture by ID (for deep linking).

```javascript
const getFixtureById = useLeagueStore(state => state.getFixtureById);

// Usage
const fixture = getFixtureById('fixture_001');
```

**Returns**: `Fixture | null`
**Search Order**: League fixtures → Playoff fixtures

**Use Case:**
```javascript
// Match.jsx - Load from URL parameter
const { matchId } = useParams();
const fixture = getFixtureById(matchId) || getNextFixture();
```

#### `isUserTeamMatch(fixture: Fixture, userTeamId: string)`
Check if user team is involved in fixture.

```javascript
const isUserTeamMatch = useLeagueStore(state => state.isUserTeamMatch);

// Usage
const isUserMatch = isUserTeamMatch(nextFixture, userTeam?.id);

if (isUserMatch) {
  navigate(`/game/match/${nextFixture.id}`);
} else {
  await quickSimMatch(matchConfig);
}
```

**Returns**: `boolean`

#### `advanceToNextMatch()`
Increment fixture index and matchday after match completion.

```javascript
const advanceToNextMatch = useLeagueStore(state => state.advanceToNextMatch);

// Usage
recordResult(matchResult);
const nextFixture = advanceToNextMatch();
```

**Returns**: `Fixture | null` (next fixture after advancing)
**Side Effects**: Increments `currentFixtureIndex` and `currentMatchday`

#### `getSeasonProgress()`
Get detailed season completion statistics.

```javascript
const getSeasonProgress = useLeagueStore(state => state.getSeasonProgress);

// Usage
const progress = getSeasonProgress();
```

**Returns:**
```typescript
{
  currentFixture: number;      // Current index
  totalFixtures: number;       // Total matches
  completed: number;           // Matches played
  remaining: number;           // Matches left
  progressPercent: number;     // Rounded percentage (0-100)
  currentWeek: number;         // Current week
  stage: string;               // 'league' | 'playoffs' | 'completed'
}
```

**Example:**
```jsx
const progress = getSeasonProgress();

<div className="progress-bar">
  <div style={{ width: `${progress.progressPercent}%` }} />
</div>
<span>{progress.completed}/{progress.totalFixtures} matches</span>
```

#### `getCurrentStandings()`
Get standings sorted by points and NRR.

```javascript
const getCurrentStandings = useLeagueStore(state => state.getCurrentStandings);

// Usage
const standings = getCurrentStandings();
```

**Returns**: `Array<Standing>`
**Sorting**: Points (desc) → NRR (desc) → Wins (desc)

#### `getMatchdayFixtures(matchday: number)`
Get all fixtures for specific matchday.

```javascript
const getMatchdayFixtures = useLeagueStore(state => state.getMatchdayFixtures);

// Usage
const matchday1 = getMatchdayFixtures(1);
```

**Returns**: `Array<Fixture>`

#### `getClubResults(clubId: string)`
Get all match results for a club.

```javascript
const getClubResults = useLeagueStore(state => state.getClubResults);

// Usage
const results = getClubResults('mumbai_thunders');
```

**Returns**: `Array<MatchResult>`

### Match Progression Example

```javascript
const MatchProgression = () => {
  const getNextFixture = useLeagueStore(state => state.getNextFixture);
  const isUserTeamMatch = useLeagueStore(state => state.isUserTeamMatch);
  const getClub = useLeagueStore(state => state.getClub);
  const recordResult = useLeagueStore(state => state.recordResult);
  const advanceToNextMatch = useLeagueStore(state => state.advanceToNextMatch);
  const { userTeam } = useTeamStore();
  const navigate = useNavigate();

  const handleContinue = async () => {
    const nextFixture = getNextFixture();

    if (!nextFixture) {
      console.log('Season complete');
      return;
    }

    const isUserMatch = isUserTeamMatch(nextFixture, userTeam?.id);

    if (isUserMatch) {
      // Navigate to interactive match
      navigate(`/game/match/${nextFixture.id}`);
    } else {
      // Quick-simulate AI vs AI match
      const matchConfig = {
        id: nextFixture.id,
        homeTeam: getClub(nextFixture.homeTeam),
        awayTeam: getClub(nextFixture.awayTeam),
        venue: nextFixture.venue,
        tossWinner: Math.random() < 0.5 ? nextFixture.homeTeam : nextFixture.awayTeam,
        tossDecision: Math.random() < 0.5 ? 'bat' : 'bowl'
      };

      const result = await quickSimMatch(matchConfig, useMatchStore, usePlayerStore, useTeamStore);

      // Record result and advance
      recordResult(result);
      advanceToNextMatch();
    }
  };

  return <button onClick={handleContinue}>Continue</button>;
};
```

### Persistence

leagueStore uses Zustand's `persist` middleware with **gzip compression**:

```javascript
import { compressedStorageOptions } from '../utils/compression.js';

persist(
  (set, get) => ({ ... }),
  {
    name: 'cm25-league-store',
    version: 3,
    storage: createJSONStorage(() => localStorage, compressedStorageOptions)
  }
)
```

**Persisted State:**
- All fixtures and results
- Current progression index
- Standings
- Season stage
- Club data

**Benefits:**
- Survives page refresh
- Resume season after closing browser
- **60-80% storage reduction** via gzip compression
- Prevents localStorage quota exceeded errors during full season simulation

---

## navigationStore API

**Purpose**: Manages route history for back button navigation.

**Location**: `src/stores/navigationStore.js` (no persistence)

### State Properties

```typescript
interface NavigationState {
  history: Array<string>;  // Route paths
  maxHistory: number;      // 20 routes max
}
```

### Actions

#### `pushRoute(path: string)`
Add route to history.

```javascript
const { pushRoute } = useNavigationStore();

// Usage - called automatically by Layout component
pushRoute('/game/squad');
```

**Behavior**:
- Skips duplicate consecutive routes
- Limits to last 20 routes
- Used by Layout's route tracking

#### `goBack()`
Return to previous route.

```javascript
const { goBack } = useNavigationStore();

// Usage - Header back button
const previousRoute = goBack();
if (previousRoute) {
  navigate(previousRoute);
}
```

**Returns**: `string | null` (previous route or null)
**Side Effects**: Removes current route from history

#### `canGoBack()`
Check if history exists.

```javascript
const canGoBack = useNavigationStore(state => state.canGoBack);

// Usage
if (canGoBack()) {
  // Show back button
}
```

**Returns**: `boolean`

#### `clearHistory()`
Reset navigation history.

```javascript
const { clearHistory } = useNavigationStore();

// Usage - logout or new game
clearHistory();
```

#### `getCurrentRoute()`
Get current route path.

```javascript
const getCurrentRoute = useNavigationStore(state => state.getCurrentRoute);

// Usage
const current = getCurrentRoute(); // "/game/squad"
```

**Returns**: `string | null`

### Integration

Auto-tracked in `Layout.jsx`:
```javascript
useEffect(() => {
  const isGameRoute = location.pathname.startsWith('/game');
  if (isGameRoute) {
    pushRoute(location.pathname);
  }
}, [location.pathname]);
```

Only tracks in-game routes (not menu routes).

---

## inboxStore API

**Purpose**: Manages in-game messages and notifications.

**Location**: `src/stores/inboxStore.js` (persisted: `cm25-inbox-store` v2, compressed)

### State Properties

```typescript
interface InboxState {
  messages: Array<Message>;
  unreadCount: number;
}

interface Message {
  id: string;              // "msg_{timestamp}_{random}"
  type: string;            // welcome | expectations | tutorial | auction_summary | match_reminder | match_result
  subject: string;
  body: string;            // Can include markdown
  sender: string;
  date: string;            // ISO string
  read: boolean;
  metadata: Object;        // Type-specific data (links, matchId, etc.)
}
```

### Actions

#### `addMessage(messageData: Object)`
Add new message to inbox.

```javascript
const { addMessage } = useInboxStore();

// Usage
addMessage({
  type: 'welcome',
  subject: 'Welcome to Mumbai Thunders!',
  body: 'Dear Manager...',
  sender: 'Board of Directors',
  metadata: { team: 'MUM', season: 1 }
});
```

**Parameters**:
- `type` (string): Message type
- `subject` (string): Subject line
- `body` (string): Body content
- `sender` (string, optional): Defaults to 'Team Management'
- `date` (string, optional): Defaults to now
- `metadata` (object, optional): Additional data

**Returns**: `string` (message ID)
**Side Effects**: Increments unreadCount

#### `markAsRead(messageId: string)` / `markAsUnread(messageId: string)`
Toggle read status.

```javascript
const { markAsRead, markAsUnread } = useInboxStore();

// Usage
markAsRead('msg_1234567890_abc');
```

**Side Effects**: Updates unreadCount

#### `deleteMessage(messageId: string)`
Remove message.

```javascript
const { deleteMessage } = useInboxStore();

// Usage
deleteMessage('msg_1234567890_abc');
```

**Side Effects**: Updates unreadCount if message was unread

#### `markAllAsRead()`
Mark all messages as read.

```javascript
const { markAllAsRead } = useInboxStore();

// Usage
markAllAsRead();
```

**Side Effects**: Sets unreadCount to 0

### Getters

#### `getMessage(messageId: string)`
Get specific message.

```javascript
const getMessage = useInboxStore(state => state.getMessage);

const message = getMessage('msg_1234567890_abc');
```

**Returns**: `Message | undefined`

#### `getMessagesByType(type: string)`
Filter messages by type.

```javascript
const getMessagesByType = useInboxStore(state => state.getMessagesByType);

const welcomeMessages = getMessagesByType('welcome');
```

**Returns**: `Array<Message>`

#### `getUnreadMessages()`
Get all unread messages.

```javascript
const getUnreadMessages = useInboxStore(state => state.getUnreadMessages);

const unread = getUnreadMessages();
```

**Returns**: `Array<Message>`

### Message Generation

Use `MessageGenerator` utility (see `docs/core-systems/messaging-system.md`):

```javascript
import MessageGenerator from '../utils/MessageGenerator';

// Generate and add message
const welcomeMsg = MessageGenerator.generateWelcomeMessage(team, season);
addMessage(welcomeMsg);
```

### Persistence

Persisted via Zustand middleware with **gzip compression**:
- Survives page refresh
- Includes all messages and unreadCount
- Version: 2
- Uses `compressedStorageOptions` for 60-80% storage reduction

---