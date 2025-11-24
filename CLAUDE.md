# CLAUDE.md

Project-specific guidance for Claude Code when working with Cricket Manager 25.

## Quick Commands

```bash
# Development
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run lint:fix     # Fix ESLint issues

# Testing
node src/test/demoInteractiveMatch.js                      # Run demo match
node src/test/leagueTest.js --full --playoffs              # Run full season
node src/test/diagnosticBallTest.js                        # Test match engine outcomes
```

## Project Overview

Cricket Manager is a T20 cricket management simulation game (Football Manager for cricket) built with React 18. Features:
- **World Premier League**: Fictional 10-team T20 league (Mumbai, London, Melbourne, etc.)
- **Ball-by-ball simulation**: ~50k+ balls/second with physics-based fielding
- **545 players**: Real-world stats converted to 1-20 attribute scale
- **Deep tactics**: 24 playstyles, 5 acceleration tiers, 14 bowling plans
- **Current phase**: Frontend UI development (Phase 5)

## Tech Stack

- **Frontend**: React 18 + Vite + React Router + Tailwind CSS + Lucide React icons
- **State**: Zustand stores
- **Persistence**: LocalStorage (no backend)
- **Design**: Football Manager-inspired data-dense UI (Cricket Green #2D5F3F, Trophy Gold #D4AF37, 14px base font)
- **Language**: JavaScript with JSDoc (no TypeScript)

## Architecture Overview

```
src/
├── core/
│   └── match-engine/       # SimpleBallSimulator (4-step: Decision → Contact → Trajectory → 2D Fielding)
├── stores/                 # Zustand state management
├── components/             # React UI (Dashboard, League, Squad, Match, Auction)
├── data/
│   ├── config/            # JSON probability configs (NEVER hardcode probabilities)
│   └── players/           # 545-player database
└── test/                  # CLI test scripts
```

**Core Systems**:
- **Match Engine**: `SimpleBallSimulator` - 7-stage modifier chain (Playstyle → Tactics → Mentality → Matchups → Confidence → Energy → Context)
- **Playstyle System**: 24 dynamic modifiers (16 batting + 8 bowling)
- **League System**: 10 teams, 90 matches, playoffs with NRR calculation
- **Auction System**: Playstyle-based player bidding with quota system

See `docs/architecture/system-overview.md` for detailed architecture.

## Development Documentation Structure

**Three-folder system** (`docs/dev/`):
- **`/active`** - Features currently in development
- **`/planned`** - Features planned for future development
- **`/completed`** - Completed features and reference documentation

### Active Development Tracking (Anti-Amnesia System)

**For ALL non-trivial features (>30 minutes or multiple files)**:

1. **Create tracking folder**: `docs/dev/active/[feature-name]/`
2. **Use three-file system**:
   - `plan.md` - Approved implementation strategy (single source of truth)
   - `context.md` - Living context: files changed, decisions made, current state (update continuously)
   - `tasks.md` - Granular checklist with completion tracking

3. **Update before context runs low** (>150k tokens):
   - Update `context.md` with current state
   - Update `tasks.md` with remaining work
   - Document next 3 immediate steps

4. **On completion**: Move to `docs/dev/completed/[feature-name]/`

5. **For future features**: Create plan in `docs/dev/planned/[feature-name]/`

**Before starting ANY task**:
- Check `docs/dev/active/` for existing work
- Check `docs/dev/planned/` for approved plans
- Read all three files before proceeding

See `docs/dev/active/README.md` for templates and `docs/dev/completed/development-workflow.md` for full workflow.

## Repo-Specific Rules

### Configuration-Driven Development
- **ALL probabilities** must be in `src/data/config/*.json` files
- **NEVER hardcode probabilities** in code - import from configs
- Test outcomes with `node src/test/diagnosticBallTest.js`

### Game Progression Standardization (CRITICAL)

The game has **two progression modes** that must produce identical outcomes:
1. **Normal UI Mode**: User manually clicks "Continue" (components/layout/Header.jsx)
2. **Sim-to-Date Mode**: Automated simulation via calendar (core/simulation/SimulationEngine.js)

**MANDATORY: When modifying automated game processes, update BOTH modes:**

**Automated processes** (must be identical):
- Match simulation (`quickSimMatch()`)
- Financial processing (`processMatchFinancials()`)
- League standings updates (`recordResult()`, `recalculateStandings()`)
- Calendar event scheduling (matches, offseason, transfers, season end)
- Inbox message generation (welcome, expectations, tutorial, summaries)
- Playoff triggering and fixture population

**UI-specific logic** (intentionally different):
- User match handling (Normal: play/quick-sim choice, Sim: auto quick-sim)
- Result modals (Normal: shows modals, Sim: no modals)
- Auction flow (Normal: playthrough with skip, Sim: auto-complete)

**Files to update together:**
- `src/components/layout/Header.jsx` (Normal UI continue button logic)
- `src/core/simulation/SimulationEngine.js` (Sim-to-date logic)
- Any shared store actions (gameStore, leagueStore, financeStore)

**Testing requirement**: Any change to game flow must be verified in both modes to ensure identical outcomes.

### Clickable Entity Components (CRITICAL)

**NEVER hardcode `player.name` or `team.name`. ALWAYS use:**
- `<PlayerName playerId={id} />` - Opens player detail modal
- `<TeamName teamId={id} />` - Opens team roster modal

This ensures consistent clickable behavior across all screens (Football Manager pattern).

### Data Processing
- Player database processing is **external** (`cricket-data-processor` module adjacent to this repo)
- Do NOT modify player data pipeline in this repo
- See `cricket-data-processor/README.md` for data processing

### Key Cricket Concepts
- **Player attributes**: 1-20 scale (technique, timing, accuracy, speed, etc.)
- **Playstyle ratings**: 0-100 scale for 24 playstyles
- **Match Engine**: 4-step algebraic calculation (not Monte Carlo)
  - Decision: Shot selection based on attributes
  - Contact: Quality of bat-ball contact
  - Trajectory: Ball flight path (2D physics)
  - Fielding: 2D algebraic catch/boundary logic
- **WPL Teams**: Chennai Cobras, London Lions, Sydney Sharks, Pretoria Pythons, Multan Markhors, Colombo Crocodiles, Dhaka Dolphins, Georgetown Jaguars, Auckland Orcas, Kabul Kites

### UI Design Patterns
- **Football Manager aesthetic**: Data-dense tables, compact cards, 14px base font
- **Color palette**: Cricket Green (#2D5F3F), Trophy Gold (#D4AF37), dark theme
- **Icons**: Lucide React only
- **Spacing**: Compact (p-2, p-3, gap-2) for professional look
- See `docs/frontend/design-system.md` for complete specs

### Browser Compatibility
- **No Node.js imports in browser code** (e.g., `fs`, `path`)
- PlaystyleCalculator.js already fixed for browser use
- All game logic must run client-side

## Git Workflow (CRITICAL)

**Branch Strategy**:
- **`main` branch**: Production-ready code ONLY - deployed to https://cricket-manager.com/
- **`testing` branch**: All active development happens here

**Development Workflow**:
1. **ALWAYS work on `testing` branch** - This is the default development branch
2. **ALWAYS push to `testing` branch** - Never push directly to main
3. **ALWAYS pull from `testing` branch** - Keep your local testing branch up to date
4. **Merge to main ONLY when**:
   - Features are stable and thoroughly tested
   - User has given explicit approval
   - No known bugs or issues exist

**Commands**:
```bash
# Start work (ensure you're on testing)
git checkout testing
git pull origin testing

# During development
git add .
git commit -m "Your commit message"
git push origin testing

# When ready to deploy (user approval required)
git checkout main
git merge testing
git push origin main
git checkout testing  # Switch back to testing
```

**NEVER**:
- Push untested code to main
- Merge to main without user approval
- Work directly on main branch
- Push directly to main

**Production Deployment**: main branch auto-deploys to cricket-manager.com via GitHub Actions.

## Documentation

**Quick Links**:
- [Developer Guide](docs/dev/README.md) - Complete dev documentation index
- [Roadmap & Status](ROADMAP.md) - Current development status and next priorities
- [Design System](docs/frontend/design-system.md) - UI components and patterns
- [Integration Patterns](docs/frontend/integration-patterns.md) - Store integration patterns
- [Active Tracking Templates](docs/dev/active/README.md) - Task management templates

**Full documentation index**: See `docs/README.md` for all architecture and core systems docs

## Testing Quick Reference

```bash
# Match Engine
node src/test/diagnosticBallTest.js              # Test outcome probabilities
node src/test/detailedMatchTest.js               # Full match simulation
node src/test/demoInteractiveMatch.js            # Automated demo match

# League System
node src/test/leagueTest.js                      # Quick test (5 matches)
node src/test/leagueTest.js --full               # Full season (90 matches)
node src/test/leagueTest.js --full --playoffs    # Season + playoffs

# Auction System
node src/test/demoAuction.js                     # Test auction logic
```

See `docs/dev/testing.md` for testing guidelines.

## Important Notes

- **Client-side only** - No backend, uses LocalStorage
- **No Python dependencies** - Data processing is separate
- **Performance critical** - Match engine must maintain ~50k+ balls/second
- **Deterministic** - Seeded randomization for reproducible results
- **Git workflow** - `testing` branch for all development, `main` for production only (see Git Workflow section)

---

**Current Phase**: Phase 5 - Frontend UI (Match View, State Persistence, 2D Visualization)
**Last Updated**: January 2025

For detailed status and roadmap, see `ROADMAP.md`.
