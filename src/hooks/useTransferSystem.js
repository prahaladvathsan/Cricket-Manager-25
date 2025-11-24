/**
 * @file useTransferSystem.js
 * @description Hook to access and initialize the transfer system
 * Provides UserTransferHandler instance with proper backend integration
 */

import { useMemo, useEffect } from 'react';
import useFinanceStore from '../stores/financeStore';
import useTeamStore from '../stores/teamStore';
import useTransferStore from '../stores/transferStore';
import usePlayerStore from '../stores/playerStore';
import TransferMarket from '../core/finance/TransferMarket';
import UserTransferHandler from '../core/transfers/UserTransferHandler';

// Singleton instances shared across all components
let globalTransferMarket = null;
let globalTransferHandler = null;

/**
 * Hook to provide transfer system access
 * @returns {Object} { transferHandler, transferMarket, isReady }
 */
export const useTransferSystem = () => {
  const financeStore = useFinanceStore;
  const teamStore = useTeamStore;
  const transferStore = useTransferStore;
  const playerStore = usePlayerStore;

  // Create singleton instances (only once for the entire app)
  const { transferMarket, transferHandler } = useMemo(() => {
    if (!globalTransferMarket) {
      console.log('🔧 Creating singleton TransferMarket instance');
      globalTransferMarket = new TransferMarket(financeStore, teamStore);
    }
    if (!globalTransferHandler) {
      console.log('🔧 Creating singleton UserTransferHandler instance');
      globalTransferHandler = new UserTransferHandler(
        globalTransferMarket,
        financeStore,
        teamStore,
        transferStore,
        playerStore
      );
    }

    return {
      transferMarket: globalTransferMarket,
      transferHandler: globalTransferHandler
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
    isReady
  };
};

export default useTransferSystem;
