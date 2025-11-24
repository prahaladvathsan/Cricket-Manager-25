# Development Plan: Polish v2 - Bug Fixes & Super Over Feature

## Overview
Bundle of 5 tasks: 4 critical bug fixes + 1 new feature (Super Overs). Implementation started January 2025.

---

## Task 1: Fix Seasonal Loop System (CRITICAL)
**Priority: P0 - Blocks game progression**

**Problem:** Season never advances beyond Season 1. Season end events process but don't transition to new season.

**Root Cause:**
- `season_end` event handled but `currentSeason` never incremented
- No call to `gameStore.resetForNewSeason()`
- Even seasons incorrectly schedule auctions due to stale season number

**Implementation:**
1. **SimulationEngine.js**: After season_end event, call `gameStore.resetForNewSeason()` and reschedule calendar
2. **Header.jsx**: Add same logic after season summary modal closes
3. **gameStore.js**: Ensure `resetForNewSeason()` increments season, resets gameDay, clears events, sets phase to 'preseason'
4. **Fix auction scheduling**: Only schedule auctions for odd seasons, use new season number

**Files:** SimulationEngine.js, Header.jsx, gameStore.js, leagueStore.js

---

## Task 2: Implement Injury Tracking System
**Priority: P0 - Data integrity issue**

**Problem:** Injuries trigger but aren't tracked. Players remain available for selection despite injuries.

**Implementation:**
1. **MatchEngine.js**: Persist injuries to playerStore with severity calculation (minor <=30d, major <=60d, severe <=90d)
2. **gameStore.js advanceDay()**: Loop through all players, decrement injuryDuration, reset when 0
3. **Tactics validation**: Check for injured players in playing XI, show warnings
4. **TacticsPage.jsx**: Auto-validate on exit, block navigation if errors exist (add revert/fix options)
5. **Squad selection UI**: Display "injured for X days" next to injured players
6. **MessageGenerator.js**: Add injury/recovery inbox messages with links to tactics tab

**Files:** MatchEngine.js, playerStore.js, gameStore.js, TacticsPage.jsx, SquadPlaystyleTab.jsx, OverviewTab.jsx, MessageGenerator.js

---

## Task 3: Enhance Board Objectives System
**Priority: P1 - Feature enhancement**

**Problem:** Only 3 objectives, no master list, no board score metric.

**Implementation:**
1. **Create ObjectiveGenerator.js**: Master list of 10 objectives (playoffs, championship, top 2, positive NRR, home wins, first 3 wins, semi-finals, rival wins, win streak, 200+ score)
2. **Generate 5 objectives per season**: 1 mandatory (playoffs) + 4 random
3. **Add objective weights**: Playoffs (30%), Championship (25%), others (45% total)
4. **Calculate board score**: 0-100 metric based on weighted completion
5. **Status tracking**: completed, on track, falling behind, failed, pending
6. **ObjectivesPanel.jsx**: Display with progress bars and weighted importance

**Files:** ObjectiveGenerator.js (NEW), ObjectivesPanel.jsx, gameStore.js or boardStore.js (NEW), SimulationEngine.js, Header.jsx

---

## Task 4: Improve Inbox System
**Priority: P2 - UX enhancement**

**Implementation:**
1. **Add injury messages**: When player injured (include link to tactics tab)
2. **Add recovery messages**: When player returns to fitness
3. **Add filtering**: Dropdown for All/Match/Injury/Finance/Board/Tutorial
4. **Add sorting**: By date, type, read/unread status
5. **Message categorization**: Tag messages with type for filtering

**Files:** MessageGenerator.js, inboxStore.js, Inbox.jsx (find location), MatchEngine.js, gameStore.js

---

## Task 5: Implement Super Over Feature
**Priority: P2 - New feature for edge case**

**Problem:** Tied matches currently award win to team batting first. Need proper tiebreaker.

**Implementation:**
1. **Tie detection**: In QuickSimMatch.js and MatchdayUI.jsx, detect equal scores
2. **Super over setup**:
   - 2nd innings batting team bats first in super over
   - Each team: 3 batsmen, 1 bowler, 2 wickets max, 1 over
3. **AI selection logic**: Auto-select highest rated batsmen/bowler for quick-sims and opponent
4. **User selection UI**: Create SuperOverSelectionModal.jsx for full-sim user selection
5. **Match engine integration**: Add `simulateSuperOver()` method to MatchEngine
6. **Result handling**: Super over stats don't count in career stats, only determine winner
7. **Update margin type**: Show "super over" instead of "tie"

**Files:** MatchEngine.js, QuickSimMatch.js, MatchdayUI.jsx, matchStore.js, SuperOverSelectionModal.jsx (NEW)

---

## Testing Plan
1. **Seasonal Loop**: Play through Season 1, verify Season 2 starts correctly
2. **Injuries**: Trigger injury in match, verify countdown, recovery, and squad validation
3. **Objectives**: Start new season, verify 5 objectives with playoffs mandatory
4. **Inbox**: Filter/sort messages, verify injury/recovery messages appear
5. **Super Overs**: Force tie result, test both quick-sim and full-sim flows

---

## Documentation
All work tracked in `docs/dev/active/polish-v2/`:
- `plan.md` - This implementation plan
- `context.md` - Files changed, decisions made, current state
- `tasks.md` - Granular checklist with completion tracking

**Branch:** testing (all work on testing branch, merge to main only after approval)
