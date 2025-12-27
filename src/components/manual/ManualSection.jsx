/**
 * @file ManualSection.jsx
 * @description Collapsible accordion section for the Game Manual
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const ManualSection = ({ section, isExpanded, onToggle, searchQuery }) => {
  const Icon = section.icon;

  // Highlight search matches in text
  const highlightText = (text, query) => {
    if (!query || query.length < 2) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-cricket-accent/30 text-cricket-text-primary px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Render content with proper formatting
  const renderContent = (text) => {
    // Split by double newlines for paragraphs
    const paragraphs = text.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      // Check for bullet points
      if (para.includes('\n-')) {
        const lines = para.split('\n');
        const firstLine = lines[0];
        const bullets = lines.slice(1).filter(l => l.startsWith('-'));

        return (
          <div key={pIdx} className="mb-3">
            {firstLine && !firstLine.startsWith('-') && (
              <p className="text-cricket-text-secondary mb-2">
                {highlightText(renderFormattedText(firstLine), searchQuery)}
              </p>
            )}
            <ul className="list-disc list-inside space-y-1 text-cricket-text-secondary">
              {(firstLine.startsWith('-') ? lines : bullets).map((bullet, bIdx) => (
                <li key={bIdx} className="ml-2">
                  {highlightText(renderFormattedText(bullet.replace(/^-\s*/, '')), searchQuery)}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      // Check for table (markdown-style)
      if (para.includes('|') && para.includes('---')) {
        const lines = para.split('\n').filter(l => l.trim());
        const headers = lines[0].split('|').filter(c => c.trim()).map(c => c.trim());
        const rows = lines.slice(2).map(row =>
          row.split('|').filter(c => c.trim()).map(c => c.trim())
        );

        return (
          <div key={pIdx} className="mb-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="text-left py-2 px-3 text-cricket-text-primary font-medium">
                      {highlightText(h, searchQuery)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-border-primary/50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-cricket-text-secondary">
                        {highlightText(cell, searchQuery)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={pIdx} className="text-cricket-text-secondary mb-3 leading-relaxed">
          {highlightText(renderFormattedText(para), searchQuery)}
        </p>
      );
    });
  };

  // Handle bold and inline formatting
  const renderFormattedText = (text) => {
    // Replace **text** with bold
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-cricket-text-primary font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      id={section.id}
      className="border border-border-primary rounded-lg overflow-hidden mb-3 bg-bg-secondary"
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg-tertiary transition-colors"
      >
        <div className="p-2 bg-cricket-primary/20 rounded-lg">
          <Icon className="w-5 h-5 text-cricket-accent" />
        </div>
        <span className="flex-1 text-lg font-semibold text-cricket-text-primary">
          {highlightText(section.title, searchQuery)}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-cricket-text-secondary" />
        ) : (
          <ChevronRight className="w-5 h-5 text-cricket-text-secondary" />
        )}
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border-primary">
          {section.content.map((item, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              {/* Subsection Heading */}
              <h3 className="text-base font-semibold text-cricket-accent mb-2">
                {highlightText(item.heading, searchQuery)}
              </h3>
              {/* Subsection Content */}
              <div className="pl-2">
                {renderContent(item.text)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManualSection;
