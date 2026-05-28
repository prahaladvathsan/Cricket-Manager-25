/**
 * @file SaveGameManager.js
 * @description Multi-slot save game manager with autosave support
 *
 * Features:
 * - Multiple save slots (autosaves + manual saves)
 * - Autosave after user matches and auctions
 * - IndexedDB storage for larger capacity
 * - Export/import to .cm25 files
 */

import { compressData, decompressData, getCompressionStats } from './compression';
import { get, set, del, keys } from 'idb-keyval';
import customDatabaseManager from './CustomDatabaseManager';
import { getTransferManager, resetTransferManager } from '../core/finance/transferManagerSingleton.js';

const SAVE_PREFIX = 'cm25_save_';
const SAVE_INDEX_KEY = 'cm25_save_index';
const SAVE_FORMAT_VERSION = '2.1.0';
const MIN_COMPATIBLE_VERSION = '1.0.0';

// Default autosave settings
const DEFAULT_AUTOSAVE_SETTINGS = {
  enabled: true,
  maxAutosavesAnonymous: 2,  // Limit for non-logged-in users
  maxAutosavesLoggedIn: 10,  // Limit for logged-in users
  saveAfterMatch: true,
  saveAfterAuction: true
};

/**
 * @typedef {Object} SaveSlot
 * @property {string} id - Unique save ID
 * @property {string} type - 'autosave' | 'manual'
 * @property {string} label - Human-readable label
 * @property {string} timestamp - ISO date string
 * @property {Object} metadata - Quick info (team, season, phase, position)
 */

class SaveGameManager {
  constructor() {
    this.autosaveSettings = { ...DEFAULT_AUTOSAVE_SETTINGS };
  }

  // ============================================
  // Save Index Management
  // ============================================

  /**
   * Get list of all saves (metadata only, not full data)
   * @returns {Promise<SaveSlot[]>}
   */
  async listSaves() {
    try {
      const index = await get(SAVE_INDEX_KEY);
      if (!index) return [];

      // Sort by timestamp descending (newest first)
      return index.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error listing saves:', error);
      return [];
    }
  }

  /**
   * Get saves filtered by type
   * @param {'autosave' | 'manual'} type
   * @returns {Promise<SaveSlot[]>}
   */
  async listSavesByType(type) {
    const saves = await this.listSaves();
    return saves.filter(s => s.type === type);
  }

  /**
   * Check if any save exists
   * @returns {Promise<boolean>}
   */
  async hasSave() {
    const saves = await this.listSaves();
    return saves.length > 0;
  }

  /**
   * Get the most recent save info
   * @returns {Promise<SaveSlot|null>}
   */
  async getMostRecentSave() {
    const saves = await this.listSaves();
    return saves.length > 0 ? saves[0] : null;
  }

  // ============================================
  // Save Operations
  // ============================================

  /**
   * Create a new save (autosave or manual)
   * @param {Object} stores - All Zustand stores
   * @param {Object} options - Save options
   * @param {string} options.label - Save label
   * @param {'autosave' | 'manual'} options.type - Save type
   * @returns {Promise<{success: boolean, saveId?: string, error?: string}>}
   */
  async createSave(stores, options = {}) {
    try {
      const { label, type = 'manual' } = options;

      // Validate stores have actual data before saving (prevent empty saves)
      const validation = this._validateStoresNotEmpty(stores);
      if (!validation.valid) {
        console.warn(`⚠️ Save blocked: ${validation.reason}`);
        return { success: false, error: validation.reason };
      }

      // Generate unique save ID
      const saveId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageKey = SAVE_PREFIX + saveId;

      // Build save data
      const saveData = await this._buildSaveData(stores, { label, type, saveId });

      // Store the save
      await set(storageKey, JSON.stringify(saveData));

      // Update index
      await this._addToIndex({
        id: saveId,
        type,
        label: saveData.label,
        timestamp: saveData.timestamp,
        metadata: saveData.metadata
      });

      // Enforce autosave limit
      if (type === 'autosave') {
        await this._enforceAutosaveLimit();
      }

      console.log(`💾 Save created: ${saveData.label} (${type})`);

      // Dispatch custom event for UI indicator
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('autosave', {
          detail: { type, label: saveData.label, saveId }
        }));
      }

      return { success: true, saveId };
    } catch (error) {
      console.error('Error creating save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate that stores have actual game data (not empty/default state)
   * @param {Object} stores - All Zustand stores
   * @returns {{valid: boolean, reason?: string}}
   */
  _validateStoresNotEmpty(stores) {
    const teamState = stores.teamStore.getState();
    const gameState = stores.gameStore.getState();
    const leagueState = stores.leagueStore.getState();

    // Check 1: Must have a user team selected
    if (!teamState.userTeamId) {
      return { valid: false, reason: 'No team selected' };
    }

    // Check 2: Must have teams data
    if (!teamState.teams || Object.keys(teamState.teams).length === 0) {
      return { valid: false, reason: 'Teams data is empty' };
    }

    // Check 3: User team must exist in teams
    const userTeam = teamState.teams[teamState.userTeamId];
    if (!userTeam) {
      return { valid: false, reason: 'User team not found in teams data' };
    }

    // Check 4: Must have squad lists with players (after auction)
    const userSquad = teamState.squadLists?.[teamState.userTeamId];
    if (!userSquad || userSquad.length === 0) {
      return { valid: false, reason: 'User team has no players' };
    }

    // Check 5: Game state must be initialized
    if (!gameState.currentSeason || !gameState.currentPhase) {
      return { valid: false, reason: 'Game state not initialized' };
    }

    return { valid: true };
  }

  /**
   * Create an autosave with a specific label
   * @param {Object} stores - All Zustand stores
   * @param {string} label - Autosave label (e.g., "After Match vs London Lions")
   * @returns {Promise<{success: boolean, saveId?: string}>}
   */
  async createAutosave(stores, label) {
    if (!this.autosaveSettings.enabled) {
      return { success: false, error: 'Autosave disabled' };
    }
    return this.createSave(stores, { label, type: 'autosave' });
  }

  /**
   * Create a manual save with a custom name
   * @param {Object} stores - All Zustand stores
   * @param {string} name - Save name
   * @returns {Promise<{success: boolean, saveId?: string}>}
   */
  async createManualSave(stores, name) {
    return this.createSave(stores, { label: name, type: 'manual' });
  }

  /**
   * Load a save by ID
   * @param {string} saveId - Save ID to load
   * @param {Object} stores - All Zustand stores
   * @returns {Promise<{success: boolean, error?: string, warnings?: string[]}>}
   */
  async loadSave(saveId, stores) {
    try {
      const storageKey = SAVE_PREFIX + saveId;
      const saveStr = await get(storageKey);

      if (!saveStr) {
        return { success: false, error: 'Save not found' };
      }

      let saveData = JSON.parse(saveStr);

      // Migrate if needed
      saveData = this._migrateSaveData(saveData);

      // Check custom database compatibility
      const warnings = [];
      if (saveData.metadata?.customDatabaseHash) {
        try {
          const currentHash = await customDatabaseManager.calculatePatchHash();
          if (currentHash !== saveData.metadata.customDatabaseHash) {
            warnings.push('Custom player database has changed since this save was created. Some player data may differ.');
          }
        } catch (error) {
          console.warn('Could not check custom database compatibility:', error);
        }
      }

      // Restore states
      this._restoreStoreStates(saveData, stores);

      // Re-apply active skin + user custom-clubs overlay so cosmetic data
      // lands on the freshly-restored team objects. Skins are device-local
      // user prefs, not part of the save snapshot.
      try {
        const { applyActiveSkinToStores } = await import('./SkinManager.js');
        await applyActiveSkinToStores();
      } catch (err) {
        console.warn('Could not re-apply active skin after load:', err);
      }

      console.log(`Game loaded: ${saveData.label}`);

      if (warnings.length > 0) {
        console.info('Save load warnings:', warnings);
      }

      return { success: true, warnings };
    } catch (error) {
      console.error('Error loading save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load the most recent save
   * @param {Object} stores - All Zustand stores
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async loadMostRecent(stores) {
    const mostRecent = await this.getMostRecentSave();
    if (!mostRecent) {
      return { success: false, error: 'No saves found' };
    }
    return this.loadSave(mostRecent.id, stores);
  }

  /**
   * Delete a save by ID
   * @param {string} saveId - Save ID to delete
   * @returns {Promise<boolean>}
   */
  async deleteSave(saveId) {
    try {
      const storageKey = SAVE_PREFIX + saveId;
      await del(storageKey);
      await this._removeFromIndex(saveId);
      console.log(`Save deleted: ${saveId}`);
      return true;
    } catch (error) {
      console.error('Error deleting save:', error);
      return false;
    }
  }

  /**
   * Delete all saves
   * @returns {Promise<boolean>}
   */
  async deleteAllSaves() {
    try {
      const allKeys = await keys();
      const saveKeys = allKeys.filter(k =>
        typeof k === 'string' && k.startsWith(SAVE_PREFIX)
      );

      for (const key of saveKeys) {
        await del(key);
      }

      await del(SAVE_INDEX_KEY);
      console.log('All saves deleted');
      return true;
    } catch (error) {
      console.error('Error deleting all saves:', error);
      return false;
    }
  }

  // ============================================
  // Autosave Triggers
  // ============================================

  /**
   * Trigger autosave after a user match
   * @param {Object} stores - All Zustand stores
   * @param {Object} matchInfo - Match info for label
   * @returns {Promise<{success: boolean, saveId?: string}>}
   */
  async autosaveAfterMatch(stores, matchInfo = {}) {
    if (!this.autosaveSettings.enabled || !this.autosaveSettings.saveAfterMatch) {
      return { success: false };
    }

    const { opponentName, result, score } = matchInfo;
    let label = 'After Match';

    if (opponentName) {
      label = result === 'win'
        ? `Won vs ${opponentName}`
        : result === 'loss'
          ? `Lost vs ${opponentName}`
          : `Drew vs ${opponentName}`;
      if (score) {
        label += ` (${score})`;
      }
    }

    return this.createAutosave(stores, label);
  }

  /**
   * Trigger autosave after auction completes
   * @param {Object} stores - All Zustand stores
   * @param {Object} auctionInfo - Auction info for label
   * @returns {Promise<{success: boolean, saveId?: string}>}
   */
  async autosaveAfterAuction(stores, auctionInfo = {}) {
    if (!this.autosaveSettings.enabled || !this.autosaveSettings.saveAfterAuction) {
      return { success: false };
    }

    const { playersAcquired = 0, budgetSpent = 0 } = auctionInfo;
    const label = `After Auction (${playersAcquired} players, $${(budgetSpent / 1000000).toFixed(1)}M spent)`;

    return this.createAutosave(stores, label);
  }

  // ============================================
  // Export/Import
  // ============================================

  /**
   * Export a save to .cm25 file
   * @param {string} saveId - Save ID to export (or null for most recent)
   * @param {string} filename - Optional custom filename
   * @returns {Promise<boolean>}
   */
  async exportSave(saveId = null, filename = null) {
    try {
      let storageKey;

      if (saveId) {
        storageKey = SAVE_PREFIX + saveId;
      } else {
        const mostRecent = await this.getMostRecentSave();
        if (!mostRecent) {
          console.error('No save to export');
          return false;
        }
        storageKey = SAVE_PREFIX + mostRecent.id;
      }

      const saveStr = await get(storageKey);
      if (!saveStr) {
        console.error('Save not found');
        return false;
      }

      const saveData = JSON.parse(saveStr);

      // Add export metadata
      const exportData = {
        ...saveData,
        exportedAt: new Date().toISOString(),
        exportVersion: SAVE_FORMAT_VERSION
      };

      // Log compression stats
      const stats = getCompressionStats(exportData);
      console.log(`Export: ${stats.originalKB}KB -> ${stats.compressedKB}KB (${stats.ratio} savings)`);

      // Compress and download
      const compressed = compressData(exportData);
      const blob = new Blob([compressed], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const safeName = (saveData.label || 'save').replace(/[^a-z0-9]/gi, '_');
      const gameDay = saveData.gameState?.gameDay || 1;
      const defaultFilename = filename || `cm25_${safeName}_Day${gameDay}.cm25`;

      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Exported to ${defaultFilename}`);
      return true;
    } catch (error) {
      console.error('Error exporting save:', error);
      return false;
    }
  }

  /**
   * Import save from .cm25 file
   * @param {File} file
   * @returns {Promise<{success: boolean, error?: string, saveId?: string}>}
   */
  async importSave(file) {
    return new Promise((resolve) => {
      if (!file.name.toLowerCase().endsWith('.cm25')) {
        resolve({ success: false, error: 'Invalid file type. Expected .cm25 file.' });
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          let saveData;
          try {
            saveData = decompressData(e.target.result);
          } catch {
            resolve({ success: false, error: 'Failed to decompress. File may be corrupted.' });
            return;
          }

          if (!this._isVersionCompatible(saveData.version)) {
            resolve({ success: false, error: `Incompatible version: ${saveData.version}` });
            return;
          }

          if (!saveData.gameState || !saveData.teamState) {
            resolve({ success: false, error: 'Invalid save structure.' });
            return;
          }

          // Migrate if needed
          saveData = this._migrateSaveData(saveData);

          // Generate new save ID for import
          const saveId = `manual_${Date.now()}_imported`;
          const storageKey = SAVE_PREFIX + saveId;

          saveData.id = saveId;
          saveData.importedAt = new Date().toISOString();
          saveData.importedFrom = file.name;
          saveData.type = 'manual';
          saveData.label = saveData.label || saveData.saveName || `Imported from ${file.name}`;
          saveData.checksum = this._generateChecksum(saveData);

          // Store the save
          await set(storageKey, JSON.stringify(saveData));

          // Update index
          await this._addToIndex({
            id: saveId,
            type: 'manual',
            label: saveData.label,
            timestamp: saveData.timestamp,
            metadata: saveData.metadata
          });

          console.log(`Imported: ${saveData.label}`);
          resolve({ success: true, saveId, saveName: saveData.label });
        } catch (error) {
          console.error('Import error:', error);
          resolve({ success: false, error: 'Failed to parse save file.' });
        }
      };

      reader.onerror = () => resolve({ success: false, error: 'Failed to read file.' });
      reader.readAsText(file);
    });
  }

  // ============================================
  // Settings
  // ============================================

  /**
   * Get autosave settings
   * @returns {Object}
   */
  getAutosaveSettings() {
    return { ...this.autosaveSettings };
  }

  /**
   * Get the maximum number of autosaves allowed based on auth state
   * Anonymous users: 2 autosaves
   * Logged-in users: 10 autosaves
   * @returns {number}
   */
  getMaxAutosaves() {
    try {
      // Dynamically check auth store to avoid circular dependencies
      const authStore = window.__authStore;
      if (authStore) {
        const state = authStore.getState();
        const isLoggedIn = !state.isAnonymous && !!state.user;
        return isLoggedIn
          ? this.autosaveSettings.maxAutosavesLoggedIn
          : this.autosaveSettings.maxAutosavesAnonymous;
      }
    } catch (error) {
      console.warn('Could not check auth state for autosave limit:', error);
    }

    // Default to anonymous limit if auth check fails
    return this.autosaveSettings.maxAutosavesAnonymous;
  }

  /**
   * Update autosave settings
   * @param {Object} settings
   */
  setAutosaveSettings(settings) {
    this.autosaveSettings = {
      ...this.autosaveSettings,
      ...settings
    };
  }

  /**
   * Get save format version
   * @returns {string}
   */
  getVersion() {
    return SAVE_FORMAT_VERSION;
  }

  // ============================================
  // Cloud Save Operations
  // ============================================

  /**
   * Upload a save to cloud storage (Supabase)
   * @param {string} saveId - Save ID to upload
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async uploadToCloud(saveId) {
    try {
      const { supabase, isSupabaseConfigured, getCurrentUserId } = await import('./supabaseClient.js');

      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Cloud saves not configured' };
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Not logged in' };
      }

      // Get the save data
      const storageKey = SAVE_PREFIX + saveId;
      const saveStr = await get(storageKey);

      if (!saveStr) {
        return { success: false, error: 'Save not found' };
      }

      const saveData = JSON.parse(saveStr);

      // Upload to Supabase
      const { error } = await supabase
        .from('game_saves')
        .upsert({
          id: saveId,
          user_id: userId,
          save_type: saveData.type || 'manual',
          label: saveData.label,
          save_data: saveData,
          metadata: saveData.metadata,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Cloud upload error:', error);
        return { success: false, error: error.message };
      }

      console.log(`☁️ Uploaded to cloud: ${saveData.label}`);
      return { success: true };
    } catch (error) {
      console.error('Cloud upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download all saves from cloud storage
   * @returns {Promise<Array>} Array of cloud save metadata
   */
  async downloadFromCloud() {
    try {
      const { supabase, isSupabaseConfigured, getCurrentUserId } = await import('./supabaseClient.js');

      if (!isSupabaseConfigured()) {
        return [];
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return [];
      }

      const { data, error } = await supabase
        .from('game_saves')
        .select('id, save_type, label, metadata, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Cloud download error:', error);
        return [];
      }

      console.log(`☁️ Found ${data?.length || 0} cloud saves`);
      return data || [];
    } catch (error) {
      console.error('Cloud download error:', error);
      return [];
    }
  }

  /**
   * Download a specific save from cloud and store locally
   * @param {string} cloudSaveId - Cloud save ID to download
   * @returns {Promise<{success: boolean, saveId?: string, error?: string}>}
   */
  async downloadCloudSave(cloudSaveId) {
    try {
      const { supabase, isSupabaseConfigured, getCurrentUserId } = await import('./supabaseClient.js');

      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Cloud saves not configured' };
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Not logged in' };
      }

      // Fetch full save data from cloud
      const { data, error } = await supabase
        .from('game_saves')
        .select('*')
        .eq('id', cloudSaveId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Cloud fetch error:', error);
        return { success: false, error: error.message };
      }

      if (!data || !data.save_data) {
        return { success: false, error: 'Save not found in cloud' };
      }

      // Store locally
      const storageKey = SAVE_PREFIX + cloudSaveId;
      await set(storageKey, JSON.stringify(data.save_data));

      // Update local index
      await this._addToIndex({
        id: cloudSaveId,
        type: data.save_type || 'manual',
        label: data.label,
        timestamp: data.updated_at || data.created_at,
        metadata: data.metadata,
        isCloudSave: true
      });

      console.log(`☁️ Downloaded from cloud: ${data.label}`);
      return { success: true, saveId: cloudSaveId };
    } catch (error) {
      console.error('Cloud download error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all local saves to cloud
   * @returns {Promise<{success: boolean, uploaded: number, errors: number}>}
   */
  async syncToCloud() {
    try {
      const { isSupabaseConfigured, getCurrentUserId } = await import('./supabaseClient.js');

      if (!isSupabaseConfigured()) {
        return { success: false, uploaded: 0, errors: 0, error: 'Cloud saves not configured' };
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, uploaded: 0, errors: 0, error: 'Not logged in' };
      }

      const localSaves = await this.listSaves();
      let uploaded = 0;
      let errors = 0;

      for (const save of localSaves) {
        const result = await this.uploadToCloud(save.id);
        if (result.success) {
          uploaded++;
        } else {
          errors++;
        }
      }

      console.log(`☁️ Sync complete: ${uploaded} uploaded, ${errors} errors`);
      return { success: errors === 0, uploaded, errors };
    } catch (error) {
      console.error('Cloud sync error:', error);
      return { success: false, uploaded: 0, errors: 0, error: error.message };
    }
  }

  /**
   * Delete a save from cloud storage
   * @param {string} saveId - Save ID to delete from cloud
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteFromCloud(saveId) {
    try {
      const { supabase, isSupabaseConfigured, getCurrentUserId } = await import('./supabaseClient.js');

      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Cloud saves not configured' };
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Not logged in' };
      }

      const { error } = await supabase
        .from('game_saves')
        .delete()
        .eq('id', saveId)
        .eq('user_id', userId);

      if (error) {
        console.error('Cloud delete error:', error);
        return { success: false, error: error.message };
      }

      console.log(`☁️ Deleted from cloud: ${saveId}`);
      return { success: true };
    } catch (error) {
      console.error('Cloud delete error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // Legacy Compatibility
  // ============================================

  /**
   * Check for legacy localStorage save and migrate to IndexedDB
   * @returns {Promise<{migrated: boolean, saveId?: string}>}
   */
  async migrateLegacySave() {
    try {
      const legacySaveKey = 'cm25_current_save';
      const legacySaveStr = localStorage.getItem(legacySaveKey);

      if (!legacySaveStr) {
        return { migrated: false };
      }

      const legacySave = JSON.parse(legacySaveStr);

      // Create new save from legacy data
      const saveId = `manual_${Date.now()}_migrated`;
      const storageKey = SAVE_PREFIX + saveId;

      const saveData = {
        ...legacySave,
        id: saveId,
        type: 'manual',
        label: legacySave.saveName || 'Migrated Save',
        migratedFromLegacy: true,
        migratedAt: new Date().toISOString()
      };

      await set(storageKey, JSON.stringify(saveData));

      await this._addToIndex({
        id: saveId,
        type: 'manual',
        label: saveData.label,
        timestamp: saveData.timestamp,
        metadata: saveData.metadata
      });

      // Remove legacy save
      localStorage.removeItem(legacySaveKey);

      console.log('Legacy save migrated to IndexedDB');
      return { migrated: true, saveId };
    } catch (error) {
      console.error('Error migrating legacy save:', error);
      return { migrated: false };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  async _buildSaveData(stores, options = {}) {
    const { label, type = 'manual', saveId } = options;

    const gameState = stores.gameStore.getState();
    const teamState = stores.teamStore.getState();
    const playerState = stores.playerStore.getState();
    const leagueState = stores.leagueStore.getState();
    const financeState = stores.financeStore.getState();
    const matchState = stores.matchStore.getState();
    const auctionState = stores.auctionStore?.getState();
    const inboxState = stores.inboxStore?.getState();
    const transferState = stores.transferStore?.getState();

    // Get user team position from standings
    const position = this._getTeamPosition(leagueState.standings, teamState.userTeamId);

    // Get user team stats from standings
    const userStanding = leagueState.standings?.find(s => s.clubId === teamState.userTeamId);

    // Get custom database hash for compatibility tracking
    let customDatabaseHash = null;
    try {
      customDatabaseHash = await customDatabaseManager.calculatePatchHash();
    } catch (error) {
      console.warn('Could not calculate custom database hash:', error);
    }

    const metadata = {
      // Team info
      userTeamId: teamState.userTeamId,
      userTeamName: teamState.teams[teamState.userTeamId]?.name || 'Unknown',
      userTeamColors: teamState.teams[teamState.userTeamId]?.colors || null,

      // Game progress
      season: gameState.currentSeason,
      phase: gameState.currentPhase,
      matchday: leagueState.currentMatchday || 0,
      gameDay: gameState.gameDay || 1,
      inGameDate: gameState.currentDate, // In-game calendar date

      // League position
      position: position,
      points: userStanding?.points || 0,
      played: userStanding?.played || 0,
      won: userStanding?.won || 0,
      lost: userStanding?.lost || 0,

      // Financial
      budget: financeState.teamFinances instanceof Map
        ? financeState.teamFinances.get(teamState.userTeamId)?.currentBudget || 0
        : 0,

      // Custom database compatibility
      customDatabaseHash: customDatabaseHash,

      // Real-world timestamp (for "9 hours ago" display)
      savedAt: new Date().toISOString()
    };

    const autoLabel = label || this._generateSaveName(gameState, teamState, type);

    const saveData = {
      id: saveId,
      version: SAVE_FORMAT_VERSION,
      type,
      label: autoLabel,
      timestamp: new Date().toISOString(),

      gameState: {
        currentSeason: gameState.currentSeason,
        currentPhase: gameState.currentPhase,
        currentWeek: gameState.currentWeek,
        currentDate: gameState.currentDate,
        gameDay: gameState.gameDay || 1,
        calendarEvents: gameState.calendarEvents || [],
        settings: gameState.settings,
        seasonObjectives: gameState.seasonObjectives || [],
        objectiveTracking: gameState.objectiveTracking || {},
        retentionState: gameState.retentionState || 'not_started',
        userRetentionComplete: gameState.userRetentionComplete || false,
        seasonHistory: gameState.seasonHistory || []
      },

      teamState: {
        teams: teamState.teams,
        userTeamId: teamState.userTeamId,
        squadLists: Object.fromEntries(
          Object.entries(teamState.squadLists || {}).map(([teamId, playerIds]) => [
            teamId,
            Array.isArray(playerIds) ? playerIds : []
          ])
        ),
        teamTactics: teamState.teamTactics || {},
        playerStats: teamState.playerStats,
        teamStats: teamState.teamStats,
        teamRetentions: teamState.teamRetentions || {}
      },

      playerState: {
        careerStats: playerState.careerStats,
        currentSeasonId: playerState.currentSeasonId,
        playerTeamAssignments: Object.entries(playerState.players)
          .filter(([_, player]) => player.currentTeam)
          .reduce((acc, [playerId, player]) => {
            acc[playerId] = player.currentTeam;
            return acc;
          }, {}),
        playerConditions: Object.entries(playerState.players)
          .reduce((acc, [playerId, player]) => {
            if (player.condition) {
              acc[playerId] = player.condition;
            }
            return acc;
          }, {}),
        // Save soldPrice for all players (critical for transfer valuations & salary economics)
        playerSoldPrices: Object.entries(playerState.players)
          .reduce((acc, [playerId, player]) => {
            if (player.soldPrice) {
              acc[playerId] = player.soldPrice;
            }
            return acc;
          }, {})
      },

      leagueState: {
        seasonId: leagueState.seasonId,
        seasonName: leagueState.seasonName,
        currentMatchday: leagueState.currentMatchday,
        currentWeek: leagueState.currentWeek,
        currentFixtureIndex: leagueState.currentFixtureIndex,
        stage: leagueState.stage,
        fixtures: leagueState.fixtures,
        matchWeeks: leagueState.matchWeeks,
        results: leagueState.results,
        standings: leagueState.standings,
        clubs: leagueState.clubs,
        stats: leagueState.stats,
        playoffFixtures: leagueState.playoffFixtures,
        playoffResults: leagueState.playoffResults,
        champion: leagueState.champion
      },

      financeState: {
        seasonId: financeState.seasonId,
        initialized: financeState.initialized,
        teamFinances: financeState.teamFinances instanceof Map
          ? Array.from(financeState.teamFinances.entries())
          : Array.isArray(financeState.teamFinances)
            ? financeState.teamFinances
            : [],
        transactionHistory: financeState.transactionHistory
      },

      matchState: {
        matchId: matchState.matchId,
        status: matchState.status
      },

      auctionState: auctionState ? {
        auctionState: auctionState.auctionState,
        rounds: auctionState.rounds,
        currentRound: auctionState.currentRound,
        currentPlayerIndex: auctionState.currentPlayerIndex,
        soldPlayers: auctionState.soldPlayers,
        userMaxBid: auctionState.userMaxBid,
        userMaxBidPlayerId: auctionState.userMaxBidPlayerId
      } : null,

      inboxState: inboxState ? {
        messages: inboxState.messages || [],
        unreadCount: inboxState.unreadCount || 0
      } : null,

      transferState: (() => {
        if (!transferState) return null;
        // Capture live listings from TransferManager singleton (source of truth)
        // The transferStore.activeListings may be stale if transfer UI is not mounted
        let liveListings = transferState.activeListings || [];
        let liveWindow = transferState.transferWindow || { isOpen: false };
        try {
          const tm = getTransferManager();
          if (tm && tm.transferMarket) {
            const marketListings = tm.transferMarket.getActiveListings();
            if (marketListings.length > 0) {
              liveListings = marketListings;
            }
            // Capture accurate window state from the singleton
            if (tm.transferMarket.windowOpen) {
              liveWindow = {
                isOpen: true,
                type: tm.transferMarket.currentWindow?.type || 'offSeason',
                name: tm.transferMarket.currentWindow?.name || 'Transfer Window',
                startWeek: liveWindow.startWeek,
                endWeek: liveWindow.endWeek,
                daysRemaining: liveWindow.daysRemaining || 0,
                windowOpenGameDay: liveWindow.windowOpenGameDay || null
              };
            }
          }
        } catch (e) {
          // Singleton not available — fall back to store state
        }
        return {
          activeListings: liveListings,
          userListings: transferState.userListings || [],
          userBids: transferState.userBids || [],
          freeAgents: transferState.freeAgents || [],
          completedTransfers: transferState.completedTransfers || [],
          notifications: transferState.notifications || [],
          transferWindow: liveWindow,
          transferWindowSummary: transferState.transferWindowSummary || null,
          showTransferSummary: transferState.showTransferSummary || false
        };
      })(),

      metadata
    };

    saveData.checksum = this._generateChecksum(saveData);

    return saveData;
  }

  async _addToIndex(slot) {
    try {
      const index = await get(SAVE_INDEX_KEY) || [];

      // Remove if already exists (update)
      const filteredIndex = index.filter(s => s.id !== slot.id);
      filteredIndex.push(slot);

      await set(SAVE_INDEX_KEY, filteredIndex);
    } catch (error) {
      console.error('Error updating save index:', error);
    }
  }

  async _removeFromIndex(saveId) {
    try {
      const index = await get(SAVE_INDEX_KEY) || [];
      const filteredIndex = index.filter(s => s.id !== saveId);
      await set(SAVE_INDEX_KEY, filteredIndex);
    } catch (error) {
      console.error('Error removing from save index:', error);
    }
  }

  async _enforceAutosaveLimit() {
    try {
      let autosaves = await this.listSavesByType('autosave');
      const maxSlots = this.getMaxAutosaves();

      // Delete oldest autosaves beyond limit (autosaves are sorted newest first)
      while (autosaves.length > maxSlots) {
        const oldest = autosaves[autosaves.length - 1];
        await this.deleteSave(oldest.id);
        console.log(`Deleted old autosave: ${oldest.label} (limit: ${maxSlots})`);
        autosaves = autosaves.slice(0, -1); // Remove from array
      }
    } catch (error) {
      console.error('Error enforcing autosave limit:', error);
    }
  }

  _restoreStoreStates(saveData, stores) {
    // Game Store
    stores.gameStore.setState({
      currentSeason: saveData.gameState.currentSeason,
      currentPhase: saveData.gameState.currentPhase,
      currentWeek: saveData.gameState.currentWeek,
      currentDate: saveData.gameState.currentDate,
      gameDay: saveData.gameState.gameDay || 1,
      calendarEvents: saveData.gameState.calendarEvents || [],
      settings: saveData.gameState.settings,
      seasonObjectives: saveData.gameState.seasonObjectives || [],
      objectiveTracking: saveData.gameState.objectiveTracking || {},
      retentionState: saveData.gameState.retentionState || 'not_started',
      userRetentionComplete: saveData.gameState.userRetentionComplete || false,
      seasonHistory: saveData.gameState.seasonHistory || [],
      isSimulating: false
    });

    // Team Store — dedupe squadLists in case the save was written before
    // addPlayerToSquad became idempotent (older saves can have duplicates).
    const rawSquadLists = saveData.teamState.squadLists || {};
    const dedupedSquadLists = {};
    let dupesRemoved = 0;
    for (const [teamId, ids] of Object.entries(rawSquadLists)) {
      const unique = [...new Set(ids || [])];
      dupesRemoved += (ids?.length || 0) - unique.length;
      dedupedSquadLists[teamId] = unique;
    }
    if (dupesRemoved > 0) {
      console.log(`🧹 [SaveGameManager] Deduped ${dupesRemoved} duplicate squad entries on load`);
    }
    stores.teamStore.setState({
      teams: saveData.teamState.teams,
      userTeamId: saveData.teamState.userTeamId,
      squadLists: dedupedSquadLists,
      teamTactics: saveData.teamState.teamTactics || {},
      playerStats: saveData.teamState.playerStats,
      teamStats: saveData.teamState.teamStats,
      teamRetentions: saveData.teamState.teamRetentions || {}
    });

    // Player Store
    const playerTeamAssignments = saveData.playerState.playerTeamAssignments || {};
    const playerConditions = saveData.playerState.playerConditions || {};
    const players = stores.playerStore.getState().players;

    const updatedPlayers = { ...players };
    const assignedPlayerIds = new Set();

    Object.entries(playerTeamAssignments).forEach(([playerId, teamId]) => {
      if (updatedPlayers[playerId]) {
        updatedPlayers[playerId] = { ...updatedPlayers[playerId], currentTeam: teamId };
        assignedPlayerIds.add(playerId);
      }
    });

    Object.entries(playerConditions).forEach(([playerId, condition]) => {
      if (updatedPlayers[playerId]) {
        updatedPlayers[playerId] = { ...updatedPlayers[playerId], condition };
      }
    });

    // Restore soldPrice (critical for transfer valuations & salary economics)
    const playerSoldPrices = saveData.playerState.playerSoldPrices || {};
    Object.entries(playerSoldPrices).forEach(([playerId, soldPrice]) => {
      if (updatedPlayers[playerId]) {
        updatedPlayers[playerId] = { ...updatedPlayers[playerId], soldPrice };
      }
    });

    Object.keys(updatedPlayers).forEach(playerId => {
      if (!assignedPlayerIds.has(playerId) && updatedPlayers[playerId].currentTeam) {
        updatedPlayers[playerId] = { ...updatedPlayers[playerId], currentTeam: null };
      }
    });

    const availablePlayers = Object.keys(updatedPlayers).filter(
      playerId => !updatedPlayers[playerId].currentTeam
    );

    stores.playerStore.setState({
      players: updatedPlayers,
      availablePlayers,
      careerStats: saveData.playerState.careerStats || {},
      currentSeasonId: saveData.playerState.currentSeasonId
    });

    // League Store
    stores.leagueStore.setState({
      seasonId: saveData.leagueState.seasonId,
      seasonName: saveData.leagueState.seasonName,
      currentMatchday: saveData.leagueState.currentMatchday,
      currentWeek: saveData.leagueState.currentWeek,
      currentFixtureIndex: saveData.leagueState.currentFixtureIndex,
      stage: saveData.leagueState.stage,
      fixtures: saveData.leagueState.fixtures,
      matchWeeks: saveData.leagueState.matchWeeks,
      results: saveData.leagueState.results,
      standings: saveData.leagueState.standings,
      clubs: saveData.leagueState.clubs,
      stats: saveData.leagueState.stats,
      playoffFixtures: saveData.leagueState.playoffFixtures,
      playoffResults: saveData.leagueState.playoffResults,
      champion: saveData.leagueState.champion
    });

    // Finance Store
    const teamFinancesMap = new Map(saveData.financeState.teamFinances);
    stores.financeStore.setState({
      seasonId: saveData.financeState.seasonId,
      initialized: saveData.financeState.initialized,
      teamFinances: teamFinancesMap,
      transactionHistory: saveData.financeState.transactionHistory,
      lastUpdate: Date.now()
    });
    const financeEngine = stores.financeStore.getState().engine;
    if (financeEngine) {
      financeEngine.teamFinances = teamFinancesMap;
      financeEngine.transactionHistory = saveData.financeState.transactionHistory;
    }

    // Match Store - always reset to clean state on save load.
    // Match data is ephemeral (not persisted by partialize) and stale matchId/status
    // can cause MatchdayUI to get stuck on "Preparing Match" screen.
    stores.matchStore.setState({
      matchId: null,
      status: 'scheduled'
    });

    // Auction Store
    if (saveData.auctionState && stores.auctionStore) {
      stores.auctionStore.setState({
        auctionState: saveData.auctionState.auctionState,
        rounds: saveData.auctionState.rounds,
        currentRound: saveData.auctionState.currentRound,
        currentPlayerIndex: saveData.auctionState.currentPlayerIndex,
        soldPlayers: saveData.auctionState.soldPlayers,
        userMaxBid: saveData.auctionState.userMaxBid || null,
        userMaxBidPlayerId: saveData.auctionState.userMaxBidPlayerId || null
      });
    }

    // Inbox Store
    if (saveData.inboxState && stores.inboxStore) {
      stores.inboxStore.setState({
        messages: saveData.inboxState.messages || [],
        unreadCount: saveData.inboxState.unreadCount || 0
      });
    }

    // Transfer Store — always reset (even if save has no transferState, clear stale data)
    if (stores.transferStore) {
      const ts = saveData.transferState || {};
      stores.transferStore.setState({
        activeListings: ts.activeListings || [],
        userListings: ts.userListings || [],
        userBids: ts.userBids || [],
        freeAgents: ts.freeAgents || [],
        completedTransfers: ts.completedTransfers || [],
        notifications: ts.notifications || [],
        transferWindow: ts.transferWindow || { isOpen: false, startWeek: null, endWeek: null, daysRemaining: 0, windowOpenGameDay: null },
        transferWindowSummary: ts.transferWindowSummary || null,
        showTransferSummary: ts.showTransferSummary || false
      });
    }

    // Reset TransferManager singleton so it rebuilds from fresh store state
    // Must be done AFTER stores are restored so the new singleton reads correct data
    resetTransferManager();
  }

  _migrateSaveData(saveData) {
    let data = { ...saveData };

    // gameState.settings.difficulty: legacy saves missing this field default to 'normal'
    // automatically via the gameStore persist `merge` function — no explicit migration needed.

    // v1.0.0 to v2.0.0 migration
    if (!data.version || data.version === '1.0.0') {
      console.log('Migrating save from v1.0.0 to v2.0.0');

      if (!data.transferState) {
        data.transferState = {
          activeListings: [], userListings: [], userBids: [],
          freeAgents: [], notifications: [], transferWindow: { isOpen: false }
        };
      }

      if (data.gameState && !data.gameState.objectiveTracking) {
        data.gameState.seasonObjectives = data.gameState.seasonObjectives || [];
        data.gameState.objectiveTracking = {};
      }

      if (data.playerState && !data.playerState.playerConditions) {
        data.playerState.playerConditions = {};
      }

      if (data.leagueState) {
        data.leagueState.currentFixtureIndex = data.leagueState.currentFixtureIndex || 0;
        data.leagueState.matchWeeks = data.leagueState.matchWeeks || [];
      }

      data.version = '2.0.0';
    }

    // v2.0.0 to v2.1.0 migration (add type/label if missing)
    if (data.version === '2.0.0') {
      console.log('Migrating save from v2.0.0 to v2.1.0');

      if (!data.type) {
        data.type = 'manual';
      }
      if (!data.label) {
        data.label = data.saveName || 'Unnamed Save';
      }

      data.version = '2.1.0';
    }

    if (data.version !== SAVE_FORMAT_VERSION) {
      data.migratedAt = new Date().toISOString();
    }

    return data;
  }

  _isVersionCompatible(version) {
    if (!version) return true;
    const [major] = version.split('.').map(Number);
    const [minMajor] = MIN_COMPATIBLE_VERSION.split('.').map(Number);
    return major >= minMajor;
  }

  _generateChecksum(data) {
    const { checksum, ...rest } = data;
    const str = JSON.stringify(rest);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  _generateSaveName(gameState, teamState, type) {
    const teamName = teamState.teams[teamState.userTeamId]?.name || 'Unknown';
    const prefix = type === 'autosave' ? 'Auto: ' : '';
    return `${prefix}${teamName} - S${gameState.currentSeason} ${gameState.currentPhase}`;
  }

  _getTeamPosition(standings, teamId) {
    if (!standings?.length) return null;
    const sorted = [...standings].sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate
    );
    const pos = sorted.findIndex(s => s.clubId === teamId);
    return pos >= 0 ? pos + 1 : null;
  }
}

export default new SaveGameManager();
