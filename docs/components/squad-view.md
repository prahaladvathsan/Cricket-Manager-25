# Squad View Component

**Component**: `Squad.jsx`
**Location**: `src/components/team/`
**Status**: ✅ Complete (Updated January 2025)

## Overview

Team squad management page displaying all players in the user's team with comprehensive filtering, sorting, and detailed player information in a data-dense table view.

## Component Structure

```jsx
<Squad />
```

**Route**: `/squad`

## Features

### Three-Tab Interface

#### 1. Squad Overview Tab
Main tab with sortable/filterable player table.

#### 2. Team Info Tab
Team details, financial overview, and venue information.

#### 3. Statistics Tab
Season statistics (placeholder for future match data).

## Squad Overview Design

### Squad Statistics Cards

Six compact cards displaying:
- **Total Players**: Total squad size
- **Overseas**: Non-Indian players count
- **Batsmen**: Pure batsmen count
- **Bowlers**: Pure bowlers count
- **All-Rounders**: All-rounder count
- **Keepers**: Wicket-keepers count

### Filter Controls

**Search Bar**:
- Text input with search icon
- Filters by player name (case-insensitive)
- Real-time filtering

**Role Filter**:
- Dropdown selector
- Options: All Roles, Batsman, Bowler, All-Rounder, Wicket-Keeper
- Filters table rows instantly

**Nationality Filter**:
- Dropdown selector
- Dynamically populated from squad nationalities
- Options: All Nationalities + unique nationalities (sorted)

**Results Counter**:
- Shows: "Showing X of Y players"
- Updates with filter changes

### Sortable Table

**9 Columns**:

| Column | Content | Sortable | Format |
|--------|---------|----------|--------|
| Player | Name | ✅ | String (left-aligned) |
| Age | Age in years | ✅ | Number (centered) |
| Nation | Nationality code | ✅ | String (left-aligned) |
| Role | Player role | ✅ | Capitalized string |
| Bat | Batting hand | ✅ | R/L (centered) |
| Bowling | Bowling style | ✅ | Full text (left-aligned) |
| Batting Playstyle | Name + Rating | ✅ (by rating) | 2-line: Name / Rating |
| Bowling Playstyle | Name + Rating | ✅ (by rating) | 2-line: Name / Rating |
| Value | Auction value | ✅ | ₹X.X Cr (right-aligned, gold) |

**Sorting Behavior**:
- Click column header to sort
- First click: Ascending
- Second click: Descending
- Active column shows arrow icon (up/down)
- Inactive columns show double-arrow icon (muted)

**Row Styling**:
- Alternating colors: bg-primary / bg-secondary
- Hover: bg-tertiary
- Cursor: pointer (clickable)
- Border between rows

### Player Rating Display

Uses **primary playstyle ratings** (0-100 scale) from `ratingHelper.js`:

**Batting Playstyle Column**:
```
Top Order - Balanced
78.5
```
- Top line: Playstyle name (text-secondary, truncated)
- Bottom line: Rating (cricket-accent, font-mono)

**Bowling Playstyle Column**:
```
Swing Bowler
65.3
```
- Same format as batting
- Shows "N/A" if player has no bowling playstyle (rating ≤ 40)

### Empty State

If squad has no players:
- Large user icon
- "No Players in Squad" heading
- Descriptive text about visiting Transfers
- "Go to Transfers" button (placeholder)

## Data Flow

### State Management

**Local State**:
- `selectedTab`: Current tab ('squad', 'team-info', 'statistics')
- `searchTerm`: Search filter text
- `roleFilter`: Selected role ('all', 'batsman', 'bowler', etc.)
- `nationalityFilter`: Selected nationality ('all', or nationality code)
- `sortBy`: Current sort column name
- `sortDirection`: 'asc' or 'desc'

**Store Data**:
- `getUserTeam()` → Current user team
- `getPlayersByTeam(teamId)` → All players in team

### Filtering Logic

```javascript
filteredSortedPlayers = useMemo(() => {
  let result = [...squadPlayers];

  // Apply search
  if (searchTerm) {
    result = result.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply role filter
  if (roleFilter !== 'all') {
    result = result.filter(p => p.role === roleFilter);
  }

  // Apply nationality filter
  if (nationalityFilter !== 'all') {
    result = result.filter(p => p.nationality === nationalityFilter);
  }

  // Apply sorting
  result.sort((a, b) => {
    // ... sorting logic based on sortBy and sortDirection
  });

  return result;
}, [squadPlayers, searchTerm, roleFilter, nationalityFilter, sortBy, sortDirection]);
```

### Sorting Logic

**String Columns**: Use `localeCompare()`
**Number Columns**: Subtract values
**Rating Columns**: Use `getPrimaryBattingRating()` / `getPrimaryBowlingRating()`

Default sort: By name (ascending)

## Team Info Tab

### Team Information Card

Displays:
- Team colors (colored circle)
- Team name (full)
- Team short name
- Head Coach name
- Home Venue

### Financial Overview Card

Displays:
- **Budget Used**: Progress bar (₹X / ₹Y Cr)
- **Available Budget**: Remaining funds (green, ₹X Cr)
- **Squad Size**: Current/Max (X/25)

## Design Specifications

### Colors
- **Cricket Green**: #2D5F3F (primary actions)
- **Trophy Gold**: #D4AF37 (auction values)
- **Playstyle Ratings**: cricket-accent variable

### Typography
- **Base**: 14px (text-sm)
- **Headers**: text-lg, text-base
- **Data**: text-xs for compact display
- **Monospace**: Ratings, financial values

### Spacing
- **Card padding**: p-3
- **Table padding**: px-3 py-2
- **Gaps**: gap-2, gap-3
- **Compact**: Football Manager aesthetic

### Responsive Design
- **Statistics Grid**: 2 cols (mobile) → 4 cols (md) → 6 cols (lg)
- **Filter Row**: Wrap on mobile, single line on desktop
- **Table**: Horizontal scroll on mobile (overflow-x-auto)

## Helper Functions

### `handleSort(column)`
Toggles sort direction or changes column.

### `SortIndicator({ column })`
Returns appropriate arrow icon based on sort state.

### `availableNationalities`
Computed list of unique nationalities from squad players.

### `filteredSortedPlayers`
Memoized filtered and sorted player list.

## Actions

### Set Tactics Button
Opens `SetTacticsModal` for team tactics configuration.

### Manage Squad Button
Placeholder for future squad management features (releases, loans).

### Row Click
Placeholder for future player detail view.

## Dependencies

**Stores**:
- `useTeamStore`: Team data and user team selection
- `usePlayerStore`: Player data retrieval

**Utilities**:
- `ratingHelper.js`: Primary playstyle rating functions

**Components**:
- `SetTacticsModal`: Tactics configuration modal

**Icons** (Lucide React):
- `Users`: Squad overview tab, statistics cards
- `Target`: Team info tab
- `TrendingUp`: Statistics tab
- `DollarSign`: Financial card
- `Search`: Search filter
- `ArrowUpDown`, `ArrowUp`, `ArrowDown`: Sort indicators

## Usage Example

```jsx
import Squad from './components/team/Squad';

// In router configuration
<Route path="/squad" element={<Squad />} />

// In navigation
<Link to="/squad">Squad</Link>
```

## Performance Optimizations

- `useMemo` for filtered/sorted player list
- `useMemo` for available nationalities
- Efficient filtering (single pass)
- Efficient sorting (optimized comparisons)

## Future Enhancements

- [ ] Player detail modal (click row)
- [ ] Export squad to CSV/JSON
- [ ] Compare players (multi-select)
- [ ] Advanced filters (age range, value range, playstyle rating range)
- [ ] Column visibility toggle
- [ ] Custom column order (drag columns)
- [ ] Save filter presets
- [ ] Print squad sheet
- [ ] Player cards view toggle (table ↔ cards)

## Related Documentation

- [Tactics Modal](./tactics-modal.md)
- [Rating Helper](../api/rating-helper.md)
- [Team Store API](../api/stores-api.md#teamstore)
- [Player Store API](../api/stores-api.md#playerstore)
- [Design System](../frontend/design-system.md)

---

**Last Updated**: January 2025
