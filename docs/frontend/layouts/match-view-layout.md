# Match View Layout

## Overview

The **Match View** is the core experience of Cricket Manager, where users watch their team play in real-time with full tactical control. This layout follows a **split-screen design** inspired by Football Manager's match engine, combining a 2D tactical pitch visualization with comprehensive controls and statistics.

---

## Design Philosophy

1. **Information at a Glance**: Critical match state always visible
2. **Tactical Control**: Easy access to acceleration and bowling plans
3. **Visual Clarity**: 2D pitch shows ball trajectory and field positions
4. **Progressive Disclosure**: Hide/show detailed stats as needed
5. **Immersive Experience**: Full-screen match focus with minimal distractions

---

## Layout Structure

### Full Layout Grid (Desktop)
```
+-------------------------------------------------------------------------+
|  MATCH HEADER (Fixed, 80px height)                                     |
|  Teams, Score, Overs, Target, Phase, Run Rate                          |
+------------------------------------+------------------------------------+
| LEFT PANEL (60% width)             | RIGHT PANEL (40% width)            |
| +--------------------------------+ | +--------------------------------+ |
| | 2D PITCH VISUALIZATION         | | | TACTICS CONTROL PANEL          | |
| | (Canvas - 800x600px)           | | |                                | |
| |                                | | | - Acceleration Tier Controls   | |
| | - Green pitch background       | | | - Bowling Plan Selector        | |
| | - Ball trajectory animation    | | | - Bowler Selection Dropdown    | |
| | - Fielder positions (dots)     | | | - Field Formation (future)     | |
| | - Shot zone heatmap overlay    | | +--------------------------------+ |
| | - Batsman/bowler icons         | |                                    |
| +--------------------------------+ | +--------------------------------+ |
|                                    | | CURRENT BALL INFO              | |
| +--------------------------------+ | |                                | |
| | CURRENT PARTNERSHIP            | | | - Striker stats               | |
| |                                | | | - Bowler stats                | |
| | Striker:    R. Sharma  45(32)  | | | - Last 6 balls                | |
| | Non-striker: V. Kohli  12(8)   | | | - Match situation             | |
| | Partnership: 57 (40 balls)     | | +--------------------------------+ |
| +--------------------------------+ |                                    |
|                                    | +--------------------------------+ |
| +--------------------------------+ | | LIVE SCORECARD (Collapsible)   | |
| | COMMENTARY FEED (Scrollable)   | | |                                | |
| |                                | | | Batting Table:                 | |
| | Over 15.3: Wide! Down leg side | | |  Batsman  R  B  4s 6s  SR      | |
| | Over 15.2: SIX! Sharma pulls   | | |  Sharma   45 32  3  2  140.6   | |
| |   over mid-wicket for maximum  | | |  Kohli    12  8  1  0  150.0   | |
| | Over 15.1: DOT. Good length    | | |                                | |
| |   defended back to bowler      | | | Bowling Table:                 | |
| | Over 14.6: FOUR! Driven through| | |  Bowler   O  M  R  W  Econ      | |
| |   covers, beautiful timing     | | |  Bumrah  4  1  18 2  4.50      | |
| | [Auto-scroll to latest]        | | +--------------------------------+ |
| +--------------------------------+ |                                    |
+------------------------------------+------------------------------------+
|  BOTTOM ACTION BAR (Optional - 48px height)                            |
|  [Pause] [Skip to End of Over] [Simulate to End] [Settings]           |
+-------------------------------------------------------------------------+
```

### Responsive Behavior

#### Tablet (768px - 1024px)
- **Stack vertically**: Pitch on top, controls/stats below
- Pitch reduces to 600x450px
- Commentary moves to bottom collapsible panel

#### Mobile (< 768px)
- **Single column**: Full mobile scorecard view
- Pitch visualization optional (user toggle)
- Swipe between tabs: Scorecard | Commentary | Stats

---

## Component Breakdown

### 1. Match Header (`MatchHeader.jsx`)

**Purpose**: Display real-time match score and critical match state

**Layout**:
```
+-------------------------------------------------------------------------+
| [Team Badge] Mumbai Thunders  156/4 (15.3 ov)  vs  London Lions        |
|                                                                         |
| Target: 178  |  Required: 22 from 27 balls  |  RRR: 4.89              |
| Phase: Death Overs  |  Partnership: 57(40)  |  Last: . 6 W 4 1 .       |
+-------------------------------------------------------------------------+
```

**Data Sources**: `matchStore` state
```javascript
const { teams, currentBall, innings, tacticsState } = useMatchStore();
```

**Key Information**:
- **Left**: Batting team name, score, wickets, overs
- **Center**: Target (2nd innings), Required runs/balls, RRR
- **Right**: Opposition team name
- **Bottom Bar**: Phase, partnership, last 6 balls indicator

**Styling**:
- Background: `bg-bg-tertiary`
- Border: `border-b-2 border-border-primary`
- Height: `80px`
- Font: Team names in `font-semibold text-xl`, stats in `font-mono`

---

### 2. Pitch Visualization (`PitchVisualization2D.jsx`)

**Purpose**: Real-time 2D tactical view of the cricket pitch using Canvas/WebGL

**Dimensions**: 800x600px (scales responsively)

**Visual Layers** (bottom to top):
1. **Background Layer**: Green pitch oval + white boundary rope
2. **Zone Overlay**: Semi-transparent shot zone heatmap (optional toggle)
3. **Fielder Layer**: Colored dots for fielding positions + labels on hover
4. **Ball Trajectory Layer**: Animated red arc showing ball path
5. **Player Icons**: Batsman (striker/non-striker) and bowler stick figures

**Integration with Physics Engine**:
```javascript
import FieldPositioningSystem from 'src/core/match-engine/physics/FieldPositioningSystem';
import BallTrajectoryPhysics from 'src/core/match-engine/physics/BallTrajectoryPhysics';

// Get fielder positions for current formation
const fielderPositions = fieldPositioning.getFormationPositions('attacking');

// Animate ball trajectory after each ball
const trajectory = ballPhysics.calculateTrajectory(contactResult);
animateBallPath(trajectory);
```

**Rendering Approach**:
- **Canvas 2D** for static elements (pitch, boundary, fielders)
- **Animation Loop** for ball trajectory (requestAnimationFrame)
- **SVG Overlay** for labels and interactive elements (optional)

**Visual Details**:
- **Pitch**: Oval shape, `#2D5F3F` (cricket-primary) fill
- **Boundary**: White circle, 2px stroke
- **Wickets**: Small rectangles at pitch center
- **Fielders**: 8px diameter circles, team color fill, white border
  - Hover: Show fielder name tooltip
  - Click: Show fielder stats (future enhancement)
- **Ball**: 6px diameter red circle with shadow
  - Animate along trajectory curve
  - Fade out on completion
- **Batsman**: Simple stick figure or icon at striker/non-striker ends
- **Bowler**: Icon at bowling crease

**Shot Zone Heatmap** (Optional Overlay):
- Semi-transparent gradient overlay
- Shows where batsman has scored runs this innings
- Color gradient: Blue (few runs) → Yellow → Red (many runs)
- Toggle on/off with button

**Component Props**:
```typescript
interface PitchVisualizationProps {
  ballResult: BallResult | null;        // Latest ball to animate
  fielders: FielderPosition[];          // Current field setup
  currentBatsman: Player;               // Striker
  currentBowler: Player;                // Bowler
  showShotZones: boolean;               // Heatmap toggle
  shotZoneData: ShotZone[];             // Historical shot data
  width?: number;                       // Canvas width
  height?: number;                      // Canvas height
}
```

---

### 3. Current Partnership Widget (`PartnershipWidget.jsx`)

**Purpose**: Show current batting partnership details

**Layout**:
```
+------------------------------------+
| CURRENT PARTNERSHIP                |
+------------------------------------+
| Striker:     R. Sharma     45(32)  |
|              SR: 140.6  |  4s: 3  6s: 2 |
+------------------------------------+
| Non-striker: V. Kohli      12(8)   |
|              SR: 150.0  |  4s: 1  6s: 0 |
+------------------------------------+
| Partnership: 57 runs (40 balls)    |
| Run Rate: 8.55                     |
+------------------------------------+
```

**Data Source**:
```javascript
const striker = useMatchStore(state => state.innings.striker);
const nonStriker = useMatchStore(state => state.innings.nonStriker);
const strikerStats = getBatsmanStats(striker);
```

**Styling**:
- Card with `bg-bg-secondary`, `border-border-primary`
- Batsman names in `font-semibold`
- Stats in `font-mono text-sm`
- On-strike batsman highlighted with `border-l-4 border-cricket-accent`

---

### 4. Tactics Control Panel (`TacticsControlPanel.jsx`)

**Purpose**: User controls for in-match tactical decisions

**Layout**:
```
+------------------------------------+
| TACTICS CONTROL                    |
+------------------------------------+
| BATTING ACCELERATION               |
|                                    |
| Striker (R. Sharma):               |
| [Defend] [Rotate] [Attack] [T20]  |
| Currently: Attack                  |
|                                    |
| Non-striker (V. Kohli):            |
| [Defend] [Rotate] [Attack] [T20]  |
| Currently: Rotate                  |
+------------------------------------+
| BOWLING PLAN                       |
|                                    |
| Current Bowler: J. Bumrah          |
| [Select Bowler ▼]                  |
|                                    |
| Line & Length:                     |
| [Yorker] [Full] [Good] [Short]    |
| [Leg] [Middle] [Off] [Wide]       |
|                                    |
| Variations:                        |
| [Slower] [Bouncer] [Spin]         |
+------------------------------------+
| [Apply Changes]                    |
+------------------------------------+
```

**Components**:
- **AccelerationTierSelector**: Buttons for each tier (Defend, Rotate, Attack, Assault, T20)
- **BowlingPlanSelector**: Line, length, and variation options
- **BowlerDropdown**: Select current bowler (must respect over limits)

**Data Binding**:
```javascript
const { tacticsState, updateTacticsState } = useMatchStore();

const handleAccelerationChange = (batsman, tier) => {
  updateTacticsState({
    currentAcceleration: {
      ...tacticsState.currentAcceleration,
      [batsman]: tier
    }
  });
};
```

**Styling**:
- Segmented button groups for acceleration tiers
- Active tier: `bg-cricket-primary`, inactive: `bg-bg-tertiary`
- Bowling plan grid layout
- Apply button: `bg-cricket-accent` with `hover:bg-cricket-accent-light`

---

### 5. Current Ball Info (`CurrentBallInfo.jsx`)

**Purpose**: Detailed info about the current ball and match situation

**Layout**:
```
+------------------------------------+
| CURRENT BALL                       |
+------------------------------------+
| Over: 15.3  |  Ball: 3 of 6        |
+------------------------------------+
| Batsman: Rohit Sharma              |
|  Runs: 45  |  Balls: 32  |  SR: 140.6 |
|  Form: Good  |  Confidence: 75%    |
+------------------------------------+
| Bowler: Jasprit Bumrah             |
|  Overs: 3.3  |  Runs: 18  |  Wkts: 2  |
|  Economy: 4.50  |  Energy: 82%     |
+------------------------------------+
| Last 6 Balls:                      |
| [.] [6] [W] [4] [1] [.]            |
+------------------------------------+
| Match Situation:                   |
| Required: 22 from 27 balls         |
| RRR: 4.89  |  Pressure: HIGH      |
+------------------------------------+
```

**Data Source**:
```javascript
const ballInfo = useMatchStore(state => ({
  over: state.currentBall.over,
  ball: state.currentBall.ball,
  striker: state.innings.striker,
  bowler: state.innings.bowler,
  lastSixBalls: state.ballByBall.slice(-6)
}));
```

**Features**:
- **Last 6 balls indicator**: Visual representation (dots, runs, wickets)
  - DOT: Gray circle
  - Runs: Number in circle with blue/green color
  - Wicket: Red circle with "W"
  - Boundary: Gold border for 4s, red fill for 6s
- **Form/Confidence bars**: Progress bars showing player state
- **Pressure indicator**: Color-coded (Low: Green, Med: Yellow, High: Red)

---

### 6. Live Scorecard (`LiveScorecard.jsx`)

**Purpose**: Comprehensive batting and bowling figures

**Layout**:
```
+------------------------------------+
| LIVE SCORECARD         [Expand ▼]  |
+------------------------------------+
| BATTING                            |
+------------------------------------+
| Batsman         R    B  4s 6s  SR  |
| R. Sharma*      45   32  3  2  140.6|
| V. Kohli        12    8  1  0  150.0|
| S. Iyer         out   -  -  -  -   |
| H. Pandya       out   -  -  -  -   |
+------------------------------------+
| BOWLING                            |
+------------------------------------+
| Bowler          O   M   R   W  Econ|
| J. Bumrah       3.3 0  18   2  4.50|
| T. Boult        4   1  22   1  5.50|
| R. Ashwin       3   0  28   0  9.33|
+------------------------------------+
| FALL OF WICKETS                    |
| 1-45 (Iyer, 8.2)  2-89 (Gill, 12.4)|
+------------------------------------+
```

**Features**:
- **Collapsible**: Expand/collapse to save space
- **Sortable columns**: Click headers to sort (future)
- **Highlight active players**: Striker (*), current bowler (bold)
- **Monospace numbers**: All stats in `font-mono` for alignment
- **Hover tooltips**: Show dismissal details

**Data Source**:
```javascript
const scorecard = useMatchStore(state => ({
  battingFigures: state.teams.batting,
  bowlingFigures: state.teams.bowling.bowlingFigures,
  fallOfWickets: state.teams.batting.fallOfWickets
}));
```

**Styling**:
- Compact table with `text-sm`
- Striped rows: Alternate `bg-bg-secondary` and `bg-bg-tertiary`
- Active batsman: `bg-cricket-primary bg-opacity-20`
- Out batsmen: `text-text-tertiary`

---

### 7. Commentary Feed (`CommentaryFeed.jsx`)

**Purpose**: Ball-by-ball text commentary in cricket broadcast style

**Layout**:
```
+------------------------------------+
| COMMENTARY            [Clear] [⚙]  |
+------------------------------------+
| 15.3 overs: Wide! Down the leg    |
| side, Sharma looks to flick but   |
| misses. Wasted delivery.          |
|                                    |
| 15.2 overs: SIX! Sharma picks the |
| length early and pulls it over    |
| mid-wicket. Clean strike!         |
|                                    |
| 15.1 overs: DOT. Good length on   |
| off stump, defended back to       |
| bowler. Solid technique.          |
|                                    |
| 14.6 overs: FOUR! Driven through  |
| covers with perfect timing.       |
| Exquisite shot from Kohli.        |
|                                    |
| [Auto-scroll enabled]             |
+------------------------------------+
```

**Features**:
- **Auto-scroll**: Automatically scroll to latest ball
- **Color coding**:
  - Wickets: Red text
  - Boundaries: Gold text (4s) or Red text (6s)
  - Dots: Normal text
  - Extras: Italic text
- **Contextual commentary**: Generated based on ball outcome
- **Dismiss/Clear**: Button to clear commentary history
- **Settings**: Toggle verbosity (compact vs detailed)

**Data Source**:
```javascript
const commentary = useMatchStore(state => state.commentary);

useEffect(() => {
  // Auto-scroll to bottom when new commentary added
  commentaryRef.current?.scrollTo(0, commentaryRef.current.scrollHeight);
}, [commentary.length]);
```

**Commentary Generation**:
```javascript
function generateCommentary(ballResult) {
  const { outcome, runs, isWicket, dismissalType, striker, bowler } = ballResult;

  if (isWicket) {
    return `WICKET! ${striker.name} ${dismissalType} for ${runs}. ${bowler.name} strikes!`;
  } else if (runs === 6) {
    return `SIX! ${striker.name} launches it over the boundary. Maximum!`;
  } else if (runs === 4) {
    return `FOUR! ${striker.name} finds the gap perfectly. Boundary!`;
  } else if (runs === 0) {
    return `DOT. Good delivery from ${bowler.name}, defended.`;
  } else {
    return `${runs} run${runs > 1 ? 's' : ''}. Good running between the wickets.`;
  }
}
```

---

### 8. Bottom Action Bar (`MatchActionBar.jsx`)

**Purpose**: Simulation control buttons

**Layout**:
```
+-------------------------------------------------------------------------+
| [⏸ Pause] [⏭ Skip to End of Over] [⏩ Simulate to End] [⚙ Settings]   |
+-------------------------------------------------------------------------+
```

**Actions**:
- **Pause/Resume**: Toggle match simulation
- **Skip to End of Over**: Fast-forward to next over
- **Simulate to End**: Auto-simulate to match completion
- **Settings**: Open modal for simulation speed, commentary verbosity, etc.

---

## State Management Integration

### Zustand Store Connections

```javascript
// Match View Container
import useMatchStore from 'src/stores/matchStore';
import usePlayerStore from 'src/stores/playerStore';
import useTeamStore from 'src/stores/teamStore';

function MatchView() {
  // Subscribe to relevant state slices
  const matchState = useMatchStore(state => ({
    teams: state.teams,
    innings: state.innings,
    currentBall: state.currentBall,
    tacticsState: state.tacticsState,
    ballByBall: state.ballByBall,
    commentary: state.commentary
  }));

  const updateTactics = useMatchStore(state => state.updateTacticsState);

  // ... render components
}
```

### Real-Time Update Pattern

```javascript
// In MatchEngine.simulateBall()
async simulateBall(ballContext) {
  const ballResult = await this.ballSimulator.simulateBall(ballContext);

  // Update match store
  matchStore.getState().processBallResult(ballResult);

  // Emit event for UI updates
  eventBus.emit('ball-simulated', ballResult);

  return ballResult;
}

// In PitchVisualization2D.jsx
useEffect(() => {
  const handleBallSimulated = (ballResult) => {
    animateBallTrajectory(ballResult.trajectory);
    updateFielders(ballResult.fielders);
  };

  eventBus.on('ball-simulated', handleBallSimulated);

  return () => {
    eventBus.off('ball-simulated', handleBallSimulated);
  };
}, []);
```

---

## Responsive Design

### Desktop (> 1024px)
- Full split-screen layout as shown above
- 60/40 pitch-to-controls ratio
- All components visible

### Tablet (768px - 1024px)
- **Vertical stack**: Pitch on top, controls/stats below
- Pitch: 600x450px
- Commentary: Collapsible panel at bottom
- Scorecard: Always expanded

### Mobile (< 768px)
- **Tab-based layout**: Scorecard | Pitch | Commentary | Stats
- Pitch: Optional toggle (off by default to save performance)
- Simplified controls: Dropdown for tactics
- Header: Compact score display

---

## Performance Considerations

### Canvas Optimization
- **Static elements**: Redraw only on field changes (not every frame)
- **Ball animation**: Use requestAnimationFrame with delta time
- **Culling**: Don't render off-screen elements
- **FPS target**: 60fps for smooth animations

### State Update Batching
```javascript
// Batch updates for multiple balls during fast-forward
function simulateOverFast() {
  const updates = [];

  for (let i = 0; i < 6; i++) {
    const ballResult = simulateBall();
    updates.push(ballResult);
  }

  // Single state update with all ball results
  matchStore.getState().processBallBatch(updates);
}
```

### Commentary Rendering
- **Virtual scrolling**: Render only visible commentary items
- **Limit history**: Keep last 100 balls in memory, archive rest
- **Lazy loading**: Load older commentary on scroll up

---

## Accessibility

### Keyboard Navigation
- **Tab**: Navigate between controls
- **Space**: Pause/Resume match
- **Arrow keys**: Adjust acceleration tiers
- **Enter**: Apply tactics changes

### Screen Reader Support
- **Live regions**: Announce score updates and wickets
- **ARIA labels**: All buttons and controls
- **Alt text**: Ball outcome descriptions

### Color Accessibility
- **High contrast**: Ensure 7:1 ratio for text
- **Not color-only**: Use icons for wickets/boundaries in addition to color
- **Focus indicators**: Visible keyboard focus outlines

---

## Implementation Priority

### Phase 1: MVP (Week 1-2)
1. ✅ Match Header with live score
2. ✅ Basic 2D Pitch (static fielders, no animation)
3. ✅ Current Ball Info widget
4. ✅ Commentary Feed
5. ✅ Simple Tactics Controls (acceleration only)

### Phase 2: Enhanced (Week 3)
6. Ball trajectory animation
7. Live Scorecard with expand/collapse
8. Partnership Widget
9. Full bowling plan controls
10. Bottom Action Bar

### Phase 3: Polish (Week 4)
11. Shot zone heatmap overlay
12. Fielder hover tooltips
13. Advanced animations and transitions
14. Mobile responsive layout
15. Settings modal for simulation options

---

## File Structure

```
src/components/match/
  MatchView.jsx                  # Main container
  MatchHeader.jsx                # Score header
  PitchVisualization2D.jsx       # Canvas pitch
  PartnershipWidget.jsx          # Partnership stats
  TacticsControlPanel.jsx        # Tactics controls
  CurrentBallInfo.jsx            # Ball details
  LiveScorecard.jsx              # Batting/bowling tables
  CommentaryFeed.jsx             # Commentary
  MatchActionBar.jsx             # Bottom controls

src/hooks/
  useMatchSimulation.js          # Match engine hook
  usePitchAnimation.js           # Canvas animation hook

src/utils/
  commentaryGenerator.js         # Commentary text generation
  canvasRenderer.js              # Canvas drawing utilities
  pitchGeometry.js               # Pitch coordinate calculations
```

---

## Next Steps

1. ✅ Layout documented
2. **Create individual component specs** for each widget
3. **Build PitchVisualization2D** component first (highest complexity)
4. **Wire TacticsControlPanel** to match engine
5. **Test real-time updates** with actual match simulation
