# Cricket Manager Documentation

## Overview

This documentation provides comprehensive guides for developing and understanding Cricket Manager, a cricket management simulation game built with React and Zustand.

## Documentation Structure

### 🏗️ Architecture & Design
- **[System Overview](architecture/system-overview.md)** - High-level architecture and design philosophy
- **[Data Flow](architecture/data-flow.md)** - How data moves through the application
- **[Design Patterns](architecture/design-patterns.md)** - Code conventions and patterns *(Coming Soon)*

### ⚙️ Core Systems
- **[Match Engine](core-systems/match-engine.md)** - Ball-by-ball simulation architecture
- **[Player System](core-systems/player-system.md)** - Player attributes, conditions, and development
- **[League System](core-systems/league-system.md)** - WPL structure, scheduling, and match progression
- **[Auction System](core-systems/auction-system.md)** - Player trading mechanics
- **[Calendar System](core-systems/calendar-system.md)** - Day-by-day progression and event scheduling
- **[Messaging System](core-systems/messaging-system.md)** - Inbox notifications and in-game communications
- **[News System](core-systems/news-system.md)** - News Dispatcher, block-based match reports, reporter personas, inline clickable entities
- **[AI Opponents](core-systems/ai-opponents.md)** - Computer team management *(Coming Soon)*

### 🎨 Frontend & UI
- **[State Management](frontend/state-management.md)** - Zustand stores guide with examples
- **[Component Library](components/)** - UI component documentation:
  - **[Match View](components/match-view.md)** - Live match interface
  - **[Squad View](components/squad-view.md)** - Team squad management with sortable table
  - **[Tactics Page](components/tactics-page.md)** - Full-page tactics configuration
  - **[Inbox Page](components/inbox-page.md)** - In-game messaging interface
  - **[League Calendar View](components/league-calendar-view.md)** - Fixtures calendar grid
  - **[Player Card Modal](components/player-card-modal.md)** - Player details modal
- **[UI Design System](frontend/ui-design-system.md)** - Tailwind themes *(Coming Soon)*
- **[Navigation](frontend/routing-navigation.md)** - App navigation *(Coming Soon)*

### 📊 Data & Configuration
- **[Player Attributes](data/player-attributes.md)** - Attribute system reference (1-20 scale)
- **[Configuration Guide](data/configuration-guide.md)** - Match engine config files

### ✨ Features
- **[Match Progression System](features/match-progression-system.md)** - Season flow with smart match routing
- **[Quick Simulation](features/quick-simulation.md)** - Background AI vs AI match simulation

### 🛠️ Development
- **[Setup Guide](development/setup-guide.md)** - Detailed setup instructions
- **[Testing](development/testing.md)** - Testing strategies *(Coming Soon)*
- **[Contributing](development/contributing.md)** - Development guidelines *(Coming Soon)*

### 📚 API Reference
- **[Stores API](api/stores-api.md)** - Complete store methods and usage patterns (gameStore v2, navigationStore, inboxStore)
- **[Rating Helper](api/rating-helper.md)** - Player rating utility functions
- **[Match Engine API](api/match-engine-api.md)** - Engine interfaces *(Coming Soon)*
- **[Component Props](api/component-props.md)** - Component interfaces *(Coming Soon)*

## Quick Navigation

### For New Developers
1. Start with [System Overview](architecture/system-overview.md)
2. Follow [Setup Guide](development/setup-guide.md)
3. Review [State Management](frontend/state-management.md)
4. Check [Stores API](api/stores-api.md) for implementation

### For Feature Development
1. Review relevant [Core Systems](core-systems/) documentation
2. Check [Data Flow](architecture/data-flow.md) patterns
3. Reference [API Documentation](api/) for methods
4. Follow patterns in [State Management](frontend/state-management.md)

### For Configuration
1. Review [Configuration Guide](data/configuration-guide.md)
2. Understand [Player Attributes](data/player-attributes.md) system
3. Check [Match Engine Tuning](core-systems/match-engine-tuning.md)

## Documentation Status

### ✅ Complete
- Architecture overview and data flow
- Match engine architecture and tuning guide
- Match progression system with smart routing
- Quick simulation for AI matches
- Interactive match view component
- League system with fixture progression
- Playstyle system with dynamic modifiers
- Player attribute reference
- Configuration file documentation
- State management guide with examples
- Complete stores API reference (gameStore v2, navigationStore, inboxStore, leagueStore)
- Development setup instructions
- Test script documentation
- Auction system documentation
- **UI Polish & Tactics Enhancement** (January 2025)
  - Squad view component with sortable/filterable table
  - Tactics page with validation flow
  - Rating helper API documentation
- **Calendar & Messaging Systems** (January 2025)
  - Calendar event scheduling and day progression
  - Inbox messaging system with 6 message types
  - Navigation history for back button
  - League fixtures calendar grid view
  - Player card modal component
- **News System & Home Dashboard Redesign** (May 2026)
  - NewsDispatcher pub/sub + inboxSubscriber bridge
  - Template-pool engine + block-based assembler for match reports
  - 9 deep cricket flags (milestone heartbreak, lone wolf, captain's innings, etc.)
  - Reporter persona pool (Bhogle, Kimber, Monga, Manjrekar, Bishop, Nicholas, Benaud, Naya Singh)
  - Inline clickable entity sentinels (`[[PLAYER:id|name]]`)
  - Importance scoring + user-team boost on the Home news carousel
  - Home dashboard rewrite — eyebrows replace card headers, marquee/data tiers, equal-height pairs
  - Standings Form column for every team; League page Form column added
  - Atomic standings update inside `recordResult` so news closing lines reflect post-match table
  - Thin Next Match card replacing the larger best-performers grid

### 🔄 In Progress
- UI component library documentation (additional components)
- Testing strategies guide
- Contributing guidelines

### 📋 Planned
- AI opponent system documentation
- Advanced development guides
- Deployment documentation
- 2D match visualization documentation

## Maintenance

This documentation is actively maintained. When adding new features or modifying existing systems:

1. **Update relevant component documentation**
2. **Add API references for new methods**
3. **Update CLAUDE.md if architecture changes**
4. **Include examples and usage patterns**

## Contributing to Documentation

- Follow the existing structure and format
- Include code examples for complex concepts
- Cross-reference related documentation
- Keep explanations clear and concise
- Update the central navigation in CLAUDE.md

---

**Last Updated**: May 2026
**Version**: 1.2.5