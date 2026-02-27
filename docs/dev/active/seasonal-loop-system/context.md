# Seasonal Loop System - Development Context

**Last Updated**: 2026-02-28 (Retention System Implemented)
**Current Sprint**: Sprint 4 - Retention & Re-Auction (100% COMPLETE ✅)
**Files Modified**: 28
**Session Status**: Sprint 4 Complete - Ready for Testing

---

## Current State

### What's Complete (Sprints 1-3)
- [x] Plan approved and documented in plan.md
- [x] Development tracking folder created
- [x] Todo list established and maintained
- [x] **Sprint 1 Complete (100%)**: Playoff UI fully integrated
  - [x] Created PlayoffView.jsx component with bracket visualization
  - [x] Integrated Playoffs tab into League.jsx
  - [x] Added automatic tab switching when playoffs start
  - [x] Code compiling successfully with HMR
- [x] **Sprint 2 Complete (100%)**: Off-Season Foundation
  - [x] Built PrizeDistributor.js with graduated prizes (1st-10th)
  - [x] Built OffSeasonManager.js orchestrator (6-week cycle)
  - [x] Created SeasonSummaryView.jsx with champion celebration
  - [x] Created OffSeasonHub.jsx with progress tracking
  - [x] All code compiling successfully
- [x] **Sprint 3 Complete (100%) ✅**: Enhanced Transfer System
  - [x] Created transferStore.js with comprehensive UI state management
  - [x] Created UserTransferHandler.js (user interaction layer)
  - [x] Enhanced TransferManager.js for 14-day off-season listings
  - [x] Enhanced TransferMarket.js for configurable listing durations
  - [x] Created ListingCard.jsx component
  - [x] Created BidModal.jsx component
  - [x] Created MarketplaceView.jsx component
  - [x] Created MyListingsView.jsx component
  - [x] Created FreeAgencyView.jsx component
  - [x] Created TransferMarketView.jsx main container
  - [x] Created useTransferSystem.js hook for integration
  - [x] Integrated into Transfers.jsx page
  - [x] Added automatic transfer window opening/closing (weeks 22-26)
  - [x] Removed mid-season transfer window entirely
  - [x] Updated transferConfig.json (disabled mid-season, enabled off-season only)
  - [x] Updated TransferMarketView.jsx closed state (single window display)
  - [x] All components compile successfully (verified via dev server)

- [x] **Sprint 4 Complete (100%) ✅**: Retention & Re-Auction
  - [x] Created retentionConfig.json with tiered salary caps ($5M/5, $7.5M/10, $8.5M/15)
  - [x] Created RetentionEngine.js orchestrator (init, validate, finalize)
  - [x] Created RetentionAI.js (IPM-based ranking, elite auto-retain, greedy tier fill)
  - [x] Created PlayerAcceptance.js (3-attempt negotiation with seeded variance)
  - [x] Created retentionStore.js (Zustand + IndexedDB persistence + hydration)
  - [x] Created RetentionView.jsx (two-column FM layout with SortableTable + tier progress)
  - [x] Created RetentionNegotiationModal.jsx (salary slider, 3-attempt counter-offer UI)
  - [x] Modified Header.jsx: odd seasons >= 3 run AI retentions then navigate to /game/retention
  - [x] Modified SimulationEngine.js: added runRetention() before runAuction() for sim-to-date
  - [x] Modified AuctionEngine.js: initializeAuction() accepts teamPurses + retainedSquads
  - [x] Modified Transfers.jsx: passes retention data to auction init (both fresh + restore paths)
  - [x] Modified App.jsx: added /game/retention route + retention store hydration import
  - [x] Modified storeHydration.js: registered 'retention' store
  - [x] Build verified successfully

### Next Steps for Future Session
**Priority 1**: Sprint 4 Testing
1. Play through Season 1 → Season 2 → Season 2 end → verify retention screen appears
2. Test tier cap validation (try to exceed caps)
3. Test 3-attempt negotiation flow
4. Verify AI teams have 8-12 retained players
5. Verify auction shows reduced purses matching retention spending
6. Test sim-to-date through even season end
7. Test save/load during retention phase

**Priority 2**: Sprint 5 - Seasonal Loop Integration
**Priority 3**: Sprint 6 - Polish & Testing

---

## Files Modified

### Sprint 1: Playoff UI Integration

1. **src/components/Playoffs/PlayoffView.jsx** (NEW)
   - Complete playoff bracket visualization
   - Shows all 4 playoff matches (Q1, Eliminator, Q2, Final)
   - Dynamic TBD display for upcoming matches
   - Winner highlighting with trophy icons
   - Clickable results with fullScorecard modal
   - Champion announcement section
   - Color coding: completed (cricket-accent), pending (tertiary)

2. **src/components/layout/League.jsx** (ENHANCED)
   - Added PlayoffView import
   - Added useEffect import for automatic tab switching
   - Added "Playoffs" tab button (conditional on stage === 'playoffs' or 'completed')
   - Added playoffs content rendering
   - Auto-switch to playoffs tab when stage changes to 'playoffs'

### Sprint 2: Off-Season Foundation

3. **src/core/offseason/PrizeDistributor.js** (NEW)
   - Graduated prize structure ($5M → $200K for 1st-10th)
   - Automatic finance integration
   - Position suffix formatting (1st, 2nd, 3rd, etc.)
   - Prize distribution logging
   - Helper methods for prize queries

4. **src/core/offseason/OffSeasonManager.js** (NEW)
   - Complete 6-week off-season orchestration
   - Week 21: Prize distribution + season summary
   - Week 22-26: Transfer window management
   - Re-auction detection for even seasons
   - Season summary generation
   - Off-season status tracking
   - Event scheduling system

5. **src/components/OffSeason/SeasonSummaryView.jsx** (NEW)
   - Champion celebration with trophy animations
   - Final standings table with prize money
   - Season statistics (highest score, total matches, prize pool)
   - Clickable team names
   - "Continue to Off-Season" button
   - Gradient styling for champion row

6. **src/components/OffSeason/OffSeasonHub.jsx** (NEW)
   - Off-season progress timeline (6 weeks)
   - Current week event indicator
   - Transfer window status card
   - Budget and financial summary
   - Quick navigation to Squad/League/Transfers
   - "Advance Week" button
   - "Start New Season" button (when complete)

### Sprint 4: Retention & Re-Auction

10. **src/data/config/retentionConfig.json** (NEW)
   - Tiered salary caps: $5M/5 players, $7.5M/10, $8.5M/15
   - 3-attempt negotiation with counter-offers (90%, 85%, final rejection)
   - AI config: min IPM 3.0, max 12 retentions, elite always-retain at 85+ rating
   - Auction purse: $10M base, $500K minimum remaining

11. **src/core/retention/RetentionEngine.js** (NEW)
   - initializeRetentionPhase(), processAITeamRetention(), validateRetention()
   - finalizeRetentions() — clears squads, re-adds retained, releases others
   - getTeamAuctionPurse() — calculates reduced purse

12. **src/core/retention/RetentionAI.js** (NEW)
   - IPM-based player ranking with elite auto-retention
   - Greedy retention within tier caps
   - Uses AuctionTransferAI for market value, PerformanceValuation for IPM

13. **src/core/retention/PlayerAcceptance.js** (NEW)
   - evaluateOffer() pure function with seeded random variance
   - Elite hardness multiplier (1.15x threshold)
   - 3-attempt counter-offer system

14. **src/stores/retentionStore.js** (NEW)
   - Zustand + IndexedDB persistence
   - Tracks per-team retentions, active negotiations, phase state
   - Registered in storeHydration.js

15. **src/components/Retention/RetentionView.jsx** (NEW)
   - Two-column FM-style layout
   - SortableTable with player status (retained/released/pending)
   - Right panel: tier cap progress bars, auction purse, complete button

16. **src/components/Retention/RetentionNegotiationModal.jsx** (NEW)
   - Salary slider + market value hint range
   - 3-attempt counter with visual indicators
   - Accept counter / propose / release actions

17. **src/components/layout/Header.jsx** (ENHANCED)
   - new_season_start: seasons >= 3 (odd) run AI retentions, navigate to /game/retention
   - Season 1 keeps existing behavior (straight to auction)

18. **src/core/simulation/SimulationEngine.js** (ENHANCED)
   - Added runRetention() method for sim-to-date
   - Passes retention data (purses + retained squads) to runAuction()

19. **src/core/auction-system/AuctionEngine.js** (ENHANCED)
   - initializeAuction() accepts optional teamPurses + retainedSquads
   - Pre-populates squads, sets reduced budgets, excludes retained from pool

20. **src/components/layout/Transfers.jsx** (ENHANCED)
   - Both auction init paths pass retention data to AuctionEngine

21. **src/App.jsx** (ENHANCED)
   - Added /game/retention route
   - Added retention store import for hydration

22. **src/utils/storeHydration.js** (ENHANCED)
   - Added 'retention' to hydration tracking

### Sprint 3: Transfer System Foundation & Playoff Fix

7. **src/stores/transferStore.js** (NEW)
   - Comprehensive UI state management for transfer market
   - Active listings tracking with filters/sorting
   - User bids management system
   - Free agency pool state
   - Notification system for transfer events
   - Transfer window status tracking
   - Filter/sort helpers with getFilteredListings()
   - Persisted to localStorage

8. **src/stores/leagueStore.js** (ENHANCED - Playoff Auto-trigger)
   - Added PlayoffGenerator import
   - Modified recordResult() to check for league completion
   - Added checkAndTriggerPlayoffs() method
   - Generates playoff fixtures when all 90 league matches complete
   - Auto-sets stage to 'playoffs'
   - Fixed getNextFixture() to handle playoff fixtures

9. **src/components/layout/Transfers.jsx** (ENHANCED)
   - Integrated TransferMarketView component
   - Shows full transfer market when window is open (weeks 10-12, 22-26)
   - Shows auction summary when transfer window is closed
   - Conditional rendering based on transferWindow.isOpen state

### Files Reviewed (No Changes)
- src/core/league/PlayoffSimulator.js - Reviewed backend structure
- src/core/league/PlayoffGenerator.js - Reviewed fixture structure
- src/stores/leagueStore.js - Confirmed playoff data structure
- src/stores/financeStore.js - Confirmed finance integration
- src/stores/gameStore.js - Confirmed calendar structure
- src/core/finance/TransferManager.js - Reviewed for enhancement needs
- src/core/finance/TransferMarket.js - Reviewed bidding logic
- src/core/finance/TransferAI.js - Reviewed AI decision-making

---

## Key Decisions Made

### Design Decisions
1. **Timeline**: 26-week season (18 league + 2 playoff + 6 off-season)
2. **Retention**: 3-8 players per team at 70% cost
3. **Prizes**: Graduated 1st-10th place prizes
4. **Transfers**: 14-day off-season listings vs 7-day mid-season
5. **Re-auction**: Every 2 seasons (even-numbered)

### Technical Decisions
1. Use existing PlayoffSimulator.js (no backend changes needed)
2. Build on TransferManager/TransferMarket foundation from leagueTest.js
3. Create new transferStore.js for UI state management
4. Enhance gameStore.js for season history tracking
5. Follow Football Manager UI patterns (data-dense, compact)

---

## Integration Points

### Existing Systems to Connect
1. **PlayoffSimulator.js** → New PlayoffView.jsx
2. **LeagueSimulator.js** → Orchestrate full seasonal loop
3. **TransferManager.js** → Add user interaction layer
4. **gameStore.js** → Add season/phase tracking
5. **financeStore.js** → Prize distribution integration

### New Systems to Build
1. **OffSeasonManager.js** → Orchestrate 6-week off-season
2. **RetentionManager.js** → Handle retention/release cycles
3. **PrizeDistributor.js** → Distribute season-end prizes
4. **UserTransferHandler.js** → User transfer interactions
5. **transferStore.js** → Transfer UI state

---

## Dependencies

### External
- React 18
- Zustand (state management)
- React Router (navigation)
- Lucide React (icons)
- Tailwind CSS (styling)

### Internal
- `src/core/league/PlayoffSimulator.js` (existing)
- `src/core/league/LeagueSimulator.js` (existing)
- `src/core/finance/TransferManager.js` (existing)
- `src/core/finance/TransferMarket.js` (existing)
- `src/core/finance/TransferAI.js` (existing)
- `src/stores/gameStore.js` (existing)
- `src/stores/leagueStore.js` (existing)
- `src/stores/financeStore.js` (existing)

---

## Challenges & Solutions

### Challenge 1: Playoff Backend Already Complete
**Solution**: Focus on UI integration only. PlayoffSimulator.js works perfectly, just needs frontend visualization.

### Challenge 2: Transfer System is CLI-only
**Solution**: Extract logic into UserTransferHandler.js, create transferStore.js for UI state, build comprehensive TransferMarketView.jsx.

### Challenge 3: Calendar Not Connected to League
**Solution**: Make LeagueSimulator use gameStore.advanceDay() during match-week progression. Schedule matches as calendar events.

### Challenge 4: Multi-Season State Management
**Solution**: Add seasonHistory array to gameStore.js. Track cumulative career stats in playerStore.js. Persist everything to localStorage.

---

## Performance Considerations

- Match engine must maintain 50k+ balls/second
- Large dataset rendering (545 players in transfer market)
- React virtualization for long lists
- Optimize re-renders with proper memoization
- Keep playoff bracket updates smooth

---

## Testing Strategy

### Unit Testing
- OffSeasonManager methods
- RetentionManager validation
- PrizeDistributor calculations
- UserTransferHandler actions

### Integration Testing
- Full season cycle (league → playoffs → off-season → new season)
- 2-season loop with re-auction
- Transfer window open/close
- Budget constraint enforcement

### UI Testing
- Playoff bracket updates correctly
- Transfer market filtering/sorting
- Retention selection (3-8 players)
- Season summary displays prizes

### Edge Cases
- Empty auction pool after retention
- Team bankruptcy during season
- Selling below minimum squad size
- Re-auction with insufficient budget

---

## Code Style Guidelines

### React Components
- Functional components with hooks
- JSDoc comments for complex logic
- Lucide React icons only
- Tailwind CSS for styling
- 14px base font size
- Cricket Green (#2D5F3F) and Trophy Gold (#D4AF37) palette

### State Management
- Zustand stores for global state
- localStorage persistence enabled
- Separate UI state (transferStore) from data state (leagueStore)

### File Organization
- Core logic in `src/core/`
- React components in `src/components/`
- Stores in `src/stores/`
- Follow existing directory structure

---

## References

### Documentation
- `docs/architecture/system-overview.md` - Overall architecture
- `docs/core-systems/league-system.md` - League mechanics
- `docs/core-systems/finance-system.md` - Finance tracking
- `docs/frontend/design-system.md` - UI patterns
- `ROADMAP.md` - Project status

### Code References
- `src/test/leagueTest.js:543-683` - Transfer window implementation
- `src/core/league/PlayoffSimulator.js` - Playoff logic
- `src/core/league/LeagueSimulator.js:616-617` - Match-week simulation
- `src/stores/gameStore.js` - Calendar infrastructure

---

## Communication Notes

User requested:
1. Understand current game flow ✓
2. Implement playoffs after league ✓ (planned)
3. Add off-season with transfers ✓ (planned)
4. Create seasonal loop (6 months per season) ✓ (planned)
5. Re-auction every 2 seasons ✓ (planned)
6. Use leagueTest.js transfer system as foundation ✓ (analyzed)

User wants suggestions on transfer mechanics - provided in plan.md under "Transfer Market Improvements" section.

---

## Next Immediate Steps

1. ✓ Create plan.md
2. → Create context.md (this file)
3. → Create tasks.md
4. → Read existing LeagueView.jsx to understand navigation pattern
5. → Create PlayoffView.jsx component
6. → Integrate playoff navigation in LeagueView
7. → Test playoff display in UI

---

## Context Preservation Notes

This is a large multi-sprint feature. Key things to remember:

1. **Playoff system is done** - only needs UI
2. **Transfer system foundation exists** - enhance, don't rebuild
3. **6-week off-season is mandatory** - 26 weeks total per season
4. **Re-auction every 2 seasons** - retention phase before auction
5. **User wants transfer market suggestions** - provided interactive bidding, negotiation, free agency improvements

If context runs low:
- Reference plan.md for overall strategy
- Reference tasks.md for granular checklist
- Update this file with current state before stopping
