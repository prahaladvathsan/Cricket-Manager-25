/**
 * @file PatchNotesModal.jsx
 * @description Animated modal for displaying game version and patch notes
 */

import React from 'react';
import { X, Zap, Save, Users, Heart, Wrench, Sparkles, Palette } from 'lucide-react';

// IMPORTANT: Update this for each major release
const CURRENT_VERSION = '1.1.5';
const RELEASE_DATE = 'May 2026';
const RELEASE_TAGLINE = 'Stable Build — Stats Hub, Club Customizer, Notifications';

const PATCH_NOTES = [
  {
    icon: Sparkles,
    title: 'v1.1.5 Stability + Polish',
    color: 'text-trophy-gold',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    items: [
      '📊 **Stats Hub** — The Matches page is now a full Stats Hub with Fixtures, Results, Season Statistics, and Match Analysis tabs. Drill into any match or aggregate across the season.',
      '🎯 **Wagon Zone Map & Phase Breakdown** — 6-zone fielding heatmap showing where opponents scored. Manhattan bar chart for RPO across all 4 phases (Powerplay / Early Middle / Late Middle / Death).',
      '🏏 **Ball-level tagging** — Every simulated ball is tagged with phase, hit zone, batter tier, and bowling plan for deep analytics.',
      '🎨 **Club Customizer** — Redesign any of the 10 WPL clubs from the main menu. Rename team, short code, coach, home venue. Upload a custom badge (PNG/JPG/SVG, ≤500KB). Pick primary + secondary colors with live kit preview.',
      '📬 **Inbox + Notifications** — Phone-style notification toasts (top-center, 5s auto-dismiss). Match result messages with full scorecard summary. Match reminders now include real injury and tactics intel.',
      '🏆 **Playoff Progression Permafix** — Final no longer stuck on TBD. Recording a playoff result now updates fixtures + calendar events in one atomic transaction. Self-healing on load — save files stuck mid-playoffs from older builds repair themselves.',
      '🌑 **Translucent panels** — Card backgrounds restored to the dark translucent black look against the stadium wallpaper.',
      '💾 **Preparing Match Fix** — Loading a save mid-match no longer leaves you stuck on the "Preparing Match" screen.',
    ],
    note: 'Pulled back from the seasonal-loop / retention rework because of progression bugs. This build is v1.1.4 with the Stats Hub, Club Customizer, Inbox/Notifications, and the playoff permafix bolted on. Stable, playable, and forward-compatible. 🛡️'
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
