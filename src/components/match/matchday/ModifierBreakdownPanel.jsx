/**
 * @file ModifierBreakdownPanel.jsx
 * @description Split-screen modifier breakdown panel - striker left, bowler right
 * @module components/match/matchday/ModifierBreakdownPanel
 */

import React from 'react';
import { Pin, X } from 'lucide-react';
import PlaystyleBadge from '../../shared/PlaystyleBadge';
import tacticsConfig from '../../../data/config/tactics-config.json';
import bowlingPlansConfig from '../../../data/config/bowling-plans-config.json';

/**
 * ModifierBreakdownPanel - Split-screen layout with independent headers
 * @param {Object} props
 * @param {Object} props.strikerBreakdown - Striker's modifier breakdown
 * @param {Object} props.bowlerBreakdown - Bowler's modifier breakdown
 * @param {string} props.strikerName - Striker's name
 * @param {string} props.bowlerName - Bowler's name
 * @param {Object} props.striker - Full striker player object
 * @param {Object} props.bowler - Full bowler player object
 * @param {string} props.strikerTier - Current acceleration tier
 * @param {Object} props.bowlerPlans - Current bowling plans {lineLength, variation}
 * @param {boolean} props.isPinned - Whether panel is pinned open
 * @param {Function} props.onPin - Callback when pin button clicked
 * @param {Function} props.onClose - Callback when close button clicked
 * @param {boolean} props.swapSides - Whether to swap striker/bowler sides (true when right team is batting)
 * @returns {JSX.Element}
 */
export default function ModifierBreakdownPanel({
  strikerBreakdown,
  bowlerBreakdown,
  strikerName,
  bowlerName,
  striker,
  bowler,
  strikerTier,
  bowlerPlans,
  isPinned,
  onPin,
  onClose,
  swapSides = false
}) {
  /**
   * Get active playstyle and rating for a player
   * Mirrors AttributeModifierSystem's playstyle resolution logic
   */
  const getPrimaryPlaystyle = (player, type = 'batting') => {
    // Check selectedPlaystyle first (set by tactics overrides), then fall back to primaryPlaystyle
    // This matches exactly what AttributeModifierSystem.applyBattingModifiers/applyBowlingModifiers does
    const playstyleName = player?.selectedPlaystyle?.[type]
                       || player?.primaryPlaystyle?.[type]
                       || null;

    if (!playstyleName) return { name: 'None', rating: 0 };

    const rating = player.playstyleRatings?.[type]?.[playstyleName] || 0;

    return { name: playstyleName, rating };
  };

  /**
   * Format probabilities as colored string
   */
  const formatProbabilities = (probs) => {
    const def = Math.round(probs.defensive * 100);
    const neu = Math.round(probs.neutral * 100);
    const att = Math.round(probs.attacking * 100);

    return { def, neu, att };
  };

  /**
   * Get bowling plan details from config
   */
  const getBowlingPlanDetails = (planName, planType, bowlerType) => {
    const configSection = bowlerType === 'pace' ? bowlingPlansConfig.paceBowling : bowlingPlansConfig.spinBowling;
    const planGroup = planType === 'lineLength' ? 'lineLengthPlans' : 'variationPlans';
    const plan = configSection[planGroup][planName];

    if (!plan) return { bonuses: {}, penalties: {}, tendencies: { attacking: 33, neutral: 34, defensive: 33 } };

    // Calculate percentage tendencies from scores
    const total = plan.tendencyScores.attacking + plan.tendencyScores.neutral + plan.tendencyScores.defensive;
    const tendencies = {
      attacking: Math.round((plan.tendencyScores.attacking / total) * 100),
      neutral: Math.round((plan.tendencyScores.neutral / total) * 100),
      defensive: Math.round((plan.tendencyScores.defensive / total) * 100)
    };

    return {
      bonuses: plan.attributeModifiers?.bonuses || {},
      penalties: plan.attributeModifiers?.penalties || {},
      tendencies
    };
  };

  /**
   * Render tactical section for striker in 3-column format
   */
  const renderStrikerTactical = () => {
    const tier = tacticsConfig.accelerationTiers[strikerTier || 'Rotate'];
    if (!tier) return null;

    const probs = formatProbabilities(tier.mentalityProbabilities);
    const bonuses = tier.attributeModifiers?.bonuses || {};
    const penalties = tier.attributeModifiers?.penalties || {};

    const allModifiers = [
      ...Object.entries(bonuses).map(([attr, value]) => ({ attr, value: `+${value}` })),
      ...Object.entries(penalties).map(([attr, value]) => ({ attr, value: `${value}` }))
    ];

    if (allModifiers.length === 0) return null;

    return (
      <div className="border-b border-gray-700 pb-2 mb-2">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold text-gray-300 uppercase">Tactical</h4>
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-red-400 font-semibold">{probs.att}</span>
            <span className="text-gray-500">|</span>
            <span className="text-yellow-400 font-semibold">{probs.neu}</span>
            <span className="text-gray-500">|</span>
            <span className="text-blue-400 font-semibold">{probs.def}</span>
          </div>
        </div>
        <div className="space-y-0 text-xs">
          {allModifiers.map((mod, idx) => (
            <div key={idx} className="grid grid-cols-[180px,1fr,auto] gap-2 items-start">
              {/* Tier name on first row only */}
              <div>
                {idx === 0 && (
                  <span className="text-gray-400 font-medium">{strikerTier}</span>
                )}
              </div>
              {/* Attribute name */}
              <span className="text-gray-500">{mod.attr}</span>
              {/* Value */}
              <span
                className={`font-mono font-semibold text-right ${
                  mod.value.startsWith('+') ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {mod.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render tactical section for bowler in 3-column format
   */
  const renderBowlerTactical = () => {
    if (!bowlerPlans || !bowler) return null;

    const bowlerType = bowler.bowlingType || 'pace';
    const linePlan = getBowlingPlanDetails(bowlerPlans.lineLength, 'lineLength', bowlerType);
    const varPlan = getBowlingPlanDetails(bowlerPlans.variation, 'variation', bowlerType);

    // Build grouped modifiers by plan
    const planGroups = [];

    // Line-length plan group
    const lineModifiers = [
      ...Object.entries(linePlan.bonuses).map(([attr, value]) => ({
        attr,
        value: `+${value}`
      })),
      ...Object.entries(linePlan.penalties).map(([attr, value]) => ({
        attr,
        value: `${value}`
      }))
    ];
    if (lineModifiers.length > 0) {
      planGroups.push({ name: bowlerPlans.lineLength, modifiers: lineModifiers });
    }

    // Variation plan group
    const varModifiers = [
      ...Object.entries(varPlan.bonuses).map(([attr, value]) => ({
        attr,
        value: `+${value}`
      })),
      ...Object.entries(varPlan.penalties).map(([attr, value]) => ({
        attr,
        value: `${value}`
      }))
    ];
    if (varModifiers.length > 0) {
      planGroups.push({ name: bowlerPlans.variation, modifiers: varModifiers });
    }

    if (planGroups.length === 0) return null;

    // Calculate combined probabilities (average of both plans)
    const combinedProbs = {
      att: Math.round((linePlan.tendencies.attacking + varPlan.tendencies.attacking) / 2),
      neu: Math.round((linePlan.tendencies.neutral + varPlan.tendencies.neutral) / 2),
      def: Math.round((linePlan.tendencies.defensive + varPlan.tendencies.defensive) / 2)
    };

    return (
      <div className="border-b border-gray-700 pb-2 mb-2">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold text-gray-300 uppercase">Tactical</h4>
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-red-400 font-semibold">{combinedProbs.att}</span>
            <span className="text-gray-500">|</span>
            <span className="text-yellow-400 font-semibold">{combinedProbs.neu}</span>
            <span className="text-gray-500">|</span>
            <span className="text-blue-400 font-semibold">{combinedProbs.def}</span>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          {planGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.modifiers.map((mod, modIdx) => (
                <div key={modIdx} className="grid grid-cols-[180px,1fr,auto] gap-2 items-start">
                  {/* Plan name on first row only */}
                  <div>
                    {modIdx === 0 && (
                      <span className="text-gray-400 font-medium">{group.name}</span>
                    )}
                  </div>
                  {/* Attribute name */}
                  <span className="text-gray-500">{mod.attr}</span>
                  {/* Value */}
                  <span
                    className={`font-mono font-semibold text-right ${
                      mod.value.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {mod.value}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render a modifier section in 3-column table format
   * Columns: Modifier Name | Attribute | Value
   * Condition is shown below the modifier name
   */
  const renderModifierSection = (title, modifiers) => {
    if (!modifiers || modifiers.length === 0) return null;

    return (
      <div className="border-b border-gray-700 pb-2 mb-2">
        <h4 className="text-xs font-semibold text-gray-300 uppercase mb-1">{title}</h4>
        <div className="space-y-1">
          {modifiers.map((mod, idx) => {
            // Parse attribute-value pairs from description
            const effects = mod.description.split(', ').map(effect => {
              const match = effect.match(/([+-]?\d+\.?\d*)\s+(.+)/);
              if (match) {
                return { value: match[1], attribute: match[2] };
              }
              // Fallback for non-standard formats
              return { value: '', attribute: effect };
            });

            return (
              <div key={idx} className="text-xs">
                {effects.map((effect, effectIdx) => (
                  <div key={effectIdx} className="grid grid-cols-[180px,1fr,auto] gap-2 items-start">
                    {/* Modifier name on first row, condition on second row if multiple effects */}
                    <div>
                      {effectIdx === 0 && (
                        <span className="text-gray-400 font-medium">{mod.name}</span>
                      )}
                      {effectIdx === 1 && effects.length > 1 && (
                        <span className="text-[10px] text-gray-500 italic">
                          {mod.condition || 'Always active'}
                        </span>
                      )}
                    </div>
                    {/* Attribute name */}
                    <span className="text-gray-500">{effect.attribute}</span>
                    {/* Value */}
                    <span
                      className={`font-mono font-semibold text-right ${
                        effect.value.startsWith('+') ? 'text-green-400' :
                        effect.value.startsWith('-') ? 'text-red-400' :
                        'text-gray-400'
                      }`}
                    >
                      {effect.value}
                    </span>
                  </div>
                ))}
                {/* If only 1 effect, show condition on its own row */}
                {effects.length === 1 && (
                  <div className="grid grid-cols-[180px,1fr,auto] gap-2 items-start">
                    <span className="text-[10px] text-gray-500 italic">
                      {mod.condition || 'Always active'}
                    </span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Get primary playstyles
  const strikerPlaystyle = getPrimaryPlaystyle(striker, 'batting');
  const bowlerPlaystyle = getPrimaryPlaystyle(bowler, 'bowling');

  // Striker column component
  const StrikerColumn = ({ showBorder = true }) => (
    <div className={showBorder ? 'border-r border-gray-700' : ''}>
      {/* Striker Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="text-sm font-bold text-green-400">{strikerName}</div>
        <div className="text-xs text-gray-400">
          {strikerPlaystyle.name !== 'None' ? (
            <PlaystyleBadge
              playstyle={strikerPlaystyle.name}
              rating={strikerPlaystyle.rating}
              variant="inline"
            />
          ) : 'None'}
        </div>
      </div>

      {/* Striker Content - Scrollable */}
      <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
        {/* Tactical modifiers */}
        {renderStrikerTactical()}

        {/* Playstyle modifiers */}
        {renderModifierSection('Playstyle', strikerBreakdown?.playstyleModifiers)}

        {/* Matchup modifiers */}
        {renderModifierSection('Matchup', strikerBreakdown?.matchupModifiers)}

        {/* Confidence modifiers */}
        {renderModifierSection('Confidence', strikerBreakdown?.confidenceModifiers)}

        {/* Energy modifiers */}
        {renderModifierSection('Energy', strikerBreakdown?.energyModifiers)}

        {/* Pressure modifiers */}
        {renderModifierSection('Pressure', strikerBreakdown?.pressureModifiers)}

        {/* Context modifiers */}
        {renderModifierSection('Context', strikerBreakdown?.contextModifiers)}
      </div>
    </div>
  );

  // Bowler column component
  const BowlerColumn = ({ showBorder = false, showControls = true }) => (
    <div className={showBorder ? 'border-r border-gray-700' : ''}>
      {/* Bowler Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex justify-between items-center">
        <div>
          <div className="text-sm font-bold text-blue-400">{bowlerName}</div>
          <div className="text-xs text-gray-400">
            {bowlerPlaystyle.name !== 'None' ? (
              <PlaystyleBadge
                playstyle={bowlerPlaystyle.name}
                rating={bowlerPlaystyle.rating}
                variant="inline"
              />
            ) : 'None'}
          </div>
        </div>
        {showControls && (
          <div className="flex gap-2">
            {/* Pin button */}
            <button
              onClick={onPin}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                isPinned
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={isPinned ? 'Unpin panel' : 'Pin panel open'}
            >
              <Pin size={12} />
            </button>

            {/* Close button (only when pinned) */}
            {isPinned && (
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                title="Close panel"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bowler Content - Scrollable */}
      <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
        {/* Tactical modifiers */}
        {renderBowlerTactical()}

        {/* Playstyle modifiers */}
        {renderModifierSection('Playstyle', bowlerBreakdown?.playstyleModifiers)}

        {/* Matchup modifiers */}
        {renderModifierSection('Matchup', bowlerBreakdown?.matchupModifiers)}

        {/* Confidence modifiers */}
        {renderModifierSection('Confidence', bowlerBreakdown?.confidenceModifiers)}

        {/* Energy modifiers */}
        {renderModifierSection('Energy', bowlerBreakdown?.energyModifiers)}

        {/* Pressure modifiers */}
        {renderModifierSection('Pressure', bowlerBreakdown?.pressureModifiers)}

        {/* Context modifiers */}
        {renderModifierSection('Context', bowlerBreakdown?.contextModifiers)}
      </div>
    </div>
  );

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden">
      {/* Two-column split layout with independent headers */}
      {/* Swap sides based on which team is batting - striker should be on batting team's side */}
      <div className="grid grid-cols-2">
        {swapSides ? (
          <>
            {/* Bowler on left when right team is batting */}
            <BowlerColumn showBorder showControls={false} />
            {/* Striker on right when right team is batting (with controls) */}
            <div>
              {/* Striker Header with controls */}
              <div className="bg-gray-800 border-b border-gray-700 p-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-green-400">{strikerName}</div>
                  <div className="text-xs text-gray-400">{strikerPlaystyle.name} ({strikerPlaystyle.rating})</div>
                </div>
                <div className="flex gap-2">
                  {/* Pin button */}
                  <button
                    onClick={onPin}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      isPinned
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    title={isPinned ? 'Unpin panel' : 'Pin panel open'}
                  >
                    <Pin size={12} />
                  </button>

                  {/* Close button (only when pinned) */}
                  {isPinned && (
                    <button
                      onClick={onClose}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                      title="Close panel"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Striker Content - Scrollable */}
              <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
                {/* Tactical modifiers */}
                {renderStrikerTactical()}

                {/* Playstyle modifiers */}
                {renderModifierSection('Playstyle', strikerBreakdown?.playstyleModifiers)}

                {/* Matchup modifiers */}
                {renderModifierSection('Matchup', strikerBreakdown?.matchupModifiers)}

                {/* Confidence modifiers */}
                {renderModifierSection('Confidence', strikerBreakdown?.confidenceModifiers)}

                {/* Energy modifiers */}
                {renderModifierSection('Energy', strikerBreakdown?.energyModifiers)}

                {/* Pressure modifiers */}
                {renderModifierSection('Pressure', strikerBreakdown?.pressureModifiers)}

                {/* Context modifiers */}
                {renderModifierSection('Context', strikerBreakdown?.contextModifiers)}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Default: Striker on left, Bowler on right */}
            <StrikerColumn />
            <BowlerColumn showControls />
          </>
        )}
      </div>

      {/* Footer note */}
      <div className="border-t border-gray-700 p-2 text-center">
        <p className="text-xs text-gray-500">
          Probabilities: <span className="text-red-400">Attack</span> | <span className="text-yellow-400">Neutral</span> | <span className="text-blue-400">Defend</span>
        </p>
      </div>
    </div>
  );
}
