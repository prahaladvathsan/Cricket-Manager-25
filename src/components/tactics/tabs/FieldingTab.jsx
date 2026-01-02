/**
 * @file FieldingTab.jsx
 * @description Fielding setup tab with template selection, visual editor, and T20 rules validation
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import FieldTemplateSelector from './FieldTemplateSelector';
import FieldVisualEditor from './FieldVisualEditor';
import HelpIcon from '../../shared/HelpIcon';
import { validateFieldingSetup, getViolationMessages } from '../../../core/match-engine/validation/FieldingRulesValidator';
import { getFormationWithPositions } from '../../../utils/fieldingFormationResolver.js';

const FieldingTab = ({ teamId, onPlayerClick }) => {
  const { updateFieldingSetup } = useTeamStore();

  const [phase, setPhase] = useState('powerplay'); // 'powerplay' or 'postPowerplay'
  const [validationResult, setValidationResult] = useState(null);
  const [validationExpanded, setValidationExpanded] = useState(false);

  // Subscribe to team tactics changes to ensure UI updates reactively
  const teamTactics = useTeamStore((state) => state.teamTactics[teamId]);

  // Get current field setup for selected phase
  const currentSetup = phase === 'powerplay'
    ? teamTactics?.fielding?.powerplay
    : teamTactics?.fielding?.postPowerplay;

  const currentTemplateId = currentSetup?.template || 'attacking_powerplay_press';
  const currentTemplate = getFormationWithPositions(currentTemplateId);

  // Initialize default fielding setup if not exists
  useEffect(() => {
    if (teamId && teamTactics && !teamTactics.fielding) {
      const powerplayFormation = getFormationWithPositions('attacking_powerplay_press');
      const deathFormation = getFormationWithPositions('defensive_ring_fence');

      updateFieldingSetup(teamId, {
        powerplay: {
          template: 'attacking_powerplay_press',
          positions: powerplayFormation?.positions || []
        },
        postPowerplay: {
          template: 'defensive_ring_fence',
          positions: deathFormation?.positions || []
        }
      });
    }
  }, [teamId, teamTactics, updateFieldingSetup]);

  // Get positions (use customized positions if available, otherwise template positions)
  const currentPositions = currentSetup?.positions || currentTemplate?.positions || [];

  // Validate current setup
  useEffect(() => {
    if (currentPositions.length > 0) {
      const over = phase === 'powerplay' ? 1 : 10;
      const result = validateFieldingSetup(currentPositions, over);
      setValidationResult(result);
    }
  }, [currentPositions, phase]);

  const handleTemplateSelect = (templateId) => {
    const template = getFormationWithPositions(templateId);
    if (!template) return;

    const newSetup = {
      ...teamTactics?.fielding,
      [phase]: {
        template: templateId,
        positions: template.positions,
        playerAssignments: {} // Reset player assignments when changing template
      }
    };

    updateFieldingSetup(teamId, newSetup);
  };

  const handleUpdateSetup = (updatedSetup) => {
    const newSetup = {
      ...teamTactics?.fielding,
      [phase]: updatedSetup
    };

    updateFieldingSetup(teamId, newSetup);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="card p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">Fielding Setup</h3>
          <HelpIcon width="w-4" height="h-4" tooltipClassName="min-w-[350px]" align="left">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-text-primary mb-2">Fielding Phases</h4>
                <p className="mb-2">T20 fielding restrictions:</p>
                <div className="grid grid-cols-2 gap-4 text-xs bg-bg-tertiary p-2 rounded">
                  <div>
                    <span className="font-semibold text-cricket-accent block mb-0.5">Powerplay (1-6)</span>
                    <span className="text-text-secondary">Max 2 fielders outside circle</span>
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary block mb-0.5">Post-Powerplay (7-20)</span>
                    <span className="text-text-secondary">Max 5 fielders outside circle</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-text-primary mb-2">Validation</h4>
                <p className="mb-1 text-xs text-text-secondary">The validator checks for:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-text-secondary">
                  <li>Fielders outside 30-yard circle</li>
                  <li>Max 5 fielders on leg side (at all times)</li>
                  <li>Max 2 fielders behind square leg (at all times)</li>
                </ul>
              </div>
            </div>
          </HelpIcon>
        </div>
      </div>

      {/* Slim Phase Toggle Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setPhase('powerplay')}
          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${phase === 'powerplay'
            ? 'bg-cricket-primary text-white'
            : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
        >
          Powerplay (1-6) • Max 2 outside
        </button>
        <button
          onClick={() => setPhase('postPowerplay')}
          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${phase === 'postPowerplay'
            ? 'bg-cricket-primary text-white'
            : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
        >
          Post-Powerplay (7-20) • Max 5 outside
        </button>
      </div>

      {/* Single-line Validation Status (expandable) */}
      {validationResult && (
        <div
          className={`px-3 py-1.5 rounded cursor-pointer transition-colors ${validationResult.isValid
            ? 'bg-green-500/10 hover:bg-green-500/15'
            : 'bg-yellow-500/10 hover:bg-yellow-500/15'
            }`}
          onClick={() => setValidationExpanded(!validationExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
              )}
              <span className={`text-xs font-medium ${validationResult.isValid ? 'text-green-400' : 'text-yellow-400'
                }`}>
                {validationResult.isValid ? 'Valid Setup' : 'Issues Found'}
              </span>
              <span className="text-xs text-text-secondary">
                Outside: {validationResult.summary.fieldersOutsideCircle}/{validationResult.summary.maxOutsideCircle} •
                Leg: {validationResult.summary.fieldersLegSide}/{validationResult.summary.maxLegSide} •
                Behind sq: {validationResult.summary.fieldersBehindSquareLeg}/{validationResult.summary.maxBehindSquareLeg}
              </span>
            </div>
            {validationExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
            )}
          </div>

          {/* Expanded details */}
          {validationExpanded && (
            <div className="mt-2 pt-2 border-t border-border-primary text-xs text-text-secondary">
              {validationResult.violations.length > 0 ? (
                <div className="space-y-0.5">
                  {getViolationMessages(validationResult.violations).map((msg, idx) => (
                    <div key={idx}>• {msg}</div>
                  ))}
                </div>
              ) : (
                <p>Formation complies with T20 fielding regulations for {phase === 'powerplay' ? 'powerplay' : 'post-powerplay'} overs.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Visual Field Editor */}
      {currentPositions.length > 0 && (
        <div className="fielding-visual-editor">
          <FieldVisualEditor
            positions={currentPositions}
            validationResult={validationResult}
            phase={phase}
            currentSetup={currentSetup}
            onUpdateSetup={handleUpdateSetup}
          />
        </div>
      )}

      {/* Template Selector */}
      <div className="fielding-template-selector">
        <FieldTemplateSelector
          selectedTemplate={currentTemplateId}
          onSelectTemplate={handleTemplateSelect}
          phase={phase}
        />
      </div>
    </div>
  );
};

export default FieldingTab;
