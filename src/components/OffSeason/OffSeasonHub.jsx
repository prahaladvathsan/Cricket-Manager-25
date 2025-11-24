/**
 * @file OffSeasonHub.jsx
 * @description Central hub for off-season activities including transfers and season preparation
 */

import React from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Clock,
  Trophy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../stores/gameStore';
import useLeagueStore from '../../stores/leagueStore';
import useFinanceStore from '../../stores/financeStore';

const OffSeasonHub = () => {
  const navigate = useNavigate();
  const { currentSeason, currentWeek, currentDate, phase } = useGameStore();
  const { seasonName } = useLeagueStore();
  const finances = useFinanceStore((state) => state.finances);

  // Off-season timeline
  const offSeasonStartWeek = 21;
  const offSeasonEndWeek = 26;
  const transferStartWeek = 22;
  const transferEndWeek = 26;

  const weeksInOffSeason = currentWeek - offSeasonStartWeek + 1;
  const weeksRemaining = offSeasonEndWeek - currentWeek;
  const isTransferWindowOpen = currentWeek >= transferStartWeek && currentWeek <= transferEndWeek;
  const transferWeeksRemaining = isTransferWindowOpen ? transferEndWeek - currentWeek : 0;

  // Get current week event
  const getCurrentWeekEvent = () => {
    if (currentWeek === 21) return { title: 'Season Summary', description: 'Prize distribution complete' };
    if (currentWeek === 22) return { title: 'Transfer Window Opens', description: 'Begin squad building' };
    if (currentWeek >= 23 && currentWeek <= 25) return { title: 'Transfer Activity', description: 'Active negotiations' };
    if (currentWeek === 26) return { title: 'Transfer Window Closes', description: 'Final squad preparations' };
    return { title: 'Off-Season', description: 'Preparing for next season' };
  };

  const currentEvent = getCurrentWeekEvent();

  // Get user's team budget (assuming first team is user's team)
  const userTeamId = Object.keys(finances)[0];
  const userBudget = finances[userTeamId]?.balance || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Off-Season
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {seasonName} • Season {currentSeason}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-secondary uppercase tracking-wider">
              Week {currentWeek}
            </div>
            <div className="text-sm font-semibold text-cricket-accent">
              {currentEvent.title}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-cricket-accent" />
          <h2 className="text-lg font-semibold text-text-primary">
            Off-Season Progress
          </h2>
        </div>

        {/* Week Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
            <span>Week {weeksInOffSeason} of 6</span>
            <span>{weeksRemaining} weeks remaining</span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-2">
            <div
              className="bg-cricket-accent rounded-full h-2 transition-all duration-500"
              style={{ width: `${(weeksInOffSeason / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Timeline Events */}
        <div className="space-y-2">
          {[
            { week: 21, title: 'Season Summary', icon: Trophy, active: currentWeek === 21, completed: currentWeek > 21 },
            { week: 22, title: 'Transfer Window Opens', icon: Users, active: currentWeek === 22, completed: currentWeek > 22 },
            { week: 23-25, title: 'Transfer Activity', icon: TrendingUp, active: currentWeek >= 23 && currentWeek <= 25, completed: currentWeek > 25 },
            { week: 26, title: 'Transfer Window Closes', icon: Clock, active: currentWeek === 26, completed: currentWeek > 26 }
          ].map((event, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-2 rounded transition-colors ${
                event.active
                  ? 'bg-cricket-primary/20 border border-cricket-accent'
                  : event.completed
                  ? 'bg-bg-tertiary/30 opacity-60'
                  : 'bg-bg-secondary'
              }`}
            >
              <event.icon className={`w-4 h-4 ${
                event.active
                  ? 'text-cricket-accent'
                  : event.completed
                  ? 'text-text-positive'
                  : 'text-text-tertiary'
              }`} />
              <span className={`text-sm font-medium flex-1 ${
                event.active
                  ? 'text-text-primary'
                  : event.completed
                  ? 'text-text-secondary line-through'
                  : 'text-text-tertiary'
              }`}>
                {event.title}
              </span>
              {event.completed && (
                <span className="text-xs text-text-positive">✓</span>
              )}
              {event.active && (
                <span className="text-xs px-2 py-0.5 bg-cricket-accent text-white rounded uppercase font-semibold">
                  Current
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Window Status */}
      {isTransferWindowOpen && (
        <div className="card p-4 bg-cricket-primary/10 border border-cricket-accent">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-cricket-accent" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary">
                Transfer Window Open
              </h3>
              <p className="text-sm text-text-secondary">
                {transferWeeksRemaining} {transferWeeksRemaining === 1 ? 'week' : 'weeks'} remaining to build your squad
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-bg-primary rounded p-3">
              <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                Available Budget
              </div>
              <div className="text-xl font-bold text-cricket-accent">
                ${(userBudget / 1000000).toFixed(2)}M
              </div>
            </div>
            <div className="bg-bg-primary rounded p-3">
              <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">
                Active Listings
              </div>
              <div className="text-xl font-bold text-text-primary">
                {/* TODO: Get from transferStore */}
                0
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/game/transfers')}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            Go to Transfer Market
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Budget Summary */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-cricket-accent" />
          <h2 className="text-lg font-semibold text-text-primary">
            Financial Summary
          </h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-border-secondary">
            <span className="text-sm text-text-secondary">Current Balance</span>
            <span className="text-sm font-semibold text-text-primary">
              ${(userBudget / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border-secondary">
            <span className="text-sm text-text-secondary">Prize Money Received</span>
            <span className="text-sm font-semibold text-text-positive">
              {/* TODO: Calculate from recent transactions */}
              -
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">Transfer Spending</span>
            <span className="text-sm font-semibold text-text-negative">
              {/* TODO: Calculate from transfer transactions */}
              $0.00M
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/game/squad')}
          className="card p-4 hover:bg-bg-secondary transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cricket-accent" />
            <div className="flex-1">
              <div className="font-semibold text-text-primary">View Squad</div>
              <div className="text-xs text-text-secondary">Review your current players</div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
          </div>
        </button>

        <button
          onClick={() => navigate('/game/league')}
          className="card p-4 hover:bg-bg-secondary transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-cricket-accent" />
            <div className="flex-1">
              <div className="font-semibold text-text-primary">Final Standings</div>
              <div className="text-xs text-text-secondary">View season results</div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
          </div>
        </button>
      </div>

      {/* Advance Week Button */}
      {weeksRemaining > 0 && (
        <div className="card p-4 bg-bg-tertiary">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Ready to advance?
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Simulate to Week {currentWeek + 1}
              </div>
            </div>
            <button
              onClick={() => {
                // TODO: Implement week advancement
                console.log('Advancing to week', currentWeek + 1);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Advance Week
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Next Season Preview */}
      {weeksRemaining === 0 && (
        <div className="card p-6 bg-cricket-primary/10 border-2 border-cricket-accent">
          <div className="text-center space-y-3">
            <Trophy className="w-12 h-12 text-cricket-accent mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-text-primary">
                Ready for Season {currentSeason + 1}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                All off-season activities complete
              </p>
            </div>
            <button
              onClick={() => {
                // TODO: Implement season start
                console.log('Starting new season');
              }}
              className="btn-primary px-8 py-3"
            >
              Start New Season
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffSeasonHub;
