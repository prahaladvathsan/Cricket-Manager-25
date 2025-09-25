/**
 * @file Squad.jsx
 * @description Team squad management page
 */

import React, { useState } from 'react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';

const Squad = () => {
  const [selectedTab, setSelectedTab] = useState('squad');
  const { getUserTeam } = useTeamStore();
  const { getPlayersByTeam } = usePlayerStore();
  
  const userTeam = getUserTeam();
  const squadPlayers = userTeam ? getPlayersByTeam(userTeam.id) : [];
  
  // Calculate squad statistics
  const squadStats = {
    totalPlayers: squadPlayers.length,
    overseas: squadPlayers.filter(p => p.nationality !== 'IND').length,
    batsmen: squadPlayers.filter(p => p.role === 'batsman').length,
    bowlers: squadPlayers.filter(p => p.role === 'bowler').length,
    allRounders: squadPlayers.filter(p => p.role === 'all-rounder').length,
    wicketKeepers: squadPlayers.filter(p => p.role === 'wicket-keeper').length
  };
  
  const tabs = [
    { id: 'squad', label: 'Squad Overview', icon: '👥' },
    { id: 'team-info', label: 'Team Info', icon: '🏏' },
    { id: 'statistics', label: 'Statistics', icon: '📊' }
  ];

  if (!userTeam) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-cricket-text-primary">Squad</h1>
        <div className="card p-6">
          <p className="text-cricket-text-secondary">Please select a team first to view squad details.</p>
        </div>
      </div>
    );
  }

  const renderSquadOverview = () => (
    <div className="space-y-6">
      {/* Squad Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-cricket-text-primary">{squadStats.totalPlayers}</div>
          <div className="text-cricket-text-secondary text-sm">Total Players</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-cricket-accent">{squadStats.overseas}</div>
          <div className="text-cricket-text-secondary text-sm">Overseas</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-cricket-text-primary">{squadStats.batsmen}</div>
          <div className="text-cricket-text-secondary text-sm">Batsmen</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-cricket-text-primary">{squadStats.bowlers}</div>
          <div className="text-cricket-text-secondary text-sm">Bowlers</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-cricket-text-primary">{squadStats.allRounders}</div>
          <div className="text-cricket-text-secondary text-sm">All-Rounders</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-cricket-text-primary">{squadStats.wicketKeepers}</div>
          <div className="text-cricket-text-secondary text-sm">Keepers</div>
        </div>
      </div>

      {/* Squad List */}
      <div className="card">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-cricket-text-primary">Current Squad</h3>
        </div>
        
        {squadPlayers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-cricket-text-primary mb-2">No Players in Squad</h3>
            <p className="text-cricket-text-secondary mb-4">
              Your squad is empty. Visit the Transfers section to build your team through the auction.
            </p>
            <button className="btn-primary">Go to Transfers</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cricket-background">
                <tr>
                  <th className="px-4 py-3 text-left text-cricket-text-primary">Name</th>
                  <th className="px-4 py-3 text-left text-cricket-text-primary">Role</th>
                  <th className="px-4 py-3 text-left text-cricket-text-primary">Age</th>
                  <th className="px-4 py-3 text-left text-cricket-text-primary">Nationality</th>
                  <th className="px-4 py-3 text-left text-cricket-text-primary">Form</th>
                  <th className="px-4 py-3 text-left text-cricket-text-primary">Fitness</th>
                  <th className="px-4 py-3 text-left text-cricket-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {squadPlayers.map((player) => (
                  <tr key={player.id} className="border-b border-gray-700 hover:bg-cricket-background/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-cricket-text-primary">{player.name}</div>
                      {player.id === userTeam.captainId && (
                        <div className="text-xs text-cricket-accent">Captain</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cricket-text-secondary capitalize">{player.role}</td>
                    <td className="px-4 py-3 text-cricket-text-secondary">{player.age}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm px-2 py-1 rounded ${
                        player.nationality !== 'IND' ? 'bg-cricket-accent bg-opacity-20 text-cricket-accent' : 'text-cricket-text-secondary'
                      }`}>
                        {player.nationality}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-16 bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-cricket-primary h-2 rounded-full" 
                          style={{ width: `${player.condition?.form || 50}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-16 bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${player.condition?.fitness || 75}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-cricket-text-secondary hover:text-cricket-text-primary text-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderTeamInfo = () => (
    <div className="space-y-6">
      {/* Team Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-cricket-text-primary mb-4">Team Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full border-2"
                style={{ backgroundColor: userTeam.colors.primary, borderColor: userTeam.colors.secondary }}
              />
              <div>
                <div className="font-medium text-cricket-text-primary">{userTeam.name}</div>
                <div className="text-sm text-cricket-text-secondary">{userTeam.shortName}</div>
              </div>
            </div>
            <div className="pt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-cricket-text-secondary">Head Coach:</span>
                <span className="text-cricket-text-primary">{userTeam.coachName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cricket-text-secondary">Home Venue:</span>
                <span className="text-cricket-text-primary">{userTeam.homeVenue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-cricket-text-primary mb-4">Financial Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-cricket-text-secondary">Budget Used</span>
                <span className="text-cricket-text-primary">
                  ₹{userTeam.finances.usedCap} / ₹{userTeam.finances.salaryCap} Cr
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-cricket-primary h-2 rounded-full" 
                  style={{ width: `${(userTeam.finances.usedCap / userTeam.finances.salaryCap) * 100}%` }}
                />
              </div>
            </div>
            <div className="pt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-cricket-text-secondary">Available Budget:</span>
                <span className="text-green-400">₹{userTeam.finances.remainingBudget} Cr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cricket-text-secondary">Squad Size:</span>
                <span className="text-cricket-text-primary">{squadStats.totalPlayers}/25</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-cricket-text-primary mb-4">Season Statistics</h3>
        <p className="text-cricket-text-secondary">
          Detailed statistics will be available once matches begin.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-full border-2"
            style={{ backgroundColor: userTeam.colors.primary, borderColor: userTeam.colors.secondary }}
          />
          <div>
            <h1 className="text-3xl font-bold text-cricket-text-primary">{userTeam.name}</h1>
            <p className="text-cricket-text-secondary">Squad Management</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="btn-secondary">Set Tactics</button>
          <button className="btn-primary">Manage Squad</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? 'border-cricket-primary text-cricket-primary'
                  : 'border-transparent text-cricket-text-secondary hover:text-cricket-text-primary'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'squad' && renderSquadOverview()}
      {selectedTab === 'team-info' && renderTeamInfo()}
      {selectedTab === 'statistics' && renderStatistics()}
    </div>
  );
};

export default Squad;