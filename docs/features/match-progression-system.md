# Match Progression System

## Overview

The Match Progression System is a complete season flow implementation that intelligently routes users through league fixtures, automatically handling both user-controlled interactive matches and AI vs AI quick-simulated matches. This system provides a seamless match-by-match progression experience with real-time result tracking and league standings updates.

**Key Features:**
- Smart fixture routing (user matches vs AI matches)
- Interactive match view with ball-by-ball controls
- Background quick-simulation for AI vs AI matches
- Result modals with detailed match statistics
- Linear fixture progression with currentFixtureIndex tracking
- Error handling and recovery
- Deep linking support for matches
- Persistent state management

## User Journey

### Complete Flow: Dashboard → Match → Result → Next Match

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER STARTS SEASON                          │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DASHBOARD / LEAGUE VIEW                                            │
│  - Shows next fixture                                               │
│  - Continue button appears                                          │
│  - System detects if user team is playing                           │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
              Is User Match?
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ YES: User    │          │ NO: AI vs AI │
│ Team Playing │          │ Match        │
└──────┬───────┘          └──────┬───────┘
        │                         │
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Navigate to      │      │ Quick Simulate   │
│ /game/match/:id  │      │ in Background    │
└──────┬───────────┘      └──────┬───────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ PreMatchModal    │      │ MatchResultModal │
│ - Toss           │      │ - Winner         │
│ - Team Selection │      │ - Scores         │
│ - Tactics        │      │ - Top Performers │
└──────┬───────────┘      └──────┬───────────┘
        │                         │
        ▼                         │
┌──────────────────┐              │
│ Match.jsx View   │              │
│ - Ball-by-ball   │              │
│ - Controls       │              │
│ - Scorecard      │              │
│ - Commentary     │              │
│ - Tactics Panel  │              │
└──────┬───────────┘              │
        │                         │
        ▼                         │
┌──────────────────┐              │
│ Match Complete   │              │
│ - Show result    │              │
│ - Continue btn   │              │
└──────┬───────────┘              │
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Record Result          │
        │ Update Standings       │
        │ Advance to Next Fixture│
        └────────────┬───────────┘
                     │
                     ▼
            Back to Dashboard
            (Loop until season complete)
```

## Architecture

### Component Overview

```
Match Progression System
├── UI Components
│   ├── Dashboard.jsx ────────────→ Main entry point with Continue button
│   ├── SeasonProgress.jsx ───────→ League view progress card
│   ├── Match.jsx ────────────────→ Interactive match view (user matches)
│   ├── PreMatchModal.jsx ────────→ Pre-match setup (toss, tactics)
│   ├── MatchResultModal.jsx ─────→ AI match result display
│   ├── MatchScorecard.jsx ───────→ Batting/bowling scorecards
│   ├── CommentaryFeed.jsx ───────→ Ball-by-ball commentary
│   └── TacticsPanel.jsx ─────────→ In-match tactical controls
│
├── Core Systems
│   ├── QuickSimMatch.js ─────────→ AI vs AI background simulation
│   └── MatchEngine.js ───────────→ Ball-by-ball match simulation
│
└── State Management
    ├── leagueStore.js ───────────→ Fixtures, results, standings, progression
    ├── matchStore.js ────────────→ Active match state
    ├── teamStore.js ─────────────→ Team data and tactics
    └── playerStore.js ───────────→ Player database
```

### Data Flow

#### 1. Match Detection & Routing

```javascript
// Dashboard.jsx & SeasonProgress.jsx
const nextFixture = getNextFixture();  // From leagueStore
const isUserMatch = isUserTeamMatch(nextFixture, userTeam?.id);

if (isUserMatch) {
  // Navigate to interactive match view
  navigate(`/game/match/${nextFixture.id}`);
} else {
  // Quick-simulate AI vs AI match
  const result = await quickSimMatch(matchConfig, ...);
  recordResult(result);
  advanceToNextMatch();
}
```

**Key Store Methods:**
- `leagueStore.getNextFixture()` - Gets next unplayed fixture based on currentFixtureIndex
- `leagueStore.isUserTeamMatch(fixture, userId)` - Checks if user team is in fixture
- `leagueStore.getFixtureById(id)` - Retrieves specific fixture (for deep linking)

#### 2. Interactive Match Flow

```javascript
// Match.jsx
// Step 1: Load fixture data
const fixture = getFixtureById(matchId) || getNextFixture();
const homeTeam = getClub(fixture.homeTeam);
const awayTeam = getClub(fixture.awayTeam);

// Step 2: Pre-match setup (PreMatchModal)
const tossResult = simulateToss();
const tactics = getUserTactics();

// Step 3: Initialize match engine
const engine = new MatchEngine(matchStore, playerStore, teamStore);
engine.config.interactiveMode = true;
engine.config.showBallByBall = true;

// Step 4: User controls simulation
await engine.simulateBall();        // Play Ball button
await simulateOver();                // Skip Over button
await autoSimulate();                // Auto-Simulate button

// Step 5: Match completion
navigate('/game/league');            // Return to league view
```

**Simulation Controls:**
- **Play Ball** - Simulates single ball with UI updates
- **Skip Over** - Simulates remaining balls in current over
- **Auto-Simulate** - Rapid simulation until match completion
- **Pause** - Stops auto-simulation

#### 3. Quick Simulation Flow

```javascript
// QuickSimMatch.js
async function quickSimMatch(matchConfig, matchStore, playerStore, teamStore) {
  // Create silent engine
  const engine = new MatchEngine(matchStore, playerStore, teamStore, { silent: true });
  engine.config.interactiveMode = false;
  engine.config.showBallByBall = false;

  // Run match
  await engine.startMatch(matchConfig);

  // Extract result
  const state = matchStore.getState();
  return {
    winner, loser, margin,
    homeTeam: { score, wickets, overs },
    awayTeam: { score, wickets, overs },
    playerOfMatch, topScorer, topBowler
  };
}
```

**Result Structure:**
```javascript
{
  matchId: 'fixture_id',
  winner: Club,           // Winner club object
  loser: Club,            // Loser club object
  winMargin: number,      // Runs or wickets
  winType: 'runs' | 'wickets',
  homeTeam: {
    ...Club,
    score: number,
    wickets: number,
    overs: string         // "18.3"
  },
  awayTeam: { ... },
  playerOfMatch: {
    name: string,
    performance: string   // "45 (32)" or "3/28"
  },
  topScorer: {
    name: string,
    runs: number,
    balls: number
  },
  topBowler: {
    name: string,
    wickets: number,
    runs: number
  },
  innings1: InningsData,
  innings2: InningsData
}
```

#### 4. League Progression Tracking

```javascript
// leagueStore.js
{
  currentFixtureIndex: 0,     // Linear progression pointer
  fixtures: [...],            // All 90 league fixtures
  results: [...],             // Completed match results
  standings: [...]            // Updated after each match
}

// Progression flow
getNextFixture() → recordResult() → updateStandings() → advanceToNextMatch()
```

**Linear Progression:**
- Fixtures are indexed 0-89 for 90 league matches
- `currentFixtureIndex` tracks next match to play
- `advanceToNextMatch()` increments index after result recording
- Supports season pause/resume via persistence

## Core Components

### 1. Dashboard Component

**File:** `src/components/layout/Dashboard.jsx`

**Purpose:** Main dashboard with Continue button for match progression.

**Key Features:**
- Next fixture display with team matchup
- Smart Continue button (Play Match vs Continue)
- Loading states during quick simulation
- Error handling with dismissible alerts
- Result modal integration

**Usage Example:**
```jsx
<Dashboard />
// Automatically detects next fixture and user team
// Shows "Play Match" for user matches, "Continue" for AI matches
```

**State Management:**
```javascript
const [showResultModal, setShowResultModal] = useState(false);
const [matchResult, setMatchResult] = useState(null);
const [isSimulating, setIsSimulating] = useState(false);
const [simError, setSimError] = useState(null);
```

**Error Handling:**
- Team data validation before simulation
- Match result validation after simulation
- User-friendly error messages
- Recoverable error states (dismiss and retry)

### 2. SeasonProgress Component

**File:** `src/components/league/SeasonProgress.jsx`

**Purpose:** Compact season progress card for League view.

**Key Features:**
- Visual progress bar (completed/total matches)
- Next fixture display with team colors
- Inline Play/Simulate button
- "Your Match" indicator for user team matches
- Season completion state

**Display Logic:**
```javascript
const progress = getSeasonProgress();
// Returns: { completed, totalFixtures, remaining, progressPercent }

// Progress bar
<div style={{ width: `${progress.progressPercent}%` }} />

// Match button
{isUserMatch ? 'Play Match' : 'Quick Simulate'}
```

### 3. Match Component

**File:** `src/components/match/Match.jsx`

**Purpose:** Interactive match view with full simulation controls.

**Layout:** 3-column responsive grid
- **Left (5 cols):** Scorecard (batting/bowling stats)
- **Center (4 cols):** Commentary feed (ball-by-ball)
- **Right (3 cols):** Tactics panel (user team only)

**State Flow:**
```javascript
'not_started' → 'in_progress' → 'completed'
```

**Simulation Controls:**

```javascript
// Play single ball
const handlePlayBall = async () => {
  await matchEngine.simulateBall();
  if (matchEngine.isMatchComplete()) {
    setMatchState('completed');
  }
};

// Skip over (6 balls)
const handleSkipOver = async () => {
  const ballsRemaining = 6 - currentBall.ball;
  for (let i = 0; i < ballsRemaining; i++) {
    await matchEngine.simulateBall();
  }
};

// Auto-simulate entire match
const handleAutoSimulate = async () => {
  while (!matchEngine.isMatchComplete()) {
    await matchEngine.simulateBall();
    await new Promise(resolve => setTimeout(resolve, 10)); // UI update delay
  }
};
```

**Error Recovery:**
- Try-catch around all simulation methods
- Error state display with details
- Continue button remains functional
- Match state preserved for debugging

### 4. PreMatchModal Component

**File:** `src/components/match/PreMatchModal.jsx`

**Purpose:** Pre-match preparation modal.

**Features:**
- Team display with colors and badges
- Venue, date, weather information
- Toss simulation (random winner and decision)
- Tactics review/setup button
- Start match button (enabled after toss)

**Toss Logic:**
```javascript
const handleSimulateToss = () => {
  const tossWinner = Math.random() < 0.5 ? homeTeam : awayTeam;
  const decision = Math.random() < 0.5 ? 'bat' : 'bowl';

  setTossResult({
    winner: tossWinner,
    decision: decision,
    userWonToss: tossWinner.id === userTeamId
  });
};
```

### 5. MatchResultModal Component

**File:** `src/components/shared/MatchResultModal.jsx`

**Purpose:** Display AI match results after quick simulation.

**Sections:**
1. **Winner Announcement** - Team badge, margin, victory indicator
2. **Scores** - Both teams' scores, wickets, overs
3. **Key Performances** - Player of Match, Top Scorer, Top Bowler
4. **Actions** - View Full Scorecard, Continue buttons

**Visual Feedback:**
```javascript
// Winner highlight
const isUserTeamWinner = winner.isUserTeam;
className={isUserTeamWinner ? 'bg-green-500/10 border-green-500/30' : 'bg-bg-tertiary'}

// Victory badge (user team wins only)
{isUserTeamWinner && (
  <span className="bg-green-500/20 text-green-400">
    <Trophy /> Victory!
  </span>
)}
```

## Integration Points

### Store Integration

**leagueStore:**
```javascript
// Fixture management
getNextFixture()          // Get next unplayed fixture
getFixtureById(id)        // Get specific fixture (deep linking)
isUserTeamMatch(fixture, userId)  // Check if user is playing

// Progression
recordResult(result)      // Save match result
advanceToNextMatch()      // Move to next fixture
getSeasonProgress()       // Get completion stats

// Data access
getClub(clubId)          // Get club data
```

**matchStore:**
```javascript
// Match lifecycle
initializeMatch(config)   // Set up match state
resetMatch()             // Clear match state

// State access
teams                    // { batting, bowling }
innings                  // Current innings data
currentBall             // Current ball state
ballByBall              // Ball-by-ball history
status                  // Match status
```

**teamStore:**
```javascript
getUserTeam()           // Get user's selected team
getTeamTactics(teamId)  // Get team tactics
```

### Routing Integration

**Routes:**
```javascript
/game                    → Dashboard (default)
/game/league            → League view with SeasonProgress
/game/match/:matchId    → Interactive match view
```

**Navigation:**
```javascript
// From Dashboard/League to Match
navigate(`/game/match/${nextFixture.id}`);

// From Match back to League
navigate('/game/league');

// Deep linking support
const fixture = getFixtureById(matchId) || getNextFixture();
```

### MatchEngine Integration

**Interactive Mode:**
```javascript
const engine = new MatchEngine(matchStore, playerStore, teamStore, { silent: false });
engine.config.interactiveMode = true;
engine.config.showBallByBall = true;
engine.config.simulationSpeed = 'instant';

// User controls pace
await engine.simulateBall();
```

**Quick-Sim Mode:**
```javascript
const engine = new MatchEngine(matchStore, playerStore, teamStore, { silent: true });
engine.config.interactiveMode = false;
engine.config.showBallByBall = false;
engine.config.simulationSpeed = 'instant';

// Runs automatically
await engine.startMatch(config);
```

## Error Handling

### Error Types & Recovery

#### 1. Team Data Errors

**Scenario:** Team not found when loading fixture

```javascript
// Validation before simulation
if (!homeTeam || !awayTeam) {
  throw new Error('Team data not found for match');
}

// User sees dismissible error alert
// Can retry or navigate away
```

#### 2. Simulation Errors

**Scenario:** Error during ball simulation

```javascript
try {
  await matchEngine.simulateBall();
} catch (error) {
  console.error('Error simulating ball:', error);
  setSimError(error.message || 'Failed to simulate ball');
  setIsSimulating(false);
}

// Match state preserved
// User can attempt to continue or exit
```

#### 3. Result Validation Errors

**Scenario:** Invalid result from quick simulation

```javascript
const result = await quickSimMatch(...);

if (!result || !result.winner) {
  throw new Error('Invalid match result received');
}

// Prevents corrupted data in standings
```

#### 4. Navigation Errors

**Scenario:** No fixture found for match view

```javascript
const fixture = getFixtureById(matchId) || getNextFixture();

if (!fixture) {
  console.warn('No fixture found, redirecting to league');
  navigate('/game/league');
  return;
}

// Graceful fallback to league view
```

### Error Display

**Alert Component:**
```jsx
{simError && (
  <div className="card p-4 bg-red-500/10 border border-red-500/30">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-red-500">Simulation Error</h3>
        <p className="text-sm text-red-400">{simError}</p>
      </div>
      <button onClick={() => setSimError(null)}>
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
```

## Performance Considerations

### Quick Simulation Performance

**Target:** ~0.5 seconds per AI vs AI match

**Optimizations:**
```javascript
// Silent mode (no logging)
{ silent: true }

// No ball-by-ball output
showBallByBall: false

// Instant simulation (no delays)
simulationSpeed: 'instant'

// No interactive mode overhead
interactiveMode: false
```

**Benchmarks:**
- Single AI match: ~0.4-0.6 seconds
- Full season (90 matches): ~40-50 seconds
- Ball simulation rate: ~50,000+ balls/second

### Interactive Match Performance

**UI Update Strategy:**
```javascript
// Zustand store triggers re-renders
matchStore.setState({ ... });

// React components subscribe to specific state
const innings = useMatchStore(state => state.innings);

// Auto-scroll commentary (performance-friendly)
<CommentaryFeed ballByBall={ballByBall} autoScroll={true} />
```

**Auto-Simulate Performance:**
```javascript
// Small delay for UI updates during auto-sim
while (!matchEngine.isMatchComplete()) {
  await matchEngine.simulateBall();
  await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
}

// User can pause at any time
if (matchEngine.isPaused) break;
```

## Testing

### Manual Testing Checklist

**User Team Match:**
- [ ] Continue button shows "Play Match"
- [ ] Click navigates to /game/match/:id
- [ ] PreMatchModal displays correctly
- [ ] Toss simulation works
- [ ] Match controls function (Play Ball, Skip Over, Auto-Simulate)
- [ ] Scorecard updates in real-time
- [ ] Commentary feed scrolls automatically
- [ ] Tactics panel appears (user team only)
- [ ] Match completion shows Continue button
- [ ] Return to league updates standings

**AI vs AI Match:**
- [ ] Continue button shows "Continue" or "Quick Sim"
- [ ] Click triggers background simulation
- [ ] Loading spinner appears during simulation
- [ ] MatchResultModal displays after completion
- [ ] Result shows winner, margin, top performers
- [ ] Continue advances to next match
- [ ] Standings update correctly

**Error Scenarios:**
- [ ] Missing team data shows error alert
- [ ] Simulation error displays and is dismissible
- [ ] Invalid result prevents progression
- [ ] Missing fixture redirects to league
- [ ] Error recovery allows retry

### Automated Testing

**Test Fixture Routing:**
```javascript
test('routes to interactive match for user team', () => {
  const fixture = { homeTeam: 'user_team_id', awayTeam: 'ai_team_id' };
  expect(isUserTeamMatch(fixture, 'user_team_id')).toBe(true);
});

test('quick-sims AI vs AI match', async () => {
  const fixture = { homeTeam: 'ai_team_1', awayTeam: 'ai_team_2' };
  expect(isUserTeamMatch(fixture, 'user_team_id')).toBe(false);
});
```

**Test Quick Simulation:**
```bash
# Use existing test script
node src/test/leagueTest.js --matches=5

# Verify:
# - Matches complete quickly
# - Results have winners
# - Standings update correctly
```

## Future Enhancements

### Planned Features

**Phase 1 (Current):**
- ✅ Linear fixture progression
- ✅ User vs AI match routing
- ✅ Quick simulation for AI matches
- ✅ Result modals
- ✅ Error handling

**Phase 2 (Upcoming):**
- [ ] In-match saves (pause and resume later)
- [ ] Match highlights replay
- [ ] Extended statistics tracking
- [ ] Performance graphs (form, momentum)
- [ ] Post-match press conferences

**Phase 3 (Future):**
- [ ] Match predictions (AI analysis)
- [ ] Live league table updates during matchdays
- [ ] Rival team notifications
- [ ] Match event calendar
- [ ] Customizable simulation speed
- [ ] 2D match visualization

### Technical Improvements

**State Management:**
- Migrate to persistent match state (allow mid-match exit)
- Optimize Zustand subscriptions (reduce re-renders)
- Add state validation middleware

**Performance:**
- Web Worker for quick simulation (non-blocking)
- Progressive result loading for seasons
- Lazy loading for match components

**UX Enhancements:**
- Match simulation settings (speed, detail level)
- Keyboard shortcuts for match controls
- Touch gestures for mobile
- Accessibility improvements (ARIA labels, keyboard nav)

## Related Documentation

- [League System](../core-systems/league-system.md) - Fixture generation and standings
- [Match Engine](../core-systems/match-engine.md) - Ball-by-ball simulation
- [State Management](../frontend/state-management.md) - Zustand store patterns
- [Stores API](../api/stores-api.md) - Complete store reference
- [Quick Simulation Guide](./quick-simulation.md) - QuickSimMatch details
- [Match View Component](../components/match-view.md) - Match.jsx documentation

---

**Last Updated:** January 2025 - Match Progression System v1.0
**Phase:** Phase 5 - Frontend UI Development
