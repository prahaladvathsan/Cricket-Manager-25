# Cricket Manager - World Premier League Simulation

A cricket management simulation game inspired by Football Manager, featuring the World Premier League (WPL) format with deep tactical gameplay and realistic player progression.

## Features

- ⚾ **Realistic T20 Match Simulation** - Ball-by-ball match engine with 4-step physics (Decision → Contact → Trajectory → 2D Fielding)
- 🎮 **Deep Tactical Control** - Acceleration tiers, bowling plans, field positioning, and in-match decision making
- 📊 **545 Real Players** - Comprehensive player database with playstyle-based ratings (16 batting + 8 bowling playstyles)
- 🏆 **Complete League System** - WPL with 10 teams, 90 matches, playoffs, and championship
- 💰 **Player Auction** - Season-start bidding with playstyle-based AI valuation
- 📈 **Player Development** - Attribute growth, form fluctuations, and performance tracking
- 🖥️ **Football Manager-Inspired UI** - Data-dense interface with dark theme (Cricket Green & Trophy Gold)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to start playing.

## Tech Stack

- **Frontend**: React 18 + Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Match Engine**: SimpleBallSimulator (~50,000+ balls/second)

## Documentation

- **[Complete Documentation](docs/README.md)** - Full system documentation index
- **[Setup Guide](docs/dev/setup-guide.md)** - Detailed installation and configuration
- **[Developer Guide](docs/dev/README.md)** - Development documentation and workflows
- **[Design System](docs/frontend/design-system.md)** - UI components and patterns

## Project Structure

```
src/
├── core/                    # Core game systems
│   ├── match-engine/       # Ball-by-ball simulation
│   └── game/               # Game progression logic
├── stores/                 # Zustand state management
├── components/             # React UI components
├── data/                   # Static game data and configurations
└── utils/                  # Utility functions
```

## Development Status

### ✅ Completed (Phase 1-5)
- ✅ Match Engine with 2D fielding physics
- ✅ Player system with 24 playstyles
- ✅ T20 Tactics system (7-stage modifier chain)
- ✅ League simulation (90 matches + playoffs)
- ✅ Player auction system
- ✅ Core UI pages (Dashboard, League, Squad, Auction, Match)
- ✅ Game progression system with event modals
- ✅ React Router navigation

### 🚧 In Progress (Phase 5 Continued)
- 🚧 State persistence (LocalStorage integration)
- 🚧 Match view enhancements (live updates, 2D pitch visualization)
- 🚧 Transfers page (mid-season trading)

### 🔮 Planned Features
- Player development and form system
- Environmental factors (weather, pitch conditions)
- User field tactics and manual positioning
- Career mode with multi-season progression

## World Premier League Teams

The WPL features 10 teams representing major cricket cities worldwide:

1. **Chennai Cobras** (India)
2. **London Lions** (England)
3. **Sydney Sharks** (Australia)
4. **Pretoria Pythons** (South Africa)
5. **Multan Markhors** (Pakistan)
6. **Colombo Crocodiles** (Sri Lanka)
7. **Dhaka Dolphins** (Bangladesh)
8. **Georgetown Jaguars** (West Indies)
9. **Auckland Orcas** (New Zealand)
10. **Kabul Kites** (Afghanistan)

## Testing

```bash
# Run match engine diagnostics
node src/test/diagnosticBallTest.js

# Run full match simulation
node src/test/detailedMatchTest.js

# Play interactive match (CLI)
node src/test/interactiveMatchTest.js

# Run league simulation
node src/test/leagueTest.js --full --playoffs --leaderboards

# Run auction simulation
node src/test/demoAuction.js
```

## Contributing

See [Development Guide](docs/dev/README.md) for development workflows, coding standards, and contribution guidelines.

## License

This project is for educational purposes. All player data is processed from publicly available cricket statistics.

---

**For AI Assistant Context**: See [CLAUDE.md](CLAUDE.md) for detailed project context and development guidelines.
