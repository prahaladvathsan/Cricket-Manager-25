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
- **Playstyle System**: Dynamic attribute modifiers based on match context (21 playstyles) [`docs/core-systems/playstyle-system.md`]
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
- [Match Engine](docs/core-systems/match-engine.md) - Ball-by-ball simulation
- [Player System](docs/core-systems/player-system.md) - Attributes and progression
- [Playstyle System](docs/core-systems/playstyle-system.md) - Dynamic attribute modifiers
- [League System](docs/core-systems/league-system.md) - WPL structure
- [Auction System](docs/core-systems/auction-system.md) - Player trading
- [AI Opponents](docs/core-systems/ai-opponents.md) - Computer team management

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
- **Project Structure**: Complete React + Vite setup with Zustand
- **Team Selection**: User team selection and persistence
- **Squad Management**: Comprehensive team management interface
- **Data Processing**: Advanced T20 statistics processing with GMA filtering
- **Match Engine**: SimpleBallSimulator with direct 4-step calculation
- **Strategic Selection Systems**: Intelligent bowler and batsman selection with event-driven architecture
- **Documentation**: Organized documentation structure
- **Codebase Cleanup**: Removed ~4,000 lines of duplicate code, modular data processing

### 🔄 In Progress (Phase 2)
- **Player Browser**: Search and filtering interface for player database
- **Match Simulation**: Complete match engine integration with UI
- **State Integration**: Full Zustand store integration across components

✅ Recently Completed (Playstyle System - Fully Tested & Integrated)
- **Playstyle System**: Complete implementation with 21 unique playstyles (16 batting + 9 bowling)
- **Dynamic Attribute Modifiers**: Context-based modifiers applied during match simulation
- **Fully Configurable**: All weightages, modifiers, and conditions externalized to JSON config files
- **PlaystyleCalculator**: Calculates 0-100 ratings for all playstyles based on player attributes
- **AttributeModifierSystem**: Applies playstyle modifiers based on match context (phase, wickets, run rate, etc.)
- **Match Engine Integration**: Seamless integration into SimpleBallSimulator with metadata tracking
- **Player Schema Extension**: Added playstyleRatings and primaryPlaystyle fields to player objects
- **PlayerStore Methods**: Calculate, update, and query playstyle data for all players
- **Full Match Testing**: All 1123 players tested with playstyle ratings and primary playstyle assignment
- **Comprehensive Documentation**: Complete guide with examples and customization instructions

✅ Previously Completed (Simplified Algebraic Physics System + Ultra-High Performance)
- **Algebraic Physics Engine**: Replaced complex simulations with direct mathematical formulas
- **Polar Coordinate System**: 9 fielders positioned using (r, θ) coordinates from striker
- **Fixed Launch Angle Physics**: 45° assumption with `bounce_distance = speed²/gravity` formula
- **Boundary Distance Cache**: Pre-calculated distances for all 360° from striker position
- **Direct Interception Formulas**: Algebraic fielder interception using `V*sin(θ) ≤ U` checks
- **Constant Speed Movement**: No deceleration or complex forces (gravity only for projectiles)
- **Angular Gap Direction Selection**: Grounded shots use angular gaps, aerial shots use distance separation
- **Ultra-High Performance**: Achieved ~50,000+ balls/second simulation speed
- **Simplified Configuration**: Updated physics-config.json for algebraic calculations

### 📋 Next Priorities (Phase 3-4)
- **WPL Auction System**: Player bidding and squad building
- **League Structure**: Season calendar and match scheduling
- **AI Opponents**: Computer team decision making
- **Advanced UI**: Match visualization and tactical interfaces

### 🔮 Future Match Engine Enhancements
- ✅ **COMPLETED** - Simplified algebraic physics system with maximum performance
- ✅ **COMPLETED** - Polar coordinate fielder positioning and direct interception formulas
- **Comprehensive Field Position Library**: Add exhaustive list of cricket fielding positions
- **Dynamic Conditions**: Re-introduce environmental factors (weather, pitch, pressure)
- **Complex Mentalities**: Multi-factor mentality determination
- **Player Development**: Attribute growth based on performance
- **Advanced Field Tactics**: User-controlled field setting and tactical changes

### 📝 Recent Updates (Documentation Reorganization)
- **Documentation Structure**: Organized docs by component area with clear hierarchy
- **Central Navigation**: CLAUDE.md streamlined as central guide with cross-references
- **Component Guides**: Detailed documentation for each major system
- **API References**: Complete store methods and usage patterns
- **Developer Guides**: Setup instructions, patterns, and best practices

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
**SimpleBallSimulator**: 4-step calculation (Decision → Contact → Trajectory → Algebraic Fielding) with direct mathematical formulas
**Import**: `import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js'`
**Performance**: ~50,000+ balls/second simulation speed

See [`docs/core-systems/match-engine.md`] for detailed technical implementation.

### World Premier League Teams
10 teams representing major cricket cities: Mumbai Thunders, London Lions, Melbourne Meteors, Cape Town Crusaders, Karachi Kings, Colombo Cobras, Dhaka Dynamites, Kingston Storm, Wellington Warriors, Kabul Eagles.

## Important Notes

- **No Python dependencies** in main repository (data processing is external)
- **Client-side only** - no backend required for MVP
- **Deterministic simulation** with seeded randomization
- **Extensible architecture** for future feature additions
- **Realistic balance** between simulation depth and performance

## Documentation Maintenance Guidelines

### For Claude Code Instances

**IMPORTANT**: After completing any significant task or feature implementation, always update relevant documentation:

1. **Update CLAUDE.md**:
   - Add completed features to "Current Development Status"
   - Update roadmap priorities
   - Add new component references if created

2. **Component Documentation**:
   - Create/update docs for new components in appropriate folder
   - Update API documentation for new store methods or props
   - Add examples and usage patterns

3. **Cross-References**:
   - Update links between related documentation
   - Ensure CLAUDE.md navigation index is current
   - Verify all documentation links are valid

### Documentation Structure Rules

- **CLAUDE.md**: Central navigation hub only (~150 lines max)
- **Component Docs**: Detailed guides in organized folders
- **API Docs**: Method signatures, parameters, examples
- **Examples**: Code snippets for common patterns

### Required Updates After Task Completion

1. **New Features**: Create component documentation
2. **API Changes**: Update stores-api.md or match-engine-api.md
3. **Architecture Changes**: Update system-overview.md
4. **Completed Milestones**: Update development status in CLAUDE.md

### Quick Documentation Commands

```bash
# Find broken documentation links
grep -r "docs/" CLAUDE.md docs/ | grep -E "\[.*\]\(.*\.md\)"

# Update last modified date
echo "Last updated: $(date)" >> docs/README.md
```

---

**For detailed information on any component, see the specific documentation linked above.**
- make sure all the probability values and thresholds are all not hardcoded in any file and are imported from files in the config folder