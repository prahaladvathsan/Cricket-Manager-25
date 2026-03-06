/**
 * @file Header.jsx
 * @description Top header component with quick actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, ChevronRight, Users, Play, FastForward, ArrowLeft, ChevronDown, Coffee, AlertTriangle } from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useMatchStore from '../../stores/matchStore';
import useFinanceStore from '../../stores/financeStore';
import useNavigationStore from '../../stores/navigationStore';
import useInboxStore from '../../stores/inboxStore';
import useAuctionStore from '../../stores/auctionStore';
import useUIStore from '../../stores/uiStore';
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
import ContributeDropdown from './ContributeDropdown';
import JoinCommunityDropdown from './JoinCommunityDropdown';
import SaveGameManager from '../../utils/SaveGameManager';
import useTransferStore from '../../stores/transferStore';
import { getTransferManager } from '../../core/finance/transferManagerSingleton';

const Header = () => {
  const navigate = useNavigate();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);
  const [showSeasonSummary, setShowSeasonSummary] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
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
    isSimulating: globalIsSimulating,
    isProcessingTurn
  } = useGameStore();
  const { getUserTeam, teams } = useTeamStore();
  const { getClub, recordResult, updateStandingsForMatch, advanceToNextMatch, standings, champion, initializeLeague: initializeLeagueStore } = useLeagueStore();
  const { processMatchFinancials } = useFinanceStore();
  const { goBack, canGoBack } = useNavigationStore();
  const { addMessage } = useInboxStore();
  const { auctionState } = useAuctionStore();
  const { preferences: { sidebarCollapsed } } = useUIStore();

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

      // Check which team is the user team
      const userTeamId = userTeam?.id;
      const isUserHome = homeTeam.id === userTeamId;
      const isUserAway = awayTeam.id === userTeamId;

      // Helper for STRICT validation (User Team) - purely checks, no modifications
      const validateStrict = (teamId) => {
        const tactics = useTeamStore.getState().getTeamTactics(teamId);
        const players = usePlayerStore.getState().players;
        const errors = [];

        if (!tactics) {
          errors.push('Tactics not initialized');
          return errors;
        }

        // Validate squad selection
        if (!tactics.squadSelection || tactics.squadSelection.length !== 11) {
          errors.push('Must select exactly 11 players');
        }

        // Validate minimum bowlers (5, including part-timers)
        const primaryBowlers = tactics.squadSelection?.filter(playerId => {
          const player = players[playerId];
          return player && (player.role === 'bowler' || player.role === 'all-rounder');
        }) || [];
        const partTimers = tactics.partTimers || [];
        const totalBowlingOptions = primaryBowlers.length + partTimers.length;

        if (totalBowlingOptions < 5) {
          errors.push(`Must have at least 5 bowling options (currently ${totalBowlingOptions})`);
        }

        // Validate wicket-keeper (allow emergency keepers)
        if (!tactics.wicketKeeper) {
          errors.push('Must have at least 1 wicket-keeper');
        }

        // Validate batting order
        if (!tactics.battingOrder || tactics.battingOrder.length !== 11) {
          errors.push('Batting order must have all 11 players');
        }

        // Check for injuries
        const injuredPlayers = tactics.squadSelection?.filter(playerId => {
          const player = players[playerId];
          return player && player.condition?.injury;
        }) || [];

        if (injuredPlayers.length > 0) {
          const injuredPlayerNames = injuredPlayers.map(id => {
            const player = players[id];
            return `${player.name} (${player.condition.injuryDuration}d)`;
          }).join(', ');
          errors.push(`Injured players in XI: ${injuredPlayerNames}`);
        }

        return errors;
      };

      // Helper for AI tactics (Auto-regenerate if invalid)
      const ensureValidAiTactics = (teamId, teamName) => {
        const tactics = useTeamStore.getState().getTeamTactics(teamId);
        const squadIds = useTeamStore.getState().squadLists[teamId] || [];
        const playingXI = tactics?.squadSelection || [];
        const overAssignments = tactics?.overAssignments || {};

        let needsRegeneration = false;
        let reason = '';

        if (!tactics?.squadSelection || tactics.squadSelection.length !== 11) {
          needsRegeneration = true;
          reason = `squadSelection has ${tactics?.squadSelection?.length || 0} players`;
        } else {
          // Check consistency
          const invalidPlayers = playingXI.filter(id => !squadIds.includes(id));
          if (invalidPlayers.length > 0) {
            needsRegeneration = true;
            reason = 'Players not in squad';
          }
        }

        // Basic bowler check for AI
        if (!needsRegeneration) {
          if (Object.keys(overAssignments).length < 20) {
            needsRegeneration = true;
            reason = 'Incomplete over assignments';
          }
        }

        if (needsRegeneration) {
          console.log(`[Header] ${teamName} (AI) tactics invalid: ${reason} - regenerating`);
          const squad = squadIds
            .map(id => usePlayerStore.getState().players[id])
            .filter(Boolean);
          if (squad.length >= 11) {
            aiTacticsManager.generateTactics(teamId, squad, useTeamStore);
          }
        }

        return useTeamStore.getState().getTeamTactics(teamId)?.squadSelection || [];
      };

      let homePlayingXI, awayPlayingXI;

      // 1. Process User Team (Strict Validation)
      if (isUserHome) {
        const errors = validateStrict(homeTeam.id);
        if (errors.length > 0) {
          setValidationErrors(errors);
          setShowValidationModal(true);
          setIsSimulating(false); // Stop simulation
          return;
        }
        // If valid, use existing tactics
        homePlayingXI = useTeamStore.getState().getTeamTactics(homeTeam.id).squadSelection;
      } else {
        // AI Home Team
        homePlayingXI = ensureValidAiTactics(homeTeam.id, homeTeam.name);
      }

      if (isUserAway) {
        const errors = validateStrict(awayTeam.id);
        if (errors.length > 0) {
          setValidationErrors(errors);
          setShowValidationModal(true);
          setIsSimulating(false); // Stop simulation
          return;
        }
        awayPlayingXI = useTeamStore.getState().getTeamTactics(awayTeam.id).squadSelection;
      } else {
        // AI Away Team
        awayPlayingXI = ensureValidAiTactics(awayTeam.id, awayTeam.name);
      }

      const tossWinnerId = Math.random() < 0.5 ? homeTeam.id : awayTeam.id;
      const tossDecision = Math.random() < 0.5 ? 'bat' : 'bowl';

      const matchConfig = {
        id: fixture.matchId,
        homeTeam: {
          ...homeTeam,
          playingXI: homePlayingXI,
          players: homePlayingXI
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

      // CRITICAL: If this was a playoff match, update subsequent playoff fixtures
      // This ensures Q2 and Final get populated with correct teams after Eliminator/Q1
      if (result.type === 'playoff' || result.matchId?.startsWith('playoff_')) {
        useLeagueStore.getState().updatePlayoffFixturesAfterResult(result);
      }

      // Update objectives tracking after user match
      updateObjectivesAfterMatch(result, fixture, userTeam.id, useGameStore, useLeagueStore, useTeamStore);

      // Process match financials (revenue and performance tracking)
      processMatchFinancials(result, standings);

      advanceToNextMatch();

      // Show result modal using hook
      showResult(fullScorecard);

      // Send match result inbox message
      const opponentTeam = userTeamId === homeTeam.id ? awayTeam : homeTeam;
      addMessage(MessageGenerator.generateMatchResultMessage(fullScorecard, userTeamId, opponentTeam.name));
      const userWon = result.winner === userTeamId;
      const score = `${result.innings1.totalScore}/${result.innings1.wickets} vs ${result.innings2.totalScore}/${result.innings2.wickets}`;

      SaveGameManager.autosaveAfterMatch(
        {
          gameStore: useGameStore,
          teamStore: useTeamStore,
          playerStore: usePlayerStore,
          leagueStore: useLeagueStore,
          financeStore: useFinanceStore,
          matchStore: useMatchStore,
          auctionStore: useAuctionStore,
          inboxStore: useInboxStore,
          transferStore: useTransferStore
        },
        {
          opponentName: opponentTeam.name,
          result: userWon ? 'win' : 'loss',
          score
        }
      ).then(saveResult => {
        if (saveResult.success) {
          console.log('💾 Autosave created after quick-sim');
        }
      });

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
    if (isSimulating || isProcessingTurn) return;

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

          // CRITICAL: If this was a playoff match, update subsequent playoff fixtures
          // This ensures Q2 and Final get populated with correct teams after Eliminator/Q1
          if (result.type === 'playoff' || result.matchId?.startsWith('playoff_')) {
            useLeagueStore.getState().updatePlayoffFixturesAfterResult(result);
          }

          advanceToNextMatch();

          // Show result modal (AI vs AI — no inbox message sent to user)
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
      // CRITICAL: Check if playoffs are actually complete before processing season end
      const leagueStage = useLeagueStore.getState().stage;
      const currentChampion = useLeagueStore.getState().champion;

      if (leagueStage === 'playoffs' && !currentChampion) {
        console.warn('⚠️ Season end event triggered but playoffs not complete - allowing playoffs to continue');
        advanceDay(); // Skip this event, continue to next playoff match
        return;
      }

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
      // Process off-season transfers during weeks 22-26
      if (currentPhase === 'offseason' && currentWeek >= 22 && currentWeek <= 26) {
        try {
          const transferManager = getTransferManager();

          // Open transfer window at week 22 (if not already open)
          if (currentWeek === 22 && !transferManager.transferMarket.windowOpen) {
            console.log('🔓 Opening off-season transfer window...');
            transferManager.setCurrentWeek(currentWeek);
            transferManager.openWindow('offSeason', 14);
          }

          // Process weekly transfer cycle if window is open
          if (transferManager.transferMarket.windowOpen) {
            transferManager.setCurrentWeek(currentWeek);
            const teams = Object.values(useLeagueStore.getState().clubs || {}).map(club => {
              const squadIds = useTeamStore.getState().squadLists[club.id] || [];
              const players = usePlayerStore.getState().players;
              return {
                ...club,
                squad: squadIds.map(id => players[id]).filter(Boolean)
              };
            });
            await transferManager.processWeeklyTransferCycle(teams, currentWeek);
          }

          // Close transfer window at week 26
          if (currentWeek === 26 && transferManager.transferMarket.windowOpen) {
            console.log('🔒 Closing off-season transfer window...');
            transferManager.closeWindow();
          }
        } catch (error) {
          console.error('Error processing off-season transfers:', error);
        }
      }

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
          const homeTeam = getClub(fixture.homeTeam);
          const awayTeam = getClub(fixture.awayTeam);
          const isUserHome = fixture.homeTeam === userTeam.id;

          if (homeTeam && awayTeam) {
            // Gather squad intelligence for the reminder
            const players = usePlayerStore.getState().players;
            const tactics = useTeamStore.getState().getTeamTactics(userTeam.id);
            const squadIds = useTeamStore.getState().squadLists[userTeam.id] || [];

            // Full squad injury counts
            const allSquadInjured = squadIds.filter(id => players[id]?.condition?.injury);
            const unavailableCount = allSquadInjured.length;

            // XI-specific alerts
            const xi = tactics?.squadSelection || [];
            const xiInjured = xi.filter(id => players[id]?.condition?.injury).map(id => ({
              name: players[id]?.name || id,
              days: players[id]?.condition?.injuryDuration || '?'
            }));
            const hasXI = xi.length === 11;
            const hasWK = !!tactics?.wicketKeeper;
            const bowlerCount = xi.filter(id => {
              const p = players[id];
              return p && (p.role === 'bowler' || p.role === 'all-rounder');
            }).length + (tactics?.partTimers?.length || 0);
            const hasBowlers = bowlerCount >= 5;

            const squadAlerts = [];
            if (!hasXI) squadAlerts.push(`Playing XI not set (${xi.length}/11 players selected)`);
            if (!hasWK) squadAlerts.push('No wicket-keeper selected');
            if (!hasBowlers) squadAlerts.push(`Only ${bowlerCount} bowling options (need 5+)`);
            if (xiInjured.length > 0) squadAlerts.push(...xiInjured.map(p => `${p.name} is injured (${p.days}d) but still in XI`));

            addMessage(MessageGenerator.generateMatchReminderMessage(
              fixture,
              homeTeam,
              awayTeam,
              isUserHome,
              { unavailableCount, xiInjured, squadAlerts, squadSize: squadIds.length }
            ));
          }
        }
      }
    }
  };

  // Get button label based on current event
  const getContinueButtonLabel = () => {
    if (isProcessingTurn) return 'Processing...';
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
      <header className={`bg-cricket-surface border-b border-gray-700 px-4 py-2 ${globalIsSimulating ? 'pointer-events-none opacity-50' : ''
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
              <p className={`calendar-display text-xs transition-all duration-300 ${dateJustChanged
                ? 'text-trophy-gold scale-105 font-semibold'
                : 'text-cricket-text-secondary'
                }`}>
                Season {currentSeason} • Week {currentWeek} • Day {gameDay} • {formattedDate}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <JoinCommunityDropdown />
            <ContributeDropdown />

            <button
              onClick={handleSave}
              className="save-button bg-cricket-accent hover:bg-cricket-accent-light text-bg-primary font-medium text-xs flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Continue/Matchday button with dropdown for user matches */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleContinue}
                disabled={isSimulating || isProcessingTurn}
                className={`continue-button btn-primary text-sm flex items-center gap-1.5 px-4 py-2 disabled:opacity-50 transition-all duration-200 ${buttonSuccess ? 'bg-green-600 scale-105' : ''
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
                  <div className="absolute right-0 mt-1 w-48 bg-gray-900 border border-border-primary rounded shadow-lg z-50">
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
        <div className={`fixed inset-y-0 right-0 ${sidebarCollapsed ? 'left-16' : 'left-48'} bg-black/80 flex items-center justify-center z-[60] p-4 transition-all duration-300`}>
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
      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-bg-secondary border border-red-500/50 rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-red-500/10 px-6 py-4 border-b border-red-500/20 flex items-center gap-3">
              <div className="bg-red-500/20 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Issues Detected</h3>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-text-secondary mb-4">
                Please resolve the following issues with your team tactics before proceeding:
              </p>

              <div className="bg-red-950/30 border border-red-500/20 rounded-md p-4 mb-6">
                <ul className="space-y-2">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-red-200 text-sm">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    navigate('/game/tactics');
                  }}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold"
                >
                  <Settings className="w-5 h-5" />
                  Resolve in Tactics Page
                </button>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="btn-secondary w-full py-2 text-text-secondary hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
