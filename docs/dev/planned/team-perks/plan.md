# Team Perks System

## Overview

Each WPL team has a unique perk that provides gameplay bonuses aligned with their thematic identity. Perks are currently placeholder UI elements and need to be implemented with actual match engine effects.

## Team Perk Assignments

### Spin Perks (Snake-themed teams)
| Team | Perk Name | Description | Proposed Effect |
|------|-----------|-------------|-----------------|
| Chennai Cobras | Venom Strike | Spinners extract extra turn from the pitch | +5-10% spin effectiveness at home |
| Pretoria Pythons | Coiled Deception | Slower ball variations are more effective | +10% slower ball disguise success |

### Pace Perks (Marine-themed teams)
| Team | Perk Name | Description | Proposed Effect |
|------|-----------|-------------|-----------------|
| Sydney Sharks | Predator Instinct | Fast bowlers sense weakness and strike hard | +5% wicket chance when batter under pressure |
| Auckland Orcas | Deep Pressure | Pacers maintain intensity in death overs | -10% pace energy drain in overs 16-20 |

### Fielding Perks (Jungle/Swamp-themed teams)
| Team | Perk Name | Description | Proposed Effect |
|------|-----------|-------------|-----------------|
| Georgetown Jaguars | Jungle Reflexes | Enhanced catching and ground fielding | +5% catch success, +3% run-out chance |
| Colombo Crocodiles | Snap Attack | Lightning-fast run-out conversions | +10% run-out conversion rate |

### Batting Perks (Other teams)
| Team | Perk Name | Description | Proposed Effect |
|------|-----------|-------------|-----------------|
| London Lions | Pride's Roar | Batters thrive under pressure situations | +5% batting when chasing or under pressure |
| Multan Markhors | Mountain Resilience | Strong defensive technique | +10% dot ball survival rate |
| Dhaka Dolphins | River Flow | Smooth stroke play with elegant timing | +5% timing modifier for batters |
| Kabul Kites | Soaring Spirit | Aggressive power hitting in the air | +10% six-hitting success rate |

## Implementation Requirements

### Data Structure
Perks are stored in `src/data/teams/wpl-teams.json`:

```json
{
  "perk": {
    "name": "Venom Strike",
    "category": "spin",
    "description": "Spinners extract extra turn from the pitch",
    "icon": "spin"
  }
}
```

### Match Engine Integration
1. **Location**: `src/core/match-engine/systems/AttributeModifierSystem.js`
2. **Hook Point**: Apply perk modifiers during the modifier chain calculation
3. **Considerations**:
   - Some perks are home-ground only (spin perks)
   - Some perks are situational (pressure, death overs)
   - Balance: Keep bonuses small (5-10%) to avoid breaking game balance

### UI Components Affected
- `TeamSelectionModal.jsx` - Already displays perk (done)
- `Squad.jsx` - Could show team perk in header
- `MatchPreview.jsx` - Show both team perks before match
- `MatchdayUI.jsx` - Indicate when perk is active

## Priority

**Low** - This is a polish feature that enhances team identity but is not critical for core gameplay.

## Dependencies
- Match engine modifier system (exists)
- Pressure calculation system (exists)
- Energy system (exists)

## Future Expansion Ideas
- Perk upgrades through achievements
- Unlockable secondary perks
- Perk synergies with player playstyles
- Seasonal perk events
