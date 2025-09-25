# Cricket Manager - Scripts

This directory contains utility scripts for data processing and database management.

## build-final-player-database.js

Creates a comprehensive, game-ready player database from the enhanced player database.

### Features

- **Complete Attribute Coverage**: Ensures all 5 categories of attributes are filled:
  - **Batting**: technique, timing, footwork, placement, range360, defensive/neutral/attacking shots, vs pace/spin, creativity
  - **Bowling**: accuracy, speed, swing, turn, flight, variations, intelligence, defensive/neutral/attacking bowling
  - **Physical**: strength, speed, agility, maxFitness, endurance, stamina
  - **Fielding**: catching, reflexes, groundFielding, throwPower, throwAccuracy
  - **Mental**: concentration, temperament, aggression, judgement, leadership
  - **Wicketkeeping**: keeping, collecting, stumping

- **Player Type Categorization**: Automatically categorizes players as:
  - `batsman`: Players with significant batting statistics
  - `pace-bowler`: Fast bowlers with pace bowling statistics
  - `spin-bowler`: Spin bowlers with spin bowling statistics
  - `all-rounder`: Players with both batting and bowling statistics
  - `bowler`: Generic bowlers

- **Intelligent Attribute Assignment**:
  - Uses existing calculated attributes from GMA processing where available
  - Fills missing attributes with appropriate ranges based on player type
  - Ensures pace bowlers excel in swing vs turn, spin bowlers excel in turn vs swing
  - Gives batsmen higher batting attributes, bowlers higher bowling attributes

- **Data Validation**: All attributes validated within 1-20 range

### Usage

```bash
npm run build-player-db
```

or

```bash
node scripts/build-final-player-database.js
```

### Output

Creates `src/data/players/final_player_database.json` with:
- Complete player profiles (name, ID, batting hand, positions, bowling style)
- All attribute categories fully populated
- Processing metadata

### Database Structure

```json
{
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "ISO timestamp",
    "totalPlayers": 1431,
    "playerTypeDistribution": { "batsman": 614, "pace-bowler": 405, ... },
    "attributeValidation": "All attributes validated within 1-20 range"
  },
  "players": {
    "playerId": {
      "id": "playerId",
      "profile": {
        "playerId": 12345,
        "name": "Player Name",
        "battingHand": "RHB/LHB",
        "battingPositions": [1,2,3],
        "bowlingStyle": "RFM/OB/etc",
        "bowlingKind": "pace bowler/spin bowler"
      },
      "playerType": "batsman/bowler/all-rounder",
      "attributes": {
        "batting": { "technique": 12, ... },
        "bowling": { "accuracy": 15, ... },
        "physical": { "strength": 14, ... },
        "fielding": { "catching": 13, ... },
        "wicketkeeping": { "keeping": 3, ... },
        "mental": { "concentration": 16, ... }
      },
      "metadata": { ... }
    }
  }
}
```

### Performance

- Processes ~1,400 players in seconds
- Output file size: ~3MB
- All attributes validated and within expected ranges