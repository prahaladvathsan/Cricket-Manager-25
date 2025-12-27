/**
 * @file GameManual.jsx
 * @description Main Game Manual page with search and navigation
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, X } from 'lucide-react';
import ManualSidebar from './ManualSidebar';
import ManualSection from './ManualSection';
import { manualSections } from './manualContent';

const GameManual = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [activeSection, setActiveSection] = useState(null);
  const contentRef = useRef(null);

  // Calculate search matches per section
  const searchMatchCounts = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return {};

    const counts = {};
    const query = searchQuery.toLowerCase();

    manualSections.forEach((section) => {
      let count = 0;

      // Check title
      if (section.title.toLowerCase().includes(query)) {
        count += 1;
      }

      // Check content
      section.content.forEach((item) => {
        if (item.heading.toLowerCase().includes(query)) {
          count += 1;
        }
        const textMatches = (item.text.toLowerCase().match(new RegExp(query, 'g')) || []).length;
        count += textMatches;
      });

      if (count > 0) {
        counts[section.id] = count;
      }
    });

    return counts;
  }, [searchQuery]);

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return manualSections;

    const query = searchQuery.toLowerCase();

    return manualSections.filter((section) => {
      // Check title
      if (section.title.toLowerCase().includes(query)) return true;

      // Check content
      return section.content.some(
        (item) =>
          item.heading.toLowerCase().includes(query) ||
          item.text.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  // Auto-expand sections with search matches
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const matchingSectionIds = Object.keys(searchMatchCounts);
      setExpandedSections(new Set(matchingSectionIds));
    }
  }, [searchQuery, searchMatchCounts]);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Handle sidebar navigation click
  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);

    // Expand the section
    setExpandedSections((prev) => new Set([...prev, sectionId]));

    // Scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const sections = contentRef.current.querySelectorAll('[id]');
      let currentSection = null;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150) {
          currentSection = section.id;
        }
      });

      if (currentSection && currentSection !== activeSection) {
        setActiveSection(currentSection);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [activeSection]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setExpandedSections(new Set());
  };

  // Expand all sections
  const expandAll = () => {
    setExpandedSections(new Set(manualSections.map((s) => s.id)));
  };

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <header className="bg-bg-secondary border-b border-border-primary px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-cricket-text-secondary hover:text-cricket-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Menu</span>
            </button>
            <div className="h-6 w-px bg-border-primary" />
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cricket-accent" />
              <h1 className="text-xl font-bold text-cricket-text-primary">Game Manual</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cricket-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search manual..."
              className="w-full pl-10 pr-10 py-2 bg-bg-tertiary border border-border-primary rounded-lg
                         text-cricket-text-primary placeholder-cricket-text-tertiary
                         focus:outline-none focus:border-cricket-primary focus:ring-1 focus:ring-cricket-primary"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cricket-text-secondary hover:text-cricket-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search results indicator & expand/collapse controls */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-cricket-text-secondary">
            {searchQuery.length >= 2 ? (
              <>
                Found{' '}
                <span className="text-cricket-accent font-medium">
                  {Object.values(searchMatchCounts).reduce((a, b) => a + b, 0)}
                </span>{' '}
                matches in{' '}
                <span className="text-cricket-accent font-medium">
                  {filteredSections.length}
                </span>{' '}
                sections
              </>
            ) : (
              <>{manualSections.length} sections available</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-xs px-3 py-1 text-cricket-text-secondary hover:text-cricket-text-primary
                         border border-border-primary rounded hover:bg-bg-tertiary transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-xs px-3 py-1 text-cricket-text-secondary hover:text-cricket-text-primary
                         border border-border-primary rounded hover:bg-bg-tertiary transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ManualSidebar
          sections={manualSections}
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
          searchMatchCounts={searchMatchCounts}
        />

        {/* Content Area */}
        <main ref={contentRef} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-cricket-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-cricket-text-primary mb-2">
                  No results found
                </h3>
                <p className="text-cricket-text-secondary">
                  Try a different search term or browse the sections in the sidebar.
                </p>
                <button
                  onClick={clearSearch}
                  className="mt-4 px-4 py-2 bg-cricket-primary text-white rounded-lg hover:bg-cricket-primary-dark transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              filteredSections.map((section) => (
                <ManualSection
                  key={section.id}
                  section={section}
                  isExpanded={expandedSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  searchQuery={searchQuery.length >= 2 ? searchQuery : ''}
                />
              ))
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border-primary text-center">
              <p className="text-sm text-cricket-text-tertiary">
                Cricket Manager 25 - Game Manual
              </p>
              <p className="text-xs text-cricket-text-tertiary mt-1">
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GameManual;
