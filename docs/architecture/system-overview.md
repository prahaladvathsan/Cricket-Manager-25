# System Overview

## Architecture Philosophy

Cricket Manager follows a modular, client-side architecture with clear separation of concerns:

- **Frontend-Only**: No backend dependencies, all logic runs in browser
- **Data-Driven**: Configuration and balance via JSON files
- **Extensible**: Plugin architecture for future enhancements
- **Performance-First**: Efficient simulation and state management

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cricket Manager                     │
├─────────────────────────────────────────────────────────┤
│  React UI Layer                                        │
│  ├── Layout Components (Header, Sidebar, Navigation)   │
│  ├── Feature Components (Squad, Match, Player)         │
│  └── Shared Components (Modals, Forms, Tables)         │
├─────────────────────────────────────────────────────────┤
│  State Management (Zustand)                            │
│  ├── gameStore     (Season, Calendar, Settings)        │
│  ├── teamStore     (All Teams, Squad Management)       │
│  ├── playerStore   (Player Database, Attributes)       │
│  ├── matchStore    (Active Match, Ball-by-Ball)        │
│  └── uiStore       (Navigation, Modals, Preferences)   │
├─────────────────────────────────────────────────────────┤
│  Core Game Systems                                     │
│  ├── Match Engine  (Ball-by-ball Simulation)          │
│  ├── Player System (Attributes, Development)          │
│  ├── League System (WPL Structure, Scheduling)        │
│  ├── Auction System (Player Trading)                  │
│  └── AI Opponents  (Computer Team Management)         │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                            │
│  ├── Static Data   (Teams, Stadiums, Rules)           │
│  ├── Player DB     (Enhanced Attributes Database)     │
│  ├── Config Files  (Balance, Algebraic Physics, Fielding) │
│  └── LocalStorage  (Game Saves, User Preferences)     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────┐
    │          External Data Processor               │
    │  ├── Raw T20 CSV Data Processing               │
    │  ├── GMA Statistical Filtering                 │
    │  ├── Attribute Conversion (1-20 scale)         │
    │  └── Output: Enhanced Player Database          │
    └─────────────────────────────────────────────────┘
```

## System Boundaries

### Core Game (This Repository)
- **Purpose**: Cricket management simulation game
- **Scope**: UI, game logic, match simulation, state management
- **Dependencies**: React, Zustand, Tailwind CSS
- **Data**: Processed player database (JSON), static game data

### External Data Processor
- **Purpose**: Convert raw cricket statistics to game-ready data
- **Scope**: Statistical analysis, attribute conversion, data filtering
- **Dependencies**: Python, pandas, numpy, scipy
- **Data**: Raw T20 ball-by-ball CSV, outputs enhanced player database

## Core Systems Deep Dive

### Match Engine: Independent Probability System + 2D Physics Simulation

The match engine combines sophisticated independent probability mechanics with advanced 2D physics-based fielding simulation:

#### Decision Phase (0-2 points each)
- **Independent Checks**: Each attribute contributes independently
- **Bowling**: `intelligence/20` + `variations/20` probability checks
- **Batting**: `judgment/20` + `shotSelection/20` probability checks
- **Realistic Variance**: Eliminates unrealistic attribute stacking

#### Contact Quality System (-97 to +97)
- **Raw Calculation**: `(timing + footwork + technique + d40) - (accuracy + swing + speed + d40)`
- **D40 Variance**: Adds realistic momentary factors and luck
- **Speed Integration**: Contact Quality drives shot speed (20-120 mph)
- **Wicket Probability**: Contact Quality affects missed ball wicket chances

#### Execution Phase (0-3 points each)
- **Bowling Execution**: Independent checks for accuracy, swing, speed/turn
- **Batting Execution**: Independent checks for timing, footwork, technique
- **Probability Adjustments**: Execution scores modify base contact probabilities
- **Realistic Balance**: Higher skill = higher success probability, but not guaranteed

#### 2D Physics-Based Fielding System
- **Field Positioning**: 9 fielders in formation-based 2D coordinates (attacking/neutral/defensive)
- **Ball Trajectory Physics**: Simplified 2D movement with speed-dependent bounce points for aerial shots
- **Fielder Interception Analysis**: Real-time analysis of all 9 fielders for ball interception capability
- **Attribute-Driven Direction Selection**:
  - Roll 1-{range360} for direction options
  - Generate n random directions, evaluate expected shot distance for each
  - Use placement attribute to choose best vs 2nd best direction
- **Running Decision System**: Combined batsman judgment vs fielding time with error probability
- **Physics Integration**: Replaces probability tables with real-time 2D simulation

## Component Interaction Patterns

### Data Flow
1. **User Actions** → UI Components
2. **UI Components** → Zustand Store Actions
3. **Store Actions** → Core Game Systems
4. **Game Systems** → State Updates
5. **State Updates** → UI Re-rendering

### Match Simulation Flow (Enhanced with 2D Physics)
1. **Match Setup** → MatchEngine initialization with field formation selection
2. **Field Setup** → 9 fielders positioned in 2D coordinates based on formation
3. **Ball-by-Ball Loop** → SimpleBallSimulator (4-step calculation with 2D physics integration)
4. **Decision & Contact** → Independent probability checks + Contact Quality calculation
5. **Trajectory & Direction** → Attribute-driven direction selection using 2D fielder analysis
6. **2D Fielding Simulation** → Real-time interception analysis, catching, and running decisions
7. **Ball Outcome** → Enhanced metadata with 2D simulation data and Contact Quality
8. **UI Updates** → Real-time match display with 2D fielding information

### State Management Pattern
- **Single Source of Truth**: Zustand stores
- **Reactive Updates**: Components subscribe to relevant store slices
- **Action-Based**: All state changes through store actions
- **Persistence**: Auto-save to localStorage

## Key Design Decisions

### Client-Side Architecture
**Decision**: No backend, all processing in browser
**Rationale**: Simplifies deployment, reduces complexity, faster iteration
**Trade-offs**: Limited by browser resources, no real-time multiplayer

### Zustand for State Management
**Decision**: Zustand over Redux or Context
**Rationale**: Simpler API, better TypeScript support, smaller bundle
**Trade-offs**: Less ecosystem, newer library

### Advanced Match Engine with 2D Physics + Independent Probability System
**Decision**: 2D physics-based fielding simulation + Independent probability checks + Contact Quality system
**Rationale**: Realistic cricket physics simulation, eliminates probability table dependency, attribute-driven gameplay
**Trade-offs**: Increased complexity, more configuration parameters, requires performance optimization

### External Data Processing
**Decision**: Separate Python module for data processing
**Rationale**: Specialized tools for statistics, keeps main repo clean
**Trade-offs**: Additional setup step, requires Python environment

## Performance Considerations

### Match Simulation
- **Exceptional Performance**: 2D simulation achieves ~25,000 balls/second processing speed
- **Efficient 2D Algorithms**: Optimized fielder interception analysis and trajectory calculations
- **Independent Probability Checks**: O(1) probability lookups with attribute-based success rates
- **Contact Quality System**: Fast d40 variance calculations with realistic speed integration
- **2D Physics Integration**: Simplified point-object physics with minimal computational overhead
- **Minimal State**: Essential match data + Contact Quality + 2D simulation metadata
- **No Artificial Delays**: Performance bottlenecks from timing delays removed

### State Management
- **Selective Updates**: Components subscribe to specific store slices
- **Memoization**: React.memo for expensive components
- **Lazy Loading**: Load player data on demand

### Bundle Size
- **Tree Shaking**: Only import used utilities
- **Code Splitting**: Route-based component loading
- **Optimized Assets**: Compressed images, minimal icons

## Scalability Strategy

### Horizontal Scaling
- **Feature Modules**: Independent system development
- **Plugin Architecture**: Third-party extensions
- **Configuration-Driven**: JSON-based game balance

### Vertical Scaling
- **Web Workers**: Heavy calculations off main thread
- **IndexedDB**: Large dataset storage
- **Service Workers**: Offline functionality

## Security Considerations

### Client-Side Security
- **No Sensitive Data**: All data is game-related
- **Input Validation**: User input sanitization
- **Safe Rendering**: Prevent XSS in dynamic content

### Data Integrity
- **Save Game Validation**: Prevent corrupted saves
- **Deterministic Simulation**: Reproducible match results
- **Version Compatibility**: Handle save format changes

## Future Architecture Evolution

### Planned Enhancements
- **Web Workers**: Match simulation in background
- **IndexedDB**: Large player database storage
- **PWA Features**: Offline play, app-like experience
- **Plugin System**: Community extensions

### Migration Paths
- **Backend Integration**: Optional server for multiplayer
- **Real-time Features**: WebSocket for live matches
- **Cloud Saves**: User account integration