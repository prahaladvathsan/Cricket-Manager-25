# League View Layout

## Overview

The **League View** provides a comprehensive view of the World Premier League competition, including standings, fixtures, results, and player statistics. Inspired by Football Manager's competition screens, it uses a tab-based interface for easy navigation between different aspects of the league.

---

## Layout Structure

### Full Layout (Desktop)
```
+--------------------------------------------------------------------------+
| SIDEBAR |  LEAGUE HEADER                                                |
|         |  World Premier League • Season 1 • Week 12                   |
|         |  Stage: League Phase (Match 54/90)                          |
+----------+---------------------------------------------------------------+
| League  | TAB NAVIGATION                                                 |
| Matches | [ Standings ] [ Fixtures ] [ Results ] [ Stats ] [ Playoffs ] |
| Squad   +----------------------------------------------------------------+
| ...     | TAB CONTENT AREA                                               |
|         |                                                                |
|         | (Content varies based on active tab)                          |
|         |                                                                |
+----------+---------------------------------------------------------------+
```

---

## Tab 1: Standings

### Standings Table Layout
```
+-------------------------------------------------------------------------+
| STANDINGS TABLE                                         [Export] [⚙]    |
+-------------------------------------------------------------------------+
| Pos | Team              | P  | W | L | T | NR | Pts | NRR    | Form     |
+-----+-------------------+----+---+---+---+----+-----+--------+----------+
|  1  | Melbourne Meteors | 9  | 8 | 1 | 0 | 0  | 16  | +1.24  | WWWWL    |
|  2  | Cape Town Crusad. | 9  | 7 | 2 | 0 | 0  | 14  | +0.89  | WLWWW    |
|  3  | Mumbai Thunders▶  | 9  | 6 | 3 | 0 | 0  | 12  | +0.45  | LWWLW    |
|  4  | London Lions      | 9  | 6 | 3 | 0 | 0  | 12  | +0.12  | WWLWL    |
+-----+-------------------+----+---+---+---+----+-----+--------+----------+
|  5  | Karachi Kings     | 9  | 5 | 4 | 0 | 0  | 10  | -0.08  | WLLLW    |
|  6  | Colombo Cobras    | 9  | 4 | 5 | 0 | 0  |  8  | -0.34  | LLWWL    |
|  7  | Dhaka Dynamites   | 9  | 3 | 6 | 0 | 0  |  6  | -0.67  | LWLLL    |
|  8  | Kingston Storm    | 9  | 2 | 7 | 0 | 0  |  4  | -1.02  | LLLWL    |
|  9  | Wellington War.   | 9  | 2 | 7 | 0 | 0  |  4  | -1.15  | LLLLW    |
| 10  | Kabul Eagles      | 9  | 1 | 8 | 0 | 0  |  2  | -1.42  | LLLLL    |
+-----+-------------------+----+---+---+---+----+-----+--------+----------+

PLAYOFF ZONE (Top 4 qualify) ────────────────────────────────────────────
```

**Column Definitions**:
- **Pos**: Position/Rank
- **Team**: Team name (with user team indicator ▶)
- **P**: Played
- **W**: Won
- **L**: Lost
- **T**: Tied
- **NR**: No Result
- **Pts**: Points (2 per win)
- **NRR**: Net Run Rate
- **Form**: Last 5 matches (W/L/T)

**Features**:
- **Sortable columns**: Click header to sort
- **User team highlight**: Different background color
- **Playoff line**: Visual separator after 4th place
- **Form visualization**: Color-coded W/L/T boxes
- **Click team row**: Navigate to team detail page
- **Hover tooltips**: Show extended stats

**Right Sidebar** (Optional):
```
+---------------------------+
| LEAGUE INFO               |
+---------------------------+
| Matches Played: 54/90     |
| Matches Remaining: 36     |
| Avg Runs/Match: 168       |
| Highest Score: 212/4      |
| Lowest Score: 89 all out  |
+---------------------------+
| UPCOMING FIXTURES         |
+---------------------------+
| Today:                    |
|  • Melbourne vs Cape Town |
|  • Mumbai vs London       |
|                           |
| Tomorrow:                 |
|  • Karachi vs Colombo     |
+---------------------------+
```

---

## Tab 2: Fixtures

### Fixtures Calendar Layout
```
+-------------------------------------------------------------------------+
| FIXTURES                                    [Filter v] [View: List v]   |
+-------------------------------------------------------------------------+
| << Week 11 | Week 12 (Current) | Week 13 >>                            |
+-------------------------------------------------------------------------+
| MONDAY, 22 JANUARY 2024                                                 |
+-------------------------------------------------------------------------+
| 15:00 IST | Melbourne Meteors  vs  Cape Town Crusaders                 |
|           | Venue: Melbourne Cricket Ground                            |
|           | [View Preview] [Set Reminder]                              |
+-------------------------------------------------------------------------+
| 19:30 IST | Mumbai Thunders (You) vs  London Lions                     |
|           | Venue: Wankhede Stadium, Mumbai                            |
|           | [View Match] [Set Tactics] [Select XI]                     |
+-------------------------------------------------------------------------+
| TUESDAY, 23 JANUARY 2024                                                |
+-------------------------------------------------------------------------+
| 15:00 IST | Karachi Kings  vs  Colombo Cobras                          |
|           | Venue: National Stadium, Karachi                           |
|           | [View Preview]                                             |
+-------------------------------------------------------------------------+
| 19:30 IST | Dhaka Dynamites  vs  Kingston Storm                        |
|           | Venue: Shere Bangla Stadium, Dhaka                         |
|           | [View Preview]                                             |
+-------------------------------------------------------------------------+
```

**Filter Options**:
- **Team**: Show only specific team's fixtures
- **Venue**: Filter by stadium
- **Date Range**: Custom date picker
- **Status**: Upcoming / Live / Completed

**View Options**:
- **List View**: Chronological list (default)
- **Calendar View**: Month calendar grid
- **Team View**: Group by team

**Features**:
- **Your matches highlighted**: Border or background color
- **Live matches**: Pulsing indicator + "LIVE" badge
- **Quick actions**: Set tactics, view team, add reminder
- **Match preview**: Shows team form, h2h, key players

---

## Tab 3: Results

### Results List Layout
```
+-------------------------------------------------------------------------+
| RESULTS                                     [Filter v] [Show: 20 v]     |
+-------------------------------------------------------------------------+
| MATCHDAY 54 - 21 JANUARY 2024                                          |
+-------------------------------------------------------------------------+
| Mumbai Thunders (You)    165/7 (20 ov)   def.   Karachi Kings         |
| Karachi Kings            158/8 (20 ov)           by 7 runs             |
|                                                                         |
| Top Scorer: R. Sharma (68 off 42)  |  Best Bowler: J. Bumrah (3/22)   |
| [View Full Scorecard] [Match Report] [Highlights]                      |
+-------------------------------------------------------------------------+
| Melbourne Meteors        198/4 (20 ov)   def.   Cape Town Crusaders   |
| Cape Town Crusaders      182/6 (20 ov)           by 16 runs            |
|                                                                         |
| Top Scorer: G. Maxwell (89* off 52) | Best Bowler: K. Rabada (2/28)   |
| [View Full Scorecard] [Match Report]                                   |
+-------------------------------------------------------------------------+
| MATCHDAY 53 - 20 JANUARY 2024                                          |
+-------------------------------------------------------------------------+
| London Lions             176/5 (20 ov)   def.   Colombo Cobras         |
| Colombo Cobras           169/7 (20 ov)           by 7 runs             |
|                                                                         |
| [View Full Scorecard]                                                  |
+-------------------------------------------------------------------------+
```

**Features**:
- **Expandable cards**: Click to show full match details
- **Your matches highlighted**: Visual distinction
- **Quick stats**: Top scorer, best bowler
- **Match actions**: Scorecard, report, highlights (video)
- **Infinite scroll**: Load more as user scrolls down
- **Group by matchday**: Organize chronologically

**Match Detail Expansion**:
```
+----------------------------------------------------------------------+
| Mumbai Thunders (You) 165/7 (20 ov) def. Karachi Kings 158/8 (20 ov)|
+----------------------------------------------------------------------+
| BATTING                                                              |
| Batsman         R    B   4s  6s   SR   |  Bowler        O  M  R  W   |
| R. Sharma       68   42  6   3   161.9 |  J. Bumrah     4  1  22 3   |
| V. Kohli        32   28  2   1   114.3 |  T. Boult      4  0  28 2   |
| [Full Scorecard]                                                     |
+----------------------------------------------------------------------+
```

---

## Tab 4: Stats (Player Leaderboards)

### Leaderboards Layout
```
+-------------------------------------------------------------------------+
| PLAYER STATISTICS                           [Category: Batting v]       |
+-------------------------------------------------------------------------+
| SUB-TABS: [ Top Run Scorers ] [ Top Wicket Takers ] [ Best Averages ]  |
+-------------------------------------------------------------------------+
|                                                                         |
| TOP RUN SCORERS                                                         |
+-------------------------------------------------------------------------+
| Rank | Player            | Team              | Runs | Avg  | SR    | 100s|
|------|-------------------|-------------------|------|------|-------|-----|
|  1   | R. Sharma (You)   | Mumbai Thunders   | 542  | 48.2 | 152.3 | 2   |
|  2   | V. Kohli (You)    | Mumbai Thunders   | 489  | 44.5 | 145.8 | 1   |
|  3   | G. Maxwell        | Melbourne Meteors | 467  | 38.9 | 168.5 | 1   |
|  4   | B. Azam           | Karachi Kings     | 445  | 44.5 | 138.2 | 1   |
|  5   | J. Root           | London Lions      | 423  | 38.5 | 141.3 | 0   |
+-------------------------------------------------------------------------+
|                                                                         |
| TOP WICKET TAKERS                                                       |
+-------------------------------------------------------------------------+
| Rank | Player            | Team              | Wkts | Avg  | Econ  | 5W  |
|------|-------------------|-------------------|------|------|-------|-----|
|  1   | J. Bumrah (You)   | Mumbai Thunders   | 24   | 14.2 | 6.8   | 1   |
|  2   | K. Rabada         | Cape Town Crusad. | 22   | 15.6 | 7.2   | 2   |
|  3   | R. Ashwin (You)   | Mumbai Thunders   | 20   | 18.3 | 7.5   | 0   |
+-------------------------------------------------------------------------+
```

**Leaderboard Categories**:
- **Batting**: Runs, average, strike rate, centuries, fifties
- **Bowling**: Wickets, average, economy, 5-wicket hauls
- **Fielding**: Catches, run outs, stumpings
- **All-round**: Combined batting + bowling metrics

**Features**:
- **Your players highlighted**: Background color
- **Filter by team**: Show only specific team
- **Minimum qualification**: e.g., "Min 5 innings"
- **Click player**: Navigate to player profile
- **Export**: Download as CSV/PDF

---

## Tab 5: Playoffs

### Playoff Structure Layout
```
+-------------------------------------------------------------------------+
| PLAYOFFS - KNOCKOUT STAGE                                               |
+-------------------------------------------------------------------------+
|                                                                         |
|   QUALIFIER 1 (1st vs 2nd)                                             |
|   +----------------------------------------------------------+          |
|   | Melbourne Meteors    vs    Cape Town Crusaders          |          |
|   | Winner → FINAL                                           |          |
|   | Loser → QUALIFIER 2                                      |          |
|   +----------------------------------------------------------+          |
|                                                                         |
|   ELIMINATOR (3rd vs 4th)                                              |
|   +----------------------------------------------------------+          |
|   | Mumbai Thunders (You)    vs    London Lions             |          |
|   | Winner → QUALIFIER 2                                     |          |
|   | Loser → ELIMINATED                                       |          |
|   +----------------------------------------------------------+          |
|                                                                         |
|   QUALIFIER 2 (Loser Q1 vs Winner Eliminator)                          |
|   +----------------------------------------------------------+          |
|   | TBD    vs    TBD                                         |          |
|   | Winner → FINAL                                           |          |
|   +----------------------------------------------------------+          |
|                                                                         |
|   FINAL                                                                 |
|   +----------------------------------------------------------+          |
|   | Winner Q1    vs    Winner Q2                             |          |
|   | CHAMPION                                                 |          |
|   +----------------------------------------------------------+          |
|                                                                         |
+-------------------------------------------------------------------------+
```

**Features**:
- **Visual bracket**: Tree-style playoff structure
- **Match cards**: Click to view/simulate match
- **TBD placeholders**: For未determined teams
- **Result indicators**: Show completed match results
- **Champion highlight**: Trophy icon and celebration

**Playoff Rules Info**:
```
+---------------------------+
| PLAYOFF QUALIFICATION     |
+---------------------------+
| Top 4 teams qualify       |
| Current standings:        |
|  1. Melbourne (Q)         |
|  2. Cape Town (Q)         |
|  3. Mumbai - You (Q)      |
|  4. London (Q)            |
|  ─────────────────────    |
|  5. Karachi (Eliminated)  |
+---------------------------+
```

---

## Responsive Design

### Desktop (> 1024px)
- Full width table with all columns
- Sidebar for league info/upcoming fixtures
- Horizontal tabs clearly visible

### Tablet (768px - 1024px)
- Reduce table columns (hide NR, T columns)
- Stack fixtures vertically
- Tabs remain horizontal but condensed

### Mobile (< 768px)
- **Card-based view**: Each row becomes a card
- **Dropdown tabs**: Tab selector instead of horizontal tabs
- **Swipe navigation**: Swipe between tabs
- **Simplified stats**: Show only key columns

---

## File Structure

```
src/components/league/
  LeagueView.jsx                     # Main container
  StandingsTable.jsx                 # Standings tab
  FixturesCalendar.jsx               # Fixtures tab
  ResultsList.jsx                    # Results tab
  Leaderboards.jsx                   # Stats tab
  PlayoffBracket.jsx                 # Playoffs tab
  TeamRow.jsx                        # Table row component
  MatchCard.jsx                      # Match card component
  FormIndicator.jsx                  # W/L/T visualization
```

---

## Next Steps

1. ✅ League view layout documented
2. **Build StandingsTable component** with sorting
3. **Implement FixturesCalendar** with week navigation
4. **Create Leaderboards** with filtering
5. **Design PlayoffBracket** visual structure
