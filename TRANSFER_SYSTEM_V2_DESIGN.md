# Transfer System V2 - Complete Design Document

## Overview
This document outlines the complete redesign of the transfer system with:
1. Team-based player stats (reset on transfer)
2. Performance multiplier valuation
3. Weekly bidding with hourly random auctions
4. Career stats tracking in playerStore
5. Leaderboards as collation layer

---

## 1. Data Structures

### 1.1 Team Store (`teamStore.js`)

```javascript
{
  // Existing
  teams: { teamId: teamData },
  squadLists: { teamId: [playerIds] },

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
      battingAverage: 32.5,    // Average of all players
      strikeRate: 135.0,        // Average of all players
      economy: 8.2,             // Average of all bowlers
      bowlingAverage: 25.0      // Average of all bowlers
    }
  }
}
```

**Methods Added:**
- `initializeTeamStats(teamId)` - Initialize empty stats
- `updatePlayerStats(teamId, playerId, matchStats)` - Update after match
- `recalculateTeamStats(teamId)` - Recalculate team averages
- `resetPlayerStats(playerId, oldTeamId)` - Reset on transfer
- `getPlayerStats(teamId, playerId)` - Retrieve player stats
- `getTeamStats(teamId)` - Retrieve team averages

---

### 1.2 Player Store (`playerStore.js`)

```javascript
{
  // Existing
  players: { playerId: playerData },

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
  }
}
```

**Methods Added:**
- `updateCareerStats(playerId, matchStats)` - Accumulate career stats
- `getCareerStats(playerId)` - Retrieve career stats

---

### 1.3 Transfer Market (`TransferMarket.js`)

```javascript
{
  listings: {
    listingId: {
      id: "listing_123",
      teamId: "mumbai",
      playerId: "player_456",
      player: { id, name, role, rating, playstyles },

      // Pricing
      listingPrice: 450000,          // prev_price * perf_multiplier
      previousPrice: 500000,          // What team paid
      performanceMultiplier: 0.9,     // Below team average

      // Bidding state
      currentBid: 460000,
      currentBidder: "london",
      bids: [
        { teamId: "london", amount: 460000, timestamp: "2025-10-29T10:00:00Z" },
        { teamId: "melbourne", amount: 450000, timestamp: "2025-10-29T09:00:00Z" }
      ],
      interestedTeams: ["london", "melbourne", "karachi"],

      // Timing
      listedAt: "2025-10-29T00:00:00Z",
      expiresAt: "2025-11-05T00:00:00Z",  // 7 days
      lastBidAt: "2025-10-29T10:00:00Z",

      status: "active"  // "active" | "sold" | "expired"
    }
  },

  completedTransfers: [
    {
      player: playerData,
      fromTeamId: "mumbai",
      toTeamId: "london",
      transferFee: 460000,
      listingPrice: 450000,
      finalBid: 460000,
      completedAt: "2025-11-05T00:00:00Z"
    }
  ]
}
```

---

## 2. Performance Valuation System

### 2.1 Performance Multiplier Calculation

**Formula:**
```
Performance Multiplier = (stat1_ratio + stat2_ratio) / 2

Where:
- Batsmen: (player_avg/team_avg + player_SR/team_SR) / 2
- Bowlers: (team_econ/player_econ + team_avg/player_avg) / 2
- All-rounders: (batting_component + bowling_component) / 2

Clamped: 0.5x to 2.0x
```

**Example - Batsman:**
```
Player: Virat Kohli
- Batting Avg: 28.5
- Strike Rate: 140.0

Team: Mumbai Thunders
- Team Avg: 32.5
- Team SR: 135.0

Calculation:
avg_ratio = 28.5 / 32.5 = 0.877
sr_ratio = 140.0 / 135.0 = 1.037
multiplier = (0.877 + 1.037) / 2 = 0.957

Result: 0.957x (slightly below team average)
```

**Example - Bowler:**
```
Player: Jasprit Bumrah
- Economy: 6.5
- Bowling Avg: 18.5

Team: Mumbai Thunders
- Team Economy: 8.2
- Team Bowling Avg: 25.0

Calculation:
econ_ratio = 8.2 / 6.5 = 1.262 (lower is better for economy)
avg_ratio = 25.0 / 18.5 = 1.351 (lower is better for bowling avg)
multiplier = (1.262 + 1.351) / 2 = 1.307

Result: 1.307x (well above team average)
```

### 2.2 Internal Value Calculation

```
Internal Value = Previous Price × Performance Multiplier

Example:
- Auction Price: $500K
- Performance Multiplier: 0.957x
- Internal Value: $500K × 0.957 = $478.5K

Listing Price = Internal Value (no markup)
```

---

## 3. Weekly Bidding System

### 3.1 Listing Cycle

**Day 0 (Listing Day):**
```
1. Team lists player at Internal Value
2. Listing expires after 7 days
3. All teams can see listing immediately
4. Interested teams identified (calculate if they want to bid)
```

**Days 1-7 (Bidding Period):**
```
Every hour (24 opportunities per day):
  1. For each active listing:
     a. Filter interested teams (not already bid today)
     b. Randomly select 1 team
     c. Team calculates valuation
     d. If valuation > current bid + $10K:
        - Make bid at current + $10K
     e. Update current bidder

  2. Handle simultaneous bids:
     - If timestamp collision (same hour):
       - Later bidder must bid higher or withdraw
       - Uses millisecond precision
```

**Day 7 (Completion):**
```
1. Listing expires
2. If bids exist:
   - Highest bidder wins
   - Transfer processed
   - Player stats reset
3. If no bids:
   - Listing removed
   - Player stays with team
```

### 3.2 Bidding Logic (AI)

```javascript
// Interested Team Identification
function isInterestedInPlayer(team, listing) {
  // Calculate valuation
  const valuation = calculatePurchaseValue(listing.player, team);

  // Interested if:
  // 1. Valuation > listing price
  // 2. Budget allows
  // 3. Squad has space
  return valuation > listing.listingPrice &&
         team.budget > valuation + 500000 &&
         team.squad.length < 25;
}

// Hourly Bidding Decision
function shouldBid(team, listing, currentBid) {
  const valuation = calculatePurchaseValue(listing.player, team);
  const nextBid = currentBid + 10000;

  // Bid if valuation allows
  return valuation >= nextBid &&
         team.budget >= nextBid;
}
```

### 3.3 Purchase Valuation

```javascript
function calculatePurchaseValue(player, team, teamStore) {
  // Base price from rating
  const basePrice = getBasePriceByRating(player.rating);

  // Gap-based bonus (from auction system)
  const categoryGaps = calculateCategoryGaps(team.squad);
  const fitscore = calculateFitscore(player, categoryGaps);
  const gapBonus = fitscore * 20000;

  let value = basePrice + gapBonus;

  // Rating tier multiplier
  if (player.rating >= 9) value *= 1.5;      // Elite
  else if (player.rating >= 7) value *= 1.2; // Quality

  // Budget multiplier
  const budgetRatio = team.budget / 5000000;
  if (budgetRatio > 1.5) value *= 1.2;       // Rich team
  else if (budgetRatio < 0.5) value *= 0.8;  // Poor team

  // Category deficit multiplier
  const primaryCategory = getPrimaryCategory(player);
  const deficit = categoryGaps[primaryCategory] || 0;
  if (deficit > 300) value *= 1.3;           // Desperate for category

  return Math.round(value / 10000) * 10000;  // Round to $10K
}
```

---

## 4. Integration Points

### 4.1 Match Results → Stats Update

**Location:** `MatchOrchestrator.js` or `PostMatchProcessor.js`

```javascript
// After match completion
function processMatchResults(matchResult) {
  const homeTeamId = matchResult.homeTeam.id;
  const awayTeamId = matchResult.awayTeam.id;

  // Update team stats in teamStore
  matchResult.homeTeam.battingCard.forEach(player => {
    teamStore.updatePlayerStats(homeTeamId, player.id, {
      runs: player.runs,
      ballsFaced: player.ballsFaced,
      dismissed: player.dismissal !== null
    });
  });

  matchResult.homeTeam.bowlingCard.forEach(player => {
    teamStore.updatePlayerStats(homeTeamId, player.id, {
      wickets: player.wickets,
      ballsBowled: player.ballsBowled,
      runsConceded: player.runsConceded
    });
  });

  // Same for away team
  // ...

  // Recalculate team averages
  teamStore.recalculateTeamStats(homeTeamId);
  teamStore.recalculateTeamStats(awayTeamId);

  // Update career stats in playerStore
  matchResult.allPlayers.forEach(player => {
    playerStore.updateCareerStats(player.id, player.matchStats);
  });
}
```

### 4.2 Transfer Completion → Stats Reset

**Location:** `TransferMarket.js`

```javascript
function completeTransfer(listing, winningBid) {
  const player = listing.player;
  const fromTeamId = listing.teamId;
  const toTeamId = winningBid.teamId;

  // 1. Process financial transaction
  financeStore.processTransferPurchase(toTeamId, fromTeamId, player, winningBid.amount);

  // 2. Reset player stats for old team
  teamStore.resetPlayerStats(player.id, fromTeamId);

  // 3. Move player to new team
  teamStore.removePlayerFromSquad(fromTeamId, player.id);
  teamStore.addPlayerToSquad(toTeamId, player.id);

  // 4. Recalculate team stats
  teamStore.recalculateTeamStats(fromTeamId);
  teamStore.recalculateTeamStats(toTeamId);

  // 5. Record transfer
  this.completedTransfers.push({
    player,
    fromTeamId,
    toTeamId,
    transferFee: winningBid.amount,
    completedAt: Date.now()
  });

  // NOTE: Career stats in playerStore are NOT reset
}
```

### 4.3 Daily Bidding Cycle

**Location:** `TransferManager.js`

```javascript
async function processDailyBiddingCycle(teams, currentDay) {
  // Run 24 hourly auctions
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(currentDay.getTime() + hour * 3600000);

    // Process each active listing
    const activeListings = transferMarket.getActiveListings();

    for (const listing of activeListings) {
      // Get interested teams that haven't bid today
      const eligibleTeams = listing.interestedTeams.filter(teamId => {
        const lastBid = listing.bids.find(b =>
          b.teamId === teamId &&
          isSameDay(b.timestamp, currentDay)
        );
        return !lastBid; // Haven't bid today
      });

      if (eligibleTeams.length === 0) continue;

      // Randomly select one team
      const selectedTeamId = eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)];
      const team = teams.find(t => t.id === selectedTeamId);

      // Check if they want to bid
      const shouldBid = transferAI.evaluateBid(team, listing);

      if (shouldBid) {
        const bidAmount = listing.currentBid + 10000;
        transferMarket.placeBid(listing.id, selectedTeamId, bidAmount, timestamp);
      }
    }
  }

  // Check for expired listings
  transferMarket.processExpiredListings(currentDay);
}
```

### 4.4 Leaderboards as Collation Layer

**Location:** `LeaderboardsCalculator.js`

```javascript
class LeaderboardsCalculator {
  constructor(teamStore) {
    this.teamStore = teamStore;
  }

  // NEW: Collate from team stores instead of tracking internally
  getAllLeaderboards() {
    const allPlayerStats = [];

    // Collect stats from all teams
    const teams = Object.keys(this.teamStore.getState().teams);
    teams.forEach(teamId => {
      const teamPlayerStats = this.teamStore.getState().playerStats[teamId] || {};

      Object.entries(teamPlayerStats).forEach(([playerId, stats]) => {
        allPlayerStats.push({
          playerId,
          teamId,
          ...stats
        });
      });
    });

    // Sort and format for display
    const battingLeaderboard = allPlayerStats
      .filter(p => p.runs > 0)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 50);

    const bowlingLeaderboard = allPlayerStats
      .filter(p => p.wickets > 0)
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 50);

    return {
      batting: battingLeaderboard,
      bowling: bowlingLeaderboard
    };
  }

  // Remove old updateFromMatch() - no longer needed
  // Stats are updated directly in teamStore by match processor
}
```

---

## 5. Flow Diagrams

### 5.1 Weekly Listing Flow

```
Match Week 10 Starts
  ↓
[Transfer Window Opens]
  ↓
Teams Evaluate Players
  ↓
┌─────────────────────────────┐
│ List underperforming players│
│ Price = prev × perf_mult    │
└─────────────────────────────┘
  ↓
┌─────────────────────────────┐
│ Teams identify interest     │
│ (valuation > list price)    │
└─────────────────────────────┘
  ↓
[7-Day Bidding Period]
  ↓
Hour 0:  Random team from interested → Bid
Hour 1:  Random team from interested → Bid
...
Hour 168: Random team from interested → Bid
  ↓
[Listing Expires]
  ↓
Highest Bidder Wins
  ↓
┌─────────────────────────────┐
│ 1. Transfer $ processed     │
│ 2. Player stats reset       │
│ 3. Player moves to new team │
│ 4. Career stats kept        │
└─────────────────────────────┘
```

### 5.2 Hourly Bidding Flow

```
For each active listing:
  ↓
Get interested teams
  ↓
Filter out teams that bid today
  ↓
Randomly select 1 team
  ↓
Team calculates valuation
  ↓
Is valuation >= currentBid + $10K?
  ↓ YES
Place bid at currentBid + $10K
  ↓
Update listing state
```

---

## 6. Edge Cases & Solutions

### 6.1 No Interested Teams
**Problem:** Player listed but no one values them highly enough
**Solution:** Listing expires after 7 days, player stays with team

### 6.2 Budget Exhaustion Mid-Bidding
**Problem:** Team's budget drops below bid amount before transfer completes
**Solution:** Re-validate budget when processing winning bid, transfer fails if insufficient

### 6.3 Player Performance Changes During Listing
**Problem:** Player's stats improve during 7-day listing period
**Solution:** Listing price is fixed at listing time, doesn't update

### 6.4 Simultaneous Bids (Same Hour)
**Problem:** Two teams bid at same timestamp
**Solution:** Use millisecond precision, later bidder must increase or withdraw

### 6.5 Team Gets Eliminated from Playoffs
**Problem:** Team wins bid but season ends before transfer completes
**Solution:** Transfer still processes (for next season continuity)

---

## 7. Display Outputs

### 7.1 Weekly Transfer Summary (Match Week Mode)

```
═══════════════════════════════════════════════════════════
🔄 WEEKLY TRANSFER SUMMARY (Week 12)
═══════════════════════════════════════════════════════════

📋 ACTIVE LISTINGS (ordered by current bid)
────────────────────────────────────────────────────────────
Player                Rating  Listed By        List Price  Current Bid  Bids
────────────────────────────────────────────────────────────
Virat Kohli           8.5     Mumbai Thunders  $478K       $520K        5
Jasprit Bumrah        9.2     London Lions     $650K       $650K        0
Steve Smith           8.1     Melbourne        $420K       $450K        3
────────────────────────────────────────────────────────────
Total: 3 active listings


🔄 COMPLETED TRANSFERS THIS WEEK (ordered by price)
────────────────────────────────────────────────────────────
Player                From                To                  Price
────────────────────────────────────────────────────────────
Travis Head           Mumbai Thunders     London Lions        $580K
Jos Buttler           London Lions        Melbourne Meteors   $520K
────────────────────────────────────────────────────────────
Total: 2 transfers completed, $1.1M total value
```

---

## 8. Testing Plan

### 8.1 Unit Tests
- Performance multiplier calculation (various stat scenarios)
- Purchase valuation calculation
- Bid placement logic
- Stats reset on transfer

### 8.2 Integration Tests
- Match → Stats update flow
- Listing → Bidding → Transfer flow
- Stats collation in leaderboards
- Career stats accumulation

### 8.3 Simulation Test
- Run full 18-week season
- Verify transfer window opens at Week 10
- Verify bidding happens correctly
- Verify stats reset properly
- Verify leaderboards update

---

## 9. Implementation Order

1. ✅ **teamStore.js** - Add stats structures (DONE)
2. **MatchOrchestrator.js** - Add stats population after match
3. **playerStore.js** - Add career stats tracking
4. **PerformanceValuation.js** - Rewrite with simple multiplier
5. **TransferMarket.js** - Rebuild with bidding system
6. **TransferAI.js** - Rebuild with interested teams logic
7. **TransferManager.js** - Add daily bidding cycles
8. **LeaderboardsCalculator.js** - Make it collation-only
9. **LeagueSimulator.js** - Wire everything together
10. **Test & Debug** - Run full simulation

---

## 10. Code Size Estimates

- `teamStore.js`: +150 lines (stats methods)
- `playerStore.js`: +100 lines (career stats)
- `PerformanceValuation.js`: ~200 lines (simplified)
- `TransferMarket.js`: ~400 lines (bidding system)
- `TransferAI.js`: ~350 lines (interest + bidding)
- `TransferManager.js`: ~300 lines (daily cycles)
- `LeaderboardsCalculator.js`: -150 lines (simplify to collation)
- `MatchOrchestrator.js`: +50 lines (stats updates)

**Total:** ~1400 new/modified lines

---

## 11. Performance Considerations

- Stats updates: O(n) per match (n = players in match)
- Hourly bidding: O(m × l) per hour (m = interested teams, l = listings)
- Leaderboards collation: O(t × p) (t = teams, p = players per team)
- All acceptable for simulation scale (10 teams, ~20 players each)

---

## Approved Specifications

1. ✅ **Listing timing**: Every week during transfer window (Weeks 10-12)
2. ✅ **Bid increments**: Allow jumps up to $50K if team's valuation supports it
3. ✅ **Career stats**: Track both cumulative (all-time) AND season-wise stats
4. ✅ **Transfer window**: Closes at end of Week 12, NO transfers during playoffs
5. ✅ **Sell trigger**: Performance multiplier < 0.7 for role
   - All-rounders: BOTH batting AND bowling must be < 0.7 to sell

## Updated Key Points

### Transfer Window Timing
- Opens: Start of Week 10
- Closes: End of Week 12
- Duration: 3 weeks (21 days)
- Weekly listing cycles within this period

### Sell Trigger Logic
```javascript
// Batsman/Bowler
if (performanceMultiplier < 0.7) {
  list_player();
}

// All-rounder (BOTH must be below 0.7)
const battingMult = calculateBattingMultiplier(player, teamStats);
const bowlingMult = calculateBowlingMultiplier(player, teamStats);

if (battingMult < 0.7 && bowlingMult < 0.7) {
  list_player();
}
```

### Bid Jump Logic
```javascript
function calculateBidAmount(currentBid, teamValuation) {
  const minBid = currentBid + 10000;  // Minimum $10K increment
  const maxJump = 50000;               // Maximum $50K jump

  const idealBid = Math.min(teamValuation, currentBid + maxJump);

  return Math.max(minBid, idealBid);
}
```

### Career Stats Structure (Updated)
```javascript
careerStats: {
  playerId: {
    // Cumulative (all-time)
    cumulative: {
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
    },

    // Season-wise breakdown
    seasons: {
      "wpl_2025": {
        matches: 10,
        runs: 450,
        battingAvg: 45.0,
        strikeRate: 150.0,
        wickets: 8,
        economy: 7.2,
        bowlingAvg: 22.5
      },
      "wpl_2024": {
        matches: 12,
        runs: 520,
        battingAvg: 43.3,
        ...
      }
    }
  }
}
```

APPROVED - Ready for implementation!
