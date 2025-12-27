/**
 * @file manualContent.js
 * @description Game Manual content data - all text organized by section
 * Content is based on actual game mechanics from the codebase
 */

import {
  Rocket,
  Calendar,
  Gamepad2,
  Target,
  Users,
  Sparkles,
  Trophy,
  Gavel,
  DollarSign,
  ClipboardList,
  MapPin,
  Lightbulb
} from 'lucide-react';

export const manualSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    content: [
      {
        heading: 'What is Cricket Manager?',
        text: `Cricket Manager is a T20 cricket management simulation game inspired by Football Manager. You take control of one of 10 fictional teams in the World Premier League (WPL) and guide them through seasons of competition.

Your responsibilities include:
- Building your squad through auctions and transfers
- Setting tactics and match strategies
- Managing player fitness and form
- Meeting board objectives
- Competing for the WPL championship`
      },
      {
        heading: 'Starting a New Game',
        text: `From the Start Menu, click "Start New Game" to begin your career. You'll be presented with 10 WPL teams to choose from. Each team has its own roster and characteristics.

Once you select a team:
1. You'll receive a welcome message from the board
2. The game will begin in the Preseason phase
3. On odd seasons (1, 3, 5), you'll participate in an auction to build your squad
4. On even seasons (2, 4), you'll continue with your existing squad`
      },
      {
        heading: 'Understanding the Interface',
        text: `The game interface consists of:

**Header Bar**: Shows your team name, current day/week, season phase, and the Continue button to advance time.

**Sidebar Navigation**: Access different screens:
- Home: Dashboard with overview and objectives
- Squad: View and manage your 25-player roster
- Tactics: Configure your playing XI and match strategies
- League: View standings, fixtures, and results
- Transfers: Buy and sell players during transfer windows
- Inbox: Read messages from the board and match reports

**Main Content Area**: Displays the currently selected screen with relevant information and controls.`
      }
    ]
  },
  {
    id: 'game-flow',
    title: 'Game Flow & Progression',
    icon: Calendar,
    content: [
      {
        heading: 'The Continue Button',
        text: `The Continue button in the header is your main control for advancing the game. Each click advances time by one day and triggers any scheduled events.

The button label changes based on upcoming events:
- "Continue": Normal day advancement
- "Matchday": Your team has a match scheduled
- "Play Match" / "Quick-Sim": Options for your team's match
- "Auction": Auction event is scheduled
- "Simulate Match": AI teams playing each other`
      },
      {
        heading: 'Calendar System',
        text: `The game tracks time through several counters:

**Game Day**: Starts at Day 1 and increments each time you click Continue.

**Week Counter**: Tracks weeks 1-52 in a season.

**Season Number**: Tracks which season you're in (Season 1, 2, 3, etc.).

**Season Phase**: The current phase of the season determines available activities.`
      },
      {
        heading: 'Season Phases',
        text: `Each season progresses through four phases:

**Preseason**
- Auction phase (odd seasons only: 1, 3, 5)
- Squad preparation
- No competitive matches

**League Phase**
- 90 league matches (45 matchdays)
- Double round-robin format
- Points accumulation for standings

**Playoffs**
- Top 4 teams qualify
- 4 knockout matches to determine champion
- Qualifier 1, Eliminator, Qualifier 2, Final

**Offseason**
- Season summary and prize distribution
- Transfer window opens
- Preparation for next season`
      },
      {
        heading: 'Event Types',
        text: `Various events are scheduled on the calendar:

- **match**: League or playoff fixture
- **auction**: Initial player draft (odd seasons)
- **new_season_start**: Transition between seasons
- **season_end**: Prize distribution and summary
- **transfer_window_open/close**: Trading period boundaries`
      }
    ]
  },
  {
    id: 'match-system',
    title: 'Match System',
    icon: Gamepad2,
    content: [
      {
        heading: 'Match Modes',
        text: `When your team has a match, you have two options:

**Play Match (Interactive)**
- Watch the match unfold ball-by-ball
- Control batting acceleration
- Adjust bowling plans mid-match
- Full tactical control during the game

**Quick-Sim (Automated)**
- Instantly simulate the match
- Results based on team strength and tactics
- Faster progression through the season
- Use when you want to skip matches`
      },
      {
        heading: 'Pre-Match Setup',
        text: `Before each match, you'll configure:

**Toss**: Random winner chooses to bat or bowl first.

**Playing XI**: Select 11 players from your 25-player squad.

**Batting Order**: Arrange your batsmen from opener to No. 11.

**Bowling Order**: Assign overs to your bowlers.

**Bowling Plans**: Set tactical plans for each bowler.

**Field Formation**: Choose attacking, neutral, or defensive positioning.`
      },
      {
        heading: 'Live Match Interface',
        text: `The match view has three main panels:

**Left Panel - Tactics Hub**
- Current batsmen and bowler info
- Batting acceleration controls
- Bowling plan adjustments
- Field formation changes

**Center Panel - Pitch Visualization**
- 2D representation of the field
- Ball trajectory display
- Fielder positions
- Live action visualization

**Right Panel - Stats Hub**
- Live scorecard
- Partnership tracker
- Run rate graphs (Worm/Manhattan)
- Over-by-over breakdown`
      },
      {
        heading: 'The Match Engine',
        text: `Cricket Manager uses a sophisticated 4-step algebraic calculation for each delivery:

**Step 1: Decision Phase**
- Bowler selects delivery type based on attributes and plan
- Batter decides shot selection based on attributes and mentality

**Step 2: Contact Quality**
- Calculates bat-ball contact quality
- Formula: (timing + footwork + technique) vs (accuracy + swing + speed)
- Includes variance (d40) for realistic unpredictability
- Determines shot power (20-120 mph)

**Step 3: Trajectory**
- Determines ball direction (full 360 degrees possible)
- Uses placement attribute to choose optimal direction
- Results in precise coordinates on the 2D field

**Step 4: Fielding**
- 9 fielders positioned based on formation
- Real-time interception analysis for each fielder
- Physics-based catch/boundary/run calculations`
      },
      {
        heading: 'Modifier Chain',
        text: `Player attributes are modified by a 7-stage chain during matches:

1. **Playstyle**: Active playstyle bonuses/penalties
2. **Tactics**: Team tactical settings
3. **Mentality**: Batting/bowling mentality adjustments
4. **Matchups**: Batter vs bowler type advantages
5. **Confidence**: Current form and momentum
6. **Energy**: Fatigue effects on performance
7. **Context**: Match situation modifiers (winning/losing, pressure)`
      }
    ]
  },
  {
    id: 'tactics',
    title: 'Tactics Deep Dive',
    icon: Target,
    content: [
      {
        heading: 'The 5 Tactics Tabs',
        text: `The Tactics screen has five configuration tabs:

**1. Overview**
Current tactics summary showing your playing XI, assigned playstyles, and tactical settings at a glance.

**2. Playing XI & Playstyles**
Select your 11 players and assign their primary playstyle for the match.

**3. Batting Order**
Arrange batting positions 1-11 and designate your wicket-keeper.

**4. Bowling Plans**
Assign specific bowling plans to each bowler for different match phases.

**5. Fielding**
Set field formation (attacking/neutral/defensive) affecting fielder positioning.`
      },
      {
        heading: 'Acceleration Tiers',
        text: `During matches, you control batting aggression through 5 acceleration tiers:

**Rotate** (Most Conservative)
- Focus on singles and strike rotation
- Low risk, low reward
- Best when wickets are falling

**Build**
- Steady accumulation with occasional boundaries
- Moderate risk, moderate reward
- Good for consolidation phases

**Balanced**
- Default setting
- Mix of rotation and boundary attempts
- Standard T20 approach

**Attack**
- Aggressive shot selection
- Higher risk, higher reward
- Use when quick runs needed

**Power-Hit** (Most Aggressive)
- Maximum aggression
- Very high risk
- Death overs or desperate chases only`
      },
      {
        heading: 'Bowling Plans',
        text: `Bowlers can be assigned different plans based on match phase and their specialties. Plans affect bowling approach and field settings.

**Powerplay Plans** (Overs 1-6)
- Attack stumps
- Swing exploitation
- Field up aggressive

**Middle Overs Plans** (Overs 7-15)
- Contain
- Build pressure
- Spin dominance

**Death Overs Plans** (Overs 16-20)
- Yorker focus
- Wide of off stump
- Death bowling specialist

Assign plans that match each bowler's playstyle ratings for best results.`
      },
      {
        heading: 'Mentalities',
        text: `Overall team mentality affects both batting and bowling approaches:

**Batting Mentality**
- Aggressive: More attacking shots, higher risk
- Neutral: Balanced approach
- Conservative: Defensive, reduces wicket risk

**Bowling Mentality**
- Aggressive: Attack for wickets, may leak runs
- Neutral: Balanced wicket-taking and economy
- Conservative: Focus on dot balls and containment

Set mentalities based on match situation and your tactical preferences.`
      }
    ]
  },
  {
    id: 'squad-management',
    title: 'Squad Management',
    icon: Users,
    content: [
      {
        heading: 'Roster Size',
        text: `Each team maintains a squad of players:

- **Minimum**: 18 players (required for valid squad)
- **Maximum**: 25 players (roster cap)

You must have enough players to fill all positions and provide bench depth. A well-rounded squad includes:
- Multiple opening options
- Middle-order batsmen
- All-rounders for flexibility
- Pace and spin bowling options
- At least one wicket-keeper`
      },
      {
        heading: 'Player Roles',
        text: `Players are classified by their primary role:

**Batsman**
- Primary focus on batting
- Limited or no bowling ability
- Various batting positions

**Bowler**
- Primary focus on bowling (pace or spin)
- Lower order batting
- Specialist wicket-takers

**All-Rounder**
- Competent at both batting and bowling
- Valuable for team balance
- Can bat in various positions

**Wicket-Keeper**
- Specialist keeper
- Usually bats in middle/lower order
- Essential for match play (one required)`
      },
      {
        heading: 'Player Attributes (1-20 Scale)',
        text: `Each player has attributes rated 1-20:

**Batting Attributes**
- Technique: Shot selection and execution
- Timing: Bat-ball contact quality
- Footwork: Movement to the ball
- Aggression: Natural attacking tendency
- Concentration: Ability to build innings
- Placement: Direction control
- Power/Strength: Boundary-hitting ability

**Bowling Attributes**
- Accuracy: Line and length control
- Speed/Pace: Raw bowling speed
- Swing: Ball movement in air
- Turn: Spin amount (spinners)
- Variations: Delivery variety
- Intelligence: Tactical bowling awareness

**Fielding Attributes**
- Catching: Catch success rate
- Ground Fielding: Stopping and throwing
- Agility: Speed in the field`
      },
      {
        heading: 'Condition System',
        text: `Player condition affects performance:

**Fitness (0-100)**
- Decreases with playing time
- Affects attribute effectiveness
- Recovers during rest days
- Low fitness = underperformance

**Injuries**
- Players can get injured during matches
- Recovery time varies by severity
- Injured players unavailable for selection
- Track recovery in squad view

**Form**
- Recent performance affects confidence
- Good form = slight attribute boost
- Poor form = slight attribute penalty
- Changes based on match performances`
      },
      {
        heading: 'Transfer Market',
        text: `The transfer window opens during the offseason (typically weeks 22-26):

**Selling Players**
- List players at your desired price
- Other teams may purchase
- Freed salary and roster spot

**Buying Players**
- Browse available players from other teams
- Pay the listed price to acquire
- Must have budget and roster space

Transfers are instant - no negotiation required. Manage your budget carefully to strengthen weak areas of your squad.`
      }
    ]
  },
  {
    id: 'playstyle-system',
    title: 'Playstyle System',
    icon: Sparkles,
    content: [
      {
        heading: 'Overview',
        text: `The Playstyle System is central to Cricket Manager. Each player has ratings (0-100) for 24 different playstyles that determine their effectiveness in specific roles and match situations.

**How it works:**
- Assign players to positions matching their high-rated playstyles
- Playstyles provide conditional attribute modifiers during matches
- Some playstyles have trade-offs (bonuses in some situations, penalties in others)
- Higher rating = stronger modifier effects`
      },
      {
        heading: 'Batting Playstyles (16 Total)',
        text: `**Openers (3 types)**
- Opener - Slogger: Aggressive powerplay hitter, momentum generator
- Opener - Balanced: Platform builder, reliable starter
- Opener - Anchor: Defensive opener, absorbs pressure

**Top Order (3 types)**
- Top Order - Slogger: Middle overs aggressor, spin dominator
- Top Order - Balanced: Consistent all-phase batsman
- Top Order - Anchor: Steady accumulator in positions 3-4

**Middle Order (3 types)**
- Middle Order - Slogger: Power hitter in middle overs
- Middle Order - Balanced: Versatile middle order player
- Middle Order - Anchor: Consolidator when wickets fall

**Lower Order (3 types)**
- Lower Order - Slogger: Tail-end power hitter
- Lower Order - Balanced: Capable lower order bat
- Lower Order - Anchor: Defensive tail-ender

**Specialists (4 types)**
- Finisher: Death overs specialist, thrives under pressure
- Runner: Strike rotator, keeps scoreboard ticking
- Pinch-Hitter: Instant impact player, high risk
- Wall: Ultra-defensive, used for survival situations`
      },
      {
        heading: 'Bowling Playstyles (8 Total)',
        text: `**Pace Bowling (4 types)**
- Swing Bowler: Exploits new ball movement with swing and seam
- Hit-the-Deck Seamer: Hard length specialist, relentless pressure
- Short-Ball Specialist: Intimidating pace with short-pitched deliveries
- Death Specialist: Death overs yorker expert, calm under pressure

**Spin Bowling (4 types)**
- Classical Spinner: Traditional spinner with flight, dip, and loop
- Flat Spinner: Quick, skiddy spinner focused on accuracy
- Mystery Spinner: Deceptive variations and trick balls
- Containment Spinner: Metronomic line and length, dot ball pressure`
      },
      {
        heading: 'Playstyle Ratings Explained',
        text: `Ratings use a 0-100 scale:

**90-100**: Elite - Player is world-class in this role
**75-89**: Excellent - Very strong fit for this role
**60-74**: Good - Competent performer
**45-59**: Average - Can fill the role but not ideal
**Below 45**: Weak - Should avoid using in this role

**Key insight**: A player with 85 in "Finisher" will perform much better in death overs than a player with 50 in the same playstyle, even if their raw attributes are similar.`
      },
      {
        heading: 'Playstyle Bonuses & Trade-offs',
        text: `Each playstyle provides conditional bonuses and may have trade-offs:

**Example: Finisher**
- Bonus: Excellent in death overs (overs 17-20)
- Bonus: Performs well under chase pressure
- Trade-off: Less effective in early innings (overs 1-12)

**Example: Swing Bowler**
- Bonus: Devastating with new ball (overs 1-6)
- Bonus: Effective against poor technique
- Trade-off: Less effective with old ball (overs 14+)

Match your player selections to the phases where their playstyles excel!`
      }
    ]
  },
  {
    id: 'league-playoffs',
    title: 'League & Playoffs',
    icon: Trophy,
    content: [
      {
        heading: 'World Premier League',
        text: `The WPL consists of 10 teams competing in a T20 format:

- Chennai Cobras (India)
- London Lions (England)
- Sydney Sharks (Australia)
- Pretoria Pythons (South Africa)
- Multan Markhors (Pakistan)
- Colombo Crocodiles (Sri Lanka)
- Dhaka Dolphins (Bangladesh)
- Georgetown Jaguars (West Indies)
- Auckland Orcas (New Zealand)
- Kabul Kites (Afghanistan)

Each team represents a major cricketing nation and has a unique identity.`
      },
      {
        heading: 'League Format',
        text: `**Double Round-Robin**
- Each team plays every other team twice (home and away)
- 90 total league matches per season
- Each team plays 18 matches

**Match Schedule**
- Multiple matches per matchday
- Your team plays roughly twice per week
- Schedule is deterministic at season start`
      },
      {
        heading: 'Points System',
        text: `Points are awarded based on match results:

- **Win**: 2 points
- **Loss**: 0 points
- **Tie/No Result**: 1 point each

Teams are ranked by:
1. Total points (higher is better)
2. Net Run Rate (NRR) as tiebreaker`
      },
      {
        heading: 'Net Run Rate (NRR)',
        text: `NRR is the key tiebreaker in league standings:

**Formula:**
NRR = (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)

**Positive NRR**: Scoring faster than conceding (good)
**Negative NRR**: Conceding faster than scoring (bad)

**Why it matters:**
- Two teams on equal points? Higher NRR wins
- Winning by big margins improves your NRR
- Getting bowled out cheaply hurts your NRR
- Run big chases quickly to boost NRR`
      },
      {
        heading: 'Playoff Format (Top 4)',
        text: `The top 4 teams qualify for playoffs:

**Qualifier 1**
- 1st place vs 2nd place
- Winner goes directly to Final
- Loser gets second chance in Qualifier 2

**Eliminator**
- 3rd place vs 4th place
- Loser is eliminated
- Winner advances to Qualifier 2

**Qualifier 2**
- Loser of Q1 vs Winner of Eliminator
- Winner advances to Final
- Loser is eliminated

**Final**
- Winner of Q1 vs Winner of Q2
- Champion decided!

This format rewards finishing in top 2 with a safety net.`
      }
    ]
  },
  {
    id: 'auction-system',
    title: 'Auction System',
    icon: Gavel,
    content: [
      {
        heading: 'When Auctions Happen',
        text: `Player auctions occur at the start of odd-numbered seasons:

- **Season 1**: Initial auction to build your squad
- **Season 3**: Reset auction
- **Season 5**: Reset auction
- **Even seasons** (2, 4): No auction, keep existing squad

During auction seasons, all teams start fresh and must rebuild their squads through bidding.`
      },
      {
        heading: 'Budget',
        text: `Each team has a total auction budget of **$10,000,000 (10 million USD)**.

This budget must cover:
- All player purchases (18-25 players)
- No additional funds available
- Unspent budget carries over after auction

Budget management is crucial - overspending on stars leaves no money for depth players.`
      },
      {
        heading: 'Auction Process',
        text: `**Player Order**
1. Marquee players (rating 90+) auctioned first
2. Remaining players divided into rounds of 10
3. Players within each round are shuffled randomly

**Bidding Mechanics**
- Each player has a base price
- 10-second bid timer
- Highest bid wins when timer expires
- You can skip bidding on any player

**Bid Increments**
- $0-5k: $500 increments
- $5k-20k: $2,000 increments
- $20k-50k: $5,000 increments
- $50k-100k: $10,000 increments
- $100k+: $20,000 increments`
      },
      {
        heading: 'Base Prices',
        text: `Player base prices are determined by their primary playstyle rating:

| Rating | Base Price | Label |
|--------|-----------|-------|
| 90+ | $200,000 | Elite |
| 80-89 | $100,000 | Premium |
| 65-79 | $50,000 | Standard |
| 50-64 | $20,000 | Emerging |
| Below 50 | $2,000 | Base |

Higher-rated players start at higher prices but may be worth the investment.`
      },
      {
        heading: 'AI Bidding Behavior',
        text: `AI teams bid strategically:

- Target players matching their playstyle needs
- Value multiplier: ~1.2x base price as typical max
- Reserve 30% of budget for minimum squad completion
- Will not overbid beyond calculated player value

This means you can sometimes get bargains if you're patient, but popular players will be contested.`
      },
      {
        heading: 'Strategy Tips',
        text: `**Budget Management**
- Don't spend more than 50% on your first 5 players
- Reserve at least $3M for depth players
- Plan for 20+ players minimum

**Player Selection**
- Prioritize positions you need most
- Balance experience with emerging talent
- Ensure wicket-keeper early

**Bidding Tactics**
- Let AI teams compete on overpriced players
- Target players others overlook
- Fill playstyle quota gaps strategically

**Squad Composition**
- Need 18 minimum, aim for 23-25
- 2-3 openers, 4-5 middle order, 5-6 bowlers
- At least one quality spinner and pacer`
      }
    ]
  },
  {
    id: 'finance-system',
    title: 'Finance System',
    icon: DollarSign,
    content: [
      {
        heading: 'Budget Sources',
        text: `Your team's budget comes from several sources:

**Initial Budget**
- $10,000,000 per season at start
- Same for all teams

**Sponsorship Revenue**
- Based on previous season finishing position
- Higher finish = more lucrative sponsorship
- 1st place gets most, 10th place gets least

**Match Revenue**
- Ticket sales (home matches only)
- Broadcast revenue (all matches)
- Revenue varies by attendance/form

**Prize Money**
- Distributed at season end
- Tiered by final position
- Champion receives largest share`
      },
      {
        heading: 'Expenses',
        text: `Budget is spent on:

**Auction Spending**
- Player purchases during auction
- Largest expense in odd seasons

**Transfer Purchases**
- Mid-season player acquisitions
- Deducted from available budget

**Player Contracts**
- Ongoing salary costs (implicit)
- Already factored into budget

Note: You cannot go into debt. All spending is limited by available funds.`
      },
      {
        heading: 'Financial Strategy',
        text: `**Auction Seasons (1, 3, 5)**
- Most budget goes to player purchases
- Balance star signings with depth
- Keep reserve for mid-season transfers

**Even Seasons (2, 4)**
- Lower spending needs
- Focus on targeted reinforcements
- Build up reserves for next auction

**Long-term Planning**
- Better finishes = more prize money
- Prize money helps future auction budgets
- Winning pays for itself!`
      }
    ]
  },
  {
    id: 'objectives',
    title: 'Board & Objectives',
    icon: ClipboardList,
    content: [
      {
        heading: 'Seasonal Objectives',
        text: `Each season, the board sets **5 objectives** for you to achieve. These represent their expectations and provide goals beyond just winning the championship.

Objectives are generated at season start and tracked throughout. You can view progress on your Home dashboard and in the Inbox.`
      },
      {
        heading: 'Objective Types',
        text: `**Win-Based**
- "Win at least 12 matches this season"
- Based on total victories

**Position-Based**
- "Finish in the top 4"
- Based on final league standing

**Performance-Based**
- "Score 2000+ runs as a team"
- Based on statistical achievements

**Rivalry-Based**
- "Beat [Rival Team] at least twice"
- Head-to-head against a specific opponent

**Streak-Based**
- "Win 3 consecutive matches"
- Requires maintaining winning form`
      },
      {
        heading: 'Tracking Progress',
        text: `Objective progress updates after each match:

- **Active**: Currently in progress
- **Completed**: Objective achieved
- **Failed**: Objective no longer achievable

Check the Objectives Panel on your Home dashboard to monitor status. Some objectives can only be evaluated at season end.`
      },
      {
        heading: 'Impact of Objectives',
        text: `Meeting board expectations has several effects:

**Short-term**
- Inbox messages acknowledging progress
- Sense of achievement

**Long-term**
- Board satisfaction affects reputation
- Better reputation = more flexibility
- Sets foundation for future seasons

Focus on achievable objectives while pursuing the championship!`
      }
    ]
  },
  {
    id: 'teams',
    title: '10 WPL Teams',
    icon: MapPin,
    content: [
      {
        heading: 'Team Overview',
        text: `The World Premier League features 10 teams from cricket-playing nations. Each team has its own identity and starting roster.`
      },
      {
        heading: 'The Teams',
        text: `**Chennai Cobras** (India)
Based in Chennai, representing the passionate Indian cricket market.

**London Lions** (England)
The English franchise, bringing County cricket tradition.

**Sydney Sharks** (Australia)
Australian representation with Big Bash heritage.

**Pretoria Pythons** (South Africa)
South African team from the capital city.

**Multan Markhors** (Pakistan)
Pakistani franchise from the historic cricket city.

**Colombo Crocodiles** (Sri Lanka)
Sri Lankan team from the commercial capital.

**Dhaka Dolphins** (Bangladesh)
Representing Bangladesh's growing cricket scene.

**Georgetown Jaguars** (West Indies)
Caribbean team with West Indian flair.

**Auckland Orcas** (New Zealand)
New Zealand franchise from the largest city.

**Kabul Kites** (Afghanistan)
Afghanistan's representative, the rising cricket nation.`
      }
    ]
  },
  {
    id: 'tips',
    title: 'Tips & Strategy',
    icon: Lightbulb,
    content: [
      {
        heading: 'Auction Strategy',
        text: `**Don't blow budget early**
- Resist bidding wars on first 3 elite players
- Let others overpay, find value later
- Reserve at least 30% for depth

**Target undervalued playstyles**
- Death bowlers are crucial but often overlooked
- Finishers win close games
- Quality spinners control middle overs

**Build for balance**
- Don't stack one position
- Need 2-3 quality options at each role
- All-rounders provide flexibility`
      },
      {
        heading: 'Tactics & Match Day',
        text: `**Match playstyles to roles**
- High "Opener - Anchor" rating? Bat them first
- High "Death Specialist"? Save their overs for 17-20
- Misalignment wastes potential

**Adjust acceleration appropriately**
- Early wickets? Drop to Build or Rotate
- Chasing big? Attack or Power-Hit
- Defending? Don't be too conservative

**Bowling plan coordination**
- Swing bowlers early with new ball
- Spinners in middle overs
- Death specialists for final 4 overs

**Watch the modifiers**
- Expand the modifier panel to see active effects
- Understand why your players are performing well/poorly
- Adjust tactics to maximize positive modifiers`
      },
      {
        heading: 'Squad Management',
        text: `**Rotation is key**
- Don't play same XI every match
- Rest star players occasionally
- Keep bench players match-ready

**Monitor fitness**
- Sub-100% fitness = reduced performance
- Injuries happen - need backup options
- Fresh players outperform tired stars

**Development matters**
- Young players improve over seasons
- Give prospects game time
- Balance now vs future`
      },
      {
        heading: 'NRR Optimization',
        text: `**When winning comfortably:**
- Don't ease off, maximize margin
- Chase targets quickly
- Every run counts for NRR

**When losing:**
- Avoid all-out collapses
- Bat out overs even if losing
- Don't give free runs

**League phase importance**
- NRR often decides playoff spots
- Early season NRR matters late
- Treat every match seriously`
      },
      {
        heading: 'Long-term Thinking',
        text: `**Season progression**
- Early losses aren't fatal
- Consistency beats streakiness
- Peak at the right time (playoffs)

**Financial planning**
- Prize money funds future
- Winning helps winning
- Invest in squad quality

**Learning curve**
- First season: Learn systems
- Second season: Optimize
- Third season+: Compete for titles`
      }
    ]
  }
];

export default manualSections;
