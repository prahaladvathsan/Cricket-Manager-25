# Player Database Structure

This directory contains all player-related data for the Cricket Manager game.

## File Structure

- `player-schema.json` - Template for player data structure
- `raw-stats/` - Directory for uploaded player statistics files
- `processed/` - Directory for processed player data with attributes
- `import-config.json` - Configuration for stat-to-attribute conversions

## Upload Instructions

1. Place your player statistics files in the `raw-stats/` directory
2. Supported formats: CSV, JSON
3. Use the import utilities to process the data into game-compatible format
4. Processed files will be stored in the `processed/` directory

## Expected Raw Data Format

The system expects granular batting and bowling statistics that can be converted into the game's 1-20 attribute system. Key stats should include:

### Batting Stats
- Runs, innings, average, strike rate
- Boundary percentage, dot ball percentage
- Performance vs pace/spin
- Performance in different phases (powerplay, middle, death)

### Bowling Stats  
- Wickets, economy rate, average, strike rate
- Bowling in different phases
- Types of dismissals
- Variation in deliveries

### Fielding Stats
- Catches, run-outs, stumpings
- Fielding positions

## Attribute Conversion

The import utilities will map these granular stats to our attribute system using configurable formulas in `import-config.json`.