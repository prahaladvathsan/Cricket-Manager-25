import json
import math
import sys

# Configuration
INPUT_FILENAME = r"src\data\config\fielding-positions-complete.json"
OUTPUT_FILENAME = r"src\data\config\fielding-positions-complete.json"

def calculate_cartesian(polar_angle_deg, polar_distance):
    """
    Calculates x, y from polar angle and distance.
    
    Coordinate System Assumption based on JSON notes:
    - Center is (0,0)
    - Leg side is +x (0 degrees)
    - Keeper side is +y (90 degrees)
    - Off side is -x (180 degrees)
    - Bowler side is -y (-90 or 270 degrees)
    
    This matches standard trigonometric unit circle conventions.
    x = r * cos(theta)
    y = r * sin(theta)
    """
    # Convert angle to radians
    angle_rad = math.radians(polar_angle_deg)
    
    x = polar_distance * math.cos(angle_rad)
    y = polar_distance * math.sin(angle_rad)
    
    return round(x, 2), round(y, 2)

def main():
    try:
        print(f"Reading {INPUT_FILENAME}...")
        with open(INPUT_FILENAME, 'r') as f:
            data = json.load(f)
            
        print("Calculating coordinates...")
        positions = data.get("positions", [])
        
        for pos in positions:
            # Only calculate if polar data exists
            if "polarAngle" in pos and "polarDistance" in pos:
                angle = pos["polarAngle"]
                dist = pos["polarDistance"]
                
                x, y = calculate_cartesian(angle, dist)
                
                # Update the fields
                pos["x"] = x
                pos["y"] = y
                
                print(f"Updated {pos['name']}: Angle={angle}, Dist={dist} -> ({x}, {y})")
            else:
                print(f"Skipping {pos.get('name', 'Unknown')}: Missing polar data")

        # Write output
        print(f"Writing results to {OUTPUT_FILENAME}...")
        with open(OUTPUT_FILENAME, 'w') as f:
            json.dump(data, f, indent=2)
            
        print("Done!")

    except FileNotFoundError:
        print(f"Error: Could not find {INPUT_FILENAME}. Make sure the file exists.")
    except json.JSONDecodeError:
        print(f"Error: {INPUT_FILENAME} is not valid JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()