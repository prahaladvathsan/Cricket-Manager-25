/**
 * FieldFormationPanel - Field formation selector
 *
 * Features:
 * - 3 formations (Attacking, Neutral, Defensive)
 * - Visual mini-map preview of fielder positions
 * - Current formation highlighted
 */

import React from 'react';
import useMatchStore from '../../../../stores/matchStore';
import useTeamStore from '../../../../stores/teamStore';
import { Target, Shield, Minus } from 'lucide-react';
import fieldPositioningConfig from '../../../../data/config/field-positioning-config.json';

const FORMATIONS = [
  {
    id: 'attacking',
    label: 'Attacking',
    description: 'Close-in catchers, emphasis on slips',
    icon: Target,
    color: 'bg-red-500',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'Balanced ring with boundary sweepers',
    icon: Minus,
    color: 'bg-yellow-500',
  },
  {
    id: 'defensive',
    label: 'Defensive',
    description: 'Boundary riders in key zones',
    icon: Shield,
    color: 'bg-blue-500',
  },
];

/**
 * Mini-map preview of field positions
 */
const FieldMiniMap = ({ formation }) => {
  const formationData = fieldPositioningConfig.formations[formation];
  if (!formationData) return null;

  const positions = formationData.positions;
  const boundaryRadius = fieldPositioningConfig.fieldDimensions.boundaryRadius;

  // SVG viewBox scaled to show full field
  const viewBoxSize = boundaryRadius * 2 + 20;
  const center = viewBoxSize / 2;

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className="w-full h-full"
      style={{ maxWidth: '200px', maxHeight: '200px' }}
    >
      {/* Boundary circle */}
      <circle
        cx={center}
        cy={center}
        r={boundaryRadius}
        fill="#2D5F3F"
        fillOpacity="0.3"
        stroke="#fff"
        strokeWidth="1"
      />

      {/* Inner circle (30m) */}
      <circle
        cx={center}
        cy={center}
        r={30}
        fill="none"
        stroke="#fff"
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />

      {/* Pitch (simplified) */}
      <rect
        x={center - 1.5}
        y={center - 10}
        width={3}
        height={20}
        fill="#fff"
        fillOpacity="0.5"
      />

      {/* Fielders */}
      {positions.map((pos, idx) => {
        // Transform coordinates: origin at center, y-axis points down
        const svgX = center + pos.x;
        const svgY = center - pos.y; // Flip y-axis

        const isSpecial = pos.name === 'bowler' || pos.name === 'keeper';

        return (
          <g key={idx}>
            <circle
              cx={svgX}
              cy={svgY}
              r={isSpecial ? 2 : 1.5}
              fill={isSpecial ? '#D4AF37' : '#fff'}
              stroke={isSpecial ? '#fff' : 'none'}
              strokeWidth="0.3"
            />
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Formation button component
 */
const FormationButton = ({ formation, isActive, onClick }) => {
  const Icon = formation.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full p-2 rounded border-2 transition-all ${
        isActive
          ? 'border-cricket-accent bg-cricket-primary bg-opacity-20'
          : 'border-border-primary bg-bg-tertiary hover:border-cricket-primary hover:bg-bg-tertiary'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${formation.color}`} />
          <span className="font-semibold text-text-primary">{formation.label}</span>
        </div>
        <Icon className={`w-5 h-5 ${isActive ? 'text-cricket-accent' : 'text-text-secondary'}`} />
      </div>
      <p className="text-xs text-text-secondary text-left">{formation.description}</p>
    </button>
  );
};

/**
 * Main FieldFormationPanel component
 */
export default function FieldFormationPanel() {
  const innings = useMatchStore(state => state.innings);
  const teams = useMatchStore(state => state.teams);
  const teamStore = useTeamStore();

  const bowlingTeam = teams.bowling;
  const bowlingTeamId = bowlingTeam.id;

  // Get current formation from team store
  const currentFormation = useTeamStore(state => state.teams[bowlingTeamId]?.fieldFormation) || 'neutral';

  // Update formation
  const handleFormationChange = (newFormation) => {
    teamStore.updateFieldFormation(bowlingTeamId, newFormation);
  };

  return (
    <div className="space-y-2">
      {/* Formation Buttons */}
      <div className="space-y-1.5">
        {FORMATIONS.map(formation => (
          <FormationButton
            key={formation.id}
            formation={formation}
            isActive={currentFormation === formation.id}
            onClick={() => handleFormationChange(formation.id)}
          />
        ))}
      </div>

      {/* Mini-map Preview */}
      <div className="p-2 bg-bg-tertiary rounded border border-border-primary">
        <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
          Field Preview - {FORMATIONS.find(f => f.id === currentFormation)?.label}
        </h4>
        <div className="flex justify-center">
          <FieldMiniMap formation={currentFormation} />
        </div>
        <p className="text-xs text-text-secondary text-center mt-1">
          {fieldPositioningConfig.formations[currentFormation]?.description}
        </p>
      </div>

      {/* Formation Details */}
      <div className="p-2 bg-bg-tertiary rounded border border-border-primary">
        <p className="text-xs font-semibold text-text-primary mb-2">Formation Details</p>
        <div className="space-y-1 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span><strong>Attacking:</strong> 6 close-in, 3 inner ring, 2 boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span><strong>Neutral:</strong> 1 close-in, 7 inner ring, 3 boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span><strong>Defensive:</strong> 1 close-in, 2 inner ring, 8 boundary</span>
          </div>
        </div>
      </div>
    </div>
  );
}
