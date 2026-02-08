/**
 * @file playerDatabaseWorker.js
 * @description Web Worker for parsing large player database off main thread
 * Prevents UI blocking during 1.9 MB JSON parse
 *
 * Supports custom database patches - modifications stored as overlays
 * that are applied on top of the master database.
 */

// Import playstyle weightings for recalculation (loaded synchronously)
// let playstyleWeightings = null;

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object (overwrites target)
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = { ...source[key] };
      }
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

/**
 * Get attribute value from player object (handles nested structure)
 */
function getAttributeValue(player, attributeName) {
  if (!player || !player.attributes) return null;

  const attributes = player.attributes;

  if (attributes.batting && attributes.batting[attributeName] !== undefined) {
    return attributes.batting[attributeName];
  }
  if (attributes.bowling && attributes.bowling[attributeName] !== undefined) {
    return attributes.bowling[attributeName];
  }
  if (attributes.physical && attributes.physical[attributeName] !== undefined) {
    return attributes.physical[attributeName];
  }
  if (attributes.mental && attributes.mental[attributeName] !== undefined) {
    return attributes.mental[attributeName];
  }
  if (attributes.fielding && attributes.fielding[attributeName] !== undefined) {
    return attributes.fielding[attributeName];
  }

  return null;
}







/**
 * Calculate overall ratings from attributes
 */
function calculateOverallRatings(attributes) {
  const battingAttrs = attributes.batting || {};
  const battingWeights = {
    technique: 1.5, timing: 1.5, footwork: 1, placement: 1, range360: 0.8,
    defensiveShots: 1, neutralShots: 1, attackingShots: 1.2,
    vsPace: 1, vsSpin: 1, creativity: 0.5
  };

  let battingSum = 0, battingWeightTotal = 0;
  for (const [key, weight] of Object.entries(battingWeights)) {
    if (battingAttrs[key] !== undefined) {
      battingSum += battingAttrs[key] * weight;
      battingWeightTotal += weight;
    }
  }
  const batting_overall = battingWeightTotal > 0 ? Math.round(battingSum / battingWeightTotal) : 10;

  const bowlingAttrs = attributes.bowling || {};
  const bowlingWeights = {
    accuracy: 1.5, bowlingSpeed: 1.2, swing: 1, turn: 1, flight: 0.8,
    variations: 1, intelligence: 1, defensiveBowling: 0.8,
    neutralBowling: 0.8, attackingBowling: 1
  };

  let bowlingSum = 0, bowlingWeightTotal = 0;
  for (const [key, weight] of Object.entries(bowlingWeights)) {
    if (bowlingAttrs[key] !== undefined) {
      bowlingSum += bowlingAttrs[key] * weight;
      bowlingWeightTotal += weight;
    }
  }
  const bowling_overall = bowlingWeightTotal > 0 ? Math.round(bowlingSum / bowlingWeightTotal) : 10;

  return { batting_overall, bowling_overall };
}

/**
 * Apply patches to master database players
 */
function applyPatches(masterPlayers, patches, newPlayers, deletedPlayers) {
  const merged = {};

  // First, copy master players
  for (const player of masterPlayers) {
    merged[player.id] = { ...player };
  }

  // Apply patches to existing players
  if (patches) {
    for (const [playerId, patch] of Object.entries(patches)) {
      if (merged[playerId]) {
        const originalPlayer = merged[playerId];
        const patchedPlayer = deepMerge(originalPlayer, patch);

        // Recalculate if attributes were changed
        if (patch.attributes) {
          patchedPlayer.attributes.overall = calculateOverallRatings(patchedPlayer.attributes);
        }

        patchedPlayer.isModified = true;
        merged[playerId] = patchedPlayer;
      }
    }
  }

  // Add custom players
  if (newPlayers) {
    for (const [playerId, player] of Object.entries(newPlayers)) {
      merged[playerId] = {
        ...player,
        isCustomPlayer: true
      };
    }
  }

  // Remove deleted players
  if (deletedPlayers) {
    for (const playerId of deletedPlayers) {
      delete merged[playerId];
    }
  }

  return Object.values(merged);
}

self.addEventListener('message', async (e) => {
  if (e.data.type === 'LOAD_PLAYERS') {
    try {
      const { patches, newPlayers, deletedPlayers } = e.data;

      // Fetch master database from public directory
      const response = await fetch('/data/master_player_database.json');
      const text = await response.text();

      // Parse JSON off main thread
      const data = JSON.parse(text);

      let players = data.players;

      // If patches are provided, fetch weightings and apply them
      if ((patches && Object.keys(patches).length > 0) ||
          (newPlayers && Object.keys(newPlayers).length > 0) ||
          (deletedPlayers && deletedPlayers.length > 0)) {

        // Apply patches
        players = applyPatches(
          data.players,
          patches || {},
          newPlayers || {},
          deletedPlayers || []
        );

        console.log(`[Worker] Applied patches: ${Object.keys(patches || {}).length} modified, ${Object.keys(newPlayers || {}).length} custom`);
      }

      // Send parsed data back to main thread
      self.postMessage({
        type: 'PLAYERS_LOADED',
        players: players,
        metadata: {
          version: data.version,
          playerCount: players.length,
          generated: data.generated,
          hasPatches: Object.keys(patches || {}).length > 0 || Object.keys(newPlayers || {}).length > 0
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'PLAYERS_ERROR',
        error: error.message
      });
    }
  }
});
