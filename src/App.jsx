/**
 * @file App.jsx
 * @description Main application component with routing
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import StartMenu from './components/menu/StartMenu';
import LoadGame from './components/menu/LoadGame';
import PlayerBrowser from './components/menu/PlayerBrowser';
import Credits from './components/menu/Credits';
import TestMode from './components/test/TestMode';
import CalendarPage from './components/calendar/CalendarPage';
import useTeamStore from './stores/teamStore';
import usePlayerStore from './stores/playerStore';
import useGameStore from './stores/gameStore';

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

        // Load master player database
        const playersModule = await import('./data/players/master_player_database.json');
        initializePlayers(playersModule.default.players);
        console.log('✅ Players loaded:', playersModule.default.players.length);

        setDataLoaded(true);
      } catch (error) {
        console.error('❌ Error loading game data:', error);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-primary mx-auto mb-4"></div>
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

          {/* Test Mode (Full-screen, No Layout) */}
          <Route path="/game/test" element={<TestMode />} />

          {/* Team Selection (Transition to Game) */}
          <Route
            path="/team-selection"
            element={
              <div className="min-h-screen bg-cricket-dark flex items-center justify-center p-4">
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

          {/* Game Routes (With Layout) */}
          <Route
            path="/game/*"
            element={
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
              </Layout>            }
          />

          {/* Catch all - redirect to start menu */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
