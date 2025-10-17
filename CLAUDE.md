# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cricket Manager is a cricket management simulation game inspired by Football Manager, focusing on the World Premier League (WPL) format. This is a React-based single-page application with realistic player progression, deep tactical gameplay, and ball-by-ball match simulation.

**World Premier League**: A fictional T20 cricket league featuring 10 teams from major cricket-playing nations, avoiding copyright issues while maintaining authentic cricket management experience.

## Quick Start

### Setup
```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
```

### Key Commands
```bash
npm run build        # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
```

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **State Management**: Zustand stores
- **Data Processing**: External cricket-data-processor module
- **Persistence**: LocalStorage (MVP phase)
- **Language**: JavaScript with JSDoc

## Architecture Overview

### Core Systems
- **Match Engine**: SimpleBallSimulator with 4-step simulation + 2D physics-based fielding (Decision → Contact → Trajectory → 2D Fielding) [`docs/core-systems/match-engine.md`]
- **Player System**: Attribute-based player modeling (1-20 scale) [`docs/data/player-attributes.md`]
- **Playstyle System**: Dynamic attribute modifiers based on match context (24 playstyles: 16 batting + 8 bowling) [`docs/core-systems/playstyle-system.md`]
- **Tactics System**: T20 tactical control with acceleration tiers and bowling plans (7-stage modifier chain) [`docs/core-systems/tactics-system.md`]
- **State Management**: Zustand stores for game state [`docs/frontend/state-management.md`]
- **League System**: WPL structure and scheduling [`docs/core-systems/league-system.md`]

### Directory Structure
```
src/
├── core/                    # Core game systems
│   └── match-engine/       # Ball-by-ball simulation
├── stores/                 # Zustand state management
├── components/             # React UI components
├── data/                   # Static game data
└── utils/                  # Utility functions
```

**Note**: Data processing pipeline moved to external `cricket-data-processor` module (adjacent to this repository).

## Documentation Index

### 🏗️ Architecture & Design
- [System Overview](docs/architecture/system-overview.md) - High-level architecture
- [Data Flow](docs/architecture/data-flow.md) - How data moves through the system
- [Design Patterns](docs/architecture/design-patterns.md) - Code conventions

### ⚙️ Core Systems
- [Match Engine](docs/core-systems/match-engine.md) - Ball-by-ball simulation architecture
- [Match Engine Tuning](docs/core-systems/match-engine-tuning.md) - Outcome probability tuning
- [Player System](docs/core-systems/player-system.md) - Attributes and progression
- [Playstyle System](docs/core-systems/playstyle-system.md) - Dynamic attribute modifiers
- [Tactics System](docs/core-systems/tactics-system.md) - T20 tactical control (acceleration tiers, bowling plans, DLS targets)
- [League System](docs/core-systems/league-system.md) - WPL structure (planned)
- [Auction System](docs/core-systems/auction-system.md) - Player trading (planned)
- [AI Opponents](docs/core-systems/ai-opponents.md) - Computer team management (planned)

### 🎨 Frontend & UI
- [State Management](docs/frontend/state-management.md) - Zustand stores guide
- [Component Library](docs/frontend/component-library.md) - React components
- [UI Design System](docs/frontend/ui-design-system.md) - Tailwind themes
- [Navigation](docs/frontend/routing-navigation.md) - App navigation

### 📊 Data & Configuration
- [Player Attributes](docs/data/player-attributes.md) - Attribute system (1-20 scale)
- [Statistical Calculations](docs/data/statistical-calculations.md) - Raw stats processing
- [Data Processing](docs/data/data-processing.md) - External processor guide
- [Game Balance](docs/data/game-balance.md) - Balance configuration

### 🛠️ Development
- [Setup Guide](docs/development/setup-guide.md) - Detailed setup instructions
- [Testing](docs/development/testing.md) - Testing strategies
- [Contributing](docs/development/contributing.md) - Development guidelines

### 📚 API Reference
- [Stores API](docs/api/stores-api.md) - Store methods and usage
- [Match Engine API](docs/api/match-engine-api.md) - Engine interfaces
- [Component Props](docs/api/component-props.md) - Component interfaces

## Current Development Status

### ✅ Completed (Phase 1-2)
- **Project Structure**: React 18 + Vite + Zustand state management
- **Player System**: Master database with 545 players, playstyle ratings, attribute system (1-20 scale)
- **Match Engine**: SimpleBallSimulator with 4-step calculation + 2D algebraic fielding (~50k+ balls/sec)
- **Match Engine Tuning**: Preliminary outcome probability tuning complete (see [`docs/core-systems/match-engine-tuning.md`])
- **Data Processing**: External cricket-data-processor module with GMA filtering
- **Squad Management**: Team selection and persistence
- **Configuration System**: All probabilities externalized to JSON config files
- **Documentation**: Organized structure with component-specific guides
- **Bowling Playstyle Revamp**: Pace/spin segregation with 8 specialized playstyles (4 pace + 4 spin)
- **T20 Tactics System**: 7-stage modifier chain with acceleration tiers, bowling plans, and DLS-based pacing (see [`docs/core-systems/tactics-system.md`])
- **Interactive Match System**: Fully playable command-line match with complete user control over team selection, tactics, and in-match decisions (see [`docs/development/interactive-match-system.md`])
- **League System**: Complete WPL simulation with 10 teams, double round-robin fixtures (90 matches), automated squad distribution, standings with NRR calculation, playoff structure, and championship determination
- **Playoff Simulation**: Full knockout stage with Qualifier 1, Eliminator, Qualifier 2, and Final matches
- **Player Leaderboards**: Comprehensive statistics tracking for batting (runs, average, SR, sixes), bowling (wickets, economy, average), and fielding (catches)
- **Match Display System**: Clean scorecard display with optional ball-by-ball commentary toggle for both interactive and league matches
- **Fielding System**: Complete fielding data capture and display - fielder names shown in dismissals (catches, stumpings, run outs) using compact "F. LastName" format

### 🔄 In Progress (Phase 2-3)
- **React UI Components**: Match screen, pre-match setup, tactical controls
- **Player Browser**: Search and filtering interface
- **Match Visualization**: UI wrapper for interactive match system
- **State Integration**: Full Zustand store integration

### 📋 Next Priorities (Phase 3-4)
- **WPL Auction System**: Player bidding and squad building
- **League UI**: Visual standings, fixture calendar, match results, leaderboards
- **AI Tactical Improvements**: Enhanced team selection and in-match decision making
- **Match UI**: Live ball-by-ball visualization with commentary
- **Historical Stats**: Season-by-season comparison and records

### 🔮 Future Enhancements
- **Field Position Library**: Exhaustive cricket fielding position names
- **Environmental Factors**: Weather, pitch conditions, pressure situations
- **Player Development**: Attribute growth and form fluctuations
- **User Field Tactics**: Manual field setting and in-match tactical changes

## Data Processing

Player data is processed using the external **cricket-data-processor** module (adjacent to this repository):
- **Input**: Raw T20 ball-by-ball CSV data
- **Processing**: GMA filtering, statistical calculations, attribute conversion
- **Output**: Enhanced player database JSON for Cricket Manager

See [`cricket-data-processor/README.md`] for processing pipeline details.

## Key Concepts

### Player Attributes (1-20 Scale)
- **Batting**: technique, timing, placement, range360, shot types
- **Bowling**: accuracy, speed, swing, variations, intelligence
- **Physical**: strength, speed, agility, fitness, stamina
- **Mental**: concentration, temperament, aggression, leadership
- **Condition**: form, fitness, fatigue, morale (0-100 scale)

### Match Engine
**SimpleBallSimulator**: 4-step algebraic calculation (Decision → Contact → Trajectory → 2D Fielding)

**Key Features**:
- All cricket dismissals: bowled, lbw, stumped, caught_behind, caught, run_out
- Shot types: missed, edged_behind, grounded, aerial
- 7-stage modifier chain: Playstyle → Tactics → Mentality → Matchups → Confidence → Energy → Context
- 24 playstyles (16 batting + 8 bowling) + 5 acceleration tiers + 14 bowling plans
- Performance: ~50,000+ balls/second

**Usage**: `import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js'`

**Documentation**:
- Technical details: [`docs/core-systems/match-engine.md`]
- Outcome tuning: [`docs/core-systems/match-engine-tuning.md`]
- Playstyle system: [`docs/core-systems/playstyle-system.md`]
- Tactics system: [`docs/core-systems/tactics-system.md`]

### World Premier League Teams
10 teams representing major cricket cities: Mumbai Thunders, London Lions, Melbourne Meteors, Cape Town Crusaders, Karachi Kings, Colombo Cobras, Dhaka Dynamites, Kingston Storm, Wellington Warriors, Kabul Eagles.

## Important Notes

- **Client-side only** - no backend required for MVP (LocalStorage persistence)
- **No Python dependencies** - data processing is external module
- **Configuration-driven** - all probabilities in `src/data/config/*.json` files
- **Performance optimized** - algebraic calculations, ~50k balls/sec
- **Deterministic** - seeded randomization for reproducible results

## Development Guidelines

### Configuration-First Approach
- **All probabilities** must be in `src/data/config/*.json` files
- **No hardcoded values** - import from config files
- **Test-driven tuning** - use `src/test/diagnosticBallTest.js` to validate outcomes

### Documentation Updates
After completing features:
1. Update "Current Development Status" in CLAUDE.md
2. Create/update component docs in `docs/` folder
3. Keep CLAUDE.md light - move details to specific doc files

### Testing
- **Unit tests**: Component-specific functionality
- **Diagnostic tests**: `src/test/diagnosticBallTest.js` for match engine outcomes
- **Integration tests**: Full match simulation in `src/test/detailedMatchTest.js`
- **Interactive tests**: Playable match in `src/test/interactiveMatchTest.js`
- **Demo tests**: Automated playthrough in `src/test/demoInteractiveMatch.js`
- **League tests**: Full season simulation in `src/test/leagueTest.js`

### Interactive Match System Quick Start
```bash
# Run automated demo (no user input required)
node src/test/demoInteractiveMatch.js

# Play full interactive match (you control everything)
node src/test/interactiveMatchTest.js
```

See [`docs/development/interactive-match-system.md`] for complete guide.

### League System Quick Start
```bash
# Run quick test (5 matches)
node src/test/leagueTest.js

# Run full season (90 matches)
node src/test/leagueTest.js --full

# Run N matches only
node src/test/leagueTest.js --matches=20

# Full season with playoffs and leaderboards
node src/test/leagueTest.js --full --playoffs --leaderboards

# Test playoffs with current standings
node src/test/leagueTest.js --matches=10 --force-playoffs --leaderboards
```

---

**Last Updated**: January 2025 - Fielding System Complete

For detailed information, see component-specific documentation in the `docs/` folder.