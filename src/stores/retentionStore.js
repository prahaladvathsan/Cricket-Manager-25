/**
 * @file retentionStore.js
 * @description Zustand store for pre-auction retention phase state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

const useRetentionStore = create(
  persist(
    (set, get) => ({
      // Phase state
      retentionState: 'not_started', // 'not_started' | 'in_progress' | 'completed'

      // Per-team retention results: { [teamId]: { retainedPlayers, releasedPlayers, totalSalary, auctionPurse } }
      teamRetentions: {},

      // Active negotiation for user team
      activeNegotiation: null, // { playerId, attemptNumber, lastOffer, playerResponse }

      // Whether user has finished their retention phase
      userPhaseComplete: false,

      // ============================================
      // ACTIONS
      // ============================================

      startRetentionPhase: (teamRetentions) => set({
        retentionState: 'in_progress',
        teamRetentions,
        activeNegotiation: null,
        userPhaseComplete: false
      }),

      /**
       * Update a team's retention data
       * @param {string} teamId
       * @param {Object} data - Partial update to merge
       */
      updateTeamRetention: (teamId, data) => set(state => ({
        teamRetentions: {
          ...state.teamRetentions,
          [teamId]: {
            ...state.teamRetentions[teamId],
            ...data
          }
        }
      })),

      /**
       * Set active negotiation state (user team only)
       */
      setActiveNegotiation: (negotiation) => set({ activeNegotiation: negotiation }),

      /**
       * Add a retained player to a team
       * @param {string} teamId
       * @param {string} playerId
       * @param {number} salary
       */
      confirmRetention: (teamId, playerId, salary) => set(state => {
        const team = state.teamRetentions[teamId] || { retainedPlayers: [], releasedPlayers: [], totalSalary: 0, auctionPurse: 10000000 };
        const newRetained = [...team.retainedPlayers, { playerId, salary }];
        const newTotal = team.totalSalary + salary;
        const auctionPurse = Math.max(500000, 10000000 - newTotal);

        return {
          teamRetentions: {
            ...state.teamRetentions,
            [teamId]: {
              ...team,
              retainedPlayers: newRetained,
              totalSalary: newTotal,
              auctionPurse
            }
          },
          activeNegotiation: null
        };
      }),

      /**
       * Release a player to the auction pool
       * @param {string} teamId
       * @param {string} playerId
       * @param {string} reason
       */
      releaseToPool: (teamId, playerId, reason = 'released') => set(state => {
        const team = state.teamRetentions[teamId] || { retainedPlayers: [], releasedPlayers: [], totalSalary: 0, auctionPurse: 10000000 };
        return {
          teamRetentions: {
            ...state.teamRetentions,
            [teamId]: {
              ...team,
              releasedPlayers: [...team.releasedPlayers, { playerId, reason }]
            }
          },
          activeNegotiation: null
        };
      }),

      /**
       * Mark user retention phase as complete
       */
      completeRetentionPhase: () => set({
        retentionState: 'completed',
        userPhaseComplete: true,
        activeNegotiation: null
      }),

      /**
       * Reset all retention state (for new seasons)
       */
      reset: () => set({
        retentionState: 'not_started',
        teamRetentions: {},
        activeNegotiation: null,
        userPhaseComplete: false
      })
    }),
    {
      name: 'cm25-retention-store',
      version: 1,
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate retentionStore:', error);
        }
        markHydrated('retention');
      }
    }
  )
);

export default useRetentionStore;
