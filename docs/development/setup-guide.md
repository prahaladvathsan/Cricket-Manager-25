# Development Setup Guide

## Prerequisites

### Required Software

- **Node.js**: Version 18+ (LTS recommended)
- **Git**: For version control
- **VS Code**: Recommended editor with extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## Repository Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/cricket-manager.git
cd cricket-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Setup

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to verify the application loads.

## Data Processing Setup (Optional)

If you need to process new player data:

### 1. Clone Data Processor

```bash
cd ..  # Go to parent directory
git clone https://github.com/your-username/cricket-data-processor.git
```

### 2. Setup Python Environment

```bash
cd cricket-data-processor
pip install pandas numpy scipy jupyter matplotlib seaborn openpyxl
```

### 3. Run Processing Pipeline

```bash
jupyter notebook notebooks/run_stats_consolidator.ipynb
```

## Development Workflow

### Project Structure

```
cricket-manager/
├── src/
│   ├── components/         # React components
│   │   ├── layout/        # Layout components
│   │   ├── match/         # Match-related components
│   │   ├── team/          # Team management components
│   │   ├── player/        # Player components
│   │   └── shared/        # Reusable components
│   ├── stores/            # Zustand state stores
│   ├── core/              # Core game systems
│   │   └── match-engine/  # Ball-by-ball simulation
│   ├── data/              # Static game data
│   │   ├── players/       # Player database
│   │   ├── teams/         # Team definitions
│   │   └── config/        # Game configuration
│   ├── utils/             # Utility functions
│   └── App.jsx            # Main application
├── docs/                  # Documentation
├── public/                # Static assets
└── package.json
```

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Code Standards

### Component Structure

```javascript
/**
 * @file ComponentName.jsx
 * @description Brief description of component purpose
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.title - Title text
 * @returns {JSX.Element} Component JSX
 */
const ComponentName = ({ title, children }) => {
  // Component logic

  return (
    <div className="component-container">
      <h1>{title}</h1>
      {children}
    </div>
  );
};

ComponentName.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node
};

ComponentName.defaultProps = {
  children: null
};

export default ComponentName;
```

### Store Structure

```javascript
/**
 * @file storeName.js
 * @description Store description and responsibilities
 */

import { create } from 'zustand';

const useStoreName = create((set, get) => ({
  // State
  someState: initialValue,

  // Actions
  updateState: (newValue) => set({ someState: newValue }),

  // Computed getters
  getComputedValue: () => {
    const state = get();
    return computeValue(state.someState);
  },

  // Async actions
  fetchData: async () => {
    set({ loading: true });
    try {
      const data = await api.fetchData();
      set({ data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));

export default useStoreName;
```

### Naming Conventions

- **Components**: PascalCase (`PlayerCard.jsx`)
- **Stores**: camelCase (`playerStore.js`)
- **Utilities**: kebab-case (`player-utils.js`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PLAYERS`)
- **CSS Classes**: kebab-case (`player-card`)

## Styling Guidelines

### Tailwind CSS Usage

```javascript
// Component with Tailwind classes
const PlayerCard = ({ player }) => (
  <div className="bg-cricket-surface rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
    <h3 className="text-cricket-text-primary font-semibold text-lg">
      {player.name}
    </h3>
    <p className="text-cricket-text-secondary text-sm">
      {player.role}
    </p>
  </div>
);
```

### Custom CSS Classes

```css
/* Use Tailwind @apply for reusable patterns */
.btn-primary {
  @apply bg-cricket-primary hover:bg-cricket-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors;
}

.card {
  @apply bg-cricket-surface rounded-lg p-4 shadow-sm border border-cricket-border;
}
```

### Color System

```javascript
// tailwind.config.js color definitions
const colors = {
  'cricket-primary': '#1a472a',
  'cricket-secondary': '#2d5016',
  'cricket-accent': '#ff6b6b',
  'cricket-background': '#0f1419',
  'cricket-surface': '#1a1f2a',
  'cricket-text-primary': '#ffffff',
  'cricket-text-secondary': '#8b92a3'
};
```

## State Management Patterns

### Store Usage in Components

```javascript
// Good: Subscribe to specific values
const PlayerList = () => {
  const players = usePlayerStore(state => state.players);
  const searchPlayers = usePlayerStore(state => state.searchPlayers);

  // Component implementation
};

// Better: Use selector for derived data
const useTeamPlayers = (teamId) => {
  return usePlayerStore(
    state => Object.values(state.players).filter(p => p.teamId === teamId)
  );
};
```

### Action Patterns

```javascript
// Synchronous actions
const updatePlayer = (playerId, updates) => set(state => ({
  players: {
    ...state.players,
    [playerId]: {
      ...state.players[playerId],
      ...updates
    }
  }
}));

// Asynchronous actions with loading states
const saveGame = async (slotId) => {
  set({ saving: true, error: null });
  try {
    const gameState = get();
    await saveToStorage(slotId, gameState);
    set({ saving: false, lastSaved: Date.now() });
  } catch (error) {
    set({ saving: false, error: error.message });
  }
};
```

## Testing

### Test Structure

```javascript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerCard from '../PlayerCard';

describe('PlayerCard', () => {
  const mockPlayer = {
    id: '1',
    name: 'Test Player',
    role: 'Batsman',
    rating: 85
  };

  test('renders player information', () => {
    render(<PlayerCard player={mockPlayer} />);

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByText('Batsman')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const onSelect = jest.fn();
    render(<PlayerCard player={mockPlayer} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockPlayer.id);
  });
});
```

### Store Testing

```javascript
// Store testing
import { renderHook, act } from '@testing-library/react';
import usePlayerStore from '../stores/playerStore';

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      players: {},
      searchResults: []
    });
  });

  test('should search players by criteria', () => {
    const { result } = renderHook(() => usePlayerStore());

    act(() => {
      result.current.searchPlayers({ role: 'Batsman' });
    });

    expect(result.current.searchResults).toEqual(
      expect.arrayContaining([expect.any(String)])
    );
  });
});
```

## Debugging

### Browser DevTools

```javascript
// Debug store state in console
window.debugStores = () => ({
  game: useGameStore.getState(),
  teams: useTeamStore.getState(),
  players: usePlayerStore.getState(),
  match: useMatchStore.getState(),
  ui: useUIStore.getState()
});
```

### Development Logging

```javascript
// Conditional logging for development
const DEBUG = import.meta.env.DEV;

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[Cricket Manager] ${message}`, data);
  }
};

// Usage in components
const handlePlayerSelect = (playerId) => {
  log('Player selected', { playerId });
  selectPlayer(playerId);
};
```

## Performance Optimization

### Component Optimization

```javascript
import { memo, useMemo } from 'react';

// Memoized component
const PlayerCard = memo(({ player, onSelect }) => {
  const displayStats = useMemo(() =>
    calculateDisplayStats(player.attributes),
    [player.attributes]
  );

  return (
    <div onClick={() => onSelect(player.id)}>
      {/* Component content */}
    </div>
  );
});
```

### Store Performance

```javascript
// Efficient store selectors
const usePlayerData = (playerId) => {
  return usePlayerStore(
    useCallback(
      state => state.players[playerId],
      [playerId]
    )
  );
};
```

## Build Optimization

### Vite Configuration

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          match: ['./src/core/match-engine']
        }
      }
    }
  }
});
```

## Troubleshooting

### Common Issues

**Hot Reload Not Working**:
- Check if files are saved properly
- Restart development server
- Clear browser cache

**Store State Not Updating**:
- Verify store actions are called correctly
- Check component subscriptions
- Use React DevTools to inspect state

**Import Errors**:
- Check file paths are correct
- Verify exports/imports match
- Clear node_modules and reinstall

### Getting Help

1. **Documentation**: Check relevant docs in `/docs` folder
2. **Code Examples**: Look at existing components for patterns
3. **Console Logs**: Use browser DevTools for debugging
4. **Git History**: Check recent changes for context