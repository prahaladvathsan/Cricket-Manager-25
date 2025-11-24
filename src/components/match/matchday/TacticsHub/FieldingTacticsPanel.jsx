/**
 * FieldingTacticsPanel - Complete fielding tactics management for matchday
 *
 * Features:
 * - 2 subtabs: Formation and Assignments
 * - Formation: All 15 formations + customize field button
 * - Assignments: Player-to-position assignment
 * - Initializes from saved teamTactics.fielding
 * - Updates both teamStore (persistent) and matchStore (live match state)
 */

import React, { useState, useEffect } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import useTeamStore from '../../../../stores/teamStore';
import usePlayerStore from '../../../../stores/playerStore';
import { Shield, Users, Edit3, Lock } from 'lucide-react';
import { formationsConfig } from '../../../../utils/fieldingFormationResolver.js';
import { getFormationWithPositions } from '../../../../utils/fieldingFormationResolver.js';

/**
 * Formation Subtab - Data-dense formation list + customize button
 */
const FormationSubtab = ({
  currentFormation,
  onFormationSelect,
  phase,
  userIsBowling,
  customizeMode,
  onToggleCustomize
}) => {
  const [categoryFilter, setCategoryFilter] = useState('all');

  const formations = formationsConfig.formations;

  // Categorize templates
  const categories = {
    attacking: [],
    balanced: [],
    defensive: []
  };

  Object.entries(formations).forEach(([id, template]) => {
    const style = template.formationStyle || 'neutral';
    if (style === 'attacking') {
      categories.attacking.push({ id, ...template });
    } else if (style === 'defensive') {
      categories.defensive.push({ id, ...template });
    } else {
      categories.balanced.push({ id, ...template });
    }
  });

  // Get display templates based on filter
  const displayTemplates = categoryFilter === 'all'
    ? [...categories.attacking, ...categories.balanced, ...categories.defensive]
    : categories[categoryFilter] || [];

  return (
    <div className="space-y-1">
      {/* Customize button (only when bowling) */}
      {userIsBowling && (
        <div className="px-1">
          <button
            onClick={onToggleCustomize}
            className={`w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
              customizeMode
                ? 'bg-cricket-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary hover:border-cricket-accent'
            }`}
          >
            {customizeMode ? (
              <>
                <Lock className="w-3 h-3" />
                Lock Field
              </>
            ) : (
              <>
                <Edit3 className="w-3 h-3" />
                Customize Field
              </>
            )}
          </button>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1 px-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`flex-1 px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            categoryFilter === 'all'
              ? 'bg-cricket-primary text-white'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setCategoryFilter('attacking')}
          className={`flex-1 px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            categoryFilter === 'attacking'
              ? 'bg-red-500 text-white'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
          }`}
        >
          Attack
        </button>
        <button
          onClick={() => setCategoryFilter('balanced')}
          className={`flex-1 px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            categoryFilter === 'balanced'
              ? 'bg-green-500 text-white'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
          }`}
        >
          Neutral
        </button>
        <button
          onClick={() => setCategoryFilter('defensive')}
          className={`flex-1 px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            categoryFilter === 'defensive'
              ? 'bg-blue-500 text-white'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
          }`}
        >
          Defend
        </button>
      </div>

      {/* Formation list - data dense single lines with color coding */}
      <div className="space-y-0.5 px-1 max-h-[450px] overflow-y-auto">
        {displayTemplates.map((template) => {
          const isSelected = currentFormation === template.id;
          const style = template.formationStyle || 'neutral';

          // Color indicator based on style
          let colorClass = 'bg-green-500'; // balanced
          if (style === 'attacking') colorClass = 'bg-red-500';
          else if (style === 'defensive') colorClass = 'bg-blue-500';

          return (
            <button
              key={template.id}
              onClick={() => onFormationSelect(template.id)}
              className={`w-full px-2 py-1 text-left text-xs rounded transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-cricket-primary text-white font-medium'
                  : 'bg-bg-tertiary text-text-primary hover:bg-bg-hover border border-border-primary hover:border-cricket-accent'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorClass}`}></div>
              {template.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Assignments Subtab - Data-dense player assignments
 */
const AssignmentsSubtab = ({
  currentFormation,
  playerAssignments,
  onAssignmentChange,
  bowlingTeamSquad,
  players
}) => {
  const formationData = getFormationWithPositions(currentFormation);

  if (!formationData) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p className="text-xs">No formation selected</p>
      </div>
    );
  }

  const positions = formationData.positions;

  // Get wicketkeeper candidates
  const wicketkeeperCandidates = bowlingTeamSquad.filter(player =>
    player.role === 'wicket-keeper' || player.primaryRole === 'wicket-keeper' ||
    player.role === 'Wicketkeeper' || player.primaryRole === 'Wicketkeeper'
  );

  const assignedWicketkeeperId = playerAssignments[1];
  const fieldingCandidates = bowlingTeamSquad.filter(p => p.id !== assignedWicketkeeperId);

  // Get fielder color
  const getFielderColor = (position) => {
    switch (position.zone) {
      case 'silly': return '#EF4444';
      case 'close': return '#F97316';
      case 'ring': return '#EAB308';
      case 'boundary': return '#3B82F6';
      default: return '#FFFFFF';
    }
  };

  return (
    <div className="space-y-0.5 px-1 max-h-[500px] overflow-y-auto">
      {/* Sort: keeper first, then fielders (2-10), bowler last */}
      {[...positions].map((position, originalIndex) => ({ position, originalIndex }))
        .sort((a, b) => {
          if (a.originalIndex === 1) return -1;
          if (b.originalIndex === 1) return 1;
          if (a.originalIndex === 0) return 1;
          if (b.originalIndex === 0) return -1;
          return a.originalIndex - b.originalIndex;
        })
        .map(({ position, originalIndex: index }) => {
          const isKeeper = index === 1;
          const isBowler = index === 0;
          const color = getFielderColor(position);

          return (
            <div
              key={index}
              className="flex items-center gap-1.5 p-1 rounded bg-bg-tertiary border border-border-primary"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">
                  {index + 1}. {position.name?.replace(/_/g, ' ').split(' ').map(w =>
                    w.charAt(0).toUpperCase() + w.slice(1)
                  ).join(' ')}
                </div>

                {isBowler ? (
                  <div className="text-xs text-text-secondary">Auto</div>
                ) : isKeeper ? (
                  <select
                    value={playerAssignments[index] || ''}
                    onChange={(e) => onAssignmentChange(index, e.target.value)}
                    className="w-full text-xs bg-bg-secondary border border-border-primary rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-cricket-accent mt-0.5"
                  >
                    <option value="">Auto</option>
                    {wicketkeeperCandidates.map(player => {
                      const rating = Math.round(player.playstyleRatings?.fielding?.Wicketkeeper || 0);
                      return (
                        <option key={player.id} value={player.id}>
                          {player.name} ({rating})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <select
                    value={playerAssignments[index] || ''}
                    onChange={(e) => onAssignmentChange(index, e.target.value)}
                    className="w-full text-xs bg-bg-secondary border border-border-primary rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-cricket-accent mt-0.5"
                  >
                    <option value="">Auto</option>
                    {fieldingCandidates.map(player => {
                      const rating = player.fielding || player.catching || 10;
                      return (
                        <option key={player.id} value={player.id}>
                          {player.name} ({rating})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

/**
 * Main FieldingTacticsPanel component
 */
export default function FieldingTacticsPanel() {
  const [activeSubTab, setActiveSubTab] = useState('formation');
  const [customizeMode, setCustomizeMode] = useState(false);

  const innings = useMatchStore(state => state.innings);
  const currentBall = useMatchStore(state => state.currentBall);
  const teams = useMatchStore(state => state.teams);
  const updateFieldFormation = useMatchStore(state => state.updateFieldFormation);

  const teamStore = useTeamStore();
  const { players } = usePlayerStore();

  const bowlingTeam = teams.bowling;
  const bowlingTeamId = bowlingTeam.id;
  const userTeamId = teamStore.userTeamId;
  const userIsBowling = bowlingTeamId === userTeamId;

  // Get current formation from matchStore (live match state)
  const currentFormation = innings.currentFieldFormation || 'neutral_orthodox';
  const currentPlayerAssignments = innings.fieldPlayerAssignments || {};

  // Get bowling team squad (playing XI)
  const bowlingTeamSquad = bowlingTeam.squad.map(playerId => players[playerId]).filter(p => p);

  // Determine phase based on current over
  const currentOver = currentBall.over;
  const phase = currentOver < 6 ? 'powerplay' : 'postPowerplay';

  // Initialize fielding formation from saved teamTactics at match start
  useEffect(() => {
    // Only initialize if not already set
    if (innings.currentFieldFormation && innings.currentFieldFormation !== 'neutral_orthodox') {
      return; // Already initialized
    }

    const teamTactics = teamStore.teamTactics[bowlingTeamId];
    if (!teamTactics?.fielding) return;

    // Get saved fielding setup for current phase
    const savedSetup = phase === 'powerplay'
      ? teamTactics.fielding.powerplay
      : teamTactics.fielding.postPowerplay;

    if (savedSetup?.template) {
      const formationData = getFormationWithPositions(savedSetup.template);
      if (formationData) {
        // Initialize matchStore with saved formation
        updateFieldFormation(
          savedSetup.template,
          savedSetup.positions || formationData.positions,
          savedSetup.playerAssignments || {}
        );
      }
    }
  }, [bowlingTeamId, phase]); // Re-run when bowling team or phase changes

  // Handle formation change
  const handleFormationSelect = (formationId) => {
    const formationData = getFormationWithPositions(formationId);
    if (!formationData) return;

    // Update matchStore (live match state)
    updateFieldFormation(
      formationId,
      formationData.positions,
      {} // Reset player assignments when changing formation
    );

    // Also update teamStore (persistent)
    teamStore.updateFieldFormation(bowlingTeamId, formationId);
  };

  // Handle player assignment change
  const handleAssignmentChange = (positionIndex, playerId) => {
    const newAssignments = { ...currentPlayerAssignments };

    if (playerId) {
      // Clear any existing assignment of this player
      Object.keys(newAssignments).forEach(key => {
        if (newAssignments[key] === playerId && key !== String(positionIndex)) {
          newAssignments[key] = null;
        }
      });
    }

    newAssignments[positionIndex] = playerId || null;

    // Update matchStore
    updateFieldFormation(
      currentFormation,
      innings.fieldPositions,
      newAssignments
    );
  };

  // Handle customize mode toggle
  const handleToggleCustomize = () => {
    setCustomizeMode(!customizeMode);
    // Notify FielderPositions component via a custom event
    const event = new CustomEvent('toggleFieldCustomize', { detail: { enabled: !customizeMode } });
    window.dispatchEvent(event);
  };

  // Sub-tabs configuration
  const subTabs = [
    { id: 'formation', label: 'Formation', icon: Shield },
    { id: 'assignments', label: 'Assignments', icon: Users }
  ];

  return (
    <div className="space-y-1">
      {/* Sub-tab Switcher - same style as bowling tab */}
      <div className="flex border-b border-border-primary">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-cricket-accent border-cricket-accent'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-secondary'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'formation' ? (
        <FormationSubtab
          currentFormation={currentFormation}
          onFormationSelect={handleFormationSelect}
          phase={phase}
          userIsBowling={userIsBowling}
          customizeMode={customizeMode}
          onToggleCustomize={handleToggleCustomize}
        />
      ) : (
        <AssignmentsSubtab
          currentFormation={currentFormation}
          playerAssignments={currentPlayerAssignments}
          onAssignmentChange={handleAssignmentChange}
          bowlingTeamSquad={bowlingTeamSquad}
          players={players}
        />
      )}
    </div>
  );
}
