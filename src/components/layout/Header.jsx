/**
 * @file Header.jsx
 * @description Top header component with quick actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, ChevronRight, Users, Play, FastForward, ArrowLeft, ChevronDown, Coffee } from 'lucide-react';
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
import CricketBallSpinner from '../shared/CricketBallSpinner';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import aiTacticsManager from '../../core/ai/AITacticsManager';
import MessageGenerator from '../../utils/MessageGenerator';
import { updateObjectivesAfterMatch } from '../../utils/ObjectiveTracker';
import { useMatchResultModal } from '../../hooks/useMatchResultModal';
import PrizeDistributor from '../../core/offseason/PrizeDistributor';
import SeasonSummaryView from '../OffSeason/SeasonSummaryView';
import { getTeamBadge } from '../../utils/assetHelpers';
import MatchWeekScheduleGenerator from '../../core/league/MatchWeekScheduleGenerator';
import PlayoffGenerator from '../../core/league/PlayoffGenerator';
import { initializeLeague as sharedInitializeLeague } from '../../utils/LeagueInitializer';

const Header = () => {
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);
  const [showSeasonSummary, setShowSeasonSummary] = useState(false);
  const dropdownRef = useRef(null);

  // Animation states for visual feedback
  const [dateJustChanged, setDateJustChanged] = useState(false);
  const [buttonSuccess, setButtonSuccess] = useState(false);
  const prevDateRef = useRef(null);

  const { showResult, ModalComponent: MatchResultModalComponent } = useMatchResultModal({
    onClose: () => {
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
    resetForNewSeason,
    isSimulating: globalIsSimulating
  } = useGameStore();
  const { getUserTeam, teams } = useTeamStore();
  const { getClub, recordResult, updateStandingsForMatch, advanceToNextMatch, standings, champion, initializeLeague: initializeLeagueStore } = useLeagueStore();
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

  // Detect date changes for visual feedback animation
  useEffect(() => {
    if (prevDateRef.current !== null && currentDate !== prevDateRef.current) {
      setDateJustChanged(true);
      const timer = setTimeout(() => setDateJustChanged(false), 600);
      return () => clearTimeout(timer);
    }
    prevDateRef.current = currentDate;
  }, [currentDate]);

  const handleQuickSimUserMatch = async (fixture) => {
    setIsSimulating(true);
    setShowMatchDropdown(false);

    try {
      const homeTeam = getClub(fixture.homeTeam);
      const awayTeam = getClub(fixture.awayTeam);

      if (!homeTeam || !awayTeam) {
        throw new Error('Team data not found for match');
      }

      // Helper function to validate and regenerate tactics if needed
      const ensureValidTactics = (teamId, teamName) => {
        const tactics = useTeamStore.getState().getTeamTactics(teamId);
        const squadIds = useTeamStore.getState().squadLists[teamId] || [];
        const playingXI = tactics?.squadSelection || [];
        const overAssignments = tactics?.overAssignments || {};

        // Validation checks
        let needsRegeneration = false;
        let reason = '';

        // Check 1: squadSelection has 11 players
        if (!tactics?.squadSelection || tactics.squadSelection.length !== 11) {
          needsRegeneration = true;
          reason = `squadSelection has ${tactics?.squadSelection?.length || 0} players (need 11)`;
        }

        // Check 2: All squadSelection players are in the squad
        if (!needsRegeneration) {
          const invalidPlayers = playingXI.filter(id => !squadIds.includes(id));
          if (invalidPlayers.length > 0) {
            needsRegeneration = true;
            reason = `${invalidPlayers.length} player(s) in squadSelection not in squad`;
          }
        }

        // Check 3: overAssignments has 20 overs
        if (!needsRegeneration) {
          if (Object.keys(overAssignments).length < 20) {
            needsRegeneration = true;
            reason = `overAssignments has ${Object.keys(overAssignments).length} overs (need 20)`;
          }
        }

        // Check 4: All bowlers in overAssignments are in playing XI
        if (!needsRegeneration) {
          const invalidBowlers = Object.values(overAssignments).filter(id => id && !playingXI.includes(id));
          if (invalidBowlers.length > 0) {
            needsRegeneration = true;
            reason = `${invalidBowlers.length} bowler(s) in overAssignments not in playing XI`;
          }
        }

        if (needsRegeneration) {
          console.log(`[Header] ${teamName} tactics invalid: ${reason} - regenerating via AITacticsManager`);
          const squad = squadIds
            .map(id => usePlayerStore.getState().players[id])
            .filter(Boolean);
          if (squad.length >= 11) {
            aiTacticsManager.generateTactics(teamId, squad, useTeamStore);
          }
        }

        // Return the (possibly regenerated) tactics
        const finalTactics = useTeamStore.getState().getTeamTactics(teamId);
        return finalTactics?.squadSelection || [];
      };

      // Ensure both teams have valid tactics
      const homePlayingXI = ensureValidTactics(homeTeam.id, homeTeam.name);
      const awayPlayingXI = ensureValidTactics(awayTeam.id, awayTeam.name);

      if (homePlayingXI.length !== 11 || awayPlayingXI.length !== 11) {
        throw new Error(`Failed to generate valid playing XI: Home=${homePlayingXI.length}, Away=${awayPlayingXI.length}`);
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

      // Determine margin text (handle super over case)
      const marginText = result.superOver ? 'Super Over' : result.margin.replace('by ', '');

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
        margin: marginText,
        playerOfMatch: result.playerOfMatch,
        // Include super over data if it occurred
        ...(result.superOver && { superOver: result.superOver })
      };

      // Record result with full scorecard for clickable results
      recordResult(result, fullScorecard);
      // Use incremental standings update (O(1)) instead of full recalculation (O(n))
      updateStandingsForMatch(result);

      // Update objectives tracking after user match
      updateObjectivesAfterMatch(result, fixture, userTeam.id, useGameStore, useLeagueStore, useTeamStore);

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
  // Uses shared league initialization logic
  const initializeNewSeasonLeague = () => {
    return sharedInitializeLeague({
      stores: {
        gameStore: useGameStore,
        teamStore: useTeamStore,
        leagueStore: useLeagueStore,
        financeStore: useFinanceStore,
        auctionStore: useAuctionStore,
        inboxStore: useInboxStore,
        playerStore: usePlayerStore
      },
      isFirstSeasonInit: false // Header flow is never for first season (that's handled by Transfers page)
    });
  };

  // Handle Continue button click
  const handleContinue = async () => {
    if (isSimulating) return;

    // Check if league needs initialization (no events scheduled)
    if (currentPhase === 'preseason' && calendarEvents.length === 0) {
      console.log('⚠️ Detected preseason with no events - initializing league...');
      initializeNewSeasonLeague();
    }

    const event = getCurrentEvent();

    if (event && event.type === 'match') {
      const fixture = event.data;
      const isUserMatch = fixture && userTeam && (fixture.homeTeam === userTeam.id || fixture.awayTeam === userTeam.id);

      if (isUserMatch) {
        setShowMatchDropdown(!showMatchDropdown);
      } else {
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

          // Determine margin text (handle super over case)
          const marginText = result.superOver ? 'Super Over' : result.margin.replace('by ', '');

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
            margin: marginText,
            playerOfMatch: result.playerOfMatch,
            // Include super over data if it occurred
            ...(result.superOver && { superOver: result.superOver })
          };

          // Record result with full scorecard for clickable results
          recordResult(result, fullScorecard);
          // Use incremental standings update (O(1)) instead of full recalculation (O(n))
          updateStandingsForMatch(result);
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
    } else if (event && event.type === 'new_season_start') {
      // NEW SEASON TRANSITION (Season 2, 3, 4, 5, ...)
      console.log(`🔄 New Season Start - Transitioning to Season ${event.data.season}...`);

      // Reset for new season (increments season, resets calendar)
      resetForNewSeason();
      const newSeason = useGameStore.getState().currentSeason;
      console.log(`✅ Season transitioned to ${newSeason}`);

      // Generate objectives for the new season
      const teamsForObjectives = Object.values(useTeamStore.getState().teams);
      const rivalTeam = teamsForObjectives.find(t => t.id !== userTeam?.id);
      useGameStore.getState().generateSeasonObjectives(rivalTeam?.name || 'Sydney Sharks');
      console.log(`📋 Objectives generated for Season ${newSeason}`);

      // Determine if this new season needs auction or direct league init
      const isNewSeasonOdd = newSeason % 2 === 1;

      if (isNewSeasonOdd) {
        // Odd season (3, 5, 7...): Go to auction page
        console.log(`🏏 Season ${newSeason} is ODD - Navigating to auction...`);
        navigate('/game/transfers');
      } else {
        // Even season (2, 4, 6...): Initialize league with existing squads
        console.log(`🏏 Season ${newSeason} is EVEN - Initializing league directly...`);
        initializeNewSeasonLeague();
        advanceDay();
      }
    } else if (event && event.type === 'auction') {
      // SEASON 1 INITIAL AUCTION (game start) - ONLY for Season 1, preseason
      // This does NOT reset the season or generate objectives (initializeLeague does that)
      // Just navigate to auction or initialize league if auction already complete
      console.log('📋 Season 1 - Initial auction event...');

      if (auctionState === 'completed') {
        console.log('✅ Auction already completed - initializing league');
        initializeNewSeasonLeague();
        advanceDay();
      } else {
        console.log('➡️ Navigating to auction');
        navigate('/game/transfers');
      }
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

      // Flash success on continue button
      setButtonSuccess(true);
      setTimeout(() => setButtonSuccess(false), 300);

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
      <header className={`bg-cricket-surface border-b border-gray-700 px-4 py-2 ${
        globalIsSimulating ? 'pointer-events-none opacity-50' : ''
      }`}>
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
              <p className={`calendar-display text-xs transition-all duration-300 ${
                dateJustChanged
                  ? 'text-trophy-gold scale-105 font-semibold'
                  : 'text-cricket-text-secondary'
              }`}>
                Season {currentSeason} • Week {currentWeek} • Day {gameDay} • {formattedDate}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            {/* Ko-fi Donation Button */}
            <a
              href="https://ko-fi.com/prahaladvathsan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-800 rounded hover:bg-gray-100 transition-colors"
              title="Support Cricket Manager on Ko-fi"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Buy me a coffee</span>
            </a>

            <button
              onClick={handleSave}
              className="save-button btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Continue/Matchday button with dropdown for user matches */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleContinue}
                disabled={isSimulating}
                className={`continue-button btn-primary text-sm flex items-center gap-1.5 px-4 py-2 disabled:opacity-50 transition-all duration-200 ${
                  buttonSuccess ? 'bg-green-600 scale-105' : ''
                }`}
              >
                {isSimulating ? (
                  <CricketBallSpinner className="h-4 w-4" />
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
