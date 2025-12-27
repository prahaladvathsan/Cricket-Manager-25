/**
 * @file PreMatchSetup.js
 * @description Handles pre-match setup: team selection, batting order, tactics
 * Prepares match configuration for SimpleBallSimulator
 */

import AIMatchController from '../match-engine/interactive/AIMatchController.js';
import aiTacticsManager from '../ai/AITacticsManager.js';

class PreMatchSetup {
  constructor(teamStore = null) {
    this.teamStore = teamStore; // Optional: for accessing team tactics
  }

  /**
   * Check if a team is controlled by AI (not the user)
   * @param {string} teamId - Team ID to check
   * @returns {boolean} True if AI team
   */
  isAITeam(teamId) {
    if (!this.teamStore) return true; // No store = assume AI
    const userTeamId = this.teamStore.getState().userTeamId;
    return teamId !== userTeamId;
  }

  /**
   * Generate AI tactics for a team before match
   * - AI teams: Always regenerate full tactics
   * - User team: Only regenerate if current tactics fail validation
   * @param {Object} club - Club with full squad
   * @param {Object} playerStore - Player store
   */
  generateAITactics(club, playerStore) {
    // Get full squad with player objects
    const squadIds = this.teamStore?.getState().squadLists?.[club.id] || [];
    const squad = squadIds
      .map(id => playerStore?.getState().getPlayer(id) || club.squad?.find(p => p.id === id))
      .filter(Boolean);

    if (squad.length < 11) {
      console.warn(`[PreMatchSetup] ${club.name} has insufficient squad (${squad.length}/11)`);
      return;
    }

    // AI teams: Always regenerate full tactics
    if (this.isAITeam(club.id)) {
      aiTacticsManager.generateTactics(club.id, squad, this.teamStore);
      return;
    }

    // User team: Only regenerate if current tactics are invalid
    const tactics = this.teamStore?.getState().getTeamTactics(club.id);

    if (!tactics) {
      // No tactics at all - generate fresh
      console.log(`[PreMatchSetup] User team ${club.name} has no tactics - generating fresh`);
      aiTacticsManager.generateTactics(club.id, squad, this.teamStore);
      return;
    }

    // Validate user team tactics
    const validationResult = this.validateUserTeamTactics(tactics, squadIds);

    if (!validationResult.valid) {
      console.log(`[PreMatchSetup] User team ${club.name} tactics invalid: ${validationResult.reason} - regenerating`);
      aiTacticsManager.generateTactics(club.id, squad, this.teamStore);
    }
  }

  /**
   * Validate user team tactics to check if regeneration is needed
   * Note: bowlingRotation is just a priority list of bowlers (5-8 entries), NOT per-over assignments
   * Only overAssignments contains the actual per-over bowler mapping
   * @param {Object} tactics - Team tactics object
   * @param {string[]} squadIds - Full squad IDs
   * @returns {{valid: boolean, reason: string}}
   */
  validateUserTeamTactics(tactics, squadIds) {
    // Check 1: Valid squadSelection (11 players, all in squad)
    if (!tactics.squadSelection || tactics.squadSelection.length !== 11) {
      return { valid: false, reason: `squadSelection has ${tactics.squadSelection?.length || 0} players (need 11)` };
    }

    const invalidSquadPlayers = tactics.squadSelection.filter(id => !squadIds.includes(id));
    if (invalidSquadPlayers.length > 0) {
      return { valid: false, reason: `${invalidSquadPlayers.length} player(s) in squadSelection not in squad` };
    }

    const playingXI = tactics.squadSelection;

    // Check 2: Valid overAssignments (20 overs, all in playing XI)
    if (!tactics.overAssignments || Object.keys(tactics.overAssignments).length < 20) {
      return { valid: false, reason: `overAssignments has ${Object.keys(tactics.overAssignments || {}).length} overs (need 20)` };
    }

    const invalidOverBowlers = Object.values(tactics.overAssignments)
      .filter(id => id && !playingXI.includes(id));
    if (invalidOverBowlers.length > 0) {
      return { valid: false, reason: `${invalidOverBowlers.length} bowler(s) in overAssignments not in playing XI` };
    }

    return { valid: true, reason: '' };
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
    // Generate AI tactics for each team BEFORE selecting playing XI
    // This ensures AI teams have fresh tactics for each match
    this.generateAITactics(homeClub, playerStore);
    this.generateAITactics(awayClub, playerStore);

    // Select playing XI for both teams (will use tactics from store)
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

            // If batting order is incomplete, use squadSelection order
            if (optimizedOrder.length !== 11) {
              optimizedOrder = playing11;
            }
          } else {
            // No batting order in tactics, use squadSelection order
            optimizedOrder = playing11;
          }
        } else {
          // Tactics squadSelection is invalid, fall back to auto-selection
          console.warn(`${club.name} tactics squadSelection is invalid (${playing11.length}/11 valid players), using auto-selection`);
          playing11 = null; // Trigger fallback
        }
      }
    }

    // Fallback: Generate tactics using AITacticsManager if no tactics exist
    if (!playing11) {
      console.log(`[PreMatchSetup] No valid tactics for ${club.name}, generating via AITacticsManager`);

      // Generate tactics
      aiTacticsManager.generateTactics(club.id, fullSquad, this.teamStore);

      // Read the generated tactics
      const newTactics = this.teamStore?.getState().getTeamTactics(club.id);
      if (newTactics?.squadSelection && newTactics.squadSelection.length === 11) {
        playing11 = newTactics.squadSelection
          .map(id => fullSquad.find(p => p.id === id))
          .filter(Boolean);

        optimizedOrder = newTactics.battingOrder
          .map(id => playing11.find(p => p.id === id))
          .filter(Boolean);
      }

      // Final fallback if AITacticsManager failed
      if (!playing11 || playing11.length !== 11) {
        console.warn(`[PreMatchSetup] AITacticsManager fallback failed, using first 11 players`);
        playing11 = fullSquad.slice(0, 11);
        optimizedOrder = playing11;
      }
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
