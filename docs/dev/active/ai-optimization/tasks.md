# AI Optimization - Tasks

## Phase 1: Auction/Transfers AI (COMPLETED)
- [x] 1.1 Create ai-config.json
- [x] 1.2 Create AI module structure (src/core/ai/)
- [x] 1.3 Create AICore.js
- [x] 1.4 Create AuctionTransferAI.js (improved valuation + squad fit)
- [x] 1.5 Fix AuctionEngine.js second-price auction

## Phase 2: Multi-Stage AI Tactics Manager (COMPLETED)
- [x] 2.1 Create AITacticsManager.js with 5-stage pipeline
- [x] 2.2 Integrate into pre-match flow (AI teams ONLY)
- [x] 2.3-2.7 All stages implemented

## Phase 3: In-Match AI
- [ ] 3.1 Add mid-match tactical hook in MatchEngine

## Cleanup (COMPLETED)
- [x] Delete obsolete functions from teamStore.js
- [x] Delete obsolete functions from PreMatchSetup.js
- [x] Delete obsolete functions from TeamSelectionManager.js
- [x] Consolidate/delete old auction AI files
  - Deleted: AuctionAI.js
  - Deleted: PlayerValuation.js
  - Updated: AuctionEngine.js → uses AuctionTransferAI + AICore
  - Updated: Transfers.jsx, PlayerCard.jsx → use aiCore.formatPrice()
- [x] Update all imports
