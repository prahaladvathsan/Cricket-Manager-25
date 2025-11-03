/**
 * @file Squad.jsx
 * @description Team squad management page
 */

import React, { useState } from 'react';
import { Users, Target, TrendingUp, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import PlayerCard from '../shared/PlayerCard';

const Squad = () => {
  const [selectedTab, setSelectedTab] = useState('squad');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const { getUserTeam } = useTeamStore();
  const { getPlayersByTeam } = usePlayerStore();

  const userTeam = getUserTeam();
  const squadPlayers = userTeam ? getPlayersByTeam(userTeam.id) : [];

  // Toggle category collapse
  const toggleCategory = (categoryName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };
  
  // Calculate squad statistics
  const squadStats = {
    totalPlayers: squadPlayers.length,
    overseas: squadPlayers.filter(p => p.nationality !== 'IND').length,
    batsmen: squadPlayers.filter(p => p.role === 'batsman').length,
    bowlers: squadPlayers.filter(p => p.role === 'bowler').length,
    allRounders: squadPlayers.filter(p => p.role === 'all-rounder').length,
    wicketKeepers: squadPlayers.filter(p => p.role === 'wicket-keeper').length
  };

  // Categorize players by playstyle for squad display
  const categorizePlayersByPlaystyle = () => {
    const categories = {
      'Openers': [],
      'Top Order': [],
      'Middle Order': [],
      'Lower Order': [],
      'All-Rounders': [],
      'Fast Bowlers': [],
      'Spin Bowlers': [],
      'Wicket-Keepers': []
    };

    squadPlayers.forEach(player => {
      // Wicket-keepers
      if (player.role === 'wicket-keeper') {
        categories['Wicket-Keepers'].push(player);
      }
      // All-rounders
      else if (player.role === 'all-rounder') {
        categories['All-Rounders'].push(player);
      }
      // Bowlers
      else if (player.role === 'bowler') {
        const primaryBowling = player.primaryPlaystyle?.bowling?.toLowerCase() || '';
        if (primaryBowling.includes('pace') || primaryBowling.includes('fast') || primaryBowling.includes('seam')) {
          categories['Fast Bowlers'].push(player);
        } else {
          categories['Spin Bowlers'].push(player);
        }
      }
      // Batsmen - categorize by primary batting playstyle
      else if (player.role === 'batsman') {
        const primaryBatting = player.primaryPlaystyle?.batting?.toLowerCase() || '';

        if (primaryBatting.includes('opener') || primaryBatting.includes('aggressor')) {
          categories['Openers'].push(player);
        } else if (primaryBatting.includes('anchor') || primaryBatting.includes('power')) {
          categories['Top Order'].push(player);
        } else if (primaryBatting.includes('finisher') || primaryBatting.includes('accumulator')) {
          categories['Middle Order'].push(player);
        } else {
          categories['Lower Order'].push(player);
        }
      }
    });

    // Return only non-empty categories
    return Object.entries(categories)
      .filter(([_, players]) => players.length > 0)
      .map(([name, players]) => ({ name, players }));
  };

  const playerCategories = categorizePlayersByPlaystyle();

  const tabs = [
    { id: 'squad', label: 'Squad Overview', icon: Users },
    { id: 'team-info', label: 'Team Info', icon: Target },
    { id: 'statistics', label: 'Statistics', icon: TrendingUp }
  ];

  if (!userTeam) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-text-primary">Squad</h1>
        <div className="card p-6">
          <p className="text-text-secondary">Please select a team first to view squad details.</p>
        </div>
      </div>
    );
  }

  const renderSquadOverview = () => (
    <div className="space-y-4">
      {/* Squad Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="card p-3">
          <div className="text-2xl font-bold text-text-primary">{squadStats.totalPlayers}</div>
          <div className="text-text-secondary text-xs">Total Players</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-bold text-cricket-accent">{squadStats.overseas}</div>
          <div className="text-text-secondary text-xs">Overseas</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-bold text-text-primary">{squadStats.batsmen}</div>
          <div className="text-text-secondary text-xs">Batsmen</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-bold text-text-primary">{squadStats.bowlers}</div>
          <div className="text-text-secondary text-xs">Bowlers</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-bold text-text-primary">{squadStats.allRounders}</div>
          <div className="text-text-secondary text-xs">All-Rounders</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-bold text-text-primary">{squadStats.wicketKeepers}</div>
          <div className="text-text-secondary text-xs">Keepers</div>
        </div>
      </div>

      {/* Squad List - Categorized by Playstyle */}
      {squadPlayers.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Players in Squad</h3>
          <p className="text-text-secondary mb-4 text-sm">
            Your squad is empty. Visit the Transfers section to build your team through the auction.
          </p>
          <button className="btn-primary">Go to Transfers</button>
        </div>
      ) : (
        <div className="space-y-3">
          {playerCategories.map((category) => (
            <div key={category.name} className="card p-4">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="flex items-center justify-between w-full mb-3 pb-2 border-b border-border-primary hover:border-cricket-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cricket-accent" />
                  <h3 className="text-base font-semibold text-text-primary">{category.name}</h3>
                  <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded">
                    {category.players.length}
                  </span>
                </div>
                {collapsedCategories[category.name] ? (
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                )}
              </button>

              {/* Category Players */}
              {!collapsedCategories[category.name] && (
                <div className="space-y-2">
                  {category.players.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      variant="compact"
                      onClick={() => console.log('View player details:', player.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTeamInfo = () => (
    <div className="space-y-4">
      {/* Team Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
            <Target className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Team Information</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-full border-2"
                style={{ backgroundColor: userTeam.colors.primary, borderColor: userTeam.colors.secondary }}
              />
              <div>
                <div className="font-medium text-text-primary">{userTeam.name}</div>
                <div className="text-xs text-text-secondary">{userTeam.shortName}</div>
              </div>
            </div>
            <div className="pt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Head Coach:</span>
                <span className="text-text-primary">{userTeam.coachName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Home Venue:</span>
                <span className="text-text-primary">{userTeam.homeVenue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
            <DollarSign className="w-4 h-4 text-cricket-accent" />
            <h3 className="text-lg font-semibold text-text-primary">Financial Overview</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Budget Used</span>
                <span className="text-text-primary font-mono">
                  ₹{userTeam.finances.usedCap} / ₹{userTeam.finances.salaryCap} Cr
                </span>
              </div>
              <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                <div
                  className="bg-cricket-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${(userTeam.finances.usedCap / userTeam.finances.salaryCap) * 100}%` }}
                />
              </div>
            </div>
            <div className="pt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Available Budget:</span>
                <span className="text-status-win font-mono">₹{userTeam.finances.remainingBudget} Cr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Squad Size:</span>
                <span className="text-text-primary font-mono">{squadStats.totalPlayers}/25</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-border-primary pb-2">
          <TrendingUp className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-lg font-semibold text-text-primary">Season Statistics</h3>
        </div>
        <p className="text-text-secondary text-sm">
          Detailed statistics will be available once matches begin.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-primary pb-3">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-full border-2"
            style={{ backgroundColor: userTeam.colors.primary, borderColor: userTeam.colors.secondary }}
          />
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">{userTeam.name}</h1>
            <p className="text-text-secondary text-sm">Squad Management</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="btn-secondary">Set Tactics</button>
          <button className="btn-primary">Manage Squad</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-primary">
        <nav className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
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
      {selectedTab === 'squad' && renderSquadOverview()}
      {selectedTab === 'team-info' && renderTeamInfo()}
      {selectedTab === 'statistics' && renderStatistics()}
    </div>
  );
};

export default Squad;