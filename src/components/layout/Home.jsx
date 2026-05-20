/**
 * @file Home.jsx
 * @description Home page with season overview and game progression
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Play,
  FastForward,
  AlertCircle,
  X as CloseIcon,
  Star,
  ArrowRightLeft,
  Gavel
} from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useFinanceStore from '../../stores/financeStore';
import useMatchStore from '../../stores/matchStore';
import useAuctionStore from '../../stores/auctionStore';
import useInboxStore from '../../stores/inboxStore';
import useTransferStore from '../../stores/transferStore';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import { emitSeasonOpener } from '../../core/news/emitters/seasonOpener.js';
import { getPlayerRating } from '../../utils/ratingHelper';
import TeamName from '../shared/TeamName';
import PlayerName from '../shared/PlayerName';
import { getTeamBadge } from '../../utils/assetHelpers';
import MatchResultModal from '../shared/MatchResultModal';
import MatchWeekScheduleGenerator from '../../core/league/MatchWeekScheduleGenerator';
import FinancialSummary from '../board/FinancialSummary';
import MessageGenerator from '../../utils/MessageGenerator';
import { ContextualTip, useScreenTip, screenTips } from '../tutorial';
import CalendarListView from '../calendar/CalendarListView';
import HomeNewsCarousel from '../news/HomeNewsCarousel';
import { computeRecentForm } from '../../utils/recentForm';

const Home = () => {
  const navigate = useNavigate();
  const {
    currentSeason,
    currentPhase,
    currentWeek,
    gameDay,
    currentDate,
    scheduleEvents,
    advancePhase,
    clearEvents,
    advanceDay,
    getCurrentEvent,
    isWeekend,
    seasonObjectives,
    calendarEvents
  } = useGameStore();
  const { getUserTeam, initializeAllTeamsTactics, userTeamId } = useTeamStore();
  const userTeam = getUserTeam();
  const { auctionState, soldPlayers } = useAuctionStore();
  const { addMessage } = useInboxStore();
  const { transferWindow, completedTransfers, showTransferSummary, transferWindowSummary } = useTransferStore();

  // Component state
  const [showResultModal, setShowResultModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [simError, setSimError] = useState(null);

  // Get league data
  const standings = useLeagueStore(state => state.standings);
  const results = useLeagueStore(state => state.results);
  const fixtures = useLeagueStore(state => state.fixtures);
  const clubs = useLeagueStore(state => state.clubs);
  const getNextFixture = useLeagueStore(state => state.getNextFixture);
  const isUserTeamMatch = useLeagueStore(state => state.isUserTeamMatch);
  const getClub = useLeagueStore(state => state.getClub);
  const recordResult = useLeagueStore(state => state.recordResult);
  const recalculateStandings = useLeagueStore(state => state.recalculateStandings);
  const advanceToNextMatch = useLeagueStore(state => state.advanceToNextMatch);
  const initializeSeason = useLeagueStore(state => state.initializeSeason);

  // Get squad data
  const squad = usePlayerStore(state =>
    userTeam ? state.getPlayersByTeam(userTeam.id) : []
  );

  // Get player data for best performers
  const { getPlayersByTeam, careerStats } = usePlayerStore();
  const currentSeasonId = usePlayerStore(state => state.currentSeasonId);

  // Get finances
  const financeStoreState = useFinanceStore();
  const finances = userTeam ? financeStoreState.getTeamFinances(userTeam.id) : null;

  // Tutorial: Screen tip for first-time visitors
  const { shouldShow: showTip, dismiss: dismissTip } = useScreenTip('home');

  // Migration: Initialize finances if not already initialized
  useEffect(() => {
    if (userTeam && !financeStoreState.initialized) {
      const allTeams = Object.values(useTeamStore.getState().teams).map(team => ({
        id: team.id,
        name: team.name
      }));

      if (allTeams.length > 0) {
        financeStoreState.initializeSeason(allTeams, `season_${currentSeason}`, null);
      }
    }
  }, [userTeam, financeStoreState.initialized]);

  // Get current event (could be today's match or upcoming)
  const todayEvent = getCurrentEvent();

  // Find next match for user team specifically.
  //
  // NOTE: `recordResult` doesn't mutate `fixture.status` for league matches —
  // only playoff bracket updates flip statuses. So we can't rely on
  // `status === 'scheduled'` to identify upcoming matches (it stays 'scheduled'
  // forever for league fixtures). Instead we cross-reference against the
  // `results` array — any fixture whose matchId isn't in results is upcoming.
  const completedMatchIds = useMemo(
    () => new Set((results || []).map(r => r.matchId)),
    [results]
  );
  const nextUserFixture = fixtures.find(fixture =>
    !completedMatchIds.has(fixture.matchId) &&
    fixture.status !== 'completed' &&
    userTeam &&
    (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id)
  );

  const nextFixture = nextUserFixture;
  const isUserMatch = true; // Always true since we're filtering for user team

  // Get team details for next fixture
  const homeTeam = nextFixture ? getClub(nextFixture.homeTeam) : null;
  const awayTeam = nextFixture ? getClub(nextFixture.awayTeam) : null;

  // Get user team standing
  const userStanding = standings.find(s => s.clubId === userTeam?.id);

  // Get recent results (last 5)
  const recentResults = results
    .filter(r => r.homeTeam === userTeam?.id || r.awayTeam === userTeam?.id)
    .slice(-5);

  // Get best performers for a team (for next match preview)
  const getBestPerformers = (teamId) => {
    if (!teamId) return { topBatters: [], topBowlers: [] };
    const players = getPlayersByTeam(teamId);

    const playersWithStats = players.map(player => {
      const seasonStats = careerStats[player.id]?.seasons[currentSeasonId] || {
        runs: 0,
        wickets: 0
      };
      return { ...player, seasonStats };
    });

    // Top 3 batters by runs
    const topBatters = [...playersWithStats]
      .sort((a, b) => {
        if (b.seasonStats.runs !== a.seasonStats.runs) {
          return b.seasonStats.runs - a.seasonStats.runs;
        }
        const aBatRating = Math.max(a.batting?.technique || 0, a.batting?.timing || 0, a.batting?.power || 0);
        const bBatRating = Math.max(b.batting?.technique || 0, b.batting?.timing || 0, b.batting?.power || 0);
        return bBatRating - aBatRating;
      })
      .slice(0, 3);

    // Top 3 bowlers by wickets
    const topBowlers = [...playersWithStats]
      .sort((a, b) => {
        if (b.seasonStats.wickets !== a.seasonStats.wickets) {
          return b.seasonStats.wickets - a.seasonStats.wickets;
        }
        const aBowlRating = Math.max(a.bowling?.accuracy || 0, a.bowling?.swing || 0, a.bowling?.spin || 0);
        const bBowlRating = Math.max(b.bowling?.accuracy || 0, b.bowling?.swing || 0, b.bowling?.spin || 0);
        return bBowlRating - aBowlRating;
      })
      .slice(0, 3);

    return { topBatters, topBowlers };
  };

  // Memoize best performers for next match
  const homePerformers = useMemo(() => {
    return getBestPerformers(homeTeam?.id);
  }, [homeTeam?.id, careerStats, currentSeasonId]);

  const awayPerformers = useMemo(() => {
    return getBestPerformers(awayTeam?.id);
  }, [awayTeam?.id, careerStats, currentSeasonId]);

  // Get upcoming calendar events (next 5 events with dates)
  const upcomingEvents = useMemo(() => {
    if (!fixtures.length && !calendarEvents.length) return [];

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

    // Build events from fixtures (upcoming matches only)
    const events = [];

    // Add match events
    fixtures.forEach(fixture => {
      if (!fixture.date || fixture.status === 'completed') return;
      const matchDate = new Date(fixture.date);
      matchDate.setHours(0, 0, 0, 0);
      if (matchDate >= today) {
        events.push({
          type: 'match',
          date: matchDate,
          dateKey: getDateKey(matchDate),
          data: fixture
        });
      }
    });

    // Add calendar events (non-match events)
    calendarEvents.forEach(event => {
      if (event.type === 'match') return; // Skip matches, already added from fixtures

      const eventDate = new Date(gameStartDate);
      eventDate.setDate(eventDate.getDate() + (event.day - 1));
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate >= today) {
        events.push({
          type: event.type,
          date: eventDate,
          dateKey: getDateKey(eventDate),
          data: event.data
        });
      }
    });

    // Sort by date and take first 10 (the Upcoming card now spans two grid
    // rows, so it has the vertical room for a longer list).
    return events
      .sort((a, b) => a.date - b.date)
      .slice(0, 10);
  }, [fixtures, calendarEvents, currentDate, gameDay]);

  // Determine whether to show transfer activity or auction buys
  const isTransferMode = transferWindow.isOpen || showTransferSummary;

  // Get latest transfers - transfer activity during/after window, auction buys before
  const latestTransfers = useMemo(() => {
    if (isTransferMode) {
      // During or after transfer window: show completed transfers
      const source = showTransferSummary && transferWindowSummary?.completedTransfers
        ? transferWindowSummary.completedTransfers
        : completedTransfers;
      if (!source || source.length === 0) return [];

      return [...source]
        .sort((a, b) => (b.newPrice || 0) - (a.newPrice || 0)) // highest fee first
        .slice(0, 5)
        .map(t => ({
          playerId: t.playerId,
          teamId: t.toTeamId || t.fromTeamId,
          price: t.type === 'release' ? t.newPrice : Math.round((t.newPrice || 0) / 2),
          type: t.type,
          fromTeamId: t.fromTeamId,
          toTeamId: t.toTeamId
        }));
    }

    // Default: show top auction buys
    if (!soldPlayers || soldPlayers.length === 0) return [];

    const topBuys = [...soldPlayers]
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);

    return topBuys.map(sale => {
      const player = Object.values(usePlayerStore.getState().players).find(p => p.id === sale.playerId);
      const team = getClub(sale.teamId);
      return {
        ...sale,
        playerName: player?.name || 'Unknown Player',
        teamName: team?.name || 'Unknown Team',
        teamShortName: team?.shortName || '???'
      };
    });
  }, [soldPlayers, getClub, isTransferMode, completedTransfers, showTransferSummary, transferWindowSummary]);

  // Initialize league after auction completes
  useEffect(() => {
    // Check if league needs initialization
    const needsInitialization =
      auctionState === 'completed' &&
      currentPhase === 'preseason' &&
      fixtures.length === 0;

    if (needsInitialization) {
      console.log('🏏 Initializing league after auction completion...');

      try {
        // Get all teams from teamStore
        const allTeams = Object.values(useTeamStore.getState().teams);

        if (allTeams.length !== 10) {
          console.error('Cannot initialize league: Expected 10 teams, got', allTeams.length);
          return;
        }

        // Convert teams to clubs format for fixture generator
        const clubs = allTeams.map(team => {
          console.log(`🎨 Team ${team.name} colors:`, team.colors);
          return {
            id: team.id,
            name: team.name,
            shortName: team.shortName,
            homeVenue: team.homeVenue || `${team.name} Stadium`,
            homeGround: team.homeVenue || `${team.name} Stadium`,
            colors: team.colors || { primary: '#D4AF37', secondary: '#B8941F' } // Colors from team data
          };
        });

        // Generate fixtures using MatchWeekScheduleGenerator
        const scheduleGenerator = new MatchWeekScheduleGenerator();
        const seasonStartDate = new Date(currentDate);
        const { fixtures: leagueFixtures, seasonEnd: leagueEndDate } = scheduleGenerator.generateMatchWeekSchedule(
          clubs,
          seasonStartDate
        );

        console.log(`✅ Generated ${leagueFixtures.length} league fixtures`);

        // Generate playoff fixtures WITH dates (TBD teams)
        // Use a placeholder top 4 for structure (teams will be populated later)
        const placeholderTop4 = clubs.slice(0, 4).map(club => ({
          clubId: null,
          clubName: 'TBD'
        }));

        const playoffSchedule = scheduleGenerator.generatePlayoffSchedule(leagueEndDate, placeholderTop4);

        // Create playoff fixtures with TBD teams but real dates
        const playoffFixtures = [
          {
            matchId: 'playoff_q1',
            matchday: 91,
            round: 'Qualifier 1',
            homeTeam: null,
            homeTeamName: 'TBD (1st)',
            awayTeam: null,
            awayTeamName: 'TBD (2nd)',
            venue: 'WPL Championship Stadium',
            status: 'pending',
            type: 'playoff',
            description: '1st vs 2nd - Winner to Final',
            date: playoffSchedule.week1.date,
            dateObj: playoffSchedule.week1.dateObj
          },
          {
            matchId: 'playoff_eliminator',
            matchday: 92,
            round: 'Eliminator',
            homeTeam: null,
            homeTeamName: 'TBD (3rd)',
            awayTeam: null,
            awayTeamName: 'TBD (4th)',
            venue: 'WPL Championship Stadium',
            status: 'pending',
            type: 'playoff',
            description: '3rd vs 4th - Loser eliminated',
            date: playoffSchedule.week1.date,
            dateObj: playoffSchedule.week1.dateObj
          },
          {
            matchId: 'playoff_q2',
            matchday: 93,
            round: 'Qualifier 2',
            homeTeam: null,
            homeTeamName: 'TBD (Loser Q1)',
            awayTeam: null,
            awayTeamName: 'TBD (Winner Eliminator)',
            venue: 'WPL Championship Stadium',
            status: 'pending',
            type: 'playoff',
            description: 'Loser of Q1 vs Winner of Eliminator - Winner to Final',
            date: playoffSchedule.week2.date,
            dateObj: playoffSchedule.week2.dateObj
          },
          {
            matchId: 'playoff_final',
            matchday: 94,
            round: 'Final',
            homeTeam: null,
            homeTeamName: 'TBD (Winner Q1)',
            awayTeam: null,
            awayTeamName: 'TBD (Winner Q2)',
            venue: 'WPL Championship Stadium',
            status: 'pending',
            type: 'playoff',
            description: 'Championship Final',
            date: playoffSchedule.week2.date,
            dateObj: playoffSchedule.week2.dateObj
          }
        ];

        console.log(`✅ Generated ${playoffFixtures.length} playoff fixtures (TBD teams)`);
        console.log(`   Playoff Week 1: ${playoffSchedule.week1.date}`);
        console.log(`   Playoff Week 2: ${playoffSchedule.week2.date}`);

        // Combine league and playoff fixtures
        const allFixtures = [...leagueFixtures, ...playoffFixtures];

        // Initialize league season with ALL fixtures
        initializeSeason({
          seasonId: `season_${currentSeason}`,
          seasonName: `Season ${currentSeason}`,
          clubs: clubs,
          fixtures: allFixtures,
          useMatchWeeks: false
        });

        // Schedule match events in calendar
        clearEvents(); // Clear any existing events

        // Calculate game start date (day 1) from current date and game day
        const currentGameDate = new Date(currentDate);
        const gameStartDate = new Date(currentGameDate);
        gameStartDate.setDate(gameStartDate.getDate() - (gameDay - 1));

        // Calculate game days for ALL fixtures (league + playoffs) based on their dates
        const matchEvents = allFixtures.map(fixture => {
          const matchDate = new Date(fixture.dateObj);
          // Calculate game day number: days since game start + 1
          const daysSinceStart = Math.ceil((matchDate - gameStartDate) / (1000 * 60 * 60 * 24));
          const matchGameDay = daysSinceStart + 1;

          return {
            day: matchGameDay,
            type: 'match',
            data: fixture
          };
        });

        scheduleEvents(matchEvents);
        console.log(`📅 Scheduled ${matchEvents.length} match events in calendar (${leagueFixtures.length} league + ${playoffFixtures.length} playoff)`);

        // Schedule additional seasonal events (offseason, transfers, season end)
        // Calculate season parity and dates
        const isOddSeason = currentSeason % 2 === 1;
        const leagueStartDate = new Date(seasonStartDate);

        // Estimate playoff end date (90 league matches ~45 days + playoffs ~10 days = 55 days)
        const estimatedSeasonEndDate = new Date(leagueStartDate);
        estimatedSeasonEndDate.setDate(estimatedSeasonEndDate.getDate() + 65); // Buffer for playoffs

        // Offseason starts day after estimated season end
        const offseasonStartDate = new Date(estimatedSeasonEndDate);
        offseasonStartDate.setDate(offseasonStartDate.getDate() + 1);
        const offseasonStartDay = Math.ceil((offseasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

        // Transfer window: June 1-30 for odd seasons, Dec 1-31 for even seasons
        const transferWindowStartDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, 1);
        const transferWindowEndDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, isOddSeason ? 30 : 31);
        const transferWindowStartDay = Math.ceil((transferWindowStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
        const transferWindowEndDay = Math.ceil((transferWindowEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

        // Next season transition (matches LeagueInitializer scheduling).
        const nextSeason = currentSeason + 1;
        const nextSeasonHasRetention = nextSeason % 2 === 1 && nextSeason >= 3;

        let retentionStartDay = null;
        let nextSeasonStartDay;
        if (nextSeasonHasRetention) {
          const auctionYear = leagueStartDate.getFullYear() + 1;
          const retentionDate = new Date(auctionYear, 0, 6);
          const auctionDate = new Date(auctionYear, 0, 7);
          retentionStartDay = Math.ceil((retentionDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
          nextSeasonStartDay = Math.ceil((auctionDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
        } else {
          const d = new Date(transferWindowEndDate);
          d.setDate(d.getDate() + 1);
          nextSeasonStartDay = Math.ceil((d - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
        }

        // season_end is dynamically scheduled by recordResult() after the Final.
        const additionalEvents = [
          { day: offseasonStartDay, type: 'offseason_start' },
          { day: transferWindowStartDay, type: 'transfer_window_open' },
          { day: transferWindowEndDay, type: 'transfer_window_close' },
          ...(nextSeasonHasRetention ? [{ day: retentionStartDay, type: 'retention_start', data: { season: nextSeason } }] : []),
          { day: nextSeasonStartDay, type: 'new_season_start', data: { season: nextSeason } }
        ];

        scheduleEvents(additionalEvents);
        console.log(`📅 Scheduled ${additionalEvents.length} additional seasonal events`);

        // Welcome/Expectations/Tutorial messages are already added by TeamSelectionModal
        // Auction summary is already added by Transfers.jsx
        // No need to add messages here (this would create duplicates)

        // Initialize tactics for all teams
        console.log('🎯 Initializing tactics for all teams...');
        initializeAllTeamsTactics();

        // Generate Season 1 objectives (special case for game start)
        const existingObjectives = useGameStore.getState().seasonObjectives;
        if (!existingObjectives || existingObjectives.length === 0) {
          console.log('📋 Generating Season 1 objectives...');
          const rivalTeam = allTeams.find(t => t.id !== userTeam?.id);
          useGameStore.getState().generateSeasonObjectives(rivalTeam?.name || 'Sydney Sharks');
          console.log('✅ Season 1 objectives generated');
        }

        // Advance phase to league
        advancePhase('league');

        // Emit the season opener news article. Mirrored in LeagueInitializer.js
        // (Season 2+) so both code paths produce the same opener.
        emitSeasonOpener({ gameStore: useGameStore, teamStore: useTeamStore, leagueStore: useLeagueStore });

        console.log('✅ League initialization complete!');
      } catch (error) {
        console.error('Error initializing league:', error);
        setSimError('Failed to initialize league. Please try again or contact support.');
      }
    }
  }, [auctionState, currentPhase, fixtures.length]); // Dependencies

  // Handle result modal close
  const handleResultModalClose = () => {
    setShowResultModal(false);
    setMatchResult(null);
  };

  return (
    <>
      {/* Match Result Modal - No longer used for AI matches (handled by Header) */}
      {showResultModal && matchResult && (
        <MatchResultModal
          isOpen={showResultModal}
          onClose={handleResultModalClose}
          matchResult={matchResult}
        />
      )}

      <div className="space-y-2">
        {/* Error Alert */}
        {simError && (
          <div className="card p-2 bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-500 mb-1">Simulation Error</h3>
                <p className="text-sm text-red-400">{simError}</p>
              </div>
              <button
                onClick={() => setSimError(null)}
                className="p-1 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
              >
                <CloseIcon className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Team Selection - Show if no team */}
        {!userTeam && (
          <div className="card p-8">
            <h1 className="text-2xl font-semibold text-text-primary mb-4">
              Welcome to Cricket Manager
            </h1>
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
          <>
            <h1 className="sr-only">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 items-start">
          {/* News carousel — top of the col-span-2 column. The carousel itself
              owns its fixed 240px height (CARD_HEIGHT in HomeNewsCarousel.jsx). */}
          <div className="md:col-span-2">
            <HomeNewsCarousel />
          </div>

          {/* League Position - Compressed Standings Table. Locked to the same
              fixed height as the news carousel so the two always line up. */}
          <div
            className="card-interactive p-2"
            onClick={() => navigate('/game/league')}
          >
            {standings.length > 0 ? (() => {
              // Sort standings
              const sortedStandings = [...standings].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                return b.netRunRate - a.netRunRate;
              });

              // Find user team position
              const userTeamIndex = sortedStandings.findIndex(t => t.clubId === userTeam?.id);
              const userPosition = userTeamIndex >= 0 ? userTeamIndex + 1 : null;
              const ordinal = (n) => {
                if (n == null) return '';
                const s = ['th', 'st', 'nd', 'rd'];
                const v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]);
              };
              const HOME_VISIBLE_ROWS = 7;
              const HOME_FORM_COUNT = 3;

              // Calculate which rows to show — user team centered unless at the edges.
              // For a 7-row window, that means 3 above + 3 below the user.
              const halfWindow = Math.floor(HOME_VISIBLE_ROWS / 2);
              let startIndex = 0;
              if (userTeamIndex < halfWindow) {
                startIndex = 0;
              } else if (userTeamIndex >= sortedStandings.length - halfWindow - 1) {
                startIndex = Math.max(0, sortedStandings.length - HOME_VISIBLE_ROWS);
              } else {
                startIndex = userTeamIndex - halfWindow;
              }

              const visibleStandings = sortedStandings.slice(startIndex, startIndex + HOME_VISIBLE_ROWS);

              return (
                <div className="overflow-x-auto">
                  {/* Eyebrow + star metric: user team's position is the hero
                      datum on this card. The table speaks for itself below. */}
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary">
                      League Standings
                    </span>
                    {userPosition && (
                      <span className="leading-none">
                        <span
                          className="text-[22px] font-bold text-text-primary"
                          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                          {ordinal(userPosition)}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-text-tertiary ml-1.5">
                          of {sortedStandings.length}
                        </span>
                      </span>
                    )}
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-primary text-text-secondary">
                        <th className="text-left py-1 px-1 font-medium">#</th>
                        <th className="text-left py-1 px-1 font-medium">Team</th>
                        <th className="text-center py-1 px-1 font-medium">P</th>
                        <th className="text-center py-1 px-1 font-medium">NRR</th>
                        <th className="text-center py-1 px-1 font-medium">Pts</th>
                        <th className="text-right py-1 px-1 font-medium pl-2">Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStandings.map((team, idx) => {
                        const actualIndex = startIndex + idx;
                        const isUserTeam = team.clubId === userTeam?.id;
                        const isPlayoffSpot = actualIndex < 4;
                        const played = team.played ?? ((team.won ?? 0) + (team.lost ?? 0) + (team.tied ?? 0) + (team.noResult ?? 0));
                        return (
                          <tr
                            key={team.clubId}
                            className={`border-b border-border-secondary transition-colors ${
                              isUserTeam
                                ? 'bg-cricket-accent/20 font-semibold'
                                : isPlayoffSpot
                                ? 'bg-green-900/20'
                                : ''
                            }`}
                          >
                            <td className={`py-1 px-1 font-mono ${isUserTeam ? 'text-cricket-accent' : 'text-text-secondary'}`}>
                              {actualIndex + 1}
                            </td>
                            <td className={`py-1 px-1 ${isUserTeam ? 'text-cricket-accent' : 'text-text-primary'}`}>
                              <TeamName teamId={team.clubId} variant="short" inline={true} className="text-xs" />
                            </td>
                            <td className="py-1 px-1 text-center font-mono text-text-primary">
                              {played}
                            </td>
                            <td className={`py-1 px-1 text-center font-mono ${team.netRunRate >= 0 ? 'text-text-positive' : 'text-text-negative'}`}>
                              {team.netRunRate >= 0 ? '+' : ''}{team.netRunRate.toFixed(2)}
                            </td>
                            <td className={`py-1 px-1 text-center font-bold font-mono ${isUserTeam ? 'text-cricket-accent' : 'text-text-primary'}`}>
                              {team.points}
                            </td>
                            <td className="py-1 px-1 pl-2 text-right">
                              {(() => {
                                const teamForm = computeRecentForm(results, team.clubId, HOME_FORM_COUNT);
                                if (teamForm.length === 0) {
                                  return <span className="text-text-tertiary/50">—</span>;
                                }
                                return (
                                  <span className="inline-flex items-center gap-0.5">
                                    {teamForm.map((res, ri) => (
                                      <span
                                        key={ri}
                                        className={`inline-block w-2 h-2 rounded-sm ${res === 'W' ? 'bg-status-win' : 'bg-status-loss'}`}
                                        title={res === 'W' ? 'Win' : 'Loss'}
                                      />
                                    ))}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })() : (
              <p className="text-text-secondary text-center py-6 text-sm">
                Season not started
              </p>
            )}
          </div>

          {/* Upcoming Calendar Events — taller, spans the next two grid rows
              on the left edge of the dashboard so the schedule reads as a
              full vertical column. Declared first in this band so grid
              auto-flow places it at col 1, then Next Match/Objectives fall
              into cols 2-3 of row 1, and Squad Status/Top Buys take cols 2-3
              of row 2 (col 1 of row 2 is occupied by this card's row-span). */}
          <div
            className="card-interactive p-2 row-span-2 h-full flex flex-col"
            onClick={() => navigate('/game/calendar')}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary mb-1.5">
              Upcoming
            </div>
            <div className="flex-1 min-h-0">
              <CalendarListView
                events={upcomingEvents}
                clubs={clubs}
                currentDate={currentDate}
                userTeamId={userTeamId}
                compact={true}
              />
            </div>
          </div>

          {/* ───────── Next Match ─────────
              Compact "vs opponent" card. Shows: opponent (user team implied),
              date, venue, plus the top batter and bowler of each team in a
              tight two-column grid. Marquee treatment (2px green top rail)
              keeps it visually distinct from the secondary cards.

              The earlier full-width Next Match block (badges + 4 best-performer
              tables) was retired in favour of this thinner version — see git
              history if you want to bring back the larger layout.  */}
          {nextFixture && homeTeam && awayTeam && (() => {
            const isHomeUser = homeTeam.id === userTeam?.id;
            const opponent = isHomeUser ? awayTeam : homeTeam;
            const userSidePerformers = isHomeUser ? homePerformers : awayPerformers;
            const oppoSidePerformers = isHomeUser ? awayPerformers : homePerformers;

            const matchDate = nextFixture.dateObj
              ? new Date(nextFixture.dateObj)
              : (nextFixture.date ? new Date(nextFixture.date) : null);
            const todayISO = new Date(currentDate || Date.now()).toDateString();
            const matchISO = matchDate ? matchDate.toDateString() : '';
            const isToday = matchDate && matchISO === todayISO;
            const dateLabel = matchDate
              ? (isToday
                  ? 'Tonight'
                  : matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))
              : '';
            const venue = nextFixture.venue || homeTeam.homeGround || '';

            // Team column = team-name header + top batter row + top bowler row.
            // No "Batter"/"Bowler" sub-eyebrows — the unit suffix (runs/wickets)
            // makes the role obvious.
            const TeamColumn = ({ side, performers, isUser }) => {
              const batter = performers?.topBatters?.[0];
              const bowler = performers?.topBowlers?.[0];
              return (
                <div className={`min-w-0 ${isUser ? 'bg-cricket-accent/5 rounded px-1.5 py-1 -mx-1.5 -my-1' : ''}`}>
                  <div className={`text-[11px] uppercase tracking-[0.14em] font-semibold pb-1 mb-1.5 border-b ${isUser ? 'text-cricket-accent border-cricket-accent/30' : 'text-text-secondary border-border-primary'}`}>
                    {side.shortName}
                  </div>
                  <div className="space-y-1">
                    {batter ? (
                      <div className="flex items-baseline justify-between gap-1 min-w-0">
                        <PlayerName playerId={batter.id} className="text-[12px] truncate" />
                        <span className="text-[11px] text-text-secondary font-mono whitespace-nowrap shrink-0">
                          {batter.seasonStats?.runs ?? 0} runs
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-tertiary italic">No batting stats</span>
                    )}
                    {bowler ? (
                      <div className="flex items-baseline justify-between gap-1 min-w-0">
                        <PlayerName playerId={bowler.id} className="text-[12px] truncate" />
                        <span className="text-[11px] text-text-secondary font-mono whitespace-nowrap shrink-0">
                          {bowler.seasonStats?.wickets ?? 0} wickets
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-tertiary italic">No bowling stats</span>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div
                className="card-interactive p-2.5 border-t-2 border-t-cricket-primary self-stretch h-full"
                onClick={() => navigate(`/game/match/${nextFixture.matchId}/preview`)}
              >
                {/* Eyebrow + matchday */}
                <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary mb-1.5">
                  Next Match{nextFixture?.matchday ? ` · MD ${nextFixture.matchday}` : ''}
                </div>

                {/* Opponent identity (left) with date + venue stacked on the right.
                    User team is implied — only the opponent is named. */}
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border-primary min-w-0">
                  <span className="text-text-tertiary uppercase tracking-[0.14em] font-semibold text-[11px] shrink-0">vs</span>
                  <img
                    src={getTeamBadge(opponent.id)}
                    alt={opponent.name}
                    className="w-7 h-7 shrink-0"
                  />
                  <span className="text-sm font-semibold text-text-primary truncate min-w-0 flex-1">
                    <TeamName teamId={opponent.id} inline />
                  </span>
                  <div className="shrink-0 flex flex-col items-end gap-0.5 text-[11px] leading-tight">
                    {dateLabel && (
                      <span className={`uppercase tracking-[0.14em] font-semibold ${isToday ? 'text-cricket-accent' : 'text-text-secondary'}`}>
                        {dateLabel}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-text-tertiary max-w-[150px]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{venue}</span>
                    </span>
                  </div>
                </div>

                {/* Two team columns side-by-side: top batter + top bowler each. */}
                <div className="grid grid-cols-2 gap-3">
                  <TeamColumn
                    side={isHomeUser ? homeTeam : awayTeam}
                    performers={userSidePerformers}
                    isUser={true}
                  />
                  <TeamColumn
                    side={opponent}
                    performers={oppoSidePerformers}
                    isUser={false}
                  />
                </div>
              </div>
            );
          })()}

          {/* Objectives — row 1 col 3. Two-column list: objective title (left,
              truncated) + status pill (right). Status is derived from the
              raw obj.status field which can be: completed | on_track |
              in_progress | pending | at_risk | failed. Mapped here into the
              four user-facing labels.
              `self-stretch h-full` stretches the card to match the Next Match
              height in the same row. */}
          <div
            className="card-interactive p-2 self-stretch h-full"
            onClick={() => navigate('/game/board')}
          >
            {(() => {
              const total = seasonObjectives?.length || 0;
              const done = (seasonObjectives || []).filter(o => o.status === 'completed').length;

              // Map raw status → display label + tone. `in_progress` and
              // `pending` both read as "On Track" since the objective is still
              // alive; only `at_risk` and `failed` flag trouble.
              const STATUS_MAP = {
                completed:   { label: 'Completed',     tone: 'text-status-win' },
                on_track:    { label: 'On Track',      tone: 'text-status-upcoming' },
                in_progress: { label: 'On Track',      tone: 'text-status-upcoming' },
                pending:     { label: 'On Track',      tone: 'text-text-tertiary' },
                at_risk:     { label: 'Falling Short', tone: 'text-status-tie' },
                failed:      { label: 'Failed',        tone: 'text-status-loss' }
              };

              return (
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary">
                      Objectives
                    </span>
                    {total > 0 && (
                      <span
                        className="text-[18px] font-bold leading-none text-text-primary"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        {done}/{total}
                      </span>
                    )}
                  </div>

                  {seasonObjectives && seasonObjectives.length > 0 ? (
                    <ul className="text-xs">
                      {seasonObjectives.slice(0, 5).map((obj) => {
                        const entry = STATUS_MAP[obj.status] || STATUS_MAP.pending;
                        return (
                          <li
                            key={obj.id}
                            className="flex items-center justify-between gap-2 py-0.5 border-b border-border-secondary/50 last:border-0"
                          >
                            <span className="truncate flex-1 text-text-primary">{obj.title}</span>
                            <span className={`text-[10px] uppercase tracking-[0.12em] font-semibold whitespace-nowrap ${entry.tone}`}>
                              {entry.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-text-tertiary italic">Objectives will be generated at season start</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Recent Form card removed — W/L badges live inline under the
              League Standings table now. Code in git history.
              Financial Summary temporarily hidden — uncomment to restore:
                <FinancialSummary compact={true} onClick={() => navigate('/game/board?tab=finances')} />
              Upcoming card moved up — see the row-span-2 version above. */}

          {/* Squad Status — row 2 col 2. Three player rows with stacked
              fitness/fatigue bar. Styled to match Top Buys (same row padding,
              eyebrow + hero metric pattern). */}
          <div
            className="card-interactive p-2"
            onClick={() => navigate('/game/squad?tab=condition')}
          >
            {(() => {
              const sortedSquad = [...squad].sort((a, b) => {
                const aCondition = a.condition || {};
                const bCondition = b.condition || {};
                const aInjured = aCondition.injury ? 1 : 0;
                const bInjured = bCondition.injury ? 1 : 0;
                if (aInjured !== bInjured) return bInjured - aInjured;
                if (aInjured && bInjured) {
                  return (bCondition.injuryDuration ?? 0) - (aCondition.injuryDuration ?? 0);
                }
                const aFatigue = aCondition.fatigue ?? 0;
                const bFatigue = bCondition.fatigue ?? 0;
                if (aFatigue !== bFatigue) return bFatigue - aFatigue;
                const aFitness = aCondition.fitness ?? 85;
                const bFitness = bCondition.fitness ?? 85;
                return aFitness - bFitness;
              });
              const displayPlayers = sortedSquad.slice(0, 5);
              const injuredCount = squad.filter(p => p.condition?.injury).length;

              const heroLabel = injuredCount > 0
                ? `${injuredCount} Injured`
                : `${squad.length}/25 Fit`;
              const heroTone = injuredCount > 0 ? 'text-status-loss' : 'text-text-primary';

              return (
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary">
                      Squad Status
                    </span>
                    <span
                      className={`text-[18px] font-bold leading-none ${heroTone}`}
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {heroLabel}
                    </span>
                  </div>

                  <table className="w-full text-xs table-fixed">
                    <tbody>
                      {displayPlayers.map((player) => {
                        const condition = player.condition || {};
                        const isInjured = !!condition.injury;
                        const fitness = condition.fitness ?? 85;
                        const fatigue = condition.fatigue ?? 0;
                        return (
                          <tr
                            key={player.id}
                            className={`border-b border-border-secondary/50 last:border-0 ${isInjured ? 'bg-status-loss/10' : ''}`}
                          >
                            <td className="py-0.5 pr-2 truncate">
                              <PlayerName playerId={player.id} className="text-xs" />
                            </td>
                            <td className="py-0.5 w-[90px]">
                              <div className="relative h-1.5 bg-bg-tertiary rounded-full overflow-hidden" title={`Fitness ${Math.round(fitness)} · Fatigue ${Math.round(fatigue)}`}>
                                <div
                                  className="absolute inset-y-0 left-0 bg-status-win"
                                  style={{ width: `${Math.max(0, fitness - fatigue)}%` }}
                                />
                                {fatigue > 0 && (
                                  <div
                                    className="absolute inset-y-0 bg-status-loss/70"
                                    style={{ left: `${Math.max(0, fitness - fatigue)}%`, width: `${Math.min(fatigue, fitness)}%` }}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="py-0.5 pl-2 text-right font-mono whitespace-nowrap w-10">
                              {isInjured ? (
                                <span className="text-xxs text-status-loss">
                                  {condition.injuryDuration ? `${condition.injuryDuration}d` : 'OUT'}
                                </span>
                              ) : (
                                <span className="text-xxs text-text-tertiary">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Top Auction Buys / Latest Transfers — row 2 col 3. Mirrors the
              Squad Status card visually: eyebrow + hero metric (peak fee) on
              the right, three rows of py-1.5 below. */}
          <div
            className="card-interactive p-2"
            onClick={() => navigate('/game/transfers')}
          >
            {(() => {
              const displayTransfers = latestTransfers.slice(0, 5);
              const peakPrice = displayTransfers.reduce((max, t) => Math.max(max, t.price || 0), 0);
              const peakLabel = peakPrice >= 1_000_000
                ? `$${(peakPrice / 1_000_000).toFixed(1)}M`
                : peakPrice >= 1_000
                  ? `$${Math.round(peakPrice / 1_000)}K`
                  : '$0';
              return (
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-text-secondary">
                      {isTransferMode ? 'Transfer Activity' : 'Top Auction Buys'}
                    </span>
                    {displayTransfers.length > 0 && (
                      <span
                        className="text-[18px] font-bold leading-none text-text-primary"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        {peakLabel}
                      </span>
                    )}
                  </div>

                  {displayTransfers.length > 0 ? (
                    <table className="w-full text-xs table-fixed">
                      <tbody>
                        {displayTransfers.map((transfer, idx) => (
                          <tr key={`${transfer.playerId}-${idx}`} className="border-b border-border-secondary/50 last:border-0">
                            <td className="py-0.5 pr-2 text-text-primary truncate">
                              <PlayerName playerId={transfer.playerId} className="text-xs" />
                            </td>
                            {isTransferMode ? (
                              <>
                                <td className="py-0.5 text-text-secondary truncate w-[40px]">
                                  {transfer.fromTeamId
                                    ? <TeamName teamId={transfer.fromTeamId} variant="short" inline className="text-xs" />
                                    : <span className="text-text-tertiary text-xs">FA</span>
                                  }
                                </td>
                                <td className="py-0.5 text-center px-0.5 w-4">
                                  <ChevronRight className="w-3 h-3 text-text-tertiary inline" />
                                </td>
                                <td className="py-0.5 text-text-primary truncate w-[40px]">
                                  {transfer.toTeamId
                                    ? <TeamName teamId={transfer.toTeamId} variant="short" inline className="text-xs" />
                                    : <span className="text-text-tertiary text-xs">FA</span>
                                  }
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-0.5 text-center px-1 w-4">
                                  <ChevronRight className="w-3 h-3 text-text-tertiary inline" />
                                </td>
                                <td className="py-0.5 text-text-secondary truncate w-[60px]">
                                  <TeamName teamId={transfer.teamId} variant="short" inline className="text-xs" />
                                </td>
                              </>
                            )}
                            <td className="py-0.5 pl-2 text-right font-mono text-text-primary font-semibold whitespace-nowrap w-14">
                              {transfer.price >= 1000000
                                ? `$${(transfer.price / 1000000).toFixed(1)}M`
                                : `$${(transfer.price / 1000).toFixed(0)}K`
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-text-tertiary italic text-center py-3">
                      {isTransferMode ? 'No transfer activity yet' : 'No auction data yet'}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

        </div>
      </>
      )}
      </div>

      {/* Contextual Tip for first visit */}
      {showTip && (
        <ContextualTip
          title={screenTips.home.title}
          icon={screenTips.home.icon}
          tips={screenTips.home.tips}
          onDismiss={dismissTip}
        />
      )}
    </>
  );
};

export default Home;