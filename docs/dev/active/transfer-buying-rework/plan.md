# Handoff Prompt: AI Transfer Buying/Offer Behavior Rework

## Context

The AI **listing** system has been completed and works well — a three-pass model (Composition Surplus → Dead Capital → VFM Failure) that uses playstyle-quota-based analysis, IPM rank-mapping, and role-aware filtering. See `docs/core-systems/transfer-system.md` for full documentation of the listing system.

The AI **buying/offer** system is the legacy code that needs a complete rework. It currently uses a hardcoded category system that doesn't match the actual playstyle data model, has no squad awareness, and produces unrealistic valuations.

## Current Buying System — What Exists

### Files Involved
| File | Method | Role |
|---|---|---|
| `src/core/finance/TransferAI.js` | `evaluateHourlyBid()` | Bid decision per hourly auction |
| `src/core/finance/TransferAI.js` | `getCategoryGaps()` | Hardcoded category gap analysis (BROKEN) |
| `src/core/finance/TransferAI.js` | `calculateBidAmount()` | Bid increment logic |
| `src/core/finance/PerformanceValuation.js` | `calculatePurchaseValue()` | Buy valuation (BROKEN) |
| `src/core/finance/PerformanceValuation.js` | `calculateFitscore()` | Player-team fit (BROKEN) |
| `src/core/finance/PerformanceValuation.js` | `getPrimaryPlaystyleCategory()` | Maps to wrong categories |
| `src/core/finance/TransferMarket.js` | `identifyInterestedTeams()` | Pre-filters interested buyers |
| `src/core/finance/TransferManager.js` | `processDailyBidding()` | Runs 24 hourly auctions |

### Known Issues (All Must Be Fixed)

1. **`getCategoryGaps()` uses hardcoded categories** (`anchor`, `aggressor`, `finisher`, `powerplay_specialist`, `accumulator`, `swing_bowler`, `pace_bowler`, `spin_bowler`, `economical_bowler`) that don't match the actual playstyle category mapping from `auctionConfig.json`. The listing system already uses `AuctionTransferAI.analyzePlaystyleCoverage()` and `evaluatePlayerFit()` — the buying system should too.

2. **`calculateFitscore()` reads raw `player.playstyleRatings` keys** that may not match (e.g., `swing_bowler_spin` doesn't exist). Should reuse `AuctionTransferAI.evaluatePlayerFit()` which already works correctly.

3. **`calculatePurchaseValue()` is too simplistic** — base price from rating tier + gap bonus + budget multiplier. No awareness of what the player actually brings structurally. A $50K player and a $500K player with the same rating get similar valuations.

4. **No squad size awareness** — teams can bid even when at or near squad cap (25). Must check `squad.length < maxSquadSize` before showing interest.

5. **No consideration of what team is selling** — a team might buy back a similar player to one they just listed. Should skip players in the same playstyle category they have surplus in.

6. **Budget reserve is flat $500K** regardless of team wealth — a team with $10M budget and a team with $600K budget both reserve the same amount.

7. **Bid increment capped at $50K max jump** — very slow price discovery for expensive players. A $2M player takes 40+ hours of bidding to reach final price. Should scale with listing price.

8. **`identifyInterestedTeams` only runs once per listing** — if market conditions change (another team buys a similar player), interest isn't recalculated.

## What The Listing System Already Provides (Reuse These)

The listing system rework introduced tools that the buying system should leverage:

- **`AuctionTransferAI.analyzePlaystyleCoverage(squad)`** — Returns current rating totals per playstyle category
- **`AuctionTransferAI.evaluatePlayerFit(player, teamNeeds)`** — Returns `{fitScore, reasons}` for how well a player fits team needs
- **`AuctionTransferAI.analyzeTeamNeeds(squad)`** — Returns team's structural needs
- **`PerformanceValuation.getActualPrice(player)`** — Returns `soldPrice` or `estimatePriceFromRating()` fallback
- **`PerformanceValuation.calculateIPM(playerStats)`** — Impact Per Match
- **`auctionConfig.playstyleRatingQuotas`** — Rating quotas per playstyle category (half used as surplus ceiling in listing)

## Suggested Approach

### New Purchase Valuation
Replace `calculatePurchaseValue` + `calculateFitscore` + `getCategoryGaps` with a new system:

1. **Base value** from `getActualPrice(player)` (what the player is actually worth on the market)
2. **Fit multiplier** from `evaluatePlayerFit(player, buyerTeamNeeds).fitScore` — high fitScore means the player fills a real gap
3. **Surplus discount** — if the buying team already has surplus in this player's primary category (using the same half-quota ceiling from listings), reduce interest
4. **Budget-proportional reserve** — e.g., reserve 10% of budget, not flat $500K
5. **Squad size check** — no interest if squad >= 24 (leave room for emergencies)

### New Bidding Logic
Replace the $50K max jump with price-proportional increments:
- Bid increment = `max($10K, listingPrice * 5%)`
- Allow larger jumps for expensive players so price discovery is faster
- Or consider a simpler "direct purchase" model where interested teams just buy at listing price (matching `transferConfig.transferMarketBehavior.biddingType: "direct_purchase"`)

### Interest Refresh
Consider refreshing interested teams periodically (e.g., daily) rather than only at listing time.

## Important Design Constraints

- **Dual progression modes**: Both `Header.jsx` and `SimulationEngine.js` call `TransferManager.processDailyBidding()` — any changes to the bidding pipeline flow through the same `TransferManager` orchestrator, so only the AI/valuation layer needs changes.
- **User transfers**: `UserTransferHandler.js` handles user-initiated buys/sells separately. AI buying changes should not break user transfer flow.
- **TransferManager singleton**: All code paths share the same `TransferManager` instance via `transferManagerSingleton.js`.
- **Console logging**: Add diagnostic logs similar to the listing system (e.g., `🔹 BID: [Team] bids $X for [Player] (fitScore: Y, valuation: $Z)`)
- **No TypeScript**: Project uses JavaScript with JSDoc annotations.

## Files to Read Before Starting

1. `docs/core-systems/transfer-system.md` — Full system documentation
2. `src/core/finance/TransferAI.js` — Current bidding methods (lines 560-663)
3. `src/core/finance/PerformanceValuation.js` — Current valuation methods (lines 190-290)
4. `src/core/finance/TransferMarket.js` — `identifyInterestedTeams()` and `placeBid()`
5. `src/core/finance/TransferManager.js` — `processDailyBidding()` orchestration
6. `src/core/ai/AuctionTransferAI.js` — Reusable composition analysis methods
7. `src/data/config/auctionConfig.json` — Playstyle rating quotas
8. `src/data/config/transferConfig.json` — Transfer rules and AI behavior config
