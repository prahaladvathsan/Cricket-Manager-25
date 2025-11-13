# Shared Components

## Clickable Entity Components

### PlayerName
**Single source of truth for displaying player names.**

```jsx
import PlayerName from '../shared/PlayerName';

// Basic
<PlayerName playerId="player-123" />

// With object
<PlayerName player={playerObject} />

// Inline with styling
<PlayerName playerId={id} inline={true} className="font-bold" />
```

- Automatically clickable
- Opens `PlayerCardModal` with stats, attributes, playstyles
- Cricket-accent color with hover underline

### TeamName
**Single source of truth for displaying team names.**

```jsx
import TeamName from '../shared/TeamName';

// Basic
<TeamName teamId="mumbai-thunders" />

// Short name variant
<TeamName teamId={id} variant="short" />

// Inline with styling
<TeamName teamId={id} inline={true} className="font-bold" />
```

- Automatically clickable
- Opens `TeamCardModal` with roster, stats, squad composition
- Supports `variant="short"` for abbreviated names

## Other Shared Components

- `PlayerCard` - Full player card display
- `PlayerCardModal` - Modal wrapper for player details
- `TeamCard` - Full team card display with roster
- `TeamCardModal` - Modal wrapper for team details
