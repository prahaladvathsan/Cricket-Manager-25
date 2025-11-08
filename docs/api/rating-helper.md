# Rating Helper API

**Module**: `ratingHelper.js`
**Location**: `src/utils/`
**Version**: 1.0.0
**Date**: January 2025

## Overview

Utility module providing consistent access to player playstyle ratings throughout the application. Replaces the non-existent `player.rating` field with proper primary playstyle rating retrieval.

## Problem Statement

**Historical Issue**: Multiple components referenced `player.rating`, which doesn't exist in player objects. This caused "N/A" displays throughout the UI.

**Solution**: Centralized rating access through well-defined functions that extract primary playstyle ratings from player data.

## Functions

### `getPrimaryBattingRating(player)`

Gets the primary batting playstyle rating for a player.

**Parameters**:
- `player` (Object): Player object

**Returns**:
- `number`: Rating value (0-100 scale), or 0 if not available

**Rating Priority**:
1. `player.topPlaystyles.batting[0].rating` (most reliable)
2. `player.playstyleRatings.batting[player.primaryPlaystyle.batting]` (fallback)
3. `player.attributes.overall.batting_overall * 5` (last resort, scaled from 1-20)
4. `0` (no data)

**Example**:
```javascript
import { getPrimaryBattingRating } from '../utils/ratingHelper';

const player = {
  topPlaystyles: {
    batting: [
      { name: "Finisher", rating: 78.5 },
      { name: "Middle Order - Slogger", rating: 67.2 }
    ]
  }
};

const rating = getPrimaryBattingRating(player);
// Returns: 78.5
```

---

### `getPrimaryBowlingRating(player)`

Gets the primary bowling playstyle rating for a player.

**Parameters**:
- `player` (Object): Player object

**Returns**:
- `number`: Rating value (0-100 scale), or 0 if not available

**Rating Priority**:
1. `player.topPlaystyles.bowling[0].rating` (most reliable)
2. `player.playstyleRatings.bowling[player.primaryPlaystyle.bowling]` (fallback)
3. `player.attributes.overall.bowling_overall * 5` (last resort, scaled from 1-20)
4. `0` (no data)

**Example**:
```javascript
import { getPrimaryBowlingRating } from '../utils/ratingHelper';

const player = {
  topPlaystyles: {
    bowling: [
      { name: "Death Specialist", rating: 65.3 },
      { name: "Swing Bowler", rating: 42.8 }
    ]
  }
};

const rating = getPrimaryBowlingRating(player);
// Returns: 65.3
```

---

### `getPlayerRating(player)`

Gets the most appropriate rating for a player based on their role.

**Parameters**:
- `player` (Object): Player object

**Returns**:
- `number`: Rating value (0-100 scale)

**Logic**:
- **Bowlers**: Returns `getPrimaryBowlingRating(player)`
- **All-rounders**: Returns `Math.max(battingRating, bowlingRating)`
- **Batsmen/Keepers/Others**: Returns `getPrimaryBattingRating(player)`

**Example**:
```javascript
import { getPlayerRating } from '../utils/ratingHelper';

const allRounder = {
  role: 'all-rounder',
  topPlaystyles: {
    batting: [{ name: "Middle Order - Balanced", rating: 70.0 }],
    bowling: [{ name: "Swing Bowler", rating: 75.0 }]
  }
};

const rating = getPlayerRating(allRounder);
// Returns: 75.0 (higher of the two)
```

---

### `formatRating(rating, decimals = 1)`

Formats a rating value for display with consistent decimal places.

**Parameters**:
- `rating` (number): Rating value to format
- `decimals` (number, optional): Number of decimal places (default: 1)

**Returns**:
- `string`: Formatted rating string ("78.5") or "N/A" if invalid

**Example**:
```javascript
import { formatRating } from '../utils/ratingHelper';

formatRating(78.543);          // "78.5"
formatRating(78.543, 2);       // "78.54"
formatRating(0);               // "N/A"
formatRating(null);            // "N/A"
formatRating(undefined);       // "N/A"
```

---

### `getPlayerRatings(player)`

Gets both batting and bowling ratings for a player.

**Parameters**:
- `player` (Object): Player object

**Returns**:
- `Object`: Object with `batting` and `bowling` properties
  - `batting` (number): Primary batting playstyle rating
  - `bowling` (number): Primary bowling playstyle rating

**Example**:
```javascript
import { getPlayerRatings } from '../utils/ratingHelper';

const player = {
  topPlaystyles: {
    batting: [{ name: "Finisher", rating: 78.5 }],
    bowling: [{ name: "Death Specialist", rating: 65.3 }]
  }
};

const ratings = getPlayerRatings(player);
// Returns: { batting: 78.5, bowling: 65.3 }
```

## Usage Patterns

### UI Display

```jsx
import { getPrimaryBattingRating, formatRating } from '../utils/ratingHelper';

const PlayerCard = ({ player }) => {
  const rating = getPrimaryBattingRating(player);

  return (
    <div>
      <span>{player.name}</span>
      <span>{formatRating(rating)}</span>
    </div>
  );
};
```

### Sorting

```jsx
import { getPrimaryBattingRating } from '../utils/ratingHelper';

const sortedPlayers = players.sort((a, b) =>
  getPrimaryBattingRating(b) - getPrimaryBattingRating(a)
);
```

### Filtering

```jsx
import { getPrimaryBowlingRating } from '../utils/ratingHelper';

const primaryBowlers = players.filter(p =>
  getPrimaryBowlingRating(p) > 40
);
```

### Conditional Display

```jsx
import { getPlayerRating } from '../utils/ratingHelper';

const PlayerBadge = ({ player }) => {
  const rating = getPlayerRating(player);
  const color = rating >= 70 ? 'gold' : rating >= 50 ? 'silver' : 'bronze';

  return <span className={color}>{player.name}</span>;
};
```

## Player Data Structure

Expected player object structure:

```javascript
{
  id: "player_123",
  name: "Player Name",
  role: "all-rounder",               // 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper'

  // Primary playstyle names
  primaryPlaystyle: {
    batting: "Finisher",
    bowling: "Death Specialist"
  },

  // Top 3 playstyles with ratings (most reliable source)
  topPlaystyles: {
    batting: [
      { name: "Finisher", rating: 78.5 },
      { name: "Middle Order - Slogger", rating: 67.2 },
      { name: "Pinch-Hitter", rating: 55.8 }
    ],
    bowling: [
      { name: "Death Specialist", rating: 65.3 },
      { name: "Swing Bowler", rating: 42.8 },
      { name: "Hit-the-Deck Seamer", rating: 38.1 }
    ]
  },

  // All playstyle ratings (fallback source)
  playstyleRatings: {
    batting: {
      "Finisher": 78.5,
      "Opener - Slogger": 45.2,
      // ... all 16 batting playstyles
    },
    bowling: {
      "Death Specialist": 65.3,
      "Swing Bowler": 42.8,
      // ... 4 pace or 4 spin playstyles
    }
  },

  // Overall attribute ratings (last resort, 1-20 scale)
  attributes: {
    overall: {
      batting_overall: 15,           // Scales to 75.0 (15 * 5)
      bowling_overall: 13            // Scales to 65.0 (13 * 5)
    }
  }
}
```

## Error Handling

All functions are **null-safe** and **defensive**:
- Return `0` for missing/invalid player objects
- Return `0` for missing playstyle data
- Use optional chaining (`?.`) throughout
- No exceptions thrown

**Example**:
```javascript
getPrimaryBattingRating(null);           // 0
getPrimaryBattingRating({});             // 0
getPrimaryBattingRating(undefined);      // 0
formatRating(null);                      // "N/A"
```

## Components Using This Module

### Core Components
- `Squad.jsx` - Squad overview table
- `SquadPlaystyleTab.jsx` - Tactics squad selection
- `BattingOrderTab.jsx` - Batting order display
- `BowlingPlansTab.jsx` - Bowler selection and display

### Future Usage
- Player comparison views
- Leaderboards
- Transfer market
- Player search/filter

## Migration Guide

### Before (Incorrect)

```javascript
// ❌ player.rating doesn't exist
const rating = player.rating?.toFixed(1) || 'N/A';

// ❌ Sorting by non-existent field
players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
```

### After (Correct)

```javascript
// ✅ Use rating helper
import { getPrimaryBattingRating, formatRating } from '../utils/ratingHelper';

const rating = formatRating(getPrimaryBattingRating(player));

// ✅ Sort by actual playstyle rating
players.sort((a, b) =>
  getPrimaryBattingRating(b) - getPrimaryBattingRating(a)
);
```

## Performance

- **Computational cost**: Minimal (simple object property access)
- **Memoization**: Not required (fast enough for real-time sorting/filtering)
- **Bundle size**: ~1KB minified

## Testing

### Unit Test Examples

```javascript
import {
  getPrimaryBattingRating,
  getPrimaryBowlingRating,
  getPlayerRating,
  formatRating
} from '../utils/ratingHelper';

describe('Rating Helper', () => {
  it('should return batting rating from topPlaystyles', () => {
    const player = {
      topPlaystyles: { batting: [{ rating: 78.5 }] }
    };
    expect(getPrimaryBattingRating(player)).toBe(78.5);
  });

  it('should return 0 for null player', () => {
    expect(getPrimaryBattingRating(null)).toBe(0);
  });

  it('should format rating with 1 decimal by default', () => {
    expect(formatRating(78.543)).toBe('78.5');
  });

  it('should return N/A for zero rating', () => {
    expect(formatRating(0)).toBe('N/A');
  });

  it('should return max rating for all-rounders', () => {
    const player = {
      role: 'all-rounder',
      topPlaystyles: {
        batting: [{ rating: 70 }],
        bowling: [{ rating: 75 }]
      }
    };
    expect(getPlayerRating(player)).toBe(75);
  });
});
```

## Related Documentation

- [Player Data Structure](./player-data.md)
- [Playstyle System](../core-systems/playstyle-system.md)
- [Squad View Component](../components/squad-view.md)
- [Tactics Modal Component](../components/tactics-modal.md)

---

**Last Updated**: January 2025
