/**
 * @file TacticsPanel.jsx
 * @description Batting and bowling tactics configuration for testing mode (compact)
 */

import React from 'react';
import { Swords, Target, Shield } from 'lucide-react';
import FieldTemplateSelector from '../tactics/tabs/FieldTemplateSelector';

// Acceleration tiers
const ACCELERATION_TIERS = [
  { value: 'Blockade', label: 'Block' },
  { value: 'Build', label: 'Build' },
  { value: 'Rotate', label: 'Rotate' },
  { value: 'Cruise', label: 'Cruise' },
  { value: 'Blitz', label: 'Blitz' },
  { value: 'Hit Out/Get Out', label: 'HitOut' }
];

// Batting playstyles
const BATTING_PLAYSTYLES = [
  'Opener - Slogger', 'Opener - Balanced', 'Opener - Anchor',
  'Top Order - Slogger', 'Top Order - Balanced', 'Top Order - Anchor',
  'Middle Order - Slogger', 'Middle Order - Balanced', 'Middle Order - Anchor',
  'Lower Order - Slogger', 'Lower Order - Balanced', 'Lower Order - Anchor',
  'Finisher', 'Runner', 'Pinch-Hitter', 'Wall'
];

// Bowling playstyles
const PACE_PLAYSTYLES = ['Swing Bowler', 'Hit-the-Deck Seamer', 'Short-Ball Specialist', 'Death Specialist'];
const SPIN_PLAYSTYLES = ['Classical Spinner', 'Flat Spinner', 'Mystery Spinner', 'Containment Spinner'];

// Pace bowling plans
const PACE_LINE_LENGTH = ['Attacking Line', 'Wide Line', 'Short-Pitched', 'Yorker Execution'];
const PACE_VARIATION = ['Pace Variation Mix', 'Swing/Seam Focus', 'Bouncer Barrage', 'Consistent Accuracy'];

// Spin bowling plans
const SPIN_LINE_LENGTH = ['Flight & Loop', 'Flat & Fast', 'Wide of Off', 'Stumps Attack'];
const SPIN_VARIATION = ['Turn Candy Bag', 'Flight Variation', 'Pace Variation', 'Consistent Line'];

// Get playstyle rating from player
const getPlaystyleRating = (player, category, playstyle) => {
  if (!player || !playstyle) return null;
  return player.playstyleRatings?.[category]?.[playstyle] ?? null;
};

const TacticsPanel = ({ config, onUpdate, striker, bowler }) => {
  // Derive bowling type from bowler's actual type (not config toggle)
  const isPace = bowler?.bowlingType?.toLowerCase() !== 'spin';
  const lineLengthOptions = isPace ? PACE_LINE_LENGTH : SPIN_LINE_LENGTH;
  const variationOptions = isPace ? PACE_VARIATION : SPIN_VARIATION;
  const bowlingPlaystyleOptions = isPace ? PACE_PLAYSTYLES : SPIN_PLAYSTYLES;

  // Get effective playstyles and ratings
  const effectiveBatStyle = config.battingPlaystyle || striker?.primaryPlaystyle?.batting;
  const effectiveBatRating = config.battingPlaystyleRating ?? getPlaystyleRating(striker, 'batting', effectiveBatStyle);

  const effectiveBowlStyle = config.bowlingPlaystyle || bowler?.primaryPlaystyle?.bowling;
  const effectiveBowlRating = config.bowlingPlaystyleRating ?? getPlaystyleRating(bowler, 'bowling', effectiveBowlStyle);

  return (
    <div className="space-y-2">
      {/* Batting Tactics */}
      <div className="card p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Swords className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-semibold text-text-primary">Batting</span>
        </div>

        {/* Acceleration Tier */}
        <div className="mb-2">
          <div className="text-[10px] text-text-muted mb-1">Acceleration Tier</div>
          <div className="grid grid-cols-6 gap-0.5">
            {ACCELERATION_TIERS.map(tier => (
              <button
                key={tier.value}
                onClick={() => onUpdate({ accelerationTier: tier.value })}
                className={`px-1 py-1 text-[10px] rounded transition-colors ${
                  config.accelerationTier === tier.value
                    ? 'bg-cricket-accent text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        {/* Playstyle */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-muted">Playstyle</span>
            {effectiveBatStyle && (
              <span className="text-[10px] text-cricket-accent font-medium">
                Rating: {effectiveBatRating !== null ? effectiveBatRating : '-'}
              </span>
            )}
          </div>
          <select
            value={config.battingPlaystyle || ''}
            onChange={(e) => onUpdate({ battingPlaystyle: e.target.value || null, battingPlaystyleRating: null })}
            className="w-full px-1.5 py-1 bg-bg-tertiary border border-border-primary rounded text-xs text-text-primary"
          >
            <option value="">{striker?.primaryPlaystyle?.batting || 'Select player first'}</option>
            {BATTING_PLAYSTYLES.map(ps => (
              <option key={ps} value={ps}>{ps}</option>
            ))}
          </select>
        </div>

        {/* Playstyle Rating Override */}
        {config.battingPlaystyle && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted">Rating Override</span>
              <span className="text-[10px] text-text-primary">{config.battingPlaystyleRating ?? 'Default'}</span>
            </div>
            <input
              type="range"
              value={config.battingPlaystyleRating ?? 50}
              onChange={(e) => onUpdate({ battingPlaystyleRating: parseInt(e.target.value) })}
              min={0}
              max={100}
              className="w-full h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-cricket-accent"
            />
          </div>
        )}

        {/* Show player's top playstyles */}
        {striker && striker.playstyleRatings?.batting && (
          <div className="mt-2 pt-2 border-t border-border-primary">
            <div className="text-[10px] text-text-muted mb-1">Player Ratings:</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              {Object.entries(striker.playstyleRatings.batting)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4)
                .map(([style, rating]) => (
                  <div key={style} className="flex justify-between">
                    <span className="text-text-secondary truncate">{style.split(' - ').pop()}</span>
                    <span className={`font-medium ${rating >= 70 ? 'text-green-400' : rating >= 40 ? 'text-yellow-400' : 'text-text-muted'}`}>
                      {rating}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Bowling Tactics */}
      <div className="card p-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-semibold text-text-primary">Bowling</span>
          </div>
          {/* Bowling Type - Display only (derived from bowler) */}
          {bowler && (
            <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${
              isPace ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
            }`}>
              {bowler.bowlingType?.toUpperCase() || 'PACE'} | {bowler.bowlingStyleAbbrev || '-'}
            </span>
          )}
        </div>

        {/* Line-Length & Variation */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <div>
            <div className="text-[10px] text-text-muted mb-0.5">Line-Length</div>
            <select
              value={config.lineLength}
              onChange={(e) => onUpdate({ lineLength: e.target.value })}
              className="w-full px-1 py-1 bg-bg-tertiary border border-border-primary rounded text-[10px] text-text-primary"
            >
              {lineLengthOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[10px] text-text-muted mb-0.5">Variation</div>
            <select
              value={config.variation}
              onChange={(e) => onUpdate({ variation: e.target.value })}
              className="w-full px-1 py-1 bg-bg-tertiary border border-border-primary rounded text-[10px] text-text-primary"
            >
              {variationOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Playstyle */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-muted">Playstyle</span>
            {effectiveBowlStyle && (
              <span className="text-[10px] text-cricket-accent font-medium">
                Rating: {effectiveBowlRating !== null ? effectiveBowlRating : '-'}
              </span>
            )}
          </div>
          <select
            value={config.bowlingPlaystyle || ''}
            onChange={(e) => onUpdate({ bowlingPlaystyle: e.target.value || null, bowlingPlaystyleRating: null })}
            className="w-full px-1.5 py-1 bg-bg-tertiary border border-border-primary rounded text-xs text-text-primary"
          >
            <option value="">{bowler?.primaryPlaystyle?.bowling || 'Select bowler first'}</option>
            {bowlingPlaystyleOptions.map(ps => (
              <option key={ps} value={ps}>{ps}</option>
            ))}
          </select>
        </div>

        {/* Playstyle Rating Override */}
        {config.bowlingPlaystyle && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted">Rating Override</span>
              <span className="text-[10px] text-text-primary">{config.bowlingPlaystyleRating ?? 'Default'}</span>
            </div>
            <input
              type="range"
              value={config.bowlingPlaystyleRating ?? 50}
              onChange={(e) => onUpdate({ bowlingPlaystyleRating: parseInt(e.target.value) })}
              min={0}
              max={100}
              className="w-full h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-cricket-accent"
            />
          </div>
        )}

        {/* Show bowler's playstyle ratings */}
        {bowler && bowler.playstyleRatings?.bowling && (
          <div className="mt-2 pt-2 border-t border-border-primary">
            <div className="text-[10px] text-text-muted mb-1">Player Ratings:</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              {Object.entries(bowler.playstyleRatings.bowling)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4)
                .map(([style, rating]) => (
                  <div key={style} className="flex justify-between">
                    <span className="text-text-secondary truncate">{style.split(' ')[0]}</span>
                    <span className={`font-medium ${rating >= 70 ? 'text-green-400' : rating >= 40 ? 'text-yellow-400' : 'text-text-muted'}`}>
                      {rating}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Fielding */}
      <div className="card p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-text-primary">Fielding</span>
        </div>
        <FieldTemplateSelector
          selectedTemplate={config.fieldTemplate}
          onSelectTemplate={(v) => onUpdate({ fieldTemplate: v })}
          phase={config.phase}
          compact={true}
        />
      </div>
    </div>
  );
};

export default TacticsPanel;
