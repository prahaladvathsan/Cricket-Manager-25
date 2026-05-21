# News System

## Overview

The news system produces in-game journalism — match reports, transfer notes, injury bulletins, season openers, weekly roundups, playoff articles — and routes them through a single pub/sub bus to the inbox + the Home dashboard carousel. Articles are template-driven for most event types; **match reports use a block-based narrative assembler** that stitches together micro-templates ("blocks") plus deep cricket flags to read like real cricket prose rather than form-letter mail-merge.

The whole system is client-side, deterministic at the JSON template layer, and produces no external network traffic.

**Location**: `src/core/news/`

## Architecture

```
                                          ┌──────────────────────────────────┐
emit site (gameStore, leagueStore,        │ NewsDispatcher (pub/sub)         │
MatchEngine, RetentionEngine,             │ - subscribe(handler, {types})    │
TransferMarket, SimulationEngine,         │ - emit({ type, season, gameDay,  │
emitters/seasonOpener.js,                 │          date, payload, context? })│
emitters/weeklyRoundup.js)                └────────────┬─────────────────────┘
                                                       │ '*' wildcard match
                                                       ▼
                                          ┌──────────────────────────────────┐
                                          │ inboxSubscriber (default sink)   │
                                          │ - calls renderNews(TEMPLATES, e) │
                                          │ - computes importance + isUserTeam│
                                          │ - strips event.context           │
                                          │ - writes to inboxStore           │
                                          └────────────┬─────────────────────┘
                                                       │
                                                       ▼
                                          ┌──────────────────────────────────┐
                                          │ inboxStore.messages              │
                                          │ (type: 'league_news', metadata:  │
                                          │  { headline, subhead,            │
                                          │    bodyParagraphs, tags,         │
                                          │    importance, isUserTeam,       │
                                          │    reporterId, reporterTagline,  │
                                          │    payload })                    │
                                          └────────┬────────────┬────────────┘
                                                   │            │
                                       ┌───────────┘            └──────────────┐
                                       ▼                                       ▼
                          HomeNewsCarousel                          NewsArticleModal
                          (sort by importance + user-team boost,    (full newspaper-style read,
                           top 8, fixed 260px card)                  parses [[PLAYER:id|name]]
                                                                     sentinels into clickable
                                                                     <PlayerName>/<TeamName>)
```

### Key modules

| Module | Purpose |
|---|---|
| `NewsDispatcher.js` | Pub/sub class. `subscribe(handler, {types})`, `emit(event)`, wildcard + namespace matching (`'*'`, `'transfer.*'`). |
| `newsDispatcherSingleton.js` | `getNewsDispatcher()` lazy singleton + `registerInboxSubscriber()` idempotent registration. Mirrors `transferManagerSingleton`. |
| `renderNewsBody.js` | Façade. Looks up a custom renderer in `renderers/index.js`; falls back to `renderTemplatePool` (the default JSON-template engine). Exports `renderString`, `matchesAll`, `buildVars` for block code to reuse. |
| `importance.js` | Per-event-type score (0–100). Used when a renderer doesn't return its own `importance`. |
| `entityHelpers.js` | Sentinel tokens for inline clickable entities: `[[PLAYER:id\|name]]`, `[[TEAM:id\|name]]`. Exports `playerLink`, `teamLink`, `withLink`, `stripSentinels`, `parseEntities`, `extractQuoteMark`. |
| `reporters.js` | Pool of 8 reporter personas (real cricket voices). Weighted selection by event tags. |
| `templates/*.json` | Template pools keyed by event type. Aggregated via `templates/index.js`. |
| `renderers/index.js` | Custom-renderer registry. Only `match.result` is registered today. |
| `renderers/matchReport/` | Block-based narrative assembler for `match.result`. See below. |
| `emitters/seasonOpener.js` | Builds + emits `season.opener` at the end of league init. |
| `emitters/weeklyRoundup.js` | Builds + emits `weekly.roundup` every 7 in-season days. |
| `subscribers/inboxSubscriber.js` | Default subscriber that bridges the dispatcher to `inboxStore`. |

## Event taxonomy

Dot-namespaced types. Subscribers can filter with exact match (`'transfer.completed'`) or wildcard (`'transfer.*'`, `'*'`).

| Event type | Emit site | When it fires |
|---|---|---|
| `match.result` | `leagueStore.recordResult()` | Every match (regular + playoff). Single convergence point for Normal UI + Sim-to-Date. |
| `injury.onset` | `MatchEngine.emitInjuryOnsetNews()` | When a player picks up an injury during a match. |
| `injury.recovery` | `gameStore.advanceDay()` | When a player's injury duration drops to 0. |
| `retention.player_retained` | `RetentionEngine.finalizeRetentions()` | One emit per retained player, at end of retention finalization. |
| `transfer.completed` | `TransferMarket.completeTransfer()` | When a transfer bid is accepted and finalised. |
| `playoff.qualified` | `SimulationEngine.checkAndPopulatePlayoffs()` | Sim-to-date only — Normal UI has no equivalent path today. |
| `playoff.champion_crowned` | `leagueStore.recordResult()` | Inside the final-match branch when `championInfo` is built. |
| `season.opener` | `emitters/seasonOpener.js` (called from `Home.jsx` + `LeagueInitializer.js`) | At the end of league initialisation, once per season. |
| `weekly.roundup` | `emitters/weeklyRoundup.js` (called from `gameStore.advanceDay()`) | Every 7 in-season days; gated to `currentPhase ∈ {'league','playoffs'}`. |

### Event envelope

```js
{
  type: 'match.result',                  // dot-namespaced
  season: 1,                              // current season
  gameDay: 28,                            // current game day
  date: '2025-01-28T...',                 // ISO date string
  payload: { /* persisted as message.metadata.payload */ },
  context: { /* render-only, stripped before persisting */ }
}
```

The `context` slot was added to carry heavy data (full scorecards, ball-by-ball logs, standings snapshots) to the block assembler at render time without bloating IndexedDB. `inboxSubscriber` deliberately drops `event.context` before writing.

## Rendering pipeline

`renderNews(templates, event)` in `renderNewsBody.js` is the entry point. It:

1. Looks up `event.type` in the `RENDERERS` registry (`renderers/index.js`).
2. If a custom renderer is registered (currently only `match.result` → `renderMatchReport`), invokes it. On any thrown error, logs and falls through.
3. Otherwise, calls `renderTemplatePool(templates, event)` — the default engine that picks one template from the type's pool and interpolates `${dotted.path}` placeholders.

### Default template-pool engine (most event types)

For `injury.*`, `transfer.*`, `retention.*`, `playoff.*`, `season.opener`, `weekly.roundup`:

- A JSON template per event type lives in `src/core/news/templates/*.json`, aggregated by `templates/index.js`.
- Each template entry has: `when?:{}` predicate, `headline`, `subhead?`, `body[]`, `inboxSubject?`, `inboxType`, `sender?`, `tags[]`, `importance?` (optional).
- `renderTemplatePool` filters by `when:` matching `payload + envelope`, picks at random, interpolates `${dotted.path}`, returns the article.
- If no template provides a `sender`, the reporter persona system picks one (see "Reporter personas" below).

### Match-report block assembler

`renderers/matchReport/index.js` is a different beast — it runs a sequence of small blocks and concatenates their output.

```
renderMatchReport(event)
   ├─ headlineHook         → headline, subhead, lede paragraph
   ├─ anchorPerformance    → best individual performance, batting or bowling
   ├─ stageContext         → playoff-only bracket framing
   ├─ colourCommentary     → one of nine deep cricket flags (see below)
   ├─ turningPoint         → biggest-swing over from ballByBall
   ├─ clutchFinish         → close-finish only; last 8 balls of innings 2
   ├─ playerOfTheMatch     → dedup'd against anchor
   ├─ postMatchQuotes      → synthetic captain + POTM pull-quotes
   ├─ legacyEcho           → 25% chance, dramatic matches; real-commentator quote
   └─ contextClosing       → standings move, next match cue
```

Each block:

- Is a function `(event, assemblerState) => { paragraphs?, headline?, subhead?, meta? } | null`. Null = skip.
- Has its own JSON micro-template pool with `when:`-keyed variants (re-uses `renderString` + `matchesAll` from `renderNewsBody`).
- Wraps in `safeRun` so one throw can't kill the article.

`assemblerState` is mutated across blocks to share signals (e.g. `anchor` for POTM dedup, `flagKind` for legacyEcho scenario picking).

### Deep cricket flags (`deepFlags.js`)

`detectDeepFlags(event)` returns an object of nine detectors, each non-null only when its scenario triggers. `colourCommentary` picks the highest-priority hit and emits a scenario-keyed paragraph.

| Flag | Trigger |
|---|---|
| `milestoneHeartbreak` | Batsman dismissed 90–99 OR exactly 49 |
| `loneWolf` | Single batsman > 55% of losing team's total |
| `captainsInnings` | Winning team's captain top-scores in a chase |
| `unsungHero` | Bowler economy < 5.0 in a match with `totalRuns > 320` |
| `youngsterBreakout` | Player <22 years, rating <75, with 50+ knock or 3+ wickets |
| `veteranResurgence` | Player ≥32, 60+ runs or 3+ wickets |
| `cameoHero` | Lower-order batsman (pos #7+) 30+ runs at SR>200 |
| `powerplayWreck` | Side losing 3+ wickets in the first 6 overs |
| `deathOversSpecialist` | Bowler with eco < 7.5 in overs 16–20, ≥6 balls |

## Reporter personas

`reporters.js` defines 8 personas based on real cricket commentators / writers. Each has `id`, `name`, `tagline`, `beats[]` (event types / payload tags this persona prefers), and `weight`.

- **Harsha Bhogle** — match reports, milestones, champions
- **Jarrod Kimber** — transfers, upsets, weekly roundups
- **Sid Monga** — close finishes, bowling, tactical analysis
- **Sanjay Manjrekar** — batting-anchored reports, milestones
- **Ian Bishop** — playoff finals, close finishes
- **Mark Nicholas** — season openers, championship articles
- **Richie Benaud** (in tribute) — laconic, dominant performances
- **Naya Singh** (fictional WPL beat reporter) — universal `'*'` fallback

`pickReporter(event)` builds a weighted slot list across personas whose beats overlap the event's tags, then draws at random. The chosen byline persists on `message.metadata.reporterId` and `metadata.reporterTagline`.

**Important**: persona names appear only as bylines. They do NOT inject phrases into body text. Quoting a real commentator (e.g. Bishop's "remember the name") is done explicitly through the `legacyEcho` block via the `famousQuotes.js` pool, with attribution.

## Inline clickable entities

`entityHelpers.js` provides sentinel tokens for inline player/team references:

```
[[PLAYER:player-uuid|Display Name]]
[[TEAM:team-uuid|Display Name]]
```

Blocks emit these by adding `.linked` properties to their var bag (`withLink(obj, 'PLAYER')`). Templates then use `${anchor.player.linked}` instead of `${anchor.player.name}`. Strings flow through unchanged until they reach a renderer:

- **`NewsArticleModal`** uses `parseEntities` to split each paragraph into segments and render `<PlayerName>` / `<TeamName>` components inline. Both must be passed `inline` because `<TeamName>` defaults to block-level.
- **`HomeNewsCarousel`** uses `stripSentinels` to render plain text in the preview (carousel cards aren't interactive at the entity level).
- **Headlines / subheads / inbox subjects** never use sentinels (the surrounding UI flattens them via `stripSentinels` at consumption).

`extractQuoteMark` handles the `> ` paragraph marker used by `postMatchQuotes` to flag pull-quotes for the modal's `<blockquote>` styling.

## Importance scoring

Every persisted news message carries `metadata.importance` (0–100). The home carousel sorts by this plus a user-team boost.

| Event | Importance |
|---|---|
| `playoff.champion_crowned` | 100 |
| `playoff.qualified` | 75 (or 85 for seed 1) |
| `season.opener` | 70 |
| `transfer.completed` (marquee) | 75 |
| `transfer.completed` (regular) | 40 |
| `retention.player_retained` (marquee) | 65 |
| `retention.player_retained` (regular) | 35 |
| `injury.onset` (severe) | 60 |
| `injury.onset` (major) | 50 |
| `injury.onset` (minor) | 30 |
| `injury.recovery` | 25 |
| `weekly.roundup` | 55 |
| `match.result` | 25 base + 35 if playoff + 15 if close + 10 if high-scoring − 5 if one-sided |

The carousel's effective sort key is `importance + (isUserTeam ? 25 : 0)`, then date desc. The +25 boost is the agreed-on tuning (champion-crowned at 100 still outranks a user-team injury at 30+25=55, but routine non-user matches at ~30 sit below user-team matches at ~55).

## Persistence model

The dispatcher itself is in-memory and transient — articles are persisted via the `inboxSubscriber`'s call to `inboxStore.addMessage()`. The message shape:

```js
{
  id, type: 'league_news',
  subject, body, sender,                  // body = paragraphs joined with \n\n
  date, read: false,
  metadata: {
    newsEventType,                        // 'match.result', etc.
    newsCategory,                         // template's inboxType
    headline, subhead, bodyParagraphs,    // structured fields
    tags,                                 // for filtering + colour rail
    season, gameDay,
    importance, isUserTeam,
    reporterId, reporterTagline,
    payload                               // event.payload (NOT event.context)
  }
}
```

`event.context` is intentionally **not** persisted — long careers would bloat IndexedDB with 240-ball logs and full scorecards per match. The context is consumed only at render time.

## Bootstrap

`App.jsx` calls `await registerInboxSubscriber()` after `waitForHydration()`. Must happen post-hydration so the subscriber can read user-team id and write to the inbox.

## Adding a new event type

1. **Pick a dot-namespaced type**, e.g. `'finance.bankruptcy'`.
2. **Emit at the canonical mutation site** with try/catch:
   ```js
   try {
     getNewsDispatcher().emit({
       type: 'finance.bankruptcy',
       season: gs.currentSeason,
       gameDay: gs.gameDay,
       date: gs.currentDate,
       payload: { /* persisted */ },
       context: { /* render-only, optional */ }
     });
   } catch (err) {
     console.error('Failed to emit finance.bankruptcy news:', err);
   }
   ```
3. **Add a template pool**: create `templates/finance.json` with one or more entries keyed under `'finance.bankruptcy'`, then spread into `templates/index.js`.
4. **Add an importance score** in `importance.js` (if you want it to rank against other events).
5. **(Optional)** Add a tag to `SECTION_THEME` in `HomeNewsCarousel.jsx` for the colour rail + pill label, and to `TAG_LABELS` in `NewsArticleModal.jsx` for the section label.
6. **(Optional)** If the article should reference players/teams as clickable entities, set `.linked` keys on the payload objects using `playerLink()` / `teamLink()` and reference `${X.linked}` in body templates.

## Known limitations

- **Playoff qualification news is sim-to-date only.** `checkAndPopulatePlayoffs` lives only in `SimulationEngine.js`. Normal UI users who finish the regular season manually won't get the qualification article.
- **Retention finalization paths diverge.** `SimulationEngine.runRetention()` and the user-facing `RetentionView.jsx` both call `finalizeRetentions()` (covered). But the `RetentionNegotiationModal` path bypasses it — negotiated retentions don't emit.
- **No duplicate suppression.** If `recordResult` were ever called twice for the same match, two news cards would appear.
- **`league_news` messages persist forever.** No pruning. Long careers accumulate hundreds; carousel UI is fine (only shows latest 8) but the inbox tab will get heavy.
- **`postMatchQuotes` captain lookup**: reads from `teamStore.teamTactics[teamId].captain`. If no captain is set the quote block silently emits fewer paragraphs.

## Critical constraints

- **Two progression paths must stay in sync.** `Header.jsx:handleContinue` (Normal UI) and `SimulationEngine.js:simulateDay` (Sim-to-Date) both flow through `leagueStore.recordResult()`, which is the single canonical emit point for `match.result`. Emit at the convergence point, not the dispatch site.
- **Standings update is atomic with `recordResult`.** `recordResult` calls `applyResultToStandings` inside its `set()` callback before the news emit, so the closing line ("climbed to 6th on X points") reads the post-match table. `updateStandingsForMatch` is deprecated (thin wrapper kept for safety) — never call it from new code.
- **`getNewsDispatcher()` singleton.** Never instantiate `NewsDispatcher` directly. Same pattern as `getTransferManager()`.
- **`event.context` must not be persisted.** Anything heavy goes there, nothing else. `inboxSubscriber` strips it.
- **`<TeamName>` defaults to block-level** (`inline={false}`). Always pass `inline` when rendering inside body prose, or the team name will force a line break.
- **JSON templates can't run JS expressions.** `renderString` only resolves `${dotted.path}` — no ternaries. Pre-compute conditional values into the var bag inside the block.
