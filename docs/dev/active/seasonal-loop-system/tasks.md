# Seasonal Loop System - Task Checklist

**Last Updated**: 2025-01-17
**Current Sprint**: Sprint 1 - Playoffs UI

---

## Sprint 1: Playoffs UI Integration

### 1.1 Research & Planning
- [x] Analyze PlayoffSimulator.js implementation
- [x] Understand playoff fixture structure
- [x] Review existing LeagueView.jsx navigation
- [ ] Review existing MatchCard.jsx component patterns
- [ ] Design playoff bracket UI layout

### 1.2 PlayoffView Component
- [ ] Create `src/components/Playoffs/PlayoffView.jsx`
- [ ] Implement playoff bracket visualization
- [ ] Add Qualifier 1 match display
- [ ] Add Eliminator match display
- [ ] Add Qualifier 2 match display (dynamic based on Q1/E results)
- [ ] Add Final match display
- [ ] Show eliminated teams styling
- [ ] Add champion announcement banner
- [ ] Add match result details on click
- [ ] Style with Football Manager aesthetic

### 1.3 Navigation Integration
- [ ] Read `src/components/League/LeagueView.jsx`
- [ ] Add "Playoffs" tab to LeagueView navigation
- [ ] Show/hide tab based on `league.stage === 'playoffs'`
- [ ] Update active tab styling
- [ ] Test navigation flow

### 1.4 Simulation Controls
- [ ] Add "Simulate Playoff Week" button
- [ ] Integrate with LeagueSimulator.simulateByMatchWeek()
- [ ] Update playoff bracket after each match
- [ ] Show loading state during simulation
- [ ] Display match results notifications

### 1.5 Testing
- [ ] Test playoff simulation flow
- [ ] Test bracket updates correctly
- [ ] Test champion announcement
- [ ] Test navigation between League/Playoffs tabs
- [ ] Test with different playoff scenarios

---

## Sprint 2: Off-Season Foundation

### 2.1 PrizeDistributor
- [ ] Create `src/core/offseason/PrizeDistributor.js`
- [ ] Implement graduated prize structure (1st-10th)
- [ ] Add `distributePrizes(standings)` method
- [ ] Integrate with financeStore.addRevenue()
- [ ] Add logging for prize distribution
- [ ] Test with different standings

### 2.2 OffSeasonManager
- [ ] Create `src/core/offseason/OffSeasonManager.js`
- [ ] Add constructor with store dependencies
- [ ] Implement `startOffSeason(seasonResults)` method
- [ ] Implement `processOffSeasonWeek(weekNumber)` method
- [ ] Add prize distribution in week 21
- [ ] Add transfer window opening in week 22
- [ ] Add transfer window closing in week 26
- [ ] Add season transition logic
- [ ] Test full off-season cycle

### 2.3 SeasonSummaryView
- [ ] Create `src/components/OffSeason/SeasonSummaryView.jsx`
- [ ] Display champion with trophy icon
- [ ] Show final standings table
- [ ] Display prize money per team
- [ ] Show season awards (top scorer, wicket-taker)
- [ ] Add season statistics
- [ ] Add "Continue to Off-Season" button
- [ ] Style with celebration theme

### 2.4 OffSeasonHub
- [ ] Create `src/components/OffSeason/OffSeasonHub.jsx`
- [ ] Display current off-season week (21-26)
- [ ] Show active events dashboard
- [ ] Add "Transfer Market" button (weeks 22-26)
- [ ] Add "Advance Week" button
- [ ] Show countdown to next season
- [ ] Display team budget status
- [ ] Add notifications panel

### 2.5 gameStore Enhancements
- [ ] Add `seasonHistory` array to gameStore.js
- [ ] Add `currentPhase` ('preseason', 'league', 'playoffs', 'offseason')
- [ ] Add `advanceToOffSeason()` method
- [ ] Add `startNewSeason()` method
- [ ] Add `isReAuctionYear` flag
- [ ] Test state persistence

---

## Sprint 3: Enhanced Transfer System

### 3.1 transferStore (UI State)
- [ ] Create `src/stores/transferStore.js`
- [ ] Add active listings state
- [ ] Add user bids state
- [ ] Add free agency pool state
- [ ] Add notifications state
- [ ] Add filters/sorting state
- [ ] Add `listPlayer(playerId, askingPrice)` action
- [ ] Add `makeBid(listingId, amount)` action
- [ ] Add `acceptBid(listingId)` action
- [ ] Add `signFreeAgent(playerId)` action
- [ ] Enable localStorage persistence

### 3.2 UserTransferHandler
- [ ] Create `src/core/transfers/UserTransferHandler.js`
- [ ] Add `listPlayerForSale(teamId, playerId, price)` method
- [ ] Add `browseMar ket(filters)` method
- [ ] Add `placeBid(listingId, amount)` method
- [ ] Add `acceptOffer(listingId)` method
- [ ] Add `signFreeAgent(playerId)` method
- [ ] Add budget validation
- [ ] Add squad size validation
- [ ] Integrate with TransferMarket.js
- [ ] Test all user actions

### 3.3 TransferManager Enhancements
- [ ] Extend TransferManager for 14-day off-season listings
- [ ] Add `listingDuration` parameter (7 or 14 days)
- [ ] Add free agency pool support
- [ ] Add user notification hooks
- [ ] Test mid-season vs off-season windows

### 3.4 MarketplaceView
- [ ] Create `src/components/Transfers/MarketplaceView.jsx`
- [ ] Display grid of active listings
- [ ] Add filters (position, rating, price range)
- [ ] Add sorting (price, rating, time remaining)
- [ ] Show AI team interest indicators
- [ ] Add search functionality
- [ ] Integrate with ListingCard

### 3.5 ListingCard
- [ ] Create `src/components/Transfers/ListingCard.jsx`
- [ ] Display player name, rating, position
- [ ] Show current bid amount
- [ ] Show time remaining (7 or 14 days)
- [ ] Show AI interest level
- [ ] Add "Place Bid" button
- [ ] Show bid history
- [ ] Style compactly

### 3.6 BidModal
- [ ] Create `src/components/Transfers/BidModal.jsx`
- [ ] Display player details
- [ ] Show current highest bid
- [ ] Input field for bid amount
- [ ] Validate bid (increment, budget)
- [ ] Show budget remaining after bid
- [ ] Add "Confirm Bid" button
- [ ] Add "Auto-Bid" option with max price

### 3.7 MyListingsView
- [ ] Create `src/components/Transfers/MyListingsView.jsx`
- [ ] Display user's active listings
- [ ] Show current bids on each listing
- [ ] Add "Accept Bid" button
- [ ] Add "Counter Offer" option
- [ ] Show listing expiry time
- [ ] Add "Withdraw Listing" button (if no bids)

### 3.8 FreeAgencyView
- [ ] Create `src/components/Transfers/FreeAgencyView.jsx`
- [ ] Display available free agents
- [ ] Show player ratings and positions
- [ ] Add filters and sorting
- [ ] Add "Sign Player" button
- [ ] Validate budget before signing
- [ ] Validate squad size (max 20)
- [ ] Show successful signings

### 3.9 TransferMarketView (Main Container)
- [ ] Create `src/components/Transfers/TransferMarketView.jsx`
- [ ] Add tab navigation (Marketplace, My Listings, Free Agency)
- [ ] Integrate all sub-views
- [ ] Add transaction history section
- [ ] Show budget summary
- [ ] Add notifications area
- [ ] Style with FM aesthetic

### 3.10 Testing
- [ ] Test listing player flow
- [ ] Test bidding flow with AI competition
- [ ] Test accept/reject offers
- [ ] Test free agency signings
- [ ] Test budget constraints
- [ ] Test 14-day off-season listings

---

## Sprint 4: Retention & Re-Auction

### 4.1 RetentionEngine & Config ✅
- [x] Create `src/data/config/retentionConfig.json` (tiered caps, negotiation, AI, purse)
- [x] Create `src/core/retention/RetentionEngine.js` (orchestrator)
- [x] Create `src/core/retention/RetentionAI.js` (IPM/VFM-based AI decisions)
- [x] Create `src/core/retention/PlayerAcceptance.js` (3-attempt negotiation)
- [x] Add `initializeRetentionPhase()`, `validateRetention()`, `finalizeRetentions()`
- [x] Add tiered salary cap validation ($5M/5, $7.5M/10, $8.5M/15)
- [x] Add elite player auto-retention (rating >= 85)

### 4.2 RetentionStore ✅
- [x] Create `src/stores/retentionStore.js` (Zustand + IndexedDB)
- [x] Register in storeHydration.js
- [x] Track per-team retentions, active negotiations, phase state

### 4.3 RetentionView & NegotiationModal ✅
- [x] Create `src/components/Retention/RetentionView.jsx` (two-column FM layout)
- [x] Create `src/components/Retention/RetentionNegotiationModal.jsx`
- [x] SortableTable with retain/release actions per player
- [x] Tier cap progress bars and auction purse display
- [x] Salary slider with market value hint range
- [x] 3-attempt counter-offer negotiation flow

### 4.4 Auction Integration ✅
- [x] Modified AuctionEngine.initializeAuction() to accept teamPurses + retainedSquads
- [x] Pre-populate squads with retained players, set reduced budgets
- [x] Exclude retained player IDs from auction pool
- [x] Updated Transfers.jsx to pass retention data (both fresh + restore paths)

### 4.5 Game Flow Integration ✅
- [x] Header.jsx: odd seasons >= 3 → AI retentions + navigate to /game/retention
- [x] SimulationEngine.js: runRetention() before runAuction() for sim-to-date
- [x] App.jsx: /game/retention route added

### 4.6 Testing (TODO)
- [ ] Test Season 2 → Season 3 retention screen appears
- [ ] Test tier cap validation in UI
- [ ] Test 3-attempt negotiation with various salary offers
- [ ] Test AI team retention results (8-12 players each)
- [ ] Test auction reduced purse matches retention spending
- [ ] Test sim-to-date through even season end
- [ ] Test save/load during retention phase

---

## Sprint 5: Seasonal Loop Integration

### 5.1 LeagueSimulator Enhancements
- [ ] Read current LeagueSimulator.js implementation
- [ ] Add playoff completion detection
- [ ] Add off-season transition logic
- [ ] Add new season initialization
- [ ] Connect to OffSeasonManager
- [ ] Connect to RetentionManager (even seasons)
- [ ] Test full cycle: league → playoffs → off-season → new season

### 5.2 Calendar Integration
- [ ] Connect match-week progression to gameStore.advanceDay()
- [ ] Schedule matches as calendar events
- [ ] Update currentPhase on phase transitions
- [ ] Implement day-by-day advancement
- [ ] Test calendar accuracy

### 5.3 Season History Tracking
- [ ] Capture season results in gameStore.seasonHistory
- [ ] Store champion, runner-up, standings
- [ ] Store season awards (top scorer, etc.)
- [ ] Store transfer activity summary
- [ ] Store financial summary
- [ ] Display historical seasons in UI

### 5.4 Automatic Season Progression
- [ ] Implement automatic phase transitions
- [ ] Add user prompts at key moments (season end, etc.)
- [ ] Add "Advance to Next Season" button
- [ ] Add "Simulate Off-Season" option
- [ ] Test seamless progression

### 5.5 Multi-Season Testing
- [ ] Test Season 1 (odd) → Season 2 (even) transition
- [ ] Test Season 2 (even) → Retention → Re-Auction → Season 3
- [ ] Test Season 3 (odd) → Season 4 (even) loop
- [ ] Verify season history accumulates correctly
- [ ] Verify player career stats persist

---

## Sprint 6: Polish & Testing

### 6.1 Notification System
- [ ] Create notification component
- [ ] Add transfer completion notifications
- [ ] Add outbid notifications
- [ ] Add season milestone notifications
- [ ] Add budget warning notifications
- [ ] Style notification panel

### 6.2 UI/UX Polish
- [ ] Review all new screens for consistency
- [ ] Apply Football Manager design patterns
- [ ] Optimize spacing and typography
- [ ] Add loading states
- [ ] Add error states
- [ ] Add empty states
- [ ] Improve mobile responsiveness
- [ ] Add tooltips and help text

### 6.3 Edge Case Testing
- [ ] Test team bankruptcy scenario
- [ ] Test selling below minimum squad (11)
- [ ] Test empty auction pool
- [ ] Test insufficient budget for retention
- [ ] Test concurrent user/AI bids
- [ ] Test network errors (if applicable)

### 6.4 Performance Testing
- [ ] Test with 545 players in transfer market
- [ ] Verify match engine maintains 50k+ balls/second
- [ ] Optimize React re-renders
- [ ] Test localStorage size with season history
- [ ] Profile and optimize bottlenecks

### 6.5 Documentation Updates
- [ ] Update ROADMAP.md with seasonal loop completion
- [ ] Update docs/core-systems/league-system.md
- [ ] Create docs/core-systems/offseason-system.md
- [ ] Update docs/core-systems/transfer-system.md
- [ ] Create docs/frontend/seasonal-flow.md
- [ ] Update CLAUDE.md if needed

### 6.6 Final Testing
- [ ] Complete end-to-end playthrough (2 full seasons)
- [ ] Verify all features work together
- [ ] Check for console errors
- [ ] Verify state persistence
- [ ] User acceptance testing

---

## Completion Criteria

### Sprint 1 Complete When:
- [ ] Playoff bracket displays correctly
- [ ] Playoff simulation works in UI
- [ ] Champion announcement shows
- [ ] Navigation between League/Playoffs seamless

### Sprint 2 Complete When:
- [ ] Off-season triggers after playoffs
- [ ] Prizes distribute correctly
- [ ] Season summary displays all info
- [ ] Off-season hub functional

### Sprint 3 Complete When:
- [ ] Transfer market fully interactive
- [ ] User can list, bid, accept, sign players
- [ ] AI competes realistically
- [ ] Budget constraints enforced

### Sprint 4 Complete When:
- [x] Retention phase triggers before odd-season auctions (season >= 3)
- [x] Tiered salary cap validation working (up to 15 players)
- [x] 3-attempt negotiation with counter-offers
- [x] AI retention decisions based on IPM/elite status
- [x] Auction receives reduced purses and pre-populated squads
- [x] Both UI and sim-to-date paths implemented
- [ ] Manual testing complete (see 4.6)

### Sprint 5 Complete When:
- [ ] Full season cycle works automatically
- [ ] Seasons loop indefinitely
- [ ] Season history accumulates
- [ ] Calendar stays synchronized

### Sprint 6 Complete When:
- [ ] All edge cases handled gracefully
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] 2-season playthrough successful

---

## Notes

- Update this checklist as tasks complete
- Add new tasks as requirements emerge
- Mark dependencies between tasks
- Track blockers separately in context.md
