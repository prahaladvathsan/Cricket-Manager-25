/**
 * @file PreviewTab.jsx
 * @description Preview & Tactics tab for pre-match flow
 * Shows match preview (teams, venue, conditions, form) + tactics configuration
 */

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Cloud,
  TrendingUp,
  Settings,
  Target,
  Shield,
  Users
} from 'lucide-react';
import useLeagueStore from '../../../stores/leagueStore';
import useTeamStore from '../../../stores/teamStore';
import TeamName from '../../shared/TeamName';
import SetTacticsModal from '../../tactics/SetTacticsModal';
import { getTeamBadge } from '../../../utils/assetHelpers';

const PreviewTab = ({ matchData }) => {
  const [showTacticsModal, setShowTacticsModal] = useState(false);
  const { clubs, results } = useLeagueStore();
  const { teamTactics } = useTeamStore();

  const { homeTeam, awayTeam, venue, date, matchday, userTeamId } = matchData;
  const isUserHomeTeam = homeTeam.id === userTeamId;
  const isUserAwayTeam = awayTeam.id === userTeamId;

  // Get weather (randomized)
  const weather = useMemo(() => {
    const conditions = [
      { type: 'Clear', icon: '☀️', description: 'Clear skies, good batting conditions' },
      { type: 'Partly Cloudy', icon: '⛅', description: 'Some cloud cover, balanced conditions' },
      { type: 'Overcast', icon: '☁️', description: 'Overcast, may assist swing bowling' }
    ];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }, []);

  // Calculate recent form for both teams
  const getTeamForm = (teamId) => {
    const teamResults = results
      .filter(r => r.homeTeam === teamId || r.awayTeam === teamId)
      .slice(-5)
      .reverse();

    return teamResults.map(r => ({
      won: r.winner === teamId,
      opponent: r.homeTeam === teamId ? clubs[r.awayTeam]?.shortName : clubs[r.homeTeam]?.shortName
    }));
  };

  const homeTeamForm = useMemo(() => getTeamForm(homeTeam.id), [homeTeam.id]);
  const awayTeamForm = useMemo(() => getTeamForm(awayTeam.id), [awayTeam.id]);

  // Get current tactics for user team
  const userTactics = useMemo(() => {
    if (!userTeamId || !teamTactics[userTeamId]) return null;
    return teamTactics[userTeamId];
  }, [userTeamId, teamTactics]);

  // Get field formation display name
  const getFormationName = (formation) => {
    const names = {
      'attacking': 'Attacking',
      'neutral': 'Balanced',
      'defensive': 'Defensive'
    };
    return names[formation] || 'Balanced';
  };

  // Get acceleration tier counts
  const getAccelerationSummary = () => {
    if (!userTactics || !userTactics.accelerationTiers) return 'Auto Mode';

    const tiers = Object.values(userTactics.accelerationTiers);
    const tierCounts = {};
    tiers.forEach(tier => {
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    // Show most common tier
    const mostCommon = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0];
    return mostCommon ? `${mostCommon[0]} (${mostCommon[1]} players)` : 'Custom';
  };

  return (
    <div className="space-y-3">
      {/* Match Header */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-tertiary px-2 py-0.5 bg-bg-tertiary rounded">
              MD {matchday}
            </span>
            <span className="text-xs text-text-secondary">League Match</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary text-xs">
            <Calendar className="w-3 h-3" />
            <span>{date}</span>
          </div>
        </div>

        {/* Teams Comparison */}
        <div className="grid grid-cols-3 gap-4 items-center mb-2">
          {/* Home Team */}
          <div className={`text-center ${isUserHomeTeam ? 'opacity-100' : 'opacity-90'}`}>
            <img
              src={getTeamBadge(homeTeam.id)}
              alt={homeTeam.name}
              className={`w-16 h-16 mx-auto mb-2 drop-shadow-lg ${isUserHomeTeam ? 'ring-2 ring-trophy-gold rounded-full' : ''}`}
            />
            <h3 className="text-lg font-bold mb-0.5">
              <TeamName teamId={homeTeam.id} inline={true} className="text-lg font-bold" />
            </h3>
            {isUserHomeTeam && (
              <span className="inline-block px-1.5 py-0.5 bg-cricket-accent/20 text-cricket-accent text-xs font-medium rounded">
                Your Team
              </span>
            )}
            <div className="text-xs text-text-secondary mt-1">Home</div>
          </div>

          {/* VS */}
          <div className="text-center">
            <div className="text-2xl font-bold text-text-secondary mb-1">VS</div>
            <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{venue}</span>
            </div>
          </div>

          {/* Away Team */}
          <div className={`text-center ${isUserAwayTeam ? 'opacity-100' : 'opacity-90'}`}>
            <img
              src={getTeamBadge(awayTeam.id)}
              alt={awayTeam.name}
              className={`w-16 h-16 mx-auto mb-2 drop-shadow-lg ${isUserAwayTeam ? 'ring-2 ring-trophy-gold rounded-full' : ''}`}
            />
            <h3 className="text-lg font-bold mb-0.5">
              <TeamName teamId={awayTeam.id} inline={true} className="text-lg font-bold" />
            </h3>
            {isUserAwayTeam && (
              <span className="inline-block px-1.5 py-0.5 bg-cricket-accent/20 text-cricket-accent text-xs font-medium rounded">
                Your Team
              </span>
            )}
            <div className="text-xs text-text-secondary mt-1">Away</div>
          </div>
        </div>
      </div>

      {/* Match Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Venue & Conditions */}
        <div className="card p-2.5">
          <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cricket-accent" />
            Venue & Conditions
          </h4>

          <div className="grid grid-cols-3 gap-2">
            {/* Stadium */}
            <div className="bg-bg-tertiary rounded p-1.5">
              <div className="text-xs text-text-secondary mb-0.5">Stadium</div>
              <div className="text-xs font-medium text-text-primary truncate">{venue}</div>
            </div>

            {/* Weather */}
            <div className="bg-bg-tertiary rounded p-1.5">
              <div className="text-xs text-text-secondary mb-0.5 flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Weather
              </div>
              <div className="text-xs font-medium text-text-primary">
                {weather.icon} {weather.type}
              </div>
            </div>

            {/* Pitch */}
            <div className="bg-bg-tertiary rounded p-1.5">
              <div className="text-xs text-text-secondary mb-0.5">Pitch</div>
              <div className="text-xs font-medium text-text-primary">Good batting track</div>
            </div>
          </div>
        </div>

        {/* Recent Form */}
        <div className="card p-2.5">
          <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cricket-accent" />
            Recent Form
          </h4>

          <div className="space-y-2">
            {/* Home Team Form */}
            <div>
              <div className="text-xs text-text-secondary mb-1.5">{homeTeam.shortName}</div>
              <div className="flex gap-1">
                {homeTeamForm.length > 0 ? (
                  homeTeamForm.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                        result.won
                          ? 'bg-status-win/20 text-status-win'
                          : 'bg-status-loss/20 text-status-loss'
                      }`}
                      title={`${result.won ? 'Won' : 'Lost'} vs ${result.opponent}`}
                    >
                      {result.won ? 'W' : 'L'}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-text-tertiary">No recent matches</span>
                )}
              </div>
            </div>

            {/* Away Team Form */}
            <div>
              <div className="text-xs text-text-secondary mb-1.5">{awayTeam.shortName}</div>
              <div className="flex gap-1">
                {awayTeamForm.length > 0 ? (
                  awayTeamForm.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                        result.won
                          ? 'bg-status-win/20 text-status-win'
                          : 'bg-status-loss/20 text-status-loss'
                      }`}
                      title={`${result.won ? 'Won' : 'Lost'} vs ${result.opponent}`}
                    >
                      {result.won ? 'W' : 'L'}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-text-tertiary">No recent matches</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tactics Configuration */}
      <div className="card p-2.5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-cricket-accent" />
            Match Tactics
          </h4>
          <button
            onClick={() => setShowTacticsModal(true)}
            className="btn-primary text-xs px-2 py-1 flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            <span>Configure</span>
          </button>
        </div>

        {userTactics ? (
          <div className="grid grid-cols-3 gap-2">
            {/* Batting */}
            <div className="bg-bg-tertiary rounded p-1.5">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3 text-cricket-accent" />
                <span className="text-xs font-medium text-text-secondary">Batting</span>
              </div>
              <div className="text-xs font-semibold text-text-primary">
                {getAccelerationSummary()}
              </div>
            </div>

            {/* Bowling */}
            <div className="bg-bg-tertiary rounded p-1.5">
              <div className="flex items-center gap-1 mb-1">
                <Target className="w-3 h-3 text-cricket-accent" />
                <span className="text-xs font-medium text-text-secondary">Bowling</span>
              </div>
              <div className="text-xs font-semibold text-text-primary">
                {userTactics.bowlingPlans ? `${Object.keys(userTactics.bowlingPlans).length} Plans Set` : 'Default Plans'}
              </div>
            </div>

            {/* Fielding */}
            <div className="bg-bg-tertiary rounded p-1.5">
              <div className="flex items-center gap-1 mb-1">
                <Shield className="w-3 h-3 text-cricket-accent" />
                <span className="text-xs font-medium text-text-secondary">Fielding</span>
              </div>
              <div className="text-xs font-semibold text-text-primary">
                {getFormationName(userTactics.fieldFormation)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-secondary text-center py-3">
            Configure your match tactics to optimize team performance
          </div>
        )}
      </div>

      {/* Tactics Modal */}
      <SetTacticsModal
        isOpen={showTacticsModal}
        onClose={() => setShowTacticsModal(false)}
        teamId={userTeamId}
      />
    </div>
  );
};

export default PreviewTab;
