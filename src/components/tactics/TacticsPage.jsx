/**
 * @file TacticsPage.jsx
 * @description Full page for managing team tactics (converted from SetTacticsModal)
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Target,
  Activity,
  Shield,
  RotateCcw,
  CheckCircle,
  Eye
} from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import OverviewTab from './tabs/OverviewTab';
import SquadPlaystyleTab from './tabs/SquadPlaystyleTab';
import BattingOrderTab from './tabs/BattingOrderTab';
import BowlingPlansTab from './tabs/BowlingPlansTab';
import FieldingTab from './tabs/FieldingTab';
import PlayerCardModal from '../shared/PlayerCardModal';

const TacticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [validationErrors, setValidationErrors] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  const { getUserTeam, getTeamTactics, hasTactics, initializeDefaultTactics, resetTacticsToDefaults } = useTeamStore();
  const { players } = usePlayerStore();

  const userTeam = getUserTeam();
  const teamId = userTeam?.id;

  // Get team tactics
  const teamTactics = getTeamTactics(teamId);

  // Get team players
  const teamPlayers = teamId ? Object.values(players).filter(p => p.currentTeam === teamId) : [];

  // Initialize tactics if they don't exist
  useEffect(() => {
    if (teamId && !hasTactics(teamId) && teamPlayers.length > 0) {
      initializeDefaultTactics(teamId, teamPlayers);
    }
  }, [teamId, hasTactics, initializeDefaultTactics, teamPlayers]);

  if (!teamId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">No team selected</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'squad', label: 'Playing XI & Playstyles', icon: Users },
    { id: 'batting', label: 'Batting Order', icon: Target },
    { id: 'bowling', label: 'Bowling Plans', icon: Activity },
    { id: 'fielding', label: 'Fielding', icon: Shield }
  ];

  const handlePlayerClick = (playerId) => {
    setSelectedPlayerId(playerId);
    setShowPlayerModal(true);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all tactics to default values? This cannot be undone.')) {
      resetTacticsToDefaults(teamId, teamPlayers);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleValidate = () => {
    // Validate tactics
    const errors = validateTactics();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Tactics are already saved to store via individual tab updates
    setValidationErrors([]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const validateTactics = () => {
    const errors = [];

    if (!teamTactics) {
      errors.push('Tactics not initialized');
      return errors;
    }

    // Validate squad selection
    if (!teamTactics.squadSelection || teamTactics.squadSelection.length !== 11) {
      errors.push('Must select exactly 11 players');
    }

    // Validate minimum bowlers
    const bowlers = teamTactics.squadSelection.filter(playerId => {
      const player = players[playerId];
      return player && (player.role === 'bowler' || player.role === 'all-rounder');
    });

    if (bowlers.length < 5) {
      errors.push('Must have at least 5 bowling options');
    }

    // Validate wicket-keeper
    const hasWicketKeeper = teamTactics.squadSelection.some(playerId => {
      const player = players[playerId];
      return player && player.role === 'wicket-keeper';
    });

    if (!hasWicketKeeper) {
      errors.push('Must have at least 1 wicket-keeper');
    }

    // Validate batting order
    if (!teamTactics.battingOrder || teamTactics.battingOrder.length !== 11) {
      errors.push('Batting order must have all 11 players');
    }

    return errors;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Success Message */}
      {showSuccess && (
        <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/30">
          <div className="flex items-center gap-1.5 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Tactics validated successfully</span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
          <p className="text-red-400 text-sm font-semibold mb-1">Validation errors:</p>
          <ul className="text-red-400 text-sm space-y-0.5">
            {validationErrors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <nav className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setValidationErrors([]); // Clear errors when switching tabs
                  setShowSuccess(false);
                }}
                className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-cricket-accent text-cricket-accent'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-2 bg-bg-primary">
        {activeTab === 'overview' && (
          <OverviewTab teamId={teamId} teamPlayers={teamPlayers} onPlayerClick={handlePlayerClick} />
        )}
        {activeTab === 'squad' && (
          <SquadPlaystyleTab teamId={teamId} teamPlayers={teamPlayers} onPlayerClick={handlePlayerClick} />
        )}
        {activeTab === 'batting' && (
          <BattingOrderTab teamId={teamId} teamPlayers={teamPlayers} onPlayerClick={handlePlayerClick} />
        )}
        {activeTab === 'bowling' && (
          <BowlingPlansTab teamId={teamId} teamPlayers={teamPlayers} onPlayerClick={handlePlayerClick} />
        )}
        {activeTab === 'fielding' && (
          <FieldingTab teamId={teamId} onPlayerClick={handlePlayerClick} />
        )}
      </div>

      {/* Player Card Modal */}
      <PlayerCardModal
        isOpen={showPlayerModal}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayerId(null);
        }}
        playerId={selectedPlayerId}
      />

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-border-primary bg-bg-secondary">
        <button
          onClick={handleResetToDefaults}
          className="btn-secondary flex items-center gap-2 text-sm px-4 py-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Defaults</span>
        </button>
        <div className="flex-1"></div>
        <button
          onClick={handleValidate}
          className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Validate Tactics</span>
        </button>
      </div>
    </div>
  );
};

export default TacticsPage;
