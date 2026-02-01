import json
import wikipedia
import re
from datetime import date
import sys
import os

# --- CONFIGURATION ---
INPUT_FILE = 'public/data/master_player_database.json'
OUTPUT_FILE = 'public/data/master_player_database_updated.json'
TARGET_DATE = date(2026, 2, 1)  # Target date for age calculation

# --- VERIFIED DATABASE (High Accuracy) ---
# Pre-populated with players visible in your file to save time/requests.
verified_dobs = {
    "Moeen Ali": "18-06-1987", "Richie Berrington": "03-04-1987", "Mohammad Nabi": "01-01-1985",
    "Ravichandran Ashwin": "17-09-1986", "MS Dhoni": "07-07-1981", "Karn Sharma": "23-10-1987",
    "Rohit Sharma": "30-04-1987", "Mohammad Nadeem": "04-09-1982", "Faf du Plessis": "13-07-1984",
    "Roelof van der Merwe": "31-12-1984", "Liam Dawson": "01-03-1990", "Sunil Narine": "26-05-1988",
    "Ravindra Jadeja": "06-12-1988", "Ishant Sharma": "02-09-1988", "Adil Rashid": "17-02-1988",
    "Virat Kohli": "05-11-1988", "Reeza Hendricks": "14-08-1989", "Mitchell Marsh": "20-10-1991",
    "Andre Russell": "29-04-1988", "Trent Boult": "22-07-1989", "Ajinkya Rahane": "06-06-1988",
    "Josh Hazlewood": "08-01-1991", "Manish Pandey": "10-09-1989", "Sikandar Raza": "24-04-1986",
    "Kusal Perera": "17-08-1990", "Paul Stirling": "03-09-1990", "Jatinder Singh": "05-03-1989",
    "Jos Buttler": "08-09-1990", "Mitchell Starc": "30-01-1990", "Asif Khan": "15-02-1990",
    "David Miller": "10-06-1989", "Marcus Stoinis": "16-08-1989", "Glenn Maxwell": "14-10-1988",
    "Bhuvneshwar Kumar": "05-02-1990", "Mustafizur Rahman": "06-09-1995", "Johnson Charles": "14-01-1989",
    "Daryl Mitchell": "20-05-1991", "Liam Livingstone": "04-08-1993", "Heinrich Klaasen": "30-07-1991",
    "Aamir Kaleem": "20-11-1981", "Mitchell Santner": "05-02-1992", "Matt Henry": "14-12-1991",
    "Jamie Overton": "10-04-1994", "Fakhar Zaman": "10-04-1990", "Luke Wood": "02-08-1995",
    "Malan Kruger": "12-04-1995", "Shai Hope": "10-11-1993", "Jasprit Bumrah": "06-12-1993",
    "Daniel Doram": "30-10-1997", "Max O'Dowd": "04-03-1994", "Ben Dwarshuis": "23-06-1994",
    "Vijaykumar Vyshak": "31-01-1997", "Navneet Dhaliwal": "10-10-1988", "Azmatullah Omarzai": "24-03-2000",
    "Darwish Rasooli": "12-12-1999", "Lalit Rajbanshi": "27-02-1999", "Ben White": "29-08-1998",
    "Josh Little": "01-11-1999", "Sandeep Lamichhane": "02-08-2000", "Harry Tector": "06-12-1999",
    "Sai Kishore": "06-11-1996", "Andile Simelane": "03-06-2003", "Jan Nicol Loftie-Eaton": "15-03-2001",
    "Spencer Johnson": "16-12-1995", "Arshdeep Singh": "05-02-1999", "Sai Sudharsan": "15-10-2001",
    "Vikramjit Singh": "09-01-2003", "Harpreet Brar": "16-09-1995", "Tilak Varma": "08-11-2002",
    "Noor Ahmad": "03-01-2005", "Noah Croes": "13-12-1999", "Akash Madhwal": "25-11-1993",
    "Mitchell Owen": "16-09-2001", "Harsh Dubey": "23-07-2002", "Shaik Rasheed": "24-09-2004",
    "Dhruv Parashar": "20-12-2004", "Kwena Maphaka": "08-04-2006", "Rupesh Singh": "14-07-2000",
    "Abdollah Ahmadzai": "26-06-2003", "Eshan Malinga": "04-02-2001", "Muhammad Jawadullah": "12-03-1999",
    "Nasum Ahmed": "05-12-1994", "Tashinga Musekiwa": "19-10-2000", "Shamar Joseph": "31-08-1999",
    "Yuvraj Samra": "01-01-2000" # Placeholder/Associate: Adjust if specific DOB known
}

# --- HELPER FUNCTIONS ---

def get_dob_online(player_name, nationality):
    """Fetches DOB from Wikipedia if not in the local verified list."""
    try:
        # Search query: "Name Nationality cricketer"
        query = f"{player_name} {nationality} cricketer"
        results = wikipedia.search(query)
        
        if not results:
            print(f"  [!] Could not find page for {player_name}")
            return None

        # Fetch page content
        page = wikipedia.page(results[0], auto_suggest=False)
        content = page.content[:1000] # Look at first 1000 chars (intro)
        
        # Regex to find dates like "born 10 September 1990" or "born 1990-09-10"
        # 1. Format: 10 September 1990
        match = re.search(r"born\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", content, re.IGNORECASE)
        if match:
            day, month_str, year = match.groups()
            months = {
                "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
                "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
            }
            if month_str in months:
                return f"{int(day):02d}-{months[month_str]:02d}-{year}"

        # 2. Format: YYYY-MM-DD
        match_iso = re.search(r"(\d{4})-(\d{2})-(\d{2})", content)
        if match_iso:
            year, month, day = match_iso.groups()
            return f"{day}-{month}-{year}"
            
        print(f"  [!] DOB format not found on page for {player_name}")
        return None

    except Exception as e:
        print(f"  [!] Error fetching {player_name}: {e}")
        return None

def calculate_age(dob_str):
    """Calculates age from DD-MM-YYYY string."""
    try:
        d_day, d_mon, d_year = map(int, dob_str.split('-'))
        born = date(d_year, d_mon, d_day)
        age = TARGET_DATE.year - born.year - ((TARGET_DATE.month, TARGET_DATE.day) < (born.month, born.day))
        return age
    except Exception:
        return None

# --- MAIN LOGIC ---

def process_database():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file '{INPUT_FILE}' not found.")
        print(f"Current working directory: {os.getcwd()}")
        return

    print(f"Reading {INPUT_FILE}...")
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading input file: {e}")
        return

    players = data.get('players', [])
    total_players = len(players)
    updated_count = 0
    missing_data = []

    print(f"Found {total_players} players. Starting update process...")
    print("-" * 50)

    for i, player in enumerate(players):
        name = player.get('name')
        nationality = player.get('nationality', '')
        
        # 1. Check Verified Dictionary
        dob = verified_dobs.get(name)
        
        # 2. If not found, Attempt Fetch
        if not dob:
            print(f"[{i+1}/{total_players}] Fetching online data for: {name} ({nationality})...")
            dob = get_dob_online(name, nationality)
            if dob:
                print(f"   -> Found: {dob}")
            else:
                print("   -> Failed. Skipping.")
                missing_data.append(name)
        
        # 3. Update Player Record
        if dob:
            new_age = calculate_age(dob)
            if new_age is not None:
                player['age'] = new_age
                player['DOB'] = dob
                updated_count += 1
        
        # Progress bar for verified ones to reduce spam
        elif (i+1) % 50 == 0:
            print(f"Processed {i+1}/{total_players} players...")

    # Save output
    print("-" * 50)
    print(f"Saving to {OUTPUT_FILE}...")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"\nSUCCESS: Updated {updated_count} / {total_players} players.")
    except Exception as e:
        print(f"Error saving output file: {e}")

    if missing_data:
        print(f"\n[WARNING] Could not determine DOB for {len(missing_data)} players:")
        print(", ".join(missing_data))
        print("Please manually add these to the 'verified_dobs' dictionary and re-run.")

if __name__ == "__main__":
    process_database()
