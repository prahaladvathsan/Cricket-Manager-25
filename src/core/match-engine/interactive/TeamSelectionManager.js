/**
 * @file TeamSelectionManager.js
 * @description Handles team selection logic (squad generation, composition validation)
 * NOTE: Playing XI selection and batting order optimization moved to AITacticsManager.js
 */

class TeamSelectionManager {
  /**
   * Select a balanced squad from available players (25-player squad)
   * @param {Array} availablePlayers - Pool of available players
   * @param {number} squadSize - Size of squad to select (default 25)
   * @returns {Array} Selected squad
   */
  selectBalancedSquad(availablePlayers, squadSize = 25) {
    const bowlers = availablePlayers.filter(p => p.role === 'bowler');
    const allRounders = availablePlayers.filter(p => p.role === 'all-rounder');
    const batsmen = availablePlayers.filter(p => p.role === 'batsman');
    const keepers = availablePlayers.filter(p => p.role === 'wicket-keeper');

    const squad = [];

    // Aim for balanced squad: ~2 keepers, 6-8 bowlers, 5-7 all-rounders, 10-12 batsmen
    const keepersNeeded = Math.min(2, keepers.length);
    const bowlersNeeded = Math.min(8, bowlers.length);
    const allRoundersNeeded = Math.min(7, allRounders.length);

    // Add keepers
    for (let i = 0; i < keepersNeeded && squad.length < squadSize; i++) {
      squad.push(keepers[i]);
    }

    // Add all-rounders
    for (let i = 0; i < allRoundersNeeded && squad.length < squadSize; i++) {
      squad.push(allRounders[i]);
    }

    // Add bowlers
    for (let i = 0; i < bowlersNeeded && squad.length < squadSize; i++) {
      squad.push(bowlers[i]);
    }

    // Fill remaining slots with batsmen and others
    const remaining = availablePlayers.filter(p => !squad.includes(p));

    while (squad.length < squadSize && remaining.length > 0) {
      squad.push(remaining.shift());
    }

    return squad;
  }

  // NOTE: selectBalancedTeam and optimizeBattingOrder have been moved to AITacticsManager.js

  /**
   * Validate squad composition
   * @param {Array} squad - Squad to validate
   * @returns {Object} Validation result with { valid: boolean, issues: string[] }
   */
  validateSquadComposition(squad) {
    const issues = [];

    const byRole = {
      batsman: squad.filter(p => p.role === 'batsman').length,
      bowler: squad.filter(p => p.role === 'bowler').length,
      'all-rounder': squad.filter(p => p.role === 'all-rounder').length,
      'wicket-keeper': squad.filter(p => p.role === 'wicket-keeper').length
    };

    // Minimum requirements for a valid playing 11
    if (byRole['wicket-keeper'] === 0) {
      issues.push('No wicket-keeper selected');
    }

    const bowlingOptions = byRole.bowler + byRole['all-rounder'];
    if (bowlingOptions < 5) {
      issues.push(`Only ${bowlingOptions} bowling options (need at least 5)`);
    }

    if (squad.length !== 11) {
      issues.push(`Squad has ${squad.length} players (need exactly 11)`);
    }

    return {
      valid: issues.length === 0,
      issues,
      composition: byRole
    };
  }

  /**
   * Get squad composition summary
   * @param {Array} squad - Squad to analyze
   * @returns {Object} Composition breakdown
   */
  getSquadComposition(squad) {
    return {
      batsmen: squad.filter(p => p.role === 'batsman').length,
      bowlers: squad.filter(p => p.role === 'bowler').length,
      allRounders: squad.filter(p => p.role === 'all-rounder').length,
      keepers: squad.filter(p => p.role === 'wicket-keeper').length,
      bowlingOptions: squad.filter(p => ['bowler', 'all-rounder'].includes(p.role)).length
    };
  }

  // NOTE: optimizeBattingOrder and selectNextBowler have been moved to AITacticsManager.js
  // MatchEngine.js has its own selectNextBowler for in-match use
}

export default TeamSelectionManager;
