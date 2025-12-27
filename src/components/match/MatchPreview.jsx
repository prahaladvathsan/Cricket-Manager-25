/**
 * @file MatchPreview.jsx
 * @description Match preview page showing fixture details before simulation
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Cloud,
  Trophy,
  TrendingUp,
  Star
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import TeamName from '../shared/TeamName';
import PlayerName from '../shared/PlayerName';
import LoadingScreen from '../shared/LoadingScreen';
import { getTeamBadge } from '../../utils/assetHelpers';

const MatchPreview = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { getFixtureById, clubs, results } = useLeagueStore();
  const { getUserTeam } = useTeamStore();
  const { getPlayersByTeam, careerStats } = usePlayerStore();
  const currentSeasonId = usePlayerStore(state => state.currentSeasonId);
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

  // Get best performers for a team
  const getBestPerformers = (teamId) => {
    const players = getPlayersByTeam(teamId);

    // Get season stats for each player
    const playersWithStats = players.map(player => {
      const seasonStats = careerStats[player.id]?.seasons[currentSeasonId] || {
        runs: 0,
        wickets: 0,
        battingAvg: 0,
        bowlingAvg: 0,
        strikeRate: 0,
        economy: 0
      };
      return { ...player, seasonStats };
    });

    // Top 3 batters by runs (tiebreak by batting playstyle rating)
    const topBatters = [...playersWithStats]
      .sort((a, b) => {
        if (b.seasonStats.runs !== a.seasonStats.runs) {
          return b.seasonStats.runs - a.seasonStats.runs;
        }
        // Tiebreak by primary batting playstyle (use highest batting attribute)
        const aBatRating = Math.max(a.batting?.technique || 0, a.batting?.timing || 0, a.batting?.power || 0);
        const bBatRating = Math.max(b.batting?.technique || 0, b.batting?.timing || 0, b.batting?.power || 0);
        return bBatRating - aBatRating;
      })
      .slice(0, 3);

    // Top 3 bowlers by wickets (tiebreak by bowling playstyle rating)
    const topBowlers = [...playersWithStats]
      .sort((a, b) => {
        if (b.seasonStats.wickets !== a.seasonStats.wickets) {
          return b.seasonStats.wickets - a.seasonStats.wickets;
        }
        // Tiebreak by primary bowling playstyle (use highest bowling attribute)
        const aBowlRating = Math.max(a.bowling?.accuracy || 0, a.bowling?.swing || 0, a.bowling?.spin || 0);
        const bBowlRating = Math.max(b.bowling?.accuracy || 0, b.bowling?.swing || 0, b.bowling?.spin || 0);
        return bBowlRating - aBowlRating;
      })
      .slice(0, 3);

    return { topBatters, topBowlers };
  };

  // Memoize best performers
  const homePerformers = useMemo(() => {
    if (!matchData?.homeTeam?.id) return { topBatters: [], topBowlers: [] };
    return getBestPerformers(matchData.homeTeam.id);
  }, [matchData?.homeTeam?.id, careerStats, currentSeasonId]);

  const awayPerformers = useMemo(() => {
    if (!matchData?.awayTeam?.id) return { topBatters: [], topBowlers: [] };
    return getBestPerformers(matchData.awayTeam.id);
  }, [matchData?.awayTeam?.id, careerStats, currentSeasonId]);

  if (!matchData) {
    return (
      <LoadingScreen
        message="Loading Match Preview"
        submessage="Preparing match details..."
        showLogo={false}
      />
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

  // Best Performers Card Component
  const BestPerformersCard = ({ team, performers, isUserTeam }) => (
    <div className={`card p-4 ${isUserTeam ? 'border-cricket-accent/30' : ''}`}>
      <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-cricket-accent" />
        <TeamName teamId={team.id} variant="short" inline={true} /> Best Performers
      </h3>

      <div className="flex gap-4">
        {/* Top Batters Table */}
        <div className="flex-1">
          <div className="text-xs text-text-secondary mb-2 font-medium">Top Batters</div>
          {performers.topBatters.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-primary text-text-tertiary">
                  <th className="text-left py-1 w-5">#</th>
                  <th className="text-left py-1">Name</th>
                  <th className="text-right py-1">Runs</th>
                </tr>
              </thead>
              <tbody>
                {performers.topBatters.map((player, idx) => (
                  <tr key={player.id} className="border-b border-border-secondary">
                    <td className="py-1 text-text-tertiary">{idx + 1}</td>
                    <td className="py-1">
                      <PlayerName playerId={player.id} className="text-text-primary hover:text-cricket-accent" />
                    </td>
                    <td className="py-1 text-right font-mono text-cricket-accent font-medium">
                      {player.seasonStats.runs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-text-tertiary italic">No stats yet</div>
          )}
        </div>

        {/* Top Bowlers Table */}
        <div className="flex-1">
          <div className="text-xs text-text-secondary mb-2 font-medium">Top Bowlers</div>
          {performers.topBowlers.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-primary text-text-tertiary">
                  <th className="text-left py-1 w-5">#</th>
                  <th className="text-left py-1">Name</th>
                  <th className="text-right py-1">Wkts</th>
                </tr>
              </thead>
              <tbody>
                {performers.topBowlers.map((player, idx) => (
                  <tr key={player.id} className="border-b border-border-secondary">
                    <td className="py-1 text-text-tertiary">{idx + 1}</td>
                    <td className="py-1">
                      <PlayerName playerId={player.id} className="text-text-primary hover:text-cricket-accent" />
                    </td>
                    <td className="py-1 text-right font-mono text-cricket-accent font-medium">
                      {player.seasonStats.wickets}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-text-tertiary italic">No stats yet</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header - Compact */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-cricket-accent" />
            <span className="text-xs font-mono text-text-tertiary px-2 py-0.5 bg-bg-tertiary rounded">
              MD {matchday}
            </span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <Calendar className="w-3 h-3" />
            <span>{date}</span>
          </div>
        </div>

        {/* Teams - Compact horizontal layout */}
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className={`flex items-center gap-3 flex-1 ${isUserHomeTeam ? '' : 'opacity-90'}`}>
            <img
              src={getTeamBadge(homeTeam.id)}
              alt={homeTeam.name}
              className={`w-14 h-14 drop-shadow-lg ${isUserHomeTeam ? 'ring-2 ring-trophy-gold rounded-full' : ''}`}
            />
            <div>
              <h2 className="text-lg font-bold">
                <TeamName teamId={homeTeam.id} inline={true} className="text-lg font-bold" />
              </h2>
              <div className="text-xs text-text-secondary">Home</div>
            </div>
          </div>

          {/* VS */}
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-text-tertiary">VS</div>
          </div>

          {/* Away Team */}
          <div className={`flex items-center gap-3 flex-1 justify-end ${isUserAwayTeam ? '' : 'opacity-90'}`}>
            <div className="text-right">
              <h2 className="text-lg font-bold">
                <TeamName teamId={awayTeam.id} inline={true} className="text-lg font-bold" />
              </h2>
              <div className="text-xs text-text-secondary">Away</div>
            </div>
            <img
              src={getTeamBadge(awayTeam.id)}
              alt={awayTeam.name}
              className={`w-14 h-14 drop-shadow-lg ${isUserAwayTeam ? 'ring-2 ring-trophy-gold rounded-full' : ''}`}
            />
          </div>
        </div>

        {/* Venue */}
        <div className="flex items-center justify-center gap-1 text-xs text-text-secondary mt-3 pt-3 border-t border-border-primary">
          <MapPin className="w-3 h-3" />
          <span>{venue}</span>
        </div>
      </div>

      {/* Best Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BestPerformersCard team={homeTeam} performers={homePerformers} isUserTeam={isUserHomeTeam} />
        <BestPerformersCard team={awayTeam} performers={awayPerformers} isUserTeam={isUserAwayTeam} />
      </div>

      {/* Venue, Conditions & Form (moved to bottom) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Venue & Conditions */}
        <div className="card p-4">
          <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cricket-accent" />
            Venue & Conditions
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div className="text-xs text-text-secondary">Stadium</div>
              <div className="text-xs font-medium text-text-primary text-right">{venue}</div>
            </div>

            <div className="flex justify-between items-start">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Weather
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-text-primary">
                  {weather.icon} {weather.type}
                </div>
                <div className="text-xxs text-text-tertiary">
                  {weather.description}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div className="text-xs text-text-secondary">Pitch</div>
              <div className="text-right">
                <div className="text-xs font-medium text-text-primary">Good batting track</div>
                <div className="text-xxs text-text-tertiary">
                  Expected to remain consistent
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Form */}
        <div className="card p-4">
          <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cricket-accent" />
            Recent Form
          </h3>

          <div className="space-y-3">
            {/* Home Team Form */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-text-secondary w-16">{homeTeam.shortName}</div>
              <div className="flex gap-1">
                {homeTeamForm.length > 0 ? (
                  homeTeamForm.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xxs font-bold ${
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
                  <span className="text-xxs text-text-tertiary">No recent matches</span>
                )}
              </div>
            </div>

            {/* Away Team Form */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-text-secondary w-16">{awayTeam.shortName}</div>
              <div className="flex gap-1">
                {awayTeamForm.length > 0 ? (
                  awayTeamForm.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xxs font-bold ${
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
                  <span className="text-xxs text-text-tertiary">No recent matches</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPreview;
