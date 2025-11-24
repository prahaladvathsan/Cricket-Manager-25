/**
 * @file teamSelector.js
 * @description Intelligent team selection from player database for match simulation
 */

import fs from 'fs';
import path from 'path';
import { getPlayerRating } from './ratingHelper.js';

/**
 * Team selector for creating balanced cricket teams
 */
class TeamSelector {
  constructor() {
    this.players = [];
    this.loadPlayerDatabase();
  }

  /**
   * Load player database from JSON
   */
  loadPlayerDatabase() {
    try {
      const dbPath = path.join(process.cwd(), 'src/data/players/processed/player_database_from_excel.json');
      const data = fs.readFileSync(dbPath, 'utf8');
      this.players = JSON.parse(data);
      console.log(`Loaded ${this.players.length} players from database`);
    } catch (error) {
      console.error('Failed to load player database:', error.message);
      this.players = [];
    }
  }

  /**
   * Select two balanced teams from top players
   * @param {Object} options - Selection options
   * @returns {Object} Two teams with squad composition
   */
  selectTwoTeams(options = {}) {
    const {
      topPlayersCount = 200,
      teamSize = 11,
      balanceTeams = true,
      preferTopRated = true
    } = options;

    // Get top players by rating
    const topPlayers = this.getTopPlayers(topPlayersCount);

    // Split players by role for balanced team selection
    const playersByRole = this.groupPlayersByRole(topPlayers);

    // Select Team A
    const teamA = this.selectBalancedTeam(playersByRole, teamSize, 'Chennai Cobras');

    // Remove selected players from pool
    const remainingPlayers = this.removeSelectedPlayers(topPlayers, teamA.players);
    const remainingByRole = this.groupPlayersByRole(remainingPlayers);

    // Select Team B
    const teamB = this.selectBalancedTeam(remainingByRole, teamSize, 'London Lions');

    console.log(`\nTeam A: ${teamA.name}`);
    this.printTeamComposition(teamA);

    console.log(`\nTeam B: ${teamB.name}`);
    this.printTeamComposition(teamB);

    return { teamA, teamB };
  }

  /**
   * Get top players by rating
   * @param {number} count - Number of top players to retrieve
   * @returns {Array} Top players
   */
  getTopPlayers(count) {
    return this.players
      .filter(player => getPlayerRating(player) > 30) // Filter out very low rated (30/100 scale)
      .sort((a, b) => getPlayerRating(b) - getPlayerRating(a))
      .slice(0, count);
  }

  /**
   * Group players by role
   * @param {Array} players - Players to group
   * @returns {Object} Players grouped by role
   */
  groupPlayersByRole(players) {
    const grouped = {
      batsman: [],
      bowler: [],
      'all-rounder': [],
      'wicket-keeper': []
    };

    players.forEach(player => {
      if (grouped[player.role]) {
        grouped[player.role].push(player);
      } else {
        grouped.batsman.push(player); // Default to batsman
      }
    });

    return grouped;
  }

  /**
   * Select a balanced team
   * @param {Object} playersByRole - Players grouped by role
   * @param {number} teamSize - Size of team
   * @param {string} teamName - Name of the team
   * @returns {Object} Selected team
   */
  selectBalancedTeam(playersByRole, teamSize, teamName) {
    const team = {
      id: teamName.toLowerCase().replace(/\s+/g, '_'),
      name: teamName,
      players: [],
      composition: {
        batsman: 0,
        bowler: 0,
        'all-rounder': 0,
        'wicket-keeper': 0
      }
    };

    // Ideal team composition for T20
    const idealComposition = {
      'wicket-keeper': 1,
      batsman: 5,
      'all-rounder': 2,
      bowler: 3
    };

    // Select players by role priority
    const roleOrder = ['wicket-keeper', 'batsman', 'all-rounder', 'bowler'];

    for (const role of roleOrder) {
      const needed = idealComposition[role];
      const available = playersByRole[role] || [];

      // Sort by rating and select top players
      const selected = available
        .sort((a, b) => b.rating - a.rating)
        .slice(0, needed);

      selected.forEach(player => {
        if (team.players.length < teamSize) {
          team.players.push(player);
          team.composition[role]++;
        }
      });
    }

    // Fill remaining spots with best available players
    while (team.players.length < teamSize) {
      const allRemaining = Object.values(playersByRole)
        .flat()
        .filter(player => !team.players.includes(player))
        .sort((a, b) => b.rating - a.rating);

      if (allRemaining.length === 0) break;

      const player = allRemaining[0];
      team.players.push(player);
      team.composition[player.role]++;
    }

    // Set captain (best rated player)
    if (team.players.length > 0) {
      team.captain = team.players
        .sort((a, b) => b.rating - a.rating)[0].id;
    }

    // Calculate team rating
    team.rating = this.calculateTeamRating(team.players);

    return team;
  }

  /**
   * Remove selected players from available pool
   * @param {Array} allPlayers - All available players
   * @param {Array} selectedPlayers - Players to remove
   * @returns {Array} Remaining players
   */
  removeSelectedPlayers(allPlayers, selectedPlayers) {
    const selectedIds = new Set(selectedPlayers.map(p => p.id));
    return allPlayers.filter(player => !selectedIds.has(player.id));
  }

  /**
   * Calculate team rating
   * @param {Array} players - Team players
   * @returns {number} Team rating
   */
  calculateTeamRating(players) {
    if (players.length === 0) return 0;

    const totalRating = players.reduce((sum, player) => sum + getPlayerRating(player), 0);
    return Math.round((totalRating / players.length) * 10) / 10;
  }

  /**
   * Print team composition
   * @param {Object} team - Team object
   */
  printTeamComposition(team) {
    console.log(`Rating: ${team.rating}`);
    console.log(`Composition: ${team.composition.batsman}B ${team.composition.bowler}Bo ${team.composition['all-rounder']}AR ${team.composition['wicket-keeper']}WK`);

    console.log('\nPlayers:');
    team.players
      .sort((a, b) => getPlayerRating(b) - getPlayerRating(a))
      .forEach((player, index) => {
        const captain = player.id === team.captain ? ' (C)' : '';
        const rating = getPlayerRating(player).toFixed(1);
        console.log(`${index + 1}. ${player.name} (${player.role}) - ${rating}${captain}`);
      });
  }

  /**
   * Get team for match engine format
   * @param {Object} team - Team object
   * @returns {Object} Match engine format team
   */
  getMatchEngineTeam(team) {
    return {
      id: team.id,
      name: team.name,
      playingXI: team.players.map(p => p.id),
      captain: team.captain,
      players: team.players,
      rating: team.rating
    };
  }

  /**
   * Select opening batsmen for team
   * @param {Object} team - Team object
   * @returns {Object} Opening pair
   */
  selectOpeningPair(team) {
    const batsmen = team.players.filter(p =>
      p.role === 'batsman' || p.role === 'wicket-keeper' || p.role === 'all-rounder'
    );

    // Sort by batting rating
    batsmen.sort((a, b) => {
      const aRating = this.getBattingRating(a);
      const bRating = this.getBattingRating(b);
      return bRating - aRating;
    });

    return {
      striker: batsmen[0]?.id || team.players[0]?.id,
      nonStriker: batsmen[1]?.id || team.players[1]?.id
    };
  }

  /**
   * Select opening bowler for team
   * @param {Object} team - Team object
   * @returns {string} Bowler ID
   */
  selectOpeningBowler(team) {
    const bowlers = team.players.filter(p =>
      p.role === 'bowler' || p.role === 'all-rounder'
    );

    if (bowlers.length === 0) {
      return team.players[0]?.id;
    }

    // Sort by bowling rating
    bowlers.sort((a, b) => {
      const aRating = this.getBowlingRating(a);
      const bRating = this.getBowlingRating(b);
      return bRating - aRating;
    });

    return bowlers[0].id;
  }

  /**
   * Get batting rating for a player
   * @param {Object} player - Player object
   * @returns {number} Batting rating
   */
  getBattingRating(player) {
    const batting = player.attributes.batting;
    return Object.values(batting).reduce((sum, val) => sum + val, 0) / Object.keys(batting).length;
  }

  /**
   * Get bowling rating for a player
   * @param {Object} player - Player object
   * @returns {number} Bowling rating
   */
  getBowlingRating(player) {
    const bowling = player.attributes.bowling;
    return Object.values(bowling).reduce((sum, val) => sum + val, 0) / Object.keys(bowling).length;
  }

  /**
   * Get wicket keeper from team
   * @param {Object} team - Team object
   * @returns {Object} Wicket keeper player
   */
  getWicketKeeper(team) {
    return team.players.find(p => p.role === 'wicket-keeper') || team.players[0];
  }

  /**
   * Create match configuration
   * @param {Object} teamA - Team A
   * @param {Object} teamB - Team B
   * @returns {Object} Match configuration
   */
  createMatchConfig(teamA, teamB) {
    // Randomly determine toss
    const tossWinner = Math.random() < 0.5 ? teamA.id : teamB.id;
    const tossDecision = Math.random() < 0.6 ? 'bat' : 'bowl'; // 60% bat first

    return {
      homeTeam: this.getMatchEngineTeam(teamA),
      awayTeam: this.getMatchEngineTeam(teamB),
      venue: 'Wankhede Stadium',
      tossWinner,
      tossDecision,
      weather: 'sunny',
      pitch: 'flat'
    };
  }

  /**
   * Get player by ID
   * @param {string} playerId - Player ID
   * @returns {Object} Player object
   */
  getPlayerById(playerId) {
    return this.players.find(p => p.id === playerId);
  }
}

export default TeamSelector;