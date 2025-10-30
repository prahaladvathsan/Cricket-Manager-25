# Transfer System V2 - Implementation Status

## Completed ✅

### 1. Design Document
- **File**: `TRANSFER_SYSTEM_V2_DESIGN.md`
- **Status**: Complete and approved
- **Includes**: All specifications, flows, examples, edge cases

### 2. Team Store Stats Structure
- **File**: `src/stores/teamStore.js`
- **Status**: Complete
- **Added**:
  - `playerStats` structure (team-specific, reset on transfer)
  - `teamStats` structure (aggregated team averages)
  - `initializeTeamStats(teamId)`
  - `updatePlayerStats(teamId, playerId, matchStats)`
  - `recalculateTeamStats(teamId)`
  - `resetPlayerStats(playerId, oldTeamId)`
  - `getPlayerStats(teamId, playerId)`
  - `getTeamStats(teamId)`

---

## Remaining Implementation

### 3. Player Store Career Stats (NEXT)
- **File**: `src/stores/playerStore.js`
- **Changes Needed**:
```javascript
// Add to state
careerStats: {},  // playerId -> { cumulative, seasons }
currentSeasonId: null,

// Add methods
initializeCareerStats(playerId) {
  // Initialize empty cumulative + seasons object
}

updateCareerStats(playerId, seasonId, matchStats) {
  // Update both cumulative and season-specific stats
}

getCareerStats(playerId) {
  // Return cumulative stats
}

getSeasonStats(playerId, seasonId) {
  // Return season-specific stats
}
```

**Estimated**: ~100 lines

---

### 4. Match Stats Population
- **File**: `src/core/league/MatchOrchestrator.js` OR `src/core/match-engine/PostMatchProcessor.js`
- **Changes Needed**:
```javascript
// After match completes
processMatchResults(matchResult) {
  const homeTeamId = matchResult.homeTeam.id;
  const awayTeamId = matchResult.awayTeam.id;

  // Extract player stats from batting/bowling cards
  // Update teamStore.playerStats for each player
  // Update playerStore.careerStats for each player
  // Recalculate team aggregates
}
```

**Estimated**: ~80 lines
**Note**: Need to find exact location where match results are finalized

---

### 5. Performance Valuation (Rewrite)
- **File**: `src/core/finance/PerformanceValuation.js`
- **Changes Needed**:
```javascript
// Complete rewrite with:
calculatePerformanceMultiplier(player, playerStats, teamStats) {
  // Equal-weighted ratios
  // Batsmen: (avg_ratio + SR_ratio) / 2
  // Bowlers: (econ_ratio + avg_ratio) / 2
  // All-rounders: separate batting and bowling multipliers
  // Clamp to 0.5x - 2.0x
}

shouldSellPlayer(player, battingMult, bowlingMult) {
  // Batsmen/Bowlers: mult < 0.7
  // All-rounders: BOTH < 0.7
}

calculateInternalValue(previousPrice, performanceMultiplier) {
  // Simple: prev × mult
}

calculatePurchaseValue(player, team, teamFinances, categoryGaps) {
  // Keep existing auction-style logic
}
```

**Estimated**: ~250 lines

---

### 6. Transfer Market (Complete Rebuild)
- **File**: `src/core/finance/TransferMarket.js`
- **Changes Needed**:
```javascript
// New listing structure
listings: Map of {
  id, teamId, playerId, player,
  listingPrice, previousPrice, performanceMultiplier,
  currentBid, currentBidder,
  bids: [{teamId, amount, timestamp}],
  interestedTeams: [teamIds],
  listedAt, expiresAt, status
}

// Methods
listPlayer(params) {
  // List at internal value
  // Initialize empty bids array
  // Set 7-day expiry
}

identifyInterestedTeams(listing, allTeams) {
  // Check if valuation > listing price
  // Check budget
  // Return array of interested teamIds
}

placeBid(listingId, teamId, amount, timestamp) {
  // Validate bid (> currentBid, <= +$50K)
  // Handle timestamp collisions
  // Update currentBid and currentBidder
}

processExpiredListings(currentDate) {
  // Find expired listings
  // Complete transfer if bids exist
  // Remove listing if no bids
}
```

**Estimated**: ~400 lines

---

### 7. Transfer AI (Complete Rebuild)
- **File**: `src/core/finance/TransferAI.js`
- **Changes Needed**:
```javascript
// Weekly listing cycle
async evaluateWeeklyListings(team, teamStore) {
  // Get all players
  // Calculate performance multipliers
  // List players with mult < 0.7
  // (All-rounders: BOTH < 0.7)
}

// Hourly bidding cycle
evaluateHourlyBid(team, listing, teamStore) {
  // Calculate purchase valuation
  // Determine bid amount (up to +$50K)
  // Return bid decision
}

calculateBidAmount(currentBid, teamValuation) {
  const minBid = currentBid + 10000;
  const maxJump = 50000;
  const idealBid = Math.min(teamValuation, currentBid + maxJump);
  return Math.max(minBid, idealBid);
}
```

**Estimated**: ~350 lines

---

### 8. Transfer Manager (Major Update)
- **File**: `src/core/finance/TransferManager.js`
- **Changes Needed**:
```javascript
// Weekly listing phase
async processWeeklyListings(teams, weekNumber) {
  // Only during weeks 10-12
  // All teams list underperforming players
}

// Daily bidding cycles
async processDailyBidding(teams, currentDay) {
  // Run 24 hourly auctions
  // For each hour:
  //   - For each listing:
  //     - Select random interested team
  //     - Evaluate bid
  //     - Place bid if appropriate
}

// Transfer completion with stats reset
completeTransfer(listing, winningBid, teamStore, playerStore) {
  // Process financial transaction
  // Reset team-specific stats
  // Move player to new team
  // Recalculate team stats
  // (Keep career stats intact)
}
```

**Estimated**: ~300 lines

---

### 9. Leaderboards (Simplify to Collation)
- **File**: `src/core/league/LeaderboardsCalculator.js`
- **Changes Needed**:
```javascript
// Remove internal tracking, make it pure collation
getAllLeaderboards(teamStore) {
  // Collect all playerStats from all teams
  // Sort by runs/wickets
  // Return formatted leaderboards
}

// REMOVE old updateFromMatch() method
// Stats are updated directly in teamStore by match processor
```

**Estimated**: -100 lines (simplification)

---

### 10. League Simulator Integration
- **File**: `src/core/league/LeagueSimulator.js`
- **Changes Needed**:
```javascript
// Initialize stats at season start
async initializeLeague(config) {
  // ...existing code...

  // Initialize team stats
  teams.forEach(team => {
    teamStore.initializeTeamStats(team.id);
  });

  // Initialize career stats
  allPlayers.forEach(player => {
    playerStore.initializeCareerStats(player.id);
  });

  // Set current season ID
  playerStore.setCurrentSeasonId(seasonId);
}

// Weekly transfer cycles (Weeks 10-12 only)
async simulateByMatchWeek(options) {
  // ...existing code...

  for (const week of matchWeeks) {
    // Before matches
    if (transferManager && week.weekNumber >= 10 && week.weekNumber <= 12) {
      if (week.weekNumber === 10) {
        // Open window
        transferManager.openWindow('midSeason');
      }

      // Weekly listing phase (start of week)
      await transferManager.processWeeklyListings(teams, week.weekNumber);

      // Daily bidding cycles throughout the week
      for (let day = 0; day < 7; day++) {
        await transferManager.processDailyBidding(teams, day);
      }

      if (week.weekNumber === 12) {
        // Close window
        transferManager.closeWindow();
      }
    }

    // ...rest of match simulation...
  }
}
```

**Estimated**: ~80 lines

---

## Total Implementation Remaining

- **Files to modify**: 7
- **Estimated new/changed lines**: ~1500
- **Estimated time**: 3-4 hours of focused coding

---

## Implementation Order

Follow this exact order to minimize integration issues:

1. ✅ teamStore.js (DONE)
2. **playerStore.js** - Career stats foundation
3. **MatchOrchestrator** - Stats population (enables testing stats)
4. **PerformanceValuation.js** - Multiplier calculation (enables sell decisions)
5. **TransferMarket.js** - Bidding infrastructure
6. **TransferAI.js** - Listing + bidding logic
7. **TransferManager.js** - Weekly/daily orchestration
8. **LeaderboardsCalculator.js** - Simplify to collation
9. **LeagueSimulator.js** - Wire everything together
10. **Test & Debug** - Run full simulation

---

## Testing Checkpoints

After each implementation step, test:

1. **After #3 (MatchOrchestrator)**: Run a single match, verify stats populate in teamStore
2. **After #4 (PerformanceValuation)**: Test multiplier calculations with various player performances
3. **After #6 (TransferMarket)**: Test listing creation, bid placement, transfer completion
4. **After #7 (TransferAI)**: Test sell decisions, bid decisions
5. **After #9 (LeagueSimulator)**: Run full 18-week simulation with transfers

---

## Current State

- **Design**: ✅ Complete and approved
- **Foundation**: ✅ teamStore stats structure ready
- **Ready for**: playerStore career stats implementation

Next step: Implement `playerStore.js` career stats tracking.
