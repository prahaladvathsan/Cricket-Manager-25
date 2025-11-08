# Player Card Modal

## Overview

Modal overlay displaying comprehensive player information. Used in League leaderboards and Tactics page for quick player details.

**Location**: `src/components/shared/PlayerCardModal.jsx`

## Purpose

Show full player profile without navigation. Click-to-open modal with player stats, attributes, and career information.

## Usage

```javascript
import PlayerCardModal from '../shared/PlayerCardModal';

const [showModal, setShowModal] = useState(false);
const [selectedPlayerId, setSelectedPlayerId] = useState(null);

// Open modal
<button onClick={() => {
  setSelectedPlayerId('player_123');
  setShowModal(true);
}}>
  View Player
</button>

// Modal
<PlayerCardModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  playerId={selectedPlayerId}
/>
```

## Props

```javascript
{
  isOpen: boolean,      // Show/hide modal
  onClose: () => void,  // Close handler
  playerId: string      // Player ID to display
}
```

## Features

**Content**:
- Full player name and nationality
- Role (Batsman, Bowler, All-Rounder, Wicketkeeper)
- Current team
- Career statistics (matches, runs, wickets, etc.)
- Attribute ratings (batting, bowling, fielding)
- Playstyle ratings (24 playstyles)
- Form and fitness indicators
- Contract details

**Layout**:
```
┌─────────────────────────────────────┐
│ Player Profile            [X]       │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │                               │   │
│ │   (PlayerCard component)      │   │
│ │   - Player info               │   │
│ │   - Attributes                │   │
│ │   - Statistics                │   │
│ │   - Playstyles                │   │
│ │                               │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
    (scrollable if content exceeds height)
```

## Implementation

**Modal structure**:
- Fixed overlay (full-screen, semi-transparent black)
- Centered modal (max-width: 4xl, max-height: 90vh)
- Close button (top-right X icon)
- Scrollable content area

**Player lookup**:
```javascript
const { players } = usePlayerStore();
const player = players[playerId];

if (!player) {
  return <div>Player not found</div>;
}
```

**Uses PlayerCard component**:
- Reuses existing `PlayerCard.jsx` component
- Shows all player details in compact format
- No additional styling needed

## Integration Points

### 1. League Leaderboards

**Location**: `src/components/layout/League.jsx`

**Trigger**: Click player name in leaderboard table

```javascript
const [showPlayerModal, setShowPlayerModal] = useState(false);
const [selectedPlayerId, setSelectedPlayerId] = useState(null);

// Table row
<td
  className="cursor-pointer hover:text-cricket-accent"
  onClick={() => {
    setSelectedPlayerId(player.id);
    setShowPlayerModal(true);
  }}
>
  {player.name}
</td>

// Modal
<PlayerCardModal
  isOpen={showPlayerModal}
  onClose={() => setShowPlayerModal(false)}
  playerId={selectedPlayerId}
/>
```

### 2. Tactics Page

**Location**: `src/components/tactics/TacticsPage.jsx`

**Trigger**: Click player in any tactics tab

```javascript
// Pass down to child tabs
<SquadPlaystyleTab
  onPlayerClick={(playerId) => {
    setSelectedPlayerId(playerId);
    setShowPlayerModal(true);
  }}
/>

// Modal in parent
<PlayerCardModal
  isOpen={showPlayerModal}
  onClose={() => setShowPlayerModal(false)}
  playerId={selectedPlayerId}
/>
```

## Styling

**Modal overlay**:
- Background: `bg-black/50` (50% opacity)
- Z-index: 50 (above all content)
- Flexbox centering

**Modal content**:
- Background: `bg-bg-secondary`
- Border: `border-border-primary`
- Rounded: `rounded-lg`
- Shadow: `shadow-xl`
- Padding: `p-4`

**Header**:
- Icon: BarChart3 (cricket accent color)
- Title: "Player Profile"
- Close button: X icon (hover highlight)

**Scrolling**:
- Max height: 90vh (allows space above/below)
- Overflow-y: auto (scrollable if needed)
- Padding: p-4 (prevents content touching edges)

## PlayerCard Component

**Location**: `src/components/shared/PlayerCard.jsx`

**Sections**:
1. **Header** - Name, nationality, role, team
2. **Career Stats** - Matches, runs, wickets, average, etc.
3. **Attributes** - Batting, bowling, fielding (1-20 scale)
4. **Playstyles** - 24 playstyle ratings (0-100 scale)
5. **Form/Fitness** - Current condition indicators
6. **Contract** - Salary, years remaining

## Gotchas

1. **No prefetch** - Player data loaded on modal open (instant via store)
2. **Click outside to close** - NOT implemented (X button only)
3. **Escape key close** - NOT implemented
4. **Deep links** - No URL parameter (modal state only)
5. **Mobile responsiveness** - Fixed width (not optimized for small screens)
6. **Player not found** - Shows error message, no retry logic

## Future Enhancements

1. **Click outside to close** - Dismiss modal on overlay click
2. **Escape key handler** - Close on ESC keypress
3. **Navigation arrows** - Next/previous player in list
4. **Compare mode** - Side-by-side player comparison
5. **Quick actions** - Transfer offer, add to watchlist
6. **Performance charts** - Form graph, match-by-match stats
7. **Mobile optimization** - Full-height modal on small screens
