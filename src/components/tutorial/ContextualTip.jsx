/**
 * @file ContextualTip.jsx
 * @description Modal-style contextual tip for first-time screen visits
 */

import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const ContextualTip = ({
  title,
  icon: Icon,
  tips,
  onDismiss
}) => {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-6 w-full max-w-md animate-fadeIn">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 text-cricket-text-tertiary hover:text-cricket-text-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {Icon && (
            <div className="p-3 bg-cricket-primary/20 rounded-lg">
              <Icon className="w-6 h-6 text-cricket-accent" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-cricket-text-primary">
              {title}
            </h3>
            <p className="text-xs text-cricket-text-tertiary">
              Quick tips for this screen
            </p>
          </div>
        </div>

        {/* Tips list */}
        <ul className="space-y-3 mb-6">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-cricket-accent flex-shrink-0 mt-0.5" />
              <span className="text-sm text-cricket-text-secondary leading-relaxed">
                {tip}
              </span>
            </li>
          ))}
        </ul>

        {/* Action button */}
        <button
          onClick={onDismiss}
          className="w-full py-3 bg-cricket-primary text-white rounded-lg
                     hover:bg-cricket-primary-dark transition-colors font-medium"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default ContextualTip;
