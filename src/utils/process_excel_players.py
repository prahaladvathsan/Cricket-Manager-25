#!/usr/bin/env python3
"""
Process player_data_v2.xlsx into JSON format for the cricket manager
"""

import pandas as pd
import json
import numpy as np
from pathlib import Path

def load_and_process_players():
    """Load player data from Excel and convert to Cricket Manager format"""

    # Load the Excel file
    excel_path = Path("src/data/players/processed/player_data_v2.xlsx")

    if not excel_path.exists():
        print(f"Excel file not found: {excel_path}")
        return None

    try:
        # Read the Excel file
        df = pd.read_excel(excel_path)
        print(f"Loaded {len(df)} players from Excel file")
        print(f"Columns: {list(df.columns)}")

        if not df.empty:
            print("First row data:")
            print(df.iloc[0])


        players = []

        for index, row in df.iterrows():
            try:
                # Create player object in Cricket Manager format
                player = {
                    "id": str(row.get('player_id', f'p_{index:04d}')),
                    "name": str(row.get('player_name', f'Player_{index}')),
                    "fullName": str(row.get('player_name', f'Player_{index}')),
                    "age": int(row.get('age', 25)) if pd.notna(row.get('age')) else 25,
                    "nationality": str(row.get('nationality', 'IND')),
                    "role": determine_role(row),
                    "battingHand": str(row.get('batting_hand', 'right')),
                    "bowlingHand": str(row.get('bowling_hand', 'right')) if pd.notna(row.get('bowling_hand')) else None,
                    "bowlingType": determine_bowling_type(row),
                    "teams": [],
                    "currentTeam": None,
                    "attributes": extract_attributes(row),
                    "careerStats": extract_career_stats(row),
                    "seasonStats": {
                        "matches": 0,
                        "innings": 0,
                        "runs": 0,
                        "wickets": 0,
                        "catches": 0,
                        "stumpings": 0
                    },
                    "condition": {
                        "form": 50,
                        "fitness": 85,
                        "fatigue": 0,
                        "morale": 50,
                        "injury": None
                    },
                    "contract": {
                        "salary": calculate_salary(row),
                        "duration": 1,
                        "retentionStatus": "available"
                    },
                    "rating": calculate_overall_rating(row)
                }

                players.append(player)

            except Exception as e:
                print(f"Error processing player {index}: {e}")
                continue

        print(f"Successfully processed {len(players)} players")
        return players

    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return None

def determine_role(row):
    """Determine player role based on available data"""
    # Look for role-related columns
    if 'role' in row and pd.notna(row['role']):
        role = str(row['role']).lower()
        if 'keep' in role or 'wk' in role:
            return 'wicket-keeper'
        elif 'bowl' in role:
            return 'bowler'
        elif 'all' in role:
            return 'all-rounder'
        else:
            return 'batsman'

    # Determine from stats
    wickets = row.get('career_wickets', 0) or 0
    batting_avg = row.get('batting_average', 0) or 0

    if wickets > 50 and batting_avg < 25:
        return 'bowler'
    elif wickets > 20 and batting_avg > 25:
        return 'all-rounder'
    else:
        return 'batsman'

def determine_bowling_type(row):
    """Determine bowling type from available data"""
    if 'bowling_type' in row and pd.notna(row['bowling_type']):
        bowling_type = str(row['bowling_type']).lower()
        if 'fast' in bowling_type:
            return 'fast'
        elif 'medium' in bowling_type:
            return 'medium'
        elif 'spin' in bowling_type or 'off' in bowling_type:
            return 'off-break'
        elif 'leg' in bowling_type:
            return 'leg-break'

    # Default based on role
    role = determine_role(row)
    if role == 'bowler':
        return 'fast'
    elif role == 'all-rounder':
        return 'medium'
    else:
        return None

def extract_attributes(row):
    """Extract player attributes, assuming they are already on a 1-20 scale"""

    # Helper function to get attribute, assuming it's already 1-20
    def get_attribute(value):
        if pd.isna(value) or value is None:
            return 10  # Default average
        return int(max(1, min(20, float(value)))) # Clamp to 1-20

    # Batting attributes
    batting = {
        "technique": get_attribute(row.get('technique', row.get('batting_technique'))),
        "timing": get_attribute(row.get('timing', row.get('batting_timing'))),
        "footwork": get_attribute(row.get('footwork', row.get('batting_footwork'))),
        "placement": get_attribute(row.get('placement', row.get('batting_placement'))),
        "range360": get_attribute(row.get('range360', row.get('batting_range'))),
        "defensiveShots": get_attribute(row.get('defensiveShots', row.get('batting_defensive'))),
        "neutralShots": get_attribute(row.get('neutralShots', row.get('batting_neutral'))),
        "attackingShots": get_attribute(row.get('attackingShots', row.get('batting_attacking'))),
        "vsPace": get_attribute(row.get('vsPace', row.get('batting_vs_pace'))),
        "vsSpin": get_attribute(row.get('vsSpin', row.get('batting_vs_spin')))
    }

    # Bowling attributes
    bowling = {
        "accuracy": get_attribute(row.get('bowling_accuracy', row.get('accuracy'))),
        "bowlingSpeed": get_attribute(row.get('bowling_speed', row.get('pace'))),
        "swing": get_attribute(row.get('swing', row.get('bowling_swing'))),
        "turn": get_attribute(row.get('turn', row.get('bowling_turn'))),
        "variations": get_attribute(row.get('variations', row.get('bowling_variations'))),
        "intelligence": get_attribute(row.get('bowling_intelligence', row.get('intelligence'))),
        "defensiveBowling": get_attribute(row.get('defensive_bowling')),
        "neutralBowling": get_attribute(row.get('neutral_bowling')),
        "attackingBowling": get_attribute(row.get('attacking_bowling'))
    }

    # Physical attributes
    physical = {
        "strength": get_attribute(row.get('strength', row.get('power'))),
        "speed": get_attribute(row.get('speed', row.get('running_speed'))),
        "agility": get_attribute(row.get('agility', row.get('fielding_agility'))),
        "maxFitness": get_attribute(row.get('fitness', row.get('max_fitness'))),
        "endurance": get_attribute(row.get('endurance', row.get('stamina'))),
        "stamina": get_attribute(row.get('stamina', row.get('endurance')))
    }

    # Fielding attributes
    fielding_attrs = {
        "catching": get_attribute(row.get('catching', row.get('fielding_catching'))),
        "reflexes": get_attribute(row.get('reflexes', row.get('fielding_reflexes'))),
        "groundFielding": get_attribute(row.get('ground_fielding', row.get('fielding_ground'))),
        "throwPower": get_attribute(row.get('throw_power', row.get('fielding_throw_power'))),
        "throwAccuracy": get_attribute(row.get('throw_accuracy', row.get('fielding_throw_accuracy')))
    }

    # Wicketkeeping (only if player is keeper)
    if determine_role(row) == 'wicket-keeper':
        fielding_attrs["wicketkeeping"] = {
            "keeping": get_attribute(row.get('wicket_keeping', row.get('keeping'))),
            "collecting": get_attribute(row.get('collecting', row.get('keeping_collecting'))),
            "stumping": get_attribute(row.get('stumping', row.get('keeping_stumping')))
        }

    # Mental attributes
    mental = {
        "concentration": get_attribute(row.get('concentration', row.get('mental_concentration'))),
        "temperament": get_attribute(row.get('temperament', row.get('mental_temperament'))),
        "aggression": get_attribute(row.get('aggression', row.get('mental_aggression'))),
        "judgement": get_attribute(row.get('judgement', row.get('mental_judgement'))),
        "leadership": get_attribute(row.get('leadership', row.get('mental_leadership')))
    }

    return {
        "batting": batting,
        "bowling": bowling,
        "physical": physical,
        "fielding": fielding_attrs,
        "mental": mental
    }

def extract_career_stats(row):
    """Extract career statistics"""
    return {
        "matches": int(row.get('career_matches', 0)) if pd.notna(row.get('career_matches')) else 0,
        "innings": int(row.get('career_innings', 0)) if pd.notna(row.get('career_innings')) else 0,
        "runs": int(row.get('career_runs', 0)) if pd.notna(row.get('career_runs')) else 0,
        "wickets": int(row.get('career_wickets', 0)) if pd.notna(row.get('career_wickets')) else 0,
        "catches": int(row.get('career_catches', 0)) if pd.notna(row.get('career_catches')) else 0,
        "stumpings": int(row.get('career_stumpings', 0)) if pd.notna(row.get('career_stumpings')) else 0
    }

def calculate_salary(row):
    """Calculate player salary based on attributes and stats"""
    base_salary = 1000000  # 10 lakh base

    # Add based on career performance
    runs = row.get('career_runs', 0) or 0
    wickets = row.get('career_wickets', 0) or 0

    salary = base_salary + (runs * 1000) + (wickets * 50000)

    # Cap at reasonable values
    return min(salary, 15000000)  # Max 1.5 crores

def calculate_overall_rating(row):
    """Calculate overall player rating"""
    attributes = extract_attributes(row)

    # Weighted average of key attributes
    batting_rating = np.mean(list(attributes['batting'].values()))
    bowling_rating = np.mean(list(attributes['bowling'].values()))
    fielding_rating = np.mean([v for v in attributes['fielding'].values() if isinstance(v, (int, float))])
    physical_rating = np.mean(list(attributes['physical'].values()))
    mental_rating = np.mean(list(attributes['mental'].values()))

    # Weight based on role
    role = determine_role(row)
    if role == 'batsman':
        overall = batting_rating * 0.5 + fielding_rating * 0.2 + physical_rating * 0.15 + mental_rating * 0.15
    elif role == 'bowler':
        overall = bowling_rating * 0.5 + fielding_rating * 0.2 + physical_rating * 0.15 + mental_rating * 0.15
    elif role == 'all-rounder':
        overall = (batting_rating * 0.3 + bowling_rating * 0.3 + fielding_rating * 0.2 +
                  physical_rating * 0.1 + mental_rating * 0.1)
    elif role == 'wicket-keeper':
        keeper_rating = np.mean(list(attributes['fielding']['wicketkeeping'].values())) if 'wicketkeeping' in attributes['fielding'] else fielding_rating
        overall = batting_rating * 0.4 + keeper_rating * 0.3 + fielding_rating * 0.15 + mental_rating * 0.15
    else:
        overall = np.mean([batting_rating, bowling_rating, fielding_rating, physical_rating, mental_rating])

    return round(overall, 1)

def save_players_json(players):
    """Save players to JSON file"""
    output_path = Path("src/data/players/processed/player_database_from_excel.json")

    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(players, f, indent=2, ensure_ascii=False)

        print(f"Successfully saved {len(players)} players to {output_path}")
        return True

    except Exception as e:
        print(f"Error saving JSON file: {e}")
        return False

def main():
    """Main execution function"""
    print("Processing player data from Excel...")

    players = load_and_process_players()
    if players is None:
        print("Failed to load player data")
        return

    # Sort players by rating
    players.sort(key=lambda p: p['rating'], reverse=True)

    print(f"\nTop 10 players by rating:")
    for i, player in enumerate(players[:10]):
        print(f"{i+1}. {player['name']} ({player['role']}) - Rating: {player['rating']}")

    # Save to JSON
    if save_players_json(players):
        print("\nPlayer data processing completed successfully!")
    else:
        print("\nFailed to save player data")

if __name__ == "__main__":
    main()