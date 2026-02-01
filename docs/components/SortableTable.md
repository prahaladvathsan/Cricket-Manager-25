# SortableTable Component

**Location:** `src/components/shared/SortableTable.jsx`

## Overview

A reusable, flexible sortable table component extracted from common patterns in `Squad.jsx` and `PlayerBrowser.jsx`. Provides sorting, custom rendering, filtering integration, and Football Manager-style data-dense UI.

## Features

- ✅ Column-based sorting with visual indicators
- ✅ Customizable cell rendering
- ✅ Sticky columns support
- ✅ Striped and hoverable rows
- ✅ Filter component integration
- ✅ Empty state customization
- ✅ Nested object value sorting
- ✅ Custom sort logic support
- ✅ Row click handlers
- ✅ Responsive and scrollable

## Basic Usage

```jsx
import SortableTable from '../shared/SortableTable';

const MyComponent = () => {
  const data = [
    { id: 1, name: 'John', age: 25, team: 'Mumbai' },
    { id: 2, name: 'Jane', age: 30, team: 'London' },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Player Name',
      sortKey: 'name',
      render: (player) => <PlayerName playerId={player.id} />,
      sticky: true
    },
    {
      key: 'age',
      label: 'Age',
      sortKey: 'age',
      align: 'center',
      render: (player) => player.age,
    },
    {
      key: 'team',
      label: 'Team',
      sortKey: 'team',
      render: (player) => <TeamName teamId={player.team} />,
    },
  ];

  return (
    <SortableTable
      data={data}
      columns={columns}
      defaultSort={{ column: 'name', direction: 'asc' }}
    />
  );
};
```

## Props API

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `Array<Object>` | Array of data items to display in table |
| `columns` | `Array<ColumnDef>` | Column definitions (see Column Definition below) |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultSort` | `Object` | `{ column: '', direction: 'asc' }` | Initial sort configuration |
| `customSort` | `Function` | `null` | Custom sort function `(a, b, column, direction) => number` |
| `filterComponent` | `ReactNode` | `null` | Filter UI to display above table |
| `emptyState` | `ReactNode` | Default message | Custom empty state when no data |
| `tableClassName` | `string` | `''` | Additional classes for `<table>` element |
| `containerClassName` | `string` | `''` | Additional classes for table container div |
| `stripedRows` | `boolean` | `true` | Whether to alternate row background colors |
| `hoverRows` | `boolean` | `true` | Whether to highlight rows on hover |
| `onRowClick` | `Function` | `null` | Row click handler `(item, index) => void` |
| `getRowClassName` | `Function` | `null` | Custom row class generator `(item, index) => string` |
| `enableScrollSync` | `boolean` | `false` | Enable fixed header and dual scrollbar sync for wide tables |
| `maxHeight` | `number` | `null` | Optional max height for the table container with vertical scroll |

## Column Definition

Each column object in the `columns` array can have the following properties:

```typescript
{
  key: string;                     // Required: Unique identifier
  label: string | ReactNode;       // Required: Header label
  sortKey: string;                 // Required: Key for sorting (supports dot notation)

  // Optional properties
  sortable?: boolean;              // Default: true
  render: (item, index) => ReactNode;  // Required: Cell content renderer
  headerClassName?: string;        // Additional header cell classes
  cellClassName?: string | Function;  // Cell classes (string or function)
  align?: 'left' | 'center' | 'right';  // Default: 'left'
  width?: string;                  // Min width (e.g., '200px')
  sticky?: boolean;                // Sticky column (default: false)
  defaultDirection?: 'asc' | 'desc';  // Default sort direction for this column
}
```

### Column Definition Examples

```jsx
// Simple text column
{
  key: 'name',
  label: 'Player Name',
  sortKey: 'name',
  render: (player) => player.name,
}

// Center-aligned numeric column
{
  key: 'age',
  label: 'Age',
  sortKey: 'age',
  align: 'center',
  render: (player) => <span className="font-mono">{player.age}</span>,
}

// Sticky first column with custom component
{
  key: 'player',
  label: 'Player',
  sortKey: 'name',
  sticky: true,
  width: '200px',
  render: (player) => <PlayerName playerId={player.id} />,
}

// Nested object sorting
{
  key: 'teamName',
  label: 'Team',
  sortKey: 'team.name',  // Sorts by nested value
  render: (player) => player.team.name,
}

// Conditional cell styling
{
  key: 'status',
  label: 'Status',
  sortKey: 'status',
  cellClassName: (player) => player.status === 'injured' ? 'text-status-loss' : 'text-status-win',
  render: (player) => player.status,
}

// Non-sortable column
{
  key: 'actions',
  label: 'Actions',
  sortKey: 'id',
  sortable: false,
  align: 'center',
  render: (player) => (
    <button onClick={() => handleAction(player)}>
      Action
    </button>
  ),
}
```

## Advanced Usage

### With Filtering

```jsx
const FilterComponent = () => {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Search..."
        className="flex-1 px-3 py-1.5 rounded border"
      />
      <select className="px-3 py-1.5 rounded border">
        <option value="all">All Roles</option>
        <option value="batsman">Batsman</option>
        <option value="bowler">Bowler</option>
      </select>
    </div>
  );
};

<SortableTable
  data={filteredData}
  columns={columns}
  filterComponent={<FilterComponent />}
/>
```

### With Custom Sort Logic

```jsx
const customSort = (a, b, column, direction) => {
  // Custom sorting for specific columns
  if (column === 'batting') {
    const aRating = getPrimaryBattingRating(a);
    const bRating = getPrimaryBattingRating(b);
    return direction === 'asc' ? aRating - bRating : bRating - aRating;
  }

  // Default sorting for other columns
  const aVal = a[column];
  const bVal = b[column];
  return direction === 'asc' ? aVal - bVal : bVal - aVal;
};

<SortableTable
  data={data}
  columns={columns}
  customSort={customSort}
/>
```

### With Row Click Handler

```jsx
const handleRowClick = (player, index) => {
  console.log('Clicked player:', player);
  setSelectedPlayer(player);
  setShowModal(true);
};

<SortableTable
  data={players}
  columns={columns}
  onRowClick={handleRowClick}
/>
```

### With Custom Empty State

```jsx
const emptyState = (
  <tr>
    <td colSpan={columns.length} className="px-3 py-12 text-center">
      <Users className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        No Players Found
      </h3>
      <p className="text-text-secondary mb-4 text-sm">
        Try adjusting your search filters
      </p>
      <button className="btn-primary">Reset Filters</button>
    </td>
  </tr>
);

<SortableTable
  data={players}
  columns={columns}
  emptyState={emptyState}
/>
```

### With Custom Row Styling

```jsx
const getRowClassName = (player, index) => {
  if (player.condition?.injury) {
    return 'bg-status-loss/10 border-status-loss';
  }
  return '';
};

<SortableTable
  data={players}
  columns={columns}
  getRowClassName={getRowClassName}
/>
```

### With Fixed Header Scroll Sync

For wide tables with many columns (like PlayerBrowser), enable the scroll sync feature for a better UX:

```jsx
<SortableTable
  data={players}
  columns={columns}
  enableScrollSync={true}
/>
```

This provides:
- **Fixed header**: Header stays visible when scrolling down the page
- **Top scrollbar**: Horizontal scrollbar at the top for wide tables
- **Synchronized scrolling**: Top scrollbar, fixed header, and table body scroll together

This is especially useful for data-dense tables with 10+ columns.

## Migration from Existing Code

### From Squad.jsx Pattern

**Before:**
```jsx
// State management
const [sortBy, setSortBy] = useState('name');
const [sortDirection, setSortDirection] = useState('asc');

// Sort handler
const handleSort = (column) => {
  if (sortBy === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setSortBy(column);
    setSortDirection('asc');
  }
};

// Manual table markup
<table>
  <thead>
    <tr>
      <th onClick={() => handleSort('name')}>
        Player {sortBy === 'name' && <SortIcon />}
      </th>
    </tr>
  </thead>
  <tbody>
    {sortedPlayers.map(player => (
      <tr key={player.id}>
        <td>{player.name}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**After:**
```jsx
const columns = [
  {
    key: 'name',
    label: 'Player',
    sortKey: 'name',
    render: (player) => <PlayerName playerId={player.id} />,
  },
];

<SortableTable
  data={players}
  columns={columns}
  defaultSort={{ column: 'name', direction: 'asc' }}
/>
```

## Styling

The component uses the project's standard Tailwind classes:

- `bg-bg-primary`, `bg-bg-secondary`, `bg-bg-tertiary` - Background colors
- `text-text-primary`, `text-text-secondary` - Text colors
- `border-border-primary` - Border colors
- `hover:bg-bg-tertiary` - Hover states

All colors follow the Cricket Manager design system defined in `tailwind.config.js`.

## Performance Considerations

1. **Memoized Sorting:** The `sortedData` is memoized using `useMemo` to prevent unnecessary re-sorts
2. **Key Props:** Always ensure data items have unique `id` properties for optimal React rendering
3. **Render Functions:** Keep `render` functions lightweight; extract heavy computations to memos
4. **Large Datasets:** For tables with >1000 rows, consider implementing virtualization

## Accessibility

- Sortable column headers are keyboard accessible (click with Enter/Space)
- Row click handlers work with keyboard navigation
- Table headers have semantic markup

## Future Enhancements

Potential additions (not yet implemented):

- [ ] Column resizing
- [ ] Column reordering (drag & drop)
- [ ] Multi-column sorting
- [ ] Virtual scrolling for large datasets
- [ ] Export to CSV functionality
- [ ] Column visibility toggle
- [ ] Saved table state (localStorage)

## Related Components

- **PlayerName** (`src/components/shared/PlayerName.jsx`) - Clickable player name component
- **TeamName** (`src/components/shared/TeamName.jsx`) - Clickable team name component

## Examples in Codebase

This component can replace table logic in:

- `src/components/team/Squad.jsx` (Squad Overview tab, Condition tab)
- `src/components/menu/PlayerBrowser.jsx` (Main player database table)
- `src/components/Transfers/Transfers.jsx` (Transfer listings table)
- `src/components/league/League.jsx` (League standings table)

## Changelog

### v1.0.0 (2026-01-30)
- Initial extraction from Squad.jsx and PlayerBrowser.jsx
- Support for sorting, filtering, sticky columns
- Customizable rendering and styling
