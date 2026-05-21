# Configuration Files Documentation

This directory contains JSON configuration files that control various aspects of the cricket simulation engine and game systems. All configs here are actively imported by code.

## Match-engine configs

| File | Purpose | Consumer |
|------|---------|----------|
| `mentality-config.json` | Contact-type probability matrix, missed-wicket probability (base + tier bonus), edge behavior, wicket-type split | `ContactCalculator`, `TrajectoryCalculator` |
| `trajectory-config.json` | Shot-speed multipliers, speed limits | `TrajectoryCalculator` |
| `shot_angles_config.json` | Ranked 0–360° shot-angle list (sized by `range360` attribute) | `TrajectoryCalculator` |
| `physics-config.json` | Field dimensions (boundary radius, striker offset), ball gravity, fielder `baseSpeed` | `BallTrajectoryPhysics`, `FielderMovementCalculator`, `FieldingCalculator2D` |
| `running-config.json` | Running speed (base + per-attribute), turning penalty, running-decision error probability, safe-margin | `RunningDecisionCalculator` |
| `field-formations-config.json` | 15 named field formations with role-position mapping | `fieldingFormationResolver`, `FieldPositioningSystem` |
| `fielding-positions-complete.json` | Position coordinates + metadata for all named fielding spots | `fieldingFormationResolver`, `FieldVisualEditor` |

## Tactics configs

| File | Purpose | Consumer |
|------|---------|----------|
| `tactics-config.json` | 6 acceleration tiers — mentality probabilities, attribute modifiers, playstyle-boost lists | `AccelerationTierManager` |
| `bowling-plans-config.json` | Pace + spin bowling plans (line-length × variation) with tendency scores, attribute modifiers, wicketBonus | `BowlingPlanManager`, `TrajectoryCalculator` |
| `contextual-modifiers-config.json` | New-ball boost (pace, overs 1-4) + left-right partnership accuracy penalty | `ContextualModifierManager` |
| `matchup-bonuses-config.json` | Batter ↔ bowling-style preference rank → attribute bonus/penalty | `MatchupEvaluator` |
| `confidence-config.json` | Confidence levels, triggers (boundaries, milestones, dots), match-level rolling window | `ConfidenceManager` |
| `energy-config.json` | Energy levels, depletion per ball, fitness ceilings, fatigue/injury triggers | `EnergyManager`, `gameStore` (recovery) |
| `dls-resources-config.json` | DLS resource-remaining lookup table | `DLSCalculator`, `PressureCalculator` |

## Playstyle configs

| File | Purpose | Consumer |
|------|---------|----------|
| `playstyle-weightings.json` | Attribute weights to compute the 0-100 playstyle rating for each of 24 playstyles | `PlaystyleCalculator` |
| `playstyle-modifiers.json` | Conditional attribute modifiers triggered by match context (phase, partnership, overs) | `AttributeModifierSystem` |

## AI / economy configs

| File | Purpose | Consumer |
|------|---------|----------|
| `ai-config.json` | AI tactics + auction-bidding parameters | `AICore`, `AITacticsManager`, `AuctionTransferAI` |
| `auctionConfig.json` | Auction phase rules, base prices, bidding caps | `AuctionEngine`, `AuctionTransferAI` |
| `retentionConfig.json` | Player retention salary caps, tier slots | `RetentionEngine`, `RetentionAI`, `PlayerAcceptance` |
| `transferConfig.json` | Transfer market parameters | `TransferAI`, `TransferMarket` |
| `financeConfig.json` | Team finance defaults, match payouts | `FinanceEngine` |
| `insight-thresholds.json` | Match analytics insight rule thresholds | `matchAnalytics`, `TacticsRecommendations` |

## Recently removed (this session)

These were either stub-loaded (never actually read) or had no consumers after the engine was simplified:

| File | Reason |
|---|---|
| `simulation-config.json` | Only referenced by the now-deleted `ConfigurationManager` stub |
| `probability-tables.json` | Same |
| `modifiers-config.json` | Same |
| `balance-config.json` | Same |
| `gameplay-config.json` | Same |

Within active configs, these unused values were also stripped:

| Removed value | File |
|---|---|
| `bowling.{attacking,neutral,defensive}.wicketProbability` block | `mentality-config.json` |
| `edgeBehavior.betterContact.fieldingResolution` block | `mentality-config.json` |
| `decisionFactors.judgmentWeight` | `running-config.json` |
| `riskAssessment.riskyMargin` / `.conservativeBonus` / `.aggressiveBonus` | `running-config.json` |

Last Updated: this session
