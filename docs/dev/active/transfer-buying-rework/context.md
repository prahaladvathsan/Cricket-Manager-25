# Transfer System Rework — Implementation Context

## Status: COMPLETE (All 7 Phases + UI Improvements + Bug Fixes)

## Files Modified

| File | Changes |
|---|---|
| `src/core/finance/FinanceEngine.js` | Added `annualBudget`, `salaryExpenses`, `releaseEarnings` fields; `deductSquadSalaries()`, `processPlayerRelease()`; half-price `processTransferPurchase()` |
| `src/stores/financeStore.js` | Added `deductSquadSalaries()` and `processPlayerRelease()` store actions |
| `src/core/ai/AuctionTransferAI.js` | Added `calculatePerformanceBonus()`; reworked `estimateMarketValue()` (removed tier multipliers, added perf bonus param); `calculateBudgetPenalty()` now uses annual budget |
| `src/core/finance/TransferAI.js` | Updated `calculatePlayerValuation()` (annualBudget + performanceBonus); `evaluateDailyBid()` (50% skip, 10-70% fraction, half-price check); added `evaluateDailyListing()` (max 1/day), `_generateListingCandidates()`, `releasePreTransferWindow()`, `autoReleaseExpiredListing()`, `_releasePlayer()`; constructor accepts `transferStore` |
| `src/core/finance/TransferMarket.js` | Half-price budget validation in `completeTransfer()`, `placeBid()`, `identifyInterestedTeams()`; added `reason` field on listings; `processExpiredListings()` returns `expiredNoBid` array; records completed transfers to store |
| `src/core/finance/TransferManager.js` | Daily listing cadence; auto-release orchestration from expired listings; imports `useTransferStore` + `useInboxStore`; passes `transferStore` to `TransferAI`; daily bid summary inbox notifications |
| `src/core/offseason/OffSeasonManager.js` | Salary deduction in `startOffSeason()`; pre-window releases at week 22 |
| `src/core/simulation/SimulationEngine.js` | Pre-window releases before window opens; post-auction free agency population with `status: 'unsold'` |
| `src/stores/transferStore.js` | Added `addFreeAgent()`, `addCompletedTransfer()`, `completedTransfers` array |
| `src/core/transfers/UserTransferHandler.js` | Half-price free agent signing; assigns player to team on signing; half-price bid validation; `releasePlayer()` for user-initiated releases; records completed transfers |
| `src/components/layout/Transfers.jsx` | Post-auction free agency population with `status: 'unsold'` |
| `src/components/Transfers/TransferMarketView.jsx` | Added "Completed" tab with CompletedTransfersView |
| `src/components/Transfers/FreeAgencyView.jsx` | Rewritten with SortableTable: asking price, signing cost, status (Released/Unsold), sign action |
| `src/components/Transfers/CompletedTransfersView.jsx` | NEW: Shows all completed transfers + free agency signings with from/to team, old/new price, fee paid |
| `src/components/Transfers/MyListingsView.jsx` | PlayerName opens with transfers tab |
| `src/components/Transfers/MarketplaceView.jsx` | PlayerName opens with transfers tab |
| `src/components/shared/PlayerCardModal.jsx` | Added Profile/Transfer History tabs; Transfer History shows current value, active listing with bids, transfer history |
| `src/components/shared/PlayerName.jsx` | Added `initialTab` prop passed through to PlayerCardModal |
| `src/components/team/Squad.jsx` | Added "Release" button alongside "List" button during transfer window |
| `src/data/config/transferConfig.json` | Added `releaseRules` section; updated `aiBuyingBehavior` (dailyBidProbability, bidFractionMin) |

## Key Decisions

- **Half-price economics**: `transferFee` param = full annual salary. Actual money exchanged = `Math.round(transferFee / 2)`. `soldPrice` always stores the full annual salary.
- **Performance bonus**: Uses IPM rank-mapping against buyer squad's price distribution. Clamped to [-200K, +1M].
- **Daily listings**: 50% probability gate per team per day, max 1 listing per team per day. `_generateListingCandidates()` extracts 3-pass model; overflow queued for future days.
- **Auto-release**: Only triggers for expired-no-bid listings; checks category-specific conditions before releasing.
- **Free agency**: Populated from permanently unsold auction players (`status: 'unsold'`) + released players (`status: 'released'`). `_releasePlayer()` handles all release-to-free-agency flow. Sign cost = asking price / 2.
- **User releases**: Available from Squad page during transfer window. Recoup = 30% of half-year salary.
- **Completed transfers**: Persisted in `transferStore.completedTransfers`. Recorded from TransferMarket.completeTransfer() and UserTransferHandler.signFreeAgent().
- **Bid summaries**: Daily inbox notification summarizing all bids on user's listed players.
- **Transfer History modal tab**: PlayerCardModal has Profile/Transfer History tabs. Transfer pages pass `initialTab="transfers"` to PlayerName.
- **Save compatibility**: All new fields default gracefully (`|| 0`, `|| fallback`) for existing saves.

## Bug Fixes (Post-Implementation)

### Fix: Queue promotions flooding (dumped all candidates at once)
- `promoteFromQueue()` now only fires when listings actually expire (`expiredCount > 0`)
- Limited to max 1 promotion per team per day (1:1 replacement for expired listings)

### Fix: Pre-window releases not firing in normal UI mode
- Header.jsx opened transfer window directly at week 22 without calling `releasePreTransferWindow()`
- Added `transferManager.transferAI.releasePreTransferWindow(preReleaseTeams)` call before `openWindow()` in Header.jsx
- Now matches SimulationEngine.js flow (which already had the call)

### Fix: 0 bids — all squads full (25/25) after auction
- `identifyInterestedTeams()` and `evaluateDailyBid()` now account for actively listed players as outgoing capacity
- `effectiveSquadSize = squad.length - activeListingsCount` — teams with listed players can still bid
- Combined with pre-window releases (bringing squads from 25 to 23), ensures bidding activity occurs

### Improvement: Condensed console logs
- Removed verbose per-team, per-player, per-listing console.log lines
- Daily transfer cycle outputs single `console.groupCollapsed()` line with summary stats (expandable for details)
- Weekly cycles, listing phases, and transfer summaries also use `groupCollapsed`
- Per-team transfer activity summaries use `groupCollapsed` with bid/listing counts

### Fix: Save/Load system — transfer state persistence
- **`completedTransfers` missing from SaveGameManager** — Added to both `_buildSaveData()` and `_restoreStoreStates()`
- **`soldPrice` missing from save files** — Added `playerSoldPrices` map to playerState in save data, restored on load
- **TransferManager singleton not reset on load** — Added `resetTransferManager()` call after store restore in `_restoreStoreStates()`
- **TransferMarket.listings Map lost on load** — Added `restoreFromStore()` method to TransferManager, called automatically by singleton on creation. Rebuilds listings Map and window state from transferStore
- **Save captures live listings from singleton** — `_buildSaveData()` now reads active listings from TransferManager singleton (source of truth) instead of relying on potentially stale transferStore.activeListings (which only syncs via 1-second interval when UI is mounted)
- **Stale state on load** — Transfer store always gets reset on load (even if save has no transferState), preventing stale data from previous game leaking through
