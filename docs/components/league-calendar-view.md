# League Fixtures Calendar View

## Overview

Calendar grid view for league fixtures, showing matches on their scheduled dates. Toggle between list and calendar views.

**Location**: `src/components/layout/League.jsx` (Fixtures tab)

## Purpose

Replace linear match week list with calendar grid showing fixtures on their scheduled dates. Provides better temporal context for upcoming matches.

## Features

**View toggle**:
- List view: Original match week grouping
- Calendar view: Monthly calendar grid with fixtures

**Calendar grid**:
- Days of week as columns (Sun-Sat)
- Month headers separate calendar grids
- Days with fixtures highlighted
- Empty days shown as greyed squares
- Match abbreviations (3-letter codes) in day cells

**Layout**:
```
┌──────────────────────────────────────────────┐
│ Fixtures            [List] [Calendar]        │
├──────────────────────────────────────────────┤
│                                              │
│  February 2025                               │
│  ┌────────────────────────────────────────┐  │
│  │ Sun  Mon  Tue  Wed  Thu  Fri  Sat     │  │
│  ├────────────────────────────────────────┤  │
│  │      3    4    5    6    7    8       │  │
│  │  10  11   12   13   14   15   16      │  │
│  │      MUM      LON                      │  │ ← Fixture on 15th
│  │      vs       vs                       │  │
│  │      DEL      KAR                      │  │
│  │  17  18   19   20   21   22   23      │  │
│  │  24  25   26   27   28                │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  March 2025                                  │
│  ┌────────────────────────────────────────┐  │
│  │ Sun  Mon  Tue  Wed  Thu  Fri  Sat     │  │
│  ...                                         │
└──────────────────────────────────────────────┘
```

## Implementation

### State

```javascript
const [fixturesView, setFixturesView] = useState('list');
```

### Calendar Generation

**Group fixtures by month**:
```javascript
const fixturesByMonth = useMemo(() => {
  const grouped = {};

  fixtures.forEach(fixture => {
    const date = new Date(fixture.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        fixtures: {}
      };
    }

    const dateKey = date.toISOString().split('T')[0];
    if (!grouped[monthKey].fixtures[dateKey]) {
      grouped[monthKey].fixtures[dateKey] = [];
    }
    grouped[monthKey].fixtures[dateKey].push(fixture);
  });

  return grouped;
}, [fixtures]);
```

**Generate calendar grid**:
```javascript
const generateCalendarGrid = (year, month, monthFixtures) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const grid = [];
  let week = [];

  // Fill leading empty days
  for (let i = 0; i < startingDayOfWeek; i++) {
    week.push(null);
  }

  // Fill month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().split('T')[0];
    const dayFixtures = monthFixtures[dateKey] || [];

    week.push({
      day,
      date: dateKey,
      fixtures: dayFixtures,
      isToday: false
    });

    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }

  // Fill trailing empty days
  while (week.length > 0 && week.length < 7) {
    week.push(null);
  }
  if (week.length > 0) {
    grid.push(week);
  }

  return grid;
};
```

### Rendering

**View toggle buttons**:
```javascript
<div className="flex gap-2">
  <button
    onClick={() => setFixturesView('list')}
    className={fixturesView === 'list' ? 'btn-primary' : 'btn-secondary'}
  >
    <List className="w-4 h-4" />
    List
  </button>
  <button
    onClick={() => setFixturesView('calendar')}
    className={fixturesView === 'calendar' ? 'btn-primary' : 'btn-secondary'}
  >
    <CalendarDays className="w-4 h-4" />
    Calendar
  </button>
</div>
```

**Calendar grid**:
```javascript
{fixturesView === 'calendar' && (
  <div className="space-y-6">
    {Object.entries(fixturesByMonth).map(([monthKey, monthData]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const grid = generateCalendarGrid(year, month - 1, monthData.fixtures);

      return (
        <div key={monthKey}>
          <h3 className="text-lg font-semibold mb-2">{monthData.monthName}</h3>

          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold p-2">
                {day}
              </div>
            ))}

            {/* Calendar grid */}
            {grid.flat().map((cell, index) => (
              <div key={index} className="aspect-square">
                {cell ? (
                  <div className={`
                    h-full p-1 border rounded
                    ${cell.fixtures.length > 0
                      ? 'border-cricket-accent bg-cricket-accent/10'
                      : 'border-border-primary bg-bg-tertiary'}
                  `}>
                    <div className="text-xs font-semibold">{cell.day}</div>
                    {cell.fixtures.map(fixture => (
                      <div key={fixture.id} className="text-xs truncate">
                        {getTeamAbbreviation(fixture.homeTeam)} vs {getTeamAbbreviation(fixture.awayTeam)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full border border-border-primary bg-bg-secondary rounded" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
)}
```

## Team Abbreviations

**Helper function**:
```javascript
const getTeamAbbreviation = (teamId) => {
  const team = clubs[teamId];
  return team?.abbreviation || teamId.substring(0, 3).toUpperCase();
};
```

**Examples**:
- Mumbai Thunders → MUM
- London Lions → LON
- Cape Town Crusaders → CPT
- Karachi Kings → KAR

## Styling

**Calendar cell states**:
- Empty day: `bg-bg-secondary border-border-primary`
- No fixture: `bg-bg-tertiary border-border-primary`
- With fixture: `bg-cricket-accent/10 border-cricket-accent`

**Grid**:
- 7 columns (days of week)
- Fixed aspect ratio (square cells)
- Gap: 1 (4px)

**Typography**:
- Day number: `text-xs font-semibold`
- Match abbreviations: `text-xs truncate`

## Future Enhancements

1. **Today indicator** - Highlight current date
2. **Click to view** - Open match details modal
3. **Multi-match days** - Stack/scroll multiple fixtures
4. **Played/upcoming indicators** - Different colors for past/future
5. **User team highlight** - Accent color for user matches
6. **Week numbers** - Show week numbers on left
7. **Month navigation** - Jump to specific month
8. **Export calendar** - Download as ICS file

## Gotchas

1. **Requires fixture.date** - Fixtures must have ISO date strings
2. **Week starts Sunday** - JavaScript Date convention (not Monday)
3. **No timezone handling** - Uses local timezone
4. **Truncation** - Long team names truncated (no tooltip)
5. **Mobile scrolling** - Horizontal scroll on small screens
6. **Month sorting** - Depends on fixture.date ISO format (YYYY-MM-DD)
