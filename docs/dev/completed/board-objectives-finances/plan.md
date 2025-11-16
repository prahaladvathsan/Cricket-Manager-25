# Board Objectives & Finances Integration Plan

**Status**: Planned
**Priority**: High
**Estimated Effort**: 6-8 hours
**Dependencies**: financeStore, leagueStore, gameStore, teamStore

## Overview

Integrate the Board page with live financial data and implement dynamic objectives tracking with progress indicators.

## Current State

**File**: `src/components/layout/Board.jsx`
- Shows **hardcoded** objectives (build squad, qualify, win championship)
- Shows **hardcoded** finances (₹90 Cr total, ₹0 spent)
- No integration with stores
- No progress tracking

## Requirements

### Part 1: Objectives with Live Progress Tracking

#### 1.1 Create ObjectivesPanel Component

**File**: `src/components/board/ObjectivesPanel.jsx`

**Features**:
- Display board objectives with live progress
- Visual progress bars
- Status indicators (not started, in progress, completed, failed)
- Dynamic messaging based on performance

**Objective Types**:

1. **Complete Auction** (Pre-season)
   - Status: ✅ when auction completed
   - Progress: Binary (0% or 100%)

2. **Qualify for Playoffs** (Season)
   - Status: In Progress / Completed / Failed
   - Progress: Based on current standing
   - Target: Finish Top 4
   - Display: "Currently 3rd place, 2 matches remaining"

3. **Win Championship** (Season)
   - Status: Not Started / In Progress / Completed / Failed
   - Progress: Through playoff stages
   - Stages: Qualify (Top 4) → Playoffs → Final → Champion

**Component Structure**:
```jsx
const ObjectivesPanel = () => {
  const { standings, stage, champion } = useLeagueStore();
  const { auctionCompleted } = useAuctionStore();
  const userTeam = useTeamStore(state => state.userTeam);

  // Calculate current position
  const userPosition = standings.findIndex(s => s.clubId === userTeam.id) + 1;
  const totalMatches = 18; // WPL season
  const played = standings.find(s => s.clubId === userTeam.id)?.played || 0;
  const remaining = totalMatches - played;

  const objectives = [
    {
      id: 'auction',
      title: 'Complete Squad Building',
      description: 'Complete the auction and finalize your squad',
      progress: auctionCompleted ? 100 : 0,
      status: auctionCompleted ? 'completed' : 'pending',
      icon: Users
    },
    {
      id: 'playoffs',
      title: 'Qualify for Playoffs',
      description: 'Finish in the top 4 to qualify for playoffs',
      progress: calculatePlayoffProgress(userPosition, played, totalMatches),
      status: getPlayoffStatus(userPosition, stage),
      details: `Currently ${userPosition}${getOrdinal(userPosition)} place, ${remaining} matches remaining`,
      icon: Target
    },
    {
      id: 'championship',
      title: 'Win the Championship',
      description: 'Win the World Premier League title',
      progress: calculateChampionshipProgress(stage, champion, userTeam.id),
      status: getChampionshipStatus(stage, champion, userTeam.id),
      details: getChampionshipDetails(stage),
      icon: Trophy
    }
  ];

  return (
    <div className="space-y-3">
      {objectives.map(obj => (
        <ObjectiveCard key={obj.id} objective={obj} />
      ))}
    </div>
  );
};
```

**ObjectiveCard Component**:
```jsx
const ObjectiveCard = ({ objective }) => {
  const statusColors = {
    completed: 'border-green-500 bg-green-900/20',
    in_progress: 'border-cricket-accent bg-cricket-primary/10',
    pending: 'border-border-primary bg-bg-secondary',
    failed: 'border-red-500 bg-red-900/20'
  };

  return (
    <div className={`card p-3 border ${statusColors[objective.status]}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-cricket-primary/20 rounded">
          <objective.icon className="w-5 h-5 text-cricket-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-text-primary">{objective.title}</h4>
              <p className="text-xs text-text-secondary mt-0.5">{objective.description}</p>
            </div>
            <StatusBadge status={objective.status} />
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Progress</span>
              <span>{objective.progress}%</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-cricket-accent transition-all duration-500"
                style={{ width: `${objective.progress}%` }}
              />
            </div>
          </div>

          {/* Details */}
          {objective.details && (
            <p className="text-xs text-text-secondary mt-2">{objective.details}</p>
          )}
        </div>
      </div>
    </div>
  );
};
```

**Progress Calculation Functions**:
```javascript
const calculatePlayoffProgress = (position, played, total) => {
  if (position <= 4 && played === total) return 100;
  if (position > 4 && played === total) return 0;

  // During season, estimate based on current trajectory
  const progressThroughSeason = (played / total) * 100;
  const positionScore = position <= 4 ? 100 : Math.max(0, 100 - ((position - 4) * 20));

  return Math.min(100, Math.round((progressThroughSeason + positionScore) / 2));
};

const calculateChampionshipProgress = (stage, champion, userTeamId) => {
  if (champion?.id === userTeamId) return 100;
  if (stage === 'completed') return 0;
  if (stage === 'final') return 75;
  if (stage === 'playoffs') return 50;
  if (stage === 'league') return 25;
  return 0;
};

const getPlayoffStatus = (position, stage) => {
  if (stage === 'playoffs' && position <= 4) return 'completed';
  if (stage === 'completed' && position > 4) return 'failed';
  if (position <= 4) return 'in_progress';
  if (position > 8) return 'failing';
  return 'in_progress';
};
```

### Part 2: Financial Integration

#### 2.1 Create FinancialSummary Component

**File**: `src/components/board/FinancialSummary.jsx`

**Props**:
- `compact`: boolean (for reuse in Home page)

**Features**:
- Display current budget, spent, revenue
- Clickable to open detailed modal
- Live updates from financeStore
- Visual indicators for budget health

**Component**:
```jsx
const FinancialSummary = ({ compact = false, onClick }) => {
  const { getTeamFinances } = useFinanceStore();
  const userTeam = useTeamStore(state => state.userTeam);

  const finances = getTeamFinances(userTeam.id);

  const budgetUsed = ((finances.spent / finances.totalBudget) * 100).toFixed(1);
  const availableBudget = finances.totalBudget - finances.spent;
  const netBalance = finances.revenue - finances.expenses;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="card p-3 cursor-pointer hover:bg-cricket-primary/10 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-text-primary">Finances</h4>
          <DollarSign className="w-4 h-4 text-cricket-accent" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Available</span>
            <span className="font-semibold text-text-primary">
              ${(availableBudget / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Total Budget</span>
            <span className="text-text-secondary">
              ${(finances.totalBudget / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="card p-4 cursor-pointer hover:bg-cricket-primary/10 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cricket-primary/20 rounded">
          <DollarSign className="w-6 h-6 text-cricket-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Team Finances</h3>
          <p className="text-xs text-text-secondary">Click to view details</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-text-secondary mb-1">Total Budget</div>
          <div className="text-xl font-bold text-text-primary">
            ${(finances.totalBudget / 1000000).toFixed(2)}M
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Available</div>
          <div className="text-xl font-bold text-cricket-accent">
            ${(availableBudget / 1000000).toFixed(2)}M
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Revenue</div>
          <div className="text-sm font-semibold text-green-400">
            +${(finances.revenue / 1000000).toFixed(2)}M
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Expenses</div>
          <div className="text-sm font-semibold text-red-400">
            -${(finances.expenses / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      {/* Budget Usage Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>Budget Used</span>
          <span>{budgetUsed}%</span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${budgetUsed}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

#### 2.2 Create FinancialDetailsModal Component

**File**: `src/components/board/FinancialDetailsModal.jsx`

**Features**:
- 4 tabs: Overview, Transactions, Match Revenue, Projections
- Detailed transaction history
- Charts/visualizations (optional)
- Export functionality (optional)

**Tab 1: Overview**
```jsx
<div className="grid grid-cols-2 gap-4">
  <StatCard label="Total Budget" value={`$${totalBudget}M`} />
  <StatCard label="Spent" value={`$${spent}M`} trend="negative" />
  <StatCard label="Revenue" value={`$${revenue}M`} trend="positive" />
  <StatCard label="Net Balance" value={`$${netBalance}M`} trend={netBalance >= 0 ? 'positive' : 'negative'} />
</div>

<div className="mt-6">
  <h4>Budget Breakdown</h4>
  <BreakdownChart data={budgetBreakdown} />
</div>
```

**Tab 2: Transactions**
```jsx
<div className="space-y-2 max-h-96 overflow-y-auto">
  {transactions.map(txn => (
    <div key={txn.id} className="card p-3 flex items-center justify-between">
      <div>
        <div className="font-medium text-text-primary">{txn.description}</div>
        <div className="text-xs text-text-secondary">{txn.date}</div>
      </div>
      <div className={`font-semibold ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {txn.amount > 0 ? '+' : ''}${Math.abs(txn.amount / 1000000).toFixed(2)}M
      </div>
    </div>
  ))}
</div>
```

**Tab 3: Match Revenue**
```jsx
<table className="w-full">
  <thead>
    <tr>
      <th>Match</th>
      <th>Tickets</th>
      <th>Broadcast</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    {matchRevenues.map(match => (
      <tr key={match.id}>
        <td>{match.opponent}</td>
        <td>${match.tickets}</td>
        <td>${match.broadcast}</td>
        <td className="font-semibold">${match.total}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Tab 4: Projections**
```jsx
<div className="space-y-4">
  <ProjectionCard
    label="Expected Season Revenue"
    value={`$${projectedRevenue}M`}
    breakdown={revenueBreakdown}
  />
  <ProjectionCard
    label="Expected Season Expenses"
    value={`$${projectedExpenses}M`}
    breakdown={expenseBreakdown}
  />
  <ProjectionCard
    label="Projected End Balance"
    value={`$${projectedBalance}M`}
    trend={projectedBalance >= 0 ? 'positive' : 'negative'}
  />
</div>
```

### Part 3: Integration with Board.jsx

**Modify**: `src/components/layout/Board.jsx`

```jsx
import React, { useState } from 'react';
import ObjectivesPanel from '../board/ObjectivesPanel';
import FinancialSummary from '../board/FinancialSummary';
import FinancialDetailsModal from '../board/FinancialDetailsModal';

const Board = () => {
  const [showFinancialModal, setShowFinancialModal] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-text-primary">Board</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Objectives */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-3">Season Objectives</h3>
          <ObjectivesPanel />
        </div>

        {/* Finances */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-3">Finances</h3>
          <FinancialSummary onClick={() => setShowFinancialModal(true)} />
        </div>
      </div>

      {/* Financial Details Modal */}
      <FinancialDetailsModal
        isOpen={showFinancialModal}
        onClose={() => setShowFinancialModal(false)}
      />
    </div>
  );
};

export default Board;
```

### Part 4: Integrate Finances in Home Page

**Modify**: `src/components/layout/Home.jsx`

Add compact financial summary:
```jsx
import FinancialSummary from '../board/FinancialSummary';

// In render:
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* Existing widgets */}
  <NextMatch />
  <TeamOverview />

  {/* New: Financial Summary */}
  <FinancialSummary
    compact={true}
    onClick={() => navigate('/game/board')}
  />
</div>
```

### Part 5: Ensure Auction Deducts from Budget

**Verify in auctionStore or auction flow**:
```javascript
// When player is purchased in auction
financeStore.recordTransaction({
  teamId: winningTeam,
  type: 'auction_purchase',
  amount: -finalBid,
  description: `Purchased ${player.name} in auction`,
  category: 'squad_building',
  date: new Date()
});
```

## Implementation Steps

1. Create ObjectivesPanel.jsx with progress tracking
2. Create FinancialSummary.jsx (reusable)
3. Create FinancialDetailsModal.jsx with 4 tabs
4. Update Board.jsx to use new components
5. Update Home.jsx to show compact finances
6. Verify auction integration with financeStore
7. Test all data flows and calculations

## Files

**New Components**:
1. `src/components/board/ObjectivesPanel.jsx`
2. `src/components/board/FinancialSummary.jsx`
3. `src/components/board/FinancialDetailsModal.jsx`

**Modified**:
1. `src/components/layout/Board.jsx`
2. `src/components/layout/Home.jsx`

## Success Criteria

- [ ] Objectives show live progress based on league standings
- [ ] Financial summary displays real data from financeStore
- [ ] Budget updates after auction spending
- [ ] Financial modal shows detailed transaction history
- [ ] Finances component reused in Home and Board pages
- [ ] All data reactive to store updates
- [ ] FM-style data-dense design
