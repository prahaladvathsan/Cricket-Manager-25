# AI Optimization Feature - Plan

## Overview
Comprehensive overhaul of AI decision-making with:
- Improved auction/transfer AI (second-price auction, better valuation)
- Multi-stage pre-match AITacticsManager (5 sequential stages)
- Mid-match AI for full simulations only

## Key Architecture

```
AITacticsManager.prepareMatchTactics()
  ├─ Stage 1: selectPlayingXI()          → updates squadSelection
  ├─ Stage 2: assignPlaystylesAndRoles() → updates playstyleOverrides, C/VC/WK
  ├─ Stage 3: optimizeBattingTactics()   → updates battingOrder, accelerationTiers
  ├─ Stage 4: assignBowlingTactics()     → updates bowlingRotation, bowlingPlans
  └─ Stage 5: setupFieldTactics()        → updates fieldFormation, fieldPositions
```

## Files to Create
- `src/data/config/ai-config.json`
- `src/core/ai/index.js`
- `src/core/ai/AICore.js`
- `src/core/ai/AuctionTransferAI.js`
- `src/core/ai/AITacticsManager.js`

## Files to Modify
- `src/core/auction-system/AuctionEngine.js` - Second-price fix
- `src/core/league/PreMatchSetup.js` - Integration point
- `src/core/match-engine/core/MatchEngine.js` - Mid-match hook

## Code to Delete After
- Duplicate selection functions across 4 files
- Old auction AI files (consolidate into AuctionTransferAI)

See full plan at: `C:\Users\praha\.claude\plans\sleepy-beaming-garden.md`
