/**
 * @file indexedDBStorage.js
 * @description IndexedDB storage adapter for Zustand persist middleware
 * Provides much larger storage capacity than localStorage (50MB+ vs 5-10MB)
 */

import { get, set, del, keys } from 'idb-keyval';

/**
 * IndexedDB storage adapter compatible with Zustand's createJSONStorage
 * All methods return Promises (async storage is supported by Zustand persist)
 */
export const indexedDBStorage = {
  /**
   * Get item from IndexedDB
   * @param {string} name - Storage key
   * @returns {Promise<string|null>} Stored value or null
   */
  getItem: async (name) => {
    try {
      const value = await get(name);
      return value ?? null;
    } catch (error) {
      console.error(`IndexedDB getItem error for ${name}:`, error);
      return null;
    }
  },

  /**
   * Set item in IndexedDB
   * @param {string} name - Storage key
   * @param {string} value - Value to store
   * @returns {Promise<void>}
   */
  setItem: async (name, value) => {
    try {
      await set(name, value);
    } catch (error) {
      console.error(`IndexedDB setItem error for ${name}:`, error);
      throw error;
    }
  },

  /**
   * Remove item from IndexedDB
   * @param {string} name - Storage key
   * @returns {Promise<void>}
   */
  removeItem: async (name) => {
    try {
      await del(name);
    } catch (error) {
      console.error(`IndexedDB removeItem error for ${name}:`, error);
    }
  }
};

/**
 * Get all keys from IndexedDB store
 * Useful for listing saves or debugging
 * @returns {Promise<string[]>} Array of all keys
 */
export async function getAllKeys() {
  try {
    return await keys();
  } catch (error) {
    console.error('IndexedDB getAllKeys error:', error);
    return [];
  }
}

/**
 * Clear all data from IndexedDB store
 * Use with caution - removes all game data
 * @returns {Promise<void>}
 */
export async function clearAll() {
  try {
    const allKeys = await keys();
    for (const key of allKeys) {
      await del(key);
    }
  } catch (error) {
    console.error('IndexedDB clearAll error:', error);
    throw error;
  }
}

/**
 * Migrate data from localStorage to IndexedDB
 * Called once on first load to transfer existing saves
 * @returns {Promise<{migrated: string[], errors: string[]}>}
 */
export async function migrateFromLocalStorage() {
  const migrated = [];
  const errors = [];

  // Keys used by the game stores
  const storeKeys = [
    'cm25-game-store',
    'cm25-league-store',
    'cm25-team-store',
    'cm25-player-store',
    'cm25-finance-store',
    'cm25-match-store',
    'cm25-auction-store',
    'cm25-inbox-store',
    'transfer-storage',
    'cm25_current_save'
  ];

  for (const key of storeKeys) {
    try {
      const localData = localStorage.getItem(key);
      if (localData) {
        // Check if already migrated to IndexedDB
        const existingIDBData = await get(key);
        if (!existingIDBData) {
          await set(key, localData);
          migrated.push(key);
          console.log(`Migrated ${key} to IndexedDB`);
        }
      }
    } catch (error) {
      console.error(`Failed to migrate ${key}:`, error);
      errors.push(key);
    }
  }

  // Mark migration as complete
  if (migrated.length > 0) {
    await set('cm25-migration-complete', Date.now());
    console.log(`Migration complete: ${migrated.length} stores migrated`);
  }

  return { migrated, errors };
}

/**
 * Check if migration from localStorage has been completed
 * @returns {Promise<boolean>}
 */
export async function isMigrationComplete() {
  try {
    const migrationTimestamp = await get('cm25-migration-complete');
    return !!migrationTimestamp;
  } catch (error) {
    return false;
  }
}

/**
 * Clean up localStorage after successful migration
 * Only call after confirming IndexedDB data is intact
 * @param {boolean} keepBackup - If true, keeps localStorage as backup
 * @returns {Promise<void>}
 */
export async function cleanupLocalStorage(keepBackup = true) {
  if (keepBackup) {
    console.log('Keeping localStorage as backup');
    return;
  }

  const storeKeys = [
    'cm25-game-store',
    'cm25-league-store',
    'cm25-team-store',
    'cm25-player-store',
    'cm25-finance-store',
    'cm25-match-store',
    'cm25-auction-store',
    'cm25-inbox-store',
    'transfer-storage'
  ];

  for (const key of storeKeys) {
    localStorage.removeItem(key);
  }

  console.log('LocalStorage cleanup complete');
}

export default indexedDBStorage;
