/**
 * @file auctionStore.js
 * @description Auction state management store
 * @module stores/auctionStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

const useAuctionStore = create(
  persist(
    (set, get) => ({
      // Essential Auction State (for save/load)
      auctionState: 'not_started', // 'not_started' | 'in_progress' | 'completed'
      rounds: [], // All auction rounds with PLAYER IDs only (not full objects to save space)
      currentRound: 0, // Which round we're on
      currentPlayerIndex: 0, // Which player in current round
      soldPlayers: [], // History of sold players: { playerId, teamId, price, timestamp }
      userMaxBid: null, // User's max bid for current player (null = not set)
      userMaxBidPlayerId: null, // Player ID for which max bid is set
      userAutoBidEnabled: true, // Control whether AI bids for user during skip operations (default ON)

      // Actions
      /**
       * Initialize auction
       */
      initializeAuction: (rounds) => set({
        auctionState: 'in_progress',
        rounds,
        currentRound: 0,
        currentPlayerIndex: 0,
        soldPlayers: [],
        userMaxBid: null,
        userMaxBidPlayerId: null
      }),

      /**
       * Record player sale
       */
      recordSale: (playerId, teamId, price) => set((state) => ({
        soldPlayers: [...state.soldPlayers, {
          playerId,
          teamId,
          price,
          timestamp: Date.now()
        }]
      })),

      /**
       * Move to next player
       */
      nextPlayer: () => set((state) => {
        const currentRoundPlayers = state.rounds[state.currentRound];
        if (!currentRoundPlayers) return state;

        const nextIndex = state.currentPlayerIndex + 1;

        // If we've finished the current round, move to next round
        if (nextIndex >= currentRoundPlayers.length) {
          return {
            currentRound: state.currentRound + 1,
            currentPlayerIndex: 0
          };
        }

        return { currentPlayerIndex: nextIndex };
      }),

      /**
       * Complete auction
       */
      completeAuction: () => set({
        auctionState: 'completed'
      }),

      /**
       * Reset auction (for new season)
       */
      resetAuction: () => set({
        auctionState: 'not_started',
        rounds: [],
        currentRound: 0,
        currentPlayerIndex: 0,
        soldPlayers: [],
        userMaxBid: null,
        userMaxBidPlayerId: null,
        userAutoBidEnabled: true // Reset to default (ON)
      }),

      /**
       * Set user's max bid for a player
       */
      setUserMaxBid: (playerId, amount) => set({
        userMaxBid: amount,
        userMaxBidPlayerId: playerId
      }),

      /**
       * Clear user's max bid
       */
      clearUserMaxBid: () => set({
        userMaxBid: null,
        userMaxBidPlayerId: null
      }),

      /**
       * Toggle auto-bid on/off
       */
      toggleAutoBid: () => set((state) => ({
        userAutoBidEnabled: !state.userAutoBidEnabled
      })),

      /**
       * Set auto-bid state explicitly
       */
      setAutoBid: (enabled) => set({
        userAutoBidEnabled: enabled
      }),

      /**
       * Get user's max bid for current player
       */
      getUserMaxBid: (playerId) => {
        const state = get();
        if (state.userMaxBidPlayerId === playerId) {
          return state.userMaxBid;
        }
        return null;
      },

      /**
       * Check if auction is in progress
       */
      isAuctionInProgress: () => {
        const state = get();
        return state.auctionState === 'in_progress';
      },

      /**
       * Get current player to auction
       */
      getCurrentPlayer: () => {
        const state = get();
        const currentRoundPlayers = state.rounds[state.currentRound];
        if (!currentRoundPlayers) return null;
        return currentRoundPlayers[state.currentPlayerIndex] || null;
      }
    }),
    {
      name: 'cm25-auction-store',
      version: 1,
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate auctionStore:', error);
        }
        markHydrated('auction');
      }
    }
  )
);

export default useAuctionStore;
