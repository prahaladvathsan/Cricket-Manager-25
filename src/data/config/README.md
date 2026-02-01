# Configuration Files Documentation

This directory contains 25 JSON configuration files that control various aspects of the cricket simulation engine.

## Core Configs (Loaded by ConfigurationManager)

These configs are dynamically loaded by `src/core/match-engine/systems/ConfigurationManager.js`:

| File | Purpose | Size |
|------|---------|------|
| **simulation-config.json** | Core simulation parameters and thresholds | 5.2KB |
| **probability-tables.json** | Outcome probability distributions | 9.2KB |
| **modifiers-config.json** | Match-level temporary modifiers (weather, pitch, ball) | 10.4KB |
| **balance-config.json** | Game balance tuning and multipliers | 7.0KB |
| **gameplay-config.json** | Persistent player state systems (energy, form, momentum) | 9.6KB |

### Why Two Similar Configs?

**modifiers-config.json** vs **gameplay-config.json**:
- **modifiers-config**: Temporary/match-level modifiers (weather, pitch, ball, partnerships)
- **gameplay-config**: Persistent player state (energy, form, momentum, confidence)

While there is overlap, they serve different architectural purposes.

## System-Specific Configs

All 25 configs are actively used across the match engine, tactics, AI, and economy systems.

## Recently Removed

- `fielding-config.json` - Unused temporary implementation (removed 2026-01-30)

Last Updated: 2026-01-30
