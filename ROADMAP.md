# Cricket Manager 25 - Development Roadmap

Current development status and future priorities.

## ✅ Completed Phases

### Phase 1-2: Core Engine (Complete)
- React 18 + Vite project structure
- Player database (545 players with playstyle ratings)
- Match Engine: SimpleBallSimulator with 4-step calculation
- 2D physics-based fielding system (~50k+ balls/sec)
- Match Engine tuning (outcome probability validation)
- Configuration system (all probabilities in JSON)
- Bowling playstyle revamp (8 playstyles: 4 pace + 4 spin)
- T20 Tactics System (7-stage modifier chain)
- Interactive Match System (CLI playable match)
- Fielding data capture (fielder names in dismissals)

### Phase 3: League & Auction (Complete)
- League System: 10 teams, 90 matches, double round-robin
- Playoff system (Qualifier 1, Eliminator, Qualifier 2, Final)
- Standings with NRR calculation
- Player leaderboards (batting, bowling, fielding)
- Match display with commentary toggle
- Auction System: Playstyle-based player bidding
  - Playstyle quota system (9 categories, 3,100 total rating)
  - Budget-to-gap multiplier for dynamic bidding
  - Fast mode and interactive mode
  - Deterministic AI bidding logic

### Phase 4: Frontend Foundation (Complete)
- Design System: Football Manager-inspired UI
  - Tailwind config (Cricket Green/Trophy Gold palette)
  - 14px base font, Lucide React icons
  - Compact component patterns
- Core UI Pages: Dashboard, League, Squad
- Layout System: Header, Sidebar, responsive wrapper
- Game Progression: GameController + GameEventModal
- Navigation: React Router integration
- UI Design System skill (`.claude/skills/ui-design-system.md`)

### Phase 5: Core UI Pages (Complete)
**Completed**:
- Navigation integration (React Router + GameEventModal)
- **Auction UI: Complete interactive bidding interface** ✅
  - Efficient bidding race logic
  - Real-time updates (price, timer, squads)
  - Player cards with playstyle ratings
  - Three tabs: Live Auction, Team Squads, Auction Log
  - State management with refs (prevent stale state)
  - **Squad integration fix**: Players now appear in Squad view after auction
  - **Enhanced Team Squads tab**: Role categorization with playstyle subtitles
  - **UI compression**: Reduced spacing and font sizes for FM aesthetic
- Match View UI: Basic live match interface
  - Score display and match controls
  - Three tabs: Live Match, Scorecard, Commentary
  - Play Ball, Skip Over, Auto-Simulate options
- **State Persistence System: Complete save/load functionality** ✅
  - LocalStorage integration with 10 save slots
  - SaveGameManager utility (100-200KB per save)
  - Save/Load UI components (modal + load screen)
  - Auction state persistence (auctionStore)
  - Smart navigation (resumes at correct screen)
  - Start Menu with Load Game, Player Browser, Credits
  - Custom save naming and metadata indexing

## 📋 Current Priorities (Phase 5 Continued)

### 1. Match View Enhancement
- [ ] Live ball-by-ball updates from MatchEngine
- [ ] Real-time score and wicket animations
- [ ] Ball outcome display (runs, wickets, boundaries)
- [ ] Partnership tracking

### 2. Scorecard Integration
- [ ] Detailed batting statistics (runs, balls, SR, 4s, 6s)
- [ ] Bowling statistics (overs, runs, wickets, economy)
- [ ] Fall of wickets display
- [ ] Extras breakdown

### 3. 2D Pitch Visualization
- [ ] Field positioning display (11 fielders)
- [ ] Ball trajectory animation
- [ ] Shot direction visualization
- [ ] Fielder movement paths

### 4. Additional Pages
- [ ] Transfers page (mid-season trading)
- [ ] Board page (objectives and targets)
- [ ] Pre-match setup (tactics, team selection)

## 🔮 Future Enhancements (Phase 6+)

### Advanced Features
- [ ] Extras system (detailed tracking and analysis)
- [ ] Field position library (comprehensive naming)
- [ ] Environmental factors (weather, pitch conditions)
- [ ] Player development (attribute growth, form)
- [ ] User field tactics (manual field setting)
- [ ] In-match tactical changes
- [ ] AI opponent personalities
- [ ] Career mode progression

### Performance & Quality
- [ ] Match replay system
- [ ] Statistics export (CSV, JSON)
- [ ] Performance profiling
- [ ] Unit test coverage
- [ ] E2E testing with Playwright

### Polish
- [ ] Sound effects and music
- [ ] Accessibility improvements
- [ ] Mobile responsive design
- [ ] Dark/light theme toggle
- [ ] User preferences system

## 📊 Development Metrics

- **Player Database**: 545 players
- **Match Engine Performance**: ~50,000+ balls/second
- **Playstyles**: 24 total (16 batting + 8 bowling)
- **Teams**: 10 WPL teams
- **League Matches**: 90 (double round-robin)
- **UI Pages**: 5 complete (Dashboard, League, Squad, Auction, Match)

## 🎯 Next 3 Immediate Steps

1. Add live ball-by-ball updates to Match View
2. Build detailed Scorecard display with batting/bowling stats
3. Implement 2D pitch visualization with field positions

---

**Last Updated**: January 2025
**Current Focus**: Phase 5 - Match View Enhancement & 2D Visualization
