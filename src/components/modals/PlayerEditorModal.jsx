/**
 * @file PlayerEditorModal.jsx
 * @description Modal for editing player attributes with sliders and live playstyle preview.
 * Users can modify name, role, attributes, and see how playstyle ratings change in real-time.
 * Playstyle ratings are read-only (auto-calculated from attributes).
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Save, RotateCcw, User, Dumbbell, Brain, Target, Shield, AlertCircle } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import playstyleCalculator from '../../utils/PlaystyleCalculator';
import CountryFlag from '../shared/CountryFlag';

// Attribute categories with their keys and display labels
const ATTRIBUTE_GROUPS = {
  batting: {
    label: 'Batting',
    icon: Target,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    attributes: [
      { key: 'technique', label: 'Technique' },
      { key: 'timing', label: 'Timing' },
      { key: 'footwork', label: 'Footwork' },
      { key: 'placement', label: 'Placement' },
      { key: 'range360', label: '360° Range' },
      { key: 'defensiveShots', label: 'Defensive' },
      { key: 'neutralShots', label: 'Neutral' },
      { key: 'attackingShots', label: 'Attacking' },
      { key: 'vsPace', label: 'vs Pace' },
      { key: 'vsSpin', label: 'vs Spin' },
      { key: 'creativity', label: 'Creativity' }
    ]
  },
  bowling: {
    label: 'Bowling',
    icon: Target,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    attributes: [
      { key: 'accuracy', label: 'Accuracy' },
      { key: 'bowlingSpeed', label: 'Speed' },
      { key: 'swing', label: 'Swing' },
      { key: 'turn', label: 'Turn' },
      { key: 'flight', label: 'Flight' },
      { key: 'variations', label: 'Variations' },
      { key: 'intelligence', label: 'Intelligence' },
      { key: 'defensiveBowling', label: 'Defensive' },
      { key: 'neutralBowling', label: 'Neutral' },
      { key: 'attackingBowling', label: 'Attacking' }
    ]
  },
  physical: {
    label: 'Physical',
    icon: Dumbbell,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    attributes: [
      { key: 'strength', label: 'Strength' },
      { key: 'speed', label: 'Speed' },
      { key: 'agility', label: 'Agility' },
      { key: 'maxFitness', label: 'Max Fitness' },
      { key: 'endurance', label: 'Endurance' },
      { key: 'stamina', label: 'Stamina' }
    ]
  },
  mental: {
    label: 'Mental',
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
    attributes: [
      { key: 'concentration', label: 'Concentration' },
      { key: 'temperament', label: 'Temperament' },
      { key: 'aggression', label: 'Aggression' },
      { key: 'judgement', label: 'Judgement' },
      { key: 'leadership', label: 'Leadership' }
    ]
  },
  fielding: {
    label: 'Fielding',
    icon: Shield,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    attributes: [
      { key: 'catching', label: 'Catching' },
      { key: 'reflexes', label: 'Reflexes' },
      { key: 'groundFielding', label: 'Ground Field' },
      { key: 'throwPower', label: 'Throw Power' },
      { key: 'throwAccuracy', label: 'Throw Acc' },
      { key: 'keeping', label: 'Keeping' },
      { key: 'collecting', label: 'Collecting' },
      { key: 'stumping', label: 'Stumping' }
    ]
  }
};

const ROLES = ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'];
const NATIONALITIES = [
  'England', 'Australia', 'India', 'South Africa', 'New Zealand',
  'Pakistan', 'Sri Lanka', 'West Indies', 'Bangladesh', 'Afghanistan',
  'Zimbabwe', 'Ireland', 'Scotland', 'Netherlands', 'USA'
];
const BOWLING_TYPES = ['pace', 'spin'];

/**
 * Slider component for attribute editing
 */
const AttributeSlider = ({ label, value, onChange, min = 1, max = 20 }) => {
  const getColor = (val) => {
    if (val <= 6) return 'text-red-400';
    if (val <= 10) return 'text-yellow-400';
    if (val <= 14) return 'text-green-400';
    return 'text-blue-400';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary w-20 truncate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-cricket-accent"
      />
      <span className={`text-xs font-mono font-bold w-6 text-right ${getColor(value)}`}>
        {value}
      </span>
    </div>
  );
};

/**
 * Playstyle preview panel (read-only)
 * Shows batting + bowling for most players, batting + fielding for wicket-keepers
 */
const PlaystylePreview = ({ topPlaystyles, primaryPlaystyle, role }) => {
  const getRatingColor = (rating) => {
    if (rating < 33) return 'text-red-400';
    if (rating < 67) return 'text-yellow-400';
    return 'text-green-400';
  };

  const isWicketKeeper = role === 'wicket-keeper';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <AlertCircle className="w-3 h-3" />
        <span>Playstyles are calculated from attributes (read-only)</span>
      </div>

      {/* Top Batting - show for all players */}
      {topPlaystyles?.batting?.length > 0 && (
        <div className="p-2 bg-blue-900/20 rounded">
          <div className="text-xs font-semibold text-blue-400 mb-1.5">Top Batting</div>
          <div className="space-y-1">
            {topPlaystyles.batting.slice(0, 3).map((style, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className={`text-xs ${primaryPlaystyle?.batting === style.name ? 'text-blue-400 font-bold' : 'text-text-secondary'}`}>
                  {primaryPlaystyle?.batting === style.name && '★ '}{style.name}
                </span>
                <span className={`text-xs font-mono ${getRatingColor(style.rating)}`}>
                  {Math.round(style.rating)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Fielding - show for wicket-keepers */}
      {isWicketKeeper && topPlaystyles?.fielding?.length > 0 && (
        <div className="p-2 bg-cyan-900/20 rounded">
          <div className="text-xs font-semibold text-cyan-400 mb-1.5">Top Fielding</div>
          <div className="space-y-1">
            {topPlaystyles.fielding.slice(0, 3).map((style, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className={`text-xs ${primaryPlaystyle?.fielding === style.name ? 'text-cyan-400 font-bold' : 'text-text-secondary'}`}>
                  {primaryPlaystyle?.fielding === style.name && '★ '}{style.name}
                </span>
                <span className={`text-xs font-mono ${getRatingColor(style.rating)}`}>
                  {Math.round(style.rating)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Bowling - show for non-wicket-keepers */}
      {!isWicketKeeper && topPlaystyles?.bowling?.length > 0 && (
        <div className="p-2 bg-red-900/20 rounded">
          <div className="text-xs font-semibold text-red-400 mb-1.5">Top Bowling</div>
          <div className="space-y-1">
            {topPlaystyles.bowling.slice(0, 3).map((style, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className={`text-xs ${primaryPlaystyle?.bowling === style.name ? 'text-red-400 font-bold' : 'text-text-secondary'}`}>
                  {primaryPlaystyle?.bowling === style.name && '★ '}{style.name}
                </span>
                <span className={`text-xs font-mono ${getRatingColor(style.rating)}`}>
                  {Math.round(style.rating)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerEditorModal = ({ isOpen, onClose, playerId }) => {
  const { players, updatePlayerCustomization, resetPlayerToDefault, isPlayerCustomized } = usePlayerStore();

  // Local state for editing
  const [editedPlayer, setEditedPlayer] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Original player for comparison
  const originalPlayer = players[playerId];
  const customizationStatus = isPlayerCustomized(playerId);

  // Initialize edited player when modal opens
  useEffect(() => {
    if (isOpen && originalPlayer) {
      setEditedPlayer(JSON.parse(JSON.stringify(originalPlayer)));
      setHasChanges(false);
    }
  }, [isOpen, playerId, originalPlayer]);

  // Calculate live playstyle preview
  const playstylePreview = useMemo(() => {
    if (!editedPlayer) return null;

    try {
      const ratings = playstyleCalculator.calculateAllPlaystyleRatings(editedPlayer);
      const primaryPlaystyles = playstyleCalculator.getPlayerPrimaryPlaystyles(
        editedPlayer,
        editedPlayer.role,
        3
      );

      return {
        ratings,
        topPlaystyles: {
          batting: primaryPlaystyles.batting,
          bowling: primaryPlaystyles.bowling,
          fielding: primaryPlaystyles.fielding || []
        },
        primaryPlaystyle: {
          batting: primaryPlaystyles.batting[0]?.name || null,
          bowling: primaryPlaystyles.bowling[0]?.name || null,
          fielding: primaryPlaystyles.fielding?.[0]?.name || null
        }
      };
    } catch (error) {
      console.error('Error calculating playstyles:', error);
      return null;
    }
  }, [editedPlayer]);

  // Update a basic field
  const updateField = useCallback((field, value) => {
    setEditedPlayer(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Update an attribute
  const updateAttribute = useCallback((category, key, value) => {
    setEditedPlayer(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [category]: {
          ...prev.attributes[category],
          [key]: value
        }
      }
    }));
    setHasChanges(true);
  }, []);

  // Save changes
  const handleSave = async () => {
    if (!editedPlayer || !hasChanges) return;

    setIsSaving(true);
    try {
      // Build changes object (only changed fields)
      const changes = {};

      // Check basic fields
      ['name', 'fullName', 'nationality', 'age', 'role', 'battingHand', 'bowlingHand', 'bowlingType', 'primaryBattingPosition'].forEach(field => {
        if (editedPlayer[field] !== originalPlayer[field]) {
          changes[field] = editedPlayer[field];
        }
      });

      // Check attributes
      for (const category of Object.keys(ATTRIBUTE_GROUPS)) {
        for (const { key } of ATTRIBUTE_GROUPS[category].attributes) {
          const editedVal = editedPlayer.attributes?.[category]?.[key];
          const originalVal = originalPlayer.attributes?.[category]?.[key];
          if (editedVal !== originalVal) {
            if (!changes.attributes) changes.attributes = {};
            if (!changes.attributes[category]) changes.attributes[category] = {};
            changes.attributes[category][key] = editedVal;
          }
        }
      }

      await updatePlayerCustomization(playerId, changes);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save player:', error);
      alert('Failed to save changes: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (customizationStatus.isCustom) {
      alert('Custom players cannot be reset. Delete instead.');
      return;
    }

    if (!confirm('Reset this player to default values? This will remove all customizations.')) {
      return;
    }

    await resetPlayerToDefault(playerId);
    onClose();
  };

  if (!isOpen || !editedPlayer) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-cricket-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Edit Player
            </h2>
            {customizationStatus.isCustom && (
              <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded">
                Custom Player
              </span>
            )}
            {customizationStatus.isModified && !customizationStatus.isCustom && (
              <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                Modified
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Basic Information
                </h3>

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Name</label>
                    <input
                      type="text"
                      value={editedPlayer.name || ''}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editedPlayer.fullName || ''}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Age</label>
                    <input
                      type="number"
                      min="16"
                      max="50"
                      value={editedPlayer.age || 25}
                      onChange={(e) => updateField('age', parseInt(e.target.value) || 25)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                    />
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Nationality</label>
                    <div className="flex items-center gap-2">
                      <CountryFlag nationality={editedPlayer.nationality} className="w-5 h-3" />
                      <select
                        value={editedPlayer.nationality || 'England'}
                        onChange={(e) => updateField('nationality', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                      >
                        {NATIONALITIES.map(nat => (
                          <option key={nat} value={nat}>{nat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Role</label>
                    <select
                      value={editedPlayer.role || 'batsman'}
                      onChange={(e) => updateField('role', e.target.value)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent capitalize"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role} className="capitalize">{role}</option>
                      ))}
                    </select>
                  </div>

                  {/* Batting Hand */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Batting Hand</label>
                    <select
                      value={editedPlayer.battingHand || 'right'}
                      onChange={(e) => updateField('battingHand', e.target.value)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                    </select>
                  </div>

                  {/* Bowling Hand */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Bowling Hand</label>
                    <select
                      value={editedPlayer.bowlingHand || 'right'}
                      onChange={(e) => updateField('bowlingHand', e.target.value)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                    </select>
                  </div>

                  {/* Bowling Type */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Bowling Type</label>
                    <select
                      value={editedPlayer.bowlingType || 'pace'}
                      onChange={(e) => updateField('bowlingType', e.target.value)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent capitalize"
                    >
                      {BOWLING_TYPES.map(type => (
                        <option key={type} value={type} className="capitalize">{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Batting Position */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Batting Position</label>
                    <select
                      value={editedPlayer.primaryBattingPosition || 5}
                      onChange={(e) => updateField('primaryBattingPosition', parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(pos => (
                        <option key={pos} value={pos}>#{pos}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Playstyle Preview */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  Playstyle Preview
                </h3>
                {playstylePreview && (
                  <PlaystylePreview
                    topPlaystyles={playstylePreview.topPlaystyles}
                    primaryPlaystyle={playstylePreview.primaryPlaystyle}
                    role={editedPlayer.role}
                  />
                )}
              </div>
            </div>

            {/* Middle & Right Columns - Attributes */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(ATTRIBUTE_GROUPS).map(([category, group]) => {
                  const Icon = group.icon;
                  return (
                    <div key={category} className={`card p-3 ${group.bgColor}`}>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${group.color}`}>
                        <Icon className="w-4 h-4" />
                        {group.label}
                      </h3>
                      <div className="space-y-2">
                        {group.attributes.map(({ key, label }) => (
                          <AttributeSlider
                            key={key}
                            label={label}
                            value={editedPlayer.attributes?.[category]?.[key] || 10}
                            onChange={(val) => updateAttribute(category, key, val)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
          <div>
            {!customizationStatus.isCustom && (
              <button
                onClick={handleReset}
                className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-2"
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-1.5 text-sm"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="btn-primary px-4 py-1.5 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerEditorModal;
