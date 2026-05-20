# UI Components Reference

**Last Updated:** February 2026

This is the **master reference** for all reusable UI components, patterns, and quirks in Cricket Manager 25. Read this document before making any UI changes or creating new components.

---

## Table of Contents

1. [Reusable Components](#reusable-components)
2. [Playstyle Display System](#playstyle-display-system)
3. [Entity Components (Clickable)](#entity-components-clickable)
4. [Data Tables](#data-tables)
5. [UI Quirks & Special Rules](#ui-quirks--special-rules)
6. [Integration Patterns](#integration-patterns)

---

## Reusable Components

### PlaystyleBadge

**Location:** `src/components/shared/PlaystyleBadge.jsx`
**Created:** February 2026

Displays playstyle abbreviations with hover tooltips and prefix-based color coding.

#### Features
- **Abbreviation system**: 25 playstyles → 3-5 character codes (e.g., `O-SLG`, `P-HTD`)
- **Hover tooltips**: Full playstyle name appears on hover
- **Prefix-based colors**: Visual hierarchy matching existing conventions
- **Two variants**: `inline` (text-only) and `badge` (with background)

#### Usage

```jsx
import PlaystyleBadge from '../shared/PlaystyleBadge';

// Inline variant (default) - text-only display
<PlaystyleBadge
  playstyle="Opener - Slogger"
  rating={85}
  variant="inline"
/>
// Displays: O-SLG (85) with hover tooltip

// Badge variant - pill-shaped with background
<PlaystyleBadge
  playstyle="Hit-the-Deck Seamer"
  rating={72}
  variant="badge"
/>
// Displays: P-HTD (72) in colored badge
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `playstyle` | `string` | Yes | - | Full playstyle name (e.g., "Opener - Slogger") |
| `rating` | `number` | No | - | Rating value to display alongside abbreviation |
| `variant` | `'inline' \| 'badge'` | No | `'inline'` | Display mode |
| `className` | `string` | No | `''` | Additional CSS classes |

#### Color Coding (Prefix-Based)

**Batting Positions:**
- `O-` (Opener) → Blue (#60A5FA)
- `T-` (Top Order) → Green (#4ADE80)
- `M-` (Middle Order) → Yellow (#FACC15)
- `L-` (Lower Order) → Orange (#FB923C)
- `S-FIN/RUN/PNH/WAL` (Specialist Batting) → Pink (#F472B6)

**Bowling Types:**
- `P-` (Pace) → Red (#F87171)
- `S-CLS/FLT/MYS/CTN` (Spin) → Purple (#C084FC)

**Fielding:**
- `WKP` (Wicketkeeper) → Cyan (#22D3EE)

#### When to Use

✅ **Use PlaystyleBadge:**
- PlayerBrowser table columns
- Squad table (playstyle columns)
- Tactics page → Overview tab
- ModifierBreakdownPanel headers
- Any space-constrained display

❌ **Don't use PlaystyleBadge (use full names):**
- PlayerCard modals (detailed view)
- PlayerCardModal
- Dropdown selectors (clarity needed)

#### Related Files
- `src/utils/playstyleAbbreviations.js` - Abbreviation mappings and color logic
- `src/components/menu/PlayerBrowser.jsx` - Example usage (column headers)
- `src/components/team/Squad.jsx` - Example usage (table cells)
- `src/components/tactics/tabs/OverviewTab.jsx` - Example usage (tactics overview)

---

### SortableTable

**Location:** `src/components/shared/SortableTable.jsx`

Reusable data table component with sorting, filtering, sticky columns, and scroll sync.

#### Features
- Column-based sorting with visual indicators
- Customizable cell rendering
- Sticky columns (e.g., player name)
- Fixed header with dual scrollbar sync
- Filter component integration
- Row click handlers
- Custom empty states

#### Basic Usage

```jsx
import SortableTable from '../shared/SortableTable';

const columns = [
  {
    key: 'name',
    label: 'Player',
    sortKey: 'name',
    sticky: true,
    width: '200px',
    render: (player) => <PlayerName playerId={player.id} />,
  },
  {
    key: 'age',
    label: 'Age',
    sortKey: 'age',
    align: 'center',
    render: (player) => <span className="font-mono">{player.age}</span>,
  },
];

<SortableTable
  data={players}
  columns={columns}
  defaultSort={{ column: 'name', direction: 'asc' }}
  enableScrollSync={true}  // For wide tables
/>
```

#### Key Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `Array` | Data items to display |
| `columns` | `Array<ColumnDef>` | Column definitions |
| `defaultSort` | `Object` | Initial sort state |
| `customSort` | `Function` | Custom sort logic |
| `filterComponent` | `ReactNode` | Filter UI above table |
| `emptyState` | `ReactNode` | Custom empty state |
| `onRowClick` | `Function` | Row click handler |
| `enableScrollSync` | `boolean` | Enable fixed header + dual scrollbar |

#### Column Definition

```jsx
{
  key: 'uniqueId',             // Required: Unique identifier
  label: 'Column Header',      // Required: Header text
  sortKey: 'field.nested',     // Required: Sort key (dot notation supported)
  render: (item) => JSX,       // Required: Cell renderer
  align: 'left',               // Optional: 'left' | 'center' | 'right'
  sticky: false,               // Optional: Sticky column
  width: '200px',              // Optional: Min width
  sortable: true,              // Optional: Enable/disable sorting
  defaultDirection: 'asc',     // Optional: Default sort direction
}
```

#### Advanced Features

**Fixed Header Scroll Sync** (for wide tables):
```jsx
<SortableTable
  data={players}
  columns={manyColumns}  // 10+ columns
  enableScrollSync={true}
/>
```

Provides:
- Fixed header stays visible when scrolling down
- Top horizontal scrollbar for wide tables
- Synchronized scrolling across all elements

**Custom Sort Logic:**
```jsx
const customSort = (a, b, column, direction) => {
  if (column === 'battingRating') {
    const aVal = getPrimaryBattingRating(a);
    const bVal = getPrimaryBattingRating(b);
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  }
  // Default behavior for other columns
};

<SortableTable customSort={customSort} />
```

#### Examples in Codebase
- `src/components/menu/PlayerBrowser.jsx` - Player database table
- `src/components/team/Squad.jsx` - Squad overview table
- `src/components/layout/League.jsx` - League standings

#### Related Documentation
- Full API reference: `docs/components/SortableTable.md`

---

### PlayerCard

**Location:** `src/components/shared/PlayerCard.jsx`

Reusable player card component with three display variants.

#### Variants

**1. Compact** (`variant="compact"`):
- Minimal space, shows name + primary playstyle
- Used in: Squad lists, auction shortlists

**2. Auction** (`variant="auction"`):
- Shows top 3 playstyles + key stats
- Used in: Auction bid panels

**3. Full** (`variant="full"`, default):
- Complete player details with attributes
- Used in: Player detail modals

#### Usage

```jsx
import PlayerCard from '../shared/PlayerCard';

// Compact variant
<PlayerCard player={player} variant="compact" onClick={handleClick} />

// Auction variant with sold price
<PlayerCard player={player} variant="auction" soldPrice={5000000} />

// Full variant with attributes
<PlayerCard player={player} variant="full" showAttributes={true} />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `player` | `Object` | Required | Player object |
| `variant` | `'compact' \| 'auction' \| 'full'` | `'full'` | Display mode |
| `soldPrice` | `number` | `null` | Auction sold price |
| `showAttributes` | `boolean` | `false` | Show attribute bars |
| `showPlaystyles` | `boolean` | `true` | Show playstyle ratings |
| `onClick` | `Function` | `null` | Click handler |
| `onTeamClick` | `Function` | `null` | Team name click callback |

#### Important Notes
- **Always use full playstyle names** (not abbreviated badges)
- For compact variant, shows primary playstyle inline
- Wicket-keepers show fielding playstyle instead of bowling

---

### PlayerCardModal

**Location:** `src/components/shared/PlayerCardModal.jsx`

Modal wrapper for detailed player information with edit capability.

#### Features
- Full player details (attributes, playstyles, stats)
- "Edit Player" button (opens PlayerEditorModal)
- Season statistics display
- Customization indicators (sparkle icon for custom players)

#### Usage

```jsx
import PlayerCardModal from '../shared/PlayerCardModal';

<PlayerCardModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  playerId={selectedPlayerId}
/>
```

#### Display Rules
- Shows **full playstyle names** (not abbreviations)
- Top 3 playstyles per category with star (★) for primary
- Wicket-keepers show fielding playstyles instead of bowling
- Career stats automatically loaded from playerStore

---

### HomeNewsCarousel

**Location:** `src/components/news/HomeNewsCarousel.jsx`

Rotating news card that sits in the top-left col-span-2 slot of the Home dashboard. Reads from `inboxStore.messages` filtered to `type === 'league_news'`.

#### Layout / behaviour

- Fixed card height (`CARD_HEIGHT = 'h-[260px]'`); must be bumped in lockstep with the standings card's natural height
- Auto-rotates every 10s, pauses while the cursor hovers the card AND while the article modal is open
- Sort: `effective = importance + (isUserTeam ? 25 : 0)` desc, then date desc. Top 8 articles
- Prev/next chevrons sit inside the bottom pagination pill (no floating overlay buttons)
- Hero team badge floats into the body content (newspaper-style wrap); falls back to no badge when no team id is in the payload
- Click opens `NewsArticleModal`

See `docs/core-systems/news-system.md` for the news pipeline.

### NewsArticleModal

**Location:** `src/components/news/NewsArticleModal.jsx`

Full-screen broadsheet-style modal that opens when a news card is clicked. Cream paper background, double-rule masthead, drop-cap on the first paragraph, em-dash pull-quote citations, tag pills at the foot.

#### Inline entity rendering

The modal body parses `[[PLAYER:id|name]]` and `[[TEAM:id|name]]` sentinel tokens (see `src/core/news/entityHelpers.js`) into `<PlayerName>` / `<TeamName>` components — both with `inline` set. Templates that want clickable players inside prose emit these via `.linked` keys on payload objects (see news-system.md).

Pull-quote paragraphs (prefixed with `> ` by the `postMatchQuotes` block) render as `<blockquote>` with the attribution split off as a right-aligned `<footer>` below the quote text.

---

## Playstyle Display System

### Abbreviation Mapping

**All 25 playstyles have standardized abbreviations:**

#### Batting Playstyles (16)

| Full Name | Abbreviation | Color |
|-----------|--------------|-------|
| Opener - Slogger | O-SLG | Blue |
| Opener - Balanced | O-BAL | Blue |
| Opener - Anchor | O-ANC | Blue |
| Top Order - Slogger | T-SLG | Green |
| Top Order - Balanced | T-BAL | Green |
| Top Order - Anchor | T-ANC | Green |
| Middle Order - Slogger | M-SLG | Yellow |
| Middle Order - Balanced | M-BAL | Yellow |
| Middle Order - Anchor | M-ANC | Yellow |
| Lower Order - Slogger | L-SLG | Orange |
| Lower Order - Balanced | L-BAL | Orange |
| Lower Order - Anchor | L-ANC | Orange |
| Finisher | S-FIN | Pink |
| Runner | S-RUN | Pink |
| Pinch-Hitter | S-PNH | Pink |
| Wall | S-WAL | Pink |

#### Bowling Playstyles (8)

| Full Name | Abbreviation | Color |
|-----------|--------------|-------|
| Swing Bowler | P-SWG | Red |
| Hit-the-Deck Seamer | P-HTD | Red |
| Short-Ball Specialist | P-SBS | Red |
| Death Specialist | P-DTH | Red |
| Classical Spinner | S-CLS | Purple |
| Flat Spinner | S-FLT | Purple |
| Mystery Spinner | S-MYS | Purple |
| Containment Spinner | S-CTN | Purple |

#### Fielding Playstyle (1)

| Full Name | Abbreviation | Color |
|-----------|--------------|-------|
| Wicketkeeper | WKP | Cyan |

### Display Rules by Player Role

**Batsmen:**
- Primary: Batting playstyle (⭐)
- Secondary: Bowling playstyle

**Bowlers:**
- Primary: Bowling playstyle (⭐)
- Secondary: Batting playstyle (⭐)

**All-Rounders:**
- Primary: Batting playstyle (⭐)
- Secondary: Bowling playstyle (⭐)

**Wicket-Keepers:**
- Primary: Batting playstyle (⭐)
- Secondary: Fielding playstyle (⭐)
- **Important:** Show fielding instead of bowling

### Playstyle Data Sources

**UI Components (Always Fresh):**
```jsx
import { computePlayerRatings } from '../../utils/ratingHelper';

const computed = computePlayerRatings(player);
const topPlaystyles = computed.topPlaystyles;
const primaryPlaystyle = computed.primaryPlaystyle;
```

**Match Engine (Performance):**
```jsx
// Uses pre-computed stored values
const rating = player.playstyleRatings.batting['Opener - Slogger'];
const primary = player.primaryPlaystyle.batting;
```

**Why the difference:**
- UI: Dynamic computation ensures fresh values after edits
- Match Engine: Pre-computed values for 50k+ balls/second performance

### Related Files
- `src/utils/playstyleAbbreviations.js` - Abbreviation mappings
- `src/utils/ratingHelper.js` - Dynamic playstyle computation
- `docs/frontend/playstyle-display-rules.md` - Detailed rules (legacy reference)

---

## Entity Components (Clickable)

### PlayerName

**Location:** `src/components/shared/PlayerName.jsx`

**CRITICAL RULE:** Never hardcode `player.name` - always use `<PlayerName>`.

#### Usage

```jsx
import PlayerName from '../shared/PlayerName';

// Basic usage (opens player modal on click)
<PlayerName playerId={player.id} />

// With custom player object (avoids store lookup)
<PlayerName playerId={player.id} player={player} />

// With additional classes
<PlayerName playerId={player.id} className="font-bold text-lg" />

// Inline variant (no wrapper div)
<PlayerName playerId={player.id} inline />
```

#### Features
- Clickable by default → opens PlayerCardModal
- Automatically fetches player from store if not provided
- Handles missing players gracefully
- Default colour is `text-cricket-accent` (gold) — do NOT override unless you have a reason; the dashboard treats gold as "this is a player link" universally
- `inline` defaults to **`true`** → renders as `<span>` by default

---

### TeamName

**Location:** `src/components/shared/TeamName.jsx`

**CRITICAL RULE:** Never hardcode `team.name` - always use `<TeamName>`.

#### Usage

```jsx
import TeamName from '../shared/TeamName';

// Basic usage (opens team modal on click)
<TeamName teamId={team.id} />

// Short variant (abbreviation)
<TeamName teamId={team.id} variant="short" />

// With custom team object
<TeamName teamId={team.id} team={team} />

// Inline variant — REQUIRED inside flowing prose
<TeamName teamId={team.id} inline />

// With click callback (e.g., to close parent modal)
<TeamName teamId={team.id} onBeforeOpen={closeParentModal} />
```

#### Variants
- `full` (default): Full team name
- `short`: Abbreviated name

#### ⚠️ Inline-default asymmetry (footgun)

`<TeamName>` defaults to **`inline={false}`**, while `<PlayerName>` defaults to **`inline={true}`**. That means:

- A bare `<TeamName teamId={...} />` renders as a `<div>` (block-level) and **forces a line break** before and after.
- A bare `<PlayerName playerId={...} />` renders as a `<span>` and flows inline.

This caused a real bug in `NewsArticleModal` where pull-quote attributions read as:

```
"...Onto the next one." — Romario Shepherd,
Colombo Crocodiles
captain.
```

instead of inline on one line. The fix was to pass `inline` to every `TeamName` inside body prose.

**Always pass `inline` to `<TeamName>` when rendering inside paragraph text or any flex/inline container.** PlayerName doesn't need it (default is correct). The asymmetry is historical and may be unified in a future refactor; until then, treat `inline` as effectively required on `<TeamName>`.

---

## Data Tables

### Standard Table Pattern

**Football Manager-inspired data-dense tables:**

```jsx
<table className="w-full border-collapse">
  <thead>
    <tr className="border-b-2 border-border-primary">
      <th className="text-left text-text-secondary text-sm font-semibold uppercase tracking-wider px-3 py-2">
        Column Header
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-border-primary hover:bg-bg-hover transition-colors">
      <td className="px-3 py-2 text-text-primary font-mono">
        Data Cell
      </td>
    </tr>
  </tbody>
</table>
```

### Table Best Practices

1. **Use monospace font** for numeric columns
2. **Right-align numbers** for easy scanning
3. **Left-align text** for readability
4. **Hover states** instead of zebra striping
5. **Highlight user's team** with subtle background
6. **Use SortableTable** for sortable data

---

## UI Quirks & Special Rules

### 1. Clickable Entities Pattern

**Rule:** All player/team names must be clickable components.

```jsx
// ❌ WRONG
<span>{player.name}</span>
<span>{team.name}</span>

// ✅ CORRECT
<PlayerName playerId={player.id} />
<TeamName teamId={team.id} />
```

**Why:** Ensures consistent behavior (opens detail modals) following Football Manager pattern.

---

### 2. Playstyle Abbreviations vs Full Names

**Use abbreviations (PlaystyleBadge):**
- Tables (PlayerBrowser, Squad)
- Tactics page → Overview tab
- Match display headers
- Space-constrained contexts

**Use full names:**
- Modals (PlayerCard, PlayerCardModal)
- Dropdown selectors
- Detailed views

**Why:** Abbreviations save space; full names provide clarity where space allows.

---

### 3. Wicket-Keeper Playstyle Special Case

**Always check player role before showing secondary playstyle:**

```jsx
{player.role === 'wicket-keeper' ? (
  <PlaystyleBadge playstyle={player.primaryPlaystyle.fielding} />
) : (
  <PlaystyleBadge playstyle={player.primaryPlaystyle.bowling} />
)}
```

**Why:** Wicket-keepers use fielding playstyle as secondary, not bowling.

---

### 4. Dynamic Playstyle Computation

**UI components must use `computePlayerRatings()`:**

```jsx
import { computePlayerRatings } from '../../utils/ratingHelper';

// ❌ WRONG - Stale values
const playstyles = player.topPlaystyles;

// ✅ CORRECT - Fresh values
const computed = computePlayerRatings(player);
const playstyles = computed.topPlaystyles;
```

**Why:** Player edits don't immediately update stored playstyle values. `computePlayerRatings()` recalculates on-the-fly with a WeakMap cache.

**Exception:** Match engine uses stored values for performance (50k+ balls/second).

---

### 5. Compact Spacing Philosophy

**Default to minimal spacing:**

```jsx
// ✅ CORRECT - Compact spacing
<div className="space-y-2 gap-2 p-2">

// ❌ WRONG - Excessive spacing
<div className="space-y-6 gap-4 p-6">
```

**Standard values:**
- `space-y-2` (8px vertical)
- `gap-2` (8px grid/flex)
- `p-2` (8px padding)

**When to break:** Forms, touch targets, readability concerns.

---

### 6. Hidden Scrollbars (Global)

**All scrollbars are visually hidden but functionally present:**

```css
/* Applied globally in index.css */
* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
*::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

**Why:** Cleaner visual appearance while maintaining scroll functionality.

---

### 7. Center-Aligned Stats

**All stat boxes must use `text-center`:**

```jsx
// ✅ CORRECT
<div className="card p-2 text-center">
  <div className="text-2xl font-bold">24</div>
  <div className="text-text-secondary text-xs">Players</div>
</div>

// ❌ WRONG - Left-aligned
<div className="card p-2">
  <div className="text-2xl font-bold">24</div>
</div>
```

**Why:** Visual balance and consistent aesthetic.

---

### 8. Tab Navigation Pattern

**Use consistent tab pattern across all pages:**

```jsx
<div className="border-b border-border-primary">
  <nav className="flex gap-2">
    <button
      className={`px-4 py-2 border-b-2 font-medium text-sm ${
        activeTab === 'overview'
          ? 'border-cricket-accent text-cricket-accent'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
      onClick={() => setActiveTab('overview')}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span>Overview</span>
      </div>
    </button>
  </nav>
</div>
```

**Examples:** League.jsx, Squad.jsx, TacticsPage.jsx, Transfers.jsx

---

## Integration Patterns

### Store Integration

**See full guide:** `docs/frontend/integration-patterns.md`

**Quick reference:**

```jsx
// ✅ Selective subscription (recommended)
const score = useMatchStore(state => state.teams.batting.totalScore);

// ❌ Whole store subscription (causes unnecessary re-renders)
const matchStore = useMatchStore();
```

**Multiple stores:**
```jsx
const strikerId = useMatchStore(state => state.innings.striker);
const striker = usePlayerStore(state => state.players[strikerId]);
const userTeam = useTeamStore(state => state.getUserTeam());
```

---

## Related Documentation

- **Design System:** `docs/frontend/design-system.md` - Complete design tokens, colors, typography
- **Integration Patterns:** `docs/frontend/integration-patterns.md` - Store integration, match engine integration
- **SortableTable API:** `docs/components/SortableTable.md` - Full component reference
- **Playstyle Display Rules:** `docs/frontend/playstyle-display-rules.md` - Legacy detailed rules (superseded by this doc)

---

## Changelog

### May 2026
- **News components added** — HomeNewsCarousel (Home dashboard rotating news) + NewsArticleModal (broadsheet-style full read)
- **PlayerName / TeamName inline-default asymmetry documented** — TeamName defaults to block-level, PlayerName to inline. Always pass `inline` to TeamName in flowing prose.
- **Yellow discipline clarified** — `cricket-accent` (gold) is reserved for user-team data, news rails, and the default `<PlayerName>` colour. Don't apply it to generic chrome.
- **Eyebrow style unified** — dashboard cards use a single eyebrow class (`text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary`)

### February 2026
- **Added PlaystyleBadge component** - Abbreviation system with tooltips and prefix-based colors
- Documented playstyle abbreviation system (25 playstyles)
- Added clickable entity components (PlayerName, TeamName)
- Consolidated UI quirks and special rules

### January 2026
- Initial UI components reference
- SortableTable component documentation
- Compact spacing philosophy

---

## Before Making UI Changes

**MANDATORY CHECKLIST:**

1. ✅ Read this document for reusable components
2. ✅ Check if a component already exists before creating new one
3. ✅ Use `<PlayerName>` and `<TeamName>` - never hardcode names
4. ✅ Use `PlaystyleBadge` for space-constrained playstyle displays
5. ✅ Use `SortableTable` for sortable data tables
6. ✅ Follow compact spacing philosophy (`space-y-2`, `gap-2`, `p-2`)
7. ✅ Use `computePlayerRatings()` for fresh playstyle data in UI
8. ✅ Update this document if creating new reusable components

---

**END OF DOCUMENT**
