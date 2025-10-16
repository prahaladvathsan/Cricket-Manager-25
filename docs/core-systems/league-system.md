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

**Location:** `src/data/clubs/wpl_clubs.json`

**Club Structure:**
```json
{
  "id": "mumbai_thunders",
  "name": "Mumbai Thunders",
  "city": "Mumbai",
  "country": "India",
  "stadium": "Wankhede Stadium",
  "founded": 2025,
  "colors": {
    "primary": "#004C93",
    "secondary": "#FFD700"
  }
}
```

**10 WPL Teams:**
1. Mumbai Thunders (India)
2. London Lions (England)
3. Melbourne Meteors (Australia)
4. Cape Town Crusaders (South Africa)
5. Karachi Kings (Pakistan)
6. Colombo Cobras (Sri Lanka)
7. Dhaka Dynamites (Bangladesh)
8. Kingston Storm (West Indies)
9. Wellington Warriors (New Zealand)
10. Kabul Eagles (Afghanistan)

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

## Related Documentation

- [Match Engine](./match-engine.md) - Ball-by-ball simulation
- [Tactics System](./tactics-system.md) - In-match tactical decisions
- [Player System](./player-system.md) - Player attributes and selection
- [State Management](../frontend/state-management.md) - Zustand stores

---

**Last Updated:** January 2025 - League System v1.0
