/**
 * @file Matches.jsx
 * @description User team fixtures and results page
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, History, PlayCircle, Trophy, MapPin, Clock } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import TeamName from '../shared/TeamName';

const Matches = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getUserTeam } = useTeamStore();
  const { fixtures, results, clubs } = useLeagueStore();
  const [activeTab, setActiveTab] = useState('fixtures');

  const userTeam = getUserTeam();

  // Handle tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'results' || tabParam === 'fixtures') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Filter fixtures for user team only
  const userFixtures = useMemo(() => {
    if (!userTeam) return [];
    return fixtures
      .filter(f => f.homeTeam === userTeam.id || f.awayTeam === userTeam.id)
      .filter(f => f.status === 'scheduled' || !f.status)
      .sort((a, b) => (a.matchday || 0) - (b.matchday || 0));
  }, [fixtures, userTeam]);

  // Filter results for user team only
  const userResults = useMemo(() => {
    if (!userTeam) return [];
    return results
      .filter(r => r.homeTeam === userTeam.id || r.awayTeam === userTeam.id)
      .sort((a, b) => (b.matchday || 0) - (a.matchday || 0));
  }, [results, userTeam]);

  // Calculate user team stats
  const userStats = useMemo(() => {
    if (!userTeam || userResults.length === 0) {
      return { played: 0, wins: 0, losses: 0, nrr: 0 };
    }

    const wins = userResults.filter(r => r.winner === userTeam.id).length;
    const losses = userResults.filter(r => r.winner && r.winner !== userTeam.id).length;

    // Calculate NRR
    let runsScored = 0, ballsFaced = 0, runsConceded = 0, ballsBowled = 0;

    userResults.forEach(result => {
      const isHome = result.homeTeam === userTeam.id;
      const ourInnings = isHome ? result.innings1 : result.innings2;
      const theirInnings = isHome ? result.innings2 : result.innings1;

      if (ourInnings) {
        runsScored += ourInnings.totalScore || 0;
        ballsFaced += ourInnings.ballsBowled || 120; // Default to full 20 overs
      }
      if (theirInnings) {
        runsConceded += theirInnings.totalScore || 0;
        ballsBowled += theirInnings.ballsBowled || 120;
      }
    });

    const nrr = ballsFaced > 0 && ballsBowled > 0
      ? (runsScored / ballsFaced * 6) - (runsConceded / ballsBowled * 6)
      : 0;

    return {
      played: userResults.length,
      wins,
      losses,
      nrr
    };
  }, [userResults, userTeam]);

  const tabs = [
    { id: 'fixtures', label: 'Fixtures', count: userFixtures.length },
    { id: 'results', label: 'Results', count: userResults.length },
  ];

  return (
    <div className="space-y-2">
      <h1 className="sr-only">Fixtures & Results</h1>
      {/* Quick Stats */}
      {userTeam && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-text-primary">{userStats.played}</div>
            <div className="text-text-secondary text-sm">Matches Played</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-status-win">{userStats.wins}</div>
            <div className="text-text-secondary text-sm">Wins</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-2xl font-bold text-status-loss">{userStats.losses}</div>
            <div className="text-text-secondary text-sm">Losses</div>
          </div>
          <div className="card p-2 text-center">
            <div className={`text-2xl font-bold ${userStats.nrr >= 0 ? 'text-status-win' : 'text-status-loss'}`}>
              {userStats.nrr >= 0 ? '+' : ''}{userStats.nrr.toFixed(3)}
            </div>
            <div className="text-text-secondary text-sm">Net Run Rate</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? 'border-cricket-primary text-cricket-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-transparent border border-white/10 rounded text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card p-2">
        {activeTab === 'fixtures' && (
          <>
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
              <Calendar className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Upcoming Fixtures
              </h3>
            </div>

            {userFixtures.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {userFixtures.map((fixture, idx) => {
                  const isHome = fixture.homeTeam === userTeam?.id;
                  const opponent = isHome
                    ? clubs[fixture.awayTeam]
                    : clubs[fixture.homeTeam];

                  return (
                    <div
                      key={idx}
                      className="p-3 border border-border-primary rounded hover:bg-bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-text-tertiary px-1.5 py-0.5 bg-transparent border border-white/10 rounded">
                              MD {fixture.matchday}
                            </span>
                            {fixture.date && (
                              <span className="text-xs text-text-secondary">
                                {fixture.date}
                              </span>
                            )}
                            <span className={`text-xs font-medium ${isHome ? 'text-cricket-accent' : 'text-blue-400'
                              }`}>
                              {isHome ? 'Home' : 'Away'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary text-sm font-medium">vs</span>
                            <TeamName teamId={isHome ? fixture.awayTeam : fixture.homeTeam} inline={true} showTeamAsset="icon" className="font-semibold" />
                          </div>
                          {fixture.venue && (
                            <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{fixture.venue}</span>
                            </div>
                          )}
                        </div>
                        <button
                          className="btn-secondary text-xs py-1 px-2"
                          onClick={() => navigate(`/game/match/${fixture.matchId}/preview`)}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-secondary">No upcoming fixtures</p>
                <p className="text-sm text-text-tertiary mt-2">
                  Complete the auction to generate the season schedule
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'results' && (
          <>
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
              <History className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Match Results
              </h3>
            </div>

            {userResults.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {userResults.map((result, idx) => {
                  const isHome = result.homeTeam === userTeam?.id;
                  const opponent = isHome
                    ? clubs[result.awayTeam]
                    : clubs[result.homeTeam];
                  const won = result.winner === userTeam?.id;
                  const ourInnings = isHome ? result.innings1 : result.innings2;
                  const theirInnings = isHome ? result.innings2 : result.innings1;

                  return (
                    <div
                      key={idx}
                      className={`p-3 border rounded transition-colors ${won
                          ? 'border-status-win/30 bg-status-win/5'
                          : 'border-status-loss/30 bg-status-loss/5'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-text-tertiary px-1.5 py-0.5 bg-transparent border border-white/10 rounded">
                            MD {result.matchday || idx + 1}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${won
                              ? 'bg-status-win/20 text-status-win'
                              : 'bg-status-loss/20 text-status-loss'
                            }`}>
                            {won ? 'WON' : 'LOST'}
                          </span>
                        </div>
                        {result.date && (
                          <span className="text-xs text-text-secondary">
                            {result.date}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <TeamName teamId={userTeam?.id} inline={true} showTeamAsset="icon" className="font-medium" />
                          <span className="font-mono text-text-primary">
                            {ourInnings?.totalScore || 0}/{ourInnings?.wickets || 0}
                            {ourInnings?.ballsBowled && (
                              <span className="text-text-tertiary text-xs ml-1">
                                ({Math.floor((ourInnings.ballsBowled || 0) / 6)}.{(ourInnings.ballsBowled || 0) % 6})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <TeamName teamId={isHome ? result.awayTeam : result.homeTeam} inline={true} showTeamAsset="icon" className={won ? 'text-text-secondary' : ''} showHoverEffect={!won} />
                          <span className="font-mono text-text-secondary">
                            {theirInnings?.totalScore || 0}/{theirInnings?.wickets || 0}
                            {theirInnings?.ballsBowled && (
                              <span className="text-text-tertiary text-xs ml-1">
                                ({Math.floor((theirInnings.ballsBowled || 0) / 6)}.{(theirInnings.ballsBowled || 0) % 6})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      {result.margin && (
                        <div className={`text-xs mt-2 pt-2 border-t ${won ? 'border-status-win/20 text-status-win' : 'border-status-loss/20 text-status-loss'
                          }`}>
                          {result.margin}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-secondary">No matches played yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Matches;
