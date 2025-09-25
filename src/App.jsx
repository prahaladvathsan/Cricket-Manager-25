/**
 * @file App.jsx
 * @description Main application component with routing
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/layout/Dashboard';
import Squad from './components/team/Squad';
import Matches from './components/match/Matches';
import League from './components/layout/League';
import Transfers from './components/layout/Transfers';
import Board from './components/layout/Board';
import TeamSelectionModal from './components/shared/TeamSelectionModal';
import useTeamStore from './stores/teamStore';
import useGameStore from './stores/gameStore';
import { loadGame } from './utils/storage';

function App() {
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const { userTeamId, initializeTeams, setUserTeam } = useTeamStore();
  const { settings } = useGameStore();
  
  useEffect(() => {
    const initializeGame = async () => {
      // Load teams data
      const teamsModule = await import('./data/teams/wpl-teams.json');
      initializeTeams(teamsModule.default);

      // Try to load saved game state
      const savedGame = loadGame('auto_save');
      if (savedGame && savedGame.userTeamId) {
        setUserTeam(savedGame.userTeamId);
      }

      setGameInitialized(true);
      
      // Check if user has selected a team after initialization
      if (!savedGame?.userTeamId && !userTeamId) {
        setShowTeamSelection(true);
      }
    };

    initializeGame();
  }, [initializeTeams, setUserTeam, userTeamId]);

  const handleTeamSelectionClose = () => {
    setShowTeamSelection(false);
  };

  return (
    <Router>
      <div className="h-full">
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/squad" element={<Squad />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/league" element={<League />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/board" element={<Board />} />
          </Routes>
        </Layout>
        
        <TeamSelectionModal 
          isOpen={showTeamSelection}
          onClose={handleTeamSelectionClose}
        />
      </div>
    </Router>
  );
}

export default App;