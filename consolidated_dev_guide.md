# Cricket Manager - Consolidated Development Guide

## Project Overview
A cricket management simulation game inspired by Football Manager, focusing on the World Premier League (WPL) format with deep tactical gameplay and realistic player progression systems.

## Technical Stack & Architecture

### Core Technologies
- **Frontend Framework:** React 18 with Vite
- **State Management:** Zustand
- **Styling:** Tailwind CSS for fluid, responsive UI
- **Data Persistence:** LocalStorage (MVP) → IndexedDB (Phase 2)
- **Build Tool:** Vite
- **Language:** JavaScript with JSDoc type annotations

### Architecture Pattern
- Single Page Application (SPA)
- Client-side only (no backend for MVP)
- Modular feature-based structure
- Deterministic match engine with seeded randomization

## Project Structure

```
cricket-manager/
├── docs/
│   ├── ARCHITECTURE.md          # System design overview
│   ├── DATA_MODELS.md           # All data structures
│   ├── MATCH_ENGINE.md          # Match simulation logic
│   ├── AI_SYSTEMS.md            # AI opponent behavior
│   └── UI_PATTERNS.md           # UI/UX guidelines
├── src/
│   ├── core/
│   │   ├── match-engine/
│   │   │   ├── MatchEngine.js
│   │   │   ├── BattingSimulator.js
│   │   │   ├── BowlingSimulator.js
│   │   │   ├── Commentary.js
│   │   │   └── README.md
│   │   ├── player-system/
│   │   │   ├── PlayerAttributes.js
│   │   │   ├── PlayerDevelopment.js
│   │   │   ├── FormCalculator.js
│   │   │   └── README.md
│   │   ├── league-system/
│   │   │   ├── WPLStructure.js
│   │   │   ├── ScheduleGenerator.js
│   │   │   ├── StandingsCalculator.js
│   │   │   └── README.md
│   │   ├── auction-system/
│   │   │   ├── AuctionEngine.js
│   │   │   ├── AuctionAI.js
│   │   │   ├── SalaryCapManager.js
│   │   │   └── README.md
│   │   └── ai-opponents/
│   │       ├── TacticalAI.js
│   │       ├── StrategicAI.js
│   │       └── README.md
│   ├── data/
│   │   ├── players/
│   │   │   └── ipl-players-2024.json
│   │   ├── teams/
│   │   │   └── ipl-teams.json
│   │   ├── stadiums/
│   │   │   └── venues.json
│   │   └── config/
│   │       ├── game-rules.json
│   │       └── attribute-ranges.json
│   ├── stores/
│   │   ├── gameStore.js         # Season, calendar, current state
│   │   ├── teamStore.js         # All teams and rosters
│   │   ├── playerStore.js       # All players and attributes
│   │   ├── matchStore.js        # Active match state
│   │   └── uiStore.js           # UI state, preferences
│   ├── components/
│   │   ├── layout/
│   │   ├── match/
│   │   ├── team/
│   │   ├── player/
│   │   └── shared/
│   ├── utils/
│   │   ├── random.js            # Seeded RNG
│   │   ├── calculations.js      # Stat calculations
│   │   └── storage.js           # Save/load functionality
│   └── App.jsx
└── public/
```

## Complete Data Models

### Player Model (Definitive Version)
```javascript
/**
 * @typedef {Object} Player
 * @property {string} id - UUID-based unique identifier (e.g., "p_12a3b4c5-d6e7-f8g9-h0i1-j2k3l4m5n6o7")
 * @property {string} name - Display name
 * @property {string} fullName - Full legal name (for name tweaking failsafe)
 * @property {number} age - Current age in years
 * @property {string} nationality - ISO country code (e.g., "IND", "AUS", "ENG")
 * @property {string} role - "batsman" | "bowler" | "all-rounder" | "wicket-keeper"
 * @property {string} battingHand - "right" | "left"
 * @property {string} bowlingHand - "right" | "left" | null (for non-bowlers)
 * @property {string} bowlingType - "fast" | "fast-medium" | "medium" | "off-break" | "leg-break" | "left-arm-orthodox" | "chinaman" | null
 * @property {string[]} teams - Array of team IDs player has been part of (historical)
 * @property {string} currentTeam - Current team ID or null if unassigned
 * @property {PlayerAttributes} attributes
 * @property {PlayerStats} careerStats
 * @property {PlayerStats} seasonStats
 * @property {PlayerCondition} condition
 * @property {Contract} contract
 */
```

### Player Attributes System (1-20 Scale)
```javascript
/**
 * @typedef {Object} PlayerAttributes
 * @property {BattingAttributes} batting
 * @property {BowlingAttributes} bowling
 * @property {PhysicalAttributes} physical
 * @property {FieldingAttributes} fielding
 * @property {MentalAttributes} mental
 */

/**
 * @typedef {Object} BattingAttributes
 * @property {number} technique - 1-20, fundamental batting skill, foundation for consistency
 * @property {number} timing - 1-20, ability to meet ball at optimal moment
 * @property {number} footwork - 1-20, movement to get into position, affects vs spin/pace
 * @property {number} placement - 1-20, ability to find gaps in field
 * @property {number} range360 - 1-20, ability to score all around wicket (works with placement)
 * @property {number} defensiveShots - 1-20, proficiency in defensive strokes
 * @property {number} neutralShots - 1-20, proficiency in rotating strike, singles
 * @property {number} attackingShots - 1-20, proficiency in boundary-hitting shots
 * @property {number} vsPace - 1-20, effectiveness against fast bowling
 * @property {number} vsSpin - 1-20, effectiveness against spin bowling
 */

/**
 * @typedef {Object} BowlingAttributes
 * @property {number} accuracy - 1-20, line and length consistency (requires concentration)
 * @property {number} bowlingSpeed - 1-20, pace of delivery (for all bowler types)
 * @property {number} swing - 1-20, ability to move ball through air
 * @property {number} turn - 1-20, seam/spin deviation off pitch
 * @property {number} variations - 1-20, different deliveries available
 * @property {number} intelligence - 1-20, tactical bowling awareness, field setting understanding
 * @property {number} defensiveBowling - 1-20, containing runs, tight lines
 * @property {number} neutralBowling - 1-20, building pressure, probing lines
 * @property {number} attackingBowling - 1-20, wicket-taking intent and execution
 */

/**
 * @typedef {Object} PhysicalAttributes
 * @property {number} strength - 1-20, raw physical power (base for batting power, throw power)
 * @property {number} speed - 1-20, running pace (between wickets, fielding coverage)
 * @property {number} agility - 1-20, quick movement changes (base for reflexes, footwork, range360)
 * @property {number} maxFitness - 1-20, peak physical condition ceiling
 * @property {number} endurance - 1-20, ability to maintain performance over time
 * @property {number} stamina - 1-20, energy reserves for sustained effort
 */

/**
 * @typedef {Object} FieldingAttributes
 * @property {number} catching - 1-20, general catching ability
 * @property {number} reflexes - 1-20, reaction time for close catches, sharp chances
 * @property {number} groundFielding - 1-20, stopping and gathering ground balls
 * @property {number} throwPower - 1-20, strength of throw (derived partially from strength)
 * @property {number} throwAccuracy - 1-20, precision of throw to target
 * @property {WicketKeepingAttributes} wicketkeeping - Only for wicket-keepers
 */

/**
 * @typedef {Object} WicketKeepingAttributes
 * @property {number} keeping - 1-20, general wicket-keeping skill
 * @property {number} collecting - 1-20, gathering deliveries cleanly
 * @property {number} stumping - 1-20, stumping technique and speed
 */

/**
 * @typedef {Object} MentalAttributes
 * @property {number} concentration - 1-20, sustained focus (affects accuracy, consistency)
 * @property {number} temperament - 1-20, pressure handling under stress
 * @property {number} aggression - 1-20, natural attacking instinct
 * @property {number} judgement - 1-20, decision-making in match situations
 * @property {number} leadership - 1-20, influence on team and match situations
 */
```

### Player Condition System
```javascript
/**
 * @typedef {Object} PlayerCondition
 * @property {number} form - 0-100, recent performance trend
 * @property {number} fitness - 0-100, physical readiness
 * @property {number} fatigue - 0-100, accumulated fatigue across matches
 * @property {number} morale - 0-100, mental state
 * @property {string} injury - null | "minor" | "moderate" | "severe"
 */

/**
 * @typedef {Object} InMatchCondition
 * @property {number} energy - 0-100, current energy level in match (starts at stamina value)
 * @property {number} confidence - 0-100, current confidence level in match
 * @property {boolean} injuryRisk - true if fatigue >= fitness
 */
```

### Team Model
```javascript
/**
 * @typedef {Object} Team
 * @property {string} id - Unique identifier (e.g., "t_rcb")
 * @property {string} name - Team name
 * @property {string} shortName - 3-letter abbreviation
 * @property {string} homeVenue - Stadium ID
 * @property {string[]} playerIds - Current squad
 * @property {string} captainId - Captain player ID
 * @property {string} coachName - Head coach
 * @property {TeamFinances} finances
 * @property {TeamColors} colors
 */

/**
 * @typedef {Object} TeamFinances
 * @property {number} salaryCap - Total salary cap (e.g., 90 crores)
 * @property {number} usedCap - Current salary commitment
 * @property {number} remainingBudget - Available for auction
 */
```

### Match State Management
```javascript
/**
 * @typedef {Object} MatchState
 * @property {string} matchId - Unique match identifier
 * @property {MatchPhase} phase - Current phase of match
 * @property {InningsState} currentInnings - Active innings state
 * @property {MatchConditions} conditions - Venue, weather, pitch
 * @property {MatchContext} context - Situation awareness
 * @property {BallByBallLog} ballLog - Complete ball history
 * @property {Commentary} commentary - Generated commentary
 */

/**
 * @typedef {Object} InningsState
 * @property {string} battingTeam - Team ID
 * @property {string} bowlingTeam - Team ID
 * @property {number} score - Current runs
 * @property {number} wickets - Wickets lost
 * @property {number} ballsFaced - Total balls bowled
 * @property {string} striker - Current striker player ID
 * @property {string} nonStriker - Current non-striker player ID
 * @property {string} bowler - Current bowler player ID
 * @property {FieldSetting} fieldSetting - Current field placement
 */

/**
 * @typedef {Object} MatchContext
 * @property {number} requiredRunRate - For chasing team
 * @property {number} currentRunRate - Current scoring rate
 * @property {number} pressureIndex - 0-100 pressure level
 * @property {string} matchSituation - "building" | "accelerating" | "death" | "chase"
 * @property {number} ballsRemaining - Balls left in innings
 */
```

### Tactical System
```javascript
/**
 * @typedef {Object} MatchTactics
 * @property {BattingTactics} batting
 * @property {BowlingTactics} bowling
 */

/**
 * @typedef {Object} BattingTactics
 * @property {string[]} battingOrder - Array of player IDs in order
 * @property {Object.<string, BatsmanInstruction>} batsmanInstructions
 */

/**
 * @typedef {Object} BatsmanInstruction
 * @property {string} mentality - "defensive" | "neutral" | "aggressive"
 * @property {number} targetStrikeRate - Suggested SR (optional)
 * @property {string} preferredShots - "ground" | "aerial" | "mixed"
 * @property {string} pacingStrategy - "steady" | "accelerate" | "boundaries"
 */

/**
 * @typedef {Object} BowlingTactics
 * @property {string[]} bowlingRotation - Preferred bowling order
 * @property {Object.<string, BowlerInstruction>} bowlerInstructions
 * @property {string} fieldSetting - "aggressive" | "neutral" | "defensive"
 */

/**
 * @typedef {Object} BowlerInstruction
 * @property {string} mentality - "wicket-taking" | "neutral" | "run-control"
 * @property {string} lineStrategy - "stumps" | "outside-off" | "bodyline"
 * @property {string} lengthStrategy - "full" | "good" | "short" | "mixed"
 * @property {number} variationFrequency - 0-100, how often to bowl variations
 */
```

## Match Engine Framework

### Core Ball Event Decision Points

#### 1. Contact Quality (3 branches)
Determines the fundamental interaction between bat and ball.

**Function of:**
- Batsman shot execution vs Bowler delivery execution
- [PLACEHOLDER: Exact calculation formula]
- Pressure and fatigue modifiers
- Match situation effects

**Branches:**
- **MISSED** → No meaningful contact
- **EDGED** → Poor contact, deflection
- **MIDDLED** → Good contact, intended shot

#### 2. Miss Type (2 branches - if missed)
Determines what happens when batsman misses the ball.

**Function of:**
- [PLACEHOLDER: Miss type calculation]
- Bowler accuracy and movement
- Batsman footwork and technique

**Branches:**
- **Beaten** → Ball passes bat safely (DOT)
- **Wicket** → Bowled, LBW, or Hit Wicket

#### 3. Edge Direction (3 branches - if edged)
Determines where the edge goes.

**Function of:**
- [PLACEHOLDER: Edge direction calculation]
- Shot type attempted
- Bowler delivery type
- Field setting positions

**Branches:**
- **To Keeper** → Keeper has catching chance
- **To Slip** → Slip fielder has catching chance  
- **Neither** → Edge runs available

#### 4. Shot Type (3 branches - if middled)
Determines the quality of the middled shot.

**Function of:**
- Batsman timing and technique
- [PLACEHOLDER: Shot quality calculation]
- Bowler delivery quality
- Tactical instructions

**Branches:**
- **Mishit** → Limited power/placement
- **Good Hit** → Decent power/placement
- **Smashed** → Maximum power/placement

#### 5. Trajectory (2 branches - for each shot type)
Determines if the ball stays grounded or goes aerial.

**Function of:**
- [PLACEHOLDER: Trajectory calculation]
- Shot type and power
- Batsman aggression and shot selection
- Bowler length and pace

**Branches:**
- **Grounded** → Ball stays on ground
- **Aerial** → Ball goes in air

#### 6. Gap Analysis (3 branches - for each trajectory)
Determines how the ball interacts with the field.

**Function of:**
- Batsman placement and range360 attributes
- [PLACEHOLDER: Gap finding calculation]
- Field setting density and positioning
- Shot direction

**Branches:**
- **In the Gap** → Clear space, guaranteed runs/boundary
- **Straight to Fielder** → Direct to fielder position
- **Fielding Chance** → Fielder must move/react to reach ball

#### 7. Fielding Action (varies by situation)
Determines fielding outcome for each scenario.

**Function of:**
- Fielder attributes (catching, groundFielding, reflexes)
- [PLACEHOLDER: Fielding success calculations]
- Pressure and match situation
- Difficulty of the chance

**Outcomes:**
- **Keeper/Slip Actions** → Caught, fumbled, or dropped
- **Direct Fielding** → Clean gather or misfield
- **Catch Attempts** → Caught, stopped, or dropped
- **Throw Attempts** → On target or miss

#### 8. Run Out Check (2 branches - if throw on target)
Determines if runner is dismissed.

**Function of:**
- [PLACEHOLDER: Run out calculation]
- Runner speed and judgement
- Throw timing and accuracy
- Distance to crease

**Branches:**
- **Out** → Runner dismissed
- **Safe** → Runner survives

### Derived Attributes System

#### Batsman Derived Attributes
```javascript
/**
 * Shot Selection - Ability to choose appropriate shot
 */
shotSelection = f(judgement, range360, aggression, tactical_instruction)

/**
 * Shot Execution - Technical ability to execute shot
 */
shotExecution = f(technique, footwork, timing, placement)

/**
 * Bowler Type Effectiveness - Performance vs specific bowling
 */
vsPaceEffectiveness = f(shotExecution, vsPace, footwork)
vsSpinEffectiveness = f(shotExecution, vsSpin, footwork)
```

#### Bowler Derived Attributes
```javascript
/**
 * Delivery Planning - Tactical bowling awareness
 */
deliveryPlanning = f(intelligence, variations, judgement, bowling_style)

/**
 * Delivery Execution - Technical execution of planned delivery
 */
deliveryExecution = f(accuracy, bowlingSpeed, movement_attribute, intelligence)
// movement_attribute = swing (pace) or turn (spin)
```

#### Fielding Derived Attributes
```javascript
/**
 * Catching Ability - Context-specific catching skill
 */
effectiveCatching = f(catching, reflexes, concentration, catch_difficulty)

/**
 * Ground Fielding - Stopping and gathering ability  
 */
effectiveFielding = f(groundFielding, speed, agility, throw_attributes)

/**
 * Running Assessment - Between wickets effectiveness
 */
effectiveRunning = f(judgement, speed, agility)
```

### In-Match Attribute Modifiers

#### Energy System
```javascript
/**
 * Energy depletion during match
 */
const ENERGY_COSTS = {
  ballFaced: 0.8,     // Per ball as batsman
  ballBowled: 1.2,    // Per ball bowled
  runTaken: 1.5,      // Per run between wickets
  fieldingAction: 0.5, // Per fielding involvement
  wicketKeeping: 0.3   // Per ball as wicket-keeper
};

/**
 * Starting energy for each match
 */
function calculateStartingEnergy(player) {
  const baseEnergy = player.attributes.physical.stamina;
  const fitnessModifier = (player.condition.fitness - player.condition.fatigue) / 100;
  
  return Math.max(10, baseEnergy * fitnessModifier);
}
```

#### Confidence System
```javascript
/**
 * Confidence changes during match
 */
const CONFIDENCE_CHANGES = {
  // Batting events
  boundary: +3,
  six: +5,
  fifty: +8,
  hundred: +15,
  wicket: -8,
  golden_duck: -12,
  
  // Bowling events
  wicket: +4,
  maiden: +2,
  hit_for_six: -3,
  expensive_over: -2,
  five_wickets: +12,
  
  // Fielding events
  catch: +3,
  run_out: +4,
  dropped_catch: -4,
  misfield: -2
};
```

### Match Engine Integration Points

#### Pre-Ball Setup
```javascript
function prepareBallSimulation(matchState) {
  // Calculate in-match conditions
  const striker = calculateInMatchCondition(matchState.striker);
  const bowler = calculateInMatchCondition(matchState.bowler);
  
  // Apply tactical context
  const tacticalContext = getTacticalInstructions(matchState);
  
  // Calculate pressure modifiers
  const situationalModifiers = calculatePressureEffects(matchState.context);
  
  return { striker, bowler, tacticalContext, situationalModifiers };
}
```

#### Ball Simulation Flow
```javascript
function simulateBall(matchState) {
  const setup = prepareBallSimulation(matchState);
  
  // Primary decision tree
  const contactType = determineContactQuality(setup);
  const outcome = processContactOutcome(contactType, setup);
  
  // Post-ball processing
  updateMatchState(matchState, outcome);
  updatePlayerConditions(setup.striker, setup.bowler, outcome);
  
  return outcome;
}
```

## Terminology Dictionary

### Consistent Terminology Mapping
```javascript
const TERMINOLOGY = {
  // Shot types alignment
  shotTypes: {
    attributes: ["defensiveShots", "neutralShots", "attackingShots"], // Player attributes
    tactical: ["defensive", "neutral", "aggressive"],                // Tactical instructions
    ui: ["Defensive", "Balanced", "Attacking"]                      // UI display
  },
  
  // Bowling style alignment
  bowlingStyles: {
    attributes: ["defensiveBowling", "neutralBowling", "attackingBowling"], // Player attributes
    tactical: ["run-control", "neutral", "wicket-taking"],                 // Tactical instructions
    ui: ["Contain", "Balanced", "Attack"]                                  // UI display
  },
  
  // Field setting alignment
  fieldSettings: {
    tactical: ["aggressive", "neutral", "defensive"],          // Tactical setting
    ui: ["Attacking", "Balanced", "Defensive"],               // UI display
    description: ["2+ slips", "1 slip", "0 slips"]           // Quick reference
  }
};
```

### Match Engine Commentary System
```javascript
const COMMENTARY_TEMPLATES = {
  dot: [
    "{bowler} to {batsman}, no run",
    "Defended by {batsman}",
    "Good length from {bowler}, {batsman} watchful"
  ],
  single: [
    "{batsman} pushes it to {field_position} for a single",
    "Quick single taken by {batsman}"
  ],
  four: [
    "{batsman} drives magnificently for FOUR!",
    "FOUR! {batsman} times it perfectly through {field_position}"
  ],
  six: [
    "SIX! {batsman} launches it into the stands!",
    "MAXIMUM! {batsman} clears the boundary with ease"
  ],
  wicket: [
    "WICKET! {batsman} is dismissed by {bowler}!",
    "GOT HIM! {bowler} strikes, {batsman} has to go"
  ]
};
```

## WPL League System Structure

### League Format
```javascript
const WPL_STRUCTURE = {
  teams: 10,
  seasonLength: 74, // matches
  playoffTeams: 4,
  auctionBudget: 100, // crores
  maxSquadSize: 25,
  minSquadSize: 18,
  maxOverseas: 8,
  playingXIOverseas: 4,
  retentionRules: {
    maxRetentions: 5,
    categories: ['capped', 'uncapped', 'overseas']
  }
};

// Season Calendar
const SEASON_PHASES = {
  preseason: {
    auction: 'February',
    teamBuilding: '2 weeks'
  },
  league: {
    start: 'March',
    end: 'May',
    matchesPerDay: 1, // Sometimes 2
    restDays: ['Monday'] // Typically
  },
  playoffs: {
    qualifier1: 'Late May',
    eliminator: 'Late May',
    qualifier2: 'Late May',
    final: 'End May'
  }
};
```

## AI System Framework

### Tactical AI
```javascript
class TacticalAI {
  selectBowler(matchSituation, availableBowlers) {
    // Priority factors:
    // 1. Match phase (powerplay, middle, death)
    // 2. Batsman weaknesses vs bowler strengths
    // 3. Bowler form and fatigue
    // 4. Required run rate pressure
    
    return this.weightedSelection(availableBowlers, matchSituation);
  }
  
  setBatsmanMentality(batsman, matchSituation) {
    // Factors:
    // 1. Required run rate
    // 2. Wickets in hand
    // 3. Batsman natural style
    // 4. Match importance
    
    return this.calculateOptimalMentality(batsman, matchSituation);
  }
}
```

### Strategic AI
```javascript
class StrategicAI {
  // Auction behavior
  evaluatePlayer(player, teamNeeds) {
    // Consider: role fit, age, form, salary expectations
    return playerValue;
  }
  
  // Squad selection
  selectPlayingXI(squad, opponent, venue) {
    // Consider: form, fitness, opponent weaknesses, venue history
    return selected11;
  }
  
  // Season planning
  manageFatigue(players, upcomingFixtures) {
    // Rotation policy based on fixture congestion
    return rotationPlan;
  }
}
```

## UI/UX Architecture

### Design Principles (FM24-inspired)
1. **Information Density:** Show lots of data without overwhelming
2. **Fluid Navigation:** Quick access to any screen with extensive hyperlinks
3. **Contextual Actions:** Right-click menus, hover tooltips
4. **Responsive Tables:** Sortable, filterable data grids
5. **Tab-based Organization:** Logical grouping of related information

### Main Navigation Structure
```javascript
<NavigationBar>
  - Dashboard (Season overview)
  - Squad (Player list, tactics)
  - Matches (Fixtures, results)
  - League (Standings, stats)
  - Transfers (Auction, contracts)
  - Board (Objectives, finances)
</NavigationBar>

// Match Day UI
<MatchInterface>
  - Live Commentary Panel
  - Scorecard Tabs
  - Statistical Dashboard
  - Tactical Controls
  - Player Performance Ratings
</MatchInterface>

// Player Profile Layout
<PlayerProfile>
  - Attributes Spider Chart
  - Form Graph
  - Career Statistics
  - Contract Details
  - Development History
</PlayerProfile>
```

### Color Scheme
```css
:root {
  --primary: #1a472a;        /* Dark green */
  --secondary: #2d5016;      /* Cricket green */
  --accent: #ff6b6b;         /* Red for alerts */
  --background: #0f1419;     /* Dark background */
  --surface: #1a1f2a;        /* Card background */
  --text-primary: #ffffff;   /* White text */
  --text-secondary: #8b92a3; /* Grey text */
}
```

## Save System Structure
```javascript
const saveGame = {
  version: "1.0.0",
  metadata: {
    saveName: "My WPL Campaign",
    date: "2024-04-15",
    season: 1,
    week: 5,
    checksum: "abc123" // For save validation
  },
  gameState: {
    teams: {...},
    players: {...},
    schedule: {...},
    standings: {...},
    transactions: [...],
    history: [...]
  },
  settings: {
    difficulty: "normal",
    simulationSpeed: "normal",
    currency: "INR",
    nameProtection: false
  }
};

// Auto-save implementation
class SaveManager {
  constructor() {
    this.autoSaveInterval = 60000; // 1 minute
    this.maxAutoSaves = 3;
  }
  
  save(slot = 'manual') {
    const data = this.collectGameState();
    localStorage.setItem(`cricket_save_${slot}`, JSON.stringify(data));
  }
  
  load(slot) {
    const data = localStorage.getItem(`cricket_save_${slot}`);
    return JSON.parse(data);
  }
}
```

## Name Protection Failsafe
```javascript
// config/name-protection.js
const NAME_TWEAKS = {
  enabled: false, // Can be toggled if needed
  rules: [
    { pattern: /Virat/, replacement: "Viral" },
    { pattern: /Kohli/, replacement: "Kahli" },
    { pattern: /Rohit/, replacement: "Rahit" },
    { pattern: /Sharma/, replacement: "Sherma" },
    { pattern: /Dhoni/, replacement: "Dhani" },
    // Add more as needed
  ]
};

function protectName(originalName) {
  if (!NAME_TWEAKS.enabled) return originalName;
  
  let protected = originalName;
  NAME_TWEAKS.rules.forEach(rule => {
    protected = protected.replace(rule.pattern, rule.replacement);
  });
  return protected;
}

// Usage in Player component
const displayName = protectName(player.name);
```

## Development Phases

### Phase 1: Core Systems 
1. **Weeks 1-2:** Data models and storage system
   - Player database structure
   - Team and venue data
   - Save/load system

2. **Weeks 3-4:** Basic match engine
   - Ball-by-ball simulation
   - Attribute-based calculations
   - Basic commentary

3. **Weeks 5-6:** WPL structure
   - Schedule generation
   - League standings
   - Playoff system

4. **Weeks 7-8:** Auction system
   - Bidding mechanics
   - AI bidding logic
   - Salary cap management

5. **Weeks 9-10:** UI framework
   - Navigation structure
   - Core screens
   - Data tables

6. **Weeks 11-12:** Integration
   - Connect all systems
   - Testing and balancing
   - Performance optimization

### Implementation Priority Order
1. Get basic match simulation working with real player data
2. Implement tactical instructions affecting match outcomes
3. Add form/fitness system affecting performances
4. Create AI opponent decision-making
5. Build intuitive UI layer
6. Polish with commentary and statistics

## Testing Framework

### Core Functionality Tests
- [ ] Can create and load save games
- [ ] Match engine produces realistic scores (120-200 typical)
- [ ] Player attributes affect performance measurably
- [ ] Form system changes based on recent performances
- [ ] AI makes reasonable tactical decisions
- [ ] Auction system respects all WPL rules
- [ ] Schedule generates without conflicts
- [ ] Standings calculate accurately
- [ ] Playoff system works correctly

### Edge Case Tests
- [ ] 0 wickets innings
- [ ] All out scenarios
- [ ] Super over situations
- [ ] Tie scenarios
- [ ] Rain affected matches (if implemented)
- [ ] Injury during match
- [ ] Minimum player availability

### Performance Benchmarks
- Match simulation: < 2 seconds
- Season simulation: < 30 seconds
- UI navigation: < 100ms response
- Save/Load: < 1 second
- Auction round: < 500ms

## Code Standards for Claude Code

### File Header Template
```javascript
/**
 * @file MatchEngine.js
 * @description Core match simulation engine for cricket matches
 * @module match-engine
 * @requires utils/random
 * @requires data/players
 */
```

### Function Documentation
```javascript
/**
 * Simulates a single delivery in a cricket match
 * @param {Player} batsman - Current batsman
 * @param {Player} bowler - Current bowler
 * @param {Object} fieldSetting - Field placement configuration
 * @param {Object} matchContext - Current match situation
 * @returns {Object} Ball outcome with runs, wicket, commentary
 */
function simulateBall(batsman, bowler, fieldSetting, matchContext) {
  // Implementation
}
```

### Consistent Naming Conventions
- Files: `kebab-case.js`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- React Components: `PascalCase`

## Instructions for Claude Code

### When Starting a New Feature
1. **Read relevant documentation** in the feature folder
2. **Check this guide** for data structure compliance
3. **Review existing code** in related modules
4. **Create test scenarios** before implementation
5. **Document assumptions** in code comments

### Best Practices
- Use descriptive variable names
- Comment complex calculations (especially [PLACEHOLDER] sections when implementing)
- Update documentation when changing interfaces
- Test with edge cases
- Use early returns to reduce nesting

### DO NOT
- Refactor working code without explicit instruction
- Change data structures without updating dependencies
- Ignore the deterministic nature of the match engine
- Create circular dependencies between modules
- Use global variables
- Hardcode values that should be configurable

### PLACEHOLDER Implementation Guidelines
When implementing [PLACEHOLDER] calculations:
1. Start with simple, working formulas
2. Document assumptions clearly
3. Make calculations easy to modify later
4. Ensure deterministic results (same inputs = same outputs)
5. Balance realism with performance

Example:
```javascript
// [PLACEHOLDER: Contact quality calculation]
// Simple implementation - can be refined later
function calculateContactQuality(batsmanExecution, bowlerExecution) {
  const differential = batsmanExecution - bowlerExecution;
  // TODO: Add pressure, fatigue, match situation modifiers
  
  if (differential > 5) return "middled";
  if (differential > -2) return "edged";
  return "missed";
}
```

### Remember
- This is a simulation game - realism matters
- Performance is important - thousands of matches will be simulated
- The UI should feel professional, intuitive and data-rich
- AI opponents should feel distinct and challenging
- Every system should be extensible for future features
- Placeholders are intentional - implement simple versions first



This consolidated guide resolves all contradictions, maintains consistent terminology, keeps placeholders for iterative development, and provides clear implementation guidance for Claude Code initialization.