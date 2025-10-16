/**
 * @file PreMatchSetup.js
 * @description Handles pre-match setup: team selection, batting order, tactics
 * Prepares match configuration for SimpleBallSimulator
 */

import TeamSelectionManager from '../match-engine/interactive/TeamSelectionManager.js';
import AIMatchController from '../match-engine/interactive/AIMatchController.js';

class PreMatchSetup {
  constructor() {
    this.teamSelector = new TeamSelectionManager();
  }

  /**
   * Prepare match configuration from two clubs
   * @param {Object} homeClub - Home club with 25-player squad
   * @param {Object} awayClub - Away club with 25-player squad
   * @param {string} venue - Match venue
   * @param {Object} playerStore - Player store for accessing player data
   * @returns {Object} Complete match configuration for MatchEngine
   */
  prepareMatch(homeClub, awayClub, venue, playerStore) {
    // Silently prepare match - no console logs for league simulation

    // Select playing XI for both teams
    const homeTeam = this.selectPlayingXI(homeClub, playerStore);
    const awayTeam = this.selectPlayingXI(awayClub, playerStore);

    // Conduct toss
    const tossResult = this.conductToss(homeTeam, awayTeam);

    // Determine batting and bowling teams
    const battingTeam = tossResult.tossDecision === 'bat' ? tossResult.tossWinner : tossResult.tossLoser;
    const bowlingTeam = tossResult.tossDecision === 'bat' ? tossResult.tossLoser : tossResult.tossWinner;

    // Create match configuration
    const matchConfig = {
      matchId: `${homeClub.id}_vs_${awayClub.id}_${Date.now()}`,
      homeTeam,
      awayTeam,
      venue,
      tossWinner: tossResult.tossWinner.id,
      tossDecision: tossResult.tossDecision,
      battingTeam,
      bowlingTeam,
      battingParScore: 160 // Default T20 par score
    };

    console.log(`Toss: ${tossResult.tossWinner.name} won and chose to ${tossResult.tossDecision === 'bat' ? 'bat' : 'bowl'} first`);

    return matchConfig;
  }

  /**
   * Select playing XI from 25-player squad
   * @param {Object} club - Club with full squad
   * @param {Object} playerStore - Player store
   * @returns {Object} Team object with playing XI
   */
  selectPlayingXI(club, playerStore) {
    // Club.squad already contains player objects from SquadDistributor
    const fullSquad = club.squad;

    if (!fullSquad || fullSquad.length === 0) {
      throw new Error(`${club.name} has no players in squad`);
    }

    // Select best 11 using TeamSelectionManager
    const playing11 = this.teamSelector.selectBalancedTeam(fullSquad, 11);

    if (!playing11 || playing11.length !== 11) {
      throw new Error(`Failed to select 11 players for ${club.name}. Selected: ${playing11?.length || 0}`);
    }

    // Optimize batting order
    const optimizedOrder = this.teamSelector.optimizeBattingOrder(playing11);

    // Create team object with squad IDs
    const team = {
      id: club.id,
      name: club.name,
      squad: optimizedOrder.map(p => p.id), // Playing XI IDs in batting order
      players: optimizedOrder, // Full player objects in batting order
      playingXI: optimizedOrder.map(p => p.id) // Alias for compatibility
    };

    // Playing XI selected silently

    return team;
  }

  /**
   * Conduct toss to determine batting/bowling order
   * @param {Object} homeTeam - Home team
   * @param {Object} awayTeam - Away team
   * @returns {Object} Toss result
   */
  conductToss(homeTeam, awayTeam) {
    // Random toss winner (50/50)
    const tossWinner = Math.random() < 0.5 ? homeTeam : awayTeam;
    const tossLoser = tossWinner === homeTeam ? awayTeam : homeTeam;

    // AI decision: bat first ~70% of the time
    const tossDecision = Math.random() < 0.7 ? 'bat' : 'bowl';

    return {
      tossWinner,
      tossLoser,
      tossDecision
    };
  }

  /**
   * Set default tactical configuration for both teams
   * @param {Object} matchConfig - Match configuration
   * @returns {Object} Match config with tactics
   */
  setDefaultTactics(matchConfig) {
    // Default tactics are set by MatchEngine's initializeTacticalState()
    // This method is a placeholder for future tactical customization

    return {
      ...matchConfig,
      tactics: {
        battingParScore: 160,
        accelerationMode: 'auto',
        fieldFormation: 'neutral'
      }
    };
  }

  /**
   * Validate match configuration
   * @param {Object} matchConfig - Match configuration
   * @returns {Object} Validation result
   */
  validateMatchConfig(matchConfig) {
    const issues = [];

    if (!matchConfig.homeTeam || !matchConfig.awayTeam) {
      issues.push('Missing team data');
    }

    if (!matchConfig.homeTeam.squad || matchConfig.homeTeam.squad.length !== 11) {
      issues.push(`Home team has ${matchConfig.homeTeam.squad?.length || 0} players (need 11)`);
    }

    if (!matchConfig.awayTeam.squad || matchConfig.awayTeam.squad.length !== 11) {
      issues.push(`Away team has ${matchConfig.awayTeam.squad?.length || 0} players (need 11)`);
    }

    if (!matchConfig.venue) {
      issues.push('Missing venue information');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default PreMatchSetup;
