/**
 * @file League.jsx
 * @description League standings, fixtures, results, and player leaderboards
 */

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Calendar,
  History,
  Award
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';

const League = () => {
  const [activeTab, setActiveTab] = useState('standings');
  const [leaderboardCategory, setLeaderboardCategory] = useState('batting');

  // Get league data
  const { seasonName, standings, fixtures, results, clubs, stage, champion } = useLeagueStore();
  const { currentSeasonId } = usePlayerStore();
  const { currentSeason } = useGameStore();

  // Sort standings by points and NRR
  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });
  }, [standings]);

  // Get upcoming fixtures (next 10)
  const upcomingFixtures = useMemo(() => {
    return fixtures
      .filter(f => f.status === 'upcoming' || !f.status)
      .slice(0, 10);
  }, [fixtures]);

  // Get recent results (last 10)
  const recentResults = useMemo(() => {
    return [...results].slice(-10).reverse();
  }, [results]);

  // Calculate leaderboards
  const leaderboards = useMemo(() => {
    const players = usePlayerStore.getState().players;
    const careerStats = usePlayerStore.getState().careerStats;

    // Get all players with current season stats
    const playersWithStats = Object.values(players)
      .map(player => ({
        ...player,
        seasonStats: careerStats[player.id]?.seasons[currentSeasonId] || null
      }))
      .filter(p => p.seasonStats && p.currentTeam); // Only players in teams with stats

    // Batting leaderboard (minimum 50 runs)
    const battingLeaders = playersWithStats
      .filter(p => p.seasonStats.runs >= 50)
      .sort((a, b) => b.seasonStats.runs - a.seasonStats.runs)
      .slice(0, 10);

    // Bowling leaderboard (minimum 5 wickets)
    const bowlingLeaders = playersWithStats
      .filter(p => p.seasonStats.wickets >= 5)
      .sort((a, b) => {
        // Sort by wickets first, then economy
        if (b.seasonStats.wickets !== a.seasonStats.wickets) {
          return b.seasonStats.wickets - a.seasonStats.wickets;
        }
        return a.seasonStats.economy - b.seasonStats.economy;
      })
      .slice(0, 10);

    // Fielding leaderboard (catches - we'll use a placeholder for now)
    const fieldingLeaders = playersWithStats
      .filter(p => p.seasonStats.catches && p.seasonStats.catches > 0)
      .sort((a, b) => (b.seasonStats.catches || 0) - (a.seasonStats.catches || 0))
      .slice(0, 10);

    return {
      batting: battingLeaders,
      bowling: bowlingLeaders,
      fielding: fieldingLeaders
    };
  }, [currentSeasonId]);

  // Tab content components
  const StandingsTable = () => (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4 border-b border-border-primary pb-2">
        <Trophy className="w-4 h-4 text-cricket-accent" />
        <h3 className="text-lg font-semibold text-text-primary">
          League Standings
        </h3>
        {stage !== 'league' && (
          <span className="ml-auto px-2 py-0.5 bg-bg-tertiary rounded text-xs uppercase tracking-wider text-text-secondary">
            {stage}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-text-secondary text-xs">
              <th className="text-left py-2 px-2 font-medium">#</th>
              <th className="text-left py-2 px-3 font-medium">Team</th>
              <th className="text-center py-2 px-2 font-medium">P</th>
              <th className="text-center py-2 px-2 font-medium">W</th>
              <th className="text-center py-2 px-2 font-medium">L</th>
              <th className="text-center py-2 px-2 font-medium">NRR</th>
              <th className="text-center py-2 px-2 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team, idx) => {
              const isPlayoffSpot = idx < 4;
              return (
                <tr
                  key={team.clubId}
                  className={`border-b border-border-secondary hover:bg-bg-secondary transition-colors ${
                    isPlayoffSpot ? 'bg-bg-tertiary/30' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-text-secondary font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 text-text-primary font-medium">
                    {team.clubName}
                  </td>
                  <td className="py-2 px-2 text-center text-text-primary font-mono text-xs">
                    {team.played}
                  </td>
                  <td className="py-2 px-2 text-center text-text-positive font-mono text-xs">
                    {team.won}
                  </td>
                  <td className="py-2 px-2 text-center text-text-negative font-mono text-xs">
                    {team.lost}
                  </td>
                  <td className={`py-2 px-2 text-center font-mono text-xs ${
                    team.netRunRate >= 0 ? 'text-text-positive' : 'text-text-negative'
                  }`}>
                    {team.netRunRate >= 0 ? '+' : ''}{team.netRunRate.toFixed(3)}
                  </td>
                  <td className="py-2 px-2 text-center text-cricket-accent font-bold font-mono">
                    {team.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {stage === 'league' && (
        <div className="mt-3 pt-3 border-t border-border-primary text-xs text-text-secondary">
          <span className="inline-block w-3 h-3 bg-bg-tertiary/30 rounded mr-2"></span>
          Top 4 teams qualify for playoffs
        </div>
      )}

      {champion && (
        <div className="mt-4 p-3 bg-cricket-primary/10 border border-cricket-accent rounded">
          <div className="flex items-center gap-2 text-cricket-accent">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold text-base">
              Season {currentSeason} Champion: {champion.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const FixturesView = () => (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4 border-b border-border-primary pb-2">
        <Calendar className="w-4 h-4 text-cricket-accent" />
        <h3 className="text-lg font-semibold text-text-primary">
          Upcoming Fixtures
        </h3>
      </div>

      {upcomingFixtures.length > 0 ? (
        <div className="space-y-2">
          {upcomingFixtures.map((fixture, idx) => (
            <div
              key={idx}
              className="p-3 border border-border-primary rounded hover:bg-bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-text-primary font-medium text-sm">
                      {clubs[fixture.homeTeam]?.name || fixture.homeTeam}
                    </span>
                    <span className="text-text-secondary text-xs">vs</span>
                    <span className="text-text-primary font-medium text-sm">
                      {clubs[fixture.awayTeam]?.name || fixture.awayTeam}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                    {fixture.venue && <span>{fixture.venue}</span>}
                    {fixture.date && <span>•</span>}
                    {fixture.date && <span>{fixture.date}</span>}
                    {fixture.matchday && (
                      <>
                        <span>•</span>
                        <span>Match {fixture.matchday}</span>
                      </>
                    )}
                  </div>
                </div>
                <button className="btn-secondary text-xs py-1 px-3">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary text-center py-8 text-sm">
          No upcoming fixtures
        </p>
      )}
    </div>
  );

  const ResultsView = () => (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4 border-b border-border-primary pb-2">
        <History className="w-4 h-4 text-cricket-accent" />
        <h3 className="text-lg font-semibold text-text-primary">
          Recent Results
        </h3>
      </div>

      {recentResults.length > 0 ? (
        <div className="space-y-2">
          {recentResults.map((result, idx) => {
            const homeTeamName = clubs[result.homeTeam]?.name || result.homeTeam;
            const awayTeamName = clubs[result.awayTeam]?.name || result.awayTeam;
            const winnerName = clubs[result.winner]?.name || result.winner;

            return (
              <div
                key={idx}
                className="p-3 border border-border-primary rounded hover:bg-bg-secondary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${
                        result.winner === result.homeTeam ? 'text-text-primary' : 'text-text-secondary'
                      }`}>
                        {homeTeamName}
                      </span>
                      <span className="font-mono text-text-primary">
                        {result.innings1?.totalScore || 0}/{result.innings1?.wickets || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${
                        result.winner === result.awayTeam ? 'text-text-primary' : 'text-text-secondary'
                      }`}>
                        {awayTeamName}
                      </span>
                      <span className="font-mono text-text-primary">
                        {result.innings2?.totalScore || 0}/{result.innings2?.wickets || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-cricket-accent border-t border-border-primary pt-2">
                  {winnerName} won by {result.margin}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-text-secondary text-center py-8 text-sm">
          No results yet
        </p>
      )}
    </div>
  );

  const LeaderboardsView = () => {
    const currentLeaders = leaderboards[leaderboardCategory] || [];

    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4 border-b border-border-primary pb-2">
          <Award className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-lg font-semibold text-text-primary">
            Player Leaderboards
          </h3>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setLeaderboardCategory('batting')}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              leaderboardCategory === 'batting'
                ? 'bg-cricket-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            Batting
          </button>
          <button
            onClick={() => setLeaderboardCategory('bowling')}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              leaderboardCategory === 'bowling'
                ? 'bg-cricket-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            Bowling
          </button>
          {leaderboards.fielding.length > 0 && (
            <button
              onClick={() => setLeaderboardCategory('fielding')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                leaderboardCategory === 'fielding'
                  ? 'bg-cricket-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              Fielding
            </button>
          )}
        </div>

        {/* Leaderboard Table */}
        {currentLeaders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-text-secondary text-xs">
                  <th className="text-left py-2 px-2 font-medium">#</th>
                  <th className="text-left py-2 px-3 font-medium">Player</th>
                  <th className="text-left py-2 px-2 font-medium">Team</th>
                  {leaderboardCategory === 'batting' && (
                    <>
                      <th className="text-center py-2 px-2 font-medium">Runs</th>
                      <th className="text-center py-2 px-2 font-medium">Avg</th>
                      <th className="text-center py-2 px-2 font-medium">SR</th>
                    </>
                  )}
                  {leaderboardCategory === 'bowling' && (
                    <>
                      <th className="text-center py-2 px-2 font-medium">Wkts</th>
                      <th className="text-center py-2 px-2 font-medium">Avg</th>
                      <th className="text-center py-2 px-2 font-medium">Econ</th>
                    </>
                  )}
                  {leaderboardCategory === 'fielding' && (
                    <>
                      <th className="text-center py-2 px-2 font-medium">Catches</th>
                      <th className="text-center py-2 px-2 font-medium">Matches</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentLeaders.map((player, idx) => (
                  <tr
                    key={player.id}
                    className="border-b border-border-secondary hover:bg-bg-secondary transition-colors"
                  >
                    <td className="py-2 px-2 text-text-secondary font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 text-text-primary font-medium">
                      {player.name}
                    </td>
                    <td className="py-2 px-2 text-text-secondary text-xs">
                      {clubs[player.currentTeam]?.shortName || clubs[player.currentTeam]?.name || player.currentTeam}
                    </td>
                    {leaderboardCategory === 'batting' && (
                      <>
                        <td className="py-2 px-2 text-center text-cricket-accent font-bold font-mono">
                          {player.seasonStats.runs}
                        </td>
                        <td className="py-2 px-2 text-center text-text-primary font-mono text-xs">
                          {player.seasonStats.battingAvg.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center text-text-primary font-mono text-xs">
                          {player.seasonStats.strikeRate.toFixed(2)}
                        </td>
                      </>
                    )}
                    {leaderboardCategory === 'bowling' && (
                      <>
                        <td className="py-2 px-2 text-center text-cricket-accent font-bold font-mono">
                          {player.seasonStats.wickets}
                        </td>
                        <td className="py-2 px-2 text-center text-text-primary font-mono text-xs">
                          {player.seasonStats.bowlingAvg.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center text-text-primary font-mono text-xs">
                          {player.seasonStats.economy.toFixed(2)}
                        </td>
                      </>
                    )}
                    {leaderboardCategory === 'fielding' && (
                      <>
                        <td className="py-2 px-2 text-center text-cricket-accent font-bold font-mono">
                          {player.seasonStats.catches || 0}
                        </td>
                        <td className="py-2 px-2 text-center text-text-primary font-mono text-xs">
                          {player.seasonStats.matches}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8 text-sm">
            {leaderboardCategory === 'batting' && 'No batting statistics yet (min. 50 runs)'}
            {leaderboardCategory === 'bowling' && 'No bowling statistics yet (min. 5 wickets)'}
            {leaderboardCategory === 'fielding' && 'No fielding statistics yet'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-primary pb-3">
        <h1 className="text-3xl font-semibold text-text-primary">League</h1>
        <div className="text-text-secondary text-sm">
          {seasonName || `Season ${currentSeason}`}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-border-primary">
        <button
          onClick={() => setActiveTab('standings')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'standings'
              ? 'border-cricket-accent text-cricket-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>Standings</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('fixtures')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'fixtures'
              ? 'border-cricket-accent text-cricket-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Fixtures</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'results'
              ? 'border-cricket-accent text-cricket-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Results</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('leaderboards')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'leaderboards'
              ? 'border-cricket-accent text-cricket-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>Leaderboards</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'standings' && <StandingsTable />}
        {activeTab === 'fixtures' && <FixturesView />}
        {activeTab === 'results' && <ResultsView />}
        {activeTab === 'leaderboards' && <LeaderboardsView />}
      </div>
    </div>
  );
};

export default League;
