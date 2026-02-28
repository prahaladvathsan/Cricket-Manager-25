/**
 * @file CalendarPage.jsx
 * @description Full-page calendar view with all season events
 */

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Trophy,
  DollarSign,
  Gavel,
  Zap,
  Shield,
  Grid3X3,
  List
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
import useUIStore from '../../stores/uiStore';
import SimulationEngine from '../../core/simulation/SimulationEngine';
import UserTeamAI from '../../core/ai/UserTeamAI';
import SimulationOverlay from '../shared/SimulationOverlay';
import CalendarListView from './CalendarListView';
import { ContextualTip, useScreenTip, screenTips } from '../tutorial';

const CalendarPage = () => {
  const navigate = useNavigate();

  // View mode state (grid or list)
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState({ daysSimulated: 0, totalDays: 0, message: '' });
  const [simEvents, setSimEvents] = useState([]);
  const simulationEngineRef = useRef(null);

  // Global simulation state from gameStore
  const { startSimulation, stopSimulation } = useGameStore();

  // Get league and game data
  const { fixtures, clubs } = useLeagueStore();
  const { currentDate, calendarEvents, gameDay } = useGameStore();
  const { userTeamId } = useTeamStore();
  const { preferences } = useUIStore();
  const sidebarCollapsed = preferences?.sidebarCollapsed ?? false;

  // Tutorial: Screen tip for first-time visitors
  const { shouldShow: showTip, dismiss: dismissTip } = useScreenTip('calendar');

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

  // Build flat list of all events for list view
  const allEventsList = useMemo(() => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    // Get game start date from current date and game day
    const gameStartDate = new Date(today);
    gameStartDate.setDate(gameStartDate.getDate() - (gameDay - 1));

    // Helper to get date key
    const getDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const events = [];

    // Add match events from fixtures
    fixtures.forEach(fixture => {
      if (!fixture.date) return;
      const matchDate = new Date(fixture.date);
      matchDate.setHours(0, 0, 0, 0);
      events.push({
        type: 'match',
        date: matchDate,
        dateKey: getDateKey(matchDate),
        data: fixture
      });
    });

    // Add calendar events (non-match events)
    calendarEvents.forEach(event => {
      if (event.type === 'match') return;

      const eventDate = new Date(gameStartDate);
      eventDate.setDate(eventDate.getDate() + (event.day - 1));
      eventDate.setHours(0, 0, 0, 0);

      events.push({
        type: event.type,
        date: eventDate,
        dateKey: getDateKey(eventDate),
        data: event.data
      });
    });

    // Sort by date
    return events.sort((a, b) => a.date - b.date);
  }, [fixtures, calendarEvents, currentDate, gameDay]);

  // Filter events for list view (upcoming from today)
  const upcomingEventsList = useMemo(() => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    return allEventsList.filter(event => event.date >= today);
  }, [allEventsList, currentDate]);

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

  // Get current month key for auto-scroll
  const currentMonthKey = useMemo(() => {
    const date = new Date(currentDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [currentDate]);

  // Auto-scroll to current month on mount
  useEffect(() => {
    const currentMonthElement = document.getElementById(`month-${currentMonthKey}`);
    if (currentMonthElement) {
      currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentMonthKey]);

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
      case 'retention_start':
        return { icon: Shield, style: 'bg-orange-900/30 text-orange-400 border-orange-500/30' };
      case 'season_end':
        return { icon: Trophy, style: 'bg-red-900/30 text-red-400 border-red-500/30' };
      default:
        return { icon: Zap, style: 'bg-cricket-accent/20 text-cricket-accent border-cricket-accent/30' };
    }
  };

  // Handle stopping simulation
  const handleStopSimulation = useCallback(() => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.stop();
    }
  }, []);

  // Handle sim to date - simple, no questions asked
  const handleSimToDate = async (targetDate) => {
    if (isSimulating) return;

    setIsSimulating(true);
    setSimEvents([]); // Reset events
    setSimProgress({ daysSimulated: 0, totalDays: 0, message: 'Starting simulation...' });
    startSimulation(); // Set global state
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

    // Store engine reference for stop functionality
    simulationEngineRef.current = engine;

    try {
      await engine.simulateToDate(
        targetDate,
        // Progress callback
        (progress) => {
          setSimProgress({
            daysSimulated: progress.daysSimulated,
            totalDays: progress.totalDays,
            matchesSimulated: progress.matchesSimulated,
            // Use message from SimulationEngine if provided, otherwise show default
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
          // Short delay before hiding overlay
          setTimeout(() => {
            setIsSimulating(false);
            stopSimulation(); // Clear global state
            setSimProgress({ daysSimulated: 0, totalDays: 0, message: '' });
            setSimEvents([]);
            if (simulationEngineRef.current) {
              simulationEngineRef.current.cleanup();
            }
            simulationEngineRef.current = null;
          }, 1500);
        },
        // Error callback
        (error) => {
          console.error('❌ Simulation error:', error);
          setIsSimulating(false);
          stopSimulation(); // Clear global state
          setSimProgress({ daysSimulated: 0, totalDays: 0, message: '' });
          setSimEvents([]);
          if (simulationEngineRef.current) {
            simulationEngineRef.current.cleanup();
          }
          simulationEngineRef.current = null;
        },
        // Event callback for live feed
        (event) => {
          setSimEvents(prev => [...prev, event]);
        }
      );
    } catch (error) {
      console.error('❌ Simulation error:', error);
      setIsSimulating(false);
      stopSimulation(); // Clear global state
      setSimProgress({ daysSimulated: 0, totalDays: 0, message: '' });
      setSimEvents([]);
      if (simulationEngineRef.current) {
        simulationEngineRef.current.cleanup();
      }
      simulationEngineRef.current = null;
    }
  };

  return (
    <>
      <div className="p-6 pb-20">
        {/* Fullscreen Simulation Overlay */}
        <SimulationOverlay
          isVisible={isSimulating}
          progress={simProgress}
          events={simEvents}
          onStop={handleStopSimulation}
          message={simProgress.message}
        />

        {/* Fixed Legend at Bottom with View Toggle */}
        <div className={`fixed bottom-0 right-0 bg-bg-primary/95 backdrop-blur-sm border-t border-border-primary p-3 z-40 ${sidebarCollapsed ? 'left-16' : 'left-48'}`}>
          <div className="flex items-center justify-between">
            {/* Legend Items */}
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-900/30 border border-blue-500/30" />
                <span className="text-text-secondary">Upcoming</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-900/30 border border-green-500/30" />
                <span className="text-text-secondary">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-900/30 border border-purple-500/30" />
                <span className="text-text-secondary">Auction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-900/30 border border-yellow-500/30" />
                <span className="text-text-secondary">Playoffs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-cricket-accent/20 border border-cricket-accent/30" />
                <span className="text-text-secondary">Transfer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-900/30 border border-red-500/30" />
                <span className="text-text-secondary">Season End</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-700/30 border border-gray-600/30" />
                <span className="text-text-secondary">Offseason</span>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'grid'
                    ? 'bg-cricket-accent text-cricket-dark'
                    : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                <Grid3X3 className="w-3 h-3" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'list'
                    ? 'bg-cricket-accent text-cricket-dark'
                    : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                <List className="w-3 h-3" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="card p-4">
            <CalendarListView
              events={upcomingEventsList}
              clubs={clubs}
              currentDate={currentDate}
              userTeamId={userTeamId}
              compact={false}
              onSimToDate={handleSimToDate}
              isSimulating={isSimulating}
            />
          </div>
        )}

        {/* Calendar Grid View */}
        {viewMode === 'grid' && (
          <div className="space-y-6">
            {Object.keys(fixturesByMonth)
              .sort()
              .map(monthKey => {
                const monthData = fixturesByMonth[monthKey];
                const [year, month] = monthKey.split('-').map(Number);
                const calendarGrid = generateCalendarGrid(year, month - 1, monthData.events);

                return (
                  <div key={monthKey} id={`month-${monthKey}`} className="card border-2 border-border-primary overflow-hidden">
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
                                className={`min-h-32 border-2 rounded-lg transition-all group ${isToday
                                    ? 'border-cricket-accent bg-cricket-accent/10 ring-2 ring-cricket-accent/30'
                                    : hasEvents
                                      ? 'border-cricket-accent/40 bg-bg-secondary hover:bg-bg-tertiary'
                                      : 'border-border-primary bg-bg-secondary hover:bg-bg-tertiary'
                                  }`}
                              >
                                <div className="p-2 h-full flex flex-col">
                                  {/* Day Number */}
                                  <div className={`text-lg font-bold mb-2 ${isToday
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
                                      className={`mt-auto w-full px-2 py-1.5 rounded text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 ${isSimulating
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
        )}
      </div>

      {/* Contextual Tip for first visit */}
      {showTip && (
        <ContextualTip
          title={screenTips.calendar.title}
          icon={screenTips.calendar.icon}
          tips={screenTips.calendar.tips}
          onDismiss={dismissTip}
        />
      )}
    </>
  );
};

export default CalendarPage;
