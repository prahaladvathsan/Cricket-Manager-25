/**
 * @file App.jsx
 * @description Main application component with routing
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RouteLoadingFallback } from './components/shared/LoadingFallback';
import useTeamStore from './stores/teamStore';
import usePlayerStore from './stores/playerStore';
import useGameStore from './stores/gameStore';
import './styles/wallpaper.css';
import { getGameLogo } from './utils/assetHelpers';

// Components needed for initial load (not lazy)
import ErrorBoundary from './components/shared/ErrorBoundary';
import CricketBallSpinner from './components/shared/CricketBallSpinner';
import StartMenu from './components/menu/StartMenu';
import TeamSelectionModal from './components/shared/TeamSelectionModal';

// Lazy load all route components for code splitting
const Layout = lazy(() => import('./components/layout/Layout'));
const Home = lazy(() => import('./components/layout/Home'));
const Squad = lazy(() => import('./components/team/Squad'));
const Matches = lazy(() => import('./components/match/Matches'));
const MatchdayUI = lazy(() => import('./components/match/matchday/MatchdayUI'));
const MatchPreview = lazy(() => import('./components/match/MatchPreview'));
const PreMatchFlow = lazy(() => import('./components/match/PreMatchFlow'));
const League = lazy(() => import('./components/layout/League'));
const Transfers = lazy(() => import('./components/layout/Transfers'));
const Board = lazy(() => import('./components/layout/Board'));
const Inbox = lazy(() => import('./components/inbox/Inbox'));
const TacticsPage = lazy(() => import('./components/tactics/TacticsPage'));
const LoadGame = lazy(() => import('./components/menu/LoadGame'));
const PlayerBrowser = lazy(() => import('./components/menu/PlayerBrowser'));
const Credits = lazy(() => import('./components/menu/Credits'));
const Settings = lazy(() => import('./components/menu/Settings'));
const GameManual = lazy(() => import('./components/manual').then(m => ({ default: m.GameManual })));
const TutorialController = lazy(() => import('./components/tutorial').then(m => ({ default: m.TutorialController })));
const CalendarPage = lazy(() => import('./components/calendar/CalendarPage'));
const TestingDashboard = lazy(() => import('./components/testing/TestingDashboard'));

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
        playerWorker.addEventListener('message', (e) => {
          if (e.data.type === 'PLAYERS_LOADED') {
            initializePlayers(e.data.players);
            console.log('✅ Players loaded:', e.data.players.length);
            setDataLoaded(true);
            playerWorker.terminate(); // Clean up worker
          } else if (e.data.type === 'PLAYERS_ERROR') {
            console.error('❌ Failed to load players:', e.data.error);
            setDataLoaded(true); // Show error state
          }
        });

      } catch (error) {
        console.error('❌ Error loading game data:', error);
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

          {/* Menu Routes (No Layout) - Wrapped in Suspense */}
          <Route path="/load-game" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LoadGame />
            </Suspense>
          } />
          <Route path="/player-browser" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <PlayerBrowser />
            </Suspense>
          } />
          <Route path="/credits" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <Credits />
            </Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <Settings />
            </Suspense>
          } />
          <Route path="/manual" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <GameManual />
            </Suspense>
          } />

          {/* Developer Testing Mode (URL access only - no menu link) */}
          <Route path="/testing" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <TestingDashboard />
            </Suspense>
          } />

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

          {/* Full-screen Match Routes (No Layout) - Wrapped in Suspense */}
          <Route path="/game/match/:matchId/live" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <MatchdayUI />
            </Suspense>
          } />
          <Route path="/game/match/:matchId/pre-match" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <PreMatchFlow />
            </Suspense>
          } />

          {/* Game Routes (With Layout + Tutorial) - Wrapped in Suspense */}
          <Route
            path="/game/*"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <TutorialController>
                  <Layout>
                    <Suspense fallback={<RouteLoadingFallback />}>
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
                    </Suspense>
                  </Layout>
                </TutorialController>
              </Suspense>
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
