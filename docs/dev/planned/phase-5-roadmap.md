# Phase 5 Development Roadmap

## Overview
Phase 5 focuses on connecting the game progression system to functional pages, implementing the auction and match UIs, and completing the core gameplay loop.

## Current Status
- ✅ GameController determines next events
- ✅ GameEventModal displays events with actions
- ✅ Continue button triggers progression
- ✅ React Router navigation fully integrated
- ✅ Auction UI complete with AuctionEngine integration
- ✅ Match UI complete with MatchEngine integration
- ⚠️ State persistence (LocalStorage) not yet implemented
- ⚠️ Match engine needs real-time UI updates integration

## Priority Tasks

### 1. Navigation Integration (CRITICAL - Start Here)
**Goal**: Make modal action buttons navigate to correct pages

**Files to modify**:
- `src/components/layout/Header.jsx` - Add React Router `useNavigate` hook
- `src/App.jsx` - Verify all routes are defined

**Implementation**:
```javascript
// Header.jsx - Add import
import { useNavigate } from 'react-router-dom';

// Inside Header component
const navigate = useNavigate();

// Update handleEventAction
const handleEventAction = (shouldSimulate) => {
  switch (currentEvent.type) {
    case 'auction':
      navigate('/auction');
      break;
    case 'match':
    case 'playoff_match':
      if (shouldSimulate) {
        // Simulate and stay on current page
        simulateMatch(currentEvent.data);
      } else {
        navigate(`/match/${currentEvent.data.id}`);
      }
      break;
    case 'season_start':
      gameController.initializeLeagueSeason();
      break;
  }
  onClose(); // Close modal after action
};
```

**Test**: Click Continue → Modal opens → Click action → Should navigate to target page

---

### 2. Auction UI Page
**Goal**: Create interactive auction interface

**Reference**: `src/test/auctionTest.js` (command-line version with all logic)

**Create**: `src/components/auction/Auction.jsx`

**Key Features**:
- Player card display with attributes and playstyle ratings
- Current bid display and bid increment selector
- Team budget tracker
- Bid/Pass buttons for user
- AI bidding animation
- Squad composition tracker (batting/bowling quotas)

**State Integration**:
```javascript
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';

// Use AuctionManager from test file
import AuctionManager from '../../core/auction/AuctionManager';
```

**Design**: Follow design system from `docs/frontend/design-system.md`
- Use Cricket Green/Trophy Gold palette
- Compact cards with icon headers
- Progress bars for quotas
- Modal for bid confirmation

**Layout Reference**: See `docs/frontend/layouts/auction-view-layout.md`

---

### 3. Match View UI
**Goal**: Live ball-by-ball match visualization

**Reference**: `src/test/interactiveMatchTest.js` (command-line version)

**Create**: `src/components/match/MatchView.jsx`

**Key Components**:
```
MatchView/
├── MatchHeader.jsx       - Teams, scores, overs
├── PitchVisualization.jsx - 2D field with ball trajectory
├── BallByBall.jsx        - Live commentary feed
├── Scorecard.jsx         - Batting/bowling scorecards
└── TacticalControls.jsx  - Acceleration tier, bowling plans
```

**State Integration**:
```javascript
import useMatchStore from '../../stores/matchStore';
import SimpleBallSimulator from '../../core/match-engine/SimpleBallSimulator';
```

**Layout**: Split-screen design (see `docs/frontend/layouts/match-view-layout.md`)
- Left: 2D pitch visualization
- Right: Scorecard + controls
- Bottom: Ball-by-ball feed

---

### 4. Team Selection Page
**Goal**: Initial team selection interface

**Create**: `src/components/team/TeamSelection.jsx`

**Features**:
- Grid of 10 WPL teams with colors
- Team info cards (name, venue, coach)
- Confirm selection button

**State Integration**:
```javascript
import useTeamStore from '../../stores/teamStore';

const handleSelectTeam = (teamId) => {
  teamStore.setUserTeam(teamId);
  navigate('/dashboard');
};
```

---

### 5. Matches Page
**Goal**: View all fixtures with play/simulate options

**Update**: `src/components/views/Matches.jsx` (may already exist)

**Features**:
- List of upcoming matches (user team highlighted)
- Past match results
- Play/Simulate buttons for user matches
- Quick simulate for other matches

---

### 6. Transfers Page
**Goal**: Mid-season player trading

**Create**: `src/components/transfers/Transfers.jsx`

**Features**:
- Available players list (free agents)
- Squad list with release option
- Budget tracker
- Trade proposals

---

### 7. State Persistence
**Goal**: Save/Load game state to LocalStorage

**Files to modify**:
- `src/stores/gameStore.js` - Add save/load methods
- `src/components/layout/Header.jsx` - Wire Save button

**Implementation**:
```javascript
// gameStore.js
const useGameStore = create((set, get) => ({
  // ... existing state
  saveGame: () => {
    const state = get();
    localStorage.setItem('cricket-manager-save', JSON.stringify(state));
  },
  loadGame: () => {
    const saved = localStorage.getItem('cricket-manager-save');
    if (saved) {
      set(JSON.parse(saved));
    }
  }
}));
```

---

## Development Order

### Week 1: Critical Path
1. **Day 1**: Navigation integration (Task 1) - MUST DO FIRST
2. **Day 2-3**: Team Selection page (Task 4)
3. **Day 4-5**: Auction UI skeleton (Task 2)

### Week 2: Core Gameplay
1. **Day 1-3**: Complete Auction UI with bidding logic
2. **Day 4-5**: Match View skeleton and header

### Week 3: Polish
1. **Day 1-2**: Complete Match View with ball simulation
2. **Day 3**: Matches page (Task 5)
3. **Day 4**: State persistence (Task 7)
4. **Day 5**: Testing and bug fixes

---

## Testing Strategy

### Unit Tests
- GameController event logic
- AuctionManager bidding logic
- SimpleBallSimulator outcomes

### Integration Tests
- Complete game flow: Team selection → Auction → Match → Season
- State persistence (save/load)
- Navigation between pages

### Manual Tests
- Play full season from start to finish
- Test all Continue button events
- Verify UI responsiveness

---

## Quick Reference

### Essential Files
```
src/
├── core/
│   ├── game/GameController.js       - Event determination
│   ├── auction/AuctionManager.js    - Auction logic
│   └── match-engine/SimpleBallSimulator.js
├── components/
│   ├── layout/Header.jsx            - Continue button (needs navigation)
│   ├── shared/GameEventModal.jsx    - Event display
│   └── [NEW] auction/Auction.jsx    - Create this
│   └── [NEW] match/MatchView.jsx    - Create this
├── stores/
│   ├── gameStore.js                 - Current phase, date
│   ├── leagueStore.js               - Fixtures, standings
│   ├── teamStore.js                 - Teams, user team
│   └── matchStore.js                - Current match state
└── test/
    ├── auctionTest.js               - Reference for auction UI
    └── interactiveMatchTest.js      - Reference for match UI
```

### Design Resources
- Design system: `docs/frontend/design-system.md`
- Integration patterns: `docs/frontend/integration-patterns.md`
- Game progression: `docs/frontend/game-progression.md`
- Layout specs: `docs/frontend/layouts/*.md`

### Key Commands
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Check code quality

# Test auction logic (command-line)
node src/test/auctionTest.js

# Test match simulation (command-line)
node src/test/interactiveMatchTest.js
```

---

## Common Patterns

### Page Structure
```javascript
const PageName = () => {
  // 1. Store hooks
  const store = useStore();

  // 2. Local state
  const [activeTab, setActiveTab] = useState('default');

  // 3. Navigation
  const navigate = useNavigate();

  // 4. Computed values
  const computedValue = useMemo(() => ..., [deps]);

  // 5. Event handlers
  const handleAction = () => { ... };

  // 6. Render
  return (
    <div className="space-y-4">
      {/* Header with title and actions */}
      {/* Tab navigation */}
      {/* Content area */}
    </div>
  );
};
```

### Store Access Pattern
```javascript
// CORRECT - hooks already return state
const { currentPhase, setPhase } = useGameStore();

// WRONG - don't call .getState()
const gameStore = useGameStore();
gameStore.getState(); // ❌ This will error
```

---

## Success Criteria

Phase 5 is complete when:
- ✅ Continue button navigates to correct pages
- ✅ Auction UI allows bidding and squad building
- ✅ Match UI shows live ball-by-ball simulation
- ✅ Full season playable from team selection to playoffs
- ✅ Game state persists with Save/Load
- ✅ All UI follows design system

---

## Notes

- **Start with Task 1 (Navigation)** - Everything else depends on this
- **Reuse command-line test logic** - Don't rewrite, adapt existing code
- **Follow design system** - Use existing patterns from Dashboard/League/Squad
- **Test frequently** - Play through the game after each major feature
- **Document as you go** - Update `docs/frontend/` for new components

---

**Next Session**: Start with Task 1 (Navigation Integration) in `Header.jsx`
