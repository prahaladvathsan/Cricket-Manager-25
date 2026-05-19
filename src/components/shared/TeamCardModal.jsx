/**
 * @file TeamCardModal.jsx
 * @description Modal wrapper for displaying detailed team information and roster
 */

import React from 'react';
import { X, Trophy, Users } from 'lucide-react';
import TeamCard from './TeamCard';
import useLeagueStore from '../../stores/leagueStore';
import useTeamStore from '../../stores/teamStore';
import { getTeamBadge } from '../../utils/assetHelpers';

const TeamCardModal = ({ isOpen, onClose, teamId, team }) => {
  const { clubs } = useLeagueStore();
  const { getTeam } = useTeamStore();

  if (!isOpen || (!teamId && !team)) return null;

  // Get team data
  const teamData = team || clubs[teamId] || getTeam(teamId);

  if (!teamData) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-black/85 backdrop-blur-md border border-border-primary rounded-lg shadow-xl max-w-3xl w-full">
          <div className="p-6 text-center">
            <p className="text-text-secondary">Team not found</p>
            <button
              onClick={onClose}
              className="btn-secondary mt-4 px-4 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close if clicking the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <img
              src={getTeamBadge(teamData.id)}
              alt={teamData.name}
              className="w-10 h-10"
            />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {teamData.name}
              </h2>
              <p className="text-xs text-text-secondary">{teamData.shortName} • Team Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <TeamCard
            team={teamData}
            teamId={teamId}
            variant="full"
            showRoster={true}
            showStats={true}
            onPlayerClick={onClose}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border-primary">
          <button
            onClick={onClose}
            className="btn-primary px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamCardModal;
