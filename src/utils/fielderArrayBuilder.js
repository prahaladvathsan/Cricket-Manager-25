/**
 * @file fielderArrayBuilder.js
 * @description Centralized utility for constructing consistent fielder arrays
 * Used by both match engine and UI to ensure fielding positions are synchronized
 * @module utils/fielderArrayBuilder
 */

/**
 * Build standardized fielder array for match engine and UI
 * CRITICAL: This ensures match engine physics and UI rendering use identical fielder ordering
 *
 * Array Structure (11 fielders):
 * - Position 0: Current bowler (MUST be dynamically updated each ball)
 * - Position 1: Wicketkeeper (fixed for innings)
 * - Positions 2-10: Remaining 9 fielders (excluding bowler and keeper)
 *
 * @param {Object} params - Parameters for building fielder array
 * @param {Object[]} params.bowlingSquad - Array of player objects (11 players)
 * @param {string} params.currentBowlerId - Current bowler's player ID
 * @param {Object} params.playerStore - Player store to look up player objects
 * @returns {Object[]} Array of 11 fielder objects in standard order
 */
export function buildFielderArray({ bowlingSquad, currentBowlerId, playerStore }) {
  if (!bowlingSquad || bowlingSquad.length === 0) {
    console.warn('[fielderArrayBuilder] No bowling squad provided');
    return [];
  }

  const getPlayer = playerStore.getState ? playerStore.getState().getPlayer : playerStore.getPlayer;

  // Convert squad to player objects if needed
  const squadPlayers = bowlingSquad.map(playerOrId => {
    if (typeof playerOrId === 'string') {
      return getPlayer(playerOrId);
    }
    return playerOrId;
  }).filter(Boolean);

  if (squadPlayers.length < 11) {
    console.warn(`[fielderArrayBuilder] Only ${squadPlayers.length} players in squad, need 11`);
  }

  // Find current bowler
  const currentBowler = getPlayer(currentBowlerId);
  if (!currentBowler) {
    console.error(`[fielderArrayBuilder] Current bowler not found: ${currentBowlerId}`);
    return [];
  }

  // Find wicketkeeper from squad
  const wicketkeeper = squadPlayers.find(player =>
    player && (
      player.role === 'wicket-keeper' ||
      player.role === 'Wicketkeeper' ||
      player.primaryRole === 'wicket-keeper' ||
      player.primaryRole === 'Wicketkeeper'
    )
  );

  if (!wicketkeeper) {
    console.error('[fielderArrayBuilder] No wicketkeeper found in squad');
    return [];
  }

  // Get remaining fielders (exclude bowler and keeper)
  const remainingFielders = squadPlayers.filter(player =>
    player &&
    player.id !== currentBowlerId &&
    player.id !== wicketkeeper.id
  );

  // Build standardized array: [bowler, keeper, ...9 other fielders]
  const fielders = [
    currentBowler,      // Position 0: Current bowler
    wicketkeeper,       // Position 1: Wicketkeeper
    ...remainingFielders.slice(0, 9) // Positions 2-10: Remaining 9 fielders
  ];

  // Validate we have exactly 11 fielders
  if (fielders.length < 11) {
    console.warn(`[fielderArrayBuilder] Only ${fielders.length} fielders, padding with duplicates`);
    // Pad with available players if needed
    while (fielders.length < 11 && squadPlayers.length > 0) {
      fielders.push(squadPlayers[fielders.length % squadPlayers.length]);
    }
  }

  // Debug logging
  const DEBUG = false;
  if (DEBUG) {
    console.log('[fielderArrayBuilder] Built fielder array:', {
      bowler: fielders[0]?.name,
      keeper: fielders[1]?.name,
      otherFielders: fielders.slice(2).map(f => f?.name),
      totalCount: fielders.length
    });
  }

  return fielders;
}

/**
 * Assign fielders to formation positions
 * Maps the standardized fielder array to formation position objects
 *
 * @param {Object[]} fielders - Array of 11 fielders from buildFielderArray()
 * @param {Object[]} formationPositions - Array of position objects with x, y, name, zone
 * @returns {Object[]} Array of positioned fielders with fielder assignments
 */
export function assignFieldersToPositions(fielders, formationPositions) {
  if (!fielders || fielders.length === 0) {
    console.warn('[fielderArrayBuilder] No fielders to assign');
    return [];
  }

  if (!formationPositions || formationPositions.length === 0) {
    console.warn('[fielderArrayBuilder] No formation positions provided');
    return [];
  }

  // Map fielders to positions by index
  return formationPositions.map((pos, index) => ({
    ...pos,
    fielder: fielders[index] || null,
    index
  })).filter(pos => pos.fielder !== null);
}
