/**
 * @file Credits.jsx
 * @description About and credits page
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Code, Database, Zap, Heart } from 'lucide-react';

const Credits = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-dark via-cricket-secondary to-cricket-dark p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>
        </div>

        {/* Main Content */}
        <div className="card p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-cricket-accent mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-cricket-text-primary mb-2">
              Cricket Manager 2025
            </h1>
            <p className="text-xl text-cricket-accent font-semibold">
              Version 1.0.0
            </p>
          </div>

          {/* Description */}
          <div className="mb-8 p-6 bg-cricket-secondary rounded-lg">
            <p className="text-cricket-text-primary text-center leading-relaxed">
              A comprehensive cricket management simulation featuring ball-by-ball physics,
              545 real players with playstyle-based attributes, and deep tactical gameplay.
              Manage your team through the World Premier League, conduct auctions, and
              simulate matches at 50,000+ balls per second.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-cricket-secondary rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-cricket-accent" />
                <h3 className="font-semibold text-cricket-text-primary">Database</h3>
              </div>
              <ul className="text-sm text-cricket-text-secondary space-y-1 ml-8">
                <li>545 real players with attributes</li>
                <li>24 unique playstyles</li>
                <li>10 WPL teams</li>
                <li>Real-world stats conversion</li>
              </ul>
            </div>

            <div className="p-4 bg-cricket-secondary rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-cricket-accent" />
                <h3 className="font-semibold text-cricket-text-primary">Match Engine</h3>
              </div>
              <ul className="text-sm text-cricket-text-secondary space-y-1 ml-8">
                <li>Ball-by-ball simulation</li>
                <li>50,000+ balls/second</li>
                <li>2D physics-based fielding</li>
                <li>Playstyle modifiers</li>
              </ul>
            </div>

            <div className="p-4 bg-cricket-secondary rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-5 h-5 text-cricket-accent" />
                <h3 className="font-semibold text-cricket-text-primary">Game Modes</h3>
              </div>
              <ul className="text-sm text-cricket-text-secondary space-y-1 ml-8">
                <li>Career Mode</li>
                <li>Auction System</li>
                <li>League & Playoffs</li>
                <li>Financial Management</li>
              </ul>
            </div>

            <div className="p-4 bg-cricket-secondary rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Code className="w-5 h-5 text-cricket-accent" />
                <h3 className="font-semibold text-cricket-text-primary">Technology</h3>
              </div>
              <ul className="text-sm text-cricket-text-secondary space-y-1 ml-8">
                <li>React 18 + Vite</li>
                <li>Zustand State Management</li>
                <li>Tailwind CSS</li>
                <li>LocalStorage Persistence</li>
              </ul>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-cricket-text-primary mb-4 text-center">
              Built With
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {['React', 'Vite', 'Zustand', 'Tailwind CSS', 'React Router', 'Lucide Icons'].map(tech => (
                <span
                  key={tech}
                  className="px-3 py-1 bg-cricket-primary/20 text-cricket-accent text-sm rounded-full border border-cricket-primary/30"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Credits */}
          <div className="border-t border-cricket-primary/30 pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-cricket-text-secondary mb-4">
                <span>Made with</span>
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span>for cricket fans worldwide</span>
              </div>

              <p className="text-sm text-cricket-text-secondary mb-2">
                Inspired by Football Manager and cricket simulation games
              </p>

              <div className="mt-6 space-y-1 text-xs text-cricket-text-secondary">
                <p>© 2025 Cricket Manager. All rights reserved.</p>
                <p>Player data processed from public domain statistics</p>
                <p>No affiliation with ICC, BCCI, or any cricket board</p>
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="mt-8 p-4 bg-cricket-secondary/50 rounded-lg">
            <h3 className="text-sm font-semibold text-cricket-text-primary mb-3 text-center">
              Resources
            </h3>
            <div className="flex justify-center gap-4 text-sm">
              <a
                href="#"
                className="text-cricket-accent hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Documentation coming soon!');
                }}
              >
                Documentation
              </a>
              <span className="text-cricket-text-secondary">•</span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cricket-accent hover:underline"
              >
                GitHub
              </a>
              <span className="text-cricket-text-secondary">•</span>
              <a
                href="#"
                className="text-cricket-accent hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Changelog coming soon!');
                }}
              >
                Changelog
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Credits;
