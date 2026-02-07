/**
 * @file useTransferSystem.js
 * @description Hook to access and initialize the transfer system
 * Provides UserTransferHandler instance with proper backend integration
 * Uses the shared TransferManager singleton so UI, Header, and SimulationEngine
 * all operate on the same transfer state.
 */

import { useMemo, useEffect } from 'react';
import useFinanceStore from '../stores/financeStore';
import useTeamStore from '../stores/teamStore';
import useTransferStore from '../stores/transferStore';
import usePlayerStore from '../stores/playerStore';
import { getTransferManager } from '../core/finance/transferManagerSingleton';
import UserTransferHandler from '../core/transfers/UserTransferHandler';

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

  // Get the shared TransferManager singleton and its inner TransferMarket
  const { transferMarket, transferHandler, transferManager } = useMemo(() => {
    const manager = getTransferManager();
    const market = manager.transferMarket;

    if (!globalTransferHandler) {
      console.log('🔧 Creating singleton UserTransferHandler instance');
      globalTransferHandler = new UserTransferHandler(
        market,
        financeStore,
        teamStore,
        transferStore,
        playerStore
      );
    }

    return {
      transferMarket: market,
      transferHandler: globalTransferHandler,
      transferManager: manager
    };
  }, [financeStore, teamStore, transferStore, playerStore]);

  // Sync transferStore with transfer market state
  useEffect(() => {
    if (!transferMarket) return;

    const syncInterval = setInterval(() => {
      const activeListings = transferMarket.getActiveListings();
      transferStore.getState().setActiveListings(activeListings);
    }, 1000); // Sync every second

    return () => clearInterval(syncInterval);
  }, [transferMarket, transferStore]);

  const isReady = !!(transferMarket && transferHandler);

  return {
    transferHandler,
    transferMarket, // Expose for window management
    transferManager, // Expose full manager for transfer cycle processing
    isReady
  };
};

export default useTransferSystem;
