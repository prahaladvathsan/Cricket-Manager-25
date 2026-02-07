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
  }
  return sharedInstance;
}

/**
 * Reset the singleton (for new game / testing)
 */
export function resetTransferManager() {
  sharedInstance = null;
}
