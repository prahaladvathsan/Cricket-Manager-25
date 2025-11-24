/**
 * @file PreMatchSetup.js
 * @description Handles pre-match setup: team selection, batting order, tactics
 * Prepares match configuration for SimpleBallSimulator
 */

import TeamSelectionManager from '../match-engine/interactive/TeamSelectionManager.js';
import AIMatchController from '../match-engine/interactive/AIMatchController.js';

class PreMatchSetup {
  constructor(teamStore = null) {
    this.teamSelector = new TeamSelectionManager();
    this.teamStore = teamStore; // Optional: for accessing team tactics
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
   * Checks team tactics first, falls back to auto-selection
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

    let playing11;
    let optimizedOrder;

    // Check if team has tactics with squadSelection (user-configured playing XI)
    if (this.teamStore) {
      const tactics = this.teamStore.getState().getTeamTactics(club.id);
      if (tactics?.squadSelection && tactics.squadSelection.length === 11) {
        // Use tactics squadSelection (user or AI-configured)
        const squadIds = tactics.squadSelection;

        // Get player objects in squad order
        playing11 = squadIds
          .map(id => fullSquad.find(p => p.id === id))
          .filter(Boolean);

        // Verify we got all 11 players
        if (playing11.length === 11) {
          // Use batting order from tactics if available
          if (tactics.battingOrder && tactics.battingOrder.length === 11) {
            const battingOrderIds = tactics.battingOrder;
            optimizedOrder = battingOrderIds
              .map(id => playing11.find(p => p.id === id))
              .filter(Boolean);

            // If batting order is complete, use it; otherwise optimize below
            if (optimizedOrder.length !== 11) {
              optimizedOrder = this.teamSelector.optimizeBattingOrder(playing11);
            }
          } else {
            // Optimize batting order
            optimizedOrder = this.teamSelector.optimizeBattingOrder(playing11);
          }
        } else {
          // Tactics squadSelection is invalid, fall back to auto-selection
          console.warn(`${club.name} tactics squadSelection is invalid (${playing11.length}/11 valid players), using auto-selection`);
          playing11 = null; // Trigger fallback
        }
      }
    }

    // Fallback: Auto-select if no tactics or invalid tactics
    if (!playing11) {
      // Select best 11 using TeamSelectionManager
      playing11 = this.teamSelector.selectBalancedTeam(fullSquad, 11);

      if (!playing11 || playing11.length !== 11) {
        throw new Error(`Failed to select 11 players for ${club.name}. Selected: ${playing11?.length || 0}`);
      }

      // Optimize batting order
      optimizedOrder = this.teamSelector.optimizeBattingOrder(playing11);
    }

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
        fieldFormation: 'neutral_orthodox'
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
