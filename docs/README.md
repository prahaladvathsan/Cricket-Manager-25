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
- **[League System](core-systems/league-system.md)** - WPL structure and scheduling *(Coming Soon)*
- **[Auction System](core-systems/auction-system.md)** - Player trading mechanics *(Coming Soon)*
- **[AI Opponents](core-systems/ai-opponents.md)** - Computer team management *(Coming Soon)*

### 🎨 Frontend & UI
- **[State Management](frontend/state-management.md)** - Zustand stores guide with examples
- **[Component Library](frontend/component-library.md)** - React components *(Coming Soon)*
- **[UI Design System](frontend/ui-design-system.md)** - Tailwind themes *(Coming Soon)*
- **[Navigation](frontend/routing-navigation.md)** - App navigation *(Coming Soon)*

### 📊 Data & Configuration
- **[Player Attributes](data/player-attributes.md)** - Attribute system (1-20 scale)
- **[Statistical Calculations](data/statistical-calculations.md)** - Raw stats processing
- **[Data Processing](data/data-processing.md)** - External processor guide
- **[Game Balance](data/game-balance.md)** - Balance configuration *(Coming Soon)*

### 🛠️ Development
- **[Setup Guide](development/setup-guide.md)** - Detailed setup instructions
- **[Testing](development/testing.md)** - Testing strategies *(Coming Soon)*
- **[Contributing](development/contributing.md)** - Development guidelines *(Coming Soon)*

### 📚 API Reference
- **[Stores API](api/stores-api.md)** - Complete store methods and usage patterns
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

### For Data Processing
1. Read [Data Processing Guide](data/data-processing.md)
2. Understand [Player Attributes](data/player-attributes.md) system
3. Review [Statistical Calculations](data/statistical-calculations.md)

## Documentation Status

### ✅ Complete
- Architecture overview and data flow
- Match engine architecture
- Player system (attributes, conditions, development)
- State management guide with examples
- Complete stores API reference
- Data processing pipeline guide
- Development setup instructions

### 🔄 In Progress
- UI component library documentation
- Testing strategies guide
- Contributing guidelines

### 📋 Planned
- League and auction system documentation
- AI opponent system documentation
- Advanced development guides
- Deployment documentation

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

**Last Updated**: September 2024
**Version**: 1.0.0