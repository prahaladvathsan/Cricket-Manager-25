/**
 * @file SetTacticsModal.jsx
 * @description Main modal for setting team tactics before matches
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Target,
  Activity,
  Shield,
  RotateCcw,
  Save
} from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import SquadPlaystyleTab from './tabs/SquadPlaystyleTab';
import BattingOrderTab from './tabs/BattingOrderTab';
import BowlingPlansTab from './tabs/BowlingPlansTab';
import FieldingTab from './tabs/FieldingTab';
import PlayerCardModal from '../shared/PlayerCardModal';

const SetTacticsModal = ({ isOpen, onClose, teamId }) => {
  const [activeTab, setActiveTab] = useState('squad');
  const [validationErrors, setValidationErrors] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  const { getTeamTactics, hasTactics, initializeDefaultTactics, resetTacticsToDefaults } = useTeamStore();
  const { players } = usePlayerStore();

  // Get team tactics
  const teamTactics = getTeamTactics(teamId);

  // Get team players
  const teamPlayers = Object.values(players).filter(p => p.currentTeam === teamId);

  // Initialize tactics if they don't exist
  useEffect(() => {
    if (isOpen && teamId && !hasTactics(teamId) && teamPlayers.length > 0) {
      initializeDefaultTactics(teamId, teamPlayers);
    }
  }, [isOpen, teamId, hasTactics, initializeDefaultTactics, teamPlayers]);

  if (!isOpen || !teamId) return null;

  const tabs = [
    { id: 'squad', label: 'Squad & Playstyles', icon: Users },
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
    }
  };

  const handleSave = () => {
    // Validate tactics before saving
    const errors = validateTactics();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Tactics are already saved to store via individual tab updates
    onClose();
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

    // Count bowling options (primary + part-timers)
    const primaryBowlers = teamTactics.squadSelection.filter(playerId => {
      const player = players[playerId];
      return player && (player.role === 'bowler' || player.role === 'all-rounder');
    });

    const partTimers = teamTactics.partTimers || [];
    const totalBowlingOptions = primaryBowlers.length + partTimers.length;

    // Only error if total bowling options < 5
    if (totalBowlingOptions < 5) {
      errors.push(`Must have at least 5 bowling options (currently ${totalBowlingOptions})`);
    }

    // Validate wicket-keeper (allow emergency keepers)
    if (!teamTactics.wicketKeeper) {
      errors.push('Must select a wicket-keeper');
    }

    // Validate batting order
    if (!teamTactics.battingOrder || teamTactics.battingOrder.length !== 11) {
      errors.push('Batting order must have all 11 players');
    }

    return errors;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-black/60 backdrop-blur-md border border-border-primary rounded-lg shadow-xl w-[98vw] h-[98vh] flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cricket-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Set Match Tactics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mx-3 mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
            <p className="text-red-400 text-xs font-semibold mb-1">Cannot save tactics:</p>
            <ul className="text-red-400 text-xs space-y-0.5">
              {validationErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs - Compact */}
        <div className="flex gap-1 px-3 pt-2 border-b border-border-primary">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setValidationErrors([]); // Clear errors when switching tabs
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-cricket-accent text-cricket-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3">
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

        {/* Actions - Compact */}
        <div className="flex gap-2 px-3 py-2 border-t border-border-primary">
          <button
            onClick={handleResetToDefaults}
            className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <div className="flex-1"></div>
          <button
            onClick={onClose}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Tactics</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetTacticsModal;
