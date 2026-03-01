# Transfer System

## Overview

The Transfer System enables **off-season player trading** between AI teams (and user). It runs during weeks 22-26 of each season. The system uses a **three-pass listing model** and a **daily bidding cycle** with hourly auctions.

**Key Features**:
- Three-pass AI listing: Composition Surplus → Dead Capital → VFM Failure
- Playstyle-quota-based composition analysis (reuses AuctionTransferAI)
- IPM (Impact Per Match) rank-mapping for value-for-money detection
- Daily bidding with 24 hourly auction rounds
- Candidate queue system for overflow (promotes when listings expire)
- Per-team listing cap of 5, minimum effective squad of 18

**Status**: Active Development (Listing AI complete, Buying AI needs rework)

---

## Architecture

### File Map

| File | Role |
|---|---|
| `src/data/config/transferConfig.json` | All transfer rules, listing criteria, role protection |
| `src/data/config/auctionConfig.json` | Playstyle rating quotas (consumed read-only for composition checks) |
| `src/core/finance/TransferManager.js` | Orchestrator — weekly listings, daily bidding, expiry processing |
| `src/core/finance/TransferAI.js` | AI decision engine — listing evaluation, queue promotion, bidding |
| `src/core/finance/TransferMarket.js` | Market state — listings Map, bids, interested teams, transfer completion |
| `src/core/finance/PerformanceValuation.js` | Valuation math — VFM score, IPM, dead capital, listing price, purchase value |
| `src/core/finance/transferManagerSingleton.js` | Shared singleton across Header.jsx, SimulationEngine, UI |
| `src/core/ai/AuctionTransferAI.js` | Consumed read-only for `analyzePlaystyleCoverage()`, `evaluatePlayerFit()` |
| `src/components/layout/Header.jsx` | Normal UI progression — opens window, runs daily cycle |
| `src/core/simulation/SimulationEngine.js` | Sim-to-Date progression — identical transfer logic |

### Trigger Chain

1. Calendar event `offseason_start` fires → `advancePhase('offseason')` sets phase
2. On subsequent Continue clicks (weeks 22-26): Header.jsx `else` block activates
3. `getTransferManager()` lazily creates singleton → `openWindow('offSeason', 14)`
4. `processDailyTransferCycle(teams, weekNumber)` runs each day:
   - Phase 1: Weekly listings (once per week via `lastListingWeek` guard)
   - Phase 2: Daily bidding (24 hourly auctions)
   - Phase 3: Process expired listings
   - Phase 4: Promote from candidate queue
   - Phase 5: Identify interested teams for promoted listings
5. Window closes at week 26

---

## AI Listing System (Three-Pass Model)

### Entry Point

`TransferAI.evaluateWeeklyListings(team, weekNumber)` — called once per week per AI team.

**Guards** (skip if any fail):
- Team is not user's team
- Squad size > 0
- Effective squad (squad - active listings) > `minimumEffectiveSquad` (18)
- Listing budget = `min(maxListingsPerCycle, effectiveSquad - minEffectiveSquad)`

### Pass 1: Composition Surplus (Rating-Quota Based)

**Method**: `_getCompositionSurplusCandidates(squad, alreadyListedIds)`

Uses `AuctionTransferAI.analyzePlaystyleCoverage()` to get current rating totals per playstyle category, then compares against **half of auction quotas** as surplus ceilings.

**Auction quotas → Surplus ceilings** (÷2):

| Batting Category | Quota | Ceiling | Bowling Category | Quota | Ceiling |
|---|---|---|---|---|---|
| openers | 730 | 365 | powerplay | 830 | 415 |
| topOrder | 610 | 305 | earlyMiddle | 1200 | 600 |
| middleOrder | 470 | 235 | lateMiddle | 1250 | 625 |
| lowerOrder | 310 | 155 | death | 880 | 440 |
| tailenders | 60 | 30 | wicketkeeper | 350 | 175 |

**Algorithm**:
1. Assign each player to their primary batting category and primary bowling category (via `getPrimaryBattingPlaystyle`/`getPrimaryBowlingPlaystyle`)
2. Compute `evaluatePlayerFit()` fitScore for each player
3. For each category where `currentRating > ceiling`: sort players by fitScore ascending, flag the lowest-fitScore players one by one (subtracting their rating) until category ≤ ceiling
4. **Role-aware flag requirements**:
   - **Batsmen**: surplus only if flagged in batting category
   - **Bowlers**: surplus only if flagged in bowling category (NOT batting — a bowler's batting is incidental)
   - **All-rounders**: surplus only if flagged in BOTH batting AND bowling
   - **Keepers**: surplus only if flagged in BOTH batting AND wicketkeeping
5. Role protection floor enforced (never drop below minimumBatsmen/Bowlers/etc.)

**Listing price**: `actualPrice * 0.75` (composition surplus discount)

### Pass 2: Dead Capital

**Method**: `PerformanceValuation.isDeadCapital(player, playerStats, teamStats, config)`

Flags expensive players not getting matches. Walks through price-match slabs:

| Price Threshold | Minimum Matches Required |
|---|---|
| $1,000,000+ | 10 matches |
| $500,000+ | 5 matches |
| $200,000+ | 1 match |

Only runs if team has played ≥ `minimumTeamMatches` (5).

**Listing price**: `actualPrice * 0.60` (heavy discount to move quickly)

### Pass 3: VFM Failure (Value-for-Money)

**Method**: `PerformanceValuation.calculateVFMScore(squad, player, playerStats, getPlayerStatsFn, minimumMatches)`

**Top 5 IPM Protection**: Before running VFM, the top 5 players by IPM are identified and skipped entirely. This prevents listing star performers who are expensive but delivering.

**VFM Algorithm** (rank-mapping):
1. Collect all players with ≥ `minimumMatches` (3) and their stats
2. **Rank A**: Sort by IPM descending → Performance Rank
3. **Rank B**: Sort by Actual Price descending → Financial Rank
4. Find target player's position in Rank A
5. "Justified Price" = the price at that same rank position in Rank B
6. `VFM Score = Justified Price / Actual Price`

**Example**: Player costs $1.5M but performs as #8 best. The #8 highest salary is $400K. VFM = $400K/$1.5M = 0.27 → below threshold 0.7 → flagged.

**Listing price**: `max(actualPrice × 0.5, (justifiedPrice + actualPrice) / 2)` — averaged with floor at 50%.

### Priority & Sorting

Candidates sorted: `dead_capital(0)` → `vfm_failure(1)` → `composition_surplus(2)`

Top candidates listed up to budget (5). Overflow stored in candidate queue per team.

### Candidate Queue System

`TransferAI.promoteFromQueue(expiredCount)` — runs after `processExpiredListings`:
- For each team with queued candidates, checks active listings < `maxListingsPerCycle` (5)
- Validates player still on squad and not already listed
- Promotes next candidate(s) up to headroom
- Phase 5 in TransferManager re-runs `identifyInterestedTeams` for promoted listings

---

## AI Buying System (Current — Needs Rework)

### Interest Identification

`TransferMarket.identifyInterestedTeams(listing, allTeams, calculateValuation)`:
- For each non-selling team: if `calculatePurchaseValue(player, team) > listingPrice` AND budget allows → interested

### Purchase Valuation

`PerformanceValuation.calculatePurchaseValue(player, team, teamFinances, categoryGaps)`:
- Base price from rating tier (`basePriceByRating` table)
- Gap bonus: `fitscore × $20K`
- Rating tier multiplier (1.5x for 90+, 1.2x for 70+)
- Budget health multiplier (1.2x if flush, 0.8x if poor)
- Large category deficit: 1.3x bonus

**Known issues with current buying system**:
- `getCategoryGaps()` uses a hardcoded category system (`anchor`, `aggressor`, `finisher`, etc.) that doesn't match the actual playstyle category mapping from auctionConfig
- `calculateFitscore()` reads raw `player.playstyleRatings` keys that may not exist in the current data model
- No squad size awareness — teams can bid even when near cap
- No consideration of what the team is selling (might buy back similar players)
- Budget reserve is a flat $500K regardless of team wealth
- Bid increment capped at $50K max jump — very slow price discovery for expensive players

### Hourly Bidding

`TransferManager.processDailyBidding()` runs 24 hourly auctions:
1. For each listing with interested teams
2. Filter teams that haven't bid today
3. Randomly select one team
4. Call `evaluateHourlyBid(team, listing)` → if valuation ≥ next bid amount and budget allows → place bid
5. Bid amount: `min(teamValuation, currentBid + $50K)` with minimum of `currentBid + $10K`

### Transfer Completion

`TransferMarket.processExpiredListings(currentGameDay)`:
- Listings expire after `durationDays` (14) game days
- If bids exist → `completeTransfer()`: financial transaction + player moved + soldPrice updated + team stats recalculated
- If no bids → listing removed

---

## Configuration

### transferConfig.json — `aiListingCriteria`

```json
{
  "compositionSurplus": { "enabled": true },
  "deadCapital": {
    "enabled": true,
    "priceMatchSlabs": [
      { "minPrice": 1000000, "minMatches": 10 },
      { "minPrice": 500000, "minMatches": 5 },
      { "minPrice": 200000, "minMatches": 1 }
    ],
    "minimumTeamMatches": 5
  },
  "vfmEngine": {
    "enabled": true,
    "vfmThreshold": 0.7,
    "minimumMatches": 3
  },
  "listingPrice": { "safetyFloorPercent": 0.5 },
  "maxListingsPerCycle": 5,
  "minimumEffectiveSquad": 18
}
```

### transferConfig.json — `roleProtection`

```json
{
  "minimumBatsmen": 7,
  "minimumBowlers": 6,
  "minimumAllRounders": 2,
  "minimumKeepers": 2
}
```

### Key Methods Reference

| Method | File | Purpose |
|---|---|---|
| `evaluateWeeklyListings(team, week)` | TransferAI.js | Three-pass listing evaluation |
| `_getCompositionSurplusCandidates(squad, listed)` | TransferAI.js | Rating-quota surplus detection |
| `promoteFromQueue(expiredCount)` | TransferAI.js | Queue → active listing promotion |
| `evaluateHourlyBid(team, listing)` | TransferAI.js | Bid decision per hourly auction |
| `calculateVFMScore(squad, player, stats, fn, min)` | PerformanceValuation.js | Rank-mapping VFM engine |
| `isDeadCapital(player, stats, teamStats, config)` | PerformanceValuation.js | Price-match slab check |
| `calculateListingPrice(player, justified, config, reason)` | PerformanceValuation.js | Safety-net pricing |
| `calculatePurchaseValue(player, team, finances, gaps)` | PerformanceValuation.js | Buy valuation (needs rework) |
| `calculateIPM(playerStats)` | PerformanceValuation.js | Impact Per Match |
| `getActualPrice(player)` | PerformanceValuation.js | soldPrice or estimatePriceFromRating fallback |
| `identifyInterestedTeams(listing, teams, fn)` | TransferMarket.js | Pre-filter interested buyers |
| `placeBid(listingId, teamId, amount, timestamp)` | TransferMarket.js | Record bid on listing |
| `completeTransfer(listing)` | TransferMarket.js | Execute player move + finances |
| `processExpiredListings(gameDay)` | TransferMarket.js | Expire/complete listings |

---

**Last Updated**: February 2026
