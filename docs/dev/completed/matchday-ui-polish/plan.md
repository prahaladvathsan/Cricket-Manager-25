# Matchday UI Polish - Implementation Plan

**Status**: Not Started
**Created**: 2025-11-12
**Estimated Completion**: 20-25 hours

## Overview

Enhance the in-game matchday experience with four major polish improvements: **Pre-Match Screen Redesign** (3-tab immersive experience), **HUD Architecture** (2-row broadcast-style layout), **Tactics Hub Contextual Filtering** (smart tab visibility), and **Stats Hub Expandability** (detailed modal drill-downs). Focus on data density, visual hierarchy, and professional Football Manager aesthetic.

## User Requirements

### 1. Pre-Match Screen Redesign
- Transform PreMatchFlow.jsx into full-screen immersive 3-tab experience
- **Tab 1 - Preview & Tactics**: Match summary (teams, venue, conditions, form) + configure tactics button
- **Tab 2 - Toss**: Dedicated coin flip with animation, random caller assignment, winner announcement, batting decision interface
- **Tab 3 - Lineups**: Both teams displayed in batting order with role indicators (batsman/bowler/all-rounder/keeper)
- Maintain existing toss logic (random winner, AI decision handling)
- Replace existing wizard-style flow entirely

### 2. HUD Architecture Improvements
- Expand header bar to accommodate **2 text rows** for increased information density
- **Team positioning**: Fixed by innings order (1st innings batting team on left, 2nd innings team on right throughout match)
- **Row 1 Layout**:
  - Left edge: Team 1 name + score (e.g., "MUM 145/3 (15.4)")
  - Left side: Team 1 batsmen (stacked vertically, striker marked with star ★)
  - Center: Metrics box (CRR/RRR with vertical bars, color-coded: green if RRR < CRR, red if RRR > CRR)
  - Right side: Team 2 bowler (current + previous over's bowler in 2 rows)
  - Right edge: Team 2 name + score
- **Row 2 Layout**:
  - Center: "Need X from Y balls" (2nd innings only)
  - Additional metrics: Pressure index, momentum indicator (optional)
- **Visual enhancements**:
  - Use existing team colors for gradient background (left team color → right team color)
  - Highlight currently batting team's section with subtle glow/border
  - Use team short names (MUM, LON, MEL) with existing colored circle badges
  - Maintain play/pause and skip controls in top-right corner
  - Remove status labels ("live", "completed")
- **Note**: Team logos/badges deferred to future enhancement (continue using colored circles)

### 3. Tactics Hub Contextual Filtering
- **Smart tab visibility**: Show only relevant tabs based on current innings
  - Batting innings: Show only **Batting** tab
  - Bowling innings: Show **Bowling** + **Fielding** tabs
- **Remove visible scrollbars** while preserving scroll functionality (CSS scrollbar hiding)
- **Batting tab enhancements**:
  - Replicate/adapt main tactics page's batting order UI with **drag-and-drop** reordering
  - Dynamically freeze order positions for players who have batted or are out (visual indicator + disable dragging)
  - Allow order changes only for unbatted players in the queue
  - Enable acceleration tier changes for both current batsmen and future batsmen
  - Show player roles inline (batsman/bowler/all-rounder/keeper as text badges)
- **Bowling tab split**:
  - **Sub-tab 1 - Over Assignments**: Vertical list of 20 overs, freeze completed/in-progress overs, allow assignment changes for future overs
  - **Sub-tab 2 - Bowling Plans**: List all bowlers (highlight current), allow plan edits anytime
- **Fielding tab**: Reference main tactics page's fielding interface (minimal changes)

### 4. Stats Hub Expandability
- Add **expand button** (maximize icon) to each tab header
- **Expanded modals**: Full-screen overlay with detailed view of selected stat
- **Scorecard modal**:
  - Full scorecard structure (reference `src/test/leagueTest.js` output format)
  - Batting section: Include wicket details (dismissal type, fielder) in separate column
  - Bowling section: Add 0s/4s/6s/Extras columns (remove from compact view)
  - Partnership details with milestone indicators
- **Worm Chart modal**:
  - Larger chart with better scaling
  - Add fall of wickets markers (red dots on line with wicket number annotation)
  - Interactive tooltips with over-by-over details
- **Manhattan Chart modal**:
  - Display bowler names below over numbers
  - Show runs breakdown per ball on hover (e.g., "4, 1, 0, W, 2, 6")
  - Color-code bars by bowler instead of runs range (optional enhancement)
- **Partnerships modal**:
  - Reduce spacing between partnership bars
  - Reduce spacing between total/balls display and bar graphic
  - Show partnership milestones (50/100 runs highlighted)
- **Spatial optimization**:
  - Remove horizontal pitch padding to reclaim space
  - Allocate reclaimed space to Stats Hub (use static pixel values, not percentages)
  - Assume standard desktop viewport (1920x1080 or 1440p)

## Component Architecture

```
Pre-Match Flow:
src/components/match/PreMatchFlow.jsx (REFACTOR)
├── Components to create:
│   ├── PreMatchTabs.jsx              # 3-tab container replacing wizard
│   ├── PreviewTab.jsx                 # Match preview + tactics configure
│   ├── TossTab.jsx                    # Coin flip animation + decision
│   └── LineupsTab.jsx                 # Both teams in batting order

HUD (MatchdayUI.jsx):
src/components/match/matchday/MatchdayUI.jsx (MODIFY)
├── MatchHeader component (REFACTOR)
│   ├── Expand to 2-row layout
│   ├── Reorganize team/batsmen/bowler/metrics positioning
│   └── Add gradient background with team colors

Tactics Hub:
src/components/match/matchday/TacticsHub/
├── TacticsHub.jsx (MODIFY)
│   └── Add conditional tab rendering logic
├── BattingAccelerationPanel.jsx (REFACTOR)
│   ├── Add drag-and-drop batting order component
│   ├── Implement freeze logic for batted/out players
│   └── Remove scrollbars with CSS
├── BowlingPlansPanel.jsx (REFACTOR)
│   ├── Split into two sub-tabs (assignments, plans)
│   └── Remove scrollbars with CSS
└── FieldFormationPanel.jsx (MINIMAL CHANGES)

Stats Hub:
src/components/match/matchday/StatsHub/
├── StatsHub.jsx (MODIFY)
│   └── Add expand buttons to tab headers
├── Components to create:
│   ├── ScorecardModal.jsx             # Full scorecard with wickets
│   ├── WormModal.jsx                  # Worm chart + fall of wickets
│   ├── ManhattanModal.jsx             # Manhattan + bowler names
│   └── PartnershipsModal.jsx          # Optimized partnerships display
```

## Implementation Phases

### Phase 0: Documentation Setup ✅
**Goal**: Establish tracking framework

**Tasks**:
1. Create `docs/dev/active/matchday-ui-polish/` folder
2. Create `plan.md` (this file)
3. Create `context.md` for living documentation
4. Create `tasks.md` for granular checklist

**Duration**: 30 minutes

---

### Phase 1: HUD Architecture Improvements
**Goal**: Expand header to 2-row layout with reorganized information hierarchy

**Scope**:
1. **Expand MatchHeader component** in MatchdayUI.jsx to 2-row layout
2. **Reorganize Row 1**:
   - Team names at left/right edges (fixed by innings order)
   - Scores below team names (large font with overs)
   - Batsmen stacked vertically on batting team's side
   - Bowler info on bowling team's side (current + previous bowler)
   - Central metrics box (CRR/RRR with vertical bars, color-coded)
3. **Add Row 2**:
   - "Need X from Y balls" message (2nd innings)
   - Optional: Pressure index, momentum indicator
4. **Visual enhancements**:
   - Gradient background using team colors (linear-gradient from left to right)
   - Highlight batting team's section with subtle glow
   - Maintain play/pause/skip controls in corner
5. **Remove status labels** ("LIVE", "completed")
6. **Test responsiveness** at different viewport sizes

**Data Sources**:
- `matchStore.teams.batting/bowling` - Team data, scores, wickets
- `matchStore.innings.striker/nonStriker/bowler` - Current player IDs
- `matchStore.ballByBall` - Player stats calculation
- `leagueStore.clubs[teamId]` - Team colors, short names

**Success Criteria**:
- ✅ 2-row layout functional with proper spacing
- ✅ Team positioning fixed by innings order (no swapping)
- ✅ Batsmen stack vertically with striker marked
- ✅ Metrics color-coded correctly (green/red based on RRR vs CRR)
- ✅ Gradient background uses team colors
- ✅ No layout breaks at 1920x1080 and 1440p resolutions

**Duration**: 6-8 hours

---

### Phase 2: Pre-Match Screen Redesign
**Goal**: Replace wizard-style PreMatchFlow with immersive 3-tab interface

**Scope**:
1. **Refactor PreMatchFlow.jsx**:
   - Remove wizard steps (progress bar, step state)
   - Implement 3-tab container (Preview & Tactics | Toss | Lineups)
2. **Tab 1 - Preview & Tactics**:
   - Integrate MatchPreview.jsx content (team comparison, venue, conditions, form)
   - Add "Configure Tactics" button → opens SetTacticsModal
   - Show current tactics summary (acceleration tier, formation)
3. **Tab 2 - Toss**:
   - Coin flip animation (spinning coin icon, 2-second duration)
   - Random toss caller assignment (50/50 user or AI)
   - Display toss result (winner + caller)
   - Batting decision interface:
     - User won: Radio buttons (Bat First / Bowl First)
     - AI won: Display AI's decision with strategic reasoning
4. **Tab 3 - Lineups**:
   - Display both teams side-by-side
   - Show playing XI in batting order (1-11)
   - Display player roles with text badges (batsman/bowler/all-rounder/keeper)
   - Use `<PlayerName>` components for clickable players
   - Highlight captain and vice-captain (optional)
5. **Navigation flow**:
   - Back button returns to MatchPreview page
   - "Start Match" button on Lineups tab → navigates to `/match/:matchId/live` with toss data
   - Tab validation (must complete toss before accessing lineups tab)
6. **Maintain existing toss logic**:
   - Random winner selection
   - AI decision algorithm (batting condition analysis)
   - Toss result passed to MatchEngine via navigate state

**Components to Create**:
- `PreviewTab.jsx` - Match preview + tactics summary
- `TossTab.jsx` - Toss animation + decision interface
- `LineupsTab.jsx` - Both teams' playing XI display

**Data Sources**:
- `leagueStore.getFixtureById(matchId)` - Match fixture data
- `teamStore.teams[teamId].battingOrder` - Batting order
- `playerStore.getPlayer(playerId)` - Player details and roles
- `matchStore.tacticsState` - Current tactics settings

**Success Criteria**:
- ✅ 3-tab interface functional with smooth transitions
- ✅ Preview tab shows match context and tactics summary
- ✅ Toss tab has coin flip animation and decision interface
- ✅ Lineups tab displays both teams with roles
- ✅ Toss logic works (random caller, winner, AI decision)
- ✅ Navigation to live match passes toss data correctly

**Duration**: 8-10 hours

---

### Phase 3: Tactics Hub Contextual Filtering
**Goal**: Smart tab visibility + drag-drop batting order + scrollbar removal

**Scope**:
1. **Contextual tab rendering** in TacticsHub.jsx:
   - Detect current innings batting team from `matchStore.innings.battingTeam`
   - Show only **Batting** tab when user's team is batting
   - Show only **Bowling** + **Fielding** tabs when user's team is bowling
   - Use conditional rendering (not disabling) to hide tabs
2. **Batting tab refactor** (BattingAccelerationPanel.jsx):
   - Implement **drag-and-drop** reordering using `react-beautiful-dnd` or native HTML5 drag API
   - Display full batting order (1-11) with:
     - Order number (frozen for batted/out players)
     - Player name (using `<PlayerName>` component)
     - Role badge (batsman/bowler/all-rounder/keeper)
     - Acceleration tier dropdown
     - Current status indicator (batting now, out, not yet batted)
   - **Freeze logic**:
     - Players who have batted or are out: Gray out, disable dragging, lock order number
     - Unbatted players: Enable dragging, allow order changes
   - Highlight current striker and non-striker
   - Allow acceleration tier changes for all players (batted and unbatted)
   - Remove `max-h-96 overflow-y-auto` → use CSS scrollbar hiding instead
3. **Bowling tab split** (BowlingPlansPanel.jsx):
   - Add sub-tab switcher (Over Assignments | Bowling Plans)
   - **Sub-tab 1 - Over Assignments**:
     - Vertical list of 20 overs (1-20)
     - Each over shows: Over number, assigned bowler dropdown, status (completed/in-progress/upcoming)
     - Freeze completed and in-progress overs (disable dropdown)
     - Allow changes only to upcoming overs
   - **Sub-tab 2 - Bowling Plans**:
     - Keep existing bowling plans interface
     - List all bowlers with line/length and variation dropdowns
     - Highlight current bowler
   - Remove `max-h-96 overflow-y-auto` → use CSS scrollbar hiding
4. **Scrollbar removal**:
   - Add CSS: `scrollbar-width: none; -ms-overflow-style: none; ::-webkit-scrollbar { display: none; }`
   - Ensure panels fit within viewport height (adjust layouts if needed)
   - Preserve scroll functionality (mouse wheel, touch gestures)
5. **Fielding tab**: No changes (reference existing FieldFormationPanel.jsx)

**Components to Modify**:
- `TacticsHub.jsx` - Add conditional tab rendering
- `BattingAccelerationPanel.jsx` - Drag-drop + freeze logic
- `BowlingPlansPanel.jsx` - Sub-tabs for assignments/plans

**New Utilities**:
- `useBattingOrderDragDrop.js` - Custom hook for drag-drop state management (optional)

**Data Sources**:
- `matchStore.innings.battingTeam/bowlingTeam` - Current innings teams
- `matchStore.innings.battedPlayers` - Players who have batted
- `teamStore.teams[teamId].battingOrder` - Batting order
- `matchStore.ballByBall` - Over completion tracking

**Success Criteria**:
- ✅ Only relevant tabs shown based on batting/bowling
- ✅ Batting order drag-and-drop functional
- ✅ Batted/out players frozen (visual + functional)
- ✅ Bowling sub-tabs work (assignments + plans)
- ✅ Scrollbars hidden but scrolling works
- ✅ No layout overflow or clipping issues

**Duration**: 8-10 hours

---

### Phase 4: Stats Hub Expandability
**Goal**: Enable detailed modal views for each stats tab

**Scope**:
1. **Add expand buttons** to StatsHub.jsx:
   - Place maximize icon in each tab header (top-right corner)
   - On click: Open corresponding modal component
   - Use existing modal pattern (PlayerCardModal/TeamCardModal style)
2. **Create ScorecardModal.jsx**:
   - Full-screen overlay with close button (X icon)
   - **Batting section**:
     - Columns: Batsman, R, B, 4s, 6s, SR, Dismissal Type, Fielder
     - Show wicket details in dedicated columns
     - Current partnership card (expanded with milestone indicators)
     - Fall of wickets timeline (with over number + score)
   - **Bowling section**:
     - Columns: Bowler, O, M, R, W, Econ, 0s, 4s, 6s, Extras
     - Remove 0s/4s/6s columns from compact LiveScorecard.jsx view
   - **Extras breakdown**: Wide, No-Ball, Bye, Leg-Bye
   - Use `<PlayerName>` for all player references
3. **Create WormModal.jsx**:
   - Larger SVG worm chart (600x400 or larger)
   - X-axis: 0-20 overs, Y-axis: Cumulative runs (auto-scale)
   - Add **fall of wickets markers**: Red dots on line with wicket number labels
   - Interactive hover tooltips (runs at over, run rate at point)
   - 2nd innings: Show required run rate line (dashed)
   - Include chart legend (Team 1, Team 2, RRR, Wickets)
4. **Create ManhattanModal.jsx**:
   - Larger SVG manhattan chart (600x400 or larger)
   - X-axis labels: Over numbers (1-20)
   - **Below each over**: Display bowler name who bowled that over
   - Hover tooltip: Runs breakdown per ball (e.g., "4, 1, 0, W, 2, 6 - Total: 13")
   - Color-code bars: Green (0-5), Yellow (6-10), Red (11+)
   - Optional enhancement: Color-code by bowler instead of runs
5. **Create PartnershipsModal.jsx**:
   - Full partnerships display with optimized spacing
   - **Reduce spacing**:
     - Between partnership bars (vertical gap: 8px → 4px)
     - Between total/balls display and bar graphic (margin: 12px → 6px)
   - Show partnership milestones (50/100 runs highlighted with trophy icon)
   - Include partnership details: Strike rate, boundary count, dots played
   - Current partnership highlighted with accent border
6. **Spatial optimization**:
   - Remove horizontal padding from PitchVisualization.jsx (16px → 0px)
   - Allocate reclaimed space (~32px) to Stats Hub
   - Update grid layout: 25% (Tactics) | 48% (Pitch) | 27% (Stats)
   - Use static pixel widths for precision (assume 1920px viewport)

**Components to Create**:
- `ScorecardModal.jsx` - Full scorecard with dismissals
- `WormModal.jsx` - Worm chart with wickets
- `ManhattanModal.jsx` - Manhattan with bowler names
- `PartnershipsModal.jsx` - Optimized partnerships

**Data Sources**:
- `matchStore.ballByBall` - All ball-by-ball data
- `matchStore.teams` - Team scores, wickets, overs
- `matchStore.innings` - Current/target scores
- `playerStore.getPlayer(playerId)` - Player details

**Success Criteria**:
- ✅ Expand buttons functional on all 4 tabs
- ✅ Modals open as full-screen overlays
- ✅ Scorecard shows dismissal details
- ✅ Worm chart has fall of wickets markers
- ✅ Manhattan shows bowler names below overs
- ✅ Partnerships spacing optimized
- ✅ Stats Hub width increased with reclaimed space

**Duration**: 6-8 hours

---

### Phase 5: Integration & Polish
**Goal**: Testing, optimization, responsive design, documentation updates

**Scope**:
1. **End-to-end testing**:
   - Test full pre-match flow → live match → stats expansion
   - Verify toss logic (user wins, AI wins, both bat/bowl decisions)
   - Test batting order drag-drop with various scenarios (wickets, order changes)
   - Verify contextual tactics tabs switch correctly at innings break
   - Test all modal expansions and close actions
2. **Performance optimization**:
   - Add `React.memo()` to new modal components
   - Memoize expensive calculations (stats aggregation, chart data)
   - Verify no unnecessary re-renders (use React DevTools Profiler)
3. **Responsive design**:
   - Test at 1920x1080, 1440p, 4K resolutions
   - Ensure HUD 2-row layout doesn't overflow
   - Verify modals scale correctly on different screens
   - Optional: Add mobile/tablet breakpoints (stack columns vertically)
4. **Design system compliance**:
   - Verify color palette usage (Cricket Green, Trophy Gold)
   - Check typography (Inter, SF Mono for numbers, 14px base)
   - Validate spacing (4px base unit: p-2, p-3, gap-2)
   - Ensure `<PlayerName>` and `<TeamName>` used for all entity references
5. **Accessibility**:
   - Add ARIA labels to expand buttons
   - Ensure keyboard navigation works (Tab, Enter, Escape)
   - Test screen reader compatibility for modals
6. **Documentation updates**:
   - Update `context.md` with final file list
   - Mark all tasks complete in `tasks.md`
   - Move folder to `docs/dev/completed/matchday-ui-polish/`
   - Update `ROADMAP.md` if applicable
7. **Browser compatibility**:
   - Test in Chrome, Edge, Firefox
   - Verify CSS scrollbar hiding works across browsers
   - Check drag-and-drop compatibility

**Testing Commands**:
- `npm run dev` - Start dev server and test manually
- `node src/test/demoInteractiveMatch.js` - Automated match test

**Success Criteria**:
- ✅ Full pre-match → live match flow works end-to-end
- ✅ All new features functional (HUD, tabs, drag-drop, modals)
- ✅ No console errors or warnings
- ✅ Performance meets standards (~50k+ balls/second in match engine)
- ✅ Design system compliance verified
- ✅ Documentation complete and moved to completed/

**Duration**: 4-6 hours

---

## Design System Compliance

### Color Palette
- **Cricket Green**: `#2D5F3F` (primary brand color)
- **Trophy Gold**: `#D4AF37` (accent, clickable entities)
- **Background**: `#0F1419` (primary), `#1A1F26` (secondary), `#242B33` (tertiary)
- **Text**: `#E8EAED` (primary), `#9AA0A6` (secondary), `#70757A` (tertiary)
- **Status Colors**: Green (positive), Red (negative), Yellow (warning)

### Typography
- **Font Family**: Inter, -apple-system (UI text)
- **Monospace**: SF Mono, Monaco (numbers, stats)
- **Base Size**: 14px (text-sm in Tailwind)
- **Headings**: 16px (text-base), 18px (text-lg), 20px (text-xl)

### Spacing
- **4px base unit**: Use Tailwind spacing (p-2, p-3, p-4, gap-2, gap-3)
- **Compact spacing**: Favor p-2 and p-3 over p-6 and p-8
- **Data-dense layouts**: Minimize whitespace for Football Manager aesthetic

### Icons
- **Lucide React only**: No custom SVG icons (use existing library)
- **Icon sizes**: 16px (default), 20px (medium), 24px (large)

### Clickable Entities (CRITICAL)
- **ALWAYS use** `<PlayerName playerId={id} />` for player names
- **ALWAYS use** `<TeamName teamId={id} />` for team names
- Ensures consistent clickable behavior across all screens

---

## Success Criteria

### Phase 1 - HUD
- ✅ 2-row header layout functional
- ✅ Team positioning fixed by innings order
- ✅ Batsmen/bowler/metrics organized correctly
- ✅ Gradient background uses team colors
- ✅ Metrics color-coded (green/red for RRR vs CRR)

### Phase 2 - Pre-Match
- ✅ 3-tab interface replaces wizard flow
- ✅ Preview tab shows match context + tactics summary
- ✅ Toss tab has animation and decision interface
- ✅ Lineups tab displays both teams with roles
- ✅ Toss logic works (random caller, winner, AI decision)

### Phase 3 - Tactics Hub
- ✅ Contextual tab visibility works (batting/bowling switch)
- ✅ Drag-and-drop batting order functional
- ✅ Batted/out players frozen correctly
- ✅ Bowling sub-tabs work (assignments + plans)
- ✅ Scrollbars hidden but scrolling works

### Phase 4 - Stats Hub
- ✅ Expand buttons functional on all tabs
- ✅ Modals open with detailed views
- ✅ Scorecard shows dismissal details
- ✅ Worm chart has fall of wickets markers
- ✅ Manhattan shows bowler names
- ✅ Partnerships spacing optimized

### Phase 5 - Polish
- ✅ End-to-end testing complete
- ✅ Performance optimized (React.memo, memoization)
- ✅ Design system compliance verified
- ✅ Documentation complete

---

## Future Enhancements

Documented in `docs/dev/planned/team-and-role-assets/`:

### Visual Assets (Separate Task - Game-Wide)
- **Team Logos**: Create 10 SVG logos for WPL teams (Mumbai, London, Melbourne, etc.)
- **Team Badges**: Create emblem-style badges for teams
- **Role Icons**: Create 4 SVG role icons (bat, ball, all-rounder, gloves for keeper)
- **Country Flags**: Optional, for player nationality display
- **Asset Style**: Minimalist, flat design, Cricket Manager color palette
- **Scope**: Game-wide feature affecting 20+ components (matchday, squad, league, transfers, auction, inbox, home)
- **Estimated Effort**: 14-19 hours

### Advanced Features (Future Phases)
- **HUD Row 3**: Add momentum indicator, partnership progress bar
- **Tactics Hub**: Team talk feature (motivational messages)
- **Stats Hub**: Comparison tool (compare 2 batsmen side-by-side)
- **Pre-Match**: Weather impact prediction, pitch report with graphics
- **Wagon Wheel**: Radial shot distribution visualization (already documented in planned/)

---

## Key Decisions

### Architecture Decisions
1. **Pre-Match Flow**: Replace PreMatchFlow.jsx entirely (not coexist as alternative)
2. **HUD Team Positioning**: Fixed by innings order (team batting first always on left)
3. **Tactics Drag-Drop**: Implement drag-and-drop for batting order (not arrow buttons)
4. **Asset Creation**: Defer team logos/badges and role icons to future enhancement
5. **Scrollbars**: Hide with CSS but preserve scroll functionality
6. **Stats Modals**: Full-screen overlays (not centered modals)

### Technical Decisions
1. **Drag-Drop Library**: Use `react-beautiful-dnd` or native HTML5 drag API
2. **Modal Pattern**: Follow existing PlayerCardModal/TeamCardModal structure
3. **State Management**: Continue using Zustand stores (matchStore, teamStore, playerStore)
4. **Responsive Strategy**: Desktop-first (1920x1080), mobile/tablet as optional enhancement
5. **Performance**: Apply React.memo to all new modal components

---

## References

- **Research Report**: `docs/dev/active/matchday-ui-polish/context.md`
- **Task Checklist**: `docs/dev/active/matchday-ui-polish/tasks.md`
- **Design System**: `docs/frontend/design-system.md`
- **Integration Patterns**: `docs/frontend/integration-patterns.md`
- **Existing Matchday UI**: `docs/dev/completed/matchday-ui-redesign/`
- **Match Engine**: `src/core/match-engine/core/MatchEngine.js`
- **Stores**: `src/stores/matchStore.js`, `src/stores/teamStore.js`, `src/stores/playerStore.js`
