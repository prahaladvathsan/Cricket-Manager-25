# Squad Statistics Tab Implementation Plan

**Status**: Planned
**Priority**: High
**Estimated Effort**: 4-6 hours
**Dependencies**: playerStore.careerStats, leagueStore (for season data)

## Overview

Build out the Statistics tab in the Squad page (`src/components/team/Squad.jsx`) to display comprehensive player season statistics with separate batting and bowling views.

## Current State

- Squad page has 3 tabs: Squad Overview, Team Info, Statistics
- Statistics tab shows placeholder: "Statistics will be available once matches begin"
- Data is available in `playerStore.careerStats[playerId].seasons[currentSeasonId]`

## Requirements

### 1. Statistics Tab Structure

**Two Sub-tabs**:
- Batting Statistics
- Bowling Statistics

### 2. Batting Statistics Table

**Columns**:
- Player Name (clickable via `<PlayerName>` component)
- Role (BAT/ALL/WK)
- Matches (M)
- Innings (I)
- Runs
- Balls Faced
- Average (Avg)
- Strike Rate (SR)
- 50s
- 100s (if applicable for T20)
- Highest Score (HS)

**Data Source**:
```javascript
const playerStats = careerStats[playerId]?.seasons[currentSeasonId];
// Access: playerStats.runs, playerStats.ballsFaced, etc.
```

**Features**:
- Sortable by all columns
- Filters:
  - By role (Batsmen, All-rounders, Wicket-keepers)
  - Minimum matches played
- Default sort: Runs (descending)
- Minimum qualifying criteria: 1 match played

### 3. Bowling Statistics Table

**Columns**:
- Player Name (clickable)
- Role (BOWL/ALL)
- Matches (M)
- Innings (I)
- Overs
- Runs Conceded
- Wickets
- Average (Avg)
- Economy (Econ)
- Strike Rate (SR)
- Best Figures (Best)
- 4W / 5W hauls

**Data Source**:
```javascript
const playerStats = careerStats[playerId]?.seasons[currentSeasonId];
// Access: playerStats.wickets, playerStats.economy, etc.
```

**Features**:
- Sortable by all columns
- Filters:
  - By role (Bowlers, All-rounders)
  - Minimum overs bowled
- Default sort: Wickets (descending)
- Minimum qualifying criteria: 1 over bowled

### 4. UI Design

**Follow FM-style data-dense aesthetic**:
- Compact table with 14px base font
- Zebra striping for rows
- Hover effects on rows
- Sticky header when scrolling
- Cricket green accent colors for highlights

**Layout**:
```
┌─────────────────────────────────────────┐
│ Statistics                               │
├─────────────────────────────────────────┤
│ [Batting] [Bowling]                     │  ← Sub-tabs
├─────────────────────────────────────────┤
│ Filters: [Role ▼] [Min Matches: __]    │
│ Sort by: [Runs ▼]                       │
├─────────────────────────────────────────┤
│ Player    │ M │ Runs │ Avg │ SR │ ...  │
│ Player A  │ 5 │ 234  │ 46  │ 145│ ...  │
│ Player B  │ 5 │ 189  │ 38  │ 132│ ...  │
│ ...                                     │
└─────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create PlayerStatsTable Component

**File**: `src/components/team/PlayerStatsTable.jsx`

```jsx
/**
 * Reusable statistics table component
 * Props:
 * - players: Array of player objects with stats
 * - type: 'batting' or 'bowling'
 * - onPlayerClick: (playerId) => void
 */
```

**Features**:
- Column sorting (useState for sortColumn, sortDirection)
- Column definitions based on type
- Render functions for formatted values (average, strike rate, economy)
- Row click handler to open player modal

### Step 2: Add Sub-tabs to Statistics Tab

**File**: `src/components/team/Squad.jsx`

Modify the Statistics tab content to include:
```jsx
const [statsSubTab, setStatsSubTab] = useState('batting');

// In Statistics tab render:
<div className="flex gap-2 mb-4">
  <button onClick={() => setStatsSubTab('batting')}>Batting</button>
  <button onClick={() => setStatsSubTab('bowling')}>Bowling</button>
</div>

{statsSubTab === 'batting' && <PlayerStatsTable type="batting" players={battingStats} />}
{statsSubTab === 'bowling' && <PlayerStatsTable type="bowling" players={bowlingStats} />}
```

### Step 3: Prepare Data

**In Squad.jsx**, prepare player statistics:

```javascript
const userTeam = useTeamStore(state => state.userTeam);
const squadLists = useTeamStore(state => state.squadLists);
const careerStats = usePlayerStore(state => state.careerStats);
const currentSeasonId = usePlayerStore(state => state.currentSeasonId);

// Get squad player IDs
const squadPlayerIds = squadLists[userTeam?.id] || [];

// Prepare batting stats
const battingStats = useMemo(() => {
  return squadPlayerIds
    .map(playerId => {
      const player = players[playerId];
      const seasonStats = careerStats[playerId]?.seasons[currentSeasonId];

      if (!seasonStats || !seasonStats.runs) return null;

      return {
        id: playerId,
        name: player.name,
        role: player.role,
        matches: seasonStats.matches || 0,
        runs: seasonStats.runs || 0,
        ballsFaced: seasonStats.ballsFaced || 0,
        average: seasonStats.battingAverage || 0,
        strikeRate: seasonStats.strikeRate || 0,
        fifties: seasonStats.fifties || 0,
        hundreds: seasonStats.hundreds || 0,
        highestScore: seasonStats.highestScore || 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.runs - a.runs);
}, [squadPlayerIds, players, careerStats, currentSeasonId]);

// Prepare bowling stats (similar structure)
```

### Step 4: Add Filters

**State**:
```javascript
const [roleFilter, setRoleFilter] = useState('all');
const [minMatches, setMinMatches] = useState(0);
```

**Apply filters before rendering**:
```javascript
const filteredStats = battingStats.filter(player => {
  if (roleFilter !== 'all' && player.role !== roleFilter) return false;
  if (player.matches < minMatches) return false;
  return true;
});
```

### Step 5: Styling

Use existing Tailwind classes:
- `card` for container
- `border-border-primary` for borders
- `text-text-primary`, `text-text-secondary` for text
- `bg-bg-tertiary/30` for zebra striping
- `hover:bg-bg-secondary` for hover states
- `text-cricket-accent` for highlights

## Data Calculations

### Batting Average
```javascript
average = dismissed > 0 ? runs / dismissed : runs
```

### Strike Rate
```javascript
strikeRate = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0
```

### Bowling Average
```javascript
bowlingAverage = wickets > 0 ? runsConceded / wickets : 0
```

### Economy
```javascript
economy = ballsBowled > 0 ? (runsConceded / ballsBowled) * 6 : 0
```

### Bowling Strike Rate
```javascript
bowlingStrikeRate = wickets > 0 ? ballsBowled / wickets : 0
```

## Edge Cases

1. **No stats available**: Show message "No statistics available yet. Play matches to see stats."
2. **Player with 0 dismissals**: Show average as runs (not divided by 0)
3. **Player with 0 balls bowled**: Show "-" instead of economy
4. **Empty squad**: Show "No players in squad"

## Testing Checklist

- [ ] Batting stats display correctly for all players
- [ ] Bowling stats display correctly for all players
- [ ] Sorting works for all columns
- [ ] Filters apply correctly
- [ ] Player name click opens player modal
- [ ] Stats update after playing matches
- [ ] Handles edge cases (no stats, 0 dismissals, etc.)
- [ ] FM-style design matches rest of app
- [ ] Responsive on mobile

## Files to Modify

1. **New**: `src/components/team/PlayerStatsTable.jsx`
2. **Edit**: `src/components/team/Squad.jsx` (Statistics tab)

## Dependencies

- `playerStore.careerStats` - Contains all season statistics
- `playerStore.currentSeasonId` - Current season identifier
- `teamStore.squadLists` - Squad composition
- `<PlayerName>` component - For clickable player names

## Success Criteria

- User can view comprehensive batting and bowling statistics for their squad
- Tables are sortable and filterable
- Data updates in real-time as matches are played
- Design is data-dense and professional (FM-style)
- Statistics are accurate and calculated correctly
