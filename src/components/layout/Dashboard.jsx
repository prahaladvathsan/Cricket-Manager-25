/**
 * @file Dashboard.jsx
 * @description Main dashboard with season overview using new design system
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Trophy,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  MapPin,
  Clock,
  ChevronRight
} from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useFinanceStore from '../../stores/financeStore';
import useGameController from '../../hooks/useGameController';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentSeason, currentPhase, currentWeek } = useGameStore();
  const { getUserTeam } = useTeamStore();
  const userTeam = getUserTeam();

  // Get game controller
  const { nextEvent } = useGameController();

  // Get league data
  const standings = useLeagueStore(state => state.standings);
  const fixtures = useLeagueStore(state => state.fixtures);
  const results = useLeagueStore(state => state.results);

  // Get squad data
  const squad = usePlayerStore(state =>
    userTeam ? state.getPlayersByTeam(userTeam.id) : []
  );

  // Get finances
  const finances = useFinanceStore(state =>
    userTeam ? state.getTeamFinances(userTeam.id) : null
  );

  // Find next match
  const nextMatch = fixtures.find(f =>
    (f.homeTeam === userTeam?.id || f.awayTeam === userTeam?.id) &&
    f.status === 'upcoming'
  );

  // Get user team standing
  const userStanding = standings.find(s => s.clubId === userTeam?.id);

  // Get recent results (last 5)
  const recentResults = results
    .filter(r => r.homeTeam === userTeam?.id || r.awayTeam === userTeam?.id)
    .slice(-5);

  // Handle Continue button based on next event
  const handleContinue = () => {
    if (!nextEvent) return;

    switch (nextEvent.type) {
      case 'team_selection':
        navigate('/team-selection');
        break;
      case 'auction':
        navigate('/game/auction');
        break;
      case 'match':
      case 'playoff_match':
        // Navigate to match with data
        navigate('/game/match', { state: { matchData: nextEvent.data } });
        break;
      case 'season_start':
      case 'league_end':
      case 'season_end':
        // Show modal or navigate to season summary
        console.log(nextEvent.message);
        break;
      default:
        console.log('No action for event:', nextEvent.type);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header - More compact */}
      <div className="flex items-center justify-between border-b border-border-primary pb-3">
        <h1 className="text-3xl font-semibold text-text-primary">Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-text-secondary text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Season {currentSeason} • Week {currentWeek}</span>
            <span className="px-2 py-0.5 bg-bg-tertiary rounded text-xs uppercase tracking-wider">
              {currentPhase}
            </span>
          </div>
          {userTeam && nextEvent && nextEvent.type !== 'idle' && (
            <button
              onClick={handleContinue}
              className="btn-primary flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              {nextEvent.message}
            </button>
          )}
        </div>
      </div>

      {/* Team Selection - Show if no team */}
      {!userTeam && (
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            Welcome to Cricket Manager
          </h2>
          <p className="text-text-secondary mb-6 text-lg">
            Choose your team to begin your World Premier League management journey.
          </p>
          <button className="btn-primary">
            Select Team
          </button>
        </div>
      )}

      {/* Dashboard Grid - Show if team selected */}
      {userTeam && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Next Match Card - Spans 2 columns */}
          <div className="card p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
              <Calendar className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Next Match
              </h3>
            </div>
            {nextMatch ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="text-text-primary font-semibold">
                    {nextMatch.homeTeam === userTeam.id ? userTeam.name : 'Opponent'}
                  </div>
                  <div className="text-text-secondary text-lg font-bold">VS</div>
                  <div className="text-text-primary font-semibold">
                    {nextMatch.awayTeam === userTeam.id ? userTeam.name : 'Opponent'}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{nextMatch.venue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{nextMatch.date}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="btn-primary flex-1 text-sm py-2">View Match</button>
                  <button className="btn-secondary flex-1 text-sm py-2">Set Tactics</button>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary text-center py-6 text-sm">
                No upcoming matches scheduled
              </p>
            )}
          </div>

          {/* League Position */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
              <Trophy className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                League Position
              </h3>
            </div>
            {userStanding ? (
              <div className="space-y-2">
                <div className="text-center py-1">
                  <div className="text-4xl font-bold text-cricket-accent">
                    #{standings.findIndex(s => s.clubId === userTeam.id) + 1}
                  </div>
                  <div className="text-text-secondary text-xs mt-1">
                    {userStanding.points} points
                  </div>
                </div>
                <div className="space-y-0.5 text-xs pt-2 border-t border-border-primary">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Played</span>
                    <span className="text-text-primary font-mono">{userStanding.played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Won</span>
                    <span className="text-text-positive font-mono">{userStanding.won}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Lost</span>
                    <span className="text-text-negative font-mono">{userStanding.lost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">NRR</span>
                    <span className={`font-mono ${userStanding.netRunRate >= 0 ? 'text-text-positive' : 'text-text-negative'}`}>
                      {userStanding.netRunRate >= 0 ? '+' : ''}{userStanding.netRunRate.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary text-center py-6 text-sm">
                Season not started
              </p>
            )}
          </div>

          {/* Squad Status */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
              <Users className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Squad Status
              </h3>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Players</span>
                  <span className="text-text-primary font-mono font-medium">{squad.length}/25</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                  <div
                    className="bg-cricket-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${(squad.length / 25) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Overseas</span>
                <span className="text-text-primary font-mono">
                  {squad.filter(p => p.nationality !== 'IND').length}/8
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Avg Rating</span>
                <span className="text-text-primary font-mono">
                  {squad.length > 0
                    ? (squad.reduce((sum, p) => sum + (p.rating || 0), 0) / squad.length).toFixed(1)
                    : '0.0'}
                </span>
              </div>
              <button className="btn-secondary w-full mt-3 text-sm py-1.5">View Squad</button>
            </div>
          </div>

          {/* Recent Form */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
              <TrendingUp className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Recent Form
              </h3>
            </div>
            {recentResults.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex gap-1 justify-center py-1">
                  {recentResults.map((result, idx) => {
                    const won = result.winner === userTeam.id;
                    return (
                      <div
                        key={idx}
                        className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${
                          won ? 'bg-status-win' : 'bg-status-loss'
                        }`}
                      >
                        {won ? 'W' : 'L'}
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-xs pt-2 border-t border-border-primary">
                  <span className="text-text-secondary">Win Rate: </span>
                  <span className="text-text-primary font-mono font-medium">
                    {((recentResults.filter(r => r.winner === userTeam.id).length / recentResults.length) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary text-center py-6 text-sm">
                No matches played
              </p>
            )}
          </div>

          {/* Financial Summary */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
              <DollarSign className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Finances
              </h3>
            </div>
            {finances ? (
              <div className="space-y-2.5">
                <div>
                  <div className="text-text-secondary text-xs mb-0.5">Budget</div>
                  <div className="text-text-primary font-mono font-bold text-2xl">
                    ₹{(finances.currentBudget / 10000000).toFixed(1)} Cr
                  </div>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-border-primary">
                  <span className="text-text-secondary">Expenses</span>
                  <span className="text-text-primary font-mono">
                    ₹{(finances.totalExpenses / 10000000).toFixed(1)} Cr
                  </span>
                </div>
                <button className="btn-secondary w-full mt-3 text-sm py-1.5">View Finances</button>
              </div>
            ) : (
              <p className="text-text-secondary text-center py-6 text-sm">
                No financial data
              </p>
            )}
          </div>

          {/* Objectives */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
              <Target className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Objectives
              </h3>
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs">
                <span className="text-text-tertiary">□</span>
                <span className="text-text-secondary">Build your squad</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <span className="text-text-tertiary">□</span>
                <span className="text-text-secondary">Qualify for playoffs</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <span className="text-text-tertiary">□</span>
                <span className="text-text-secondary">Win the championship</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;