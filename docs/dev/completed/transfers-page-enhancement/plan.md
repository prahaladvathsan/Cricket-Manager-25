# Transfers Page Enhancement Implementation Plan

**Status**: Planned
**Priority**: Medium
**Estimated Effort**: 3-4 hours (basic) / 12-16 hours (full system)
**Dependencies**: financeStore, gameStore (for calendar), auctionStore (for post-auction summary)

## Overview

Clean up the Transfers page and implement transfer window functionality with proper UI integration and planning documentation for the full transfer system.

## Current State

- `src/components/layout/Transfers.jsx` is a placeholder with mock UI
- Shows "Auction system will be available soon"
- No integration with actual auction or transfer systems
- auctionStore exists but not connected to UI

## Requirements

### Phase 1: Basic Cleanup & Banner (This Session Scope)

#### 1.1 Clean Placeholder UI

**Remove**:
- Mock "Auction system will be available soon" message
- Non-functional "Start Mock Auction" button

**Keep**:
- Page structure and layout container

#### 1.2 Route Auction to Transfers Page

**Current Flow**:
- TeamSelectionModal has "Auction" button
- Should route to `/game/transfers` and trigger auction flow

**Implementation**:
```javascript
// In TeamSelectionModal or navigation
navigate('/game/transfers', { state: { triggerAuction: true } });
```

**In Transfers.jsx**:
```javascript
const location = useLocation();
const triggerAuction = location.state?.triggerAuction;

useEffect(() => {
  if (triggerAuction && !auctionCompleted) {
    // Start auction flow
    startAuction();
  }
}, [triggerAuction]);
```

#### 1.3 Post-Auction Summary Display

After auction completes, display the auction summary screen:
- Reuse existing auction summary component from auctionStore
- Show final squad composition
- Show budget spent vs remaining
- Show notable purchases (most expensive, bargains, etc.)

**Structure**:
```jsx
{auctionCompleted && (
  <AuctionSummary summary={auctionSummary} />
)}
```

#### 1.4 Transfer Window Banner

**When league is active** (weeks 1-9, 13+):

```jsx
{isLeagueActive && !isTransferWindowOpen && (
  <div className="card p-3 bg-cricket-primary/10 border border-cricket-accent mb-4">
    <div className="flex items-center gap-3">
      <Calendar className="w-5 h-5 text-cricket-accent" />
      <div>
        <h4 className="font-semibold text-text-primary">Transfer Window</h4>
        <p className="text-sm text-text-secondary">
          Opens Week 10-12 ({transferWindowDates.start} - {transferWindowDates.end})
        </p>
      </div>
    </div>
  </div>
)}
```

**When transfer window is open** (weeks 10-12):

```jsx
{isTransferWindowOpen && (
  <div className="card p-3 bg-green-900/20 border border-green-500 mb-4">
    <div className="flex items-center gap-3">
      <RefreshCw className="w-5 h-5 text-green-400 animate-pulse" />
      <div>
        <h4 className="font-semibold text-green-400">Transfer Window is OPEN</h4>
        <p className="text-sm text-text-secondary">
          Closes on {transferWindowDates.end}
        </p>
      </div>
    </div>
  </div>
)}
```

**Calculate dates from gameStore**:
```javascript
const currentWeek = useGameStore(state => state.currentWeek);
const currentDate = useGameStore(state => state.currentDate);

const isTransferWindowOpen = currentWeek >= 10 && currentWeek <= 12;

// Calculate transfer window dates
const transferWindowDates = useMemo(() => {
  // Week 10 starts on a specific date
  // Each week is 7 days
  // Calculate based on season start date
  const seasonStartDate = new Date('2025-02-01'); // From leagueStore
  const week10Start = new Date(seasonStartDate);
  week10Start.setDate(week10Start.getDate() + (9 * 7)); // 9 weeks * 7 days

  const week12End = new Date(week10Start);
  week12End.setDate(week12End.getDate() + (3 * 7) - 1); // 3 weeks minus 1 day

  return {
    start: week10Start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: week12End.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  };
}, []);
```

### Phase 2: Full Transfer System (Future Implementation)

Document the complete transfer system for future development.

## Implementation Steps (Phase 1)

### Step 1: Clean Transfers.jsx

**File**: `src/components/layout/Transfers.jsx`

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, RefreshCw, Users } from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useLeagueStore from '../../stores/leagueStore';
import useAuctionStore from '../../stores/auctionStore';

const Transfers = () => {
  const location = useLocation();
  const currentWeek = useGameStore(state => state.currentWeek);
  const { seasonName } = useLeagueStore();
  const { auctionCompleted, auctionSummary } = useAuctionStore();

  const isTransferWindowOpen = currentWeek >= 10 && currentWeek <= 12;
  const isLeagueActive = currentWeek > 0; // League has started

  // Calculate transfer window dates
  const transferWindowDates = useMemo(() => {
    const seasonStartDate = new Date('2025-02-01');
    const week10Start = new Date(seasonStartDate);
    week10Start.setDate(week10Start.getDate() + (9 * 7));

    const week12End = new Date(week10Start);
    week12End.setDate(week12End.getDate() + (3 * 7) - 1);

    return {
      start: week10Start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: week12End.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-text-primary">Transfers & Auction</h2>

      {/* Transfer Window Banner */}
      {isLeagueActive && !isTransferWindowOpen && (
        <div className="card p-3 bg-cricket-primary/10 border border-cricket-accent">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cricket-accent" />
            <div>
              <h4 className="font-semibold text-text-primary">Transfer Window</h4>
              <p className="text-sm text-text-secondary">
                Opens Week 10-12 ({transferWindowDates.start} - {transferWindowDates.end})
              </p>
            </div>
          </div>
        </div>
      )}

      {isTransferWindowOpen && (
        <div className="card p-3 bg-green-900/20 border border-green-500">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-green-400 animate-pulse" />
            <div>
              <h4 className="font-semibold text-green-400">Transfer Window is OPEN</h4>
              <p className="text-sm text-text-secondary">
                Closes on {transferWindowDates.end}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auction Summary (if completed) */}
      {auctionCompleted && auctionSummary && (
        <div className="card p-4">
          <h3 className="text-xl font-semibold text-text-primary mb-4">Auction Summary</h3>
          {/* Display auction summary here */}
          <p className="text-text-secondary">Auction completed. Squad finalized.</p>
        </div>
      )}

      {/* Placeholder for transfer system */}
      {!auctionCompleted && (
        <div className="card p-8 text-center">
          <Users className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">
            Transfer system will be available after auction
          </p>
        </div>
      )}
    </div>
  );
};

export default Transfers;
```

### Step 2: Create Transfer Season Plan Document

See: `docs/dev/planned/transfer-season-system/plan.md`

## Files to Modify

1. **Edit**: `src/components/layout/Transfers.jsx` - Complete rewrite
2. **New**: `docs/dev/planned/transfer-season-system/plan.md` - Full system design

## Success Criteria (Phase 1)

- [ ] Transfers page cleaned of placeholder content
- [ ] Transfer window banner displays correct dates
- [ ] Banner shows different states (upcoming, open)
- [ ] Auction summary displays after auction completes
- [ ] Page integrates with gameStore for week tracking
- [ ] Documentation created for full transfer system
