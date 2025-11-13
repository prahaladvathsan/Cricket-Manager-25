# Matchday UI Polish - Living Context

**Last Updated**: 2025-11-13
**Current Phase**: Phase 4 (Stats Hub Expandability) - COMPLETE ✅
**Status**: All Phase 4 tasks complete - Full-screen modals with enhanced data
**Progress**: 74/74 tasks complete (100%)

## Summary

**Completed Phases:**
- ✅ **Phase 0**: Documentation Setup (4 tasks)
- ✅ **Phase 1**: HUD Architecture - Single-row compact layout with fixed team positioning (18 tasks)
- ✅ **Phase 2**: Pre-Match Screen - Full-screen immersive flow with phase navigation (16 tasks)
- ✅ **Phase 3**: Tactics Hub Contextual Filtering (18 tasks)
- ✅ **Phase 4**: Stats Hub Expandability (16 tasks)

**Phase 4 Final Status (16/16 tasks - 100% ✅):**
- ✅ **ScorecardModal** - Full scorecard with dismissal details, partnership milestones, FOW timeline
- ✅ **WormModal** - Enlarged worm chart with fall of wickets markers (red dots with wicket numbers)
- ✅ **ManhattanModal** - Enlarged manhattan chart with bowler names per over and ball-by-ball breakdown
- ✅ **PartnershipsModal** - Optimized spacing, milestone indicators (50+, 100+ runs), enhanced details
- ✅ **StatsHub Integration** - Expand buttons added to all tabs with modal state management
- ✅ **Spatial Optimization** - PitchVisualization padding reduced (p-6 → p-2)

**Ready for Phase 5:**
- Integration & Polish (14 tasks)
- End-to-end testing
- Performance optimization
- Design system compliance verification

---

## Key Decisions for Future Phases

### Architecture Patterns (Established)

1. **Full-Screen Modal Pattern**:
   - Use `fixed inset-0` for full-screen takeover
   - Close button (X icon) in top-right corner
   - Scrollable content area
   - Consistent with PlayerCardModal/TeamCardModal

2. **Scrollbar Hiding**:
   ```css
   scrollbar-width: none;
   -ms-overflow-style: none;
   ::-webkit-scrollbar { display: none; }
   ```

3. **Conditional Tab Rendering**:
   - Hide tabs completely (not disable) based on context
   - Detect from `matchStore.innings.battingTeam`
   - Show Batting tab when batting, Bowling+Fielding when bowling

4. **Design System Compliance**:
   - Cricket Green: `#2D5F3F`, Trophy Gold: `#D4AF37`
   - Compact spacing: `p-2`, `p-3`, `gap-2`
   - Inter font (UI), SF Mono (numbers), 14px base
   - Always use `<PlayerName>` and `<TeamName>` components

---

## Data Structures & Integration Points

### Navigation Flow (Fixed)
```
Home → "Matchday" button (Header.jsx:65)
  ↓
PreMatchFlow (`/game/match/:matchId/pre-match`, outside Layout)
  ↓ Phase 0: Preview & Tactics
  ↓ Phase 1: Toss
  ↓ Phase 2: Lineups
  ↓ "Start Match"
MatchdayUI (`/game/match/:matchId/live`, full-screen)
```

### Store Structure

**matchStore** (`src/stores/matchStore.js`):
- State: `matchId`, `status`, `teams`, `innings`, `ballByBall`, `tacticsState`
- `innings.battingTeam` - Current batting team ID (for Phase 3 tab filtering)
- `innings.battedPlayers` - Array of player IDs who have batted (for Phase 3 freeze logic)
- Actions: `updateCurrentAcceleration`, `updateBowlingPlan`, `updateTacticsState`

**teamStore** (`src/stores/teamStore.js`):
- `teams[teamId].battingOrder` - Array of 11 player IDs in batting order (for Phase 3 drag-drop)
- `teamTactics[teamId]` - Tactics object with accelerationTiers, bowlingPlans, fieldFormation
- Actions: `updateBattingOrder`, `updateFieldFormation`

**playerStore** (`src/stores/playerStore.js`):
- `players[playerId]` - Full player objects
- `players[playerId].role` - "batsman", "bowler", "all-rounder", "wicket-keeper"

### Batting Order Freeze Detection (For Phase 3)
```javascript
// Batted players
const battedPlayers = matchStore.innings.battedPlayers; // Array of player IDs

// Dismissed players
const dismissedPlayers = matchStore.ballByBall
  .filter(ball => ball.isWicket)
  .map(ball => ball.batsmanId);

// Combined freeze list
const frozenPlayers = [...new Set([...battedPlayers, ...dismissedPlayers])];

// Check if player is frozen
const isFrozen = (playerId) => frozenPlayers.includes(playerId);
```

### Contextual Tab Visibility Logic (For Phase 3)
```javascript
// Detect if user is batting or bowling
const userTeamId = getUserTeam()?.id;
const currentBattingTeam = matchStore.innings.battingTeam;
const userIsBatting = currentBattingTeam === userTeamId;

// Show/hide tabs
const showBattingTab = userIsBatting;
const showBowlingTab = !userIsBatting;
const showFieldingTab = !userIsBatting;
```

---

## Existing Component Structures

### TacticsHub.jsx ✅ Phase 3 Complete
**Location**: `src/components/match/matchday/TacticsHub/TacticsHub.jsx` (94 lines)

**Implemented Features**:
- ✅ **Contextual tab filtering** (lines 29-46):
  - Detects if user is batting via `currentBattingTeam === userTeamId`
  - Filters tabs with `showWhen` property ('batting' | 'bowling')
  - Only shows relevant tabs based on current innings
- ✅ **Auto-switch logic** (lines 48-54):
  - Automatically switches to first available tab when context changes
  - Prevents showing empty tab after innings break
- **Tab Structure**:
  - Batting tab: `showWhen: 'batting'` - only visible when user is batting
  - Bowling tab: `showWhen: 'bowling'` - only visible when user is bowling
  - Fielding tab: `showWhen: 'bowling'` - only visible when user is bowling
  - Uses Lucide icons: Users (Batting), Target (Bowling), Shield (Fielding)

### BattingAccelerationPanel.jsx ✅ Phase 3 Complete
**Location**: `src/components/match/matchday/TacticsHub/BattingAccelerationPanel.jsx` (492 lines)

**Implemented Features**:
- ✅ **Drag-and-drop batting order** (lines 136-204, 264-308):
  - Native HTML5 drag-and-drop API implementation
  - `UpcomingBatsmanRow` component with draggable functionality
  - Position tracking and reordering logic
- ✅ **Freeze logic** (lines 237-244):
  - Detects batted players from `matchStore.innings.battedPlayers`
  - Detects dismissed players from `ballByBall` (filters isWicket)
  - Visual freeze: Gray out, disable drag, 50% opacity (lines 162-167)
- ✅ **Role badges** (lines 32-48):
  - `RoleBadge` component with color-coding
  - Blue (Batsman), Red (Bowler), Purple (All-Rounder), Green (Wicket-Keeper)
- ✅ **Acceleration tier dropdowns** (lines 54-88):
  - `TierSelector` component for all players (batted and unbatted)
  - Updates matchStore via `updateCurrentAcceleration`
- ✅ **Striker/non-striker highlighting** (lines 103-107):
  - Border highlighting with cricket-primary color
  - Star indicator (★) for striker (line 111)
  - "STRIKE" badge for current striker (lines 114-118)
- ✅ **Scrollbar removal** (lines 311-320):
  - CSS: `scrollbar-hide` class + inline styles
  - `scrollbarWidth: 'none'`, `msOverflowStyle: 'none'`
  - `::-webkit-scrollbar { display: none; }`

**Component Sections**:
- Current Batsmen (positions 1-2): Striker and non-striker with tier dropdowns
- Upcoming Batsmen (positions 3+): Draggable batting order with freeze logic
- Previous Batsmen: Read-only display of dismissed/batted players

### BowlingPlansPanel.jsx ✅ Phase 3 Complete
**Location**: `src/components/match/matchday/TacticsHub/BowlingPlansPanel.jsx` (468 lines)

**Implemented Features**:
- ✅ **Sub-tab switcher** (lines 417-445):
  - Two sub-tabs: Over Assignments | Bowling Plans
  - State management with `activeSubTab` hook (line 372)
  - Uses List and Target icons from Lucide React
- ✅ **Over Assignments sub-tab** (lines 148-297):
  - `OverAssignmentsTab` component with 20-over vertical list
  - Bowler dropdown for each over with quota display (e.g., "2/4 overs")
  - Shows over status: LIVE (current), Done (completed), or upcoming
  - Clock icon for assigned upcoming overs
- ✅ **Over freeze logic** (lines 153-164, 211-214):
  - Calculates completed overs from `ballByBall` data
  - Detects current over: `Math.floor(currentOver / 6) + 1`
  - Disables dropdown for past and current overs
  - Visual: Opacity 60%, "Done" label, disabled state
- ✅ **Bowling Plans sub-tab** (lines 302-366):
  - `BowlingPlansTab` component (refactored from main component)
  - Per-bowler Line/Length plans (Pace: 4 options, Spin: 4 options)
  - Per-bowler Variation plans (Pace: 4 options, Spin: 4 options)
  - Current bowler highlighted with cricket-primary border
  - "BOWLING" badge for active bowler
- ✅ **Scrollbar hiding CSS** (lines 208-209, 341-342):
  - Applied `scrollbar-hide` class on both sub-tabs
  - Inline styles: `scrollbarWidth: 'none'`, `msOverflowStyle: 'none'`
  - CSS utility added to `src/index.css` (lines 82-89)
  - Max height: 400px with scroll functionality preserved

**Component Architecture**:
- Main component: State management and sub-tab routing (lines 371-468)
- `OverAssignmentsTab`: Over assignments with freeze logic (lines 148-297)
- `BowlingPlansTab`: Bowling plans interface (lines 302-366)
- `BowlerRow`: Per-bowler plan selectors (lines 80-143)
- `PlanSelector`: Dropdown component for plans (lines 53-75)

---

## Phase 4 Implementation (2025-11-13) ✅

### StatsHub.jsx ✅ Phase 4 Complete
**Location**: `src/components/match/matchday/StatsHub/StatsHub.jsx` (105 lines)

**Implemented Features**:
- ✅ **Modal state management** (line 28):
  - `expandedModal` state tracks which modal is open
  - Single state for all 4 modals (scorecard, worm, manhattan, partnerships)
- ✅ **Expand button** (lines 68-75):
  - Positioned at top-right of content area (`absolute top-4 right-4`)
  - Maximize2 icon from Lucide React
  - Hover effect with cricket-accent color
  - Opens modal for active tab
- ✅ **Modal imports and rendering** (lines 21-24, 87-102):
  - All 4 modals imported from `./modals/` folder
  - Conditional rendering based on `expandedModal` state
  - `onClose={() => setExpandedModal(null)}` prop passed to all modals
- ✅ **Content padding adjustment** (line 78):
  - Added `pr-10` to content div to prevent overlap with expand button

### ScorecardModal.jsx ✅ Phase 4 Complete
**Location**: `src/components/match/matchday/StatsHub/modals/ScorecardModal.jsx` (518 lines)

**Features**:
- **Enhanced Batting Table** (lines 159-237):
  - New "Dismissal" column showing dismissal type + fielder name
  - Format: "c Fielder b Bowler", "lbw b Bowler", "run out (Fielder)"
  - `formatDismissal()` helper (lines 142-162) handles all dismissal types
  - Fielder extracted from `ball.metadata.fieldingResult.fielder` (lines 60-62)
- **Enhanced Bowling Table** (lines 311-379):
  - Added columns: 0s, 4s, 6s, Extras
  - Extras tracking for wides and no-balls (lines 114-116)
- **Partnership Milestones** (lines 241-285):
  - 50+ runs: Border with cricket-accent, trophy icon
  - 100+ runs: Yellow border, yellow trophy icon
  - Trophy icon positioning (lines 267-273)
- **Fall of Wickets Timeline** (lines 288-326):
  - Full timeline with ordinal suffixes (1st, 2nd, 3rd, 4th...)
  - Format: "3rd wicket fell at 87/3 (10.2 overs)"
- **Modal Pattern** (lines 437-518):
  - Full-screen overlay with backdrop click to close
  - Tab toggle for Batting/Bowling (lines 476-496)
  - React.memo for performance (line 518)

### WormModal.jsx ✅ Phase 4 Complete
**Location**: `src/components/match/matchday/StatsHub/modals/WormModal.jsx` (446 lines)

**Features**:
- **Larger SVG Chart** (lines 84-86):
  - 800x500 dimensions (up from 600x300)
  - Enhanced padding for better label visibility
- **Fall of Wickets Markers** (lines 38-56):
  - Calculated from `ballByBall` with `isWicket` filter
  - Red circles at exact ball positions on worm line (lines 239-261)
  - Wicket number labels above dots (lines 253-259)
- **Enhanced Hover Tooltips** (lines 318-395):
  - Wicket tooltips show: ordinal, player name, runs, overs
  - Run rate tooltips show: runs, overs, run rate calculation
  - Separate tooltips for wickets vs regular points
- **Wickets Summary** (lines 397-414):
  - Grid display below chart
  - Shows all wickets with ordinal, runs, and overs
- **Legend with Wickets** (lines 380-395):
  - Red dot indicator for wickets
  - Actual runs line (gold)
  - Required rate line (dashed gray, 2nd innings only)

### ManhattanModal.jsx ✅ Phase 4 Complete
**Location**: `src/components/match/matchday/StatsHub/modals/ManhattanModal.jsx` (328 lines)

**Features**:
- **Bowler Per Over Extraction** (lines 16-44):
  - Tracks bowler for each over (first ball determines bowler)
  - Stores ball-by-ball breakdown ('W' for wickets, runs otherwise)
  - Data structure: `{ over, runs, bowler, balls: [], color }`
- **Bowler Names Display** (lines 141-148):
  - Last name displayed below each over number
  - Rotated -45° for space efficiency
  - Text color: tertiary for subtle appearance
- **Enhanced Hover Tooltip** (lines 152-194):
  - Shows over number, total runs, ball breakdown, bowler name
  - Ball breakdown format: "4, 1, 0, W, 2, 6"
  - Larger tooltip box (140x65) to fit all info
- **Over-by-Over Summary Table** (lines 265-283):
  - Grid display below chart (2-4 columns)
  - Shows over, runs, bowler name, ball breakdown
  - Scrollable for all 20 overs

### PartnershipsModal.jsx ✅ Phase 4 Complete
**Location**: `src/components/match/matchday/StatsHub/modals/PartnershipsModal.jsx` (350 lines)

**Features**:
- **Enhanced Partnership Calculation** (lines 17-85):
  - Tracks boundaries and dots for each partnership
  - Calculates strike rate: `((runs / balls) * 100).toFixed(1)`
  - Additional stats: boundaries, dots, strike rate
- **Optimized Spacing** (lines 125-216):
  - Reduced vertical gap between bars: `space-y-2` (8px → 4px effective)
  - Reduced margin between total and bar: `mb-1` (4px instead of 12px)
  - Compact padding on partnership cards: `p-2`
- **Milestone Indicators** (lines 146-157):
  - 50-99 runs: Cricket-accent border + trophy
  - 100+ runs: Yellow border + yellow trophy
  - Visual distinction with border colors
- **Partnership Details** (lines 218-223):
  - Strike rate, boundaries, dots displayed for each partnership
  - Centered below horizontal bars
- **Milestone Summary Section** (lines 226-254):
  - Separate card showing only 50+ partnerships
  - Trophy icons color-coded (gold for 100+, cricket-accent for 50+)
  - Full player names with individual contributions

### PitchVisualization.jsx ✅ Phase 4 Complete
**Location**: `src/components/match/matchday/PitchVisualization/PitchVisualization.jsx` (58 lines)

**Change**:
- ✅ **Padding optimization** (line 31):
  - Reduced from `p-6` (24px) to `p-2` (8px)
  - Reclaimed ~32px horizontal space
  - No clipping of pitch SVG observed

---

## Files To Be Modified (Upcoming Phases)

### Phase 3: Tactics Hub
- `src/components/match/matchday/TacticsHub/TacticsHub.jsx` - Conditional tab rendering
- `src/components/match/matchday/TacticsHub/BattingAccelerationPanel.jsx` - Drag-drop + freeze logic
- `src/components/match/matchday/TacticsHub/BowlingPlansPanel.jsx` - Split into sub-tabs

### Phase 4: Stats Hub
- `src/components/match/matchday/StatsHub/StatsHub.jsx` - Add expand buttons
- `src/components/match/matchday/PitchVisualization/PitchVisualization.jsx` - Remove padding

### Phase 4: Stats Hub Modals (To Be Created)
- `src/components/match/matchday/StatsHub/modals/ScorecardModal.jsx`
- `src/components/match/matchday/StatsHub/modals/WormModal.jsx`
- `src/components/match/matchday/StatsHub/modals/ManhattanModal.jsx`
- `src/components/match/matchday/StatsHub/modals/PartnershipsModal.jsx`

---

## Performance Considerations (For All Phases)

1. **React.memo**: Apply to all new modal components and heavy components
2. **Memoized Calculations**: Use `React.useMemo()` for stats aggregations, chart data
3. **Drag-Drop**: Use `react-beautiful-dnd` or native HTML5 drag API with debouncing
4. **Selective Store Subscriptions**: Subscribe only to needed state slices
5. **SVG Charts**: Limit data points (max 120 balls), use React.memo

---

## Phase 3 Post-Completion Fixes (2025-11-12)

**Batting Tab Improvements:**
- Removed role badges, replaced with acceleration tier selectors
- Made tiers editable for all non-dismissed players
- Auto mode now disables ALL tiers (not just current batsmen)
- Reduced padding: px-1.5 py-1.5, tier dropdown: px-1 py-0.5
- Connected to teamStore.updateAccelerationTier() for persistence

**Match Engine Integration:**
- Fixed batting order: setupOpeningPlayers() + selectNextBatsman() now use teamTactics.battingOrder
- Fixed crash: Added matchConditions initialization for new batsmen
- Added comprehensive debug logging for strike rotation and wickets

**Bowling Tab Bugfix:**
- Fixed innings filter: completedOvers and oversBowled now only count current innings
- Prevents 1st innings overs from freezing 2nd innings assignments

**All changes fully wired to match engine and tested.**
