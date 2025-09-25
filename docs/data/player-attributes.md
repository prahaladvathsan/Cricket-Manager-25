# Statistics to Player Attributes Mapping v5.0 (GMA)

This document defines how raw cricket statistics are converted into game attributes for the Cricket Manager simulation using a **Geometric Moving Average (GMA)** weighting system combined with **Gaussian (Normal) Distribution** mapping. This ensures a realistic spread of talent while filtering out players from low-level cricket.

## Attribute System Overview

All player attributes use a **1-20 scale**. The mapping from statistical performance to an attribute score is based on a player's percentile rank within the **GMA-filtered population**, which is then mapped to a standard normal distribution curve.

- **Attributes 1-20**: All attributes now use the full 1-20 range through Gaussian distribution mapping
- **No Special Cases**: All statistics that meet GMA thresholds are converted using the same Gaussian model
- **Random Fallbacks**: Players who do not meet statistical thresholds get random values between 1-4

This system uses temporal weighting to filter out unreliable performances while ensuring all attributes follow a realistic bell-curve distribution.

## Data Processing Pipeline

### Phase 1: Geometric Moving Average Calculation (`stats_consolidator_gma.py`)
Processes ball-by-ball T20 data with year-based geometric moving average weighting to prioritize recent performance and filter out players from low-level cricket.

#### GMA Parameters
- **GMA Factor**: 2.0 (recent year gets 2x weight of previous year)
- **Years Lookback**: 5 years
- **Weighting Pattern**: [0.516, 0.258, 0.129, 0.065, 0.032] (normalized)

#### Career Recency Requirements
- **Must be active in the most recent year** in the dataset
- Multi-year involvement preferred for reliability

#### Annual Qualification Thresholds
- **Batting:** Minimum **36 balls faced per year** for meaningful involvement
- **Bowling:** Minimum **36 balls bowled per year** for meaningful involvement (6 overs)

#### Final GMA Qualification Thresholds
- **Batting:** Minimum **200+ weighted balls** (scaled proportionally for fewer active years)
- **Bowling:** Minimum **240+ weighted balls** (scaled proportionally for fewer active years)

### Phase 2: Attribute Conversion (`attribute_converter_gma.py`)
Uses the Gaussian distribution model to convert GMA-weighted stats to 1-20 attributes.

## Batting Attributes Conversion

| **Attribute** | **Primary Statistics** | **Calculation Method** | **Sample Size Required** |
|---------------|----------------------|----------------------|-------------------------|
| **Technique** | Batting Average | Direct percentile conversion via Gaussian model | GMA qualification |
| **Timing** | Batting Strike Rate | Direct percentile conversion via Gaussian model | GMA qualification |
| **Defensive Shots** | Dot Ball % (60%) + Inverse Dismissal Rate (40%) | Weighted percentile combination, Gaussian model | GMA qualification |
| **Neutral Shots** | Singles % + Doubles % + Triples % | Combined percentage, Gaussian model | GMA qualification |
| **Attacking Shots** | Six % (60%) + Boundary % (40%) | Weighted percentile combination, Gaussian model | GMA qualification |
| **Range360** | Shot Angle Coverage for 4s & 6s | Degrees covered out of 360°, Gaussian model | GMA qualification |
| **Placement** | Fours % (60%) + Twos % (20%) + Threes % (20%) | Weighted combination, Gaussian model | GMA qualification |
| **Footwork** | Inverse % Bowled/LBW Dismissals | Percentile ranking (lower dismissal% = higher), Gaussian model | GMA qualification |
| **vsPace** | vs Pace Strike Rate | Percentile among players with pace data, Gaussian model | 5+ weighted balls vs pace |
| **vsSpin** | vs Spin Strike Rate | Percentile among players with spin data, Gaussian model | 5+ weighted balls vs spin |
| **Creativity** | Shot Variety Entropy | Percentile among players with creativity data, Gaussian model | GMA qualification |

### 2D Simulation Integration

**Range360** and **Placement** attributes now have direct integration with the 2D fielding simulation:

- **Range360**: Determines number of shot direction options in attribute-driven direction selection
  - Roll: `1 to range360` determines how many possible directions are evaluated
  - Higher range360 = more directional options = better gap finding ability

- **Placement**: Determines shot direction selection quality
  - Roll d20: if ≤ placement → choose best direction (highest expected shot distance)
  - Roll d20: if > placement → choose 2nd best direction
  - Higher placement = more likely to find the best available gap

## Bowling Attributes Conversion

| **Attribute** | **Primary Statistics** | **Calculation Method** | **Sample Size Required** |
|---------------|----------------------|----------------------|-------------------------|
| **Accuracy** | Economy Rate (inverted) | Lower economy = higher attribute, Gaussian model | GMA qualification |
| **Defensive Bowling** | Dot Ball % | Direct percentile conversion, Gaussian model | GMA qualification |
| **Neutral Bowling** | Boundary % (inverted) | Lower boundary concession = higher attribute, Gaussian model | GMA qualification |
| **Attacking Bowling** | Control % (inverted) | Lower control = higher attacking, Gaussian model | GMA qualification |
| **Ball Speed/Turn** | Bowling Average | For pace: speed, for spin: turn, Gaussian model | GMA qualification |
| **Swing/Flight** | Control % (inverted) | For pace: swing, for spin: flight, Gaussian model | GMA qualification |
| **Variations** | Line Entropy (50%) + Length Entropy (50%) | Weighted by inverse bowling average in each zone, Gaussian model | GMA qualification |
| **Intelligence** | Bowling Strike Rate | Direct percentile conversion, Gaussian model | GMA qualification |

## Physical Attributes Conversion

| **Attribute** | **Primary Statistics** | **Calculation Method** | **Sample Size Required** |
|---------------|----------------------|----------------------|-------------------------|
| **Stamina** | Total Balls Bowled + Balls Faced | Combined activity measure, Gaussian model | GMA qualification |
| **Strength** | Average Shot Distance | Distance for boundary shots, Gaussian model | Shot distance data available |
| **Speed** | Run Out Dismissal % (inverted) | Lower run out rate = higher speed, Gaussian model | GMA qualification |
| **Max Fitness** | Total Matches Played | Match participation, Gaussian model | GMA qualification |
| **Endurance** | Random (1-20) | No statistical basis available | N/A |

## Mental Attributes Conversion

| **Attribute** | **Primary Statistics** | **Calculation Method** | **Sample Size Required** |
|---------------|----------------------|----------------------|-------------------------|
| **Intelligence** | Bowling Strike Rate | For bowlers: percentile conversion, Gaussian model | GMA bowling qualification |
| **Temperament** | Performance Variance Across Phases (inverted) | Lower variance = higher temperament, Gaussian model | Phase-wise data available |
| **Judgement** | Control % | Binary control field percentile, Gaussian model | GMA qualification |
| **Concentration** | Performance Variance Across Phases (inverted) | Lower variance = higher concentration, Gaussian model | Phase-wise data available |
| **Aggression** | Random (1-20) | No reliable statistical measure | N/A |
| **Leadership** | Random (1-20) | No reliable statistical measure | N/A |

### Mental Attributes in 2D Simulation

**Judgement** attribute integration with running decision system:

- **Running Error Probability**: `1 - combinedJudgment / 40`
- **Combined Judgment**: `(striker.judgment + nonStriker.judgment) / 2`
- **Higher Judgment** = lower error probability = safer running decisions
- **Usage**: Determines if batsmen make correct running decisions based on fielding time vs running time analysis

## Fielding & Wicket-keeping Attributes
These attributes maintain their previous calculation methods using the GMA-filtered population and Gaussian distribution conversion.

| **Attribute Category** | **Key Details** | **2D Simulation Usage** |
|---------------|-------------------|-------------------------|
| **Fielding** | Based on dismissal involvement rates, Gaussian model conversion | Used in catching probability and interception analysis |
| **Wicket-keeping** | Based on stumping and dismissal rates for keepers, Gaussian model conversion | Edge catching probability and wicket-keeping specific dismissals |
| **Speed** | Used for fielder movement calculations in 2D simulation | `baseSpeed + (speedAttribute * speedMultiplier)` |
| **Agility** | Used for fielding effectiveness and reach calculations | Affects interception radius and movement efficiency |
| **Catching** | Probability of successful catch when fielder intercepts ball | `catchingAttribute / 20` success probability |

## New Calculation Details

### Range360 Score Calculation
```python
def calculate_range360_new(boundary_shots_data):
    """
    Calculate Range360 based on shot angle coverage for 4s and 6s
    Score: Number of degrees covered out of 360°
    """
    if len(boundary_shots_data) == 0:
        return 0
    
    # Get all shot angles for boundaries (4s and 6s)
    angles = []
    for shot in boundary_shots_data:
        if shot.runs >= 4:  # 4s and 6s only
            angle = calculate_shot_angle(shot.wagonX, shot.wagonY)
            angles.append(int(angle))  # Round to nearest degree
    
    # Count unique degrees covered
    unique_degrees = set(angles)
    coverage_score = len(unique_degrees)  # Out of 360 possible
    
    return coverage_score
```

### Entropy Calculations for Variations
```python
def calculate_line_length_entropy(bowling_data):
    """
    Calculate entropy for line and length variations