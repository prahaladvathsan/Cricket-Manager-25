/**
 * @file TacticsLoader.js
 * @description Utility to load team tactics into match engine
 */

/**
 * Load team tactics from teamStore and apply to matchStore
 * @param {string} teamId - Team ID to load tactics for
 * @param {Function} getTeamTactics - teamStore.getTeamTactics function
 * @param {Function} getTacticsForMatch - teamStore.getTacticsForMatch function
 * @param {Object} players - Player store players object
 * @returns {Object} Tactics formatted for match initialization
 */
export function loadTeamTactics(teamId, getTeamTactics, getTacticsForMatch, players) {
  // Get tactics from team store
  const tactics = getTacticsForMatch(teamId);

  if (!tactics) {
    console.warn(`No tactics found for team ${teamId}, using defaults`);
    return null;
  }

  return {
    squadSelection: tactics.squadSelection,
    playstyleOverrides: tactics.playstyleOverrides,
    battingOrder: tactics.battingOrder,
    accelerationTiers: tactics.accelerationTiers,
    bowlingPlans: tactics.bowlingPlans,
    bowlingRotation: tactics.bowlingRotation,
    fieldFormation: tactics.fieldFormation
  };
}

/**
 * Apply team tactics to matchStore tacticsState
 * @param {Object} matchStore - Match store instance
 * @param {string} teamId - Team ID
 * @param {Object} teamTactics - Team tactics object from teamStore
 * @param {Object} players - Player store players object
 */
export function applyTacticsToMatch(matchStore, teamId, teamTactics, players) {
  if (!teamTactics) return;

  const state = matchStore.getState();

  // Set acceleration tiers for batsmen
  const currentAcceleration = {};
  if (state.innings.striker && teamTactics.accelerationTiers[state.innings.striker]) {
    currentAcceleration.striker = teamTactics.accelerationTiers[state.innings.striker];
  }
  if (state.innings.nonStriker && teamTactics.accelerationTiers[state.innings.nonStriker]) {
    currentAcceleration.nonStriker = teamTactics.accelerationTiers[state.innings.nonStriker];
  }

  // Set bowling plans from tactics
  const bowlingPlans = {};
  Object.keys(teamTactics.bowlingPlans || {}).forEach(playerId => {
    bowlingPlans[playerId] = teamTactics.bowlingPlans[playerId];
  });

  // Update matchStore tactics state
  matchStore.setState({
    tacticsState: {
      ...state.tacticsState,
      accelerationMode: 'manual', // User has set tactics
      currentAcceleration: {
        ...state.tacticsState.currentAcceleration,
        ...currentAcceleration
      },
      bowlingPlans: {
        ...state.tacticsState.bowlingPlans,
        ...bowlingPlans
      }
    }
  });
}

/**
 * Apply playstyle overrides to players in match
 * @param {Object} playerStore - Player store instance
 * @param {Object} playstyleOverrides - Map of playerId -> playstyle name
 */
export function applyPlaystyleOverrides(playerStore, playstyleOverrides) {
  if (!playstyleOverrides || Object.keys(playstyleOverrides).length === 0) {
    return;
  }

  Object.entries(playstyleOverrides).forEach(([playerId, playstyle]) => {
    // Store original playstyle if not already stored
    const player = playerStore.getState().players[playerId];
    if (player && !player._originalPrimaryPlaystyle) {
      player._originalPrimaryPlaystyle = { ...player.primaryPlaystyle };
    }

    // Override primary playstyle for match
    playerStore.setState((state) => ({
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          primaryPlaystyle: {
            ...state.players[playerId].primaryPlaystyle,
            batting: playstyle
          }
        }
      }
    }));
  });
}

/**
 * Restore original playstyles after match
 * @param {Object} playerStore - Player store instance
 * @param {string[]} playerIds - Array of player IDs to restore
 */
export function restoreOriginalPlaystyles(playerStore, playerIds) {
  playerIds.forEach(playerId => {
    const player = playerStore.getState().players[playerId];
    if (player && player._originalPrimaryPlaystyle) {
      playerStore.setState((state) => ({
        players: {
          ...state.players,
          [playerId]: {
            ...state.players[playerId],
            primaryPlaystyle: player._originalPrimaryPlaystyle,
            _originalPrimaryPlaystyle: undefined
          }
        }
      }));
    }
  });
}

/**
 * Get batting order from tactics
 * @param {string} teamId - Team ID
 * @param {Function} getTeamTactics - teamStore.getTeamTactics function
 * @returns {string[]} Array of player IDs in batting order
 */
export function getBattingOrder(teamId, getTeamTactics) {
  const tactics = getTeamTactics(teamId);
  if (!tactics || !tactics.battingOrder) {
    return [];
  }
  return tactics.battingOrder;
}

/**
 * Get bowling rotation from tactics
 * @param {string} teamId - Team ID
 * @param {Function} getTeamTactics - teamStore.getTeamTactics function
 * @returns {string[]} Array of bowler IDs in rotation order
 */
export function getBowlingRotation(teamId, getTeamTactics) {
  const tactics = getTeamTactics(teamId);
  if (!tactics || !tactics.bowlingRotation) {
    return [];
  }
  return tactics.bowlingRotation;
}

/**
 * Get field formation from tactics
 * @param {string} teamId - Team ID
 * @param {Function} getTeamTactics - teamStore.getTeamTactics function
 * @returns {string} Field formation ('attacking', 'neutral', or 'defensive')
 */
export function getFieldFormation(teamId, getTeamTactics) {
  const tactics = getTeamTactics(teamId);
  if (!tactics || !tactics.fieldFormation) {
    return 'neutral';
  }
  return tactics.fieldFormation;
}

/**
 * Initialize match with team tactics
 * @param {Object} matchConfig - Match configuration
 * @param {Function} useTeamStore - Team store hook
 * @param {Function} useMatchStore - Match store hook
 * @param {Function} usePlayerStore - Player store hook
 * @returns {Object} Enhanced match configuration with tactics
 */
export function initializeMatchWithTactics(matchConfig, useTeamStore, useMatchStore, usePlayerStore) {
  const { homeTeam, awayTeam, userTeamId } = matchConfig;

  const teamStore = useTeamStore.getState();
  const playerStore = usePlayerStore.getState();

  // Load tactics for both teams (prioritize user team)
  const homeTeamTactics = loadTeamTactics(
    homeTeam.id,
    teamStore.getTeamTactics,
    teamStore.getTacticsForMatch,
    playerStore.players
  );

  const awayTeamTactics = loadTeamTactics(
    awayTeam.id,
    teamStore.getTeamTactics,
    teamStore.getTacticsForMatch,
    playerStore.players
  );

  // Enhance match config with tactics
  const enhancedConfig = {
    ...matchConfig,
    homeTeam: {
      ...homeTeam,
      playingXI: homeTeamTactics?.squadSelection || homeTeam.playingXI,
      battingOrder: homeTeamTactics?.battingOrder || homeTeam.playingXI,
      bowlingRotation: homeTeamTactics?.bowlingRotation || [],
      fieldFormation: homeTeamTactics?.fieldFormation || 'neutral'
    },
    awayTeam: {
      ...awayTeam,
      playingXI: awayTeamTactics?.squadSelection || awayTeam.playingXI,
      battingOrder: awayTeamTactics?.battingOrder || awayTeam.playingXI,
      bowlingRotation: awayTeamTactics?.bowlingRotation || [],
      fieldFormation: awayTeamTactics?.fieldFormation || 'neutral'
    },
    userTeamTactics: userTeamId === homeTeam.id ? homeTeamTactics : awayTeamTactics
  };

  // Apply playstyle overrides if user team
  if (userTeamId === homeTeam.id && homeTeamTactics?.playstyleOverrides) {
    applyPlaystyleOverrides(usePlayerStore, homeTeamTactics.playstyleOverrides);
  } else if (userTeamId === awayTeam.id && awayTeamTactics?.playstyleOverrides) {
    applyPlaystyleOverrides(usePlayerStore, awayTeamTactics.playstyleOverrides);
  }

  return enhancedConfig;
}

export default {
  loadTeamTactics,
  applyTacticsToMatch,
  applyPlaystyleOverrides,
  restoreOriginalPlaystyles,
  getBattingOrder,
  getBowlingRotation,
  getFieldFormation,
  initializeMatchWithTactics
};
