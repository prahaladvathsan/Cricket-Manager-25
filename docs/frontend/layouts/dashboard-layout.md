# Dashboard Layout (Home page)

The Home page is the central hub. It's the first screen a manager lands on after team selection / save load, and the FM-style data-density bar applies: stripped chrome, eyebrows instead of headers, one hero metric per card, marquee cards (news carousel, next match) visually lifted above secondary data cards.

**Component**: `src/components/layout/Home.jsx` (~1200 lines, one file).

---

## Grid

```
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 items-start
```

`items-start` is the key choice: cards size to their natural content rather than stretching to match the tallest neighbour. Cells that *should* be equal height (Next Match + Objectives) override per-card with `self-stretch h-full`. Cells that span multiple rows (Upcoming) use `row-span-2`.

---

## Final layout (lg breakpoint, 3 columns)

```
+---------------------------------+----------------+
|  News Carousel (col-span-2)     |  League        |
|  H = 260px                      |  Standings     |
|                                 |  H = content   |
+----------------+----------------+----------------+
|  Upcoming      |  Next Match    |  Objectives    |
|  (row-span-2)  |  (thin)        |  (self-stretch)|
|                +----------------+----------------+
|                |  Squad Status  |  Top Buys      |
|                |  5 rows        |  5 rows        |
+----------------+----------------+----------------+
```

Card-declaration order in JSX matters because the grid auto-flows row-major:

1. News carousel (col-span-2)
2. League Standings
3. **Upcoming** (row-span-2 — occupies col 1 for two row tracks)
4. Next Match (col 2 row 1)
5. Objectives (col 3 row 1)
6. Squad Status (col 2 row 2 — col 1 row 2 is taken by Upcoming)
7. Top Buys (col 3 row 2)

If you add a card, place it according to where you want auto-flow to drop it.

---

## Card patterns

Every card follows one of two structural patterns:

### A. Marquee card (news carousel, next match)

- Fixed or near-fixed height (carousel is `h-[260px]` on the wrapper; next match uses `self-stretch h-full`)
- 2px green top accent rail (`border-t-2 border-t-cricket-primary`)
- Subtle internal hierarchy (serif headline, italic deck, smaller body)
- News carousel additionally has a colour rail on the left (theme-keyed) and a hero team badge floated into the body
- Designed to be the eye's first stop

### B. Data card (standings, squad status, top buys, objectives, upcoming)

- Eyebrow on top-left (`text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary`)
- **Hero metric** on top-right when applicable (`text-[18px]` Georgia serif bold) — one stand-out number per card
- 3-or-5 row data table below
- No icon, no chevron, no header bar

The eyebrow style is unified across all data cards — change it in one place and rebase.

---

## Card-by-card breakdown

### News Carousel — `HomeNewsCarousel.jsx`

Spans 2 grid columns. Renders a rotating list of articles from `inboxStore.messages` filtered to `type === 'league_news'`.

- **Card height**: `CARD_HEIGHT = 'h-[260px]'`. Bump it together with the standings card's natural height — they must line up.
- **Sort**: by `effective = importance + (isUserTeam ? 25 : 0)` desc, then date desc. Top 8 messages render as slides.
- **Auto-rotate**: 10s interval, paused while the modal is open AND while the cursor hovers the card.
- **Nav**: prev/next chevrons live inside the bottom pagination pill alongside the dots — no floating overlay buttons over body text.
- **Card body**: eyebrow + tag pill + byline on the top right, large serif headline on the left, italic subhead, then up to 6 paragraphs with a gradient fade and `… Read more →` cue at the bottom-right.
- **Hero team badge**: 96–128px badge floated right inside the body (newspaper-style wrap). Falls back to no badge if the payload has no relevant team id.
- **Click**: opens `NewsArticleModal`.

See `docs/core-systems/news-system.md` for the news pipeline that populates the carousel.

### League Standings (col 3 row 1)

- Eyebrow: `League Standings` + hero `2nd of 10` (the user team's ordinal position) in serif
- Table: # · Team · P · NRR · Pts · **Form**
- **7 visible rows**, centered around the user team (or clamped at edges)
- The **Form** column shows 5 micro 2×2 W/L dots for every team (not just the user) — populated from `computeRecentForm(results, teamId, 5)` in `src/utils/recentForm.js`
- The standalone "Recent Form" card that used to sit on the dashboard was deleted — the form column inside the standings replaces it

### Upcoming Calendar Events (col 1, rows 1-2)

- `row-span-2 h-full flex flex-col` so the inner `CalendarListView` stretches to fill the doubled height
- Eyebrow: `Upcoming` (no hero metric — it's a list-driven card)
- Shows up to **10 upcoming events** sorted by date (bumped from 5 when the card got taller). Source: `upcomingEvents` memo in Home.jsx
- Click: navigates to `/game/calendar`

### Next Match (col 2 row 1, thin variant)

- `self-stretch h-full` so it matches Objectives' height in the same row
- 2px green top rail (marquee treatment)
- Eyebrow: `Next Match · MD 3`
- Hero row: `vs [badge] [Opponent Name]` on the left; **date + venue stacked on the right** (date in cricket-accent gold when the match is today)
- Body: two-column grid, one column per team. Each column shows top batter and top bowler with full `runs` / `wickets` labels (not `R` / `W`)
- User-team column has `bg-cricket-accent/5` tint so the eye lands there first
- The larger original Next Match block (badges + 4 best-performer tables) was retired in favour of this thinner version; see git history for the previous layout

### Objectives (col 3 row 1)

- `self-stretch h-full` — same height as Next Match
- Eyebrow: `Objectives` + hero `2/5` serif (completed / total)
- 5 rows max, each: objective title (truncate) + **status pill** on the right
- Status maps from raw `obj.status` to four user-facing labels:

| Raw | Display | Tone |
|---|---|---|
| `completed` | COMPLETED | green (`status-win`) |
| `on_track` / `in_progress` | ON TRACK | blue (`status-upcoming`) |
| `pending` | ON TRACK | grey (`text-tertiary`) |
| `at_risk` | FALLING SHORT | amber (`status-tie`) |
| `failed` | FAILED | red (`status-loss`) |

### Squad Status (col 2 row 2)

- Eyebrow: `Squad Status` + hero `25/25 Fit` (or `X Injured` in red)
- 5 player rows, each: `<PlayerName>` (gold default) + stacked condition bar + days-out badge
- The **stacked condition bar** is a single ground rail: green fitness fill + red fatigue overlay. Cleaner than two parallel bars
- Rows use `py-0.5` for maximum density
- Injury row gets a faint red tint (`bg-status-loss/10`) and the days-out cell shows `Xd` or `OUT` in red

### Top Buys / Transfer Activity (col 3 row 2)

- Eyebrow: `Top Auction Buys` (preseason) or `Transfer Activity` (in-season window) + hero peak-fee `$1.1M` serif
- 5 rows: player name + team code(s) + fee
- Mirrors Squad Status's eyebrow + hero + 5-row pattern (visually paired cards)
- Auction mode: `Player → Team $Fee`
- Transfer mode: `Player FromTeam → ToTeam $Fee`

---

## Hidden / removed cards

| Card | Status | Why |
|---|---|---|
| **Recent Form** (standalone) | Removed | W/L badges live inline as the Form column on the Standings table |
| **Financial Summary** | Hidden | Code intact, JSX commented in Home.jsx. Re-enable by uncommenting `<FinancialSummary compact={true} onClick={...} />`. Reachable via Board → Finances |
| **Team Morale / Top Performers** (legacy doc-only) | Never built | Older versions of this doc described them; they never existed in code |

---

## Styling conventions

### Eyebrow

```jsx
<span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary">
  Squad Status
</span>
```

Use this exact class string on every card's top label. Don't introduce variants.

### Hero metric

```jsx
<span
  className="text-[18px] font-bold leading-none text-text-primary"
  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
>
  25/25 Fit
</span>
```

Always 18px serif. Tone changes to `text-status-loss` when the metric represents trouble (`X Injured`). The injured-tone is the only conditional colour.

### Player names

Always `<PlayerName>` — never raw `player.name`. Default styling is gold (`text-cricket-accent`) and clickable. No local colour overrides.

### Team names

Always `<TeamName>` — never raw `team.name`. **Pass `inline` when rendering inside flowing prose**, because TeamName defaults to block-level (will force a line break otherwise). PlayerName's default is already inline.

### Yellow discipline

`cricket-accent` (gold) is reserved for:

- User team highlights (user team's standings row, badge ring, points cell)
- News carousel theme-rail and tag pill
- `… Read more →` CTA inside the carousel card
- The "Tonight" date label on the Next Match card when the match is today
- `<PlayerName>` and the default `<TeamName>` colour
- Card hero numbers that represent user-team data

It is NOT used for:

- Card eyebrows (use `text-text-secondary`)
- Per-team stats (use `text-text-primary`)
- Generic chrome / icons / chevrons

The non-existent `trophy-gold` token was renamed to `cricket-accent` everywhere it appeared.

### Spacing

Card padding is `p-2` (sometimes `p-2.5` for marquee cards). Row padding inside tables is `py-0.5` for the densest reading (Squad Status, Top Buys) or `py-1` for slightly looser (legacy tables not yet bumped). Margin between eyebrow and table content is `mb-1`.

### Card backgrounds

`.card-interactive` (in `src/index.css`) is `background-color: rgba(0, 0, 0, 0.4)` + border + cursor:pointer + hover state. Don't override the bg in markup — the dashboard layers on top of a stadium background image, so the semi-transparent black is part of the visual identity.

---

## Equal-height rows

The dashboard grid uses `items-start` so each card sizes to its own content. Two cards that need to be the same height override locally:

```jsx
<div className="card-interactive p-2 self-stretch h-full" ...>
```

`self-stretch` overrides the parent's `items-start`. `h-full` makes the content fill the resolved row-track height. Both Next Match and Objectives use this pattern so they line up regardless of which has more content.

---

## Marquee cards

The "marquee" treatment lifts cards above the surrounding data cards:

- `border-t-2 border-t-cricket-primary` — 2px green top rail
- Internal hierarchy with serif headlines / italic decks (news carousel) or a vs+badge hero row (next match)

This identifies the two top-of-page cells where the eye should land first.

---

## Mobile / smaller breakpoints

The grid collapses to `md:grid-cols-2` and `grid-cols-1`. On `md`, the col-span-2 cards (news carousel) take the full width and the col-span-3 cells stack. Most cards naturally fit single-column. The row-span-2 on Upcoming still applies but visually just means a taller card before stacking.

---

## Touchpoints when adding a new card

1. Pick a row + column position — the JSX declaration order matters because Tailwind grid auto-flow places cells row-major.
2. Use the eyebrow + hero pattern from § Styling conventions.
3. If you need it to match the height of a sibling, use `self-stretch h-full` on both.
4. If it should match the news carousel's height (the marquee row), reference `CARD_HEIGHT` in `HomeNewsCarousel.jsx`.
5. Update this doc — the layout drifts fast and stale docs are worse than no docs.
