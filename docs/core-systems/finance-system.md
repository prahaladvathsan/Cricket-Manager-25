# Finance & Transfer System

Complete documentation for Cricket Manager's financial management and player transfer systems.

## Overview

The finance system manages team budgets, revenues, expenses, and player transfers throughout a WPL season. It integrates with the auction system, league simulation, and provides comprehensive financial tracking.

**Key Components:**
- **FinanceEngine**: Core financial calculations and tracking
- **financeStore**: Zustand store wrapper for React integration
- **TransferMarket**: Player trading marketplace
- **TransferAI**: AI decision-making for transfers
- **Configuration**: `financeConfig.json` and `transferConfig.json`

---

## Architecture

### File Structure

```
src/
├── core/
│   └── finance/
│       ├── FinanceEngine.js       # Core financial engine
│       ├── TransferMarket.js      # Transfer marketplace
│       └── TransferAI.js          # AI transfer decisions
├── stores/
│   └── financeStore.js           # Zustand state management
├── data/config/
│   ├── financeConfig.json        # Financial parameters
│   └── transferConfig.json       # Transfer rules
└── test/
    └── financeTest.js            # Comprehensive tests
```

### System Integration

```
┌─────────────────────────────────────────────────────────────┐
│                   Game Progression                           │
└─────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐  ┌──────────┐  ┌────────────┐
│ AuctionEngine │  │  League  │  │  Transfer  │
│               │  │Simulator │  │  Market    │
└───────┬───────┘  └─────┬────┘  └─────┬──────┘
        │                │               │
        └────────────────┼───────────────┘
                         ▼
                 ┌───────────────┐
                 │ financeStore  │
                 │  (Zustand)    │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ FinanceEngine │
                 │  (Core Logic) │
                 └───────────────┘
```

---

## Finance Engine

### Core Responsibilities

1. **Budget Management**: Track team budgets and validate spending
2. **Revenue Tracking**: Sponsorships, match revenues, prizes, transfer sales
3. **Expense Tracking**: Auction spending, transfer purchases
4. **Transaction History**: Complete audit trail of all financial events
5. **Financial Reports**: Comprehensive team and league-wide statistics

### Season Initialization

```javascript
// Initialize finances for a new season
const teams = [
  { id: 'team_1', name: 'Mumbai Thunders' },
  { id: 'team_2', name: 'London Lions' }
];

const previousSeasonStandings = {
  team_1: 1,  // Champion gets $1M sponsorship
  team_2: 5   // Mid-table gets $800K sponsorship
};

financeStore.getState().initializeSeason(
  teams,
  'wpl_2025',
  previousSeasonStandings
);
```

**Initial Budgets:**
- Base: $10M per team
- Sponsorship: $400K-$1M based on previous season standing
- **Total**: $10.4M-$11M per team at season start

### Revenue Streams

#### 1. Sponsorship Revenue
- **Timing**: Paid at season start
- **Based On**: Previous season final standing
- **Amounts**:
  - 1st place: $1,000,000
  - 2nd place: $950,000
  - 3rd place: $900,000
  - ...
  - 10th place: $400,000

```javascript
// Automatically calculated during season initialization
// No manual action required
```

#### 2. Match Ticket Revenue
- **Timing**: After each home match
- **Base**: $20,000 per match
- **Performance Bonus**:
  - +$2,000 per win in last 5 matches
  - -$500 per loss in last 5 matches
- **Minimum**: $5,000

```javascript
// Automatically called by LeagueSimulator after each match
financeStore.getState().calculateTicketRevenue(homeTeamId);
```

#### 3. Broadcast Rights Revenue
- **Timing**: After each match (both teams)
- **Base**: $30,000 per match
- **Performance Multiplier**:
  - Top 4 teams: 1.5x ($45,000)
  - Top 7 teams: 1.2x ($36,000)
  - Bottom 3 teams: 0.8x ($24,000)

```javascript
// Automatically called by LeagueSimulator after each match
financeStore.getState().calculateBroadcastRevenue(teamId);
```

#### 4. Match Win Prize
- **Amount**: $50,000 per victory
- **Timing**: Immediately after match

```javascript
// Automatically awarded to winning team
financeStore.getState().awardMatchWinPrize(winnerTeamId);
```

#### 5. Season-End Prizes
- **1st Place (Champion)**: $2,000,000
- **2nd Place (Runner-up)**: $1,000,000
- **3rd Place**: $750,000
- **4th Place**: $500,000
- **5th-10th Place**: $250,000 each

```javascript
// Automatically called after playoffs complete
const finalStandings = [
  { clubId: 'team_1', position: 1 },
  { clubId: 'team_2', position: 2 },
  // ...
];

financeStore.getState().distributeSeasonEndPrizes(
  finalStandings.map((s, i) => ({ teamId: s.clubId, position: i + 1 }))
);
```

### Expenses

#### 1. Auction Spending
- **When**: After player auction completes
- **Tracked**: Total spent, players acquired

```javascript
const auctionResults = [
  { teamId: 'team_1', spending: 8500000, players: [...] },
  // ...
];

financeStore.getState().processAuctionResults(auctionResults);
```

#### 2. Transfer Purchases
- **When**: Transfer window is open
- **Includes**: Transfer fee + agent fees (5%)

```javascript
financeStore.getState().processTransferPurchase(
  buyerTeamId,
  sellerTeamId,
  player,
  transferFee
);
```

### Financial Queries

#### Get Team Budget
```javascript
const budget = financeStore.getState().getTeamBudget('team_1');
// Returns: 2500000 (current budget in dollars)
```

#### Get Complete Team Finances
```javascript
const finances = financeStore.getState().getTeamFinances('team_1');
/* Returns:
{
  teamId: 'team_1',
  teamName: 'Mumbai Thunders',
  currentBudget: 2500000,
  initialBudget: 10000000,
  totalRevenue: 3120000,
  totalExpenses: 10620000,
  sponsorshipRevenue: 1000000,
  ticketRevenue: 22000,
  broadcastRevenue: 48000,
  prizeMoneyWins: 50000,
  prizeMoneySeasonEnd: 2000000,
  auctionSpending: 8500000,
  transferSpending: 500000,
  transferEarnings: 0,
  matchesPlayed: 5,
  wins: 3,
  recentForm: ['W', 'L', 'W', 'W', 'L']
}
*/
```

#### Generate Financial Report
```javascript
const report = financeStore.getState().generateTeamReport('team_1');
/* Returns detailed report with:
- Budget breakdown (initial, current, change %)
- Revenue breakdown (all sources)
- Expense breakdown (auction, transfers)
- Performance metrics (matches, wins, form)
- Recent transaction history
*/
```

#### Budget Validation
```javascript
const validation = financeStore.getState().validateBudget('team_1', 5000000);
/* Returns:
{
  canAfford: false,
  currentBudget: 2500000,
  shortfall: 2500000,
  belowReserve: true  // Would go below $500K reserve
}
*/
```

### League-Wide Statistics
```javascript
const stats = financeStore.getState().getLeagueFinancialStats();
/* Returns:
{
  totalBudget: 30000000,
  avgBudget: 3000000,
  totalRevenue: 25000000,
  totalExpenses: 85000000,
  richestTeam: { teamName: '...', currentBudget: 5000000 },
  poorestTeam: { teamName: '...', currentBudget: 1500000 },
  totalTransactions: 150
}
*/
```

---

## Transfer System

### Components

1. **TransferMarket**: Marketplace for player listings and offers
2. **TransferAI**: AI decision-making for buying/selling
3. **transferConfig.json**: Rules and parameters

### Transfer Windows

#### Pre-Auction Window
- **Timing**: Before season auction
- **Duration**: 7 days
- **Max Transfers**: 3 per team
- **Purpose**: Early squad adjustments

#### Mid-Season Window
- **Timing**: After matchday 45 (halfway through league stage)
- **Duration**: 14 days
- **Max Transfers**: 5 per team
- **Purpose**: Main trading period

```javascript
// Open transfer window
transferMarket.openTransferWindow('midSeason', currentMatchday);

// Close transfer window
transferMarket.closeTransferWindow();
```

### Listing Players

```javascript
const result = transferMarket.listPlayer({
  teamId: 'team_1',
  teamName: 'Mumbai Thunders',
  playerId: 'player_123',
  player: playerObject,
  askingPrice: 1000000,  // $1M
  urgency: 'normal'      // or 'urgentSale', 'noUrgency'
});

if (result.success) {
  console.log('Player listed:', result.listing.id);
} else {
  console.error('Listing failed:', result.error);
}
```

**Listing Fees:**
- 1% of asking price
- Minimum: $5,000
- Paid immediately by seller

**Pricing Constraints:**
- Minimum: $50,000
- Maximum: $10,000,000

### Making Offers

```javascript
const result = transferMarket.makeOffer({
  listingId: 'listing_xyz',
  buyerTeamId: 'team_2',
  buyerTeamName: 'London Lions',
  offerAmount: 950000  // $950K
});

if (result.success) {
  if (result.autoAccepted) {
    console.log('Offer auto-accepted!');
  } else {
    console.log('Offer submitted for seller review');
  }
}
```

**Agent Fees:**
- 5% of transfer fee
- Paid by buyer on top of transfer fee
- Total cost = transfer fee + agent fee

**Auto-Accept:**
- Offers ≥125% of asking price are auto-accepted

### Accepting/Rejecting Offers

```javascript
// Accept offer
const result = transferMarket.acceptOffer(offerId, sellerTeamId);

// Reject offer
transferMarket.rejectOffer(offerId, sellerTeamId);
```

### Transfer Restrictions

1. **Squad Size**: Must maintain 15-25 players
2. **Role Protection**: Minimum counts per role
   - Batsmen: 8
   - Bowlers: 7
   - All-Rounders: 2
   - Wicket-Keepers: 2
3. **Selling Cooldown**: Cannot sell player within 2 matchdays of acquiring
4. **Buying Cooldown**: Cannot buy from same team within 1 matchday
5. **Max Transfers**: Maximum 5 transfers with same team per season

### Querying Transfer Market

```javascript
// Get all active listings
const listings = transferMarket.getActiveListings();

// Get listings by role
const batsmen = transferMarket.getActiveListings({ role: 'batsman' });

// Get team's listings
const myListings = transferMarket.getTeamListings('team_1');

// Get transfer history
const history = transferMarket.getTeamTransferHistory('team_1');

// Get market summary
const summary = transferMarket.getMarketSummary();
transferMarket.displayMarketSummary();
```

---

## Transfer AI

### AI Decision-Making Process

The AI evaluates squads and makes intelligent transfer decisions based on:

1. **Squad Analysis**: Role counts, squad size, quality
2. **Financial Constraints**: Budget, reserves
3. **Player Valuation**: Dynamic pricing based on multiple factors
4. **Market Opportunities**: Available listings and their value

### Squad Analysis

```javascript
const analysis = transferAI.analyzeSquad(team);
/* Returns:
{
  squadSize: 22,
  belowMin: false,
  aboveMax: false,
  roleCounts: { batsman: 9, bowler: 8, 'all-rounder': 3, 'wicket-keeper': 2 },
  roleNeeds: {},  // Empty if all requirements met
  hasUrgentNeeds: false,
  canSell: true,
  mustBuy: false
}
*/
```

### Buying Decisions

```javascript
const decision = transferAI.shouldBuy(team, teamFinances);
/* Returns:
{
  shouldBuy: true,
  reason: 'Opportunistic purchase',
  urgency: 'low',
  targetRoles: ['bowler', 'all-rounder'],
  maxBudget: 500000,
  analysis: {...}
}
*/
```

**Buying Triggers:**
- Squad below minimum size (15 players)
- Role requirements not met
- Opportunistic purchases (good value + budget available)

### Selling Decisions

```javascript
const decision = transferAI.shouldSell(team, teamFinances);
/* Returns:
{
  shouldSell: true,
  reason: 'Squad optimization',
  urgency: 'medium',
  count: 2,
  analysis: {...}
}
*/
```

**Selling Triggers:**
- Squad above maximum size (25 players)
- Duplicate roles (too many in one position)
- Financial pressure (budget below reserve)
- Squad optimization (large squad, 22+ players)

### Player Valuation

Transfer valuations consider:
- **Base Value**: Calculated from player attributes and playstyle ratings
- **Age**: Under 25 (+10%), Over 35 (-25%)
- **Urgency**: Urgent sale (-30%), No urgency (+20%)
- **Form**: Good form (+15%), Poor form (-15%)

```javascript
const value = transferAI.calculateTransferValue(player, {
  urgency: 'urgentSale',
  recentForm: 'good'
});
// Returns: Estimated market value in dollars
```

### Executing AI Transfer Cycle

```javascript
// Run full AI cycle for a team
const result = await transferAI.executeTransferCycle(team);
/* Returns:
{
  team: 'Mumbai Thunders',
  actions: [
    { type: 'listed_player', player: 'Old Player', price: 500000, reason: '...' },
    { type: 'made_offer', player: 'Star Player', offer: 800000, reason: '...' },
    { type: 'accepted_offer', player: 'Sold Player', amount: 600000, buyer: '...', reason: '...' }
  ]
}
*/
```

**AI Actions:**
1. Lists surplus/dispensable players
2. Makes offers on suitable players
3. Evaluates and responds to incoming offers

**AI Budget Management:**
- Never spends more than 20% of budget on single transfer
- Maintains $500K minimum reserve
- More aggressive when urgent needs exist

---

## Integration with League System

### Initialization

```javascript
import useLeagueStore from './stores/leagueStore.js';
import useFinanceStore from './stores/financeStore.js';

const leagueStore = useLeagueStore;
const financeStore = useFinanceStore;

// Create league simulator with finance integration
const simulator = new LeagueSimulator(
  leagueStore,
  playerStore,
  teamStore,
  matchStore,
  financeStore  // Pass financeStore for automatic integration
);
```

### Automatic Financial Tracking

When financeStore is provided to LeagueSimulator:

1. **Season Init**: Finances initialized with sponsorships
2. **Post-Auction**: Spending automatically recorded
3. **Post-Match**: Revenues automatically distributed (wins, tickets, broadcast)
4. **Post-Playoffs**: Season-end prizes automatically distributed

```javascript
// All automatic - no manual intervention needed
await simulator.initializeLeague({
  clubsData,
  playersData,
  useAuction: true
});

// Simulate full season with automatic finance tracking
const results = await simulator.simulateFullSeason({
  includePlayoffs: true
});

// View final financial state
const summary = financeStore.getState().getFinancialSummary();
```

---

## Configuration

### financeConfig.json

Key parameters you can adjust:

```json
{
  "initialBudgets": {
    "seasonStart": 10000000  // $10M base budget
  },
  "prizeMoneyPerWin": {
    "amount": 50000  // $50K per win
  },
  "revenueStreams": {
    "sponsorship": {
      "amounts": {
        "1": 1000000,  // Adjust sponsorship tiers
        "10": 400000
      }
    },
    "matchTickets": {
      "baseRevenue": 20000,
      "performanceBonus": {
        "perWin": 2000,
        "perLoss": -500
      }
    },
    "broadcastRights": {
      "baseRevenue": 30000,
      "performanceMultiplier": {
        "top4": 1.5,
        "top7": 1.2,
        "bottom3": 0.8
      }
    }
  },
  "seasonEndPrizes": {
    "prizes": {
      "1": { "amount": 2000000 },  // Champion
      "2": { "amount": 1000000 }   // Runner-up
    }
  }
}
```

### transferConfig.json

Key parameters:

```json
{
  "transferWindows": {
    "midSeason": {
      "startAfterMatchday": 45,
      "duration": 14,
      "maxTransfersPerTeam": 5
    }
  },
  "transferRules": {
    "squadSizeMin": 15,
    "squadSizeMax": 25,
    "minimumListingPrice": 50000,
    "maximumListingPrice": 10000000
  },
  "transferFees": {
    "listingFee": {
      "percentage": 1,
      "minimum": 5000
    },
    "agentFees": {
      "percentage": 5
    }
  }
}
```

---

## Testing

### Running Finance Tests

```bash
# Run comprehensive finance system test
node src/test/financeTest.js
```

**Test Coverage:**
1. Season initialization with sponsorships
2. Auction spending processing
3. Match revenue calculations
4. Transfer operations
5. Season-end prize distribution
6. Financial reporting
7. Budget validation
8. League-wide statistics

### Example Test Output

```
💰 FINANCE SYSTEM TEST
================================================================================

TEST 1: Season Initialization
✅ Season initialized:
   Total teams: 4
   Total budget: $43.10M
   Total revenue (sponsorships): $3.10M

TEST 2: Auction Spending
✅ Auction spending processed
   Mumbai Thunders: Spent $8.50M, Remaining $2.50M

TEST 3: Match Revenues
✅ Match financials processed
   Win Prizes: $50K
   Ticket Revenue: $22K
   Broadcast Revenue: $45K

...

✅ ALL FINANCE SYSTEM TESTS COMPLETED
```

---

## Best Practices

### 1. Always Initialize Finances
```javascript
// After initializing league, ensure finances are initialized
if (simulator.financeStore) {
  console.log('✅ Finances will be tracked automatically');
} else {
  console.warn('⚠️ No finance tracking - pass financeStore to simulator');
}
```

### 2. Check Budget Before Large Expenses
```javascript
const validation = financeStore.getState().validateBudget(teamId, amount);

if (!validation.canAfford) {
  console.error(`Insufficient funds: Shortfall of $${validation.shortfall}`);
  return;
}

if (validation.belowReserve) {
  console.warn('This would bring budget below minimum reserve');
  // Proceed with caution or block transaction
}
```

### 3. Monitor Financial Health
```javascript
// Periodic financial health checks
const teamsInDanger = financeStore.getState().getTeamsBelowReserve();

if (teamsInDanger.length > 0) {
  console.warn(`${teamsInDanger.length} teams below reserve threshold:`);
  teamsInDanger.forEach(team => {
    console.log(`  - ${team.teamName}: $${team.currentBudget}`);
  });
}
```

### 4. Use Transaction History for Auditing
```javascript
// Get complete transaction trail
const transactions = financeStore.getState().getTeamTransactionHistory(teamId);

// Filter by type
const transfers = financeStore.getState().getTransactionsByType('expense_transfer_purchase');

// Generate audit report
const report = financeStore.getState().generateTeamReport(teamId);
console.log(report.transactions.recent);
```

### 5. Transfer Window Management
```javascript
// Open window at appropriate time
if (currentMatchday === 45) {
  transferMarket.openTransferWindow('midSeason', currentMatchday);

  // Run AI transfer cycles for all teams
  for (const team of aiTeams) {
    await transferAI.executeTransferCycle(team);
  }
}

// Close window after duration
if (currentMatchday === 59) {  // 14 days later
  transferMarket.closeTransferWindow();
}
```

---

## Future Enhancements

### Planned Features

1. **Player Wages**: Recurring monthly/seasonal wage costs
2. **Contract Management**: Contract lengths, renewals, negotiations
3. **Loan System**: Temporary player loans between teams
4. **Financial Fair Play**: Budget caps and spending limits
5. **Stadium Revenue**: Upgradeable stadiums with capacity impacts
6. **Merchandise**: Team merchandise revenue stream
7. **Multi-Season Budget Carryover**: Budgets persist across seasons
8. **Dynamic Sponsorships**: Performance-based sponsorship changes mid-season

### Potential Configuration Extensions

```json
// Future: playerWages in financeConfig.json
"playerWages": {
  "ratingMultiplier": 5000,  // Base $5K per rating point
  "roleModifiers": {
    "batsman": 1.0,
    "bowler": 1.0,
    "all-rounder": 1.2,
    "wicket-keeper": 1.1
  },
  "paymentFrequency": "monthly"
}

// Future: contracts in transferConfig.json
"contracts": {
  "minimumLength": 1,
  "maximumLength": 5,
  "defaultLength": 3,
  "earlyTerminationPenalty": 0.5
}
```

---

## Troubleshooting

### Issue: Finances Not Tracking

**Problem**: Match revenues or expenses not being recorded

**Solution**:
```javascript
// Ensure financeStore is passed to LeagueSimulator
const simulator = new LeagueSimulator(
  leagueStore,
  playerStore,
  teamStore,
  matchStore,
  financeStore  // Must be provided
);

// Verify initialization
const summary = financeStore.getState().getFinancialSummary();
console.log('Initialized:', summary.totalTeams > 0);
```

### Issue: Transfer Fails Silently

**Problem**: Transfer doesn't complete but no error shown

**Check**:
1. Transfer window must be open
2. Buyer must have sufficient budget (including agent fees)
3. Transfer restrictions must be satisfied
4. Squad size constraints must be met

```javascript
// Debug transfer failure
const validation = financeStore.getState().validateBudget(buyerId, totalCost);
const restrictions = transferMarket.checkTransferRestrictions(buyerId, sellerId);
const squadAnalysis = transferAI.analyzeSquad(buyerTeam);

console.log('Budget OK:', validation.canAfford);
console.log('Restrictions OK:', restrictions.allowed);
console.log('Squad OK:', !squadAnalysis.aboveMax);
```

### Issue: Negative Budgets

**Problem**: Team budget goes negative

**Explanation**: This should not happen if financeConfig setting `negativeBudgetAllowed: false` is respected

**Solution**:
```javascript
// Always validate before spending
const validation = financeStore.getState().validateBudget(teamId, amount);
if (!validation.canAfford) {
  // Block transaction
  return;
}

// Proceed with transaction
```

---

## API Reference

### FinanceEngine

See `src/core/finance/FinanceEngine.js` for complete API.

**Key Methods:**
- `initializeSeasonFinances(teams, seasonId, previousStandings)`
- `processAuctionSpending(teamId, amount, players)`
- `processTransferPurchase(buyerTeamId, sellerTeamId, player, fee)`
- `awardMatchWinPrize(teamId)`
- `calculateTicketRevenue(teamId)`
- `calculateBroadcastRevenue(teamId)`
- `distributeSeasonEndPrizes(finalStandings)`
- `getTeamBudget(teamId)`
- `getTeamFinances(teamId)`
- `validateBudget(teamId, amount)`
- `generateTeamReport(teamId)`

### financeStore

See `src/stores/financeStore.js` for complete API.

**All FinanceEngine methods available through store** + additional helpers:
- `processMatchFinancials(matchResult, currentStandings)` - Batch process all match revenues
- `processAuctionResults(auctionResults)` - Batch process auction spending
- `getLeagueFinancialStats()` - League-wide statistics
- `getTeamsByBudget(ascending)` - Sorted team list
- `getTeamsBelowReserve()` - Teams in financial trouble

### TransferMarket

See `src/core/finance/TransferMarket.js` for complete API.

**Key Methods:**
- `openTransferWindow(windowType, currentMatchday)`
- `closeTransferWindow()`
- `listPlayer(params)`
- `removeList(listingId, teamId)`
- `makeOffer(params)`
- `acceptOffer(offerId, sellerTeamId)`
- `rejectOffer(offerId, sellerTeamId)`
- `getActiveListings(filters)`
- `getTeamListings(teamId)`
- `getMarketSummary()`
- `displayMarketSummary()`

### TransferAI

See `src/core/finance/TransferAI.js` for complete API.

**Key Methods:**
- `analyzeSquad(team)`
- `shouldBuy(team, teamFinances)`
- `shouldSell(team, teamFinances)`
- `identifyPlayersToSell(team, count)`
- `calculateTransferValue(player, context)`
- `evaluatePurchase(listing, team, teamFinances, buyingDecision)`
- `evaluateOffer(offer, listing, team, teamFinances)`
- `executeTransferCycle(team)`

---

## Summary

The Finance & Transfer System provides comprehensive financial management for Cricket Manager:

✅ **Automatic Revenue Distribution**: Sponsorships, match revenues, prizes
✅ **Expense Tracking**: Auctions, transfers, fees
✅ **Complete Transaction History**: Full audit trail
✅ **Budget Validation**: Prevents overspending
✅ **Transfer Marketplace**: Player trading with listings and offers
✅ **AI Transfer Logic**: Intelligent squad management
✅ **Comprehensive Reporting**: Detailed financial analysis
✅ **Seamless Integration**: Works automatically with league simulation

**Status**: Backend complete, ready for UI integration

**Last Updated**: January 2025 - Complete Finance & Transfer System Implementation
