# v1.2.4 Bug Report

Released: May 2026 · Merge commit `13b17e8`

User-reported issues against v1.2.3 + regressions that surfaced during diagnosis. All fixes are on `main`.

---

## 1. Transfer market — "Listing not found" on bid submit

**Symptom.** Marketplace shows a listing, modal opens with correct data, clicking Place Bid alerts `Listing not found`.

**Root cause.** Two distinct desyncs:

1. **`useTransferSystem` 1-second sync interval was wiping the persisted store during the rehydration race.** The interval copied the in-memory `TransferMarket.listings` Map back to `transferStore.activeListings` every second. If the interval fired before `transferStore` finished rehydrating from IndexedDB, the Map was empty and got written back over the persisted listings, leaving both layers empty and `placeBid` with nothing to fall back to.
2. **`globalTransferHandler` in `useTransferSystem.js` held a stale `transferMarket` reference.** `resetTransferManager()` (called by `SaveGameManager` on save load and by `TeamSelectionModal` on new game) created a new singleton + new `TransferMarket`, but the cached handler kept pointing at the old market. Console showed handler's Map size = 14 while the singleton's Map size = 5.

**Fixes.**
- `src/hooks/useTransferSystem.js`: gate sync interval on `isHydrated('transfer')`; if Map is empty but store has listings, recover via `restoreFromStore` instead of writing the empty Map. Replaced `useMemo` with per-render staleness check (`globalTransferHandler.transferMarket !== market`) so the handler rebuilds when the singleton is reset.
- `src/stores/transferStore.js`: `onRehydrateStorage` triggers `TransferManager.restoreFromStore()` after rehydration completes.
- `src/utils/storeHydration.js`: added `isHydrated(storeName)` helper.
- `src/core/transfers/UserTransferHandler.js`: one-shot recovery in `placeBid` — if listing missing from Map but present in store, force re-restore and retry once.

---

## 2. Transfer market — 1.5× max bid cap

**Symptom.** Bidding capped at 150% of asking price regardless of budget; users with $8M+ could not bid above $720K on a $480K listing.

**Resolution.** Cap removed. Bids now constrained only by budget (half-price economics → ceiling = `budget × 2`).

**Files.** `src/components/Transfers/BidModal.jsx`, `src/core/transfers/UserTransferHandler.js` (`getRecommendedBid` no longer returns `maxBid`). "Max" quick-bid button renamed to "Budget".

---

## 3. Squad inflated to 46 entries; bids rejected with "max squad size is 25"

**Symptom.** User had 24 unique players but `placeBid`'s `squadLists[teamId].length` check reported 46. Releases reduced the count (each release removed *all* occurrences via `.filter`) but couldn't get below 25.

**Root cause.** `addPlayerToSquad` simply appended. The auction restore in `Transfers.jsx` (the `useEffect` running when `savedAuction.auctionState === 'in_progress'`) re-iterates `savedAuction.soldPlayers` and re-calls `addPlayerToSquad` for every entry on every mount of the Transfers page. Each navigation away and back re-applied the full sold-player history, duplicating the squad.

**Fixes.**
- `src/stores/teamStore.js`: `addPlayerToSquad` is now idempotent — short-circuits if the ID is already in the squad.
- `src/stores/teamStore.js`: `onRehydrateStorage` dedupes `squadLists` on IndexedDB load.
- `src/utils/SaveGameManager.js`: `_restoreStoreStates` dedupes `squadLists` when loading a save file (the rehydration path doesn't fire here).

Existing bad saves self-heal on next load.

---

## 4. My Listings — UI doesn't update after release / list

**Symptom.** Releasing a player removed them from the data layer but the row stayed visible with active release/list buttons.

**Root cause.** `MyListingsView.jsx` derived its squad via:

```js
const squadPlayers = useMemo(() => getPlayersByTeam(userTeamId), [userTeamId, getPlayersByTeam]);
```

`getPlayersByTeam` is a Zustand action and its reference is stable, so `useMemo` never re-ran. The cached array survived all store mutations.

**Fix.** Subscribe reactively to `playerStore.players` and derive the squad in the `useMemo` body. Now re-derives whenever a player's `currentTeam` changes.

---

## 5. Retention → Auction chain broken; auction skipped

**Symptom (multiple variants).**
- After retention, the user advanced to the new season and went straight into the league with only retained players — no auction.
- Fresh save simmed through Season 2's transfer window → no retention phase, no auction.

**Root cause.** A combination of issues:

- **Watcher gate too strict.** The `Transfers.jsx` auto-start watcher only fired when `auctionState === 'not_started'`. After Season 1's auction, the persisted state stayed `'completed'`, so the watcher refused to fire when Season 3's `new_season_start` set `pendingAutoStart = true`.
- **`pendingAutoStart` was being persisted to IndexedDB.** Any earlier run that set the flag but couldn't act on it left a stale `true` in IDB, which would later trigger an unwanted auction on the next navigation to `/game/transfers`.
- **Retention completion navigated to `/game/transfers` instead of advancing the calendar.** This routed the user past the day where `new_season_start` was due to fire, with no calendar event to actually trigger the auction.
- **Header `new_season_start` handler didn't reset the season/initialize for odd seasons.** It just navigated to the transfers page and trusted the user to start the auction.
- **`Home.jsx` scheduled a legacy `auction` event for Season 2.** Season 2 is even — no auction should occur — but the legacy event triggered the handler regardless.
- **`resetForNewSeason` year math was off by a year for January-anchored auctions.** Adding `+1` to the current year unconditionally jumped from year N+1 → N+2 when the auction landed in early January.

**Fixes.**
- `src/components/layout/Transfers.jsx`: watcher gate relaxed to `auctionState !== 'in_progress'`. `handleStartAuction` already calls `resetAuction()` so this is safe.
- `src/stores/auctionStore.js`: `partialize` excludes `pendingAutoStart` from persistence; `onRehydrateStorage` force-clears any stale value from older saves.
- `src/components/Retention/RetentionView.jsx`: after completion, navigate to `/game/home`. The user clicks Continue to advance the calendar and trigger the auction event.
- `src/components/layout/Header.jsx`: `new_season_start` handler for odd seasons sets `pendingAutoStart = true` and navigates. Adds idempotency guard on `retention_start` (skip if already completed). Continue-button label switches to "Start Auction" on the auction-day event.
- `src/components/layout/Home.jsx`: schedule `new_season_start` (with optional preceding `retention_start`) instead of the legacy `auction` event.
- `src/utils/LeagueInitializer.js`: anchor `retention_start` to Jan 6 and `new_season_start` to Jan 7 of the new league year for odd-season transitions.
- `src/stores/gameStore.js`: `resetForNewSeason` year math now detects whether the current date is already in the target half-year before incrementing.

---

## 6. Player profile crash before any matches played

**Symptom.** Opening a freshly-auctioned player's profile before Season Day 1 — generic React `Something went wrong` error.

**Root cause.** `PlayerCardModal.jsx:455`:

```js
const seasonStats = careerStats[playerId]?.seasons[currentSeasonId] || null;
```

The `?.` short-circuits only `careerStats[playerId]`. If a partial entry existed (e.g., `{ matches: 0 }` without a `seasons` map), reading `.seasons` returned `undefined`, then `undefined[currentSeasonId]` threw `TypeError`.

**Fix.** Full optional chaining: `careerStats[playerId]?.seasons?.[currentSeasonId] || null`. Also guarded the `runs / balls` aggregation in `Matches.jsx` against `runs === undefined`.

---

## Files changed (summary)

```
CLAUDE.md
src/components/Retention/RetentionView.jsx
src/components/Transfers/BidModal.jsx
src/components/Transfers/MyListingsView.jsx
src/components/layout/Header.jsx
src/components/layout/Home.jsx
src/components/layout/Transfers.jsx
src/components/match/Matches.jsx
src/components/menu/PatchNotesModal.jsx
src/components/menu/StartMenu.jsx
src/components/shared/PlayerCardModal.jsx
src/core/finance/TransferManager.js
src/core/finance/transferManagerSingleton.js
src/core/transfers/UserTransferHandler.js
src/hooks/useTransferSystem.js
src/stores/auctionStore.js
src/stores/gameStore.js
src/stores/teamStore.js
src/stores/transferStore.js
src/utils/LeagueInitializer.js
src/utils/SaveGameManager.js
src/utils/storeHydration.js
```

## Lessons / patterns to watch

- **Zustand selectors vs. action references.** Action functions destructured from `useStore()` are stable across renders. Using them in `useMemo` deps means the memo never invalidates. Always subscribe to the underlying *data*, not the *getter*.
- **Singleton + cached consumer.** When a singleton can be reset, every cached consumer (`globalTransferHandler` here) needs to detect staleness or be reset alongside.
- **Persisted vs. transient flags.** `pendingAutoStart` is event-driven and should never have been persisted. Use `partialize` for transient store fields.
- **Idempotency on append operations.** Any "add to list" mutation called from a loop that could re-run (auction restore, retention finalize) must be idempotent.
- **Dedupe migrations.** When a duplication bug is identified, ship both an `addPlayerToSquad`-style guard AND a one-shot dedupe in `onRehydrateStorage` + `SaveGameManager.loadGame` so existing bad saves self-heal.
- **Save-file load bypasses rehydration.** `onRehydrateStorage` only runs when Zustand reads from IDB on app start. Loading a `.json` save via `SaveGameManager` is a separate write path and needs its own migrations.
