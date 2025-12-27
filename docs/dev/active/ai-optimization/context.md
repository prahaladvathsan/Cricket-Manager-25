# AI Optimization - Context

## Session Start
- Date: 2025-01-25
- Branch: testing

## Files Changed

### Phase 1 - Auction/Transfers AI (COMPLETED)
- CREATED: `src/data/config/ai-config.json` - Centralized AI configuration
- CREATED: `src/core/ai/index.js` - Module exports
- CREATED: `src/core/ai/AICore.js` - Core decision engine with fitness penalty, player ratings
- CREATED: `src/core/ai/AuctionTransferAI.js` - Consolidated auction/transfer AI with:
  - Improved player valuation
  - Better squad fit scoring
  - Second-price auction logic
  - Performance evaluation for transfers
- MODIFIED: `src/core/auction-system/AuctionEngine.js` - Added second-price auction in fast-mode

### Phase 2 - Multi-Stage AI Tactics Manager (COMPLETED)
- CREATED: `src/core/ai/AITacticsManager.js` - 5-stage pre-match tactics pipeline:
  - Stage 1: Playing XI Selection (60% primary rating + 40% playstyle fit - role gap penalty - fitness penalty)
  - Stage 2: Playstyle Revision + C/VC/WK Assignment
  - Stage 3: Batting Order + Acceleration Tiers
  - Stage 4: Bowling Over Assignment + Plans
  - Stage 5: Field Setup + Position Assignment
- MODIFIED: `src/data/config/ai-config.json` - Added playstyle rating caps (batting + bowling categories)

### Phase 2.5 - Integration & Cleanup (COMPLETED)
- MODIFIED: `src/core/league/PreMatchSetup.js`:
  - Removed TeamSelectionManager import
  - Added AITacticsManager integration
  - Fallback now uses AITacticsManager instead of old selection functions
- MODIFIED: `src/core/simulation/SimulationEngine.js`:
  - Added AITacticsManager import
  - Generate fresh AI tactics for AI teams before each quick-sim match
- MODIFIED: `src/utils/LeagueInitializer.js`:
  - Added AITacticsManager import
  - Replaced `teamStore.initializeAllTeamsTactics()` with AITacticsManager calls
- MODIFIED: `src/core/ai/UserTeamAI.js`:
  - Replaced old imports with AITacticsManager
  - Updated `prepareForMatch()` to use AITacticsManager
- MODIFIED: `src/stores/teamStore.js`:
  - DELETED: `selectBalancedPlayingXI()` (~65 lines)
  - DELETED: `initializeDefaultTactics()` (~40 lines)
  - DELETED: `initializeAllTeamsTactics()` (both copies, ~65 lines total)
  - UPDATED: `resetTacticsToDefaults()` to simply clear tactics
- MODIFIED: `src/core/match-engine/interactive/TeamSelectionManager.js`:
  - DELETED: `selectBalancedTeam()` (~95 lines)
  - DELETED: `optimizeBattingOrder()` (~125 lines)
  - DELETED: `selectNextBowler()` (~75 lines)
  - KEPT: `selectBalancedSquad()`, `validateSquadComposition()`, `getSquadComposition()`

## Key Decisions
1. NO form calculators (form mechanics not implemented)
2. NO matchup analyzer (overkill)
3. Use fitness PENALTIES (not hard thresholds)
4. Playstyle optimization is PRE-MATCH only
5. Mid-match AI only in full simulations
6. Delete duplicate code, don't keep as wrappers
7. AI tactics generated fresh BEFORE each match via:
   - SimulationEngine.simulateMatch() for quick-sims
   - PreMatchSetup.prepareMatch() for full-sims
8. User team tactics are NEVER modified by AI

## Integration Flow

### Quick-Sim Flow (SimulationEngine.js)
1. `simulateMatch(fixture)` called
2. Check if home team is AI → Generate tactics via AITacticsManager
3. Check if away team is AI → Generate tactics via AITacticsManager
4. Read tactics from teamStore
5. Build matchConfig and run quickSimMatch()

### Full-Sim Flow (PreMatchSetup.js)
1. `prepareMatch()` called
2. `generateAITactics()` for home team (if AI)
3. `generateAITactics()` for away team (if AI)
4. `selectPlayingXI()` reads tactics from store
5. Continue with toss and match setup

### Post-Auction Initialization (LeagueInitializer.js)
1. After auction completes
2. For each team, call `AITacticsManager.generateTactics()`
3. All teams start with optimized tactics

## Code Deletion Summary
Deleted approximately **400 lines** of duplicate selection/tactics code:
- teamStore.js: ~170 lines (3 functions)
- TeamSelectionManager.js: ~295 lines (3 functions)

### Phase 2.6 - Auction AI Consolidation (COMPLETED)
- DELETED: `src/core/auction-system/AuctionAI.js` (~560 lines)
- DELETED: `src/core/auction-system/PlayerValuation.js` (~410 lines)
- MODIFIED: `src/core/auction-system/AuctionEngine.js`:
  - Now imports only AuctionTransferAI + AICore
  - Uses `this.ai` (AuctionTransferAI) for all AI decisions
  - Uses `this.core` (AICore) for utility functions (formatPrice, getPrimaryPlaystyleRating)
- MODIFIED: `src/components/layout/Transfers.jsx`:
  - Replaced PlayerValuation import with AICore
  - All `valuation.formatPrice()` → `aiCore.formatPrice()`
- MODIFIED: `src/components/shared/PlayerCard.jsx`:
  - Replaced PlayerValuation import with AICore
  - All `valuation.formatPrice()` → `aiCore.formatPrice()`

## Current State
- Phase 1 COMPLETE
- Phase 2 COMPLETE
- Integration COMPLETE
- Auction AI Consolidation COMPLETE

## Next Steps
1. Add mid-match AI hook in MatchEngine (full sims only) - Phase 3
2. Test the integration thoroughly
3. Move to `docs/dev/completed/` when verified
