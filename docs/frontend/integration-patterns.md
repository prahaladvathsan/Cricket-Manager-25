# UI Integration Patterns

## Overview

This guide explains how to integrate Cricket Manager's React UI with Zustand stores and core game systems (match engine, league simulator, auction engine, etc.).

---

## Store Integration Patterns

### 1. Basic Store Subscription

```javascript
import useMatchStore from 'src/stores/matchStore';

function ScoreDisplay() {
  // Subscribe to entire store (re-renders on any change)
  const matchStore = useMatchStore();

  return (
    <div>
      {matchStore.teams.batting.totalScore}/{matchStore.teams.batting.wickets}
    </div>
  );
}
```

**⚠️ Warning**: Subscribes to entire store - may cause unnecessary re-renders

---

### 2. Selective Store Subscription (Recommended)

```javascript
import useMatchStore from 'src/stores/matchStore';

function ScoreDisplay() {
  // Subscribe to specific slices only
  const score = useMatchStore(state => state.teams.batting.totalScore);
  const wickets = useMatchStore(state => state.teams.batting.wickets);

  // Component only re-renders when score or wickets change
  return (
    <div>{score}/{wickets}</div>
  );
}
```

**✅ Best Practice**: Only subscribe to data you actually use

---

### 3. Derived State with Selectors

```javascript
import useMatchStore from 'src/stores/matchStore';
import { useMemo } from 'react';

// Create reusable selector
const selectMatchSummary = (state) => ({
  score: `${state.teams.batting.totalScore}/${state.teams.batting.wickets}`,
  overs: `${state.currentBall.over}.${state.currentBall.ball}`,
  runRate: state.teams.batting.totalScore /
    ((state.currentBall.over * 6 + state.currentBall.ball) / 6)
});

function MatchSummary() {
  const summary = useMatchStore(selectMatchSummary);

  return (
    <div>
      <div>{summary.score} ({summary.overs} ov)</div>
      <div>RR: {summary.runRate.toFixed(2)}</div>
    </div>
  );
}
```

**✅ Benefits**:
- Single subscription for multiple related values
- Reduces re-renders through shallow comparison
- Reusable selectors across components

---

### 4. Store Actions

```javascript
import useMatchStore from 'src/stores/matchStore';

function TacticsPanel() {
  // Get action from store
  const updateTactics = useMatchStore(state => state.updateTacticsState);

  const handleAccelerationChange = (tier) => {
    updateTactics({
      currentAcceleration: {
        striker: tier
      }
    });
  };

  return (
    <button onClick={() => handleAccelerationChange('Attack')}>
      Set Attack Mode
    </button>
  );
}
```

---

### 5. Multiple Store Integration

```javascript
import useMatchStore from 'src/stores/matchStore';
import usePlayerStore from 'src/stores/playerStore';
import useTeamStore from 'src/stores/teamStore';

function MatchPlayerCard() {
  // Subscribe to multiple stores
  const strikerId = useMatchStore(state => state.innings.striker);
  const striker = usePlayerStore(state => state.getPlayer(strikerId));
  const userTeam = useTeamStore(state => state.getUserTeam());

  const isUserPlayer = striker.currentTeam === userTeam?.id;

  return (
    <div>
      <h3>{striker.name}</h3>
      {isUserPlayer && <span>★ Your Player</span>}
    </div>
  );
}
```

---

## Core System Integration

### 1. Match Engine Integration

```javascript
import useMatchStore from 'src/stores/matchStore';
import MatchEngine from 'src/core/match-engine/core/MatchEngine';
import { useEffect, useState } from 'react';

function MatchView() {
  const [engine, setEngine] = useState(null);
  const matchStore = useMatchStore();

  useEffect(() => {
    // Initialize match engine
    const matchEngine = new MatchEngine(
      useMatchStore,
      usePlayerStore,
      useTeamStore,
      { interactiveMode: true, showBallByBall: true }
    );

    setEngine(matchEngine);

    // Start match
    matchEngine.startMatch({
      homeTeam: { id: 'mumbai', name: 'Mumbai Thunders' },
      awayTeam: { id: 'london', name: 'London Lions' },
      venue: 'Wankhede',
      tossWinner: 'mumbai',
      tossDecision: 'bat'
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div>
      {/* Match UI components */}
    </div>
  );
}
```

---

### 2. Real-Time Match Updates

```javascript
import useMatchStore from 'src/stores/matchStore';
import { useEffect } from 'react';

function LiveCommentary() {
  const commentary = useMatchStore(state => state.commentary);

  useEffect(() => {
    // Auto-scroll to latest commentary
    const commentaryElement = document.getElementById('commentary');
    if (commentaryElement) {
      commentaryElement.scrollTop = commentaryElement.scrollHeight;
    }
  }, [commentary.length]);

  return (
    <div id="commentary" className="overflow-y-auto h-96">
      {commentary.map((item, index) => (
        <div key={index} className="mb-2">
          {item}
        </div>
      ))}
    </div>
  );
}
```

---

### 3. League Simulator Integration

```javascript
import useLeagueStore from 'src/stores/leagueStore';
import usePlayerStore from 'src/stores/playerStore';
import useTeamStore from 'src/stores/teamStore';
import LeagueSimulator from 'src/core/league/LeagueSimulator';
import { useState } from 'react';

function LeagueControl() {
  const [isSimulating, setIsSimulating] = useState(false);
  const leagueStore = useLeagueStore();

  const simulateWeek = async () => {
    setIsSimulating(true);

    const simulator = new LeagueSimulator(
      useLeagueStore,
      usePlayerStore,
      useTeamStore,
      useMatchStore
    );

    // Simulate one week of matches
    await simulator.simulateMatchday(leagueStore.getState().currentWeek);

    setIsSimulating(false);
  };

  return (
    <button
      onClick={simulateWeek}
      disabled={isSimulating}
      className="btn-primary"
    >
      {isSimulating ? 'Simulating...' : 'Simulate Week'}
    </button>
  );
}
```

---

### 4. Auction System Integration

```javascript
import useFinanceStore from 'src/stores/financeStore';
import useTeamStore from 'src/stores/teamStore';
import AuctionEngine from 'src/core/auction-system/AuctionEngine';
import { useState } from 'react';

function AuctionView() {
  const [auctionEngine] = useState(() => new AuctionEngine({ fastMode: false }));
  const [currentPlayer, setCurrentPlayer] = useState(null);

  const userTeam = useTeamStore(state => state.getUserTeam());
  const budget = useFinanceStore(state => state.getTeamBudget(userTeam?.id));

  const placeBid = (amount) => {
    const result = auctionEngine.processBid(userTeam.id, currentPlayer.id, amount);

    if (result.success) {
      // Update UI to show bid placed
      setCurrentPlayer(prev => ({
        ...prev,
        currentBid: amount,
        currentBidder: userTeam.id
      }));
    }
  };

  return (
    <div>
      <div>Budget: ₹{budget} Cr</div>
      {currentPlayer && (
        <div>
          <h2>{currentPlayer.name}</h2>
          <p>Current Bid: ₹{currentPlayer.currentBid} Cr</p>
          <button onClick={() => placeBid(currentPlayer.currentBid + 0.5)}>
            Bid +₹50L
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Event-Based Updates

### 1. Event Bus Pattern (Recommended for Match Updates)

```javascript
// src/utils/eventBus.js
class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

export default new EventBus();
```

**Usage in Match Engine**:
```javascript
// In SimpleBallSimulator.js
import eventBus from 'src/utils/eventBus';

async simulateBall(ballContext) {
  const ballResult = // ... simulate ball

  // Update store
  matchStore.getState().processBallResult(ballResult);

  // Emit event for UI
  eventBus.emit('ball-simulated', ballResult);

  return ballResult;
}
```

**Usage in Component**:
```javascript
import eventBus from 'src/utils/eventBus';
import { useEffect } from 'react';

function PitchVisualization() {
  useEffect(() => {
    const handleBallSimulated = (ballResult) => {
      // Animate ball trajectory
      animateBall(ballResult.trajectory);
    };

    eventBus.on('ball-simulated', handleBallSimulated);

    return () => {
      eventBus.off('ball-simulated', handleBallSimulated);
    };
  }, []);

  return <canvas id="pitch" />;
}
```

---

### 2. Polling Pattern (For Non-Critical Updates)

```javascript
import { useEffect } from 'react';
import useLeagueStore from 'src/stores/leagueStore';

function StandingsWidget() {
  const standings = useLeagueStore(state => state.standings);

  useEffect(() => {
    // Poll for standings updates every 5 seconds
    const interval = setInterval(() => {
      // Trigger standings recalculation
      useLeagueStore.getState().refreshStandings();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    // Standings table
  );
}
```

---

## Performance Optimization

### 1. Memoization

```javascript
import { useMemo } from 'react';
import useLeagueStore from 'src/stores/leagueStore';

function StandingsTable() {
  const standings = useLeagueStore(state => state.standings);

  // Memoize sorted standings
  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });
  }, [standings]);

  return (
    <table>
      {sortedStandings.map(team => (
        <tr key={team.clubId}>
          {/* ... */}
        </tr>
      ))}
    </table>
  );
}
```

---

### 2. Debouncing

```javascript
import { useState, useCallback } from 'react';
import usePlayerStore from 'src/stores/playerStore';

function PlayerSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const searchPlayers = usePlayerStore(state => state.searchPlayers);

  // Debounce search
  const debouncedSearch = useCallback(
    debounce((term) => {
      searchPlayers(term);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={handleSearchChange}
      placeholder="Search players..."
    />
  );
}

// Utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

---

### 3. Virtual Scrolling (For Large Lists)

```javascript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import usePlayerStore from 'src/stores/playerStore';

function PlayerList() {
  const parentRef = useRef(null);
  const players = usePlayerStore(state => Object.values(state.players));

  const virtualizer = useVirtualizer({
    count: players.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
  });

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-y-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <PlayerRow player={players[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Error Handling

### 1. Error Boundaries

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-bg-secondary border border-status-critical rounded-lg p-6">
          <h2 className="text-xl font-semibold text-status-critical mb-2">
            Something went wrong
          </h2>
          <p className="text-text-secondary">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 btn-primary"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary>
      <MatchView />
    </ErrorBoundary>
  );
}
```

---

### 2. Try-Catch in Store Actions

```javascript
// In store
processBallResult: (ballResult) => set((state) => {
  try {
    const newBallByBall = [...state.ballByBall, ballResult];
    const newCommentary = [...state.commentary, ballResult.commentary];

    // ... update logic

    return {
      ballByBall: newBallByBall,
      commentary: newCommentary,
      // ... other updates
    };
  } catch (error) {
    console.error('Error processing ball result:', error);
    // Return unchanged state on error
    return state;
  }
}),
```

---

## Loading States

```javascript
import { useState, useEffect } from 'react';
import usePlayerStore from 'src/stores/playerStore';

function PlayerProfile({ playerId }) {
  const [loading, setLoading] = useState(true);
  const player = usePlayerStore(state => state.getPlayer(playerId));

  useEffect(() => {
    if (player) {
      setLoading(false);
    }
  }, [player]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-primary" />
      </div>
    );
  }

  return (
    <div>
      <h2>{player.name}</h2>
      {/* Player details */}
    </div>
  );
}
```

---

## Common Patterns Summary

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Selective Subscription** | Minimize re-renders | Subscribe to specific state slices |
| **Selectors** | Derived state | Combine multiple values |
| **Event Bus** | Real-time updates | Match ball simulation |
| **Polling** | Non-critical updates | Standings refresh |
| **Memoization** | Expensive calculations | Sorting, filtering |
| **Debouncing** | User input | Search, filters |
| **Virtual Scrolling** | Large lists | Player lists (500+ items) |
| **Error Boundaries** | Error handling | Catch component errors |

---

## Next Steps

1. ✅ Integration patterns documented
2. **Implement EventBus** for match updates
3. **Create custom hooks** for common store patterns
4. **Build example components** using these patterns
5. **Test with real data** to validate approach
