/**
 * @file TacticsPage.jsx
 * @description Full page for managing team tactics (converted from SetTacticsModal)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  Activity,
  Shield,
  RotateCcw,
  CheckCircle,
  Eye,
  Lock,
  ArrowRight,
  Wand2
} from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useAuctionStore from '../../stores/auctionStore';
import useUIStore from '../../stores/uiStore';
import OverviewTab from './tabs/OverviewTab';
import SquadPlaystyleTab from './tabs/SquadPlaystyleTab';
import BattingOrderTab from './tabs/BattingOrderTab';
import BowlingPlansTab from './tabs/BowlingPlansTab';
import FieldingTab from './tabs/FieldingTab';
import PlayerCardModal from '../shared/PlayerCardModal';
import { TutorialSpotlight, useTacticsTutorial, tacticsTutorialSteps } from '../tutorial';
import aiTacticsManager from '../../core/ai/AITacticsManager';

const TacticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [validationErrors, setValidationErrors] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  const { getUserTeam, getTeamTactics, hasTactics, initializeDefaultTactics, resetTacticsToDefaults } = useTeamStore();
  const { players } = usePlayerStore();
  const { auctionState } = useAuctionStore();
  const { setHasInvalidTactics } = useUIStore();

  const userTeam = getUserTeam();
  const teamId = userTeam?.id;

  // Tutorial: Tactics-specific walkthrough (pass setActiveTab for auto-switching)
  const {
    shouldShowTutorial,
    currentStep,
    advance: advanceTutorial,
    skip: skipTutorial,
    totalSteps
  } = useTacticsTutorial(setActiveTab);

  // Get team tactics
  const teamTactics = getTeamTactics(teamId);

  // Get team players
  const teamPlayers = teamId ? Object.values(players).filter(p => p.currentTeam === teamId) : [];

  // Define validation function before hooks that use it
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

    // Validate no injured players in playing XI
    const injuredPlayers = teamTactics.squadSelection.filter(playerId => {
      const player = players[playerId];
      return player && player.condition?.injury;
    });

    if (injuredPlayers.length > 0) {
      const injuredPlayerNames = injuredPlayers.map(id => {
        const player = players[id];
        return `${player.name} (${player.condition.injuryDuration}d)`;
      }).join(', ');
      errors.push(`Injured players in XI: ${injuredPlayerNames}. Remove them from playing XI.`);
    }

    return errors;
  };

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Silently check validation in background to enable/disable navigation blocking
  // But DON'T show errors to user unless they click Validate or try to leave
  useEffect(() => {
    if (!teamTactics) {
      setHasInvalidTactics(false);
      return;
    }

    const errors = validateTactics();
    // Update the flag silently - this doesn't show errors to user
    setHasInvalidTactics(errors.length > 0);
  }, [teamTactics, players, setHasInvalidTactics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setHasInvalidTactics(false);
    };
  }, [setHasInvalidTactics]);

  // Initialize tactics if they don't exist
  useEffect(() => {
    if (teamId && !hasTactics(teamId) && teamPlayers.length > 0) {
      initializeDefaultTactics(teamId, teamPlayers);
    }
  }, [teamId, hasTactics, initializeDefaultTactics, teamPlayers]);

  // Warn user if they try to close browser/tab with invalid tactics
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const errors = validateTactics();
      if (errors.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have invalid tactics. Please fix errors before leaving.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Log warning on unmount if tactics invalid (no popup - user sees inline errors)
      const errors = validateTactics();
      if (errors.length > 0) {
        console.warn('⚠️ Tactics validation errors on page leave:', errors);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount, not on every tactics change

  // Block access until auction is complete
  if (auctionState !== 'completed') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-md text-center">
          <Lock className="w-16 h-16 text-cricket-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Tactics Locked</h2>
          <p className="text-cricket-text-secondary mb-6">
            Complete the auction to build your squad before setting tactics.
          </p>
          {auctionState === 'in_progress' ? (
            <Link to="/game/transfers" className="btn-primary inline-flex items-center gap-2">
              Go to Auction <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <p className="text-sm text-cricket-text-tertiary">
              The auction will begin when the season starts.
            </p>
          )}
        </div>
      </div>
    );
  }

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
    if (!confirm('Generate default tactics? This will replace your current tactics with AI-generated ones.')) {
      return;
    }

    try {
      // Generate tactics using AI pipeline (5-stage process)
      // aiTacticsManager is a singleton instance, use it directly
      const tactics = aiTacticsManager.generateTactics(teamId, teamPlayers, useTeamStore);

      if (tactics) {
        // Clear errors and show success
        setValidationErrors([]);
        setHasInvalidTactics(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setValidationErrors(['Failed to generate tactics. Ensure you have at least 11 eligible players.']);
        setHasInvalidTactics(true);
      }
    } catch (error) {
      console.error('Error generating default tactics:', error);
      setValidationErrors(['An error occurred while generating tactics. Please try manually.']);
      setHasInvalidTactics(true);
    }
  };

  // Also create handleGenerateDefaultTactics that points to the same function
  const handleGenerateDefaultTactics = handleResetToDefaults;

  const handleValidate = () => {
    // Validate tactics
    const errors = validateTactics();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setHasInvalidTactics(true);
      return;
    }

    // Tactics are already saved to store via individual tab updates
    setValidationErrors([]);
    setHasInvalidTactics(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
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
        <nav className="tactics-tab-nav flex gap-2">
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
                className={`tactics-tab-${tab.id} px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
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
          <Wand2 className="w-4 h-4" />
          <span>Generate Default Tactics</span>
        </button>
        <div className="flex-1"></div>
        <button
          onClick={handleValidate}
          className="tactics-validate-btn btn-primary flex items-center gap-2 text-sm px-4 py-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Validate Tactics</span>
        </button>
      </div>

      {/* Tactics Tutorial Walkthrough */}
      {shouldShowTutorial && tacticsTutorialSteps[currentStep] && (
        <TutorialSpotlight
          targetSelector={tacticsTutorialSteps[currentStep].targetSelector}
          title={tacticsTutorialSteps[currentStep].title}
          description={tacticsTutorialSteps[currentStep].description}
          icon={tacticsTutorialSteps[currentStep].icon}
          step={currentStep + 1}
          totalSteps={totalSteps}
          position={tacticsTutorialSteps[currentStep].position}
          onNext={advanceTutorial}
          onSkip={skipTutorial}
        />
      )}
    </div>
  );
};

export default TacticsPage;
