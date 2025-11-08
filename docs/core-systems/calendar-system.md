# Calendar & Event System

## Overview

Day-by-day game progression using integer counter (`gameDay`) and scheduled event detection.

**Location**: `src/stores/gameStore.js`

## Architecture

### Day Counter System

```javascript
gameDay: 1                    // Integer counter (starts at 1)
currentDate: "2025-01-15"     // ISO date string (for display)
currentWeek: 1                // Auto-increments on Sunday→Monday
```

**Day advancement**:
- User clicks Continue button in Header
- `advanceDay()` increments gameDay, updates date
- Returns event info for the new day

### Calendar Events

```javascript
calendarEvents: [
  { day: 10, type: 'auction', data: {} },
  { day: 15, type: 'match', data: { matchId: 'fixture_001', homeTeam: 'MUM', awayTeam: 'LON' } },
  { day: 17, type: 'match', data: { matchId: 'fixture_002', ... } }
]
```

**Event detection**:
- On day advance, gameStore checks if any event.day === newGameDay
- Returns event type and data to caller
- Caller (Header) handles navigation

## Event Flow

### 1. Event Scheduling (Initialization)

```javascript
// Home.jsx - after auction completes
const scheduleFixtures = () => {
  const fixtures = leagueStore.fixtures;

  const events = fixtures.map((fixture, index) => ({
    day: gameDay + 3 + index,  // Start 3 days after auction
    type: 'match',
    data: {
      matchId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      venue: fixture.venue
    }
  }));

  scheduleEvents(events);
};
```

### 2. Day Advancement (Header Continue Button)

```javascript
// Header.jsx:89-120
const handleContinue = () => {
  const { type, data, gameDay, isWeekend } = advanceDay();

  // Check for scheduled events
  if (type === 'match') {
    // Find user team
    const userTeam = getUserTeam();
    const isUserMatch = data.homeTeam === userTeam.id || data.awayTeam === userTeam.id;

    if (isUserMatch) {
      navigate(`/game/match/${data.matchId}`);
    } else {
      // Quick-simulate AI vs AI
      quickSimMatch(...);
      // Loop back to handleContinue for next day
    }
  } else if (type === 'auction') {
    navigate('/game/auction');
  } else if (isWeekend) {
    // Rest day (no action required)
  }
};
```

### 3. Event Detection Logic

```javascript
// gameStore.js:49-78
advanceDay: () => {
  const newGameDay = state.gameDay + 1;
  const newDate = new Date(state.currentDate);
  newDate.setDate(newDate.getDate() + 1);

  // Weekend detection
  const dayOfWeek = newDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Find scheduled event
  const dayEvent = state.calendarEvents.find(event => event.day === newGameDay);

  // Week boundary detection
  const oldDayOfWeek = new Date(state.currentDate).getDay();
  const shouldAdvanceWeek = oldDayOfWeek === 0 && dayOfWeek === 1;

  set({
    gameDay: newGameDay,
    currentDate: newDate.toISOString(),
    currentWeek: shouldAdvanceWeek ? state.currentWeek + 1 : state.currentWeek
  });

  return {
    type: dayEvent ? dayEvent.type : (isWeekend ? 'rest' : null),
    data: dayEvent ? dayEvent.data : null,
    isWeekend,
    gameDay: newGameDay,
    date: newDate
  };
}
```

## Event Types

| Type | Description | Data Fields | Handler Location |
|------|-------------|-------------|------------------|
| `match` | Fixture scheduled | `{ matchId, homeTeam, awayTeam, venue }` | Header.jsx:89 |
| `auction` | Player auction | `{}` | Header.jsx:89 |
| `rest` | Weekend (no event) | `null` | Implicit (isWeekend) |
| Custom | Extensible | User-defined | User-defined |

## Integration Points

### Messaging System

```javascript
// Header.jsx - Generate match reminder on day before user match
useEffect(() => {
  const tomorrowsEvent = calendarEvents.find(e => e.day === gameDay + 1);

  if (tomorrowsEvent?.type === 'match') {
    const isUserMatch = /* check teams */;

    if (isUserMatch) {
      const message = MessageGenerator.generateMatchReminderMessage(
        tomorrowsEvent.data,
        homeTeam,
        awayTeam,
        isUserHome
      );
      addMessage(message);
    }
  }
}, [gameDay]);
```

### League Fixtures Calendar View

```javascript
// League.jsx - Display fixtures on calendar grid
const getFixturesForDay = (dayNumber) => {
  const event = calendarEvents.find(e => e.day === dayNumber && e.type === 'match');
  return event ? event.data : null;
};

// Render calendar grid with match abbreviations on fixture days
```

## Gotchas

1. **Day numbering starts at 1** - Not zero-indexed
2. **Weekend detection uses JavaScript Date.getDay()** - Sunday=0, Saturday=6
3. **Events are not consumed** - They remain in array (for reference/debugging)
4. **No duplicate day detection** - Caller must ensure unique days when scheduling
5. **Week increment is automatic** - Don't manually call advanceWeek() unless needed
6. **Event data is flexible** - No schema validation, caller responsible for structure

## Testing

```javascript
// Check event scheduling
console.log(gameStore.calendarEvents);

// Advance days manually
for (let i = 0; i < 5; i++) {
  const result = advanceDay();
  console.log(`Day ${result.gameDay}: ${result.type || 'rest'}`);
}
```

## SaveGameManager Integration

**Persisted fields**:
- `gameDay` (integer)
- `calendarEvents` (full array)
- `currentDate` (ISO string)
- `currentWeek` (integer)

**Load/save location**: `src/utils/SaveGameManager.js:119-131, 260-262`
