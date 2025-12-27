# Impact Metrics - Development Context

## Current State
Starting implementation

## Files Changed
(none yet)

## Decisions Made
- First innings par: 165 runs
- Caught behind split: 80% bowler, 20% keeper
- Outfield catch split: 50% bowler, 50% fielder
- Run out: 100% fielder
- Man of Match uses impact for selection, shows traditional stats in modal

## Notes
- DLSCalculator.js has `getParScore(ballsRemaining, wicketsInHand, targetScore)` method
- MatchStatsUpdater.js has `calculatePlayerOfMatch()` at lines 156-196
