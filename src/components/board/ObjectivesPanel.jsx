/**
 * @file ObjectivesPanel.jsx
 * @description Board objectives with live progress tracking
 */

import React, { useMemo, useEffect } from 'react';
import { Users, Target, Trophy, CheckCircle, Clock, XCircle, AlertCircle, Award } from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useAuctionStore from '../../stores/auctionStore';
import useTeamStore from '../../stores/teamStore';
import useGameStore from '../../stores/gameStore';
import { ICON_MAP } from '../../utils/ObjectiveGenerator';

const ObjectivesPanel = () => {
  const standings = useLeagueStore(state => state.standings);
  const stage = useLeagueStore(state => state.stage);
  const champion = useLeagueStore(state => state.champion);
  const auctionState = useAuctionStore(state => state.auctionState);
  const userTeam = useTeamStore(state => state.userTeam);
  const seasonObjectives = useGameStore(state => state.seasonObjectives);
  const objectiveTracking = useGameStore(state => state.objectiveTracking);
  const updateObjectiveProgress = useGameStore(state => state.updateObjectiveProgress);
  const getBoardScore = useGameStore(state => state.getBoardScore);

  // Update objectives with current game state
  useEffect(() => {
    if (!userTeam || !seasonObjectives || seasonObjectives.length === 0) {
      return;
    }

    // Find user's position in standings
    const userStanding = standings.find(s => s.clubId === userTeam.id);
    const userPosition = standings.findIndex(s => s.clubId === userTeam.id) + 1;
    const totalMatches = 18; // WPL season (9 teams × 2 rounds = 18 matches per team)
    const played = userStanding?.played || 0;

    // Build game data for objective calculations
    const gameData = {
      userPosition,
      userStanding,
      played,
      totalMatches,
      stage,
      champion,
      userTeamId: userTeam.id,
      auctionCompleted: auctionState === 'completed',
      ...objectiveTracking
    };

    // Update objectives with current game state
    updateObjectiveProgress(gameData);
  }, [standings, stage, champion, auctionState, userTeam, seasonObjectives, objectiveTracking, updateObjectiveProgress]);

  // Just return the objectives directly from store
  const objectives = seasonObjectives || [];

  // One-time initialization for existing saves (if in league/playoffs but no objectives)
  useEffect(() => {
    const gamePhase = useGameStore.getState().currentPhase;
    const teams = Object.values(useTeamStore.getState().teams);
    const userTeamId = useTeamStore.getState().userTeamId;

    // If we're past preseason and have no objectives, generate them now
    if ((gamePhase === 'league' || gamePhase === 'playoffs') && seasonObjectives.length === 0) {
      const rivalTeam = teams.find(t => t.id !== userTeamId);
      useGameStore.getState().generateSeasonObjectives(rivalTeam?.name || 'Sydney Sharks');
      console.log('📋 Generated objectives for existing save');
    }
  }, []);

  // Calculate board score
  const boardScore = getBoardScore();

  // If no objectives yet, show message
  if (objectives.length === 0) {
    return (
      <div className="card p-4 text-center text-text-secondary">
        <p>Objectives will be generated at the start of the season</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Board Score Display */}
      <div className="card p-4 border-2 border-cricket-accent bg-cricket-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Award className="w-5 h-5 text-cricket-accent" />
              Board Score
            </h3>
            <p className="text-xs text-text-secondary mt-1">Overall performance rating</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-cricket-accent">{boardScore}</div>
            <div className="text-xs text-text-secondary">out of 100</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-3 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              boardScore >= 75 ? 'bg-green-500' :
              boardScore >= 50 ? 'bg-cricket-accent' :
              boardScore >= 25 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${boardScore}%` }}
          />
        </div>
      </div>

      {/* Individual Objectives */}
      {objectives.map(objective => (
        <ObjectiveCard key={objective.id} objective={objective} />
      ))}
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    completed: {
      label: 'Completed',
      icon: CheckCircle,
      className: 'bg-green-900/30 text-green-400 border border-green-500'
    },
    in_progress: {
      label: 'In Progress',
      icon: Clock,
      className: 'bg-cricket-accent/20 text-cricket-accent border border-cricket-accent'
    },
    on_track: {
      label: 'On Track',
      icon: CheckCircle,
      className: 'bg-cricket-accent/20 text-cricket-accent border border-cricket-accent'
    },
    at_risk: {
      label: 'At Risk',
      icon: AlertCircle,
      className: 'bg-yellow-900/30 text-yellow-400 border border-yellow-500'
    },
    pending: {
      label: 'Not Started',
      icon: Clock,
      className: 'bg-bg-tertiary text-text-secondary border border-border-primary'
    },
    failed: {
      label: 'Failed',
      icon: XCircle,
      className: 'bg-red-900/30 text-red-400 border border-red-500'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
};

// Objective card component
const ObjectiveCard = ({ objective }) => {
  const statusColors = {
    completed: 'border-green-500 bg-green-900/10',
    in_progress: 'border-cricket-accent bg-cricket-primary/10',
    on_track: 'border-cricket-accent bg-cricket-primary/10',
    at_risk: 'border-yellow-500 bg-yellow-900/10',
    pending: 'border-border-primary bg-bg-secondary',
    failed: 'border-red-500 bg-red-900/10'
  };

  // Map icon string to component
  const Icon = ICON_MAP[objective.icon] || Target;

  return (
    <div className={`card p-3 border ${statusColors[objective.status]}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-cricket-primary/20 rounded">
          <Icon className="w-5 h-5 text-cricket-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-text-primary">{objective.title}</h4>
              <p className="text-xs text-text-secondary mt-0.5">{objective.description}</p>
            </div>
            <StatusBadge status={objective.status} />
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Progress</span>
              <span>{objective.progress}%</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  objective.status === 'completed' ? 'bg-green-500' :
                  objective.status === 'failed' ? 'bg-red-500' :
                  objective.status === 'at_risk' ? 'bg-yellow-500' :
                  'bg-cricket-accent'
                }`}
                style={{ width: `${objective.progress}%` }}
              />
            </div>
          </div>

          {/* Details */}
          {objective.details && (
            <p className="text-xs text-text-secondary mt-2">{objective.details}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectivesPanel;
