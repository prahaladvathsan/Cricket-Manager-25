/**
 * @file PatchNotesModal.jsx
 * @description Animated modal for displaying game version and patch notes
 */

import React from 'react';
import { X, Zap, Save, Users, Heart, Wrench, Sparkles, Palette, Newspaper } from 'lucide-react';

// IMPORTANT: Update this for each major release
const CURRENT_VERSION = '1.4.0';
const RELEASE_DATE = 'May 2026';
const RELEASE_TAGLINE = 'The Auction Intelligence Pass';

const PATCH_NOTES = [
  {
    icon: Sparkles,
    title: 'v1.4.0 The Auction Intelligence Pass',
    color: 'text-cricket-accent',
    bgColor: 'bg-cricket-accent/10',
    borderColor: 'border-cricket-accent/30',
    items: [
      '🛒 **Auction intelligence pass** — Major auction overhaul on both sides of the table. Set Max is no longer locked when auto-bid is on, and you can still click Bid manually alongside auto-bid. The max-bid input now has +/- arrows that step by the same tiered increment the engine uses ($5K / $10K / $20K depending on price), defaults to the next legal bid, and shows a yellow warning when a max is set while auto-bid is off. Per-player user max overrides AI logic, falling back to AI when unset. On the AI side, marquee-round players now carry a star-player premium (1.5× in marquee round 1, linearly down to 1.2× in the final marquee round), and every valuation knob — fit multiplier, squad-gap urgency, budget penalty range, reserve buffer, marquee endpoints, performance-bonus clamp — lives in one `auctionConfig.valuation` block. Budget penalty floor lifted from 0.4 to 0.6 so cash-strapped AI teams stop lowballing.',
      '💀 **Difficulty modes — Normal / Hard / Impossible** — Hard locks AI confidence at Sky-High and suppresses AI energy + pressure penalties (values still tracked). Impossible additionally stacks a +2 baseline on every AI attribute as a new Stage 0 in the modifier chain. Persisted in saves; modifier panel surfaces the changes for transparency.',
      '💝 **UPI / GPay donations** — Contribute menu now offers a UPI QR + copy-to-clipboard ID for India users, alongside the existing Ko-fi card.',
    ],
    note: 'The auction is the most consequential 90 minutes of your season. This pass makes it interactive (you can finally set a max while letting auto-bid do the boring stuff), smarter (AI knows a marquee round when it sees one), and tunable (every valuation knob is in one config block). Plus difficulty modes if you want a fight. 🛒'
  },
  {
    icon: Wrench,
    title: 'v1.3.1 Match Engine Balance Pass',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    items: [
      '⚖️ **Acceleration tier risk/reward fixed** — Hit Out / Get Out and Blitz now carry a real wicket cost. Cruise is the new neutral-context optimum. The "always pick HOGO" exploit is gone.',
      '🎯 **Aggressive bowling plans bite** — Attacking Line, Bouncer Barrage, Stumps Attack, Turn Candy Bag now visibly increase wicket chance per ball. Defensive plans trade wickets for runs as they should.',
      '🏏 **Death overs feel like death overs** — Striker strength bonus ramps over 17→20. Pace bowlers lose swing on the old ball. Spinners hold up better. Match-mode death RR finally lands in IRL T20 range.',
      '🌅 **New ball graduated** — Swing boost for pace bowlers now decays linearly across the powerplay (over 1: +5 swing, over 6: +0), instead of a flat +2 cliff at over 4.',
      '🔧 **Engine cleanup** — Dropped a stub config-loader and dead probability-engine that were never invoked. Removed five unused config files. The match engine is the same shape, just lighter.',
      '🧪 **Browser balance-test suite at `/testing`** — Ball Mode for single-context sweeps, Match Mode for full-innings batches, archetype presets for one-click matchup loading, and IRL benchmark pass/fail checks.',
    ],
    note: 'A focused balance pass. Tier choice now matters. Bowling plans now matter. Death overs now feel like death overs. Open the in-match tactics panel and try different tiers — you\'ll feel it. ⚖️'
  },
  {
    icon: Newspaper,
    title: 'v1.3.0 The Press Box — WPL Times Launch',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    items: [
      '📰 **The WPL Times has launched** — Cricket Manager 25 finally has its own in-game newspaper. *Est. MMXXV. "All The Cricket That\'s Fit To Print."* Every match, transfer, injury, retention, playoff and season opener is now a full written-up article you can open and read.',
      '🎙️ **A press box of 8 named journalists** — Harsha Bhogle, Jarrod Kimber, Sid Monga, Sanjay Manjrekar, Ian Bishop, Mark Nicholas, Richie Benaud, and WPL beat reporter Naya Singh. Each has their own beat: Ian Bishop turns up for finals, Sid Monga drills the tactics, Jarrod Kimber works the form guide, Mark Nicholas sets the scene on openers, Richie Benaud surfaces on the laconic blowouts. Bylines + reporter bios appear on every article.',
      '🏏 **Match reports that read like cricket writing** — Reports are now block-assembled prose: headline hook, anchor performance, turning point, colour commentary, clutch finish, player of the match, post-match quotes, plus a legacy-echo block that weaves in attributed tributes from cricket\'s greatest voices. No more mail-merge mush.',
      '🗞️ **Home dashboard news carousel** — The 8 biggest stories of the moment, sorted by importance with a boost for anything involving your club. Tap any card to read the full article in full newspaper layout. Auto-rotates every 10s; manual nav on hover.',
      '🎤 **Ball-by-ball commentary engine** — Live match view now uses a template-driven commentary system that varies by outcome, phase, and tactical state. No more identical lines every over.',
      '🛠️ **Energy / Fitness / Fatigue / Injury config consolidation** — Every tuning knob for the player-condition system now lives in one config file (`energy-config.json`). First balance change shipped with it: fatigue recovery now kicks in from rest day 6 instead of day 11.',
    ],
    note: 'The WPL finally has a press box. Open the Home dashboard and watch your league cover itself — eight journalists, one masthead, every match, every season. 🗞️'
  },
  {
    icon: Sparkles,
    title: 'v1.2.5 Matchday Polish & Bug Fixes',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    items: [
      '⏸️ **Innings break view** — A proper pause between innings with scorecard, target/required RR, win prediction, and cycleable charts (worm, manhattan, partnerships). No more bowlers starting before you can blink.',
      '🎯 **Tactics now stick** — Pre-set per-player batting tiers are respected at innings start and survive wickets, so the incoming batter no longer inherits the dismissed player\'s style.',
      '🧹 **Big bug-fix sweep** — Playoff results no longer pollute the league table, board objectives correctly detect NRR / top batter / top bowler, INR currency works in auctions and retention, and the bowler name + last-ball outcome now hold through end-of-over.',
    ],
    note: 'Mostly correctness fixes across matchday, league, and economy. Play, watch the break, set your bowling plans, click Continue. 🏏'
  },
  {
    icon: Wrench,
    title: 'v1.2.4 Seasonal Loop & Transfer Fixes',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    items: [
      '🏏 **Auction now triggered by the calendar** — Odd-season auctions (S3, S5, …) fire on Jan 7 via the `new_season_start` event. The Continue button reads "Start Auction" on that day and the auction can no longer be skipped.',
      '📅 **Retention day fixed** — Retention is anchored to Jan 6 before odd seasons ≥ 3. RetentionView no longer routes you to /game/transfers when you finish — you go back to the dashboard and Continue advances to the auction day.',
      '🔁 **Season 3+ auction unblock** — Previous build inherited `auctionState=\'completed\'` from S1 and the auto-start watcher refused to fire. Watcher now triggers as long as no auction is in progress; handleStartAuction resets the store cleanly.',
      '🧯 **Stale auto-start flag cleared** — `pendingAutoStart` was being persisted to IndexedDB. If an earlier bugged run left it `true`, the next navigation to /game/transfers would unexpectedly start an auction. The flag is now in-memory only and force-cleared on rehydration.',
      '💰 **"Listing not found" fixed** — Bidding right after a page reload no longer errors. TransferManager rebuilds its in-memory listings from the persisted store after rehydration, with a one-shot recovery in placeBid as a backstop.',
      '🪙 **1.5× max-bid cap removed** — You can now bid up to your full budget (half-price economics still applies). The Budget quick-bid button replaces the old Max button.',
      '🧮 **Player Performance crash fixed** — Opening a freshly-bought player\'s profile before the season starts no longer crashes with "Something went wrong". Stats reads are now fully optional-chained.',
      '🗓️ **`resetForNewSeason` year math** — Season transitions no longer skip an extra year when the auction lands in early January.',
    ],
    note: 'Cleanup pass on v1.2.0\'s seasonal loop. The chain Season End → Offseason → Transfer Window → Retention (Jan 6) → Auction (Jan 7) → New Season now holds together. 🛠️'
  },
  {
    icon: Wrench,
    title: 'v1.2.3 Playoff Progression Permafix',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    items: [
      '🏆 **Final no longer stuck on TBD** — Win Qualifier 1 live and the Final immediately shows your team in the home slot. Previously the interactive play-through skipped the bracket update; that path is now wired through the same atomic store action every other code path uses.',
      '⚙️ **One source of truth for playoff progression** — Recording a playoff result now updates fixtures and calendar events in the same transaction. No future code path can forget to advance the bracket.',
      '🩹 **Self-healing on load** — Save files stuck mid-playoffs from older builds repair themselves on load. Just reload your save and continue.',
    ],
    note: 'The recurring "no games scheduled after the Eliminator" bug has been patched repeatedly. This time it\'s gone at the architecture level, not just the symptom level. 🛡️'
  },
  {
    icon: Palette,
    title: 'v1.2.2 Club Customizer',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    items: [
      '🎨 **Club Customizer** — The World Premier League is fictional. Your teams should look like it. Redesign any of the 10 WPL clubs from the main menu.',
      '🖌️ **Primary & Secondary Colors** — Giant clickable swatches, live kit preview updates as you pick. Diagonal split banner so you can actually see how the colors interact.',
      '🦅 **Custom Badge Upload** — Drop in your own PNG, JPG, or SVG. Max 500KB. The badge is yours now.',
      '✏️ **Rename Everything** — Team name, 3-letter short code, coach name, home venue. Chennai Cobras? Never heard of her.',
      '🗂️ **Persists Across All Saves** — Customizations live outside your save files so they survive across new games, loaded saves, and the heat death of your season.',
      '🃏 **Live Kit Card Preview** — See your changes on a full team card in real time — badge, colors, name, venue, perk chip and all.',
    ],
    note: 'The WPL is fictional. Your imagination isn\'t. Rename Mumbai Lions to your local pub team. Make Kabul Kites neon pink. Give your club a coach called "Big Dave". Zero notes, full support. 🎨'
  },
  {
    icon: Sparkles,
    title: 'v1.2.1 Actionable Intelligence Update',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    items: [
      '📊 **Stats Hub** — The Matches page is now a full Stats Hub with Fixtures, Results, Season Statistics, and Match Analysis tabs.',
      '📈 **Match Analysis** — Drill into any match or aggregate across all played matches. Phase breakdown, batting, bowling, and fielding wagon wheel all in one place.',
      '🎯 **Wagon Zone Map** — 6-zone fielding heatmap showing where opponents scored against your bowling. Colour-coded by runs, filterable by phase.',
      '⚡ **Phase Breakdown** — Manhattan bar chart showing RPO (not total runs) across all 4 phases: Powerplay, Early Middle, Late Middle, Death.',
      '🏏 **Ball-level tagging** — Every simulated ball is now tagged with phase, hit zone, batter tier, and bowling plan for deep analytics.',
      '💡 **Tactical Insights** — Automatic insight cards surface high-impact patterns from your match data (wagon zone leaks, economy trends, SR vs spin).',
      '🗂️ **Full-width tab menus** — All tab bars across the game now span the full card width with equal button sizing.',
      '🔧 **4-Phase engine fix** — Match engine now correctly uses 4 phases (earlyMiddle 7–12, lateMiddle 13–16) instead of the old 3-phase system.',
    ],
    note: 'Data nerds, this one\'s for you. Every ball your team plays is now tracked and sliced by phase, playstyle, and tier. Your opponents have nowhere to hide. 📊'
  },
  {
    icon: Sparkles,
    title: 'v1.2.0 The Seasonal Loop Update',
    color: 'text-trophy-gold',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    items: [
      '🔄 **Full Seasonal Loop** - Play through multiple seasons! League → Playoffs → Off-Season → Transfers → New Season. The game actually continues now.',
      '🏏 **Pre-Auction Retention** - Retain up to 5 players before each auction (Season 3+). Negotiate salaries, manage tier caps, keep your stars.',
      '🏆 **Playoff Bug Fix** - "Can\'t proceed after Qualifier 1" is gone. Q2 no longer tries to start before the Eliminator finishes.',
      '💰 **Transfer Market** - Off-season transfer window with AI-driven listings, bidding, and free agency.',
      '📅 **Retention Day on Calendar** - Pre-auction retention now shows as a calendar event so you know when it\'s coming.',
      '📊 **Season History** - Track champions, standings, and your position across multiple seasons.',
      '🎨 **Modal Legibility Fix** - All modals now use solid backgrounds instead of transparent ones. You can actually read things now.',
      '💾 **Save/Load Overhaul** - Retention data now properly saves and loads. No more lost progress mid-retention phase.',
      '🛡️ **Safeguards** - Off-season and new season events can no longer fire while playoffs are still running.'
    ],
    note: 'The biggest update yet. You can now play forever — or until your star player threatens to leave to go captain his original team unless you give him more money. Welcome to Cricket Manager hell. 🔥'
  },
  {
    icon: Wrench,
    title: 'v1.1.4 Identity Crisis Hotfix',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    items: [
      '🎭 **All-Rounder Playstyle Fix** - Rashid Khan was cosplaying as an Opener. All-rounders now correctly show their actual best batting playstyle',
      '⚡ **advanceDay() Memory Fix** - 376 individual store updates batched into 1. Your browser was doing more work per day than the players.'
    ],
    note: 'All-rounders were having an identity crisis — Rashid Khan thought he was an opener. Therapy complete. 🧠'
  },
  {
    icon: Wrench,
    title: 'v1.1.3 Tactics & Polish Fixes',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    items: [
      '🎳 **Illegal Bowling Plans Blocked** - Bumrah can no longer bowl all 20 overs. Sorry Bumrah fans.',
      '🔄 **Fielding Revert on Cancel** - Closing the fielding editor without saving reverts to last legal setup. Your chaos is contained.',
      '✅ **Live Fielding Validation** - Real-time warning when you set up something illegal. Like 5 slips in a T20.',
      '🚨 **Tactics Sidebar Actually Explains Itself** - Navigation block now tells you WHAT is illegal instead of just vibing with a red screen',
      '🧤 **Emergency Keeper Quick-Sim Fix** - Quick-sim was refusing to start if your keeper was injured and you picked an emergency one. Rude.',
      '🌑 **Darker Modal Backdrops** - You could barely read modals on bright backgrounds. Now you can. Revolutionary.',
      '⚡ **Energy Reset Fix** - Players were magically recovering to 100 energy overnight like they had a Red Bull sponsorship. Fixed.'
    ],
    note: 'Mostly stopping you from accidentally (or deliberately) breaking cricket law. The ICC thanks us. 🏏'
  },
  {
    icon: Sparkles,
    title: 'v1.1.2 UI Polish & Bug Fixes',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    items: [
      '🎨 **Playstyle Abbreviations** - Compact playstyle codes with hover tooltips throughout UI',
      '🔧 **Playoff Fixes** - Bracket population and champion display now working correctly',
      '💾 **Memory Optimization** - Fixed memory leak during sim-to-date simulation',
      '📊 **Database Persistence** - Player Database Editor and Transfer System now save correctly',
      '🎯 **Compact Layout** - Player Database Editor now uses horizontal layout for better space usage'
    ],
    note: 'Polish and stability fixes. Hover over playstyle abbreviations (like O-SLG, P-HTD) to see full names! 🏏'
  },
  {
    icon: Sparkles,
    title: 'v1.1.1 Balance & Fixes',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    items: [
      '📊 **Bowler Impact Fix** - Batting failures no longer unfairly penalize bowler ratings',
      '📈 **Detailed Impact Stats** - View separate Batting, Bowling, and Fielding impact scores',
      '⚡ **Smarter Fatigue** - Consecutive rest days now grant bonus recovery',
      '🏥 **Fitness Logic** - Adjusted max fitness calculations for better longevity'
    ],
    note: 'Small update to fix some glaring math issues. Bowlers are people too! 🎳'
  },
  {
    icon: Save,
    title: 'New Save/Load System (v1.1.0)',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    items: [
      '💾 **Autosave feature** - Never lose progress mid-game again!',
      '⏮️ **Resume from previous sessions** - Up to 2 autosave slots',
      '☁️ **Cloud saving enabled** - Sign in with Google to save across devices',
      '📥 **Manual save downloads** - Still recommended for extra safety'
    ],
    note: 'Biggest complaint solved! If you still lose saves, PLEASE report it immediately. The cricket gods are testing our patience. 🏏'
  },
  {
    icon: Users,
    title: 'Player Database Editor',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    items: [
      '✨ **Create custom players** - Name them after your pet, idc',
      '⚡ **Edit any player** - Make Dhoni a godly batter, why not?',
      '🎯 **Custom playstyles** - Tweak attributes to your heart\'s content',
      '💾 **Save & export databases** - Share your cursed rosters'
    ],
    note: 'The cricket gods are watching. Please stay within reasonable limits... or don\'t. I\'m not your mom. 😈'
  },
  {
    icon: Wrench,
    title: 'Part-Time Bowlers & Emergency Keepers',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    items: [
      '🎳 **"Add Part-Timer" button** - Bowl your batsmen (chaos mode)',
      '🧤 **Emergency wicket-keepers** - For when all keepers get injured',
      '🔓 **Unlock broken saves** - Continue saves that were blocked before',
      '🎮 **Full manual control** - Your team, your rules'
    ],
    note: 'Some of you REALLY wanted to bowl Kohli. Now you can. Enjoy the carnage! 🔥'
  },
  {
    icon: Heart,
    title: 'Fitness & Recovery System',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    items: [
      '💪 **Less frequent injuries** - Players aren\'t made of glass anymore',
      '⚡ **Faster energy recovery** - They actually rest between matches now',
      '😴 **Fatigue management** - Bench fatigued players to reduce it',
      '🏥 **Improved recovery rates** - Get your squad back faster'
    ],
    note: 'Your players were getting injured more than BCCI touring schedules. Fixed! 🏏'
  },
  {
    icon: Sparkles,
    title: 'UI Improvements',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    items: [
      '🎨 **Design overhaul** - New backgrounds, colors, team elements',
      '📊 **Better tables** - Filterable, sortable, actually useful',
      '✨ **Visual polish** - Smoother animations and transitions',
      '🎯 **Better UX** - I asked ChatGPT for design advice (I know nothing)'
    ],
    note: 'I barely know anything about game design. Feedback HIGHLY appreciated! 🙏'
  }
];

const PatchNotesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary border-2 border-cricket-accent/30 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-cricket-accent/20 via-cricket-accent/10 to-transparent border-b border-cricket-accent/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-cricket-accent animate-pulse" />
                <h2 className="text-2xl font-bold text-cricket-text-primary">
                  What's New in Cricket Manager 25
                </h2>
              </div>
              <p className="text-sm text-cricket-text-secondary mt-1 ml-9">
                Version {CURRENT_VERSION} • {RELEASE_DATE} • <span className="text-cricket-accent font-semibold">{RELEASE_TAGLINE}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cricket-accent/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-cricket-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 space-y-4">
          {PATCH_NOTES.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className={`${section.bgColor} border ${section.borderColor} rounded-lg p-4 hover:scale-[1.01] transition-transform`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${section.bgColor} p-2 rounded-lg border ${section.borderColor}`}>
                    <Icon className={`w-5 h-5 ${section.color}`} />
                  </div>
                  <h3 className={`text-lg font-bold ${section.color}`}>
                    {section.title}
                  </h3>
                </div>

                <ul className="space-y-2 ml-2 mb-3">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-sm text-cricket-text-secondary leading-relaxed">
                      {item.split('**').map((part, partIdx) =>
                        partIdx % 2 === 1 ? (
                          <span key={partIdx} className="text-cricket-text-primary font-semibold">
                            {part}
                          </span>
                        ) : (
                          part
                        )
                      )}
                    </li>
                  ))}
                </ul>

                {section.note && (
                  <div className="mt-3 pt-3 border-t border-cricket-accent/20">
                    <p className="text-xs text-cricket-text-tertiary italic">
                      💬 {section.note}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer Message */}
          <div className="bg-gradient-to-r from-cricket-accent/10 via-cricket-accent/5 to-transparent border border-cricket-accent/20 rounded-lg p-4 mt-6">
            <p className="text-sm text-cricket-text-secondary text-center">
              🐛 Found a bug? Report it on the{' '}
              <span className="text-cricket-accent font-semibold">bug fixes group</span>
              . 💬 Got feedback? I'm all ears! Happy Managing! 🏏
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatchNotesModal;
