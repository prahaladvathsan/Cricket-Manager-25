/**
 * @file App.jsx
 * @description Main application component with routing
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './components/layout/Home';
import Squad from './components/team/Squad';
import Matches from './components/match/Matches';
import MatchdayUI from './components/match/matchday/MatchdayUI';
import MatchPreview from './components/match/MatchPreview';
import PreMatchFlow from './components/match/PreMatchFlow';
import League from './components/layout/League';
import Transfers from './components/layout/Transfers';
import Board from './components/layout/Board';
import Inbox from './components/inbox/Inbox';
import TacticsPage from './components/tactics/TacticsPage';
import TeamSelectionModal from './components/shared/TeamSelectionModal';
import ErrorBoundary from './components/shared/ErrorBoundary';
import CricketBallSpinner from './components/shared/CricketBallSpinner';
import StartMenu from './components/menu/StartMenu';
import LoadGame from './components/menu/LoadGame';
import PlayerBrowser from './components/menu/PlayerBrowser';
import Credits from './components/menu/Credits';
import Settings from './components/menu/Settings';
import { GameManual } from './components/manual';
import { TutorialController } from './components/tutorial';
import CalendarPage from './components/calendar/CalendarPage';
import TestingDashboard from './components/testing/TestingDashboard';
import useTeamStore from './stores/teamStore';
import usePlayerStore from './stores/playerStore';
import useGameStore from './stores/gameStore';
import useAuthStore from './stores/authStore';
import './styles/wallpaper.css';
import { getGameLogo } from './utils/assetHelpers';
import { migrateFromLocalStorage, isMigrationComplete } from './utils/indexedDBStorage';
import { waitForHydration } from './utils/storeHydration';

/**
 * Validate that game state is properly populated
 * Returns true if state is valid, false if stores are empty/corrupted
 */
function validateGameState() {
  const teamState = useTeamStore.getState();
  const gameState = useGameStore.getState();

  // If no user team selected, state may be empty but that's OK for new games
  // We only consider it "corrupted" if we're on a /game/* route with no data
  const hasUserTeam = !!teamState.userTeamId;
  const hasTeams = teamState.teams && Object.keys(teamState.teams).length > 0;
  const hasGamePhase = !!gameState.currentPhase;

  // Valid if: no game started yet OR game has all required data
  return !hasUserTeam || (hasTeams && hasGamePhase);
}

/**
 * Protected route wrapper that validates game state
 * Redirects to load-game with recovery flag if state is invalid
 */
function GameStateValidator({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userTeamId = useTeamStore(s => s.userTeamId);
  const teams = useTeamStore(s => s.teams);
  const currentPhase = useGameStore(s => s.currentPhase);

  useEffect(() => {
    // Only check if we're on a game route and have a user team selected
    if (location.pathname.startsWith('/game') && userTeamId) {
      const hasTeams = teams && Object.keys(teams).length > 0;
      const hasGamePhase = !!currentPhase;

      // If we have a userTeamId but missing critical data, redirect to recovery
      if (!hasTeams || !hasGamePhase) {
        console.warn('Game state validation failed - redirecting to recovery');
        navigate('/load-game?recovery=true', { replace: true });
      }
    }
  }, [location.pathname, userTeamId, teams, currentPhase, navigate]);

  return children;
}

function App() {
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { initializeTeams } = useTeamStore();
  const { initializePlayers } = usePlayerStore();

  useEffect(() => {
    // Load game data on mount (needed for all routes)
    const loadGameData = async () => {
      console.log('🎮 Loading game data...');

      try {
        // Migrate localStorage to IndexedDB for existing users (one-time migration)
        const migrated = await isMigrationComplete();
        if (!migrated) {
          console.log('🔄 Migrating localStorage to IndexedDB...');
          const result = await migrateFromLocalStorage();
          if (result.migrated.length > 0) {
            console.log(`✅ Migrated ${result.migrated.length} stores to IndexedDB`);
          }
          if (result.errors.length > 0) {
            console.warn('⚠️ Migration errors:', result.errors);
          }
        }

        // Load teams data
        const teamsModule = await import('./data/teams/wpl-teams.json');
        initializeTeams(teamsModule.default);
        console.log('✅ Teams loaded');

        // Load master player database using web worker (off main thread)
        const playerWorker = new Worker(
          new URL('./workers/playerDatabaseWorker.js', import.meta.url),
          { type: 'module' }
        );

        // Request player data
        playerWorker.postMessage({ type: 'LOAD_PLAYERS' });

        // Handle response
        playerWorker.addEventListener('message', async (e) => {
          if (e.data.type === 'PLAYERS_LOADED') {
            initializePlayers(e.data.players);
            console.log('✅ Players loaded:', e.data.players.length);

            // Initialize auth BEFORE waiting for hydration
            // This ensures OAuth redirects are processed immediately
            const initAuth = useAuthStore.getState().initAuth;
            if (initAuth) {
              initAuth();
              console.log('✅ Auth state listener initialized');
            }

            // Wait for all Zustand stores to rehydrate from IndexedDB
            console.log('⏳ Waiting for store hydration...');
            await waitForHydration();
            console.log('✅ All stores hydrated');

            setDataLoaded(true);
            playerWorker.terminate(); // Clean up worker
          } else if (e.data.type === 'PLAYERS_ERROR') {
            console.error('❌ Failed to load players:', e.data.error);
            // Still wait for hydration before showing error state
            await waitForHydration();
            setDataLoaded(true); // Show error state
          }
        });

      } catch (error) {
        console.error('❌ Error loading game data:', error);
        // Still wait for hydration before showing error state
        await waitForHydration();
        setDataLoaded(true);
      }
    };

    loadGameData();
  }, [initializeTeams, initializePlayers]);

  const handleTeamSelectionClose = () => {
    setShowTeamSelection(false);
  };

  // Show loading screen while data loads
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-cricket-dark flex items-center justify-center">
        <div className="text-center">
          <img
            src={getGameLogo('light')}
            alt="Cricket Manager 25"
            className="h-24 mx-auto mb-6 animate-pulse"
          />
          <CricketBallSpinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-cricket-text-primary text-xl font-semibold">Loading Cricket Manager...</p>
          <p className="text-cricket-text-secondary text-sm mt-2">Initializing database...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Start Menu (Root) */}
          <Route path="/" element={<StartMenu />} />

          {/* Menu Routes (No Layout) */}
          <Route path="/load-game" element={<LoadGame />} />
          <Route path="/player-browser" element={<PlayerBrowser />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/manual" element={<GameManual />} />

          {/* Developer Testing Mode (URL access only - no menu link) */}
          <Route path="/testing" element={<TestingDashboard />} />

          {/* Team Selection (Transition to Game) */}
          <Route
            path="/team-selection"
            element={
              <div className="min-h-screen app-wallpaper flex items-center justify-center p-4">
                <TeamSelectionModal
                  isOpen={true}
                  onClose={() => window.location.href = '/game/home'}
                />
              </div>
            }
          />

          {/* Full-screen Match Routes (No Layout) */}
          <Route path="/game/match/:matchId/live" element={<MatchdayUI />} />
          <Route path="/game/match/:matchId/pre-match" element={<PreMatchFlow />} />

          {/* Game Routes (With Layout + Tutorial + State Validation) */}
          <Route
            path="/game/*"
            element={
              <GameStateValidator>
                <TutorialController>
                  <Layout>
                    <Routes>
                      <Route path="home" element={<Home />} />
                      <Route path="inbox" element={<Inbox />} />
                      <Route path="squad" element={<Squad />} />
                      <Route path="tactics" element={<TacticsPage />} />
                      <Route path="matches" element={<Matches />} />
                      <Route path="match/:matchId/preview" element={<MatchPreview />} />
                      {/* Redirect old match route to preview screen */}
                      <Route path="match/:matchId" element={<Navigate to="preview" replace />} />
                      <Route path="calendar" element={<CalendarPage />} />
                      <Route path="league" element={<League />} />
                      <Route path="transfers" element={<Transfers />} />
                      <Route path="board" element={<Board />} />
                      <Route path="*" element={<Navigate to="/game/home" replace />} />
                    </Routes>
                  </Layout>
                </TutorialController>
              </GameStateValidator>
            }
          />

          {/* Catch all - redirect to start menu */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
