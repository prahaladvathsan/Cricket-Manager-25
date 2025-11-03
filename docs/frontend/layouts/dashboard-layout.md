# Dashboard Layout

## Overview

The **Dashboard** is the central hub of Cricket Manager, providing a comprehensive overview of the user's team, upcoming fixtures, league standing, and key metrics. Inspired by Football Manager's home screen, it presents critical information at a glance with actionable widgets.

---

## Design Philosophy

1. **Information Hierarchy**: Most important info (next match, league position) prominently displayed
2. **Quick Actions**: One-click access to key areas (squad, tactics, transfers)
3. **At-a-Glance Status**: All critical metrics visible without scrolling
4. **Contextual Updates**: Dynamic content based on season phase and match schedule
5. **Scannable Layout**: Card-based grid for easy scanning

---

## Layout Structure

### Full Layout Grid (Desktop)
```
+--------------------------------------------------------------------------+
| SIDEBAR |  HEADER: Dashboard                                            |
|         |  Season 1 • Week 12 • League Stage                           |
+----------+---------------------------------------------------------------+
| Home    | MAIN CONTENT AREA                                              |
| Squad   | +---------------------------+  +-----------------------------+ |
| Matches | | NEXT MATCH (Large Card)   |  | LEAGUE POSITION            | |
| League  | |                           |  |                             | |
| Tactics | | vs London Lions           |  | Standings Mini-Table        | |
| Finance | | Stadium: Wankhede         |  |                             | |
| Auction | | Date: 23 Jan • 19:30      |  | #3 Your Team                | |
|         | |                           |  |    9P 6W 3L 12pts +0.45    | |
|         | | [View Match] [Set XI]     |  |                             | |
|         | +---------------------------+  +-----------------------------+ |
|         |                                                                |
|         | +---------------------------+  +-----------------------------+ |
|         | | SQUAD STATUS              |  | RECENT FORM                 | |
|         | |                           |  |                             | |
|         | | Players: 23/25            |  | Last 5: W L W W L          | |
|         | | Overseas: 6/8             |  | Form: GOOD                  | |
|         | | Avg Age: 27.3             |  | Pts/Match: 1.33             | |
|         | | Injuries: 2               |  |                             | |
|         | | [View Squad]              |  | [View All Matches]          | |
|         | +---------------------------+  +-----------------------------+ |
|         |                                                                |
|         | +---------------------------+  +-----------------------------+ |
|         | | FINANCIAL SUMMARY         |  | TEAM MORALE                 | |
|         | |                           |  |                             | |
|         | | Budget: ₹12.5 Cr          |  | Overall: EXCELLENT          | |
|         | | Wage Bill: ₹7.8 Cr/season |  | Confidence: 82%             | |
|         | | Available: ₹4.7 Cr        |  | Energy: 75% avg             | |
|         | |                           |  |                             | |
|         | | [View Finances]           |  | [View Squad Details]        | |
|         | +---------------------------+  +-----------------------------+ |
|         |                                                                |
|         | +----------------------------------------------------------+    |
|         | | NEWS & NOTIFICATIONS FEED                                |    |
|         | |                                                          |    |
|         | | • Transfer window opens in 3 days                       |    |
|         | | • V. Kohli recovered from injury, available for selection|    |
|         | | • Mumbai Thunders won 3-0 against Karachi Kings          |    |
|         | | • Your team moved up to 3rd place in standings           |    |
|         | | [View All News]                                          |    |
|         | +----------------------------------------------------------+    |
|         |                                                                |
|         | +---------------------------+  +-----------------------------+ |
|         | | TOP PERFORMERS            |  | OBJECTIVES                  | |
|         | |                           |  |                             | |
|         | | Batting: R. Sharma        |  | □ Qualify for playoffs      | |
|         | |   342 runs @ 45.6 avg     |  | ✓ Win 5 home matches        | |
|         | | Bowling: J. Bumrah        |  | □ Maintain top 4 position   | |
|         | |   18 wkts @ 15.2 avg      |  | □ Score 200+ in a match     | |
|         | | [View Leaderboards]       |  |                             | |
|         | +---------------------------+  +-----------------------------+ |
+----------+---------------------------------------------------------------+
```

---

## Component Breakdown

### 1. Next Match Card (`NextMatchCard.jsx`)

**Purpose**: Highlight upcoming fixture with quick actions

**Layout**:
```
+------------------------------------------------------------+
| NEXT MATCH                                [Live Indicator] |
+------------------------------------------------------------+
|                        VS                                  |
|  [Your Badge]              [Opponent Badge]                |
|  Mumbai Thunders           London Lions                    |
|                                                            |
|  Venue: Wankhede Stadium, Mumbai                          |
|  Date: 23 January 2024                                     |
|  Time: 19:30 IST                                           |
|  Competition: WPL League Stage                             |
|                                                            |
|  Form: [W][L][W][W][W]     Form: [L][W][W][L][W]         |
|                                                            |
|  [View Match Details] [Set Tactics] [Select Playing XI]   |
+------------------------------------------------------------+
```

**Data Source**:
```javascript
const nextMatch = useLeagueStore(state => {
  const now = new Date();
  return state.fixtures
    .filter(f => f.homeTeam === userTeamId || f.awayTeam === userTeamId)
    .filter(f => new Date(f.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
});
```

**Features**:
- **Countdown timer**: "Kickoff in 2 days 5 hours"
- **Live indicator**: Pulsing red dot if match is currently ongoing
- **Form comparison**: Last 5 results for both teams
- **Quick actions**: Jump to match, tactics, or squad selection
- **Empty state**: "No upcoming matches scheduled" if none found

**Styling**:
- Larger card: `col-span-2` on desktop grid
- Team badges: 80x80px circular
- Primary CTA button: `bg-cricket-primary`
- If match is today: `border-2 border-cricket-accent` highlight

---

### 2. League Position Widget (`LeaguePositionWidget.jsx`)

**Purpose**: Show current standings with user team highlighted

**Layout**:
```
+------------------------------------+
| LEAGUE POSITION          [View All] |
+------------------------------------+
| Pos Team             P  W  L  Pts  |
| 1   Melbourne M.     9  8  1  16   |
| 2   Cape Town C.     9  7  2  14   |
| 3 → Mumbai T. (You)  9  6  3  12   |
| 4   London Lions     9  6  3  12   |
| 5   Karachi Kings    9  5  4  10   |
| ... (showing top 5 + user)         |
+------------------------------------+
| Your NRR: +0.45                    |
| Playoff cutoff: 4th (12 pts)       |
+------------------------------------+
```

**Data Source**:
```javascript
const standings = useLeagueStore(state => state.standings);
const userTeam = useTeamStore(state => state.getUserTeam());

// Get top 5 and ensure user team is included
const displayStandings = getTopStandingsWithUser(standings, userTeam.id, 5);
```

**Features**:
- **Compact table**: Top 5 teams + user team (if outside top 5)
- **User team highlighted**: `bg-cricket-primary bg-opacity-20`
- **Trend indicator**: ↑ ↓ → for position change from last week
- **Playoff line**: Visual divider after 4th place
- **Quick view button**: Opens full league standings

**Styling**:
- Monospace font for numbers
- Condensed spacing: `text-sm`
- User row: Bold team name + background highlight
- Playoff zone (top 4): Subtle green background tint

---

### 3. Squad Status Card (`SquadStatusCard.jsx`)

**Purpose**: Overview of squad composition and health

**Layout**:
```
+------------------------------------+
| SQUAD STATUS            [View Squad]|
+------------------------------------+
| Players:     23 / 25               |
| ████████████████░░ 92%             |
|                                    |
| Overseas:    6 / 8                 |
| ████████████░░░░░░ 75%             |
|                                    |
| Average Age: 27.3 years            |
| Average Rating: 78.5               |
|                                    |
| Injuries: 2 players                |
| ⚠ V. Kohli (hamstring, 1 week)    |
| ⚠ S. Iyer (shoulder, 3 days)       |
|                                    |
| Form: GOOD (avg 75%)               |
| Energy: 82% team average           |
+------------------------------------+
| [View Full Squad] [Set Playing XI] |
+------------------------------------+
```

**Data Source**:
```javascript
const squad = usePlayerStore(state =>
  state.getPlayersByTeam(userTeamId)
);

const squadStats = {
  total: squad.length,
  overseas: squad.filter(p => p.isOverseas).length,
  avgAge: squad.reduce((sum, p) => sum + p.age, 0) / squad.length,
  avgRating: squad.reduce((sum, p) => sum + p.rating, 0) / squad.length,
  injuries: squad.filter(p => p.injuryStatus !== 'fit')
};
```

**Features**:
- **Progress bars**: Visual representation of squad fill percentage
- **Status alerts**: Highlight injuries, suspensions, low morale
- **Quick stats**: Age, rating, form, energy at a glance
- **Action buttons**: Jump to squad management

**Styling**:
- Progress bars: Green fill with gray background
- Injury alerts: `text-status-critical` with ⚠ icon
- Good form: `text-status-good`, Poor form: `text-status-poor`

---

### 4. Recent Form Widget (`RecentFormWidget.jsx`)

**Purpose**: Visualize team's recent performance

**Layout**:
```
+------------------------------------+
| RECENT FORM              [View All] |
+------------------------------------+
| Last 5 Matches:                    |
|                                    |
| [W] [L] [W] [W] [L]                |
|                                    |
| Form Rating: GOOD                  |
| Points per match: 1.33             |
| Win rate: 60%                      |
|                                    |
| Goals for: 42                      |
| Goals against: 38                  |
| Goal difference: +4                |
|                                    |
| Streak: 1 loss                     |
+------------------------------------+
```

**Visual Form Indicators**:
- **W (Win)**: Green circle with white "W"
- **L (Loss)**: Red circle with white "L"
- **T (Tie)**: Yellow circle with white "T"
- Size: 40x40px, with hover tooltip showing match details

**Data Source**:
```javascript
const recentMatches = useLeagueStore(state => {
  return state.results
    .filter(r => r.homeTeam === userTeamId || r.awayTeam === userTeamId)
    .slice(-5);
});

const formRating = calculateFormRating(recentMatches); // "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR"
```

**Features**:
- **Hover tooltips**: Show match details (opponent, score, date)
- **Form rating**: Text description with color coding
- **Trend analysis**: "3-match winning streak" or "2 losses in last 3"

---

### 5. Financial Summary Card (`FinancialSummaryCard.jsx`)

**Purpose**: Budget and wage overview

**Layout**:
```
+------------------------------------+
| FINANCES                [View Full] |
+------------------------------------+
| Current Budget:                    |
| ₹12.5 Cr                           |
| +₹2.3 Cr this month                |
|                                    |
| Wage Bill: ₹7.8 Cr / season        |
| Available: ₹4.7 Cr                 |
|                                    |
| Budget Health: HEALTHY             |
| ████████████░░░░░░ 63%             |
|                                    |
| Next Payment: 15 days              |
| Match Revenue: ₹450 L              |
+------------------------------------+
```

**Data Source**:
```javascript
const finances = useFinanceStore(state =>
  state.getTeamFinances(userTeamId)
);
```

**Features**:
- **Budget status**: Color-coded (Green: Healthy, Yellow: Caution, Red: Critical)
- **Progress bar**: % of budget remaining
- **Quick metrics**: Income, expenses, net change
- **Alerts**: Warning if budget < 10% of initial

**Styling**:
- Currency: `font-mono font-bold text-2xl`
- Positive changes: `text-status-good` with ↑
- Negative changes: `text-status-loss` with ↓

---

### 6. Team Morale Widget (`TeamMoraleWidget.jsx`)

**Purpose**: Squad confidence and energy levels

**Layout**:
```
+------------------------------------+
| TEAM MORALE                         |
+------------------------------------+
| Overall Morale: EXCELLENT          |
| ████████████████████░ 82%          |
|                                    |
| Confidence: 82% (team avg)         |
| Energy: 75% (team avg)             |
| Form: 78% (team avg)               |
|                                    |
| High Morale: 18 players            |
| Low Morale: 2 players              |
| ⚠ S. Gill (confidence: 35%)        |
| ⚠ K. Yadav (energy: 42%)           |
+------------------------------------+
```

**Data Source**:
```javascript
const morale = usePlayerStore(state => {
  const players = state.getPlayersByTeam(userTeamId);
  return {
    avgConfidence: avg(players.map(p => p.condition.confidence)),
    avgEnergy: avg(players.map(p => p.condition.energy)),
    avgForm: avg(players.map(p => p.condition.form)),
    lowMorale: players.filter(p => p.condition.confidence < 50)
  };
});
```

**Features**:
- **Morale rating**: EXCELLENT > GOOD > AVERAGE > POOR
- **Three metrics**: Confidence, energy, form with progress bars
- **Alert list**: Players with critically low stats
- **Color coding**: Green (high), yellow (medium), red (low)

---

### 7. News & Notifications Feed (`NewsFeed.jsx`)

**Purpose**: Recent events and updates

**Layout**:
```
+------------------------------------------------------------+
| NEWS & NOTIFICATIONS                          [Mark All Read]|
+------------------------------------------------------------+
| [!] Transfer window opens in 3 days                  2h ago |
|                                                              |
| [✓] V. Kohli recovered from injury, available        5h ago |
|                                                              |
| [⚽] Mumbai Thunders 165/7 def. Karachi Kings 158/8 1d ago |
|                                                              |
| [📈] Your team moved up to 3rd place              1d ago     |
|                                                              |
| [💰] Match revenue: ₹450 lakhs added to budget  2d ago      |
|                                                              |
| [View All News]                                              |
+------------------------------------------------------------+
```

**News Types**:
- **Alerts** [!]: Important notifications (transfer windows, deadlines)
- **Match Results** [⚽]: Recent match outcomes
- **Injuries** [✓]: Player fitness updates
- **Standings** [📈]: League position changes
- **Financial** [💰]: Budget updates

**Data Source**:
```javascript
const news = useGameStore(state => state.newsItems);
const unreadCount = news.filter(n => !n.isRead).length;
```

**Features**:
- **Unread indicator**: Bold text for unread items
- **Categorized icons**: Different icons for news types
- **Relative timestamps**: "2h ago", "1d ago", etc.
- **Click to expand**: Show full details in modal
- **Filter/Sort**: By type, date, or importance

---

### 8. Top Performers Card (`TopPerformersCard.jsx`)

**Purpose**: Highlight best players this season

**Layout**:
```
+------------------------------------+
| TOP PERFORMERS     [Leaderboards]   |
+------------------------------------+
| BATTING                            |
| R. Sharma                          |
| 342 runs • Avg: 45.6 • SR: 148.2   |
|                                    |
| BOWLING                            |
| J. Bumrah                          |
| 18 wkts • Avg: 15.2 • Econ: 6.8    |
|                                    |
| FIELDING                           |
| R. Jadeja                          |
| 8 catches • 2 run outs             |
+------------------------------------+
```

**Data Source**:
```javascript
const topBatsman = usePlayerStore(state => {
  const squad = state.getPlayersByTeam(userTeamId);
  return squad.sort((a, b) => b.stats.runs - a.stats.runs)[0];
});
```

**Features**:
- **Three categories**: Batting, bowling, fielding
- **Key stats**: Most relevant metrics for each
- **Click to view**: Open player detail page
- **Link to leaderboards**: Full league-wide stats

---

### 9. Objectives Widget (`ObjectivesWidget.jsx`)

**Purpose**: Season goals and progress tracking

**Layout**:
```
+------------------------------------+
| OBJECTIVES                          |
+------------------------------------+
| Season Goals:                      |
|                                    |
| ✓ Win 5 home matches       (5/5)   |
| ████████████████████ 100%          |
|                                    |
| □ Qualify for playoffs     (3rd)   |
| ████████████░░░░░░░░ 67%           |
|                                    |
| □ Maintain top 4 position  (3rd)   |
| ████████████████░░░░ 80%           |
|                                    |
| □ Score 200+ in a match    (0/1)   |
| ░░░░░░░░░░░░░░░░░░░░ 0%            |
+------------------------------------+
```

**Objective Types**:
- **League position**: Finish in top X
- **Match targets**: Win X matches, home/away records
- **Scoring**: Reach score milestones
- **Player development**: Individual player achievements

**Data Source**:
```javascript
const objectives = useGameStore(state => state.seasonObjectives);
const progress = calculateObjectiveProgress(objectives, currentStats);
```

**Features**:
- **Checkboxes**: Visual completion status
- **Progress bars**: % towards goal
- **Rewards**: Show currency/benefits on completion
- **Dynamic**: Updates automatically based on match results

---

## Responsive Design

### Desktop (> 1024px)
- **4-column grid**: Large widgets span 2 columns
- All widgets visible on first screen (with scroll for news)
- Next Match card: 2 columns wide

### Tablet (768px - 1024px)
- **2-column grid**: Most widgets single column
- Next Match card: Full width
- League position & Recent form: Side by side

### Mobile (< 768px)
- **Single column**: All widgets stack
- Condensed widgets: Fewer details, "View more" buttons
- Next Match: Compact view with less spacing

---

## State Management

### Store Subscriptions
```javascript
function Dashboard() {
  // Game state
  const { currentSeason, currentWeek, currentPhase } = useGameStore();

  // User team
  const { getUserTeam } = useTeamStore();
  const userTeam = getUserTeam();

  // League data
  const standings = useLeagueStore(state => state.standings);
  const nextMatch = useLeagueStore(state => getNextMatch(state, userTeam.id));

  // Squad data
  const squad = usePlayerStore(state => state.getPlayersByTeam(userTeam.id));

  // Finances
  const finances = useFinanceStore(state => state.getTeamFinances(userTeam.id));

  return (
    <div className="dashboard-grid">
      <NextMatchCard match={nextMatch} team={userTeam} />
      <LeaguePositionWidget standings={standings} userTeam={userTeam} />
      {/* ... other widgets */}
    </div>
  );
}
```

---

## Empty States

### No Team Selected
```
+------------------------------------------------------------+
| WELCOME TO CRICKET MANAGER                                  |
+------------------------------------------------------------+
|                                                            |
| Choose your team to begin your World Premier League       |
| management journey.                                        |
|                                                            |
| [Select Team]                                              |
|                                                            |
+------------------------------------------------------------+
```

### Preseason (No Matches Scheduled)
- Next Match Card: "Season starts in X days"
- League Position: "Season not started"
- Recent Form: "No matches played"

### Mid-Season Break
- Next Match Card: "Break week - Training in progress"
- Show training/development activities instead

---

## File Structure

```
src/components/dashboard/
  Dashboard.jsx                      # Main container
  NextMatchCard.jsx                  # Upcoming fixture
  LeaguePositionWidget.jsx           # Standings mini-table
  SquadStatusCard.jsx                # Squad overview
  RecentFormWidget.jsx               # Form visualization
  FinancialSummaryCard.jsx           # Budget summary
  TeamMoraleWidget.jsx               # Morale/confidence
  NewsFeed.jsx                       # News items
  TopPerformersCard.jsx              # Player highlights
  ObjectivesWidget.jsx               # Season goals
```

---

## Next Steps

1. ✅ Dashboard layout documented
2. **Implement grid layout** with responsive breakpoints
3. **Build individual widgets** starting with NextMatchCard
4. **Wire store subscriptions** for real-time updates
5. **Test with sample data** before live integration
