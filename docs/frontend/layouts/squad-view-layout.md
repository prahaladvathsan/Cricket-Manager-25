# Squad Management Layout

## Overview

The **Squad View** provides comprehensive squad management with player browsing, detailed player cards, filtering, and team selection tools. Inspired by Football Manager's squad screen with a dual-panel layout.

---

## Layout Structure

```
+--------------------------------------------------------------------------+
| SQUAD HEADER                                                             |
| Mumbai Thunders Squad • 23/25 Players • Budget: ₹4.7 Cr Available      |
+--------------------------------------------------------------------------+
| FILTERS & SEARCH                                                         |
| [All Roles ▼] [All Nations ▼] [Sort: Rating ▼] [Search players...]    |
+---------------------------------------+----------------------------------+
| LEFT: PLAYER LIST (40% width)        | RIGHT: PLAYER DETAIL (60%)       |
| +-----------------------------------+ | +------------------------------+ |
| | ☑ R. Sharma      BAT  92  IND    | | | PLAYER CARD                  | |
| | ☐ V. Kohli       BAT  90  IND    | | |                              | |
| | ☐ J. Bumrah      BOW  88  IND    | | | Rohit Sharma                 | |
| | ☐ R. Jadeja      ALL  85  IND    | | | Age: 36 | Rating: 92        | |
| | ☐ R. Ashwin      BOW  84  IND    | | | Role: Batsman               | |
| | ☐ H. Pandya      ALL  82  IND    | | | Playstyle: Anchor           | |
| | ☐ K. Yadav       BOW  80  IND    | | |                              | |
| | ☐ S. Gill        BAT  78  IND    | | | [Attributes] [Stats] [Career]| |
| | ...                               | | +------------------------------+ |
| +-----------------------------------+ |                                  |
+---------------------------------------+----------------------------------+
| BOTTOM ACTION BAR                                                        |
| [Select Playing XI] [Set Captain] [Transfer List] [Training]           |
+--------------------------------------------------------------------------+
```

---

## Components

### 1. Player List (Left Panel)
- Checkbox for multi-select
- Player name, role, rating, nationality
- Click to view details
- Sortable by: Rating, age, form, position

### 2. Player Detail Card (Right Panel)
- Full player information
- Attributes visualization (radar chart)
- Season stats
- Contract/financial info
- Action buttons (Transfer, loan, release)

### 3. Filters
- **Role**: All, Batsman, Bowler, All-rounder, Wicket-keeper
- **Nationality**: All, Home, Overseas
- **Status**: All, Fit, Injured, Suspended
- **Form**: All, Excellent, Good, Poor

---

## File Structure
```
src/components/squad/
  SquadView.jsx
  PlayerList.jsx
  PlayerCard.jsx
  PlayerFilters.jsx
```
