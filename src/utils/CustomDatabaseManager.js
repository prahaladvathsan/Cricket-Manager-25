/**
 * @file CustomDatabaseManager.js
 * @description Manages custom player database patches - stores modifications as overlays
 * on top of the master database rather than replacing it entirely.
 *
 * Key features:
 * - Patches stored in IndexedDB for persistence
 * - Deep merge patches onto master database
 * - Automatic playstyle recalculation when attributes change
 * - Export/import in .cm25db format
 * - Support for user-created custom players
 */

import { get, set } from 'idb-keyval';
import playstyleCalculator from './PlaystyleCalculator.js';

// Storage keys
const CUSTOM_DB_KEY = 'cm25-custom-database';

// Export format constants
const EXPORT_FORMAT = 'cm25-player-database';
const EXPORT_VERSION = '1.0.0';

/**
 * Default structure for custom database storage
 */
const DEFAULT_CUSTOM_DB = {
  version: '1.0.0',
  baseVersion: null,       // Master DB version these patches apply to
  created: null,
  modified: null,
  patches: {},             // playerId -> partial player changes
  newPlayers: {},          // customPlayerId -> full player object
  deletedPlayers: []       // Array of hidden player IDs (future feature)
};

/**
 * Default attributes template for creating new players
 */
const DEFAULT_ATTRIBUTES = {
  batting: {
    technique: 10,
    timing: 10,
    footwork: 10,
    placement: 10,
    range360: 10,
    defensiveShots: 10,
    neutralShots: 10,
    attackingShots: 10,
    vsPace: 10,
    vsSpin: 10,
    creativity: 10
  },
  bowling: {
    accuracy: 10,
    bowlingSpeed: 10,
    swing: 10,
    turn: 10,
    flight: 10,
    variations: 10,
    intelligence: 10,
    defensiveBowling: 10,
    neutralBowling: 10,
    attackingBowling: 10
  },
  physical: {
    strength: 10,
    speed: 10,
    agility: 10,
    maxFitness: 10,
    endurance: 10,
    stamina: 10
  },
  mental: {
    concentration: 10,
    temperament: 10,
    aggression: 10,
    judgement: 10,
    leadership: 10
  },
  fielding: {
    catching: 10,
    reflexes: 10,
    groundFielding: 10,
    throwPower: 10,
    throwAccuracy: 10,
    keeping: 10,
    collecting: 10,
    stumping: 10
  },
  overall: {
    batting_overall: 10,
    bowling_overall: 10
  }
};

class CustomDatabaseManager {
  constructor() {
    this.customDb = null;
    this.initialized = false;
  }

  /**
   * Initialize the manager by loading patches from IndexedDB
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const stored = await get(CUSTOM_DB_KEY);
      if (stored) {
        this.customDb = typeof stored === 'string' ? JSON.parse(stored) : stored;
      } else {
        this.customDb = { ...DEFAULT_CUSTOM_DB };
      }
      this.initialized = true;
      console.log('📁 CustomDatabaseManager initialized', {
        patches: Object.keys(this.customDb.patches || {}).length,
        newPlayers: Object.keys(this.customDb.newPlayers || {}).length
      });
    } catch (error) {
      console.error('Failed to initialize CustomDatabaseManager:', error);
      this.customDb = { ...DEFAULT_CUSTOM_DB };
      this.initialized = true;
    }
  }

  /**
   * Ensure manager is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ============================================
  // Patch Management
  // ============================================

  /**
   * Load patches from IndexedDB
   * @returns {Promise<Object>} Patches object
   */
  async loadPatches() {
    await this.ensureInitialized();
    return {
      patches: this.customDb.patches || {},
      newPlayers: this.customDb.newPlayers || {},
      deletedPlayers: this.customDb.deletedPlayers || []
    };
  }

  /**
   * Save current patches to IndexedDB
   * @returns {Promise<void>}
   */
  async savePatches() {
    await this.ensureInitialized();

    this.customDb.modified = new Date().toISOString();
    if (!this.customDb.created) {
      this.customDb.created = this.customDb.modified;
    }

    try {
      await set(CUSTOM_DB_KEY, JSON.stringify(this.customDb));
      console.log('💾 Custom database patches saved');
    } catch (error) {
      console.error('Failed to save patches:', error);
      throw error;
    }
  }

  /**
   * Apply a patch for a specific player
   * @param {string} playerId - Player ID to patch
   * @param {Object} changes - Partial player object with changes
   * @returns {Promise<void>}
   */
  async applyPlayerPatch(playerId, changes) {
    await this.ensureInitialized();

    // Check if this is a custom player
    if (playerId.startsWith('custom_')) {
      // For custom players, merge changes into newPlayers
      if (this.customDb.newPlayers[playerId]) {
        this.customDb.newPlayers[playerId] = this.deepMerge(
          this.customDb.newPlayers[playerId],
          changes
        );
      }
    } else {
      // For master DB players, store as patch
      if (!this.customDb.patches[playerId]) {
        this.customDb.patches[playerId] = {};
      }
      this.customDb.patches[playerId] = this.deepMerge(
        this.customDb.patches[playerId],
        changes
      );
    }

    await this.savePatches();
  }

  /**
   * Remove patch for a specific player (reset to default)
   * @param {string} playerId - Player ID to reset
   * @returns {Promise<void>}
   */
  async resetPlayer(playerId) {
    await this.ensureInitialized();

    if (playerId.startsWith('custom_')) {
      console.warn('Cannot reset custom player to default. Use deleteCustomPlayer instead.');
      return;
    }

    if (this.customDb.patches[playerId]) {
      delete this.customDb.patches[playerId];
      await this.savePatches();
      console.log(`🔄 Reset player ${playerId} to default`);
    }
  }

  /**
   * Clear all patches and customizations
   * @returns {Promise<void>}
   */
  async resetAllCustomizations() {
    await this.ensureInitialized();

    this.customDb = {
      ...DEFAULT_CUSTOM_DB,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    await this.savePatches();
    console.log('🧹 All customizations reset');
  }

  // ============================================
  // Custom Player Creation
  // ============================================

  /**
   * Create a new custom player
   * @param {Object} playerData - Player data (partial, will fill defaults)
   * @returns {Promise<Object>} Created player object with calculated playstyles
   */
  async createCustomPlayer(playerData) {
    await this.ensureInitialized();

    // Generate unique ID
    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build complete player object with defaults
    const player = {
      id: customId,
      name: playerData.name || 'Custom Player',
      fullName: playerData.fullName || playerData.name || 'Custom Player',
      nationality: playerData.nationality || 'England',
      age: playerData.age || 25,
      role: playerData.role || 'batsman',
      battingHand: playerData.battingHand || 'right',
      bowlingHand: playerData.bowlingHand || 'right',
      bowlingType: playerData.bowlingType || 'pace',
      bowlingStyle: playerData.bowlingStyle || 'Medium',
      bowlingStyleAbbrev: playerData.bowlingStyleAbbrev || 'M',
      primaryBattingPosition: playerData.primaryBattingPosition || 5,
      attributes: this.deepMerge(
        JSON.parse(JSON.stringify(DEFAULT_ATTRIBUTES)),
        playerData.attributes || {}
      ),
      currentTeam: null,
      contract: {
        salary: 0,
        duration: 0,
        retentionStatus: 'available'
      },
      condition: {
        form: 50,
        fitness: 100,
        fatigue: 0,
        morale: 50,
        confidence: 50,
        energy: 100,
        injury: null,
        injuryDuration: null
      },
      isCustomPlayer: true,
      createdAt: new Date().toISOString()
    };

    // Calculate overall ratings
    player.attributes.overall = this.calculateOverallRatings(player.attributes);

    // Calculate playstyles
    const playstyleData = this.recalculatePlaystyles(player);
    player.playstyleRatings = playstyleData.ratings;
    player.topPlaystyles = playstyleData.topPlaystyles;
    player.primaryPlaystyle = playstyleData.primaryPlaystyle;

    // Store in newPlayers
    this.customDb.newPlayers[customId] = player;
    await this.savePatches();

    console.log(`✨ Created custom player: ${player.name} (${customId})`);
    return player;
  }

  /**
   * Delete a custom player
   * @param {string} playerId - Custom player ID to delete
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteCustomPlayer(playerId) {
    await this.ensureInitialized();

    if (!playerId.startsWith('custom_')) {
      console.warn('Can only delete custom players');
      return false;
    }

    if (this.customDb.newPlayers[playerId]) {
      const player = this.customDb.newPlayers[playerId];

      // Check if player is assigned to a team
      if (player.currentTeam) {
        throw new Error('Cannot delete player assigned to a team. Unassign first.');
      }

      delete this.customDb.newPlayers[playerId];
      await this.savePatches();
      console.log(`🗑️ Deleted custom player: ${playerId}`);
      return true;
    }

    return false;
  }

  // ============================================
  // Database Merging
  // ============================================

  /**
   * Apply patches to master database players
   * @param {Object} masterPlayers - Object of playerId -> player from master DB
   * @returns {Object} Merged players object including custom players
   */
  applyPatches(masterPlayers) {
    if (!this.initialized || !this.customDb) {
      return masterPlayers;
    }

    const merged = { ...masterPlayers };

    // Apply patches to existing players
    for (const [playerId, patch] of Object.entries(this.customDb.patches || {})) {
      if (merged[playerId]) {
        const originalPlayer = merged[playerId];
        const patchedPlayer = this.deepMerge(originalPlayer, patch);

        // Recalculate playstyles if attributes were changed
        if (patch.attributes) {
          // Update overall ratings
          patchedPlayer.attributes.overall = this.calculateOverallRatings(patchedPlayer.attributes);

          // Recalculate playstyles
          const playstyleData = this.recalculatePlaystyles(patchedPlayer);
          patchedPlayer.playstyleRatings = playstyleData.ratings;
          patchedPlayer.topPlaystyles = playstyleData.topPlaystyles;
          patchedPlayer.primaryPlaystyle = playstyleData.primaryPlaystyle;
        }

        patchedPlayer.isModified = true;
        merged[playerId] = patchedPlayer;
      }
    }

    // Add custom players
    for (const [playerId, player] of Object.entries(this.customDb.newPlayers || {})) {
      merged[playerId] = {
        ...player,
        isCustomPlayer: true
      };
    }

    // Remove deleted players (future feature)
    for (const playerId of (this.customDb.deletedPlayers || [])) {
      delete merged[playerId];
    }

    return merged;
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object (overwrites target)
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const output = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          output[key] = this.deepMerge(target[key], source[key]);
        } else {
          output[key] = { ...source[key] };
        }
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  // ============================================
  // Playstyle Calculation
  // ============================================

  /**
   * Recalculate playstyle ratings for a player
   * @param {Object} player - Player object with attributes
   * @returns {Object} { ratings, topPlaystyles, primaryPlaystyle }
   */
  recalculatePlaystyles(player) {
    // Calculate all playstyle ratings
    const ratings = playstyleCalculator.calculateAllPlaystyleRatings(player);

    // Get primary playstyles (top 3 in each category)
    const primaryPlaystyles = playstyleCalculator.getPlayerPrimaryPlaystyles(
      player,
      player.role,
      3
    );

    return {
      ratings,
      topPlaystyles: {
        batting: primaryPlaystyles.batting,
        bowling: primaryPlaystyles.bowling,
        fielding: primaryPlaystyles.fielding || []
      },
      primaryPlaystyle: {
        batting: primaryPlaystyles.batting[0]?.name || null,
        bowling: primaryPlaystyles.bowling[0]?.name || null,
        fielding: primaryPlaystyles.fielding?.[0]?.name || null
      }
    };
  }

  /**
   * Calculate overall batting and bowling ratings from attributes
   * @param {Object} attributes - Player attributes object
   * @returns {Object} { batting_overall, bowling_overall }
   */
  calculateOverallRatings(attributes) {
    // Batting overall: weighted average of batting attributes
    const battingAttrs = attributes.batting || {};
    const battingWeights = {
      technique: 1.5,
      timing: 1.5,
      footwork: 1,
      placement: 1,
      range360: 0.8,
      defensiveShots: 1,
      neutralShots: 1,
      attackingShots: 1.2,
      vsPace: 1,
      vsSpin: 1,
      creativity: 0.5
    };

    let battingSum = 0;
    let battingWeightTotal = 0;
    for (const [key, weight] of Object.entries(battingWeights)) {
      if (battingAttrs[key] !== undefined) {
        battingSum += battingAttrs[key] * weight;
        battingWeightTotal += weight;
      }
    }
    const batting_overall = battingWeightTotal > 0
      ? Math.round(battingSum / battingWeightTotal)
      : 10;

    // Bowling overall: weighted average of bowling attributes
    const bowlingAttrs = attributes.bowling || {};
    const bowlingWeights = {
      accuracy: 1.5,
      bowlingSpeed: 1.2,
      swing: 1,
      turn: 1,
      flight: 0.8,
      variations: 1,
      intelligence: 1,
      defensiveBowling: 0.8,
      neutralBowling: 0.8,
      attackingBowling: 1
    };

    let bowlingSum = 0;
    let bowlingWeightTotal = 0;
    for (const [key, weight] of Object.entries(bowlingWeights)) {
      if (bowlingAttrs[key] !== undefined) {
        bowlingSum += bowlingAttrs[key] * weight;
        bowlingWeightTotal += weight;
      }
    }
    const bowling_overall = bowlingWeightTotal > 0
      ? Math.round(bowlingSum / bowlingWeightTotal)
      : 10;

    return { batting_overall, bowling_overall };
  }

  // ============================================
  // Export/Import
  // ============================================

  /**
   * Export database to downloadable file
   * @param {'full' | 'patch'} format - Export format
   * @param {Object} masterPlayers - Master database players (required for 'full' export)
   * @returns {Promise<void>}
   */
  async exportDatabase(format, masterPlayers = {}) {
    await this.ensureInitialized();

    const timestamp = new Date().toISOString();

    let exportData;

    if (format === 'full') {
      // Full export: merge patches and export all players
      const mergedPlayers = this.applyPatches(masterPlayers);

      exportData = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportType: 'full',
        baseVersion: this.customDb.baseVersion,
        exportedAt: timestamp,
        metadata: {
          playerCount: Object.keys(mergedPlayers).length,
          modifiedCount: Object.keys(this.customDb.patches || {}).length,
          customCount: Object.keys(this.customDb.newPlayers || {}).length
        },
        players: Object.values(mergedPlayers)
      };
    } else {
      // Patch export: only customizations
      exportData = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportType: 'patch',
        baseVersion: this.customDb.baseVersion,
        exportedAt: timestamp,
        metadata: {
          modifiedCount: Object.keys(this.customDb.patches || {}).length,
          customCount: Object.keys(this.customDb.newPlayers || {}).length
        },
        patches: this.customDb.patches || {},
        newPlayers: this.customDb.newPlayers || {},
        deletedPlayers: this.customDb.deletedPlayers || []
      };
    }

    // Download the file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = format === 'full'
      ? `cm25_database_full_${Date.now()}.cm25db`
      : `cm25_database_patches_${Date.now()}.cm25db`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`📦 Database exported (${format}): ${filename}`);
  }

  /**
   * Import database from file
   * @param {File} file - File to import
   * @returns {Promise<Object>} Import result with validation info
   */
  async importDatabase(file) {
    await this.ensureInitialized();

    return new Promise((resolve) => {
      if (!file.name.toLowerCase().endsWith('.cm25db') &&
          !file.name.toLowerCase().endsWith('.json')) {
        resolve({
          success: false,
          error: 'Invalid file type. Expected .cm25db or .json file.'
        });
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);

          // Validate format
          const validation = this.validateImport(data);
          if (!validation.valid) {
            resolve({
              success: false,
              error: validation.error,
              warnings: validation.warnings
            });
            return;
          }

          // Apply import based on type
          if (data.exportType === 'patch') {
            // Patch import: merge patches
            for (const [playerId, patch] of Object.entries(data.patches || {})) {
              this.customDb.patches[playerId] = this.deepMerge(
                this.customDb.patches[playerId] || {},
                patch
              );
            }

            // Add new players
            for (const [playerId, player] of Object.entries(data.newPlayers || {})) {
              // Recalculate playstyles for imported players
              const playstyleData = this.recalculatePlaystyles(player);
              this.customDb.newPlayers[playerId] = {
                ...player,
                playstyleRatings: playstyleData.ratings,
                topPlaystyles: playstyleData.topPlaystyles,
                primaryPlaystyle: playstyleData.primaryPlaystyle,
                importedAt: new Date().toISOString()
              };
            }
          } else if (data.exportType === 'full') {
            // Full import: extract patches from differences
            // For now, store all players as patches (simplified approach)
            for (const player of (data.players || [])) {
              if (player.id.startsWith('custom_')) {
                // Custom player
                const playstyleData = this.recalculatePlaystyles(player);
                this.customDb.newPlayers[player.id] = {
                  ...player,
                  playstyleRatings: playstyleData.ratings,
                  topPlaystyles: playstyleData.topPlaystyles,
                  primaryPlaystyle: playstyleData.primaryPlaystyle,
                  importedAt: new Date().toISOString()
                };
              } else if (player.isModified) {
                // Modified player - store full player as patch
                // In practice, you'd want to diff against master DB
                this.customDb.patches[player.id] = {
                  name: player.name,
                  fullName: player.fullName,
                  nationality: player.nationality,
                  age: player.age,
                  role: player.role,
                  battingHand: player.battingHand,
                  bowlingHand: player.bowlingHand,
                  bowlingType: player.bowlingType,
                  primaryBattingPosition: player.primaryBattingPosition,
                  attributes: player.attributes
                };
              }
            }
          }

          await this.savePatches();

          resolve({
            success: true,
            importType: data.exportType,
            imported: {
              patches: Object.keys(data.patches || {}).length,
              newPlayers: Object.keys(data.newPlayers || {}).length,
              players: (data.players || []).length
            },
            warnings: validation.warnings
          });

        } catch (error) {
          console.error('Import error:', error);
          resolve({
            success: false,
            error: 'Failed to parse file: ' + error.message
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to read file'
        });
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate import data
   * @param {Object} data - Parsed import data
   * @returns {Object} { valid: boolean, error?: string, warnings: string[] }
   */
  validateImport(data) {
    const warnings = [];

    // Check format marker
    if (data.format !== EXPORT_FORMAT) {
      return {
        valid: false,
        error: `Invalid format. Expected "${EXPORT_FORMAT}", got "${data.format}"`
      };
    }

    // Check export type
    if (!['full', 'patch'].includes(data.exportType)) {
      return {
        valid: false,
        error: `Invalid export type: ${data.exportType}`
      };
    }

    // Check version compatibility
    if (data.version) {
      const [major] = data.version.split('.').map(Number);
      const [currentMajor] = EXPORT_VERSION.split('.').map(Number);
      if (major > currentMajor) {
        warnings.push(`Import is from a newer version (${data.version}). Some features may not work.`);
      }
    }

    // Validate patch structure
    if (data.exportType === 'patch') {
      if (data.patches && typeof data.patches !== 'object') {
        return { valid: false, error: 'Invalid patches structure' };
      }
      if (data.newPlayers && typeof data.newPlayers !== 'object') {
        return { valid: false, error: 'Invalid newPlayers structure' };
      }
    }

    // Validate full export structure
    if (data.exportType === 'full') {
      if (!Array.isArray(data.players)) {
        return { valid: false, error: 'Invalid players array in full export' };
      }

      // Check for required fields on players
      for (const player of data.players) {
        if (!player.id) {
          warnings.push('Some players missing ID field');
          break;
        }
      }
    }

    return { valid: true, warnings };
  }

  // ============================================
  // Status & Info
  // ============================================

  /**
   * Get customization status summary
   * @returns {Promise<Object>} Status object
   */
  async getCustomizationStatus() {
    await this.ensureInitialized();

    return {
      hasCustomizations:
        Object.keys(this.customDb.patches || {}).length > 0 ||
        Object.keys(this.customDb.newPlayers || {}).length > 0,
      modifiedCount: Object.keys(this.customDb.patches || {}).length,
      customPlayerCount: Object.keys(this.customDb.newPlayers || {}).length,
      deletedCount: (this.customDb.deletedPlayers || []).length,
      baseVersion: this.customDb.baseVersion,
      lastModified: this.customDb.modified,
      modifiedPlayerIds: Object.keys(this.customDb.patches || {}),
      customPlayerIds: Object.keys(this.customDb.newPlayers || {})
    };
  }

  /**
   * Check if a specific player has customizations
   * @param {string} playerId - Player ID to check
   * @returns {Promise<Object>} { isModified, isCustom }
   */
  async isPlayerCustomized(playerId) {
    await this.ensureInitialized();

    return {
      isModified: !!this.customDb.patches?.[playerId],
      isCustom: playerId.startsWith('custom_') || !!this.customDb.newPlayers?.[playerId]
    };
  }

  /**
   * Get the patch for a specific player (if any)
   * @param {string} playerId - Player ID
   * @returns {Promise<Object|null>} Patch object or null
   */
  async getPlayerPatch(playerId) {
    await this.ensureInitialized();

    if (playerId.startsWith('custom_')) {
      return this.customDb.newPlayers?.[playerId] || null;
    }
    return this.customDb.patches?.[playerId] || null;
  }

  /**
   * Set the master database version for tracking
   * @param {string} version - Master DB version
   */
  async setBaseVersion(version) {
    await this.ensureInitialized();
    this.customDb.baseVersion = version;
    await this.savePatches();
  }

  /**
   * Calculate a hash of current patches for save compatibility tracking
   * @returns {Promise<string>} Hash string
   */
  async calculatePatchHash() {
    await this.ensureInitialized();

    const data = {
      patches: this.customDb.patches || {},
      newPlayers: Object.keys(this.customDb.newPlayers || {}),
      deletedPlayers: this.customDb.deletedPlayers || []
    };

    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// Export singleton instance
const customDatabaseManager = new CustomDatabaseManager();
export default customDatabaseManager;

// Also export class for testing
export { CustomDatabaseManager, DEFAULT_ATTRIBUTES };
