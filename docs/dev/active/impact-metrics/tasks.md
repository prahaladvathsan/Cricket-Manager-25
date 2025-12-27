# Impact Metrics - Task Checklist

## Task 1: ImpactCalculator Module
- [ ] Create ImpactCalculator.js
- [ ] Implement calculateBallImpact()
- [ ] Implement attributeImpact() with dismissal type handling
- [ ] Test with manual calculations

## Task 2: MatchEngine Integration
- [ ] Import ImpactCalculator in MatchEngine.js
- [ ] Add impact calculation in updateTacticalStateAfterBall()
- [ ] Attach impact to ball record

## Task 3: QuickSimMatch Integration
- [ ] Same integration for quick-sim mode

## Task 4: Stats Extraction
- [ ] Update extractPlayerStatsFromBalls() to aggregate impact
- [ ] Update calculatePlayerOfMatch() to use impact

## Task 5: Store Updates
- [ ] Add impact fields to playerStore
- [ ] Add impact fields to teamStore

## Task 6: Leaderboards
- [ ] Add getTopImpactPlayers() to LeaderboardsCalculator
- [ ] Add MVP tab to League.jsx

## Task 7: UI Updates
- [ ] Update MatchResultModal (selection only)
- [ ] Update PlayerCard
- [ ] Update PlayerCardModal
- [ ] Update PlayerStatsTable
- [ ] Update SeasonSummaryView
