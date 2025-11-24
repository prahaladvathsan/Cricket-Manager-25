# League System

## Overview

The League System manages the complete World Premier League (WPL) season simulation, including squad distribution, fixture scheduling, match orchestration, standings calculation, and playoff qualification.

**Key Features:**
- 10 WPL teams with balanced squad distribution
- Double round-robin format (90 matches total)
- Automated match orchestration (Pre-Match → Match → Post-Match)
- Net Run Rate (NRR) calculation for standings
- Top 4 playoff qualification
- Clean scorecard display with optional ball-by-ball commentary
- League state persistence via Zustand store

## Architecture

### Component Overview

```
LeagueSimulator (Orchestrator)
├── SquadDistributor ────────→ Distribute 315 players across 10 clubs
├── ScheduleGenerator ───────→ Generate 90 fixtures (double round-robin)
├── MatchOrchestrator ───────→ Pre-Match → Match → Post-Match pipeline
│   ├── PreMatchSetup ───────→ Team selection, toss, venue setup
│   ├── MatchEngine ─────────→ Ball-by-ball simulation (silent mode)
│   └── PostMatchProcessor ──→ Result processing, standings update
├── StandingsCalculator ─────→ Points, NRR, rankings
└── PlayoffGenerator ────────→ Top 4 qualification
```

### Module Dependencies

```javascript
// Core league modules
import LeagueSimulator from './core/league/LeagueSimulator.js';
import SquadDistributor from './core/league/SquadDistributor.js';
import ScheduleGenerator from './core/league/ScheduleGenerator.js';
import MatchOrchestrator from './core/league/MatchOrchestrator.js';
import StandingsCalculator from './core/league/StandingsCalculator.js';
import PlayoffGenerator from './core/league/PlayoffGenerator.js';

// State management
import leagueStore from './stores/leagueStore.js';

// Match engine integration
import MatchEngine from './core/match-engine/core/MatchEngine.js';
import MatchDisplayFormatter from './core/match-engine/interactive/MatchDisplayFormatter.js';
```

## Core Components

### 1. LeagueSimulator

**Purpose:** Orchestrates the entire league season from initialization to completion.

**Key Methods:**
```javascript
async initializeLeague(clubs, playerStore)
async simulateLeague(maxMatches = null)
async simulateMatchday(matchday)
getLeagueState()
exportLeagueData(filename)
```

**Workflow:**
1. **Initialize League**
   - Distribute players across clubs
   - Generate fixtures
   - Set up league state

2. **Simulate Matches**
   - Sequential match simulation
   - Progress callbacks for UI updates
   - Standings recalculation after each match

3. **Complete Season**
   - Calculate final standings
   - Determine playoff qualifiers
   - Export results

**Usage Example:**
```javascript
const league = new LeagueSimulator(playerStore, teamStore, matchStore, leagueStore);

// Initialize with 10 WPL clubs
await league.initializeLeague(wplClubs, playerStore);

// Simulate full season
await league.simulateLeague();

// Or simulate specific number of matches
await league.simulateLeague(20);
```

### 2. SquadDistributor

**Purpose:** Distributes players across clubs with balanced composition.

**Algorithm:**
1. **Classification:** Players sorted by role (keeper, all-rounder, bowler, batsman)
2. **Balanced Distribution:** Each club gets ~25 players with similar composition
3. **Target Composition:**
   - Keepers: 0 (temporary - no keepers in current database)
   - All-rounders: 4 per club
   - Bowlers: 9 per club
   - Batsmen: 12 per club

**Key Methods:**
```javascript
distributeSquads(clubs, players, config = {})
classifyPlayers(players)
validateSquadDistribution(clubs)
```

**Squad Validation:**
- Each club must have exactly 25 players
- Total players distributed must equal input players
- Squad composition roughly matches target ratios

### 3. ScheduleGenerator

**Purpose:** Generates double round-robin fixture schedule.

**Algorithm:**
1. **Round-Robin:** Each team plays every other team twice (home and away)
2. **Total Matches:** `n * (n-1) = 10 * 9 = 90 matches`
3. **Matchday Distribution:** Evenly distributed across season
4. **Venue Assignment:** Home team's stadium used

**Key Methods:**
```javascript
generateDoubleRoundRobin(clubs)
generateSingleRoundRobin(clubs, startMatchday = 1)
createFixture(homeClub, awayClub, matchday, fixtureNumber)
```

**Fixture Structure:**
```javascript
{
  matchId: 'team1_vs_team2_timestamp',
  homeTeam: 'club_id',
  homeTeamName: 'Club Name',
  awayTeam: 'club_id',
  awayTeamName: 'Club Name',
  venue: 'Stadium Name',
  matchday: 1-18,
  date: null  // Future: actual dates
}
```

### 4. MatchOrchestrator

**Purpose:** Manages complete match flow from pre-match setup to post-match processing.

**Match Pipeline:**
```
Pre-Match Setup → Match Simulation → Post-Match Processing
```

**Key Methods:**
```javascript
async simulateMatch(fixture, homeClub, awayClub)
async runMatch(matchConfig)
async simulateMatches(fixtures, clubsMap, onMatchComplete)
displayMatchScorecard(matchState, matchConfig)
```

**Pre-Match Setup (PreMatchSetup.js):**
- Select playing XI from 25-player squad
- Conduct toss (winner decides bat/bowl)
- Set up venue and match configuration
- Optimize batting order

**Match Simulation (MatchEngine):**
- Initialize with silent mode (`{ silent: true }`)
- Set `showBallByBall: false` for league matches
- Automated simulation (no user interaction)
- Fast simulation (~50k+ balls/second)

**Post-Match Processing (PostMatchProcessor.js):**
- Extract match result
- Update league standings
- Calculate NRR impact
- Save match log

**Clean Output Mode:**
```javascript
// MatchEngine configuration for league simulation
matchEngine.config.simulationSpeed = 'instant';
matchEngine.config.interactiveMode = false;
matchEngine.config.showBallByBall = false;  // Hide ball-by-ball commentary

// Silent mode suppresses initialization logs
const matchEngine = new MatchEngine(matchStore, playerStore, teamStore, { silent: true });
```

### 5. StandingsCalculator

**Purpose:** Calculates league standings with Net Run Rate (NRR).

**Metrics Tracked:**
- **Played:** Total matches played
- **Won/Lost/Tied/No Result:** Match outcomes
- **Points:** 2 per win, 1 per tie/NR, 0 per loss
- **Net Run Rate:** `(Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)`
- **Runs For/Against:** Total runs scored and conceded
- **Overs:** Total overs faced and bowled

**Key Methods:**
```javascript
updateStandings(result)
calculateNRR(team)
sortStandings(standings)
getStandings()
```

**NRR Calculation:**
```javascript
// Example: Team scored 500 runs in 100 overs, conceded 450 runs in 95 overs
runRate = 500 / 100 = 5.00
concededRate = 450 / 95 = 4.74
nrr = 5.00 - 4.74 = 0.26
```

**Standings Sorting:**
1. **Points** (descending)
2. **NRR** (descending) - tiebreaker
3. **Wins** (descending) - secondary tiebreaker

### 6. PlayoffGenerator

**Purpose:** Determines playoff qualification based on final standings.

**Qualification Rules:**
- **Top 4 teams** qualify for playoffs
- Sorted by: Points → NRR → Wins
- Returns: Array of 4 qualified teams

**Playoff Structure (Future Implementation):**
```
Qualifier 1: #1 vs #2
Eliminator:  #3 vs #4
Qualifier 2: Loser of Q1 vs Winner of Eliminator
Final:       Winner of Q1 vs Winner of Q2
```

## State Management

### leagueStore (Zustand)

**State Structure:**
```javascript
{
  // Season info
  seasonId: string,
  seasonName: string,
  stage: 'league' | 'playoffs' | 'completed',

  // Current state
  currentMatchday: number,

  // League data
  standings: Array<Standing>,
  fixtures: Array<Fixture>,
  results: Array<MatchResult>,
  clubs: Map<clubId, Club>,

  // Statistics
  stats: {
    totalMatches: number,
    completedMatches: number,
    highestScore: { score, team, matchId },
    lowestScore: { score, team, matchId },
    // ... more stats
  }
}
```

**Key Actions:**
```javascript
// Initialization
initializeLeague(clubs, fixtures)
resetLeague()

// Match processing
updateStandings(result)
addResult(result)
incrementMatchday()

// Queries
getStandings()
getFixture(matchId)
getClub(clubId)
getTopScorers()
getLeadingWicketTakers()
```

## Match Display System

### Clean Scorecard Output

**Components:**
- **MatchDisplayFormatter:** Formats scorecard for display
- **Conditional Logging:** Ball-by-ball commentary only when `showBallByBall: true`
- **Silent Mode:** Suppresses initialization logs from physics components

**Output Structure:**
```
================================================================================
MATCHDAY X: Home Team vs Away Team
================================================================================

Toss: Team won and chose to bowl/bat first

⚡ Simulating match...
✅ Match simulation complete

====================================================================================================
📊 MATCH SCORECARD
====================================================================================================

TEAM 1 INNINGS
----------------------------------------------------------------------------------------------------
BATSMAN                   Dismissal               R    B  4s  6s     SR
----------------------------------------------------------------------------------------------------
Player 1                  caught                 45   32   6   1  140.6
Player 2                  bowled                 23   18   4   0  127.8
...
----------------------------------------------------------------------------------------------------
TOTAL                     10/10                 152
Overs: 18.3 | Run Rate: 8.22

TEAM 2 BOWLING:
----------------------------------------------------------------------------------------------------
BOWLER                        O   M    R   W   Econ  Dots
----------------------------------------------------------------------------------------------------
Bowler 1                    4.0   0   28   3   7.00    12
Bowler 2                    3.3   0   34   2   9.71     8
...

[Second innings displayed similarly]

====================================================================================================

MATCH RESULT
Winner: Team Name won by X runs/wickets
================================================================================
```

### Ball-by-Ball Commentary (Optional)

**Enable with:**
```javascript
matchEngine.config.showBallByBall = true;
```

**Output:**
```
0.1: Bowler to Batsman, 1 run
0.2: Bowler to Batsman, FOUR through covers
0.3: Bowler to Batsman, OUT! caught at mid-off
...
```

## Testing

### League Test Script

**Location:** `src/test/leagueTest.js`

**Usage:**
```bash
# Quick test (5 matches)
node src/test/leagueTest.js

# Full season (90 matches)
node src/test/leagueTest.js --full

# Custom match count
node src/test/leagueTest.js --matches=20

# Specific matchday
node src/test/leagueTest.js --matchday=5
```

**Test Output:**
1. League initialization summary
2. Match-by-match scorecards
3. Updated standings after each match
4. Final standings and playoff qualifiers
5. Season summary statistics
6. Exported league data (JSON)

### Performance Benchmarks

**Full Season (90 matches):**
- **Time:** ~40-50 seconds
- **Average per match:** ~0.5 seconds
- **Ball simulation:** ~50,000+ balls/second

**Single Match:**
- **Time:** ~0.4-0.6 seconds
- **Includes:** Pre-match setup, simulation, post-processing, scorecard display

## Data Export

### League Results JSON

**Export Location:** `league_results_{timestamp}.json`

**Structure:**
```json
{
  "seasonId": "wpl_timestamp",
  "seasonName": "WPL 2025 Season 1",
  "stage": "league",
  "currentMatchday": 18,
  "standings": [...],
  "results": [
    {
      "matchId": "team1_vs_team2_timestamp",
      "homeTeam": "club_id",
      "awayTeam": "club_id",
      "innings1": {...},
      "innings2": {...},
      "winner": "club_id",
      "margin": "X runs/wickets",
      "status": "completed"
    }
  ],
  "stats": {
    "totalMatches": 90,
    "completedMatches": 90,
    "highestScore": {...},
    "lowestScore": {...}
  }
}
```

### Match Logs

**Export Location:** `match_logs/league/{match_id}.json`

**Contains:**
- Complete ball-by-ball data
- Innings summaries
- Player performance
- Fielding actions
- Tactical decisions

## Integration Points

### React UI Integration (Future)

**Planned Components:**
```jsx
<LeagueStandings />
<FixtureCalendar />
<MatchCard />
<PlayerStats />
<TeamProfile />
```

**State Subscription:**
```javascript
// Subscribe to league updates
const standings = leagueStore(state => state.standings);
const fixtures = leagueStore(state => state.fixtures);
const currentMatchday = leagueStore(state => state.currentMatchday);
```

### Match Simulation Callbacks

**Progress Updates:**
```javascript
await league.simulateLeague(null, (result, current, total) => {
  console.log(`Match ${current}/${total} completed`);
  updateUI(result);
});
```

## Configuration

### WPL Clubs

**Location:** `src/data/teams/wpl-teams.json`

**Team Structure:**
```json
{
  "id": "t_chennai",
  "name": "Chennai Cobras",
  "city": "Chennai",
  "country": "India",
  "stadium": "M.A. Chidambaram Stadium",
  "founded": 2025,
  "colors": {
    "primary": "#4B0082",
    "secondary": "#FFD700"
  }
}
```

**10 WPL Teams:**
1. Chennai Cobras (India)
2. London Lions (England)
3. Sydney Sharks (Australia)
4. Pretoria Pythons (South Africa)
5. Multan Markhors (Pakistan)
6. Colombo Crocodiles (Sri Lanka)
7. Dhaka Dolphins (Bangladesh)
8. Georgetown Jaguars (West Indies)
9. Auckland Orcas (New Zealand)
10. Kabul Kites (Afghanistan)

### Squad Distribution Config

**Default Settings:**
```javascript
{
  squadSize: 25,
  minAllRounders: 3,
  minBowlers: 8,
  minBatsmen: 10,
  // Keepers added when available in database
}
```

## Future Enhancements

### Phase 1 (Completed)
- ✅ League simulation
- ✅ Standings calculation
- ✅ Match orchestration
- ✅ Clean display

### Phase 2 (Planned)
- [ ] React UI components
- [ ] Playoff simulation
- [ ] Player statistics leaderboards
- [ ] Team performance analytics

### Phase 3 (Future)
- [ ] Player auction system
- [ ] Squad management UI
- [ ] Tactical presets per team
- [ ] Historical season comparison
- [ ] Player form and injuries
- [ ] Transfer system between seasons

## Best Practices

### When to Use League Simulation

**Use Cases:**
- Full season simulation for testing
- Balance testing across many matches
- AI opponent evaluation
- Statistical analysis
- Game mode implementation

**Not For:**
- Single match debugging (use `interactiveMatchTest.js`)
- Ball-by-ball analysis (use `detailedMatchTest.js`)
- Match engine tuning (use `diagnosticBallTest.js`)

### Performance Optimization

**Tips:**
1. Use `silent: true` mode for match engine
2. Set `showBallByBall: false` for league matches
3. Batch match simulation with progress callbacks
4. Export results periodically for long simulations
5. Use `--matches=N` flag for partial season testing

### Debugging

**Match-Level Issues:**
```javascript
// Enable verbose logging for specific match
matchEngine.config.showBallByBall = true;
matchEngine.config.debug = true;
```

**League-Level Issues:**
```javascript
// Check standings after each match
league.simulateLeague(null, (result, current, total) => {
  console.log(league.getLeagueState().standings);
});
```

## Match Progression System (v2.0)

### Overview

The League System now includes a complete match progression system that enables linear fixture advancement with intelligent routing between user-controlled interactive matches and AI vs AI quick-simulated matches.

**New Features:**
- Linear fixture progression via `currentFixtureIndex`
- Smart match routing (user vs AI detection)
- Quick simulation integration for AI matches
- Season progress tracking
- Deep linking support for matches

### Linear Progression Architecture

```
┌─────────────────────────────────────────────────────────┐
│              LEAGUE FIXTURE PROGRESSION                 │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   currentFixtureIndex: 0      │
        │   fixtures: [90 fixtures]     │
        │   results: []                 │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │   getNextFixture()            │
        │   Returns: fixtures[index]    │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │   isUserTeamMatch(fixture)    │
        │   Check if user is playing    │
        └───────────┬───────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
┌──────────────┐        ┌──────────────┐
│ User Match   │        │ AI Match     │
│ Navigate to  │        │ Quick-Sim    │
│ Match.jsx    │        │ Background   │
└──────┬───────┘        └──────┬───────┘
        │                        │
        └────────────┬───────────┘
                     │
                     ▼
        ┌───────────────────────────────┐
        │   recordResult(result)        │
        │   Update standings            │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │   advanceToNextMatch()        │
        │   Increment index             │
        └───────────────────────────────┘
```

### New Store Methods

#### getNextFixture()

Returns the next unplayed fixture based on `currentFixtureIndex`.

```javascript
const nextFixture = getNextFixture();

// Returns fixture object or null if season complete
{
  id: 'fixture_001',
  homeTeam: 'mumbai_thunders',
  awayTeam: 'london_lions',
  venue: 'Wankhede Stadium',
  matchday: 1
}
```

**Implementation:**
```javascript
getNextFixture: () => {
  const state = get();

  if (state.currentFixtureIndex >= state.fixtures.length) {
    // Check for playoff fixtures
    if (state.stage === 'league' && state.playoffFixtures.length > 0) {
      return state.playoffFixtures[0];
    }
    return null; // Season complete
  }

  return state.fixtures[state.currentFixtureIndex];
}
```

#### getFixtureById(fixtureId)

Retrieves a specific fixture by ID for deep linking support.

```javascript
const fixture = getFixtureById('fixture_001');

// Searches both league and playoff fixtures
// Returns fixture object or null
```

**Use Case:**
```javascript
// Match.jsx - Load match from URL parameter
const { matchId } = useParams();
const fixture = getFixtureById(matchId) || getNextFixture();
```

#### isUserTeamMatch(fixture, userTeamId)

Checks if the user's team is involved in a fixture.

```javascript
const isUserMatch = isUserTeamMatch(nextFixture, userTeam?.id);

if (isUserMatch) {
  // Navigate to interactive match
  navigate(`/game/match/${nextFixture.id}`);
} else {
  // Quick-simulate AI vs AI
  await quickSimMatch(matchConfig, ...);
}
```

**Implementation:**
```javascript
isUserTeamMatch: (fixture, userTeamId) => {
  if (!fixture || !userTeamId) return false;
  return fixture.homeTeam === userTeamId || fixture.awayTeam === userTeamId;
}
```

#### advanceToNextMatch()

Increments fixture index and matchday counter after match completion.

```javascript
const nextFixture = advanceToNextMatch();

// Updates:
// - currentFixtureIndex += 1
// - currentMatchday += 1
// Returns next fixture or null
```

**Usage:**
```javascript
// After recording result
recordResult(matchResult);
advanceToNextMatch();
```

#### getSeasonProgress()

Returns detailed season progress statistics.

```javascript
const progress = getSeasonProgress();

// Returns:
{
  currentFixture: 15,
  totalFixtures: 90,
  completed: 15,
  remaining: 75,
  progressPercent: 17,  // Rounded integer
  currentWeek: 3,
  stage: 'league'
}
```

**UI Integration:**
```jsx
<div className="progress-bar">
  <div style={{ width: `${progress.progressPercent}%` }} />
</div>
<span>{progress.completed}/{progress.totalFixtures}</span>
```

#### recordMatchComplete(matchId, result)

Convenience method that records result, updates standings, and advances.

```javascript
const nextFixture = recordMatchComplete(matchId, matchResult);

// Equivalent to:
// recordResult(matchResult);
// updateStandings(matchResult);
// advanceToNextMatch();
```

**Note:** Most components use separate calls for finer control.

### Fixture Progression Flow

**Complete Flow:**
```javascript
// 1. Get next fixture
const nextFixture = getNextFixture();

// 2. Load teams
const homeTeam = getClub(nextFixture.homeTeam);
const awayTeam = getClub(nextFixture.awayTeam);

// 3. Check if user is playing
const isUserMatch = isUserTeamMatch(nextFixture, userTeam?.id);

// 4A. User match - navigate to interactive view
if (isUserMatch) {
  navigate(`/game/match/${nextFixture.id}`);
}

// 4B. AI match - quick simulate
else {
  const matchConfig = {
    id: nextFixture.id,
    homeTeam,
    awayTeam,
    venue: nextFixture.venue,
    tossWinner: Math.random() < 0.5 ? homeTeam.id : awayTeam.id,
    tossDecision: Math.random() < 0.5 ? 'bat' : 'bowl'
  };

  const result = await quickSimMatch(matchConfig, ...);

  // 5. Record result
  recordResult(result);

  // 6. Advance to next match
  advanceToNextMatch();
}
```

### Season Completion Detection

**Check for Season End:**
```javascript
const nextFixture = getNextFixture();

if (!nextFixture && stage === 'league') {
  // League stage complete
  // Generate playoff fixtures
  setStage('playoffs');
  setPlayoffFixtures(generatePlayoffs());
} else if (!nextFixture && stage === 'playoffs') {
  // Season complete
  setStage('completed');
}
```

**UI Display:**
```jsx
{!nextFixture && stage === 'completed' && (
  <div className="season-complete">
    <Trophy className="w-16 h-16 text-trophy-gold" />
    <h2>Season Complete!</h2>
    <p>View final standings and champion</p>
  </div>
)}
```

### Integration with Components

#### Dashboard.jsx

```javascript
// Get next fixture and user team
const nextFixture = getNextFixture();
const userTeam = getUserTeam();
const isUserMatch = nextFixture ? isUserTeamMatch(nextFixture, userTeam?.id) : false;

// Continue button
<button onClick={handleContinue}>
  {isUserMatch ? 'Play Match' : 'Continue'}
</button>

// Handle click
const handleContinue = async () => {
  if (isUserMatch) {
    navigate(`/game/match/${nextFixture.id}`);
  } else {
    const result = await quickSimMatch(...);
    recordResult(result);
    advanceToNextMatch();
  }
};
```

#### League.jsx (SeasonProgress component)

```javascript
const progress = getSeasonProgress();
const nextFixture = getNextFixture();

// Progress bar
<div className="w-full h-2 bg-bg-tertiary rounded-full">
  <div
    className="h-full bg-cricket-accent"
    style={{ width: `${progress.progressPercent}%` }}
  />
</div>

// Next fixture display
{nextFixture && (
  <div>
    <p>{homeTeam.name} vs {awayTeam.name}</p>
    <button onClick={handlePlayMatch}>
      {isUserMatch ? 'Play Match' : 'Quick Simulate'}
    </button>
  </div>
)}
```

#### Match.jsx

```javascript
// Load fixture from URL or next available
const { matchId } = useParams();
const fixture = getFixtureById(matchId) || getNextFixture();

// On match complete
const handleContinue = () => {
  navigate('/game/league');
  // League view will handle result recording
};
```

### State Persistence

The leagueStore uses Zustand persistence middleware:

```javascript
persist(
  (set, get) => ({ ... }),
  {
    name: 'cm25-league-store',
    version: 2
  }
)
```

**Persisted State:**
- `currentFixtureIndex` - Resume from last match
- `fixtures` - All season fixtures
- `results` - Completed match results
- `standings` - Current league table
- `stage` - 'league', 'playoffs', 'completed'

**Use Cases:**
- Page refresh doesn't lose progress
- Close browser and resume later
- Switch between tabs/components
- Debug and reload during development

### Performance Considerations

**Fixture Lookup:**
```javascript
// O(1) - Direct array access
const nextFixture = fixtures[currentFixtureIndex];

// O(n) - Search by ID (only when needed)
const fixture = fixtures.find(f => f.id === matchId);
```

**Optimization:**
```javascript
// Cache team lookups in component
const homeTeam = useMemo(() => getClub(fixture.homeTeam), [fixture]);
const awayTeam = useMemo(() => getClub(fixture.awayTeam), [fixture]);
```

### Error Handling

**Missing Fixture:**
```javascript
const nextFixture = getNextFixture();

if (!nextFixture) {
  console.warn('No fixture available');
  // Season complete or error
}
```

**Invalid Fixture ID:**
```javascript
const fixture = getFixtureById(matchId);

if (!fixture) {
  console.warn(`Fixture ${matchId} not found`);
  // Fallback to next fixture
  fixture = getNextFixture();
}
```

**Missing Team Data:**
```javascript
const homeTeam = getClub(fixture.homeTeam);

if (!homeTeam) {
  throw new Error('Team data not found for match');
}
```

### Testing

**Test Fixture Progression:**
```bash
node src/test/leagueTest.js --full

# Verify:
# - All 90 fixtures processed sequentially
# - currentFixtureIndex increments correctly
# - Season completes after fixture 89
```

**Test User Match Detection:**
```javascript
const fixture = { homeTeam: 'user_team', awayTeam: 'ai_team' };
expect(isUserTeamMatch(fixture, 'user_team')).toBe(true);

const aiFixture = { homeTeam: 'ai_team_1', awayTeam: 'ai_team_2' };
expect(isUserTeamMatch(aiFixture, 'user_team')).toBe(false);
```

## Related Documentation

- [Match Progression System](../features/match-progression-system.md) - Complete progression flow
- [Quick Simulation](../features/quick-simulation.md) - AI match simulation
- [Match View Component](../components/match-view.md) - Interactive match UI
- [Match Engine](./match-engine.md) - Ball-by-ball simulation
- [Tactics System](./tactics-system.md) - In-match tactical decisions
- [Player System](./player-system.md) - Player attributes and selection
- [State Management](../frontend/state-management.md) - Zustand stores
- [Stores API](../api/stores-api.md) - Complete store reference

---

**Last Updated:** January 2025 - League System v2.0 (Match Progression Update)
