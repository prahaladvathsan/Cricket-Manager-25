# Impact Metrics System - Implementation Plan

## Overview
Implement DLS-based impact metrics to objectively evaluate player performances. Impact = Change in DLS Gap per ball.

## Key Rules
- First innings: Uses 165 as expected par score
- Second innings: Uses actual chase target
- Caught (outfield): 50/50 bowler/fielder
- Caught behind (keeper): 80/20 bowler/fielder
- Run out: 100% to fielder(s)
- Wides/No-balls: Bowler penalty only

## Files to Create
- `src/core/tactics/ImpactCalculator.js`

## Files to Modify
- `src/core/match-engine/core/MatchEngine.js`
- `src/core/match-engine/utils/QuickSimMatch.js`
- `src/utils/MatchStatsUpdater.js`
- `src/stores/playerStore.js`
- `src/stores/teamStore.js`
- `src/core/league/LeaderboardsCalculator.js`
- `src/components/layout/League.jsx`
- `src/components/shared/MatchResultModal.jsx`
- `src/components/shared/PlayerCard.jsx`
- `src/components/shared/PlayerCardModal.jsx`
- `src/components/team/PlayerStatsTable.jsx`
- `src/components/OffSeason/SeasonSummaryView.jsx`
