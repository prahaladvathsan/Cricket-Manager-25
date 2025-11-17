/**
 * @file FieldingTab.jsx
 * @description Comprehensive fielding setup tab with template selection, visual editor, and T20 rules validation
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import FieldTemplateSelector from './FieldTemplateSelector';
import FieldVisualEditor from './FieldVisualEditor';
import { validateFieldingSetup, getViolationMessages } from '../../../core/match-engine/validation/FieldingRulesValidator';
import fieldConfig from '../../../data/config/field-positioning-config.json';

const FieldingTab = ({ teamId, onPlayerClick }) => {
  const { getTeamTactics, updateFieldingSetup } = useTeamStore();

  const [phase, setPhase] = useState('powerplay'); // 'powerplay' or 'postPowerplay'
  const [showVisualEditor, setShowVisualEditor] = useState(true);
  const [validationResult, setValidationResult] = useState(null);

  const teamTactics = getTeamTactics(teamId);

  // Get current field setup for selected phase
  const currentSetup = phase === 'powerplay'
    ? teamTactics?.fielding?.powerplay
    : teamTactics?.fielding?.postPowerplay;

  const currentTemplateId = currentSetup?.template || 'standard_powerplay';
  const currentTemplate = fieldConfig.formations[currentTemplateId];

  // Initialize default fielding setup if not exists
  useEffect(() => {
    if (teamId && teamTactics && !teamTactics.fielding) {
      updateFieldingSetup(teamId, {
        powerplay: {
          template: 'standard_powerplay',
          positions: fieldConfig.formations.standard_powerplay.positions
        },
        postPowerplay: {
          template: 'death_standard',
          positions: fieldConfig.formations.death_standard.positions
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
    const template = fieldConfig.formations[templateId];
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

  const handleResetToDefaults = () => {
    if (window.confirm('Reset fielding setups to defaults? This cannot be undone.')) {
      updateFieldingSetup(teamId, {
        powerplay: {
          template: 'standard_powerplay',
          positions: fieldConfig.formations.standard_powerplay.positions,
          playerAssignments: {}
        },
        postPowerplay: {
          template: 'death_standard',
          positions: fieldConfig.formations.death_standard.positions,
          playerAssignments: {}
        }
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cricket-accent" />
            <h3 className="text-lg font-semibold text-text-primary">
              Fielding Setup
            </h3>
          </div>
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary border border-border-primary rounded hover:bg-bg-tertiary transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reset to Defaults
          </button>
        </div>
        <p className="text-sm text-text-secondary mb-3">
          Configure your fielding formations for different match phases. Each phase follows official T20 fielding restrictions.
        </p>

        {/* Phase Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setPhase('powerplay')}
            className={`flex-1 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
              phase === 'powerplay'
                ? 'bg-cricket-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">Powerplay Setup</div>
              <div className="text-xs opacity-80 mt-0.5">Overs 1-6 • Max 2 outside circle</div>
            </div>
          </button>
          <button
            onClick={() => setPhase('postPowerplay')}
            className={`flex-1 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
              phase === 'postPowerplay'
                ? 'bg-cricket-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">Post-Powerplay Setup</div>
              <div className="text-xs opacity-80 mt-0.5">Overs 7-20 • Max 5 outside circle</div>
            </div>
          </button>
        </div>
      </div>

      {/* Validation Status */}
      {validationResult && (
        <div className={`card p-3 ${
          validationResult.isValid
            ? 'border-l-4 border-green-500 bg-green-500/10'
            : 'border-l-4 border-yellow-500 bg-yellow-500/10'
        }`}>
          <div className="flex items-start gap-2">
            {validationResult.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm font-semibold ${
                  validationResult.isValid ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {validationResult.isValid ? 'Valid T20 Field Setup' : 'Field Setup Notes'}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text-secondary">
                    Outside circle: <span className="font-mono text-text-primary">
                      {validationResult.summary.fieldersOutsideCircle}/{validationResult.summary.maxOutsideCircle}
                    </span>
                  </span>
                  <span className="text-text-secondary">
                    Leg side: <span className="font-mono text-text-primary">
                      {validationResult.summary.fieldersLegSide}/{validationResult.summary.maxLegSide}
                    </span>
                  </span>
                  <span className="text-text-secondary">
                    Behind square: <span className="font-mono text-text-primary">
                      {validationResult.summary.fieldersBehindSquareLeg}/{validationResult.summary.maxBehindSquareLeg}
                    </span>
                  </span>
                </div>
              </div>
              {validationResult.violations.length > 0 && (
                <div className="text-xs text-text-secondary space-y-0.5 mt-2">
                  {getViolationMessages(validationResult.violations).map((msg, idx) => (
                    <div key={idx}>{msg}</div>
                  ))}
                </div>
              )}
              {validationResult.isValid && (
                <p className="text-xs text-text-secondary">
                  This formation complies with all T20 fielding regulations for {phase === 'powerplay' ? 'powerplay overs' : 'post-powerplay overs'}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Template Info */}
      {currentTemplate && (
        <div className="card p-4 bg-bg-tertiary/50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">
                {currentTemplate.name}
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {currentTemplate.description}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              {currentTemplate.isAttacking && (
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 font-medium">
                  Attacking
                </span>
              )}
              <span className="px-2 py-1 rounded bg-cricket-primary/20 text-cricket-accent font-medium">
                {currentTemplate.bowlingType || 'Any'}
              </span>
              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-medium">
                {currentTemplate.phase || 'Any'} Phase
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Editor Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowVisualEditor(!showVisualEditor)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary border border-border-primary rounded hover:bg-bg-tertiary transition-colors"
        >
          {showVisualEditor ? (
            <>
              <EyeOff className="w-3 h-3" />
              Hide Field View
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              Show Field View
            </>
          )}
        </button>
      </div>

      {/* Visual Field Editor */}
      {showVisualEditor && currentPositions.length > 0 && (
        <FieldVisualEditor
          positions={currentPositions}
          validationResult={validationResult}
          phase={phase}
          currentSetup={currentSetup}
          onUpdateSetup={handleUpdateSetup}
        />
      )}

      {/* Template Selector */}
      <FieldTemplateSelector
        selectedTemplate={currentTemplateId}
        onSelectTemplate={handleTemplateSelect}
        phase={phase}
      />

      {/* T20 Rules Reference */}
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-text-primary mb-3">
          T20 Fielding Rules Reference
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h5 className="font-semibold text-text-primary mb-2">Powerplay (Overs 1-6)</h5>
            <ul className="space-y-1 text-text-secondary">
              <li>• Maximum 2 fielders outside 30-yard circle</li>
              <li>• Minimum 2 fielders in close catching positions</li>
              <li>• Maximum 5 fielders on leg side</li>
              <li>• Maximum 2 fielders behind square leg</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-text-primary mb-2">Post-Powerplay (Overs 7-20)</h5>
            <ul className="space-y-1 text-text-secondary">
              <li>• Maximum 5 fielders outside 30-yard circle</li>
              <li>• No restriction on close catchers</li>
              <li>• Maximum 5 fielders on leg side</li>
              <li>• Maximum 2 fielders behind square leg</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldingTab;
