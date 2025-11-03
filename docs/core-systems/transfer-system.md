# Transfer System

## Overview

The Transfer System enables mid-season player trading with performance-based valuations. The system uses a **simple, instant transaction model** based on player performance statistics compared to team averages.

**Key Features**:
- Performance-based player valuation
- Team-specific stats (reset on transfer)
- Career stats tracking (never reset)
- Instant buy/sell transactions (no negotiations)
- Weekly bidding with random hourly auctions
- Category balance considerations (batting/bowling playstyles)

**Status**: ✅ Complete (Phase 4)

---

## System Philosophy

### Design Principles

1. **Performance-Based**: Player values determined by stats, not age/form/urgency
2. **Instant Transactions**: No negotiations - buy if valuation > asking price
3. **Team Context**: Stats are team-specific and reset on transfer
4. **Career Tracking**: Lifetime career stats preserved across teams
5. **Simple AI**: Clear sell/buy triggers based on performance thresholds

### Simplifications from V1

**Removed Complexity**:
- ❌ Offer/counter-offer negotiation system
- ❌ Agent fees and listing fees
- ❌ Age/form/urgency modifiers
- ❌ Price reduction over time
- ❌ Multi-round negotiation logic

**New Approach**:
- ✅ Instant buy if buyer valuation > asking price
- ✅ Performance multiplier (0.5x - 2.0x) based on stats
- ✅ Category balance adjustments (±30%)
- ✅ Simple sell trigger: value < 80% of purchase price

---

## Data Structures

### Team Store (`teamStore.js`)

Team-specific player performance stats that **reset on transfer**:

```javascript
{
  // NEW: Performance stats (RESET on transfer)
  playerStats: {
    teamId: {
      playerId: {
        matches: 10,
        runs: 450,
        ballsFaced: 300,
        battingAverage: 45.0,
        strikeRate: 150.0,
        wickets: 12,
        ballsBowled: 120,
        runsConceded: 150,
        economy: 7.5,
        bowlingAverage: 12.5
      }
    }
  },

  // NEW: Team aggregate stats
  teamStats: {
    teamId: {
      matches: 10,
      battingAverage: 32.5,
      strikeRate: 135.0,
      economy: 8.2,
      bowlingAverage: 25.0
    }
  }
}
```

**Methods**:
- `initializeTeamStats(teamId)` - Initialize empty stats for team
- `updatePlayerStats(teamId, playerId, matchStats)` - Update after match
- `recalculateTeamStats(teamId)` - Recalculate team averages
- `resetPlayerStats(playerId, oldTeamId)` - Reset on transfer
- `getPlayerStats(teamId, playerId)` - Retrieve player stats
- `getTeamStats(teamId)` - Retrieve team averages

### Player Store (`playerStore.js`)

Lifetime career statistics that **never reset**:

```javascript
{
  // NEW: Career stats (NEVER reset)
  careerStats: {
    playerId: {
      totalMatches: 150,
      totalRuns: 6500,
      careerBattingAvg: 43.3,
      careerStrikeRate: 142.0,
      totalWickets: 85,
      careerEconomy: 7.8,
      careerBowlingAvg: 23.5,
      centuries: 5,
      fifties: 35,
      fiveWickets: 3
    }
  },

  // Season-specific stats
  seasonStats: {
    playerId: {
      seasonId: {
        matches: 15,
        runs: 650,
        // ... etc
      }
    }
  }
}
```

**Methods**:
- `initializeCareerStats(playerId)` - Initialize career tracking
- `updateCareerStats(playerId, seasonId, matchStats)` - Update cumulative and season stats
- `getCareerStats(playerId)` - Retrieve lifetime stats
- `getSeasonStats(playerId, seasonId)` - Retrieve season-specific stats

### Transfer Market (`TransferMarket.js`)

Active transfer listings and completed transactions:

```javascript
{
  listings: {
    listingId: {
      playerId: 'p123',
      sellingTeam: 'teamId',
      askingPrice: 2500000,
      listedDate: '2025-03-15',
      purchasePrice: 2000000  // Original price team paid
    }
  },

  completedTransfers: [
    {
      playerId: 'p123',
      fromTeam: 'teamId1',
      toTeam: 'teamId2',
      transferFee: 2800000,
      date: '2025-03-20'
    }
  ]
}
```

**Simplified Methods**:
- `listPlayer(teamId, playerId, askingPrice)` - Create listing (no fees)
- `attemptPurchase(teamId, listingId)` - Instant buy if valuation > price
- `displayTransferList()` - Show active listings
- `displayCompletedTransfers()` - Show transfer history

---

## Performance Valuation System

### Core Algorithm: `PerformanceValuation.js`

#### 1. Performance Multiplier Calculation

Compares player stats to team averages:

```javascript
/**
 * Calculate performance multiplier (0.5x - 2.0x)
 */
function calculatePerformanceMultiplier(player, teamStats, playerStats) {
  const role = player.primaryRole;

  if (role === 'Batsman') {
    const avgRatio = playerStats.battingAverage / teamStats.battingAverage;
    const srRatio = playerStats.strikeRate / teamStats.strikeRate;
    return clamp((avgRatio + srRatio) / 2, 0.5, 2.0);
  }

  if (role === 'Bowler') {
    const econRatio = teamStats.economy / playerStats.economy;  // Inverted
    const avgRatio = teamStats.bowlingAverage / playerStats.bowlingAverage;  // Inverted
    return clamp((econRatio + avgRatio) / 2, 0.5, 2.0);
  }

  if (role === 'All-rounder') {
    const battingMult = /* batting calculation */;
    const bowlingMult = /* bowling calculation */;
    return (battingMult + bowlingMult) / 2;
  }
}
```

**Performance Ratios**:
- **Batsmen**: Equal weight to batting average and strike rate
- **Bowlers**: Equal weight to economy and bowling average (inverted)
- **All-rounders**: Average of batting and bowling multipliers
- **Range**: Clamped to 0.5x (underperforming) to 2.0x (star player)

#### 2. Sell Valuation

Calculate internal transfer value for selling:

```javascript
/**
 * Calculate player's transfer value for selling
 */
function calculateTransferValue(player, teamStats, playerStats, categoryBalance) {
  const purchasePrice = teamStore.getPurchasePrice(playerId);
  const performanceMult = calculatePerformanceMultiplier(player, teamStats, playerStats);

  let internalValue = purchasePrice * performanceMult;

  // Category balance adjustment
  const category = getPlaystyleCategory(player);
  if (categoryBalance[category].surplus) {
    internalValue *= 0.7;  // -30% for surplus
  } else if (categoryBalance[category].deficit) {
    internalValue *= 1.3;  // +30% for deficit
  }

  return internalValue;
}
```

**Factors**:
1. **Base**: Original purchase price
2. **Performance**: Multiplier (0.5x - 2.0x)
3. **Category Balance**: ±30% based on team needs

#### 3. Buy Valuation

Calculate purchase value using auction-style logic:

```javascript
/**
 * Calculate how much team should pay for player
 */
function calculatePurchaseValue(player, team, teamFinances, categoryGaps) {
  const basePrice = player.marketValue;

  // Fit score based on category gaps
  const fitScore = calculateFitScore(player, categoryGaps);

  // Budget health multiplier
  const budgetMult = calculateBudgetMultiplier(teamFinances);

  // Rating tier bonus
  const ratingBonus = getRatingBonus(player.overallRating);

  return basePrice + (fitScore * budgetMult) + ratingBonus;
}
```

**Factors**:
1. **Base Price**: Player's market value
2. **Fit Score**: How well player fills team gaps
3. **Budget Health**: More aggressive if budget allows
4. **Rating Tier**: Bonus for high-rated players

---

## AI Decision Logic

### Selling Logic (`TransferAI.evaluateSelling`)

```javascript
// For each player in squad
for (const player of squad) {
  const purchasePrice = teamStore.getPurchasePrice(player.id);
  const currentValue = calculateTransferValue(player, teamStats, playerStats, categoryBalance);

  // Sell if underperforming
  if (currentValue < purchasePrice * 0.8) {  // 80% threshold
    const listPrice = currentValue * 1.1;     // +10% markup
    transferMarket.listPlayer(teamId, player.id, listPrice);
  }
}
```

**Sell Trigger**: Current value < 80% of original purchase price

**All-rounder Special Case**:
- Must underperform in BOTH batting AND bowling to trigger sell
- Prevents selling all-rounders who excel in one discipline

### Buying Logic (`TransferAI.evaluatePurchase`)

```javascript
// For each listing on market
for (const listing of transferMarket.listings) {
  const player = getPlayer(listing.playerId);
  const valuation = calculatePurchaseValue(player, team, finances, categoryGaps);

  // Buy if valuation exceeds asking price
  if (valuation > listing.askingPrice && budget >= listing.askingPrice) {
    transferMarket.attemptPurchase(teamId, listing.id);
  }
}
```

**Buy Trigger**: Perceived value > Asking price

---

## Weekly Transfer Cycle

### Schedule

**Transfer Windows**: Every week during the season

1. **Monday 12:00 PM**: Transfer window opens
   - AI teams evaluate squads
   - Underperforming players listed for sale

2. **Monday-Sunday**: Hourly random auctions
   - Random time each hour (prevents predictability)
   - AI teams attempt purchases
   - Instant transaction if valuation > price

3. **Sunday 11:59 PM**: Transfer window closes
   - All unsold listings removed
   - Stats reset for transferred players

### Auction Timing

```javascript
// Hourly random auction (0-59 minutes past the hour)
const randomMinute = Math.floor(Math.random() * 60);
const auctionTime = `${hour}:${randomMinute}`;

// Execute auction
transferMarket.runAuction();
```

---

## Stats Management

### Match Stats Population

After each match, stats are updated in two stores:

```javascript
// PostMatchProcessor.js
function processMatchResults(matchResult) {
  const homeTeamId = matchResult.homeTeam.id;
  const awayTeamId = matchResult.awayTeam.id;

  // Extract player stats from match
  for (const player of matchResult.battingCard) {
    const stats = {
      runs: player.runs,
      ballsFaced: player.balls,
      // ... other stats
    };

    // Update team-specific stats
    teamStore.updatePlayerStats(homeTeamId, player.id, stats);

    // Update career stats
    playerStore.updateCareerStats(player.id, currentSeasonId, stats);
  }

  // Recalculate team averages
  teamStore.recalculateTeamStats(homeTeamId);
  teamStore.recalculateTeamStats(awayTeamId);
}
```

### Transfer Stats Reset

When player transfers, team stats reset but career stats persist:

```javascript
function completeTransfer(playerId, fromTeamId, toTeamId) {
  // Reset old team stats
  teamStore.resetPlayerStats(playerId, fromTeamId);

  // Initialize new team stats
  teamStore.initializePlayerStats(toTeamId, playerId);

  // Career stats UNCHANGED
  const careerStats = playerStore.getCareerStats(playerId);  // Still intact
}
```

---

## Category Balance System

### Playstyle Categories

**9 Categories** (5 batting + 4 bowling):

**Batting**:
1. Aggressive Batsmen
2. Anchor Batsmen
3. Power Hitters
4. Technical Batsmen
5. Finishers

**Bowling**:
6. Fast Bowlers (Death + Powerplay)
7. Swing Bowlers
8. Spin Bowlers (Off + Leg)
9. Economy Bowlers

### Balance Calculation

```javascript
function calculateCategoryBalance(squad, targetQuotas) {
  const balance = {};

  for (const category of categories) {
    const currentRating = sumCategoryRatings(squad, category);
    const target = targetQuotas[category];
    const gap = target - currentRating;

    balance[category] = {
      current: currentRating,
      target: target,
      gap: gap,
      surplus: gap < -100,   // Over-quota
      deficit: gap > 100     // Under-quota
    };
  }

  return balance;
}
```

**Impact on Valuation**:
- **Surplus categories**: -30% value (team wants to sell)
- **Deficit categories**: +30% value (team wants to buy)
- **Balanced categories**: No adjustment

---

## Implementation Status

### ✅ Completed

1. **Design Document** - Complete specification
2. **Team Store Stats** - `playerStats` and `teamStats` structures
3. **Player Store Career Stats** - `careerStats` and `seasonStats`
4. **Match Stats Population** - Post-match stat updates
5. **Performance Valuation** - Multiplier calculation
6. **Transfer Market** - Simplified instant transaction system
7. **Transfer AI** - Sell/buy decision logic
8. **Category Balance** - Playstyle quota system
9. **Weekly Auction Cycle** - Hourly random auctions

### 🚧 Future Enhancements

- **UI Integration**: React components for transfer market
- **Transfer History**: Detailed player transfer logs
- **Market Trends**: Price tracking over time
- **Loan System**: Temporary player loans
- **Contract System**: Multi-year contracts with wages

---

## Usage Examples

### Example 1: AI Team Selling Underperformer

```javascript
// Mumbai Thunders evaluates squad after Week 5
const team = teams['mumbai-thunders'];
const teamStats = teamStore.getTeamStats(team.id);

// Player: John Smith (Batsman)
// Purchase Price: $2,000,000
// Team Batting Avg: 35.0, Player Batting Avg: 20.0
// Team Strike Rate: 130.0, Player Strike Rate: 100.0

// Calculate performance
avgRatio = 20.0 / 35.0 = 0.57
srRatio = 100.0 / 130.0 = 0.77
performanceMult = (0.57 + 0.77) / 2 = 0.67  // Underperforming

// Calculate value
internalValue = 2,000,000 * 0.67 = 1,340,000

// Check sell trigger
if (1,340,000 < 2,000,000 * 0.8):  // 1,340,000 < 1,600,000 ✅
  listPrice = 1,340,000 * 1.1 = 1,474,000
  transferMarket.listPlayer(team.id, 'john-smith', 1,474,000)
```

### Example 2: AI Team Buying to Fill Gap

```javascript
// London Lions needs Aggressive Batsmen (deficit: 200 rating points)
const player = players['virat-kohli'];  // Aggressive Batsman
const listing = { askingPrice: 3,500,000 };

// Calculate purchase value
basePrice = 3,000,000
fitScore = 800,000      // High - fills deficit
budgetMult = 1.2        // Good budget health
ratingBonus = 200,000   // 90+ rating

purchaseValue = 3,000,000 + (800,000 * 1.2) + 200,000 = 4,160,000

// Check buy trigger
if (4,160,000 > 3,500,000):  // ✅ Buy!
  transferMarket.attemptPurchase('london-lions', listing.id)
```

### Example 3: Player Transfers, Stats Reset

```javascript
// Before Transfer
teamStore.playerStats['mumbai-thunders']['john-smith'] = {
  matches: 10,
  runs: 200,
  battingAverage: 20.0
};

playerStore.careerStats['john-smith'] = {
  totalMatches: 150,
  totalRuns: 6500,
  careerBattingAvg: 43.3
};

// Transfer Completes
transferMarket.completeTransfer('john-smith', 'mumbai-thunders', 'london-lions');

// After Transfer
teamStore.playerStats['mumbai-thunders']['john-smith'] = undefined;  // Reset
teamStore.playerStats['london-lions']['john-smith'] = {
  matches: 0,
  runs: 0,
  battingAverage: 0.0  // Fresh start
};

playerStore.careerStats['john-smith'] = {
  totalMatches: 150,    // UNCHANGED
  totalRuns: 6500,      // UNCHANGED
  careerBattingAvg: 43.3  // UNCHANGED
};
```

---

## Configuration

**Transfer Config** (`src/data/config/transfer-config.json`):

```json
{
  "sellThreshold": 0.8,
  "listPriceMarkup": 1.1,
  "performanceMultiplierRange": {
    "min": 0.5,
    "max": 2.0
  },
  "categoryBalanceModifiers": {
    "surplus": 0.7,
    "deficit": 1.3
  },
  "weeklyAuctionSchedule": {
    "startDay": "Monday",
    "startTime": "12:00",
    "endDay": "Sunday",
    "endTime": "23:59",
    "auctionsPerDay": 24
  },
  "playstyleQuotas": {
    "aggressiveBatsmen": 400,
    "anchorBatsmen": 400,
    "powerHitters": 400,
    "technicalBatsmen": 400,
    "finishers": 400,
    "fastBowlers": 600,
    "swingBowlers": 400,
    "spinBowlers": 600,
    "economyBowlers": 400
  }
}
```

---

## Testing

### Test Files

```bash
# Transfer market simulation
node src/test/transferTest.js

# Performance valuation tests
node src/test/valuationTest.js
```

### Manual Testing Checklist

- [ ] Player listed when performance drops below 80%
- [ ] All-rounder requires BOTH batting/bowling underperformance to sell
- [ ] Purchase occurs when valuation > asking price
- [ ] Team stats reset on transfer
- [ ] Career stats persist on transfer
- [ ] Category balance affects valuations (±30%)
- [ ] Budget constraints prevent purchases
- [ ] Weekly auction cycle runs correctly

---

## Related Documentation

- **[Finance System](finance-system.md)** - Budget management and team finances
- **[Auction System](auction-system.md)** - Season-start player auction
- **[Player System](player-system.md)** - Player attributes and progression
- **[League System](league-system.md)** - Match scheduling and standings

---

**Last Updated**: January 2025
**Status**: ✅ Complete
