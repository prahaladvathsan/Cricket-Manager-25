# Prompt for Next Claude Code Session

## Context

You are continuing the **Polish v2** development session for Cricket Manager 25. This is a T20 cricket management game built with React 18.

**Previous session completed Tasks 1 & 2 out of 5.** All documentation is in `docs/dev/active/polish-v2/`:
- `plan.md` - Full implementation plan for all 5 tasks
- `context.md` - Files modified, decisions made, current progress
- `tasks.md` - Detailed task checklist

## What's Been Completed

✅ **Task 1: Seasonal Loop System Fix** - Seasons now transition correctly from Season 1 to Season 2, auction scheduling fixed for odd/even season parity, even seasons skip auction and go straight to league initialization.

✅ **Task 2: Injury Tracking System** - Full injury system implemented with:
- Injury persistence with severity (minor/major/severe) to playerStore
- Daily countdown and automatic recovery
- Injury/recovery inbox messages
- UI displays in squad selection with validation warnings
- Auto-validation on tactics page exit

## Your Task

**Continue with Tasks 3, 4, and 5 from the plan:**

### Task 3: Board Objectives Enhancement (Priority: P1)
Create `src/utils/ObjectiveGenerator.js` with master list of 10 objectives:
1. Make playoffs (MANDATORY - must be included)
2. Win championship
3. Finish in top 2
4. Achieve positive NRR
5. Win X home matches
6. Win first 3 matches
7. Reach semi-finals
8. Beat specific rival team
9. Win X consecutive matches
10. Score 200+ in a match

**Implementation:**
- Generate 5 objectives per season (1 mandatory + 4 random)
- Add weighted board score calculation (Playoffs 30%, Championship 25%, others 45%)
- Integrate objective generation in SimulationEngine.js and Header.jsx on season start
- Update `src/components/board/ObjectivesPanel.jsx` to display board score
- Track status: completed, on track, falling behind, failed, pending

### Task 4: Inbox Improvements (Priority: P2)
**Files:** `src/stores/inboxStore.js`, `src/components/layout/Inbox.jsx`

- Add filter dropdown: All/Match/Injury/Finance/Board/Tutorial
- Add sort options: Date/Type/Read-Unread
- Update inboxStore with filter/sort methods
- Injury/recovery messages already implemented in Task 2

### Task 5: Super Overs Feature (Priority: P2)
**New tie-breaker system when match scores are equal:**

**Files to modify:**
- `src/core/match-engine/core/MatchEngine.js` - Add `simulateSuperOver()` method
- `src/core/match-engine/utils/QuickSimMatch.js` - Detect tie, trigger super over
- `src/components/match/matchday/MatchdayUI.jsx` - Add user super over flow
- `src/components/match/SuperOverSelectionModal.jsx` - NEW FILE for user selection
- `src/stores/matchStore.js` - Track super over state

**Rules:**
- 2nd innings batting team bats first in super over
- Each team: 3 batsmen, 1 bowler, 2 wickets max, 1 over
- Quick-sim: AI auto-selects best players (highest ratings)
- Full-sim: User selects squad via modal, opponent uses AI
- Super over stats don't count in career stats
- Update margin type to show "super over" instead of "tie"

## How to Start

1. Read all documentation in `docs/dev/active/polish-v2/` to understand context
2. Start with Task 3 (Board Objectives) as highest priority
3. Create ObjectiveGenerator.js first, then integrate with season initialization
4. Use the TodoWrite tool to track progress through each sub-task
5. Update `context.md` as you make changes
6. Test each task before moving to the next

## Important Notes

- **Branch:** All work on `testing` branch (never push to `main`)
- **Git workflow:** See CLAUDE.md for detailed git instructions
- **Dual mode:** Changes must work in both Normal UI mode and Sim-to-Date mode
- **Config-driven:** All probabilities in JSON configs, never hardcoded
- Use existing patterns from completed tasks as reference

## Testing

After completing all tasks, test:
1. Season 1 → Season 2 transition (verify objectives generated)
2. Trigger injury, verify countdown and recovery
3. Test inbox filtering/sorting
4. Force tie match result, test super over flow (both quick-sim and full-sim)

## Questions?

If anything is unclear, refer to:
- `docs/dev/active/polish-v2/plan.md` - Detailed implementation plan
- `docs/dev/active/polish-v2/context.md` - What's been done and key decisions
- `CLAUDE.md` - Project overview and development guidelines
- `docs/README.md` - Full documentation index

Good luck! 🏏
