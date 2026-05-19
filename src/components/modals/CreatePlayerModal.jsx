/**
 * @file CreatePlayerModal.jsx
 * @description Modal for creating a new custom player from scratch.
 * All fields default to reasonable values, with attributes starting at 10.
 * Playstyle ratings are calculated automatically from attributes.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { X, UserPlus, Dumbbell, Brain, Target, Shield, Sparkles } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import playstyleCalculator from '../../utils/PlaystyleCalculator';
import CountryFlag from '../shared/CountryFlag';

// Attribute categories (same as PlayerEditorModal)
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

// Default attributes (all 10)
const getDefaultAttributes = () => ({
  batting: {
    technique: 10, timing: 10, footwork: 10, placement: 10, range360: 10,
    defensiveShots: 10, neutralShots: 10, attackingShots: 10,
    vsPace: 10, vsSpin: 10, creativity: 10
  },
  bowling: {
    accuracy: 10, bowlingSpeed: 10, swing: 10, turn: 10, flight: 10,
    variations: 10, intelligence: 10, defensiveBowling: 10,
    neutralBowling: 10, attackingBowling: 10
  },
  physical: {
    strength: 10, speed: 10, agility: 10, maxFitness: 10, endurance: 10, stamina: 10
  },
  mental: {
    concentration: 10, temperament: 10, aggression: 10, judgement: 10, leadership: 10
  },
  fielding: {
    catching: 10, reflexes: 10, groundFielding: 10, throwPower: 10,
    throwAccuracy: 10, keeping: 10, collecting: 10, stumping: 10
  },
  overall: {
    batting_overall: 10,
    bowling_overall: 10
  }
});

// Default player template
const getDefaultPlayer = () => ({
  name: '',
  fullName: '',
  nationality: 'England',
  age: 25,
  role: 'batsman',
  battingHand: 'right',
  bowlingHand: 'right',
  bowlingType: 'pace',
  primaryBattingPosition: 5,
  attributes: getDefaultAttributes()
});

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

const CreatePlayerModal = ({ isOpen, onClose }) => {
  const { addCustomPlayer } = usePlayerStore();

  // Local state for new player
  const [newPlayer, setNewPlayer] = useState(getDefaultPlayer());
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setNewPlayer(getDefaultPlayer());
      setErrors({});
    }
  }, [isOpen]);

  // Calculate live playstyle preview
  const playstylePreview = useMemo(() => {
    try {
      const primaryPlaystyles = playstyleCalculator.getPlayerPrimaryPlaystyles(
        newPlayer,
        newPlayer.role,
        3
      );

      return {
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
  }, [newPlayer]);

  // Update a basic field
  const updateField = useCallback((field, value) => {
    setNewPlayer(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  // Update an attribute
  const updateAttribute = useCallback((category, key, value) => {
    setNewPlayer(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [category]: {
          ...prev.attributes[category],
          [key]: value
        }
      }
    }));
  }, []);

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!newPlayer.name || newPlayer.name.trim().length < 2) {
      newErrors.name = 'Name is required (min 2 characters)';
    }

    if (!newPlayer.nationality) {
      newErrors.nationality = 'Nationality is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create player
  const handleCreate = async () => {
    if (!validate()) return;

    setIsCreating(true);
    try {
      // Set fullName if not provided
      const playerData = {
        ...newPlayer,
        fullName: newPlayer.fullName || newPlayer.name
      };

      const createdPlayer = await addCustomPlayer(playerData);
      console.log('Created player:', createdPlayer);
      onClose();
    } catch (error) {
      console.error('Failed to create player:', error);
      alert('Failed to create player: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[200] p-4">
      <div className="bg-black/85 backdrop-blur-md border border-border-primary rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-cricket-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Create Custom Player
            </h2>
            <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Custom
            </span>
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
                  <UserPlus className="w-4 h-4" />
                  Player Information
                </h3>

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPlayer.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Enter player name"
                      className={`w-full px-3 py-1.5 bg-bg-tertiary border rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent ${
                        errors.name ? 'border-red-500' : 'border-border-primary'
                      }`}
                    />
                    {errors.name && (
                      <span className="text-xs text-red-400 mt-0.5">{errors.name}</span>
                    )}
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newPlayer.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="Enter full name (optional)"
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
                      value={newPlayer.age}
                      onChange={(e) => updateField('age', parseInt(e.target.value) || 25)}
                      className="w-full px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary focus:outline-none focus:border-cricket-accent"
                    />
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">
                      Nationality <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <CountryFlag nationality={newPlayer.nationality} className="w-5 h-3" />
                      <select
                        value={newPlayer.nationality}
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
                      value={newPlayer.role}
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
                      value={newPlayer.battingHand}
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
                      value={newPlayer.bowlingHand}
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
                      value={newPlayer.bowlingType}
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
                      value={newPlayer.primaryBattingPosition}
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
                <p className="text-xs text-text-secondary mb-3">
                  Calculated from attributes (read-only)
                </p>
                {playstylePreview && (
                  <PlaystylePreview
                    topPlaystyles={playstylePreview.topPlaystyles}
                    primaryPlaystyle={playstylePreview.primaryPlaystyle}
                    role={newPlayer.role}
                  />
                )}
              </div>
            </div>

            {/* Middle & Right Columns - Attributes */}
            <div className="lg:col-span-2 space-y-4">
              <div className="text-sm text-text-secondary mb-2">
                Adjust attributes (1-20 scale). Higher values = better performance.
              </div>
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
                            value={newPlayer.attributes?.[category]?.[key] || 10}
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
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-primary">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-1.5 text-sm"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn-primary px-4 py-1.5 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {isCreating ? 'Creating...' : 'Create Player'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePlayerModal;
