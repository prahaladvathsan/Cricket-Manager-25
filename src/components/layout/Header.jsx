/**
 * @file Header.jsx
 * @description Top header component with quick actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, ChevronRight, Users, Play, FastForward, ArrowLeft, ChevronDown } from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useMatchStore from '../../stores/matchStore';
import useFinanceStore from '../../stores/financeStore';
import useNavigationStore from '../../stores/navigationStore';
import useInboxStore from '../../stores/inboxStore';
import useAuctionStore from '../../stores/auctionStore';
import SaveGameModal from '../shared/SaveGameModal';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import MessageGenerator from '../../utils/MessageGenerator';
import { useMatchResultModal } from '../../hooks/useMatchResultModal';
import PrizeDistributor from '../../core/offseason/PrizeDistributor';
import SeasonSummaryView from '../OffSeason/SeasonSummaryView';
import { getTeamBadge } from '../../utils/assetHelpers';
import MatchWeekScheduleGenerator from '../../core/league/MatchWeekScheduleGenerator';
import PlayoffGenerator from '../../core/league/PlayoffGenerator';

const Header = () => {
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);
  const [showSeasonSummary, setShowSeasonSummary] = useState(false);
  const dropdownRef = useRef(null);

  // Match result modal hook
  const { showResult, ModalComponent: MatchResultModalComponent } = useMatchResultModal({
    onClose: () => {
      // Advance day when modal closes
      advanceDay();
    }
  });

  const {
    currentSeason,
    currentPhase,
    currentDate,
    gameDay,
    currentWeek,
    advanceDay,
    getCurrentEvent,
    isWeekend,
    calendarEvents,
    resetForNewSeason
  } = useGameStore();
  const { getUserTeam, teams } = useTeamStore();
  const { getClub, recordResult, recalculateStandings, advanceToNextMatch, standings, champion, initializeLeague: initializeLeagueStore } = useLeagueStore();
  const { processMatchFinancials } = useFinanceStore();
  const { goBack, canGoBack } = useNavigationStore();
  const { addMessage } = useInboxStore();
  const { auctionState } = useAuctionStore();

  const userTeam = getUserTeam();
  const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMatchDropdown(false);
      }
    };

    if (showMatchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMatchDropdown]);

  // Handle Quick-sim for user matches
  const handleQuickSimUserMatch = async (fixture) => {
    setIsSimulating(true);
    setShowMatchDropdown(false);

    try {
      const homeTeam = getClub(fixture.homeTeam);
      const awayTeam = getClub(fixture.awayTeam);

      if (!homeTeam || !awayTeam) {
        throw new Error('Team data not found for match');
      }

      // Get playing XI from team tactics (properly configured after auction)
      const homeTactics = useTeamStore.getState().getTeamTactics(homeTeam.id);
      const awayTactics = useTeamStore.getState().getTeamTactics(awayTeam.id);

      // Use tactics squadSelection if available, otherwise fallback to first 11 players
      let homePlayingXI, awayPlayingXI;

      if (homeTactics?.squadSelection && homeTactics.squadSelection.length === 11) {
        homePlayingXI = homeTactics.squadSelection;
      } else {
        console.warn(`⚠️ No tactics found for ${homeTeam.name}, using first 11 players`);
        const homePlayers = usePlayerStore.getState().getPlayersByTeam(homeTeam.id);
        homePlayingXI = homePlayers.slice(0, 11).map(p => p.id);
      }

      if (awayTactics?.squadSelection && awayTactics.squadSelection.length === 11) {
        awayPlayingXI = awayTactics.squadSelection;
      } else {
        console.warn(`⚠️ No tactics found for ${awayTeam.name}, using first 11 players`);
        const awayPlayers = usePlayerStore.getState().getPlayersByTeam(awayTeam.id);
        awayPlayingXI = awayPlayers.slice(0, 11).map(p => p.id);
      }

      const tossWinnerId = Math.random() < 0.5 ? homeTeam.id : awayTeam.id;
      const tossDecision = Math.random() < 0.5 ? 'bat' : 'bowl';

      const matchConfig = {
        id: fixture.matchId,
        homeTeam: {
          ...homeTeam,
          playingXI: homePlayingXI,  // matchStore expects playingXI
          players: homePlayingXI      // MatchEngine expects players
        },
        awayTeam: {
          ...awayTeam,
          playingXI: awayPlayingXI,
          players: awayPlayingXI
        },
        venue: fixture.venue || homeTeam.homeGround,
        tossWinner: tossWinnerId,
        tossDecision: tossDecision
      };

      // Run quick simulation
      const result = await quickSimMatch(
        matchConfig,
        useMatchStore,
        usePlayerStore,
        useTeamStore,
        useLeagueStore
      );

      if (!result || !result.winner) {
        throw new Error('Invalid match result');
      }

      // Determine which team batted first
      const firstBattingTeam = result.innings1.battingTeam === homeTeam.id ? homeTeam : awayTeam;
      const secondBattingTeam = result.innings2.battingTeam === homeTeam.id ? homeTeam : awayTeam;

      // Prepare full scorecard data for storage
      const fullScorecard = {
        venue: fixture.venue || homeTeam.homeGround,
        matchType: 'World Premier League T20',
        firstBattingTeam: {
          id: firstBattingTeam.id,
          name: firstBattingTeam.name,
          colors: firstBattingTeam.colors
        },
        secondBattingTeam: {
          id: secondBattingTeam.id,
          name: secondBattingTeam.name,
          colors: secondBattingTeam.colors
        },
        innings1Data: {
          totalScore: result.innings1.totalScore,
          wickets: result.innings1.wickets,
          overs: result.innings1.overs,
          balls: result.innings1.balls,
          topBatsmen: result.innings1.topBatsmen,
          topBowlers: result.innings1.topBowlers
        },
        innings2Data: {
          totalScore: result.innings2.totalScore,
          wickets: result.innings2.wickets,
          overs: result.innings2.overs,
          balls: result.innings2.balls,
          topBatsmen: result.innings2.topBatsmen,
          topBowlers: result.innings2.topBowlers
        },
        winner: result.winner,
        margin: result.margin.replace('by ', ''),
        playerOfMatch: result.playerOfMatch
      };

      // Record result with full scorecard for clickable results
      recordResult(result, fullScorecard);
      recalculateStandings();

      // Process match financials (revenue and performance tracking)
      processMatchFinancials(result, standings);

      advanceToNextMatch();

      // Show result modal using hook
      showResult(fullScorecard);

      // Don't advance day yet - wait for user to close modal
    } catch (error) {
      console.error('Error simulating user match:', error);
      // Still advance day on error
      advanceDay();
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper function to initialize league for new season
  const initializeNewSeasonLeague = () => {
    console.log('🏏 Initializing league for new season...');

    const gameStartDate = new Date('2025-01-01');

    // Create clubs array from teamStore
    const allTeams = Object.values(teams);
    const clubs = allTeams.map(team => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName || team.name.substring(0, 3).toUpperCase(),
      homeVenue: team.homeGround || `${team.name} Stadium`,
      homeGround: team.homeGround || `${team.name} Stadium`,
      colors: team.colors || { primary: '#2D5F3F', secondary: '#D4AF37' }
    }));

    // Generate fixtures starting 7 days from current date
    const leagueStartDate = new Date(currentDate);
    leagueStartDate.setDate(leagueStartDate.getDate() + 7);

    const scheduleGenerator = new MatchWeekScheduleGenerator();
    const { fixtures } = scheduleGenerator.generateMatchWeekSchedule(clubs, leagueStartDate);

    // Find last group match date
    const lastGroupMatchDate = new Date(Math.max(...fixtures.map(f => new Date(f.dateObj))));

    // Calculate playoff start date (next Monday after last group match)
    const playoffStartDate = new Date(lastGroupMatchDate);
    const dayOfWeek = playoffStartDate.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    playoffStartDate.setDate(playoffStartDate.getDate() + daysUntilMonday);

    const playoffGenerator = new PlayoffGenerator();
    const placeholderStandings = [
      { clubId: null, clubName: 'TBD (1st)', position: 1 },
      { clubId: null, clubName: 'TBD (2nd)', position: 2 },
      { clubId: null, clubName: 'TBD (3rd)', position: 3 },
      { clubId: null, clubName: 'TBD (4th)', position: 4 }
    ];

    const playoffFixturesRaw = playoffGenerator.generatePlayoffFixtures(placeholderStandings);

    // Space playoffs over 10 days
    const playoffFixtures = playoffFixturesRaw.map((fixture, index) => {
      const dayOffset = index === 0 ? 0 : index === 1 ? 3 : index === 2 ? 6 : 10;
      const fixtureDate = new Date(playoffStartDate);
      fixtureDate.setDate(fixtureDate.getDate() + dayOffset);
      const fixtureDay = Math.ceil((fixtureDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

      return {
        ...fixture,
        date: fixtureDate.toISOString().split('T')[0],
        dateObj: fixtureDate,
        gameDay: fixtureDay
      };
    });

    const allFixtures = [...fixtures, ...playoffFixtures];

    // Convert fixtures to calendar events
    const matchEvents = fixtures.map(fixture => ({
      day: fixture.gameDay,
      type: 'match',
      data: fixture
    }));

    // Calculate final match date and additional events
    const finalMatchDate = new Date(Math.max(...fixtures.map(f => new Date(f.dateObj))));
    const isOddSeason = currentSeason % 2 === 1;

    const seasonEndDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, isOddSeason ? 30 : 31);
    const seasonEndDay = Math.ceil((seasonEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

    const offseasonStartDate = new Date(finalMatchDate);
    offseasonStartDate.setDate(offseasonStartDate.getDate() + 1);
    const offseasonStartDay = Math.ceil((offseasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

    const transferWindowStartDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, 1);
    const transferWindowEndDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, isOddSeason ? 30 : 31);

    const transferWindowStartDay = Math.ceil((transferWindowStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
    const transferWindowEndDay = Math.ceil((transferWindowEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

    // Next season start
    const nextSeasonStartDate = new Date(transferWindowEndDate);
    nextSeasonStartDate.setDate(nextSeasonStartDate.getDate() + 1);
    const nextSeasonStartDay = Math.ceil((nextSeasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

    const additionalEvents = [
      { day: offseasonStartDay, type: 'offseason_start' },
      { day: transferWindowStartDay, type: 'transfer_window_open' },
      { day: transferWindowEndDay, type: 'transfer_window_close' },
      { day: seasonEndDay, type: 'season_end', data: { season: currentSeason } }
    ];

    // Schedule next season event
    const nextSeason = currentSeason + 1;
    const isNextSeasonOdd = nextSeason % 2 === 1;
    if (isNextSeasonOdd) {
      additionalEvents.push({ day: nextSeasonStartDay, type: 'auction', data: { season: nextSeason } });
    } else {
      additionalEvents.push({ day: nextSeasonStartDay, type: 'preseason_start', data: { season: nextSeason } });
    }

    // Schedule all events
    useGameStore.getState().scheduleEvents([...matchEvents, ...additionalEvents]);
    useGameStore.getState().advancePhase('league');

    // Initialize league store
    initializeLeagueStore(allFixtures, clubs);

    console.log(`✅ League initialized: ${fixtures.length} group matches, ${playoffFixtures.length} playoff matches`);
  };

  // Handle Continue button click
  const handleContinue = async () => {
    if (isSimulating) return;

    // CRITICAL FIX: If we're in preseason phase but have no scheduled events (league not initialized)
    // This happens after auction completes on odd seasons
    if (currentPhase === 'preseason' && calendarEvents.length === 0) {
      console.log('⚠️ Detected preseason with no events - initializing league...');
      initializeNewSeasonLeague();
    }

    // Check for event on current day
    const event = getCurrentEvent();

    if (event && event.type === 'match') {
      // Match event - show dropdown for user matches or quick-sim for AI matches
      const fixture = event.data;
      const isUserMatch = fixture && userTeam && (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);

      if (isUserMatch) {
        // Toggle dropdown for user team matches
        setShowMatchDropdown(!showMatchDropdown);
      } else {
        // Quick-sim AI vs AI match
        setIsSimulating(true);

        try {
          const homeTeam = getClub(fixture.homeTeam);
          const awayTeam = getClub(fixture.awayTeam);

          if (!homeTeam || !awayTeam) {
            throw new Error('Team data not found for match');
          }

          // Get playing XI from team tactics (properly configured after auction)
          const homeTactics = useTeamStore.getState().getTeamTactics(homeTeam.id);
          const awayTactics = useTeamStore.getState().getTeamTactics(awayTeam.id);

          // Use tactics squadSelection if available, otherwise fallback to first 11 players
          let homePlayingXI, awayPlayingXI;

          if (homeTactics?.squadSelection && homeTactics.squadSelection.length === 11) {
            homePlayingXI = homeTactics.squadSelection;
          } else {
            console.warn(`⚠️ No tactics found for ${homeTeam.name}, using first 11 players`);
            const homePlayers = usePlayerStore.getState().getPlayersByTeam(homeTeam.id);
            homePlayingXI = homePlayers.slice(0, 11).map(p => p.id);
          }

          if (awayTactics?.squadSelection && awayTactics.squadSelection.length === 11) {
            awayPlayingXI = awayTactics.squadSelection;
          } else {
            console.warn(`⚠️ No tactics found for ${awayTeam.name}, using first 11 players`);
            const awayPlayers = usePlayerStore.getState().getPlayersByTeam(awayTeam.id);
            awayPlayingXI = awayPlayers.slice(0, 11).map(p => p.id);
          }

          const tossWinnerId = Math.random() < 0.5 ? homeTeam.id : awayTeam.id;
          const tossDecision = Math.random() < 0.5 ? 'bat' : 'bowl';

          const matchConfig = {
            id: fixture.matchId,
            homeTeam: {
              ...homeTeam,
              playingXI: homePlayingXI,  // matchStore expects playingXI
              players: homePlayingXI      // MatchEngine expects players
            },
            awayTeam: {
              ...awayTeam,
              playingXI: awayPlayingXI,
              players: awayPlayingXI
            },
            venue: fixture.venue || homeTeam.homeGround,
            tossWinner: tossWinnerId,
            tossDecision: tossDecision
          };

          // Run quick simulation
          const result = await quickSimMatch(
            matchConfig,
            useMatchStore,
            usePlayerStore,
            useTeamStore,
            useLeagueStore
          );

          if (!result || !result.winner) {
            throw new Error('Invalid match result');
          }

          // Determine which team batted first
          const firstBattingTeam = result.innings1.battingTeam === homeTeam.id ? homeTeam : awayTeam;
          const secondBattingTeam = result.innings2.battingTeam === homeTeam.id ? homeTeam : awayTeam;

          // Prepare full scorecard data for storage
          const fullScorecard = {
            venue: fixture.venue || homeTeam.homeGround,
            matchType: 'World Premier League T20',
            firstBattingTeam: {
              id: firstBattingTeam.id,
              name: firstBattingTeam.name,
              colors: firstBattingTeam.colors
            },
            secondBattingTeam: {
              id: secondBattingTeam.id,
              name: secondBattingTeam.name,
              colors: secondBattingTeam.colors
            },
            innings1Data: {
              totalScore: result.innings1.totalScore,
              wickets: result.innings1.wickets,
              overs: result.innings1.overs,
              balls: result.innings1.balls,
              topBatsmen: result.innings1.topBatsmen,
              topBowlers: result.innings1.topBowlers
            },
            innings2Data: {
              totalScore: result.innings2.totalScore,
              wickets: result.innings2.wickets,
              overs: result.innings2.overs,
              balls: result.innings2.balls,
              topBatsmen: result.innings2.topBatsmen,
              topBowlers: result.innings2.topBowlers
            },
            winner: result.winner,
            margin: result.margin.replace('by ', ''),
            playerOfMatch: result.playerOfMatch
          };

          // Record result with full scorecard for clickable results
          recordResult(result, fullScorecard);
          recalculateStandings();
          advanceToNextMatch();

          // Show result modal using hook
          showResult(fullScorecard);

          // Don't advance day yet - wait for user to close modal
        } catch (error) {
          console.error('Error simulating match:', error);
          // Still advance day on error
          advanceDay();
        } finally {
          setIsSimulating(false);
        }
      }
    } else if (event && event.type === 'auction') {
      // ODD SEASON: Auction event
      // Transition to new season BEFORE auction
      console.log('🔄 Auction event - Transitioning to new season...');
      resetForNewSeason();
      console.log(`✅ Season transition complete - Now in Season ${currentSeason + 1}`);

      // Check if auction is already completed
      if (auctionState === 'completed') {
        // Auction already done, initialize league and advance day
        initializeNewSeasonLeague();
        advanceDay();
      } else {
        // Navigate to transfers page for auction
        // League will be initialized after auction completes
        navigate('/game/transfers');
      }
    } else if (event && event.type === 'preseason_start') {
      // EVEN SEASON: Preseason start (no auction)
      console.log('🔄 Preseason start for even season - Transitioning to new season...');
      resetForNewSeason();
      console.log(`✅ Season transition complete - Now in Season ${currentSeason + 1}`);

      // Initialize league immediately (no auction for even seasons)
      initializeNewSeasonLeague();

      // Just advance day - don't navigate away
      advanceDay();
    } else if (event && (event.type === 'season_end' || event.type === 'offseason_start')) {
      // SEASON END EVENT - Distribute prizes, show summary, send inbox message
      console.log('🏆 Season End Event Triggered!');

      try {
        // 1. Distribute prize money to all teams
        const prizeDistributor = new PrizeDistributor(useFinanceStore);
        const prizeResults = prizeDistributor.distributePrizes(standings, champion);
        console.log(`💰 Prize distribution complete: $${(prizeResults.totalDistributed / 1000000).toFixed(2)}M distributed`);

        // 2. Send comprehensive season summary inbox message to user
        if (userTeam) {
          // Find user team's final position
          const sortedStandings = [...standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.netRunRate - a.netRunRate;
          });

          const userStanding = sortedStandings.find(s => s.clubId === userTeam.id);
          const finalPosition = sortedStandings.indexOf(userStanding) + 1;
          const prizeMoney = prizeDistributor.getPrizeForPosition(finalPosition);

          // Build season stats for the user's team
          const stats = {
            matchesPlayed: userStanding?.played || 0,
            wins: userStanding?.won || 0,
            losses: userStanding?.lost || 0,
            points: userStanding?.points || 0,
            nrr: userStanding?.netRunRate || 0
          };

          // Send inbox message
          addMessage(MessageGenerator.generateSeasonSummaryMessage(
            currentSeason,
            userTeam,
            finalPosition,
            prizeMoney,
            champion,
            stats
          ));
          console.log(`📬 Season summary message sent to ${userTeam.name}`);
        }

        // 3. Show Season Summary Modal (user must acknowledge before continuing)
        setShowSeasonSummary(true);
        // Don't advance day yet - modal will advance on close
        // NOTE: Do NOT call resetForNewSeason() here! That happens later.

      } catch (error) {
        console.error('Error processing season end:', error);
        // Just advance day on error
        advanceDay();
      }
    } else {
      // Advance day (no event or rest day)
      const dayInfo = advanceDay();

      // Check if tomorrow has a match event
      const tomorrowEvent = calendarEvents.find(e => e.day === dayInfo.gameDay + 1);
      if (tomorrowEvent && tomorrowEvent.type === 'match' && userTeam) {
        const fixture = tomorrowEvent.data;
        const isUserMatch = fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id;

        if (isUserMatch) {
          // Generate match reminder message
          const homeTeam = getClub(fixture.homeTeam);
          const awayTeam = getClub(fixture.awayTeam);
          const isUserHome = fixture.homeTeam === userTeam.id;

          if (homeTeam && awayTeam) {
            addMessage(MessageGenerator.generateMatchReminderMessage(
              fixture,
              homeTeam,
              awayTeam,
              isUserHome
            ));
          }
        }
      }
    }
  };

  // Get button label based on current event
  const getContinueButtonLabel = () => {
    if (isSimulating) return 'Simulating...';

    const event = getCurrentEvent();
    if (event && event.type === 'match') {
      const fixture = event.data;
      const isUserMatch = fixture && userTeam && (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);
      return isUserMatch ? 'Matchday' : 'Simulate Match';
    } else if (event && event.type === 'auction') {
      // Check if auction is already completed
      if (auctionState === 'completed') {
        return 'Continue';
      }
      return 'Auction';
    } else {
      return 'Continue';
    }
  };

  // Handle back button
  const handleBack = () => {
    const previousRoute = goBack();
    if (previousRoute) {
      navigate(previousRoute);
    }
  };

  // Handle Save
  const handleSave = () => {
    setShowSaveModal(true);
  };

  // Handle Result Modal Close
  const handleResultModalClose = () => {
    setShowResultModal(false);
    setMatchResult(null);
    // Advance day after viewing result
    advanceDay();
  };

  return (
    <>
      <header className="bg-cricket-surface border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Current Context */}
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            {canGoBack() && (
              <button
                onClick={handleBack}
                className="p-2 rounded hover:bg-cricket-primary/20 transition-colors text-cricket-text-secondary hover:text-cricket-text-primary"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* User Team Badge */}
            {userTeam && (
              <img
                src={getTeamBadge(userTeam.id)}
                alt={userTeam.name}
                className="h-8 w-8"
                title={userTeam.name}
              />
            )}

            <div>
              <h2 className="text-base font-semibold text-cricket-text-primary">
                {userTeam ? userTeam.name : 'Select Team'}
              </h2>
              <p className="text-xs text-cricket-text-secondary">
                Season {currentSeason} • Week {currentWeek} • Day {gameDay} • {formattedDate}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Continue/Matchday button with dropdown for user matches */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleContinue}
                disabled={isSimulating}
                className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2 disabled:opacity-50"
              >
                {isSimulating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (() => {
                  const event = getCurrentEvent();
                  if (event && event.type === 'match') {
                    return <Play className="w-4 h-4" />;
                  } else if (event && event.type === 'auction') {
                    // Check if auction is already completed
                    if (auctionState === 'completed') {
                      return <ChevronRight className="w-4 h-4" />;
                    }
                    return <Users className="w-4 h-4" />;
                  } else {
                    return <ChevronRight className="w-4 h-4" />;
                  }
                })()}
                <span>{getContinueButtonLabel()}</span>
                {(() => {
                  const event = getCurrentEvent();
                  const fixture = event?.data;
                  const isUserMatch = event?.type === 'match' && fixture && userTeam &&
                    (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);
                  return isUserMatch && !isSimulating ? <ChevronDown className="w-4 h-4 ml-1" /> : null;
                })()}
              </button>

              {/* Dropdown Menu for User Matches */}
              {showMatchDropdown && (() => {
                const event = getCurrentEvent();
                const fixture = event?.data;
                const isUserMatch = event?.type === 'match' && fixture && userTeam &&
                  (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);

                return isUserMatch ? (
                  <div className="absolute right-0 mt-1 w-48 bg-bg-secondary border border-border-primary rounded shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowMatchDropdown(false);
                        navigate(`/game/match/${fixture.matchId || fixture.id}/pre-match`);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-cricket-primary/20 flex items-center gap-2 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>Play Match</span>
                    </button>
                    <button
                      onClick={() => handleQuickSimUserMatch(fixture)}
                      className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-cricket-primary/20 flex items-center gap-2 transition-colors border-t border-border-primary"
                    >
                      <FastForward className="w-4 h-4" />
                      <span>Quick-sim</span>
                    </button>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </header>

      {/* Save Game Modal */}
      <SaveGameModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
      />

      {/* Match Result Modal */}
      {MatchResultModalComponent}

      {/* Season Summary Modal */}
      {showSeasonSummary && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-lg border border-border-primary max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <SeasonSummaryView
                onContinue={() => {
                  setShowSeasonSummary(false);
                  // Just advance day - season transition happens later (at auction or preseason_start)
                  console.log('✅ User acknowledged season end. Continuing to offseason/transfer window...');
                  advanceDay();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
