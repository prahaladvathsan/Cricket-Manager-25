# Messaging System

## Overview

In-game inbox for notifications, tutorials, and event summaries. Messages appear in Inbox page with unread badge in sidebar.

**Components**:
- `src/stores/inboxStore.js` - State management
- `src/utils/MessageGenerator.js` - Message templates
- `src/components/inbox/` - UI components

## Architecture

### Message Structure

```javascript
{
  id: "msg_1705478400000_xyz123",
  type: "welcome",                       // Message category
  subject: "Welcome to Mumbai Thunders!",
  body: "Dear Manager...",               // Can include markdown
  sender: "Board of Directors",
  date: "2025-01-17T12:00:00.000Z",
  read: false,
  metadata: {                            // Type-specific data
    team: "MUM",
    season: 1,
    link: "/game/squad"
  }
}
```

### Message Types

| Type | Generator Method | Trigger Location | Purpose |
|------|------------------|------------------|---------|
| `welcome` | `generateWelcomeMessage()` | Transfers.jsx:post-auction | Welcome new manager |
| `expectations` | `generateExpectationsMessage()` | Transfers.jsx:post-auction | Season objectives |
| `tutorial` | `generateTutorialMessage()` | Transfers.jsx:post-auction | Game manual primer |
| `auction_summary` | `generateAuctionSummaryMessage()` | Transfers.jsx:post-auction | Auction results |
| `match_reminder` | `generateMatchReminderMessage()` | Header.jsx:day-before-match | Pre-match checklist |
| `match_result` | `generateMatchResultMessage()` | (Future) | Post-match summary |
| `league_news` | `core/news/subscribers/inboxSubscriber` | News Dispatcher (all event types) | League-wide news feed — match reports, transfers, injuries, etc. |

### News Dispatcher integration

The `league_news` message type is special — it isn't authored by `MessageGenerator`. It's written by the News Dispatcher's `inboxSubscriber`, which sits in front of `inboxStore.addMessage()` and bridges the pub/sub news pipeline (`src/core/news/`) into the inbox.

Each `league_news` message carries a richer `metadata` shape than the legacy types:

```js
{
  type: 'league_news',
  subject, body, sender,
  date, read: false,
  metadata: {
    newsEventType,      // e.g. 'match.result'
    newsCategory,       // template's inboxType
    headline, subhead,  // typography-aware fields used by the article modal
    bodyParagraphs,     // structured array, may contain [[PLAYER:id|name]] sentinels
    tags,               // for filtering + colour rail
    season, gameDay,
    importance,         // 0-100, used by the Home carousel sort
    isUserTeam,         // boost flag for the carousel sort
    reporterId,         // selected from the persona pool (Bhogle, Kimber, etc.)
    reporterTagline,    // one-line bio shown under the byline
    payload             // raw event.payload for downstream consumers
  }
}
```

This is why the Home dashboard's news carousel filters on `type === 'league_news'` and reads `metadata.headline` / `metadata.bodyParagraphs` rather than the flat `subject` / `body` fields.

**Full news pipeline reference**: `docs/core-systems/news-system.md`.

Two paths coexist:

1. **Legacy generators** (`MessageGenerator.generateInjuryMessage`, `generateRecoveryMessage`, etc.) — still fire for personal-team UX so the user's own players get inbox notifications routed under existing categories (`injury`, `transfer`).
2. **News Dispatcher** — fires league-wide for the same events plus many more, written under the `league_news` umbrella so the home carousel + article modal can render them.

Migration from path 1 → path 2 is gradual. The dispatcher's payload already carries `isUserTeam: true` so when the migration completes you'd route on that flag.

## Message Generation

### MessageGenerator API

**Location**: `src/utils/MessageGenerator.js`

Static methods return message data objects (not Message instances):

```javascript
import MessageGenerator from '../utils/MessageGenerator';
import useInboxStore from '../stores/inboxStore';

const { addMessage } = useInboxStore();

// Generate and add
const welcomeMsg = MessageGenerator.generateWelcomeMessage(team, season);
addMessage(welcomeMsg);
```

#### 1. Welcome Message

```javascript
generateWelcomeMessage(team: Object, season: number)

// team = { id, name, city }
// Returns: { type, subject, body, sender, metadata }
```

**Trigger**: Post-auction (1st message)

#### 2. Expectations Message

```javascript
generateExpectationsMessage(team: Object, season: number)

// Sets season objectives (currently: "Qualify for Playoffs")
```

**Trigger**: Post-auction (2nd message)

#### 3. Tutorial Message

```javascript
generateTutorialMessage()

// No parameters - static game manual content
```

**Trigger**: Post-auction (3rd message)

#### 4. Auction Summary

```javascript
generateAuctionSummaryMessage(squad: Array, finances: Object)

// squad = player array
// finances = { totalSpent, budgetRemaining }
```

**Trigger**: Post-auction (4th message)

#### 5. Match Reminder

```javascript
generateMatchReminderMessage(
  fixture: Object,
  homeTeam: Object,
  awayTeam: Object,
  isUserHome: boolean
)

// fixture = { matchId, venue, matchday }
```

**Trigger**: Day before user match (Header.jsx:135-158)

#### 6. Match Result

```javascript
generateMatchResultMessage(result: Object, won: boolean)

// result = MatchResult from match engine
```

**Trigger**: Post-match (not yet implemented)

## Message Flow

### 1. Post-Auction Messages

```javascript
// Auction.jsx:293-309
const handleAuctionComplete = () => {
  const { addMessage } = useInboxStore();
  const { getUserTeam } = useTeamStore();
  const { currentSeason } = useGameStore();

  const userTeam = getUserTeam();
  const userSquad = auctionResults.filter(p => p.team === userTeam.id);

  // Generate 4 messages
  addMessage(MessageGenerator.generateWelcomeMessage(userTeam, currentSeason));
  addMessage(MessageGenerator.generateExpectationsMessage(userTeam, currentSeason));
  addMessage(MessageGenerator.generateTutorialMessage());
  addMessage(MessageGenerator.generateAuctionSummaryMessage(userSquad, {
    totalSpent: userTeam.budgetSpent,
    budgetRemaining: userTeam.budget - userTeam.budgetSpent
  }));

  navigate('/game/home');
};
```

### 2. Match Reminder (Day Before)

```javascript
// Header.jsx:135-158
useEffect(() => {
  // Check if tomorrow has a user match
  const tomorrowsEvent = calendarEvents.find(e => e.day === gameDay + 1);

  if (tomorrowsEvent?.type === 'match') {
    const userTeam = getUserTeam();
    const fixture = getFixtureById(tomorrowsEvent.data.matchId);

    if (fixture) {
      const isUserMatch = fixture.homeTeam === userTeam?.id || fixture.awayTeam === userTeam?.id;

      if (isUserMatch) {
        const homeClub = getClub(fixture.homeTeam);
        const awayClub = getClub(fixture.awayTeam);
        const isUserHome = fixture.homeTeam === userTeam.id;

        const message = MessageGenerator.generateMatchReminderMessage(
          fixture,
          homeClub,
          awayClub,
          isUserHome
        );

        addMessage(message);
      }
    }
  }
}, [gameDay]);
```

## Inbox UI

### Component Structure

```
Inbox.jsx                    // Main page (2-panel layout)
├── MessagePreview.jsx       // List item (left panel)
└── MessageViewer.jsx        // Full message view (right panel)
```

### Inbox Page Features

**Location**: `src/components/inbox/Inbox.jsx`

- **Auto-selection**: Opens first unread message on load
- **Auto-mark read**: Marks message as read when opened
- **Two panels**: List (40% width) + Viewer (60% width)
- **Mark all read**: Button in header if unread messages exist
- **Empty state**: Shows mail icon and help text

### MessagePreview Features

**Location**: `src/components/inbox/MessagePreview.jsx`

- **Unread indicator**: Bold text + blue dot
- **Truncated subject**: Max 60 chars
- **Relative date**: "2 days ago", "Just now"
- **Actions**: Toggle read, delete (via hover menu)
- **Selection highlight**: Cricket green border when selected

### MessageViewer Features

**Location**: `src/components/inbox/MessageViewer.jsx`

- **Full message**: Subject, sender, date, body
- **Markdown rendering**: Body text preserves line breaks
- **Action buttons**: Delete, toggle read status
- **Metadata links**: (Future) Navigate to related content
- **Scrollable**: Handles long messages

## Sidebar Badge

**Location**: `src/components/layout/Sidebar.jsx:88-95`

```javascript
<div className="relative">
  <Mail className="w-5 h-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-cricket-accent text-xs rounded-full w-4 h-4 flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</div>
```

Shows unread count next to Inbox nav item (max display: 9+).

## Persistence

**Store**: `inboxStore` persisted via Zustand middleware
**localStorage key**: `cm25-inbox-store`
**Version**: 1

**Saved state**:
- Full messages array
- Unread count

**SaveGameManager integration**:
- Messages saved: All fields
- Unread count: Recalculated on load
- Version: `src/utils/SaveGameManager.js:146-152, 276-281`

## Future Extensions

### Message Types to Add

1. **Transfer offers** - Player signing opportunities
2. **Injury reports** - Player fitness updates
3. **Form alerts** - Player performance notifications
4. **Board feedback** - Pressure/praise based on results
5. **Trophy won** - Championship celebration
6. **Playoff qualification** - Season milestone

### Metadata Links

Messages can include navigation links:

```javascript
metadata: {
  link: '/game/squad',
  action: 'view_player',
  playerId: 'player_123'
}
```

Future: MessageViewer can render action buttons based on metadata.

## Gotchas

1. **Messages not consumed** - Remain in inbox until manually deleted
2. **No pagination** - All messages load at once (could be issue with 100+ messages)
3. **No categories/folders** - Single flat list (filter by type via getMessagesByType)
4. **Body is plain text** - Markdown rendering not yet implemented (preserves line breaks only)
5. **Unread count sync** - Use `recalculateUnreadCount()` if count gets out of sync

## Testing

```javascript
// Add test message
const { addMessage } = useInboxStore();
addMessage({
  type: 'test',
  subject: 'Test Message',
  body: 'This is a test message.\n\nSecond paragraph.',
  sender: 'Test Sender'
});

// Check inbox state
console.log(useInboxStore.getState());
```
