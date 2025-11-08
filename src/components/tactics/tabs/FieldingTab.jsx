/**
 * @file FieldingTab.jsx
 * @description Tab for setting field formation
 */

import React from 'react';
import { Shield, Users, Target, TrendingUp } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';

const FieldingTab = ({ teamId, onPlayerClick }) => {
  const { getTeamTactics, updateFieldFormation } = useTeamStore();

  const teamTactics = getTeamTactics(teamId);
  const currentFormation = teamTactics?.fieldFormation || 'neutral';

  const formations = [
    {
      id: 'attacking',
      name: 'Attacking Formation',
      icon: TrendingUp,
      description: 'Aggressive field with close catchers and attacking positions',
      split: '6-3 Split',
      splitDetail: '6 in circle, 3 on boundary',
      color: 'red',
      characteristics: [
        'More slips and close catchers',
        'Pressure on batsman',
        'Higher risk of boundaries',
        'Best for taking wickets'
      ]
    },
    {
      id: 'neutral',
      name: 'Neutral Formation',
      icon: Shield,
      description: 'Balanced field with mix of catching and boundary positions',
      split: '5-4-2 Split',
      splitDetail: '5 in circle, 4 mid, 2 boundary',
      color: 'green',
      characteristics: [
        'Balanced approach',
        'Flexible positioning',
        'Adapts to match situation',
        'General purpose formation'
      ]
    },
    {
      id: 'defensive',
      name: 'Defensive Formation',
      icon: Users,
      description: 'Protective field with boundary riders and run-saving positions',
      split: '3-2-6 Split',
      splitDetail: '3 in circle, 2 mid, 6 boundary',
      color: 'blue',
      characteristics: [
        'More boundary protection',
        'Run-saving focus',
        'Lower risk of boundaries',
        'Best for defending totals'
      ]
    }
  ];

  const handleFormationChange = (formationId) => {
    updateFieldFormation(teamId, formationId);
  };

  const getColorClasses = (color, isSelected) => {
    const baseClasses = {
      red: {
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        iconBg: 'bg-red-500/20',
        selectedBorder: 'border-red-500',
        selectedBg: 'bg-red-500/20'
      },
      green: {
        border: 'border-green-500/30',
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        iconBg: 'bg-green-500/20',
        selectedBorder: 'border-green-500',
        selectedBg: 'bg-green-500/20'
      },
      blue: {
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        iconBg: 'bg-blue-500/20',
        selectedBorder: 'border-blue-500',
        selectedBg: 'bg-blue-500/20'
      }
    };

    return baseClasses[color];
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">
            Field Formation
          </h3>
        </div>
        <p className="text-sm text-text-secondary">
          Choose your default field formation. This affects fielder positioning and strategy.
        </p>
      </div>

      {/* Formation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {formations.map((formation) => {
          const isSelected = currentFormation === formation.id;
          const Icon = formation.icon;
          const colors = getColorClasses(formation.color, isSelected);

          return (
            <button
              key={formation.id}
              onClick={() => handleFormationChange(formation.id)}
              className={`card p-4 text-left transition-all hover:scale-[1.02] ${
                isSelected
                  ? `border-2 ${colors.selectedBorder} ${colors.selectedBg}`
                  : 'border border-border-primary hover:border-border-secondary'
              }`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded ${colors.iconBg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold mb-1 ${
                    isSelected ? colors.text : 'text-text-primary'
                  }`}>
                    {formation.name}
                  </h4>
                  {isSelected && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                      <Target className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-text-secondary mb-3">
                {formation.description}
              </p>

              {/* Split Info */}
              <div className={`p-2 rounded ${colors.bg} mb-3`}>
                <p className={`text-xs font-semibold ${colors.text} mb-0.5`}>
                  {formation.split}
                </p>
                <p className="text-xs text-text-secondary">
                  {formation.splitDetail}
                </p>
              </div>

              {/* Characteristics */}
              <div className="space-y-1.5">
                {formation.characteristics.map((char, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className={`w-1 h-1 rounded-full mt-1.5 ${
                      isSelected ? colors.text.replace('text-', 'bg-') : 'bg-text-secondary'
                    }`}></div>
                    <p className="text-xs text-text-secondary flex-1">
                      {char}
                    </p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Future Enhancement Note */}
      <div className="card p-4 mt-4 bg-bg-tertiary/50 border-border-secondary">
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-text-secondary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">
              Individual Fielding Positions - Coming Soon
            </p>
            <p className="text-xs text-text-secondary">
              Future update will allow you to customize individual fielder positions and create custom formations.
              For now, formations provide automatic intelligent positioning based on match situation.
            </p>
          </div>
        </div>
      </div>

      {/* Field Positioning System Info */}
      <div className="card p-4 mt-4">
        <h4 className="text-sm font-semibold text-text-primary mb-2">
          How Field Positioning Works
        </h4>
        <div className="space-y-2 text-xs text-text-secondary">
          <p>
            The match engine uses your selected formation to automatically position all 11 fielders
            on a 2D coordinate system based on:
          </p>
          <ul className="ml-4 space-y-1 list-disc">
            <li>Current bowler type (pace/spin)</li>
            <li>Match phase (powerplay/middle/death)</li>
            <li>Match situation (defending/chasing)</li>
            <li>Batsman tendencies</li>
          </ul>
          <p className="mt-2">
            Fielders automatically adjust positions when bowlers change to optimize
            catching and run-saving opportunities.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FieldingTab;
