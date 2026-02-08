/**
 * @file PatchNotesModal.jsx
 * @description Animated modal for displaying game version and patch notes
 */

import React from 'react';
import { X, Zap, Save, Users, Heart, Wrench, Sparkles } from 'lucide-react';

// IMPORTANT: Update this for each major release
const CURRENT_VERSION = '1.1.1';
const RELEASE_DATE = 'February 2026';
const RELEASE_TAGLINE = 'Balance & Impact Update';

const PATCH_NOTES = [
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
