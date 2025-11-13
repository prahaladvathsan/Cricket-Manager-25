# Matchday UI Redesign - Implementation Plan

**Status**: In Progress
**Started**: 2025-01-11
**Estimated Completion**: 15-20 hours

## Overview
Create a new **MatchdayUI.jsx** component with three-column layout: **Tactics Hub** (left) | **Pitch Visualization** (center) | **Stats Hub** (right). Focus on live match state with simple trajectory rendering initially, architected for future advanced animations.

## User Requirements
- Three-column layout (Tactics | Pitch Visualization | Stats)
- Wire existing tactics systems (acceleration, bowling plans, field formations)
- 2D pitch visualization with fielder positions and ball trajectories
- Stats hub with scorecard, run rate worm, manhattan chart, partnerships
- Simple instant path drawing for trajectories (extensible to advanced animation)
- Live match only (keep PreMatchFlow separate)
- Football Manager aesthetic with Cricket Manager design system

## Component Architecture

```
src/components/match/matchday/
├── MatchdayUI.jsx                    # Main container (3-column grid)
├── TacticsHub/
│   ├── TacticsHub.jsx                # Left column container with tabs
│   ├── BattingAccelerationPanel.jsx  # Batsman list with tier selectors
│   ├── BowlingPlansPanel.jsx         # Bowler list with plan dropdowns
│   └── FieldFormationPanel.jsx       # Formation selector (3 templates)
├── PitchVisualization/
│   ├── PitchVisualization.jsx        # Center column container
│   ├── CricketFieldSVG.jsx           # SVG field rendering
│   ├── FielderPositions.jsx          # 11 fielder dots
│   ├── BallTrajectoryLayer.jsx       # Trajectory path (extensible)
│   └── MatchScoreDisplay.jsx         # Score banner above pitch
└── StatsHub/
    ├── StatsHub.jsx                  # Right column container with tabs
    ├── LiveScorecard.jsx             # Adapted from MatchScorecard.jsx
    ├── RunRateWorm.jsx               # Line graph
    ├── ManhattanChart.jsx            # Bar chart
    └── PartnershipsPanel.jsx         # Partnership graphic
```

## Implementation Phases

### Phase 0: Documentation Setup ✅
- Create active development tracking folder
- Initialize plan.md, context.md, tasks.md
- Set up TodoWrite tracking

### Phase 1: Foundation & Component Structure
**Goal**: Create component hierarchy and routing

**Tasks**:
1. Create folder structure in `src/components/match/matchday/`
2. Build `MatchdayUI.jsx` with 3-column grid (30-40-30 split)
3. Add route in `App.jsx`: `/match/:matchId/live`
4. Update `Match.jsx` to provide navigation to new UI

**Layout Grid**:
```jsx
<div className="grid grid-cols-12 gap-4 p-4">
  <div className="col-span-3"> {/* Tactics Hub */}
  <div className="col-span-6"> {/* Pitch Visualization */}
  <div className="col-span-3"> {/* Stats Hub */}
</div>
```

### Phase 2: Tactics Hub (UI Wiring)
**Goal**: Wire existing tactics systems to UI controls

**Components**:
1. **BattingAccelerationPanel.jsx**
   - Wire to: `matchStore.tacticsState.currentAcceleration`
   - 6-tier selector: Blockade → Build → Rotate → Cruise → Blitz → Hit Out/Get Out
   - Highlight striker/non-striker
   - Auto/Manual mode toggle

2. **BowlingPlansPanel.jsx**
   - Wire to: `matchStore.tacticsState.bowlingPlans`
   - Two dropdowns per bowler: Line/Length + Variation
   - Highlight current bowler

3. **FieldFormationPanel.jsx**
   - Wire to: `teamStore.fieldFormation`
   - Three buttons: Attacking | Neutral | Defensive
   - Mini-map preview of formation

**Data Sources**:
- `src/data/config/tactics-config.json` (acceleration tiers)
- `src/data/config/bowling-plans-config.json` (plans)
- `src/data/config/field-positioning-config.json` (formations)

### Phase 3: Pitch Visualization (2D Rendering)
**Goal**: Create SVG-based cricket field with fielders and trajectories

**Components**:
1. **CricketFieldSVG.jsx**
   - Boundary circle (70m, white stroke)
   - Inner circle (30m, dashed)
   - Pitch rectangle (20.12m × 3.05m)
   - Stumps at pitch ends
   - SVG viewBox: `-80 -80 160 160`

2. **FielderPositions.jsx**
   - 11 colored circles at x,y coordinates
   - Data source: `FieldPositioningSystem.getCurrentPositions()`
   - Hover labels (fielder name + position)
   - Highlight closest fielder to last ball

3. **BallTrajectoryLayer.jsx** (Extensible Architecture)
   - Phase 3: Instant red path drawing
   - Data source: `matchStore.ballByBall[latest].trajectory`
   - Differentiate aerial (dashed curve) vs grounded (solid line)
   - **Future-ready**: Switch statement for animation modes (instant | animated | advanced)

4. **MatchScoreDisplay.jsx**
   - Compact score banner above pitch
   - Current score, overs, batsmen, bowler, run rates
   - Use `<PlayerName />` and `<TeamName />` components

**Data Transformations**:
- FieldPositioningSystem coordinates (meters) → SVG coordinates
- Trajectory data (direction, distance) → SVG path

### Phase 4: Stats Hub (Charts & Visualizations)
**Goal**: Build data visualizations with real-time updates

**Components**:
1. **LiveScorecard.jsx**
   - Adapt existing `MatchScorecard.jsx`
   - Batting/bowling tables with partnerships

2. **RunRateWorm.jsx**
   - Line chart: cumulative runs over balls
   - Data source: `matchStore.ballByBall` array
   - X-axis: Overs (0-20), Y-axis: Cumulative runs
   - Two lines in 2nd innings (actual vs required)

3. **ManhattanChart.jsx**
   - Bar chart: runs per over
   - Aggregate `ballByBall` by over number
   - Color code: 0-5 (green), 6-10 (yellow), 11+ (red)

4. **PartnershipsPanel.jsx**
   - Traditional cricket partnerships table
   - Data source: `matchStore.teams.batting.partnerships`
   - Highlight current partnership

### Phase 5: Integration & Polish
**Goal**: Real-time updates, responsive design, testing

**Tasks**:
1. Implement selective store subscriptions
2. Ensure real-time updates on ball completion
3. Responsive design: desktop (3-col), tablet/mobile (stack)
4. Performance optimization (React.memo, memoized selectors)
5. Test with `node src/test/demoInteractiveMatch.js`
6. Validate all tactics controls update matchStore

## Design System Compliance

**Color Palette**:
- Cricket Green: `#2D5F3F`
- Trophy Gold: `#D4AF37`
- Background: `#0F1419`, `#1A1F26`, `#242B33`
- Text: `#E8EAED`, `#9AA0A6`

**Typography**:
- Font: Inter, -apple-system
- Monospace: SF Mono, Monaco (for numbers)
- Base size: 14px

**Spacing**:
- 4px base unit (Tailwind: p-2, p-3, p-4, gap-2, gap-3)

**Clickable Entities** (CRITICAL):
- Always use `<PlayerName playerId={id} />`
- Always use `<TeamName teamId={id} />`

## Success Criteria
- ✅ Three-column layout functional on desktop
- ✅ All tactics controls wire to matchStore
- ✅ 2D pitch renders with fielder positions
- ✅ Ball trajectory displays instantly after each ball
- ✅ Scorecard, Run Rate Worm, Manhattan, Partnerships render correctly
- ✅ Components update in real-time as match progresses
- ✅ Design system applied consistently
- ✅ `<PlayerName />` and `<TeamName />` used for all entity references

## Future Enhancements
Documented in `docs/dev/planned/advanced-ball-animation/`:
- **Animated mode**: React Spring ball moving along path (1-2s)
- **Advanced mode**: Ball + fielders animated with interception logic
- **Wagon Wheel**: Radial shot distribution visualization

## Key Decisions
1. **New component** (MatchdayUI.jsx) instead of modifying existing
2. **Live match only** (PreMatchFlow remains separate)
3. **Simple instant trajectories** initially (extensible architecture)
4. **Must-have stats**: Scorecard, Run Rate Worm, Manhattan, Partnerships
5. **SVG-based rendering** for pitch visualization (not Canvas)

## References
- Research report: `docs/dev/active/matchday-ui-redesign/context.md`
- Design system: `docs/frontend/design-system.md`
- Integration patterns: `docs/frontend/integration-patterns.md`
- Match engine: `src/core/match-engine/core/MatchEngine.js`
- Field positioning: `src/core/match-engine/physics/FieldPositioningSystem.js`
- Trajectory: `src/core/match-engine/simulation/TrajectoryCalculator.js`
