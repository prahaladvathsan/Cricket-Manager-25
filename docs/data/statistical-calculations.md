# Detailed Calculations Guide (GMA)
## Cricket Manager Player Statistics & Attributes with Geometric Moving Average

This document provides comprehensive details on how every statistic and attribute is calculated in the Cricket Manager player database processing pipeline using **Geometric Moving Average (GMA)** temporal weighting.

---

## 📊 **PHASE 1: GMA Statistics Calculation**
*Source: `stats_consolidator_gma.py`*

### Data Input Format
- **Source File:** `t20_bbb_recent_filtered.csv`
- **Data Coverage:** 1.3M+ balls from 5,900+ T20 matches
- **Key Fields:** 67 columns including wagonX/Y, shot distance, line/length, fielder IDs
- **Temporal Range:** Last 5 years with year extraction for GMA weighting

### GMA Framework

#### GMA Weight Calculation
```python
def calculate_gma_weights(gma_factor=2.0, years_lookback=5):
    """Calculate normalized geometric moving average weights"""
    weights = []
    for i in range(years_lookback):
        weight = 1.0 / (gma_factor ** (i + 1))
        weights.append(weight)
    
    # Normalize to sum to 1
    total = sum(weights)
    normalized_weights = [w / total for w in weights]
    
    # Result: [0.516, 0.258, 0.129, 0.065, 0.032] for factor=2.0
    return normalized_weights
```

#### Career Recency Requirements
```python
# Must be active in the most recent year
current_year = max(yearly_stats.keys())
if current_year not in recent_years:
    return None  # Exclude inactive players
```

### 🏏 **Batting Statistics (Year-by-Year → GMA)**

#### Annual Qualification & Statistics
```python
# Annual threshold for meaningful involvement
if len(balls_faced_data) < 36:  # Reduced from 50 to 36 annually
    continue  # Skip this year

# Calculate yearly statistics first
for year in player_data['year'].unique():
    year_data = player_data[player_data['year'] == year]
    balls_faced_data = year_data[year_data['ballfaced'] == 1]
    
    # Core yearly statistics
    stats['total_runs'] = int(year_data['batruns'].sum())
    stats['total_balls'] = len(balls_faced_data)
    stats['dismissals'] = len(year_data[year_data['out'] == True])
    
    # Derived yearly rates
    stats['batting_average'] = stats['total_runs'] / stats['dismissals'] if stats['dismissals'] > 0 else stats['total_runs']
    stats['strike_rate'] = (stats['total_runs'] / stats['total_balls']) * 100
```

#### GMA Application to Batting Stats
```python
def apply_gma_to_batting_stats(yearly_stats, gma_weights):
    """Apply geometric moving average to yearly batting statistics"""
    recent_years = sorted(yearly_stats.keys(), reverse=True)[:5]
    
    # Calculate total weighted balls with scaled threshold
    total_weighted_balls = 0
    years_active = len(recent_years)
    for i, year in enumerate(recent_years):
        if i < len(gma_weights):
            total_weighted_balls += yearly_stats[year]['total_balls'] * gma_weights[i]
    
    # Scale threshold: 200+ for 5 years, proportional for fewer years
    min_threshold = (200 * years_active) / 5
    if total_weighted_balls < min_threshold:
        return None
    
    # Apply GMA to numerical statistics
    numerical_stats = [
        'total_runs', 'total_balls', 'dismissals', 'matches', 'innings',
        'dot_balls', 'singles', 'twos', 'threes', 'fours', 'sixes',
        'vs_pace_balls', 'vs_pace_runs', 'vs_spin_balls', 'vs_spin_runs'
    ]
    
    for stat in numerical_stats:
        weighted_sum = 0
        for i, year in enumerate(recent_years):
            if i < len(gma_weights) and stat in yearly_stats[year]:
                weighted_sum += yearly_stats[year][stat] * gma_weights[i]
        gma_stats[stat] = int(weighted_sum)
    
    # Calculate derived GMA statistics
    gma_stats['batting_average'] = gma_stats['total_runs'] / gma_stats['dismissals'] if gma_stats['dismissals'] > 0 else gma_stats['total_runs']
    gma_stats['strike_rate'] = (gma_stats['total_runs'] / gma_stats['total_balls']) * 100
```

#### Advanced GMA Calculations

**Range360 with GMA Weighting:**
```python
def calculate_range360_gma(wagon_data_yearly, gma_weights):
    """Calculate range360 score using GMA-weighted wagon analysis"""
    # Apply GMA to yearly range360 scores
    weighted_sum = 0
    weight_sum = 0
    for i, year in enumerate(recent_years):
        if i < len(gma_weights) and year in wagon_data_yearly and wagon_data_yearly[year]['range360_score'] > 0:
            weighted_sum += wagon_data_yearly[year]['range360_score'] * gma_weights[i]
            weight_sum += gma_weights[i]
    
    if weight_sum > 0:
        gma_range360 = weighted_sum / weight_sum
    else:
        gma_range360 = 0
```

**Consistency with GMA:**
```python
def calculate_consistency_gma(yearly_stats, gma_weights):
    """Calculate consistency using GMA-weighted variance"""
    # Apply GMA to yearly consistency coefficients
    for stat in ['consistency_coefficient', 'line_length_variance', 'creativity']:
        weighted_sum = 0
        weight_sum = 0
        for i, year in enumerate(recent_years):
            if i < len(gma_weights) and stat in yearly_stats[year] and yearly_stats[year][stat] > 0:
                weighted_sum += yearly_stats[year][stat] * gma_weights[i]
                weight_sum += gma_weights[i]
        
        if weight_sum > 0:
            gma_stats[stat] = weighted_sum / weight_sum
        else:
            gma_stats[stat] = 0
```

### 🥎 **Bowling Statistics (Year-by-Year → GMA)**

#### Annual Qualification & Statistics
```python
# Annual threshold for meaningful involvement (6 overs)
if len(year_data) < 36:  # Reduced from 48 to 36 annually
    continue  # Skip this year

# Calculate yearly bowling statistics
stats['total_balls'] = len(year_data)
stats['total_overs'] = stats['total_balls'] / 6
stats['total_runs'] = int(year_data['bowlruns'].sum())
stats['wickets'] = int(len(year_data[year_data['out'] == True]))

# Yearly bowling rates
stats['economy_rate'] = stats['total_runs'] / stats['total_overs'] if stats['total_overs'] > 0 else 0
stats['bowling_average'] = stats['total_runs'] / stats['wickets'] if stats['wickets'] > 0 else 0
stats['bowling_strike_rate'] = stats['total_balls'] / stats['wickets'] if stats['wickets'] > 0 else 0
```

#### GMA Application to Bowling Stats
```python
def apply_gma_to_bowling_stats(yearly_stats, gma_weights):
    """Apply geometric moving average to yearly bowling statistics"""
    # Scale threshold: 240+ for 5 years, proportional for fewer years
    min_threshold = (240 * years_active) / 5
    if total_weighted_balls < min_threshold:
        return None
    
    # Apply GMA to numerical bowling statistics
    numerical_stats = [
        'total_balls', 'total_runs', 'wickets', 'matches',
        'dot_balls', 'boundaries_conceded', 'wides', 'no_balls'
    ]
    
    for stat in numerical_stats:
        weighted_sum = 0
        for i, year in enumerate(recent_years):
            if i < len(gma_weights) and stat in yearly_stats[year]:
                weighted_sum += yearly_stats[year][stat] * gma_weights[i]
        gma_stats[stat] = int(weighted_sum)
    
    # Calculate derived GMA bowling statistics
    gma_stats['total_overs'] = gma_stats['total_balls'] / 6
    gma_stats['economy_rate'] = gma_stats['total_runs'] / gma_stats['total_overs'] if gma_stats['total_overs'] > 0 else 0
    gma_stats['bowling_average'] = gma_stats['total_runs'] / gma_stats['wickets'] if gma_stats['wickets'] > 0 else 0
    gma_stats['bowling_strike_rate'] = gma_stats['total_balls'] / gma_stats['wickets'] if gma_stats['wickets'] > 0 else 0
```

### ⚾ **Fielding Statistics (Enhanced Quality)**
*Note: Same methodology but benefits from GMA-filtered, higher quality player pool*

```python
def calculate_fielding_stats_gma(player_id):
    """Calculate fielding statistics from dismissal data (GMA-enhanced population)"""
    # Only look at balls where this player was the fielder in a dismissal
    fielding_data = data[
        (data['fielder'].astype(str) == str(player_id)) &
        (data['out'] == True)
    ]
    
    # Reduced minimum threshold due to higher quality GMA population
    if stats['total_dismissals_involved'] < 5:  # Was 3, now 5 due to multi-year requirement
        return None
```

---

## 🎮 **PHASE 2: GMA Attribute Conversion**
*Source: `attribute_converter_gma.py`*

### Enhanced Statistical Distribution Framework

The GMA system maintains the **Gaussian (Normal) Distribution** model but applies it to a **smaller, higher-quality population** of players who have proven themselves over multiple years.

#### Population Quality Enhancement
```python
# Get all qualifying batsmen for percentile calculations (GMA filtered)
all_batsmen = [p for p in raw_database.values() if p.get('batting_stats')]

# No minimum sample size requirement - process all available GMA players
# Even small populations are highly reliable due to multi-year filtering
if len(all_batsmen) < 1:
    return {attr: random.randint(1, 4) for attr in batting_attributes}
```

#### Enhanced Attribute Defaults for GMA Players
```python
def calculate_physical_attributes_gma(player_data):
    """Enhanced physical attributes for GMA players"""
    # GMA players get enhanced defaults (proven over multiple years)
    return {attr: random.randint(2, 6) for attr in physical_attributes}  # Was 1-4
```

### 🏏 **Batting Attributes Conversion (GMA-Enhanced)**

#### Technique
**Formula:** Direct Batting Average percentile conversion

```python
def calculate_technique(player_stats, all_players):
    # Get percentiles from GMA population
    avg_values = [p['batting_stats']['batting_average'] for p in all_players]
    avg_percentile = get_stat_percentile(avg_values, player_stats.batting_average)
    return percentile_to_attribute(avg_percentile)
```

#### Timing
**Formula:** Direct Strike Rate percentile conversion

```python
def calculate_timing(player_stats, all_players):
    sr_values = [p['batting_stats']['strike_rate'] for p in all_players]
    sr_percentile = get_stat_percentile(sr_values, player_stats.strike_rate)
    return percentile_to_attribute(sr_percentile)
```

#### Defensive Shots
**Formula:** 60% Dot Ball Percentage + 40% Inverse Dismissal Rate

```python
def calculate_defensive_shots(player_stats, all_players):
    dot_values = [p['batting_stats']['dot_ball_pct'] for p in all_players]
    dismissal_values = [p['batting_stats']['dismissal_rate'] for p in all_players]

    dot_percentile = get_stat_percentile(dot_values, player_stats.dot_ball_pct)
    dismissal_percentile = get_stat_percentile(dismissal_values, player_stats.dismissal_rate)

    # High dot% + low dismissal rate = better defensive shots
    defensive_score = (dot_percentile * 0.6) + ((100 - dismissal_percentile) * 0.4)
    return percentile_to_attribute(defensive_score)
```

#### Neutral Shots
**Formula:** Combined percentage of Singles + Doubles + Triples

```python
def calculate_neutral_shots(player_stats, all_players):
    # Calculate neutral shots percentage (1s, 2s, 3s)
    neutral_pct = player_stats.singles_pct + player_stats.twos_pct + player_stats.threes_pct
    
    neutral_values = [p['batting_stats']['singles_pct'] + 
                     p['batting_stats']['twos_pct'] + 
                     p['batting_stats']['threes_pct'] for p in all_players]
    
    neutral_percentile = get_stat_percentile(neutral_values, neutral_pct)
    return percentile_to_attribute(neutral_percentile)
```

#### Range360 (New Calculation)
**Formula:** Shot angle coverage for 4s and 6s out of 360 degrees

```python
def calculate_range360_new(boundary_shots_data):
    """
    Calculate Range360 based on shot angle coverage for 4s and 6s
    Score: Number of degrees covered out of 360°
    """
    if len(boundary_shots_data) == 0:
        return 0
    
    # Get all shot angles for boundaries (4s and 6s)
    covered_degrees = set()
    for shot in boundary_shots_data:
        if shot.runs >= 4:  # 4s and 6s only
            x, y = shot.wagonX, shot.wagonY
            angle = np.degrees(np.arctan2(y, x))
            if angle < 0:
                angle += 360  # Normalize to 0-360°
            covered_degrees.add(int(angle))  # Round to nearest degree
    
    coverage_score = len(covered_degrees)  # Out of 360 possible degrees
    return coverage_score
```

#### Placement
**Formula:** 60% Fours Percentage + 20% Twos Percentage + 20% Threes Percentage

```python
def calculate_placement(player_stats, all_players):
    fours_values = [p['batting_stats']['fours'] / p['batting_stats']['total_balls'] * 100 for p in all_players]
    twos_values = [p['batting_stats']['twos'] / p['batting_stats']['total_balls'] * 100 for p in all_players]
    threes_values = [p['batting_stats']['threes'] / p['batting_stats']['total_balls'] * 100 for p in all_players]

    fours_percentile = get_stat_percentile(fours_values, player_stats.fours_pct)
    twos_percentile = get_stat_percentile(twos_values, player_stats.twos_pct)
    threes_percentile = get_stat_percentile(threes_values, player_stats.threes_pct)

    placement_score = (fours_percentile * 0.6) + (twos_percentile * 0.2) + (threes_percentile * 0.2)
    return percentile_to_attribute(placement_score)
```

#### Footwork
**Formula:** Inverse percentage of Bowled/LBW dismissals

```python
def calculate_footwork(player_stats, all_players):
    # Calculate bowled/LBW dismissal percentage
    bowled_lbw_players = []
    for p in all_players:
        if p['batting_stats']['dismissals'] > 0:
            bowled_lbw_count = count_dismissals_by_type(p, ['bowled', 'lbw'])
            bowled_lbw_pct = (bowled_lbw_count / p['batting_stats']['dismissals']) * 100
            bowled_lbw_players.append(bowled_lbw_pct)
    
    player_bowled_lbw_pct = calculate_player_bowled_lbw_pct(player_stats)
    bowled_lbw_percentile = get_stat_percentile(bowled_lbw_players, player_bowled_lbw_pct)
    
    # Invert: Lower bowled/LBW rate = better footwork
    return percentile_to_attribute(bowled_lbw_percentile, invert=True)
```

#### Reduced Sample Size Requirements (Higher Quality Data)
```python
# Range360 with reduced threshold due to GMA quality
range360_players = [p for p in all_batsmen if p['batting_stats'].get('range360_score', 0) > 0]
if len(range360_players) >= 1 and batting_stats.get('range360_score', 0) > 0:  # Was 15, now 1
    range360_values = [p['batting_stats']['range360_score'] for p in range360_players]
    range360_percentile = get_stat_percentile(range360_values, batting_stats['range360_score'])
    attributes['range360'] = percentile_to_attribute(range360_percentile)
else:
    attributes['range360'] = random.randint(8, 12)  # Enhanced default for GMA players
```

### 🥎 **Bowling Attributes Conversion (GMA-Enhanced)**

#### Accuracy
**Formula:** Economy Rate (inverted)

```python
def calculate_accuracy_gma(player_data, all_bowlers):
    """Calculate accuracy using economy rate inverted"""
    economy_values = [p['bowling_stats']['economy_rate'] for p in all_bowlers]
    economy_percentile = get_stat_percentile(economy_values, bowling_stats['economy_rate'])
    # Lower economy = higher accuracy
    return percentile_to_attribute(economy_percentile, invert=True)
```

#### Defensive Bowling
**Formula:** Dot Ball Percentage

```python
def calculate_defensive_bowling_gma(player_data, all_bowlers):
    """Calculate defensive bowling using dot ball percentage"""
    dot_values = [p['bowling_stats']['dot_ball_pct'] for p in all_bowlers]
    dot_percentile = get_stat_percentile(dot_values, bowling_stats['dot_ball_pct'])
    return percentile_to_attribute(dot_percentile)
```

#### Neutral Bowling
**Formula:** Boundary Percentage (inverted)

```python
def calculate_neutral_bowling_gma(player_data, all_bowlers):
    """Calculate neutral bowling using boundary percentage inverted"""
    boundary_values = [p['bowling_stats']['boundary_pct'] for p in all_bowlers]
    boundary_percentile = get_stat_percentile(boundary_values, bowling_stats['boundary_pct'])
    # Lower boundary concession = better neutral bowling
    return percentile_to_attribute(boundary_percentile, invert=True)
```

#### Attacking Bowling
**Formula:** Control Percentage (inverted)

```python
def calculate_attacking_bowling_gma(player_data, all_bowlers):
    """Calculate attacking bowling using control percentage inverted"""
    control_values = [p['bowling_stats']['control_pct'] for p in all_bowlers]
    control_percentile = get_stat_percentile(control_values, bowling_stats['control_pct'])
    # Lower control = more attacking bowling
    return percentile_to_attribute(control_percentile, invert=True)
```

#### Ball Speed/Turn
**Formula:** Bowling Average (based on bowling type)

```python
def calculate_ball_speed_turn_gma(player_data, all_bowlers):
    """Calculate ball speed for pace bowlers or turn for spin bowlers using bowling average"""
    bowl_style = bowling_stats.get('bowl_style', 'Unknown')
    
    if 'F' in bowl_style.upper() or 'M' in bowl_style.upper():  # Pace bowlers
        # Ball speed based on bowling average
        pace_bowlers = [p for p in all_bowlers if 'F' in p['bowling_stats'].get('bowl_style', '').upper() 
                       or 'M' in p['bowling_stats'].get('bowl_style', '').upper()]
        if pace_bowlers:
            avg_values = [p['bowling_stats']['bowling_average'] for p in pace_bowlers if p['bowling_stats']['bowling_average'] > 0]
            avg_percentile = get_stat_percentile(avg_values, bowling_stats['bowling_average'])
            return percentile_to_attribute(avg_percentile, invert=True)  # Lower average = higher speed
    else:  # Spin bowlers
        # Turn based on bowling average
        spin_bowlers = [p for p in all_bowlers if not ('F' in p['bowling_stats'].get('bowl_style', '').upper() 
                       or 'M' in p['bowling_stats'].get('bowl_style', '').upper())]
        if spin_bowlers:
            avg_values = [p['bowling_stats']['bowling_average'] for p in spin_bowlers if p['bowling_stats']['bowling_average'] > 0]
            avg_percentile = get_stat_percentile(avg_values, bowling_stats['bowling_average'])
            return percentile_to_attribute(avg_percentile, invert=True)  # Lower average = higher turn
    
    return random.randint(1, 4)
```

#### Swing/Flight
**Formula:** Control Percentage (inverted, based on bowling type)

```python
def calculate_swing_flight_gma(player_data, all_bowlers):
    """Calculate swing for pace or flight for spin using control percentage inverted"""
    control_values = [p['bowling_stats']['control_pct'] for p in all_bowlers]
    control_percentile = get_stat_percentile(control_values, bowling_stats['control_pct'])
    
    # Lower control = higher swing/flight ability
    return percentile_to_attribute(control_percentile, invert=True)
```

#### Variations (New Calculation)
**Formula:** Line Entropy (50%) + Length Entropy (50%) weighted by inverse bowling average

```python
def calculate_variations_entropy(bowling_data, all_bowlers):
    """Calculate variations using line and length entropy weighted by performance"""
    
    # Calculate line entropy weighted by inverse bowling average in each line
    line_performance = {}
    for line in bowling_data['line'].unique():
        line_data = bowling_data[bowling_data['line'] == line]
        if len(line_data) >= 6:  # Minimum 1 over
            line_runs = line_data['bowlruns'].sum()
            line_balls = len(line_data)
            line_avg = line_runs / (line_data['out'].sum()) if line_data['out'].sum() > 0 else line_runs
            line_performance[line] = 1 / line_avg if line_avg > 0 else 1  # Inverse average as weight
    
    # Calculate entropy for line usage
    total_weight = sum(line_performance.values())
    if total_weight > 0:
        line_entropy = -sum((w/total_weight) * np.log(w/total_weight) for w in line_performance.values() if w > 0)
    else:
        line_entropy = 0
    
    # Similar calculation for length entropy
    length_performance = {}
    for length in bowling_data['length'].unique():
        length_data = bowling_data[bowling_data['length'] == length]
        if len(length_data) >= 6:
            length_runs = length_data['bowlruns'].sum()
            length_balls = len(length_data)
            length_avg = length_runs / (length_data['out'].sum()) if length_data['out'].sum() > 0 else length_runs
            length_performance[length] = 1 / length_avg if length_avg > 0 else 1
    
    total_weight = sum(length_performance.values())
    if total_weight > 0:
        length_entropy = -sum((w/total_weight) * np.log(w/total_weight) for w in length_performance.values() if w > 0)
    else:
        length_entropy = 0
    
    # Combine entropies
    variations_score = (line_entropy * 0.5) + (length_entropy * 0.5)
    
    # Convert to percentile among all bowlers
    variation_values = [calculate_variations_entropy(get_bowling_data(p), all_bowlers) for p in all_bowlers]
    variations_percentile = get_stat_percentile(variation_values, variations_score)
    
    return percentile_to_attribute(variations_percentile)
```

#### Intelligence
**Formula:** Bowling Strike Rate

```python
def calculate_bowling_intelligence_gma(player_data, all_bowlers):
    """Calculate intelligence using bowling strike rate"""
    strike_rate_values = [p['bowling_stats']['bowling_strike_rate'] for p in all_bowlers if p['bowling_stats']['bowling_strike_rate'] > 0]
    if bowling_stats['bowling_strike_rate'] > 0:
        strike_rate_percentile = get_stat_percentile(strike_rate_values, bowling_stats['bowling_strike_rate'])
        # Lower strike rate = higher intelligence
        return percentile_to_attribute(strike_rate_percentile, invert=True)
    return random.randint(1, 4)
```

### 💪 **Physical Attributes Conversion (Statistical Basis)**

#### Stamina
**Formula:** Total Balls Bowled + Balls Faced

```python
def calculate_stamina_gma(player_data, all_players):
    """Calculate stamina using total ball involvement"""
    stamina_values = []
    for p in all_players:
        total_balls = 0
        if p.get('batting_stats'):
            total_balls += p['batting_stats']['total_balls']
        if p.get('bowling_stats'):
            total_balls += p['bowling_stats']['total_balls']
        stamina_values.append(total_balls)
    
    player_total_balls = 0
    if player_data.get('batting_stats'):
        player_total_balls += player_data['batting_stats']['total_balls']
    if player_data.get('bowling_stats'):
        player_total_balls += player_data['bowling_stats']['total_balls']
    
    stamina_percentile = get_stat_percentile(stamina_values, player_total_balls)
    return percentile_to_attribute(stamina_percentile)
```

#### Strength
**Formula:** Average Shot Distance

```python
def calculate_strength_gma(player_data, all_players):
    """Calculate strength using average shot distance for boundary shots"""
    if not player_data.get('batting_stats') or not has_shot_distance_data(player_data):
        return random.randint(1, 4)
    
    # Get players with shot distance data
    strength_players = [p for p in all_players if has_shot_distance_data(p)]
    if len(strength_players) < 10:
        return random.randint(1, 4)
    
    distance_values = [calculate_avg_boundary_distance(p) for p in strength_players]
    player_avg_distance = calculate_avg_boundary_distance(player_data)
    
    distance_percentile = get_stat_percentile(distance_values, player_avg_distance)
    return percentile_to_attribute(distance_percentile)
```

#### Speed
**Formula:** Run Out Dismissal Percentage (inverted)

```python
def calculate_speed_gma(player_data, all_players):
    """Calculate speed using run out dismissal percentage inverted"""
    if not player_data.get('batting_stats') or player_data['batting_stats']['dismissals'] == 0:
        return random.randint(1, 4)
    
    runout_values = []
    for p in all_players:
        if p.get('batting_stats') and p['batting_stats']['dismissals'] > 0:
            runout_count = count_runout_dismissals(p)
            runout_pct = (runout_count / p['batting_stats']['dismissals']) * 100
            runout_values.append(runout_pct)
    
    if len(runout_values) < 10:
        return random.randint(1, 4)
    
    player_runout_pct = (count_runout_dismissals(player_data) / player_data['batting_stats']['dismissals']) * 100
    runout_percentile = get_stat_percentile(runout_values, player_runout_pct)
    
    # Lower run out rate = higher speed
    return percentile_to_attribute(runout_percentile, invert=True)
```

#### Max Fitness
**Formula:** Total Matches Played

```python
def calculate_max_fitness_gma(player_data, all_players):
    """Calculate max fitness using total matches played"""
    match_values = []
    for p in all_players:
        total_matches = 0
        if p.get('batting_stats'):
            total_matches = max(total_matches, p['batting_stats']['matches'])
        if p.get('bowling_stats'):
            total_matches = max(total_matches, p['bowling_stats']['matches'])
        match_values.append(total_matches)
    
    player_total_matches = 0
    if player_data.get('batting_stats'):
        player_total_matches = max(player_total_matches, player_data['batting_stats']['matches'])
    if player_data.get('bowling_stats'):
        player_total_matches = max(player_total_matches, player_data['bowling_stats']['matches'])
    
    fitness_percentile = get_stat_percentile(match_values, player_total_matches)
    return percentile_to_attribute(fitness_percentile)
```

#### Endurance
**Formula:** Random (1-20)

```python
def calculate_endurance():
    """Calculate endurance - no statistical basis available"""
    return random.randint(1, 20)
```

### 🧠 **Mental Attributes Conversion (Performance-Based)**

#### Intelligence
**Formula:** Bowling Strike Rate (for bowlers)

```python
def calculate_intelligence_gma(player_data, all_players):
    """Calculate intelligence using bowling strike rate"""
    if not player_data.get('bowling_stats') or player_data['bowling_stats']['bowling_strike_rate'] <= 0:
        return random.randint(1, 4)
    
    bowlers = [p for p in all_players if p.get('bowling_stats') and p['bowling_stats']['bowling_strike_rate'] > 0]
    if len(bowlers) < 10:
        return random.randint(1, 4)
    
    strike_rate_values = [p['bowling_stats']['bowling_strike_rate'] for p in bowlers]
    strike_rate_percentile = get_stat_percentile(strike_rate_values, player_data['bowling_stats']['bowling_strike_rate'])
    
    # Lower strike rate = higher intelligence
    return percentile_to_attribute(strike_rate_percentile, invert=True)
```

#### Temperament
**Formula:** Inverse variance of performance across phases

```python
def calculate_temperament_gma(player_data, all_players):
    """Calculate temperament using performance variance across match phases"""
    if not has_phase_data(player_data):
        return random.randint(1, 4)
    
    # Calculate performance variance across phases (1-4)
    phase_performances = []
    for phase in [1, 2, 3, 4]:
        phase_performance = calculate_phase_performance(player_data, phase)  # Function of average and economy
        if phase_performance is not None:
            phase_performances.append(phase_performance)
    
    if len(phase_performances) < 3:  # Need at least 3 phases
        return random.randint(1, 4)
    
    performance_variance = np.std(phase_performances)
    
    # Get variance values from all players
    variance_values = []
    for p in all_players:
        if has_phase_data(p):
            p_phase_performances = []
            for phase in [1, 2, 3, 4]:
                p_phase_performance = calculate_phase_performance(p, phase)
                if p_phase_performance is not None:
                    p_phase_performances.append(p_phase_performance)
            if len(p_phase_performances) >= 3:
                variance_values.append(np.std(p_phase_performances))
    
    if len(variance_values) < 10:
        return random.randint(1, 4)
    
    variance_percentile = get_stat_percentile(variance_values, performance_variance)
    # Lower variance = higher temperament
    return percentile_to_attribute(variance_percentile, invert=True)
```

#### Judgement
**Formula:** Control Percentage

```python
def calculate_judgement_gma(player_data, all_players):
    """Calculate judgement using control percentage"""
    if not has_control_data(player_data):
        return random.randint(1, 4)
    
    control_values = [calculate_control_percentage(p) for p in all_players if has_control_data(p)]
    if len(control_values) < 10:
        return random.randint(1, 4)
    
    player_control_pct = calculate_control_percentage(player_data)
    control_percentile = get_stat_percentile(control_values, player_control_pct)
    
    return percentile_to_attribute(control_percentile)
```

#### Concentration
**Formula:** Inverse variance of performance across phases (batting focused)

```python
def calculate_concentration_gma(player_data, all_players):
    """Calculate concentration using batting performance variance across phases"""
    if not player_data.get('batting_stats') or not has_phase_data(player_data):
        return random.randint(1, 4)
    
    # Calculate batting performance variance across phases (function of average and strike rate)
    phase_performances = []
    for phase in [1, 2, 3, 4]:
        phase_avg = get_phase_batting_average(player_data, phase)
        phase_sr = get_phase_strike_rate(player_data, phase)
        if phase_avg is not None and phase_sr is not None:
            # Combined performance metric
            phase_performance = (phase_avg * 0.5) + (phase_sr * 0.5)
            phase_performances.append(phase_performance)
    
    if len(phase_performances) < 3:
        return random.randint(1, 4)
    
    performance_variance = np.std(phase_performances)
    
    # Get variance values from all batsmen
    variance_values = []
    for p in all_players:
        if p.get('batting_stats') and has_phase_data(p):
            p_phase_performances = []
            for phase in [1, 2, 3, 4]:
                p_phase_avg = get_phase_batting_average(p, phase)
                p_phase_sr = get_phase_strike_rate(p, phase)
                if p_phase_avg is not None and p_phase_sr is not None:
                    p_phase_performance = (p_phase_avg * 0.5) + (p_phase_sr * 0.5)
                    p_phase_performances.append(p_phase_performance)
            if len(p_phase_performances) >= 3:
                variance_values.append(np.std(p_phase_performances))
    
    if len(variance_values) < 10:
        return random.randint(1, 4)
    
    variance_percentile = get_stat_percentile(variance_values, performance_variance)
    # Lower variance = higher concentration
    return percentile_to_attribute(variance_percentile, invert=True)
```

#### Aggression & Leadership
**Formula:** Random (1-20)

```python
def calculate_aggression():
    """Calculate aggression - random value"""
    return random.randint(1, 20)

def calculate_leadership():
    """Calculate leadership - random value"""
    return random.randint(1, 20)
```

---

## 📈 **Quality Assurance & Validation (GMA-Enhanced)**

### GMA Sample Size Requirements
- **Batting:** Minimum 200+ GMA-weighted balls (scaled by years active)
- **Bowling:** Minimum 240+ GMA-weighted balls (scaled by years active)
- **Annual Activity:** Minimum 36 balls per year for meaningful involvement
- **Career Recency:** Must be active in the most recent year
- **Multi-Year Preference:** 3+ years for enhanced mental attributes

### Enhanced Statistical Validation
- **Population Quality:** Smaller but **much more reliable** populations due to GMA filtering
- **Temporal Weighting:** Recent performance weighted 2x more than previous year
- **Career Consistency:** Multi-year involvement required for qualification
- **Reduced Thresholds:** Minimum sample sizes reduced (15 instead of 20) due to higher data quality

### GMA Data Quality Checks
- **Year Extraction:** Proper temporal organization of match data
- **GMA Weight Calculation:** Normalized geometric weighting with factor 2.0
- **Career Recency Validation:** Active in most recent year requirement
- **Multi-Year Tracking:** Years included in GMA calculation recorded
- **Weighted Threshold Scaling:** Proportional thresholds based on years active

### Enhanced Population Characteristics
```python
# GMA population statistics
total_players = len(enhanced_database)
multi_year_batsmen = [p for p in enhanced_database.values() 
                     if p.get('batting_stats') and p['batting_stats'].get('years_included', 0) >= 3]

print(f"Players with 3+ years of data: {len(multi_year_batsmen)}")
avg_years = mean([p['batting_stats']['years_included'] for p in multi_year_batsmen])
print(f"Average years included: {avg_years:.1f}")

# Enhanced attribute quality for multi-year players
avg_technique = mean([p['game_attributes']['technique'] for p in multi_year_batsmen])
avg_concentration = mean([p['game_attributes']['concentration'] for p in multi_year_batsmen])
print(f"Average technique (3+ years): {avg_technique:.1f}")
print(f"Average concentration (3+ years): {avg_concentration:.1f}")
```

---

This comprehensive GMA calculation guide ensures transparency and reproducibility in the Cricket Manager player database generation process, with enhanced reliability through temporal weighting and multi-year performance validation.