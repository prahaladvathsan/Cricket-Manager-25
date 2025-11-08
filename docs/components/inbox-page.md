# Inbox Page

## Overview

Two-panel inbox interface for viewing in-game messages. Left panel shows message list, right panel shows selected message.

**Location**: `src/components/inbox/`

## Components

### Inbox (Main Page)

**File**: `Inbox.jsx`

**Purpose**: Container with message list and viewer

**Features**:
- Auto-selects first unread message on load
- Auto-marks messages as read when opened
- Empty state when no messages
- Mark all read button

**Layout**:
```
┌─────────────────────────────────────┐
│ Inbox               [Mark All Read] │
├───────────────┬─────────────────────┤
│ Message List  │  Message Viewer     │
│ (40% width)   │  (60% width)        │
│               │                     │
│ [Preview 1]   │  Subject: Welcome   │
│ [Preview 2]   │  From: Board        │
│ [Preview 3]   │  Date: 2 days ago   │
│               │                     │
│               │  Body text...       │
│               │                     │
└───────────────┴─────────────────────┘
```

**State**:
```javascript
const [selectedMessageId, setSelectedMessageId] = useState(null);
```

**Key handlers**:
- `handleSelectMessage(messageId)` - Opens message, marks as read
- `handleDelete(messageId)` - Deletes message, selects next
- `handleToggleRead(messageId)` - Toggles read status

---

### MessagePreview (List Item)

**File**: `MessagePreview.jsx`

**Purpose**: Compact message preview in list

**Props**:
```javascript
{
  message: Message,
  isSelected: boolean,
  onSelect: () => void,
  onDelete: () => void,
  onToggleRead: () => void
}
```

**Visual states**:
- **Unread**: Bold text, blue dot indicator, darker background
- **Read**: Normal weight, no dot, lighter background
- **Selected**: Cricket green left border (3px)

**Layout**:
```
┌──────────────────────────────────┐
│ ● Board of Directors   2 days ago│  ← Blue dot if unread
│ Welcome to Mumbai...             │  ← Subject (max 60 chars)
│                      [👁] [🗑]    │  ← Hover actions
└──────────────────────────────────┘
```

**Actions** (hover menu):
- Eye icon: Toggle read/unread
- Trash icon: Delete message

**Date formatting**:
- Uses relative time: "Just now", "2 hours ago", "3 days ago"
- Falls back to date if >7 days: "Jan 15"

---

### MessageViewer (Full Message)

**File**: `MessageViewer.jsx`

**Purpose**: Display full message content

**Props**:
```javascript
{
  message: Message,
  onDelete: () => void,
  onToggleRead: () => void
}
```

**Layout**:
```
┌─────────────────────────────────┐
│ [🗑 Delete] [Mark Unread]       │
├─────────────────────────────────┤
│ Subject: Welcome to Mumbai...   │
│ From: Board of Directors        │
│ Date: January 17, 2025, 12:00 PM│
├─────────────────────────────────┤
│                                 │
│ Dear Manager,                   │
│                                 │
│ On behalf of the entire...      │
│                                 │
│ (scrollable body content)       │
│                                 │
└─────────────────────────────────┘
```

**Body rendering**:
- Preserves line breaks (`whitespace-pre-wrap`)
- No markdown parsing yet (plain text only)
- Scrollable if content exceeds height

**Actions**:
- Delete button (top-right)
- Toggle read button (eye icon)

---

## Usage Example

```javascript
import Inbox from './components/inbox/Inbox';

// Route configuration
<Route path="/game/inbox" element={<Inbox />} />
```

**Integration points**:
- Sidebar nav item: Shows unread badge
- Routes: `/game/inbox`
- Store: `useInboxStore`

---

## State Management

**Store**: `inboxStore`

**Key operations**:
```javascript
const {
  messages,
  unreadCount,
  addMessage,
  markAsRead,
  markAsUnread,
  deleteMessage,
  markAllAsRead
} = useInboxStore();
```

**Message flow**:
1. Message generated via `MessageGenerator`
2. Added to inbox via `addMessage()`
3. User opens Inbox page
4. Clicks message → auto-marked as read
5. Can manually toggle read/unread
6. Can delete message

---

## Styling

**Theme**: Cricket Manager dark theme
- Background: `bg-bg-secondary`
- Borders: `border-border-primary`
- Text: `text-text-primary/secondary/tertiary`
- Accent: Cricket green `#2D5F3F`
- Unread indicator: Blue `#3B82F6`

**Spacing**: Compact (p-2, p-3, gap-2)

**Icons**: Lucide React
- Mail, MailOpen (inbox)
- Trash2 (delete)
- Eye, EyeOff (read toggle)

---

## Empty State

When `messages.length === 0`:
```
┌─────────────────────────────┐
│        📧                   │
│    No Messages              │
│    Your inbox is empty...   │
└─────────────────────────────┘
```

---

## Future Enhancements

1. **Search/filter** - Filter by type, sender, date
2. **Pagination** - Limit visible messages to 50
3. **Categories** - Group by type (welcome, match, auction)
4. **Markdown rendering** - Rich text formatting in body
5. **Action links** - Navigate to related content (fixtures, players)
6. **Attachments** - Link to match reports, stats
7. **Message importance** - Priority/starred messages

---

## Gotchas

1. **Auto-mark read** - Messages marked read immediately on open (not on close)
2. **Selection after delete** - Automatically selects next message
3. **No undo delete** - Deletion is permanent (no trash/archive)
4. **Subject truncation** - Preview shows max 60 chars (no tooltip)
5. **Scroll persistence** - List scroll position not preserved on navigation
