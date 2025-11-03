# Auction View Layout

## Overview

The **Auction View** provides an immersive player bidding experience with theater-style presentation, real-time bidding, and budget tracking.

---

## Layout Structure

```
+--------------------------------------------------------------------------+
| AUCTION HEADER                                                           |
| Round 3/12 • 78 Players Remaining • Budget: ₹12.5 Cr                   |
+--------------------------------------------------------------------------+
|                                                                          |
|                          CENTER STAGE                                    |
|  +----------------------------------------------------------------+      |
|  |                                                                |      |
|  |                    [Player Photo/Avatar]                       |      |
|  |                                                                |      |
|  |                      Virat Kohli                               |      |
|  |                  Batsman | Accumulator                          |      |
|  |                  Rating: 90 | Age: 35                           |      |
|  |                                                                |      |
|  |                Base Price: ₹2 Cr                               |      |
|  |                Current Bid: ₹8.5 Cr                            |      |
|  |                                                                |      |
|  |          Bidding: Mumbai Thunders (You) ▶                      |      |
|  |                                                                |      |
|  +----------------------------------------------------------------+      |
|                                                                          |
|                       USER CONTROLS                                      |
|  +----------------------------------------------------------------+      |
|  |  [Bid +₹50 L]  [Bid +₹1 Cr]  [Bid +₹2 Cr]  [Pass]            |      |
|  |                                                                |      |
|  |  Your Budget: ₹12.5 Cr  |  Squad: 15/25  |  Overseas: 4/8     |      |
|  +----------------------------------------------------------------+      |
|                                                                          |
+--------------------------------------------------------------------------+
| BOTTOM: TEAM BUDGETS BAR                                                 |
| [Mumbai: ₹12.5Cr] [London: ₹10.2Cr] [Melbourne: ₹8.5Cr] ...           |
+--------------------------------------------------------------------------+
```

---

## Features

### Player Presentation
- Large player card with photo
- Key stats prominently displayed
- Playstyle and role indicators
- Base price vs current bid

### Bidding Controls
- **Quick bid buttons**: Pre-set increment amounts
- **Pass button**: Opt out of current bidding
- **Budget display**: Real-time budget tracking
- **Squad status**: Players/Overseas count

### AI Bidding Animation
- Team logos appear when they bid
- Bid amount updates in real-time
- "Going once, twice..." countdown
- Winner announcement animation

### Team Budgets Bar
- All teams' remaining budgets
- Visual comparison via bar chart
- Highlight user team
- Update after each sale

---

## Auction Phases

### Pre-Auction
- Squad targets display
- Budget allocation strategy
- Player shortlist review

### During Auction
- Real-time bidding interface
- AI recommendations
- Pause/resume controls (user-controlled teams)

### Post-Auction
- Final squad reveal
- Budget summary
- Squad analysis vs targets

---

## File Structure
```
src/components/auction/
  AuctionView.jsx
  PlayerStage.jsx
  BiddingControls.jsx
  TeamBudgetsBar.jsx
  AuctionResults.jsx
```
