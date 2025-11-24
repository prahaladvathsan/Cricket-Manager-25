/**
 * @file TeamSelectionModal.jsx
 * @description Modal for initial team selection
 */

import React, { useState, useEffect } from 'react';
import useTeamStore from '../../stores/teamStore';
import useGameStore from '../../stores/gameStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useMatchStore from '../../stores/matchStore';
import useFinanceStore from '../../stores/financeStore';
import useNavigationStore from '../../stores/navigationStore';
import useAuctionStore from '../../stores/auctionStore';
import useInboxStore from '../../stores/inboxStore';
import MessageGenerator from '../../utils/MessageGenerator';
import { saveGame } from '../../utils/storage';
import wplTeamsData from '../../data/teams/wpl-teams.json';

const TeamSelectionModal = ({ isOpen, onClose }) => {
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const { teams, initializeTeams, setUserTeam, resetAllTactics } = useTeamStore();
  const { resetForNewGame, scheduleEvent } = useGameStore();
  const gameState = useGameStore();
  const { clearHistory } = useNavigationStore();
  const { addMessage, clearAllMessages } = useInboxStore();
  const leagueStore = useLeagueStore();
  const auctionStore = useAuctionStore();
  const matchStore = useMatchStore();
  const financeStore = useFinanceStore();
  const { resetAllCareerStats } = usePlayerStore();

  useEffect(() => {
    // Initialize teams data if not already loaded
    if (Object.keys(teams).length === 0) {
      initializeTeams(wplTeamsData);
    }
  }, [teams, initializeTeams]);

  const handleTeamSelect = (teamId) => {
    setSelectedTeamId(teamId);
  };

  const handleConfirm = () => {
    if (selectedTeamId) {
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

      // Reset player career stats (IMPORTANT: clears stale stats from previous games)
      resetAllCareerStats();
      console.log('🔄 Reset all player career stats for new game');

      // Reset match store (clear any ongoing match data)
      if (matchStore.resetMatch) {
        matchStore.resetMatch();
        console.log('🔄 Reset match store for new game');
      }

      // Reset finance store (clear any old financial data)
      if (financeStore.resetFinances) {
        financeStore.resetFinances();
        console.log('🔄 Reset finance store for new game');
      }

      // Initialize finances for all teams at game start (with $10M each)
      const teamsForFinances = Object.values(teams).map(team => ({
        id: team.id,
        name: team.name
      }));
      console.log('💰 TeamSelectionModal - Initializing finances for teams:', teamsForFinances);
      if (financeStore.initializeSeason) {
        const result = financeStore.initializeSeason(teamsForFinances, `season_${gameState.currentSeason}`, null);
        console.log('💰 Initialized finances for all teams, result:', result);

        // Verify initialization worked
        const testFinances = financeStore.getTeamFinances(selectedTeamId);
        console.log('💰 Test finances for selected team:', selectedTeamId, ':', testFinances);
      } else {
        console.error('❌ financeStore.initializeSeason is not available!');
      }

      // Reset all team tactics (IMPORTANT: clears stale playing XI data)
      resetAllTactics();
      console.log('🔄 Reset all team tactics for new game');

      // Set the selected team
      setUserTeam(selectedTeamId);

      // Schedule auction event for day 7 (one week from start)
      scheduleEvent(7, 'auction', {
        seasonId: gameState.currentSeason,
        phase: 'preseason'
      });

      // Generate welcome messages
      const selectedTeam = teams[selectedTeamId];
      if (selectedTeam) {
        addMessage(MessageGenerator.generateWelcomeMessage(selectedTeam, gameState.currentSeason));
        addMessage(MessageGenerator.generateExpectationsMessage(selectedTeam, gameState.currentSeason));
        addMessage(MessageGenerator.generateTutorialMessage());
      }

      // Auto-save the selection
      const saveData = {
        ...gameState,
        userTeamId: selectedTeamId,
        teams: teams
      };
      saveGame('auto_save', saveData);

      onClose();
    }
  };

  if (!isOpen) return null;

  const teamsList = Object.values(teams);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-cricket-surface border-2 border-cricket-primary rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-cricket-text-primary mb-2 text-center">
          Choose Your Team
        </h2>
        <p className="text-cricket-text-secondary text-center mb-8">
          Select the team you want to manage in the World Premier League
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {teamsList.map(team => (
            <div
              key={team.id}
              className={`card cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                selectedTeamId === team.id 
                  ? 'border-cricket-accent bg-cricket-accent bg-opacity-20' 
                  : 'border-cricket-primary hover:border-cricket-accent'
              }`}
              onClick={() => handleTeamSelect(team.id)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="w-4 h-4 rounded-full border-2"
                    style={{ backgroundColor: team.colors.primary, borderColor: team.colors.secondary }}
                  />
                  <span className="text-sm font-medium text-cricket-text-secondary">
                    {team.shortName}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-cricket-text-primary mb-2">
                  {team.name}
                </h3>
                
                <div className="text-sm text-cricket-text-secondary space-y-1">
                  <p><span className="font-medium">Coach:</span> {team.coachName}</p>
                  <p><span className="font-medium">Budget:</span> ${team.finances.salaryCap}M</p>
                </div>

                {selectedTeamId === team.id && (
                  <div className="mt-4 flex items-center text-cricket-accent">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Selected</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleConfirm}
            disabled={!selectedTeamId}
            className={`btn-primary px-8 py-3 text-lg font-medium ${
              !selectedTeamId ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionModal;