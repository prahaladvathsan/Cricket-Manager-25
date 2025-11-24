# Task Checklist: Polish v2

## Task 1: Fix Seasonal Loop System
- [ ] Read and understand current SimulationEngine.js season_end handling
- [ ] Read and understand current Header.jsx season_end handling
- [ ] Read gameStore.js resetForNewSeason() method
- [ ] Add season transition call to SimulationEngine.js after season_end
- [ ] Add season transition call to Header.jsx after season summary modal
- [ ] Fix auction scheduling to only occur in odd seasons
- [ ] Test season transition from Season 1 to Season 2
- [ ] Verify auction scheduled correctly for Season 3 (not Season 2)

## Task 2: Implement Injury Tracking
- [ ] Update MatchEngine.js to persist injuries with severity
- [ ] Add injury countdown logic to gameStore.advanceDay()
- [ ] Add injury status display in squad selection tabs
- [ ] Add injured player validation in tactics
- [ ] Implement tactics auto-validation on page exit
- [ ] Block navigation if validation errors exist
- [ ] Add injury message to MessageGenerator.js
- [ ] Add recovery message to MessageGenerator.js
- [ ] Test injury occurrence and countdown
- [ ] Test recovery and inbox messages

## Task 3: Enhance Board Objectives
- [ ] Create ObjectiveGenerator.js with master list of 10 objectives
- [ ] Implement objective selection logic (1 mandatory + 4 random)
- [ ] Add objective weights
- [ ] Implement board score calculation
- [ ] Update ObjectivesPanel.jsx to display board score
- [ ] Integrate objective generation on season start
- [ ] Test objective generation and tracking
- [ ] Verify board score calculation

## Task 4: Improve Inbox System
- [ ] Add injury message generation to MessageGenerator.js
- [ ] Add recovery message generation to MessageGenerator.js
- [ ] Find and read Inbox.jsx component
- [ ] Add filtering UI (All/Match/Injury/Finance/Board/Tutorial)
- [ ] Add sorting UI (Date/Type/Read-Unread)
- [ ] Update inboxStore.js with filter/sort methods
- [ ] Test filtering and sorting functionality
- [ ] Verify injury/recovery messages appear

## Task 5: Implement Super Overs
- [ ] Read current tie handling in QuickSimMatch.js
- [ ] Read current tie handling in MatchdayUI.jsx
- [ ] Add simulateSuperOver() method to MatchEngine.js
- [ ] Implement AI selection logic for super over squads
- [ ] Update QuickSimMatch.js to trigger super over on tie
- [ ] Create SuperOverSelectionModal.jsx component
- [ ] Update MatchdayUI.jsx for user super over flow
- [ ] Update matchStore.js to track super over state
- [ ] Test quick-sim super over (AI vs AI)
- [ ] Test full-sim super over (user selection)
- [ ] Verify super over stats don't count in career stats

## Testing & Verification
- [ ] Complete season 1 and verify season 2 starts
- [ ] Trigger injury and verify all tracking works
- [ ] Start new season and verify objectives generated
- [ ] Test inbox filtering and injury messages
- [ ] Force tie and test super over flow
- [ ] Final integration test of all features

## Completion Criteria
✓ Season transitions work correctly
✓ Injuries tracked and displayed properly
✓ 5 objectives per season with board score
✓ Inbox filterable with injury messages
✓ Super overs work for tied matches
