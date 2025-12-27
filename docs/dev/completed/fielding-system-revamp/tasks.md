# Fielding System Revamp - Task Breakdown

## Task Status Legend
- [ ] Not started
- [→] In progress
- [✓] Completed
- [✗] Blocked/Cancelled

---

## PHASE 1: Fix Critical Bugs & Add Stats (P0)
**Estimated:** 1-2 hours

### 1.1 Fix Scorecard Dismissal Display Bug
- [ ] Read current ScorecardModal.jsx implementation
- [ ] Update line 70-72 to use `ball.fielderId` instead of `ball.metadata.fieldingResult.fielder`
- [ ] Update line 72 to use `ball.fielderName` for display fallback
- [ ] Test with existing match data containing dismissals
- [ ] Verify fielder names appear in dismissal text
- [ ] Test all dismissal types: caught, caught_behind, stumped, run_out

### 1.2 Fix Wicketkeeper Position Assignment
- [ ] Read MatchEngine.setupFieldFormation() current implementation
- [ ] Add logic to find wicketkeeper by role before general fielder assignment
- [ ] Ensure wicketkeeper assigned to position index 1 (keeper position)
- [ ] Assign remaining 10 players to other positions
- [ ] Update bowler swap logic to preserve wicketkeeper position
- [ ] Test that wicketkeeper is always at (0, 20) coordinates
- [ ] Verify caught_behind and stumped dismissals work correctly

### 1.3 Add Fielding Statistics Aggregation
- [ ] Create `src/utils/fieldingStatsCalculator.js`
- [ ] Implement `extractFieldingStats(ballByBall)` function
- [ ] Track catches taken per fielder
- [ ] Track run-outs effected per fielder
- [ ] Track dropped catches per fielder (if fieldingAction.type === 'catch' && success === false)
- [ ] Integrate into player statistics display
- [ ] Add fielding stats to match summary
- [ ] Test with existing match data

---

## PHASE 2: Expand Position System & Rules Engine (P0)
**Estimated:** 3-4 hours

### 2.1 Create Comprehensive Fielding Position Database
- [ ] Create `src/data/config/fielding-positions-complete.json`
- [ ] Define all 35+ positions from research with structure:
  ```json
  {
    "name": "first_slip",
    "displayName": "First Slip",
    "x": -5,
    "y": 6,
    "polarAngle": 135,
    "polarDistance": 7.8,
    "zone": "close",
    "role": "attacking",
    "bowlingTypes": ["pace", "swing"],
    "description": "Close catching position next to wicketkeeper"
  }
  ```
- [ ] Add all behind-wicket positions (12 positions)
- [ ] Add all off-side positions (14 positions)
- [ ] Add all leg-side positions (13 positions)
- [ ] Add special positions (cow corner, ravine, straight hit)
- [ ] Validate coordinates are within field dimensions (70m boundary)
- [ ] Test position loading in FieldPositioningSystem

### 2.2 Build T20 Rules Validation Engine
- [ ] Create `src/core/match-engine/validation/FieldingRulesValidator.js`
- [ ] Implement `validatePowerplayRestrictions(positions, over)`:
  - [ ] Check max 2 fielders outside 30-yard circle
  - [ ] Check min 2 fielders in close catching positions (within 15 yards)
- [ ] Implement `validatePostPowerplayRestrictions(positions)`:
  - [ ] Check max 5 fielders outside 30-yard circle
- [ ] Implement `validateLegSideRestrictions(positions)`:
  - [ ] Check max 5 fielders on leg side (x < 0)
  - [ ] Check max 2 fielders behind square leg (quadrant check)
- [ ] Implement `getViolations(positions, over)`:
  - [ ] Return array of violation objects with description and affected positions
- [ ] Write unit tests for all validation functions
- [ ] Test with all 15 field templates

### 2.3 Expand Formation Templates to 15
- [ ] Read current `field-positioning-config.json` structure
- [ ] Add 5 attacking templates:
  - [ ] 1. Powerplay swing attack (2-3 slips, gully, point, cover, mid-off, square leg, deep fine leg, deep backward point)
  - [ ] 2. Pace slip cordon (3 slips, gully, point, mid-off, mid-on, fine leg, deep third man)
  - [ ] 3. Spin attack (slip, silly point, short cover, point, cover, mid-off, short mid-wicket, deep mid-wicket, deep point)
  - [ ] 4. Ultra-aggressive (slip, leg slip, short leg, silly point, gully, cover, mid-off, mid-on, deep fine leg)
  - [ ] 5. Leg-spin attack (slip, leg slip, silly point, point, cover, mid-off, short fine leg, deep fine leg, deep mid-wicket)
- [ ] Add 5 balanced templates:
  - [ ] 1. Standard powerplay (slip, point, cover, mid-off, mid-on, square leg, short fine leg, deep cover, deep fine leg)
  - [ ] 2. Middle overs pace (backward point, point, cover, mid-off, mid-on, mid-wicket, deep square leg, deep point, deep mid-wicket)
  - [ ] 3. Off-spin middle (point, cover, short third man, short fine leg, mid-wicket, deep square leg, deep mid-wicket, long on, long off, sweeper cover)
  - [ ] 4. Leg-spin middle (point, cover, short third man, fine leg, long on, long off, deep mid-wicket, deep square leg, sweeper cover)
  - [ ] 5. Off-side specialist (backward point, point, cover point, cover, extra cover, mid-off, mid-on, deep cover, third man)
- [ ] Add 5 defensive templates:
  - [ ] 1. Death standard (point, cover, mid-wicket, short third man, long on, long off, deep mid-wicket, deep square leg, deep cover)
  - [ ] 2. Ring fence (short third man, short fine leg, point, cover, long on, long off, deep mid-wicket, deep square leg, third man)
  - [ ] 3. Leg-side specialist (short third man, backward point, point, cover point, mid-off, mid-on, deep extra cover, third man, square leg)
  - [ ] 4. Slower ball field (short third man, point, cover, mid-wicket, long on, long off, deep mid-wicket, deep square leg, fine leg)
  - [ ] 5. Bouncer field (point, cover, mid-off, mid-on, deep fine leg, deep square leg, long on, long off, third man)
- [ ] Add metadata to each template:
  ```json
  {
    "name": "powerplay_swing_attack",
    "displayName": "Powerplay Swing Attack",
    "phase": "powerplay",
    "bowlingType": "pace",
    "isAttacking": true,
    "description": "Aggressive field with 2-3 slips when ball is swinging",
    "positions": [...]
  }
  ```
- [ ] Separate powerplay and post-powerplay versions where needed
- [ ] Validate all templates pass rules validation
- [ ] Test loading all templates in FieldPositioningSystem

---

## PHASE 3: User-Controlled Field Setup UI (P1)
**Estimated:** 6-8 hours

### 3.1 Create Fielding Setup Tab Component
- [ ] Create `src/components/tactics/tabs/FieldingSetupTab.jsx`
- [ ] Add powerplay/post-powerplay toggle selector
- [ ] Add template category tabs (Attacking/Balanced/Defensive)
- [ ] Import FieldTemplateSelector component
- [ ] Import FieldVisualEditor component
- [ ] Import PlayerPositionAssignment component
- [ ] Add save/reset buttons
- [ ] Integrate with TacticsPage.jsx
- [ ] Test tab switching and data flow

### 3.2 Build Field Template Selector Component
- [ ] Create `src/components/tactics/tabs/FieldTemplateSelector.jsx`
- [ ] Display 15 templates in grid/list view
- [ ] Group by category (attacking/balanced/defensive)
- [ ] Show template metadata (phase, bowling type, description)
- [ ] Add visual mini-preview for each template
- [ ] Implement template selection handler
- [ ] Add "Customize" button to edit selected template
- [ ] Style with Football Manager aesthetic
- [ ] Test template loading and selection

### 3.3 Implement Field Visual Editor
- [ ] Create `src/components/tactics/tabs/FieldVisualEditor.jsx`
- [ ] Render cricket field with:
  - [ ] Green background
  - [ ] Pitch rectangle
  - [ ] 30-yard circle (semi-transparent)
  - [ ] Boundary circle
  - [ ] Leg-side demarcation line
- [ ] Display all 11 fielder positions as markers
- [ ] Color-code markers (wicketkeeper, bowler, fielders)
- [ ] Add position name labels
- [ ] Show rule violation warnings visually:
  - [ ] Red circle outline if too many outside circle
  - [ ] Red markers if leg-side violation
- [ ] Display current formation name
- [ ] Make responsive to container size
- [ ] Test with all 15 templates

### 3.4 Add Drag-and-Drop Functionality (Optional Enhancement)
- [ ] Make fielder markers draggable
- [ ] Implement drag handler with position tracking
- [ ] Snap to nearest valid position on drop
- [ ] Update position assignment on drop
- [ ] Trigger validation on position change
- [ ] Show real-time violation feedback during drag
- [ ] Add undo/redo functionality
- [ ] Test drag-and-drop across all positions
- [ ] Ensure wicketkeeper and bowler positions are locked

### 3.5 Build Player Position Assignment Interface
- [ ] Create `src/components/tactics/tabs/PlayerPositionAssignment.jsx`
- [ ] Display list of 11 fielding positions
- [ ] Add dropdown per position to select player
- [ ] Show player fielding attributes next to each option:
  - [ ] Catching rating
  - [ ] Speed/agility rating
  - [ ] Throwing rating
- [ ] Lock wicketkeeper to keeper position (no dropdown)
- [ ] Lock current bowler to bowler position (auto-assigned)
- [ ] Highlight recommended players per position based on attributes
- [ ] Add validation for duplicate assignments
- [ ] Test with full squad of players

### 3.6 Integrate Rule Validation into UI
- [ ] Import FieldingRulesValidator
- [ ] Run validation on every position change
- [ ] Display violations in UI:
  - [ ] Warning banner at top
  - [ ] Highlighted positions in visual editor
  - [ ] Violation count and description
- [ ] Disable save button if violations exist
- [ ] Add "Auto-fix" button to resolve common violations
- [ ] Test all validation scenarios

---

## PHASE 4: Enhanced Match Engine Integration (P1)
**Estimated:** 2-3 hours

### 4.1 Store Field Setups in State
- [ ] Decide: Create new tacticsStore or extend teamStore
- [ ] Add field setup state structure:
  ```javascript
  fieldSetups: {
    powerplay: {
      template: 'powerplay_swing_attack',
      positions: [...],
      playerAssignments: { position1: playerId1, ... }
    },
    postPowerplay: {
      template: 'death_standard',
      positions: [...],
      playerAssignments: { position2: playerId2, ... }
    }
  }
  ```
- [ ] Implement save action
- [ ] Implement load action
- [ ] Add default field setups for new teams
- [ ] Persist to localStorage
- [ ] Test save/load cycle

### 4.2 Integrate User Field Setups with Match Simulation
- [ ] Update MatchEngine.setupFieldFormation() to accept custom positions
- [ ] Load user field setup from store at match start
- [ ] Switch from powerplay to post-powerplay formation at over 7
- [ ] Maintain wicketkeeper and bowler assignments during switches
- [ ] Test custom formations in interactive match
- [ ] Test formation switch at over 7

### 4.3 Enhanced AI Field Selection
- [ ] Update AIMatchController.selectFieldFormation()
- [ ] Implement intelligent template selection:
  - [ ] Consider match phase (powerplay/middle/death)
  - [ ] Consider bowling type (pace/spin)
  - [ ] Consider match situation (ahead/behind, wickets lost)
  - [ ] Consider captain personality (if available)
- [ ] Create decision tree for AI template selection
- [ ] Test AI selection across various match scenarios
- [ ] Verify AI respects T20 rules

### 4.4 Dynamic Field Changes (Optional)
- [ ] Allow field changes between overs in interactive matches
- [ ] Add "Change Field" button in match UI
- [ ] Show AI suggestions for field changes
- [ ] Allow user to override AI
- [ ] Update fielding positions mid-match
- [ ] Test field changes during interactive match

### 4.5 Fielding Effectiveness Metrics (Optional)
- [ ] Calculate field effectiveness rating (0-100)
- [ ] Show coverage heat map
- [ ] Highlight gaps in field placement
- [ ] Suggest improvements based on batter strengths
- [ ] Display in tactics screen

---

## PHASE 5: UI/UX Polish & Testing (P2)
**Estimated:** 2-3 hours

### 5.1 Update Tactics Page Integration
- [ ] Add "Fielding Setup" tab to TacticsPage.jsx
- [ ] Ensure consistent styling with other tabs
- [ ] Add tab icon (Lucide React)
- [ ] Test tab navigation
- [ ] Add help tooltip explaining fielding setup

### 5.2 Match View Enhancements
- [ ] Add fielding mini-map to MatchdayUI
- [ ] Show current field positions
- [ ] Highlight fielder involved in each ball
- [ ] Animate fielder movements (optional)
- [ ] Add fielding stats to live match display
- [ ] Test visual feedback during match

### 5.3 Comprehensive Testing
- [ ] Test all 15 templates load correctly
- [ ] Verify each template passes rule validation
- [ ] Test powerplay vs post-powerplay switching
- [ ] Verify wicketkeeper always at keeper position
- [ ] Test bowler rotation maintains correct positions
- [ ] Test custom field setups save and load
- [ ] Test AI template selection logic
- [ ] Verify dismissal details display correctly
- [ ] Test fielding stats aggregation
- [ ] Run full match with custom field setup
- [ ] Run league simulation to verify AI fields work
- [ ] Performance test: Ensure validation doesn't slow simulation

### 5.4 Documentation Updates
- [ ] Update CLAUDE.md with fielding setup instructions
- [ ] Add fielding system to docs/architecture/system-overview.md
- [ ] Create user guide for fielding setup
- [ ] Document all 15 field templates with use cases
- [ ] Update ROADMAP.md with completion status
- [ ] Move from active to completed in dev docs

---

## BONUS TASKS (If Time Permits)

### Bonus 1: Fielding Attribute Enhancements
- [ ] Review player database fielding attributes
- [ ] Add position-specific attribute requirements
- [ ] Highlight poor fielder placements (e.g., slow player at point)
- [ ] Add attribute-based fielding effectiveness modifier

### Bonus 2: Advanced Visualizations
- [ ] Coverage heat map showing field coverage
- [ ] Opponent batter heat map integration
- [ ] Field effectiveness rating visualization
- [ ] Runs saved tracking and display

### Bonus 3: Historical Field Tracking
- [ ] Track field setups used in each match
- [ ] Show field effectiveness statistics over time
- [ ] Compare user fields vs AI fields performance
- [ ] Add field setup history to match reports

---

## Progress Summary

**Total Tasks:** ~140 tasks
**Completed:** 0 tasks (0%)
**In Progress:** 0 tasks
**Blocked:** 0 tasks
**Remaining:** 140 tasks

---

## Notes

- Tasks are ordered by dependency - complete in order where possible
- Optional tasks marked as "(Optional)" or in Bonus section
- Testing tasks included in each phase - don't skip these
- Update this file as tasks are completed to track progress
