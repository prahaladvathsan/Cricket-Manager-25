# Data Processing Guide

## Overview

Cricket Manager uses an external data processing module to convert raw T20 cricket statistics into game-ready player databases. This separation keeps the main game repository clean while allowing sophisticated statistical analysis.

## Architecture

```
Raw T20 Data → cricket-data-processor → Enhanced Player Database → Cricket Manager
```

### External Data Processor (Adjacent Repository)

**Location**: `../cricket-data-processor/` (adjacent to cricket-manager folder)

**Purpose**:
- Process raw T20 ball-by-ball CSV data
- Apply GMA (Geometric Moving Average) filtering
- Convert statistics to game attributes (1-20 scale)
- Output enhanced player database for Cricket Manager

## Data Pipeline

### Input Data Sources

**Primary**: `t20_bbb_recent_filtered.csv`
- 1.3M+ balls from 5900+ T20 matches
- Ball-by-ball records with wagon wheel coordinates
- Player performance across multiple seasons
- Dismissal events and fielding statistics

**Supporting Files**:
- `Registry.csv` - Player identification and metadata
- `enhanced_fielding_events_with_caught_bowled.csv` - Fielding events

### Processing Steps

#### 1. Raw Statistics Calculation (`stats_consolidator_gma.py`)

**Input**: Raw T20 ball-by-ball data
**Process**:
- GMA temporal weighting (recent performance weighted more heavily)
- Range360 analysis using wagon wheel coordinates
- Phase-wise performance (powerplay, middle, death overs)
- vs Bowling Type analysis (pace vs spin)
- Consistency metrics and power analysis

**Output**: `player_stats_database_gma.json`

**Key Features**:
```python
# GMA weighting example
weights = [0.516, 0.258, 0.129, 0.065, 0.032]  # Last 5 years
recent_performance = sum(year_data * weight for year_data, weight in zip(years, weights))
```

#### 2. Attribute Conversion (`attribute_converter_gma.py`)

**Input**: Raw statistics database
**Process**:
- Percentile-based ranking across player population
- Gaussian normalization for realistic distribution
- Statistical significance validation
- Weighted combinations for complex attributes

**Output**: `enhanced_player_database.json` (game-ready)

### GMA Filtering Criteria

**Minimum Requirements**:
- 2+ years of data
- 100+ balls faced (batsmen) or 60+ balls bowled (bowlers)
- Professional-level cricket leagues only

**Temporal Weighting**:
```
Year Weight:
2024: 51.6%
2023: 25.8%
2022: 12.9%
2021: 6.5%
2020: 3.2%
```

## Attribute Mapping

### Batting Attributes (1-20 Scale)

| Attribute | Source Statistics | Weight |
|-----------|------------------|---------|
| technique | Strike rate variance, consistency | 40% |
| timing | Boundary percentage, clean hits | 35% |
| footwork | vs spin performance, range360 | 25% |
| placement | Gap finding percentage, wagon spread | 45% |
| range360 | Wagon wheel coordinate coverage | 100% |

### Bowling Attributes

| Attribute | Source Statistics | Weight |
|-----------|------------------|---------|
| accuracy | Wide percentage, dot ball rate | 50% |
| swing | Edge rate vs pace batsmen | 60% |
| variations | Different dismissal types | 40% |
| intelligence | Economy in death overs | 35% |

### Physical & Mental Attributes

| Attribute | Source | Calculation |
|-----------|--------|-------------|
| concentration | Consistency index | Gaussian distribution |
| temperament | Performance under pressure | Match situation analysis |
| aggression | Boundary attempt rate | Strike rate in death overs |

## Configuration Files

### Processing Configuration

**File**: `cricket-data-processor/config/processing-config.json`

```json
{
  "gma_factor": 2.0,
  "years_lookback": 5,
  "min_balls_batting": 100,
  "min_balls_bowling": 60,
  "min_years_data": 2,
  "attribute_scale": {
    "min": 1,
    "max": 20,
    "mean": 10
  }
}
```

### Balance Configuration

**File**: `src/data/config/balance-config.json`

```json
{
  "player_development": {
    "max_age": 35,
    "peak_age": 28,
    "decline_rate": 0.1
  },
  "condition_effects": {
    "form_impact": 0.3,
    "fitness_impact": 0.2,
    "fatigue_impact": 0.4
  }
}
```

### 2D Simulation Configuration Files

**File**: `src/data/config/field-positioning-config.json`

```json
{
  "version": "1.0.0",
  "description": "Field positioning and formations for 2D cricket simulation",
  "fieldDimensions": {
    "boundaryRadius": 90,
    "pitchLength": 22
  },
  "formations": {
    "attacking": {
      "positions": [
        {"name": "slip", "x": 5, "y": -8, "angle": 225},
        {"name": "point", "x": 25, "y": -25, "angle": 315}
      ]
    },
    "neutral": { /* ... */ },
    "defensive": { /* ... */ }
  }
}
```

**File**: `src/data/config/physics-config.json`

```json
{
  "version": "1.0.0",
  "description": "2D physics parameters for ball trajectory simulation",
  "fieldDimensions": {
    "boundaryRadius": 90,
    "pitchLength": 22
  },
  "shotTypes": {
    "aerial": {
      "bounceDistance": 60
    }
  },
  "fielderMovement": {
    "baseSpeed": 8.0
  }
}
```

**File**: `src/data/config/running-config.json`

```json
{
  "version": "1.0.0",
  "description": "Running decision and speed configurations",
  "decisionFactors": {
    "judgmentWeight": 0.6,
    "speedWeight": 0.2,
    "pressureWeight": 0.2,
    "combinedJudgmentDivisor": 40
  },
  "timeCalculation": {
    "fieldingTime": {
      "pickup": 0.5,
      "throw": 0.3,
      "collection": 0.2
    }
  }
}
```

## Running the Data Processor

### Setup

```bash
cd cricket-data-processor
pip install pandas numpy scipy jupyter matplotlib seaborn openpyxl
```

### Execute Pipeline

```bash
# Option 1: Jupyter Notebook (Recommended)
jupyter notebook notebooks/run_stats_consolidator.ipynb

# Option 2: Command Line
python scripts/stats_consolidator_gma.py
python scripts/attribute_converter_gma.py
```

### Output Files

**Generated**:
- `output/player_stats_database_gma.json` - Raw statistics
- `output/enhanced_player_database_gma.json` - Local copy
- `../cricket-manager/src/data/players/enhanced_player_database.json` - Game database
- `../cricket-manager/src/data/players/player_data.xlsx` - Excel export

## Data Quality Metrics

### Statistical Validation

**Sample Size Requirements**:
- Minimum balls for statistical significance
- Multi-season data for consistency
- Professional league filtering

**Distribution Checks**:
```python
# Attribute distribution validation
batting_technique = [player.technique for player in database]
mean = np.mean(batting_technique)  # Should be ~10
std = np.std(batting_technique)    # Should be ~4-5
```

### Quality Assurance

**Automated Checks**:
- Attribute range validation (1-20)
- Missing data detection
- Statistical outlier identification
- Cross-attribute correlation checks

**Manual Validation**:
- Top player verification (known stars should have high ratings)
- Role-specific attribute patterns
- Historical performance correlation

## Database Schema

### Enhanced Player Database Structure

```json
{
  "player_id": {
    "player_name": "string",
    "game_attributes": {
      "batting": {
        "technique": 1-20,
        "timing": 1-20,
        "placement": 1-20,
        "range360": 1-20
      },
      "bowling": {
        "accuracy": 1-20,
        "swing": 1-20,
        "variations": 1-20
      },
      "physical": {
        "strength": 1-20,
        "speed": 1-20,
        "agility": 1-20
      },
      "mental": {
        "concentration": 1-20,
        "temperament": 1-20,
        "aggression": 1-20
      }
    },
    "condition": {
      "form": 0-100,
      "fitness": 0-100,
      "fatigue": 0-100,
      "morale": 0-100
    },
    "metadata": {
      "role": "string",
      "bowling_type": "string",
      "batting_style": "string"
    },
    "stats": {
      "batting_stats": {},
      "bowling_stats": {},
      "fielding_stats": {}
    }
  }
}
```

## Performance Optimization

### Processing Efficiency

**Large Dataset Handling**:
```python
# Chunked processing for memory efficiency
chunk_size = 10000
for chunk in pd.read_csv(data_file, chunksize=chunk_size):
    process_chunk(chunk)
```

**Caching Strategy**:
```python
# Cache intermediate results
cache_file = 'intermediate_stats.pkl'
if os.path.exists(cache_file):
    stats = pickle.load(open(cache_file, 'rb'))
else:
    stats = calculate_statistics(data)
    pickle.dump(stats, open(cache_file, 'wb'))
```

### Memory Management

**Efficient Data Structures**:
- Use appropriate pandas dtypes
- Process in chunks for large datasets
- Clear intermediate variables

## Troubleshooting

### Common Issues

**Memory Errors**:
- Reduce chunk size
- Process data in smaller batches
- Use data type optimization

**Missing Attributes**:
- Check minimum sample size requirements
- Verify raw data completeness
- Review filtering criteria

**Unrealistic Distributions**:
- Validate input data quality
- Review percentile calculation
- Check for data outliers

### Debugging Tools

**Validation Scripts**:
```python
# Check attribute distributions
def validate_attributes(database):
    for attr in attributes:
        values = [p[attr] for p in database.values()]
        print(f"{attr}: mean={np.mean(values):.1f}, std={np.std(values):.1f}")
```

**Data Inspection**:
```python
# Inspect player data
def inspect_player(player_id, database):
    player = database[player_id]
    print(f"Name: {player['player_name']}")
    print(f"Attributes: {player['game_attributes']}")
    print(f"Raw Stats: {player['stats']}")
```

## Integration with Game

### Loading Player Database

**In Cricket Manager**:
```javascript
// playerStore.js
const loadPlayerDatabase = async () => {
  try {
    const response = await fetch('/src/data/players/enhanced_player_database.json');
    const database = await response.json();

    set({
      players: database,
      isLoaded: true
    });
  } catch (error) {
    console.error('Failed to load player database:', error);
  }
};
```

### Data Updates

**Workflow for New Data**:
1. Update raw CSV data in cricket-data-processor
2. Run processing pipeline
3. Verify output quality
4. Enhanced database automatically updated in game repository
5. Commit changes to both repositories

## Future Enhancements

### Planned Features

**Real-time Updates**:
- Incremental processing for new match data
- Live attribute adjustments based on recent performance

**Advanced Analytics**:
- Machine learning for attribute prediction
- Situational performance modeling
- Team chemistry calculations

**Performance Optimization**:
- Parallel processing for large datasets
- GPU acceleration for statistical calculations
- Optimized data formats (parquet, HDF5)