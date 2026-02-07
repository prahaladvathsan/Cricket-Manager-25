# Plan: Move All Playstyle Computation to Browser

## Goal
Remove all pre-computed playstyle data (`playstyleRatings`, `topPlaystyles`, `primaryPlaystyle`) from the master player database JSON. All playstyle calculations will be done at the browser level using `PlaystyleCalculator`.

## Current State
- `master_player_database.json` contains pre-computed `playstyleRatings`, `topPlaystyles`, and `primaryPlaystyle` for each of the 545 players
- The web worker (`playerDatabaseWorker.js`) also recalculates playstyles when applying custom patches
- `PlaystyleCalculator.js` (browser-side) already has the full calculation logic
- `ratingHelper.js` now has `computePlayerRatings()` with WeakMap caching for UI components
- Match engine reads stored `player.playstyleRatings`/`topPlaystyles`/`primaryPlaystyle` directly for performance

## What Changes

### Phase 1: Strip Playstyle Data from Master Database
1. **Update `cricket-data-processor`** to stop generating `playstyleRatings`, `topPlaystyles`, and `primaryPlaystyle` in the player JSON output
2. **Reduce `master_player_database.json` size** - each player only needs: `id`, `name`, `fullName`, `age`, `DOB`, `nationality`, `role`, `battingHand`, `bowlingHand`, `bowlingType`, `bowlingStyle`, `primaryBattingPosition`, `currentTeam`, `stats`, `attributes` (with `batting`, `bowling`, `physical`, `mental`, `fielding`, `overall` sub-objects)
3. **Remove from worker** (`playerDatabaseWorker.js`): the playstyle calculation code in `applyPatches()` that recalculates playstyles for patched players. The worker just applies attribute patches and returns.

### Phase 2: Compute Playstyles at App Load
1. **In `initializePlayers()` (playerStore.js)**: After building the players map, compute playstyles for ALL players using `PlaystyleCalculator`
   - This runs once at load time, sets stored values on each player object
   - Match engine can continue reading stored values for performance
   - Estimated time: 545 players x ~24 playstyles = ~13,000 calculations (should be <100ms)
2. **Alternative**: Lazy computation - only compute when first accessed via `computePlayerRatings()`. The WeakMap cache means each player is computed at most once per session. Match engine would need to call `computePlayerRatings()` before simulation starts.

### Phase 3: Simplify `updatePlayerCustomization`
1. Remove the playstyle recalculation code from `updatePlayerCustomization()` in `playerStore.js`
2. Since `computePlayerRatings()` uses WeakMap keyed by object reference, and `updatePlayerCustomization` creates a new player object, the cache auto-invalidates
3. UI components already use `computePlayerRatings()` so they show fresh values
4. Match engine will pick up the new stored values on next match start (when `initializePlayers` or manual recalc runs)

### Phase 4: Match Engine Integration
1. **Option A (Recommended)**: Before each match, the match setup code calls `computePlayerRatings()` for all 22 players (11 per side) and stores the results on the player objects. This ensures match engine has fresh pre-computed values. Cost: ~22 calculations, negligible.
2. **Option B**: Match engine reads from `computePlayerRatings()` directly. Since results are cached per object reference and player objects don't change during a match, this is effectively the same as reading stored values.

## Files to Modify

### cricket-data-processor (external repo)
- Remove playstyle generation from player output pipeline

### master_player_database.json
- Strip `playstyleRatings`, `topPlaystyles`, `primaryPlaystyle` from all 545 player objects
- Expected size reduction: ~30-40% of current JSON size

### src/workers/playerDatabaseWorker.js
- Remove `calculatePlaystyleRating()`, `calculateAllPlaystyleRatings()`, `getPlayerPrimaryPlaystyles()` functions
- Remove playstyle recalculation in `applyPatches()`
- Worker just applies attribute patches and returns

### src/stores/playerStore.js
- `initializePlayers()`: Add bulk playstyle computation after building players map
- `updatePlayerCustomization()`: Remove manual playstyle recalculation (WeakMap cache handles it)

### src/utils/ratingHelper.js
- Already done: `computePlayerRatings()` with WeakMap cache
- May need to handle the case where stored values don't exist at all (remove fallback to stored values)

### UI Components (already done)
- `PlayerCardModal.jsx`, `PlayerCard.jsx`, `PlayerBrowser.jsx` already use `computePlayerRatings()`
- Other components (tactics, squad, etc.) should be migrated too

## Benefits
- **Single source of truth**: Attributes are the only stored data, playstyles are always derived
- **Smaller database file**: Fewer bytes to download and parse
- **No stale data bugs**: Playstyle ratings always reflect current attributes
- **Simpler data pipeline**: cricket-data-processor only needs to output raw attributes
- **Easier modding**: Users only need to edit attributes; playstyles auto-update

## Risks
- **Initial load time**: Computing playstyles for 545 players adds ~50-100ms to load
- **Match engine performance**: If using lazy computation (Option B), first ball simulation for each new player pair would be slightly slower due to cache miss. Negligible in practice.

## Migration Strategy
1. Implement Phase 2 first (compute at load time) while keeping playstyle data in the JSON
2. Verify all components work correctly with computed values
3. Then strip data from JSON (Phase 1) and remove worker code (Phase 3)
4. This allows rollback if issues are found
