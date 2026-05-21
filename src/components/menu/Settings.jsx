/**
 * @file Settings.jsx
 * @description Game settings page with user preferences
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, Gauge, DollarSign, BookOpen, RotateCcw } from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import '../../styles/wallpaper.css';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' }
];

const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, resetSettings, resetTutorial } = useGameStore();

  const handleSpeedChange = (e) => {
    updateSettings({ simulationSpeed: parseInt(e.target.value, 10) });
  };

  const handleCurrencyChange = (e) => {
    updateSettings({ currency: e.target.value });
  };

  const handleTutorialToggle = () => {
    updateSettings({ tutorialEnabled: !settings.tutorialEnabled });
  };

  const handleModalModeChange = (e) => {
    updateSettings({ matchResultModalMode: e.target.value });
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default values?')) {
      resetSettings();
    }
  };

  const handleResetTutorial = () => {
    if (window.confirm('Reset tutorial progress? The onboarding walkthrough and all screen tips will appear again.')) {
      resetTutorial();
      alert('Tutorial has been reset. The walkthrough will appear when you start or load a game.');
    }
  };

  // Format speed for display (ms to seconds with 1 decimal)
  const formatSpeed = (ms) => {
    if (ms === 0) return 'Instant';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen app-wallpaper p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>
        </div>

        {/* Main Content */}
        <div className="card p-6">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-8 h-8 text-cricket-accent" />
            <h1 className="text-2xl font-bold text-cricket-text-primary">
              Settings
            </h1>
          </div>

          {/* Match Settings Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-5 h-5 text-cricket-accent" />
              <h2 className="text-lg font-semibold text-cricket-text-primary">
                Match Settings
              </h2>
            </div>

            <div className="bg-cricket-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-cricket-text-primary font-medium">
                  Simulation Speed
                </label>
                <span className="text-cricket-accent font-semibold min-w-[60px] text-right">
                  {formatSpeed(settings.simulationSpeed)}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="3000"
                step="100"
                value={settings.simulationSpeed}
                onChange={handleSpeedChange}
                className="w-full h-2 bg-cricket-primary/30 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cricket-accent
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-cricket-accent
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer"
              />

              <div className="flex justify-between text-xs text-cricket-text-secondary mt-1">
                <span>Instant</span>
                <span>3.0s</span>
              </div>

              <p className="text-sm text-cricket-text-secondary mt-2">
                Controls the delay between each ball during match simulation.
              </p>
            </div>

            {/* Match Result Modal Mode */}
            <div className="bg-cricket-secondary rounded-lg p-4 mt-3">
              <div className="flex items-center justify-between">
                <label className="text-cricket-text-primary font-medium">
                  Match Result Pop-ups
                </label>
                <select
                  value={settings.matchResultModalMode ?? 'user_only'}
                  onChange={handleModalModeChange}
                  className="bg-cricket-primary border border-cricket-primary/50 rounded px-3 py-1.5
                    text-cricket-text-primary focus:outline-none focus:ring-2 focus:ring-cricket-accent/50"
                >
                  <option value="all">All matches</option>
                  <option value="user_only">Only my team</option>
                  <option value="none">Never — use news feed</option>
                </select>
              </div>
              <p className="text-sm text-cricket-text-secondary mt-2">
                When to show the full match result modal. Hidden matches always appear as articles in the Home news feed.
              </p>
            </div>
          </div>

          {/* Display Settings Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-cricket-accent" />
              <h2 className="text-lg font-semibold text-cricket-text-primary">
                Display Settings
              </h2>
            </div>

            <div className="bg-cricket-secondary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <label className="text-cricket-text-primary font-medium">
                  Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={handleCurrencyChange}
                  className="bg-cricket-primary border border-cricket-primary/50 rounded px-3 py-1.5
                    text-cricket-text-primary focus:outline-none focus:ring-2 focus:ring-cricket-accent/50"
                >
                  {CURRENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-cricket-text-secondary mt-2">
                Display currency for all financial values in the game.
              </p>
            </div>
          </div>

          {/* Gameplay Settings Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-cricket-accent" />
              <h2 className="text-lg font-semibold text-cricket-text-primary">
                Gameplay Settings
              </h2>
            </div>

            <div className="bg-cricket-secondary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-cricket-text-primary font-medium">
                    Tutorial Messages
                  </label>
                  <p className="text-sm text-cricket-text-secondary mt-1">
                    Show tutorial and welcome messages when starting a new game.
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={handleTutorialToggle}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                    ${settings.tutorialEnabled
                      ? 'bg-cricket-accent'
                      : 'bg-gray-600'
                    }
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200
                      ${settings.tutorialEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Reset Tutorial Button */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-cricket-primary/30">
                <div>
                  <label className="text-cricket-text-primary font-medium">
                    Reset Tutorial
                  </label>
                  <p className="text-sm text-cricket-text-secondary mt-1">
                    Show the onboarding walkthrough and screen tips again.
                  </p>
                </div>
                <button
                  onClick={handleResetTutorial}
                  className="px-4 py-2 bg-cricket-primary hover:bg-cricket-primary-dark text-cricket-text-primary text-sm rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="border-t border-cricket-primary/30 pt-6">
            <button
              onClick={handleReset}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 text-center text-xs text-cricket-text-secondary">
          Settings are automatically saved.
        </div>
      </div>
    </div>
  );
};

export default Settings;
