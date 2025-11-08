/**
 * @file PreMatchModal.jsx
 * @description Pre-match preparation modal with tactics setup and toss
 */

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Cloud,
  Users,
  Target,
  ArrowRight,
  Settings
} from 'lucide-react';
import SetTacticsModal from '../tactics/SetTacticsModal';

const PreMatchModal = ({ isOpen, onClose, matchData, onStartMatch }) => {
  const [showTacticsModal, setShowTacticsModal] = useState(false);
  const [tossCompleted, setTossCompleted] = useState(false);
  const [tossResult, setTossResult] = useState(null);

  if (!isOpen || !matchData) return null;

  const {
    homeTeam,
    awayTeam,
    venue,
    date,
    matchType,
    userTeamId
  } = matchData;

  const isUserHomeTeam = homeTeam.id === userTeamId;
  const userTeam = isUserHomeTeam ? homeTeam : awayTeam;
  const oppositionTeam = isUserHomeTeam ? awayTeam : homeTeam;

  const handleSimulateToss = () => {
    // Random toss winner
    const tossWinner = Math.random() < 0.5 ? homeTeam : awayTeam;
    const userWonToss = tossWinner.id === userTeamId;

    // Random decision (bat/bowl)
    const decision = Math.random() < 0.5 ? 'bat' : 'bowl';

    setTossResult({
      winner: tossWinner,
      decision: decision,
      userWonToss: userWonToss
    });
    setTossCompleted(true);
  };

  const handleStartMatch = () => {
    if (!tossCompleted) {
      alert('Please complete the toss first');
      return;
    }

    onStartMatch({
      ...matchData,
      toss: tossResult
    });
  };

  // Get weather conditions (randomized for now)
  const getWeatherCondition = () => {
    const conditions = [
      { type: 'Clear', icon: '☀️', description: 'Clear skies, good batting conditions' },
      { type: 'Partly Cloudy', icon: '⛅', description: 'Some cloud cover, balanced conditions' },
      { type: 'Overcast', icon: '☁️', description: 'Overcast, may assist swing bowling' },
      { type: 'Light Rain', icon: '🌧️', description: 'Light rain expected, pitch may be damp' }
    ];
    return conditions[Math.floor(Math.random() * conditions.length)];
  };

  const weather = getWeatherCondition();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl w-full max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-primary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cricket-primary/20 rounded">
                <Target className="w-5 h-5 text-cricket-accent" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary">
                Match Preparation
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-tertiary rounded transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Home Team */}
              <div className={`card p-4 text-center ${isUserHomeTeam ? 'border-2 border-cricket-accent' : ''}`}>
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-2 border-2"
                  style={{
                    backgroundColor: homeTeam.colors?.primary || '#2D5F3F',
                    borderColor: homeTeam.colors?.secondary || '#D4AF37'
                  }}
                />
                <h3 className="font-semibold text-text-primary mb-1">
                  {homeTeam.name}
                </h3>
                {isUserHomeTeam && (
                  <span className="inline-block px-2 py-0.5 bg-cricket-accent/20 text-cricket-accent text-xs rounded">
                    Your Team
                  </span>
                )}
              </div>

              {/* VS */}
              <div className="text-center">
                <p className="text-2xl font-bold text-text-secondary">VS</p>
                <p className="text-xs text-text-secondary mt-1">{matchType || 'League Match'}</p>
              </div>

              {/* Away Team */}
              <div className={`card p-4 text-center ${!isUserHomeTeam ? 'border-2 border-cricket-accent' : ''}`}>
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-2 border-2"
                  style={{
                    backgroundColor: awayTeam.colors?.primary || '#2D5F3F',
                    borderColor: awayTeam.colors?.secondary || '#D4AF37'
                  }}
                />
                <h3 className="font-semibold text-text-primary mb-1">
                  {awayTeam.name}
                </h3>
                {!isUserHomeTeam && (
                  <span className="inline-block px-2 py-0.5 bg-cricket-accent/20 text-cricket-accent text-xs rounded">
                    Your Team
                  </span>
                )}
              </div>
            </div>

            {/* Match Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="card p-3">
                <div className="flex items-center gap-2 text-text-secondary mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">Venue</span>
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {venue || `${homeTeam.name} Stadium`}
                </p>
              </div>

              <div className="card p-3">
                <div className="flex items-center gap-2 text-text-secondary mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Date</span>
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {date || 'Match Day'}
                </p>
              </div>

              <div className="card p-3">
                <div className="flex items-center gap-2 text-text-secondary mb-1">
                  <Cloud className="w-4 h-4" />
                  <span className="text-xs">Weather</span>
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {weather.icon} {weather.type}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {weather.description}
                </p>
              </div>
            </div>

            {/* Tactics Section */}
            <div className="card p-4 bg-bg-tertiary/50">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-cricket-accent" />
                <h3 className="text-base font-semibold text-text-primary">
                  Team Tactics
                </h3>
              </div>
              <p className="text-sm text-text-secondary mb-3">
                Review or update your team tactics before the match begins.
              </p>
              <button
                onClick={() => setShowTacticsModal(true)}
                className="btn-secondary w-full"
              >
                <Users className="w-4 h-4" />
                <span>Set Match Tactics</span>
              </button>
            </div>

            {/* Toss Section */}
            {!tossCompleted ? (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-cricket-accent" />
                  <h3 className="text-base font-semibold text-text-primary">
                    Toss
                  </h3>
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  The coin toss will determine who bats first.
                </p>
                <button
                  onClick={handleSimulateToss}
                  className="btn-secondary w-full"
                >
                  <span>Simulate Toss</span>
                </button>
              </div>
            ) : (
              <div className="card p-4 bg-cricket-primary/10 border border-cricket-accent">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-cricket-accent" />
                  <h3 className="text-base font-semibold text-cricket-accent">
                    Toss Result
                  </h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-text-primary">
                    <span className="font-semibold">{tossResult.winner.name}</span> won the toss
                    {tossResult.userWonToss && (
                      <span className="ml-2 px-2 py-0.5 bg-cricket-accent/20 text-cricket-accent text-xs rounded">
                        You won!
                      </span>
                    )}
                  </p>
                  <p className="text-text-secondary">
                    Decision: <span className="text-text-primary font-medium">
                      {tossResult.decision === 'bat' ? 'Bat first' : 'Bowl first'}
                    </span>
                  </p>
                  {tossResult.decision === 'bat' ? (
                    <p className="text-xs text-text-secondary mt-2">
                      {tossResult.winner.name} will bat first. {tossResult.userWonToss ? 'You' : oppositionTeam.name} will bowl.
                    </p>
                  ) : (
                    <p className="text-xs text-text-secondary mt-2">
                      {tossResult.winner.name} will bowl first. {tossResult.userWonToss ? 'You' : oppositionTeam.name} will bat.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t border-border-primary">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <div className="flex-1"></div>
            <button
              onClick={handleStartMatch}
              disabled={!tossCompleted}
              className={`btn-primary flex items-center gap-2 ${
                !tossCompleted ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>Start Match</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Set Tactics Modal */}
      <SetTacticsModal
        isOpen={showTacticsModal}
        onClose={() => setShowTacticsModal(false)}
        teamId={userTeamId}
      />
    </>
  );
};

export default PreMatchModal;
