/**
 * @file TeamSelectionModal.jsx
 * @description Modal for initial team selection - click to select, click again to confirm
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../../stores/teamStore';
import useGameStore from '../../stores/gameStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useMatchStore from '../../stores/matchStore';
import useFinanceStore from '../../stores/financeStore';
import useNavigationStore from '../../stores/navigationStore';
import useAuctionStore from '../../stores/auctionStore';
import useInboxStore from '../../stores/inboxStore';
import useTransferStore from '../../stores/transferStore';
import useUIStore from '../../stores/uiStore';
import { resetTransferManager } from '../../core/finance/transferManagerSingleton';
import MessageGenerator from '../../utils/MessageGenerator';
import wplTeamsData from '../../data/teams/wpl-teams.json';
import { getTeamBadge, getTeamBanner, getTeamBannerStyle } from '../../utils/assetHelpers';
import LoadingScreen from './LoadingScreen';
import { getCustomClubs } from '../../utils/CustomClubManager';

// Focus category labels
const FOCUS_LABELS = {
  spin: 'Spin',
  pace: 'Pace',
  fielding: 'Fielding',
  batting: 'Batting'
};

const TeamSelectionModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [customClubs, setCustomClubs] = useState({});
  const { teams, initializeTeams, setUserTeam, resetAllTactics } = useTeamStore();
  const { resetForNewGame, scheduleEvent } = useGameStore();
  const gameState = useGameStore();
  const { clearHistory } = useNavigationStore();
  const { addMessage, clearAllMessages } = useInboxStore();
  const leagueStore = useLeagueStore();
  const auctionStore = useAuctionStore();
  const matchStore = useMatchStore();
  const financeStore = useFinanceStore();
  const transferStore = useTransferStore();
  const uiStore = useUIStore();
  const { resetAllCareerStats, resetPlayerTeams, initializeAllPlayerConditions } = usePlayerStore();

  // Preload all team images before showing the UI
  const preloadImages = useCallback(async (teamsList) => {
    const imageUrls = [];

    // Collect all badge and banner URLs
    teamsList.forEach(team => {
      imageUrls.push(getTeamBadge(team.id));
      imageUrls.push(getTeamBanner(team.id));
    });

    // Load all images in parallel
    const loadPromises = imageUrls.map(url => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false); // Don't fail on error, just continue
        img.src = url;
      });
    });

    await Promise.all(loadPromises);
    setImagesLoaded(true);
  }, []);

  useEffect(() => {
    // Initialize teams data if not already loaded
    if (Object.keys(teams).length === 0) {
      initializeTeams(wplTeamsData);
    }
  }, [teams, initializeTeams]);

  // Apply active skin + user custom-clubs overlay on mount so badges/colors/names
  // reflect the player's installed skin from the moment team selection opens.
  useEffect(() => {
    getCustomClubs().then(clubs => {
      setCustomClubs(clubs);
    }).catch(() => {});
    import('../../utils/SkinManager.js').then(({ applyActiveSkinToStores }) => {
      applyActiveSkinToStores().catch(() => {});
    });
  }, []);

  // Preload images once teams are available
  useEffect(() => {
    if (isOpen && Object.keys(teams).length > 0 && !imagesLoaded) {
      const teamsList = Object.values(teams);
      preloadImages(teamsList).then(() => {
        // Small delay to ensure smooth transition
        setTimeout(() => setIsLoading(false), 100);
      });
    }
  }, [isOpen, teams, imagesLoaded, preloadImages]);

  const handleTeamSelect = (teamId) => {
    // If clicking an already selected team, confirm the selection
    if (selectedTeamId === teamId) {
      confirmSelection(teamId);
    } else {
      // First click - select the team
      setSelectedTeamId(teamId);
    }
  };

  const confirmSelection = (teamId) => {
    // Reset all game state for fresh start
    resetForNewGame();
    clearHistory();
    clearAllMessages();

    // Reset league store (clear any old fixtures, standings, etc.)
    if (leagueStore.resetLeague) {
      leagueStore.resetLeague();
    }

    // Reset auction store
    if (auctionStore.resetAuction) {
      auctionStore.resetAuction();
    }

    // Reset player career stats (clears stale stats from previous games)
    resetAllCareerStats();

    // Reset player team assignments (clears stale team data from previous games)
    resetPlayerTeams();

    // Initialize player conditions (fitness, fatigue, injuries) for new game
    initializeAllPlayerConditions();

    // Reset match store (clear any ongoing match data)
    if (matchStore.resetMatch) {
      matchStore.resetMatch();
    }

    // Reset finance store (clear any old financial data)
    if (financeStore.resetFinances) {
      financeStore.resetFinances();
    }

    // Reset transfer store and singleton (clear any transfer market data)
    if (transferStore.reset) {
      transferStore.reset();
    }
    resetTransferManager();

    // Reset UI state (clear any invalid tactics flags)
    if (uiStore.setHasInvalidTactics) {
      uiStore.setHasInvalidTactics(false);
    }

    // Re-initialize teams with fresh data from JSON (resets squadLists)
    initializeTeams(wplTeamsData);

    // Re-apply active skin + user tweaks after re-initialization clears overlays
    import('../../utils/SkinManager.js').then(({ applyActiveSkinToStores }) => {
      applyActiveSkinToStores().catch(() => {});
    });

    // Initialize finances for all teams at game start
    const teamsForFinances = Object.values(teams).map(team => ({
      id: team.id,
      name: team.name
    }));
    if (financeStore.initializeSeason) {
      financeStore.initializeSeason(teamsForFinances, `season_${gameState.currentSeason}`, null);
    }

    // Reset all team tactics (clears stale playing XI data)
    resetAllTactics();

    // Set the selected team
    setUserTeam(teamId);

    // Schedule auction event for day 7 (one week from start)
    scheduleEvent(7, 'auction', {
      seasonId: gameState.currentSeason,
      phase: 'preseason'
    });

    // Generate welcome messages
    const selectedTeam = teams[teamId];
    if (selectedTeam) {
      addMessage(MessageGenerator.generateWelcomeMessage(selectedTeam, gameState.currentSeason));
      addMessage(MessageGenerator.generateExpectationsMessage(selectedTeam, gameState.currentSeason));
      // Only add tutorial message if enabled in settings
      if (gameState.settings?.tutorialEnabled !== false) {
        addMessage(MessageGenerator.generateTutorialMessage());
      }
    }

    // Use React Router navigation (not window.location.href) to preserve in-memory state
    // This prevents race condition where IndexedDB persistence hasn't completed before reload
    navigate('/game/home');
  };

  if (!isOpen) return null;

  // Show loading screen while images are being preloaded
  if (isLoading) {
    return (
      <LoadingScreen
        message="Preparing Team Selection"
        submessage="Loading team graphics..."
      />
    );
  }

  const teamsList = Object.values(teams);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="w-full h-full flex flex-col p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold text-cricket-text-primary">
            Choose Your Team
          </h2>
          <p className="text-cricket-accent text-lg mt-2 animate-pulse font-medium">
            Click to select, click again to confirm
          </p>
        </div>

        {/* Team Grid - 5 columns x 2 rows */}
        <div className="flex-1 grid grid-cols-5 grid-rows-2 gap-4 max-h-[calc(100vh-120px)]">
          {teamsList.map(team => {
            const isSelected = selectedTeamId === team.id;
            // Apply custom cosmetics if available
            const custom = customClubs[team.id];
            const displayColors = {
              primary: custom?.primaryColor || team.colors?.primary || '#333',
              secondary: custom?.secondaryColor || team.colors?.secondary || '#666'
            };
            const displayBadgeSrc = custom?.badgeDataUrl || getTeamBadge(team.id);
            return (
            <div
              key={team.id}
              className={`flex flex-col overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:z-10 rounded-lg border-2 group ${
                isSelected
                  ? 'border-cricket-accent scale-[1.02]'
                  : 'border-gray-700 hover:border-cricket-accent'
              }`}
              style={{
                backgroundColor: isSelected ? `${displayColors.secondary}` : '#1a1a2e'
              }}
              onClick={() => handleTeamSelect(team.id)}
            >
              {/* Banner - Top section with 3:1 aspect ratio */}
              <div
                className="relative w-full"
                style={{ aspectRatio: '3/1', ...getTeamBannerStyle(team.id) }}
              >
                {/* Gradient fade to card */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1/2"
                  style={{
                    background: `linear-gradient(to top, ${isSelected ? displayColors.secondary : '#1a1a2e'}, transparent)`
                  }}
                />
              </div>

              {/* Card Content */}
              <div
                className="flex-1 flex flex-col px-3 pb-3 -mt-6 relative"
                style={isSelected ? { textShadow: '0 0 2px #000, 0 0 4px #000, 0 0 8px #000, 1px 1px 2px #000' } : {}}
              >
                {/* Logo - overlapping banner */}
                <div className="flex justify-center mb-1">
                  <img
                    src={displayBadgeSrc}
                    alt={team.name}
                    className="w-11 h-11 drop-shadow-lg object-cover rounded-full"
                    onError={(e) => { e.target.src = getTeamBadge(team.id); }}
                  />
                </div>

                {/* Team Name */}
                <h3 className="text-sm font-bold text-cricket-text-primary text-center leading-tight">
                  {team.name}
                </h3>

                {/* Details */}
                <div className="mt-1 space-y-0.5 text-xs">
                  <div className="flex items-center text-cricket-text-secondary">
                    <span className="w-12 text-cricket-text-tertiary text-[10px]">Coach</span>
                    <span className="truncate">{team.coachName}</span>
                  </div>
                  <div className="flex items-center text-cricket-text-secondary">
                    <span className="w-12 text-cricket-text-tertiary text-[10px]">Venue</span>
                    <span className="truncate">{team.homeVenue}</span>
                  </div>
                  {team.perk && (
                    <div className="flex items-center text-cricket-text-secondary">
                      <span className="w-12 text-cricket-text-tertiary text-[10px]">Focus</span>
                      <span>{FOCUS_LABELS[team.perk.category] || 'Batting'}</span>
                    </div>
                  )}
                </div>

                {/* Team colors indicator */}
                <div className="flex gap-1 mt-auto pt-2 justify-center">
                  <div
                    className="w-6 h-2 rounded-sm"
                    style={{ backgroundColor: displayColors.primary }}
                  />
                  <div
                    className="w-6 h-2 rounded-sm border border-gray-600"
                    style={{ backgroundColor: displayColors.secondary }}
                  />
                </div>
              </div>

              {/* Hover effect - gold border glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg shadow-[0_0_25px_rgba(212,175,55,0.4)]" />
            </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-3 text-cricket-text-tertiary text-xs">
          World Premier League • Season {gameState.currentSeason}
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionModal;