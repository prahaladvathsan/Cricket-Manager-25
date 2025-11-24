# Seasonal Loop System - Implementation Plan

**Status**: Active Development
**Created**: 2025-01-17
**Sprint**: Sprint 1 - Playoffs UI

---

## Overview

Transform Cricket Manager 25 from single-season to perpetual multi-season game with:
- Playoff system (already built, needs UI)
- 6-week off-season with transfers
- Retention/re-auction every 2 seasons
- Seamless seasonal loops

---

## Timeline Structure (26 Weeks = 6 Months)

- **Week 1-18**: League stage (90 matches, 5 per week)
- **Week 19-20**: Playoffs (4 matches)
- **Week 21**: Prize distribution + Season review
- **Week 22-26**: Transfer window (5 active weeks)
- **Week 27 (Next Season Week 1)**: New season begins

---

## Key Design Decisions

### Confirmed Requirements
✓ **6-week off-season** (total 26 weeks = 6 months per season)
✓ **3-8 player retention** (minimum 3, maximum 8 per team)
✓ **1st-10th prize distribution** (graduated prizes for all teams)
✓ **14-day off-season listings** (vs 7-day mid-season)
✓ **Free agency for released players** (no bidding required)
✓ **Re-auction every 2 seasons** (even-numbered seasons)
✓ **Retention cost**: 70% of last purchase price

### Season Progression Flow
```
Season 1 (Odd)
  → League (18 weeks)
  → Playoffs (2 weeks)
  → Off-Season (6 weeks: prizes + transfers)
  → Season 2 (Even)

Season 2 (Even)
  → League (18 weeks)
  → Playoffs (2 weeks)
  → Off-Season (6 weeks: prizes + transfers + RETENTION)
  → Re-Auction
  → Season 3 (Odd)

[Loop continues indefinitely]
```

---

## Prize Money Structure

```javascript
const SEASON_PRIZES = {
  1: 5000000,   // $5M Champion
  2: 3000000,   // $3M Runner-up
  3: 2000000,   // $2M
  4: 1500000,   // $1.5M
  5: 1000000,   // $1M
  6: 750000,    // $750K
  7: 500000,    // $500K
  8: 400000,    // $400K
  9: 300000,    // $300K
  10: 200000    // $200K
};
```

---

## Architecture Overview

### New Core Systems

#### 1. OffSeasonManager.js
Orchestrates 6-week off-season:
- Week 21: Prize distribution + season summary
- Week 22-26: Transfer window management
- Check for re-auction trigger (even seasons)
- Transition to new season

#### 2. RetentionManager.js
Manages retention/release (even seasons only):
- User retention UI (select 3-8 players)
- AI retention logic (performance-based)
- Calculate retention costs (70% of last price)
- Build auction pool from releases

#### 3. PrizeDistributor.js
Season-end prize distribution:
- Graduated prizes (1st-10th)
- Integration with financeStore
- Display in season summary

#### 4. UserTransferHandler.js
User interaction layer for transfers:
- List players for sale
- Browse transfer market
- Make/accept bids
- Sign free agents

### Enhanced Existing Systems

#### LeagueSimulator.js
- Connect league → playoffs → off-season → new season
- Automatic phase progression
- Season loop coordination

#### gameStore.js
Add season tracking:
```javascript
{
  currentSeason: 1,
  currentYear: 2025,
  isReAuctionYear: false,
  seasonHistory: [...]
}
```

#### TransferManager.js
Enhance for off-season:
- 14-day listings (vs 7-day mid-season)
- Free agency pool support
- User interaction hooks

---

## UI Components

### New Screens

1. **PlayoffView.jsx**
   - Playoff bracket visualization
   - Match progression display
   - Champion announcement

2. **SeasonSummaryView.jsx**
   - Champion trophy display
   - Final standings with prizes
   - Season awards (top scorer, etc.)
   - Continue to off-season button

3. **OffSeasonHub.jsx**
   - Current week indicator
   - Active events dashboard
   - Transfer market access
   - Advance week button

4. **TransferMarketView.jsx**
   - Active listings grid
   - User's listings management
   - Free agency pool
   - Bidding interface
   - Transaction history

5. **RetentionView.jsx** (even seasons)
   - Full squad display
   - Multi-select retention (3-8 players)
   - Budget impact calculator
   - Confirmation workflow
   - League-wide retention summary

### Navigation Updates
- Add "Playoffs" tab when `stage === 'playoffs'`
- Add "Off-Season" tab when `phase === 'offseason'`
- Show season/week in header
- Disable tabs appropriately per phase

---

## Transfer Market Improvements

### Current System (from leagueTest.js)
✓ Performance-based AI selling
✓ Need-based AI buying
✓ Budget constraints enforced
✓ 7-day listings with daily bidding
✓ Finance integration complete

### Proposed Enhancements

#### 1. Interactive Bidding
- User notifications when outbid
- Immediate counter-bid option
- AI competitive response (1-24 hours)
- Auto-bid: Set max price, system bids automatically

#### 2. Negotiation Mechanics
- User sets asking price when listing
- AI teams make visible offers
- User can accept/reject/counter
- Adds strategic depth

#### 3. Market Intelligence
- Show AI team interest levels (High/Medium/Low)
- Display valuation estimates per team
- Historical transfer prices
- "Hot players" trending indicator

#### 4. Free Agency
- Released players enter pool instantly
- First-come-first-served signing
- Budget validation only
- Squad size cap (18-20 players)

#### 5. Squad Balance Validation
- Enforce minimum 11 players before selling
- Warn if selling last specialist (WK, pace bowler)
- Suggest role gaps when browsing

---

## Implementation Sprints

### Sprint 1: Playoffs UI ⚡ CURRENT
- [ ] Create PlayoffView.jsx component
- [ ] Integrate with LeagueView navigation
- [ ] Test playoff simulation flow

### Sprint 2: Off-Season Foundation
- [ ] Build OffSeasonManager.js
- [ ] Implement PrizeDistributor.js
- [ ] Create SeasonSummaryView.jsx
- [ ] Create OffSeasonHub.jsx

### Sprint 3: Enhanced Transfer System
- [ ] Build UserTransferHandler.js
- [ ] Create transferStore.js
- [ ] Create TransferMarketView.jsx + sub-components
- [ ] Implement 14-day listings
- [ ] Add free agency pool

### Sprint 4: Retention & Re-Auction
- [ ] Build RetentionManager.js
- [ ] Create RetentionView.jsx
- [ ] Implement 3-8 player selection
- [ ] Build auction pool from releases
- [ ] Integrate re-auction trigger

### Sprint 5: Seasonal Loop
- [ ] Connect all phases in LeagueSimulator
- [ ] Implement automatic progression
- [ ] Add season history tracking
- [ ] Test complete 2-season cycle

### Sprint 6: Polish & Testing
- [ ] Add notification system
- [ ] Polish UI/UX flow
- [ ] Test edge cases
- [ ] Update documentation

---

## File Structure

```
src/
├── core/
│   ├── offseason/
│   │   ├── OffSeasonManager.js      [NEW]
│   │   ├── RetentionManager.js       [NEW]
│   │   └── PrizeDistributor.js       [NEW]
│   ├── transfers/
│   │   ├── TransferManager.js        [ENHANCE]
│   │   ├── TransferMarket.js         [ENHANCE]
│   │   ├── TransferAI.js             [EXISTING]
│   │   └── UserTransferHandler.js    [NEW]
│   └── league/
│       ├── LeagueSimulator.js        [ENHANCE]
│       └── PlayoffSimulator.js       [EXISTING]
├── components/
│   ├── OffSeason/
│   │   ├── OffSeasonHub.jsx          [NEW]
│   │   └── SeasonSummaryView.jsx     [NEW]
│   ├── Transfers/
│   │   ├── TransferMarketView.jsx    [NEW]
│   │   ├── MarketplaceView.jsx       [NEW]
│   │   ├── ListingCard.jsx           [NEW]
│   │   ├── BidModal.jsx              [NEW]
│   │   ├── MyListingsView.jsx        [NEW]
│   │   └── FreeAgencyView.jsx        [NEW]
│   ├── Retention/
│   │   └── RetentionView.jsx         [NEW]
│   ├── Playoffs/
│   │   └── PlayoffView.jsx           [NEW]
│   └── League/
│       └── LeagueView.jsx            [ENHANCE]
└── stores/
    ├── gameStore.js                   [ENHANCE]
    ├── leagueStore.js                 [ENHANCE]
    └── transferStore.js               [NEW]
```

---

## Testing Strategy

1. **Unit Tests**: Each manager class individually
2. **Integration Tests**: Full season cycle
3. **UI Tests**: User interaction flows
4. **Performance Tests**: Maintain 50k+ balls/second
5. **Edge Cases**: Empty pools, budget shortfalls, minimum squads

---

## Success Criteria

- [x] Playoffs integrate seamlessly with UI
- [ ] Off-season flows naturally from playoffs
- [ ] Transfer market is intuitive and engaging
- [ ] Retention/re-auction works every 2 seasons
- [ ] Seasons loop indefinitely without manual intervention
- [ ] All systems maintain performance benchmarks
- [ ] User experience feels like Football Manager career mode

---

## Notes

- Playoff system already fully functional in backend (PlayoffSimulator.js)
- Transfer system foundation solid (from leagueTest.js implementation)
- Calendar infrastructure exists in gameStore.js (needs integration)
- Finance system ready for prize distribution
- Main work is UI/UX and orchestration layer
