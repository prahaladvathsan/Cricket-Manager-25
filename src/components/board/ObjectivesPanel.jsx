/**
 * @file ObjectivesPanel.jsx
 * @description Board objectives with live progress tracking
 */

import React, { useMemo } from 'react';
import { Users, Target, Trophy, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import useLeagueStore from '../../stores/leagueStore';
import useAuctionStore from '../../stores/auctionStore';
import useTeamStore from '../../stores/teamStore';

const ObjectivesPanel = () => {
  const standings = useLeagueStore(state => state.standings);
  const stage = useLeagueStore(state => state.stage);
  const champion = useLeagueStore(state => state.champion);
  const auctionState = useAuctionStore(state => state.auctionState);
  const userTeam = useTeamStore(state => state.userTeam);

  // Helper to get ordinal suffix
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Calculate objectives data
  const objectives = useMemo(() => {
    if (!userTeam) return [];

    const auctionCompleted = auctionState === 'completed';

    // Find user's position in standings
    const userStanding = standings.find(s => s.clubId === userTeam.id);
    const userPosition = standings.findIndex(s => s.clubId === userTeam.id) + 1;
    const totalMatches = 18; // WPL season (9 teams × 2 rounds = 18 matches per team)
    const played = userStanding?.played || 0;
    const remaining = totalMatches - played;

    // Calculate playoff progress
    const calculatePlayoffProgress = () => {
      if (userPosition <= 4 && played === totalMatches) return 100;
      if (userPosition > 4 && played === totalMatches) return 0;

      // During season, estimate based on current trajectory
      const progressThroughSeason = (played / totalMatches) * 100;
      const positionScore = userPosition <= 4 ? 100 : Math.max(0, 100 - ((userPosition - 4) * 20));

      return Math.min(100, Math.round((progressThroughSeason + positionScore) / 2));
    };

    // Calculate championship progress
    const calculateChampionshipProgress = () => {
      if (champion?.id === userTeam.id) return 100;
      if (stage === 'completed') return 0;
      if (stage === 'playoffs') {
        // Check if user qualified
        if (userPosition <= 4) return 50;
        return 0;
      }
      if (stage === 'league') {
        // Progress based on position
        if (userPosition <= 2) return 40;
        if (userPosition <= 4) return 30;
        if (userPosition <= 6) return 20;
        return 10;
      }
      return 0;
    };

    // Determine playoff status
    const getPlayoffStatus = () => {
      if (stage === 'playoffs' && userPosition <= 4) return 'completed';
      if (stage === 'completed' && userPosition > 4) return 'failed';
      if (userPosition <= 4) return 'in_progress';
      if (userPosition > 8) return 'at_risk';
      return 'in_progress';
    };

    // Determine championship status
    const getChampionshipStatus = () => {
      if (champion?.id === userTeam.id) return 'completed';
      if (stage === 'completed' && champion?.id !== userTeam.id) return 'failed';
      if (stage === 'playoffs' && userPosition <= 4) return 'in_progress';
      if (stage === 'league' && userPosition <= 4) return 'on_track';
      return 'pending';
    };

    // Get playoff details
    const getPlayoffDetails = () => {
      if (played === 0) return 'Season not started';
      if (stage === 'completed') {
        return userPosition <= 4 ? 'Qualified for playoffs' : 'Failed to qualify';
      }
      if (stage === 'playoffs') {
        return 'Playoffs in progress';
      }
      return `Currently ${getOrdinal(userPosition)} place, ${remaining} match${remaining !== 1 ? 'es' : ''} remaining`;
    };

    // Get championship details
    const getChampionshipDetails = () => {
      if (champion?.id === userTeam.id) return 'Champions! 🏆';
      if (stage === 'completed') return 'Season completed';
      if (stage === 'playoffs') return 'Competing for the title';
      if (userPosition <= 4) return 'On track for playoffs';
      return 'Need to improve league position';
    };

    return [
      {
        id: 'auction',
        title: 'Complete Squad Building',
        description: 'Build your squad through the auction',
        progress: auctionCompleted ? 100 : 0,
        status: auctionCompleted ? 'completed' : 'pending',
        details: auctionCompleted ? 'Squad finalized' : 'Auction not completed',
        icon: Users
      },
      {
        id: 'playoffs',
        title: 'Qualify for Playoffs',
        description: 'Finish in the top 4 to qualify for playoffs',
        progress: calculatePlayoffProgress(),
        status: getPlayoffStatus(),
        details: getPlayoffDetails(),
        icon: Target
      },
      {
        id: 'championship',
        title: 'Win the Championship',
        description: 'Win the World Premier League title',
        progress: calculateChampionshipProgress(),
        status: getChampionshipStatus(),
        details: getChampionshipDetails(),
        icon: Trophy
      }
    ];
  }, [standings, stage, champion, auctionState, userTeam]);

  return (
    <div className="space-y-3">
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

  const Icon = objective.icon;

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
