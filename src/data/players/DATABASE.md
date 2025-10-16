# Player Database Documentation

## Master Player Database v2.0.0

The Cricket Manager uses a **single master player database** with all playstyle data pre-calculated for optimal performance.

### Database Location

```
src/data/players/master_player_database.json
```

**File Size**: 5.6 MB
**Players**: 1,431
**Schema Version**: player-schema.json v2.0.0

---

## Database Structure

The master database follows this structure:

```json
{
  "version": "2.0.0",
  "generated": "2025-10-04T05:33:32.004Z",
  "configVersions": {
    "playstyle-weightings": "1.0.0",
    "playstyle-modifiers": "1.0.0"
  },
  "playerCount": 1431,
  "schema": "player-schema.json v2.0.0",
  "description": "Master player database with pre-calculated playstyle ratings and top 3 playstyles",
  "players": [ ...player objects... ]
}
```

### Player Object Schema

Each player contains:

#### Core Identity
- `id`: Unique identifier
- `name`: Display name
- `fullName`: Full legal name
- `age`: Current age
- `nationality`: ISO country code (IND, AUS, ENG, etc.)

#### Role & Style
- `role`: batsman | bowler | all-rounder | wicket-keeper
- `battingHand`: right | left
- `bowlingHand`: right | left | null
- `bowlingType`: fast | medium | off-spin | leg-spin | etc.

#### Attributes (1-20 scale)
- **Batting**: technique, timing, footwork, placement, range360, defensiveShots, neutralShots, attackingShots, vsPace, vsSpin
- **Bowling**: accuracy, bowlingSpeed, swing, turn, variations, intelligence, defensiveBowling, neutralBowling, attackingBowling
- **Physical**: strength, speed, agility, maxFitness, endurance, stamina
- **Fielding**: catching, reflexes, groundFielding, throwPower, throwAccuracy
- **Mental**: concentration, temperament, aggression, judgement, leadership

#### Stats
- **careerStats**: matches, innings, runs, wickets, catches, stumpings
- **seasonStats**: matches, innings, runs, wickets, catches, stumpings

#### Condition (0-100 scale)
- `form`: Current form level
- `fitness`: Physical fitness
- `fatigue`: Fatigue level
- `morale`: Player morale
- `injury`: null | minor | moderate | severe

#### Playstyle Data ✨ NEW IN v2.0.0

**All Playstyle Ratings** (0-100 scale):
```json
"playstyleRatings": {
  "batting": {
    "Opener - Slogger": 66.1,
    "Opener - Balanced": 67.6,
    "Opener - Anchor": 67.2,
    "Top Order - Slogger": 67.1,
    "Top Order - Balanced": 66.5,
    "Top Order - Anchor": 66.3,
    "Middle Order - Slogger": 67.5,
    "Middle Order - Balanced": 65.5,
    "Middle Order - Anchor": 65.6,
    "Lower Order - Slogger": 65.5,
    "Lower Order - Balanced": 63.9,
    "Lower Order - Anchor": 64.6,
    "Finisher": 67.2,
    "Runner": 62.7,
    "Pinch-Hitter": 64.1,
    "Wall": 65.2
  },
  "bowling": {
    "New Ball": 45.5,
    "Striker": 44.7,
    "Heartbreaker": 43.7,
    "Death Bowler": 43.3,
    "Workhorse": 42.3,
    "Magician": 42.2,
    "Controller": 43.8,
    "Janitor": 43.2,
    "Tactician": 42.5,
    "Balanced": 41.1
  }
}
```

**Top 3 Playstyles** (quick reference):
```json
"topPlaystyles": {
  "batting": [
    { "name": "Opener - Balanced", "rating": 67.6 },
    { "name": "Middle Order - Slogger", "rating": 67.5 },
    { "name": "Opener - Anchor", "rating": 67.2 }
  ],
  "bowling": [
    { "name": "New Ball", "rating": 45.5 },
    { "name": "Striker", "rating": 44.7 },
    { "name": "Controller", "rating": 43.8 }
  ]
}
```

**Primary Playstyle** (highest rated for role):
```json
"primaryPlaystyle": {
  "batting": "Opener - Balanced",
  "bowling": null
}
```

#### Contract
- `salary`: Contract salary
- `duration`: Contract duration
- `retentionStatus`: available | retained | released

---

## Rebuilding the Master Database

If you need to regenerate the master database (e.g., after updating playstyle weightings or modifiers):

```bash
node scripts/buildMasterPlayerDatabase.js
```

This script:
1. Loads the source player data from `enhanced_player_database_gma.json`
2. Calculates all playstyle ratings for 1,431 players (~296ms)
3. Determines top 3 playstyles for each category
4. Identifies primary playstyles based on role
5. Generates the master database with metadata
6. Saves to `src/data/players/master_player_database.json`

**Alternative Script**: `updateMasterPlayerDatabase.js` - Directly reads from `enhanced_player_database_gma.json` and performs all transformations and calculations.

---

## Usage in Code

### Loading the Database

```javascript
import fs from 'fs';

const masterDb = JSON.parse(
  fs.readFileSync('src/data/players/master_player_database.json', 'utf8')
);

console.log(`Loaded ${masterDb.playerCount} players`);
console.log(`Database version: ${masterDb.version}`);
console.log(`Generated: ${masterDb.generated}`);

const players = masterDb.players;
```

### Accessing Player Playstyles

```javascript
const player = players[0];

// Access primary playstyle
console.log(`Primary batting style: ${player.primaryPlaystyle.batting}`);

// Access top 3 batting playstyles
player.topPlaystyles.batting.forEach((style, i) => {
  console.log(`${i + 1}. ${style.name}: ${style.rating.toFixed(1)}/100`);
});

// Access all playstyle ratings
const openerRating = player.playstyleRatings.batting['Opener - Balanced'];
console.log(`Opener - Balanced rating: ${openerRating.toFixed(1)}/100`);
```

### Using with Zustand Store

```javascript
import { usePlayerStore } from '../stores/playerStore';

// Initialize store with master database
const masterDb = JSON.parse(
  fs.readFileSync('src/data/players/master_player_database.json', 'utf8')
);

usePlayerStore.getState().initializePlayers(masterDb.players);

// Access players
const player = usePlayerStore.getState().getPlayer('1151288');
console.log(player.primaryPlaystyle.batting);
```

---

## Performance Benefits

### Before (Runtime Calculation)
- Database size: 2.1 MB
- Load time: ~50ms
- Playstyle calculation: ~1ms per player on first access
- Total for 1,431 players: ~1,431ms if all accessed

### After (Pre-Calculated)
- Database size: 5.6 MB
- Load time: ~100ms
- Playstyle access: Instant (already in memory)
- Total: **~100ms** ⚡

**Performance gain: ~14x faster for full database access**

---

## Version History

### v2.1.0 (2025-10-07)
- 🔄 Updated source to `enhanced_player_database_gma.json`
- 📈 Expanded player count to 1,431 players
- 🛠️ Added `updateMasterPlayerDatabase.js` script for direct transformation
- 📊 Database size: 5.6 MB (1,431 players)

### v2.0.0 (2025-10-04)
- ✨ Added pre-calculated playstyle ratings for all 21 playstyles
- ✨ Added top 3 playstyles for batting and bowling
- ✨ Added primary playstyle based on player role
- 🔧 Consolidated all player data into single master database
- 📦 Removed duplicate database files
- 📊 Database size: 4.4 MB (1,123 players)

### v1.0.0 (2024-09-19)
- Initial player database with attributes and stats
- Database size: 2.1 MB (1,123 players)
- No playstyle data

---

## Related Files

- **Schema**: `src/data/players/player-schema.json`
- **Build Scripts**:
  - `scripts/buildMasterPlayerDatabase.js` - Original build script
  - `scripts/updateMasterPlayerDatabase.js` - Direct transformation from enhanced GMA database
- **Source Data**: `src/data/players/processed/enhanced_player_database_gma.json`
- **Playstyle Calculator**: `src/utils/PlaystyleCalculator.js`
- **Playstyle Weightings**: `src/data/config/playstyle-weightings.json`
- **Playstyle Modifiers**: `src/data/config/playstyle-modifiers.json`

---

## Important Notes

⚠️ **Do NOT edit the master database directly**. If you need to:
- Update player attributes → Edit source Excel files in `processed/` folder, then rebuild
- Update playstyle formulas → Edit config files, then rebuild using the build script
- Add new players → Add to source data, then rebuild

✅ **Always use the build script** to regenerate the master database after changes

---

For more information on the playstyle system, see:
- [Playstyle System Documentation](../../docs/core-systems/playstyle-system.md)
- [Player Schema](player-schema.json)
