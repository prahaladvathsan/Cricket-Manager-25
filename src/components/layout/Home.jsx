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
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import MatchResultModal from '../shared/MatchResultModal';
import MatchWeekScheduleGenerator from '../../core/league/MatchWeekScheduleGenerator';

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
  const { auctionState } = useAuctionStore();

  // Component state
  const [showResultModal, setShowResultModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [simError, setSimError] = useState(null);

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
  const finances = useFinanceStore(state =>
    userTeam ? state.getTeamFinances(userTeam.id) : null
  );

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
        const clubs = allTeams.map(team => ({
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          homeVenue: team.homeGround || `${team.name} Stadium`,
          homeGround: team.homeGround || `${team.name} Stadium`
        }));

        // Generate fixtures using MatchWeekScheduleGenerator
        const scheduleGenerator = new MatchWeekScheduleGenerator();
        const seasonStartDate = new Date(currentDate);
        const { fixtures: generatedFixtures } = scheduleGenerator.generateMatchWeekSchedule(
          clubs,
          seasonStartDate
        );

        console.log(`✅ Generated ${generatedFixtures.length} fixtures`);

        // Initialize league season
        initializeSeason({
          seasonId: `season_${currentSeason}`,
          seasonName: `Season ${currentSeason}`,
          clubs: clubs,
          fixtures: generatedFixtures,
          useMatchWeeks: false
        });

        // Schedule match events in calendar
        clearEvents(); // Clear any existing events

        // Calculate game start date (day 1) from current date and game day
        const currentGameDate = new Date(currentDate);
        const gameStartDate = new Date(currentGameDate);
        gameStartDate.setDate(gameStartDate.getDate() - (gameDay - 1));

        // Calculate game days for each fixture based on their dates
        const matchEvents = generatedFixtures.map(fixture => {
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
        console.log(`📅 Scheduled ${matchEvents.length} match events in calendar`);

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

      <div className="space-y-4">
        {/* Header - More compact */}
        <div className="flex items-center justify-between border-b border-border-primary pb-3">
          <h1 className="text-3xl font-semibold text-text-primary">Home</h1>
        </div>

        {/* Error Alert */}
        {simError && (
          <div className="card p-4 bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Next Match Card - Spans 2 columns */}
          <div className="card p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
              <Calendar className="w-4 h-4 text-cricket-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Next Match
              </h3>
            </div>
            {nextFixture && homeTeam && awayTeam ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="text-text-primary font-semibold">
                    {homeTeam.name}
                  </div>
                  <div className="text-text-secondary text-lg font-bold">VS</div>
                  <div className="text-text-primary font-semibold">
                    {awayTeam.name}
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
    </>
  );
};

export default Home;