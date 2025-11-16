# Transfer Season System - Full Implementation Plan

**Status**: Planned (Future)
**Priority**: Low (Post-MVP)
**Estimated Effort**: 20-30 hours
**Dependencies**: financeStore, playerStore, teamStore, leagueStore

## Overview

Complete transfer system allowing clubs to buy and sell players during designated transfer windows (weeks 10-12 of season).

## System Architecture

### Transfer Window Mechanics

**Timing**:
- Opens: Week 10 (mid-season break)
- Closes: End of Week 12
- Duration: 3 weeks (21 days)

**Rules**:
- Each club can list up to 5 players for transfer
- Minimum 11 players must remain in squad
- Budget constraints apply (financeStore)
- Cannot sell players who have played in current week

### Player Listing

**Listing Requirements**:
```javascript
{
  playerId: string,
  listingClub: string,
  askingPrice: number, // Club's asking price
  minimumPrice: number, // Below this, auto-reject
  listedDate: Date,
  status: 'available' | 'in_negotiation' | 'sold' | 'withdrawn'
}
```

**Valuation Algorithm**:
```javascript
baseValue = (
  (player.overall * 100000) + // Base on overall rating
  (seasonStats.runs * 5000) + // Batting performance
  (seasonStats.wickets * 10000) + // Bowling performance
  (age < 25 ? 500000 : 0) - // Youth bonus
  (age > 32 ? 200000 : 0) // Age penalty
);

askingPrice = baseValue * (0.8 to 1.3); // Club sets multiplier
minimumPrice = baseValue * 0.6; // Auto-reject below this
```

### Bidding System

**Offer Structure**:
```javascript
{
  offerId: string,
  playerId: string,
  buyingClub: string,
  sellingClub: string,
  offerAmount: number,
  status: 'pending' | 'accepted' | 'rejected' | 'countered',
  counterOffer: number | null,
  expiryDate: Date, // 48 hours from submission
  timestamp: Date
}
```

**AI Bidding Logic**:
```javascript
// AI clubs make offers based on:
- Squad needs (gaps in batting/bowling/all-rounders)
- Available budget
- Player performance
- Desperation level (struggling teams pay more)

// Acceptance criteria:
if (offer >= askingPrice) => auto-accept
if (offer >= minimumPrice && offer < askingPrice) => negotiate
if (offer < minimumPrice) => auto-reject

// Counter-offer formula:
counterOffer = (offerAmount + askingPrice) / 2;
```

**User Flow**:
1. Browse available players (transfer list)
2. Make offer
3. Wait for response (AI decides within 24-48 hours game time)
4. Respond to counter-offers
5. Complete transfer if accepted

### Transfer Completion

**Process**:
1. Validate budget (buying club must have funds)
2. Deduct transfer fee from buying club
3. Add funds to selling club
4. Update player's currentTeam
5. Move player from old squad to new squad
6. Record transaction in financeStore
7. Generate news/inbox message

**Financial Integration**:
```javascript
// Buying club
financeStore.recordTransaction({
  teamId: buyingClub,
  type: 'transfer_fee_out',
  amount: -transferFee,
  description: `Signed ${player.name} from ${sellingClub.name}`,
  category: 'transfers'
});

// Selling club
financeStore.recordTransaction({
  teamId: sellingClub,
  type: 'transfer_fee_in',
  amount: transferFee,
  description: `Sold ${player.name} to ${buyingClub.name}`,
  category: 'transfers'
});
```

## UI Components

### TransferMarket Component

**Features**:
- Search/filter players by position, price range, stats
- Sort by price, rating, age, performance
- Quick stats view for each player
- "Make Offer" button

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Transfer Market                             │
├─────────────────────────────────────────────┤
│ Filters: [Position ▼] [Max Price: ____]   │
│ Sort: [Price ▼]                            │
├─────────────────────────────────────────────┤
│ Player  │ Club  │ Price   │ Stats │ Action│
│ ─────────────────────────────────────────  │
│ A.Patel │ MUM   │ $2.5M   │ 34runs│ [Bid]│
│ B.Singh │ LON   │ $1.8M   │ 12wkts│ [Bid]│
│ ...                                        │
└─────────────────────────────────────────────┘
```

### MyListings Component

**Features**:
- List players from user's squad
- Set asking/minimum prices
- View incoming offers
- Accept/reject/counter offers

**Layout**:
```
┌─────────────────────────────────────────────┐
│ My Listed Players                           │
├─────────────────────────────────────────────┤
│ Player   │ Asking │ Min │ Offers │ Action │
│ ────────────────────────────────────────────│
│ C.Kumar  │ $3M    │$2M  │ 2      │ [View] │
│ D.Sharma │ $1.5M  │$1M  │ 0      │ [Edit] │
└─────────────────────────────────────────────┘
```

### OfferNegotiation Modal

**Features**:
- View offer details
- See player stats
- Accept/reject/counter
- Budget validation

```
┌─────────────────────────────────────────────┐
│ Transfer Offer                              │
├─────────────────────────────────────────────┤
│ Player: A. Patel (MUM)                     │
│ Offer: $2.3M                               │
│ Your Asking Price: $2.5M                   │
│ Minimum: $2.0M                             │
│                                            │
│ [Accept] [Reject] [Counter: $__M]         │
└─────────────────────────────────────────────┘
```

## Data Structures

### TransferStore (New)

```javascript
{
  transferWindow: {
    isOpen: boolean,
    openDate: Date,
    closeDate: Date,
    weekNumber: number
  },
  listedPlayers: [
    {
      playerId: string,
      clubId: string,
      askingPrice: number,
      minimumPrice: number,
      listedDate: Date,
      status: string
    }
  ],
  activeOffers: [
    {
      offerId: string,
      playerId: string,
      buyingClub: string,
      sellingClub: string,
      amount: number,
      status: string,
      expiryDate: Date
    }
  ],
  completedTransfers: [
    {
      transferId: string,
      playerId: string,
      fromClub: string,
      toClub: string,
      fee: number,
      completedDate: Date
    }
  ]
}
```

## AI Behavior

### AI Transfer Strategy

**Squad Assessment**:
```javascript
// Identify weak positions
const needsBowlers = team.bowlers.length < 6;
const needsBatsmen = team.batsmen.length < 6;
const hasExtraBudget = team.budget > 5000000;

// Target players based on needs
if (needsBowlers && hasExtraBudget) {
  targetTopBowlers(budget);
}
```

**Selling Logic**:
```javascript
// AI sells players when:
- Player is underperforming (stats below average)
- Squad has surplus in that position
- Attractive offer received (> 1.2x player value)
- Budget is tight and player not essential
```

**Negotiation Tactics**:
```javascript
// AI negotiates based on:
- Time remaining in window (desperate near deadline)
- Squad needs (keep if essential, sell if surplus)
- Budget situation (accept lower if need funds)
- Offer quality (counter if close to asking price)
```

## Integration Points

### financeStore
- Record transfer fees
- Validate budgets before offers
- Update team finances

### playerStore
- Update currentTeam on transfer
- Maintain career history

### teamStore
- Update squad lists
- Recalculate team stats

### inboxStore
- Send messages for offers, acceptances, rejections
- News about major transfers

## Testing Strategy

1. **Window Mechanics**: Test opening/closing at correct weeks
2. **Listing Validation**: Ensure minimum squad size maintained
3. **Offer Flow**: Test accept/reject/counter paths
4. **Budget Validation**: Prevent overspending
5. **AI Behavior**: Test AI makes sensible offers
6. **Transfer Completion**: Verify all data updates correctly

## Phased Implementation

### Phase 1: Core Mechanics
- Transfer window timing
- Player listing
- Basic offer system

### Phase 2: AI Integration
- AI evaluation of players
- AI bidding logic
- AI negotiation

### Phase 3: UI Polish
- Transfer market browser
- Offer management
- Visual feedback

### Phase 4: Advanced Features
- Loan system
- Release clauses
- Contract negotiations

## Success Criteria

- User can list and sell players
- User can browse market and make offers
- AI clubs actively participate in transfers
- Financial constraints enforced
- Transfers complete correctly with all data updates
- Transfer window opens/closes on schedule
