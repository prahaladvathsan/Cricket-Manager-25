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
    calendarEvents
  } = useGameStore();
  const { getUserTeam } = useTeamStore();
  const { getClub, recordResult, recalculateStandings, advanceToNextMatch, standings, champion } = useLeagueStore();
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

  // Handle Continue button click
  const handleContinue = async () => {
    if (isSimulating) return;

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
      // Check if auction is already completed
      if (auctionState === 'completed') {
        // Auction already done, just advance day
        advanceDay();
      } else {
        // Navigate to transfers page (auction is now on transfers page)
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
        // Don't advance day yet - modal will do it on close

      } catch (error) {
        console.error('Error processing season end:', error);
        // Still advance day on error
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
