/**
 * @file useTransferSystem.js
 * @description Hook to access and initialize the transfer system
 * Provides UserTransferHandler instance with proper backend integration
 * Uses the shared TransferManager singleton so UI, Header, and SimulationEngine
 * all operate on the same transfer state.
 */

import { useEffect } from 'react';
import useFinanceStore from '../stores/financeStore';
import useTeamStore from '../stores/teamStore';
import useTransferStore from '../stores/transferStore';
import usePlayerStore from '../stores/playerStore';
import { getTransferManager } from '../core/finance/transferManagerSingleton';
import UserTransferHandler from '../core/transfers/UserTransferHandler';
import { isHydrated } from '../utils/storeHydration';

// Singleton handler shared across all components
let globalTransferHandler = null;

/**
 * Hook to provide transfer system access
 * @returns {Object} { transferHandler, transferMarket, transferManager, isReady }
 */
export const useTransferSystem = () => {
  const financeStore = useFinanceStore;
  const teamStore = useTeamStore;
  const transferStore = useTransferStore;
  const playerStore = usePlayerStore;

  // Compute on every render — cheap, and ensures we never serve a stale handler
  // after resetTransferManager() creates a new singleton mid-session (save load / new game).
  const transferManager = getTransferManager();
  const transferMarket = transferManager.transferMarket;
  if (!globalTransferHandler || globalTransferHandler.transferMarket !== transferMarket) {
    console.log(`🔧 [useTransferSystem] (Re)creating UserTransferHandler (stale? ${!!globalTransferHandler})`);
    globalTransferHandler = new UserTransferHandler(
      transferMarket,
      financeStore,
      teamStore,
      transferStore,
      playerStore
    );
  }
  const transferHandler = globalTransferHandler;

  // Sync transferStore with transfer market state.
  // Guarded by hydration: if the transfer store hasn't rehydrated yet, the in-memory
  // Map will be empty and syncing would wipe the persisted listings before
  // restoreFromStore has a chance to rebuild the Map. Also skip the wipe if Map is
  // empty but store has listings — that's the symptom of a desync we don't want to
  // make permanent by overwriting the store.
  useEffect(() => {
    if (!transferMarket) return;

    const syncInterval = setInterval(() => {
      if (!isHydrated('transfer')) {
        console.log('[useTransferSystem] sync skipped — transferStore not hydrated yet');
        return;
      }
      const activeListings = transferMarket.getActiveListings();
      const storeListings = transferStore.getState().activeListings || [];
      if (activeListings.length === 0 && storeListings.length > 0) {
        console.warn(`[useTransferSystem] sync skipped — Map empty but store has ${storeListings.length} listings; calling restoreFromStore to recover`);
        try { transferManager.restoreFromStore(); }
        catch (err) { console.error('[useTransferSystem] restoreFromStore during sync failed:', err); }
        return;
      }
      transferStore.getState().setActiveListings(activeListings);
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [transferMarket, transferStore, transferManager]);

  const isReady = !!(transferMarket && transferHandler);

  return {
    transferHandler,
    transferMarket, // Expose for window management
    transferManager, // Expose full manager for transfer cycle processing
    isReady
  };
};

export default useTransferSystem;
