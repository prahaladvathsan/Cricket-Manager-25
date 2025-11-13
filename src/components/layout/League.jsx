/**
 * @file League.jsx
 * @description League standings, fixtures, results, and player leaderboards
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  History,
  Award,
  List,
  CalendarDays
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useGameStore from '../../stores/gameStore';
import SeasonProgress from '../league/SeasonProgress';
import PlayerCardModal from '../shared/PlayerCardModal';
import TeamName from '../shared/TeamName';

const League = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('standings');
  const [leaderboardCategory, setLeaderboardCategory] = useState('batting');
  const [fixturesView, setFixturesView] = useState('list'); // 'list' or 'calendar'
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

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

  // Group fixtures by month for calendar view
  const fixturesByMonth = useMemo(() => {
    const grouped = {};

    fixtures.forEach(fixture => {
      if (!fixture.date) return;

      const date = new Date(fixture.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          fixtures: {}
        };
      }

      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[monthKey].fixtures[dateKey]) {
        grouped[monthKey].fixtures[dateKey] = [];
      }
      grouped[monthKey].fixtures[dateKey].push(fixture);
    });

    return grouped;
  }, [fixtures]);

  // Generate calendar grid for a month
  const generateCalendarGrid = (year, month, monthFixtures) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const grid = [];
    let week = [];

    // Fill leading empty days
    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }

    // Fill month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayFixtures = monthFixtures[dateKey] || [];

      week.push({
        day,
        date: dateKey,
        fixtures: dayFixtures,
        isToday: false // Can enhance later
      });

      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }

    // Fill trailing empty days
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      grid.push(week);
    }

    return grid;
  };

  // Get all fixtures sorted by matchday
  const allFixtures = useMemo(() => {
    return [...fixtures].sort((a, b) => (a.matchday || 0) - (b.matchday || 0));
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {/* Season Progress (Right Sidebar) */}
      <div className="lg:col-span-1 order-first lg:order-last">
        <SeasonProgress />
      </div>

      {/* Standings Table (Main Content) */}
      <div className="lg:col-span-2">
        <div className="card p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
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
                        <TeamName teamId={team.clubId} inline={true} />
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
                  Season {currentSeason} Champion: <TeamName teamId={champion.id} inline={true} className="font-bold" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const FixturesView = () => (
    <div className="card p-2">
      <div className="flex items-center justify-between mb-2 border-b border-border-primary pb-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-lg font-semibold text-text-primary">
            Fixture Schedule
          </h3>
          <span className="text-xs text-text-secondary">({allFixtures.length} matches)</span>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-bg-tertiary rounded p-1">
          <button
            onClick={() => setFixturesView('list')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
              fixturesView === 'list'
                ? 'bg-cricket-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <List className="w-3 h-3" />
            List
          </button>
          <button
            onClick={() => setFixturesView('calendar')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
              fixturesView === 'calendar'
                ? 'bg-cricket-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            Calendar
          </button>
        </div>
      </div>

      {allFixtures.length > 0 ? (
        <>
          {/* List View */}
          {fixturesView === 'list' && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {allFixtures.map((fixture, idx) => {
                const isCompleted = fixture.status === 'completed';
                const isScheduled = fixture.status === 'scheduled' || !fixture.status;

                return (
                  <div
                    key={idx}
                    className={`p-3 border rounded transition-colors ${
                      isCompleted
                        ? 'border-border-secondary bg-bg-tertiary/50'
                        : 'border-border-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-text-tertiary px-1.5 py-0.5 bg-bg-tertiary rounded">
                            MD {fixture.matchday}
                          </span>
                          {fixture.date && (
                            <span className="text-xs text-text-secondary">
                              {fixture.date}
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-xs text-cricket-accent font-medium">
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <TeamName teamId={fixture.homeTeam} variant="short" inline={true} className="font-medium text-sm" />
                          <span className="text-text-secondary text-xs font-bold">vs</span>
                          <TeamName teamId={fixture.awayTeam} variant="short" inline={true} className="font-medium text-sm" />
                        </div>
                        {fixture.venue && (
                          <div className="text-xs text-text-secondary mt-1">
                            {fixture.venue}
                          </div>
                        )}
                      </div>
                      {isScheduled && (
                        <button
                          className="btn-secondary text-xs py-1 px-3"
                          onClick={() => navigate(`/game/match/${fixture.matchId}/preview`)}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Calendar View */}
          {fixturesView === 'calendar' && (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {Object.keys(fixturesByMonth)
                .sort()
                .map(monthKey => {
                  const monthData = fixturesByMonth[monthKey];
                  const [year, month] = monthKey.split('-').map(Number);
                  const calendarGrid = generateCalendarGrid(year, month - 1, monthData.fixtures);

                  return (
                    <div key={monthKey} className="border border-border-primary rounded-lg overflow-hidden">
                      {/* Month Header */}
                      <div className="bg-bg-tertiary px-4 py-2 border-b border-border-primary">
                        <h4 className="text-base font-semibold text-text-primary">
                          {monthData.monthName}
                        </h4>
                      </div>

                      {/* Calendar Grid */}
                      <div className="p-3">
                        {/* Day of Week Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div
                              key={day}
                              className="text-center text-xs font-semibold text-text-secondary py-1"
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarGrid.map((week, weekIdx) =>
                            week.map((dayData, dayIdx) => {
                              if (!dayData) {
                                return (
                                  <div
                                    key={`empty-${weekIdx}-${dayIdx}`}
                                    className="h-16 bg-bg-tertiary/20 rounded"
                                  />
                                );
                              }

                              const hasFixtures = dayData.fixtures.length > 0;

                              return (
                                <div
                                  key={dayData.date}
                                  className={`h-16 border rounded transition-colors ${
                                    hasFixtures
                                      ? 'border-cricket-accent/30 bg-cricket-accent/5 hover:bg-cricket-accent/10'
                                      : 'border-border-primary bg-bg-secondary'
                                  }`}
                                >
                                  <div className="p-1 h-full flex flex-col">
                                    {/* Day Number */}
                                    <div className={`text-xs font-semibold mb-0.5 ${
                                      hasFixtures ? 'text-cricket-accent' : 'text-text-secondary'
                                    }`}>
                                      {dayData.day}
                                    </div>

                                    {/* Fixtures */}
                                    {hasFixtures && (
                                      <div className="flex-1 space-y-0.5 overflow-hidden">
                                        {dayData.fixtures.map((fixture, idx) => {
                                          const isCompleted = fixture.status === 'completed';

                                          return (
                                            <div
                                              key={idx}
                                              className={`text-xxs px-1 py-0.5 rounded truncate leading-tight ${
                                                isCompleted
                                                  ? 'bg-bg-tertiary text-text-secondary'
                                                  : 'bg-cricket-primary/20 text-cricket-accent'
                                              }`}
                                              title={`${clubs[fixture.homeTeam]?.shortName || 'TBD'} vs ${clubs[fixture.awayTeam]?.shortName || 'TBD'}`}
                                            >
                                              {clubs[fixture.homeTeam]?.shortName?.slice(0, 3) || 'TBD'} v {clubs[fixture.awayTeam]?.shortName?.slice(0, 3) || 'TBD'}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {Object.keys(fixturesByMonth).length === 0 && (
                <p className="text-text-secondary text-center py-8 text-sm">
                  No fixtures with dates available
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-text-secondary text-center py-8 text-sm">
          No fixtures scheduled
        </p>
      )}
    </div>
  );

  const ResultsView = () => (
    <div className="card p-2">
      <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
        <History className="w-4 h-4 text-cricket-accent" />
        <h3 className="text-lg font-semibold text-text-primary">
          Recent Results
        </h3>
      </div>

      {recentResults.length > 0 ? (
        <div className="space-y-2">
          {recentResults.map((result, idx) => {
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
                        <TeamName teamId={result.homeTeam} inline={true} showHoverEffect={result.winner === result.homeTeam} />
                      </span>
                      <span className="font-mono text-text-primary">
                        {result.innings1?.totalScore || 0}/{result.innings1?.wickets || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${
                        result.winner === result.awayTeam ? 'text-text-primary' : 'text-text-secondary'
                      }`}>
                        <TeamName teamId={result.awayTeam} inline={true} showHoverEffect={result.winner === result.awayTeam} />
                      </span>
                      <span className="font-mono text-text-primary">
                        {result.innings2?.totalScore || 0}/{result.innings2?.wickets || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-cricket-accent border-t border-border-primary pt-2">
                  <TeamName teamId={result.winner} inline={true} /> won by {result.margin}
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
      <div className="card p-2">
        <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
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
                    <td className="py-2 px-3">
                      <span
                        className="text-cricket-accent hover:underline cursor-pointer font-medium"
                        onClick={() => {
                          setSelectedPlayerId(player.id);
                          setShowPlayerModal(true);
                        }}
                      >
                        {player.name}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-text-secondary text-xs">
                      <TeamName teamId={player.currentTeam} variant="short" inline={true} className="text-xs" />
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
    <div className="space-y-2">
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

      {/* Player Card Modal */}
      <PlayerCardModal
        isOpen={showPlayerModal}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayerId(null);
        }}
        playerId={selectedPlayerId}
      />
    </div>
  );
};

export default League;
