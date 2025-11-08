# Match View Component

## Overview

The Match View (`Match.jsx`) is the core interactive match interface that allows users to play matches ball-by-ball with full simulation control. It provides a 3-column layout with scorecard, commentary, and tactics, integrating seamlessly with the MatchEngine for real-time match simulation.

**File:** `src/components/match/Match.jsx`

**Purpose:** Interactive match view with ball-by-ball simulation controls

**Key Features:**
- Real-time match simulation with user controls
- Live scorecard updates
- Ball-by-ball commentary feed
- In-match tactical controls
- Pre-match setup modal
- Error handling and recovery
- Deep linking support via match ID routing

## Component Architecture

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        MATCH HEADER                             │
│  Teams • Venue • Live Indicator • Exit Button                   │
├─────────────────────────────────────────────────────────────────┤
│                       SCORE DISPLAY                             │
│         Home Team Score  |  Away Team Score                     │
│         Batting indicator, overs, target (2nd innings)          │
├─────────────────────────────────────────────────────────────────┤
│                    MATCH CONTROLS                               │
│    [Play Ball] [Skip Over] [Auto-Simulate/Pause]               │
├──────────────┬──────────────────┬────────────────────────────────┤
│              │                  │                                │
│  SCORECARD   │   COMMENTARY     │  TACTICS PANEL                 │
│  (5 cols)    │   (4 cols)       │  (3 cols - user team only)     │
│              │                  │                                │
│  Batting     │   Ball-by-ball   │  Batting Order                 │
│  Scorecard   │   Feed           │  Bowling Rotation              │
│              │                  │  Field Settings                │
│  Bowling     │   Auto-scroll    │  Mentality                     │
│  Figures     │   Latest first   │                                │
│              │                  │                                │
└──────────────┴──────────────────┴────────────────────────────────┘
```

### State Management

**Component State:**
```javascript
const [matchEngine, setMatchEngine] = useState(null);
const [matchState, setMatchState] = useState('not_started');
const [isSimulating, setIsSimulating] = useState(false);
const [showPreMatchModal, setShowPreMatchModal] = useState(true);
const [matchData, setMatchData] = useState(null);
const [tossResult, setTossResult] = useState(null);
const [simError, setSimError] = useState(null);
```

**Store Subscriptions:**
```javascript
// matchStore - reactive updates
const teams = useMatchStore((state) => state.teams);
const innings = useMatchStore((state) => state.innings);
const currentBall = useMatchStore((state) => state.currentBall);
const ballByBall = useMatchStore((state) => state.ballByBall);
const matchStatus = useMatchStore((state) => state.status);

// leagueStore - fixture data
const getFixtureById = useLeagueStore((state) => state.getFixtureById);
const getClub = useLeagueStore((state) => state.getClub);

// teamStore - user team
const userTeam = useTeamStore((state) => state.userTeam);
```

## Component Lifecycle

### 1. Initialization (useEffect)

```javascript
useEffect(() => {
  // Load match data from league store
  let fixture = null;

  // Try to get fixture by ID (from URL parameter)
  if (matchId) {
    fixture = getFixtureById(matchId);
  }

  // Fallback to next fixture
  if (!fixture) {
    fixture = getNextFixture();
  }

  // Redirect if no fixture found
  if (!fixture) {
    navigate('/game/league');
    return;
  }

  // Load team data
  const homeTeam = getClub(fixture.homeTeam);
  const awayTeam = getClub(fixture.awayTeam);

  setMatchData({
    id: fixture.id,
    homeTeam,
    awayTeam,
    venue: fixture.venue || homeTeam.homeGround,
    weather: fixture.weather || 'Clear',
    matchday: fixture.matchday
  });

  // Cleanup on unmount
  return () => {
    if (autoSimulateRef.current) {
      clearInterval(autoSimulateRef.current);
    }
  };
}, [matchId, getFixtureById, getNextFixture, getClub, navigate]);
```

**Loading Flow:**
1. Extract matchId from URL params
2. Attempt to load fixture by ID (for deep linking)
3. Fallback to next fixture if ID not found
4. Load home and away team data
5. Set up match configuration
6. Show PreMatchModal

### 2. Pre-Match Setup (handleStartMatch)

```javascript
const handleStartMatch = async (toss) => {
  try {
    setTossResult(toss);
    setShowPreMatchModal(false);

    // Determine batting team based on toss
    const battingFirst = toss.decision === 'bat' ? toss.winner.id :
                        (toss.winner.id === matchData.homeTeam.id ? matchData.awayTeam.id : matchData.homeTeam.id);

    // Initialize matchStore
    initializeMatchStore({
      homeTeam: matchData.homeTeam.id,
      awayTeam: matchData.awayTeam.id,
      venue: matchData.venue,
      tossWinner: toss.winner.id,
      tossDecision: toss.decision,
      battingFirst
    });

    // Create match engine
    const engine = new MatchEngine(
      useMatchStore,
      usePlayerStore,
      useTeamStore,
      { silent: false }
    );

    // Configure for interactive mode
    engine.config.interactiveMode = true;
    engine.config.showBallByBall = true;
    engine.config.simulationSpeed = 'instant';

    setMatchEngine(engine);

    // Initialize match (set up opening players)
    await engine.startMatch({
      ...matchData,
      tossWinner: toss.winner.id,
      tossDecision: toss.decision
    });

    // Pause immediately (user controls pace)
    engine.isPaused = true;

    setMatchState('in_progress');
  } catch (error) {
    console.error('Error starting match:', error);
    setMatchState('error');
  }
};
```

**Setup Steps:**
1. Receive toss result from PreMatchModal
2. Calculate batting team based on toss decision
3. Initialize matchStore with match config
4. Create MatchEngine instance
5. Configure engine for interactive mode
6. Start match (sets up opening batsmen, bowler)
7. Pause engine (wait for user input)
8. Update state to 'in_progress'

## Simulation Controls

### Play Ball (Single Ball)

```javascript
const handlePlayBall = async () => {
  if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

  setSimError(null);

  try {
    setIsSimulating(true);

    // Simulate one ball
    await matchEngine.simulateBall();

    // Check if innings/match is complete
    if (matchEngine.isMatchComplete()) {
      setMatchState('completed');
    } else if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
      // Start second innings automatically
      await matchEngine.startSecondInnings();
    }

    setIsSimulating(false);
  } catch (error) {
    console.error('Error simulating ball:', error);
    setSimError(error.message || 'Failed to simulate ball');
    setIsSimulating(false);
  }
};
```

**Behavior:**
- Simulates single ball with full UI update
- Automatically transitions to 2nd innings if 1st complete
- Sets match to 'completed' when match ends
- Shows error if simulation fails

**UI Updates:**
- Scorecard updates (runs, wickets, overs)
- Commentary feed adds new entry
- Current batsman/bowler stats update
- Progress indicators update

### Skip Over (6 Balls)

```javascript
const handleSkipOver = async () => {
  if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

  setSimError(null);

  try {
    setIsSimulating(true);

    const ballsRemaining = 6 - (currentBall?.ball || 0);

    for (let i = 0; i < ballsRemaining; i++) {
      if (matchEngine.isInningsComplete() || matchEngine.isMatchComplete()) {
        break;
      }

      await matchEngine.simulateBall();
      await new Promise(resolve => setTimeout(resolve, 100)); // Visual feedback delay
    }

    // Check if innings/match is complete
    if (matchEngine.isMatchComplete()) {
      setMatchState('completed');
    } else if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
      await matchEngine.startSecondInnings();
    }

    setIsSimulating(false);
  } catch (error) {
    console.error('Error skipping over:', error);
    setSimError(error.message || 'Failed to skip over');
    setIsSimulating(false);
  }
};
```

**Behavior:**
- Calculates balls remaining in current over (6 - currentBall.ball)
- Simulates each ball with 100ms delay for visual feedback
- Stops early if innings/match completes
- Handles innings transition

**Use Case:**
- User wants to skip to end of over (bowling change, drinks break)
- Faster than clicking Play Ball 6 times

### Auto-Simulate (Full Match)

```javascript
const handleAutoSimulate = async () => {
  if (!matchEngine || matchState !== 'in_progress' || isSimulating) return;

  setSimError(null);
  setIsSimulating(true);

  try {
    // Unpause the engine
    matchEngine.isPaused = false;

    // Simulate balls rapidly until match complete
    while (!matchEngine.isMatchComplete() && !matchEngine.isPaused) {
      await matchEngine.simulateBall();

      // Check if innings complete
      if (matchEngine.isInningsComplete() && !matchEngine.isMatchComplete()) {
        await matchEngine.startSecondInnings();
      }

      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    setMatchState('completed');
    setIsSimulating(false);
  } catch (error) {
    console.error('Error auto-simulating:', error);
    setSimError(error.message || 'Failed to auto-simulate');
    matchEngine.isPaused = true;
    setIsSimulating(false);
  }
};
```

**Behavior:**
- Unpause engine and simulate continuously
- 10ms delay between balls for UI responsiveness
- User can pause at any time (see Pause button)
- Automatically handles innings transition
- Sets match to 'completed' when done

**Performance:**
- ~100 balls/second (10ms delay)
- Full T20 match (~240 balls) completes in ~2.5 seconds
- UI remains responsive throughout

### Pause

```javascript
const handlePause = () => {
  if (matchEngine) {
    matchEngine.isPaused = true;
  }
  setIsSimulating(false);
};
```

**Behavior:**
- Sets engine pause flag (stops auto-simulation loop)
- Updates UI to show paused state
- User can resume with Play Ball or Auto-Simulate

**UI State:**
```jsx
{!isSimulating ? (
  <button onClick={handleAutoSimulate}>
    <FastForward /> Auto-Simulate
  </button>
) : (
  <button onClick={handlePause}>
    <Pause /> Pause
  </button>
)}
```

## Child Components

### MatchScorecard

**File:** `src/components/match/MatchScorecard.jsx`

**Purpose:** Display batting and bowling statistics

**Props:**
```javascript
{
  matchData: {
    homeTeam: Club,
    awayTeam: Club
  },
  innings: {
    battingTeam: string,
    battingScorecard: Array<BatsmanStats>,
    bowlingFigures: Object<BowlerStats>
  },
  currentInnings: number  // 1 or 2
}
```

**Sections:**
- Current innings batting scorecard
- Current innings bowling figures
- Previous innings summary (2nd innings only)

**Example:**
```jsx
<MatchScorecard
  matchData={matchData}
  innings={innings}
  currentInnings={currentInnings}
/>
```

### CommentaryFeed

**File:** `src/components/match/CommentaryFeed.jsx`

**Purpose:** Ball-by-ball commentary with auto-scroll

**Props:**
```javascript
{
  ballByBall: Array<BallResult>,
  autoScroll: boolean
}
```

**Features:**
- Latest commentary at top
- Auto-scroll to newest entry
- Ball outcome formatting (runs, wickets, extras)
- Over boundaries

**Ball Display:**
```
18.4: J. Bumrah to V. Kohli, FOUR! Cover drive
18.3: J. Bumrah to V. Kohli, 1 run
18.2: J. Bumrah to V. Kohli, no run
...
```

### TacticsPanel

**File:** `src/components/match/TacticsPanel.jsx`

**Purpose:** In-match tactical controls (user team only)

**Props:**
```javascript
{
  userTeamId: string,
  isUserTeamBatting: boolean
}
```

**Features:**
- Batting order adjustment
- Bowling rotation selection
- Field placement settings
- Team mentality control (Aggressive, Balanced, Defensive)

**Conditional Rendering:**
```jsx
{userTeam && (
  <TacticsPanel
    userTeamId={userTeam.id}
    isUserTeamBatting={isUserTeamBatting()}
  />
)}
```

**Note:** Only shown when user team is playing (not for AI vs AI matches)

## Score Display

### Match Header Score

```jsx
<div className="grid grid-cols-2 gap-4">
  {/* Home Team */}
  <div className={`p-3 rounded ${
    innings?.battingTeam === matchData.homeTeam?.id
      ? 'bg-cricket-primary/10 border-2 border-cricket-accent'  // Batting indicator
      : 'bg-bg-tertiary'
  }`}>
    <div className="text-sm font-semibold">{matchData.homeTeam?.name}</div>
    <div className="text-3xl font-bold text-cricket-accent">
      {formatScore(teams?.batting)}  {/* 152/7 */}
    </div>
    <div className="text-xs text-text-secondary">
      {formatOvers(innings?.overs, innings?.balls)} overs  {/* 18.3 overs */}
    </div>
  </div>

  {/* Away Team (similar) */}
</div>
```

**Helper Functions:**
```javascript
const formatScore = (teamData) => {
  if (!teamData) return '0/0';
  return `${teamData.totalScore || 0}/${teamData.wickets || 0}`;
};

const formatOvers = (overs, balls) => {
  if (!overs && !balls) return '0.0';
  return `${overs || 0}.${balls || 0}`;
};
```

### Target Display (2nd Innings)

```jsx
{innings?.number === 2 && innings?.target && (
  <div className="p-2 bg-bg-tertiary rounded text-center">
    <span className="text-text-secondary">Target: </span>
    <span className="font-bold text-cricket-accent">{innings.target}</span>
    <span className="text-text-secondary ml-3">Required Rate: </span>
    <span className="font-bold">
      {calculateRequiredRate()}
    </span>
  </div>
)}
```

**Required Rate Calculation:**
```javascript
const requiredRuns = innings.target - (teams?.batting?.totalScore || 0);
const ballsRemaining = 120 - ((innings?.overs || 0) * 6 + (innings?.balls || 0));
const requiredRate = (requiredRuns / (ballsRemaining / 6)).toFixed(2);
```

## Error Handling

### Error Types

**1. Match Initialization Error**
```javascript
try {
  await engine.startMatch(matchConfig);
  setMatchState('in_progress');
} catch (error) {
  console.error('Error starting match:', error);
  setMatchState('error');
}
```

**Display:**
```
State: 'error'
User sees: "Failed to initialize match" message
Actions: Exit to league, reload page
```

**2. Ball Simulation Error**
```javascript
try {
  await matchEngine.simulateBall();
} catch (error) {
  setSimError(error.message || 'Failed to simulate ball');
  setIsSimulating(false);
}
```

**Display:**
```jsx
{simError && (
  <div className="card p-3 bg-red-500/10 border border-red-500/30">
    <AlertCircle /> Simulation Error
    <p>{simError}</p>
    <button onClick={() => setSimError(null)}>Dismiss</button>
  </div>
)}
```

**Recovery:** User can dismiss error and try again or exit match

**3. Missing Fixture Error**
```javascript
if (!fixture) {
  console.warn('No fixture found, redirecting to league');
  navigate('/game/league');
  return;
}
```

**Graceful Fallback:** Automatically redirect to league view

### Error State Management

```javascript
const [simError, setSimError] = useState(null);

// Clear error before new action
const handlePlayBall = async () => {
  setSimError(null);  // Clear previous error
  try {
    // ... simulation
  } catch (error) {
    setSimError(error.message);
  }
};

// User can dismiss manually
<button onClick={() => setSimError(null)}>Dismiss</button>
```

## Match Completion

### Completion Detection

```javascript
// After each ball
if (matchEngine.isMatchComplete()) {
  setMatchState('completed');
}

// Check method in MatchEngine
isMatchComplete() {
  return this.matchState.status === 'completed';
}
```

### Completion UI

```jsx
{matchState === 'completed' && (
  <button onClick={handleContinue} className="btn-primary">
    <ChevronRight /> Continue
  </button>
)}
```

### Continue Action

```javascript
const handleContinue = () => {
  // Navigate back to league view
  navigate('/game/league');

  // Note: Match result is already in matchStore
  // League view will record result and update standings
};
```

**Post-Match Flow:**
1. User clicks Continue
2. Navigate to /game/league
3. League view detects completed match
4. Records result via leagueStore.recordResult()
5. Updates standings via leagueStore.updateStandings()
6. Advances to next fixture via leagueStore.advanceToNextMatch()

## Routing & Deep Linking

### URL Structure

```
/game/match/:matchId

Examples:
/game/match/fixture_001
/game/match/mumbai_vs_london_1640995200000
```

### Deep Linking Support

```javascript
// Load specific match by ID
const { matchId } = useParams();
const fixture = getFixtureById(matchId);

// Fallback to next fixture if ID invalid
if (!fixture) {
  fixture = getNextFixture();
}
```

**Use Cases:**
- Bookmarking specific matches
- Sharing match links
- Returning to match from external navigation
- Match replay functionality (future)

### Navigation Integration

**From Dashboard/League:**
```javascript
navigate(`/game/match/${nextFixture.id}`);
```

**Exit Match:**
```javascript
<button onClick={() => navigate('/game/league')}>
  <X /> Exit
</button>
```

## Performance Optimization

### State Subscription Optimization

```javascript
// ❌ BAD: Subscribe to entire store (re-renders on any change)
const matchStore = useMatchStore();

// ✅ GOOD: Subscribe to specific state slices
const teams = useMatchStore((state) => state.teams);
const innings = useMatchStore((state) => state.innings);
```

### Simulation Performance

**Interactive Mode:**
- Single ball: ~10-20ms
- Over skip: ~600ms-1s (6 balls with 100ms delay)
- Full match auto-sim: ~2.5s (240 balls with 10ms delay)

**Optimization Techniques:**
```javascript
// Batch state updates in MatchEngine
matchStore.setState({
  teams: newTeams,
  innings: newInnings,
  currentBall: newBall
});

// Use setTimeout for non-blocking UI updates
await new Promise(resolve => setTimeout(resolve, 10));
```

### Component Rendering

**Memoization (future enhancement):**
```javascript
const MemoizedScorecard = React.memo(MatchScorecard);
const MemoizedCommentary = React.memo(CommentaryFeed);
```

## Testing

### Component Testing

**Load Match:**
```javascript
// Test fixture loading
expect(getFixtureById('fixture_001')).toBeDefined();

// Test fallback
expect(getNextFixture()).toBeDefined();
```

**Simulation Controls:**
```javascript
// Test play ball
await handlePlayBall();
expect(ballByBall.length).toBeGreaterThan(0);

// Test skip over
await handleSkipOver();
expect(currentBall.ball).toBe(0); // New over

// Test auto-simulate
await handleAutoSimulate();
expect(matchState).toBe('completed');
```

**Error Handling:**
```javascript
// Test missing fixture
matchId = 'invalid_id';
expect(fixture).toBeNull();
expect(navigateCalled).toBe(true);
```

### Manual Testing Checklist

- [ ] Match loads from URL parameter
- [ ] Match loads from next fixture (fallback)
- [ ] PreMatchModal shows toss and tactics
- [ ] Play Ball simulates single ball
- [ ] Skip Over completes current over
- [ ] Auto-Simulate finishes entire match
- [ ] Pause stops auto-simulation
- [ ] Scorecard updates in real-time
- [ ] Commentary feed auto-scrolls
- [ ] Tactics panel shows for user team only
- [ ] Target display shows in 2nd innings
- [ ] Match completion shows Continue button
- [ ] Exit button returns to league
- [ ] Error alerts display and dismiss correctly

## Related Components

- **PreMatchModal** - Pre-match setup and toss
- **MatchScorecard** - Batting/bowling statistics display
- **CommentaryFeed** - Ball-by-ball commentary
- **TacticsPanel** - In-match tactical controls
- **MatchResultModal** - Post-match result display (AI matches)

## Related Documentation

- [Match Progression System](../features/match-progression-system.md) - Complete flow overview
- [Match Engine](../core-systems/match-engine.md) - Ball-by-ball simulation
- [State Management](../frontend/state-management.md) - Zustand patterns
- [Stores API](../api/stores-api.md) - matchStore, leagueStore APIs

---

**Last Updated:** January 2025
**Component Version:** 1.0
**Phase:** Phase 5 - Frontend UI Development
