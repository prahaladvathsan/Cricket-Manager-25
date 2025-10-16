/**
 * @file SquadDistributor.js
 * @description Distributes players from master database across league clubs
 * Ensures balanced squad composition for each team
 */

class SquadDistributor {
  /**
   * Distribute players across clubs with balanced composition
   * @param {Array} players - All available players from master database
   * @param {Array} clubs - Club definitions
   * @param {number} squadSize - Target squad size per club (default 25)
   * @returns {Object} Clubs with assigned squads
   */
  distributeSquads(players, clubs, squadSize = 25) {
    const totalSquadSize = clubs.length * squadSize;

    if (players.length < totalSquadSize) {
      console.warn(`Warning: Only ${players.length} players available for ${totalSquadSize} squad slots`);
    }

    // Filter out players with very low ratings (< 4.0)
    const eligiblePlayers = players.filter(p => p.rating >= 4.0);

    console.log(`Distributing ${eligiblePlayers.length} eligible players across ${clubs.length} clubs`);

    // Classify players by role
    const playersByRole = this.classifyPlayersByRole(eligiblePlayers);

    // Create balanced pools for snake draft
    const pools = this.createBalancedPools(playersByRole, clubs.length, squadSize);

    // Assign players to clubs using snake draft
    const clubsWithSquads = this.snakeDraftAssignment(clubs, pools, squadSize);

    return clubsWithSquads;
  }

  /**
   * Classify players by role (ensures all players have a role)
   * @param {Array} players - Players to classify
   * @returns {Object} Players grouped by role
   */
  classifyPlayersByRole(players) {
    const classified = {
      bowlers: [],
      batsmen: [],
      allRounders: [],
      keepers: []
    };

    players.forEach(player => {
      // Ensure player has a role (classify if missing)
      if (!player.role) {
        player.role = this.inferRole(player);
      }

      // Assign to appropriate pool
      switch (player.role) {
        case 'bowler':
          classified.bowlers.push(player);
          break;
        case 'batsman':
          classified.batsmen.push(player);
          break;
        case 'all-rounder':
          classified.allRounders.push(player);
          break;
        case 'wicket-keeper':
          classified.keepers.push(player);
          break;
        default:
          // Default to batsman for unknown roles
          classified.batsmen.push(player);
      }
    });

    // Sort each pool by rating (descending)
    Object.values(classified).forEach(pool => {
      pool.sort((a, b) => b.rating - a.rating);
    });

    console.log(`Classified players: ${classified.bowlers.length} bowlers, ${classified.batsmen.length} batsmen, ${classified.allRounders.length} all-rounders, ${classified.keepers.length} keepers`);

    return classified;
  }

  /**
   * Infer player role from attributes (if not set in database)
   * @param {Object} player - Player object
   * @returns {string} Inferred role
   */
  inferRole(player) {
    const battingAttrs = player.attributes.batting;
    const bowlingAttrs = player.attributes.bowling;

    const battingAvg = Object.values(battingAttrs).reduce((a, b) => a + b, 0) / Object.keys(battingAttrs).length;
    const bowlingAvg = Object.values(bowlingAttrs).reduce((a, b) => a + b, 0) / Object.keys(bowlingAttrs).length;

    // All-rounder if good at both
    if (battingAvg >= 10 && bowlingAvg >= 10) {
      return 'all-rounder';
    }
    // Specialist bowler if bowling > batting and bowling >= 8
    else if (bowlingAvg > battingAvg && bowlingAvg >= 8) {
      return 'bowler';
    }
    // Default to batsman
    else {
      return 'batsman';
    }
  }

  /**
   * Create balanced pools for draft
   * @param {Object} playersByRole - Players classified by role
   * @param {number} numClubs - Number of clubs
   * @param {number} squadSize - Squad size per club
   * @returns {Object} Balanced player pools
   */
  createBalancedPools(playersByRole, numClubs, squadSize) {
    const { bowlers, batsmen, allRounders, keepers } = playersByRole;

    // Target composition per squad: ~2 keepers, 8-9 bowlers, 5-6 all-rounders, 8-10 batsmen
    const targetComposition = {
      keepers: Math.min(2, Math.floor(keepers.length / numClubs)),
      allRounders: Math.min(6, Math.floor(allRounders.length / numClubs)),
      bowlers: Math.min(9, Math.floor(bowlers.length / numClubs)),
      batsmen: 0 // Fill remainder
    };

    // Calculate remaining slots for batsmen
    targetComposition.batsmen = squadSize - targetComposition.keepers - targetComposition.allRounders - targetComposition.bowlers;

    console.log(`Target composition per squad: ${targetComposition.keepers} keepers, ${targetComposition.allRounders} all-rounders, ${targetComposition.bowlers} bowlers, ${targetComposition.batsmen} batsmen`);

    return {
      keepers: [...keepers],
      allRounders: [...allRounders],
      bowlers: [...bowlers],
      batsmen: [...batsmen],
      targetComposition
    };
  }

  /**
   * Assign players to clubs using snake draft (ensures fairness)
   * @param {Array} clubs - Club definitions
   * @param {Object} pools - Player pools
   * @param {number} squadSize - Squad size per club
   * @returns {Array} Clubs with assigned squads
   */
  snakeDraftAssignment(clubs, pools, squadSize) {
    const { keepers, allRounders, bowlers, batsmen, targetComposition } = pools;

    // Initialize squads
    const clubsWithSquads = clubs.map(club => ({
      ...club,
      squad: []
    }));

    // Helper function for snake draft (alternates direction)
    const draftRound = (pool, count) => {
      let forward = true;
      for (let i = 0; i < count && pool.length > 0; i++) {
        const clubOrder = forward ? clubsWithSquads : [...clubsWithSquads].reverse();

        clubOrder.forEach(club => {
          if (pool.length > 0 && club.squad.length < squadSize) {
            const player = pool.shift();
            club.squad.push(player);
          }
        });

        forward = !forward; // Alternate direction
      }
    };

    // Draft in rounds to ensure balance
    // Round 1: Keepers
    draftRound(keepers, targetComposition.keepers);

    // Round 2: All-rounders
    draftRound(allRounders, targetComposition.allRounders);

    // Round 3: Bowlers
    draftRound(bowlers, targetComposition.bowlers);

    // Round 4: Batsmen (fill remaining slots)
    const remainingSlots = squadSize - targetComposition.keepers - targetComposition.allRounders - targetComposition.bowlers;
    draftRound(batsmen, remainingSlots);

    // Fill any remaining gaps with available players
    const remainingPlayers = [...keepers, ...allRounders, ...bowlers, ...batsmen];

    clubsWithSquads.forEach(club => {
      while (club.squad.length < squadSize && remainingPlayers.length > 0) {
        club.squad.push(remainingPlayers.shift());
      }
    });

    // Log squad composition for each club
    clubsWithSquads.forEach(club => {
      const composition = this.getSquadComposition(club.squad);
      console.log(`${club.name}: ${club.squad.length} players - ${composition.keepers}K, ${composition.allRounders}AR, ${composition.bowlers}B, ${composition.batsmen}Bat`);
    });

    return clubsWithSquads;
  }

  /**
   * Get squad composition breakdown
   * @param {Array} squad - Squad players
   * @returns {Object} Composition counts
   */
  getSquadComposition(squad) {
    return {
      keepers: squad.filter(p => p.role === 'wicket-keeper').length,
      allRounders: squad.filter(p => p.role === 'all-rounder').length,
      bowlers: squad.filter(p => p.role === 'bowler').length,
      batsmen: squad.filter(p => p.role === 'batsman').length
    };
  }

  /**
   * Validate squad distribution (ensures all squads are valid)
   * @param {Array} clubs - Clubs with squads
   * @returns {Object} Validation result
   */
  validateDistribution(clubs) {
    const issues = [];

    clubs.forEach(club => {
      if (club.squad.length === 0) {
        issues.push(`${club.name} has no players`);
      }

      const composition = this.getSquadComposition(club.squad);
      const bowlingOptions = composition.bowlers + composition.allRounders;

      if (bowlingOptions < 5) {
        issues.push(`${club.name} has only ${bowlingOptions} bowling options (need at least 5)`);
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default SquadDistributor;
