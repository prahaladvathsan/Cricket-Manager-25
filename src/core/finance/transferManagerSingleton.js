/**
 * @file transferManagerSingleton.js
 * @description Shared TransferManager instance used by UI hooks, Header.jsx,
 * SimulationEngine, and OffSeasonManager to ensure all transfer state is unified.
 */

import TransferManager from './TransferManager.js';
import useFinanceStore from '../../stores/financeStore.js';
import useTeamStore from '../../stores/teamStore.js';
import usePlayerStore from '../../stores/playerStore.js';

let sharedInstance = null;
let hasRunPreReleases = false;

/**
 * Get (or lazily create) the shared TransferManager singleton
 * @returns {TransferManager}
 */
export function getTransferManager() {
  if (!sharedInstance) {
    console.log('🔧 Creating shared TransferManager singleton');
    sharedInstance = new TransferManager(
      useFinanceStore,
      useTeamStore,
      usePlayerStore
    );
    // Restore in-memory state from persisted transferStore (handles save load)
    sharedInstance.restoreFromStore();
  }
  return sharedInstance;
}

/**
 * Check/set whether pre-releases have already run for the current window.
 * Prevents double-running if user navigates back and forth.
 * @returns {boolean}
 */
export function getHasRunPreReleases() {
  return hasRunPreReleases;
}

/**
 * @param {boolean} value
 */
export function setHasRunPreReleases(value) {
  hasRunPreReleases = value;
}

/**
 * Reset the singleton (for new game / testing)
 */
export function resetTransferManager() {
  sharedInstance = null;
  hasRunPreReleases = false;
}
