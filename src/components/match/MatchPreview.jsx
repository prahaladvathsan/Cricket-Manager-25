/**
 * @file MatchPreview.jsx
 * @description Match preview page showing fixture details before simulation
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Cloud,
  Users,
  Trophy,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';
import TeamName from '../shared/TeamName';
import { getTeamBadge } from '../../utils/assetHelpers';

const MatchPreview = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { getFixtureById, clubs, results } = useLeagueStore();
  const { getUserTeam } = useTeamStore();
  const [fixture, setFixture] = useState(null);
  const [matchData, setMatchData] = useState(null);

  const userTeam = getUserTeam();

  useEffect(() => {
    if (!matchId) {
      console.warn('No matchId provided');
      navigate('/game/matches');
      return;
    }

    console.log('Loading match preview for matchId:', matchId);

    // Get fixture from league store
    const fixtureData = getFixtureById(matchId);

    if (!fixtureData) {
      console.warn('Fixture not found for matchId:', matchId);
      navigate('/game/matches');
      return;
    }

    console.log('Fixture found:', fixtureData);
    setFixture(fixtureData);

    // Prepare match data
    const homeTeamData = clubs[fixtureData.homeTeam];
    const awayTeamData = clubs[fixtureData.awayTeam];

    console.log('Home team:', homeTeamData, 'Away team:', awayTeamData);

    if (!homeTeamData || !awayTeamData) {
      console.warn('Team data not found for fixture. Home:', fixtureData.homeTeam, 'Away:', fixtureData.awayTeam);
      console.log('Available clubs:', Object.keys(clubs));
      navigate('/game/matches');
      return;
    }

    setMatchData({
      id: fixtureData.id || matchId,
      homeTeam: homeTeamData,
      awayTeam: awayTeamData,
      venue: fixtureData.venue || `${homeTeamData.name} Stadium`,
      date: fixtureData.date || 'Match Day',
      matchday: fixtureData.matchday,
      matchType: 'League Match',
      userTeamId: userTeam?.id
    });
  }, [matchId, getFixtureById, clubs, userTeam, navigate]);

  if (!matchData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading match preview...</div>
      </div>
    );
  }

  const { homeTeam, awayTeam, venue, date, matchday } = matchData;
  const isUserHomeTeam = homeTeam.id === userTeam?.id;
  const isUserAwayTeam = awayTeam.id === userTeam?.id;

  // Get weather (randomized)
  const getWeatherCondition = () => {
    const conditions = [
      { type: 'Clear', icon: '☀️', description: 'Clear skies, good batting conditions' },
      { type: 'Partly Cloudy', icon: '⛅', description: 'Some cloud cover, balanced conditions' },
      { type: 'Overcast', icon: '☁️', description: 'Overcast, may assist swing bowling' }
    ];
    return conditions[Math.floor(Math.random() * conditions.length)];
  };

  const weather = getWeatherCondition();

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

  const homeTeamForm = getTeamForm(homeTeam.id);
  const awayTeamForm = getTeamForm(awayTeam.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cricket-accent" />
            <span className="text-xs font-mono text-text-tertiary px-2 py-1 bg-bg-tertiary rounded">
              MATCHDAY {matchday}
            </span>
            <span className="text-sm text-text-secondary">League Match</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-6">
          {/* Home Team */}
          <div className={`text-center ${isUserHomeTeam ? 'opacity-100' : 'opacity-90'}`}>
            <img
              src={getTeamBadge(homeTeam.id)}
              alt={homeTeam.name}
              className={`w-24 h-24 mx-auto mb-3 drop-shadow-lg ${isUserHomeTeam ? 'ring-4 ring-trophy-gold rounded-full' : ''}`}
            />
            <h2 className="text-2xl font-bold mb-1">
              <TeamName teamId={homeTeam.id} inline={true} className="text-2xl font-bold" />
            </h2>
            {isUserHomeTeam && (
              <span className="inline-block px-3 py-1 bg-cricket-accent/20 text-cricket-accent text-sm font-medium rounded">
                Your Team
              </span>
            )}
            <div className="text-sm text-text-secondary mt-2">Home</div>
          </div>

          {/* VS */}
          <div className="text-center">
            <div className="text-4xl font-bold text-text-secondary mb-2">VS</div>
            <div className="flex items-center justify-center gap-1 text-xs text-text-secondary">
              <MapPin className="w-3 h-3" />
              <span>{venue}</span>
            </div>
          </div>

          {/* Away Team */}
          <div className={`text-center ${isUserAwayTeam ? 'opacity-100' : 'opacity-90'}`}>
            <img
              src={getTeamBadge(awayTeam.id)}
              alt={awayTeam.name}
              className={`w-24 h-24 mx-auto mb-3 drop-shadow-lg ${isUserAwayTeam ? 'ring-4 ring-trophy-gold rounded-full' : ''}`}
            />
            <h2 className="text-2xl font-bold mb-1">
              <TeamName teamId={awayTeam.id} inline={true} className="text-2xl font-bold" />
            </h2>
            {isUserAwayTeam && (
              <span className="inline-block px-3 py-1 bg-cricket-accent/20 text-cricket-accent text-sm font-medium rounded">
                Your Team
              </span>
            )}
            <div className="text-sm text-text-secondary mt-2">Away</div>
          </div>
        </div>
      </div>

      {/* Match Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Venue & Conditions */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cricket-accent" />
            Venue & Conditions
          </h3>

          <div className="space-y-3">
            <div>
              <div className="text-xs text-text-secondary mb-1">Stadium</div>
              <div className="text-sm font-medium text-text-primary">{venue}</div>
            </div>

            <div>
              <div className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Weather
              </div>
              <div className="text-sm font-medium text-text-primary">
                {weather.icon} {weather.type}
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                {weather.description}
              </div>
            </div>

            <div>
              <div className="text-xs text-text-secondary mb-1">Pitch Conditions</div>
              <div className="text-sm font-medium text-text-primary">Good batting track</div>
              <div className="text-xs text-text-secondary mt-0.5">
                Expected to remain consistent throughout
              </div>
            </div>
          </div>
        </div>

        {/* Recent Form */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cricket-accent" />
            Recent Form
          </h3>

          <div className="space-y-4">
            {/* Home Team Form */}
            <div>
              <div className="text-xs text-text-secondary mb-2">{homeTeam.shortName}</div>
              <div className="flex gap-1">
                {homeTeamForm.length > 0 ? (
                  homeTeamForm.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
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
              <div className="text-xs text-text-secondary mb-2">{awayTeam.shortName}</div>
              <div className="flex gap-1">
                {awayTeamForm.length > 0 ? (
                  awayTeamForm.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
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

      {/* Squad Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Home Team Squad */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-cricket-accent" />
            {homeTeam.name} Squad
          </h3>
          <div className="text-sm text-text-secondary">
            Squad details available at match start
          </div>
        </div>

        {/* Away Team Squad */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-cricket-accent" />
            {awayTeam.name} Squad
          </h3>
          <div className="text-sm text-text-secondary">
            Squad details available at match start
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPreview;
