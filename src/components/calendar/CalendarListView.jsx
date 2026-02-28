/**
 * @file CalendarListView.jsx
 * @description Date-centric calendar list view
 * Full version shows all days like a calendar listing
 * Compact version shows only days with events (for Home page widget)
 */

import React, { useMemo } from 'react';
import {
  Calendar,
  Trophy,
  DollarSign,
  Gavel,
  Zap,
  Shield
} from 'lucide-react';
import TeamName from '../shared/TeamName';

/**
 * Get event styling based on type and status
 */
export const getEventStyle = (event, currentDate, userTeamId = null) => {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const eventDate = event.date ? new Date(event.date) : null;
  if (eventDate) {
    eventDate.setHours(0, 0, 0, 0);
  }

  const isCompleted = event.data?.status === 'completed';
  const isPast = eventDate && eventDate < today;
  const isUserMatch = event.type === 'match' && userTeamId &&
    (event.data?.homeTeam === userTeamId || event.data?.awayTeam === userTeamId);

  switch (event.type) {
    case 'match':
      if (isCompleted) {
        return {
          icon: Trophy,
          bgClass: isUserMatch ? 'bg-green-900/40' : 'bg-green-900/20',
          textClass: 'text-green-400',
          borderClass: 'border-green-500/30'
        };
      } else if (isPast) {
        return {
          icon: Trophy,
          bgClass: 'bg-gray-700/20',
          textClass: 'text-gray-500',
          borderClass: 'border-gray-600/30'
        };
      } else {
        return {
          icon: Trophy,
          bgClass: isUserMatch ? 'bg-cricket-accent/20' : 'bg-blue-900/20',
          textClass: isUserMatch ? 'text-cricket-accent' : 'text-blue-400',
          borderClass: isUserMatch ? 'border-cricket-accent/30' : 'border-blue-500/30'
        };
      }
    case 'auction':
      return {
        icon: Gavel,
        bgClass: 'bg-purple-900/20',
        textClass: 'text-purple-400',
        borderClass: 'border-purple-500/30'
      };
    case 'transfer_window_open':
    case 'transfer_window_close':
      return {
        icon: DollarSign,
        bgClass: 'bg-green-900/20',
        textClass: 'text-green-400',
        borderClass: 'border-green-500/30'
      };
    case 'playoff':
      return {
        icon: Trophy,
        bgClass: 'bg-yellow-900/20',
        textClass: 'text-yellow-400',
        borderClass: 'border-yellow-500/30'
      };
    case 'offseason_start':
      return {
        icon: Calendar,
        bgClass: 'bg-gray-700/20',
        textClass: 'text-gray-400',
        borderClass: 'border-gray-600/30'
      };
    case 'retention_start':
      return {
        icon: Shield,
        bgClass: 'bg-orange-900/20',
        textClass: 'text-orange-400',
        borderClass: 'border-orange-500/30'
      };
    case 'season_end':
      return {
        icon: Trophy,
        bgClass: 'bg-red-900/20',
        textClass: 'text-red-400',
        borderClass: 'border-red-500/30'
      };
    default:
      return {
        icon: Zap,
        bgClass: 'bg-cricket-accent/10',
        textClass: 'text-cricket-accent',
        borderClass: 'border-cricket-accent/30'
      };
  }
};

/**
 * Format event description text
 */
export const getEventText = (event, clubs) => {
  if (event.type === 'match') {
    const homeClub = clubs?.[event.data?.homeTeam];
    const awayClub = clubs?.[event.data?.awayTeam];
    return `${homeClub?.shortName || 'TBD'} vs ${awayClub?.shortName || 'TBD'}`;
  }
  return event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Format date for display
 */
export const formatEventDate = (date, compact = false) => {
  if (compact) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * CalendarListView Component - Date-centric calendar listing
 * @param {Object} props
 * @param {Array} props.events - Array of event objects with { type, date, dateKey, data }
 * @param {Object} props.clubs - Clubs lookup object
 * @param {string} props.currentDate - Current game date string
 * @param {string} props.userTeamId - User's team ID for highlighting
 * @param {boolean} props.compact - Whether to use compact styling (skips empty days)
 * @param {Function} props.onSimToDate - Handler for sim to date button
 * @param {boolean} props.isSimulating - Whether simulation is in progress
 */
const CalendarListView = ({
  events = [],
  clubs = {},
  currentDate,
  userTeamId = null,
  compact = false,
  onSimToDate = null,
  isSimulating = false
}) => {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {};
    events.forEach(event => {
      if (!grouped[event.dateKey]) {
        grouped[event.dateKey] = [];
      }
      grouped[event.dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // For full view, generate all dates from today to last event date
  const dateList = useMemo(() => {
    if (events.length === 0) return [];

    const dates = [];
    const sortedEvents = [...events].sort((a, b) => a.date - b.date);
    const lastEventDate = sortedEvents[sortedEvents.length - 1].date;

    if (compact) {
      // Compact: only dates with events
      const uniqueDates = [...new Set(events.map(e => e.dateKey))].sort();
      uniqueDates.forEach(dateKey => {
        const [year, month, day] = dateKey.split('-').map(Number);
        dates.push({
          dateKey,
          date: new Date(year, month - 1, day),
          events: eventsByDate[dateKey] || []
        });
      });
    } else {
      // Full: all dates from today to last event
      const currentDate = new Date(today);
      while (currentDate <= lastEventDate) {
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        dates.push({
          dateKey,
          date: new Date(currentDate),
          events: eventsByDate[dateKey] || []
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return dates;
  }, [events, eventsByDate, today, compact]);

  if (events.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-3' : 'py-8'}`}>
        <Calendar className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-text-tertiary mx-auto mb-2`} />
        <p className="text-text-tertiary text-sm">No upcoming events</p>
      </div>
    );
  }

  // Compact table view for Home page (date first, then events, then venue)
  if (compact) {
    return (
      <table className="w-full text-xs">
        <tbody>
          {dateList.map(({ dateKey, date, events: dayEvents }) => {
            const isToday = dateKey === todayKey;
            // Get the primary event style for the row (first event)
            const primaryEvent = dayEvents[0];
            const style = primaryEvent ? getEventStyle(primaryEvent, currentDate, userTeamId) : null;
            // Get venue from first match event - use home team's homeGround from clubs
            const matchEvent = dayEvents.find(e => e.type === 'match');
            const homeTeamId = matchEvent?.data?.homeTeam;
            const homeClub = homeTeamId ? clubs[homeTeamId] : null;
            // Use club's homeGround/homeVenue, or fallback to fixture venue
            const venue = homeClub?.homeGround || homeClub?.homeVenue || matchEvent?.data?.venue || '';
            // Clean up venue - remove "Stadium" suffix and team name patterns
            const cleanVenue = venue
              .replace(/\s+Stadium$/i, '')
              .replace(/\s+Ground$/i, '')
              .replace(/\s+Arena$/i, '');

            return (
              <tr
                key={dateKey}
                className={`border-b border-border-secondary/50 last:border-0 ${style?.bgClass || ''}`}
              >
                {/* Date column - primary focus */}
                <td className="py-1 pr-2 font-mono text-text-secondary whitespace-nowrap w-14">
                  {isToday ? (
                    <span className="text-cricket-accent font-semibold">Today</span>
                  ) : (
                    formatEventDate(date, true)
                  )}
                </td>
                {/* Events column */}
                <td className={`py-1 ${style?.textClass || 'text-text-tertiary'}`}>
                  {dayEvents.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {dayEvents.map((event, idx) => {
                        const eventStyle = getEventStyle(event, currentDate, userTeamId);
                        const EventIcon = eventStyle.icon;
                        return (
                          <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-text-tertiary mx-1">|</span>}
                            <EventIcon className={`w-3 h-3 ${eventStyle.textClass}`} />
                            {event.type === 'match' ? (
                              <span className="flex items-center gap-0.5">
                                <TeamName teamId={event.data?.homeTeam} variant="short" inline className="text-xs" />
                                <span className="text-text-tertiary">v</span>
                                <TeamName teamId={event.data?.awayTeam} variant="short" inline className="text-xs" />
                              </span>
                            ) : (
                              <span className="truncate">{getEventText(event, clubs)}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-text-tertiary italic">-</span>
                  )}
                </td>
                {/* Venue column - show venue name */}
                <td className="py-1 pl-2 text-right text-text-tertiary truncate max-w-[100px]" title={venue}>
                  {matchEvent && venue ? (
                    <span className="text-xxs">{venue}</span>
                  ) : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // Full calendar list view for CalendarPage (date-centric layout)
  return (
    <div className="space-y-1">
      {dateList.map(({ dateKey, date, events: dayEvents }) => {
        const isToday = dateKey === todayKey;
        const isFuture = date > today;
        const hasEvents = dayEvents.length > 0;

        return (
          <div
            key={dateKey}
            className={`flex items-stretch border rounded-lg overflow-hidden ${
              isToday
                ? 'border-cricket-accent ring-1 ring-cricket-accent/30'
                : hasEvents
                ? 'border-border-primary'
                : 'border-border-secondary/50'
            }`}
          >
            {/* Date column - fixed width, prominent */}
            <div className={`w-24 flex-shrink-0 p-3 flex flex-col justify-center ${
              isToday
                ? 'bg-cricket-accent/20'
                : hasEvents
                ? 'bg-bg-secondary'
                : 'bg-bg-tertiary/30'
            }`}>
              <div className={`text-xs font-medium ${isToday ? 'text-cricket-accent' : 'text-text-tertiary'}`}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold ${isToday ? 'text-cricket-accent' : hasEvents ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {date.getDate()}
              </div>
              <div className={`text-xs ${isToday ? 'text-cricket-accent' : 'text-text-tertiary'}`}>
                {date.toLocaleDateString('en-US', { month: 'short' })}
              </div>
              {isToday && (
                <div className="text-xxs bg-cricket-accent text-cricket-dark px-1 py-0.5 rounded text-center mt-1 font-semibold">
                  TODAY
                </div>
              )}
            </div>

            {/* Events column */}
            <div className={`flex-1 p-2 ${hasEvents ? 'bg-bg-primary' : 'bg-bg-tertiary/10'}`}>
              {hasEvents ? (
                <div className="space-y-1">
                  {dayEvents.map((event, idx) => {
                    const style = getEventStyle(event, currentDate, userTeamId);
                    const EventIcon = style.icon;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 px-3 py-2 rounded ${style.bgClass} border ${style.borderClass}`}
                      >
                        <EventIcon className={`w-4 h-4 flex-shrink-0 ${style.textClass}`} />
                        <div className={`flex-1 font-medium text-sm ${style.textClass}`}>
                          {event.type === 'match' ? (
                            <span className="flex items-center gap-2">
                              <TeamName teamId={event.data?.homeTeam} inline className="text-sm" />
                              <span className="text-text-tertiary">vs</span>
                              <TeamName teamId={event.data?.awayTeam} inline className="text-sm" />
                            </span>
                          ) : (
                            <span>{getEventText(event, clubs)}</span>
                          )}
                        </div>
                        {event.data?.venue && (
                          <div className="text-xs text-text-tertiary truncate max-w-[150px]">
                            {event.data.venue}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-text-tertiary text-sm italic">
                  No events
                </div>
              )}
            </div>

            {/* Sim button column for future dates */}
            {isFuture && onSimToDate && (
              <div className="w-16 flex-shrink-0 flex items-center justify-center bg-bg-secondary border-l border-border-secondary">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSimToDate(dateKey);
                  }}
                  disabled={isSimulating}
                  className={`px-2 py-1.5 rounded text-xs font-semibold transition-all ${
                    isSimulating
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-cricket-accent text-cricket-dark hover:bg-cricket-accent/80'
                  }`}
                >
                  {isSimulating ? '...' : 'Sim'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CalendarListView;
