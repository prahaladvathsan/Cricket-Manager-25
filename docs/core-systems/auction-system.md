# Auction System

## Overview

The World Premier League (WPL) Auction System allows teams to acquire players through a competitive bidding process. The system supports both interactive mode (user controls one team) and AI-only mode (all teams controlled by AI).

## Features

### Player Distribution Modes
1. **Random Distribution** (default) - Players distributed automatically via snake draft
2. **Auction Mode** - Competitive bidding process with budget management

### Auction Modes
1. **Interactive Auction** - User controls one team (Mumbai Thunders by default), others AI-controlled
2. **AI-Only Auction** - All teams controlled by AI (automated simulation)

## Core Components

### 1. AuctionEngine.js
**Main auction orchestration:**
- Player categorization (Marquee, Batsmen, Bowlers, All-rounders, Wicket Keepers)
- Round management (10 players per round, shuffled within each round)
- Bidding process automation
- Winner determination and squad assignment

**Key Methods:**
- `initializeAuction(teams, players)` - Set up auction state
- `categorizePlayers()` - Organize players by role and rating
- `createAuctionRounds(categorizedPlayers)` - Generate auction rounds
- `auctionPlayer(player, userBidCallback)` - Run simultaneous bidding for single player
- `getAIBid(team, player, currentPrice)` - Get AI team's bid decision asynchronously
- `runUnsoldRound(userBidCallback)` - Final chance for unsold players at reduced prices

### 2. AuctionAI.js
**AI bidding strategy:**
- Player valuation based on team needs and budget
- Squad composition analysis
- Bidding probability calculations
- Strategic reserve management for minimum squad requirements

**Key Methods:**
- `shouldBid(player, currentPrice, team)` - Decide whether to bid
- `analyzeTeamNeeds(squad)` - Calculate role requirements
- `calculateNextBid(currentPrice)` - Determine next bid amount
- `getRandomBidDelay()` - Simulate thinking time

### 3. PlayerValuation.js
**Price calculation:**
- Base price determination from playstyle ratings
- Market value estimation for AI bidding
- Price slab categorization (Elite, Premium, Standard, Emerging, Base)
- Budget reserve calculations

**Price Slabs:**
- Elite (75+ rating): $200K
- Premium (65-74): $100K
- Standard (50-64): $50K
- Emerging (35-49): $20K
- Base (0-34): $10K

### 4. auctionConfig.json
**Configuration parameters:**
```json
{
  "budget": { "total": 10000000 },
  "squadSize": { "min": 18, "max": 25 },
  "priceSlabs": [...],
  "bidIncrements": [...],
  "timing": {
    "bidTimer": 10,
    "aiBidDelayMin": 0.1,
    "aiBidDelayMax": 0.5
  },
  "marquee": { "threshold": 80 },
  "rounds": { "playersPerRound": 10 }
}
```

## Design Principles

### Simultaneous Bidding System

The auction uses **simultaneous bidding** where all eligible teams make decisions at the same time, rather than sequentially. This provides:

1. **Realistic Timing**: Multiple teams can bid on the same player within the same window
2. **Performance**: ~6x faster than sequential bidding (all teams "think" in parallel)
3. **Fairness**: First timestamp wins if multiple teams bid simultaneously
4. **Strategic Depth**: Current highest bidder cannot bid again until someone else raises

### Key Rules

1. **All teams evaluate simultaneously** using `Promise.all()`
2. **Current bidder excluded** - Team with highest bid cannot bid again until price increases
3. **First timestamp wins** - If multiple teams bid in same round, earliest timestamp wins
4. **Random AI delays** - Each AI team has 0.1-0.5s thinking time (creates natural timing variation)

**Example Flow:**
```
Round 1: All 10 teams bid simultaneously
  - Mumbai: $250K (timestamp: 100)
  - London: $300K (timestamp: 150)
  - Colombo: $350K (timestamp: 120)
  → Winner: Colombo (timestamp 120 beats 150)

Round 2: All teams EXCEPT Colombo bid
  - Mumbai: $400K
  - London: $450K
  → Winner: London

Round 3: All teams EXCEPT London bid
  ...and so on
```

## Auction Process

### 1. Player Categorization

**Marquee Set** (auctioned first):
- Any player with primary playstyle rating ≥ 80
- Sorted by rating (descending)

**Role-Based Categories** (auctioned in order):
1. **Batsmen** - Role = 'batsman', sorted by batting primary playstyle rating
2. **Bowlers** - Role = 'bowler', sorted by bowling primary playstyle rating
3. **All-Rounders** - Role = 'all-rounder', sorted by average of top batting + bowling ratings
4. **Wicket Keepers** - Role = 'wicket-keeper', sorted by batting primary playstyle rating

### 2. Round Structure
- 10 players per round
- Players shuffled within each round (for variety)
- Sequential auction of each player

### 3. Bidding Process

For each player:
1. Display player card (name, role, rating, base price, Marquee status)
2. **Simultaneous Bidding Round**:
   - All teams (except current highest bidder) make decisions **at the same time**
   - AI teams use `shouldBid()` logic with random thinking delay (0.1-0.5s)
   - User team (if present) gets interactive prompt
   - All decisions resolved simultaneously via `Promise.all()`
   - **First timestamp wins** if multiple teams bid in same round
   - Current highest bidder **cannot bid again** until someone else raises
3. Timer: 10 seconds after last bid → sold (increments when no bids)
4. Winner pays final price, player joins squad
5. Update team budget and squad size

**Bid Increments:**
- $0-20K: +$2K
- $20K-50K: +$5K
- $50K-100K: +$10K
- $100K-200K: +$20K
- $200K+: +$50K

### 4. Unsold Players Round
- Players with no bids go to unsold pool
- Final round at end of auction
- Base prices reduced by 50%
- Shuffled order
- Same bidding process

## AI Bidding Strategy

### Playstyle-Based Valuation System

The auction AI uses a sophisticated **playstyle rating quota system** rather than simple role-based needs. Teams track cumulative playstyle ratings across 9 categories (5 batting + 4 bowling) and bid based on how well players fill quota gaps.

#### Playstyle Rating Quotas

**Batting Categories:**
- Openers: 400 total rating
- Top Order: 370 total rating
- Middle Order: 340 total rating
- Lower Order: 310 total rating
- Specialists (Finisher, Pinch-Hitter, etc.): 280 total rating

**Bowling Categories:**
- Powerplay (Swing, Hit-the-Deck): 380 total rating
- Early Middle (Classical/Flat Spinner): 380 total rating
- Late Middle (Mystery/Containment Spinner): 320 total rating
- Death (Death Specialist, Short-Ball): 320 total rating

**Total Target:** 3,100 rating points per team (sum of all quotas)

#### Fit Score Calculation

The fit score determines how valuable a player is to a team based on **their highest single contribution** to quota gaps:

```javascript
// For each playstyle category player can contribute to:
categoryValue = ratingContribution + (gap / totalQuota) × 100

// Fit score is the MAXIMUM category value (not sum)
// Exception: All-rounders get sum of best batting + best bowling
if (role === 'all-rounder') {
  fitScore = maxBattingValue + maxBowlingValue  // Dual skill credit
} else {
  fitScore = Math.max(maxBattingValue, maxBowlingValue)  // Best single contribution
}

// All-rounder bonus (if both skills >= 60)
if (topBatting >= 60 && topBowling >= 60) {
  allRounderBonus = baseValue × ((topBatting + topBowling) / 200) × 0.3
}
```

**Key Principles:**
- **All players contribute to all quotas** - Even batsmen can fill minor bowling quotas if they have bowling playstyle ratings
- **Gap urgency** - Higher gaps mean higher value (second term in categoryValue)
- **All-rounder premium** - All-rounders get credit for BOTH batting and bowling contributions

### Market Value Estimation

```javascript
marketValue = (baseValue + fitValue + allRounderBonus)
              × tierMultiplier
              × reducedScarcity
              × squadMultiplier
              × budgetGapMultiplier

where:
  baseValue = (primaryRating / 100) × basePrice × 1.2
  fitValue = fitScore × 1000  // Scale fit score to dollars
  tierMultiplier = 1.4 (elite) | 1.2 (premium) | 1.0 (standard) | 0.85 (emerging) | 0.7 (base)
  reducedScarcity = 1.0 + ((playstyleScarcity - 1.0) × 0.15)  // 15% of original effect
  squadMultiplier = 1.3 if squad < 18, else 1.0
  budgetGapMultiplier = dynamic multiplier based on budget vs remaining gaps
```

### Budget-to-Gap Multiplier (Dynamic Budget Management)

The AI adjusts bid aggressiveness based on whether the team has surplus or deficit budget relative to remaining quota gaps:

```javascript
// Calculate total remaining gaps across all 9 categories
totalGaps = sum of all batting gaps + sum of all bowling gaps

// Estimate ideal budget needed (cost per rating point from historical data)
costPerRatingPoint = $10,000,000 / 3,100 = $3,226
idealBudgetNeeded = totalGaps × costPerRatingPoint

// Calculate budget ratio
budgetRatio = budgetRemaining / idealBudgetNeeded

// Convert to multiplier with bounds
if (budgetRatio >= 1.0) {
  // Budget surplus - bid more aggressively
  // Map 1.0→1.0, 1.5→1.15, 2.0→1.3, 3.0→1.4
  multiplier = 1.0 + (budgetRatio - 1.0) × 0.5
} else {
  // Budget deficit - bid more conservatively
  // Map 0.5→0.7, 0.75→0.85, 1.0→1.0
  multiplier = 0.6 + (budgetRatio - 0.5) × 0.5
}
```

**Effect:**
- Team with 2x needed budget → bids 30% higher
- Team with half needed budget → bids 30% lower
- Ensures teams pace spending throughout auction

### Bidding Decision (Deterministic)

```javascript
// AI bids if current price is below estimated market value
shouldBid = currentPrice < marketValue

// No probability involved - purely value-based
```

### Budget Management
- Reserve enough for minimum squad completion (dynamic based on players needed)
- Don't bid if effective budget (budget - reserve) is insufficient
- Budget-to-gap multiplier ensures proportional spending throughout auction

## Usage

### Test Scripts

#### 1. Demo Auction (automated, no user input)
```bash
# Quick demo (first 3 rounds)
node src/test/demoAuction.js

# Full auction (all players)
node src/test/demoAuction.js --full
```

#### 2. Interactive Auction (user controls Mumbai Thunders)
```bash
# Interactive mode
node src/test/auctionTest.js

# AI-only mode (watch all teams bid)
node src/test/auctionTest.js --ai-only
```

#### 3. League with Auction
```bash
# Full season with random distribution (default)
node src/test/leagueTest.js --full

# Full season with auction (all AI)
node src/test/leagueTest.js --full --auction --ai-only

# Full season with auction (user controls Mumbai)
node src/test/leagueTest.js --full --auction
```

### Interactive Controls

When controlling a team:
```
Options:
1. Raise Bid (adds one increment)
2. Custom Bid (enter specific amount)
3. Pass (skip this player)

AI Recommendation shown for each player
```

## Squad Validation

**Minimum Requirements:**
- At least 18 players per squad
- At least 5 bowling options (bowlers + all-rounders)
- Budget: $10M per team

**Ideal Composition (25 players):**
- 10 Batsmen
- 8 Bowlers
- 5 All-Rounders
- 2 Wicket-Keepers

## Display Features

### During Auction
- Player auction card with role, rating, base price, Marquee status
- Bidding history for current player
- Team budgets and squad sizes (updated live)
- Squad composition after each round (all 10 teams)

### Post-Auction
- Final squad summary for all teams
- Auction statistics (total spent, average price, highest sale)
- Team spending rankings
- Squad validation results
- Export to JSON

## Integration with League System

The auction system is integrated with LeagueSimulator:

```javascript
const initResult = await leagueSimulator.initializeLeague({
  clubsData,
  playersData,
  seasonName: 'WPL 2025',
  useAuction: true,          // Enable auction mode
  userBidCallback: null       // Optional callback for user control
});
```

## Performance Notes

### Speed Comparison

**Before (Sequential Bidding):**
- 10 teams × 0.3s average delay = ~3 seconds per bidding round
- Player with 5 bidding rounds = 15 seconds
- 30 players = ~7.5 minutes

**After (Simultaneous Bidding):**
- Max delay = 0.5s (all teams think in parallel)
- Player with 5 bidding rounds = 2.5 seconds
- 30 players = ~1.25 minutes
- **Speed improvement: ~6x faster**

### Configuration

- **AI Delay:** 0.1-0.5 seconds per team (configurable in `auctionConfig.json`)
- **Bid Timer:** 1-10 seconds after last bid (configurable, default: 1s for fast demos)
- **Simultaneous Bidding:** All teams make decisions in parallel via `Promise.all()`
- **Full Auction Time:**
  - Demo mode (30 players): ~30 seconds
  - Full auction (315 players): ~2-5 minutes

### Fast Mode

For demo/testing purposes, the AuctionEngine supports a **fast mode** that skips bidding rounds and instantly resolves auctions:

```javascript
const auction = new AuctionEngine({ fastMode: true });
```

**Fast Mode Logic:**
1. All teams evaluate player simultaneously (no delays)
2. Each team determines their maximum willing bid
3. **Highest bid wins** - find the maximum bid across all interested teams
4. **Floor to valid increment** - ensure final price aligns with bid increment rules using `floorToValidBidAmount()`
5. **Random tiebreaker** - if multiple teams willing to pay the highest amount, randomly select winner
6. Winner pays the floored highest bid amount

**Example:**
```
Player: Smriti Mandhana
- Mumbai: maxBid = $885,000
- London: maxBid = $880,000
- Colombo: maxBid = $890,000
- Melbourne: maxBid = $885,000
- Cape Town: maxBid = $890,000

Highest bid: $890,000
Floored to increment: $880,000 (valid $20K increment)
Teams at max: 2 (Colombo, Cape Town both willing to pay $890K)
Winner: Colombo (randomly selected from 2 highest bidders)
Final price: $880,000
```

This ensures economically accurate auction simulation - the highest bidder(s) win, with random selection only used as a tiebreaker.

## Future Enhancements

- **User Interactive Callback:** Full user control in leagueTest.js
- **Pre-Auction Research:** View player profiles before bidding
- **Auction History:** Track historical sales prices
- **Transfer Market:** Mid-season player trading
- **Salary Cap Management:** Annual contract renewals
- **Retention System:** Keep players across seasons

## Files

**Core:**
- `src/core/auction-system/AuctionEngine.js`
- `src/core/auction-system/AuctionAI.js`
- `src/core/auction-system/PlayerValuation.js`

**Configuration:**
- `src/data/config/auctionConfig.json`

**Tests:**
- `src/test/demoAuction.js`
- `src/test/auctionTest.js`
- `src/test/leagueTest.js` (integrated)

**Integration:**
- `src/core/league/LeagueSimulator.js` (runAuction method)

## React UI Implementation

### Auction Component (`src/components/auction/Auction.jsx`)

The React UI provides a real-time interactive auction experience with Football Manager-inspired design.

#### Efficient AI Bidding Race Logic

**Pre-calculation Strategy:**
```javascript
// ONCE per player (at auction start):
for each team:
  decision = ai.shouldBid(player, basePrice, team, progress)
  if (decision.shouldBid):
    willingBidders.push({ team, maxBid: decision.maxBid })

// After EACH bid (user or AI):
activeBidders = willingBidders.filter(b =>
  b.maxBid >= currentPrice + increment &&
  b.team.id !== currentHighestBidder.id &&
  !b.team.isUserControlled
)

// Assign random delay to ALL active bidders (they race!)
for each activeBidder:
  delay = random(1-5 seconds)  // from config
  setTimeout(() => {
    if (auctionStillActive && priceUnchanged) {
      placeBid(team, currentPrice + increment)
    }
  }, delay)

// First one to execute wins, others are cancelled
```

**Benefits:**
- ✅ AI evaluation happens ONCE per player (no recalculation every second)
- ✅ Multiple teams "thinking" simultaneously (realistic bidding war)
- ✅ Automatic filtering as price increases (teams drop out when price exceeds maxBid)
- ✅ Fair random delays (any team could bid first)
- ✅ Clean cancellation (losing bids are invalidated)

#### UI Features

**Live Auction View:**
- Player card with name, role, age, nationality
- Top 3 batting and bowling playstyles with ratings
- Current bid price (updates in real-time)
- Countdown timer (10 seconds from config)
- Visual timer progress bar (red when < 3 seconds)
- Bid/Pass buttons for user (disabled when insufficient funds)
- Highest bidder indicator

**Sold/Unsold Confirmation:**
- Full-screen sold animation (green gavel icon)
- Player details and final price
- Team assignment (highlighted if user team)
- Unsold screen (red gavel) for players with no bids
- "Next Player" button to continue auction

**Team Squads Tab:**
- Live squad display for all 10 teams
- Budget remaining and squad size (X/25)
- Player cards with sold prices
- User team highlighted

**Auction Log Tab:**
- Color-coded event log (player intro, bids, sold/unsold)
- Scrollable history of entire auction

#### State Management with Refs

To avoid React stale state issues in async callbacks:
```javascript
// State for UI display
const [currentPrice, setCurrentPrice] = useState(0);
const [highestBidder, setHighestBidder] = useState(null);

// Refs for always-current values in callbacks
const currentPriceRef = useRef(0);
const highestBidderRef = useRef(null);
const isAuctioningRef = useRef(false);
const willingBiddersRef = useRef([]);
const pendingBidsRef = useRef([]);

// Always update both state AND ref together
setCurrentPrice(newPrice);
currentPriceRef.current = newPrice;
```

This ensures callbacks always read the latest values, preventing race conditions.

#### Timer Management

**10-Second Countdown:**
- Resets to 10s after each bid
- Ticks down every second
- Auction finalizes when timer reaches 0
- Visual feedback (red pulsing at < 3 seconds)

**Pass Button:**
- Clears timer immediately
- Uses fast mode logic to find highest bidder
- Shows sold/unsold confirmation screen

## Implementation History

### January 2025 - React UI + Efficient Bidding Race
- **React auction UI:** Interactive bidding with Football Manager-inspired design
- **Efficient AI bidding:** Pre-calculate max bids once, then filter and race (no recalculation every second)
- **State management with refs:** Prevent stale state in async callbacks
- **Real-time updates:** Live price, timer, squad displays
- **Sold/unsold screens:** Confirmation after each player with "Next Player" control

### January 2025 - Valuation System Redesign
- **Playstyle-based quota system:** Replaced role-based needs with 9 playstyle rating quotas (5 batting + 4 bowling)
- **Fit score using MAX:** Changed from sum to maximum of category contributions (highest single quota gap filled)
- **All-rounder dual credit:** All-rounders get sum of best batting + best bowling contributions (not just best single)
- **Universal quota contributions:** All players can fill all quotas based on actual playstyle ratings (even batsmen contribute to bowling)
- **Budget-to-gap multiplier:** Dynamic bid adjustment based on budgetRemaining / idealBudgetNeeded
- **Fast mode improvements:** Highest-bidder logic with valid bid increment flooring and random tiebreaker
- **Deterministic bidding:** AI bids if currentPrice < marketValue (no probability involved)

### January 2025 - Initial Implementation
- Simultaneous bidding system
- AI valuation and bidding strategy
- Integration with league system
- Interactive and AI-only modes

