/**
 * @file FieldTemplateSelector.jsx
 * @description Component for selecting from professional field formation templates
 */

import React, { useState } from 'react';
import { Zap, Shield, Activity, CheckCircle2 } from 'lucide-react';
import { formationsConfig } from '../../../utils/fieldingFormationResolver.js';

const FieldTemplateSelector = ({ selectedTemplate, onSelectTemplate, phase }) => {
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'attacking', 'balanced', 'defensive'

  const formations = formationsConfig.formations;

  // Categorize templates based on formationStyle
  const categorizeTemplates = () => {
    const categories = {
      attacking: [],
      balanced: [],
      defensive: []
    };

    Object.entries(formations).forEach(([id, template]) => {
      // Categorize by formationStyle
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

  // Get templates to display based on filter
  const getDisplayTemplates = () => {
    if (categoryFilter === 'all') {
      return [
        ...categories.attacking,
        ...categories.balanced,
        ...categories.defensive
      ];
    }
    return categories[categoryFilter] || [];
  };

  const displayTemplates = getDisplayTemplates();

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'attacking':
        return Zap;
      case 'defensive':
        return Shield;
      case 'balanced':
        return Activity;
      default:
        return Activity;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'attacking':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          activeBg: 'bg-red-500/20',
          activeBorder: 'border-red-500'
        };
      case 'defensive':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          activeBg: 'bg-blue-500/20',
          activeBorder: 'border-blue-500'
        };
      case 'balanced':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          text: 'text-green-400',
          activeBg: 'bg-green-500/20',
          activeBorder: 'border-green-500'
        };
      default:
        return {
          bg: 'bg-cricket-primary/10',
          border: 'border-cricket-accent/30',
          text: 'text-cricket-accent',
          activeBg: 'bg-cricket-primary/20',
          activeBorder: 'border-cricket-accent'
        };
    }
  };

  const getTemplateCategory = (template) => {
    return template.formationStyle || 'neutral';
  };

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-1">
            Select Formation Template
          </h4>
          <p className="text-xs text-text-secondary">
            {displayTemplates.length} template{displayTemplates.length !== 1 ? 's' : ''} available for {phase === 'powerplay' ? 'powerplay' : 'post-powerplay'} phase
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              categoryFilter === 'all'
                ? 'bg-cricket-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
          >
            All ({categories.attacking.length + categories.balanced.length + categories.defensive.length})
          </button>
          <button
            onClick={() => setCategoryFilter('attacking')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              categoryFilter === 'attacking'
                ? 'bg-red-500 text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
          >
            <Zap className="w-3 h-3 inline mr-1" />
            Attacking ({categories.attacking.length})
          </button>
          <button
            onClick={() => setCategoryFilter('balanced')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              categoryFilter === 'balanced'
                ? 'bg-green-500 text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
          >
            <Activity className="w-3 h-3 inline mr-1" />
            Balanced ({categories.balanced.length})
          </button>
          <button
            onClick={() => setCategoryFilter('defensive')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              categoryFilter === 'defensive'
                ? 'bg-blue-500 text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
          >
            <Shield className="w-3 h-3 inline mr-1" />
            Defensive ({categories.defensive.length})
          </button>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayTemplates.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const category = getTemplateCategory(template);
          const Icon = getCategoryIcon(category);
          const colors = getCategoryColor(category);

          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={`p-3 rounded border text-left transition-all hover:scale-[1.02] ${
                isSelected
                  ? `${colors.activeBorder} ${colors.activeBg} border-2`
                  : `border-border-primary hover:border-border-secondary`
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <div className={`p-1.5 rounded ${colors.bg}`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-sm font-semibold ${
                      isSelected ? colors.text : 'text-text-primary'
                    } truncate`}>
                      {template.name}
                    </h5>
                    {isSelected && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className={`w-3 h-3 ${colors.text}`} />
                        <span className={`text-xs font-medium ${colors.text}`}>Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-text-secondary mb-2 line-clamp-2">
                {template.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {template.bowlingType && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-bg-tertiary text-text-secondary font-medium">
                    {template.bowlingType}
                  </span>
                )}
                {template.phase && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-bg-tertiary text-text-secondary font-medium capitalize">
                    {template.phase}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {displayTemplates.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <p className="text-sm">No templates available for this category.</p>
        </div>
      )}
    </div>
  );
};

export default FieldTemplateSelector;
