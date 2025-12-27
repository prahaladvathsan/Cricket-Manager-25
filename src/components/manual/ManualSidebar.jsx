/**
 * @file ManualSidebar.jsx
 * @description Navigation sidebar for the Game Manual
 */

import React from 'react';

const ManualSidebar = ({ sections, activeSection, onSectionClick, searchMatchCounts }) => {
  return (
    <nav className="w-64 flex-shrink-0 border-r border-border-primary bg-bg-secondary">
      <div className="sticky top-0 p-4">
        <h2 className="text-sm font-semibold text-cricket-text-secondary uppercase tracking-wider mb-3">
          Contents
        </h2>
        <ul className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const matchCount = searchMatchCounts?.[section.id] || 0;

            return (
              <li key={section.id}>
                <button
                  onClick={() => onSectionClick(section.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-cricket-primary text-white'
                      : 'text-cricket-text-secondary hover:bg-bg-tertiary hover:text-cricket-text-primary'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-cricket-accent'}`} />
                  <span className="flex-1 truncate">{section.title}</span>
                  {matchCount > 0 && (
                    <span className={`
                      text-xs px-1.5 py-0.5 rounded-full
                      ${isActive ? 'bg-white/20 text-white' : 'bg-cricket-accent/20 text-cricket-accent'}
                    `}>
                      {matchCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default ManualSidebar;
