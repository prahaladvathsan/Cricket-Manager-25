# Configuration Files

This directory contains the core configuration files for the playstyle system.

## Source of Truth: role_weightage.xlsx

**The Excel file `role_weightage.xlsx` is the SOURCE OF TRUTH for playstyle weightings.**

### Structure

- **Sheet 1 (Batting)**: Batting playstyle attribute weightings
  - 16 batting playstyles (Opener, Top Order, Middle Order, Lower Order, specialized roles)
  - Columns: Technique, Timing, Footwork, Placement, Range360, DefensiveShots, NeutralShots, AttackingShots, vsPace, vsSpin, Judgement, Strength, Speed, Aggression, Creativity, Concentration

- **Sheet 2 (Bowling)**: Bowling playstyle attribute weightings
  - 4 pace bowling playstyles (Swing Bowler, Hit-the-Deck Seamer, Short-Ball Specialist, Death Specialist)
  - 4 spin bowling playstyles (Classical Spinner, Flat Spinner, Mystery Spinner, Containment Spinner)
  - Columns: Accuracy, Speed/Turn, Swing/Flight, Variations, Intelligence, DefensiveBowling, NeutralBowling, AttackingBowling, Stamina, Temperament

## Generated Files

### playstyle-weightings.json

**AUTO-GENERATED - DO NOT EDIT MANUALLY**

This JSON file is automatically generated from `role_weightage.xlsx`.

**To update:**
```bash
python scripts/generatePlaystyleWeightingsFromExcel.py
```

The script will:
1. Read `role_weightage.xlsx`
2. Create a backup of the existing JSON
3. Generate new `playstyle-weightings.json`
4. Validate the output
5. Delete the backup if validation passes

**What it contains:**
- Batting playstyle weightings (16 playstyles)
- Pace bowling playstyle weightings (4 playstyles)
- Spin bowling playstyle weightings (4 playstyles)
- Fielding playstyle weightings (1 playstyle - Wicketkeeper, hardcoded)
- Role categories (which playstyles apply to which player roles)

### playstyle-modifiers.json

**MANUALLY MAINTAINED - EDIT AS NEEDED**

This file contains dynamic match-context based modifiers that are applied during match simulation.

**NOT derived from Excel** - These are separate configuration values that define:
- Conditional bonuses/penalties based on match situation
- Scaling factors for attributes in specific contexts
- Side effects for specialized playstyles

**Example modifiers:**
- Finisher gets +70% attacking shots in death overs
- Swing Bowler gets +60% swing with new ball
- Death Specialist struggles in powerplay

## Workflow

### Editing Playstyle Weightings

1. **Open `role_weightage.xlsx`** in Excel
2. **Edit the weightings** for batting or bowling playstyles
3. **Save the Excel file**
4. **Run the generation script:**
   ```bash
   python scripts/generatePlaystyleWeightingsFromExcel.py
   ```
5. **Verify the output** - script will validate automatically

### Editing Match Modifiers

1. **Open `playstyle-modifiers.json`** directly
2. **Edit modifiers** for specific playstyles
3. **Save the file**
4. **Test in match simulation**

## File Relationships

```
role_weightage.xlsx (SOURCE OF TRUTH)
         ↓
   [Generation Script]
         ↓
playstyle-weightings.json (AUTO-GENERATED)
         ↓
   [PlaystyleCalculator.js]
         ↓
   Player playstyle ratings


playstyle-modifiers.json (MANUAL)
         ↓
   [AttributeModifierSystem.js]
         ↓
   Dynamic match modifiers
```

## Important Notes

- ✅ **Always edit weightings in Excel**, never in the JSON
- ✅ **Always regenerate JSON** after editing Excel
- ❌ **Never manually edit playstyle-weightings.json** - changes will be overwritten
- ✅ **playstyle-modifiers.json is manually maintained** - edit directly
- ✅ **Fielding playstyles** are hardcoded in the generation script (only Wicketkeeper currently)

## Dependencies

### Python Requirements
```bash
pip install openpyxl
```

### Files Required
- `role_weightage.xlsx` - Source data
- `scripts/generatePlaystyleWeightingsFromExcel.py` - Generation script
- `src/utils/PlaystyleCalculator.js` - Consumes weightings JSON
- `src/core/match-engine/systems/AttributeModifierSystem.js` - Consumes modifiers JSON
