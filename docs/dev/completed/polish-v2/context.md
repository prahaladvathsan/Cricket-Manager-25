# Context: Polish v2 Implementation

## Current State
✅ Task 1 (Seasonal Loop) - COMPLETE
✅ Task 2 (Injury Tracking) - COMPLETE
✅ Critical Fix: Auction AI Wicketkeeper Prioritization - COMPLETE
✅ Task 3 (Board Objectives) - COMPLETE
✅ Task 4 (Inbox Improvements) - COMPLETE
✅ Task 5 (Super Overs) - COMPLETE

## Files Modified

### Task 1: Seasonal Loop Fix (✅ Complete)
- `src/core/simulation/SimulationEngine.js`: Added season transition, fixed auction scheduling for even seasons
- `src/components/layout/Header.jsx`: Added season transition on modal close, even season handling
- `src/stores/gameStore.js`: Updated resetForNewSeason() to set correct dates by season parity

### Task 2: Injury Tracking (✅ Complete + 3 Additional Improvements)
- `src/core/match-engine/core/MatchEngine.js`: Persist injuries with severity to playerStore, send inbox messages (only for user squad)
- `src/stores/gameStore.js`: Added daily injury countdown in advanceDay(), recovery messages (only for user squad)
- `src/utils/MessageGenerator.js`: Added generateInjuryMessage() and generateRecoveryMessage()
- `src/components/tactics/tabs/SquadPlaystyleTab.jsx`: Added injury status display, validation warnings
- `src/components/tactics/TacticsPage.jsx`: Added injury validation, auto-validate on page exit
- `src/core/tactics/EnergyManager.js`: **NEW** - Inverse linear probability for injury durations (shorter injuries more likely)
- `src/core/match-engine/utils/QuickSimMatch.js`: **NEW** - AI auto-fix injured players in lineups before matches
- `src/components/match/PreMatchFlow.jsx`: **NEW** - Block user from continuing if tactics have errors (including injured players)

### Critical Fix: Auction AI Wicketkeeper Prioritization (✅ Complete)
- `src/core/auction-system/AuctionAI.js`: Added +300 fitScore bonus when team has 0 wicketkeepers, +150 for 1 wicketkeeper
- `src/core/auction-system/PlayerValuation.js`: Added 25% base value bonus for all wicketkeepers

### Task 3: Board Objectives Enhancement (✅ Complete)
- `src/utils/ObjectiveGenerator.js`: **NEW** - Master list of 10 objective templates with weighted scoring
- `src/stores/gameStore.js`: Added seasonObjectives state, objectiveTracking state, and objective management methods
- `src/core/simulation/SimulationEngine.js`: Added objective generation on season start (both odd and even seasons)
- `src/components/layout/Header.jsx`: Added objective generation on season start (both odd and even seasons)
- `src/components/board/ObjectivesPanel.jsx`: Updated to use gameStore objectives and display board score

### Task 4: Inbox Improvements (✅ Complete)
- `src/stores/inboxStore.js`: Added currentFilter and currentSort state, setFilter/setSort methods, getFilteredAndSortedMessages method, added 'board_objectives' to board filter
- `src/components/inbox/Inbox.jsx`: Added filter dropdown (All/Match/Injury/Finance/Board/Tutorial) and sort options (Date/Type/Unread First)

### Task 3 Enhancements (✅ Complete)
- `src/utils/MessageGenerator.js`: Added generateBoardObjectivesMessage() method for new season objective announcements
- `src/stores/gameStore.js`: Updated generateSeasonObjectives() to send inbox message, added best batsman/bowler tracking fields
- `src/components/OffSeason/SeasonSummaryView.jsx`: **MAJOR UPDATE** - Added tab system with Season Summary and Board Review tabs, status badges instead of progress bars, comprehensive objective evaluation with board comments
- `src/utils/ObjectiveGenerator.js`: Removed semi_finals objective, added best_batsman and best_bowler objectives (not implemented yet), added Star and Crosshair icons
- `src/utils/ObjectiveTracker.js`: **NEW** - Helper function to update objectives after each user team match (tracks home wins, streaks, first 3, high score, rival wins)
- `src/components/layout/Header.jsx`: Integrated objective tracking after user matches in Normal UI mode
- `src/core/simulation/SimulationEngine.js`: Integrated objective tracking after user matches in Sim-to-Date mode

### Task 5: Super Overs Feature (✅ Complete)
- `src/stores/matchStore.js`: Added superOver state object, 7 action methods for managing super over flow
- `src/core/match-engine/core/MatchEngine.js`: Added simulateSuperOver(), simulateSuperOverInnings(), simulateSuperOverBall() methods, updated calculateMatchResult() for tie detection
- `src/core/match-engine/utils/QuickSimMatch.js`: Added selectBestPlayersForSuperOver() helper, updated tie handling to auto-select AI players and simulate super over
- `src/components/match/SuperOverSelectionModal.jsx`: **NEW** - Modal for user squad selection (3 batsmen + 1 bowler), displays AI opponent selections
- `src/components/match/matchday/MatchdayUI.jsx`: Added super over state, tie detection in processMatchResult(), handleSuperOverStart(), processMatchResultWithSuperOver(), renders SuperOverSelectionModal
- `src/components/layout/Header.jsx`: Updated both handleQuickSimUserMatch() and handleContinue() to handle super over results in fullScorecard
- `src/components/shared/MatchResultModal.jsx`: Added super over display section with both team scores when super over occurred

### Critical Fix: League Initialization Architecture (✅ Complete)
**Root Cause:** THREE separate implementations of league initialization existed, causing DRY violations and sync bugs:
1. `SimulationEngine.js::initializeLeague()` - Sim-to-date flow
2. `Header.jsx::initializeNewSeasonLeague()` - Normal UI flow (Season 2+)
3. `Transfers.jsx::initializeLeague()` - Normal UI flow (after auction)

**Solution:** Created single source of truth in `src/utils/LeagueInitializer.js`
- `LeagueInitializer.js`: **NEW** - Shared `initializeLeague()` function with all logic consolidated
- `SimulationEngine.js`: Now calls shared function (14 lines vs 190 lines)
- `Header.jsx`: Now calls shared function (14 lines vs 123 lines)
- `Transfers.jsx`: Now calls shared function (16 lines vs 85 lines)

**Bugs Fixed by Consolidation:**
1. **Transfers.jsx missing playoffs** - Was NOT generating playoff fixtures at all
2. **Header.jsx hardcoded gameStartDate** - Used `new Date('2025-01-01')` instead of dynamic calculation
3. **Header.jsx missing playoff matchEvents** - Only scheduled league matches, not playoffs
4. **Inconsistent game day calculations** - Each implementation calculated differently

**Impact:** All three flows now produce IDENTICAL league schedules with proper playoff fixtures

### Critical Fix: Wicketkeeper Fallback Logic (✅ Complete)
- `src/core/match-engine/core/MatchEngine.js`: Enhanced getWicketKeeper() with intelligent fallback - uses player with highest wicketkeeping rating instead of first player when no designated keeper available

## Key Decisions Made
1. Priority order: Seasonal loop → Injuries → Objectives → Inbox → Super Overs
2. Season parity logic: Odd seasons (1,3,5) = Jan-Jun with auction, Even seasons (2,4,6) = Jul-Dec no auction
3. Injury severity: <=30 days = minor, <=60 = major, >60 = severe
4. Daily injury countdown uses setTimeout in advanceDay() to avoid circular dependencies
5. Inbox messages sent automatically on injury/recovery (ONLY for user squad players)
6. Using existing playerStore.updatePlayerCondition() for injury persistence
7. **NEW**: Injury duration uses inverse linear probability (weight = maxDuration - duration + 1)
8. **NEW**: AI teams auto-fix injured players before every match (replace with uninjured players of same role)
9. **NEW**: User match progression blocked at Preview & Tactics phase if validation errors exist
10. **ARCHITECTURAL**: Created single shared `LeagueInitializer.js` - DRY principle for all league initialization flows

## Current Progress
- ✅ **Task 1: Seasonal Loop System** - COMPLETE
  - Season transitions work correctly
  - Auction scheduling fixed (odd seasons only)
  - resetForNewSeason() sets correct dates
  - Even seasons handled properly (no auction)

- ✅ **Task 2: Injury Tracking System** - COMPLETE + 3 IMPROVEMENTS
  - Injuries persist with severity to playerStore
  - Daily countdown with automatic recovery
  - Injury/recovery inbox messages (ONLY for user squad)
  - UI displays injury status in squad selection
  - Validation blocks injured players in XI
  - Auto-validate on tactics page exit
  - **IMPROVEMENT 1**: Inverse linear probability for injury durations (shorter injuries more likely)
  - **IMPROVEMENT 2**: Only send injury/recovery emails for user's squad players
  - **IMPROVEMENT 3**: AI auto-reselects uninjured players before matches
  - **IMPROVEMENT 4**: User blocked from continuing pre-match if tactics invalid

- ✅ **Task 3: Board Objectives Enhancement** - COMPLETE
  - Created ObjectiveGenerator.js with 10 objective templates
  - Objectives generated: 1 mandatory (playoffs) + 4 random per season
  - Weighted scoring: Playoffs 30%, Championship 25%, others 45% total
  - Board score calculation (0-100) based on weighted completion
  - Objective tracking: home wins, win streaks, rival wins, high scores, etc.
  - UI displays board score prominently with color-coded progress bar
  - Objectives update dynamically as season progresses

- ✅ **Task 4: Inbox Improvements** - COMPLETE
  - Added filter dropdown with 6 categories: All, Match, Injury, Finance, Board, Tutorial
  - Added sort options: Date (newest first), Type (alphabetical), Unread First
  - Filter/sort state persists in inboxStore
  - Messages display shows "X of Y" count when filtered
  - Injury/recovery messages already implemented in Task 2

- ✅ **Task 3 Enhancements** - COMPLETE
  - Added inbox message when season objectives are generated (type: 'board_objectives')
  - Added Board Review tab to SeasonSummaryView with comprehensive performance evaluation
  - Board score displayed prominently (0-100) with color-coded ratings
  - Individual objective reviews with STATUS BADGES (Complete, On Track, Falling Short, Failed, Pending)
  - Overall assessment with 5 rating tiers (Outstanding, Excellent, Satisfactory, Below Expectations, Unacceptable)
  - Removed semi-finals objective (duplicate of playoffs)
  - Added best batsman objective (12% weight) - NOT YET IMPLEMENTED (requires leaderboard tracking)
  - Added best bowler objective (12% weight) - NOT YET IMPLEMENTED (requires leaderboard tracking)
  - **Objective Tracking System**: Tracks progress automatically after every user team match
    - Home wins / home matches played
    - Win streaks (current and longest)
    - First 3 matches wins
    - Highest score achieved
    - Rival wins / rival matches played
    - Updates in BOTH Normal UI mode and Sim-to-Date mode

- ✅ **Task 5: Super Overs Feature** - COMPLETE
  - Tie detection: When both teams score the same, match is declared a tie and super over is triggered
  - Super over simulation: 6 balls maximum per team, max 2 wickets, simplified outcome probabilities
  - User squad selection modal: Select 3 batsmen + 1 bowler from playing XI
  - AI auto-selection: AI opponent selects best players based on batting/bowling ratings
  - Results display: Super over scores shown in MatchResultModal when applicable
  - Stats handling: Super over runs do NOT count toward career statistics or NRR
  - Win margin: Display shows "Super Over" instead of runs/wickets margin
  - Both flows supported: Interactive play (MatchdayUI) and quick-sim (Header.jsx)
  - League standings: Winner determined by super over, correctly awards 2 points for win (not tie)

## Bug Fixes Applied

### Critical Fixes (January 2025)
1. **Season End Skipping Transfer Window** - FIXED
   - Problem: `resetForNewSeason()` was called on `season_end` event, clearing calendar and skipping transfer window
   - Solution: Season transition now happens at `auction` (odd seasons) or `preseason_start` (even seasons) events
   - Flow: Season End → Transfer Window → Offseason → New Season Start

2. **Even Season Getting Stuck on Transfers Page** - FIXED
   - Problem: Even seasons tried to trigger auction logic which doesn't exist
   - Solution: Added `preseason_start` event for even seasons that directly initializes league
   - Even seasons now properly skip auction and initialize league with existing squads

3. **Empty Season Schedule After Transition** - FIXED
   - Problem: After season transition, no matches or events were scheduled
   - Root Cause: `resetForNewSeason()` cleared calendar, but league initialization wasn't being called
   - Solution: Added `initializeNewSeasonLeague()` function in Header.jsx
     - Generates fixtures using MatchWeekScheduleGenerator
     - Schedules all match events, playoffs, offseason, transfer window
     - Initializes league store with fixtures and teams
   - Triggers on: preseason_start events, post-auction, or as fallback check

## Injury System Documentation

### How Injuries Are Triggered
**Step 1: Energy Depletion During Match**
- Players lose energy based on actions (batting, bowling, fielding)
- Energy depletion scaled by stamina attribute (higher stamina = less depletion)

**Step 2: Post-Match Fatigue Increase**
- Probability = `1 - (energyAtMatchEnd / 100)`
- Example: If energy = 40 at match end, 60% chance fatigue +1
- Fatigue accumulates over multiple matches

**Step 3: Injury Trigger** (config: energy-config.json line 125-133)
- **Injury Probability** = `fatigue / 100`
- Example: If fatigue = 70, there's 70% chance of injury after match
- Higher fatigue = higher injury risk

**Step 4: Injury Duration** (if injured)
- **Duration Range**: 10-90 days
- **Distribution**: Inverse linear weighting (shorter injuries more likely)
  - 10-day injury: weight = 81 (most likely)
  - 50-day injury: weight = 41
  - 90-day injury: weight = 1 (least likely)

**Step 5: Severity Classification** (my implementation)
- Minor: ≤30 days
- Major: ≤60 days
- Severe: >60 days

### Recovery System
- **Daily Countdown**: injuryDuration decrements by 1 each day
- **Full Recovery**: When duration reaches 0, injury/injuryDuration reset to null
- **Auto Message**: Recovery inbox message sent when player returns to fitness

### Potential Improvements (Not Implemented)
The current injury system is quite aggressive. Considerations for balancing:
1. **Reduce injury probability**: Current formula `fatigue / 100` means 70 fatigue = 70% injury chance
   - Could use `(fatigue / 100) * 0.3` to reduce to 21% at 70 fatigue
2. **Shorter duration range**: 10-90 days is very long
   - Could reduce to 5-45 days for T20 format
3. **Fatigue recovery rate**: Currently players only recover when resting
   - Could add gradual recovery even when playing
4. **Rotation incentive**: High injury risk encourages squad rotation (may be intended design)

## Next Steps
All Polish v2 tasks are complete!

## Super Over System Documentation

### How Super Overs Work
1. **Tie Detection**: If both teams score exactly the same runs in the main match, a super over is triggered
2. **Squad Selection**:
   - User selects 3 batsmen and 1 bowler from their playing XI
   - AI auto-selects best players based on batting/bowling ratings
3. **Simulation**:
   - Each team faces 6 balls maximum (1 over)
   - Maximum 2 wickets per team
   - If all out (2 wickets), innings ends early
4. **Winner Determination**:
   - Team with more runs wins
   - If super over is also tied, team that batted first in super over wins
5. **Stats**: Super over runs/wickets do NOT count toward career statistics or NRR

### Key Design Decisions
- Super over batsmen/bowler can be ANY player from the playing XI (not restricted by role)
- AI selection prioritizes highest-rated players (top 3 batsmen by batting rating, best bowler by bowling rating)
- Team that batted SECOND in main match bats FIRST in super over (real cricket convention)
- Super over outcome probabilities are simplified (flat distribution) vs main match engine

### Files Involved
- `matchStore.js` - State management for super over data
- `MatchEngine.js` - Simulation logic
- `QuickSimMatch.js` - AI match handling
- `SuperOverSelectionModal.jsx` - User selection UI
- `MatchdayUI.jsx` - Interactive match flow
- `Header.jsx` - Quick-sim result handling
- `MatchResultModal.jsx` - Result display
