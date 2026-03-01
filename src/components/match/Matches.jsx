/**
 * @file Matches.jsx
 * @description User team fixtures, results, and player statistics page
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, History, MapPin, BarChart3, Users } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import TeamName from '../shared/TeamName';
import PlayerName from '../shared/PlayerName';
import MatchAnalysisDrawer from './MatchAnalysisDrawer';
import PlayerCardModal from '../shared/PlayerCardModal';
import { aggregateStats } from '../../utils/matchAnalytics';

// ─── Season Stats aggregation ────────────────────────────────────────────────

function buildSeasonStats(results, userTeamId, players) {
  const batting = {};  // playerId -> { runs, balls, dismissed, fours, sixes, innings }
  const bowling = {};  // playerId -> { runs, balls, wickets, dots, innings }

  for (const result of results) {
    if (!result.analytics) continue;
    for (const inn of result.analytics.innings || []) {
      const isBattingTeam = inn.battingTeamId === userTeamId;
      const isBowlingTeam = inn.bowlingTeamId === userTeamId;

      for (const [playerId, pdata] of Object.entries(inn.players || {})) {
        // Batting stats — only collect when this player's team batted
        if (isBattingTeam && pdata.batting?.length) {
          const agg = aggregateStats(pdata.batting, {});
          if (!batting[playerId]) batting[playerId] = { runs: 0, balls: 0, dismissed: 0, fours: 0, sixes: 0, innings: 0 };
          batting[playerId].runs += agg.runs;
          batting[playerId].balls += agg.balls;
          batting[playerId].dismissed += agg.dismissed || 0;
          batting[playerId].fours += agg.fours;
          batting[playerId].sixes += agg.sixes;
          if (agg.balls > 0) batting[playerId].innings += 1;
        }

        // Bowling stats — only collect when this player's team bowled
        if (isBowlingTeam && pdata.bowling?.length) {
          const agg = aggregateStats(pdata.bowling, {});
          if (!bowling[playerId]) bowling[playerId] = { runs: 0, balls: 0, wickets: 0, dots: 0, innings: 0 };
          bowling[playerId].runs += agg.runs;
          bowling[playerId].balls += agg.balls;
          bowling[playerId].wickets += agg.wickets;
          bowling[playerId].dots += agg.dots;
          if (agg.balls > 0) bowling[playerId].innings += 1;
        }
      }
    }
  }

  return { batting, bowling };
}

// ─── Statistics Tab ───────────────────────────────────────────────────────────

const StatisticsTab = ({ results, userTeamId, onPlayerClick }) => {
  const { players } = usePlayerStore();
  const [statsView, setStatsView] = useState('batting');
  const [sortKey, setSortKey] = useState('runs');
  const [sortDir, setSortDir] = useState('desc');

  const seasonStats = useMemo(
    () => buildSeasonStats(results, userTeamId, players),
    [results, userTeamId, players]
  );

  const hasData = Object.keys(seasonStats.batting).length > 0 || Object.keys(seasonStats.bowling).length > 0;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const thCls = 'text-right pb-1 text-text-tertiary font-medium cursor-pointer select-none hover:text-text-primary transition-colors';
  const thLCls = 'text-left pb-1 text-text-tertiary font-medium';
  const tdCls = 'py-1 text-right font-mono text-white/80';
  const tdLCls = 'py-1 text-left';

  const SortIndicator = ({ col }) => sortKey === col
    ? <span className="ml-0.5 text-cricket-accent">{sortDir === 'desc' ? '↓' : '↑'}</span>
    : null;

  if (!hasData) {
    return (
      <div className="text-center py-12">
        <Users className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
        <p className="text-text-secondary">No statistics yet</p>
        <p className="text-sm text-text-tertiary mt-1">Play matches to see player statistics here</p>
      </div>
    );
  }

  // ── Batting table ──
  if (statsView === 'batting') {
    const rows = Object.entries(seasonStats.batting)
      .map(([playerId, s]) => {
        const sr = s.balls > 0 ? (s.runs / s.balls * 100) : 0;
        const avg = s.dismissed > 0 ? (s.runs / s.dismissed) : s.runs;
        return { playerId, ...s, sr, avg };
      })
      .filter(r => r.innings > 0)
      .sort((a, b) => sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);

    return (
      <div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setStatsView('batting'); setSortKey('runs'); setSortDir('desc'); }}
            className={`text-xs px-3 py-1 rounded border transition-colors ${statsView === 'batting' ? 'border-cricket-accent text-cricket-accent bg-cricket-accent/10' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}>
            Batting
          </button>
          <button onClick={() => { setStatsView('bowling'); setSortKey('wickets'); setSortDir('desc'); }}
            className={`text-xs px-3 py-1 rounded border transition-colors ${statsView === 'bowling' ? 'border-cricket-accent text-cricket-accent bg-cricket-accent/10' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}>
            Bowling
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-primary">
                <th className={thLCls}>Player</th>
                <th className={thCls} onClick={() => handleSort('innings')}>Inn<SortIndicator col="innings" /></th>
                <th className={thCls} onClick={() => handleSort('runs')}>Runs<SortIndicator col="runs" /></th>
                <th className={thCls} onClick={() => handleSort('avg')}>Avg<SortIndicator col="avg" /></th>
                <th className={thCls} onClick={() => handleSort('sr')}>SR<SortIndicator col="sr" /></th>
                <th className={thCls} onClick={() => handleSort('fours')}>4s<SortIndicator col="fours" /></th>
                <th className={thCls} onClick={() => handleSort('sixes')}>6s<SortIndicator col="sixes" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.playerId} className="border-b border-border-primary/30 hover:bg-bg-secondary cursor-pointer"
                  onClick={() => onPlayerClick(r.playerId)}>
                  <td className={tdLCls}><PlayerName playerId={r.playerId} /></td>
                  <td className={tdCls}>{r.innings}</td>
                  <td className={`${tdCls} text-trophy-gold font-bold`}>{r.runs}</td>
                  <td className={tdCls}>{r.avg.toFixed(1)}</td>
                  <td className={`${tdCls} ${r.sr >= 150 ? 'text-green-300' : r.sr >= 120 ? 'text-blue-300' : 'text-white/60'}`}>{r.sr.toFixed(1)}</td>
                  <td className={`${tdCls} text-blue-300`}>{r.fours}</td>
                  <td className={`${tdCls} text-purple-300`}>{r.sixes}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-text-tertiary">No batting data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Bowling table ──
  const rows = Object.entries(seasonStats.bowling)
    .map(([playerId, s]) => {
      const overs = Math.floor(s.balls / 6) + (s.balls % 6) / 10;
      const econ = s.balls > 0 ? (s.runs / s.balls * 6) : 0;
      const avg = s.wickets > 0 ? (s.runs / s.wickets) : null;
      const dotPct = s.balls > 0 ? (s.dots / s.balls * 100) : 0;
      return { playerId, ...s, overs, econ, avg, dotPct };
    })
    .filter(r => r.innings > 0)
    .sort((a, b) => sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => { setStatsView('batting'); setSortKey('runs'); setSortDir('desc'); }}
          className={`text-xs px-3 py-1 rounded border transition-colors ${statsView === 'batting' ? 'border-cricket-accent text-cricket-accent bg-cricket-accent/10' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}>
          Batting
        </button>
        <button onClick={() => { setStatsView('bowling'); setSortKey('wickets'); setSortDir('desc'); }}
          className={`text-xs px-3 py-1 rounded border transition-colors ${statsView === 'bowling' ? 'border-cricket-accent text-cricket-accent bg-cricket-accent/10' : 'border-border-primary text-text-secondary hover:text-text-primary'}`}>
          Bowling
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-primary">
              <th className={thLCls}>Player</th>
              <th className={thCls} onClick={() => handleSort('innings')}>Inn<SortIndicator col="innings" /></th>
              <th className={thCls} onClick={() => handleSort('wickets')}>Wkts<SortIndicator col="wickets" /></th>
              <th className={thCls} onClick={() => handleSort('econ')}>Econ<SortIndicator col="econ" /></th>
              <th className={thCls} onClick={() => handleSort('avg')}>Avg<SortIndicator col="avg" /></th>
              <th className={thCls} onClick={() => handleSort('dotPct')}>Dot%<SortIndicator col="dotPct" /></th>
              <th className={thCls} onClick={() => handleSort('runs')}>Runs<SortIndicator col="runs" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.playerId} className="border-b border-border-primary/30 hover:bg-bg-secondary cursor-pointer"
                onClick={() => onPlayerClick(r.playerId)}>
                <td className={tdLCls}><PlayerName playerId={r.playerId} /></td>
                <td className={tdCls}>{r.innings}</td>
                <td className={`${tdCls} text-trophy-gold font-bold`}>{r.wickets}</td>
                <td className={`${tdCls} ${r.econ < 7 ? 'text-green-300' : r.econ < 9 ? 'text-blue-300' : 'text-red-400'}`}>{r.econ.toFixed(2)}</td>
                <td className={tdCls}>{r.avg != null ? r.avg.toFixed(1) : '—'}</td>
                <td className={`${tdCls} text-blue-300`}>{r.dotPct.toFixed(0)}%</td>
                <td className={tdCls}>{r.runs}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-center text-text-tertiary">No bowling data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Matches = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getUserTeam } = useTeamStore();
  const { fixtures, results, clubs } = useLeagueStore();
  const [activeTab, setActiveTab] = useState('fixtures');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyticsPlayerId, setAnalyticsPlayerId] = useState(null);

  const userTeam = getUserTeam();

  // Handle tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (['results', 'fixtures', 'statistics'].includes(tabParam)) {
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

    let runsScored = 0, ballsFaced = 0, runsConceded = 0, ballsBowled = 0;

    userResults.forEach(result => {
      const isHome = result.homeTeam === userTeam.id;
      const ourInnings = isHome ? result.innings1 : result.innings2;
      const theirInnings = isHome ? result.innings2 : result.innings1;

      if (ourInnings) {
        runsScored += ourInnings.totalScore || 0;
        ballsFaced += ourInnings.ballsBowled || 120;
      }
      if (theirInnings) {
        runsConceded += theirInnings.totalScore || 0;
        ballsBowled += theirInnings.ballsBowled || 120;
      }
    });

    const nrr = ballsFaced > 0 && ballsBowled > 0
      ? (runsScored / ballsFaced * 6) - (runsConceded / ballsBowled * 6)
      : 0;

    return { played: userResults.length, wins, losses, nrr };
  }, [userResults, userTeam]);

  const tabs = [
    { id: 'fixtures', label: 'Fixtures', count: userFixtures.length },
    { id: 'results', label: 'Results', count: userResults.length },
    { id: 'statistics', label: 'Statistics', count: null },
  ];

  return (<>
    <div className="space-y-2">
      <h1 className="sr-only">Stats</h1>
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
                            <span className={`text-xs font-medium ${isHome ? 'text-cricket-accent' : 'text-blue-400'}`}>
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
                        <div className={`text-xs mt-2 pt-2 border-t flex items-center justify-between ${won ? 'border-status-win/20 text-status-win' : 'border-status-loss/20 text-status-loss'}`}>
                          <span>{result.margin}</span>
                          {result.analytics && (
                            <button
                              onClick={e => { e.stopPropagation(); setAnalysisResult(result); }}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary hover:text-cricket-accent border border-border-primary hover:border-cricket-accent transition-colors"
                            >
                              <BarChart3 className="w-3 h-3" />
                              Analyse
                            </button>
                          )}
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

        {activeTab === 'statistics' && (
          <>
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
              <BarChart3 className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Season Statistics
              </h3>
            </div>
            <StatisticsTab
              results={userResults}
              userTeamId={userTeam?.id}
              onPlayerClick={pid => setAnalyticsPlayerId(pid)}
            />
          </>
        )}
      </div>
    </div>

    {/* Match Analysis Drawer (portal-based, renders at document.body) */}
    <MatchAnalysisDrawer
      isOpen={!!analysisResult}
      onClose={() => setAnalysisResult(null)}
      result={analysisResult}
      onPlayerClick={pid => setAnalyticsPlayerId(pid)}
    />

    {/* Player Card Modal opened from drawer or stats table */}
    <PlayerCardModal
      isOpen={!!analyticsPlayerId}
      onClose={() => setAnalyticsPlayerId(null)}
      playerId={analyticsPlayerId}
      initialTab="analytics"
    />
    </>
  );
};

export default Matches;
