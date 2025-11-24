/**
 * @file CalendarPage.jsx
 * @description Full-page calendar view with all season events
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Trophy,
  DollarSign,
  Gavel,
  Zap
} from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useFinanceStore from '../../stores/financeStore';
import useTransferStore from '../../stores/transferStore';
import useInboxStore from '../../stores/inboxStore';
import useAuctionStore from '../../stores/auctionStore';
import useMatchStore from '../../stores/matchStore';
import SimulationEngine from '../../core/simulation/SimulationEngine';
import UserTeamAI from '../../core/ai/UserTeamAI';

const CalendarPage = () => {
  const navigate = useNavigate();

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState({ daysSimulated: 0, totalDays: 0, message: '' });

  // Get league and game data
  const { fixtures, clubs } = useLeagueStore();
  const { currentDate, calendarEvents } = useGameStore();

  // Group fixtures by month for calendar view
  const fixturesByMonth = useMemo(() => {
    const grouped = {};

    // Helper function to format date key consistently (no timezone issues)
    const getDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Initialize all 12 months of the year
    const currentYear = new Date(currentDate).getFullYear();
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const monthKey = `${currentYear}-${String(month + 1).padStart(2, '0')}`;
      grouped[monthKey] = {
        monthName: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        events: {}
      };
    }

    // Add fixtures
    fixtures.forEach(fixture => {
      if (!fixture.date) return;

      const date = new Date(fixture.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dateKey = getDateKey(date);

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          events: {}
        };
      }

      if (!grouped[monthKey].events[dateKey]) {
        grouped[monthKey].events[dateKey] = [];
      }

      grouped[monthKey].events[dateKey].push({
        type: 'match',
        data: fixture
      });
    });

    // Add other calendar events (auction, transfer, playoff, etc.)
    calendarEvents.forEach(event => {
      // Convert game day to date (assumes game starts Jan 1)
      const eventDate = new Date(currentYear, 0, 1); // Jan 1 of current year
      eventDate.setDate(eventDate.getDate() + (event.day - 1));

      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      const dateKey = getDateKey(eventDate);

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthName: eventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          events: {}
        };
      }

      if (!grouped[monthKey].events[dateKey]) {
        grouped[monthKey].events[dateKey] = [];
      }

      // Only add non-match events (matches already added from fixtures)
      if (event.type !== 'match') {
        grouped[monthKey].events[dateKey].push(event);
      }
    });

    return grouped;
  }, [fixtures, calendarEvents, currentDate]);

  // Generate calendar grid for a month
  const generateCalendarGrid = (year, month, monthEvents) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    // Helper function to format date key consistently (no timezone issues)
    const getDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const grid = [];
    let week = [];

    // Fill leading empty days
    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }

    // Fill month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = getDateKey(date);
      const dayEvents = monthEvents[dateKey] || [];

      week.push({
        day,
        date: dateKey,
        events: dayEvents,
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

  // Get event icon and style based on type
  const getEventStyle = (event) => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const eventDate = event.data?.date ? new Date(event.data.date) : null;
    if (eventDate) {
      eventDate.setHours(0, 0, 0, 0);
    }

    const isCompleted = event.data?.status === 'completed';
    const isPast = eventDate && eventDate < today;

    switch (event.type) {
      case 'match':
        if (isCompleted) {
          return { icon: Trophy, style: 'bg-green-900/30 text-green-400 border-green-500/30' };
        } else if (isPast) {
          return { icon: Trophy, style: 'bg-gray-700/30 text-gray-500 border-gray-600/30' };
        } else {
          return { icon: Trophy, style: 'bg-blue-900/30 text-blue-400 border-blue-500/30' };
        }
      case 'auction':
        return { icon: Gavel, style: 'bg-purple-900/30 text-purple-400 border-purple-500/30' };
      case 'transfer_window_open':
      case 'transfer_window_close':
        return { icon: DollarSign, style: 'bg-green-900/30 text-green-400 border-green-500/30' };
      case 'playoff':
        return { icon: Trophy, style: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' };
      case 'offseason_start':
        return { icon: Calendar, style: 'bg-gray-700/30 text-gray-400 border-gray-600/30' };
      case 'season_end':
        return { icon: Trophy, style: 'bg-red-900/30 text-red-400 border-red-500/30' };
      default:
        return { icon: Zap, style: 'bg-cricket-accent/20 text-cricket-accent border-cricket-accent/30' };
    }
  };

  // Handle sim to date - simple, no questions asked
  const handleSimToDate = async (targetDate) => {
    if (isSimulating) return;

    setIsSimulating(true);
    setSimProgress({ daysSimulated: 0, totalDays: 0, message: 'Starting simulation...' });
    console.log(`🎮 Simulating to ${targetDate}...`);

    // Initialize UserTeamAI
    const userTeamId = useTeamStore.getState().userTeamId;
    const userTeamAI = new UserTeamAI({
      teamId: userTeamId,
      teamStore: useTeamStore,
      playerStore: usePlayerStore,
      financeStore: useFinanceStore,
      transferStore: useTransferStore
    });

    // Create simulation engine with all required stores
    const engine = new SimulationEngine({
      gameStore: useGameStore,
      leagueStore: useLeagueStore,
      teamStore: useTeamStore,
      playerStore: usePlayerStore,
      financeStore: useFinanceStore,
      transferStore: useTransferStore,
      inboxStore: useInboxStore,
      auctionStore: useAuctionStore,
      matchStore: useMatchStore,
      userTeamAI
    });

    try {
      await engine.simulateToDate(
        targetDate,
        // Progress callback
        (progress) => {
          setSimProgress({
            daysSimulated: progress.daysSimulated,
            totalDays: progress.totalDays,
            matchesSimulated: progress.matchesSimulated,
            message: progress.message || `Simulating day ${progress.daysSimulated}/${progress.totalDays}...`
          });
        },
        // Complete callback
        (summary) => {
          console.log('✅ Simulation complete!', summary);
          setSimProgress({
            daysSimulated: summary.daysSimulated,
            totalDays: summary.daysSimulated,
            matchesSimulated: summary.matchesSimulated,
            message: `Complete! Simulated ${summary.matchesSimulated} matches`
          });
          setTimeout(() => {
            alert(`Simulation complete!\n${summary.matchesSimulated} matches simulated.\nCheck the league standings!`);
            setIsSimulating(false);
            setSimProgress({ daysSimulated: 0, totalDays: 0, message: '' });
          }, 500);
        },
        // Error callback
        (error) => {
          console.error('❌ Simulation error:', error);
          alert(`Simulation failed: ${error.message}`);
          setIsSimulating(false);
          setSimProgress({ daysSimulated: 0, totalDays: 0, message: '' });
        }
      );
    } catch (error) {
      console.error('❌ Simulation error:', error);
      alert(`Simulation failed: ${error.message}`);
      setIsSimulating(false);
      setSimProgress({ daysSimulated: 0, totalDays: 0, message: '' });
    }
  };

  return (
    <div className="p-6">
      {/* Progress Indicator */}
      {isSimulating && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-cricket-surface border-2 border-cricket-accent rounded-lg shadow-2xl p-4 min-w-96">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-cricket-accent border-t-transparent"></div>
            <div>
              <div className="font-bold text-text-primary">
                {simProgress.message || 'Simulating...'}
              </div>
              <div className="text-xs text-text-secondary">
                {simProgress.totalDays > 0 && `${simProgress.daysSimulated} / ${simProgress.totalDays} days`}
                {simProgress.matchesSimulated > 0 && ` • ${simProgress.matchesSimulated} matches`}
              </div>
            </div>
          </div>
          {simProgress.totalDays > 0 && (
            <div className="w-full bg-bg-tertiary rounded-full h-2">
              <div
                className="bg-cricket-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${(simProgress.daysSimulated / simProgress.totalDays) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-cricket-accent" />
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Season Calendar</h1>
            <p className="text-text-secondary text-sm">
              All events, matches, and important dates
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Event Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-900/30 border border-blue-500/30" />
            <span className="text-text-secondary">Upcoming Match</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-900/30 border border-green-500/30" />
            <span className="text-text-secondary">Completed Match</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-900/30 border border-purple-500/30" />
            <span className="text-text-secondary">Auction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-900/30 border border-yellow-500/30" />
            <span className="text-text-secondary">Playoffs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cricket-accent/20 border border-cricket-accent/30" />
            <span className="text-text-secondary">Transfer Window</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-900/30 border border-red-500/30" />
            <span className="text-text-secondary">Season End</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-700/30 border border-gray-600/30" />
            <span className="text-text-secondary">Offseason</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-6">
        {Object.keys(fixturesByMonth)
          .sort()
          .map(monthKey => {
            const monthData = fixturesByMonth[monthKey];
            const [year, month] = monthKey.split('-').map(Number);
            const calendarGrid = generateCalendarGrid(year, month - 1, monthData.events);

            return (
              <div key={monthKey} className="card border-2 border-border-primary overflow-hidden">
                {/* Month Header */}
                <div className="bg-cricket-secondary px-6 py-4 border-b-2 border-border-primary">
                  <h2 className="text-2xl font-bold text-text-primary">
                    {monthData.monthName}
                  </h2>
                </div>

                {/* Calendar Grid */}
                <div className="p-6">
                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                      <div
                        key={day}
                        className="text-center text-sm font-bold text-cricket-accent py-2 border-b border-border-primary"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarGrid.map((week, weekIdx) =>
                      week.map((dayData, dayIdx) => {
                        if (!dayData) {
                          return (
                            <div
                              key={`empty-${weekIdx}-${dayIdx}`}
                              className="min-h-32 bg-bg-tertiary/20 rounded border border-border-primary"
                            />
                          );
                        }

                        const hasEvents = dayData.events.length > 0;

                        // Check if this is today (use date string comparison to avoid timezone issues)
                        const todayDate = new Date(currentDate);
                        const todayKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
                        const isToday = dayData.date === todayKey;
                        const isFuture = dayData.date > todayKey;

                        return (
                          <div
                            key={dayData.date}
                            className={`min-h-32 border-2 rounded-lg transition-all group ${
                              isToday
                                ? 'border-cricket-accent bg-cricket-accent/10 ring-2 ring-cricket-accent/30'
                                : hasEvents
                                ? 'border-cricket-accent/40 bg-bg-secondary hover:bg-bg-tertiary'
                                : 'border-border-primary bg-bg-secondary hover:bg-bg-tertiary'
                            }`}
                          >
                            <div className="p-2 h-full flex flex-col">
                              {/* Day Number */}
                              <div className={`text-lg font-bold mb-2 ${
                                isToday
                                  ? 'text-cricket-accent'
                                  : hasEvents
                                  ? 'text-text-primary'
                                  : 'text-text-tertiary'
                              }`}>
                                {dayData.day}
                                {isToday && (
                                  <span className="ml-2 text-xs bg-cricket-accent text-cricket-dark px-2 py-0.5 rounded-full">
                                    TODAY
                                  </span>
                                )}
                              </div>

                              {/* Events */}
                              {hasEvents && (
                                <div className="flex-1 space-y-1 overflow-y-auto">
                                  {dayData.events.map((event, idx) => {
                                    const { icon: EventIcon, style } = getEventStyle(event);

                                    // Render based on event type
                                    if (event.type === 'match') {
                                      const fixture = event.data;
                                      return (
                                        <div
                                          key={idx}
                                          className={`text-xs px-2 py-1.5 rounded border ${style} flex items-center gap-1`}
                                          title={`${clubs[fixture.homeTeam]?.name || 'TBD'} vs ${clubs[fixture.awayTeam]?.name || 'TBD'}`}
                                        >
                                          <EventIcon className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">
                                            {clubs[fixture.homeTeam]?.shortName?.slice(0, 3) || 'TBD'} v {clubs[fixture.awayTeam]?.shortName?.slice(0, 3) || 'TBD'}
                                          </span>
                                        </div>
                                      );
                                    } else {
                                      // Other event types
                                      return (
                                        <div
                                          key={idx}
                                          className={`text-xs px-2 py-1.5 rounded border ${style} flex items-center gap-1`}
                                        >
                                          <EventIcon className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">
                                            {event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </span>
                                        </div>
                                      );
                                    }
                                  })}
                                </div>
                              )}

                              {/* Sim to Date Button (for future dates - only visible on hover) */}
                              {isFuture && (
                                <button
                                  onClick={() => handleSimToDate(dayData.date)}
                                  disabled={isSimulating}
                                  className={`mt-auto w-full px-2 py-1.5 rounded text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 ${
                                    isSimulating
                                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                      : 'bg-cricket-accent text-cricket-dark hover:bg-cricket-accent/80'
                                  }`}
                                >
                                  {isSimulating ? 'Simulating...' : 'Sim to Date'}
                                </button>
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
          <div className="card p-12 text-center">
            <Calendar className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary text-lg">
              No events scheduled yet
            </p>
            <p className="text-text-tertiary text-sm mt-2">
              Events will appear here once the season begins
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
