/**
 * @file FieldTemplateSelector.jsx
 * @description Compact field formation template selector - 3 rows by mentality
 */

import React from 'react';
import { Zap, Shield, Activity, Check } from 'lucide-react';
import { formationsConfig } from '../../../utils/fieldingFormationResolver.js';

const FieldTemplateSelector = ({ selectedTemplate, onSelectTemplate, phase, compact = false }) => {
  const formations = formationsConfig.formations;

  // Categorize templates by formationStyle (mentality)
  const categorizeTemplates = () => {
    const categories = {
      attacking: [],
      balanced: [],
      defensive: []
    };

    Object.entries(formations).forEach(([id, template]) => {
      const style = template.formationStyle || 'neutral';

      if (style === 'attacking') {
        categories.attacking.push({ id, ...template });
      } else if (style === 'defensive') {
        categories.defensive.push({ id, ...template });
      } else {
        categories.balanced.push({ id, ...template });
      }
    });

    return categories;
  };

  const categories = categorizeTemplates();

  const mentalityConfig = {
    attacking: {
      label: 'Attacking',
      icon: Zap,
      color: 'text-red-400',
      bgSelected: 'bg-red-500/20 border-red-500',
      bgHover: 'hover:bg-red-500/10'
    },
    balanced: {
      label: 'Balanced',
      icon: Activity,
      color: 'text-green-400',
      bgSelected: 'bg-green-500/20 border-green-500',
      bgHover: 'hover:bg-green-500/10'
    },
    defensive: {
      label: 'Defensive',
      icon: Shield,
      color: 'text-blue-400',
      bgSelected: 'bg-blue-500/20 border-blue-500',
      bgHover: 'hover:bg-blue-500/10'
    }
  };

  // Get all templates as flat array for compact mode
  const getAllTemplates = () => {
    return [
      ...categories.attacking,
      ...categories.balanced,
      ...categories.defensive
    ];
  };

  const renderRow = (mentality, templates) => {
    const config = mentalityConfig[mentality];
    const Icon = config.icon;

    return (
      <div key={mentality} className="flex items-center gap-2">
        {/* Row label */}
        <div className={`flex items-center gap-1 w-24 flex-shrink-0 ${config.color}`}>
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{config.label}</span>
        </div>

        {/* Template buttons - 5 columns */}
        <div className="grid grid-cols-5 gap-1.5 flex-1">
          {templates.slice(0, 5).map((template) => {
            const isSelected = selectedTemplate === template.id;

            return (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template.id)}
                title={template.description}
                className={`relative px-2 py-1.5 rounded text-xs font-medium transition-colors truncate ${isSelected
                    ? `${config.bgSelected} border ${config.color}`
                    : `bg-bg-tertiary border border-border-primary text-text-secondary ${config.bgHover} hover:text-text-primary`
                  }`}
              >
                {isSelected && (
                  <Check className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3" />
                )}
                <span className={isSelected ? 'pr-4' : ''}>
                  {template.name.replace(' Formation', '').replace(' Setup', '')}
                </span>
              </button>
            );
          })}
          {/* Fill empty slots if less than 5 templates */}
          {templates.length < 5 && Array.from({ length: 5 - templates.length }).map((_, i) => (
            <div key={`empty-${i}`} className="px-2 py-1.5" />
          ))}
        </div>
      </div>
    );
  };

  // Compact mode - flat grid, no row headings, no card wrapper
  if (compact) {
    const allTemplates = getAllTemplates();
    return (
      <div className="grid grid-cols-3 gap-1">
        {allTemplates.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const style = template.formationStyle || 'neutral';
          const config = style === 'attacking' ? mentalityConfig.attacking :
            style === 'defensive' ? mentalityConfig.defensive :
              mentalityConfig.balanced;

          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              title={template.description}
              className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors truncate ${isSelected
                  ? `${config.bgSelected} border ${config.color}`
                  : `bg-bg-tertiary border border-border-primary text-text-secondary ${config.bgHover} hover:text-text-primary`
                }`}
            >
              {template.name.replace(' Formation', '').replace(' Setup', '')}
            </button>
          );
        })}
      </div>
    );
  }

  // Full mode - with card wrapper and row headings
  return (
    <div className="card p-3 space-y-2">
      <h4 className="text-xs font-semibold text-text-primary mb-2">Formation Templates</h4>
      {renderRow('attacking', categories.attacking)}
      {renderRow('balanced', categories.balanced)}
      {renderRow('defensive', categories.defensive)}
    </div>
  );
};

export default FieldTemplateSelector;
