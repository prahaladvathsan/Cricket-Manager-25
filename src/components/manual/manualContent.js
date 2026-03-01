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
        heading: 'Hey! Welcome to Cricket Manager',
        text: `First off, thanks for checking out Cricket Manager! I'm super excited to have you here. This was a passion prject that I built while moonlighting my job and coding over the weekends , so it really means a lot to me that you're interested in playing.

This is a T20 cricket management game where you take control of one of 10 fictional World Premier League (WPL) teams. Think of it like Football Manager, but for cricket nerds.


What you'll be doing:
- Building your squad through auctions and transfers
- Setting up tactics and strategies for matches
- Keeping your players fit and in form
- Meeting the board's expectations (or ignoring them, your call)
- Chasing that WPL championship trophy`
      },
      {
        heading: 'Getting Into Your First Game',
        text: `Hit "Start New Game" from the menu and pick one of the 10 WPL teams. They all have different starting rosters, so have a quick look before committing.

Here's what happens next:
1. The board sends you a welcome message (they're optimistic about you, for now)
2. You'll drop into the Preseason phase
3. Odd seasons (1, 3, 5) start with an auction - time to build your squad from scratch
4. Even seasons (2, 4) let you keep your existing squad and just tweak through transfers`
      },
      {
        heading: 'The Interface (Where Everything Lives)',
        text: `**Header Bar**: This shows your team name, what day/week it is, the current season phase, and that all-important Continue button.

**Sidebar**: Your main navigation hub:
- Home: Your dashboard - objectives, team overview, all that good stuff
- Squad: Check out all 25 players on your roster
- Tactics: Set up your playing XI and game plans
- League: Standings, fixtures, who's winning, who's not
- Transfers: Buy and sell players when the window's open
- Inbox: Messages from the board and match summaries

**Main Area**: Whatever screen you clicked on shows up here with all the details you need.`
      }
    ]
  },
  {
    id: 'game-flow',
    title: 'Game Flow & Progression',
    icon: Calendar,
    content: [
      {
        heading: 'That Continue Button (Your Best Friend)',
        text: `See that Continue button in the header? That's how you move time forward. Every click = one day passes and stuff happens.

The button text tells you what's coming up:
- "Continue": Just a regular day, nothing special
- "Matchday": You've got a match today
- "Play Match" / "Quick-Sim": Time to actually play or simulate your match
- "Auction": Auction day - get your wallet ready
- "Simulate Match": Other teams are playing, not your problem`
      },
      {
        heading: 'How Time Works Here',
        text: `I'm tracking time with a few different counters:

**Game Day**: Starts at Day 1, goes up every time you hit Continue. Simple.

**Week Counter**: Goes from Week 1 to 52 in each season.

**Season Number**: Which season you're in - Season 1, 2, 3... you get it.

**Season Phase**: Where you are in the season determines what you can do.`
      },
      {
        heading: 'The Four Phases of a Season',
        text: `Every season flows through these four phases:

**Preseason**
- Auction time if it's an odd season (1, 3, 5)
- Get your squad sorted
- No real matches yet

**League Phase**
- The main event: 90 matches across 45 matchdays
- Double round-robin (you play everyone twice)
- Rack up those points

**Playoffs**
- Top 4 teams make it
- 4 knockout matches to crown a champion
- Qualifier 1, Eliminator, Qualifier 2, and the Final

**Offseason**
- Season wrap-up and prize money
- Transfer window opens up
- Prep for next season`
      },
      {
        heading: 'What Pops Up on the Calendar',
        text: `Different events show up as you progress:

- **match**: League or playoff game
- **auction**: Player draft (odd seasons only)
- **new_season_start**: New season kicks off
- **season_end**: Season wraps up, prizes handed out
- **transfer_window_open/close**: When you can buy/sell players`
      }
    ]
  },
  {
    id: 'match-system',
    title: 'Match System',
    icon: Gamepad2,
    content: [
      {
        heading: 'Two Ways to Play Matches',
        text: `**Play Match (Interactive)**: Watch every ball unfold with full control. You can tweak batting acceleration, bowling plans, and field settings mid-match. Great for big games.

**Quick-Sim (Automated)**: Hit the button, instant result. The engine runs the match based on your tactics and team quality. Perfect when you just want to move through the season faster.`
      },
      {
        heading: 'Before Kickoff',
        text: `Every match needs a bit of setup first:

**Toss**: Random coin flip, winner picks batting or bowling. Classic cricket stuff.

**Playing XI**: Pick your 11 from your squad of 25.

**Batting Order**: Line them up from opener at #1 down to #11.

**Bowling Order**: Decide who bowls which overs.

**Bowling Plans**: Set up your tactical approach for each bowler.

**Field Formation**: Attacking, neutral, or defensive. Your call.`
      },
      {
        heading: 'The Match Screen (Interactive Mode)',
        text: `When you're watching a match, you get three panels:

**Left Panel - Tactics Hub**
- Who's batting and bowling right now
- Batting acceleration slider
- Bowling plan tweaks
- Field formation changes

**Center Panel - The Pitch**
- 2D field view
- Ball trajectory after each delivery
- Where all the fielders are standing
- Watch the action unfold

**Right Panel - Stats**
- Live scorecard
- Current partnership
- Run rate graphs (worm chart, Manhattan)
- Over-by-over summary`
      },
      {
        heading: 'How the Match Engine Actually Works',
        text: `Every single ball goes through this 4-step process under the hood:

**Step 1: Decision Phase**
- Bowler picks what delivery to bowl (based on attributes + bowling plan)
- Batter decides what shot to play (based on attributes + mentality)

**Step 2: Contact Quality**
- Engine calculates how well bat meets ball
- Formula: (timing + footwork + technique) vs (accuracy + swing + speed)
- Throws in some variance (d40 dice roll) for unpredictability
- Shot power comes out between 20-120 mph

**Step 3: Trajectory**
- Where's the ball going? Full 360-degree field
- Placement attribute determines direction
- Spits out exact coordinates on the 2D field

**Step 4: Fielding**
- 9 fielders are positioned based on your formation
- Each one checks if they can intercept
- Physics-based calculations for catches, boundaries, runs`
      },
      {
        heading: 'The 7-Stage Modifier Chain',
        text: `Player attributes don't stay static during a match. They get modified by 7 different things in sequence:

1. **Playstyle**: Bonuses or penalties from their playstyle rating
2. **Tactics**: Your team's tactical setup
3. **Mentality**: Current batting/bowling mentality
4. **Matchups**: Batter vs this type of bowler
5. **Confidence**: How they've been performing lately
6. **Energy**: Fatigue taking its toll
7. **Context**: Match situation (pressure, winning/losing, etc.)`
      }
    ]
  },
  {
    id: 'tactics',
    title: 'Tactics Deep Dive',
    icon: Target,
    content: [
      {
        heading: 'Your Tactics Screen (5 Tabs)',
        text: `The Tactics screen is split into 5 tabs where you set everything up:

**1. Overview**
Quick summary of your whole tactical setup - XI, playstyles, settings. One glance shows it all.

**2. Playing XI & Playstyles**
Pick your 11 and assign each one their playstyle for this match.

**3. Batting Order**
Set your batting lineup from 1 to 11. Don't forget to mark your keeper.

**4. Bowling Plans**
Choose bowling plans for each bowler - different plans for different phases if you want.

**5. Fielding**
Attack, neutral, or defend? Your field placement strategy.

**Note**: Tactics screen is locked until you complete the auction (can't set tactics without players!). If you have validation errors, use the "Generate Default Tactics" button to auto-fix.`
      },
      {
        heading: 'Acceleration Tiers (How Aggressive You Bat)',
        text: `During matches, you control how aggressively your batsmen play with these 6 tiers. Each one changes the odds of what shot they'll attempt and tweaks their attributes:

| Tier | Description | Def % | Neu % | Att % | Bonuses | Penalties | Boosted Playstyles |
|------|-------------|-------|-------|-------|---------|-----------|-------------------|
| Blockade | Ultra Defensive - Survival | 66% | 25% | 9% | +2 judgement | -2 range360 | Opener-Anchor, Wall |
| Build | Consolidate - Platform | 50% | 33% | 17% | +2 creativity | -1 placement, -1 technique | Opener-Anchor, Wall |
| Rotate | Singles Focus - Rotation | 25% | 50% | 25% | +2 speed | -2 strength | Balanced styles, Runner |
| Cruise | Controlled Aggression | 17% | 33% | 50% | +1 placement, +1 footwork | -2 judgement | Balanced styles, Runner |
| Blitz | High Risk Attack | 9% | 25% | 66% | +2 timing, +1 technique | -3 judgement | All Sloggers, Pinch-Hitter |
| Hit Out/Get Out | Maximum Attack | 5% | 5% | 90% | +2 strength, +2 timing | -2 judgement, -2 speed | All Sloggers, Pinch-Hitter |

AUTO-TIER SELECTION: The game calculates batting pressure (0-100 scale) and automatically selects tiers based on thresholds: <20 (Blockade), <35 (Build), <50 (Rotate), <65 (Cruise), <80 (Blitz), 80+ (Hit Out/Get Out). Manual override available during matches.`
      },
      {
        heading: 'Bowling Plans (The Real Tactics Nerd Stuff)',
        text: `Each bowler gets TWO plans: a Line/Length plan and a Variation plan. The game adds up the tendency scores from both and turns them into percentages for delivery mentality. Match the plans to the bowler's playstyle and they get a +10 rating boost (bowlers can stack this for both plans).

PACE BOWLING PLANS

| Category | Plan | Description | Att | Neu | Def | Bonuses | Penalties | Boosted |
|----------|------|-------------|-----|-----|-----|---------|-----------|---------|
| Line/Length | Attacking Line | Stumps + Pads targeting | 7 | 2 | 1 | +2 swing | -2 accuracy | Swing Bowler |
| Line/Length | Wide Line | Outside off-stump | 1 | 4 | 5 | +2 accuracy | -2 att.bowling | Hit-the-Deck |
| Line/Length | Short-Pitched | Bouncers, short balls | 3 | 3 | 4 | +2 speed | -2 accuracy | Short-Ball |
| Line/Length | Yorker Execution | Death specialist yorkers | 3 | 1 | 6 | +2 accuracy | -2 speed | Death Specialist |
| Variation | Pace Variation Mix | Slower balls, changes | 4 | 4 | 2 | +2 variations | -2 accuracy | Death Specialist |
| Variation | Swing/Seam Focus | Conventional movement | 6 | 3 | 1 | +2 swing | -2 variations | Swing Bowler |
| Variation | Bouncer Barrage | Aggressive short ball | 7 | 1 | 2 | +2 speed | -2 accuracy | Short-Ball |
| Variation | Consistent Accuracy | Repeating line/length | 1 | 5 | 4 | +2 accuracy | -2 att.bowling | Hit-the-Deck |

SPIN BOWLING PLANS

| Category | Plan | Description | Att | Neu | Def | Bonuses | Penalties | Boosted |
|----------|------|-------------|-----|-----|-----|---------|-----------|---------|
| Line/Length | Flight & Loop | Traditional flight/dip | 4 | 2 | 4 | +2 flight | -2 accuracy | Classical |
| Line/Length | Flat & Fast | Quick, skiddy deliveries | 1 | 2 | 7 | +2 accuracy | -2 flight | Flat Spinner |
| Line/Length | Wide of Off | Outside off-stump line | 3 | 1 | 6 | +2 accuracy | -2 turn | Containment |
| Line/Length | Stumps Attack | Attacking the stumps | 6 | 3 | 1 | +2 turn | -2 accuracy | Mystery |
| Variation | Turn Candy Bag | Multiple turn variations | 7 | 2 | 1 | +2 variations | -2 accuracy | Mystery |
| Variation | Flight Variation | Varying flight/loop | 2 | 4 | 4 | +2 flight | -2 turn | Classical |
| Variation | Pace Variation | Changes of pace | 1 | 3 | 6 | +2 variations | -2 turn | Flat Spinner |
| Variation | Consistent Line | Metronomic accuracy | 1 | 5 | 4 | +2 accuracy | -2 variations | Containment |

**Example**: Swing Bowler using "Attacking Line" (7-2-1) + "Swing/Seam Focus" (6-3-1) = 13 attacking, 5 neutral, 2 defensive → 65% attacking, 25% neutral, 10% defensive mentality.`
      },
      {
        heading: 'Team Mentalities (The Vibe)',
        text: `Your overall team mentality shifts how everyone approaches the game:

**Batting Mentality**
- Aggressive: Go for more attacking shots, take more risks
- Neutral: Balanced, standard T20 cricket
- Conservative: Play it safe, protect wickets

**Bowling Mentality**
- Aggressive: Hunt wickets, don't worry too much about runs
- Neutral: Balance between wickets and economy
- Conservative: Tight lines, build dot ball pressure

Pick based on the match situation and your gut feeling.`
      }
    ]
  },
  {
    id: 'squad-management',
    title: 'Squad Management',
    icon: Users,
    content: [
      {
        heading: 'Your Squad Size',
        text: `You need between 18 and 25 players on your roster:

- **Minimum**: 18 (can't go below this or you're screwed)
- **Maximum**: 25 (hard cap)

Make sure you've got depth across the board:
- A couple opener options
- Middle-order cover
- All-rounders for flexibility
- Mix of pace and spin bowlers
- At least one keeper (obviously)`
      },
      {
        heading: 'Player Roles (The Basics)',
        text: `**Batsman**: Can bat, can't bowl (or barely can)
**Bowler**: Bowls pace or spin, bats at 8-11 usually
**All-Rounder**: Does both decently, super valuable
**Wicket-Keeper**: Keeps wickets, usually bats middle/lower, need one in every XI`
      },
      {
        heading: 'Player Attributes (What the Numbers Mean)',
        text: `Every player's got attributes rated from 1 to 20:

**Batting Attributes**
- Technique: Can they actually play proper cricket shots?
- Timing: How well they connect bat to ball
- Footwork: Do they move to the ball or just stand there?
- Aggression: Natural attacking instinct
- Concentration: Can they build an innings or do they get bored?
- Placement: Shot direction control
- Power/Strength: Big hits or gentle nudges?

**Bowling Attributes**
- Accuracy: Line and length control
- Speed/Pace: How fast do they bowl?
- Swing: Ball movement through the air
- Turn: How much spin (for spinners)
- Variations: Different deliveries in the arsenal
- Intelligence: Cricket IQ, tactical awareness

**Fielding Attributes**
- Catching: Do they hold onto it?
- Ground Fielding: Stopping and throwing
- Agility: Speed around the field`
      },
      {
        heading: 'Player Condition (Keep an Eye On This)',
        text: `Three things affect how your players perform:

**Fitness (0-100)**
- Drops as they play matches
- Low fitness = worse performance
- Recovers when they rest
- Rotate your squad or they'll burn out

**Injuries**
- Happens randomly during matches (sucks but it's cricket)
- Recovery takes 1-3 weeks depending on severity
- Injured players can't be selected
- Check the squad screen for recovery status

**Form**
- Recent performances affect their confidence
- Good form = small attribute bump
- Bad form = small attribute drop
- It swings based on their last few games`
      },
      {
        heading: 'Transfer Market (Buying and Selling)',
        text: `The transfer window opens up during offseason (usually weeks 22-26):

**Selling**
- List a player at whatever price you want
- Other teams might buy them
- You get the money and a free roster spot

**Buying**
- Browse what's available from other teams
- Pay the asking price, instant transfer
- Need budget and roster space

No haggling, no negotiations. List price or nothing. Budget wisely to patch up your squad's weak spots.`
      }
    ]
  },
  {
    id: 'playstyle-system',
    title: 'Playstyle System',
    icon: Sparkles,
    content: [
      {
        heading: 'Playstyles (The Most Important Thing)',
        text: `Okay, this is where the game gets deep. Every player has ratings (0-100) for 24 different playstyles. These ratings determine how well they perform in specific roles and situations. During matches, active playstyles modify their attributes using this formula:

**Modified Attribute = Base Attribute × (1 + Playstyle Rating × Scaling Factor)**

Higher ratings = bigger bonuses. If you match a player's playstyle to the right acceleration tier (batters) or bowling plan (bowlers), they get a +10 rating boost. Bowlers can stack this for both their plans.`
      },
      {
        heading: 'What the Ratings Actually Mean',
        text: `**90-100**: Elite - This is their bread and butter, world-class
**75-89**: Excellent - They're really good at this
**60-74**: Good - Solid, reliable option
**45-59**: Average - Meh, can do it if you need them to
**Below 45**: Weak - Please don't use them like this

Quick rule: Players with 75+ playstyle ratings get the full bonuses. Below that? The effects scale down proportionally.`
      },
      {
        heading: 'Batting Playstyles Table',
        text: `| Playstyle | Category | Active Conditions | Key Bonuses | Penalties |
|-----------|----------|-------------------|-------------|-----------|
| Opener - Slogger | Opener | Powerplay, Early overs (≤8) | +40% pace-facing, +35% technique (powerplay), +35% aggression | -30% technique, -25% concentration (always) |
| Opener - Balanced | Opener | Powerplay, 7+ wickets | +40% pace-facing, +30% concentration/def.shots | -30% concentration (overs 7-12 post-powerplay) |
| Opener - Anchor | Opener | ≤6 wickets, 7+ wickets | +50% concentration, +40% judgement (pressure), +30% def.shots | -30% attacking (overs 7-12 post-powerplay) |
| Top Order - Slogger | Top Order | Overs 7-12 (spin), 7-16 (middle) | +50% vs spin, +40% judgement/creativity | -50% attacking, -40% range (≤5 wickets) |
| Top Order - Balanced | Top Order | Always, 6+ wickets | +25% concentration/technique, +30% judgement | -50% attacking (≤5 wickets) |
| Top Order - Anchor | Top Order | Overs 7-12 (spin), 6+ wickets | +50% vs spin, +30% judgement, +30% def.shots | -50% attacking (death phase) |
| Middle Order - Slogger | Middle | Overs 7-16 | +60% attacking shots, +40% strength, +40% judgement | -50% attacking (≤4 wickets) |
| Middle Order - Balanced | Middle | Overs 7-12 (spin), 7-16 (pace) | +50% vs spin, +40% vs pace, +30% footwork | -30% attacking (RRR > CRR) |
| Middle Order - Anchor | Middle | ≤7 wickets, 20+ partnership | +40% concentration, +35% judgement, +30% technique | -30% attacking (RRR > CRR) |
| Lower Order - Slogger | Lower | ≤5 wickets, High pressure | +50% attacking, +40% strength (tail), +45% timing (pressure) | -40% technique/concentration (powerplay) |
| Lower Order - Balanced | Lower | Always, ≤60 balls left | +30% bowling adaptation, +35% timing (time mgmt) | -40% attacking (powerplay) |
| Lower Order - Anchor | Lower | ≤5 wickets, ≤60 balls | +60% concentration (immovable), +35% def.shots | -30% attacking (RRR > CRR) |
| Finisher | Specialist | Death phase (17-20), RRR > CRR | +70% attacking/strength (death), +50% timing (pressure) | -40% technique/judgement (overs ≤12) |
| Runner | Specialist | Always, CRR ≥ RRR | +40% speed/footwork (rotation), +25% concentration | -35% strength, -30% boundary power (RRR > CRR) |
| Pinch-Hitter | Specialist | ≤10 balls faced, Always | +60% attacking/creativity (instant), +40% range | -50% concentration, -40% technique (always) |
| Wall | Specialist | Always, ≤60 balls (CRR > RRR) | +50% def.shots, +40% concentration, +35% judgement | -40% attacking (RRR > CRR) |

NOTE: Percentages show maximum effectiveness at 100 rating. Actual effect scales with player's playstyle rating.`
      },
      {
        heading: 'Bowling Playstyles Table',
        text: `| Playstyle | Type | Active Conditions | Key Bonuses | Penalties |
|-----------|------|-------------------|-------------|-----------|
| Swing Bowler | Pace | Overs ≤6, vs weak technique | +50% swing (new ball), +40% accuracy, +35% seam vs technique <13 | -40% accuracy, -35% swing (overs ≥14) |
| Hit-the-Deck Seamer | Pace | Overs ≤6, Middle overs 7-16 | +45% speed (hard length), +40% accuracy, +35% pressure | -35% accuracy, -30% speed (3+ overs bowled, fatigue) |
| Short-Ball Specialist | Pace | Vs weak footwork, concentration | +55% speed (hostility), +40% aggression, +35% psychological | -40% accuracy (3+ overs, fatigue), +1 flat aggression bonus |
| Death Specialist | Pace | Overs ≥17, RRR > CRR | +60% accuracy (yorkers), +45% variations, +40% calm | -45% accuracy, -35% variations (overs ≤6 powerplay) |
| Classical Spinner | Spin | Overs 7-16, vs weak footwork | +50% flight/dip, +40% loop, +35% turn | -40% accuracy (powerplay), Reduces batsman judgement -1 |
| Flat Spinner | Spin | Overs ≤10, vs weak footwork | +45% accuracy, +40% speed (skiddy), +35% quick-through-air | -20% turn effectiveness (always) |
| Mystery Spinner | Spin | Vs weak technique, 30+ partnership | +60% variations, +45% deception, +40% trick balls | -45% accuracy (powerplay/death), Reduces batsman judgement -2 |
| Containment Spinner | Spin | Overs ≤12, CRR < RRR | +50% accuracy (metronomic), +40% dot pressure, +35% line/length | -30% wicket threat (always), Reduces concentration -1 |

NOTE: Percentages show maximum effectiveness at 100 rating. Special effects (judgement/concentration reductions) apply regardless of rating.`
      },
      {
        heading: 'Playstyle Abbreviations (UI Reference)',
        text: `Throughout the game interface, playstyles are shown with abbreviated codes for space efficiency. Hover over any abbreviation to see the full playstyle name.

**BATTING PLAYSTYLES**

Positional Roles:
• O-SLG: Opener - Slogger
• O-BAL: Opener - Balanced
• O-ANC: Opener - Anchor
• T-SLG: Top Order - Slogger
• T-BAL: Top Order - Balanced
• T-ANC: Top Order - Anchor
• M-SLG: Middle Order - Slogger
• M-BAL: Middle Order - Balanced
• M-ANC: Middle Order - Anchor
• L-SLG: Lower Order - Slogger
• L-BAL: Lower Order - Balanced
• L-ANC: Lower Order - Anchor

Specialist Roles:
• S-FIN: Finisher
• S-RUN: Runner
• S-PNH: Pinch-Hitter
• S-WAL: Wall

**BOWLING PLAYSTYLES**

Pace Bowlers:
• P-SWG: Swing Bowler
• P-HTD: Hit-the-Deck Seamer
• P-SBS: Short-Ball Specialist
• P-DTH: Death Specialist

Spin Bowlers:
• S-CLS: Classical Spinner
• S-FLT: Flat Spinner
• S-MYS: Mystery Spinner
• S-CTN: Containment Spinner

**FIELDING PLAYSTYLE**

• WKP: Wicketkeeper

**Color Coding**: Abbreviations are color-coded by prefix - batting positions use a blue/green/yellow/orange gradient, specialists use pink, pace bowling uses red, spin bowling uses purple, and wicketkeeping uses cyan.`
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
- $100k+: $20,000 increments

**Auto-Bid Toggle**
- Controls AI bidding behavior when you skip players
- **ON (Green)**: AI automatically bids for you during skips (default)
- **OFF (Red)**: You maintain full manual control - skipping won't acquire players
- Safety: If you try to end auction with <18 players and auto-bid OFF, it temporarily enables to meet minimum
- Located in the bid controls row next to manual bid buttons

**Navigation Lock**
- You cannot navigate away from the auction screen while it's in progress
- This prevents accidental data loss or auction abandonment
- Complete the auction (or use "Skip to End") to unlock navigation`
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
- Keep reserve for off-season transfers

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
        heading: 'Auction Economics (What the Numbers Tell You)',
        text: `**Bidding Patterns**
- Early marquee players (90+ rating) average 150-200% of base price due to competition
- Mid-auction players (rounds 3-8) cost 100-120% of base price
- Final rounds often yield players at base price with limited bidding

**Budget Allocation Data**
- Squads requiring 18-25 players with $10M total budget
- 30-40% allocation for first 10 players maintains balanced completion
- AI teams reserve 30% budget minimum for squad minimums (18 players)
- Elite player base prices: $200k (90+), $100k (80-89), $50k (65-79), $20k (50-64), $2k (<50)

**Playstyle Market Value**
- Death Specialists cost 10-15% below other elite bowlers despite match-winning impact
- Finisher ratings 75+ produce 25-30% higher win rates in close matches (<10 run margins)
- Classical Spinners control middle overs (7-16) with 15-20% economy improvement vs pace`
      },
      {
        heading: 'Tactical Mechanics',
        text: `**Playstyle-Role Matching**
- Players with 75+ playstyle ratings receive full conditional modifiers (up to +70% attributes)
- 50-74 ratings apply 50-70% effectiveness
- Below 50 ratings produce minimal or negative effects
- Example: 85-rated Finisher gains +60% attacking/strength in overs 17-20

**Acceleration Tier Effects**
- Build (50% def/33% neu/17% att) reduces dismissal rate by 40% vs Cruise
- Blitz (9% def/25% neu/66% att) increases boundary% by 55% but dismissal rate +30%
- Auto-tier selection engages at pressure thresholds: 20/35/50/65/80

**Bowling Plan Combinations**
- Matching playstyle + 2 plans receives +10 rating boost per match (stacking for bowlers)
- Swing Bowler + Attacking Line + Swing/Seam Focus = 65% attacking mentality
- Death Specialist + Yorker + Pace Variation = +4 accuracy, +2 variations (compound modifiers)

**Modifier Chain Impact**
- 7-stage chain (Playstyle→Tactics→Mentality→Matchups→Confidence→Energy→Context)
- Each stage applies multiplicatively: Final Attribute = Base × (1 + Σ modifiers)
- Elite playstyle match (90+) can produce 150-180% effective attributes under optimal conditions`
      },
      {
        heading: 'Squad Management Metrics',
        text: `**Fitness Performance Correlation**
- 100% fitness: Full attribute effectiveness
- 80-99% fitness: 5-10% attribute reduction
- 60-79% fitness: 15-25% attribute reduction
- Below 60%: 30-40% attribute reduction, increased injury risk

**Squad Depth Requirements**
- Minimum 18 players (league minimum)
- Optimal 23-25 players for rotation without budget waste
- 2-3 openers, 4-5 middle order, 5-6 specialist bowlers, 1-2 all-rounders recommended
- Injury rate: ~5-10% per match, recovery 1-3 weeks depending on severity

**Development System**
- Player attributes naturally change over seasons (data-driven progression)
- Match exposure affects form modifiers (+5 to -5 attribute swing)
- No fixed "development" mechanic - performance-based variation`
      },
      {
        heading: 'NRR Calculation & Impact',
        text: `**NRR Formula**
NRR = (Total Runs Scored / Total Overs Faced) - (Total Runs Conceded / Total Overs Bowled)

**Margin Impact Examples**
- Winning by 30 runs (8 overs remaining): +0.15 to +0.20 NRR gain
- Winning by 5 runs: +0.02 to +0.05 NRR gain
- Losing by 30 runs (all out over 50): -0.20 to -0.25 NRR loss
- Losing by 5 runs batting 20 overs: -0.05 to -0.08 NRR loss

**Playoff Qualification**
- Positions 3-6 often separated by 0.05-0.15 NRR at season end
- Single heavy defeat (-0.25 NRR) requires 3-4 moderate wins (+0.07 each) to offset
- Batting out overs when losing reduces NRR damage by 40-60%
- Chasing quickly (2-3 overs early) adds +0.03 to +0.08 per match

**Strategic Implications**
- Every run differential compounds over 18 matches
- Early-season NRR carries equal weight to late-season NRR
- All-out collapses (10 wickets in <15 overs) produce maximum NRR damage`
      },
      {
        heading: 'Competitive Progression',
        text: `**League Competitive Balance**
- 10 teams with double round-robin (18 matches each, 90 total)
- Points distribution: Win=2, Tie/NR=1, Loss=0
- Historical qualification: 7-8 wins typically secure 4th place (14-16 points)
- Championship contention: 12+ wins (24+ points) for top 2 finish

**Financial Cycle**
- Season 1/3/5: Auction phase ($10M budget allocation)
- Season 2/4: No auction (transfer market only)
- Prize money scales: 1st place ~$2M, 10th place ~$200k
- Sponsorship revenue correlates with previous season finish (+30% for champion vs last place)

**Skill Development Path**
- Match engine processes ~50,000+ balls/second with 4-step algebraic calculation
- 7-stage modifier chain determines final outcomes
- Understanding conditional playstyle activation improves team selection efficiency
- Playstyle-role alignment produces 20-30% performance improvement over mismatched selections`
      }
    ]
  }
];

export default manualSections;
