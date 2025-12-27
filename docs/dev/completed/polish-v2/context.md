# Context: Polish v2 Implementation

## Current State
✅ Task 1 (Seasonal Loop) - COMPLETE
✅ Task 2 (Injury Tracking) - COMPLETE
✅ Critical Fix: Auction AI Wicketkeeper Prioritization - COMPLETE
⏳ Task 3 (Board Objectives) - PENDING
⏳ Task 4 (Inbox Improvements) - PENDING
⏳ Task 5 (Super Overs) - PENDING

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
1. Task 3: Board Objectives - Create master list, board score, integrate with season start
2. Task 4: Inbox Improvements - Add filtering/sorting UI
3. Task 5: Super Overs - Implement tie-breaker system
