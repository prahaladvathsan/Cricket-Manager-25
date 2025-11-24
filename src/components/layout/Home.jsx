/**
 * @file Home.jsx
 * @description Home page with season overview and game progression
 */

import React, { useState, useEffect } from 'react';
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
  X as CloseIcon
} from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useFinanceStore from '../../stores/financeStore';
import useMatchStore from '../../stores/matchStore';
import useAuctionStore from '../../stores/auctionStore';
import useInboxStore from '../../stores/inboxStore';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import { getPlayerRating } from '../../utils/ratingHelper';
import TeamName from '../shared/TeamName';
import MatchResultModal from '../shared/MatchResultModal';
import MatchWeekScheduleGenerator from '../../core/league/MatchWeekScheduleGenerator';
import FinancialSummary from '../board/FinancialSummary';
import FinancialDetailsModal from '../board/FinancialDetailsModal';
import MessageGenerator from '../../utils/MessageGenerator';

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
    isWeekend
  } = useGameStore();
  const { getUserTeam, initializeAllTeamsTactics } = useTeamStore();
  const userTeam = getUserTeam();
  const { auctionState, soldPlayers } = useAuctionStore();
  const { addMessage } = useInboxStore();

  // Component state
  const [showResultModal, setShowResultModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [simError, setSimError] = useState(null);
  const [showFinancialModal, setShowFinancialModal] = useState(false);

  // Get league data
  const standings = useLeagueStore(state => state.standings);
  const results = useLeagueStore(state => state.results);
  const fixtures = useLeagueStore(state => state.fixtures);
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

  // Get finances
  const financeStoreState = useFinanceStore();
  const finances = userTeam ? financeStoreState.getTeamFinances(userTeam.id) : null;

  // Migration: Initialize finances if not already initialized
  useEffect(() => {
    if (userTeam && !financeStoreState.initialized) {
      console.log('💰 Home - Initializing finances for existing save...');
      const allTeams = Object.values(useTeamStore.getState().teams).map(team => ({
        id: team.id,
        name: team.name
      }));

      if (allTeams.length > 0) {
        financeStoreState.initializeSeason(allTeams, `season_${currentSeason}`, null);
        console.log('✅ Home - Finances initialized for', allTeams.length, 'teams');
      }
    }
  }, [userTeam, financeStoreState.initialized]);

  // Get current event (could be today's match or upcoming)
  const todayEvent = getCurrentEvent();

  // Find next match for user team specifically
  const nextUserFixture = fixtures.find(fixture =>
    fixture.status === 'scheduled' &&
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
            homeVenue: team.homeGround || `${team.name} Stadium`,
            homeGround: team.homeGround || `${team.name} Stadium`,
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

        // Season ends on transfer window close date
        const seasonEndDay = transferWindowEndDay;

        // Next season auction (first day after current season ends)
        const nextSeasonStartDate = new Date(transferWindowEndDate);
        nextSeasonStartDate.setDate(nextSeasonStartDate.getDate() + 1);
        const nextSeasonStartDay = Math.ceil((nextSeasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

        const additionalEvents = [
          { day: offseasonStartDay, type: 'offseason_start' },
          { day: transferWindowStartDay, type: 'transfer_window_open' },
          { day: transferWindowEndDay, type: 'transfer_window_close' },
          { day: seasonEndDay, type: 'season_end', data: { season: currentSeason } },
          { day: nextSeasonStartDay, type: 'auction', data: { season: currentSeason + 1 } }
        ];

        scheduleEvents(additionalEvents);
        console.log(`📅 Scheduled ${additionalEvents.length} additional seasonal events`);

        // Generate inbox messages (welcome, expectations, tutorial, auction summary)
        if (userTeam) {
          addMessage(MessageGenerator.generateWelcomeMessage(userTeam, currentSeason));
          addMessage(MessageGenerator.generateExpectationsMessage(userTeam, currentSeason));
          addMessage(MessageGenerator.generateTutorialMessage());

          // Generate auction summary
          const userSquadIds = useTeamStore.getState().squadLists[userTeam.id] || [];
          const userSquad = userSquadIds.map(id => usePlayerStore.getState().players[id]).filter(Boolean);
          const userTeamSales = soldPlayers.filter(sale => sale.teamId === userTeam.id);
          const finances = {
            totalSpent: userTeamSales.reduce((sum, sale) => sum + sale.price, 0),
            budgetRemaining: 0 // Will be calculated by finance store
          };
          addMessage(MessageGenerator.generateAuctionSummaryMessage(userSquad, finances));

          console.log('📬 Generated 4 inbox messages (welcome, expectations, tutorial, auction summary)');
        }

        // Initialize tactics for all teams
        console.log('🎯 Initializing tactics for all teams...');
        initializeAllTeamsTactics();

        // Advance phase to league
        advancePhase('league');

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

      {/* Financial Details Modal */}
      <FinancialDetailsModal
        isOpen={showFinancialModal}
        onClose={() => setShowFinancialModal(false)}
      />

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {/* Next Match Card - Spans 2 columns */}
          <div className="card p-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
              <Calendar className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Next Match
              </h3>
            </div>
            {nextFixture && homeTeam && awayTeam ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="font-semibold">
                    <TeamName teamId={homeTeam.id} inline={true} className="font-semibold" />
                  </div>
                  <div className="text-text-secondary text-lg font-bold">VS</div>
                  <div className="font-semibold">
                    <TeamName teamId={awayTeam.id} inline={true} className="font-semibold" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{nextFixture.venue || homeTeam.homeGround}</span>
                  </div>
                  {nextFixture.matchday && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Matchday {nextFixture.matchday}</span>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/game/squad')}
                    className="btn-secondary w-full text-sm py-2"
                  >
                    Set Tactics
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary text-center py-6 text-sm">
                No upcoming matches scheduled
              </p>
            )}
          </div>

          {/* League Position */}
          <div className="card p-2">
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
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
          <div className="card p-2">
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
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
                <span className="text-text-secondary">Avg Rating</span>
                <span className="text-text-primary font-mono">
                  {squad.length > 0
                    ? (squad.reduce((sum, p) => sum + getPlayerRating(p), 0) / squad.length).toFixed(1)
                    : '0.0'}
                </span>
              </div>
              <button className="btn-secondary w-full mt-3 text-sm py-1.5">View Squad</button>
            </div>
          </div>

          {/* Recent Form */}
          <div className="card p-2">
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
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
          <FinancialSummary
            compact={true}
            onClick={() => setShowFinancialModal(true)}
          />

          {/* Objectives */}
          <div className="card p-2">
            <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
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
    </>
  );
};

export default Home;